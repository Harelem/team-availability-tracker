/**
 * Enhanced Cache Manager - V2.2 Enhancement
 * 
 * Provides intelligent caching with real-time invalidation, consistency validation,
 * and automatic synchronization across different views.
 */

import { supabase } from '@/lib/supabase';
import { debug, operation, error as logError } from './debugLogger';

// ================================================
// TYPES AND INTERFACES
// ================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: number;
  dependencies: string[];
  accessCount: number;
  lastAccessed: number;
}

interface CacheInvalidationEvent {
  id: number;
  table_name: string;
  operation_type: string;
  affected_id: number;
  created_at: string;
}

interface CacheConsistencyReport {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  inconsistentEntries: number;
  recommendedActions: string[];
  lastValidation: string;
}

interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
}

// ================================================
// ENHANCED CACHE MANAGER CLASS
// ================================================

class EnhancedCacheManager {
  private static instance: EnhancedCacheManager;
  private cache = new Map<string, CacheEntry<any>>();
  private invalidationSubscription: any = null;
  private performanceMetrics: CachePerformanceMetrics;
  private lastInvalidationCheck = 0;
  
  // Cache duration configurations
  private readonly CACHE_DURATIONS = {
    STATIC_DATA: 2 * 60 * 60 * 1000,      // 2 hours - teams, members
    SPRINT_DATA: 30 * 60 * 1000,          // 30 minutes - sprint settings
    CALCULATION_DATA: 2 * 60 * 1000,      // 2 minutes - calculated metrics
    DYNAMIC_DATA: 5 * 60 * 1000,          // 5 minutes - schedule entries
    VALIDATION_DATA: 5 * 60 * 1000,       // 5 minutes - consistency checks
    REAL_TIME_DATA: 30 * 1000             // 30 seconds - live status
  };

  // Cache dependency mappings
  private readonly CACHE_DEPENDENCIES = {
    'teams': ['team_members', 'schedule_entries'],
    'global_sprint_settings': ['current_enhanced_sprint', 'current_global_sprint', 'sprint_calculations'],
    'schedule_entries': ['team_hours', 'sprint_capacity', 'coo_dashboard', 'team_dashboard'],
    'team_members': ['team_calculations', 'company_totals']
  };

  private constructor() {
    this.performanceMetrics = {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0
    };
    
    this.initializeInvalidationListener();
    this.startPerformanceMonitoring();
  }

  static getInstance(): EnhancedCacheManager {
    if (!EnhancedCacheManager.instance) {
      EnhancedCacheManager.instance = new EnhancedCacheManager();
    }
    return EnhancedCacheManager.instance;
  }

  // ================================================
  // INTELLIGENT CACHE DURATION MANAGEMENT
  // ================================================

  /**
   * Get optimal cache duration based on data type and change frequency
   */
  getCacheDuration(dataType: string, changeFrequency?: number): number {
    // If change frequency is provided, use it to adjust duration
    if (changeFrequency && changeFrequency > 0) {
      // More frequent changes = shorter cache duration
      const baseDuration = this.CACHE_DURATIONS.DYNAMIC_DATA;
      const adjustment = Math.max(0.1, 1 / changeFrequency);
      return Math.floor(baseDuration * adjustment);
    }

    // Determine duration based on data type patterns
    if (this.isStaticData(dataType)) {
      return this.CACHE_DURATIONS.STATIC_DATA;
    } else if (this.isSprintData(dataType)) {
      return this.CACHE_DURATIONS.SPRINT_DATA;
    } else if (this.isCalculationData(dataType)) {
      return this.CACHE_DURATIONS.CALCULATION_DATA;
    } else if (this.isDynamicData(dataType)) {
      return this.CACHE_DURATIONS.DYNAMIC_DATA;
    } else if (this.isValidationData(dataType)) {
      return this.CACHE_DURATIONS.VALIDATION_DATA;
    } else if (this.isRealTimeData(dataType)) {
      return this.CACHE_DURATIONS.REAL_TIME_DATA;
    }

    return this.CACHE_DURATIONS.DYNAMIC_DATA; // Default
  }

