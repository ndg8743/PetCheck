/**
 * High-level offline storage service for PetCheck
 * Provides domain-specific storage operations built on top of IndexedDB
 */

import { Pet, PetMedication } from '@petcheck/shared';
import { STORES, get, set, getAll, getAllByIndex, del } from './indexedDb';

// Types for offline storage
export interface SearchResult {
  key: string;
  query: string;
  filters?: Record<string, unknown>;
  results: unknown[];
  timestamp: number;
  expiresAt: number;
}

export interface Favorite {
  id: string;
  type: 'drug' | 'veterinarian' | 'pet';
  data: unknown;
  addedAt: number;
}

export interface SyncQueueItem {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity: 'pet' | 'medication' | 'favorite';
  entityId: string;
  data?: unknown;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

const SEARCH_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Save a pet profile offline
 */
export async function savePetOffline(pet: Pet): Promise<void> {
  try {
    await set(STORES.PETS, pet);
  } catch (error) {
    console.error('Failed to save pet offline:', error);
    throw error;
  }
}

/**
 * Get all pets stored offline
 */
export async function getPetsOffline(): Promise<Pet[]> {
  try {
    return await getAll<Pet>(STORES.PETS);
  } catch (error) {
    console.error('Failed to get pets offline:', error);
    return [];
  }
}

/**
 * Get a single pet by ID offline
 */
export async function getPetOffline(petId: string): Promise<Pet | undefined> {
  try {
    return await get<Pet>(STORES.PETS, petId);
  } catch (error) {
    console.error('Failed to get pet offline:', error);
    return undefined;
  }
}

/**
 * Delete a pet from offline storage
 */
export async function deletePetOffline(petId: string): Promise<void> {
  try {
    await del(STORES.PETS, petId);
  } catch (error) {
    console.error('Failed to delete pet offline:', error);
    throw error;
  }
}

/**
 * Save a medication offline
 */
export async function saveMedicationOffline(medication: PetMedication): Promise<void> {
  try {
    await set(STORES.MEDICATIONS, medication);
  } catch (error) {
    console.error('Failed to save medication offline:', error);
    throw error;
  }
}

/**
 * Get medications for a specific pet offline
 */
export async function getMedicationsOffline(petId: string): Promise<PetMedication[]> {
  try {
    return await getAllByIndex<PetMedication>(STORES.MEDICATIONS, 'petId', petId);
  } catch (error) {
    console.error('Failed to get medications offline:', error);
    return [];
  }
}

/**
 * Get all medications stored offline
 */
export async function getAllMedicationsOffline(): Promise<PetMedication[]> {
  try {
    return await getAll<PetMedication>(STORES.MEDICATIONS);
  } catch (error) {
    console.error('Failed to get all medications offline:', error);
    return [];
  }
}

/**
 * Delete a medication from offline storage
 */
export async function deleteMedicationOffline(medicationId: string): Promise<void> {
  try {
    await del(STORES.MEDICATIONS, medicationId);
  } catch (error) {
    console.error('Failed to delete medication offline:', error);
    throw error;
  }
}

/**
 * Save search results with a cache key
 */
export async function saveSearchResults(
  queryKey: string,
  query: string,
  results: unknown[],
  filters?: Record<string, unknown>
): Promise<void> {
  try {
    const searchResult: SearchResult = {
      key: queryKey,
      query,
      filters,
      results,
      timestamp: Date.now(),
      expiresAt: Date.now() + SEARCH_CACHE_DURATION,
    };
    await set(STORES.SEARCHES, searchResult);
  } catch (error) {
    console.error('Failed to save search results:', error);
  }
}

/**
 * Get cached search results
 */
export async function getSearchResults(queryKey: string): Promise<unknown[] | null> {
  try {
    const result = await get<SearchResult>(STORES.SEARCHES, queryKey);

    if (!result) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > result.expiresAt) {
      await del(STORES.SEARCHES, queryKey);
      return null;
    }

    return result.results;
  } catch (error) {
    console.error('Failed to get search results:', error);
    return null;
  }
}

/**
 * Clear expired search results
 */
