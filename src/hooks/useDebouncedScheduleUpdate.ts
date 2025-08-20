/**
 * Debounced Schedule Update Hook
 * Prevents excessive database calls when updating schedules rapidly
 */

import { useCallback, useRef, useEffect } from 'react'
import { DatabaseService } from '@/lib/database'
import { KeyedDebouncer, BatchDebouncer } from '@/lib/debounce'

interface ScheduleUpdate {
  memberId: number
  date: string // ISO date string
  value: '1' | '0.5' | 'X' | null
  reason?: string
}

interface ScheduleUpdateResult {
  success: boolean
  error?: string
}

export function useDebouncedScheduleUpdate(
  onSuccess?: (update: ScheduleUpdate) => void,
  onError?: (update: ScheduleUpdate, error: string) => void,
  options: {
    debounceMs?: number
    batchSize?: number
    enableBatching?: boolean
  } = {}
) {
  const { 
    debounceMs = 500, 
    batchSize = 10, 
    enableBatching = true 
  } = options

  // Keep track of pending updates for UI optimistic updates
  const pendingUpdatesRef = useRef<Set<string>>(new Set())
  
  // Single update debouncer (keyed by member-date combination)
  const singleUpdateDebouncerRef = useRef<KeyedDebouncer<string, typeof DatabaseService.updateScheduleEntry> | null>(null)
  
  // Batch update debouncer
  const batchUpdateDebouncerRef = useRef<BatchDebouncer<ScheduleUpdate> | null>(null)

  // Initialize debouncers
  useEffect(() => {
    // Single update debouncer
    singleUpdateDebouncerRef.current = new KeyedDebouncer(
      async (memberId: number, date: string, value: '1' | '0.5' | 'X' | null, reason?: string) => {
        const updateKey = `${memberId}-${date}`
        
        try {
          await DatabaseService.updateScheduleEntry(memberId, date, value, reason)
          
          // Remove from pending updates
          pendingUpdatesRef.current.delete(updateKey)
          
          // Call success callback
          if (onSuccess) {
            onSuccess({ memberId, date, value, reason })
          }
          
          console.log(`✅ Schedule updated: Member ${memberId}, Date ${date}, Value ${value}`)
        } catch (error) {
          console.error(`❌ Schedule update failed: Member ${memberId}, Date ${date}`, error)
          
          // Remove from pending updates
          pendingUpdatesRef.current.delete(updateKey)
          
          // Call error callback
          if (onError) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            onError({ memberId, date, value, reason }, errorMessage)
          }
        }
      },
      debounceMs,
      { maxWait: debounceMs * 3 } // Force execution after 3x the debounce time
    )

    // Batch update debouncer
    if (enableBatching) {
      batchUpdateDebouncerRef.current = new BatchDebouncer(
        async (updates: ScheduleUpdate[]) => {
          console.log(`🔄 Processing batch of ${updates.length} schedule updates`)
          
          // Process updates in parallel
          const results = await Promise.allSettled(
            updates.map(async (update) => {
              const updateKey = `${update.memberId}-${update.date}`
              
              try {
                await DatabaseService.updateScheduleEntry(
                  update.memberId, 
                  update.date, 
                  update.value, 
                  update.reason
                )
                
                // Remove from pending
                pendingUpdatesRef.current.delete(updateKey)
                
                // Call success callback
                if (onSuccess) {
                  onSuccess(update)
                }
                
                return { success: true, update }
              } catch (error) {
                console.error(`❌ Batch update failed for ${updateKey}:`, error)
                
                // Remove from pending
                pendingUpdatesRef.current.delete(updateKey)
                
                // Call error callback
                if (onError) {
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                  onError(update, errorMessage)
                }
                
                return { success: false, update, error }
              }
            })
          )

          // Log batch results
          const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
          const failed = results.length - successful
          
          if (failed > 0) {
            console.warn(`⚠️ Batch update completed: ${successful} successful, ${failed} failed`)
          } else {
            console.log(`✅ Batch update successful: ${successful} updates processed`)
          }
        },
        debounceMs,
        batchSize
      )
    }

    // Cleanup function
    return () => {
      if (singleUpdateDebouncerRef.current) {
        singleUpdateDebouncerRef.current.flushAll()
        singleUpdateDebouncerRef.current.cancelAll()
      }
      
      if (batchUpdateDebouncerRef.current) {
        batchUpdateDebouncerRef.current.flush()
        batchUpdateDebouncerRef.current.cancel()
      }
    }
  }, [debounceMs, batchSize, enableBatching, onSuccess, onError])

  // Update function
  const updateSchedule = useCallback((
    memberId: number,
    date: Date | string,
    value: '1' | '0.5' | 'X' | null,
    reason?: string
  ) => {
    const dateStr = typeof date === 'string' ? date : (date.toISOString().split('T')[0] ?? date.toISOString())
    const updateKey = `${memberId}-${dateStr}`
    
    // Mark as pending for UI feedback
    pendingUpdatesRef.current.add(updateKey)
    
    const update: ScheduleUpdate = {
      memberId,
      date: dateStr,
      value,
      reason
    }

    if (enableBatching && batchUpdateDebouncerRef.current) {
      // Use batch updating
      batchUpdateDebouncerRef.current.add(update)
    } else if (singleUpdateDebouncerRef.current) {
      // Use single debounced updates
      singleUpdateDebouncerRef.current.execute(updateKey, memberId, dateStr, value, reason)
    }
  }, [enableBatching])

  // Check if an update is pending
  const isPending = useCallback((memberId: number, date: Date | string): boolean => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
    const updateKey = `${memberId}-${dateStr}`
    return pendingUpdatesRef.current.has(updateKey)
  }, [])

  // Get all pending updates
  const getPendingUpdates = useCallback((): string[] => {
    return Array.from(pendingUpdatesRef.current)
  }, [])

  // Force flush all pending updates
  const flushPendingUpdates = useCallback(() => {
    if (singleUpdateDebouncerRef.current) {
      singleUpdateDebouncerRef.current.flushAll()
    }
    
    if (batchUpdateDebouncerRef.current) {
      batchUpdateDebouncerRef.current.flush()
    }
  }, [])

  // Cancel all pending updates
  const cancelPendingUpdates = useCallback(() => {
    if (singleUpdateDebouncerRef.current) {
      singleUpdateDebouncerRef.current.cancelAll()
    }
    
    if (batchUpdateDebouncerRef.current) {
      batchUpdateDebouncerRef.current.cancel()
    }
    
    pendingUpdatesRef.current.clear()
  }, [])

  // Get statistics about pending updates
  const getUpdateStats = useCallback(() => {
    const pendingCount = pendingUpdatesRef.current.size
    const debouncedCount = singleUpdateDebouncerRef.current?.size() || 0
    const batchedCount = batchUpdateDebouncerRef.current?.size() || 0
    
    return {
      pendingCount,
      debouncedCount,
      batchedCount,
      totalPending: pendingCount + debouncedCount + batchedCount
    }
  }, [])

  return {
    updateSchedule,
    isPending,
    getPendingUpdates,
    flushPendingUpdates,
    cancelPendingUpdates,
    getUpdateStats
  }
}

