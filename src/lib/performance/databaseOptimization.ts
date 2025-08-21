/**
 * Database Query Optimization - V2.2 Performance Enhancement
 * 
 * Provides optimized database query patterns for bulk operations,
 * connection pooling, and query batching for improved performance.
 */

import { supabase } from '@/lib/supabase';
import { enhancedCacheManager } from '@/utils/enhancedCacheManager';
import { debug, operation, error as logError } from '@/utils/debugLogger';

// ================================================
// TYPES AND INTERFACES
// ================================================

interface QueryOptimizationConfig {
  enableQueryBatching: boolean;
  enableConnectionPooling: boolean;
  enableQueryCaching: boolean;
  maxBatchSize: number;
  queryTimeout: number;
  connectionPoolSize: number;
  cacheQueryResults: boolean;
  defaultCacheTTL: number;
}

interface BulkQueryRequest {
  id: string;
  query: string;
  params?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cacheKey?: string;
  cacheTTL?: number;
}

interface QueryPerformanceMetrics {
  totalQueries: number;
  batchedQueries: number;
  cacheHits: number;
  averageExecutionTime: number;
  slowQueries: number;
  queryErrors: number;
  connectionPoolUsage: number;
}

interface OptimizedQueryResult<T = any> {
  success: boolean;
  data: T | null;
  executionTime: number;
  cached: boolean;
  error?: string;
  queryId?: string;
}

// ================================================
// DATABASE OPTIMIZATION MANAGER
// ================================================

class DatabaseOptimizationManager {
  private static instance: DatabaseOptimizationManager;
  private config: QueryOptimizationConfig;
  private metrics: QueryPerformanceMetrics;
  private queryQueue: BulkQueryRequest[] = [];
  private isProcessingBatch = false;
  private connectionPool: any[] = [];

  private constructor() {
    this.config = {
      enableQueryBatching: true,
      enableConnectionPooling: false, // Supabase handles connection pooling
      enableQueryCaching: true,
      maxBatchSize: 10,
      queryTimeout: 30000,
      connectionPoolSize: 5,
      cacheQueryResults: true,
      defaultCacheTTL: 2 * 60 * 1000 // 2 minutes
    };

    this.metrics = {
      totalQueries: 0,
      batchedQueries: 0,
      cacheHits: 0,
      averageExecutionTime: 0,
      slowQueries: 0,
      queryErrors: 0,
      connectionPoolUsage: 0
    };

    this.initializeOptimization();
  }

  static getInstance(): DatabaseOptimizationManager {
    if (!DatabaseOptimizationManager.instance) {
      DatabaseOptimizationManager.instance = new DatabaseOptimizationManager();
    }
    return DatabaseOptimizationManager.instance;
  }

  // ================================================
  // OPTIMIZED QUERY METHODS
  // ================================================

