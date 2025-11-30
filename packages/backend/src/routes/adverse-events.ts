/**
 * Adverse Events Routes
 * Search and analyze FDA animal drug adverse event reports
 */

import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { adverseEventsService } from '../services/openfda';
import { optionalAuth, requireResearchAccess } from '../middleware/auth';
import { searchRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import {
  createApiResponse,
  ERROR_CODES,
  AdverseEventSearchParams,
  SpeciesCategory,
  OutcomeSeriousness,
  formatDateForOpenFda,
} from '@petcheck/shared';

const logger = createLogger('adverse-events-routes');
const router = Router();

/**
 * GET /adverse-events
 * Search adverse events with filters
 */
router.get(
  '/',
  optionalAuth,
  searchRateLimiter,
  [
    query('species').optional().isString(),
    query('drugName').optional().isString().trim(),
    query('activeIngredient').optional().isString().trim(),
    query('manufacturer').optional().isString().trim(),
    query('reaction').optional().isString().trim(),
    query('outcome').optional().isString(),
    query('route').optional().isString().trim(),
    query('dateFrom').optional().matches(/^\d{8}$/),
    query('dateTo').optional().matches(/^\d{8}$/),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid search parameters', 400, {
        errors: errors.array(),
      });
    }

    const searchParams: AdverseEventSearchParams = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
    };

    // Parse species array
    if (req.query.species) {
      const speciesStr = req.query.species as string;
      searchParams.species = speciesStr.split(',').map(s => s.trim() as SpeciesCategory);
    }

    if (req.query.drugName) {
      searchParams.drugName = req.query.drugName as string;
    }

    if (req.query.activeIngredient) {
      searchParams.activeIngredient = req.query.activeIngredient as string;
    }

    if (req.query.manufacturer) {
      searchParams.manufacturer = req.query.manufacturer as string;
    }

    if (req.query.reaction) {
      searchParams.reaction = req.query.reaction as string;
    }

    // Parse outcome array
    if (req.query.outcome) {
      const outcomeStr = req.query.outcome as string;
      searchParams.outcome = outcomeStr.split(',').map(o => o.trim() as OutcomeSeriousness);
    }

    if (req.query.route) {
      searchParams.route = req.query.route as string;
    }

    if (req.query.dateFrom) {
      searchParams.dateFrom = req.query.dateFrom as string;
    }

    if (req.query.dateTo) {
      searchParams.dateTo = req.query.dateTo as string;
    }

    logger.info('Adverse events search:', searchParams);
    const result = await adverseEventsService.search(searchParams);

    res.json(createApiResponse(result, {
      total: result.total,
      limit: result.limit,
      skip: result.skip,
    }));
  })
);

/**
 * GET /adverse-events/count/:field
 * Get aggregated counts by field (species, reaction, outcome, drug, route, time_series)
 */
router.get(
  '/count/:field',
  optionalAuth,
  searchRateLimiter,
  [
    param('field')
      .isIn(['species', 'reaction', 'outcome', 'drug', 'route', 'time_series'])
      .withMessage('Invalid aggregation field'),
    query('species').optional().isString(),
    query('drugName').optional().isString().trim(),
    query('activeIngredient').optional().isString().trim(),
    query('manufacturer').optional().isString().trim(),
    query('reaction').optional().isString().trim(),
    query('outcome').optional().isString(),
    query('route').optional().isString().trim(),
    query('dateFrom').optional().matches(/^\d{8}$/),
    query('dateTo').optional().matches(/^\d{8}$/),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid aggregation parameters', 400, {
        errors: errors.array(),
      });
    }

    const field = req.params.field;
    const searchParams: AdverseEventSearchParams = {};

    // Parse species array
    if (req.query.species) {
      const speciesStr = req.query.species as string;
      searchParams.species = speciesStr.split(',').map(s => s.trim() as SpeciesCategory);
    }

    if (req.query.drugName) {
      searchParams.drugName = req.query.drugName as string;
    }

    if (req.query.activeIngredient) {
      searchParams.activeIngredient = req.query.activeIngredient as string;
    }

    if (req.query.manufacturer) {
      searchParams.manufacturer = req.query.manufacturer as string;
    }

    if (req.query.reaction) {
      searchParams.reaction = req.query.reaction as string;
    }

    // Parse outcome array
    if (req.query.outcome) {
      const outcomeStr = req.query.outcome as string;
      searchParams.outcome = outcomeStr.split(',').map(o => o.trim() as OutcomeSeriousness);
    }

    if (req.query.route) {
      searchParams.route = req.query.route as string;
    }

    if (req.query.dateFrom) {
      searchParams.dateFrom = req.query.dateFrom as string;
    }

    if (req.query.dateTo) {
      searchParams.dateTo = req.query.dateTo as string;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    logger.info(`Adverse events aggregation by ${field}:`, searchParams);
    const result = await adverseEventsService.getAggregation(searchParams, field, limit);

    res.json(createApiResponse(result, {
      total: result.total,
      count: result.data.length,
    }));
  })
);

/**
 * GET /adverse-events/summary/:drugName
 * Get comprehensive summary for a specific drug
 * @query genericName - Optional generic name (active ingredient) for better search results
 */
router.get(
  '/summary/:drugName',
  optionalAuth,
  searchRateLimiter,
  [
    param('drugName').isString().trim().notEmpty().withMessage('Drug name is required'),
    query('genericName').optional().isString().trim(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid drug name', 400, {
        errors: errors.array(),
      });
    }

    const drugName = decodeURIComponent(req.params.drugName);
    const genericName = req.query.genericName as string | undefined;

    logger.info(`Getting adverse events summary for: ${drugName}${genericName ? ` (generic: ${genericName})` : ''}`);
    const summary = await adverseEventsService.getDrugSummary(drugName, genericName);

    if (summary.totalReports === 0) {
      logger.info(`No adverse events found for drug: ${drugName}`);
    }

    res.json(createApiResponse(summary, {
      drugName,
      genericName,
      totalReports: summary.totalReports,
    }));
  })
);

export default router;
