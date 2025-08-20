/**
 * Centralized Subscription Manager
 * Handles all real-time Supabase subscriptions with proper cleanup, deduplication, and error recovery
 */

import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface SubscriptionConfig {
  key: string
  channel: string
  table: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  filter?: string
  callback: (payload: any) => void
  retryCount?: number
  retryDelay?: number
}

interface ActiveSubscription {
  config: SubscriptionConfig
  channel: RealtimeChannel
  isActive: boolean
  retryCount: number
  createdAt: Date
  lastError?: Error
}

export class SubscriptionManager {
  private subscriptions = new Map<string, ActiveSubscription>()
  private maxRetries = 3
  private baseRetryDelay = 1000 // 1 second
  private cleanupInterval: NodeJS.Timeout | null = null
  private isDestroyed = false

  constructor() {
    // Start periodic cleanup
    this.startCleanupInterval()
    
    // Handle browser events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup())
      window.addEventListener('pagehide', () => this.cleanup())
    }
  }

  /**
   * Subscribe to real-time changes with automatic retry and error handling
   */
  subscribe(config: SubscriptionConfig): { unsubscribe: () => void } {
    if (this.isDestroyed) {
      console.warn('⚠️ Attempted to subscribe after SubscriptionManager was destroyed')
      return { unsubscribe: () => {} }
    }

    // Check if subscription already exists
    const existing = this.subscriptions.get(config.key)
    if (existing && existing.isActive) {
      console.log(`🔄 Reusing existing subscription: ${config.key}`)
      return { unsubscribe: () => this.unsubscribe(config.key) }
    }

    console.log(`🔔 Creating new subscription: ${config.key}`)
    
    // Create new subscription
    const subscription = this.createSubscription(config)
    if (subscription) {
      this.subscriptions.set(config.key, subscription)
    }

    return {
      unsubscribe: () => this.unsubscribe(config.key)
    }
  }

  /**
   * Create a Supabase subscription with error handling
   */
  private createSubscription(config: SubscriptionConfig): ActiveSubscription | null {
    try {
      const channel = supabase.channel(config.channel)

      // Set up the subscription
      const subscription = channel.on(
        'postgres_changes',
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          ...(config.filter && { filter: config.filter })
        },
        (payload) => {
          try {
            config.callback(payload)
          } catch (error) {
            console.error(`❌ Error in subscription callback for ${config.key}:`, error)
            this.handleSubscriptionError(config.key, error as Error)
          }
        }
      )

      // Subscribe to the channel
      subscription.subscribe((status) => {
        const sub = this.subscriptions.get(config.key)
        if (sub) {
          switch (status) {
            case 'SUBSCRIBED':
              console.log(`✅ Subscription active: ${config.key}`)
              sub.isActive = true
              sub.retryCount = 0
              break
            case 'CHANNEL_ERROR':
              console.error(`❌ Subscription error: ${config.key}`)
              sub.isActive = false
              this.handleSubscriptionError(config.key, new Error('Channel error'))
              break
            case 'TIMED_OUT':
              console.error(`⏰ Subscription timeout: ${config.key}`)
              sub.isActive = false
              this.handleSubscriptionError(config.key, new Error('Subscription timeout'))
              break
            case 'CLOSED':
              console.log(`🔕 Subscription closed: ${config.key}`)
              sub.isActive = false
              break
          }
        }
      })

      return {
        config,
        channel: subscription,
        isActive: false,
        retryCount: 0,
        createdAt: new Date()
      }
    } catch (error) {
      console.error(`❌ Failed to create subscription ${config.key}:`, error)
      return null
    }
  }

  /**
   * Handle subscription errors with exponential backoff retry
   */
  private handleSubscriptionError(key: string, error: Error): void {
    const subscription = this.subscriptions.get(key)
    if (!subscription) return

    subscription.lastError = error
    subscription.retryCount++

    if (subscription.retryCount <= this.maxRetries) {
      const delay = this.baseRetryDelay * Math.pow(2, subscription.retryCount - 1)
      console.log(`🔄 Retrying subscription ${key} in ${delay}ms (attempt ${subscription.retryCount}/${this.maxRetries})`)
      
      setTimeout(() => {
        if (!this.isDestroyed && this.subscriptions.has(key)) {
          this.retrySubscription(key)
        }
      }, delay)
    } else {
      console.error(`🚫 Max retries exceeded for subscription ${key}`)
      this.unsubscribe(key)
    }
  }

  /**
   * Retry a failed subscription
   */
  private retrySubscription(key: string): void {
    const subscription = this.subscriptions.get(key)
    if (!subscription) return

    console.log(`🔄 Retrying subscription: ${key}`)
    
    // Cleanup old subscription
    try {
      subscription.channel.unsubscribe()
    } catch (error) {
      console.warn(`Warning: Error cleaning up failed subscription ${key}:`, error)
    }

    // Create new subscription
    const newSubscription = this.createSubscription(subscription.config)
    if (newSubscription) {
      this.subscriptions.set(key, newSubscription)
    } else {
      this.subscriptions.delete(key)
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key)
    if (!subscription) return

    console.log(`🔕 Unsubscribing: ${key}`)

    try {
      subscription.channel.unsubscribe()
      subscription.isActive = false
    } catch (error) {
      console.warn(`Warning: Error unsubscribing from ${key}:`, error)
    }

    this.subscriptions.delete(key)
  }

  /**
   * Get subscription status information
   */
  getSubscriptionStatus(key: string): {
    exists: boolean
    isActive: boolean
    retryCount: number
    createdAt?: Date
    lastError?: Error
  } {
    const subscription = this.subscriptions.get(key)
    
    if (!subscription) {
      return { exists: false, isActive: false, retryCount: 0 }
    }

    return {
      exists: true,
      isActive: subscription.isActive,
      retryCount: subscription.retryCount,
      createdAt: subscription.createdAt,
      lastError: subscription.lastError
    }
  }

  /**
   * Get all subscription statuses for debugging
   */
  getAllSubscriptions(): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const [key, subscription] of this.subscriptions) {
      result[key] = {
        channel: subscription.config.channel,
        table: subscription.config.table,
        isActive: subscription.isActive,
        retryCount: subscription.retryCount,
        createdAt: subscription.createdAt,
        lastError: subscription.lastError?.message
      }
    }

    return result
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    console.log(`🧹 Cleaning up ${this.subscriptions.size} subscriptions`)

    for (const [key] of this.subscriptions) {
      this.unsubscribe(key)
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.isDestroyed = true
  }

  /**
   * Start periodic cleanup of stale subscriptions
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const staleThreshold = 30 * 60 * 1000 // 30 minutes

      for (const [key, subscription] of this.subscriptions) {
        const age = now - subscription.createdAt.getTime()
        
        // Clean up stale inactive subscriptions
        if (!subscription.isActive && age > staleThreshold) {
          console.log(`🧹 Removing stale subscription: ${key}`)
          this.unsubscribe(key)
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  /**
   * Force reconnect all active subscriptions (useful after network issues)
   */
  reconnectAll(): void {
    console.log('🔄 Forcing reconnection of all subscriptions')
    
    const activeSubscriptions = Array.from(this.subscriptions.entries())
      .filter(([, sub]) => sub.isActive)

    for (const [key, subscription] of activeSubscriptions) {
      console.log(`🔄 Reconnecting: ${key}`)
      this.retrySubscription(key)
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalSubscriptions: number
    activeSubscriptions: number
    failedSubscriptions: number
    averageAge: number
  } {
    const subscriptions = Array.from(this.subscriptions.values())
    const now = Date.now()
    
    const active = subscriptions.filter(s => s.isActive).length
    const failed = subscriptions.filter(s => s.lastError).length
    const totalAge = subscriptions.reduce((sum, s) => sum + (now - s.createdAt.getTime()), 0)
    const averageAge = subscriptions.length > 0 ? totalAge / subscriptions.length : 0

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: active,
      failedSubscriptions: failed,
      averageAge: Math.round(averageAge / 1000) // in seconds
    }
  }
}

