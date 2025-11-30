/**
 * Routes Index
 * Combines and exports all API routes
 */

import { Router } from 'express';
import { apiRateLimiter } from '../middleware/rate-limit';

// Import route modules
import authRoutes from './auth';
import drugsRoutes from './drugs';
import adverseEventsRoutes from './adverse-events';
import recallsRoutes from './recalls';
import interactionsRoutes from './interactions';
import petsRoutes from './pets';
import vetsRoutes from './vets';
import healthRoutes from './health';
import notificationsRoutes from './notifications';

const router = Router();

// Health check routes (no rate limiting for health checks)
router.use('/health', healthRoutes);

// Apply general API rate limiting to all routes below
router.use(apiRateLimiter);

// Mount route modules
router.use('/auth', authRoutes);
router.use('/drugs', drugsRoutes);
router.use('/adverse-events', adverseEventsRoutes);
router.use('/recalls', recallsRoutes);
router.use('/interactions', interactionsRoutes);
router.use('/pets', petsRoutes);
router.use('/vets', vetsRoutes);
router.use('/notifications', notificationsRoutes);

// API root endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'PetCheck API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'FDA Animal Drug Safety Explorer API',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        drugs: '/api/drugs',
        adverseEvents: '/api/adverse-events',
        recalls: '/api/recalls',
        interactions: '/api/interactions',
        pets: '/api/pets',
        vets: '/api/vets',
        notifications: '/api/notifications',
      },
      documentation: {
        github: 'https://github.com/yourusername/petcheck',
        apiDocs: '/api/docs', // Future: Add Swagger/OpenAPI docs
      },
    },
  });
});

export default router;
