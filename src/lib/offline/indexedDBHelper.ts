/**
 * IndexedDB Helper for Offline Data Storage
 * 
 * Provides a comprehensive interface for storing and retrieving data offline,
 * including pending updates, cached responses, and user preferences.
 */

// Database configuration
const DB_NAME = 'team-tracker-offline';
const DB_VERSION = 1;

// Object store names
const STORES = {
  PENDING_UPDATES: 'pendingUpdates',
  CACHED_RESPONSES: 'cachedResponses', 
  USER_PREFERENCES: 'userPreferences',
  TEAM_DATA: 'teamData',
  SCHEDULE_DATA: 'scheduleData',
  ANALYTICS_DATA: 'analyticsData'
} as const;

export interface PendingUpdate {
  id: string;
  type: 'schedule' | 'availability' | 'team' | 'analytics';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  endpoint: string;
  method: string;
}

export interface CachedResponse {
  url: string;
  response: any;
  timestamp: number;
  expiry: number;
  etag?: string;
}

export interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiry?: number;
}

/**
 * IndexedDB Database Manager
 */
class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initializeDB();
  }

  /**
   * Initialize the IndexedDB database
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create pending updates store
        if (!db.objectStoreNames.contains(STORES.PENDING_UPDATES)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_UPDATES, { keyPath: 'id' });
          pendingStore.createIndex('type', 'type', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create cached responses store
        if (!db.objectStoreNames.contains(STORES.CACHED_RESPONSES)) {
          const cacheStore = db.createObjectStore(STORES.CACHED_RESPONSES, { keyPath: 'url' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('expiry', 'expiry', { unique: false });
        }

        // Create user preferences store
        if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
          db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
        }

        // Create team data store
        if (!db.objectStoreNames.contains(STORES.TEAM_DATA)) {
          const teamStore = db.createObjectStore(STORES.TEAM_DATA, { keyPath: 'key' });
          teamStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create schedule data store
        if (!db.objectStoreNames.contains(STORES.SCHEDULE_DATA)) {
          const scheduleStore = db.createObjectStore(STORES.SCHEDULE_DATA, { keyPath: 'key' });
          scheduleStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create analytics data store
        if (!db.objectStoreNames.contains(STORES.ANALYTICS_DATA)) {
          const analyticsStore = db.createObjectStore(STORES.ANALYTICS_DATA, { keyPath: 'key' });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return this.db;
  }

  /**
   * Generic method to perform database operations
   */
  private async performTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Pending Updates Operations

  /**
   * Add a pending update to the queue
   */
  async addPendingUpdate(update: Omit<PendingUpdate, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingUpdate: PendingUpdate = {
      ...update,
      id,
      timestamp: Date.now(),
      retryCount: 0
    };

    await this.performTransaction(
      STORES.PENDING_UPDATES,
      'readwrite',
      (store) => store.add(pendingUpdate)
    );

    return id;
  }

  /**
   * Get all pending updates
   */
  async getPendingUpdates(): Promise<PendingUpdate[]> {
    return this.performTransaction(
      STORES.PENDING_UPDATES,
      'readonly',
      (store) => store.getAll()
    );
  }

  /**
   * Get pending updates by type
   */
  async getPendingUpdatesByType(type: PendingUpdate['type']): Promise<PendingUpdate[]> {
    return this.performTransaction(
      STORES.PENDING_UPDATES,
      'readonly',
      (store) => store.index('type').getAll(type)
    );
  }

  /**
   * Remove a pending update
   */
  async removePendingUpdate(id: string): Promise<void> {
    await this.performTransaction(
      STORES.PENDING_UPDATES,
      'readwrite',
      (store) => store.delete(id)
    );
  }

  /**
   * Update retry count for a pending update
   */
  async incrementRetryCount(id: string): Promise<boolean> {
    const update = await this.performTransaction(
      STORES.PENDING_UPDATES,
      'readonly',
      (store) => store.get(id)
    );

    if (!update) return false;

    if (update.retryCount >= update.maxRetries) {
      // Max retries reached, remove the update
      await this.removePendingUpdate(id);
      return false;
    }

    update.retryCount += 1;
    
    await this.performTransaction(
      STORES.PENDING_UPDATES,
      'readwrite',
      (store) => store.put(update)
    );

    return true;
  }

  // Cached Responses Operations

  /**
   * Cache a response
   */
  async cacheResponse(url: string, response: any, ttl: number = 3600000): Promise<void> {
    const cachedResponse: CachedResponse = {
      url,
      response,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };

    await this.performTransaction(
      STORES.CACHED_RESPONSES,
      'readwrite',
      (store) => store.put(cachedResponse)
    );
  }

  /**
   * Get cached response
   */
  async getCachedResponse(url: string): Promise<any | null> {
    const cached = await this.performTransaction(
      STORES.CACHED_RESPONSES,
      'readonly',
      (store) => store.get(url)
    );

    if (!cached || Date.now() > cached.expiry) {
      if (cached) {
        // Remove expired cache
        await this.removeCachedResponse(url);
      }
      return null;
    }

    return cached.response;
  }

  /**
   * Remove cached response
   */
  async removeCachedResponse(url: string): Promise<void> {
    await this.performTransaction(
      STORES.CACHED_RESPONSES,
      'readwrite',
      (store) => store.delete(url)
    );
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<void> {
    const now = Date.now();
    const expired = await this.performTransaction(
      STORES.CACHED_RESPONSES,
      'readonly',
      (store) => {
        const index = store.index('expiry');
        return index.getAll(IDBKeyRange.upperBound(now));
      }
    );

    for (const item of expired) {
      await this.removeCachedResponse(item.url);
    }
  }

  // Generic Data Storage Operations

  /**
   * Store data in a specific store
   */
  async storeData(storeName: string, key: string, data: any, ttl?: number): Promise<void> {
    const offlineData: OfflineData = {
      key,
      data,
      timestamp: Date.now(),
      expiry: ttl ? Date.now() + ttl : undefined
    };

    await this.performTransaction(
      storeName,
      'readwrite',
      (store) => store.put(offlineData)
    );
  }

  /**
   * Retrieve data from a specific store
   */
  async getData(storeName: string, key: string): Promise<any | null> {
    const stored = await this.performTransaction(
      storeName,
      'readonly',
      (store) => store.get(key)
    );

    if (!stored) return null;

    // Check expiry
    if (stored.expiry && Date.now() > stored.expiry) {
      await this.removeData(storeName, key);
      return null;
    }

    return stored.data;
  }

  /**
   * Remove data from a specific store
   */
  async removeData(storeName: string, key: string): Promise<void> {
    await this.performTransaction(
      storeName,
      'readwrite',
      (store) => store.delete(key)
    );
  }

  /**
   * Get all data from a specific store
   */
  async getAllData(storeName: string): Promise<OfflineData[]> {
    return this.performTransaction(
      storeName,
      'readonly',
      (store) => store.getAll()
    );
  }

  // Specialized Storage Methods

  /**
   * Store team data
   */
  async storeTeamData(teamId: string, data: any): Promise<void> {
    await this.storeData(STORES.TEAM_DATA, `team_${teamId}`, data, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Get team data
   */
  async getTeamData(teamId: string): Promise<any | null> {
    return this.getData(STORES.TEAM_DATA, `team_${teamId}`);
  }

  /**
   * Store schedule data
   */
  async storeScheduleData(key: string, data: any): Promise<void> {
    await this.storeData(STORES.SCHEDULE_DATA, key, data, 12 * 60 * 60 * 1000); // 12 hours
  }

  /**
   * Get schedule data
   */
  async getScheduleData(key: string): Promise<any | null> {
    return this.getData(STORES.SCHEDULE_DATA, key);
  }

  /**
   * Store analytics data
   */
  async storeAnalyticsData(key: string, data: any): Promise<void> {
    await this.storeData(STORES.ANALYTICS_DATA, key, data, 6 * 60 * 60 * 1000); // 6 hours
  }

  /**
   * Get analytics data
   */
  async getAnalyticsData(key: string): Promise<any | null> {
    return this.getData(STORES.ANALYTICS_DATA, key);
  }

  /**
   * Store user preferences
   */
  async storeUserPreferences(key: string, preferences: any): Promise<void> {
    await this.storeData(STORES.USER_PREFERENCES, key, preferences); // No expiry
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(key: string): Promise<any | null> {
    return this.getData(STORES.USER_PREFERENCES, key);
  }

  /**
   * Clear all data (for testing or reset purposes)
   */
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    const storeNames = Array.from(db.objectStoreNames);
    
    for (const storeName of storeNames) {
      await this.performTransaction(
        storeName,
        'readwrite',
        (store) => store.clear()
      );
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ [storeName: string]: number }> {
    const db = await this.ensureDB();
    const stats: { [storeName: string]: number } = {};
    
    for (const storeName of Array.from(db.objectStoreNames)) {
      const count = await this.performTransaction(
        storeName,
        'readonly',
        (store) => store.count()
      );
      stats[storeName] = count;
    }

    return stats;
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();

// Utility functions for service worker
export async function getPendingScheduleUpdates(): Promise<PendingUpdate[]> {
  return indexedDBManager.getPendingUpdatesByType('schedule');
}

export async function removePendingUpdate(id: string): Promise<void> {
  return indexedDBManager.removePendingUpdate(id);
}

export async function addPendingScheduleUpdate(data: any, endpoint: string, method: string = 'POST'): Promise<string> {
  return indexedDBManager.addPendingUpdate({
    type: 'schedule',
    data,
    endpoint,
    method,
    maxRetries: 3
  });
}

export { STORES };