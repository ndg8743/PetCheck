/**
 * Authentication Routes
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { googleAuthService, DeviceInfo } from '../services/auth';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import { createApiResponse, ERROR_CODES } from '@petcheck/shared';

const logger = createLogger('auth-routes');
const router = Router();

/**
 * Extract device info from request
 */
function getDeviceInfo(req: Request): DeviceInfo {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               req.socket.remoteAddress ||
               req.ip,
    deviceName: req.body.deviceName,
    deviceType: req.body.deviceType,
  };
}

/**
 * POST /auth/google
 * Sign in or register with Google
 */
router.post(
  '/google',
  authRateLimiter,
  [
    body('credential').isString().notEmpty().withMessage('Google credential is required'),
    body('deviceName').optional().isString(),
    body('deviceType').optional().isString(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid request', 400, {
        errors: errors.array(),
      });
    }

    const { credential } = req.body;
    const deviceInfo = getDeviceInfo(req);

    logger.info('Google sign-in attempt');
    const result = await googleAuthService.signInWithGoogle(credential, deviceInfo);

    res.json(createApiResponse(result));
  })
);

/**
 * GET /auth/me
 * Get current user info
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await googleAuthService.getUserById(req.userId!);

    if (!user) {
      throw new AppError(ERROR_CODES.USER_NOT_FOUND, 'User not found', 404);
    }

    res.json(createApiResponse(user));
  })
);

/**
 * POST /auth/logout
 * Sign out current user (revokes current session)
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await googleAuthService.signOut(req.userId!, req.token!);
    res.json(createApiResponse({ message: 'Logged out successfully' }));
  })
);

/**
 * PATCH /auth/preferences
 * Update user preferences
 */
router.patch(
  '/preferences',
  authenticate,
  [
    body('theme').optional().isIn(['light', 'dark', 'system']),
    body('measurementSystem').optional().isIn(['metric', 'imperial']),
    body('defaultSpecies').optional().isString(),
    body('notifications').optional().isObject(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid preferences', 400, {
        errors: errors.array(),
      });
    }

    const user = await googleAuthService.updateUserPreferences(req.userId!, req.body);
    res.json(createApiResponse(user));
  })
);

/**
 * GET /auth/status
 * Check auth service status
 */
router.get('/status', (req: Request, res: Response) => {
  res.json(
    createApiResponse({
      googleOAuthConfigured: googleAuthService.isConfigured(),
    })
  );
});

/**
 * POST /auth/guest
 * Sign in as guest user (for demo/testing)
 */
router.post(
  '/guest',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const deviceInfo = getDeviceInfo(req);
    logger.info('Guest sign-in attempt');
    const result = await googleAuthService.signInAsGuest(deviceInfo);
    res.json(createApiResponse(result));
  })
);

/**
 * GET /auth/sessions
 * Get all active sessions for current user
 */
router.get(
  '/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const sessions = await googleAuthService.getUserSessions(req.userId!, req.token);
    res.json(createApiResponse(sessions));
  })
);

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  [
    param('sessionId').isUUID().withMessage('Invalid session ID'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid session ID', 400, {
        errors: errors.array(),
      });
    }

    await googleAuthService.revokeSession(req.userId!, req.params.sessionId);
    res.json(createApiResponse({ message: 'Session revoked successfully' }));
  })
);

/**
 * DELETE /auth/sessions
 * Revoke all sessions except current
 */
router.delete(
  '/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const revokedCount = await googleAuthService.revokeAllOtherSessions(req.userId!, req.token!);
    res.json(createApiResponse({
      message: `${revokedCount} session(s) revoked`,
      revokedCount,
    }));
  })
);

/**
 * POST /auth/logout-all
 * Sign out from all devices
 */
router.post(
  '/logout-all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await googleAuthService.signOutAllDevices(req.userId!);
    res.json(createApiResponse({ message: 'Logged out from all devices' }));
  })
);

export default router;
