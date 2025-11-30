import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface VetClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  distance: number;
  rating: number;
  reviewCount: number;
  specialties: string[];
  emergencyServices: boolean;
  hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

export const VetFinderPage: React.FC = () => {
  const [location, setLocation] = useState('');
  const [clinics, setClinics] = useState<VetClinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);

  const searchByCoordinates = async (latitude: number, longitude: number) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      params.set('latitude', latitude.toString());
      params.set('longitude', longitude.toString());
      params.set('radius', '10000');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/vets/search?${params}`);
      const data = await response.json();

      if (data.success && data.data?.clinics) {
        const transformedClinics: VetClinic[] = data.data.clinics.map((clinic: any) => ({
          id: clinic.placeId || clinic.id,
          name: clinic.name,
          address: clinic.address || clinic.vicinity || '',
          city: '',
          state: '',
          zipCode: '',
          phone: clinic.phone || clinic.formattedPhoneNumber || 'Not available',
          distance: clinic.distance ? (clinic.distance / 1609.34) : 0, // Convert meters to miles
          rating: clinic.rating || 0,
          reviewCount: clinic.userRatingsTotal || clinic.reviewCount || 0,
          specialties: clinic.types?.filter((t: string) => t !== 'veterinary_care' && t !== 'point_of_interest') || [],
          emergencyServices: clinic.openNow || clinic.types?.includes('emergency') || false,
          hours: clinic.openingHours || {
            monday: 'Call for hours',
            tuesday: 'Call for hours',
            wednesday: 'Call for hours',
            thursday: 'Call for hours',
            friday: 'Call for hours',
            saturday: 'Call for hours',
            sunday: 'Call for hours',
          },
        }));
        setClinics(transformedClinics);
      } else {
        setClinics([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to search vets:', err);
      setError(err instanceof Error ? err.message : 'Failed to search for veterinarians. Please try again.');
      setClinics([]);
      setLoading(false);
    }
  };

  const searchByAddress = async (address: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      params.set('address', address);
      params.set('radius', '10000');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/vets/search/address?${params}`);
      const data = await response.json();

      if (data.success && data.data?.clinics) {
        const transformedClinics: VetClinic[] = data.data.clinics.map((clinic: any) => ({
          id: clinic.placeId || clinic.id,
          name: clinic.name,
          address: clinic.address || clinic.vicinity || '',
          city: '',
          state: '',
          zipCode: '',
          phone: clinic.phone || clinic.formattedPhoneNumber || 'Not available',
          distance: clinic.distance ? (clinic.distance / 1609.34) : 0,
          rating: clinic.rating || 0,
          reviewCount: clinic.userRatingsTotal || clinic.reviewCount || 0,
          specialties: clinic.types?.filter((t: string) => t !== 'veterinary_care' && t !== 'point_of_interest') || [],
          emergencyServices: clinic.openNow || clinic.types?.includes('emergency') || false,
          hours: clinic.openingHours || {
            monday: 'Call for hours',
            tuesday: 'Call for hours',
            wednesday: 'Call for hours',
            thursday: 'Call for hours',
            friday: 'Call for hours',
            saturday: 'Call for hours',
            sunday: 'Call for hours',
          },
        }));
        setClinics(transformedClinics);
      } else {
        setClinics([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to search vets by address:', err);
      setError(err instanceof Error ? err.message : 'Failed to search for veterinarians. Please try again.');
      setClinics([]);
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;

    // Check if location looks like coordinates
    const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      await searchByCoordinates(lat, lng);
    } else {
      await searchByAddress(location);
    }
  };

  const handleUseCurrentLocation = () => {
    setUseCurrentLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude}, ${longitude}`);
          setUseCurrentLocation(false);
          // Automatically search with the coordinates
          await searchByCoordinates(latitude, longitude);
        },
        () => {
          setError('Unable to get your location. Please enter an address manually.');
          setUseCurrentLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setUseCurrentLocation(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < Math.round(rating) ? 'text-warning-400' : 'text-gray-300 dark:text-gray-600'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="text-3xl font-bold text-navy-900 dark:text-white font-display mb-2">Find a Veterinarian</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Locate veterinary clinics near you for professional pet care
            </p>
          </div>

          {/* Search Form */}
          <Card variant="elevated" className="mb-8 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <form onSubmit={handleSearch} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-navy-900 dark:text-white mb-2">
                    Enter your location
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <Input
                        id="location"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Enter city, state, or ZIP code"
                        className="pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseCurrentLocation}
                      disabled={useCurrentLocation}
                      leftIcon={
                        useCurrentLocation ? <LoadingSpinner size="sm" /> : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      }
                    >
                      {useCurrentLocation ? 'Getting...' : 'Use Current'}
                    </Button>
                  </div>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Button type="submit" disabled={loading || !location} className="w-full" leftIcon={
                  loading ? <LoadingSpinner size="sm" /> : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )
                }>
                  {loading ? 'Searching...' : 'Find Veterinarians'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Results */}
          {loading && (
            <Card variant="elevated" className="animate-fade-up">
              <div className="p-12 text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Finding veterinary clinics near you...</p>
              </div>
            </Card>
          )}

          {!loading && hasSearched && (
            <>
              {clinics.length === 0 ? (
                <Card variant="elevated" className="animate-fade-up">
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-navy-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">
                      No Clinics Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try searching with a different location
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  <div className="mb-6 animate-fade-up">
                    <h2 className="text-xl font-semibold text-navy-900 dark:text-white">
                      Found {clinics.length} veterinary clinic{clinics.length !== 1 ? 's' : ''} near you
                    </h2>
                  </div>

                  {/* Map Placeholder */}
                  <Card variant="elevated" className="mb-6 overflow-hidden animate-fade-up" style={{ animationDelay: '0.05s' }}>
                    <div className="h-64 bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-navy-800 dark:to-navy-700 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white/80 dark:bg-navy-600/80 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </div>
                        <p className="text-navy-900 dark:text-white font-medium">Map view will be displayed here</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Integration with mapping service required
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Clinic List */}
                  <div className="space-y-6">
                    {clinics.map((clinic, index) => (
                      <Card
                        key={clinic.id}
                        variant="elevated"
                        hover
                        className="animate-fade-up"
                        style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-xl font-bold text-navy-900 dark:text-white">
                                  {clinic.name}
                                </h3>
                                {clinic.emergencyServices && (
                                  <Badge variant="danger" dot>24/7 EMERGENCY</Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex">{renderStars(clinic.rating)}</div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {clinic.rating} ({clinic.reviewCount} reviews)
                                </span>
                              </div>

                              <div className="space-y-1 text-gray-700 dark:text-gray-300 mb-3">
                                <p className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {clinic.address || 'Address not available'}
                                </p>
                                <p className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="font-medium">{clinic.phone}</span>
                                </p>
                                <p className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                  {clinic.distance.toFixed(1)} miles away
                                </p>
                              </div>

                              {clinic.specialties.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-sm font-semibold text-navy-900 dark:text-white mb-2">
                                    Specialties:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {clinic.specialties.map((specialty) => (
                                      <Badge key={specialty} variant="outline" size="sm">
                                        {specialty}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Expandable Hours */}
                          {expandedClinic === clinic.id && (
                            <div className="mb-4 p-4 bg-gray-50 dark:bg-navy-800/50 rounded-xl animate-fade-in">
                              <h4 className="font-semibold text-navy-900 dark:text-white mb-3">Hours of Operation</h4>
                              <div className="grid md:grid-cols-2 gap-2 text-sm">
                                {Object.entries(clinic.hours).map(([day, hours]) => (
                                  <div key={day} className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400 capitalize">{day}:</span>
                                    <span className="font-medium text-navy-900 dark:text-white">{hours}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-3 flex-wrap">
                            <Button onClick={() => window.open(`tel:${clinic.phone}`)} leftIcon={
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            }>
                              Call Now
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => window.open(
                                `https://maps.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clinic.address || clinic.name)}`,
                                '_blank'
                              )}
                              leftIcon={
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                              }
                            >
                              Directions
                            </Button>
                            <Button variant="ghost" onClick={() => setExpandedClinic(expandedClinic === clinic.id ? null : clinic.id)} rightIcon={
                              <svg className={`w-4 h-4 transition-transform ${expandedClinic === clinic.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            }>
                              {expandedClinic === clinic.id ? 'Hide Hours' : 'View Hours'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {!hasSearched && (
            <Card variant="elevated" className="animate-fade-up">
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-navy-900 dark:text-white mb-2 font-display">
                  Find Veterinary Care Near You
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter your location above to find veterinary clinics in your area
                </p>
              </div>
            </Card>
          )}

          {/* Info Box */}
          <Alert variant="info" className="mt-8 animate-fade-up">
            <strong>Note:</strong> The information provided is sourced from public databases
            and may not be complete or up-to-date. Always call ahead to confirm hours and
            services. In case of a pet emergency, contact the nearest emergency veterinary
            clinic immediately.
          </Alert>
        </div>
      </div>
    </div>
  );
};
