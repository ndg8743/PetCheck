/**
 * Adverse event types based on openFDA Animal & Veterinary API
 */

import { SpeciesCategory } from './species';

export type OutcomeSeriousness =
  | 'died'
  | 'euthanized'
  | 'life_threatening'
  | 'hospitalized'
  | 'disability'
  | 'congenital_anomaly'
  | 'other_serious'
  | 'not_serious'
  | 'unknown';

export interface AnimalInfo {
  species: string;
  speciesCategory?: SpeciesCategory;
  breed?: string;
  gender?: 'male' | 'female' | 'unknown' | 'neutered_male' | 'spayed_female';
  age?: {
    value: number;
    unit: 'day' | 'week' | 'month' | 'year';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  reproductiveStatus?: string;
}

export interface DrugInEvent {
  brandName?: string;
  genericName?: string;
  activeIngredients?: string[];
  manufacturer?: string;
  dosage?: {
    value: number;
    unit: string;
  };
  route?: string;
  frequency?: string;
  duration?: {
    value: number;
    unit: string;
  };
  startDate?: string;
  endDate?: string;
  lotNumber?: string;
  usedAccordingToLabel?: boolean;
  previousExposure?: boolean;
}

export interface Reaction {
  term: string;
  openFdaTerm?: string;  // Original openFDA term
  veddraCode?: string;   // VeDDRA (Veterinary Dictionary for Drug Regulatory Activities)
  accuracy?: 'exact' | 'related' | 'inferred';
}

export interface AdverseEvent {
  id: string;
  reportId: string;
  receiptDate: string;
  onsetDate?: string;
  animal: AnimalInfo;
  drugs: DrugInEvent[];
  reactions: Reaction[];
  outcomes: OutcomeSeriousness[];
  duration?: {
    value: number;
    unit: string;
  };
  reporterType?: 'veterinarian' | 'owner' | 'manufacturer' | 'other';
  country?: string;
  originalReceiveDate?: string;
  numberOfAnimals?: number;
  numberOfAnimalsAffected?: number;
  numberOfAnimalsTreated?: number;
  source: 'openfda';
  rawData?: Record<string, unknown>;
}

export interface AdverseEventSearchParams {
  species?: SpeciesCategory[];
  drugName?: string;
  activeIngredient?: string;
  manufacturer?: string;
  reaction?: string;
  outcome?: OutcomeSeriousness[];
  dateFrom?: string;  // YYYYMMDD format
  dateTo?: string;
  route?: string;
  limit?: number;
  skip?: number;
  sort?: 'date_asc' | 'date_desc';
}

export interface AdverseEventSearchResult {
  events: AdverseEvent[];
  total: number;
  limit: number;
  skip: number;
  query: AdverseEventSearchParams;
  openFdaQuery?: string;  // The actual openFDA query URL
}

export interface AdverseEventCount {
  field: string;
  term: string;
  count: number;
}

export interface AdverseEventAggregation {
  type: 'time_series' | 'reaction' | 'species' | 'outcome' | 'drug';
  data: AdverseEventCount[];
  total: number;
  query: AdverseEventSearchParams;
}

export interface AdverseEventSummary {
  drugName: string;
  totalReports: number;
  speciesBreakdown: { species: string; count: number }[];
  outcomeBreakdown: { outcome: OutcomeSeriousness; count: number }[];
  topReactions: { reaction: string; count: number }[];
  timeSeriesMonthly: { month: string; count: number }[];
  lastUpdated: Date;
}
