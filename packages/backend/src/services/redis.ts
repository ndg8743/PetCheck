/**
 * Redis service for caching and rate limiting
 */

import Redis from 'ioredis';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('redis');

// Create Redis client
export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  keyPrefix: config.redis.keyPrefix,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, delay ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

/**
 * Cache wrapper with stale-while-revalidate support
 */
export interface CacheOptions {
  ttl: number;           // Time to live in seconds
  staleTtl?: number;     // Additional time data can be served stale
  forceRefresh?: boolean;
}

export interface CachedData<T> {
  data: T;
  cachedAt: number;
  stale: boolean;
}

/**
 * Get cached data with stale-while-revalidate support
 */
export async function getFromCache<T>(key: string): Promise<CachedData<T> | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data: T; cachedAt: number; ttl: number; staleTtl?: number };
    const age = (Date.now() - parsed.cachedAt) / 1000;
    const stale = age > parsed.ttl;

    // Check if even stale data has expired
    const maxAge = parsed.ttl + (parsed.staleTtl || 0);
    if (age > maxAge) {
      await redis.del(key);
      return null;
    }

    return {
      data: parsed.data,
      cachedAt: parsed.cachedAt,
      stale,
    };
  } catch (err) {
    logger.error('Cache get error:', err);
    return null;
  }
}

/**
 * Set data in cache
 */
export async function setInCache<T>(
  key: string,
  data: T,
  options: CacheOptions
): Promise<void> {
  try {
    const cacheEntry = {
      data,
      cachedAt: Date.now(),
      ttl: options.ttl,
      staleTtl: options.staleTtl,
    };

    const totalTtl = options.ttl + (options.staleTtl || 0);
    await redis.setex(key, totalTtl, JSON.stringify(cacheEntry));
  } catch (err) {
    logger.error('Cache set error:', err);
  }
}

/**
 * Delete from cache
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    logger.error('Cache delete error:', err);
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function deleteByPattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(config.redis.keyPrefix + pattern);
    if (keys.length === 0) return 0;

    // Remove prefix for deletion (ioredis adds it automatically)
    const keysWithoutPrefix = keys.map(k => k.replace(config.redis.keyPrefix, ''));
    const deleted = await redis.del(...keysWithoutPrefix);
    return deleted;
  } catch (err) {
    logger.error('Cache pattern delete error:', err);
    return 0;
  }
}

/**
 * Rate limiter using Redis
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

export async function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis transaction
    const multi = redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Add current request
    multi.zadd(key, now.toString(), `${now}-${Math.random()}`);

    // Count requests in window
    multi.zcard(key);

    // Set expiry
    multi.pexpire(key, windowMs);

    const results = await multi.exec();
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = results[2][1] as number;
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetAt = new Date(now + windowMs);

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000),
    };
  } catch (err) {
    logger.error('Rate limit check error:', err);
    // Fail open - allow the request
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(now + windowMs),
    };
  }
}

/**
 * Request deduplication
 * Prevents duplicate concurrent requests for the same resource
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = 30
): Promise<boolean> {
  const lockKey = `lock:${key}`;
  const result = await redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  const lockKey = `lock:${key}`;
  await redis.del(lockKey);
}

/**
 * Atomic counter for metrics
 */
export async function incrementCounter(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  const count = await redis.incr(`counter:${key}`);
  if (ttlSeconds && count === 1) {
    await redis.expire(`counter:${key}`, ttlSeconds);
  }
  return count;
}

export async function getCounter(key: string): Promise<number> {
  const count = await redis.get(`counter:${key}`);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Health check
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export default redis;
