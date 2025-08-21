/**
 * Cache Invalidation Strategy Manager - V2.2 Performance Enhancement
 * 
 * Centralized cache invalidation strategies that ensure data consistency
 * while maximizing performance across all application components.
 */

import { enhancedCacheManager } from '@/utils/enhancedCacheManager';
import { calculationCacheManager } from '@/lib/performance/calculationCache';
import { databaseOptimizer } from '@/lib/performance/databaseOptimization';
import { realTimeSyncManager } from '@/lib/realTimeSyncManager';
import { debug, operation, error as logError } from '@/utils/debugLogger';

// ================================================
// TYPES AND INTERFACES
// ================================================

interface InvalidationRule {
  trigger: 'data_change' | 'time_based' | 'manual' | 'dependency_change';
  scope: 'global' | 'team' | 'sprint' | 'user' | 'calculation';
  strategy: 'immediate' | 'lazy' | 'background' | 'batched';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  conditions?: (context: any) => boolean;
}

interface InvalidationEvent {
  id: string;
  type: 'team_data' | 'sprint_data' | 'schedule_data' | 'member_data' | 'calculation_data';
  entityId?: number;
  entityType?: string;
  metadata: Record<string, any>;
  timestamp: number;
  source: 'database' | 'user_action' | 'system' | 'real_time_sync';
}

interface InvalidationContext {
  affectedTables: string[];
  affectedTeams: number[];
  affectedSprints: number[];
  affectedMembers: number[];
  changeType: 'create' | 'update' | 'delete' | 'bulk_update';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface InvalidationMetrics {
  totalInvalidations: number;
  immediateInvalidations: number;
  lazyInvalidations: number;
  backgroundInvalidations: number;
  averageProcessingTime: number;
  successRate: number;
  lastInvalidationTime: string;
}

// ================================================
// CACHE INVALIDATION STRATEGY MANAGER
// ================================================

class CacheInvalidationStrategyManager {
  private static instance: CacheInvalidationStrategyManager;
  private invalidationRules: Map<string, InvalidationRule[]> = new Map();
  private pendingInvalidations: InvalidationEvent[] = [];
  private isProcessing = false;
  private metrics: InvalidationMetrics;

  private constructor() {
    this.metrics = {
      totalInvalidations: 0,
      immediateInvalidations: 0,
      lazyInvalidations: 0,
      backgroundInvalidations: 0,
      averageProcessingTime: 0,
      successRate: 0,
      lastInvalidationTime: new Date().toISOString()
    };

    this.initializeInvalidationRules();
    this.startInvalidationProcessor();
  }

  static getInstance(): CacheInvalidationStrategyManager {
    if (!CacheInvalidationStrategyManager.instance) {
      CacheInvalidationStrategyManager.instance = new CacheInvalidationStrategyManager();
    }
    return CacheInvalidationStrategyManager.instance;
  }

  // ================================================
  // INVALIDATION RULE INITIALIZATION
  // ================================================

  private initializeInvalidationRules(): void {
    debug('Initializing cache invalidation rules');

    // Sprint data invalidation rules
    this.addInvalidationRule('sprint_data', {
      trigger: 'data_change',
      scope: 'global',
      strategy: 'immediate',
      priority: 'critical',
      dependencies: [
        'unified_sprint_data',
        'current_sprint',
        'sprint_history',
        'calculation_data'
      ]
    });

    // Team data invalidation rules
    this.addInvalidationRule('team_data', {
      trigger: 'data_change',
      scope: 'team',
      strategy: 'immediate',
      priority: 'high',
      dependencies: [
        'team_calculations',
        'team_dashboard',
        'coo_dashboard',
        'company_totals'
      ]
    });

    // Schedule data invalidation rules
    this.addInvalidationRule('schedule_data', {
      trigger: 'data_change',
      scope: 'team',
      strategy: 'immediate',
      priority: 'high',
      dependencies: [
        'schedule_entries',
        'team_calculations',
        'capacity_calculations',
        'utilization_metrics'
      ]
    });

    // Member data invalidation rules
    this.addInvalidationRule('member_data', {
      trigger: 'data_change',
      scope: 'team',
      strategy: 'background',
      priority: 'medium',
      dependencies: [
        'team_members',
        'team_calculations',
        'capacity_calculations'
      ]
    });

    // Calculation data invalidation rules
    this.addInvalidationRule('calculation_data', {
      trigger: 'dependency_change',
      scope: 'calculation',
      strategy: 'lazy',
      priority: 'medium',
      dependencies: [
        'team_calculations',
        'company_totals',
        'utilization_metrics',
        'capacity_calculations'
      ]
    });

    // Time-based invalidation rules
    this.addInvalidationRule('time_based_refresh', {
      trigger: 'time_based',
      scope: 'global',
      strategy: 'background',
      priority: 'low',
      dependencies: [
        'real_time_data',
        'current_status',
        'live_metrics'
      ],
      conditions: (context) => {
        const now = Date.now();
        const lastRefresh = context.lastRefresh || 0;
        return (now - lastRefresh) > (5 * 60 * 1000); // 5 minutes
      }
    });
  }

