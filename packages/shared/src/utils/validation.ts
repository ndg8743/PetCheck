/**
 * Validation utilities
 */

import { SpeciesCategory, SPECIES_LIST } from '../types/species';
import { DrugClass, AdministrationRoute } from '../types/drug';
import { OutcomeSeriousness } from '../types/adverse-event';
import { RecallClass, RecallStatus } from '../types/recall';
import { InteractionSeverity } from '../types/interaction';
import { UserRole } from '../types/user';
import { MedicationFrequency } from '../types/pet';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a species category
 */
export function isValidSpecies(species: string): species is SpeciesCategory {
  return SPECIES_LIST.some(s => s.id === species);
}

/**
 * Validate drug class
 */
const VALID_DRUG_CLASSES: DrugClass[] = [
  'antibiotic', 'antifungal', 'antiviral', 'antiparasitic', 'nsaid',
  'corticosteroid', 'antihistamine', 'analgesic', 'anesthetic', 'cardiac',
  'diuretic', 'hormone', 'immunosuppressant', 'vaccine', 'sedative',
  'anticonvulsant', 'antidepressant', 'antineoplastic', 'supplement', 'other', 'unknown'
];

export function isValidDrugClass(drugClass: string): drugClass is DrugClass {
  return VALID_DRUG_CLASSES.includes(drugClass as DrugClass);
}

/**
 * Validate administration route
 */
const VALID_ROUTES: AdministrationRoute[] = [
  'oral', 'injectable', 'topical', 'ophthalmic', 'otic', 'inhalation',
  'rectal', 'intramammary', 'intravaginal', 'transdermal', 'other'
];

export function isValidRoute(route: string): route is AdministrationRoute {
  return VALID_ROUTES.includes(route as AdministrationRoute);
}

/**
 * Validate outcome seriousness
 */
const VALID_OUTCOMES: OutcomeSeriousness[] = [
  'died', 'euthanized', 'life_threatening', 'hospitalized', 'disability',
  'congenital_anomaly', 'other_serious', 'not_serious', 'unknown'
];

export function isValidOutcome(outcome: string): outcome is OutcomeSeriousness {
  return VALID_OUTCOMES.includes(outcome as OutcomeSeriousness);
}

/**
 * Validate recall class
 */
const VALID_RECALL_CLASSES: RecallClass[] = ['I', 'II', 'III', 'unknown'];

export function isValidRecallClass(recallClass: string): recallClass is RecallClass {
  return VALID_RECALL_CLASSES.includes(recallClass as RecallClass);
}

/**
 * Validate recall status
 */
const VALID_RECALL_STATUSES: RecallStatus[] = [
  'ongoing', 'completed', 'terminated', 'pending', 'unknown'
];

export function isValidRecallStatus(status: string): status is RecallStatus {
  return VALID_RECALL_STATUSES.includes(status as RecallStatus);
}

/**
 * Validate interaction severity
 */
const VALID_SEVERITIES: InteractionSeverity[] = [
  'none', 'minor', 'moderate', 'major', 'contraindicated', 'unknown'
];

export function isValidSeverity(severity: string): severity is InteractionSeverity {
  return VALID_SEVERITIES.includes(severity as InteractionSeverity);
}

/**
 * Validate user role
 */
const VALID_ROLES: UserRole[] = ['pet_owner', 'veterinarian', 'researcher', 'admin'];

export function isValidUserRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

/**
 * Validate medication frequency
 */
const VALID_FREQUENCIES: MedicationFrequency[] = [
  'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily',
  'every_other_day', 'weekly', 'biweekly', 'monthly', 'as_needed', 'custom'
];

export function isValidFrequency(frequency: string): frequency is MedicationFrequency {
  return VALID_FREQUENCIES.includes(frequency as MedicationFrequency);
}

/**
 * Validate date format (YYYYMMDD for openFDA)
 */
export function isValidOpenFdaDate(date: string): boolean {
  if (!/^\d{8}$/.test(date)) return false;

  const year = parseInt(date.substring(0, 4));
  const month = parseInt(date.substring(4, 6));
  const day = parseInt(date.substring(6, 8));

  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * Validate ISO date string
 */
export function isValidIsoDate(date: string): boolean {
  const parsed = Date.parse(date);
  return !isNaN(parsed);
}

/**
 * Validate weight object
 */
export function isValidWeight(weight: unknown): weight is { value: number; unit: 'kg' | 'lb' } {
  if (!weight || typeof weight !== 'object') return false;
  const w = weight as Record<string, unknown>;
  return (
    typeof w.value === 'number' &&
    w.value > 0 &&
    (w.unit === 'kg' || w.unit === 'lb')
  );
}

/**
 * Validate age object
 */
export function isValidAge(age: unknown): age is { value: number; unit: 'day' | 'week' | 'month' | 'year' } {
  if (!age || typeof age !== 'object') return false;
  const a = age as Record<string, unknown>;
  return (
    typeof a.value === 'number' &&
    a.value >= 0 &&
    ['day', 'week', 'month', 'year'].includes(a.unit as string)
  );
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limit?: number,
  offset?: number
): { limit: number; offset: number } {
  const maxLimit = 100;
  const defaultLimit = 20;

  let validLimit = defaultLimit;
  if (typeof limit === 'number' && limit > 0) {
    validLimit = Math.min(limit, maxLimit);
  }

  let validOffset = 0;
  if (typeof offset === 'number' && offset >= 0) {
    validOffset = offset;
  }

  return { limit: validLimit, offset: validOffset };
}
