/**
 * Recalls Routes
 * Search and check FDA animal drug product recalls
 */

import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { recallsService } from '../services/openfda';
import { petService } from '../services/pets';
import { getGuestPets } from '../services/guest/mock-pets';
import { authenticate, optionalAuth } from '../middleware/auth';
import { setInCache, getFromCache } from '../services/redis';
import { searchRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import {
  createApiResponse,
  ERROR_CODES,
  RecallSearchParams,
  RecallClass,
  RecallStatus,
  PetRecallMatch,
  PetRecallMatchResponse,
} from '@petcheck/shared';
import crypto from 'crypto';

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

    // Parse status array.
    // openFDA uses 'ongoing' / 'terminated' / 'completed'. Accept the
    // friendlier 'active' as a synonym for 'ongoing' so callers using the
    // canonical lifecycle term don't get an empty result silently.
    if (req.query.status) {
      const statusStr = req.query.status as string;
      searchParams.status = statusStr
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .map((s) => (s === 'active' ? 'ongoing' : s) as RecallStatus);
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

    // Match the shape of GET /recalls so consumers can read `data.recalls`
    // consistently (instead of branching between array vs wrapped object).
    res.json(createApiResponse(
      {
        recalls,
        total: recalls.length,
        limit,
        offset: 0,
        query: { status: 'active' as const },
      },
      {
        total: recalls.length,
        activeOnly: true,
      }
    ));
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

/**
 * GET /recalls/check-pets
 * Cross-reference the authenticated user's pets' current medications against
 * active FDA recalls, so the dashboard / recalls page can show "1 active
 * recall affects Buddy". Cached per-user on a hash of the medication list
 * so a quiet user doesn't re-hit openFDA on every page load.
 */
router.get(
  '/check-pets',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const isGuest = !!req.user?.isGuest;
    const pets = isGuest
      ? getGuestPets()
      : await petService.getPetsByUserId(req.userId!);

    // Collect each pet's drug names + their generic names (case-insensitive
    // dedupe keys). We also keep a per-drug map of which (pet, med) pairs
    // would match so we can populate `affectedPets`.
    type DrugIndex = { drugName: string; petId: string; petName: string; medName: string };
    const drugIndex: DrugIndex[] = [];
    const drugNameSet = new Set<string>();
    for (const pet of pets) {
      for (const med of pet.currentMedications ?? []) {
        if (!med.isActive) continue;
        const candidates = [med.drugName, med.genericName].filter(Boolean) as string[];
        for (const name of candidates) {
          drugIndex.push({
            drugName: name,
            petId: pet.id,
            petName: pet.name,
            medName: med.drugName,
          });
          drugNameSet.add(name.toLowerCase());
        }
      }
    }

    if (drugNameSet.size === 0) {
      const empty: PetRecallMatchResponse = { matches: [], totalAffectedPets: 0, totalActiveRecalls: 0 };
      return res.json(createApiResponse(empty));
    }

    const sortedDrugs = [...drugNameSet].sort();
    const cacheKey = `recall-matches:user:${req.userId}:${crypto
      .createHash('sha1')
      .update(sortedDrugs.join('|'))
      .digest('hex')}`;
    const cached = await getFromCache<PetRecallMatchResponse>(cacheKey);
    if (cached && !cached.stale) {
      return res.json(createApiResponse(cached.data));
    }

    const recalls = await recallsService.getRecallsForDrugs([...drugNameSet]);
    const activeRecalls = recalls.filter((r) => r.status === 'ongoing');

    // For each active recall, list which (pet, medication) pairs matched.
    // openFDA puts the affected drug in productDescription / productName /
    // genericName; we match case-insensitively against any of them.
    const matches: PetRecallMatch[] = [];
    const affectedPetIds = new Set<string>();
    for (const recall of activeRecalls) {
      const haystack = [
        recall.productName,
        recall.productDescription,
        recall.genericName,
      ]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase();
      const affected = drugIndex.filter((d) =>
        haystack.includes(d.drugName.toLowerCase())
      );
      if (affected.length === 0) continue;

      // Dedupe by (petId, medName) so two-name candidates don't double up.
      const seen = new Set<string>();
      const affectedPets = affected
        .filter((a) => {
          const key = `${a.petId}|${a.medName}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((a) => ({ petId: a.petId, petName: a.petName, medicationName: a.medName }));

      affectedPets.forEach((p) => affectedPetIds.add(p.petId));
      matches.push({ recall, affectedPets });
    }

    const response: PetRecallMatchResponse = {
      matches,
      totalAffectedPets: affectedPetIds.size,
      totalActiveRecalls: activeRecalls.length,
    };

    await setInCache(cacheKey, response, { ttl: 300, staleTtl: 1800 });
    return res.json(createApiResponse(response));
  })
);

export default router;
