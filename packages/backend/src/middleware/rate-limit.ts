/**
 * Rate Limiting Middleware using Redis
 */

import { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../services/redis';
import { createLogger } from '../services/logger';
import { config } from '../config';
import { ERROR_CODES, createErrorResponse, createApiError } from '@petcheck/shared';

const logger = createLogger('rate-limit');

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Create a rate limiting middleware
 */
export function rateLimiter(options: RateLimitConfig) {
  const {
    windowMs,
    max,
    keyPrefix = 'rl',
    keyGenerator = defaultKeyGenerator,
    skip,
    handler,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if this request should skip rate limiting
    if (skip && skip(req)) {
      next();
      return;
    }

    const key = `${keyPrefix}:${keyGenerator(req)}`;

    try {
      const result = await checkRateLimit(key, windowMs, max);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter || Math.ceil(windowMs / 1000));

        if (handler) {
          handler(req, res);
          return;
        }

        logger.warn(`Rate limit exceeded for ${key}`);
        res.status(429).json(
          createErrorResponse(
            createApiError(ERROR_CODES.RATE_LIMITED, 'Too many requests. Please try again later.', 429, {
              retryAfter: result.retryAfter,
              resetAt: result.resetAt.toISOString(),
            })
          )
        );
        return;
      }

      next();
    } catch (error) {
      // If rate limiting fails, allow the request (fail open)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Rate limit check failed (allowing request): ${errorMessage}`);
      next();
    }
  };
}

/**
 * Default key generator - use IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Get real IP behind proxy
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.ip || req.socket.remoteAddress || 'unknown';

  return ip;
}

/**
 * Key generator that includes user ID if authenticated
 */
export function userKeyGenerator(req: Request): string {
  if (req.userId) {
    return `user:${req.userId}`;
  }
  return defaultKeyGenerator(req);
}

/**
 * Pre-configured rate limiters
 */

// General API rate limiter
export const apiRateLimiter = rateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  keyPrefix: 'api',
});

// Stricter rate limiter for search/query endpoints
export const searchRateLimiter = rateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxSearchRequests,
  keyPrefix: 'search',
  keyGenerator: userKeyGenerator,
});

// Auth endpoint rate limiter (prevent brute force)
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  keyPrefix: 'auth',
});

// Export endpoint rate limiter (prevent abuse of expensive operations)
export const exportRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exports per hour
  keyPrefix: 'export',
  keyGenerator: userKeyGenerator,
});

// Interaction check rate limiter
export const interactionRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 checks per minute
  keyPrefix: 'interaction',
  keyGenerator: userKeyGenerator,
});