export async function clearExpiredSearches(): Promise<void> {
  try {
    const allSearches = await getAll<SearchResult>(STORES.SEARCHES);
    const now = Date.now();

    for (const search of allSearches) {
      if (now > search.expiresAt) {
        await del(STORES.SEARCHES, search.key);
      }
    }
  } catch (error) {
    console.error('Failed to clear expired searches:', error);
  }
}

/**
 * Save a favorite item
 */
export async function saveFavorite(
  id: string,
  type: Favorite['type'],
  data: unknown
): Promise<void> {
  try {
    const favorite: Favorite = {
      id,
      type,
      data,
      addedAt: Date.now(),
    };
    await set(STORES.FAVORITES, favorite);
  } catch (error) {
    console.error('Failed to save favorite:', error);
    throw error;
  }
}

/**
 * Get all favorites
 */
export async function getFavorites(): Promise<Favorite[]> {
  try {
    return await getAll<Favorite>(STORES.FAVORITES);
  } catch (error) {
    console.error('Failed to get favorites:', error);
    return [];
  }
}

/**
 * Get favorites by type
 */
export async function getFavoritesByType(type: Favorite['type']): Promise<Favorite[]> {
  try {
    return await getAllByIndex<Favorite>(STORES.FAVORITES, 'type', type);
  } catch (error) {
    console.error('Failed to get favorites by type:', error);
    return [];
  }
}

/**
 * Delete a favorite
 */
export async function deleteFavorite(id: string): Promise<void> {
  try {
    await del(STORES.FAVORITES, id);
  } catch (error) {
    console.error('Failed to delete favorite:', error);
    throw error;
  }
}

/**
 * Queue an operation for sync when online
 */
export async function queueForSync(
  type: SyncQueueItem['type'],
  entity: SyncQueueItem['entity'],
  entityId: string,
  data?: unknown
): Promise<void> {
  try {
    const queueItem: SyncQueueItem = {
      type,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };
    await set(STORES.PENDING_SYNC, queueItem);
  } catch (error) {
    console.error('Failed to queue for sync:', error);
    throw error;
  }
}

/**
 * Get all pending sync items
 */
export async function getPendingSync(): Promise<SyncQueueItem[]> {
  try {
    return await getAllByIndex<SyncQueueItem>(STORES.PENDING_SYNC, 'status', 'pending');
  } catch (error) {
    console.error('Failed to get pending sync items:', error);
    return [];
  }
}

/**
 * Get all sync items (including failed)
 */
export async function getAllSyncItems(): Promise<SyncQueueItem[]> {
  try {
    return await getAll<SyncQueueItem>(STORES.PENDING_SYNC);
  } catch (error) {
    console.error('Failed to get all sync items:', error);
    return [];
  }
}

/**
 * Update sync item status
 */
export async function updateSyncItemStatus(
  item: SyncQueueItem,
  status: SyncQueueItem['status'],
  error?: string
): Promise<void> {
  try {
    const updatedItem: SyncQueueItem = {
      ...item,
      status,
      error,
    };
    await set(STORES.PENDING_SYNC, updatedItem);
  } catch (error) {
    console.error('Failed to update sync item status:', error);
  }
}

/**
 * Clear synced items
 */
export async function clearSynced(itemIds: number[]): Promise<void> {
  try {
    for (const id of itemIds) {
      await del(STORES.PENDING_SYNC, id);
    }
  } catch (error) {
    console.error('Failed to clear synced items:', error);
  }
}

/**
 * Get count of pending sync items
 */
export async function getPendingSyncCount(): Promise<number> {
  try {
    const pending = await getPendingSync();
    return pending.length;
  } catch (error) {
    console.error('Failed to get pending sync count:', error);
    return 0;
  }
}

/**
 * Retry a failed sync item
 */
export async function retrySyncItem(item: SyncQueueItem): Promise<void> {
  try {
    const updatedItem: SyncQueueItem = {
      ...item,
      status: 'pending',
      retryCount: item.retryCount + 1,
      error: undefined,
    };
    await set(STORES.PENDING_SYNC, updatedItem);
  } catch (error) {
    console.error('Failed to retry sync item:', error);
  }
}