/**
 * Hook for debouncing data fetches to prevent excessive loading
 */
export function useDebouncedDataFetch<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[],
  debounceMs: number = 300
) {
  const fetchRef = useRef(fetchFunction)
  const debouncerRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(false)

  // Update fetch function reference
  useEffect(() => {
    fetchRef.current = fetchFunction
  }, [fetchFunction])

  // Debounced fetch function
  const debouncedFetch = useCallback(() => {
    if (debouncerRef.current) {
      clearTimeout(debouncerRef.current)
    }

    debouncerRef.current = setTimeout(async () => {
      if (isLoadingRef.current) {
        console.log('🔄 Skipping fetch - already loading')
        return
      }

      try {
        isLoadingRef.current = true
        await fetchRef.current()
      } catch (error) {
        console.error('❌ Debounced fetch error:', error)
      } finally {
        isLoadingRef.current = false
      }
    }, debounceMs)
  }, [debounceMs])

  // Trigger debounced fetch when dependencies change
  useEffect(() => {
    debouncedFetch()
    
    return () => {
      if (debouncerRef.current) {
        clearTimeout(debouncerRef.current)
      }
    }
  }, dependencies)

  // Cleanup
  useEffect(() => {
    return () => {
      if (debouncerRef.current) {
        clearTimeout(debouncerRef.current)
      }
    }
  }, [])

  return {
    isLoading: isLoadingRef.current,
    forceFetch: () => {
      if (debouncerRef.current) {
        clearTimeout(debouncerRef.current)
      }
      fetchRef.current()
    }
  }
}