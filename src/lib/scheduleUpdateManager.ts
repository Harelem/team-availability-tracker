/**
 * Enhanced Schedule Update Manager
 * 
 * Addresses UI blocking issues in calendar operations by:
 * 1. Request deduplication - prevents multiple concurrent updates
 * 2. Optimistic updates - instant UI feedback with rollback
 * 3. Non-blocking operations - all updates are truly async
 * 4. Debounced cache invalidation - prevents expensive cascading operations
 * 5. Proper error handling and retry logic
 */

import { supabase } from './supabase'
import { queryBatcher } from './QueryBatcher'
import { dataConsistencyManager, CacheKeys, CacheDependencies } from '@/utils/dataConsistencyManager'
import logger from '@/utils/logger'

// Types for optimistic updates
export interface OptimisticScheduleUpdate {
  memberId: number
  date: string
  value: '1' | '0.5' | 'X' | null
  reason?: string
  timestamp: number
  retryCount: number
  failed?: boolean
  rollbackData?: {
    originalValue: '1' | '0.5' | 'X' | null
    originalReason?: string
  }
}

// Types for pending updates
interface PendingUpdate {
  memberId: number
  date: string
  value: '1' | '0.5' | 'X' | null
  reason?: string
  resolve: (result: void) => void
  reject: (error: Error) => void
  timestamp: number
}

export class ScheduleUpdateManager {
  private pendingUpdates = new Map<string, PendingUpdate[]>()
  private optimisticUpdates = new Map<string, OptimisticScheduleUpdate>()
  private processingQueue = new Set<string>()
  private cacheInvalidationQueue = new Map<string, NodeJS.Timeout>()
  
  // Configuration
  private readonly DEBOUNCE_DELAY = 300 // ms - reduced from 500 for better responsiveness
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000 // ms
  private readonly CACHE_INVALIDATION_DELAY = 100 // ms - short delay for cache operations
  
  /**
   * Main update method - non-blocking with optimistic updates
   */
  async updateScheduleEntry(
    memberId: number,
    date: string,
    value: '1' | '0.5' | 'X' | null,
    reason?: string,
    options: {
      skipOptimistic?: boolean
      priority?: 'high' | 'normal'
    } = {}
  ): Promise<void> {
    const key = `${memberId}-${date}`
    const { skipOptimistic = false, priority = 'normal' } = options
    
    logger.info(`🚀 updateScheduleEntry called for member ${memberId} on ${date} with value ${value} (priority: ${priority})`, 'scheduleUpdate')
    
    // 1. Apply optimistic update immediately if not skipped
    if (!skipOptimistic) {
      logger.debug(`🔮 Applying optimistic update for ${key}`, 'scheduleUpdate')
      this.applyOptimisticUpdate(memberId, date, value, reason)
    } else {
      logger.debug(`⏭️ Skipping optimistic update for ${key}`, 'scheduleUpdate')
    }
    
    // 2. Return immediately for UI responsiveness, process asynchronously
    return new Promise<void>((resolve, reject) => {
      // Add to pending updates queue (deduplication happens here)
      if (!this.pendingUpdates.has(key)) {
        this.pendingUpdates.set(key, [])
      }
      
      const pending: PendingUpdate = {
        memberId,
        date,
        value,
        reason,
        resolve,
        reject,
        timestamp: Date.now()
      }
      
      this.pendingUpdates.get(key)!.push(pending)
      const queueLength = this.pendingUpdates.get(key)!.length
      
      logger.debug(`📝 Added to pending queue: ${key} (queue length: ${queueLength})`, 'scheduleUpdate')
      
      // Process the queue asynchronously (non-blocking)
      if (priority === 'high') {
        // High priority - process immediately
        logger.debug(`⚡ High priority: scheduling immediate processing for ${key}`, 'scheduleUpdate')
        setTimeout(() => this.processUpdateQueue(key), 0)
      } else {
        // Normal priority - debounced processing
        logger.debug(`⏰ Normal priority: scheduling debounced processing for ${key}`, 'scheduleUpdate')
        this.scheduleQueueProcessing(key)
      }
    })
  }
  