  private isStaticData(cacheKey: string): boolean {
    return cacheKey.includes('teams') || 
           cacheKey.includes('team_members') ||
           cacheKey.includes('operational_teams');
  }

  private isSprintData(cacheKey: string): boolean {
    return cacheKey.includes('sprint') || 
           cacheKey.includes('global_sprint');
  }

  private isCalculationData(cacheKey: string): boolean {
    return cacheKey.includes('calculation') ||
           cacheKey.includes('capacity') ||
           cacheKey.includes('hours') ||
           cacheKey.includes('utilization');
  }

  private isDynamicData(cacheKey: string): boolean {
    return cacheKey.includes('schedule_entries') ||
           cacheKey.includes('availability') ||
           cacheKey.includes('daily_status');
  }

  private isValidationData(cacheKey: string): boolean {
    return cacheKey.includes('validation') ||
           cacheKey.includes('consistency') ||
           cacheKey.includes('integrity');
  }

  private isRealTimeData(cacheKey: string): boolean {
    return cacheKey.includes('real_time') ||
           cacheKey.includes('live') ||
           cacheKey.includes('current_status');
  }

  // ================================================
  // ADVANCED CACHE OPERATIONS
  // ================================================

  /**
   * Get cached data with performance tracking
   */
  async getCachedData<T>(
    cacheKey: string,
    dataFetcher: () => Promise<T>,
    customDuration?: number,
    dependencies: string[] = []
  ): Promise<T> {
    const startTime = performance.now();
    this.performanceMetrics.totalRequests++;

    try {
      // Check cache first
      const cached = this.getFromCache<T>(cacheKey);
      if (cached !== null) {
        this.recordCacheHit(performance.now() - startTime);
        return cached;
      }

      // Cache miss - fetch fresh data
      debug(`Cache miss for key: ${cacheKey}`);
      const data = await dataFetcher();
      
      const duration = customDuration || this.getCacheDuration(cacheKey);
      this.setCache(cacheKey, data, duration, dependencies);
      
      this.recordCacheMiss(performance.now() - startTime);
      return data;
    } catch (error) {
      this.recordCacheMiss(performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Set cache with enhanced metadata
   */
  setCache<T>(
    cacheKey: string,
    data: T,
    duration: number,
    dependencies: string[] = []
  ): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + duration,
      version: this.getCacheVersion(cacheKey),
      dependencies,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(cacheKey, entry);
    this.saveToLocalStorage(cacheKey, entry);
    
    debug(`Cache set for key: ${cacheKey}, expires in ${duration}ms`);
  }

  /**
   * Get from cache with access tracking
   */
  private getFromCache<T>(cacheKey: string): T | null {
    // Try memory cache first
    const memoryEntry = this.cache.get(cacheKey);
    if (memoryEntry && this.isValidEntry(memoryEntry)) {
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = Date.now();
      return memoryEntry.data;
    }

    // Try localStorage cache
    const localEntry = this.getFromLocalStorage<T>(cacheKey);
    if (localEntry) {
      // Promote to memory cache
      this.cache.set(cacheKey, {
        data: localEntry.data,
        timestamp: localEntry.timestamp,
        expiresAt: localEntry.expiresAt,
        version: localEntry.version || 1,
        dependencies: localEntry.dependencies || [],
        accessCount: 1,
        lastAccessed: Date.now()
      });
      return localEntry.data;
    }

    return null;
  }

  private isValidEntry(entry: CacheEntry<any>): boolean {
    return Date.now() < entry.expiresAt;
  }

  private getCacheVersion(cacheKey: string): number {
    const existing = this.cache.get(cacheKey);
    return existing ? existing.version + 1 : 1;
  }

  // ================================================
  // REAL-TIME CACHE INVALIDATION
  // ================================================

  /**
   * Initialize real-time cache invalidation listener
   */
  private initializeInvalidationListener(): void {
    debug('Initializing real-time cache invalidation listener');

    this.invalidationSubscription = supabase
      .channel('cache_invalidation')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'cache_invalidation_events' 
        },
        (payload) => {
          this.handleInvalidationEvent(payload.new as CacheInvalidationEvent);
        }
      )
      .subscribe();

    // Periodic check for missed events
    setInterval(() => {
      this.checkMissedInvalidationEvents();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle real-time invalidation events
   */
  private handleInvalidationEvent(event: CacheInvalidationEvent): void {
    debug(`Processing cache invalidation event:`, event);

    const tableName = event.table_name;
    const operationType = event.operation_type;
    const affectedId = event.affected_id;

    // Invalidate related caches based on table
    this.invalidateRelatedCaches(tableName, affectedId);

    // Trigger cross-view synchronization
    this.syncCacheAcrossViews(tableName, operationType);
  }

  /**
   * Check for missed invalidation events
   */
  private async checkMissedInvalidationEvents(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('cache_invalidation_events')
        .select('*')
        .gt('created_at', new Date(this.lastInvalidationCheck).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        debug(`Processing ${data.length} missed invalidation events`);
        
        data.forEach(event => {
          this.handleInvalidationEvent(event);
        });

        this.lastInvalidationCheck = Date.now();
      }
    } catch (error) {
      logError('Failed to check missed invalidation events:', error);
    }
  }

  /**
   * Invalidate caches related to a specific table change
   */
  invalidateRelatedCaches(tableName: string, affectedId?: number): void {
    debug(`Invalidating caches related to table: ${tableName}, ID: ${affectedId}`);

    // Get dependencies for this table
    const dependencies = this.CACHE_DEPENDENCIES[tableName] || [];
    
    // Invalidate direct table caches
    this.clearCacheByPattern(tableName);
    
    // Invalidate dependent caches
    dependencies.forEach(dependency => {
      this.clearCacheByPattern(dependency);
    });

    // Invalidate ID-specific caches if applicable
    if (affectedId) {
      this.clearCacheByPattern(`${tableName}_${affectedId}`);
      
      // For team-related changes, invalidate team-specific caches
      if (tableName === 'team_members' || tableName === 'schedule_entries') {
        this.clearCacheByPattern(`team_`);
      }
    }

    // Always invalidate aggregated calculations
    this.clearCacheByPattern('company_totals');
    this.clearCacheByPattern('coo_dashboard');
  }

  /**
   * Synchronize cache across different views
   */
  async syncCacheAcrossViews(tableName: string, operationType: string): Promise<void> {
    debug(`Syncing cache across views for ${tableName} ${operationType}`);

    try {
      // Notify other components that data has changed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cacheInvalidation', {
          detail: { tableName, operationType, timestamp: Date.now() }
        }));
      }

