/**
 * Centralized Subscription Manager
 * Handles all real-time Supabase subscriptions with proper cleanup, deduplication, and error recovery
 */

import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface SubscriptionConfig {
  key: string
  channel: string
  table: string
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  filter?: string
  callback: (payload: any) => void
  retryCount?: number
  retryDelay?: number
  debounceMs?: number
}

interface ActiveSubscription {
  config: SubscriptionConfig
  channel: RealtimeChannel
  isActive: boolean
  retryCount: number
  createdAt: Date
  lastError?: Error
  refCount: number
  lastUsed: Date
  debounceTimer?: NodeJS.Timeout
}

interface CircuitBreakerState {
  failures: number
  lastFailureTime: Date
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

interface ConnectionPool {
  [channelKey: string]: {
    subscription: ActiveSubscription
    subscribers: Set<string>
  }
}

export class SubscriptionManager {
  private subscriptions = new Map<string, ActiveSubscription>()
  private connectionPool = new Map<string, { subscription: ActiveSubscription; subscribers: Set<string> }>()
  private circuitBreakers = new Map<string, CircuitBreakerState>()
  private debounceTimers = new Map<string, NodeJS.Timeout>()
  private maxRetries = 3
  private baseRetryDelay = 1000 // 1 second
  private cleanupInterval: NodeJS.Timeout | null = null
  private isDestroyed = false
  private defaultDebounceMs = 200
  private circuitBreakerThreshold = 5
  private circuitBreakerTimeout = 30000 // 30 seconds
  private maxPoolSize = 50

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
   * Subscribe to real-time changes with debouncing, connection pooling, and enhanced error handling
   */
  subscribe(config: SubscriptionConfig): { unsubscribe: () => void } {
    if (this.isDestroyed) {
      console.warn('⚠️ Attempted to subscribe after SubscriptionManager was destroyed')
      return { unsubscribe: () => {} }
    }

    // Check circuit breaker state
    if (this.isCircuitOpen(config.channel)) {
      console.warn(`⛔ Circuit breaker is open for channel: ${config.channel}`)
      return { unsubscribe: () => {} }
    }

    // Use connection pooling for identical channels
    const poolKey = this.getPoolKey(config)
    const pooled = this.connectionPool.get(poolKey)
    
    if (pooled && pooled.subscription.isActive) {
      // Add subscriber to existing pooled connection
      pooled.subscribers.add(config.key)
      pooled.subscription.refCount++
      pooled.subscription.lastUsed = new Date()
      console.log(`♻️ Using pooled connection for ${config.key} (refs: ${pooled.subscription.refCount})`)
      
      // Wrap callback to handle pooled subscriptions
      const originalCallback = config.callback
      config.callback = (payload) => {
        if (pooled.subscribers.has(config.key)) {
          originalCallback(payload)
        }
      }
      
      return {
        unsubscribe: () => this.unsubscribeFromPool(config.key, poolKey)
      }
    }

    // Check if individual subscription already exists
    const existing = this.subscriptions.get(config.key)
    if (existing && existing.isActive) {
      existing.refCount++
      existing.lastUsed = new Date()
      console.log(`🔄 Reusing existing subscription: ${config.key} (refs: ${existing.refCount})`)
      return { unsubscribe: () => this.unsubscribe(config.key) }
    }

    // Apply debouncing
    const debounceMs = config.debounceMs ?? this.defaultDebounceMs
    if (debounceMs > 0) {
      return this.subscribeWithDebounce(config, debounceMs)
    }

    console.log(`🔔 Creating new subscription: ${config.key}`)
    
    // Create new subscription
    const subscription = this.createSubscription(config)
    if (subscription) {
      this.subscriptions.set(config.key, subscription)
      
      // Add to connection pool if suitable
      if (this.shouldPool(config)) {
        this.connectionPool.set(poolKey, {
          subscription,
          subscribers: new Set([config.key])
        })
      }
    }

    return {
      unsubscribe: () => this.unsubscribe(config.key)
    }
  }

