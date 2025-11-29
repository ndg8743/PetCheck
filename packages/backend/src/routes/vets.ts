/**
 * Veterinary Clinic Lookup Routes
 * Search for veterinarians using Google Places API
 */

import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { vetLookupService } from '../services/places';
import { optionalAuth } from '../middleware/auth';
import { searchRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import {
  createApiResponse,
  ERROR_CODES,
} from '@petcheck/shared';

const logger = createLogger('vets-routes');
const router = Router();

/**
 * GET /vets/search
 * Search for veterinary clinics by location (latitude/longitude)
 */
router.get(
  '/search',
  optionalAuth,
  searchRateLimiter,
  [
    query('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude is required'),
    query('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude is required'),
    query('radius')
      .optional()
      .isInt({ min: 100, max: 50000 })
      .toInt()
      .withMessage('Radius must be between 100 and 50000 meters'),
    query('keyword')
      .optional()
      .isString()
      .trim(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid search parameters', 400, {
        errors: errors.array(),
      });
    }

    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const radius = req.query.radius ? parseInt(req.query.radius as string) : 5000;
    const keyword = req.query.keyword as string | undefined;

    logger.info('Vet search:', { latitude, longitude, radius, keyword });

    const result = await vetLookupService.searchVets({
      latitude,
      longitude,
      radius,
      keyword,
    });

    res.json(createApiResponse(result, {
      total: result.total,
      searchLocation: result.searchLocation,
      radius: result.radius,
      googlePlacesConfigured: vetLookupService.isConfigured(),
    }));
  })
);

/**
 * GET /vets/search/address
 * Search for veterinary clinics by address
 */
router.get(
  '/search/address',
  optionalAuth,
  searchRateLimiter,
  [
    query('address')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Address is required'),
    query('radius')
      .optional()
      .isInt({ min: 100, max: 50000 })
      .toInt()
      .withMessage('Radius must be between 100 and 50000 meters'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid search parameters', 400, {
        errors: errors.array(),
      });
    }

    const address = req.query.address as string;
    const radius = req.query.radius ? parseInt(req.query.radius as string) : 5000;

    logger.info('Vet search by address:', { address, radius });

    const result = await vetLookupService.searchByAddress(address, radius);

    if (result.total === 0) {
      logger.warn(`No results found for address: ${address}`);
    }

    res.json(createApiResponse(result, {
      total: result.total,
      searchLocation: result.searchLocation,
      radius: result.radius,
      searchedAddress: address,
      googlePlacesConfigured: vetLookupService.isConfigured(),
    }));
  })
);

/**
 * GET /vets/:placeId
 * Get detailed information for a specific clinic
 */
router.get(
  '/:placeId',
  optionalAuth,
  [
    param('placeId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Place ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid place ID', 400, {
        errors: errors.array(),
      });
    }

    const placeId = req.params.placeId;

    logger.info(`Getting clinic details for place ID: ${placeId}`);

    const clinic = await vetLookupService.getClinicDetails(placeId);

    if (!clinic) {
      throw new AppError(
        ERROR_CODES.NOT_FOUND,
        `Clinic with place ID ${placeId} not found`,
        404
      );
    }

    res.json(createApiResponse(clinic));
  })
);

export default router;
