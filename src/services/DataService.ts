import { supabase } from '../lib/database'
import type { Database } from '../types/database'

type TeamMember = Database['public']['Tables']['team_members']['Row']
type AbsenceRecord = Database['public']['Tables']['absence_records']['Row']

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
}

interface BatchCapacityResult {
  [date: string]: TeamCapacity
}

/**
 * Centralized data service with intelligent caching and query optimization
 */
class DataService {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingQueries = new Map<string, Promise<any>>()
  private static instance: DataService

  // Default TTL values (in milliseconds)
  private readonly DEFAULT_TTL = {
    team_members: 5 * 60 * 1000, // 5 minutes
    absence_stats: 2 * 60 * 1000, // 2 minutes
    team_capacity: 1 * 60 * 1000, // 1 minute
    batch_capacity: 1 * 60 * 1000 // 1 minute
  }

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  /**
   * Get cached data or execute query with TTL caching
   */
  private async getCachedData<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Check if we have valid cached data
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T
    }

    // Check if query is already pending (deduplication)
    const pending = this.pendingQueries.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    // Execute query and cache result
    const queryPromise = queryFn().then((data) => {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      })
      this.pendingQueries.delete(key)
      return data
    }).catch((error) => {
      this.pendingQueries.delete(key)
      throw error
    })

    this.pendingQueries.set(key, queryPromise)
    return queryPromise
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
   * Get team members with caching
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
      this.DEFAULT_TTL.team_members
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
          if (absence.team_members?.department) {
            byDepartment[absence.team_members.department] = 
              (byDepartment[absence.team_members.department] || 0) + 1
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
      this.DEFAULT_TTL.absence_stats
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
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; hitRate: number; keys: string[] } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const dataService = DataService.getInstance()
export default dataService