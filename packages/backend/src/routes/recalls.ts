/**
 * Recalls Routes
 * Search and check FDA animal drug product recalls
 */

import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { recallsService } from '../services/openfda';
import { optionalAuth } from '../middleware/auth';
import { searchRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import {
  createApiResponse,
  ERROR_CODES,
  RecallSearchParams,
  RecallClass,
  RecallStatus,
} from '@petcheck/shared';

const logger = createLogger('recalls-routes');
const router = Router();

/**
 * GET /recalls
 * Search recalls with filters
 */
router.get(
  '/',
  optionalAuth,
  searchRateLimiter,
  [
    query('query').optional().isString().trim(),
    query('productName').optional().isString().trim(),
    query('manufacturer').optional().isString().trim(),
    query('recallClass').optional().isString(),
    query('status').optional().isString(),
    query('dateFrom').optional().matches(/^\d{8}$/),
    query('dateTo').optional().matches(/^\d{8}$/),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid search parameters', 400, {
        errors: errors.array(),
      });
    }

    const searchParams: RecallSearchParams = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    if (req.query.query) {
      searchParams.query = req.query.query as string;
    }

    if (req.query.productName) {
      searchParams.productName = req.query.productName as string;
    }

    if (req.query.manufacturer) {
      searchParams.manufacturer = req.query.manufacturer as string;
    }

    // Parse recall class array
    if (req.query.recallClass) {
      const classStr = req.query.recallClass as string;
      searchParams.recallClass = classStr.split(',').map(c => c.trim() as RecallClass);
    }

    // Parse status array
    if (req.query.status) {
      const statusStr = req.query.status as string;
      searchParams.status = statusStr.split(',').map(s => s.trim() as RecallStatus);
    }

    if (req.query.dateFrom) {
      searchParams.dateFrom = req.query.dateFrom as string;
    }

    if (req.query.dateTo) {
      searchParams.dateTo = req.query.dateTo as string;
    }

    logger.info('Recalls search:', searchParams);
    const result = await recallsService.search(searchParams);

    res.json(createApiResponse(result, {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    }));
  })
);

/**
 * GET /recalls/active
 * Get currently active recalls
 */
router.get(
  '/active',
  optionalAuth,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid parameters', 400, {
        errors: errors.array(),
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    logger.info('Getting active recalls');
    const recalls = await recallsService.getActiveRecalls(limit);

    res.json(createApiResponse(recalls, {
      total: recalls.length,
      activeOnly: true,
    }));
  })
);

/**
 * GET /recalls/check/:drugName
 * Check if a specific drug has any active recalls
 */
router.get(
  '/check/:drugName',
  optionalAuth,
  [
    param('drugName').isString().trim().notEmpty().withMessage('Drug name is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid drug name', 400, {
        errors: errors.array(),
      });
    }

    const drugName = decodeURIComponent(req.params.drugName);

    logger.info(`Checking recall status for: ${drugName}`);
    const status = await recallsService.checkDrugRecallStatus(drugName);

    res.json(createApiResponse(status, {
      drugName,
      checked: true,
      hasActiveRecall: status.hasActiveRecall,
      activeRecallCount: status.recalls.length,
    }));
  })
);

export default router;
