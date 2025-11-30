/**
 * Notifications Routes
 * Handles push notification subscriptions and management
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import { pushService } from '../services/notifications';
import { googleAuthService } from '../services/auth';
import { createApiResponse, ERROR_CODES, PushSubscriptionData } from '@petcheck/shared';
import { config } from '../config';

const logger = createLogger('notifications-routes');
const router = Router();

/**
 * GET /api/notifications/vapid-public-key
 * Get the VAPID public key for push subscription
 */
router.get(
  '/vapid-public-key',
  asyncHandler(async (req: Request, res: Response) => {
    const publicKey = pushService.getPublicKey();

    if (!publicKey) {
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Push notifications are not configured',
        503
      );
    }

    res.json(createApiResponse({ publicKey }));
  })
);

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 */
router.post(
  '/subscribe',
  authenticate,
  [
    body('endpoint').isURL().withMessage('Valid endpoint URL required'),
    body('keys.p256dh').isString().notEmpty().withMessage('p256dh key required'),
    body('keys.auth').isString().notEmpty().withMessage('auth key required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid subscription data', 400, {
        errors: errors.array(),
      });
    }

    if (!pushService.isEnabled()) {
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Push notifications are not configured',
        503
      );
    }

    // Check if user has push notifications enabled in preferences
    const user = await googleAuthService.getUserById(req.userId!);
    if (!user?.preferences?.notifications?.pushNotifications) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Push notifications are disabled in your preferences',
        400
      );
    }

    const subscription: PushSubscriptionData = {
      endpoint: req.body.endpoint,
      expirationTime: req.body.expirationTime,
      keys: {
        p256dh: req.body.keys.p256dh,
        auth: req.body.keys.auth,
      },
    };

    const userAgent = req.headers['user-agent'];
    const stored = await pushService.subscribe(req.userId!, subscription, userAgent);

    logger.info(`User ${req.userId} subscribed to push notifications`);

    res.json(createApiResponse({
      message: 'Successfully subscribed to push notifications',
      deviceId: stored.deviceId,
    }));
  })
);

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from push notifications
 */
router.post(
  '/unsubscribe',
  authenticate,
  [
    body('deviceId').optional().isUUID().withMessage('Invalid device ID'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid request', 400, {
        errors: errors.array(),
      });
    }

    const { deviceId } = req.body;
    const count = await pushService.unsubscribe(req.userId!, deviceId);

    logger.info(`User ${req.userId} unsubscribed from push notifications (${count} devices)`);

    res.json(createApiResponse({
      message: 'Successfully unsubscribed from push notifications',
      devicesRemoved: count,
    }));
  })
);

/**
 * GET /api/notifications/subscriptions
 * Get user's active push subscriptions
 */
router.get(
  '/subscriptions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const subscriptions = await pushService.getUserSubscriptions(req.userId!);

    res.json(createApiResponse({
      subscriptions: subscriptions.map((s) => ({
        deviceId: s.deviceId,
        createdAt: s.createdAt,
        userAgent: s.userAgent,
      })),
    }));
  })
);

/**
 * POST /api/notifications/test
 * Send a test notification to the current user
 * Only available in development mode
 */
router.post(
  '/test',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!config.isDev) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        'Test notifications only available in development',
        403
      );
    }

    if (!pushService.isEnabled()) {
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Push notifications are not configured',
        503
      );
    }

    const results = await pushService.sendTestNotification(req.userId!);
    const success = results.some((r) => r.success);

    if (!success) {
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Failed to send test notification',
        500,
        { results }
      );
    }

    logger.info(`Test notification sent to user ${req.userId}`);

    res.json(createApiResponse({
      message: 'Test notification sent',
      results,
    }));
  })
);

/**
 * GET /api/notifications/status
 * Check notification service status
 */
router.get('/status', (req: Request, res: Response) => {
  res.json(
    createApiResponse({
      enabled: pushService.isEnabled(),
      configured: !!pushService.getPublicKey(),
    })
  );
});

export default router;
