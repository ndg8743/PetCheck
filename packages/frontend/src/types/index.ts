// Re-export all types from shared package
export type {
  User,
  UserRole,
  Pet,
  SpeciesCategory,
  Drug,
  AdverseEvent,
  AdverseEventSummary,
  Recall,
  InteractionCheckRequest,
  InteractionCheckResult,
  DrugInteraction,
  PetSafetySummary,
  VeterinarianInfo,
} from '@petcheck/shared';

// Aliases for backward compatibility
export type PetSpecies = string;
export type AnimalDrug = import('@petcheck/shared').Drug;
export type DrugRecall = import('@petcheck/shared').Recall;
export type InteractionCheckResponse = import('@petcheck/shared').InteractionCheckResult;
export type SafetyData = import('@petcheck/shared').PetSafetySummary;
export type Veterinarian = import('@petcheck/shared').VeterinarianInfo;

// Frontend-specific types
export interface AuthState {
  user: import('@petcheck/shared').User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  name: string;
  role: import('@petcheck/shared').UserRole;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchFilters {
  query?: string;
  species?: PetSpecies;
  activeIngredient?: string;
  brandName?: string;
  page?: number;
  limit?: number;
}

export interface AdverseEventFilters {
  drugId?: string;
  species?: PetSpecies;
  severity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RecallFilters {
  drugId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}
