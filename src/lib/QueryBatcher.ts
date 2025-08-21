/**
 * QueryBatcher - Optimizes database queries by batching, deduplicating, and caching
 * Reduces Supabase egress costs by preventing duplicate/overlapping queries
 */

interface BatchedQuery<T = any> {
  key: string;
  promise: Promise<T>;
  timestamp: number;
  subscribers: Array<(result: T | Error) => void>;
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class QueryBatcher {
  private pendingQueries = new Map<string, BatchedQuery>();
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_BATCH_DELAY = 50; // 50ms max delay for batching

  /**
   * Execute a query with deduplication and caching
   */
  async execute<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: {
      ttl?: number;
      skipCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { ttl = this.DEFAULT_TTL, skipCache = false, timeout = 10000 } = options;

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const cached = this.getFromCache<T>(key);
      if (cached) {
        return cached;
      }
    }

    // Check if query is already pending (deduplication)
    const existing = this.pendingQueries.get(key);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.subscribers.push((result) => {
          if (result instanceof Error) {
            reject(result);
          } else {
            resolve(result);
          }
        });
      });
    }

    // Create new batched query
    const queryPromise = this.executeWithTimeout(queryFn, timeout);
    
    const batchedQuery: BatchedQuery<T> = {
      key,
      promise: queryPromise,
      timestamp: Date.now(),
      subscribers: []
    };

    this.pendingQueries.set(key, batchedQuery);

    try {
      const result = await queryPromise;
      
      // Cache the result
      this.cache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl
      });

      // Notify all subscribers
      batchedQuery.subscribers.forEach(subscriber => subscriber(result));
      
      return result;

    } catch (error) {
      // Notify all subscribers of the error
      batchedQuery.subscribers.forEach(subscriber => subscriber(error as Error));
      throw error;

    } finally {
      // Clean up pending query
      this.pendingQueries.delete(key);
    }
  }

  /**
   * Batch multiple queries together with Promise.allSettled
   */
  async batchExecute<T extends Record<string, any>>(
    queries: Record<keyof T, () => Promise<any>>,
    options: {
      timeout?: number;
      failFast?: boolean;
    } = {}
  ): Promise<{ results: Partial<T>; errors: Record<keyof T, Error> }> {
    const { timeout = 15000, failFast = false } = options;

    const queryKeys = Object.keys(queries) as Array<keyof T>;
    const queryPromises = queryKeys.map(key => {
      const queryFn = queries[key];
      return this.executeWithTimeout(queryFn, timeout).then(
        result => ({ key, result, error: null }),
        error => ({ key, result: null, error })
      );
    });

    try {
      let settledResults;
      
      if (failFast) {
        settledResults = await Promise.all(queryPromises);
      } else {
        settledResults = await Promise.allSettled(queryPromises);
      }

      const results: Partial<T> = {};
      const errors: Partial<Record<keyof T, Error>> = {};

      // Process results
      settledResults.forEach((settled, index) => {
        const key = queryKeys[index];
        
        if (settled.status === 'fulfilled') {
          const { result, error } = settled.value;
          if (error) {
            errors[key] = error;
          } else {
            results[key] = result;
          }
        } else if (settled.status === 'rejected') {
          errors[key] = settled.reason;
        } else {
          // For non-Promise.allSettled case
          const { result, error } = settled as any;
          if (error) {
            errors[key] = error;
          } else {
            results[key] = result;
          }
        }
      });

      return { results, errors: errors as Record<keyof T, Error> };

    } catch (error) {
      throw new Error(`Batch execution failed: ${error}`);
    }
  }

  /**
   * Get cached result if valid
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Execute query with timeout
   */
  private async executeWithTimeout<T>(
    queryFn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      queryFn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
      })
    ]);
  }

  /**
   * Clear cache entries (useful for testing or forced refresh)
   */
  clearCache(pattern?: RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const [key] of this.cache) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([, entry]) => now - entry.timestamp < entry.ttl).length,
      pendingQueries: this.pendingQueries.size,
      memoryUsage: JSON.stringify(entries).length // Rough estimate
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global instance
export const queryBatcher = new QueryBatcher();

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    queryBatcher.cleanExpiredEntries();
  }, 5 * 60 * 1000);
}