/**
 * React Hook for Optimistic Schedule Updates
 * 
 * Provides real-time optimistic update state and event handling
 * for schedule entries, enabling instant UI feedback.
 */

import { useState, useEffect, useCallback } from 'react'
import { scheduleUpdateManager, OptimisticScheduleUpdate } from '@/lib/scheduleUpdateManager'
import { useStore } from '@/store'

export interface UseOptimisticScheduleUpdatesReturn {
  // Get optimistic value for a specific member/date
  getOptimisticValue: (memberId: number, date: string) => OptimisticScheduleUpdate | null
  
  // Get all current optimistic updates
  optimisticUpdates: Map<string, OptimisticScheduleUpdate>
  
  // Check if a specific entry has a pending update
  isPending: (memberId: number, date: string) => boolean
  
  // Check if a specific entry has a failed update
  hasFailed: (memberId: number, date: string) => boolean
  
  // Force sync with the store
  syncWithStore: () => Promise<void>
  
  // Clear all optimistic updates
  clearAll: () => void
  
  // Statistics
  stats: {
    pendingCount: number
    failedCount: number
    totalCount: number
  }
}

export function useOptimisticScheduleUpdates(): UseOptimisticScheduleUpdatesReturn {
  const syncOptimisticUpdates = useStore((state) => state.syncOptimisticUpdates)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticScheduleUpdate>>(
    () => scheduleUpdateManager.getOptimisticUpdates()
  )

  // Sync optimistic updates on mount and when manager changes
  useEffect(() => {
    const syncUpdates = () => {
      setOptimisticUpdates(new Map(scheduleUpdateManager.getOptimisticUpdates()))
      syncOptimisticUpdates().catch(error => {
        console.warn('Failed to sync optimistic updates with store:', error)
      })
    }

    // Initial sync
    syncUpdates()

    // Listen for optimistic update events
    const handleOptimisticUpdate = (event: CustomEvent) => {
      syncUpdates()
    }

    const handleOptimisticRollback = (event: CustomEvent) => {
      syncUpdates()
    }

    const handleOptimisticClear = () => {
      setOptimisticUpdates(new Map())
    }

    // Add event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('schedule-optimistic-update', handleOptimisticUpdate as EventListener)
      window.addEventListener('schedule-optimistic-rollback', handleOptimisticRollback as EventListener)
      window.addEventListener('schedule-optimistic-clear', handleOptimisticClear)
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('schedule-optimistic-update', handleOptimisticUpdate as EventListener)
        window.removeEventListener('schedule-optimistic-rollback', handleOptimisticRollback as EventListener)
        window.removeEventListener('schedule-optimistic-clear', handleOptimisticClear)
      }
    }
  }, [syncOptimisticUpdates])

  // Get optimistic value for specific member/date
  const getOptimisticValue = useCallback((memberId: number, date: string): OptimisticScheduleUpdate | null => {
    const key = `${memberId}-${date}`
    return optimisticUpdates.get(key) || null
  }, [optimisticUpdates])

  // Check if entry is pending
  const isPending = useCallback((memberId: number, date: string): boolean => {
    const update = getOptimisticValue(memberId, date)
    return update ? !update.failed && update.retryCount === 0 : false
  }, [getOptimisticValue])

  // Check if entry has failed
  const hasFailed = useCallback((memberId: number, date: string): boolean => {
    const update = getOptimisticValue(memberId, date)
    return update ? !!update.failed : false
  }, [getOptimisticValue])

  // Sync with store
  const syncWithStore = useCallback(async () => {
    try {
      await syncOptimisticUpdates()
      setOptimisticUpdates(new Map(scheduleUpdateManager.getOptimisticUpdates()))
    } catch (error) {
      console.error('Failed to sync optimistic updates:', error)
    }
  }, [syncOptimisticUpdates])

  // Clear all optimistic updates
  const clearAll = useCallback(() => {
    scheduleUpdateManager.clearOptimisticUpdates()
    setOptimisticUpdates(new Map())
  }, [])

  // Calculate statistics
  const stats = {
    totalCount: optimisticUpdates.size,
    pendingCount: Array.from(optimisticUpdates.values()).filter(update => !update.failed).length,
    failedCount: Array.from(optimisticUpdates.values()).filter(update => !!update.failed).length
  }

  return {
    getOptimisticValue,
    optimisticUpdates,
    isPending,
    hasFailed,
    syncWithStore,
    clearAll,
    stats
  }
}

/**
 * Hook for a specific member's optimistic updates
 */
export function useOptimisticScheduleUpdatesForMember(memberId: number) {
  const {
    optimisticUpdates,
    getOptimisticValue,
    isPending,
    hasFailed,
    ...rest
  } = useOptimisticScheduleUpdates()

  // Filter updates for this member
  const memberUpdates = new Map<string, OptimisticScheduleUpdate>()
  optimisticUpdates.forEach((update, key) => {
    if (update.memberId === memberId) {
      memberUpdates.set(key, update)
    }
  })

  // Member-specific helpers
  const getValueForDate = useCallback((date: string) => {
    return getOptimisticValue(memberId, date)
  }, [getOptimisticValue, memberId])

  const isPendingForDate = useCallback((date: string) => {
    return isPending(memberId, date)
  }, [isPending, memberId])

  const hasFailedForDate = useCallback((date: string) => {
    return hasFailed(memberId, date)
  }, [hasFailed, memberId])

  return {
    memberUpdates,
    getValueForDate,
    isPendingForDate,
    hasFailedForDate,
    memberStats: {
      totalCount: memberUpdates.size,
      pendingCount: Array.from(memberUpdates.values()).filter(update => !update.failed).length,
      failedCount: Array.from(memberUpdates.values()).filter(update => !!update.failed).length
    },
    ...rest
  }
}