  /**
   * Execute optimized single query with caching
   */
  async executeOptimizedQuery<T>(
    query: string,
    params?: any,
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<OptimizedQueryResult<T>> {
    const startTime = performance.now();
    const queryId = this.generateQueryId();
    this.metrics.totalQueries++;

    try {
      // Check cache first if caching is enabled
      if (this.config.enableQueryCaching && cacheKey) {
        const cachedResult = await this.getCachedQueryResult<T>(cacheKey);
        if (cachedResult) {
          this.metrics.cacheHits++;
          return {
            success: true,
            data: cachedResult,
            executionTime: performance.now() - startTime,
            cached: true,
            queryId
          };
        }
      }

      // Execute query
      const result = await this.executeRawQuery<T>(query, params);
      const executionTime = performance.now() - startTime;

      // Update metrics
      this.updateMetrics(executionTime, true);

      // Cache result if caching is enabled
      if (this.config.cacheQueryResults && cacheKey && result.data) {
        await this.cacheQueryResult(cacheKey, result.data, cacheTTL);
      }

      return {
        success: true,
        data: result.data,
        executionTime,
        cached: false,
        queryId
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.updateMetrics(executionTime, false);
      
      return {
        success: false,
        data: null,
        executionTime,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryId
      };
    }
  }

  /**
   * Execute bulk queries efficiently
   */
  async executeBulkQueries(requests: BulkQueryRequest[]): Promise<Map<string, OptimizedQueryResult>> {
    debug(`Processing ${requests.length} bulk database queries`);
    this.metrics.batchedQueries += requests.length;

    const results = new Map<string, OptimizedQueryResult>();

    if (this.config.enableQueryBatching) {
      // Process in batches
      const batches = this.createQueryBatches(requests);
      
      for (const batch of batches) {
        const batchResults = await this.processBatch(batch);
        batchResults.forEach((result, id) => {
          results.set(id, result);
        });
      }
    } else {
      // Process individually
      const promises = requests.map(req => 
        this.executeOptimizedQuery(req.query, req.params, req.cacheKey, req.cacheTTL)
          .then(result => [req.id, result] as [string, OptimizedQueryResult])
      );

      const individualResults = await Promise.allSettled(promises);
      individualResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const [id, queryResult] = result.value;
          results.set(id, queryResult);
        }
      });
    }

