/**
 * Health Check Routes
 * Monitor application and service status
 */

import { Router, Request, Response } from 'express';
import { createLogger } from '../services/logger';
import { redis } from '../services/redis';
import { googleAuthService } from '../services/auth';
import { vetLookupService } from '../services/places';
import { config } from '../config';
import { createApiResponse, HealthCheckResponse, ServiceStatus } from '@petcheck/shared';
import axios from 'axios';

const logger = createLogger('health-routes');
const router = Router();

// Track startup time
const startTime = Date.now();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const uptime = Math.floor((Date.now() - startTime) / 1000); // seconds

    // Check Redis
    const redisStatus = await checkRedis();

    // Check OpenFDA API
    const openFdaStatus = await checkOpenFda();

    // Check Google Auth
    const googleAuthStatus = checkGoogleAuth();

    // Check Google Places (optional)
    const googlePlacesStatus = checkGooglePlaces();

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (
      redisStatus.status === 'down' ||
      openFdaStatus.status === 'down' ||
      googleAuthStatus.status === 'down'
    ) {
      overallStatus = 'unhealthy';
    } else if (
      redisStatus.status === 'degraded' ||
      openFdaStatus.status === 'degraded' ||
      googleAuthStatus.status === 'degraded'
    ) {
      overallStatus = 'degraded';
    }

    const healthCheck: HealthCheckResponse = {
      status: overallStatus,
      version: process.env.npm_package_version || '1.0.0',
      uptime,
      timestamp: new Date(),
      services: {
        redis: redisStatus,
        openFda: openFdaStatus,
        googleAuth: googleAuthStatus,
        googlePlaces: googlePlacesStatus,
      },
    };

    // Return 503 if unhealthy, 200 otherwise
    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(createApiResponse(healthCheck));
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json(
      createApiResponse({
        status: 'unhealthy',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date(),
        services: {
          redis: { status: 'down' },
          openFda: { status: 'down' },
          googleAuth: { status: 'down' },
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      } as any)
    );
  }
});

/**
 * GET /health/ready
 * Readiness probe - checks if service is ready to accept traffic
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check critical services
    const redisStatus = await checkRedis();

    if (redisStatus.status === 'down') {
      return res.status(503).json(
        createApiResponse({
          ready: false,
          reason: 'Redis is unavailable',
        })
      );
    }

    res.json(createApiResponse({ ready: true }));
  } catch (error) {
    logger.error('Readiness check error:', error);
    res.status(503).json(
      createApiResponse({
        ready: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
});

/**
 * GET /health/live
 * Liveness probe - checks if service is alive (for Kubernetes, etc.)
 */
router.get('/live', (req: Request, res: Response) => {
  res.json(createApiResponse({ alive: true }));
});

/**
 * Helper functions for checking individual services
 */

async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await redis.ping();
    const latency = Date.now() - start;

    return {
      status: latency < 100 ? 'up' : 'degraded',
      latency,
      lastChecked: new Date(),
      message: latency < 100 ? 'Connected' : 'Slow response',
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'down',
      lastChecked: new Date(),
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

async function checkOpenFda(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Make a simple test request to OpenFDA
    const response = await axios.get(
      `${config.openFda.baseUrl}${config.openFda.adverseEventsEndpoint}`,
      {
        params: {
          limit: 1,
          api_key: config.openFda.apiKey || undefined,
        },
        timeout: 5000,
      }
    );

    const latency = Date.now() - start;

    if (response.status === 200) {
      return {
        status: latency < 2000 ? 'up' : 'degraded',
        latency,
        lastChecked: new Date(),
        message: latency < 2000 ? 'Available' : 'Slow response',
      };
    }

    return {
      status: 'degraded',
      latency,
      lastChecked: new Date(),
      message: `HTTP ${response.status}`,
    };
  } catch (error) {
    logger.warn('OpenFDA health check failed:', error);

    // OpenFDA being down is degraded, not critical
    return {
      status: 'degraded',
      lastChecked: new Date(),
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

function checkGoogleAuth(): ServiceStatus {
  const configured = googleAuthService.isConfigured();

  return {
    status: configured ? 'up' : 'degraded',
    lastChecked: new Date(),
    message: configured ? 'Configured' : 'Not configured (OAuth disabled)',
  };
}

function checkGooglePlaces(): ServiceStatus {
  const configured = vetLookupService.isConfigured();

  return {
    status: configured ? 'up' : 'degraded',
    lastChecked: new Date(),
    message: configured ? 'Configured' : 'Not configured (using mock data)',
  };
}

export default router;
