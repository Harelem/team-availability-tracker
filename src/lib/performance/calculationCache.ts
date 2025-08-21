/**
 * Optimized Calculation Cache - V2.2 Performance Enhancement
 * 
 * Specialized caching layer for calculation operations with intelligent
 * invalidation, bulk operations, and performance monitoring.
 */

import { enhancedCacheManager } from '@/utils/enhancedCacheManager';
import { debug, operation, error as logError } from '@/utils/debugLogger';

// ================================================
// TYPES AND INTERFACES
// ================================================

interface CalculationCacheConfig {
  defaultTTL: number;
  bulkOperationTTL: number;
  sprintDataTTL: number;
  teamDataTTL: number;
  enableBulkInvalidation: boolean;
  enablePerformanceTracking: boolean;
}

interface BulkCalculationRequest {
  type: 'team_capacity' | 'company_totals' | 'sprint_data' | 'coo_dashboard';
  params?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface BulkCalculationResult<T> {
  success: boolean;
  data: T | null;
  cacheKey: string;
  executionTime: number;
  cacheHit: boolean;
  error?: string;
}

interface PerformanceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageExecutionTime: number;
  bulkOperations: number;
  invalidations: number;
  errors: number;
}

// ================================================
// CALCULATION CACHE MANAGER
// ================================================

class CalculationCacheManager {
  private static instance: CalculationCacheManager;
  private config: CalculationCacheConfig;
  private performanceMetrics: PerformanceMetrics;
  private bulkRequestQueue: BulkCalculationRequest[] = [];
  private isProcessingBulk = false;

  private constructor() {
    this.config = {
      defaultTTL: 2 * 60 * 1000,        // 2 minutes
      bulkOperationTTL: 5 * 60 * 1000,  // 5 minutes for bulk operations
      sprintDataTTL: 30 * 60 * 1000,    // 30 minutes for sprint data
      teamDataTTL: 1 * 60 * 1000,       // 1 minute for team data
      enableBulkInvalidation: true,
      enablePerformanceTracking: true
    };

    this.performanceMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageExecutionTime: 0,
      bulkOperations: 0,
      invalidations: 0,
      errors: 0
    };

