/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { createLogger } from '../services/logger';
import { ERROR_CODES, createErrorResponse, createApiError, ApiError } from '@petcheck/shared';

const logger = createLogger('error-handler');

/**
 * Custom application error
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json(
    createErrorResponse(
      createApiError(
        ERROR_CODES.NOT_FOUND,
        `Route not found: ${req.method} ${req.path}`,
        404
      )
    )
  );
}

/**
 * Global error handler
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.userId,
  });

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(createErrorResponse(err.toApiError()));
    return;
  }

  // Handle validation errors (from express-validator)
  if (err.name === 'ValidationError') {
    res.status(400).json(
      createErrorResponse(
        createApiError(ERROR_CODES.VALIDATION_ERROR, err.message, 400)
      )
    );
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json(
      createErrorResponse(
        createApiError(ERROR_CODES.INVALID_TOKEN, 'Invalid or expired token', 401)
      )
    );
    return;
  }

  // Handle Axios errors (external API failures)
  if (err.name === 'AxiosError') {
    const axiosError = err as any;

    if (axiosError.response?.status === 429) {
      res.status(503).json(
        createErrorResponse(
          createApiError(
            ERROR_CODES.OPENFDA_RATE_LIMITED,
            'External API rate limit exceeded. Please try again later.',
            503
          )
        )
      );
      return;
    }

    res.status(502).json(
      createErrorResponse(
        createApiError(
          ERROR_CODES.OPENFDA_ERROR,
          'External API error. Please try again later.',
          502
        )
      )
    );
    return;
  }

  // Handle syntax errors in JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(
      createErrorResponse(
        createApiError(ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON in request body', 400)
      )
    );
    return;
  }

  // Default internal server error
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(500).json(
    createErrorResponse(
      createApiError(ERROR_CODES.INTERNAL_ERROR, message, 500)
    )
  );
};

/**
 * Async handler wrapper to catch errors in async routes
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
