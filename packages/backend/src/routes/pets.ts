/**
 * Pet Management Routes
 * CRUD operations for pet profiles, medications, conditions, and allergies
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { petService } from '../services/pets';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { createLogger } from '../services/logger';
import {
  createApiResponse,
  ERROR_CODES,
  PetCreateRequest,
  PetUpdateRequest,
  PetMedication,
  MedicalCondition,
  Allergy,
  SpeciesCategory,
} from '@petcheck/shared';

const logger = createLogger('pets-routes');
const router = Router();

/**
 * GET /pets
 * Get all pets for the authenticated user
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const pets = await petService.getPetsByUserId(req.userId!);

    res.json(createApiResponse(pets, {
      total: pets.length,
    }));
  })
);

/**
 * POST /pets
 * Create a new pet profile
 */
router.post(
  '/',
  authenticate,
  [
    body('name').isString().trim().notEmpty().withMessage('Pet name is required'),
    body('species')
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
      .withMessage('Valid species is required'),
    body('breed').optional().isString().trim(),
    body('dateOfBirth').optional().isISO8601(),
    body('approximateAge').optional().isObject(),
    body('approximateAge.value').optional().isInt({ min: 0 }),
    body('approximateAge.unit').optional().isIn(['month', 'year']),
    body('weight').optional().isObject(),
    body('weight.value').optional().isFloat({ min: 0 }),
    body('weight.unit').optional().isIn(['kg', 'lb']),
    body('gender').optional().isIn(['male', 'female', 'unknown']),
    body('isNeutered').optional().isBoolean(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid pet data', 400, {
        errors: errors.array(),
      });
    }

    const petData: PetCreateRequest = {
      name: req.body.name,
      species: req.body.species as SpeciesCategory,
      breed: req.body.breed,
      dateOfBirth: req.body.dateOfBirth,
      approximateAge: req.body.approximateAge,
      weight: req.body.weight,
      gender: req.body.gender,
      isNeutered: req.body.isNeutered,
    };

    const pet = await petService.createPet(req.userId!, petData);

    logger.info(`Pet created: ${pet.id} for user ${req.userId}`);
    res.status(201).json(createApiResponse(pet));
  })
);

/**
 * GET /pets/:id
 * Get a specific pet by ID
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid pet ID', 400, {
        errors: errors.array(),
      });
    }

    const pet = await petService.getPetById(req.params.id);

    if (!pet) {
      throw new AppError(ERROR_CODES.PET_NOT_FOUND, 'Pet not found', 404);
    }

    if (pet.userId !== req.userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You do not have permission to access this pet',
        403
      );
    }

    res.json(createApiResponse(pet));
  })
);

/**
 * PATCH /pets/:id
 * Update a pet profile
 */
router.patch(
  '/:id',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
    body('name').optional().isString().trim(),
    body('breed').optional().isString().trim(),
    body('dateOfBirth').optional().isISO8601(),
    body('approximateAge').optional().isObject(),
    body('approximateAge.value').optional().isInt({ min: 0 }),
    body('approximateAge.unit').optional().isIn(['month', 'year']),
    body('weight').optional().isObject(),
    body('weight.value').optional().isFloat({ min: 0 }),
    body('weight.unit').optional().isIn(['kg', 'lb']),
    body('gender').optional().isIn(['male', 'female', 'unknown']),
    body('isNeutered').optional().isBoolean(),
    body('microchipId').optional().isString().trim(),
    body('profileImageUrl').optional().isString().trim(),
    body('notes').optional().isString().trim(),
    body('veterinarian').optional().isObject(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid update data', 400, {
        errors: errors.array(),
      });
    }

    const updateData: PetUpdateRequest = {};

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.breed !== undefined) updateData.breed = req.body.breed;
    if (req.body.dateOfBirth !== undefined) updateData.dateOfBirth = req.body.dateOfBirth;
    if (req.body.approximateAge !== undefined) updateData.approximateAge = req.body.approximateAge;
    if (req.body.weight !== undefined) updateData.weight = req.body.weight;
    if (req.body.gender !== undefined) updateData.gender = req.body.gender;
    if (req.body.isNeutered !== undefined) updateData.isNeutered = req.body.isNeutered;
    if (req.body.microchipId !== undefined) updateData.microchipId = req.body.microchipId;
    if (req.body.profileImageUrl !== undefined) updateData.profileImageUrl = req.body.profileImageUrl;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.veterinarian !== undefined) updateData.veterinarian = req.body.veterinarian;

    const pet = await petService.updatePet(req.params.id, req.userId!, updateData);

    logger.info(`Pet updated: ${req.params.id}`);
    res.json(createApiResponse(pet));
  })
);