  /**
   * Apply debouncing to subscription creation
   */
  private subscribeWithDebounce(config: SubscriptionConfig, debounceMs: number): { unsubscribe: () => void } {
    const existingTimer = this.debounceTimers.get(config.key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(config.key)
      const subscription = this.createSubscription(config)
      if (subscription) {
        this.subscriptions.set(config.key, subscription)
      }
    }, debounceMs)

    this.debounceTimers.set(config.key, timer)

    return {
      unsubscribe: () => {
        const timer = this.debounceTimers.get(config.key)
        if (timer) {
          clearTimeout(timer)
          this.debounceTimers.delete(config.key)
        }
        this.unsubscribe(config.key)
      }
    }
  }

  /**
   * Generate pool key for connection pooling
   */
  private getPoolKey(config: SubscriptionConfig): string {
    return `${config.channel}:${config.table}:${config.event || '*'}:${config.filter || 'no-filter'}`
  }

  /**
   * Determine if subscription should use connection pooling
   */
  private shouldPool(config: SubscriptionConfig): boolean {
    // Pool connections for common patterns that are likely to be duplicated
    return config.table === 'schedule_entries' || 
           config.table === 'team_members' ||
           config.table === 'global_sprint_settings'
  }

  /**
   * Unsubscribe from pooled connection
   */
  private unsubscribeFromPool(key: string, poolKey: string): void {
    const pooled = this.connectionPool.get(poolKey)
    if (!pooled) return

    pooled.subscribers.delete(key)
    pooled.subscription.refCount = Math.max(0, pooled.subscription.refCount - 1)

    // If no more subscribers, cleanup the pooled connection
    if (pooled.subscribers.size === 0) {
      console.log(`🧹 Cleaning up empty pooled connection: ${poolKey}`)
      try {
        pooled.subscription.channel.unsubscribe()
      } catch (error) {
        console.warn(`Warning: Error cleaning up pooled connection ${poolKey}:`, error)
      }
      this.connectionPool.delete(poolKey)
    }
  }