  /**
   * Apply optimistic update for instant UI feedback
   */
  private applyOptimisticUpdate(
    memberId: number,
    date: string,
    value: '1' | '0.5' | 'X' | null,
    reason?: string
  ): void {
    const key = `${memberId}-${date}`
    
    // Store rollback data from current optimistic state or fetch from cache
    let rollbackData: OptimisticScheduleUpdate['rollbackData']
    const existing = this.optimisticUpdates.get(key)
    
    if (existing && !existing.failed) {
      // Use existing rollback data if we're chaining updates
      rollbackData = existing.rollbackData
    } else {
      // This would normally fetch from cache or store, simplified for now
      rollbackData = {
        originalValue: null, // Would be fetched from current state
        originalReason: undefined
      }
    }
    
    const optimisticUpdate: OptimisticScheduleUpdate = {
      memberId,
      date,
      value,
      reason,
      timestamp: Date.now(),
      retryCount: 0,
      rollbackData
    }
    
    this.optimisticUpdates.set(key, optimisticUpdate)
    
    // Emit optimistic update event for UI components
    this.emitOptimisticUpdate(key, optimisticUpdate)
    
    logger.debug(`Applied optimistic update for member ${memberId} on ${date} with value ${value}`, 'scheduleUpdate')
    
    // Immediately update the specific cache entry with optimistic data
    const scheduleEntryKey = CacheKeys.SCHEDULE_ENTRY(memberId, date);
    const optimisticData = {
      member_id: memberId,
      date,
      value,
      reason: reason || null,
      updated_at: new Date().toISOString(),
      optimistic: true // Mark as optimistic
    };
    
    // Perform immediate surgical update for responsive UI
    dataConsistencyManager.updateCacheEntry(scheduleEntryKey, optimisticData);
  }
  
  /**
   * Schedule queue processing with debouncing
   */
  private scheduleQueueProcessing(key: string): void {
    // Clear existing timeout for this key
    if (this.cacheInvalidationQueue.has(key)) {
      clearTimeout(this.cacheInvalidationQueue.get(key)!)
      logger.debug(`🧹 Cleared existing timeout for ${key}`, 'scheduleUpdate')
    }
    
    // Schedule processing
    const timeout = setTimeout(async () => {
      try {
        logger.debug(`⏰ Debounce timeout triggered for ${key}`, 'scheduleUpdate')
        await this.processUpdateQueue(key)
        logger.debug(`✅ Debounced processing completed for ${key}`, 'scheduleUpdate')
      } catch (error) {
        logger.error(`💥 Debounced processing failed for ${key}: ${error}`, 'scheduleUpdate')
      } finally {
        this.cacheInvalidationQueue.delete(key)
      }
    }, this.DEBOUNCE_DELAY)
    
    this.cacheInvalidationQueue.set(key, timeout)
    logger.debug(`⏲️ Scheduled debounced processing for ${key} (delay: ${this.DEBOUNCE_DELAY}ms)`, 'scheduleUpdate')
  }
  
