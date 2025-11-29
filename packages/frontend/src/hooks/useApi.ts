import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  AnimalDrug,
  AdverseEvent,
  AdverseEventSummary,
  DrugRecall,
  InteractionCheckRequest,
  InteractionCheckResponse,
  Pet,
  SafetyData,
  Veterinarian,
} from '@petcheck/shared';
import api from '../lib/api';
import type {
  SearchFilters,
  AdverseEventFilters,
  RecallFilters,
  PaginatedResponse,
} from '../types';

// Drugs
export const useDrugs = (filters?: SearchFilters): UseQueryResult<PaginatedResponse<AnimalDrug>> => {
  return useQuery({
    queryKey: ['drugs', filters],
    queryFn: async () => {
      const response = await api.get('/drugs', { params: filters });
      return response.data;
    },
  });
};

export const useDrug = (drugId: string): UseQueryResult<AnimalDrug> => {
  return useQuery({
    queryKey: ['drugs', drugId],
    queryFn: async () => {
      const response = await api.get(`/drugs/${drugId}`);
      return response.data;
    },
    enabled: !!drugId,
  });
};

export const useSearchDrugs = () => {
  return useMutation({
    mutationFn: async (filters: SearchFilters) => {
      const response = await api.get('/drugs/search', { params: filters });
      return response.data;
    },
  });
};

// Adverse Events
export const useAdverseEvents = (
  filters?: AdverseEventFilters
): UseQueryResult<PaginatedResponse<AdverseEvent>> => {
  return useQuery({
    queryKey: ['adverse-events', filters],
    queryFn: async () => {
      const response = await api.get('/adverse-events', { params: filters });
      return response.data;
    },
  });
};

export const useAdverseEventSummary = (drugId: string): UseQueryResult<AdverseEventSummary> => {
  return useQuery({
    queryKey: ['adverse-events', 'summary', drugId],
    queryFn: async () => {
      const response = await api.get(`/adverse-events/summary/${drugId}`);
      return response.data;
    },
    enabled: !!drugId,
  });
};

// Recalls
export const useRecalls = (filters?: RecallFilters): UseQueryResult<PaginatedResponse<DrugRecall>> => {
  return useQuery({
    queryKey: ['recalls', filters],
    queryFn: async () => {
      const response = await api.get('/recalls', { params: filters });
      return response.data;
    },
  });
};

export const useDrugRecalls = (drugId: string): UseQueryResult<DrugRecall[]> => {
  return useQuery({
    queryKey: ['recalls', 'drug', drugId],
    queryFn: async () => {
      const response = await api.get(`/recalls/drug/${drugId}`);
      return response.data;
    },
    enabled: !!drugId,
  });
};

// Interaction Check
export const useInteractionCheck = (): UseMutationResult<
  InteractionCheckResponse,
  Error,
  InteractionCheckRequest
> => {
  return useMutation({
    mutationFn: async (request: InteractionCheckRequest) => {
      const response = await api.post('/interactions/check', request);
      return response.data;
    },
  });
};

// Pets
export const usePets = (): UseQueryResult<Pet[]> => {
  return useQuery({
    queryKey: ['pets'],
    queryFn: async () => {
      const response = await api.get('/pets');
      return response.data;
    },
  });
};

export const usePet = (petId: string): UseQueryResult<Pet> => {
  return useQuery({
    queryKey: ['pets', petId],
    queryFn: async () => {
      const response = await api.get(`/pets/${petId}`);
      return response.data;
    },
    enabled: !!petId,
  });
};

export const useCreatePet = (): UseMutationResult<Pet, Error, Partial<Pet>> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pet: Partial<Pet>) => {
      const response = await api.post('/pets', pet);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });
};

export const useUpdatePet = (): UseMutationResult<Pet, Error, { id: string; data: Partial<Pet> }> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pet> }) => {
      const response = await api.put(`/pets/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      queryClient.invalidateQueries({ queryKey: ['pets', variables.id] });
    },
  });
};

export const useDeletePet = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (petId: string) => {
      await api.delete(`/pets/${petId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });
};

// Pet Safety Data
export const usePetSafety = (petId: string): UseQueryResult<SafetyData> => {
  return useQuery({
    queryKey: ['pets', petId, 'safety'],
    queryFn: async () => {
      const response = await api.get(`/pets/${petId}/safety`);
      return response.data;
    },
    enabled: !!petId,
  });
};

export const useAddMedicationToPet = (): UseMutationResult<
  Pet,
  Error,
  { petId: string; drugId: string }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId, drugId }: { petId: string; drugId: string }) => {
      const response = await api.post(`/pets/${petId}/medications`, { drugId });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pets', variables.petId] });
      queryClient.invalidateQueries({ queryKey: ['pets', variables.petId, 'safety'] });
    },
  });
};

export const useRemoveMedicationFromPet = (): UseMutationResult<
  Pet,
  Error,
  { petId: string; drugId: string }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId, drugId }: { petId: string; drugId: string }) => {
      const response = await api.delete(`/pets/${petId}/medications/${drugId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pets', variables.petId] });
      queryClient.invalidateQueries({ queryKey: ['pets', variables.petId, 'safety'] });
    },
  });
};

// Veterinarian Search
export const useVetSearch = (filters: {
  zipCode?: string;
  radius?: number;
  specialty?: string;
}): UseQueryResult<Veterinarian[]> => {
  return useQuery({
    queryKey: ['vets', filters],
    queryFn: async () => {
      const response = await api.get('/vets/search', { params: filters });
      return response.data;
    },
    enabled: !!filters.zipCode,
  });
};

export const useVet = (vetId: string): UseQueryResult<Veterinarian> => {
  return useQuery({
    queryKey: ['vets', vetId],
    queryFn: async () => {
      const response = await api.get(`/vets/${vetId}`);
      return response.data;
    },
    enabled: !!vetId,
  });
};

// User favorites
export const useFavoriteDrugs = (): UseQueryResult<AnimalDrug[]> => {
  return useQuery({
    queryKey: ['favorites', 'drugs'],
    queryFn: async () => {
      const response = await api.get('/users/favorites/drugs');
      return response.data;
    },
  });
};

export const useToggleFavoriteDrug = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drugId: string) => {
      await api.post(`/users/favorites/drugs/${drugId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', 'drugs'] });
    },
  });
};