  private addInvalidationRule(eventType: string, rule: InvalidationRule): void {
    if (!this.invalidationRules.has(eventType)) {
      this.invalidationRules.set(eventType, []);
    }
    this.invalidationRules.get(eventType)!.push(rule);
  }

  // ================================================
  // INVALIDATION EVENT PROCESSING
  // ================================================

  /**
   * Process an invalidation event
   */
  async processInvalidationEvent(event: InvalidationEvent): Promise<void> {
    debug(`Processing invalidation event: ${event.type}`, event);

    const rules = this.invalidationRules.get(event.type) || [];
    const context = this.buildInvalidationContext(event);

    for (const rule of rules) {
      // Check conditions if specified
      if (rule.conditions && !rule.conditions(context)) {
        continue;
      }

      switch (rule.strategy) {
        case 'immediate':
          await this.executeImmediateInvalidation(rule, context, event);
          this.metrics.immediateInvalidations++;
          break;
        
        case 'lazy':
          this.markForLazyInvalidation(rule, context, event);
          this.metrics.lazyInvalidations++;
          break;
        
        case 'background':
          this.queueBackgroundInvalidation(rule, context, event);
          this.metrics.backgroundInvalidations++;
          break;
        
        case 'batched':
          this.addToBatchInvalidation(rule, context, event);
          break;
      }
    }

    this.metrics.totalInvalidations++;
    this.metrics.lastInvalidationTime = new Date().toISOString();
  }

  /**
   * Build invalidation context from event
   */
  private buildInvalidationContext(event: InvalidationEvent): InvalidationContext {
    const context: InvalidationContext = {
      affectedTables: [],
      affectedTeams: [],
      affectedSprints: [],
      affectedMembers: [],
      changeType: 'update',
      urgency: 'medium'
    };

    // Extract context based on event type
    switch (event.type) {
      case 'team_data':
        if (event.entityId) {
          context.affectedTeams = [event.entityId];
        }
        context.affectedTables = ['teams', 'team_members'];
        break;
      
      case 'sprint_data':
        if (event.entityId) {
          context.affectedSprints = [event.entityId];
        }
        context.affectedTables = ['global_sprint_settings', 'sprint_history'];
        context.urgency = 'critical';
        break;
      
      case 'schedule_data':
        if (event.metadata.teamId) {
          context.affectedTeams = [event.metadata.teamId];
        }
        if (event.metadata.memberId) {
          context.affectedMembers = [event.metadata.memberId];
        }
        context.affectedTables = ['schedule_entries'];
        context.urgency = 'high';
        break;
      
      case 'member_data':
        if (event.entityId) {
          context.affectedMembers = [event.entityId];
        }
        if (event.metadata.teamId) {
          context.affectedTeams = [event.metadata.teamId];
        }
        context.affectedTables = ['team_members'];
        break;
    }

    return context;
  }

  // ================================================
  // INVALIDATION STRATEGIES
  // ================================================

  /**
   * Execute immediate invalidation
   */
  private async executeImmediateInvalidation(
    rule: InvalidationRule,
    context: InvalidationContext,
    event: InvalidationEvent
  ): Promise<void> {
    const startTime = performance.now();

    try {
      debug(`Executing immediate invalidation for rule scope: ${rule.scope}`);

      switch (rule.scope) {
        case 'global':
          await this.invalidateGlobalCaches(rule.dependencies);
          break;
        
        case 'team':
          await this.invalidateTeamCaches(context.affectedTeams, rule.dependencies);
          break;
        
        case 'sprint':
          await this.invalidateSprintCaches(context.affectedSprints, rule.dependencies);
          break;
        
        case 'calculation':
          await this.invalidateCalculationCaches(rule.dependencies);
          break;
      }

      // Trigger real-time sync if needed
      if (rule.priority === 'critical' || rule.priority === 'high') {
        await this.triggerRealTimeSync(event);
      }

      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, true);

    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.updatePerformanceMetrics(executionTime, false);
      logError('Failed to execute immediate invalidation:', error);
    }
  }