  /**
   * Process the update queue for a specific key (with deduplication)
   */
  private async processUpdateQueue(key: string): Promise<void> {
    logger.debug(`📋 processUpdateQueue called for key: ${key}`, 'scheduleUpdate')
    
    // Prevent concurrent processing of the same key
    if (this.processingQueue.has(key)) {
      logger.debug(`⏭️ Skipping ${key} - already processing`, 'scheduleUpdate')
      return
    }
    
    const pendingList = this.pendingUpdates.get(key)
    if (!pendingList || pendingList.length === 0) {
      logger.debug(`⏭️ No pending updates for ${key}`, 'scheduleUpdate')
      return
    }
    
    // Mark as processing
    this.processingQueue.add(key)
    logger.info(`🚀 Processing update queue for ${key} with ${pendingList.length} pending updates`, 'scheduleUpdate')
    
    try {
      // Get the latest update (deduplication - only the last update matters)
      const latestUpdate = pendingList[pendingList.length - 1]
      const { memberId, date, value, reason } = latestUpdate
      
      logger.debug(`🔄 Deduplication: Using latest update for member ${memberId} on ${date} with value ${value}`, 'scheduleUpdate')
      
      // Use QueryBatcher to prevent duplicate requests
      const batchKey = `schedule_update_${key}`
      logger.debug(`🔗 Using QueryBatcher with key: ${batchKey}`, 'scheduleUpdate')
      
      await queryBatcher.execute(
        batchKey,
        () => this.performDatabaseUpdate(memberId, date, value, reason),
        { 
          ttl: 0, // No caching for updates
          skipCache: true,
          timeout: 10000 
        }
      )
      
      // Success - resolve all pending promises
      logger.debug(`✅ Resolving ${pendingList.length} pending promises for ${key}`, 'scheduleUpdate')
      pendingList.forEach(pending => pending.resolve())
      
      // Remove optimistic update
      this.removeOptimisticUpdate(key, true)
      
      // Schedule optimized cache operations (surgical updates + targeted invalidation)
      this.scheduleOptimizedCacheUpdate(memberId, date, value, reason, this.getTeamIdFromCache(memberId))
      
      logger.success(`🎯 Successfully processed update queue for ${key} with ${pendingList.length} updates`, 'scheduleUpdate')
      
    } catch (error) {
      logger.error(`💥 Failed to process update queue for ${key}: ${error}`, 'scheduleUpdate')
      
      // Handle retry logic
      await this.handleUpdateFailure(key, error as Error, pendingList)
      
    } finally {
      // Clear processing state and pending updates
      this.processingQueue.delete(key)
      this.pendingUpdates.delete(key)
      logger.debug(`🧹 Cleanup completed for ${key}`, 'scheduleUpdate')
    }
  }
  