/**
 * DELETE /pets/:id
 * Delete (deactivate) a pet
 */
router.delete(
  '/:id',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid pet ID', 400, {
        errors: errors.array(),
      });
    }

    await petService.deletePet(req.params.id, req.userId!);

    logger.info(`Pet deleted: ${req.params.id}`);
    res.json(createApiResponse({ message: 'Pet deleted successfully' }));
  })
);

/**
 * POST /pets/:id/medications
 * Add a medication to a pet
 */
router.post(
  '/:id/medications',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
    body('drugName').isString().trim().notEmpty().withMessage('Drug name is required'),
    body('genericName').optional().isString().trim(),
    body('activeIngredient').optional().isString().trim(),
    body('dosage').isObject().withMessage('Dosage is required'),
    body('dosage.amount').isFloat({ min: 0 }).withMessage('Valid dosage amount is required'),
    body('dosage.unit').isString().trim().notEmpty().withMessage('Dosage unit is required'),
    body('frequency')
      .isString()
      .isIn([
        'once_daily',
        'twice_daily',
        'three_times_daily',
        'four_times_daily',
        'every_other_day',
        'weekly',
        'biweekly',
        'monthly',
        'as_needed',
        'custom',
      ])
      .withMessage('Valid frequency is required'),
    body('route').optional().isString(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('prescribedBy').optional().isString().trim(),
    body('purpose').optional().isString().trim(),
    body('notes').optional().isString().trim(),
    body('refillReminder').optional().isBoolean(),
    body('nextRefillDate').optional().isISO8601(),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid medication data', 400, {
        errors: errors.array(),
      });
    }

    const medicationData: Omit<PetMedication, 'id' | 'addedAt' | 'updatedAt'> = {
      drugId: req.body.drugId,
      drugName: req.body.drugName,
      genericName: req.body.genericName,
      activeIngredient: req.body.activeIngredient,
      dosage: req.body.dosage,
      frequency: req.body.frequency,
      route: req.body.route,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      prescribedBy: req.body.prescribedBy,
      purpose: req.body.purpose,
      notes: req.body.notes,
      refillReminder: req.body.refillReminder,
      nextRefillDate: req.body.nextRefillDate,
      isActive: req.body.isActive ?? true,
    };

    const medication = await petService.addMedication(
      req.params.id,
      req.userId!,
      medicationData
    );

    logger.info(`Medication added to pet ${req.params.id}: ${medication.drugName}`);
    res.status(201).json(createApiResponse(medication));
  })
);

/**
 * PATCH /pets/:id/medications/:medId
 * Update a medication
 */
router.patch(
  '/:id/medications/:medId',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
    param('medId').isString().trim().notEmpty().withMessage('Medication ID is required'),
    body('dosage').optional().isObject(),
    body('frequency').optional().isString(),
    body('route').optional().isString(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('prescribedBy').optional().isString().trim(),
    body('purpose').optional().isString().trim(),
    body('notes').optional().isString().trim(),
    body('refillReminder').optional().isBoolean(),
    body('nextRefillDate').optional().isISO8601(),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid update data', 400, {
        errors: errors.array(),
      });
    }

    const medication = await petService.updateMedication(
      req.params.id,
      req.userId!,
      req.params.medId,
      req.body
    );

    logger.info(`Medication updated: ${req.params.medId} for pet ${req.params.id}`);
    res.json(createApiResponse(medication));
  })
);

/**
 * DELETE /pets/:id/medications/:medId
 * Remove a medication from a pet
 */
router.delete(
  '/:id/medications/:medId',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
    param('medId').isString().trim().notEmpty().withMessage('Medication ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid IDs', 400, {
        errors: errors.array(),
      });
    }

    await petService.removeMedication(req.params.id, req.userId!, req.params.medId);

    logger.info(`Medication removed: ${req.params.medId} from pet ${req.params.id}`);
    res.json(createApiResponse({ message: 'Medication removed successfully' }));
  })
);