    debug(`Completed ${requests.length} bulk database queries`);
    return results;
  }

  // ================================================
  // SPECIALIZED BULK OPERATIONS
  // ================================================

  /**
   * Optimized bulk schedule entry retrieval
   */
  async getBulkScheduleEntries(
    teamIds: number[], 
    startDate: string, 
    endDate: string
  ): Promise<OptimizedQueryResult<any[]>> {
    const cacheKey = `bulk_schedule_entries_${teamIds.join(',')}_${startDate}_${endDate}`;
    
    return this.executeOptimizedQuery(
      `
      SELECT se.*, tm.name as member_name, tm.team_id, t.name as team_name
      FROM schedule_entries se
      JOIN team_members tm ON se.member_id = tm.id
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.team_id = ANY($1)
        AND se.date >= $2 
        AND se.date <= $3
      ORDER BY t.name, tm.name, se.date
      `,
      [teamIds, startDate, endDate],
      cacheKey,
      1 * 60 * 1000 // 1 minute cache
    );
  }

  /**
   * Optimized bulk team capacity calculation
   */
  async getBulkTeamCapacities(teamIds: number[]): Promise<OptimizedQueryResult<any[]>> {
    const cacheKey = `bulk_team_capacities_${teamIds.join(',')}`;
    
    return this.executeOptimizedQuery(
      `
      SELECT 
        t.id as team_id,
        t.name as team_name,
        t.color,
        COUNT(tm.id) as team_size,
        COUNT(CASE WHEN tm.is_manager THEN 1 END) as manager_count,
        COALESCE(SUM(se.value::numeric), 0) as total_hours,
        gs.current_sprint_number,
        gs.sprint_start_date,
        gs.sprint_end_date
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN schedule_entries se ON tm.id = se.member_id 
        AND se.date >= (SELECT sprint_start_date FROM global_sprint_settings LIMIT 1)
        AND se.date <= (SELECT sprint_end_date FROM global_sprint_settings LIMIT 1)
      CROSS JOIN global_sprint_settings gs
      WHERE t.id = ANY($1)
      GROUP BY t.id, t.name, t.color, gs.current_sprint_number, gs.sprint_start_date, gs.sprint_end_date
      ORDER BY t.name
      `,
      [teamIds],
      cacheKey,
      2 * 60 * 1000 // 2 minute cache
    );
  }

  /**
   * Optimized COO dashboard data retrieval
   */
  async getCOODashboardBulkData(): Promise<OptimizedQueryResult<any[]>> {
    const cacheKey = 'coo_dashboard_bulk_data';
    
    return this.executeOptimizedQuery(
      `
      SELECT 
        t.id as team_id,
        t.name as team_name,
        t.color,
        COUNT(DISTINCT tm.id) as team_size,
        COUNT(DISTINCT CASE WHEN tm.is_manager THEN tm.id END) as manager_count,
        COALESCE(SUM(CASE 
          WHEN se.date >= gs.sprint_start_date AND se.date <= gs.sprint_end_date 
          THEN se.value::numeric 
          ELSE 0 
        END), 0) as sprint_hours,
        COALESCE(SUM(CASE 
          WHEN se.date >= date_trunc('week', CURRENT_DATE) 
            AND se.date < date_trunc('week', CURRENT_DATE) + interval '7 days'
          THEN se.value::numeric 
          ELSE 0 
        END), 0) as current_week_hours,
        gs.current_sprint_number,
        gs.sprint_start_date,
        gs.sprint_end_date,
        gs.progress_percentage,
        gs.days_remaining,
        CURRENT_TIMESTAMP as calculated_at
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN schedule_entries se ON tm.id = se.member_id
      CROSS JOIN global_sprint_settings gs
      GROUP BY t.id, t.name, t.color, 
               gs.current_sprint_number, gs.sprint_start_date, gs.sprint_end_date,
               gs.progress_percentage, gs.days_remaining
      ORDER BY t.name
      `,
      [],
      cacheKey,
      1 * 60 * 1000 // 1 minute cache for COO dashboard
    );
  }

  /**
   * Optimized sprint history retrieval
   */
  async getSprintHistoryBulk(limit: number = 10): Promise<OptimizedQueryResult<any[]>> {
    const cacheKey = `sprint_history_bulk_${limit}`;
    
    return this.executeOptimizedQuery(
      `
      SELECT 
        sh.id,
        sh.sprint_number,
        sh.sprint_start_date,
        sh.sprint_end_date,
        sh.sprint_length_weeks,
        sh.status,
        sh.created_at,
        CASE 
          WHEN CURRENT_DATE < sh.sprint_start_date THEN 'upcoming'
          WHEN CURRENT_DATE > sh.sprint_end_date THEN 'completed'
          ELSE 'active'
        END as calculated_status
      FROM sprint_history sh
      ORDER BY sh.sprint_start_date DESC
      LIMIT $1
      `,
      [limit],
      cacheKey,
      5 * 60 * 1000 // 5 minute cache for sprint history
    );
  }

  // ================================================
  // QUERY OPTIMIZATION UTILITIES
  // ================================================

  /**
   * Add query to batch processing queue
   */
  queueQuery(request: BulkQueryRequest): void {
    this.queryQueue.push(request);
    this.processBatchQueue();
  }

  /**
   * Process queued queries in batches
   */
  private async processBatchQueue(): Promise<void> {
    if (this.isProcessingBatch || this.queryQueue.length === 0) {
      return;
    }

    this.isProcessingBatch = true;

    try {
      const batch = this.queryQueue.splice(0, this.config.maxBatchSize);
      await this.processBatch(batch);
    } finally {
      this.isProcessingBatch = false;
      
      // Process more if queue has items
      if (this.queryQueue.length > 0) {
        setTimeout(() => this.processBatchQueue(), 100);
      }
    }
  }

  /**
   * Create optimized query batches
   */
  private createQueryBatches(requests: BulkQueryRequest[]): BulkQueryRequest[][] {
    // Sort by priority
    const sortedRequests = requests.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const batches: BulkQueryRequest[][] = [];
    for (let i = 0; i < sortedRequests.length; i += this.config.maxBatchSize) {
      batches.push(sortedRequests.slice(i, i + this.config.maxBatchSize));
    }

    return batches;
  }

  /**
   * Process a batch of queries
   */
  private async processBatch(batch: BulkQueryRequest[]): Promise<Map<string, OptimizedQueryResult>> {
    const results = new Map<string, OptimizedQueryResult>();

    // Execute queries in parallel
    const promises = batch.map(async (req) => {
      const result = await this.executeOptimizedQuery(
        req.query,
        req.params,
        req.cacheKey,
        req.cacheTTL
      );
      return [req.id, result] as [string, OptimizedQueryResult];
    });

    const batchResults = await Promise.allSettled(promises);
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const [id, queryResult] = result.value;
        results.set(id, queryResult);
      }
    });

    return results;
  }

  // ================================================
  // CACHE OPERATIONS
  // ================================================

  private async getCachedQueryResult<T>(cacheKey: string): Promise<T | null> {
    try {
      return await enhancedCacheManager.getCachedData(
        `query_${cacheKey}`,
        async () => null, // Won't be called if cache hit
        0, // No TTL for cache check
        []
      );
    } catch {
      return null;
    }
  }

  private async cacheQueryResult<T>(
    cacheKey: string, 
    data: T, 
    ttl?: number
  ): Promise<void> {
    try {
      enhancedCacheManager.setCache(
        `query_${cacheKey}`,
        data,
        ttl || this.config.defaultCacheTTL,
        ['database_query']
      );
    } catch (error) {
      logError('Failed to cache query result:', error);
    }
  }

  // ================================================
  // CORE DATABASE OPERATIONS
  // ================================================

  private async executeRawQuery<T>(query: string, params?: any): Promise<{ data: T; error: any }> {
    try {
      let result;
      
      if (params) {
        result = await supabase.rpc('execute_sql', { 
          query_text: query, 
          query_params: params 
        });
      } else {
        // For queries without parameters, use direct SQL execution
        result = await supabase.from('').select(query);
      }

      if (result.error) {
        throw result.error;
      }

      return { data: result.data as T, error: null };
    } catch (error) {
      logError('Database query execution failed:', error);
      return { data: null as T, error };
    }
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateMetrics(executionTime: number, success: boolean): void {
    if (success) {
      this.metrics.averageExecutionTime = 
        ((this.metrics.averageExecutionTime * (this.metrics.totalQueries - 1)) + executionTime) /
        this.metrics.totalQueries;
      
      if (executionTime > 1000) { // Queries taking more than 1 second
        this.metrics.slowQueries++;
      }
    } else {
      this.metrics.queryErrors++;
    }
  }

  private initializeOptimization(): void {
    debug('Initializing database optimization manager');
    
    // Start batch processor
    setInterval(() => {
      if (!this.isProcessingBatch && this.queryQueue.length > 0) {
        this.processBatchQueue();
      }
    }, 1000); // Check every second

    // Log performance metrics periodically
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 60000); // Log every minute
  }

  private logPerformanceMetrics(): void {
    debug('Database Optimization Performance Metrics:', {
      ...this.metrics,
      cacheHitRate: this.metrics.totalQueries > 0 
        ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100 
        : 0,
      errorRate: this.metrics.totalQueries > 0 
        ? (this.metrics.queryErrors / this.metrics.totalQueries) * 100 
        : 0
    });
  }

  // ================================================
  // PUBLIC API
  // ================================================

  /**
   * Get performance metrics
   */
  getMetrics(): QueryPerformanceMetrics & { cacheHitRate: number; errorRate: number } {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalQueries > 0 
        ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100 
        : 0,
      errorRate: this.metrics.totalQueries > 0 
        ? (this.metrics.queryErrors / this.metrics.totalQueries) * 100 
        : 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QueryOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    debug('Database optimization configuration updated', this.config);
  }

  /**
   * Clear query cache
   */
  clearQueryCache(): void {
    enhancedCacheManager.clearCacheByPattern('query_');
    debug('Query cache cleared');
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      batchedQueries: 0,
      cacheHits: 0,
      averageExecutionTime: 0,
      slowQueries: 0,
      queryErrors: 0,
      connectionPoolUsage: 0
    };
    debug('Database optimization metrics reset');
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export const databaseOptimizer = DatabaseOptimizationManager.getInstance();
export default databaseOptimizer;

// Export types for use in other modules
export type {
  QueryOptimizationConfig,
  BulkQueryRequest,
  QueryPerformanceMetrics,
  OptimizedQueryResult
};