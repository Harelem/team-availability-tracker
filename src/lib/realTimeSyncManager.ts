/**
 * Real-Time Sync Manager - V2.2 Enhancement
 * 
 * Manages real-time synchronization between COO dashboard and team views.
 * Ensures changes propagate immediately across all connected clients.
 */

import { supabase } from './supabase';
import { enhancedCacheManager } from '@/utils/enhancedCacheManager';
import { unifiedCalculationService } from './unifiedCalculationService';
import { debug, operation, error as logError } from '@/utils/debugLogger';

// ================================================
// TYPES AND INTERFACES
// ================================================

interface SyncEvent {
  id: string;
  type: 'team_data_change' | 'sprint_update' | 'schedule_change' | 'member_update';
  source: 'team_view' | 'coo_view' | 'system';
  affectedEntityId: number;
  affectedEntityType: 'team' | 'member' | 'sprint' | 'schedule_entry';
  changeDetails: Record<string, any>;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface SyncStatusReport {
  totalClients: number;
  connectedClients: number;
  syncLag: number;
  lastSyncEvent: string;
  pendingUpdates: number;
  averageProcessingTime: number;
  errorRate: number;
}

interface ClientConnection {
  id: string;
  type: 'coo_dashboard' | 'team_view' | 'mobile_app';
  teamId?: number;
  userId?: string;
  connectedAt: number;
  lastActivity: number;
  syncVersion: number;
}

// ================================================
// REAL-TIME SYNC MANAGER CLASS
// ================================================

class RealTimeSyncManager {
  private static instance: RealTimeSyncManager;
  private syncChannel: any = null;
  private connectedClients = new Map<string, ClientConnection>();
  private pendingUpdates = new Map<string, SyncEvent>();
  private eventQueue: SyncEvent[] = [];
  private isProcessing = false;
  private syncMetrics = {
    totalEvents: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageProcessingTime: 0,
    lastSyncTimestamp: 0
  };

  private readonly SYNC_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly BATCH_SIZE = 10;

  private constructor() {
    this.initializeRealtimeSync();
    this.startEventProcessor();
    this.startHealthMonitoring();
  }

  static getInstance(): RealTimeSyncManager {
    if (!RealTimeSyncManager.instance) {
      RealTimeSyncManager.instance = new RealTimeSyncManager();
    }
    return RealTimeSyncManager.instance;
  }

  // ================================================
  // REAL-TIME SYNC INITIALIZATION
  // ================================================

  /**
   * Initialize real-time synchronization channels
   */
  private initializeRealtimeSync(): void {
    debug('Initializing real-time sync manager');

    this.syncChannel = supabase
      .channel('sync_manager')
      .on('broadcast', { event: 'data_change' }, (payload) => {
        this.handleBroadcastEvent(payload);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'schedule_entries' 
      }, (payload) => {
        this.handleScheduleChange(payload);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'team_members' 
      }, (payload) => {
        this.handleTeamMemberChange(payload);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'global_sprint_settings' 
      }, (payload) => {
        this.handleSprintChange(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          debug('Real-time sync manager subscribed successfully');
        } else if (status === 'CHANNEL_ERROR') {
          logError('Real-time sync channel error');
          this.handleConnectionError();
        }
      });
  }

  /**
   * Handle broadcast events from other clients
   */
  private handleBroadcastEvent(payload: any): void {
    debug('Received broadcast event:', payload);

    const syncEvent: SyncEvent = {
      id: payload.eventId || this.generateEventId(),
      type: payload.type,
      source: payload.source,
      affectedEntityId: payload.affectedEntityId,
      affectedEntityType: payload.affectedEntityType,
      changeDetails: payload.changeDetails || {},
      timestamp: payload.timestamp || Date.now(),
      priority: payload.priority || 'medium'
    };

    this.addEventToQueue(syncEvent);
  }

  // ================================================
  // DATA CHANGE HANDLERS
  // ================================================

  /**
   * Handle schedule entry changes
   */
  private handleScheduleChange(payload: any): void {
    debug('Schedule change detected:', payload);

    const syncEvent: SyncEvent = {
      id: this.generateEventId(),
      type: 'schedule_change',
      source: 'system',
      affectedEntityId: payload.new?.member_id || payload.old?.member_id,
      affectedEntityType: 'schedule_entry',
      changeDetails: {
        operation: payload.eventType,
        scheduleEntryId: payload.new?.id || payload.old?.id,
        memberId: payload.new?.member_id || payload.old?.member_id,
        date: payload.new?.date || payload.old?.date,
        value: payload.new?.value || payload.old?.value,
        oldValue: payload.old?.value
      },
      timestamp: Date.now(),
      priority: 'high'
    };

    this.addEventToQueue(syncEvent);
  }