  /**
   * Perform the actual database update
   */
  private async performDatabaseUpdate(
    memberId: number,
    date: string,
    value: '1' | '0.5' | 'X' | null,
    reason?: string
  ): Promise<void> {
    logger.info(`🔄 Starting database update for member ${memberId} on ${date} with value ${value}`, 'scheduleUpdate')
    
    if (!supabase) {
      const error = 'Supabase not configured'
      logger.error(`❌ ${error}`, 'scheduleUpdate')
      throw new Error(error)
    }
    
    try {
      if (value === null) {
        // Delete the entry
        logger.debug(`🗑️ Deleting schedule entry for member ${memberId} on ${date}`, 'scheduleUpdate')
        
        const { error, count } = await supabase
          .from('schedule_entries')
          .delete()
          .eq('member_id', memberId)
          .eq('date', date)
        
        if (error) {
          logger.error(`❌ Failed to delete schedule entry: ${error.message}`, 'scheduleUpdate', error)
          throw new Error(`Failed to delete schedule entry: ${error.message}`)
        }
        
        logger.success(`✅ Successfully deleted schedule entry for member ${memberId} on ${date} (affected rows: ${count || 'unknown'})`, 'scheduleUpdate')
        
        // CRITICAL: Verify the deletion by checking the entry no longer exists
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for transaction commitment
        
        const { data: verificationData, error: verificationError } = await supabase
          .from('schedule_entries')
          .select('id')
          .eq('member_id', memberId)
          .eq('date', date)
          .maybeSingle()
        
        if (verificationError) {
          const errorMsg = `Database delete verification failed: ${verificationError.message}`
          logger.error(`❌ ${errorMsg}`, 'scheduleUpdate')
          throw new Error(errorMsg)
        } else if (verificationData) {
          const errorMsg = `Database delete verification failed: Entry still exists with id=${verificationData.id}`
          logger.error(`❌ ${errorMsg}`, 'scheduleUpdate')
          throw new Error(errorMsg)
        } else {
          logger.success(`🔍 Delete verification PASSED: Entry successfully removed from database`, 'scheduleUpdate')
        }
      } else {
        // Upsert the entry
        logger.debug(`💾 Upserting schedule entry for member ${memberId} on ${date} with value ${value} and reason: ${reason || 'none'}`, 'scheduleUpdate')
        
        const { error, data, count } = await supabase
          .from('schedule_entries')
          .upsert({
            member_id: memberId,
            date,
            value,
            reason: reason || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'member_id,date' })
        
        if (error) {
          logger.error(`❌ Failed to upsert schedule entry: ${error.message}`, 'scheduleUpdate', error)
          throw new Error(`Failed to update schedule entry: ${error.message}`)
        }
        
        logger.success(`✅ Successfully upserted schedule entry for member ${memberId} on ${date} (affected rows: ${count || 'unknown'})`, 'scheduleUpdate')
        
        // CRITICAL: Verify the write by reading back the data with delay to ensure transaction commitment
        await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for transaction commitment
        
        const { data: verificationData, error: verificationError } = await supabase
          .from('schedule_entries')
          .select('id, member_id, date, value, reason, updated_at')
          .eq('member_id', memberId)
          .eq('date', date)
          .single()
        
        if (verificationError) {
          const errorMsg = `Database write verification failed: ${verificationError.message}`
          logger.error(`❌ ${errorMsg}`, 'scheduleUpdate')
          throw new Error(errorMsg)
        } else {
          const valueMatches = verificationData.value === value
          const reasonMatches = verificationData.reason === (reason || null)
          
          if (!valueMatches || !reasonMatches) {
            const errorMsg = `Database write verification failed: Expected value=${value}, reason=${reason || null}, but got value=${verificationData.value}, reason=${verificationData.reason}`
            logger.error(`❌ ${errorMsg}`, 'scheduleUpdate')
            throw new Error(errorMsg)
          }
          
          logger.success(`🔍 Verification PASSED: Database contains correct entry with value=${verificationData.value} and reason=${verificationData.reason || 'none'}`, 'scheduleUpdate')
        }
      }

      // Mark local update to prevent subscription loops
      await this.markLocalUpdateForMember(memberId, date)
      
      logger.success(`🎉 Database update completed successfully for member ${memberId} on ${date}`, 'scheduleUpdate')
    } catch (error) {
      logger.error(`💥 Database update failed for member ${memberId} on ${date}: ${error}`, 'scheduleUpdate', error)
      throw error
    }
  }

