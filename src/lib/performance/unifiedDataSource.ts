/**
 * Unified Data Source Manager - V2.2 Performance Enhancement
 * 
 * Ensures all components (COO dashboard, team views, etc.) access data through
 * the same cached sources for consistency and performance optimization.
 */

import { unifiedCalculationService } from '@/lib/unifiedCalculationService';
import { realTimeSyncManager } from '@/lib/realTimeSyncManager';
import { enhancedCacheManager } from '@/utils/enhancedCacheManager';
import { calculationCacheManager } from '@/lib/performance/calculationCache';
import { detectCurrentSprintForDate, getCurrentSprint } from '@/utils/smartSprintDetection';
import { DatabaseService } from '@/lib/database';
import { debug, operation, error as logError } from '@/utils/debugLogger';
import type { TeamCalculationResult, UnifiedSprintData } from '@/lib/unifiedCalculationService';
import type { TeamDashboardData, COODashboardData } from '@/types';

// ================================================
// TYPES AND INTERFACES
// ================================================

interface DataSourceConfig {
  enableUnifiedCaching: boolean;
  enableRealTimeSync: boolean;
  enableBulkOptimization: boolean;
  cacheInvalidationStrategy: 'aggressive' | 'moderate' | 'conservative';
  performanceMonitoring: boolean;
}

interface UnifiedDataRequest {
  type: 'sprint_data' | 'team_data' | 'coo_dashboard' | 'company_totals' | 'schedule_data';
  teamId?: number;
  parameters?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requester: 'coo_dashboard' | 'team_view' | 'mobile_app' | 'background_sync';
}

interface DataSourceMetrics {
  totalRequests: number;
  unifiedCacheHits: number;
  databaseQueries: number;
  averageResponseTime: number;
  errorRate: number;
  bulkOperations: number;
  lastSyncTime: string;
}

// ================================================
// UNIFIED DATA SOURCE MANAGER
// ================================================

class UnifiedDataSourceManager {
  private static instance: UnifiedDataSourceManager;
  private config: DataSourceConfig;
  private metrics: DataSourceMetrics;
  private activeRequests = new Map<string, Promise<any>>();

  private constructor() {
    this.config = {
      enableUnifiedCaching: true,
      enableRealTimeSync: true,
      enableBulkOptimization: true,
      cacheInvalidationStrategy: 'moderate',
      performanceMonitoring: true
    };

    this.metrics = {
      totalRequests: 0,
      unifiedCacheHits: 0,
      databaseQueries: 0,
      averageResponseTime: 0,
      errorRate: 0,
      bulkOperations: 0,
      lastSyncTime: new Date().toISOString()
    };

    this.initializeDataSource();
  }

  static getInstance(): UnifiedDataSourceManager {
    if (!UnifiedDataSourceManager.instance) {
      UnifiedDataSourceManager.instance = new UnifiedDataSourceManager();
    }
    return UnifiedDataSourceManager.instance;
  }

  // ================================================
  // UNIFIED DATA ACCESS METHODS
  // ================================================

