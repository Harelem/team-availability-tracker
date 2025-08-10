import { useState, useEffect, useCallback, useRef } from 'react'

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  dedupingInterval?: number // Prevent duplicate requests within this interval
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  error?: Error
}

interface UseDataCacheReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  mutate: (newData?: T | ((current: T | null) => T)) => void
  revalidate: () => Promise<void>
}

/**
 * Global cache store for sharing data across components
 */
class CacheStore {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingQueries = new Map<string, Promise<any>>()
  private subscribers = new Map<string, Set<(entry: CacheEntry<any>) => void>>()

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry as CacheEntry<T>
  }

  set<T>(key: string, data: T, ttl: number, error?: Error): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      error
    }

    this.cache.set(key, entry)
    
    // Notify subscribers
    const subs = this.subscribers.get(key)
    if (subs) {
      subs.forEach(callback => callback(entry))
    }
  }

  subscribe(key: string, callback: (entry: CacheEntry<any>) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    
    this.subscribers.get(key)!.add(callback)

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key)
      if (subs) {
        subs.delete(callback)
        if (subs.size === 0) {
          this.subscribers.delete(key)
        }
      }
    }
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    dedupingInterval: number = 2000
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key)
    if (cached && !cached.error) {
      return cached.data
    }

    // Check for pending query (deduplication)
    const pending = this.pendingQueries.get(key)
    if (pending && Date.now() - (this.cache.get(key)?.timestamp || 0) < dedupingInterval) {
      return pending
    }

    // Execute fetch
    const promise = fetcher()
      .then(data => {
        this.set(key, data, ttl)
        this.pendingQueries.delete(key)
        return data
      })
      .catch(error => {
        this.set(key, null, ttl, error)
        this.pendingQueries.delete(key)
        throw error
      })

    this.pendingQueries.set(key, promise)
    return promise
  }

  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear()
      this.pendingQueries.clear()
      return
    }

    // Invalidate by pattern
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key)
        this.pendingQueries.delete(key)
      }
    }
  }

  getCacheInfo(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global cache instance
const globalCache = new CacheStore()

/**
 * React hook for data caching with TTL, deduplication, and revalidation
 */
export function useDataCache<T>(
  key: string,
  fetcher: (() => Promise<T>) | null,
  options: CacheOptions = {}
): UseDataCacheReturn<T> {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    dedupingInterval = 2000,
    onSuccess,
    onError
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(!!fetcher)
  const [error, setError] = useState<Error | null>(null)
  
  const fetcherRef = useRef(fetcher)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  // Update refs to avoid stale closures
  fetcherRef.current = fetcher
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  // Manual revalidation function
  const revalidate = useCallback(async (): Promise<void> => {
    if (!fetcherRef.current) return

    setLoading(true)
    setError(null)

    try {
      const result = await globalCache.getOrFetch(
        key,
        fetcherRef.current,
        ttl,
        dedupingInterval
      )
      setData(result)
      onSuccessRef.current?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onErrorRef.current?.(error)
    } finally {
      setLoading(false)
    }
  }, [key, ttl, dedupingInterval])

  // Manual mutation function
  const mutate = useCallback((newData?: T | ((current: T | null) => T)): void => {
    if (typeof newData === 'function') {
      const fn = newData as (current: T | null) => T
      const updatedData = fn(data)
      setData(updatedData)
      globalCache.set(key, updatedData, ttl)
    } else if (newData !== undefined) {
      setData(newData)
      globalCache.set(key, newData, ttl)
    } else {
      // Trigger revalidation
      revalidate()
    }
  }, [data, key, ttl, revalidate])

  // Initial fetch and cache subscription
  useEffect(() => {
    // Check cache first
    const cached = globalCache.get<T>(key)
    if (cached) {
      setData(cached.data)
      setError(cached.error || null)
      setLoading(false)
      
      if (cached.data && !cached.error) {
        onSuccessRef.current?.(cached.data)
      }
    }

    // Subscribe to cache updates
    const unsubscribe = globalCache.subscribe(key, (entry) => {
      setData(entry.data)
      setError(entry.error || null)
      setLoading(false)

      if (entry.data && !entry.error) {
        onSuccessRef.current?.(entry.data)
      } else if (entry.error) {
        onErrorRef.current?.(entry.error)
      }
    })

    // Initial fetch if no cache and fetcher available
    if (!cached && fetcherRef.current) {
      revalidate()
    }

    return unsubscribe
  }, [key, revalidate])

  // Focus revalidation
  useEffect(() => {
    if (!revalidateOnFocus) return

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        revalidate()
      }
    }

    document.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [revalidateOnFocus, revalidate])

  // Online revalidation
  useEffect(() => {
    if (!revalidateOnReconnect) return

    const handleOnline = () => revalidate()
    
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [revalidateOnReconnect, revalidate])

  return {
    data,
    loading,
    error,
    mutate,
    revalidate
  }
}

/**
 * Hook for cached team members
 */
export function useTeamMembersCache() {
  const dataService = require('../services/DataService').default
  
  return useDataCache(
    'team_members',
    () => dataService.getTeamMembers(),
    { ttl: 5 * 60 * 1000 } // 5 minutes
  )
}

/**
 * Hook for cached absence statistics
 */
export function useAbsenceStatsCache() {
  const dataService = require('../services/DataService').default
  
  return useDataCache(
    'absence_stats',
    () => dataService.getAbsenceStatistics(),
    { ttl: 2 * 60 * 1000 } // 2 minutes
  )
}

/**
 * Hook for cached team capacity
 */
export function useTeamCapacityCache(date: string) {
  const dataService = require('../services/DataService').default
  
  return useDataCache(
    `team_capacity_${date}`,
    () => dataService.getTeamCapacityForDate(date),
    { ttl: 1 * 60 * 1000 } // 1 minute
  )
}

/**
 * Hook for batch team capacity
 */
export function useBatchTeamCapacityCache(dates: string[]) {
  const dataService = require('../services/DataService').default
  const key = `batch_capacity_${dates.sort().join(',')}`
  
  return useDataCache(
    key,
    () => dataService.getTeamCapacityBatch(dates),
    { ttl: 1 * 60 * 1000 } // 1 minute
  )
}

/**
 * Utility function to invalidate cache
 */
export function invalidateCache(pattern?: string): void {
  globalCache.invalidate(pattern)
}

/**
 * Utility function to get cache information
 */
export function getCacheInfo(): { size: number; keys: string[] } {
  return globalCache.getCacheInfo()
}

export default useDataCache