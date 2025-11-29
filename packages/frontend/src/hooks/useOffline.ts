/**
 * React hook for offline state management
 * Provides real-time offline/online status and sync functionality
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isOnline,
  getPendingSyncCount,
  syncManager,
  type SyncResult,
} from '../lib/storage';

export interface UseOfflineReturn {
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncTime: Date | null;
  lastSyncResult: SyncResult | null;
  isSyncing: boolean;
  triggerSync: () => Promise<SyncResult>;
  refreshPendingCount: () => Promise<void>;
}

/**
 * Hook for managing offline state and synchronization
 */
export function useOffline(): UseOfflineReturn {
  const [online, setOnline] = useState<boolean>(isOnline());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  /**
   * Refresh the pending sync count
   */
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Failed to get pending sync count:', error);
    }
  }, []);

  /**
   * Manually trigger a sync
   */
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    if (!online) {
      const offlineResult: SyncResult = {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ item: {} as any, error: 'Device is offline' }],
      };
      return offlineResult;
    }

    setIsSyncing(true);

    try {
      const result = await syncManager.sync({
        onProgress: (current, total) => {
          console.log(`Syncing ${current} of ${total}...`);
        },
      });

      setLastSyncTime(new Date());
      setLastSyncResult(result);
      await refreshPendingCount();

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      const errorResult: SyncResult = {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{
          item: {} as any,
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, [online, refreshPendingCount]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
    };

    const handleOffline = () => {
      setOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    refreshPendingCount();

    // Set up sync listener
    const unsubscribe = syncManager.addListener((result) => {
      setLastSyncTime(new Date());
      setLastSyncResult(result);
      refreshPendingCount();
    });

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [refreshPendingCount]);

  /**
   * Update syncing state based on sync manager
   */
  useEffect(() => {
    const checkSyncState = () => {
      setIsSyncing(syncManager.syncing);
    };

    const interval = setInterval(checkSyncState, 500);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline: online,
    pendingSyncCount: pendingCount,
    lastSyncTime,
    lastSyncResult,
    isSyncing,
    triggerSync,
    refreshPendingCount,
  };
}

/**
 * Hook for simple online/offline status
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(isOnline());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

/**
 * Hook for sync status only
 */
export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Failed to get pending sync count:', error);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();

    const unsubscribe = syncManager.addListener(() => {
      setLastSyncTime(new Date());
      refreshPendingCount();
    });

    return unsubscribe;
  }, [refreshPendingCount]);

  return {
    pendingSyncCount: pendingCount,
    lastSyncTime,
    refreshPendingCount,
  };
}
