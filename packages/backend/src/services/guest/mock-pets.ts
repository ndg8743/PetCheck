/**
 * Mock pet data for guest mode.
 *
 * Guests cannot persist data, so we serve a small fixed roster of demo pets
 * so the dashboard, drug-interaction checker, and safety pages have something
 * to render. IDs are deterministic strings so client-side caching works
 * across guest sessions.
 */

import type { Pet, PetSafetySummary } from '@petcheck/shared';

const GUEST_DEMO_USER_ID = 'guest-demo';

const now = new Date();

const buddy: Pet = {
  id: 'guest-pet-buddy',
  userId: GUEST_DEMO_USER_ID,
  name: 'Buddy',
  species: 'canine',
  breed: 'Golden Retriever',
  dateOfBirth: '2019-06-15',
  weight: { value: 32, unit: 'kg' },
  gender: 'male',
  isNeutered: true,
  medicalConditions: [
    {
      id: 'guest-cond-buddy-1',
      name: 'Hip dysplasia',
      severity: 'mild',
      status: 'managed',
      addedAt: now,
    },
  ],
  allergies: [
    {
      id: 'guest-allergy-buddy-1',
      allergen: 'Chicken',
      type: 'food',
      severity: 'moderate',
      reaction: 'Itching, ear infections',
      addedAt: now,
    },
  ],
  currentMedications: [
    {
      id: 'guest-med-buddy-1',
      drugName: 'Carprofen',
      genericName: 'Carprofen',
      dosage: { amount: 75, unit: 'mg' },
      frequency: 'twice_daily',
      route: 'oral',
      purpose: 'Joint pain management',
      isActive: true,
      addedAt: now,
      updatedAt: now,
    },
    {
      id: 'guest-med-buddy-2',
      drugName: 'Apoquel',
      genericName: 'Oclacitinib',
      dosage: { amount: 16, unit: 'mg' },
      frequency: 'once_daily',
      route: 'oral',
      purpose: 'Allergic dermatitis',
      isActive: true,
      addedAt: now,
      updatedAt: now,
    },
  ],
  notes: 'Demo pet — sign in with Google to save your own.',
  createdAt: now,
  updatedAt: now,
  isActive: true,
};

const luna: Pet = {
  id: 'guest-pet-luna',
  userId: GUEST_DEMO_USER_ID,
  name: 'Luna',
  species: 'feline',
  breed: 'Domestic Shorthair',
  dateOfBirth: '2021-03-08',
  weight: { value: 4.2, unit: 'kg' },
  gender: 'female',
  isNeutered: true,
  medicalConditions: [],
  allergies: [],
  currentMedications: [
    {
      id: 'guest-med-luna-1',
      drugName: 'Bravecto',
      genericName: 'Fluralaner',
      dosage: { amount: 112.5, unit: 'mg' },
      frequency: 'monthly',
      route: 'topical',
      purpose: 'Flea and tick prevention',
      isActive: true,
      addedAt: now,
      updatedAt: now,
    },
  ],
  notes: 'Demo pet — sign in with Google to save your own.',
  createdAt: now,
  updatedAt: now,
  isActive: true,
};

const GUEST_PETS: Pet[] = [buddy, luna];

export function getGuestPets(): Pet[] {
  return GUEST_PETS;
}

export function getGuestPetById(petId: string): Pet | null {
  return GUEST_PETS.find((p) => p.id === petId) ?? null;
}

export function getGuestPetSafetySummary(petId: string): PetSafetySummary | null {
  const pet = getGuestPetById(petId);
  if (!pet) return null;
  return {
    petId: pet.id,
    petName: pet.name,
    activeRecalls: 0,
    activeRecallDrugs: [],
    interactionWarnings: pet.id === 'guest-pet-buddy' ? 1 : 0,
    highSeverityInteractions: 0,
    adverseEventSignals:
      pet.id === 'guest-pet-buddy'
        ? [
            {
              drugName: 'Carprofen',
              signalType: 'high_baseline',
              severity: 'low',
              message: 'Demo signal: monitor for GI upset with long-term NSAID use.',
            },
          ]
        : [],
    overallStatus: pet.id === 'guest-pet-buddy' ? 'attention_needed' : 'good',
    lastChecked: now,
  };
}
