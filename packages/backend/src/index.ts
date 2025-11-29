/**
 * PetCheck API Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config, validateConfig } from './config';
import { createLogger } from './services/logger';
import { redis, isRedisHealthy } from './services/redis';
import { greenBookService } from './services/openfda';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import routes from './routes';

const logger = createLogger('server');

async function startServer(): Promise<void> {
  // Validate configuration
  try {
    validateConfig();
  } catch (error) {
    logger.error('Configuration validation failed:', error);
    process.exit(1);
  }

  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: config.isDev ? false : undefined,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS
  app.use(cors({
    origin: config.cors.origins,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // API Routes
  app.use('/api', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  // Initialize services
  logger.info('Initializing services...');

  // Check Redis connection
  const redisHealthy = await isRedisHealthy();
  if (!redisHealthy) {
    logger.warn('Redis is not available - caching will be disabled');
  } else {
    logger.info('Redis connected successfully');
  }

  // Initialize Green Book drug database
  try {
    await greenBookService.initialize();
    logger.info('Green Book service initialized');
  } catch (error) {
    logger.error('Failed to initialize Green Book service:', error);
  }

  // Start server
  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`API Base URL: ${config.apiBaseUrl}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      // Close Redis connection
      try {
        await redis.quit();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis:', error);
      }

      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