  /**
   * Handle team member changes
   */
  private handleTeamMemberChange(payload: any): void {
    debug('Team member change detected:', payload);

    const syncEvent: SyncEvent = {
      id: this.generateEventId(),
      type: 'member_update',
      source: 'system',
      affectedEntityId: payload.new?.team_id || payload.old?.team_id,
      affectedEntityType: 'member',
      changeDetails: {
        operation: payload.eventType,
        memberId: payload.new?.id || payload.old?.id,
        teamId: payload.new?.team_id || payload.old?.team_id,
        memberName: payload.new?.name || payload.old?.name,
        isManager: payload.new?.is_manager || payload.old?.is_manager
      },
      timestamp: Date.now(),
      priority: 'high'
    };

    this.addEventToQueue(syncEvent);
  }

  /**
   * Handle sprint changes
   */
  private handleSprintChange(payload: any): void {
    debug('Sprint change detected:', payload);

    const syncEvent: SyncEvent = {
      id: this.generateEventId(),
      type: 'sprint_update',
      source: 'system',
      affectedEntityId: payload.new?.id || payload.old?.id,
      affectedEntityType: 'sprint',
      changeDetails: {
        operation: payload.eventType,
        sprintNumber: payload.new?.current_sprint_number || payload.old?.current_sprint_number,
        startDate: payload.new?.sprint_start_date || payload.old?.sprint_start_date,
        lengthWeeks: payload.new?.sprint_length_weeks || payload.old?.sprint_length_weeks
      },
      timestamp: Date.now(),
      priority: 'critical'
    };

    this.addEventToQueue(syncEvent);
  }

  // ================================================
  // EVENT PROCESSING
  // ================================================

