/**
 * Drug Routes
 * Search and retrieve animal drug information from the Green Book
 */

import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { greenBookService } from '../services/openfda';
import { optionalAuth } from '../middleware/auth';
import { searchRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import {
  createApiResponse,
  ERROR_CODES,
  DrugSearchParams,
  SpeciesCategory,
  DrugClass,
  AdministrationRoute,
  DrugType,
} from '@petcheck/shared';

const logger = createLogger('drugs-routes');
const router = Router();

/**
 * GET /drugs
 * Search drugs with filters
 */
router.get(
  '/',
  optionalAuth,
  searchRateLimiter,
  [
    query('query').optional().isString().trim(),
    query('species').optional().isString(),
    query('drugClass').optional().isString(),
    query('route').optional().isString(),
    query('drugType').optional().isIn(['prescription', 'otc', 'controlled', 'unknown']),
    query('manufacturer').optional().isString().trim(),
    query('includeDiscontinued').optional().isBoolean().toBoolean(),
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

    const searchParams: DrugSearchParams = {
      query: req.query.query as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      includeDiscontinued: req.query.includeDiscontinued === 'true',
    };

    // Parse species array
    if (req.query.species) {
      const speciesStr = req.query.species as string;
      searchParams.species = speciesStr.split(',').map(s => s.trim() as SpeciesCategory);
    }

    // Parse drug class array
    if (req.query.drugClass) {
      const classStr = req.query.drugClass as string;
      searchParams.drugClass = classStr.split(',').map(c => c.trim() as DrugClass);
    }

    // Parse route array
    if (req.query.route) {
      const routeStr = req.query.route as string;
      searchParams.route = routeStr.split(',').map(r => r.trim() as AdministrationRoute);
    }

    if (req.query.drugType) {
      searchParams.drugType = req.query.drugType as DrugType;
    }

    if (req.query.manufacturer) {
      searchParams.manufacturer = req.query.manufacturer as string;
    }

    logger.info('Drug search:', searchParams);
    const result = await greenBookService.search(searchParams);

    res.json(createApiResponse(result, {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    }));
  })
);

/**
 * GET /drugs/name/:name
 * Get drug by name (trade or generic)
 * NOTE: This route must be defined BEFORE /:id to prevent "name" from matching as an ID
 */
router.get(
  '/name/:name',
  optionalAuth,
  [
    param('name').isString().trim().notEmpty().withMessage('Drug name is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid drug name', 400, {
        errors: errors.array(),
      });
    }

    const drugName = decodeURIComponent(req.params.name);
    const drug = await greenBookService.getDrugByName(drugName);

    if (!drug) {
      // Try to find similar drugs
      const normalizationResult = await greenBookService.normalizeDrugName(drugName);

      if (normalizationResult.matchedDrug && normalizationResult.confidence > 0.7) {
        return res.json(createApiResponse(normalizationResult.matchedDrug, {
          normalized: true,
          confidence: normalizationResult.confidence,
          originalName: drugName,
        }));
      }

      throw new AppError(
        ERROR_CODES.DRUG_NOT_FOUND,
        `Drug '${drugName}' not found`,
        404,
        {
          searchedName: drugName,
          suggestion: normalizationResult.matchedDrug?.tradeName,
          confidence: normalizationResult.confidence,
        }
      );
    }

    res.json(createApiResponse(drug));
  })
);

/**
 * GET /drugs/:id
 * Get drug by ID
 */
router.get(
  '/:id',
  optionalAuth,
  [
    param('id').isString().trim().notEmpty().withMessage('Drug ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid drug ID', 400, {
        errors: errors.array(),
      });
    }

    const drug = await greenBookService.getDrugById(req.params.id);

    if (!drug) {
      throw new AppError(
        ERROR_CODES.DRUG_NOT_FOUND,
        `Drug with ID ${req.params.id} not found`,
        404
      );
    }

    res.json(createApiResponse(drug));
  })
);

export default router;
