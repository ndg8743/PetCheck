/**
 * Storage utilities barrel export
 * Provides offline storage, sync, and IndexedDB utilities
 */

// IndexedDB low-level API
export {
  STORES,
  get,
  set,
  del,
  getAll,
  getAllByIndex,
  clear,
  count,
  closeDB,
  deleteDB,
  IndexedDBError,
  type StoreName,
} from './indexedDb';

// High-level offline storage
export {
  isOnline,
  savePetOffline,
  getPetsOffline,
  getPetOffline,
  deletePetOffline,
  saveMedicationOffline,
  getMedicationsOffline,
  getAllMedicationsOffline,
  deleteMedicationOffline,
  saveSearchResults,
  getSearchResults,
  clearExpiredSearches,
  saveFavorite,
  getFavorites,
  getFavoritesByType,
  deleteFavorite,
  queueForSync,
  getPendingSync,
  getAllSyncItems,
  updateSyncItemStatus,
  clearSynced,
  getPendingSyncCount,
  retrySyncItem,
  type SearchResult,
  type Favorite,
  type SyncQueueItem,
} from './offlineStorage';

// Sync manager
export {
  processQueue,
  SyncManager,
  syncManager,
  type SyncResult,
  type SyncOptions,
} from './syncManager';
