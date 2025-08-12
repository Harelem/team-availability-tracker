import { useState, useEffect, useMemo } from 'react'
import { dataService } from '../services/DataService'
import { useDataCache } from './useDataCache'
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

/**
 * Optimized hook for dashboard data with intelligent caching and batching
 */
export function useOptimizedDashboardData() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  
  // Use batch query for today and tomorrow capacity
  const { data: capacityData, loading: capacityLoading, error: capacityError } = useDataCache(
    `dashboard_capacity_${today}_${tomorrow}`,
    () => dataService.getTeamCapacityBatch([today, tomorrow]),
    { ttl: 1 * 60 * 1000 } // 1 minute TTL
  )

  // Get absence statistics with caching
  const { data: statsData, loading: statsLoading, error: statsError } = useDataCache(
    'dashboard_absence_stats',
    () => dataService.getAbsenceStatistics(),
    { ttl: 2 * 60 * 1000 } // 2 minutes TTL
  )

  // Get team members with caching
  const { data: teamMembers, loading: teamLoading, error: teamError } = useDataCache(
    'dashboard_team_members',
    () => dataService.getTeamMembers(),
    { ttl: 5 * 60 * 1000 } // 5 minutes TTL
  )

  const loading = capacityLoading || statsLoading || teamLoading
  const error = capacityError || statsError || teamError

  const processedData = useMemo(() => {
    if (!capacityData || !statsData || !teamMembers) {
      return null
    }

    const todayCapacity = capacityData[today]
    const tomorrowCapacity = capacityData[tomorrow]

    return {
      todayCapacity: todayCapacity || { totalCapacity: 0, availableCapacity: 0, absences: [] },
      tomorrowCapacity: tomorrowCapacity || { totalCapacity: 0, availableCapacity: 0, absences: [] },
      stats: statsData,
      teamMembers,
      criticalAlerts: todayCapacity && todayCapacity.availableCapacity < 3 ? 1 : 0,
      upcomingAbsences: tomorrowCapacity ? tomorrowCapacity.absences.length : 0
    }
  }, [capacityData, statsData, teamMembers, today, tomorrow])

  return {
    data: processedData,
    loading,
    error,
    refetch: () => {
      // Invalidate relevant caches to force refetch
      dataService.invalidateCache('dashboard')
      dataService.invalidateCache('team_capacity')
      dataService.invalidateCache('absence_stats')
    }
  }
}

/**
 * Optimized hook for weekly analytics with batch capacity queries
 */
export function useOptimizedWeeklyAnalytics() {
  // Generate current week dates
  const weekDates = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeek(today)
    const weekEnd = endOfWeek(today)
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
      .map(day => format(day, 'yyyy-MM-dd'))
  }, [])

  // Batch query for all week dates at once (major optimization)
  const { data: batchCapacityData, loading: capacityLoading, error: capacityError } = useDataCache(
    `weekly_capacity_${weekDates.join('_')}`,
    () => dataService.getTeamCapacityBatch(weekDates),
    { ttl: 1 * 60 * 1000 } // 1 minute TTL
  )

  // Get absence statistics
  const { data: statsData, loading: statsLoading, error: statsError } = useDataCache(
    'weekly_absence_stats',
    () => dataService.getAbsenceStatistics(),
    { ttl: 2 * 60 * 1000 } // 2 minutes TTL
  )

  const loading = capacityLoading || statsLoading
  const error = capacityError || statsError

  const processedData = useMemo(() => {
    if (!batchCapacityData || !statsData) {
      return null
    }

    // Transform batch data into expected format
    const weeklyCapacity = weekDates.map(date => {
      const dayData = batchCapacityData[date]
      return {
        date,
        available: dayData?.availableCapacity || 0,
        total: dayData?.totalCapacity || 0,
        percentage: dayData?.totalCapacity > 0 
          ? (dayData.availableCapacity / dayData.totalCapacity) * 100 
          : 0,
        absences: dayData?.absences || []
      }
    })

    // Calculate key metrics
    const averageCapacity = weeklyCapacity.length > 0 
      ? weeklyCapacity.reduce((sum, day) => sum + day.percentage, 0) / weeklyCapacity.length 
      : 0

    const criticalDays = weeklyCapacity.filter(day => day.percentage < 60).length
    const totalAbsenceDays = weeklyCapacity.reduce((sum, day) => sum + (day.total - day.available), 0)
    const capacityGaps = weeklyCapacity.filter(day => day.percentage < 70)

    return {
      weeklyCapacity,
      stats: statsData,
      metrics: {
        averageCapacity,
        criticalDays,
        totalAbsenceDays,
        capacityGaps: capacityGaps.length
      },
      capacityGaps
    }
  }, [batchCapacityData, statsData, weekDates])

  return {
    data: processedData,
    loading,
    error,
    refetch: () => {
      dataService.invalidateCache('weekly')
      dataService.invalidateCache('batch_capacity')
    }
  }
}