/**
 * POST /pets/:id/conditions
 * Add a medical condition to a pet
 */
router.post(
  '/:id/conditions',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
    body('name').isString().trim().notEmpty().withMessage('Condition name is required'),
    body('diagnosedDate').optional().isISO8601(),
    body('severity').optional().isIn(['mild', 'moderate', 'severe']),
    body('status')
      .isString()
      .isIn(['active', 'resolved', 'chronic', 'managed'])
      .withMessage('Valid status is required'),
    body('notes').optional().isString().trim(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid condition data', 400, {
        errors: errors.array(),
      });
    }

    const conditionData: Omit<MedicalCondition, 'id' | 'addedAt'> = {
      name: req.body.name,
      diagnosedDate: req.body.diagnosedDate,
      severity: req.body.severity,
      status: req.body.status,
      notes: req.body.notes,
    };

    const condition = await petService.addCondition(
      req.params.id,
      req.userId!,
      conditionData
    );

    logger.info(`Condition added to pet ${req.params.id}: ${condition.name}`);
    res.status(201).json(createApiResponse(condition));
  })
);

/**
 * DELETE /pets/:id/conditions/:condId
 * Remove a medical condition from a pet
 */
router.delete(
  '/:id/conditions/:condId',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
    param('condId').isString().trim().notEmpty().withMessage('Condition ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid IDs', 400, {
        errors: errors.array(),
      });
    }

    await petService.removeCondition(req.params.id, req.userId!, req.params.condId);

    logger.info(`Condition removed: ${req.params.condId} from pet ${req.params.id}`);
    res.json(createApiResponse({ message: 'Condition removed successfully' }));
  })
);

/**
 * POST /pets/:id/allergies
 * Add an allergy to a pet
 */
router.post(
  '/:id/allergies',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
    body('allergen').isString().trim().notEmpty().withMessage('Allergen is required'),
    body('type')
      .isString()
      .isIn(['drug', 'food', 'environmental', 'other'])
      .withMessage('Valid allergy type is required'),
    body('severity')
      .isString()
      .isIn(['mild', 'moderate', 'severe', 'unknown'])
      .withMessage('Valid severity is required'),
    body('reaction').optional().isString().trim(),
    body('diagnosedDate').optional().isISO8601(),
    body('notes').optional().isString().trim(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid allergy data', 400, {
        errors: errors.array(),
      });
    }

    const allergyData: Omit<Allergy, 'id' | 'addedAt'> = {
      allergen: req.body.allergen,
      type: req.body.type,
      severity: req.body.severity,
      reaction: req.body.reaction,
      diagnosedDate: req.body.diagnosedDate,
      notes: req.body.notes,
    };

    const allergy = await petService.addAllergy(
      req.params.id,
      req.userId!,
      allergyData
    );

    logger.info(`Allergy added to pet ${req.params.id}: ${allergy.allergen}`);
    res.status(201).json(createApiResponse(allergy));
  })
);

/**
 * DELETE /pets/:id/allergies/:allergyId
 * Remove an allergy from a pet
 */
router.delete(
  '/:id/allergies/:allergyId',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
    param('allergyId').isString().trim().notEmpty().withMessage('Allergy ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid IDs', 400, {
        errors: errors.array(),
      });
    }

    await petService.removeAllergy(req.params.id, req.userId!, req.params.allergyId);

    logger.info(`Allergy removed: ${req.params.allergyId} from pet ${req.params.id}`);
    res.json(createApiResponse({ message: 'Allergy removed successfully' }));
  })
);

/**
 * GET /pets/:id/safety
 * Get comprehensive safety summary for a pet
 */
router.get(
  '/:id/safety',
  authenticate,
  [
    param('id').isString().trim().notEmpty().withMessage('Pet ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid pet ID', 400, {
        errors: errors.array(),
      });
    }

    const pet = await petService.getPetById(req.params.id);

    if (!pet) {
      throw new AppError(ERROR_CODES.PET_NOT_FOUND, 'Pet not found', 404);
    }

    if (pet.userId !== req.userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You do not have permission to access this pet',
        403
      );
    }

    const safetySummary = await petService.getSafetySummary(req.params.id);

    logger.info(`Safety summary generated for pet ${req.params.id}`);
    res.json(createApiResponse(safetySummary));
  })
);

export default router;
