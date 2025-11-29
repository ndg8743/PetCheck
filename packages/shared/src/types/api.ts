/**
 * API request/response types
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface ApiMeta {
  total?: number;
  limit?: number;
  offset?: number;
  page?: number;
  totalPages?: number;
  cached?: boolean;
  cacheAge?: number;  // seconds since cached
  stale?: boolean;
  requestId?: string;
  // Allow additional metadata properties
  [key: string]: unknown;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface DateRangeParams {
  from?: string;  // ISO date or YYYYMMDD
  to?: string;
}

export type SortOrder = 'asc' | 'desc';

export interface SortParams {
  sortBy?: string;
  sortOrder?: SortOrder;
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

// Health check
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: Date;
  services: {
    redis: ServiceStatus;
    openFda: ServiceStatus;
    googleAuth: ServiceStatus;
    googlePlaces?: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency?: number;  // ms
  lastChecked?: Date;
  message?: string;
}

// Cache control
export interface CacheControl {
  maxAge: number;      // seconds
  staleWhileRevalidate?: number;  // seconds
  staleIfError?: number;          // seconds
}

export const DEFAULT_CACHE_SETTINGS = {
  adverseEvents: { maxAge: 3600, staleWhileRevalidate: 86400 },  // 1hr, 24hr stale
  recalls: { maxAge: 1800, staleWhileRevalidate: 7200 },         // 30min, 2hr stale
  drugs: { maxAge: 86400, staleWhileRevalidate: 604800 },        // 24hr, 7d stale
  interactions: { maxAge: 86400, staleWhileRevalidate: 604800 }, // 24hr, 7d stale
  greenBook: { maxAge: 604800, staleWhileRevalidate: 2592000 },  // 7d, 30d stale
};

// Error codes
export const ERROR_CODES = {
  // Auth errors (1xxx)
  UNAUTHORIZED: 'E1001',
  INVALID_TOKEN: 'E1002',
  TOKEN_EXPIRED: 'E1003',
  INSUFFICIENT_PERMISSIONS: 'E1004',
  INVALID_GOOGLE_TOKEN: 'E1005',

  // Validation errors (2xxx)
  VALIDATION_ERROR: 'E2001',
  INVALID_SPECIES: 'E2002',
  INVALID_DRUG_NAME: 'E2003',
  INVALID_DATE_RANGE: 'E2004',
  MISSING_REQUIRED_FIELD: 'E2005',

  // Resource errors (3xxx)
  NOT_FOUND: 'E3001',
  PET_NOT_FOUND: 'E3002',
  DRUG_NOT_FOUND: 'E3003',
  USER_NOT_FOUND: 'E3004',

  // External API errors (4xxx)
  OPENFDA_ERROR: 'E4001',
  OPENFDA_RATE_LIMITED: 'E4002',
  OPENFDA_TIMEOUT: 'E4003',
  GOOGLE_PLACES_ERROR: 'E4004',
  RXNORM_ERROR: 'E4005',

  // Server errors (5xxx)
  INTERNAL_ERROR: 'E5001',
  REDIS_ERROR: 'E5002',
  DATABASE_ERROR: 'E5003',
  CACHE_ERROR: 'E5004',

  // Rate limiting (6xxx)
  RATE_LIMITED: 'E6001',
  QUOTA_EXCEEDED: 'E6002',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export function createApiError(
  code: ErrorCode,
  message: string,
  statusCode: number = 500,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message,
    statusCode,
    details
  };
}

export function createApiResponse<T>(
  data: T,
  meta?: ApiMeta
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta
  };
}

export function createErrorResponse(error: ApiError): ApiResponse<never> {
  return {
    success: false,
    error
  };
}
