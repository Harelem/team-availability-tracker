import { supabase } from '../lib/database'

export interface QueryPerformanceMetrics {
  queryType: string
  executionTime: number
  cacheHit: boolean
  timestamp: number
  resultCount?: number
}

export interface QueryBatchOptions {
  maxBatchSize?: number
  timeoutMs?: number
  retryAttempts?: number
}

/**
 * Query optimization utility for Supabase operations
 */
export class QueryOptimizer {
  private static instance: QueryOptimizer
  private performanceMetrics: QueryPerformanceMetrics[] = []
  private readonly MAX_METRICS_HISTORY = 1000

  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer()
    }
    return QueryOptimizer.instance
  }

  /**
   * Track query performance for monitoring
   */
  trackQueryPerformance(metrics: QueryPerformanceMetrics): void {
    this.performanceMetrics.push({
      ...metrics,
      timestamp: Date.now()
    })

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS_HISTORY)
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageResponseTime: number
    cacheHitRate: number
    queryTypeBreakdown: Record<string, { count: number; avgTime: number }>
  } {
    if (this.performanceMetrics.length === 0) {
      return { averageResponseTime: 0, cacheHitRate: 0, queryTypeBreakdown: {} }
    }

    const totalTime = this.performanceMetrics.reduce((sum, m) => sum + m.executionTime, 0)
    const cacheHits = this.performanceMetrics.filter(m => m.cacheHit).length
    const averageResponseTime = totalTime / this.performanceMetrics.length
    const cacheHitRate = cacheHits / this.performanceMetrics.length

    // Group by query type
    const queryTypeBreakdown: Record<string, { count: number; avgTime: number }> = {}
    const groupedByType = this.performanceMetrics.reduce((acc, metric) => {
      if (!acc[metric.queryType]) {
        acc[metric.queryType] = []
      }
      acc[metric.queryType].push(metric)
      return acc
    }, {} as Record<string, QueryPerformanceMetrics[]>)

    for (const [type, metrics] of Object.entries(groupedByType)) {
      const totalTypeTime = metrics.reduce((sum, m) => sum + m.executionTime, 0)
      queryTypeBreakdown[type] = {
        count: metrics.length,
        avgTime: totalTypeTime / metrics.length
      }
    }

    return { averageResponseTime, cacheHitRate, queryTypeBreakdown }
  }

  /**
   * Batch team capacity queries for multiple dates
   */
  async batchTeamCapacityQueries(
    dates: string[],
    options: QueryBatchOptions = {}
  ): Promise<Record<string, any>> {
    const startTime = Date.now()
    const { maxBatchSize = 10, timeoutMs = 30000 } = options

    try {
      // Split into batches if needed
      const batches = this.chunkArray(dates, maxBatchSize)
      const results: Record<string, any> = {}

      // Process batches sequentially to avoid overwhelming the database
      for (const batch of batches) {
        const batchResults = await this.processBatchCapacityQueries(batch, timeoutMs)
        Object.assign(results, batchResults)
      }

      this.trackQueryPerformance({
        queryType: 'batch_team_capacity',
        executionTime: Date.now() - startTime,
        cacheHit: false,
        resultCount: Object.keys(results).length
      })

      return results
    } catch (error) {
      this.trackQueryPerformance({
        queryType: 'batch_team_capacity',
        executionTime: Date.now() - startTime,
        cacheHit: false
      })
      throw error
    }
  }

  /**
   * Process a single batch of capacity queries
   */
  private async processBatchCapacityQueries(
    dates: string[],
    timeoutMs: number
  ): Promise<Record<string, any>> {
    const minDate = dates.reduce((min, date) => date < min ? date : min)
    const maxDate = dates.reduce((max, date) => date > max ? date : max)

    // Single query for team members (cached at DB level)
    const teamMembersPromise = supabase
      .from('team_members')
      .select('*')

    // Single query for all absences in the date range
    const absencesPromise = supabase
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

    // Execute queries in parallel with timeout
    const [teamResult, absenceResult] = await Promise.race([
      Promise.all([teamMembersPromise, absencesPromise]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      )
    ]) as [any, any]

    if (teamResult.error) throw teamResult.error
    if (absenceResult.error) throw absenceResult.error

    const teamMembers = teamResult.data || []
    const allAbsences = absenceResult.data || []
    const totalCapacity = teamMembers.length

    // Process results for each date
    const results: Record<string, any> = {}
    
    dates.forEach(date => {
      const dateAbsences = allAbsences.filter((absence: any) =>
        absence.start_date <= date && absence.end_date >= date
      )

      results[date] = {
        totalCapacity,
        availableCapacity: totalCapacity - dateAbsences.length,
        absences: dateAbsences
      }
    })

    return results
  }

  /**
   * Optimize absence statistics query with aggregation
   */
  async getOptimizedAbsenceStatistics(): Promise<{
    totalAbsences: number
    byReason: Record<string, number>
    byDepartment: Record<string, number>
    byMonth: Record<string, number>
  }> {
    const startTime = Date.now()

    try {
      // Use a more efficient query that only selects needed fields
      const { data, error } = await supabase
        .from('absence_records')
        .select(`
          reason,
          start_date,
          team_members!inner (
            department
          )
        `)

      if (error) throw error

      const absences = data || []

      // Efficient aggregation in memory (faster than multiple DB queries)
      const byReason: Record<string, number> = {}
      const byDepartment: Record<string, number> = {}
      const byMonth: Record<string, number> = {}

      absences.forEach((absence: any) => {
        // By reason
        byReason[absence.reason] = (byReason[absence.reason] || 0) + 1

        // By department
        if (absence.team_members?.department) {
          const dept = absence.team_members.department
          byDepartment[dept] = (byDepartment[dept] || 0) + 1
        }

        // By month
        const month = new Date(absence.start_date).toISOString().slice(0, 7)
        byMonth[month] = (byMonth[month] || 0) + 1
      })

      const result = {
        totalAbsences: absences.length,
        byReason,
        byDepartment,
        byMonth
      }

      this.trackQueryPerformance({
        queryType: 'optimized_absence_stats',
        executionTime: Date.now() - startTime,
        cacheHit: false,
        resultCount: absences.length
      })

      return result
    } catch (error) {
      this.trackQueryPerformance({
        queryType: 'optimized_absence_stats',
        executionTime: Date.now() - startTime,
        cacheHit: false
      })
      throw error
    }
  }

  /**
   * Batch absence record operations for better performance
   */
  async batchAbsenceOperations(
    operations: Array<{
      type: 'insert' | 'update' | 'delete'
      data: any
      id?: string
    }>
  ): Promise<any[]> {
    const startTime = Date.now()
    const results: any[] = []

    try {
      // Group operations by type for better batching
      const groupedOps = operations.reduce((acc, op) => {
        if (!acc[op.type]) acc[op.type] = []
        acc[op.type].push(op)
        return acc
      }, {} as Record<string, any[]>)

      // Process inserts in batch
      if (groupedOps.insert?.length) {
        const insertData = groupedOps.insert.map(op => op.data)
        const { data, error } = await supabase
          .from('absence_records')
          .insert(insertData)
          .select()

        if (error) throw error
        results.push(...(data || []))
      }

      // Process updates individually (Supabase doesn't support batch updates well)
      if (groupedOps.update?.length) {
        for (const op of groupedOps.update) {
          const { data, error } = await supabase
            .from('absence_records')
            .update(op.data)
            .eq('id', op.id)
            .select()

          if (error) throw error
          if (data?.[0]) results.push(data[0])
        }
      }

      // Process deletes with IN clause
      if (groupedOps.delete?.length) {
        const deleteIds = groupedOps.delete.map(op => op.id).filter(Boolean)
        if (deleteIds.length) {
          const { error } = await supabase
            .from('absence_records')
            .delete()
            .in('id', deleteIds)

          if (error) throw error
        }
      }

      this.trackQueryPerformance({
        queryType: 'batch_absence_operations',
        executionTime: Date.now() - startTime,
        cacheHit: false,
        resultCount: results.length
      })

      return results
    } catch (error) {
      this.trackQueryPerformance({
        queryType: 'batch_absence_operations',
        executionTime: Date.now() - startTime,
        cacheHit: false
      })
      throw error
    }
  }

  /**
   * Normalize query results for consistent format
   */
  normalizeAbsenceData(rawData: any[]): any[] {
    return rawData.map(absence => ({
      id: absence.id,
      team_member_id: absence.team_member_id,
      start_date: absence.start_date,
      end_date: absence.end_date,
      reason: absence.reason,
      notes: absence.notes,
      created_at: absence.created_at,
      team_member: absence.team_members ? {
        id: absence.team_members.id,
        name: absence.team_members.name,
        role: absence.team_members.role,
        department: absence.team_members.department
      } : null
    }))
  }

  /**
   * Utility function to chunk arrays for batching
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.performanceMetrics = []
  }

  /**
   * Get recent query trends
   */
  getQueryTrends(timeWindowMs: number = 60000): {
    queryCount: number
    avgResponseTime: number
    errorRate: number
  } {
    const cutoff = Date.now() - timeWindowMs
    const recentMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoff)

    if (recentMetrics.length === 0) {
      return { queryCount: 0, avgResponseTime: 0, errorRate: 0 }
    }

    const totalTime = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0)
    const avgResponseTime = totalTime / recentMetrics.length

    return {
      queryCount: recentMetrics.length,
      avgResponseTime,
      errorRate: 0 // TODO: Track errors separately
    }
  }
}

// Export singleton instance
export const queryOptimizer = QueryOptimizer.getInstance()
export default queryOptimizer