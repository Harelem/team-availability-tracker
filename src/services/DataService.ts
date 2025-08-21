import { supabase } from '../lib/supabase'
// Database types temporarily disabled for production
// import type { Database } from '../types/database'

type TeamMember = any // Database['public']['Tables']['team_members']['Row']
type AbsenceRecord = any // Database['public']['Tables']['absence_records']['Row']

interface AbsenceWithMember extends AbsenceRecord {
  team_members: {
    id: string
    name: string
    role: string
    department: string
  } | null
}

interface TeamCapacity {
  totalCapacity: number
  availableCapacity: number
  absences: AbsenceWithMember[]
}

interface AbsenceStats {
  totalAbsences: number
  byReason: Record<string, number>
  byDepartment: Record<string, number>
  byMonth: Record<string, number>
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount?: number
  lastAccessed?: number
  size?: number
}

interface BatchCapacityResult {
  [date: string]: TeamCapacity
}

interface QueryPerformanceMetric {
  queryName: string
  duration: number
  timestamp: Date
  cacheHit: boolean
  success: boolean
}

interface CacheStats {
  hitCount: number
  missCount: number
  totalQueries: number
  hitRate: number
  cacheSize: number
  memoryUsage: number
}

/**
 * Centralized data service with intelligent caching and query optimization
 * Enhanced with comprehensive performance monitoring and multi-level caching
 */
class DataService {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingQueries = new Map<string, Promise<any>>()
  private performanceMetrics: QueryPerformanceMetric[] = []
  private cacheStats: CacheStats = {
    hitCount: 0,
    missCount: 0,
    totalQueries: 0,
    hitRate: 0,
    cacheSize: 0,
    memoryUsage: 0
  }
  private static instance: DataService
  private readonly MAX_CACHE_SIZE = 500
  private readonly MAX_METRICS = 1000

