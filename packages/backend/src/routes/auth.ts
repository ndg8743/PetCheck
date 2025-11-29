/**
 * Authentication Routes
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { googleAuthService } from '../services/auth';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import { createApiResponse, ERROR_CODES } from '@petcheck/shared';

const logger = createLogger('auth-routes');
const router = Router();

/**
 * POST /auth/google
 * Sign in or register with Google
 */
router.post(
  '/google',
  authRateLimiter,
  [
    body('credential').isString().notEmpty().withMessage('Google credential is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid request', 400, {
        errors: errors.array(),
      });
    }

    const { credential } = req.body;

    logger.info('Google sign-in attempt');
    const result = await googleAuthService.signInWithGoogle(credential);

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
 * Sign out current user
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await googleAuthService.signOut(req.userId!);
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
    logger.info('Guest sign-in attempt');
    const result = await googleAuthService.signInAsGuest();
    res.json(createApiResponse(result));
  })
);

export default router;
