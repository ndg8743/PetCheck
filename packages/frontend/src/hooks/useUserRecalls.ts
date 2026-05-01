import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface AffectedPet {
  petId: string;
  petName: string;
  medicationName: string;
}

interface PetRecallMatch {
  recall: any;
  affectedPets: AffectedPet[];
}

interface UseUserRecallsState {
  matches: PetRecallMatch[];
  totalAffectedPets: number;
  totalActiveRecalls: number;
  loading: boolean;
  error: string | null;
}

/**
 * Cross-references the current user's pets' active medications against the
 * FDA recall feed. Powers the "X active recall(s) affect Buddy" banner on
 * the recalls page and the Active Alerts list on the dashboard.
 *
 * Skips the fetch entirely when there's no authenticated user (the page
 * will render a generic state).
 */
export function useUserRecalls(): UseUserRecallsState & { refetch: () => void } {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<UseUserRecallsState>({
    matches: [],
    totalAffectedPets: 0,
    totalActiveRecalls: 0,
    loading: false,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setState((s) => ({ ...s, matches: [], totalAffectedPets: 0, totalActiveRecalls: 0, loading: false }));
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get('/recalls/check-pets')
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data ?? {};
        setState({
          matches: data.matches ?? [],
          totalAffectedPets: data.totalAffectedPets ?? 0,
          totalActiveRecalls: data.totalActiveRecalls ?? 0,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err?.message ?? 'Failed to load recall matches' }));
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, reloadKey]);

  return { ...state, refetch: () => setReloadKey((k) => k + 1) };
}