  // Enhanced TTL values with intelligent caching strategy
  private readonly DEFAULT_TTL = {
    // High-frequency, critical data
    team_members: 5 * 60 * 1000, // 5 minutes
    current_enhanced_sprint: 2 * 60 * 1000, // 2 minutes
    teams: 10 * 60 * 1000, // 10 minutes
    
    // Medium-frequency data
    absence_stats: 3 * 60 * 1000, // 3 minutes
    team_capacity: 2 * 60 * 1000, // 2 minutes
    team_sprint_analytics: 5 * 60 * 1000, // 5 minutes
    
    // Low-frequency, expensive data
    batch_capacity: 1 * 60 * 1000, // 1 minute (shorter due to frequent changes)
    enhanced_sprint_configs: 10 * 60 * 1000, // 10 minutes
    sprint_working_days: 15 * 60 * 1000, // 15 minutes
    member_capacity: 1 * 60 * 1000 // 1 minute
  }

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  /**
   * Enhanced cached data retrieval with performance tracking and intelligent caching
   */
  private async getCachedData<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number,
    queryName?: string
  ): Promise<T> {
    const startTime = performance.now()
    this.cacheStats.totalQueries++
    
    // Check if we have valid cached data
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Update access statistics
      cached.accessCount = (cached.accessCount || 0) + 1
      cached.lastAccessed = Date.now()
      this.cache.set(key, cached)
      
      // Record cache hit
      this.cacheStats.hitCount++
      this.recordPerformanceMetric(queryName || key, performance.now() - startTime, true, true)
      
      return cached.data as T
    }

    // Cache miss
    this.cacheStats.missCount++

    // Check if query is already pending (deduplication)
    const pending = this.pendingQueries.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    // Execute query and cache result with enhanced tracking
    const queryPromise = queryFn().then((data) => {
      const duration = performance.now() - startTime
      const dataSize = this.calculateDataSize(data)
      
      // Store in cache with metadata
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 1,
        lastAccessed: Date.now(),
        size: dataSize
      }
      
      // Implement LRU eviction if cache is full
      this.evictIfNecessary()
      this.cache.set(key, cacheEntry)
      
      this.pendingQueries.delete(key)
      this.recordPerformanceMetric(queryName || key, duration, false, true)
      this.updateCacheStats()
      
      return data
    }).catch((error) => {
      const duration = performance.now() - startTime
      this.pendingQueries.delete(key)
      this.recordPerformanceMetric(queryName || key, duration, false, false)
      throw error
    })

    this.pendingQueries.set(key, queryPromise)
    return queryPromise
  }

  /**
   * Record performance metrics for monitoring
   */
  private recordPerformanceMetric(
    queryName: string,
    duration: number,
    cacheHit: boolean,
    success: boolean
  ): void {
    this.performanceMetrics.push({
      queryName,
      duration,
      timestamp: new Date(),
      cacheHit,
      success
    })

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_METRICS) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS)
    }

    // Log slow queries
    if (duration > 1000 && !cacheHit) {
      console.warn(`🐌 Slow query detected: ${queryName} took ${Math.round(duration)}ms`)
    }
  }

  /**
   * Calculate approximate data size for cache optimization
   */
  private calculateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }

  /**
   * Implement LRU eviction when cache size exceeds limit
   */
  private evictIfNecessary(): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Find least recently used entries
      const entries = Array.from(this.cache.entries())
        .map(([key, entry]) => ({ key, entry }))
        .sort((a, b) => (a.entry.lastAccessed || 0) - (b.entry.lastAccessed || 0))
      
      // Remove oldest 10% of entries
      const toRemove = Math.ceil(this.MAX_CACHE_SIZE * 0.1)
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i].key)
      }
      
      console.log(`🧹 Cache eviction: Removed ${toRemove} LRU entries`)
    }
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(): void {
    this.cacheStats.cacheSize = this.cache.size
    this.cacheStats.hitRate = this.cacheStats.totalQueries > 0 
      ? (this.cacheStats.hitCount / this.cacheStats.totalQueries) * 100 
      : 0
    
    // Calculate approximate memory usage
    let memoryUsage = 0
    this.cache.forEach(entry => {
      memoryUsage += entry.size || 0
    })
    this.cacheStats.memoryUsage = memoryUsage
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get team members with enhanced caching
   */
  async getTeamMembers(): Promise<TeamMember[]> {
    return this.getCachedData(
      'team_members',
      async () => {
        const { data, error } = await supabase
          .from('team_members')
          .select('id, name, hebrew, is_manager, email, team_id, created_at, updated_at')
          .order('name')

        if (error) {
          console.error('Error fetching team members:', error)
          throw error
        }

        return data || []
      },
      this.DEFAULT_TTL.team_members,
      'getTeamMembers'
    )
  }

  /**
   * Get absence statistics with optimized aggregation query
   */
  async getAbsenceStatistics(): Promise<AbsenceStats> {
    return this.getCachedData(
      'absence_stats',
      async () => {
        // Use a single query with joins instead of loading all records
        const { data, error } = await supabase
          .from('absence_records')
          .select(`
            reason,
            start_date,
            team_members (
              department
            )
          `)

        if (error) {
          console.error('Error fetching absence statistics:', error)
          throw error
        }

        const absences = data || []

        // Calculate statistics efficiently
        const byReason: Record<string, number> = {}
        const byDepartment: Record<string, number> = {}
        const byMonth: Record<string, number> = {}

        absences.forEach(absence => {
          // By reason
          byReason[absence.reason] = (byReason[absence.reason] || 0) + 1

          // By department
          if ((absence as any).team_members?.department) {
            byDepartment[(absence as any).team_members.department] = 
              (byDepartment[(absence as any).team_members.department] || 0) + 1
          }

          // By month
          const month = new Date(absence.start_date).toISOString().slice(0, 7)
          byMonth[month] = (byMonth[month] || 0) + 1
        })

        return {
          totalAbsences: absences.length,
          byReason,
          byDepartment,
          byMonth
        }
      },
      this.DEFAULT_TTL.absence_stats,
      'getAbsenceStatistics'
    )
  }

  /**
   * Get team capacity for a single date with caching
   */
  async getTeamCapacityForDate(date: string): Promise<TeamCapacity> {
    return this.getCachedData(
      `team_capacity_${date}`,
      async () => {
        // Single optimized query with join
        const { data: teamMembers, error: teamError } = await supabase
          .from('team_members')
          .select('id, name, is_manager, team_id')

        if (teamError) {
          console.error('Error fetching team members:', teamError)
          throw teamError
        }

        const { data: absences, error: absenceError } = await supabase
          .from('absence_records')
          .select(`
            *,
            team_members (
              id,
              name,
              role,
              department
            )
          `)
          .lte('start_date', date)
          .gte('end_date', date)

        if (absenceError) {
          console.error('Error fetching absences:', absenceError)
          throw absenceError
        }

        const totalCapacity = teamMembers?.length || 0
        const availableCapacity = totalCapacity - (absences?.length || 0)

        return {
          totalCapacity,
          availableCapacity,
          absences: (absences || []) as AbsenceWithMember[]
        }
      },
      this.DEFAULT_TTL.team_capacity
    )
  }

  /**
   * Batch team capacity queries for multiple dates (major optimization)
   */
  async getTeamCapacityBatch(dates: string[]): Promise<BatchCapacityResult> {
    const cacheKey = `batch_capacity_${dates.sort().join(',')}`

    return this.getCachedData(
      cacheKey,
      async () => {
        // Single query for all team members
        const { data: teamMembers, error: teamError } = await supabase
          .from('team_members')
          .select('id, name, is_manager, team_id')

        if (teamError) {
          console.error('Error fetching team members:', teamError)
          throw teamError
        }

        // Single query for all absences in date range
        const minDate = dates.reduce((min, date) => date < min ? date : min)
        const maxDate = dates.reduce((max, date) => date > max ? date : max)

        const { data: allAbsences, error: absenceError } = await supabase
          .from('absence_records')
          .select(`
            *,
            team_members (
              id,
              name,
              role,
              department
            )
          `)
          .lte('start_date', maxDate)
          .gte('end_date', minDate)

        if (absenceError) {
          console.error('Error fetching absences:', absenceError)
          throw absenceError
        }

        // Process results for each date
        const result: BatchCapacityResult = {}
        const totalCapacity = teamMembers?.length || 0

        dates.forEach(date => {
          const dateAbsences = (allAbsences || []).filter(absence =>
            absence.start_date <= date && absence.end_date >= date
          ) as AbsenceWithMember[]

          result[date] = {
            totalCapacity,
            availableCapacity: totalCapacity - dateAbsences.length,
            absences: dateAbsences
          }
        })

        return result
      },
      this.DEFAULT_TTL.batch_capacity
    )
  }

  /**
   * Prefetch dashboard data for better performance
   */
  async prefetchDashboardData(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // Prefetch in parallel
    await Promise.all([
      this.getTeamMembers(),
      this.getAbsenceStatistics(),
      this.getTeamCapacityBatch([today, tomorrow])
    ])
  }

  /**
   * Create absence record with cache invalidation
   */
  async createAbsenceRecord(record: {
    team_member_id: string
    start_date: string
    end_date: string
    reason: string
    notes?: string
  }): Promise<AbsenceRecord> {
    const { data, error } = await supabase
      .from('absence_records')
      .insert([record])
      .select()

    if (error) {
      console.error('Error creating absence record:', error)
      throw error
    }

    // Invalidate relevant caches
    this.invalidateCache('absence_stats')
    this.invalidateCache('team_capacity')
    this.invalidateCache('batch_capacity')

    return data[0]
  }

  /**
   * Update absence record with cache invalidation
   */
  async updateAbsenceRecord(id: string, updates: Partial<AbsenceRecord>): Promise<AbsenceRecord> {
    const { data, error } = await supabase
      .from('absence_records')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating absence record:', error)
      throw error
    }

    // Invalidate relevant caches
    this.invalidateCache('absence_stats')
    this.invalidateCache('team_capacity')
    this.invalidateCache('batch_capacity')

    return data[0]
  }

  /**
   * Delete absence record with cache invalidation
   */
  async deleteAbsenceRecord(id: string): Promise<void> {
    const { error } = await supabase
      .from('absence_records')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting absence record:', error)
      throw error
    }

    // Invalidate relevant caches
    this.invalidateCache('absence_stats')
    this.invalidateCache('team_capacity')
    this.invalidateCache('batch_capacity')
  }

  /**
   * Get current enhanced sprint with caching
   */
  async getCurrentEnhancedSprint(): Promise<any> {
    return this.getCachedData(
      'current_enhanced_sprint',
      async () => {
        const { data, error } = await supabase
          .from('current_enhanced_sprint')
          .select('*')
          .single()

        if (error) {
          console.error('Error fetching current enhanced sprint:', error)
          throw error
        }

        return data
      },
      2 * 60 * 1000 // 2 minutes cache
    )
  }

  /**
   * Get team sprint analytics with caching
   */
  async getTeamSprintAnalytics(): Promise<any[]> {
    return this.getCachedData(
      'team_sprint_analytics',
      async () => {
        const { data, error } = await supabase
          .from('team_sprint_analytics')
          .select('*')
          .order('team_name')

        if (error) {
          console.error('Error fetching team sprint analytics:', error)
          throw error
        }

        return data || []
      },
      2 * 60 * 1000 // 2 minutes cache
    )
  }

  /**
   * Get enhanced sprint configurations with caching
   */
  async getEnhancedSprintConfigs(): Promise<any[]> {
    return this.getCachedData(
      'enhanced_sprint_configs',
      async () => {
        const { data, error } = await supabase
          .from('enhanced_sprint_configs')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching enhanced sprint configs:', error)
          throw error
        }

        return data || []
      },
      5 * 60 * 1000 // 5 minutes cache
    )
  }

  /**
   * Get sprint working days for a specific sprint with caching
   */
  async getSprintWorkingDays(sprintId: string): Promise<any[]> {
    return this.getCachedData(
      `sprint_working_days_${sprintId}`,
      async () => {
        const { data, error } = await supabase
          .from('sprint_working_days')
          .select('*')
          .eq('sprint_id', sprintId)
          .order('work_date')

        if (error) {
          console.error('Error fetching sprint working days:', error)
          throw error
        }

        return data || []
      },
      10 * 60 * 1000 // 10 minutes cache (working days don't change often)
    )
  }

  /**
   * Calculate member sprint capacity with caching
   */
  async calculateMemberSprintCapacity(memberId: number, sprintId: string): Promise<any> {
    return this.getCachedData(
      `member_capacity_${memberId}_${sprintId}`,
      async () => {
        const { data, error } = await supabase
          .rpc('calculate_member_sprint_capacity', {
            member_id: memberId,
            sprint_id: sprintId
          })

        if (error) {
          console.error('Error calculating member sprint capacity:', error)
          throw error
        }

        return data?.[0] || null
      },
      1 * 60 * 1000 // 1 minute cache (capacity changes frequently)
    )
  }

  /**
   * Invalidate enhanced sprint related caches
   */
  invalidateSprintCaches(): void {
    const sprintCacheKeys = Array.from(this.cache.keys()).filter(key => 
      key.includes('sprint') || key.includes('capacity') || key.includes('analytics')
    )
    
    sprintCacheKeys.forEach(key => this.cache.delete(key))
    console.log(`🔄 Invalidated ${sprintCacheKeys.length} sprint-related cache entries`)
  }

  /**
   * Get comprehensive cache statistics for monitoring
   */
  getCacheStats(): CacheStats & { keys: string[]; topKeys: Array<{key: string; accessCount: number; size: number}> } {
    this.updateCacheStats()
    
    // Get top accessed cache keys
    const topKeys = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount || 0,
        size: entry.size || 0
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
    
    return {
      ...this.cacheStats,
      keys: Array.from(this.cache.keys()),
      topKeys
    }
  }

  /**
   * Get performance metrics and analysis
   */
  getPerformanceMetrics(): {
    totalQueries: number
    averageResponseTime: number
    cacheHitRate: number
    slowQueries: QueryPerformanceMetric[]
    recentQueries: QueryPerformanceMetric[]
    queryFrequency: Record<string, number>
  } {
    const totalQueries = this.performanceMetrics.length
    const averageResponseTime = totalQueries > 0 
      ? this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
      : 0
    
    const cacheHitRate = totalQueries > 0
      ? (this.performanceMetrics.filter(m => m.cacheHit).length / totalQueries) * 100
      : 0
    
    const slowQueries = this.performanceMetrics
      .filter(m => m.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
    
    const recentQueries = this.performanceMetrics
      .slice(-20)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    const queryFrequency: Record<string, number> = {}
    this.performanceMetrics.forEach(m => {
      queryFrequency[m.queryName] = (queryFrequency[m.queryName] || 0) + 1
    })
    
    return {
      totalQueries,
      averageResponseTime,
      cacheHitRate,
      slowQueries,
      recentQueries,
      queryFrequency
    }
  }

  /**
   * Get performance stats (alias for getPerformanceMetrics for compatibility)
   */
  getPerformanceStats() {
    const metrics = this.getPerformanceMetrics()
    const cacheStats = this.getCacheStats()
    
    return {
      totalQueries: metrics.totalQueries,
      averageResponseTime: metrics.averageResponseTime,
      cacheHitRate: metrics.cacheHitRate,
      totalCacheSize: cacheStats.cacheSize,
      slowQueryCount: metrics.slowQueries.length
    }
  }

  /**
   * Get performance summary with recommendations
   */
  getPerformanceSummary(): {
    status: 'excellent' | 'good' | 'fair' | 'poor'
    score: number
    recommendations: string[]
    metrics: {
      avgResponseTime: number
      cacheEfficiency: number
      memoryUsage: number
    }
  } {
    const metrics = this.getPerformanceMetrics()
    const cacheStats = this.getCacheStats()
    
    const summaryMetrics = {
      avgResponseTime: metrics.averageResponseTime,
      cacheEfficiency: metrics.cacheHitRate,
      memoryUsage: Math.round(cacheStats.memoryUsage / 1024) // KB
    }
    
    let score = 100
    const recommendations: string[] = []
    
    // Response time scoring
    if (summaryMetrics.avgResponseTime > 2000) {
      score -= 40
      recommendations.push('Optimize slow database queries')
    } else if (summaryMetrics.avgResponseTime > 1000) {
      score -= 20
      recommendations.push('Consider query optimization')
    }
    
    // Cache efficiency scoring
    if (summaryMetrics.cacheEfficiency < 50) {
      score -= 30
      recommendations.push('Improve caching strategy and TTL values')
    } else if (summaryMetrics.cacheEfficiency < 70) {
      score -= 15
      recommendations.push('Fine-tune cache configuration')
    }
    
    // Memory usage scoring
    if (summaryMetrics.memoryUsage > 10 * 1024) { // 10MB
      score -= 15
      recommendations.push('Consider reducing cache size or implementing compression')
    } else if (summaryMetrics.memoryUsage > 5 * 1024) { // 5MB
      score -= 5
    }
    
    score = Math.max(0, score)
    
    const status = score >= 90 ? 'excellent' : 
                   score >= 75 ? 'good' : 
                   score >= 60 ? 'fair' : 'poor'
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal')
    }
    
    return {
      status,
      score,
      recommendations,
      metrics: summaryMetrics
    }
  }

  /**
   * Smart cache invalidation based on data relationships
   */
  smartInvalidateCache(changeType: 'team' | 'member' | 'sprint' | 'absence', entityId?: string): void {
    console.log(`🧹 Smart cache invalidation: ${changeType}${entityId ? ` (${entityId})` : ''}`)
    
    switch (changeType) {
      case 'team':
        this.invalidateCache('team')
        this.invalidateCache('capacity')
        break
      case 'member':
        this.invalidateCache('team_members')
        this.invalidateCache('capacity')
        this.invalidateCache('analytics')
        break
      case 'sprint':
        this.invalidateCache('sprint')
        this.invalidateCache('capacity')
        this.invalidateCache('analytics')
        break
      case 'absence':
        this.invalidateCache('absence')
        this.invalidateCache('capacity')
        break
    }
  }

  /**
   * Preload critical data for dashboard
   */
  async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up cache with critical data...')
    
    const warmUpPromises = [
      this.getTeamMembers(),
      this.getCurrentEnhancedSprint(),
      this.getTeamSprintAnalytics(),
      // Preload today's capacity
      this.getTeamCapacityForDate(new Date().toISOString().slice(0, 10))
    ]
    
    try {
      await Promise.allSettled(warmUpPromises)
      console.log('✅ Cache warm-up completed')
    } catch (error) {
      console.warn('⚠️ Cache warm-up partially failed:', error)
    }
  }

  /**
   * Optimize cache by removing stale entries
   */
  optimizeCache(): void {
    const sizeBefore = this.cache.size
    let removedCount = 0
    
    // Remove expired entries
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }
    
    console.log(`🧽 Cache optimization: Removed ${removedCount} expired entries (${sizeBefore} -> ${this.cache.size})`)
    this.updateCacheStats()
  }

  /**
   * Log comprehensive performance report
   */
  logPerformanceReport(): void {
    const summary = this.getPerformanceSummary()
    const metrics = this.getPerformanceMetrics()
    const cacheStats = this.getCacheStats()
    
    console.group('📊 DATASERVICE PERFORMANCE REPORT')
    console.log(`🏆 Overall Status: ${summary.status.toUpperCase()} (${summary.score}/100)`)
    console.log(`⌚ Avg Response Time: ${summary.metrics.avgResponseTime.toFixed(0)}ms`)
    console.log(`💾 Cache Hit Rate: ${summary.metrics.cacheEfficiency.toFixed(1)}%`)
    console.log(`🧠 Memory Usage: ${summary.metrics.memoryUsage}KB`)
    console.log(`📦 Cache Size: ${cacheStats.cacheSize} entries`)
    
    if (metrics.slowQueries.length > 0) {
      console.group('🐌 Slow Queries:')
      metrics.slowQueries.slice(0, 5).forEach((query, i) => {
        console.log(`${i + 1}. ${query.queryName}: ${Math.round(query.duration)}ms`)
      })
      console.groupEnd()
    }
    
    console.log('💡 Recommendations:')
    summary.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })
    
    console.groupEnd()
  }
}

// Export singleton instance
export const dataService = DataService.getInstance()
export default dataService

// Initialize performance monitoring in development
// TODO: Fix type conflicts with console and method calls
/*
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🚀 Enhanced DataService initialized with performance monitoring')
  
  // Warm up cache on initialization
  dataService.warmUpCache().catch(err => 
    console.warn('Initial cache warm-up failed:', err)
  )
  
  // Performance monitoring intervals
  setInterval(() => {
    dataService.optimizeCache()
  }, 10 * 60 * 1000) // Optimize cache every 10 minutes
  
  setInterval(() => {
    dataService.logPerformanceReport()
  }, 15 * 60 * 1000) // Log performance report every 15 minutes
  
  // Add global access for debugging
  (window as any).dataServiceDebug = {
    getReport: () => dataService.logPerformanceReport(),
    getMetrics: () => dataService.getPerformanceMetrics(),
    getCacheStats: () => dataService.getCacheStats(),
    warmUpCache: () => dataService.warmUpCache(),
    optimizeCache: () => dataService.optimizeCache(),
    clearCache: () => dataService.invalidateCache(),
    getSummary: () => dataService.getPerformanceSummary()
  }
}
*/