    this.startBulkProcessor();
  }

  static getInstance(): CalculationCacheManager {
    if (!CalculationCacheManager.instance) {
      CalculationCacheManager.instance = new CalculationCacheManager();
    }
    return CalculationCacheManager.instance;
  }

  // ================================================
  // OPTIMIZED CACHE OPERATIONS
  // ================================================

  /**
   * Get or calculate sprint data with optimized caching
   */
  async getSprintData<T>(
    cacheKey: string,
    calculator: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const startTime = performance.now();
    this.performanceMetrics.totalRequests++;

    try {
      const ttl = customTTL || this.config.sprintDataTTL;
      const dependencies = ['global_sprint_settings', 'current_sprint', 'sprint_data'];

      const result = await enhancedCacheManager.getCachedData(
        cacheKey,
        calculator,
        ttl,
        dependencies
      );

      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, true);

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, false);
      this.performanceMetrics.errors++;
      throw error;
    }
  }

  /**
   * Get or calculate team data with optimized caching
   */
  async getTeamData<T>(
    teamId: number,
    cacheKey: string,
    calculator: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const startTime = performance.now();
    this.performanceMetrics.totalRequests++;

    try {
      const ttl = customTTL || this.config.teamDataTTL;
      const dependencies = [
        'schedule_entries',
        `team_${teamId}`,
        'team_members',
        'global_sprint_settings'
      ];

      const result = await enhancedCacheManager.getCachedData(
        cacheKey,
        calculator,
        ttl,
        dependencies
      );

      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, true);

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, false);
      this.performanceMetrics.errors++;
      throw error;
    }
  }

  /**
   * Get or calculate company-wide data with optimized caching
   */
  async getCompanyData<T>(
    cacheKey: string,
    calculator: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const startTime = performance.now();
    this.performanceMetrics.totalRequests++;

    try {
      const ttl = customTTL || this.config.bulkOperationTTL;
      const dependencies = [
        'schedule_entries',
        'team_members',
        'teams',
        'global_sprint_settings',
        'company_totals'
      ];

      const result = await enhancedCacheManager.getCachedData(
        cacheKey,
        calculator,
        ttl,
        dependencies
      );

      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, true);

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, false);
      this.performanceMetrics.errors++;
      throw error;
    }
  }

  /**
   * Get or calculate COO dashboard data with optimized caching
   */
  async getCOODashboardData<T>(
    cacheKey: string,
    calculator: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const startTime = performance.now();
    this.performanceMetrics.totalRequests++;

    try {
      const ttl = customTTL || this.config.bulkOperationTTL;
      const dependencies = [
        'coo_dashboard',
        'schedule_entries',
        'team_members',
        'teams',
        'global_sprint_settings',
        'company_totals'
      ];

      const result = await enhancedCacheManager.getCachedData(
        cacheKey,
        calculator,
        ttl,
        dependencies
      );

      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, true);

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, false);
      this.performanceMetrics.errors++;
      throw error;
    }
  }

  // ================================================
  // BULK OPERATIONS
  // ================================================

  /**
   * Process multiple calculations efficiently
   */
  async processBulkCalculations<T>(
    requests: BulkCalculationRequest[],
    calculators: Map<string, () => Promise<T>>
  ): Promise<Map<string, BulkCalculationResult<T>>> {
    debug(`Processing ${requests.length} bulk calculations`);
    this.performanceMetrics.bulkOperations++;

    const results = new Map<string, BulkCalculationResult<T>>();

    // Sort by priority
    const sortedRequests = requests.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < sortedRequests.length; i += batchSize) {
      const batch = sortedRequests.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (request) => {
        const startTime = performance.now();
        const cacheKey = this.generateBulkCacheKey(request);
        const calculator = calculators.get(request.type);

        if (!calculator) {
          return [cacheKey, {
            success: false,
            data: null,
            cacheKey,
            executionTime: 0,
            cacheHit: false,
            error: `No calculator found for type: ${request.type}`
          }] as [string, BulkCalculationResult<T>];
        }

        try {
          const data = await this.getBulkData(cacheKey, calculator, request);
          const executionTime = performance.now() - startTime;

          return [cacheKey, {
            success: true,
            data,
            cacheKey,
            executionTime,
            cacheHit: false, // TODO: Track cache hits in bulk operations
            error: undefined
          }] as [string, BulkCalculationResult<T>];
        } catch (error) {
          const executionTime = performance.now() - startTime;
          return [cacheKey, {
            success: false,
            data: null,
            cacheKey,
            executionTime,
            cacheHit: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }] as [string, BulkCalculationResult<T>];
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [key, value] = result.value;
          results.set(key, value);
        }
      });

      // Small delay between batches to prevent overwhelming
      if (i + batchSize < sortedRequests.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    debug(`Completed ${requests.length} bulk calculations`);
    return results;
  }

  /**
   * Queue bulk calculation request
   */
  queueBulkCalculation(request: BulkCalculationRequest): void {
    this.bulkRequestQueue.push(request);
    this.processBulkQueue();
  }

  /**
   * Process bulk queue
   */
  private async processBulkQueue(): Promise<void> {
    if (this.isProcessingBulk || this.bulkRequestQueue.length === 0) {
      return;
    }

    this.isProcessingBulk = true;

    try {
      const requests = this.bulkRequestQueue.splice(0, 10); // Process up to 10 at a time
      // Process requests here
      debug(`Processing ${requests.length} queued bulk calculations`);
    } finally {
      this.isProcessingBulk = false;
      
      // Process more if queue has items
      if (this.bulkRequestQueue.length > 0) {
        setTimeout(() => this.processBulkQueue(), 100);
      }
    }
  }

  /**
   * Start bulk processor
   */
  private startBulkProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingBulk && this.bulkRequestQueue.length > 0) {
        this.processBulkQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  // ================================================
  // CACHE INVALIDATION
  // ================================================

  /**
   * Invalidate team-specific caches
   */
  invalidateTeamCaches(teamId: number): void {
    debug(`Invalidating caches for team ${teamId}`);
    this.performanceMetrics.invalidations++;

    enhancedCacheManager.clearCacheByPattern(`team_${teamId}`);
    enhancedCacheManager.clearCacheByPattern(`team_sprint_capacity_${teamId}`);
    enhancedCacheManager.clearCacheByPattern(`team_hours_${teamId}`);
    
    // Invalidate dependent caches
    enhancedCacheManager.clearCache('company_totals_unified');
    enhancedCacheManager.clearCache('coo_dashboard_optimized');
  }

  /**
   * Invalidate sprint-related caches
   */
  invalidateSprintCaches(): void {
    debug('Invalidating sprint-related caches');
    this.performanceMetrics.invalidations++;

    enhancedCacheManager.clearCacheByPattern('sprint');
    enhancedCacheManager.clearCacheByPattern('calculation');
    enhancedCacheManager.clearCache('unified_sprint_data');
    enhancedCacheManager.clearCache('sprint_consistency_validation');
    
    // Invalidate all dependent calculations
    this.invalidateAllCalculationCaches();
  }

  /**
   * Invalidate all calculation caches
   */
  invalidateAllCalculationCaches(): void {
    debug('Invalidating all calculation caches');
    this.performanceMetrics.invalidations++;

    const cacheKeys = [
      'unified_sprint_data',
      'sprint_consistency_validation',
      'coo_dashboard_optimized',
      'company_totals_unified'
    ];

    cacheKeys.forEach(key => {
      enhancedCacheManager.clearCache(key);
    });

    enhancedCacheManager.clearCacheByPattern('team_');
    enhancedCacheManager.clearCacheByPattern('calculation');
    enhancedCacheManager.clearCacheByPattern('sprint');
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  private async getBulkData<T>(
    cacheKey: string,
    calculator: () => Promise<T>,
    request: BulkCalculationRequest
  ): Promise<T> {
    const ttl = this.config.bulkOperationTTL;
    const dependencies = this.getDependenciesForRequestType(request.type);

    return enhancedCacheManager.getCachedData(
      cacheKey,
      calculator,
      ttl,
      dependencies
    );
  }

  private generateBulkCacheKey(request: BulkCalculationRequest): string {
    const params = request.params ? JSON.stringify(request.params) : '';
    return `bulk_${request.type}_${request.priority}_${params}`;
  }

  private getDependenciesForRequestType(type: string): string[] {
    switch (type) {
      case 'team_capacity':
        return ['schedule_entries', 'team_members', 'global_sprint_settings'];
      case 'company_totals':
        return ['schedule_entries', 'team_members', 'teams', 'global_sprint_settings'];
      case 'sprint_data':
        return ['global_sprint_settings', 'current_sprint'];
      case 'coo_dashboard':
        return ['coo_dashboard', 'schedule_entries', 'team_members', 'teams'];
      default:
        return [];
    }
  }

  private updatePerformanceMetrics(executionTime: number, isHit: boolean): void {
    if (!this.config.enablePerformanceTracking) return;

    if (isHit) {
      this.performanceMetrics.cacheHits++;
    } else {
      this.performanceMetrics.cacheMisses++;
    }

    this.performanceMetrics.averageExecutionTime = 
      ((this.performanceMetrics.averageExecutionTime * (this.performanceMetrics.totalRequests - 1)) + executionTime) /
      this.performanceMetrics.totalRequests;
  }

  // ================================================
  // PUBLIC API
  // ================================================

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics & { hitRate: number; missRate: number } {
    const total = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    return {
      ...this.performanceMetrics,
      hitRate: total > 0 ? (this.performanceMetrics.cacheHits / total) * 100 : 0,
      missRate: total > 0 ? (this.performanceMetrics.cacheMisses / total) * 100 : 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CalculationCacheConfig>): void {
    this.config = { ...this.config, ...config };
    debug('Calculation cache configuration updated', this.config);
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.performanceMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageExecutionTime: 0,
      bulkOperations: 0,
      invalidations: 0,
      errors: 0
    };
    debug('Performance metrics reset');
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export const calculationCacheManager = CalculationCacheManager.getInstance();
export default calculationCacheManager;

// Export types for use in other modules
export type {
  CalculationCacheConfig,
  BulkCalculationRequest,
  BulkCalculationResult,
  PerformanceMetrics
};