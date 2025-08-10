/**
 * Data Consistency Manager
 * 
 * Centralized utility for managing data consistency, caching, and request deduplication
 * with circuit breaker protection to prevent cascade failures.
 */

import { databaseCircuitBreaker, globalRequestDeduplicator } from './circuitBreaker';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  requestId: string;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  requestId: string;
  timestamp: number;
}

class DataConsistencyManager {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly DEFAULT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (EMERGENCY EGRESS REDUCTION)
  private readonly STATIC_DATA_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours for teams/members (AGGRESSIVE CACHING)
  private readonly REQUEST_TIMEOUT = 5 * 1000; // 5 seconds (FAST FAIL FOR PERFORMANCE)
  private readonly EGRESS_REDUCTION_MODE = true; // Enable aggressive caching

  /**
   * Check if this is static data that should use extended caching (EXPANDED FOR PERFORMANCE)
   */
  private isStaticData(cacheKey: string): boolean {
    return cacheKey.includes('teams') || 
           cacheKey.includes('team_members') || 
           cacheKey.includes('global_sprint') ||
           cacheKey.includes('operational_teams') ||
           cacheKey.includes('coo_dashboard_data') ||
           cacheKey.includes('company_hours_status');
  }

  /**
   * Get cached data from localStorage (egress reduction)
   */
  private getFromLocalStorage<T>(cacheKey: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(`cache_${cacheKey}`);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(`cache_${cacheKey}`);
        return null;
      }
      
