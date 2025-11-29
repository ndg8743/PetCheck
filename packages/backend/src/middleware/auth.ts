/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { googleAuthService } from '../services/auth';
import { createLogger } from '../services/logger';
import { AuthTokenPayload, UserRole, ERROR_CODES, createErrorResponse, createApiError } from '@petcheck/shared';

const logger = createLogger('auth-middleware');

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      userId?: string;
    }
  }
}

/**
 * Authenticate request using JWT token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(
        createErrorResponse(
          createApiError(ERROR_CODES.UNAUTHORIZED, 'No authorization token provided', 401)
        )
      );
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    const payload = await googleAuthService.verifyToken(token);
    req.user = payload;
    req.userId = payload.userId;

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    logger.warn(`Authentication failed: ${message}`);

    if (message.includes('expired')) {
      res.status(401).json(
        createErrorResponse(
          createApiError(ERROR_CODES.TOKEN_EXPIRED, 'Token has expired', 401)
        )
      );
      return;
    }

    res.status(401).json(
      createErrorResponse(
        createApiError(ERROR_CODES.INVALID_TOKEN, message, 401)
      )
    );
  }
}

/**
 * Optional authentication - continues even if no token
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await googleAuthService.verifyToken(token);
      req.user = payload;
      req.userId = payload.userId;
    }

    next();
  } catch (error) {
    // Log but continue without authentication
    logger.debug('Optional auth failed, continuing without user');
    next();
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(
        createErrorResponse(
          createApiError(ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401)
        )
      );
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.userId} with role ${req.user.role}`);
      res.status(403).json(
        createErrorResponse(
          createApiError(
            ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            `This action requires one of the following roles: ${roles.join(', ')}`,
            403
          )
        )
      );
      return;
    }

    next();
  };
}

/**
 * Require veterinarian or researcher role
 */
export const requireResearchAccess = requireRole('veterinarian', 'researcher', 'admin');

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Rate limiting for authenticated users
 */
export function userRateLimit(maxRequests: number, windowMs: number) {
  const userRequests: Map<string, { count: number; resetAt: number }> = new Map();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.userId || req.ip;
    const now = Date.now();

    let userData = userRequests.get(userId);

    if (!userData || now > userData.resetAt) {
      userData = { count: 1, resetAt: now + windowMs };
      userRequests.set(userId, userData);
      next();
      return;
    }

    userData.count++;

    if (userData.count > maxRequests) {
      const retryAfter = Math.ceil((userData.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json(
        createErrorResponse(
          createApiError(ERROR_CODES.RATE_LIMITED, 'Too many requests', 429, {
            retryAfter,
          })
        )
      );
      return;
    }

    next();
  };
}
