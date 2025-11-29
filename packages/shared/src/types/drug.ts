/**
 * Drug and medication types
 */

import { SpeciesCategory } from './species';

export type DrugType =
  | 'prescription'
  | 'otc'           // Over-the-counter
  | 'controlled'
  | 'unknown';

export type DrugClass =
  | 'antibiotic'
  | 'antifungal'
  | 'antiviral'
  | 'antiparasitic'
  | 'nsaid'
  | 'corticosteroid'
  | 'antihistamine'
  | 'analgesic'
  | 'anesthetic'
  | 'cardiac'
  | 'diuretic'
  | 'hormone'
  | 'immunosuppressant'
  | 'vaccine'
  | 'sedative'
  | 'anticonvulsant'
  | 'antidepressant'
  | 'antineoplastic'
  | 'antiemetic'
  | 'supplement'
  | 'other'
  | 'unknown';

export type AdministrationRoute =
  | 'oral'
  | 'injectable'
  | 'topical'
  | 'ophthalmic'
  | 'otic'
  | 'inhalation'
  | 'rectal'
  | 'intramammary'
  | 'intravaginal'
  | 'transdermal'
  | 'other';

export interface ActiveIngredient {
  name: string;
  strength?: string;
  unit?: string;
  rxnormCui?: string;  // RxNorm Concept Unique Identifier
}

export interface Drug {
  id: string;
  tradeName: string;
  genericName?: string;
  activeIngredients: ActiveIngredient[];
  drugClass: DrugClass[];
  drugType: DrugType;
  routes: AdministrationRoute[];
  approvedSpecies: SpeciesCategory[];
  manufacturer?: string;
  nada?: string;            // New Animal Drug Application number
  anada?: string;           // Abbreviated NADA number
  greenBookNumber?: string;
  description?: string;
  indications?: string[];
  warnings?: string[];
  contraindications?: string[];
  isDiscontinued?: boolean;
  // Adverse event statistics
  totalReports?: number;
  seriousReports?: number;
  deathReports?: number;
  source: 'greenbook' | 'openfda' | 'rxnorm' | 'manual';
  lastUpdated: Date;
}

export interface DrugSearchParams {
  query?: string;
  species?: SpeciesCategory[];
  drugClass?: DrugClass[];
  route?: AdministrationRoute[];
  drugType?: DrugType;
  manufacturer?: string;
  includeDiscontinued?: boolean;
  limit?: number;
  offset?: number;
}

export interface DrugSearchResult {
  drugs: Drug[];
  total: number;
  limit: number;
  offset: number;
  query: DrugSearchParams;
}

export interface NormalizedDrugName {
  original: string;
  normalized: string;
  matchedDrug?: Drug;
  confidence: number;  // 0-1 confidence score
  alternatives?: Drug[];
}
