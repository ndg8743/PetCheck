// Re-export all types from shared package
export type {
  User,
  UserRole,
  Pet,
  PetSpecies,
  AnimalDrug,
  AdverseEvent,
  AdverseEventSummary,
  DrugRecall,
  InteractionCheckRequest,
  InteractionCheckResponse,
  DrugInteraction,
  SafetyData,
  VetSearchFilters,
  Veterinarian,
} from '@petcheck/shared';

// Frontend-specific types
export interface AuthState {
  user: User | null;
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
  role: UserRole;
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
