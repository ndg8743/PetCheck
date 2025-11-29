/**
 * Recall and withdrawal types
 */

export type RecallClass = 'I' | 'II' | 'III' | 'unknown';

export type RecallStatus =
  | 'ongoing'
  | 'completed'
  | 'terminated'
  | 'pending'
  | 'unknown';

export type RecallType =
  | 'recall'
  | 'withdrawal'
  | 'market_withdrawal'
  | 'safety_alert';

export interface Recall {
  id: string;
  recallNumber?: string;
  productName: string;
  productDescription?: string;
  brandName?: string;
  genericName?: string;
  manufacturer?: string;
  recallClass: RecallClass;
  recallType: RecallType;
  status: RecallStatus;
  reason: string;
  reasonDetail?: string;
  initiationDate?: string;
  reportDate?: string;
  terminationDate?: string;
  lotNumbers?: string[];
  expirationDates?: string[];
  distribution?: string;
  quantity?: string;
  affectedSpecies?: string[];
  voluntaryMandated?: 'voluntary' | 'mandated' | 'unknown';
  source: 'fda' | 'manual';
  sourceUrl?: string;
  lastUpdated: Date;
}

export interface RecallSearchParams {
  query?: string;
  productName?: string;
  manufacturer?: string;
  recallClass?: RecallClass[];
  recallType?: RecallType[];
  status?: RecallStatus[];
  species?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface RecallSearchResult {
  recalls: Recall[];
  total: number;
  limit: number;
  offset: number;
  query: RecallSearchParams;
}

export interface RecallAlert {
  id: string;
  recall: Recall;
  severity: 'high' | 'medium' | 'low';
  affectedDrugs: string[];  // Drug IDs
  message: string;
  createdAt: Date;
  acknowledged?: boolean;
  acknowledgedAt?: Date;
}

export function getRecallSeverityFromClass(recallClass: RecallClass): 'high' | 'medium' | 'low' {
  switch (recallClass) {
    case 'I':
      return 'high';
    case 'II':
      return 'medium';
    case 'III':
    case 'unknown':
    default:
      return 'low';
  }
}

export function getRecallClassDescription(recallClass: RecallClass): string {
  switch (recallClass) {
    case 'I':
      return 'Class I - Dangerous or defective products that could cause serious health problems or death';
    case 'II':
      return 'Class II - Products that might cause temporary health problems or pose slight threat of serious nature';
    case 'III':
      return 'Class III - Products that are unlikely to cause any adverse health reaction but violate FDA regulations';
    default:
      return 'Classification unknown';
  }
}
