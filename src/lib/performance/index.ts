/**
 * Performance Optimization Suite - V2.2 Enhancement Index
 * 
 * Centralized exports for all performance optimization modules
 * including caching, database optimization, data unification, and validation.
 */

// Core performance modules
export { calculationCacheManager } from './calculationCache';
export { default as databaseOptimizer } from './databaseOptimization';
export { default as unifiedDataSource } from './unifiedDataSource';
export { default as cacheInvalidationStrategy } from './cacheInvalidationStrategy';
export { default as performanceValidator } from './performanceValidator';

// Import instances for default export
import calculationCacheManagerInstance from './calculationCache';
import databaseOptimizerInstance from './databaseOptimization';
import unifiedDataSourceInstance from './unifiedDataSource';
import cacheInvalidationStrategyInstance from './cacheInvalidationStrategy';
import performanceValidatorInstance from './performanceValidator';

// Enhanced cache manager (from utils)
export { enhancedCacheManager } from '@/utils/enhancedCacheManager';

// Performance-optimized hooks
export {
  useOptimizedSprintData,
  useOptimizedTeamData,
  useOptimizedCOODashboard,
  useOptimizedCompanyTotals,
  useOptimizedScheduleEntries,
  useCacheInvalidation,
  usePerformanceMonitoring
} from '@/hooks/useOptimizedData';

// Type exports
export type {
  CalculationCacheConfig,
  BulkCalculationRequest,
  BulkCalculationResult,
  PerformanceMetrics as CalculationMetrics
} from './calculationCache';

export type {
  QueryOptimizationConfig,
  BulkQueryRequest,
  QueryPerformanceMetrics,
  OptimizedQueryResult
} from './databaseOptimization';

export type {
  DataSourceConfig,
  UnifiedDataRequest,
  DataSourceMetrics
} from './unifiedDataSource';

export type {
  InvalidationRule,
  InvalidationEvent,
  InvalidationContext,
  InvalidationMetrics
} from './cacheInvalidationStrategy';

export type {
  PerformanceBaseline,
  PerformanceMetrics as ValidationMetrics,
  PerformanceTest,
  TestResult,
  ValidationReport
} from './performanceValidator';

export type {
  UseOptimizedDataOptions,
  DataState,
  OptimizedDataHookResult
} from '@/hooks/useOptimizedData';

// Utility functions for performance management
export const PerformanceUtils = {
  /**
   * Initialize all performance optimization systems
   */
  async initializePerformanceOptimization(): Promise<void> {
    const { calculationCacheManager } = await import('./calculationCache');
    const { databaseOptimizer } = await import('./databaseOptimization');
    const { unifiedDataSource } = await import('./unifiedDataSource');
    const { cacheInvalidationStrategy } = await import('./cacheInvalidationStrategy');
    
    // Systems are automatically initialized as singletons
    console.log('Performance optimization systems initialized');
  },

  /**
   * Get comprehensive performance metrics
   */
  async getComprehensiveMetrics() {
    const { calculationCacheManager } = await import('./calculationCache');
    const { databaseOptimizer } = await import('./databaseOptimization');
    const { unifiedDataSource } = await import('./unifiedDataSource');
    const { cacheInvalidationStrategy } = await import('./cacheInvalidationStrategy');
    
    return {
      calculation: calculationCacheManager.getPerformanceMetrics(),
      database: databaseOptimizer.getMetrics(),
      dataSource: unifiedDataSource.getMetrics(),
      invalidation: cacheInvalidationStrategy.getInvalidationMetrics(),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Validate overall system performance
   */
  async validatePerformance() {
    const { performanceValidator } = await import('./performanceValidator');
    return await performanceValidator.runPerformanceValidation();
  },

  /**
   * Clear all caches (emergency use)
   */
  async clearAllCaches() {
    const { calculationCacheManager } = await import('./calculationCache');
    const { databaseOptimizer } = await import('./databaseOptimization');
    const { enhancedCacheManager } = await import('@/utils/enhancedCacheManager');
    
    calculationCacheManager.invalidateAllCalculationCaches();
    databaseOptimizer.clearQueryCache();
    enhancedCacheManager.clearAllCache();
    
    console.log('All caches cleared');
  },

  /**
   * Warm up critical caches
   */
  async warmupCaches() {
    const { unifiedCalculationService } = await import('@/lib/unifiedCalculationService');
    await unifiedCalculationService.warmupCaches();
    console.log('Critical caches warmed up');
  }
};

// Performance configuration constants
export const PERFORMANCE_CONFIG = {
  CACHE_DURATIONS: {
    SPRINT_DATA: 30 * 60 * 1000,      // 30 minutes
    TEAM_DATA: 1 * 60 * 1000,         // 1 minute
    COO_DASHBOARD: 30 * 1000,         // 30 seconds
    CALCULATION: 2 * 60 * 1000,       // 2 minutes
    DATABASE_QUERY: 2 * 60 * 1000     // 2 minutes
  },
  
  THRESHOLDS: {
    CACHE_HIT_RATE: 80,               // 80% minimum
    RESPONSE_TIME: 100,               // 100ms maximum
    SYNC_LAG: 1000,                   // 1 second maximum
    CONSISTENCY_SCORE: 99             // 99% minimum
  },
  
  OPTIMIZATION_SETTINGS: {
    ENABLE_CACHING: true,
    ENABLE_BULK_OPERATIONS: true,
    ENABLE_REAL_TIME_SYNC: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    MAX_BATCH_SIZE: 10,
    QUERY_TIMEOUT: 30000
  }
};

// Default export for easy access to all performance systems
export default {
  calculationCacheManager: calculationCacheManagerInstance,
  databaseOptimizer: databaseOptimizerInstance,
  unifiedDataSource: unifiedDataSourceInstance,
  cacheInvalidationStrategy: cacheInvalidationStrategyInstance,
  performanceValidator: performanceValidatorInstance,
  PerformanceUtils,
  PERFORMANCE_CONFIG
};