  /**
   * Mark local update for a team member's schedule entry
   */
  private async markLocalUpdateForMember(memberId: number, date: string): Promise<void> {
    try {
      // Get member's team ID to mark the appropriate subscription
      const { data: memberData, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('id', memberId)
        .single()
      
      if (error || !memberData) {
        console.warn(`Could not find team for member ${memberId}, skipping local update marking`)
        return
      }

      // Calculate date range (current week) for subscription key
      const dateObj = new Date(date)
      const startOfWeek = new Date(dateObj)
      startOfWeek.setDate(dateObj.getDate() - dateObj.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const startDate = startOfWeek.toISOString().split('T')[0]
      const endDate = endOfWeek.toISOString().split('T')[0]

      // Import and use the subscription helpers to mark local update
      const { subscriptionHelpers } = await import('./SubscriptionManager')
      const subscriptionKey = `schedule_changes_team_${memberData.team_id}_${startDate}_${endDate}`
      subscriptionHelpers.markLocalUpdate(subscriptionKey, 3000) // 3 second timeout
      
      console.log(`🔄 Marked local update for subscription: ${subscriptionKey}`)
    } catch (error) {
      // Don't fail the update if we can't mark local update
      console.warn('Failed to mark local update:', error)
    }
  }
  
  /**
   * Handle update failures with retry logic
   */
  private async handleUpdateFailure(
    key: string,
    error: Error,
    pendingList: PendingUpdate[]
  ): Promise<void> {
    const optimisticUpdate = this.optimisticUpdates.get(key)
    
    if (optimisticUpdate && optimisticUpdate.retryCount < this.MAX_RETRIES) {
      // Mark as failed but keep for retry
      optimisticUpdate.failed = true
      optimisticUpdate.retryCount++
      
      logger.warn(`Update failed, retrying (${optimisticUpdate.retryCount}/${this.MAX_RETRIES}): ${error.message}`, 'scheduleUpdate')
      
      // Schedule retry
      setTimeout(() => {
        this.processUpdateQueue(key)
      }, this.RETRY_DELAY * optimisticUpdate.retryCount)
      
    } else {
      // Max retries reached - rollback optimistic update and reject promises
      this.removeOptimisticUpdate(key, false)
      
      pendingList.forEach(pending => {
        pending.reject(new Error(
          `Failed to update schedule after ${this.MAX_RETRIES} retries: ${error.message}`
        ))
      })
    }
  }
  
  /**
   * Remove optimistic update and optionally emit success event
   */
  private removeOptimisticUpdate(key: string, success: boolean): void {
    const optimisticUpdate = this.optimisticUpdates.get(key)
    
    if (optimisticUpdate) {
      if (!success) {
        // Rollback to original state
        this.emitOptimisticRollback(key, optimisticUpdate)
      }
      
      this.optimisticUpdates.delete(key)
      logger.debug(`Removed optimistic update for ${key}, success: ${success}`, 'scheduleUpdate')
    }
  }
  
  /**
   * Schedule optimized cache operations (surgical updates instead of invalidation)
   */
  private scheduleOptimizedCacheUpdate(
    memberId: number, 
    date: string, 
    newValue: '1' | '0.5' | 'X' | null,
    reason?: string,
    teamId?: number
  ): void {
    // Use setTimeout(0) to ensure this runs after current execution context (browser-compatible)
    setTimeout(() => {
      // Use another timeout to make it truly non-blocking
      setTimeout(async () => {
        try {
          // SURGICAL CACHE UPDATE: Update specific entries instead of invalidating
          const scheduleEntryKey = CacheKeys.SCHEDULE_ENTRY(memberId, date);
          const newData = {
            member_id: memberId,
            date,
            value: newValue,
            reason: reason || null,
            updated_at: new Date().toISOString()
          };
          
          // Use surgical update instead of invalidation
          dataConsistencyManager.updateCacheEntry(
            scheduleEntryKey,
            newData,
            CacheDependencies.SCHEDULE_ENTRY_DEPS(memberId, date, teamId)
          );
          
          // Only invalidate aggregated cache entries that actually need recalculation
          const cacheKeysToInvalidate = [
            CacheKeys.MEMBER_SCHEDULE(memberId),
            // Only invalidate team-specific caches if we know the team
            ...(teamId ? [
              CacheKeys.TEAM_DASHBOARD_DATA(teamId),
              CacheKeys.CAPACITY_DATA(teamId, date)
            ] : [])
          ];
          
          // Use surgical invalidation for targeted cache clearing
          dataConsistencyManager.surgicalInvalidate(
            cacheKeysToInvalidate,
            {
              includeDependent: false, // Don't cascade - prevent expensive recalculations
              priority: 'low' // Low priority to prevent UI blocking
            }
          );
          
          logger.debug(
            `Optimized cache update completed for member ${memberId} on ${date} (team: ${teamId || 'unknown'})`, 
            'scheduleUpdate'
          );
        } catch (error) {
          logger.warn(`Optimized cache update failed (non-critical): ${error}`, 'scheduleUpdate');
        }
      }, this.CACHE_INVALIDATION_DELAY)
    })
  }
  
  /**
   * Emit optimistic update event (for UI components to listen)
   */
  private emitOptimisticUpdate(key: string, update: OptimisticScheduleUpdate): void {
    // Emit custom event that UI components can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('schedule-optimistic-update', {
        detail: { key, update }
      }))
    }
  }
  
  /**
   * Emit rollback event
   */
  private emitOptimisticRollback(key: string, update: OptimisticScheduleUpdate): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('schedule-optimistic-rollback', {
        detail: { key, update }
      }))
    }
  }
  
  /**
   * Get current optimistic updates (for UI state)
   */
  getOptimisticUpdates(): Map<string, OptimisticScheduleUpdate> {
    return new Map(this.optimisticUpdates)
  }
  
  /**
   * Get optimistic value for a specific member/date
   */
  getOptimisticValue(memberId: number, date: string): OptimisticScheduleUpdate | null {
    const key = `${memberId}-${date}`
    return this.optimisticUpdates.get(key) || null
  }
  
  /**
   * Force process all pending updates (useful for cleanup)
   */
  async flushPendingUpdates(): Promise<void> {
    const allKeys = Array.from(this.pendingUpdates.keys())
    const promises = allKeys.map(key => this.processUpdateQueue(key))
    await Promise.allSettled(promises)
  }
  
  /**
   * Clear all optimistic updates (useful for cleanup/refresh)
   */
  clearOptimisticUpdates(): void {
    this.optimisticUpdates.clear()
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('schedule-optimistic-clear'))
    }
  }
  
  /**
   * Helper method to get team ID from cache or member data
   */
  private getTeamIdFromCache(memberId: number): number | undefined {
    try {
      // Try to get team ID from cached team members data
      const teamMembersKey = CacheKeys.TEAM_MEMBERS();
      const teamMembersData = dataConsistencyManager.getCachedData<any[]>(teamMembersKey);
      
      if (teamMembersData) {
        const member = teamMembersData.find(m => m.id === memberId || m.member_id === memberId);
        return member?.team_id;
      }
      
      return undefined;
    } catch (error) {
      logger.warn(`Failed to get team ID for member ${memberId}: ${error}`, 'scheduleUpdate');
      return undefined;
    }
  }
  
  /**
   * EMERGENCY DEBUG: Direct database update bypassing the async queue system
   * This is a simplified version to test if the issue is in the queue management
   */
  async updateScheduleEntryDirect(
    memberId: number,
    date: string,
    value: '1' | '0.5' | 'X' | null,
    reason?: string
  ): Promise<void> {
    logger.info(`🚨 EMERGENCY DIRECT UPDATE for member ${memberId} on ${date} with value ${value}`, 'scheduleUpdate')
    
    try {
      // Apply optimistic update
      this.applyOptimisticUpdate(memberId, date, value, reason)
      
      // Perform database update directly (no queue, no batch, no timeout)
      await this.performDatabaseUpdate(memberId, date, value, reason)
      
      // Remove optimistic update on success
      const key = `${memberId}-${date}`
      this.removeOptimisticUpdate(key, true)
      
      // Schedule cache update
      this.scheduleOptimizedCacheUpdate(memberId, date, value, reason, this.getTeamIdFromCache(memberId))
      
      logger.success(`🚨 EMERGENCY DIRECT UPDATE completed successfully for member ${memberId} on ${date}`, 'scheduleUpdate')
    } catch (error) {
      logger.error(`🚨 EMERGENCY DIRECT UPDATE failed for member ${memberId} on ${date}: ${error}`, 'scheduleUpdate')
      
      // Remove optimistic update on failure
      const key = `${memberId}-${date}`
      this.removeOptimisticUpdate(key, false)
      
      throw error
    }
  }

  /**
   * Get manager statistics
   */
  getStats() {
    return {
      pendingUpdatesCount: Array.from(this.pendingUpdates.values())
        .reduce((total, list) => total + list.length, 0),
      optimisticUpdatesCount: this.optimisticUpdates.size,
      processingQueueSize: this.processingQueue.size,
      cacheInvalidationQueueSize: this.cacheInvalidationQueue.size,
      cacheStats: dataConsistencyManager.getOptimizedCacheStats()
    }
  }
}

// Global instance
export const scheduleUpdateManager = new ScheduleUpdateManager()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    scheduleUpdateManager.flushPendingUpdates().catch(error => {
      logger.error(`Failed to flush updates on unload: ${error}`, 'scheduleUpdate')
    })
  })
}