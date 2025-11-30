/**
 * Pet Profile Service
 * Uses PostgreSQL for persistence
 */

import { createLogger } from '../logger';
import { getFromCache, setInCache, deleteFromCache } from '../redis';
import { petRepository } from '../database';
import { interactionEngine } from '../interactions';
import { recallsService, adverseEventsService } from '../openfda';
import {
  Pet,
  PetCreateRequest,
  PetUpdateRequest,
  PetMedication,
  MedicalCondition,
  Allergy,
  PetSafetySummary,
  SpeciesCategory,
  createCacheKey,
} from '@petcheck/shared';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';

const logger = createLogger('pet-service');

export class PetService {
  /**
   * Create a new pet profile
   */
  async createPet(userId: string, data: PetCreateRequest): Promise<Pet> {
    const pet: Pet = {
      id: uuidv4(),
      userId,
      name: data.name,
      species: data.species,
      breed: data.breed,
      dateOfBirth: data.dateOfBirth,
      approximateAge: data.approximateAge,
      weight: data.weight,
      gender: data.gender,
      isNeutered: data.isNeutered,
      medicalConditions: [],
      allergies: [],
      currentMedications: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    const createdPet = await petRepository.create(pet);
    logger.info(`Pet created: ${createdPet.id} for user ${userId}`);
    return createdPet;
  }

  /**
   * Get a pet by ID
   */
  async getPetById(petId: string): Promise<Pet | null> {
    return petRepository.findById(petId);
  }

  /**
   * Get all pets for a user
   */
  async getPetsByUserId(userId: string): Promise<Pet[]> {
    return petRepository.findByUserId(userId);
  }

  /**
   * Update a pet profile
   */
  async updatePet(petId: string, userId: string, data: PetUpdateRequest): Promise<Pet> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized to update this pet');
    }

    // Update fields
    if (data.name !== undefined) pet.name = data.name;
    if (data.breed !== undefined) pet.breed = data.breed;
    if (data.dateOfBirth !== undefined) pet.dateOfBirth = data.dateOfBirth;
    if (data.approximateAge !== undefined) pet.approximateAge = data.approximateAge;
    if (data.weight !== undefined) pet.weight = data.weight;
    if (data.gender !== undefined) pet.gender = data.gender;
    if (data.isNeutered !== undefined) pet.isNeutered = data.isNeutered;
    if (data.microchipId !== undefined) pet.microchipId = data.microchipId;
    if (data.profileImageUrl !== undefined) pet.profileImageUrl = data.profileImageUrl;
    if (data.notes !== undefined) pet.notes = data.notes;
    if (data.veterinarian !== undefined) pet.veterinarian = data.veterinarian;

    pet.updatedAt = new Date();

    const updatedPet = await petRepository.update(pet);
    await this.invalidatePetCache(petId);