// Global instance
export const subscriptionManager = new SubscriptionManager()

// Convenience functions for common subscription patterns
export const subscriptionHelpers = {
  /**
   * Subscribe to schedule entry changes for a team and date range
   */
  subscribeToScheduleChanges(
    startDate: string,
    endDate: string,
    teamId: number,
    callback: (payload: any) => void
  ) {
    return subscriptionManager.subscribe({
      key: `schedule_changes_team_${teamId}_${startDate}_${endDate}`,
      channel: `schedule_changes_team_${teamId}`,
      table: 'schedule_entries',
      filter: `date=gte.${startDate}&date=lte.${endDate}`,
      callback
    })
  },

  /**
   * Subscribe to team member changes
   */
  subscribeToTeamMemberChanges(teamId: number, callback: (payload: any) => void) {
    return subscriptionManager.subscribe({
      key: `team_members_${teamId}`,
      channel: `team_members_${teamId}`,
      table: 'team_members',
      filter: `team_id.eq.${teamId}`,
      callback
    })
  },

  /**
   * Subscribe to global sprint changes
   */
  subscribeToSprintChanges(callback: (payload: any) => void) {
    return subscriptionManager.subscribe({
      key: 'sprint_changes',
      channel: 'sprint_changes',
      table: 'global_sprint_settings',
      callback
    })
  }
}

// Clean up on app termination
if (typeof window !== 'undefined') {
  // Browser cleanup
  window.addEventListener('beforeunload', () => subscriptionManager.cleanup())
} else {
  // Node.js cleanup
  process.on('exit', () => subscriptionManager.cleanup())
  process.on('SIGINT', () => subscriptionManager.cleanup())
  process.on('SIGTERM', () => subscriptionManager.cleanup())
}