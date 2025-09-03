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
  version: number;
  dependencies: string[];
}

interface PendingRequest<T> {
  promise: Promise<T>;
  requestId: string;
  timestamp: number;
}

interface InvalidationQueueItem {
  cacheKey: string;
  entityType: 'schedule' | 'team' | 'sprint' | 'member';
  entityId?: string;
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
}

interface CacheUpdateOperation {
  type: 'update' | 'invalidate' | 'version_bump';
  cacheKey: string;
  newData?: any;
  version?: number;
  timestamp: number;
}

class DataConsistencyManager {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private requestDeduplicationMap = new Map<string, Promise<any>>(); // Enhanced deduplication
  private requestTimestamps = new Map<string, number>(); // Track request timing
  private invalidationQueue: InvalidationQueueItem[] = [];
  private processingInvalidation = false;
  private invalidationTimeout: NodeJS.Timeout | null = null;
  private cacheVersions = new Map<string, number>();
  private dependencyGraph = new Map<string, Set<string>>();
  private updateOperationQueue: CacheUpdateOperation[] = [];
  private processingUpdates = false;
  private readonly DEFAULT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (EMERGENCY EGRESS REDUCTION)
  private readonly STATIC_DATA_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours for teams/members (AGGRESSIVE CACHING)
  private readonly DYNAMIC_DATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for frequently changing data
  private readonly REQUEST_TIMEOUT = 5 * 1000; // 5 seconds (FAST FAIL FOR PERFORMANCE)
  private readonly EGRESS_REDUCTION_MODE = true; // Enable aggressive caching
  private readonly DEDUPLICATION_WINDOW = 100; // 100ms window for deduplication
  private readonly INVALIDATION_BATCH_DELAY = 50; // 50ms delay for batching invalidations
  private readonly MAX_INVALIDATION_BATCH_SIZE = 10;
  private readonly UPDATE_OPERATION_DELAY = 25; // 25ms delay for update batching

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
   * Check if this is dynamic data that changes frequently
   */
  private isDynamicData(cacheKey: string): boolean {
    return cacheKey.includes('schedule_entries') ||
           cacheKey.includes('availability') ||
           cacheKey.includes('team_dashboard') ||
           cacheKey.includes('daily_status');
  }