    logger.info(`Pet updated: ${petId}`);
    return updatedPet;
  }

  /**
   * Delete (deactivate) a pet
   */
  async deletePet(petId: string, userId: string): Promise<void> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized to delete this pet');
    }

    await petRepository.softDelete(petId);
    await this.invalidatePetCache(petId);

    logger.info(`Pet deleted: ${petId}`);
  }

  /**
   * Add a medication to a pet
   */
  async addMedication(
    petId: string,
    userId: string,
    medication: Omit<PetMedication, 'id' | 'addedAt' | 'updatedAt'>
  ): Promise<PetMedication> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const newMedication: PetMedication = {
      id: uuidv4(),
      ...medication,
      isActive: medication.isActive ?? true,
      addedAt: new Date(),
      updatedAt: new Date(),
    };

    pet.currentMedications.push(newMedication);
    pet.updatedAt = new Date();

    await petRepository.update(pet);
    await this.invalidatePetCache(petId);

    logger.info(`Medication added to pet ${petId}: ${medication.drugName}`);
    return newMedication;
  }

  /**
   * Update a medication
   */
  async updateMedication(
    petId: string,
    userId: string,
    medicationId: string,
    updates: Partial<PetMedication>
  ): Promise<PetMedication> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const medication = pet.currentMedications.find((m) => m.id === medicationId);
    if (!medication) {
      throw new Error('Medication not found');
    }

    Object.assign(medication, updates, { updatedAt: new Date() });
    pet.updatedAt = new Date();

    await petRepository.update(pet);
    await this.invalidatePetCache(petId);

    return medication;
  }

  /**
   * Remove a medication
   */
  async removeMedication(petId: string, userId: string, medicationId: string): Promise<void> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const index = pet.currentMedications.findIndex((m) => m.id === medicationId);
    if (index === -1) {
      throw new Error('Medication not found');
    }

    pet.currentMedications.splice(index, 1);
    pet.updatedAt = new Date();

    await petRepository.update(pet);
    await this.invalidatePetCache(petId);
  }

  /**
   * Add a medical condition
   */
  async addCondition(
    petId: string,
    userId: string,
    condition: Omit<MedicalCondition, 'id' | 'addedAt'>
  ): Promise<MedicalCondition> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const newCondition: MedicalCondition = {
      id: uuidv4(),
      ...condition,
      addedAt: new Date(),
    };

    pet.medicalConditions.push(newCondition);
    pet.updatedAt = new Date();

    await petRepository.update(pet);
    await this.invalidatePetCache(petId);

    return newCondition;
  }

  /**
   * Remove a medical condition
   */
  async removeCondition(petId: string, userId: string, conditionId: string): Promise<void> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const index = pet.medicalConditions.findIndex((c) => c.id === conditionId);
    if (index === -1) {
      throw new Error('Condition not found');
    }

    pet.medicalConditions.splice(index, 1);
    pet.updatedAt = new Date();

    await petRepository.update(pet);
    await this.invalidatePetCache(petId);
  }

  /**
   * Add an allergy
   */
  async addAllergy(
    petId: string,
    userId: string,
    allergy: Omit<Allergy, 'id' | 'addedAt'>
  ): Promise<Allergy> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const newAllergy: Allergy = {
      id: uuidv4(),
      ...allergy,
      addedAt: new Date(),
    };

    pet.allergies.push(newAllergy);
    pet.updatedAt = new Date();

    await petRepository.update(pet);
    await this.invalidatePetCache(petId);

    return newAllergy;
  }

  /**
   * Remove an allergy
   */
  async removeAllergy(petId: string, userId: string, allergyId: string): Promise<void> {
    const pet = await this.getPetById(petId);

    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const index = pet.allergies.findIndex((a) => a.id === allergyId);
    if (index === -1) {
      throw new Error('Allergy not found');
    }

    pet.allergies.splice(index, 1);
    pet.updatedAt = new Date();

    await petRepository.update(pet);
    await this.invalidatePetCache(petId);
  }

  /**
   * Get safety summary for a pet
   */
  async getSafetySummary(petId: string): Promise<PetSafetySummary> {
    const cacheKey = `pet:safety:${petId}`;
    const cached = await getFromCache<PetSafetySummary>(cacheKey);

    if (cached && !cached.stale) {
      return cached.data;
    }

    const pet = await this.getPetById(petId);
    if (!pet) {
      throw new Error('Pet not found');
    }

    const activeMeds = pet.currentMedications.filter((m) => m.isActive);
    const drugNames = activeMeds.map((m) => m.drugName);

    // Check for recalls
    const recalls = await recallsService.getRecallsForDrugs(drugNames);
    const activeRecalls = recalls.filter((r) => r.status === 'ongoing');
    const activeRecallDrugs = activeRecalls.map((r) => r.productName);

    // Check for interactions
    const interactionResult = await interactionEngine.checkInteractions({
      drugs: activeMeds.map((m) => ({ name: m.drugName, drugId: m.drugId })),
      species: pet.species,
      conditions: pet.medicalConditions
        .filter((c) => c.status === 'active' || c.status === 'chronic')
        .map((c) => c.name),
    });

    // Check for adverse event signals (high report counts)
    const adverseEventSignals: PetSafetySummary['adverseEventSignals'] = [];

    for (const med of activeMeds) {
      try {
        const summary = await adverseEventsService.getDrugSummary(med.drugName);

        // Simple signal detection: flag if more than 100 reports
        if (summary.totalReports > 100) {
          adverseEventSignals.push({
            drugName: med.drugName,
            signalType: 'high_baseline',
            severity: summary.totalReports > 1000 ? 'high' : 'medium',
            message: `${med.drugName} has ${summary.totalReports} adverse event reports. Review with your veterinarian.`,
          });
        }

        // Check species-specific concerns
        const speciesReports = summary.speciesBreakdown.find(
          (s) => s.species.toLowerCase().includes(pet.species)
        );
        if (speciesReports && speciesReports.count > 50) {
          adverseEventSignals.push({
            drugName: med.drugName,
            signalType: 'species_specific',
            severity: 'medium',
            message: `${speciesReports.count} adverse events reported specifically in ${pet.species}s.`,
          });
        }
      } catch (error) {
        // Log but don't fail the whole summary
        logger.warn(`Could not fetch adverse events for ${med.drugName}:`, error);
      }
    }

    // Determine overall status
    let overallStatus: PetSafetySummary['overallStatus'] = 'good';

    if (activeRecalls.length > 0 || interactionResult.summary.majorCount > 0) {
      overallStatus = 'action_required';
    } else if (
      interactionResult.summary.moderateCount > 0 ||
      adverseEventSignals.some((s) => s.severity === 'high')
    ) {
      overallStatus = 'attention_needed';
    }

    const summary: PetSafetySummary = {
      petId,
      petName: pet.name,
      activeRecalls: activeRecalls.length,
      activeRecallDrugs: [...new Set(activeRecallDrugs)],
      interactionWarnings: interactionResult.summary.totalInteractions,
      highSeverityInteractions: interactionResult.summary.majorCount,
      adverseEventSignals,
      overallStatus,
      lastChecked: new Date(),
    };

    // Cache for 30 minutes
    await setInCache(cacheKey, summary, { ttl: 1800, staleTtl: 3600 });

    return summary;
  }

  /**
   * Invalidate pet-related caches
   */
  private async invalidatePetCache(petId: string): Promise<void> {
    await deleteFromCache(`pet:safety:${petId}`);
  }
}

export const petService = new PetService();
export default petService;
