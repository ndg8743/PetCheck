/**
 * Drug Interactions Routes
 * Check for drug-drug, drug-species, and drug-condition interactions
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { interactionEngine } from '../services/interactions';
import { optionalAuth } from '../middleware/auth';
import { interactionRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import {
  createApiResponse,
  ERROR_CODES,
  InteractionCheckRequest,
  SpeciesCategory,
} from '@petcheck/shared';

const logger = createLogger('interactions-routes');
const router = Router();

/**
 * POST /interactions/check
 * Check for drug interactions
 */
router.post(
  '/check',
  optionalAuth,
  interactionRateLimiter,
  [
    body('drugs')
      .isArray({ min: 1 })
      .withMessage('At least one drug is required'),
    body('drugs.*.name')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Drug name is required'),
    body('drugs.*.drugId')
      .optional()
      .isString(),
    body('drugs.*.dose')
      .optional()
      .isString(),
    body('drugs.*.route')
      .optional()
      .isString(),
    body('species')
      .optional()
      .isString()
      .isIn([
        'canine',
        'feline',
        'equine',
        'bovine',
        'porcine',
        'ovine',
        'caprine',
        'avian',
        'exotic',
        'other',
      ])
      .withMessage('Invalid species'),
    body('conditions')
      .optional()
      .isArray(),
    body('conditions.*')
      .optional()
      .isString()
      .trim(),
    body('weight')
      .optional()
      .isObject(),
    body('weight.value')
      .optional()
      .isFloat({ min: 0 }),
    body('weight.unit')
      .optional()
      .isIn(['kg', 'lb']),
    body('age')
      .optional()
      .isObject(),
    body('age.value')
      .optional()
      .isFloat({ min: 0 }),
    body('age.unit')
      .optional()
      .isIn(['day', 'week', 'month', 'year']),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid interaction check request', 400, {
        errors: errors.array(),
      });
    }

    const request: InteractionCheckRequest = {
      drugs: req.body.drugs,
    };

    if (req.body.species) {
      request.species = req.body.species as SpeciesCategory;
    }

    if (req.body.conditions && Array.isArray(req.body.conditions)) {
      request.conditions = req.body.conditions;
    }

    if (req.body.weight) {
      request.weight = req.body.weight;
    }

    if (req.body.age) {
      request.age = req.body.age;
    }

    logger.info('Checking interactions for:', {
      drugCount: request.drugs.length,
      species: request.species,
      conditionCount: request.conditions?.length || 0,
    });

    const result = await interactionEngine.checkInteractions(request);

    logger.info('Interaction check results:', {
      totalInteractions: result.summary.totalInteractions,
      highestSeverity: result.summary.highestSeverity,
    });

    res.json(createApiResponse(result, {
      totalInteractions: result.summary.totalInteractions,
      highestSeverity: result.summary.highestSeverity,
      checkedDrugs: result.checkedDrugs.length,
    }));
  })
);

export default router;