      // For critical changes, pre-warm important caches
      if (tableName === 'global_sprint_settings' || tableName === 'schedule_entries') {
        await this.preWarmCriticalCaches();
      }
    } catch (error) {
      logError('Failed to sync cache across views:', error);
    }
  }

  /**
   * Pre-warm critical caches after invalidation
   */
  private async preWarmCriticalCaches(): Promise<void> {
    debug('Pre-warming critical caches');

    try {
      // Import services dynamically to avoid circular dependencies
      const { unifiedCalculationService } = await import('@/lib/unifiedCalculationService');
      
      // Pre-warm most critical data
      const promises = [
        unifiedCalculationService.getUnifiedSprintData(),
        unifiedCalculationService.getCOODashboardOptimized()
      ];

      await Promise.allSettled(promises);
      debug('Critical caches pre-warmed successfully');
    } catch (error) {
      logError('Failed to pre-warm critical caches:', error);
    }
  }

  // ================================================
  // CACHE CONSISTENCY VALIDATION
  // ================================================

  /**
   * Validate cache consistency
   */
  async validateCacheConsistency(): Promise<CacheConsistencyReport> {
    debug('Validating cache consistency');

    const totalEntries = this.cache.size;
    let validEntries = 0;
    let expiredEntries = 0;
    let inconsistentEntries = 0;
    const recommendedActions: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isValidEntry(entry)) {
        validEntries++;
      } else {
        expiredEntries++;
        recommendedActions.push(`Remove expired cache entry: ${key}`);
      }

      // Check for potential inconsistencies
      if (entry.dependencies.length > 0) {
        const hasInvalidDependencies = entry.dependencies.some(dep => {
          const depEntry = this.cache.get(dep);
          return !depEntry || !this.isValidEntry(depEntry);
        });

        if (hasInvalidDependencies) {
          inconsistentEntries++;
          recommendedActions.push(`Refresh cache with invalid dependencies: ${key}`);
        }
      }
    }

    // Clean up expired entries
    if (expiredEntries > 0) {
      this.cleanupExpiredEntries();
    }

    const report: CacheConsistencyReport = {
      totalEntries,
      validEntries,
      expiredEntries,
      inconsistentEntries,
      recommendedActions,
      lastValidation: new Date().toISOString()
    };

    debug('Cache consistency validation completed:', report);
    return report;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromLocalStorage(key);
        cleanedCount++;
      }
    }

    debug(`Cleaned up ${cleanedCount} expired cache entries`);
  }

  // ================================================
  // CACHE OPERATIONS
  // ================================================

  /**
   * Clear cache by pattern
   */
  clearCacheByPattern(pattern: string): void {
    let clearedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.removeFromLocalStorage(key);
        clearedCount++;
      }
    }

    debug(`Cleared ${clearedCount} cache entries matching pattern: ${pattern}`);
  }

  /**
   * Clear specific cache entry
   */
  clearCache(cacheKey: string): void {
    this.cache.delete(cacheKey);
    this.removeFromLocalStorage(cacheKey);
    debug(`Cleared cache entry: ${cacheKey}`);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.clearAllLocalStorage();
    debug(`Cleared all cache (${size} entries)`);
  }

  // ================================================
  // LOCAL STORAGE OPERATIONS
  // ================================================

  private getFromLocalStorage<T>(cacheKey: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(`enhanced_cache_${cacheKey}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(`enhanced_cache_${cacheKey}`);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private saveToLocalStorage<T>(cacheKey: string, entry: CacheEntry<T>): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(`enhanced_cache_${cacheKey}`, JSON.stringify(entry));
    } catch {
      // Handle localStorage quota exceeded
      this.cleanupLocalStorage();
    }
  }

  private removeFromLocalStorage(cacheKey: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`enhanced_cache_${cacheKey}`);
  }

  private clearAllLocalStorage(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('enhanced_cache_')) {
        localStorage.removeItem(key);
      }
    });
  }

  private cleanupLocalStorage(): void {
    if (typeof window === 'undefined') return;

    // Remove oldest entries first
    const entries: Array<{ key: string; timestamp: number }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('enhanced_cache_')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}');
          entries.push({ key, timestamp: entry.timestamp || 0 });
        } catch {
          localStorage.removeItem(key);
        }
      }
    }

    // Sort by timestamp and remove oldest 25%
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.ceil(entries.length * 0.25);
    
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }
  }

  // ================================================
  // PERFORMANCE MONITORING
  // ================================================

  private recordCacheHit(responseTime: number): void {
    this.performanceMetrics.hitRate = 
      ((this.performanceMetrics.hitRate * (this.performanceMetrics.totalRequests - 1)) + 1) / 
      this.performanceMetrics.totalRequests;
    this.updateAverageResponseTime(responseTime);
  }

  private recordCacheMiss(responseTime: number): void {
    this.performanceMetrics.missRate = 
      ((this.performanceMetrics.missRate * (this.performanceMetrics.totalRequests - 1)) + 1) / 
      this.performanceMetrics.totalRequests;
    this.updateAverageResponseTime(responseTime);
  }

  private updateAverageResponseTime(responseTime: number): void {
    this.performanceMetrics.averageResponseTime = 
      ((this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1)) + responseTime) / 
      this.performanceMetrics.totalRequests;
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 60000); // Update every minute
  }

  private updatePerformanceMetrics(): void {
    this.performanceMetrics.cacheSize = this.cache.size;
    this.performanceMetrics.memoryUsage = this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry).length * 2; // Rough estimation
    }
    return size;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): CachePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // ================================================
  // CLEANUP
  // ================================================

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.invalidationSubscription) {
      this.invalidationSubscription.unsubscribe();
    }
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export const enhancedCacheManager = EnhancedCacheManager.getInstance();
export default enhancedCacheManager;