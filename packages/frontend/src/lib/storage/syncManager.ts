/**
 * Background sync manager for PetCheck
 * Handles syncing offline changes with the server when connection is restored
 */

import { Pet, PetMedication } from '@petcheck/shared';
import api from '../api';
import {
  getPendingSync,
  updateSyncItemStatus,
  clearSynced,
  isOnline,
  SyncQueueItem,
  savePetOffline,
  saveMedicationOffline,
  deletePetOffline,
  deleteMedicationOffline,
} from './offlineStorage';

// Sync configuration
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{
    item: SyncQueueItem;
    error: string;
  }>;
}

export interface SyncOptions {
  onProgress?: (current: number, total: number) => void;
  onItemSync?: (item: SyncQueueItem, success: boolean) => void;
  abortSignal?: AbortSignal;
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(retryCount: number): number {
  const delay = Math.min(
    BASE_RETRY_DELAY * Math.pow(2, retryCount),
    MAX_RETRY_DELAY
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sync a single item with the server
 */
async function syncItem(item: SyncQueueItem): Promise<void> {
  const { type, entity, entityId, data } = item;

  try {
    switch (entity) {
      case 'pet':
        await syncPet(type, entityId, data as Pet);
        break;
      case 'medication':
        await syncMedication(type, entityId, data as PetMedication);
        break;
      case 'favorite':
        // Favorites are typically local-only, but can be synced if needed
        console.warn('Favorite sync not implemented');
        break;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Sync a pet with the server
 */
async function syncPet(
  type: SyncQueueItem['type'],
  petId: string,
  data?: Pet
): Promise<void> {
  try {
    switch (type) {
      case 'create':
        if (!data) throw new Error('Pet data required for create operation');
        const createdPet = await api.post<Pet>('/pets', data);
        // Update local storage with server version (server wins)
        await savePetOffline(createdPet.data);
        break;

      case 'update':
        if (!data) throw new Error('Pet data required for update operation');
        const updatedPet = await api.put<Pet>(`/pets/${petId}`, data);
        // Update local storage with server version (server wins)
        await savePetOffline(updatedPet.data);
        break;

      case 'delete':
        await api.delete(`/pets/${petId}`);
        // Remove from local storage
        await deletePetOffline(petId);
        break;

      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Sync a medication with the server
 */
async function syncMedication(
  type: SyncQueueItem['type'],
  medicationId: string,
  data?: PetMedication
): Promise<void> {
  try {
    switch (type) {
      case 'create':
        if (!data) throw new Error('Medication data required for create operation');
        // Assuming API endpoint structure
        const createdMed = await api.post<PetMedication>(
          `/pets/${data.id}/medications`,
          data
        );
        await saveMedicationOffline(createdMed.data);
        break;

      case 'update':
        if (!data) throw new Error('Medication data required for update operation');
        const updatedMed = await api.put<PetMedication>(
          `/medications/${medicationId}`,
          data
        );
        await saveMedicationOffline(updatedMed.data);
        break;

      case 'delete':
        await api.delete(`/medications/${medicationId}`);
        await deleteMedicationOffline(medicationId);
        break;

      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Process the sync queue
 */
export async function processQueue(options: SyncOptions = {}): Promise<SyncResult> {
  const { onProgress, onItemSync, abortSignal } = options;

  // Check if online
  if (!isOnline()) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [{ item: {} as SyncQueueItem, error: 'Device is offline' }],
    };
  }

  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  try {
    const pendingItems = await getPendingSync();

    if (pendingItems.length === 0) {
      return result;
    }

    const total = pendingItems.length;

    for (let i = 0; i < pendingItems.length; i++) {
      // Check if sync was aborted
      if (abortSignal?.aborted) {
        result.success = false;
        break;
      }

      const item = pendingItems[i];

      // Skip items that have exceeded max retries
      if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
        await updateSyncItemStatus(item, 'failed', 'Max retry attempts exceeded');
        result.failedCount++;
        result.errors.push({
          item,
          error: 'Max retry attempts exceeded',
        });
        onItemSync?.(item, false);
        continue;
      }

      // Update progress
      onProgress?.(i + 1, total);

      // Mark as processing
      await updateSyncItemStatus(item, 'processing');

      try {
        // Sync the item
        await syncItem(item);

        // Success - remove from queue
        if (item.id) {
          await clearSynced([item.id]);
        }
        result.syncedCount++;
        onItemSync?.(item, true);
      } catch (error) {
        // Failed - update status and schedule retry
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await updateSyncItemStatus(item, 'failed', errorMessage);

        result.failedCount++;
        result.errors.push({
          item,
          error: errorMessage,
        });

        onItemSync?.(item, false);

        // Wait before retrying (exponential backoff)
        if (item.retryCount < MAX_RETRY_ATTEMPTS - 1) {
          const delay = getRetryDelay(item.retryCount);
          await sleep(delay);

          // Reset to pending for next sync attempt
          await updateSyncItemStatus(
            { ...item, retryCount: item.retryCount + 1 },
            'pending'
          );
        }
      }
    }

    result.success = result.failedCount === 0;
    return result;
  } catch (error) {
    console.error('Error processing sync queue:', error);
    return {
      success: false,
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      errors: [
        ...result.errors,
        {
          item: {} as SyncQueueItem,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}

/**
 * SyncManager class for managing background sync
 */
export class SyncManager {
  private syncInterval: number | null = null;
  private isSyncing = false;
  private listeners: Set<(result: SyncResult) => void> = new Set();

  /**
   * Start automatic syncing
   */
  start(intervalMs: number = 60000): void {
    if (this.syncInterval !== null) {
      console.warn('SyncManager already started');
      return;
    }

    // Initial sync
    this.sync();

    // Set up interval
    this.syncInterval = window.setInterval(() => {
      this.sync();
    }, intervalMs);

    // Listen for online events
    window.addEventListener('online', this.handleOnline);
  }

  /**
   * Stop automatic syncing
   */
  stop(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    window.removeEventListener('online', this.handleOnline);
  }

  /**
   * Manually trigger a sync
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ item: {} as SyncQueueItem, error: 'Sync already in progress' }],
      };
    }

    this.isSyncing = true;

    try {
      const result = await processQueue(options);
      this.notifyListeners(result);
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Add a listener for sync results
   */
  addListener(listener: (result: SyncResult) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of sync result
   */
  private notifyListeners(result: SyncResult): void {
    this.listeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('Device came online, triggering sync...');
    this.sync();
  };

  /**
   * Check if currently syncing
   */
  get syncing(): boolean {
    return this.isSyncing;
  }
}

// Global sync manager instance
export const syncManager = new SyncManager();
