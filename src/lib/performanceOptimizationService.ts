/**
 * Performance Optimization Service
 * 
 * This service acts as a high-performance caching layer over existing database services,
 * providing intelligent caching, query optimization, and performance monitoring without
 * modifying the core application architecture.
 */

import { DatabaseService } from './database'
import { dataService } from '@/services/DataService'
import { enhancedDatabaseService } from './enhancedDatabaseService'
import type { Team, TeamMember, TeamStats, TeamSprintAnalytics } from '@/types'

interface CacheStrategy {
  ttl: number
  useEnhanced?: boolean
  batchSize?: number
  preload?: boolean
}

interface QueryOptimizationMetrics {
  originalQueryCount: number
  optimizedQueryCount: number
  cacheHitRate: number
  performanceImprovement: number
  memoryUsage: number
}

class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService
  private metrics: QueryOptimizationMetrics = {
    originalQueryCount: 0,
    optimizedQueryCount: 0,
    cacheHitRate: 0,
    performanceImprovement: 0,
    memoryUsage: 0
  }

  // Cache strategies for different data types
  private cacheStrategies: Record<string, CacheStrategy> = {
    teams: { ttl: 10 * 60 * 1000, preload: true }, // 10 minutes
    teamMembers: { ttl: 5 * 60 * 1000, useEnhanced: true }, // 5 minutes  
    teamStats: { ttl: 5 * 60 * 1000, batchSize: 10 }, // 5 minutes
    sprintData: { ttl: 2 * 60 * 1000, useEnhanced: true }, // 2 minutes
    analytics: { ttl: 3 * 60 * 1000, useEnhanced: true } // 3 minutes
  }

  static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService()
    }
    return PerformanceOptimizationService.instance
  }

  /**
   * Optimized Teams Query with intelligent service selection
   */
  async getTeamsOptimized(options: {
    includeMembers?: boolean
    useCache?: boolean
    strategy?: 'fast' | 'complete' | 'lite'
  } = {}): Promise<Team[]> {
    const { includeMembers = false, useCache = true, strategy = 'fast' } = options
    
    this.metrics.originalQueryCount++
    
    try {
      // Strategy-based optimization
      switch (strategy) {
        case 'lite':
          // Use enhanced service for minimal data
          const liteTeams = await enhancedDatabaseService.getTeamsLite(useCache)
          return liteTeams.map(team => ({
            id: team.id,
            name: team.name,
            description: `${team.member_count} members`,
            color: '#3b82f6',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
          
        case 'complete':
          if (includeMembers) {
            // Use enhanced service for complete data with members
            const teamsWithMembers = await enhancedDatabaseService.getAllTeamsWithMembers(useCache)
            return teamsWithMembers.map(team => ({
              id: team.id,
              name: team.name,
              description: team.description || undefined,
              color: team.color || '#3b82f6',
              created_at: team.created_at,
              updated_at: team.updated_at
            }))
          }
          // Fall through to fast strategy
          
        case 'fast':
        default:
          // Use original service with enhanced caching
          return await this.withPerformanceTracking(
            'getTeams',
            () => DatabaseService.getTeams(),
            this.cacheStrategies.teams
          )
      }
    } catch (error) {
      console.warn('Optimized teams query failed, falling back to original:', error)
      return await DatabaseService.getTeams()
    }
  }

  /**
   * Optimized Team Members Query with batching
   */
  async getTeamMembersOptimized(teamId: number, options: {
    useCache?: boolean
    includeLite?: boolean
  } = {}): Promise<TeamMember[]> {
    const { useCache = true, includeLite = false } = options
    
    this.metrics.originalQueryCount++
    
    try {
      if (includeLite) {
        // Use lite version for better performance
        const liteMembers = await enhancedDatabaseService.getTeamMembersLite(teamId, useCache)
        return liteMembers.map(member => ({
          id: member.id,
          name: member.name,
          hebrew: member.name, // Fallback
          is_manager: member.is_manager,
          email: '',
          team_id: teamId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      }

      // Use enhanced service for complete data
      return await enhancedDatabaseService.getTeamMembers(teamId, useCache)
    } catch (error) {
      console.warn('Optimized team members query failed, falling back:', error)
      // Fallback to dataService if available
      try {
        const allMembers = await dataService.getTeamMembers()
        return allMembers.filter(member => member.team_id === teamId)
      } catch (fallbackError) {
        console.error('All team member queries failed:', fallbackError)
        return []
      }
    }
  }

  /**
   * Batch Team Data Loading for Dashboard Performance
   */
  async getBatchTeamDataOptimized(teamIds: number[]): Promise<Map<number, {
    team: Team
    members: TeamMember[]
    analytics?: TeamSprintAnalytics
  }>> {
    this.metrics.originalQueryCount++
    
    try {
      // Use enhanced service batch operation
      const batchData = await enhancedDatabaseService.batchGetTeamData(teamIds, true)
      
      const result = new Map<number, any>()
      batchData.forEach((data, teamId) => {
        result.set(teamId, {
          team: data.team,
          members: data.members,
          analytics: data.analytics
        })
      })
      
      this.metrics.optimizedQueryCount++
      return result
    } catch (error) {
      console.warn('Batch team data query failed, falling back to individual queries:', error)
      
      // Fallback to individual optimized queries
      const result = new Map<number, any>()
      await Promise.allSettled(
        teamIds.map(async (teamId) => {
          try {
            const [team, members] = await Promise.all([
              this.getTeamsOptimized({ strategy: 'fast' }).then(teams => 
                teams.find(t => t.id === teamId)
              ),
              this.getTeamMembersOptimized(teamId, { includeLite: true })
            ])
            
            if (team) {
              result.set(teamId, { team, members })
            }
          } catch (err) {
            console.warn(`Failed to load data for team ${teamId}:`, err)
          }
        })
      )
      
      return result
    }
  }

  /**
   * Optimized Sprint Analytics with Caching
   */
  async getSprintAnalyticsOptimized(teamId?: number): Promise<TeamSprintAnalytics[]> {
    this.metrics.originalQueryCount++
    
    try {
      // Use enhanced service for analytics
      return await enhancedDatabaseService.getTeamSprintAnalytics(teamId, true)
    } catch (error) {
      console.warn('Enhanced analytics query failed, falling back to dataService:', error)
      
      try {
        const analytics = await dataService.getTeamSprintAnalytics()
        return teamId ? analytics.filter(a => a.team_id === teamId) : analytics
      } catch (fallbackError) {
        console.error('All analytics queries failed:', fallbackError)
        return []
      }
    }
  }

  /**
   * Performance tracking wrapper for database operations
   */
  private async withPerformanceTracking<T>(
    operationName: string,
    operation: () => Promise<T>,
    strategy: CacheStrategy
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await operation()
      const duration = performance.now() - startTime
      
      // Log slow operations
      if (duration > 1000) {
        console.warn(`🐌 Slow operation: ${operationName} took ${Math.round(duration)}ms`)
      }
      
      this.metrics.optimizedQueryCount++
      return result
    } catch (error) {
      console.error(`Performance tracked operation ${operationName} failed:`, error)
      throw error
    }
  }

  /**
   * Preload critical data for better initial performance
   */
  async preloadCriticalData(): Promise<void> {
    console.log('🚀 Preloading critical data for optimal performance...')
    
    const preloadPromises = [
      // Enhanced database service preloading
      enhancedDatabaseService.warmupCache('user'),
      
      // Data service cache warming
      dataService.warmUpCache(),
      
      // Preload most common queries
      this.getTeamsOptimized({ strategy: 'lite', useCache: true }).catch(err => 
        console.warn('Teams preload failed:', err)
      ),
      
      // Preload current sprint data
      enhancedDatabaseService.getCurrentSprint(true).catch(err => 
        console.warn('Current sprint preload failed:', err)
      )
    ]
    
    try {
      await Promise.allSettled(preloadPromises)
      console.log('✅ Critical data preloading completed')
    } catch (error) {
      console.warn('⚠️ Critical data preloading partially failed:', error)
    }
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  async intelligentCacheWarm(userRole?: string, teamId?: number): Promise<void> {
    console.log(`🧠 Intelligent cache warming for role: ${userRole || 'user'}`)
    
    const warmingPromises: Promise<any>[] = []
    
    // Role-based warming
    if (userRole === 'coo' || userRole === 'admin') {
      // COO needs comprehensive data
      warmingPromises.push(
        this.getBatchTeamDataOptimized([]),
        enhancedDatabaseService.warmupCache('coo'),
        this.getSprintAnalyticsOptimized()
      )
    } else {
      // Regular users need basic team data
      warmingPromises.push(
        this.getTeamsOptimized({ strategy: 'lite' }),
        enhancedDatabaseService.warmupCache('user')
      )
    }
    
    // Team-specific warming
    if (teamId) {
      warmingPromises.push(
        this.getTeamMembersOptimized(teamId),
        enhancedDatabaseService.warmupCacheForTeam(teamId)
      )
    }
    
    try {
      await Promise.allSettled(warmingPromises)
      console.log('✨ Intelligent cache warming completed')
    } catch (error) {
      console.warn('Cache warming failed:', error)
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): {
    optimization: QueryOptimizationMetrics
    enhancedDb: ReturnType<typeof enhancedDatabaseService.getPerformanceMetrics>
    dataService: ReturnType<typeof dataService.getPerformanceMetrics>
  } {
    // Calculate performance improvement
    if (this.metrics.originalQueryCount > 0) {
      this.metrics.performanceImprovement = 
        ((this.metrics.originalQueryCount - this.metrics.optimizedQueryCount) / 
         this.metrics.originalQueryCount) * 100
    }
    
    return {
      optimization: this.metrics,
      enhancedDb: enhancedDatabaseService.getPerformanceMetrics(),
      dataService: dataService.getPerformanceMetrics()
    }
  }

  /**
   * Comprehensive performance report
   */
  logComprehensivePerformanceReport(): void {
    const metrics = this.getPerformanceMetrics()
    
    console.group('🚀 COMPREHENSIVE PERFORMANCE OPTIMIZATION REPORT')
    
    // Optimization layer metrics
    console.group('📈 Query Optimization Layer')
    console.log(`Original Queries: ${metrics.optimization.originalQueryCount}`)
    console.log(`Optimized Queries: ${metrics.optimization.optimizedQueryCount}`)
    console.log(`Performance Improvement: ${metrics.optimization.performanceImprovement.toFixed(1)}%`)
    console.groupEnd()
    
    // Enhanced DB performance
    console.group('⚡ Enhanced Database Service')
    console.log(`Cache Hit Rate: ${metrics.enhancedDb.cacheHitRate.toFixed(1)}%`)
    console.log(`Avg Query Time: ${metrics.enhancedDb.averageQueryTime.toFixed(0)}ms`)
    console.log(`Total Queries: ${metrics.enhancedDb.totalQueries}`)
    if (metrics.enhancedDb.slowQueries.length > 0) {
      console.log(`Slow Queries: ${metrics.enhancedDb.slowQueries.length}`)
    }
    console.groupEnd()
    
    // Data service performance  
    console.group('💾 Data Service')
    console.log(`Cache Hit Rate: ${metrics.dataService.cacheHitRate.toFixed(1)}%`)
    console.log(`Avg Response Time: ${metrics.dataService.averageResponseTime.toFixed(0)}ms`)
    console.log(`Total Queries: ${metrics.dataService.totalQueries}`)
    console.groupEnd()
    
    // Overall recommendations
    console.group('💡 Optimization Recommendations')
    const recommendations = this.getOptimizationRecommendations(metrics)
    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`)
    })
    console.groupEnd()
    
    console.groupEnd()
  }

  /**
   * Get optimization recommendations based on performance metrics
   */
  private getOptimizationRecommendations(metrics: any): string[] {
    const recommendations: string[] = []
    
    // Query optimization recommendations
    if (metrics.optimization.performanceImprovement < 20) {
      recommendations.push('Consider using more batch operations and enhanced service methods')
    }
    
    // Cache efficiency recommendations
    if (metrics.enhancedDb.cacheHitRate < 70) {
      recommendations.push('Fine-tune cache TTL values in enhanced database service')
    }
    
    if (metrics.dataService.cacheHitRate < 60) {
      recommendations.push('Optimize DataService caching strategy')
    }
    
    // Performance recommendations
    if (metrics.enhancedDb.averageQueryTime > 500) {
      recommendations.push('Investigate slow database queries and consider indexing')
    }
    
    if (metrics.dataService.averageResponseTime > 300) {
      recommendations.push('Review DataService query patterns for optimization')
    }
    
    // Memory recommendations
    if (metrics.enhancedDb.performanceStats?.peakMemoryUsage > 100) {
      recommendations.push('Consider reducing cache size or implementing data compression')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal - all systems operating efficiently')
    }
    
    return recommendations
  }

  /**
   * Smart invalidation across all services
   */
  smartInvalidateAll(changeType: 'team' | 'member' | 'sprint' | 'schedule', entityId?: number | string): void {
    console.log(`🧹 Smart invalidation across all services: ${changeType}`)
    
    // Enhanced database service invalidation
    enhancedDatabaseService.smartInvalidateCache(
      changeType === 'schedule' ? 'schedule_update' : `${changeType}_update`,
      entityId
    )
    
    // Data service invalidation
    dataService.smartInvalidateCache(
      changeType === 'schedule' ? 'absence' : changeType,
      entityId?.toString()
    )
    
    // Reset our metrics after invalidation
    this.metrics.cacheHitRate = 0
  }

  /**
   * Emergency performance optimization
   */
  async emergencyOptimization(): Promise<void> {
    console.log('🚨 Emergency performance optimization initiated')
    
    try {
      // Clear all caches to free memory
      enhancedDatabaseService.clearCache()
      dataService.invalidateCache()
      
      // Preload only critical data
      await Promise.allSettled([
        enhancedDatabaseService.getCurrentSprint(false),
        dataService.getTeamMembers()
      ])
      
      console.log('✅ Emergency optimization completed')
    } catch (error) {
      console.error('❌ Emergency optimization failed:', error)
    }
  }
}

// Export singleton instance
export const performanceOptimizationService = PerformanceOptimizationService.getInstance()
export default performanceOptimizationService

// Initialize performance optimization in development
// TODO: Fix type issues with console and method calls
/*
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🎯 Performance Optimization Service initialized')
  
  // Add global debugging access
  (window as any).performanceOptimization = {
    getReport: () => performanceOptimizationService.logComprehensivePerformanceReport(),
    getMetrics: () => performanceOptimizationService.getPerformanceMetrics(),
    preloadData: () => performanceOptimizationService.preloadCriticalData(),
    warmCache: (role?: string, teamId?: number) => 
      performanceOptimizationService.intelligentCacheWarm(role, teamId),
    emergencyOptimize: () => performanceOptimizationService.emergencyOptimization()
  }
}
*/