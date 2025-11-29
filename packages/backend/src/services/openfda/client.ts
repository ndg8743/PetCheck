/**
 * OpenFDA API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { createLogger } from '../logger';
import { checkRateLimit, getFromCache, setInCache } from '../redis';
import { createCacheKey } from '@petcheck/shared';

const logger = createLogger('openfda');

export interface OpenFdaResponse<T> {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
    results: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: T[];
}

export interface OpenFdaCountResponse {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
  };
  results: Array<{
    term: string;
    count: number;
  }>;
}

export interface OpenFdaError {
  error: {
    code: string;
    message: string;
  };
}

export class OpenFdaClient {
  private client: AxiosInstance;
  private rateLimitKey = 'openfda';

  constructor() {
    this.client = axios.create({
      baseURL: config.openFda.baseUrl,
      timeout: config.openFda.timeout,
      headers: {
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (reqConfig) => {
        logger.debug(`OpenFDA request: ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
        return reqConfig;
      },
      (error) => {
        logger.error('OpenFDA request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`OpenFDA response: ${response.status}`);
        return response;
      },
      (error: AxiosError<OpenFdaError>) => {
        if (error.response) {
          const { status, data } = error.response;
          logger.error(`OpenFDA error ${status}:`, data?.error || error.message);

          if (status === 429) {
            logger.warn('OpenFDA rate limit exceeded');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check rate limit before making request
   */
  private async checkRateLimit(): Promise<boolean> {
    const result = await checkRateLimit(
      this.rateLimitKey,
      60000, // 1 minute window
      config.openFda.rateLimit.requestsPerMinute
    );

    if (!result.allowed) {
      logger.warn(`OpenFDA rate limit: ${result.remaining} remaining, retry after ${result.retryAfter}s`);
    }

    return result.allowed;
  }

  /**
   * Build query parameters for openFDA request
   */
  private buildQueryParams(params: {
    search?: string;
    count?: string;
    limit?: number;
    skip?: number;
  }): Record<string, string> {
    const queryParams: Record<string, string> = {};

    if (params.search) {
      queryParams.search = params.search;
    }

    if (params.count) {
      queryParams.count = params.count;
    }

    if (params.limit !== undefined) {
      queryParams.limit = String(Math.min(params.limit, 1000)); // OpenFDA max is 1000
    }

    if (params.skip !== undefined) {
      queryParams.skip = String(Math.min(params.skip, 25000)); // OpenFDA max is 25000
    }

    // Add API key if available
    if (config.openFda.apiKey) {
      queryParams.api_key = config.openFda.apiKey;
    }

    return queryParams;
  }

  /**
   * Make a cached request to openFDA
   */
  async cachedRequest<T>(
    endpoint: string,
    params: {
      search?: string;
      count?: string;
      limit?: number;
      skip?: number;
    },
    cacheOptions: { ttl: number; staleTtl?: number }
  ): Promise<{ data: T; cached: boolean; stale: boolean }> {
    const cacheKey = createCacheKey(`openfda:${endpoint}`, params);

    // Check cache first
    const cached = await getFromCache<T>(cacheKey);
    if (cached && !cached.stale) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return { data: cached.data, cached: true, stale: false };
    }

    // If stale data available, return it but trigger background refresh
    if (cached?.stale) {
      logger.debug(`Stale cache hit for ${cacheKey}, triggering refresh`);
      // Fire and forget the refresh
      this.fetchAndCache<T>(endpoint, params, cacheKey, cacheOptions).catch((err) => {
        logger.error('Background cache refresh failed:', err);
      });
      return { data: cached.data, cached: true, stale: true };
    }

    // No cache, fetch from API
    return this.fetchAndCache<T>(endpoint, params, cacheKey, cacheOptions);
  }

  /**
   * Fetch from API and update cache
   */
  private async fetchAndCache<T>(
    endpoint: string,
    params: {
      search?: string;
      count?: string;
      limit?: number;
      skip?: number;
    },
    cacheKey: string,
    cacheOptions: { ttl: number; staleTtl?: number }
  ): Promise<{ data: T; cached: boolean; stale: boolean }> {
    // Check rate limit
    const allowed = await this.checkRateLimit();
    if (!allowed) {
      throw new Error('OpenFDA rate limit exceeded. Please try again later.');
    }

    const queryParams = this.buildQueryParams(params);
    const response = await this.client.get<T>(endpoint, { params: queryParams });

    // Cache the response
    await setInCache(cacheKey, response.data, cacheOptions);

    return { data: response.data, cached: false, stale: false };
  }

  /**
   * Search adverse events
   */
  async searchAdverseEvents(params: {
    search?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ data: OpenFdaResponse<Record<string, unknown>>; cached: boolean; stale: boolean }> {
    return this.cachedRequest(
      config.openFda.adverseEventsEndpoint,
      params,
      { ttl: config.cache.adverseEvents, staleTtl: config.cache.adverseEventsStale }
    );
  }

  /**
   * Count adverse events by field
   */
  async countAdverseEvents(params: {
    search?: string;
    count: string;
    limit?: number;
  }): Promise<{ data: OpenFdaCountResponse; cached: boolean; stale: boolean }> {
    return this.cachedRequest(
      config.openFda.adverseEventsEndpoint,
      params,
      { ttl: config.cache.adverseEvents, staleTtl: config.cache.adverseEventsStale }
    );
  }

  /**
   * Direct request without caching (for real-time needs)
   */
  async directRequest<T>(
    endpoint: string,
    params: {
      search?: string;
      count?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<T> {
    const allowed = await this.checkRateLimit();
    if (!allowed) {
      throw new Error('OpenFDA rate limit exceeded. Please try again later.');
    }

    const queryParams = this.buildQueryParams(params);
    const response = await this.client.get<T>(endpoint, { params: queryParams });
    return response.data;
  }

  /**
   * Build the full openFDA URL for a query (for transparency/export)
   */
  buildQueryUrl(endpoint: string, params: {
    search?: string;
    count?: string;
    limit?: number;
    skip?: number;
  }): string {
    const queryParams = this.buildQueryParams(params);
    // Remove API key from public URL
    delete queryParams.api_key;

    const searchParams = new URLSearchParams(queryParams);
    return `${config.openFda.baseUrl}${endpoint}?${searchParams.toString()}`;
  }
}

// Singleton instance
export const openFdaClient = new OpenFdaClient();
export default openFdaClient;