  /**
   * Mark for lazy invalidation
   */
  private markForLazyInvalidation(
    rule: InvalidationRule,
    context: InvalidationContext,
    event: InvalidationEvent
  ): void {
    debug(`Marking for lazy invalidation: ${rule.scope}`);

    // Mark cache entries as stale without removing them
    rule.dependencies.forEach(dependency => {
      enhancedCacheManager.clearCacheByPattern(dependency);
    });
  }

  /**
   * Queue background invalidation
   */
  private queueBackgroundInvalidation(
    rule: InvalidationRule,
    context: InvalidationContext,
    event: InvalidationEvent
  ): void {
    debug(`Queuing background invalidation: ${rule.scope}`);

    // Add to background processing queue
    this.pendingInvalidations.push({
      ...event,
      id: `bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  /**
   * Add to batch invalidation
   */
  private addToBatchInvalidation(
    rule: InvalidationRule,
    context: InvalidationContext,
    event: InvalidationEvent
  ): void {
    debug(`Adding to batch invalidation: ${rule.scope}`);

    // Batch processing will be handled by the background processor
    this.queueBackgroundInvalidation(rule, context, event);
  }

  // ================================================
  // SCOPE-SPECIFIC INVALIDATION METHODS
  // ================================================

  /**
   * Invalidate global caches
   */
  private async invalidateGlobalCaches(dependencies: string[]): Promise<void> {
    debug('Invalidating global caches', dependencies);

    // Clear calculation caches
    calculationCacheManager.invalidateAllCalculationCaches();
    
    // Clear enhanced caches by patterns
    dependencies.forEach(dependency => {
      enhancedCacheManager.clearCacheByPattern(dependency);
    });

    // Clear database query caches
    databaseOptimizer.clearQueryCache();
  }

  /**
   * Invalidate team-specific caches
   */
  private async invalidateTeamCaches(teamIds: number[], dependencies: string[]): Promise<void> {
    debug(`Invalidating team caches for teams: ${teamIds.join(', ')}`, dependencies);

    teamIds.forEach(teamId => {
      // Use calculation cache manager for team invalidation
      calculationCacheManager.invalidateTeamCaches(teamId);
      
      // Clear team-specific patterns
      dependencies.forEach(dependency => {
        enhancedCacheManager.clearCacheByPattern(`${dependency}_${teamId}`);
        enhancedCacheManager.clearCacheByPattern(`team_${teamId}`);
      });
    });
  }

  /**
   * Invalidate sprint-specific caches
   */
  private async invalidateSprintCaches(sprintIds: number[], dependencies: string[]): Promise<void> {
    debug(`Invalidating sprint caches for sprints: ${sprintIds.join(', ')}`, dependencies);

    // Use calculation cache manager for sprint invalidation
    calculationCacheManager.invalidateSprintCaches();
    
    // Clear sprint-specific patterns
    dependencies.forEach(dependency => {
      enhancedCacheManager.clearCacheByPattern(dependency);
      enhancedCacheManager.clearCacheByPattern('sprint');
    });
  }

  /**
   * Invalidate calculation-specific caches
   */
  private async invalidateCalculationCaches(dependencies: string[]): Promise<void> {
    debug('Invalidating calculation caches', dependencies);

    // Use calculation cache manager
    calculationCacheManager.invalidateAllCalculationCaches();
    
    // Clear specific calculation patterns
    dependencies.forEach(dependency => {
      enhancedCacheManager.clearCacheByPattern(dependency);
    });
  }

  // ================================================
  // REAL-TIME SYNC INTEGRATION
  // ================================================

  /**
   * Trigger real-time synchronization
   */
  private async triggerRealTimeSync(event: InvalidationEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'team_data':
          if (event.entityId) {
            await realTimeSyncManager.onTeamDataChange(event.entityId, 'capacity');
          }
          break;
        
        case 'schedule_data':
          if (event.metadata.teamId) {
            await realTimeSyncManager.onTeamDataChange(event.metadata.teamId, 'schedule');
          }
          break;
        
        case 'sprint_data':
          // Force full synchronization for sprint changes
          await realTimeSyncManager.forceSynchronization();
          break;
      }
    } catch (error) {
      logError('Failed to trigger real-time sync:', error);
    }
  }

  // ================================================
  // BACKGROUND PROCESSING
  // ================================================

  /**
   * Start invalidation processor
   */
  private startInvalidationProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.pendingInvalidations.length > 0) {
        this.processPendingInvalidations();
      }
    }, 1000); // Process every second
  }

  /**
   * Process pending invalidations
   */
  private async processPendingInvalidations(): Promise<void> {
    if (this.isProcessing || this.pendingInvalidations.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.pendingInvalidations.splice(0, 10); // Process up to 10 at a time
      debug(`Processing ${batch.length} pending invalidations`);

      await Promise.allSettled(
        batch.map(event => this.processBackgroundInvalidation(event))
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process background invalidation
   */
  private async processBackgroundInvalidation(event: InvalidationEvent): Promise<void> {
    try {
      // Execute lower priority invalidation in background
      const context = this.buildInvalidationContext(event);
      
      // Clear caches without triggering immediate refresh
      switch (event.type) {
        case 'member_data':
          if (event.metadata.teamId) {
            enhancedCacheManager.clearCacheByPattern(`team_${event.metadata.teamId}`);
          }
          break;
        
        case 'calculation_data':
          enhancedCacheManager.clearCacheByPattern('calculation');
          break;
      }
    } catch (error) {
      logError('Failed to process background invalidation:', error);
    }
  }

  // ================================================
  // PUBLIC API METHODS
  // ================================================

  /**
   * Manually trigger invalidation
   */
  async invalidateByEntityChange(
    entityType: 'team' | 'sprint' | 'member' | 'schedule',
    entityId: number,
    changeType: 'create' | 'update' | 'delete' = 'update',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const event: InvalidationEvent = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: `${entityType}_data` as any,
      entityId,
      entityType,
      metadata: { ...metadata, changeType },
      timestamp: Date.now(),
      source: 'user_action'
    };

    await this.processInvalidationEvent(event);
  }

  /**
   * Invalidate all caches (emergency use)
   */
  async invalidateAllCaches(): Promise<void> {
    debug('Emergency: Invalidating all caches');

    try {
      // Clear all cache managers
      calculationCacheManager.invalidateAllCalculationCaches();
      enhancedCacheManager.clearAllCache();
      databaseOptimizer.clearQueryCache();
      
      // Force real-time sync
      await realTimeSyncManager.forceSynchronization();
      
      this.metrics.totalInvalidations++;
      this.metrics.immediateInvalidations++;
      
    } catch (error) {
      logError('Failed to invalidate all caches:', error);
    }
  }

  /**
   * Get invalidation metrics
   */
  getInvalidationMetrics(): InvalidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Update invalidation rule
   */
  updateInvalidationRule(eventType: string, rule: InvalidationRule): void {
    if (!this.invalidationRules.has(eventType)) {
      this.invalidationRules.set(eventType, []);
    }
    
    const rules = this.invalidationRules.get(eventType)!;
    const existingIndex = rules.findIndex(r => r.scope === rule.scope && r.trigger === rule.trigger);
    
    if (existingIndex >= 0) {
      rules[existingIndex] = rule;
    } else {
      rules.push(rule);
    }
    
    debug(`Updated invalidation rule for ${eventType}:`, rule);
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  private updatePerformanceMetrics(executionTime: number, success: boolean): void {
    const totalOperations = this.metrics.immediateInvalidations + 
                           this.metrics.lazyInvalidations + 
                           this.metrics.backgroundInvalidations;
    
    if (totalOperations > 0) {
      this.metrics.averageProcessingTime = 
        ((this.metrics.averageProcessingTime * (totalOperations - 1)) + executionTime) / 
        totalOperations;
    }

    if (success) {
      this.metrics.successRate = 
        ((this.metrics.successRate * (this.metrics.totalInvalidations - 1)) + 1) / 
        this.metrics.totalInvalidations;
    } else {
      this.metrics.successRate = 
        ((this.metrics.successRate * (this.metrics.totalInvalidations - 1)) + 0) / 
        this.metrics.totalInvalidations;
    }
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export const cacheInvalidationStrategy = CacheInvalidationStrategyManager.getInstance();
export default cacheInvalidationStrategy;

// Export types for use in other modules
export type {
  InvalidationRule,
  InvalidationEvent,
  InvalidationContext,
  InvalidationMetrics
};