      return parsed.data;
    } catch {
      return null;
    }
  }

  /**
   * Save data to localStorage for egress reduction
   */
  private saveToLocalStorage<T>(cacheKey: string, data: T, expiresAt: number): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(`cache_${cacheKey}`, JSON.stringify({
        data,
        expiresAt,
        timestamp: Date.now()
      }));
    } catch {
      // Storage quota exceeded, ignore
    }
  }

  /**
   * Get cached data or execute request with deduplication (ENHANCED FOR EGRESS REDUCTION)
   */
  async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    options: {
      cacheDuration?: number;
      forceRefresh?: boolean;
      requestId?: string;
    } = {}
  ): Promise<T> {
    // Use extended cache duration for static data (EGRESS REDUCTION)
    const isStatic = this.isStaticData(cacheKey);
    const effectiveCacheDuration = isStatic ? this.STATIC_DATA_CACHE_DURATION : options.cacheDuration || this.DEFAULT_CACHE_DURATION;
    
    const {
      forceRefresh = false,
      requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } = options;

    // EGRESS REDUCTION: Check localStorage first for static data
    if (!forceRefresh && isStatic && this.EGRESS_REDUCTION_MODE) {
      const localStorageData = this.getFromLocalStorage<T>(cacheKey);
      if (localStorageData !== null) {
        console.log(`🔥 EGRESS REDUCTION: LocalStorage HIT for key: ${cacheKey}`);
        return localStorageData;
      }
    }

    // Check memory cache (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getCachedData<T>(cacheKey);
      if (cached !== null) {
        console.log(`📦 Memory Cache HIT for key: ${cacheKey}`);
        return cached;
      }
    }

    // Use global request deduplication
    return globalRequestDeduplicator.execute(cacheKey, async () => {
      // Check memory cache again (in case it was populated during deduplication wait)
      if (!forceRefresh) {
        const cached = this.getCachedData<T>(cacheKey);
        if (cached !== null) {
          console.log(`📷 Cache hit during deduplication: ${cacheKey}`);
          return cached;
        }
      }

      // Execute request with circuit breaker protection
      console.log(`🚀 New request initiated for key: ${cacheKey}`);
      
      try {
        const data = await databaseCircuitBreaker.execute(() => fetchFn());
        
        // Cache the result
        this.setCachedData(cacheKey, data, effectiveCacheDuration, requestId);
        console.log(`✅ Request completed and cached: ${cacheKey}`);
        
        return data;
      } catch (error) {
        console.error(`❌ Request failed for key: ${cacheKey}`, error);
        throw error;
      }
    });
  }

  /**
   * Get cached data if valid
   */
  getCachedData<T>(cacheKey: string): T | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data with expiration (ENHANCED FOR EGRESS REDUCTION)
   */
  setCachedData<T>(
    cacheKey: string,
    data: T,
    cacheDuration: number = this.DEFAULT_CACHE_DURATION,
    requestId: string = 'unknown'
  ): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + cacheDuration;
    
    // Store in memory cache
    this.cache.set(cacheKey, {
      data,
      timestamp,
      expiresAt,
      requestId
    });

    // EGRESS REDUCTION: Also store static data in localStorage
    if (this.isStaticData(cacheKey) && this.EGRESS_REDUCTION_MODE) {
      this.saveToLocalStorage(cacheKey, data, expiresAt);
      console.log(`🔥 EGRESS REDUCTION: Saved to LocalStorage: ${cacheKey}`);
    }
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateCache(cacheKey: string): void {
    this.cache.delete(cacheKey);
    console.log(`🗑️ Cache invalidated: ${cacheKey}`);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidateCachePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`🗑️ Cache entries invalidated: ${count} matching pattern`);
    return count;
  }

  /**
   * Clear all cache and pending requests
   */
  clearAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log(`🗑️ All cache and pending requests cleared`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    const validEntries = entries.filter(([, entry]) => now <= entry.expiresAt);
    const expiredEntries = entries.filter(([, entry]) => now > entry.expiresAt);
    
    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries: expiredEntries.length,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: entries.map(([key]) => key),
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Calculate cache hit rate (for monitoring effectiveness)
   */
  private calculateHitRate(): number {
    // This would need to be implemented with hit/miss counters in a production system
    // For now, return a placeholder
    return 0;
  }

  /**
   * Debug utility: Log current cache state
   */
  debugCacheState(): void {
    const stats = this.getCacheStats();
    console.group('📊 Data Consistency Manager - Cache State');
    console.log('Valid entries:', stats.validEntries);
    console.log('Expired entries:', stats.expiredEntries);
    console.log('Pending requests:', stats.pendingRequests);
    console.log('Cache keys:', stats.cacheKeys);
    console.groupEnd();
  }

  /**
   * Clean up expired cache entries and timed-out requests
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean expired cache entries
    let expiredCount = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    // Clean timed-out pending requests
    let timeoutCount = 0;
    for (const [key, request] of this.pendingRequests.entries()) {
      if (this.isRequestExpired(request)) {
        this.pendingRequests.delete(key);
        timeoutCount++;
      }
    }

    if (expiredCount > 0 || timeoutCount > 0) {
      console.log(`🧹 Cleanup: ${expiredCount} expired cache entries, ${timeoutCount} timed-out requests`);
    }
  }

  /**
   * Validate data consistency between different sources
   */
  validateDataConsistency<T>(
    data: T[],
    validators: Array<(item: T) => boolean>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      for (let j = 0; j < validators.length; j++) {
        const validator = validators[j];
        try {
          if (!validator(item)) {
            errors.push(`Validation failed for item ${i} with validator ${j}`);
          }
        } catch (error) {
          errors.push(`Validation error for item ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if pending request has expired
   */
  private isRequestExpired(request: PendingRequest<any>): boolean {
    return Date.now() - request.timestamp > this.REQUEST_TIMEOUT;
  }
}

// Singleton instance
export const dataConsistencyManager = new DataConsistencyManager();

// Cleanup interval - run every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    dataConsistencyManager.cleanup();
  }, 5 * 60 * 1000);
}

// Cache key generators for consistent naming
export const CacheKeys = {
  COO_DASHBOARD_DATA: 'coo_dashboard_data',
  OPERATIONAL_TEAMS: 'operational_teams',
  TEAM_MEMBERS: (teamId?: number) => teamId ? `team_members_${teamId}` : 'all_team_members',
  SCHEDULE_ENTRIES: (startDate: string, endDate: string, teamId?: number) => 
    `schedule_entries_${startDate}_${endDate}${teamId ? `_team_${teamId}` : ''}`,
  COMPANY_HOURS_STATUS: (sprintId: number) => `company_hours_status_${sprintId}`,
  TEAM_SPRINT_STATUS: (teamId: number, sprintOffset: number) => `team_sprint_status_${teamId}_${sprintOffset}`,
  DAILY_COMPANY_STATUS: (date: string) => `daily_company_status_${date}`
};

export default dataConsistencyManager;