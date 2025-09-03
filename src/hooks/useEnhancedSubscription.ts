/**
 * Enhanced React hooks for optimized subscription management
 * Provides easy-to-use hooks that leverage the enhanced SubscriptionManager
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { subscriptionManager, type SubscriptionConfig } from '../lib/SubscriptionManager'

/**
 * Enhanced hook for real-time subscriptions with automatic cleanup and optimization
 */
export function useEnhancedSubscription<T = any>(
  config: Omit<SubscriptionConfig, 'callback'> | null,
  options: {
    throttleMs?: number
    debounceMs?: number
    enabled?: boolean
  } = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStats, setConnectionStats] = useState<ReturnType<typeof subscriptionManager.getMemoryStats> | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const { enabled = true, throttleMs = 1000, debounceMs = 200 } = options

  const handleData = useCallback((payload: any) => {
    const now = Date.now()
    
    // Additional throttling at hook level to prevent React state flooding
    if (now - lastUpdateRef.current < throttleMs) {
      return
    }
    
    lastUpdateRef.current = now
    setData(payload)
    setError(null)
    setIsConnected(true)
    
    // Update connection stats periodically (less frequent)
    if (Math.random() < 0.1) { // 10% chance to update stats
      setConnectionStats(subscriptionManager.getMemoryStats())
    }
  }, [throttleMs])

  const handleError = useCallback((err: Error) => {
    setError(err)
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (!config || !enabled) {
      // Cleanup any existing subscription if disabled
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      setIsConnected(false)
      return
    }

    const subscriptionConfig: SubscriptionConfig = {
      ...config,
      callback: handleData,
      debounceMs: debounceMs,
      throttleMs: throttleMs
    }

    try {
      const { unsubscribe } = subscriptionManager.subscribe(subscriptionConfig)
      unsubscribeRef.current = unsubscribe
      
      // Check connection status
      const status = subscriptionManager.getSubscriptionStatus(config.key)
      setIsConnected(status.isActive)
      
    } catch (err) {
      handleError(err as Error)
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [
    config?.key, 
    config?.channel, 
    config?.table, 
    config?.filter, 
    enabled, 
    throttleMs, 
    debounceMs, 
    handleData, 
    handleError
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  return {
    data,
    error,
    isConnected,
    connectionStats,
    reconnect: () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      subscriptionManager.reconnectAll()
    }
  }
}

/**
 * Hook for team-specific schedule subscriptions with optimized pooling
 */
export function useTeamScheduleSubscription(
  teamId: number, 
  startDate: string, 
  endDate: string,
  options: { 
    enabled?: boolean
    debounceMs?: number
    throttleMs?: number
  } = {}
) {
  const { enabled = true, debounceMs = 200, throttleMs = 1000 } = options

  const config = enabled ? {
    key: `team_schedule_${teamId}_${startDate}_${endDate}`,
    channel: `team_schedule_${teamId}`,
    table: 'schedule_entries' as const,
    filter: `date=gte.${startDate}&date=lte.${endDate}`
  } : null

  return useEnhancedSubscription(config, { enabled, debounceMs, throttleMs })
}

/**
 * Hook for global sprint changes subscription
 */
export function useSprintChangesSubscription(
  options: { 
    enabled?: boolean
    throttleMs?: number
  } = {}
) {
  const { enabled = true, throttleMs = 500 } = options

  const config = enabled ? {
    key: 'global_sprint_changes',
    channel: 'sprint_changes',
    table: 'global_sprint_settings' as const
  } : null

  return useEnhancedSubscription(config, { enabled, throttleMs, debounceMs: 100 })
}

/**
 * Hook for team member changes subscription
 */
export function useTeamMemberChangesSubscription(
  teamId: number, 
  options: { 
    enabled?: boolean
    throttleMs?: number
  } = {}
) {
  const { enabled = true, throttleMs = 2000 } = options

  const config = enabled ? {
    key: `team_members_${teamId}`,
    channel: `team_members_${teamId}`,
    table: 'team_members' as const,
    filter: `team_id.eq.${teamId}`
  } : null

  return useEnhancedSubscription(config, { enabled, throttleMs, debounceMs: 300 })
}

/**
 * Hook for multiple subscriptions with shared connection pooling
 */
export function useMultipleSubscriptions(configs: Array<Omit<SubscriptionConfig, 'callback'>>) {
  const [subscriptions, setSubscriptions] = useState<Record<string, {
    data: any
    error: Error | null
    isConnected: boolean
  }>>({})
  const [globalStats, setGlobalStats] = useState<ReturnType<typeof subscriptionManager.getMemoryStats> | null>(null)
  const unsubscribeRefs = useRef<Record<string, () => void>>({})

  const updateSubscription = useCallback((key: string, data: any, error: Error | null, isConnected: boolean) => {
    setSubscriptions(prev => ({
      ...prev,
      [key]: { data, error, isConnected }
    }))
    
    // Update global stats
    setGlobalStats(subscriptionManager.getMemoryStats())
  }, [])

  useEffect(() => {
    // Subscribe to all configs
    configs.forEach(config => {
      const subscriptionConfig: SubscriptionConfig = {
        ...config,
        callback: (payload) => updateSubscription(config.key, payload, null, true),
        debounceMs: config.debounceMs || 200
      }

      try {
        const { unsubscribe } = subscriptionManager.subscribe(subscriptionConfig)
        unsubscribeRefs.current[config.key] = unsubscribe
        
        // Initialize subscription state
        updateSubscription(config.key, null, null, false)
        
      } catch (err) {
        updateSubscription(config.key, null, err as Error, false)
      }
    })

    return () => {
      // Cleanup all subscriptions
      Object.values(unsubscribeRefs.current).forEach(unsubscribe => {
        try {
          unsubscribe()
        } catch (error) {
          console.warn('Error during subscription cleanup:', error)
        }
      })
      unsubscribeRefs.current = {}
    }
  }, [configs.map(c => c.key).join(','), updateSubscription])

  return {
    subscriptions,
    globalStats,
    reconnectAll: () => subscriptionManager.reconnectAll(),
    cleanup: () => {
      Object.values(unsubscribeRefs.current).forEach(unsubscribe => unsubscribe())
      unsubscribeRefs.current = {}
    }
  }
}

/**
 * Hook for subscription performance monitoring
 */
export function useSubscriptionPerformance() {
  const [stats, setStats] = useState<ReturnType<typeof subscriptionManager.getMemoryStats> | null>(null)
  const [history, setHistory] = useState<Array<{
    timestamp: Date
    stats: ReturnType<typeof subscriptionManager.getMemoryStats>
  }>>([])

  useEffect(() => {
    const updateStats = () => {
      const currentStats = subscriptionManager.getMemoryStats()
      setStats(currentStats)
      
      // Keep last 10 snapshots for trend analysis
      setHistory(prev => {
        const newHistory = [...prev, { timestamp: new Date(), stats: currentStats }]
        return newHistory.slice(-10)
      })
    }

    // Initial update
    updateStats()

    // Update every 30 seconds
    const interval = setInterval(updateStats, 30000)

    return () => clearInterval(interval)
  }, [])

  const performanceMetrics = {
    averageMemoryEfficiency: history.length > 0 
      ? Math.round(history.reduce((sum, h) => sum + h.stats.memoryEfficiency, 0) / history.length)
      : 0,
    connectionTrend: history.length >= 2
      ? history[history.length - 1].stats.totalSubscriptions - history[0].stats.totalSubscriptions
      : 0,
    circuitBreakerHealth: stats ? stats.failedSubscriptions / Math.max(stats.totalSubscriptions, 1) : 0
  }

  return {
    currentStats: stats,
    history,
    performanceMetrics,
    isHealthy: performanceMetrics.circuitBreakerHealth < 0.1 && // Less than 10% failures
                performanceMetrics.averageMemoryEfficiency > 50 // Good pooling efficiency
  }
}

/**
 * Hook for debugging subscription issues
 */
export function useSubscriptionDebug(subscriptionKey: string) {
  const [debugInfo, setDebugInfo] = useState<{
    status: ReturnType<typeof subscriptionManager.getSubscriptionStatus>
    allSubscriptions: ReturnType<typeof subscriptionManager.getAllSubscriptions>
    memoryStats: ReturnType<typeof subscriptionManager.getMemoryStats>
  } | null>(null)

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        status: subscriptionManager.getSubscriptionStatus(subscriptionKey),
        allSubscriptions: subscriptionManager.getAllSubscriptions(),
        memoryStats: subscriptionManager.getMemoryStats()
      })
    }

    updateDebugInfo()
    const interval = setInterval(updateDebugInfo, 5000)

    return () => clearInterval(interval)
  }, [subscriptionKey])

  return {
    debugInfo,
    forceReconnect: () => subscriptionManager.reconnectAll(),
    cleanup: () => subscriptionManager.cleanup()
  }
}