  /**
   * Add event to processing queue
   */
  private addEventToQueue(event: SyncEvent): void {
    // Deduplicate similar events
    const existingEventIndex = this.eventQueue.findIndex(e => 
      e.type === event.type && 
      e.affectedEntityId === event.affectedEntityId &&
      e.timestamp > Date.now() - 5000 // Within last 5 seconds
    );

    if (existingEventIndex >= 0) {
      // Update existing event with latest data
      this.eventQueue[existingEventIndex] = event;
      debug(`Updated existing event in queue: ${event.id}`);
    } else {
      // Add new event
      this.eventQueue.push(event);
      debug(`Added new event to queue: ${event.id}`);
    }

    // Sort by priority and timestamp
    this.eventQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Start event processor
   */
  private startEventProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.eventQueue.length > 0) {
        await this.processEventBatch();
      }
    }, 1000); // Process every second
  }

  /**
   * Process a batch of events
   */
  private async processEventBatch(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const batch = this.eventQueue.splice(0, this.BATCH_SIZE);
    
    debug(`Processing batch of ${batch.length} sync events`);

    try {
      await Promise.allSettled(batch.map(event => this.processEvent(event)));
    } catch (error) {
      logError('Error processing event batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual sync event
   */
  private async processEvent(event: SyncEvent): Promise<void> {
    const startTime = performance.now();
    
    try {
      debug(`Processing sync event: ${event.type} for ${event.affectedEntityType} ${event.affectedEntityId}`);

      // Invalidate relevant caches
      await this.invalidateRelevantCaches(event);

      // Trigger data refresh based on event type
      await this.refreshAffectedData(event);

      // Broadcast update to connected clients
      await this.broadcastToClients(event);

      // Update metrics
      this.syncMetrics.successfulSyncs++;
      this.updateProcessingTime(performance.now() - startTime);
      
      debug(`Successfully processed sync event: ${event.id}`);
    } catch (error) {
      logError(`Failed to process sync event ${event.id}:`, error);
      this.syncMetrics.failedSyncs++;
      
      // Add to pending updates for retry
      this.pendingUpdates.set(event.id, event);
    }

    this.syncMetrics.totalEvents++;
    this.syncMetrics.lastSyncTimestamp = Date.now();
  }

  // ================================================
  // CACHE AND DATA MANAGEMENT
  // ================================================

  /**
   * Invalidate caches relevant to the sync event
   */
  private async invalidateRelevantCaches(event: SyncEvent): Promise<void> {
    debug(`Invalidating caches for ${event.type}`);

    switch (event.type) {
      case 'schedule_change':
        enhancedCacheManager.invalidateRelatedCaches('schedule_entries', event.changeDetails.scheduleEntryId);
        enhancedCacheManager.clearCacheByPattern(`team_${event.changeDetails.teamId}`);
        enhancedCacheManager.clearCacheByPattern('coo_dashboard');
        break;

      case 'member_update':
        enhancedCacheManager.invalidateRelatedCaches('team_members', event.changeDetails.memberId);
        enhancedCacheManager.clearCacheByPattern(`team_${event.affectedEntityId}`);
        break;

      case 'sprint_update':
        enhancedCacheManager.invalidateRelatedCaches('global_sprint_settings');
        enhancedCacheManager.clearCacheByPattern('sprint');
        enhancedCacheManager.clearCacheByPattern('calculation');
        break;

      case 'team_data_change':
        enhancedCacheManager.clearCacheByPattern(`team_${event.affectedEntityId}`);
        enhancedCacheManager.clearCacheByPattern('company_totals');
        break;
    }

    // Always clear aggregated calculations
    unifiedCalculationService.invalidateAllCaches();
  }

  /**
   * Refresh affected data after cache invalidation
   */
  private async refreshAffectedData(event: SyncEvent): Promise<void> {
    debug(`Refreshing data for ${event.type}`);

    try {
      switch (event.type) {
        case 'schedule_change':
        case 'member_update':
          // Refresh team calculations
          if (event.changeDetails.teamId) {
            await unifiedCalculationService.calculateTeamSprintCapacity(event.changeDetails.teamId);
          }
          // Refresh COO dashboard
          await unifiedCalculationService.getCOODashboardOptimized();
          break;

        case 'sprint_update':
          // Refresh sprint data
          await unifiedCalculationService.getUnifiedSprintData();
          // Refresh all calculations
          await unifiedCalculationService.calculateCompanyTotals();
          break;

        case 'team_data_change':
          // Refresh specific team data
          await unifiedCalculationService.calculateTeamSprintCapacity(event.affectedEntityId);
          break;
      }
    } catch (error) {
      logError(`Failed to refresh data for event ${event.id}:`, error);
    }
  }

  // ================================================
  // CLIENT COMMUNICATION
  // ================================================

  /**
   * Broadcast update to connected clients
   */
  private async broadcastToClients(event: SyncEvent): Promise<void> {
    debug(`Broadcasting event to ${this.connectedClients.size} connected clients`);

    const broadcastPayload = {
      eventId: event.id,
      type: event.type,
      affectedEntityId: event.affectedEntityId,
      affectedEntityType: event.affectedEntityType,
      changeDetails: event.changeDetails,
      timestamp: event.timestamp,
      priority: event.priority
    };

    try {
      await this.syncChannel.send({
        type: 'broadcast',
        event: 'data_refresh',
        payload: broadcastPayload
      });
    } catch (error) {
      logError('Failed to broadcast to clients:', error);
    }
  }

  /**
   * Register client connection
   */
  registerClient(
    clientId: string, 
    clientType: 'coo_dashboard' | 'team_view' | 'mobile_app',
    teamId?: number,
    userId?: string
  ): void {
    const client: ClientConnection = {
      id: clientId,
      type: clientType,
      teamId,
      userId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      syncVersion: 1
    };

    this.connectedClients.set(clientId, client);
    debug(`Client registered: ${clientId} (${clientType})`);
  }

  /**
   * Update client activity
   */
  updateClientActivity(clientId: string): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  /**
   * Unregister client connection
   */
  unregisterClient(clientId: string): void {
    this.connectedClients.delete(clientId);
    debug(`Client unregistered: ${clientId}`);
  }

  // ================================================
  // PUBLIC API METHODS
  // ================================================

  /**
   * Trigger manual data change sync
   */
  async onTeamDataChange(
    teamId: number, 
    changeType: 'schedule' | 'member' | 'capacity' | 'settings'
  ): Promise<void> {
    debug(`Manual team data change triggered: ${changeType} for team ${teamId}`);

    const event: SyncEvent = {
      id: this.generateEventId(),
      type: 'team_data_change',
      source: 'team_view',
      affectedEntityId: teamId,
      affectedEntityType: 'team',
      changeDetails: { changeType },
      timestamp: Date.now(),
      priority: 'high'
    };

    this.addEventToQueue(event);
  }

  /**
   * Validate sync status across all views
   */
  async validateSyncStatus(): Promise<SyncStatusReport> {
    debug('Validating sync status');

    // Clean up inactive clients
    this.cleanupInactiveClients();

    const now = Date.now();
    const connectedClients = this.connectedClients.size;
    const pendingUpdates = this.pendingUpdates.size;
    const syncLag = now - this.syncMetrics.lastSyncTimestamp;

    const report: SyncStatusReport = {
      totalClients: connectedClients,
      connectedClients,
      syncLag,
      lastSyncEvent: new Date(this.syncMetrics.lastSyncTimestamp).toISOString(),
      pendingUpdates,
      averageProcessingTime: this.syncMetrics.averageProcessingTime,
      errorRate: this.syncMetrics.totalEvents > 0 
        ? (this.syncMetrics.failedSyncs / this.syncMetrics.totalEvents) * 100 
        : 0
    };

    debug('Sync status report:', report);
    return report;
  }

  /**
   * Force synchronization across all views
   */
  async forceSynchronization(): Promise<boolean> {
    debug('Forcing synchronization across all views');

    try {
      // Clear all caches
      enhancedCacheManager.clearAllCache();
      unifiedCalculationService.invalidateAllCaches();

      // Trigger data refresh
      await unifiedCalculationService.warmupCaches();

      // Broadcast force refresh to all clients
      await this.syncChannel.send({
        type: 'broadcast',
        event: 'force_refresh',
        payload: { timestamp: Date.now() }
      });

      debug('Force synchronization completed successfully');
      return true;
    } catch (error) {
      logError('Force synchronization failed:', error);
      return false;
    }
  }

  // ================================================
  // HEALTH MONITORING
  // ================================================

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Check every minute
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    // Clean up inactive clients
    this.cleanupInactiveClients();

    // Process pending updates
    this.processPendingUpdates();

    // Monitor sync lag
    const syncLag = Date.now() - this.syncMetrics.lastSyncTimestamp;
    if (syncLag > this.SYNC_TIMEOUT) {
      logError(`Sync lag detected: ${syncLag}ms`);
    }

    // Monitor error rate
    const errorRate = this.syncMetrics.totalEvents > 0 
      ? (this.syncMetrics.failedSyncs / this.syncMetrics.totalEvents) * 100 
      : 0;
    
    if (errorRate > 10) { // More than 10% error rate
      logError(`High sync error rate detected: ${errorRate}%`);
    }
  }

  /**
   * Clean up inactive clients
   */
  private cleanupInactiveClients(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [clientId, client] of this.connectedClients.entries()) {
      if (now - client.lastActivity > timeout) {
        this.unregisterClient(clientId);
      }
    }
  }

  /**
   * Process pending updates with retry logic
   */
  private async processPendingUpdates(): Promise<void> {
    for (const [eventId, event] of this.pendingUpdates.entries()) {
      try {
        await this.processEvent(event);
        this.pendingUpdates.delete(eventId);
      } catch (error) {
        logError(`Retry failed for event ${eventId}:`, error);
        
        // Remove after max retries (based on age)
        const age = Date.now() - event.timestamp;
        if (age > this.SYNC_TIMEOUT * this.MAX_RETRY_ATTEMPTS) {
          this.pendingUpdates.delete(eventId);
        }
      }
    }
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  private generateEventId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateProcessingTime(processingTime: number): void {
    this.syncMetrics.averageProcessingTime = 
      ((this.syncMetrics.averageProcessingTime * (this.syncMetrics.successfulSyncs - 1)) + processingTime) /
      this.syncMetrics.successfulSyncs;
  }

  private handleConnectionError(): void {
    logError('Real-time connection error, attempting to reconnect...');
    
    setTimeout(() => {
      this.initializeRealtimeSync();
    }, 5000); // Retry after 5 seconds
  }

  /**
   * Get sync metrics
   */
  getSyncMetrics() {
    return { ...this.syncMetrics };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.syncChannel) {
      this.syncChannel.unsubscribe();
    }
    this.connectedClients.clear();
    this.pendingUpdates.clear();
    this.eventQueue = [];
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export const realTimeSyncManager = RealTimeSyncManager.getInstance();
export default realTimeSyncManager;