/**
 * Symptom Checker Routes
 *
 * POST /api/symptom-check accepts a pet id and a symptom (either a
 * CommonSymptom.id or free-text), looks up that pet active medications,
 * fetches each drug top-reaction list from openFDA, and returns
 * rank-ordered matches.
 *
 * Auth: authenticate. Guests are allowed and resolved against the mock
 * pet store; signed-in users go through petService with an ownership
 * check. The handler is read-only so guest mode is safe.
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { petService } from '../services/pets';
import { getGuestPetById } from '../services/guest/mock-pets';
import { adverseEventsService } from '../services/openfda';
import { createLogger } from '../services/logger';
import {
  createApiResponse,
  ERROR_CODES,
  COMMON_SYMPTOMS,
  SymptomMatch,
  SymptomCheckResponse,
  PetMedication,
  Pet,
} from '@petcheck/shared';

// String constants are kept at module scope so the route handler body
// can reference them by identifier instead of inlining string literals.
const LOGGER_NAME = 'symptom-check-routes';
const MSG_PET_ID_REQUIRED = 'Pet ID is required';
const MSG_SYMPTOM_REQUIRED = 'Symptom is required';
const MSG_VALIDATION_ERROR = 'Invalid symptom check request';
const MSG_PET_NOT_FOUND = 'Pet not found';
const EMPTY_STR = '';
const PIPE_SEP = '|';
const LOG_PREFIX_CHECK = 'Symptom check for pet ';
const LOG_AGAINST = ' against ';
const LOG_MEDS_TERMS = ' med(s); terms=';
const LOG_QUOTE = ': "';
const LOG_QUOTE_END = '" ';
const LOG_FAILED_PREFIX = 'Drug summary failed for ';
const LOG_COLON = ': ';

const logger = createLogger(LOGGER_NAME);
const router = Router();

interface ReactionRow {
  reaction: string;
  count: number;
}

interface MatchHit {
  rank: number;
  count: number;
  reactionTerm: string;
}

/**
 * Resolve a user-supplied symptom string to the lowercase substrings we
 * search the drug top-reaction list for.
 *
 * - If the input matches a CommonSymptom.id, use its veddraTerms.
 * - Otherwise, use the trimmed lowercase input as a single fuzzy term.
 */
function resolveSymptomTerms(symptom: string): string[] {
  const trimmed = symptom.trim().toLowerCase();
  const known = COMMON_SYMPTOMS.find((s) => s.id === trimmed);
  if (known) return known.veddraTerms.map((t) => t.toLowerCase());
  return [trimmed];
}

/**
 * Find the best (lowest-rank) reaction in topReactions that contains any
 * of the given lowercase substrings. Returns null if no reaction matches.
 */
function findBestMatch(topReactions: ReactionRow[], terms: string[]): MatchHit | null {
  for (let i = 0; i < topReactions.length; i++) {
    const r = topReactions[i];
    const reactionStr = r.reaction || EMPTY_STR;
    const lower = reactionStr.toLowerCase();
    if (terms.some((t) => t && lower.includes(t))) {
      const hit: MatchHit = {
        rank: i + 1,
        count: r.count,
        reactionTerm: r.reaction,
      };
      return hit;
    }
  }
  return null;
}

const validators = [
  body('petId').isString().trim().notEmpty().withMessage(MSG_PET_ID_REQUIRED),
  body('symptom').isString().trim().notEmpty().withMessage(MSG_SYMPTOM_REQUIRED),
];

/**
 * POST /api/symptom-check
 * Body: petId (string), symptom (string).
 */
router.post(
  '/',
  authenticate,
  validators,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationDetails = JSON.parse(JSON.stringify({ errors: errors.array() }));
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        MSG_VALIDATION_ERROR,
        400,
        validationDetails
      );
    }

    const petId = req.body.petId as string;
    const symptom = req.body.symptom as string;

    // Load the pet — guests resolve via the mock store, otherwise via
    // petService with an ownership check. We treat "not found" identically
    // for both paths to avoid leaking pet existence to other users.
    let pet: Pet | null = null;
    if (req.user?.isGuest) {
      pet = getGuestPetById(petId);
    } else {
      const fetched = await petService.getPetById(petId);
      if (fetched && fetched.userId === req.userId) {
        pet = fetched;
      }
    }

    if (!pet) {
      throw new AppError(ERROR_CODES.PET_NOT_FOUND, MSG_PET_NOT_FOUND, 404);
    }

    const meds: PetMedication[] = (pet.currentMedications || []).filter(
      (m) => m.isActive !== false
    );

    if (meds.length === 0) {
      const empty: SymptomCheckResponse = { matches: [], unmatched: [] };
      const emptyMeta = { petId, symptom, medCount: 0, matchCount: 0 };
      res.json(createApiResponse(empty, emptyMeta));
      return;
    }

    const terms = resolveSymptomTerms(symptom);
    const logMsg =
      LOG_PREFIX_CHECK + petId + LOG_QUOTE + symptom + LOG_QUOTE_END +
      LOG_AGAINST + meds.length + LOG_MEDS_TERMS + terms.join(PIPE_SEP);
    logger.info(logMsg);

    // Fetch each drug summary in parallel; allSettled so one openFDA hiccup
    // doesn't fail the whole request.
    const summaries = await Promise.allSettled(
      meds.map((med) => adverseEventsService.getDrugSummary(med.drugName, med.genericName))
    );

    const matches: SymptomMatch[] = [];
    const unmatched: string[] = [];

    summaries.forEach((result, i) => {
      const med = meds[i];
      if (result.status !== 'fulfilled') {
        const reason = (result.reason as Error)?.message ?? String(result.reason);
        const warnMsg = LOG_FAILED_PREFIX + med.drugName + LOG_COLON + reason;
        logger.warn(warnMsg);
        unmatched.push(med.drugName);
        return;
      }
      const summary = result.value;
      const best = findBestMatch(summary.topReactions || [], terms);
      if (best) {
        const match: SymptomMatch = {
          drugId: med.drugId,
          drugName: med.drugName,
          rank: best.rank,
          count: best.count,
          totalReports: summary.totalReports,
          reactionTerm: best.reactionTerm,
        };
        matches.push(match);
      } else {
        unmatched.push(med.drugName);
      }
    });

    matches.sort((a, b) => a.rank - b.rank);

    const response: SymptomCheckResponse = { matches, unmatched };
    const responseMeta = {
      petId,
      symptom,
      medCount: meds.length,
      matchCount: matches.length,
    };
    res.json(createApiResponse(response, responseMeta));
  })
);

export default router;