  /**
   * Check circuit breaker state
   */
  private isCircuitOpen(channel: string): boolean {
    const breaker = this.circuitBreakers.get(channel)
    if (!breaker) return false

    if (breaker.state === 'OPEN') {
      // Check if we should try half-open
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime.getTime()
      if (timeSinceLastFailure > this.circuitBreakerTimeout) {
        breaker.state = 'HALF_OPEN'
        console.log(`🔄 Circuit breaker half-open for channel: ${channel}`)
      }
      return breaker.state === 'OPEN'
    }

    return false
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(channel: string): void {
    let breaker = this.circuitBreakers.get(channel)
    if (!breaker) {
      breaker = { failures: 0, lastFailureTime: new Date(), state: 'CLOSED' }
      this.circuitBreakers.set(channel, breaker)
    }

    breaker.failures++
    breaker.lastFailureTime = new Date()

    if (breaker.failures >= this.circuitBreakerThreshold) {
      breaker.state = 'OPEN'
      console.warn(`⛔ Circuit breaker opened for channel: ${channel} (${breaker.failures} failures)`)
    }
  }

  /**
   * Record circuit breaker success
   */
  private recordCircuitBreakerSuccess(channel: string): void {
    const breaker = this.circuitBreakers.get(channel)
    if (breaker) {
      breaker.failures = 0
      breaker.state = 'CLOSED'
    }
  }

  /**
   * Create a Supabase subscription with enhanced error handling
   */
  private createSubscription(config: SubscriptionConfig): ActiveSubscription | null {
    try {
      const channel = supabase.channel(config.channel)

      // Set up the subscription with simplified filter for realtime compatibility
      const subscriptionConfig: any = {
        event: config.event || '*',
        schema: 'public',
        table: config.table
      }

      // For realtime subscriptions, avoid complex date range filters
      // They can cause parsing issues. Instead, filter in the callback.
      if (config.filter && !config.filter.includes('date=')) {
        subscriptionConfig.filter = config.filter
      }

      const subscription = channel.on(
        'postgres_changes' as any,
        subscriptionConfig,
        (payload) => {
          try {
            // If we have a date filter, apply it in the callback
            if (config.filter && config.filter.includes('date=')) {
              if (this.matchesDateFilter(payload, config.filter)) {
                config.callback(payload)
              }
            } else {
              config.callback(payload)
            }
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
              sub.lastUsed = new Date()
              this.recordCircuitBreakerSuccess(config.channel)
              break
            case 'CHANNEL_ERROR':
              console.error(`❌ Subscription error: ${config.key}`)
              sub.isActive = false
              this.recordCircuitBreakerFailure(config.channel)
              this.handleSubscriptionError(config.key, new Error('Channel error'))
              break
            case 'TIMED_OUT':
              console.error(`⏰ Subscription timeout: ${config.key}`)
              sub.isActive = false
              this.recordCircuitBreakerFailure(config.channel)
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
        createdAt: new Date(),
        refCount: 1,
        lastUsed: new Date()
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
   * Check if a payload matches date filter criteria
   * Used for client-side filtering when realtime filters don't work properly
   */
  private matchesDateFilter(payload: any, filter: string): boolean {
    try {
      // Extract date from payload
      const record = payload.new || payload.old
      if (!record || !record.date) return false

      const recordDate = record.date

      // Parse filter string like "date=gte.2025-08-24&date=lte.2025-08-28"
      const filterParts = filter.split('&')
      
      for (const part of filterParts) {
        if (part.startsWith('date=gte.')) {
          const minDate = part.replace('date=gte.', '')
          if (recordDate < minDate) return false
        }
        
        if (part.startsWith('date=lte.')) {
          const maxDate = part.replace('date=lte.', '')
          if (recordDate > maxDate) return false
        }
      }

      return true
    } catch (error) {
      console.warn('Error parsing date filter:', error)
      return true // Default to include if parsing fails
    }
  }

  /**
   * Unsubscribe from a specific subscription with reference counting
   */
  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key)
    if (!subscription) return

    // Decrease reference count
    subscription.refCount = Math.max(0, subscription.refCount - 1)
    
    // Only actually unsubscribe if no more references
    if (subscription.refCount === 0) {
      console.log(`🔕 Unsubscribing: ${key} (final reference)`)
      
      // Clear debounce timer if exists
      if (subscription.debounceTimer) {
        clearTimeout(subscription.debounceTimer)
      }

      try {
        subscription.channel.unsubscribe()
        subscription.isActive = false
      } catch (error) {
        console.warn(`Warning: Error unsubscribing from ${key}:`, error)
      }

      this.subscriptions.delete(key)
      
      // Also remove from any pool
      for (const [poolKey, pooled] of this.connectionPool.entries()) {
        if (pooled.subscribers.has(key)) {
          this.unsubscribeFromPool(key, poolKey)
          break
        }
      }
    } else {
      console.log(`🔄 Decreased reference count for ${key} (refs: ${subscription.refCount})`)
    }
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
   * Clean up all subscriptions and prevent memory leaks
   */
  cleanup(): void {
    console.log(`🧹 Comprehensive cleanup: ${this.subscriptions.size} subscriptions, ${this.connectionPool.size} pooled connections`)

    // Clear all debounce timers
    for (const [key, timer] of this.debounceTimers) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    // Clean up individual subscriptions
    for (const [key, subscription] of this.subscriptions) {
      try {
        if (subscription.debounceTimer) {
          clearTimeout(subscription.debounceTimer)
        }
        subscription.channel.unsubscribe()
        subscription.isActive = false
      } catch (error) {
        console.warn(`Warning: Error cleaning up subscription ${key}:`, error)
      }
    }
    this.subscriptions.clear()

    // Clean up pooled connections
    for (const [poolKey, pooled] of this.connectionPool) {
      try {
        pooled.subscription.channel.unsubscribe()
      } catch (error) {
        console.warn(`Warning: Error cleaning up pooled connection ${poolKey}:`, error)
      }
    }
    this.connectionPool.clear()

    // Clear circuit breakers
    this.circuitBreakers.clear()

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.isDestroyed = true
  }

  /**
   * Start periodic cleanup of stale subscriptions and pooled connections
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const staleThreshold = 30 * 60 * 1000 // 30 minutes
      const unusedThreshold = 5 * 60 * 1000 // 5 minutes for unused connections

      // Clean up stale individual subscriptions
      for (const [key, subscription] of this.subscriptions) {
        const age = now - subscription.createdAt.getTime()
        const timeSinceUsed = now - subscription.lastUsed.getTime()
        
        // Clean up stale inactive subscriptions or unused ones
        if (!subscription.isActive && age > staleThreshold) {
          console.log(`🧹 Removing stale subscription: ${key}`)
          this.unsubscribe(key)
        } else if (subscription.refCount === 0 && timeSinceUsed > unusedThreshold) {
          console.log(`🧹 Removing unused subscription: ${key}`)
          this.unsubscribe(key)
        }
      }

      // Clean up unused pooled connections
      for (const [poolKey, pooled] of this.connectionPool) {
        const timeSinceUsed = now - pooled.subscription.lastUsed.getTime()
        
        if (pooled.subscribers.size === 0 && timeSinceUsed > unusedThreshold) {
          console.log(`🧹 Removing unused pooled connection: ${poolKey}`)
          try {
            pooled.subscription.channel.unsubscribe()
          } catch (error) {
            console.warn(`Warning: Error cleaning up pooled connection ${poolKey}:`, error)
          }
          this.connectionPool.delete(poolKey)
        }
      }

      // Reset circuit breakers that have been open too long
      for (const [channel, breaker] of this.circuitBreakers) {
        if (breaker.state === 'OPEN') {
          const timeSinceFailure = now - breaker.lastFailureTime.getTime()
          if (timeSinceFailure > this.circuitBreakerTimeout * 2) {
            console.log(`🔄 Resetting circuit breaker for channel: ${channel}`)
            breaker.state = 'CLOSED'
            breaker.failures = 0
          }
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
   * Get comprehensive memory and performance statistics
   */
  getMemoryStats(): {
    totalSubscriptions: number
    activeSubscriptions: number
    failedSubscriptions: number
    averageAge: number
    pooledConnections: number
    totalReferences: number
    circuitBreakers: number
    debounceTimers: number
    memoryEfficiency: number
  } {
    const subscriptions = Array.from(this.subscriptions.values())
    const now = Date.now()
    
    const active = subscriptions.filter(s => s.isActive).length
    const failed = subscriptions.filter(s => s.lastError).length
    const totalAge = subscriptions.reduce((sum, s) => sum + (now - s.createdAt.getTime()), 0)
    const averageAge = subscriptions.length > 0 ? totalAge / subscriptions.length : 0
    const totalRefs = subscriptions.reduce((sum, s) => sum + s.refCount, 0)
    
    // Calculate memory efficiency (higher is better)
    const pooledConnections = this.connectionPool.size
    const totalPossibleConnections = totalRefs
    const actualConnections = subscriptions.length + pooledConnections
    const memoryEfficiency = totalPossibleConnections > 0 
      ? Math.round((1 - (actualConnections / totalPossibleConnections)) * 100)
      : 100

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: active,
      failedSubscriptions: failed,
      averageAge: Math.round(averageAge / 1000), // in seconds
      pooledConnections,
      totalReferences: totalRefs,
      circuitBreakers: this.circuitBreakers.size,
      debounceTimers: this.debounceTimers.size,
      memoryEfficiency
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