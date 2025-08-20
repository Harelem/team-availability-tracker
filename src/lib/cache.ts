/**
 * Advanced Caching System for COO Dashboard Performance
 * Implements multi-tier caching with TTL, invalidation, and memory optimization
 */

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
  tags: string[]
}

// Cache configuration
interface CacheConfig {
  defaultTTL: number // Default time-to-live in milliseconds
  maxSize: number    // Maximum number of entries
  cleanupInterval: number // Cleanup interval in milliseconds
}

// Cache statistics
interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
  memoryUsage: number
}

/**
 * Advanced Memory Cache with LRU eviction and tag-based invalidation
 */
export class AdvancedCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private cleanupTimer: NodeJS.Timeout | null = null
  private stats = { hits: 0, misses: 0 }
  
  constructor(private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000,  // 5 minutes
    maxSize: 1000,              // 1000 entries
    cleanupInterval: 60 * 1000  // 1 minute
  }) {
    this.startCleanup()
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    const now = Date.now()
    
    // Check if expired
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }
    
    // Update access stats
    entry.accessCount++
    entry.lastAccess = now
    this.stats.hits++
    
    return entry.data
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, ttl?: number, tags: string[] = []): void {
    const now = Date.now()
    
    // Enforce size limit with LRU eviction
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU()
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccess: now,
      tags
    }
    
    this.cache.set(key, entry)
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear cache by tags
   */
  invalidateByTags(tags: string[]): number {
    let deleted = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key)
        deleted++
      }
    }
    
    return deleted
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2 // String chars are 2 bytes
      memoryUsage += JSON.stringify(entry.data).length * 2
      memoryUsage += 64 // Metadata overhead
    }
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage
    }
  }

  /**
   * LRU eviction - remove least recently used items
   */
  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

/**
 * Specialized COO Dashboard Cache
 */
export class COODashboardCache {
  private cache = new AdvancedCache<any>({
    defaultTTL: 5 * 60 * 1000,   // 5 minutes for dashboard data
    maxSize: 100,                // Smaller cache for specific use case
    cleanupInterval: 30 * 1000   // More frequent cleanup
  })

  /**
   * Get cached dashboard data
   */
  async getCOODashboardData(selectedDate?: string): Promise<any | null> {
    const key = `coo-dashboard-${selectedDate || 'today'}`
    return this.cache.get(key)
  }

  /**
   * Cache dashboard data
   */
  async setCOODashboardData(data: any, selectedDate?: string): Promise<void> {
    const key = `coo-dashboard-${selectedDate || 'today'}`
    const tags = ['coo-dashboard', 'dashboard', selectedDate || 'today']
    
    // Shorter TTL for real-time data
    const ttl = 2 * 60 * 1000 // 2 minutes
    
    this.cache.set(key, data, ttl, tags)
  }

  /**
   * Invalidate dashboard cache when data changes
   */
  invalidateDashboard(): void {
    this.cache.invalidateByTags(['coo-dashboard', 'dashboard'])
  }

  /**
   * Get team-specific cached data
   */
  async getTeamData(teamId: number, date?: string): Promise<any | null> {
    const key = `team-${teamId}-${date || 'today'}`
    return this.cache.get(key)
  }

  /**
   * Cache team data
   */
  async setTeamData(teamId: number, data: any, date?: string): Promise<void> {
    const key = `team-${teamId}-${date || 'today'}`
    const tags = ['team-data', `team-${teamId}`, date || 'today']
    
    this.cache.set(key, data, 10 * 60 * 1000, tags) // 10 minutes for team data
  }

  /**
   * Invalidate team data
   */
  invalidateTeam(teamId: number): void {
    this.cache.invalidateByTags([`team-${teamId}`])
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats()
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }
}

/**
 * Global cache instances
 */
export const globalCache = new AdvancedCache({
  defaultTTL: 10 * 60 * 1000,  // 10 minutes
  maxSize: 500,               // 500 entries
  cleanupInterval: 60 * 1000  // 1 minute
})

export const cooDashboardCache = new COODashboardCache()

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  func: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string
    ttl?: number
    tags?: string[]
    cache?: AdvancedCache
  } = {}
): T {
  const {
    keyGenerator = (...args) => `${func.name}-${JSON.stringify(args)}`,
    ttl,
    tags = [],
    cache = globalCache
  } = options

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    
    // Try to get from cache first
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }
    
    // Execute function and cache result
    const result = await func(...args)
    cache.set(key, result, ttl, tags)
    
    return result
  }) as T
}

/**
 * React hook for cached data with automatic invalidation
 */
import { useEffect, useState, useCallback } from 'react'

export function useCachedData<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options: {
    ttl?: number
    tags?: string[]
    dependencies?: any[]
    cache?: AdvancedCache
  } = {}
) {
  const {
    ttl,
    tags = [],
    dependencies = [],
    cache = globalCache
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try cache first
      const cached = cache.get(key)
      if (cached !== null) {
        setData(cached)
        setLoading(false)
        return
      }
      
      // Fetch fresh data
      const result = await fetchFunction()
      cache.set(key, result, ttl, tags)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [key, fetchFunction, ttl, tags, cache])

  // Fetch data on mount and dependency changes
  useEffect(() => {
    fetchData()
  }, [fetchData, ...dependencies])

  const invalidate = useCallback(() => {
    cache.delete(key)
    fetchData()
  }, [key, cache, fetchData])

  const invalidateByTags = useCallback((tagsToInvalidate: string[]) => {
    cache.invalidateByTags(tagsToInvalidate)
    if (tags.some(tag => tagsToInvalidate.includes(tag))) {
      fetchData()
    }
  }, [tags, cache, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate,
    invalidateByTags
  }
}

// Cleanup on app termination
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalCache.destroy()
    cooDashboardCache.clear()
  })
} else {
  process.on('exit', () => {
    globalCache.destroy()
    cooDashboardCache.clear()
  })
}