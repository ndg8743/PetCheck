/**
 * IndexedDB wrapper for PetCheck offline storage
 * Provides a simple async/await API for storing and retrieving data
 */

const DB_NAME = 'petcheck-db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  PETS: 'pets',
  MEDICATIONS: 'medications',
  SEARCHES: 'searches',
  FAVORITES: 'favorites',
  PENDING_SYNC: 'pendingSync',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

// IndexedDB error types
export class IndexedDBError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'IndexedDBError';
  }
}

/**
 * Initialize the IndexedDB database
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      reject(new IndexedDBError('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new IndexedDBError('Failed to open database', request.error as Error));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PETS)) {
        const petsStore = db.createObjectStore(STORES.PETS, { keyPath: 'id' });
        petsStore.createIndex('userId', 'userId', { unique: false });
        petsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.MEDICATIONS)) {
        const medsStore = db.createObjectStore(STORES.MEDICATIONS, { keyPath: 'id' });
        medsStore.createIndex('petId', 'petId', { unique: false });
        medsStore.createIndex('isActive', 'isActive', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SEARCHES)) {
        const searchStore = db.createObjectStore(STORES.SEARCHES, { keyPath: 'key' });
        searchStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
        const favStore = db.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
        favStore.createIndex('type', 'type', { unique: false });
        favStore.createIndex('addedAt', 'addedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
        const syncStore = db.createObjectStore(STORES.PENDING_SYNC, {
          keyPath: 'id',
          autoIncrement: true
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// Database instance cache
let dbInstance: IDBDatabase | null = null;

/**
 * Get the database instance
 */
async function getDB(): Promise<IDBDatabase> {
  if (dbInstance && !dbInstance.objectStoreNames.contains(STORES.PETS)) {
    // Database was invalidated
    dbInstance.close();
    dbInstance = null;
  }

  if (!dbInstance) {
    dbInstance = await initDB();
  }

  return dbInstance;
}

/**
 * Get a value from a store by key
 */
export async function get<T>(storeName: StoreName, key: string | number): Promise<T | undefined> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result as T | undefined);
      };

      request.onerror = () => {
        reject(new IndexedDBError(`Failed to get item from ${storeName}`, request.error as Error));
      };
    });
  } catch (error) {
    throw new IndexedDBError(
      `Error accessing store ${storeName}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Set a value in a store
 */
export async function set<T>(storeName: StoreName, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new IndexedDBError(`Failed to set item in ${storeName}`, request.error as Error));
      };
    });
  } catch (error) {
    throw new IndexedDBError(
      `Error accessing store ${storeName}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete a value from a store by key
 */
export async function del(storeName: StoreName, key: string | number): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new IndexedDBError(`Failed to delete item from ${storeName}`, request.error as Error));
      };
    });
  } catch (error) {
    throw new IndexedDBError(
      `Error accessing store ${storeName}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get all values from a store
 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(new IndexedDBError(`Failed to get all items from ${storeName}`, request.error as Error));
      };
    });
  } catch (error) {
    throw new IndexedDBError(
      `Error accessing store ${storeName}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get all values from a store by index
 */
export async function getAllByIndex<T>(
  storeName: StoreName,
  indexName: string,
  query?: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = query ? index.getAll(query) : index.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(new IndexedDBError(`Failed to get items by index from ${storeName}`, request.error as Error));
      };
    });
  } catch (error) {
    throw new IndexedDBError(
      `Error accessing store ${storeName}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Clear all values from a store
 */
export async function clear(storeName: StoreName): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new IndexedDBError(`Failed to clear ${storeName}`, request.error as Error));
      };
    });
  } catch (error) {
    throw new IndexedDBError(
      `Error accessing store ${storeName}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Count items in a store
 */
export async function count(storeName: StoreName): Promise<number> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new IndexedDBError(`Failed to count items in ${storeName}`, request.error as Error));
      };
    });
  } catch (error) {
    throw new IndexedDBError(
      `Error accessing store ${storeName}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete the entire database
 */
export async function deleteDB(): Promise<void> {
  closeDB();

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new IndexedDBError('Failed to delete database', request.error as Error));
    };
  });
}