  /**
   * Get optimal cache duration based on data type
   */
  private getOptimalCacheDuration(cacheKey: string, providedDuration?: number): number {
    if (providedDuration) return providedDuration;
    
    if (this.isStaticData(cacheKey)) {
      return this.STATIC_DATA_CACHE_DURATION;
    } else if (this.isDynamicData(cacheKey)) {
      return this.DYNAMIC_DATA_CACHE_DURATION;
    } else {
      return this.DEFAULT_CACHE_DURATION;
    }
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
    // Use optimal cache duration based on data type (INTELLIGENT CACHING)
    const effectiveCacheDuration = this.getOptimalCacheDuration(cacheKey, options.cacheDuration);
    
    const {
      forceRefresh = false,
      requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } = options;

    // ENHANCED DEDUPLICATION: Check for identical requests within time window
    const now = Date.now();
    const lastRequestTime = this.requestTimestamps.get(cacheKey) || 0;
    
    if (!forceRefresh && (now - lastRequestTime) < this.DEDUPLICATION_WINDOW) {
      // If there's a pending request for the same key, wait for it
      if (this.requestDeduplicationMap.has(cacheKey)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Deduplicating request for: ${cacheKey}`);
        }
        return this.requestDeduplicationMap.get(cacheKey)!;
      }
    }
    
    this.requestTimestamps.set(cacheKey, now);

    // EGRESS REDUCTION: Check localStorage first for static data
    const isStaticDataType = this.isStaticData(cacheKey);
    if (!forceRefresh && isStaticDataType && this.EGRESS_REDUCTION_MODE) {
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

    // Create and store the request promise for deduplication
    const requestPromise = this.executeRequest(cacheKey, fetchFn, effectiveCacheDuration, requestId, forceRefresh);
    this.requestDeduplicationMap.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up deduplication map after request completes
      this.requestDeduplicationMap.delete(cacheKey);
    }
  }

  private async executeRequest<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    cacheDuration: number,
    requestId: string,
    forceRefresh: boolean
  ): Promise<T> {
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 New request initiated for key: ${cacheKey}`);
      }
      
      try {
        const data = await databaseCircuitBreaker.execute(() => fetchFn());
        
        // Cache the result
        this.setCachedData(cacheKey, data, cacheDuration, requestId);
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Request completed and cached: ${cacheKey}`);
        }
        
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
   * Set cached data with expiration and versioning (ENHANCED FOR PERFORMANCE)
   */
  setCachedData<T>(
    cacheKey: string,
    data: T,
    cacheDuration: number = this.DEFAULT_CACHE_DURATION,
    requestId: string = 'unknown',
    dependencies: string[] = []
  ): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + cacheDuration;
    const version = this.incrementCacheVersion(cacheKey);
    
    // Store in memory cache with versioning
    this.cache.set(cacheKey, {
      data,
      timestamp,
      expiresAt,
      requestId,
      version,
      dependencies
    });

    // Update dependency graph
    this.updateDependencyGraph(cacheKey, dependencies);

    // EGRESS REDUCTION: Also store static data in localStorage
    if (this.isStaticData(cacheKey) && this.EGRESS_REDUCTION_MODE) {
      this.saveToLocalStorage(cacheKey, data, expiresAt);
      console.log(`🔥 EGRESS REDUCTION: Saved to LocalStorage: ${cacheKey} (v${version})`);
    }
  }

  /**
   * DEPRECATED: Use queueCacheUpdate instead for performance
   * Legacy method maintained for compatibility
   */
  invalidateCache(cacheKey: string): void {
    // Queue the invalidation instead of executing immediately
    this.queueCacheUpdate({
      type: 'invalidate',
      cacheKey,
      timestamp: Date.now()
    });
  }

  /**
   * DEPRECATED: Use queueBulkCacheUpdate instead for performance
   * Legacy method maintained for compatibility but now non-blocking
   */
  invalidateCachePattern(pattern: RegExp): number {
    const matchingKeys: string[] = [];
    const cacheKeys = Array.from(this.cache.keys());
    for (const key of cacheKeys) {
      if (pattern.test(key)) {
        matchingKeys.push(key);
      }
    }
    
    // Queue all invalidations instead of executing immediately
    matchingKeys.forEach(key => {
      this.queueCacheUpdate({
        type: 'invalidate',
        cacheKey: key,
        timestamp: Date.now()
      });
    });
    
    console.log(`🗑️ Queued cache invalidation: ${matchingKeys.length} entries`);
    return matchingKeys.length;
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
    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    // Clean timed-out pending requests
    let timeoutCount = 0;
    const pendingEntries = Array.from(this.pendingRequests.entries());
    for (const [key, request] of pendingEntries) {
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

  // ===============================================
  // PERFORMANCE OPTIMIZED CACHE METHODS
  // ===============================================

  /**
   * Increment cache version for a specific key
   */
  private incrementCacheVersion(cacheKey: string): number {
    const currentVersion = this.cacheVersions.get(cacheKey) || 0;
    const newVersion = currentVersion + 1;
    this.cacheVersions.set(cacheKey, newVersion);
    return newVersion;
  }

  /**
   * Update dependency graph for cache invalidation optimization
   */
  private updateDependencyGraph(cacheKey: string, dependencies: string[]): void {
    if (!this.dependencyGraph.has(cacheKey)) {
      this.dependencyGraph.set(cacheKey, new Set());
    }
    
    const deps = this.dependencyGraph.get(cacheKey)!;
    dependencies.forEach(dep => deps.add(dep));
  }

  /**
   * Get cache dependencies for a specific key
   */
  private getCacheDependencies(cacheKey: string): string[] {
    const deps = this.dependencyGraph.get(cacheKey);
    return deps ? Array.from(deps) : [];
  }

  /**
   * Queue a cache update operation (non-blocking)
   */
  queueCacheUpdate(operation: CacheUpdateOperation): void {
    this.updateOperationQueue.push(operation);
    this.scheduleUpdateProcessing();
  }

  /**
   * Schedule processing of queued update operations
   */
  private scheduleUpdateProcessing(): void {
    if (this.processingUpdates) return;
    
    // Use setTimeout to make it async and non-blocking
    setTimeout(() => {
      this.processUpdateQueue();
    }, this.UPDATE_OPERATION_DELAY);
  }

  /**
   * Process queued update operations in batches
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.processingUpdates || this.updateOperationQueue.length === 0) {
      return;
    }
    
    this.processingUpdates = true;
    
    try {
      // Process operations in batches to prevent blocking
      const batchSize = Math.min(this.MAX_INVALIDATION_BATCH_SIZE, this.updateOperationQueue.length);
      const batch = this.updateOperationQueue.splice(0, batchSize);
      
      // Group operations by type for efficiency
      const operations = this.groupOperationsByType(batch);
      
      // Process updates first (less expensive)
      if (operations.updates.length > 0) {
        await this.processUpdateOperations(operations.updates);
      }
      
      // Process invalidations (more expensive)
      if (operations.invalidations.length > 0) {
        await this.processInvalidationOperations(operations.invalidations);
      }
      
      // Process version bumps
      if (operations.versionBumps.length > 0) {
        await this.processVersionBumpOperations(operations.versionBumps);
      }
      
      // If there are more operations, schedule another batch
      if (this.updateOperationQueue.length > 0) {
        setTimeout(() => this.processUpdateQueue(), this.UPDATE_OPERATION_DELAY);
      }
      
    } finally {
      this.processingUpdates = false;
    }
  }

  /**
   * Group operations by type for efficient processing
   */
  private groupOperationsByType(operations: CacheUpdateOperation[]) {
    const updates: CacheUpdateOperation[] = [];
    const invalidations: CacheUpdateOperation[] = [];
    const versionBumps: CacheUpdateOperation[] = [];
    
    operations.forEach(op => {
      switch (op.type) {
        case 'update':
          updates.push(op);
          break;
        case 'invalidate':
          invalidations.push(op);
          break;
        case 'version_bump':
          versionBumps.push(op);
          break;
      }
    });
    
    return { updates, invalidations, versionBumps };
  }

  /**
   * Process cache update operations (surgical updates)
   */
  private async processUpdateOperations(operations: CacheUpdateOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        const existing = this.cache.get(operation.cacheKey);
        if (existing && operation.newData !== undefined) {
          // Surgical update - update data without changing expiration
          existing.data = operation.newData;
          existing.timestamp = operation.timestamp;
          existing.version = operation.version || existing.version;
          
          console.log(`🔧 Surgical cache update: ${operation.cacheKey}`);
        }
      } catch (error) {
        console.warn(`Failed to update cache entry ${operation.cacheKey}:`, error);
      }
    }
  }

  /**
   * Process cache invalidation operations (now async)
   */
  private async processInvalidationOperations(operations: CacheUpdateOperation[]): Promise<void> {
    const keysToInvalidate = new Set<string>();
    
    // Collect all keys that need invalidation (including dependencies)
    for (const operation of operations) {
      keysToInvalidate.add(operation.cacheKey);
      
      // Add dependent cache keys
      const dependencies = this.getCacheDependencies(operation.cacheKey);
      dependencies.forEach(dep => keysToInvalidate.add(dep));
    }
    
    // Perform invalidations
    let invalidatedCount = 0;
    const keysArray = Array.from(keysToInvalidate);
    for (const key of keysArray) {
      if (this.cache.delete(key)) {
        invalidatedCount++;
      }
      // Clean up localStorage if applicable
      if (this.isStaticData(key) && typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`cache_${key}`);
        } catch { /* ignore storage errors */ }
      }
    }
    
    console.log(`🗑️ Async cache invalidation: ${invalidatedCount} entries`);
  }

  /**
   * Process version bump operations
   */
  private async processVersionBumpOperations(operations: CacheUpdateOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        const existing = this.cache.get(operation.cacheKey);
        if (existing && operation.version) {
          existing.version = operation.version;
          this.cacheVersions.set(operation.cacheKey, operation.version);
          console.log(`🔢 Version bump: ${operation.cacheKey} -> v${operation.version}`);
        }
      } catch (error) {
        console.warn(`Failed to bump version for ${operation.cacheKey}:`, error);
      }
    }
  }

  /**
   * Smart cache update - prefer updates over invalidation when possible
   */
  updateCacheEntry<T>(
    cacheKey: string, 
    newData: T, 
    dependencies?: string[]
  ): void {
    const existing = this.cache.get(cacheKey);
    
    if (existing && Date.now() < existing.expiresAt) {
      // Cache entry is still valid - perform surgical update
      this.queueCacheUpdate({
        type: 'update',
        cacheKey,
        newData,
        timestamp: Date.now()
      });
      
      // Update dependencies if provided
      if (dependencies) {
        this.updateDependencyGraph(cacheKey, dependencies);
      }
    } else {
      // Cache entry is expired or doesn't exist - set new data
      const duration = existing ? existing.expiresAt - existing.timestamp : this.getOptimalCacheDuration(cacheKey);
      this.setCachedData(cacheKey, newData, duration, 'surgical_update', dependencies || []);
    }
  }

  /**
   * Surgical invalidation - only invalidate specific entries, not patterns
   */
  surgicalInvalidate(
    cacheKeys: string[], 
    options: {
      includeDependent?: boolean;
      priority?: 'low' | 'medium' | 'high';
    } = {}
  ): void {
    const { includeDependent = false, priority = 'medium' } = options;
    const keysToInvalidate = new Set(cacheKeys);
    
    if (includeDependent) {
      // Add dependent cache keys
      cacheKeys.forEach(key => {
        const dependencies = this.getCacheDependencies(key);
        dependencies.forEach(dep => keysToInvalidate.add(dep));
      });
    }
    
    // Queue invalidations with priority
    keysToInvalidate.forEach(key => {
      this.queueCacheUpdate({
        type: 'invalidate',
        cacheKey: key,
        timestamp: Date.now()
      });
    });
    
    console.log(`🎯 Surgical invalidation queued: ${keysToInvalidate.size} entries (${priority} priority)`);
  }

  /**
   * Get cache version for a specific key
   */
  getCacheVersion(cacheKey: string): number {
    return this.cacheVersions.get(cacheKey) || 0;
  }

  /**
   * Check if cached data is fresh enough based on version
   */
  isCacheVersionValid(cacheKey: string, requiredVersion: number): boolean {
    const entry = this.cache.get(cacheKey);
    return entry ? entry.version >= requiredVersion : false;
  }

  /**
   * Get performance-optimized cache statistics
   */
  getOptimizedCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    const validEntries = entries.filter(([, entry]) => now <= entry.expiresAt);
    const expiredEntries = entries.filter(([, entry]) => now > entry.expiresAt);
    const versionsCount = this.cacheVersions.size;
    const dependenciesCount = this.dependencyGraph.size;
    
    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries: expiredEntries.length,
      pendingRequests: this.pendingRequests.size,
      queuedOperations: this.updateOperationQueue.length,
      versionsTracked: versionsCount,
      dependencyGraphSize: dependenciesCount,
      processingUpdates: this.processingUpdates,
      hitRate: this.calculateHitRate()
    };
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

// Cache key generators with dependency mapping for optimized invalidation
export const CacheKeys = {
  COO_DASHBOARD_DATA: 'coo_dashboard_data',
  OPERATIONAL_TEAMS: 'operational_teams',
  TEAM_MEMBERS: (teamId?: number) => teamId ? `team_members_${teamId}` : 'all_team_members',
  SCHEDULE_ENTRIES: (startDate: string, endDate: string, teamId?: number) => 
    `schedule_entries_${startDate}_${endDate}${teamId ? `_team_${teamId}` : ''}`,
  COMPANY_HOURS_STATUS: (sprintId: number) => `company_hours_status_${sprintId}`,
  TEAM_SPRINT_STATUS: (teamId: number, sprintOffset: number) => `team_sprint_status_${teamId}_${sprintOffset}`,
  DAILY_COMPANY_STATUS: (date: string) => `daily_company_status_${date}`,
  SPRINT_FOR_DATE: (date: string) => `sprint_for_date_${date}`,
  CURRENT_GLOBAL_SPRINT: 'current_global_sprint',
  // Individual schedule entry keys for surgical updates
  SCHEDULE_ENTRY: (memberId: number, date: string) => `schedule_entry_${memberId}_${date}`,
  MEMBER_SCHEDULE: (memberId: number) => `member_schedule_${memberId}`,
  TEAM_DASHBOARD_DATA: (teamId: number) => `team_dashboard_${teamId}`,
  CAPACITY_DATA: (teamId: number, date: string) => `capacity_${teamId}_${date}`
};

// Cache dependency mappings for smart invalidation
export const CacheDependencies = {
  // When a schedule entry changes, these dependent caches may need updates
  SCHEDULE_ENTRY_DEPS: (memberId: number, date: string, teamId?: number) => [
    CacheKeys.MEMBER_SCHEDULE(memberId),
    ...(teamId ? [CacheKeys.TEAM_DASHBOARD_DATA(teamId), CacheKeys.CAPACITY_DATA(teamId, date)] : [])
  ],
  
  // When team data changes
  TEAM_DEPS: (teamId: number) => [
    CacheKeys.TEAM_MEMBERS(teamId),
    CacheKeys.TEAM_DASHBOARD_DATA(teamId),
    CacheKeys.OPERATIONAL_TEAMS
  ],
  
  // When sprint data changes
  SPRINT_DEPS: (sprintId: number) => [
    CacheKeys.COMPANY_HOURS_STATUS(sprintId),
    CacheKeys.CURRENT_GLOBAL_SPRINT
  ]
};

export default dataConsistencyManager;

// Performance monitoring - track cache performance metrics
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Log cache performance every 30 seconds in development
  setInterval(() => {
    const stats = dataConsistencyManager.getOptimizedCacheStats();
    if (stats.totalEntries > 0) {
      console.group('📈 Cache Performance Stats');
      console.log('Valid entries:', stats.validEntries);
      console.log('Queued operations:', stats.queuedOperations);
      console.log('Processing updates:', stats.processingUpdates);
      console.log('Dependency graph size:', stats.dependencyGraphSize);
      console.groupEnd();
    }
  }, 30000);
}