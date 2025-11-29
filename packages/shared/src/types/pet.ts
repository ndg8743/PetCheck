/**
 * Pet profile types
 */

import { SpeciesCategory } from './species';
import { AdministrationRoute } from './drug';

export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: SpeciesCategory;
  breed?: string;
  dateOfBirth?: string;  // ISO date string
  approximateAge?: {
    value: number;
    unit: 'month' | 'year';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  gender?: 'male' | 'female' | 'unknown';
  isNeutered?: boolean;
  microchipId?: string;
  profileImageUrl?: string;
  medicalConditions: MedicalCondition[];
  allergies: Allergy[];
  currentMedications: PetMedication[];
  veterinarian?: VeterinarianInfo;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface MedicalCondition {
  id: string;
  name: string;
  diagnosedDate?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'resolved' | 'chronic' | 'managed';
  notes?: string;
  addedAt: Date;
}

export interface Allergy {
  id: string;
  allergen: string;
  type: 'drug' | 'food' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'unknown';
  reaction?: string;
  diagnosedDate?: string;
  notes?: string;
  addedAt: Date;
}

export interface PetMedication {
  id: string;
  drugId?: string;  // Reference to Drug if normalized
  drugName: string;
  genericName?: string;
  activeIngredient?: string;
  dosage: {
    amount: number;
    unit: string;
  };
  frequency: MedicationFrequency;
  route?: AdministrationRoute;
  startDate?: string;
  endDate?: string;
  prescribedBy?: string;
  purpose?: string;
  notes?: string;
  refillReminder?: boolean;
  nextRefillDate?: string;
  isActive: boolean;
  addedAt: Date;
  updatedAt: Date;
}

export type MedicationFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'four_times_daily'
  | 'every_other_day'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'as_needed'
  | 'custom';

export interface VeterinarianInfo {
  clinicName?: string;
  veterinarianName?: string;
  phone?: string;
  email?: string;
  address?: string;
  placeId?: string;  // Google Places ID
  notes?: string;
}

export interface PetCreateRequest {
  name: string;
  species: SpeciesCategory;
  breed?: string;
  dateOfBirth?: string;
  approximateAge?: {
    value: number;
    unit: 'month' | 'year';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  gender?: 'male' | 'female' | 'unknown';
  isNeutered?: boolean;
}

export interface PetUpdateRequest {
  name?: string;
  breed?: string;
  dateOfBirth?: string;
  approximateAge?: {
    value: number;
    unit: 'month' | 'year';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  gender?: 'male' | 'female' | 'unknown';
  isNeutered?: boolean;
  microchipId?: string;
  profileImageUrl?: string;
  notes?: string;
  veterinarian?: VeterinarianInfo;
}

export interface PetSafetySummary {
  petId: string;
  petName: string;
  activeRecalls: number;
  activeRecallDrugs: string[];
  interactionWarnings: number;
  highSeverityInteractions: number;
  adverseEventSignals: {
    drugName: string;
    signalType: 'spike' | 'high_baseline' | 'species_specific';
    severity: 'high' | 'medium' | 'low';
    message: string;
  }[];
  overallStatus: 'good' | 'attention_needed' | 'action_required';
  lastChecked: Date;
}

export function getMedicationFrequencyLabel(frequency: MedicationFrequency): string {
  const labels: Record<MedicationFrequency, string> = {
    once_daily: 'Once daily',
    twice_daily: 'Twice daily',
    three_times_daily: 'Three times daily',
    four_times_daily: 'Four times daily',
    every_other_day: 'Every other day',
    weekly: 'Weekly',
    biweekly: 'Every two weeks',
    monthly: 'Monthly',
    as_needed: 'As needed',
    custom: 'Custom schedule'
  };
  return labels[frequency] || frequency;
}

export function calculateAgeFromBirthdate(dateOfBirth: string): { years: number; months: number } {
  const birth = new Date(dateOfBirth);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (now.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  return { years, months };
}
