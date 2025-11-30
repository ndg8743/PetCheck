/**
 * Veterinarian Lookup Service using Google Places API
 */

import axios from 'axios';
import { createLogger } from '../logger';
import { getFromCache, setInCache } from '../redis';
import { config } from '../../config';
import { createCacheKey } from '@petcheck/shared';

const logger = createLogger('vet-lookup');

export interface VetClinic {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  totalRatings?: number;
  openNow?: boolean;
  openingHours?: string[];
  location: {
    lat: number;
    lng: number;
  };
  distance?: number;  // meters from search location
  photos?: string[];  // Photo URLs
}

export interface VetSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;  // meters, default 5000 (5km)
  keyword?: string;  // Additional search terms
}

export interface VetSearchResult {
  clinics: VetClinic[];
  total: number;
  searchLocation: {
    lat: number;
    lng: number;
  };
  radius: number;
}

interface GooglePlacesResponse {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    vicinity?: string; // Nearby Search returns vicinity, not formatted_address
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: {
      open_now: boolean;
      weekday_text?: string[];
    };
    photos?: Array<{
      photo_reference: string;
    }>;
    formatted_phone_number?: string;
    website?: string;
  }>;
  status: string;
  error_message?: string;
  next_page_token?: string;
}

interface GooglePlaceDetailsResponse {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    formatted_phone_number?: string;
    website?: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: {
      open_now: boolean;
      weekday_text?: string[];
    };
    photos?: Array<{
      photo_reference: string;
    }>;
  };
  status: string;
  error_message?: string;
}

const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