  /**
   * Get current sprint data with unified caching
   */
  async getCurrentSprintUnified(): Promise<UnifiedSprintData | null> {
    const startTime = performance.now();
    const requestKey = 'current_sprint_unified';

    try {
      // Check if request is already in progress
      if (this.activeRequests.has(requestKey)) {
        debug('Sprint data request already in progress, waiting for result');
        return await this.activeRequests.get(requestKey);
      }

      const requestPromise = this.executeSprintDataRequest();
      this.activeRequests.set(requestKey, requestPromise);

      const result = await requestPromise;
      this.recordMetrics(startTime, true);
      
      return result;
    } catch (error) {
      this.recordMetrics(startTime, false);
      logError('Failed to get unified sprint data:', error);
      return null;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  /**
   * Get team dashboard data with unified caching
   */
  async getTeamDashboardDataUnified(teamId: number): Promise<TeamCalculationResult | null> {
    const startTime = performance.now();
    const requestKey = `team_dashboard_${teamId}`;

    try {
      if (this.activeRequests.has(requestKey)) {
        debug(`Team ${teamId} dashboard request already in progress, waiting for result`);
        return await this.activeRequests.get(requestKey);
      }

      const requestPromise = this.executeTeamDataRequest(teamId);
      this.activeRequests.set(requestKey, requestPromise);

      const result = await requestPromise;
      this.recordMetrics(startTime, true);
      
      return result;
    } catch (error) {
      this.recordMetrics(startTime, false);
      logError(`Failed to get team ${teamId} dashboard data:`, error);
      return null;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  /**
   * Get COO dashboard data with unified caching
   */
  async getCOODashboardDataUnified(): Promise<COODashboardData> {
    const startTime = performance.now();
    const requestKey = 'coo_dashboard_unified';

    try {
      if (this.activeRequests.has(requestKey)) {
        debug('COO dashboard request already in progress, waiting for result');
        return await this.activeRequests.get(requestKey);
      }

      const requestPromise = this.executeCOODashboardRequest();
      this.activeRequests.set(requestKey, requestPromise);

      const result = await requestPromise;
      this.recordMetrics(startTime, true);
      
      return result;
    } catch (error) {
      this.recordMetrics(startTime, false);
      logError('Failed to get COO dashboard data:', error);
      throw error;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  /**
   * Get multiple data sources efficiently in bulk
   */
  async getBulkDataUnified(requests: UnifiedDataRequest[]): Promise<Map<string, any>> {
    const startTime = performance.now();
    this.metrics.bulkOperations++;

    debug(`Processing ${requests.length} unified data requests in bulk`);

    try {
      // Group requests by type for optimization
      const requestGroups = this.groupRequestsByType(requests);
      const results = new Map<string, any>();

      // Process each group
      for (const [type, groupRequests] of requestGroups.entries()) {
        const groupResults = await this.processBulkRequestGroup(type, groupRequests);
        
        // Merge results
        groupResults.forEach((value, key) => {
          results.set(key, value);
        });
      }

      this.recordMetrics(startTime, true);
      debug(`Completed ${requests.length} bulk data requests`);
      
      return results;
    } catch (error) {
      this.recordMetrics(startTime, false);
      logError('Failed to process bulk data requests:', error);
      return new Map();
    }
  }

  // ================================================
  // CACHE SYNCHRONIZATION
  // ================================================

  /**
   * Ensure data consistency across all views
   */
  async synchronizeDataAcrossViews(): Promise<boolean> {
    debug('Synchronizing data across all views');

    try {
      // Clear potentially stale caches
      await this.clearStaleData();

      // Pre-warm critical caches
      await this.preWarmCriticalCaches();

      // Trigger real-time sync
      if (this.config.enableRealTimeSync) {
        await realTimeSyncManager.forceSynchronization();
      }

      this.metrics.lastSyncTime = new Date().toISOString();
      debug('Data synchronization completed successfully');
      
      return true;
    } catch (error) {
      logError('Failed to synchronize data across views:', error);
      return false;
    }
  }

  /**
   * Invalidate caches when data changes
   */
  async onDataChange(
    changeType: 'team_data' | 'sprint_data' | 'schedule_data' | 'member_data',
    affectedId?: number
  ): Promise<void> {
    debug(`Data change detected: ${changeType}, affected ID: ${affectedId}`);

    try {
      switch (changeType) {
        case 'team_data':
          if (affectedId) {
            calculationCacheManager.invalidateTeamCaches(affectedId);
          }
          break;
        
        case 'sprint_data':
          calculationCacheManager.invalidateSprintCaches();
          break;
        
        case 'schedule_data':
          if (affectedId) {
            calculationCacheManager.invalidateTeamCaches(affectedId);
          }
          calculationCacheManager.invalidateAllCalculationCaches();
          break;
        
        case 'member_data':
          if (affectedId) {
            // Find team for member and invalidate team caches
            const member = await DatabaseService.getTeamMember(affectedId);
            if (member?.team_id) {
              calculationCacheManager.invalidateTeamCaches(member.team_id);
            }
          }
          break;
      }

      // Trigger real-time sync
      if (this.config.enableRealTimeSync && affectedId) {
        const mappedType = changeType === 'schedule_data' ? 'schedule' : 
                         changeType === 'member_data' ? 'member' : 
                         changeType === 'team_data' ? 'capacity' : 'settings';
        await realTimeSyncManager.onTeamDataChange(affectedId, mappedType);
      }
    } catch (error) {
      logError(`Failed to handle data change ${changeType}:`, error);
    }
  }

  // ================================================
  // PRIVATE IMPLEMENTATION METHODS
  // ================================================

  private async executeSprintDataRequest(): Promise<UnifiedSprintData | null> {
    // Use unified calculation service for consistent sprint data
    return await unifiedCalculationService.getUnifiedSprintData();
  }

  private async executeTeamDataRequest(teamId: number): Promise<TeamCalculationResult | null> {
    // Use unified calculation service for consistent team data
    return await unifiedCalculationService.calculateTeamSprintCapacity(teamId);
  }

  private async executeCOODashboardRequest(): Promise<COODashboardData> {
    // Use unified calculation service for consistent COO dashboard data
    return await unifiedCalculationService.getCOODashboardOptimized();
  }

  private groupRequestsByType(requests: UnifiedDataRequest[]): Map<string, UnifiedDataRequest[]> {
    const groups = new Map<string, UnifiedDataRequest[]>();
    
    requests.forEach(request => {
      const group = groups.get(request.type) || [];
      group.push(request);
      groups.set(request.type, group);
    });
    
    return groups;
  }

  private async processBulkRequestGroup(
    type: string, 
    requests: UnifiedDataRequest[]
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    // Process requests based on type
    switch (type) {
      case 'sprint_data':
        const sprintData = await this.executeSprintDataRequest();
        requests.forEach(req => {
          results.set(`sprint_data_${req.requester}`, sprintData);
        });
        break;
      
      case 'team_data':
        // Process team requests in parallel
        const teamPromises = requests.map(async (req) => {
          if (req.teamId) {
            const teamData = await this.executeTeamDataRequest(req.teamId);
            return [`team_data_${req.teamId}_${req.requester}`, teamData];
          }
          return null;
        });
        
        const teamResults = await Promise.allSettled(teamPromises);
        teamResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            // If result.value is a tuple, destructure it; otherwise use index as key
            if (Array.isArray(result.value)) {
              const [key, value] = result.value as [string, TeamCalculationResult];
              results.set(key, value);
            } else {
              results.set(`team_${index}`, result.value as TeamCalculationResult);
            }
          }
        });
        break;
      
      case 'coo_dashboard':
        const cooData = await this.executeCOODashboardRequest();
        requests.forEach(req => {
          results.set(`coo_dashboard_${req.requester}`, cooData);
        });
        break;
    }
    
    return results;
  }

  private async clearStaleData(): Promise<void> {
    const strategy = this.config.cacheInvalidationStrategy;
    
    switch (strategy) {
      case 'aggressive':
        // Clear all caches
        calculationCacheManager.invalidateAllCalculationCaches();
        enhancedCacheManager.clearAllCache();
        break;
      
      case 'moderate':
        // Clear calculation caches only
        calculationCacheManager.invalidateAllCalculationCaches();
        break;
      
      case 'conservative':
        // Only clear expired caches (handled automatically)
        break;
    }
  }

  private async preWarmCriticalCaches(): Promise<void> {
    debug('Pre-warming critical caches');
    
    try {
      // Pre-warm most frequently accessed data
      const promises = [
        this.getCurrentSprintUnified(),
        this.getCOODashboardDataUnified(),
        unifiedCalculationService.calculateCompanyTotals()
      ];
      
      await Promise.allSettled(promises);
      debug('Critical caches pre-warmed successfully');
    } catch (error) {
      logError('Failed to pre-warm caches:', error);
    }
  }

  private initializeDataSource(): void {
    debug('Initializing unified data source manager');
    
    // Register for real-time sync events
    if (this.config.enableRealTimeSync) {
      // Register client with sync manager
      realTimeSyncManager.registerClient(
        'unified_data_source',
        'coo_dashboard', // Primary view type
        undefined,
        'system'
      );
    }
    
    // Start performance monitoring
    if (this.config.performanceMonitoring) {
      this.startPerformanceMonitoring();
    }
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 60000); // Log every minute
  }

  private recordMetrics(startTime: number, success: boolean): void {
    if (!this.config.performanceMonitoring) return;
    
    const executionTime = performance.now() - startTime;
    this.metrics.totalRequests++;
    
    if (!success) {
      this.metrics.errorRate = 
        ((this.metrics.errorRate * (this.metrics.totalRequests - 1)) + 1) / 
        this.metrics.totalRequests;
    }
    
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (this.metrics.totalRequests - 1)) + executionTime) /
      this.metrics.totalRequests;
  }

  private logPerformanceMetrics(): void {
    debug('Unified Data Source Performance Metrics:', {
      ...this.metrics,
      cacheHitRate: this.metrics.totalRequests > 0 
        ? (this.metrics.unifiedCacheHits / this.metrics.totalRequests) * 100 
        : 0
    });
  }

  // ================================================
  // PUBLIC API
  // ================================================

  /**
   * Get performance metrics
   */
  getMetrics(): DataSourceMetrics & { cacheHitRate: number } {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalRequests > 0 
        ? (this.metrics.unifiedCacheHits / this.metrics.totalRequests) * 100 
        : 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DataSourceConfig>): void {
    this.config = { ...this.config, ...config };
    debug('Unified data source configuration updated', this.config);
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      unifiedCacheHits: 0,
      databaseQueries: 0,
      averageResponseTime: 0,
      errorRate: 0,
      bulkOperations: 0,
      lastSyncTime: new Date().toISOString()
    };
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export const unifiedDataSource = UnifiedDataSourceManager.getInstance();
export default unifiedDataSource;

// Export types for use in other modules
export type {
  DataSourceConfig,
  UnifiedDataRequest,
  DataSourceMetrics
};