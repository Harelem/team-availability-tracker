/**
 * React hook for managing Supabase subscriptions with automatic cleanup
 */

import { useEffect, useRef, useCallback } from 'react'
import { subscriptionManager, subscriptionHelpers } from '@/lib/SubscriptionManager'

/**
 * Hook for subscribing to schedule changes with automatic cleanup
 */
export function useScheduleSubscription(
  startDate: string,
  endDate: string,
  teamId: number,
  callback: (payload: any) => void,
  enabled: boolean = true
) {
  const callbackRef = useRef(callback)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Memoized callback that uses the ref
  const stableCallback = useCallback((payload: any) => {
    callbackRef.current(payload)
  }, [])

  useEffect(() => {
    if (!enabled || !startDate || !endDate || !teamId) {
      return
    }

    console.log(`🔔 Setting up schedule subscription for team ${teamId} (${startDate} to ${endDate})`)

    // Create subscription
    subscriptionRef.current = subscriptionHelpers.subscribeToScheduleChanges(
      startDate,
      endDate,
      teamId,
      stableCallback
    )

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        console.log(`🔕 Cleaning up schedule subscription for team ${teamId}`)
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [startDate, endDate, teamId, enabled, stableCallback])

  // Force cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [])

  return {
    unsubscribe: () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }
}

/**
 * Hook for subscribing to team member changes
 */
export function useTeamMemberSubscription(
  teamId: number,
  callback: (payload: any) => void,
  enabled: boolean = true
) {
  const callbackRef = useRef(callback)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const stableCallback = useCallback((payload: any) => {
    callbackRef.current(payload)
  }, [])

  useEffect(() => {
    if (!enabled || !teamId) {
      return
    }

    console.log(`🔔 Setting up team member subscription for team ${teamId}`)

    subscriptionRef.current = subscriptionHelpers.subscribeToTeamMemberChanges(
      teamId,
      stableCallback
    )

    return () => {
      if (subscriptionRef.current) {
        console.log(`🔕 Cleaning up team member subscription for team ${teamId}`)
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [teamId, enabled, stableCallback])

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [])

  return {
    unsubscribe: () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }
}

/**
 * Hook for subscribing to sprint changes
 */
export function useSprintSubscription(
  callback: (payload: any) => void,
  enabled: boolean = true
) {
  const callbackRef = useRef(callback)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const stableCallback = useCallback((payload: any) => {
    callbackRef.current(payload)
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    console.log('🔔 Setting up sprint subscription')

    subscriptionRef.current = subscriptionHelpers.subscribeToSprintChanges(stableCallback)

    return () => {
      if (subscriptionRef.current) {
        console.log('🔕 Cleaning up sprint subscription')
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [enabled, stableCallback])

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [])

  return {
    unsubscribe: () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }
}

/**
 * Hook for getting subscription manager debug information
 */
export function useSubscriptionDebug() {
  return {
    getAllSubscriptions: () => subscriptionManager.getAllSubscriptions(),
    getMemoryStats: () => subscriptionManager.getMemoryStats(),
    reconnectAll: () => subscriptionManager.reconnectAll(),
    cleanup: () => subscriptionManager.cleanup()
  }
}

/**
 * Custom hook for managing multiple subscriptions with shared cleanup
 */
export function useMultipleSubscriptions() {
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([])

  const addSubscription = useCallback((subscription: { unsubscribe: () => void }) => {
    subscriptionsRef.current.push(subscription)
  }, [])

  const removeSubscription = useCallback((subscription: { unsubscribe: () => void }) => {
    const index = subscriptionsRef.current.indexOf(subscription)
    if (index > -1) {
      subscriptionsRef.current.splice(index, 1)
    }
  }, [])

  const cleanupAll = useCallback(() => {
    console.log(`🔕 Cleaning up ${subscriptionsRef.current.length} subscriptions`)
    subscriptionsRef.current.forEach(sub => {
      try {
        sub.unsubscribe()
      } catch (error) {
        console.warn('Error cleaning up subscription:', error)
      }
    })
    subscriptionsRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanupAll
  }, [cleanupAll])

  return {
    addSubscription,
    removeSubscription,
    cleanupAll,
    activeCount: subscriptionsRef.current.length
  }
}