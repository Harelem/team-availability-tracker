/**
 * Performance-optimized caching utilities for Version 2.2
 * Implements memory-efficient caching with automatic cleanup
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

/**
 * Memory-efficient cache implementation with automatic cleanup
 */
class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    
    // Auto cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Get item from cache with automatic expiry check
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set item in cache with optional TTL override
   */
  set(key: string, data: T, ttl?: number): void {
    // Enforce max size with LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for performance monitoring
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // Would need to track hits/misses for real implementation
    };
  }

  /**
   * Cleanup interval when cache is no longer needed
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global cache instances for different data types
const queryCache = new PerformanceCache<any>({
  ttl: 2 * 60 * 1000, // 2 minutes for query results
  maxSize: 50
});

const componentCache = new PerformanceCache<React.ComponentType<any>>({
  ttl: 10 * 60 * 1000, // 10 minutes for component definitions
  maxSize: 20
});

const metadataCache = new PerformanceCache<any>({
  ttl: 5 * 60 * 1000, // 5 minutes for metadata
  maxSize: 30
});

/**
 * Cache hook for React Query-style caching
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T> | T,
  options: CacheOptions = {}
): T | null {
  const cached = queryCache.get(key);
  
  if (cached) {
    return cached;
  }
  
  // Async fetch and cache
  Promise.resolve(fetcher()).then(data => {
    queryCache.set(key, data, options.ttl);
  }).catch(error => {
    console.warn('Cache fetch error:', error);
  });
  
  return null;
}

/**
 * Preload data into cache for better performance
 */
export function preloadCache<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): void {
  queryCache.set(key, data, options.ttl);
}

/**
 * Invalidate cache entries by key pattern
 */
export function invalidateCache(keyPattern: string): void {
  const regex = new RegExp(keyPattern);
  for (const key of queryCache['cache'].keys()) {
    if (regex.test(key)) {
      queryCache['cache'].delete(key);
    }
  }
}

/**
 * Get combined cache statistics for performance monitoring
 */
export function getCacheStats() {
  return {
    query: queryCache.getStats(),
    component: componentCache.getStats(),
    metadata: metadataCache.getStats(),
    total: {
      size: queryCache.getStats().size + componentCache.getStats().size + metadataCache.getStats().size
    }
  };
}

// Export cache instances for direct access
export { queryCache, componentCache, metadataCache };

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    queryCache.destroy();
    componentCache.destroy();
    metadataCache.destroy();
  });
}