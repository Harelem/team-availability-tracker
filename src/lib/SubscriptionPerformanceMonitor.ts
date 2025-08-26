/**
 * Subscription Performance Monitor and Cache Optimization Service
 * Monitors subscription performance and provides intelligent caching and optimization
 */

import { subscriptionManager } from './SubscriptionManager'

interface PerformanceMetrics {
  timestamp: Date
  totalSubscriptions: number
  activeSubscriptions: number
  pooledConnections: number
  memoryEfficiency: number
  circuitBreakers: number
  failureRate: number
  averageResponseTime: number
}

interface CacheEntry {
  key: string
  data: any
  timestamp: Date
  hitCount: number
  lastAccessed: Date
  expiresAt: Date
}

interface SubscriptionPattern {
  pattern: string
  frequency: number
  averageLifetime: number
  shouldOptimize: boolean
}

export class SubscriptionPerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private cache = new Map<string, CacheEntry>()
  private patterns = new Map<string, SubscriptionPattern>()
  private alertThresholds = {
    maxFailureRate: 0.15, // 15%
    minMemoryEfficiency: 40, // 40%
    maxCircuitBreakers: 3,
    maxResponseTime: 2000 // 2 seconds
  }
  private monitoringInterval: NodeJS.Timeout | null = null
  private cacheCleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startMonitoring()
    this.startCacheCleanup()
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.analyzePatterns()
      this.checkAlerts()
    }, 30000) // Every 30 seconds
  }

  /**
   * Start cache cleanup process
   */
  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const stats = subscriptionManager.getMemoryStats()
    const allSubscriptions = subscriptionManager.getAllSubscriptions()
    
    // Calculate failure rate
    const failedCount = Object.values(allSubscriptions)
      .filter(sub => sub.lastError).length
    const failureRate = stats.totalSubscriptions > 0 
      ? failedCount / stats.totalSubscriptions 
      : 0

    // Estimate average response time (simplified metric)
    const averageResponseTime = this.estimateResponseTime()

    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      totalSubscriptions: stats.totalSubscriptions,
      activeSubscriptions: stats.activeSubscriptions,
      pooledConnections: stats.pooledConnections,
      memoryEfficiency: stats.memoryEfficiency,
      circuitBreakers: stats.circuitBreakers,
      failureRate,
      averageResponseTime
    }

    this.metrics.push(metrics)
    
    // Keep only last 100 metrics (about 50 minutes of data)
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    console.log(`📊 Subscription Performance: ${stats.activeSubscriptions}/${stats.totalSubscriptions} active, ${stats.memoryEfficiency}% efficiency, ${Math.round(failureRate * 100)}% failures`)
  }

  /**
   * Estimate response time based on system performance
   */
  private estimateResponseTime(): number {
    const stats = subscriptionManager.getMemoryStats()
    
    // Simple heuristic: more subscriptions and circuit breakers = slower response
    const baseTime = 100 // 100ms base
    const subscriptionPenalty = stats.totalSubscriptions * 2
    const circuitBreakerPenalty = stats.circuitBreakers * 50
    const efficiencyBonus = stats.memoryEfficiency * 2
    
    return Math.max(50, baseTime + subscriptionPenalty + circuitBreakerPenalty - efficiencyBonus)
  }

  /**
   * Analyze subscription patterns for optimization opportunities
   */
  private analyzePatterns(): void {
    const allSubscriptions = subscriptionManager.getAllSubscriptions()
    const patternCounts = new Map<string, number>()
    
    // Group subscriptions by pattern
    Object.entries(allSubscriptions).forEach(([key, sub]) => {
      const pattern = this.extractPattern(key, sub)
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1)
    })

    // Update pattern analysis
    patternCounts.forEach((frequency, pattern) => {
      const existing = this.patterns.get(pattern)
      if (existing) {
        existing.frequency = frequency
      } else {
        this.patterns.set(pattern, {
          pattern,
          frequency,
          averageLifetime: 0,
          shouldOptimize: frequency >= 3 // Optimize if 3+ similar subscriptions
        })
      }
    })
  }

  /**
   * Extract pattern from subscription key and info
   */
  private extractPattern(key: string, sub: any): string {
    // Extract meaningful patterns
    if (key.includes('team_schedule_')) {
      return 'team_schedule_pattern'
    } else if (key.includes('team_members_')) {
      return 'team_members_pattern'
    } else if (key.includes('sprint_')) {
      return 'sprint_pattern'
    } else {
      return 'other_pattern'
    }
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    if (this.metrics.length === 0) return
    
    const latest = this.metrics[this.metrics.length - 1]
    const alerts: string[] = []

    if (latest.failureRate > this.alertThresholds.maxFailureRate) {
      alerts.push(`High failure rate: ${Math.round(latest.failureRate * 100)}%`)
    }

    if (latest.memoryEfficiency < this.alertThresholds.minMemoryEfficiency) {
      alerts.push(`Low memory efficiency: ${latest.memoryEfficiency}%`)
    }

    if (latest.circuitBreakers > this.alertThresholds.maxCircuitBreakers) {
      alerts.push(`Too many circuit breakers: ${latest.circuitBreakers}`)
    }

    if (latest.averageResponseTime > this.alertThresholds.maxResponseTime) {
      alerts.push(`Slow response time: ${latest.averageResponseTime}ms`)
    }

    if (alerts.length > 0) {
      console.warn('🚨 Subscription Performance Alerts:', alerts)
      
      // Trigger automatic optimization
      this.triggerAutoOptimization(alerts)
    }
  }

  /**
   * Trigger automatic optimization based on alerts
   */
  private triggerAutoOptimization(alerts: string[]): void {
    console.log('🔧 Triggering automatic optimization...')
    
    // Force reconnection if too many failures
    if (alerts.some(alert => alert.includes('failure rate'))) {
      subscriptionManager.reconnectAll()
    }

    // Clear cache if memory efficiency is low
    if (alerts.some(alert => alert.includes('memory efficiency'))) {
      this.clearCache()
    }

    // Reset circuit breakers if there are too many
    if (alerts.some(alert => alert.includes('circuit breakers'))) {
      // Circuit breakers will reset automatically, but we can force cleanup
      subscriptionManager.cleanup()
    }
  }

  /**
   * Cache data for frequently accessed subscriptions
   */
  cacheData(key: string, data: any, ttlMs: number = 60000): void {
    const expiresAt = new Date(Date.now() + ttlMs)
    const existing = this.cache.get(key)
    
    this.cache.set(key, {
      key,
      data,
      timestamp: new Date(),
      hitCount: existing?.hitCount || 0,
      lastAccessed: new Date(),
      expiresAt
    })
  }

  /**
   * Get cached data
   */
  getCachedData(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key)
      return null
    }

    // Update access info
    entry.lastAccessed = new Date()
    entry.hitCount++
    
    return entry.data
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = new Date()
    let cleanedCount = 0

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`)
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`🗑️ Cleared ${size} cache entries`)
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    currentMetrics: PerformanceMetrics | null
    trends: {
      subscriptionGrowth: number
      efficiencyTrend: number
      failureTrend: number
    }
    patterns: SubscriptionPattern[]
    cacheStats: {
      totalEntries: number
      hitRate: number
      memoryUsage: string
    }
    recommendations: string[]
  } {
    const current = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
    
    // Calculate trends
    const trends = this.calculateTrends()
    
    // Get patterns
    const patterns = Array.from(this.patterns.values())
    
    // Calculate cache stats
    const cacheStats = this.calculateCacheStats()
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(current, trends, patterns)

    return {
      currentMetrics: current,
      trends,
      patterns,
      cacheStats,
      recommendations
    }
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): {
    subscriptionGrowth: number
    efficiencyTrend: number
    failureTrend: number
  } {
    if (this.metrics.length < 2) {
      return { subscriptionGrowth: 0, efficiencyTrend: 0, failureTrend: 0 }
    }

    const recent = this.metrics.slice(-10) // Last 10 measurements
    const older = this.metrics.slice(-20, -10) // Previous 10 measurements

    if (older.length === 0) {
      return { subscriptionGrowth: 0, efficiencyTrend: 0, failureTrend: 0 }
    }

    const recentAvg = {
      subscriptions: recent.reduce((sum, m) => sum + m.totalSubscriptions, 0) / recent.length,
      efficiency: recent.reduce((sum, m) => sum + m.memoryEfficiency, 0) / recent.length,
      failures: recent.reduce((sum, m) => sum + m.failureRate, 0) / recent.length
    }

    const olderAvg = {
      subscriptions: older.reduce((sum, m) => sum + m.totalSubscriptions, 0) / older.length,
      efficiency: older.reduce((sum, m) => sum + m.memoryEfficiency, 0) / older.length,
      failures: older.reduce((sum, m) => sum + m.failureRate, 0) / older.length
    }

    return {
      subscriptionGrowth: recentAvg.subscriptions - olderAvg.subscriptions,
      efficiencyTrend: recentAvg.efficiency - olderAvg.efficiency,
      failureTrend: recentAvg.failures - olderAvg.failures
    }
  }

  /**
   * Calculate cache statistics
   */
  private calculateCacheStats(): {
    totalEntries: number
    hitRate: number
    memoryUsage: string
  } {
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0)
    const totalRequests = Math.max(totalHits, entries.length)
    
    // Rough memory usage estimate
    const avgEntrySize = 1024 // Assume 1KB per entry
    const memoryBytes = entries.length * avgEntrySize
    const memoryUsage = memoryBytes > 1024 * 1024 
      ? `${Math.round(memoryBytes / (1024 * 1024))}MB`
      : `${Math.round(memoryBytes / 1024)}KB`

    return {
      totalEntries: entries.length,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      memoryUsage
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    current: PerformanceMetrics | null,
    trends: ReturnType<typeof this.calculateTrends>,
    patterns: SubscriptionPattern[]
  ): string[] {
    const recommendations: string[] = []

    if (!current) return recommendations

    // High failure rate
    if (current.failureRate > 0.1) {
      recommendations.push('Consider implementing more aggressive retry logic or investigating network issues')
    }

    // Low efficiency
    if (current.memoryEfficiency < 50) {
      recommendations.push('Optimize subscription patterns to use more connection pooling')
    }

    // Growing subscriptions without efficiency gains
    if (trends.subscriptionGrowth > 5 && trends.efficiencyTrend < 0) {
      recommendations.push('Review subscription lifecycle - consider longer-lived connections')
    }

    // Too many circuit breakers
    if (current.circuitBreakers > 2) {
      recommendations.push('Investigate frequent connection issues causing circuit breaker activation')
    }

    // Pattern-based recommendations
    const highFrequencyPatterns = patterns.filter(p => p.frequency > 5)
    if (highFrequencyPatterns.length > 0) {
      recommendations.push(`Consider optimizing high-frequency patterns: ${highFrequencyPatterns.map(p => p.pattern).join(', ')}`)
    }

    // Slow response times
    if (current.averageResponseTime > 1000) {
      recommendations.push('Consider implementing client-side caching for frequently accessed data')
    }

    return recommendations
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
      this.cacheCleanupInterval = null
    }

    this.clearCache()
    this.metrics = []
    this.patterns.clear()
  }
}

// Global instance
export const performanceMonitor = new SubscriptionPerformanceMonitor()

// Cleanup on app termination
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => performanceMonitor.destroy())
} else {
  process.on('exit', () => performanceMonitor.destroy())
  process.on('SIGINT', () => performanceMonitor.destroy())
  process.on('SIGTERM', () => performanceMonitor.destroy())
}