/**
 * Optimized hook for team capacity with intelligent prefetching
 */
export function useOptimizedTeamCapacity(dates: string[]) {
  // Use batch query for multiple dates
  const { data, loading, error, revalidate } = useDataCache(
    `team_capacity_batch_${dates.sort().join('_')}`,
    () => dataService.getTeamCapacityBatch(dates),
    { 
      ttl: 1 * 60 * 1000, // 1 minute TTL
      revalidateOnFocus: true // Revalidate when user focuses on the tab
    }
  )

  // Prefetch next few days in the background
  useEffect(() => {
    const prefetchDates = []
    const maxDate = dates.reduce((max, date) => date > max ? date : max, dates[0])
    
    // Prefetch next 3 days
    for (let i = 1; i <= 3; i++) {
      const nextDate = format(
        new Date(new Date(maxDate).getTime() + i * 24 * 60 * 60 * 1000), 
        'yyyy-MM-dd'
      )
      prefetchDates.push(nextDate)
    }

    // Prefetch in background without blocking
    dataService.getTeamCapacityBatch(prefetchDates).catch(() => {
      // Ignore prefetch errors
    })
  }, [dates])

  return {
    data,
    loading,
    error,
    refetch: revalidate
  }
}

/**
 * Optimized hook for absence operations with cache invalidation
 */
export function useOptimizedAbsenceOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createAbsence = async (absenceData: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await dataService.createAbsenceRecord(absenceData)
      
      // Cache is automatically invalidated by the service
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateAbsence = async (id: string, updates: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await dataService.updateAbsenceRecord(id, updates)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteAbsence = async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await dataService.deleteAbsenceRecord(id)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    createAbsence,
    updateAbsence,
    deleteAbsence,
    loading,
    error
  }
}

/**
 * Hook for performance monitoring of the optimized data layer
 */
export function useDataLayerPerformance() {
  const [metrics, setMetrics] = useState({
    cacheHitRate: 0,
    averageResponseTime: 0,
    queryCount: 0,
    cacheSize: 0
  })

  useEffect(() => {
    const updateMetrics = () => {
      const cacheStats = dataService.getCacheStats()
      setMetrics({
        cacheHitRate: cacheStats.hitRate || 0,
        averageResponseTime: 0, // TODO: Implement in DataService  
        queryCount: cacheStats.totalQueries || 0,
        cacheSize: cacheStats.cacheSize
      })
    }

    // Update metrics every 30 seconds
    const interval = setInterval(updateMetrics, 30000)
    updateMetrics() // Initial update

    return () => clearInterval(interval)
  }, [])

  const clearCache = () => {
    dataService.invalidateCache()
    setMetrics(prev => ({ ...prev, cacheSize: 0 }))
  }

  return {
    metrics,
    clearCache
  }
}

export default {
  useOptimizedDashboardData,
  useOptimizedWeeklyAnalytics,
  useOptimizedTeamCapacity,
  useOptimizedAbsenceOperations,
  useDataLayerPerformance
}