export class VetLookupService {
  /**
   * Search for veterinary clinics near a location
   */
  async searchVets(params: VetSearchParams): Promise<VetSearchResult> {
    const cacheKey = createCacheKey('vets:search', {
      lat: params.latitude.toFixed(3),
      lng: params.longitude.toFixed(3),
      radius: params.radius || 5000,
      keyword: params.keyword,
    });

    // Check cache
    const cached = await getFromCache<VetSearchResult>(cacheKey);
    if (cached && !cached.stale) {
      logger.debug('Vet search cache hit');
      return cached.data;
    }

    if (!config.google.placesApiKey) {
      logger.warn('Google Places API key not configured');
      return this.getMockResults(params);
    }

    try {
      const radius = params.radius || 5000;

      // Search for veterinary clinics
      const response = await axios.get<GooglePlacesResponse>(
        `${GOOGLE_PLACES_BASE_URL}/nearbysearch/json`,
        {
          params: {
            location: `${params.latitude},${params.longitude}`,
            radius,
            type: 'veterinary_care',
            keyword: params.keyword || 'veterinarian pet animal hospital',
            key: config.google.placesApiKey,
          },
          timeout: 10000,
        }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        logger.error(`Google Places API error: ${response.data.status} - ${response.data.error_message}`);
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      let clinics: VetClinic[] = response.data.results.map((place) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address || place.vicinity || '',
        rating: place.rating,
        totalRatings: place.user_ratings_total,
        openNow: place.opening_hours?.open_now,
        openingHours: place.opening_hours?.weekday_text,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        distance: this.calculateDistance(
          params.latitude,
          params.longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        ),
        photos: place.photos?.slice(0, 3).map((p) =>
          `${GOOGLE_PLACES_BASE_URL}/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${config.google.placesApiKey}`
        ),
      }));

      // Sort by distance
      clinics.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      // Fetch details (phone, website) for top 10 results in parallel
      const topClinics = clinics.slice(0, 10);
      const enrichedClinics = await Promise.all(
        topClinics.map(async (clinic) => {
          try {
            const details = await this.getClinicDetailsInternal(clinic.placeId);
            if (details) {
              return {
                ...clinic,
                address: details.address || clinic.address,
                phone: details.phone,
                website: details.website,
                openingHours: details.openingHours || clinic.openingHours,
              };
            }
          } catch (error) {
            logger.debug(`Failed to fetch details for ${clinic.placeId}`);
          }
          return clinic;
        })
      );

      // Replace top clinics with enriched versions
      clinics = [...enrichedClinics, ...clinics.slice(10)];

      const result: VetSearchResult = {
        clinics,
        total: clinics.length,
        searchLocation: {
          lat: params.latitude,
          lng: params.longitude,
        },
        radius,
      };

      // Cache for 1 hour
      await setInCache(cacheKey, result, { ttl: 3600, staleTtl: 7200 });

      logger.info(`Vet search: found ${clinics.length} clinics`);
      return result;
    } catch (error) {
      // Return cached stale data if available
      if (cached?.stale) {
        logger.warn('Returning stale vet search data');
        return cached.data;
      }

      logger.error('Vet search error:', error);
      // Return mock data as fallback
      return this.getMockResults(params);
    }
  }

  /**
   * Internal method to fetch clinic details (used during search enrichment)
   */
  private async getClinicDetailsInternal(placeId: string): Promise<Partial<VetClinic> | null> {
    try {
      const response = await axios.get<GooglePlaceDetailsResponse>(
        `${GOOGLE_PLACES_BASE_URL}/details/json`,
        {
          params: {
            place_id: placeId,
            fields: 'formatted_address,formatted_phone_number,website,opening_hours',
            key: config.google.placesApiKey,
          },
          timeout: 5000,
        }
      );

      if (response.data.status !== 'OK') {
        return null;
      }

      const place = response.data.result;
      return {
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        openingHours: place.opening_hours?.weekday_text,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get details for a specific clinic
   */
  async getClinicDetails(placeId: string): Promise<VetClinic | null> {
    const cacheKey = `vet:details:${placeId}`;

    const cached = await getFromCache<VetClinic>(cacheKey);
    if (cached && !cached.stale) {
      return cached.data;
    }

    if (!config.google.placesApiKey) {
      return null;
    }

    try {
      const response = await axios.get<GooglePlaceDetailsResponse>(
        `${GOOGLE_PLACES_BASE_URL}/details/json`,
        {
          params: {
            place_id: placeId,
            fields: 'place_id,name,formatted_address,formatted_phone_number,website,geometry,rating,user_ratings_total,opening_hours,photos',
            key: config.google.placesApiKey,
          },
          timeout: 10000,
        }
      );

      if (response.data.status !== 'OK') {
        logger.error(`Google Places details error: ${response.data.status}`);
        return null;
      }

      const place = response.data.result;
      const clinic: VetClinic = {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating,
        totalRatings: place.user_ratings_total,
        openNow: place.opening_hours?.open_now,
        openingHours: place.opening_hours?.weekday_text,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        photos: place.photos?.slice(0, 5).map((p) =>
          `${GOOGLE_PLACES_BASE_URL}/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${config.google.placesApiKey}`
        ),
      };

      // Cache for 24 hours
      await setInCache(cacheKey, clinic, { ttl: 86400, staleTtl: 172800 });

      return clinic;
    } catch (error) {
      if (cached?.stale) {
        return cached.data;
      }

      logger.error('Clinic details error:', error);
      return null;
    }
  }

  /**
   * Search by address (geocode first)
   */
  async searchByAddress(address: string, radius?: number): Promise<VetSearchResult> {
    if (!config.google.placesApiKey) {
      return this.getMockResults({ latitude: 0, longitude: 0, radius });
    }

    try {
      // Geocode the address
      const geocodeResponse = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address,
            key: config.google.placesApiKey,
          },
          timeout: 10000,
        }
      );

      if (geocodeResponse.data.status !== 'OK' || !geocodeResponse.data.results[0]) {
        logger.warn(`Could not geocode address: ${address}`);
        return { clinics: [], total: 0, searchLocation: { lat: 0, lng: 0 }, radius: radius || 5000 };
      }

      const location = geocodeResponse.data.results[0].geometry.location;

      return this.searchVets({
        latitude: location.lat,
        longitude: location.lng,
        radius,
      });
    } catch (error) {
      logger.error('Search by address error:', error);
      return { clinics: [], total: 0, searchLocation: { lat: 0, lng: 0 }, radius: radius || 5000 };
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get mock results for development/fallback
   */
  private getMockResults(params: VetSearchParams): VetSearchResult {
    const mockClinics: VetClinic[] = [
      {
        placeId: 'mock-1',
        name: 'Happy Paws Veterinary Clinic',
        address: '123 Main St, Your City, ST 12345',
        phone: '(555) 123-4567',
        website: 'https://example.com/happypaws',
        rating: 4.8,
        totalRatings: 256,
        openNow: true,
        location: {
          lat: params.latitude + 0.01,
          lng: params.longitude + 0.01,
        },
        distance: 1200,
      },
      {
        placeId: 'mock-2',
        name: 'City Animal Hospital',
        address: '456 Oak Ave, Your City, ST 12345',
        phone: '(555) 234-5678',
        website: 'https://example.com/cityanimal',
        rating: 4.5,
        totalRatings: 189,
        openNow: true,
        location: {
          lat: params.latitude - 0.015,
          lng: params.longitude + 0.02,
        },
        distance: 2300,
      },
      {
        placeId: 'mock-3',
        name: 'Pet Care Plus',
        address: '789 Elm St, Your City, ST 12345',
        phone: '(555) 345-6789',
        rating: 4.7,
        totalRatings: 142,
        openNow: false,
        location: {
          lat: params.latitude + 0.02,
          lng: params.longitude - 0.01,
        },
        distance: 3100,
      },
    ];

    return {
      clinics: mockClinics,
      total: mockClinics.length,
      searchLocation: {
        lat: params.latitude,
        lng: params.longitude,
      },
      radius: params.radius || 5000,
    };
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return !!config.google.placesApiKey;
  }
}

export const vetLookupService = new VetLookupService();
export default vetLookupService;
