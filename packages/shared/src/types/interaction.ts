/**
 * Drug interaction types
 */

import { Drug, DrugClass } from './drug';
import { SpeciesCategory } from './species';

export type InteractionSeverity =
  | 'none'
  | 'minor'
  | 'moderate'
  | 'major'
  | 'contraindicated'
  | 'unknown';

export type InteractionType =
  | 'drug_drug'
  | 'drug_class'
  | 'drug_species'
  | 'drug_condition'
  | 'drug_food'
  | 'drug_supplement';

export type EvidenceLevel =
  | 'established'    // Well-documented in veterinary literature
  | 'theoretical'    // Based on mechanism or human data
  | 'case_report'    // Individual case reports
  | 'unknown';

export interface InteractionSource {
  type: 'label' | 'fda' | 'literature' | 'rxnorm' | 'curated' | 'inferred';
  reference?: string;
  url?: string;
  dateAccessed?: string;
}

export interface DrugInteraction {
  id: string;
  drug1: {
    name: string;
    drugId?: string;
    activeIngredient?: string;
    drugClass?: DrugClass;
  };
  drug2: {
    name: string;
    drugId?: string;
    activeIngredient?: string;
    drugClass?: DrugClass;
  };
  severity: InteractionSeverity;
  type: InteractionType;
  evidence: EvidenceLevel;
  description: string;
  clinicalEffect?: string;
  mechanism?: string;
  management?: string;
  speciesSpecific?: SpeciesCategory[];  // If interaction is species-specific
  sources: InteractionSource[];
  lastUpdated: Date;
}

export interface SpeciesInteraction {
  id: string;
  drugName: string;
  drugId?: string;
  activeIngredient?: string;
  species: SpeciesCategory;
  severity: InteractionSeverity;
  type: 'contraindicated' | 'caution' | 'dose_adjustment' | 'monitoring_required';
  description: string;
  reason?: string;
  management?: string;
  sources: InteractionSource[];
  lastUpdated: Date;
}

export interface ConditionInteraction {
  id: string;
  drugName: string;
  drugId?: string;
  condition: string;
  conditionCode?: string;  // Future: standardized condition code
  severity: InteractionSeverity;
  type: 'contraindicated' | 'caution' | 'dose_adjustment' | 'monitoring_required';
  description: string;
  reason?: string;
  management?: string;
  speciesSpecific?: SpeciesCategory[];
  sources: InteractionSource[];
  lastUpdated: Date;
}

export interface InteractionCheckRequest {
  drugs: {
    name: string;
    drugId?: string;
    dose?: string;
    route?: string;
  }[];
  species?: SpeciesCategory;
  conditions?: string[];
  weight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  age?: {
    value: number;
    unit: 'day' | 'week' | 'month' | 'year';
  };
}

export interface InteractionCheckResult {
  drugInteractions: DrugInteraction[];
  speciesInteractions: SpeciesInteraction[];
  conditionInteractions: ConditionInteraction[];
  summary: {
    totalInteractions: number;
    majorCount: number;
    moderateCount: number;
    minorCount: number;
    unknownCount: number;
    highestSeverity: InteractionSeverity;
  };
  checkedDrugs: string[];
  checkedAt: Date;
  disclaimer: string;
}

export const INTERACTION_DISCLAIMER =
  'DISCLAIMER: This interaction checker is for informational purposes only and does not ' +
  'replace professional veterinary advice. Drug interaction data may be incomplete, ' +
  'outdated, or not applicable to your specific situation. Always consult with a ' +
  'qualified veterinarian before making any changes to your pet\'s medications. ' +
  'This tool is not a clinical decision support system.';

export function getSeverityColor(severity: InteractionSeverity): string {
  switch (severity) {
    case 'contraindicated':
      return '#DC2626';  // Red-600
    case 'major':
      return '#EA580C';  // Orange-600
    case 'moderate':
      return '#CA8A04';  // Yellow-600
    case 'minor':
      return '#16A34A';  // Green-600
    case 'none':
      return '#6B7280';  // Gray-500
    case 'unknown':
    default:
      return '#9CA3AF';  // Gray-400
  }
}

export function getSeverityLabel(severity: InteractionSeverity): string {
  switch (severity) {
    case 'contraindicated':
      return 'Contraindicated';
    case 'major':
      return 'Major Interaction';
    case 'moderate':
      return 'Moderate Interaction';
    case 'minor':
      return 'Minor Interaction';
    case 'none':
      return 'No Known Interaction';
    case 'unknown':
    default:
      return 'Unknown / Insufficient Data';
  }
}
