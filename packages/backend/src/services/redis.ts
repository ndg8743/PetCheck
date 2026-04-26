/**
 * Redis service for caching and rate limiting
 * Falls back to in-memory Map when Redis is unavailable
 */

import Redis from 'ioredis';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('redis');

// Track if we're using in-memory fallback
let useInMemoryCache = false;
let redisHealthWarningLogged = false;

// Create Redis client
let redisClient: Redis | null = null;
let redisConnected = false;

// In-memory cache fallback
const inMemoryCache = new Map<string, { value: string; expireAt?: number }>();
const inMemoryRateLimiters = new Map<string, number[]>();

// Initialize Redis with connection detection
async function initializeRedis(): Promise<void> {
  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        if (times === 1) {
          logger.debug(`Redis connection attempt ${times}, delay ${delay}ms`);
        }
        return times <= 2 ? delay : null; // Stop retrying after 2 attempts
      },
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      redisConnected = true;
      useInMemoryCache = false;
      logger.info('Redis connected');
    });

    redisClient.on('error', (err) => {
      if (redisConnected) {
        logger.warn('Redis error:', err);
      }
      redisConnected = false;
    });

    redisClient.on('close', () => {
      redisConnected = false;
    });

    // Try to connect
    await redisClient.connect();
    redisConnected = true;
  } catch (error) {
    if (!redisHealthWarningLogged) {
      logger.warn('Redis unavailable - using in-memory cache (data will not persist across restarts)');
      redisHealthWarningLogged = true;
    }
    useInMemoryCache = true;
    redisClient = null;
    redisConnected = false;
  }
}

// Initialize on module load
initializeRedis().catch((err) => {
  if (!redisHealthWarningLogged) {
    logger.warn('Redis initialization error - using in-memory cache:', err);
    redisHealthWarningLogged = true;
  }
  useInMemoryCache = true;
});

// Proxy redis object that works with both Redis and in-memory fallback
export const redis = {
  async get(key: string): Promise<string | null> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.get(key);
      } catch (err) {
        logger.debug('Redis get failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback
    const entry = inMemoryCache.get(key);
    if (!entry) return null;
    if (entry.expireAt && entry.expireAt < Date.now()) {
      inMemoryCache.delete(key);
      return null;
    }
    return entry.value;
  },

  async setex(key: string, ttlSeconds: number, value: string): Promise<string> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.setex(key, ttlSeconds, value);
      } catch (err) {
        logger.debug('Redis setex failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback
    inMemoryCache.set(key, {
      value,
      expireAt: Date.now() + ttlSeconds * 1000,
    });
    return 'OK';
  },

  async set(key: string, value: string, ...args: any[]): Promise<string | null> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.set(key, value, ...args);
      } catch (err) {
        logger.debug('Redis set failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback
    // Handle 'EX' ttl option and 'NX' (only if not exists)
    let ttlSeconds: number | undefined;
    let nxMode = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && i + 1 < args.length) {
        ttlSeconds = args[i + 1];
      }
      if (args[i] === 'NX') {
        nxMode = true;
      }
    }

    // If NX mode and key exists, return null
    if (nxMode && inMemoryCache.has(key)) {
      return null;
    }

    inMemoryCache.set(key, {
      value,
      expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
    return 'OK';
  },

  async del(...keys: string[]): Promise<number> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.del(...keys);
      } catch (err) {
        logger.debug('Redis del failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback
    let count = 0;
    for (const key of keys) {
      if (inMemoryCache.delete(key)) {
        count++;
      }
    }
    return count;
  },

  async keys(pattern: string): Promise<string[]> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.keys(pattern);
      } catch (err) {
        logger.debug('Redis keys failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback - basic pattern matching
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(inMemoryCache.keys()).filter((k) => regex.test(k));
  },

  async incr(key: string): Promise<number> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.incr(key);
      } catch (err) {
        logger.debug('Redis incr failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback
    const entry = inMemoryCache.get(key);
    const current = entry ? parseInt(entry.value, 10) || 0 : 0;
    const next = current + 1;
    inMemoryCache.set(key, { value: next.toString() });
    return next;
  },

  async expire(key: string, ttlSeconds: number): Promise<number> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.expire(key, ttlSeconds);
      } catch (err) {
        logger.debug('Redis expire failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback
    const entry = inMemoryCache.get(key);
    if (!entry) return 0;
    entry.expireAt = Date.now() + ttlSeconds * 1000;
    return 1;
  },

  async pexpire(key: string, ttlMs: number): Promise<number> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.pexpire(key, ttlMs);
      } catch (err) {
        logger.debug('Redis pexpire failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback
    const entry = inMemoryCache.get(key);
    if (!entry) return 0;
    entry.expireAt = Date.now() + ttlMs;
    return 1;
  },

  async ping(): Promise<string> {
    if (redisClient && redisConnected) {
      try {
        return await redisClient.ping();
      } catch (err) {
        logger.debug('Redis ping failed, falling back to in-memory:', err);
        redisConnected = false;
        useInMemoryCache = true;
      }
    }

    // In-memory fallback
    return 'PONG';
  },

  async quit(): Promise<void> {
    if (redisClient && redisConnected) {
      try {
        await redisClient.quit();
      } catch (err) {
        logger.debug('Redis quit error:', err);
      }
    }
    redisConnected = false;
  },

  multi() {
    if (redisClient && redisConnected) {
      return redisClient.multi();
    }

    // Return a mock transaction object for in-memory fallback
    // This is a simplified implementation for rate limiting
    const zsets = new Map<string, Array<{ score: number; member: string }>>();

    return {
      zremrangebyscore(key: string, min: number, max: number) {
        if (!zsets.has(key)) zsets.set(key, []);
        const set = zsets.get(key)!;
        const before = set.length;
        const filtered = set.filter((item) => item.score < min || item.score > max);
        zsets.set(key, filtered);
        return this;
      },
      zadd(key: string, score: string, member: string) {
        if (!zsets.has(key)) zsets.set(key, []);
        const set = zsets.get(key)!;
        set.push({ score: parseFloat(score), member });
        return this;
      },
      zcard(key: string) {
        const set = zsets.get(key) || [];
        return this;
      },
      pexpire(key: string, ttl: number) {
        return this;
      },
      async exec() {
        // Return mock response: [zremrangebyscore result, zadd result, zcard result, pexpire result]
        const zsetKey = Array.from(zsets.keys())[0];
        const count = zsetKey ? (zsets.get(zsetKey) || []).length : 0;
        return [[null, 0], [null, 1], [null, Math.max(1, count)], [null, 1]];
      },
    };
  },
} as any;

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
    const keysWithoutPrefix = keys.map((k: string) => k.replace(config.redis.keyPrefix, ''));
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
    // Use Redis transaction if available
    if (redisClient && redisConnected) {
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
    }
  } catch (err) {
    logger.debug('Redis rate limit check failed, using in-memory fallback:', err);
  }

  // In-memory fallback for rate limiting
  if (!inMemoryRateLimiters.has(key)) {
    inMemoryRateLimiters.set(key, []);
  }

  const requests = inMemoryRateLimiters.get(key)!;
  
  // Remove expired entries
  const validRequests = requests.filter((timestamp) => timestamp > windowStart);
  
  // Add current request
  validRequests.push(now);
  inMemoryRateLimiters.set(key, validRequests);

  const allowed = validRequests.length <= maxRequests;
  const remaining = Math.max(0, maxRequests - validRequests.length);
  const resetAt = new Date(now + windowMs);

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000),
  };
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
