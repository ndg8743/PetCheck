/**
 * Application configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // API URLs
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Redis (caching & rate limiting)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: 'petcheck:',
  },

  // PostgreSQL (user data persistence)
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'petcheck',
    user: process.env.DATABASE_USER || 'petcheck',
    password: process.env.DATABASE_PASSWORD || 'petcheck_dev',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'petcheck',
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  },

  // OpenFDA API
  openFda: {
    baseUrl: 'https://api.fda.gov',
    adverseEventsEndpoint: '/animalandveterinary/event.json',
    apiKey: process.env.OPENFDA_API_KEY || '', // Optional but recommended
    rateLimit: {
      requestsPerMinute: process.env.OPENFDA_API_KEY ? 240 : 40,
      requestsPerDay: process.env.OPENFDA_API_KEY ? 120000 : 1000,
    },
    timeout: 30000, // 30 seconds
  },

  // NIH/NLM APIs
  rxNorm: {
    baseUrl: 'https://rxnav.nlm.nih.gov/REST',
    timeout: 15000,
  },

  // Cache TTLs (in seconds)
  cache: {
    adverseEvents: 3600,        // 1 hour
    adverseEventsStale: 86400,  // 24 hours
    recalls: 1800,              // 30 minutes
    recallsStale: 7200,         // 2 hours
    drugs: 86400,               // 24 hours
    drugsStale: 604800,         // 7 days
    interactions: 86400,        // 24 hours
    greenBook: 604800,          // 7 days
    userSession: 604800,        // 7 days
  },

  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,    // per window
    maxSearchRequests: 30, // search endpoints per window
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  // CORS
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
    credentials: true,
  },
};

// Validation
export function validateConfig(): void {
  const required = [
    { key: 'JWT_SECRET', value: config.jwt.secret, defaultCheck: 'your-super-secret-jwt-key-change-in-production' },
  ];

  const warnings: string[] = [];
  const errors: string[] = [];

  for (const { key, value, defaultCheck } of required) {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    } else if (defaultCheck && value === defaultCheck && !config.isDev) {
      warnings.push(`${key} is using default value - please set in production`);
    }
  }

  if (!config.google.clientId) {
    warnings.push('GOOGLE_CLIENT_ID not set - Google OAuth will not work');
  }

  if (!config.openFda.apiKey) {
    warnings.push('OPENFDA_API_KEY not set - API rate limits will be lower');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }

  if (warnings.length > 0 && !config.isDev) {
    console.warn('Configuration warnings:\n', warnings.join('\n'));
  }
}

export default config;
