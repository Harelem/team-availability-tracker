/**
 * Comprehensive Error Recovery Manager
 * Orchestrates all error recovery, offline support, and resilience mechanisms
 */

import { databaseCircuitBreaker, cooDashboardCircuitBreaker, globalRequestDeduplicator } from '@/utils/circuitBreaker'
import { retryWithBackoff, loadOfflineData, saveOfflineData, isOnline, waitForOnline } from '@/utils/errorRecovery'
import { queryBatcher } from './QueryBatcher'
import { subscriptionManager } from './SubscriptionManager'

interface RecoveryMetrics {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  offlineOperations: number
  retryOperations: number
  circuitBreakerTrips: number
  averageResponseTime: number
  startTime: number
}

interface ServiceStatus {
  database: 'healthy' | 'degraded' | 'down'
  coo_dashboard: 'healthy' | 'degraded' | 'down'
  subscriptions: 'healthy' | 'degraded' | 'down'
  offline_support: 'available' | 'unavailable'
  overall: 'healthy' | 'degraded' | 'critical'
}

interface RecoveryOptions {
  enableCircuitBreaker?: boolean
  enableRetry?: boolean
  enableOffline?: boolean
  enableCaching?: boolean
  enableDeduplication?: boolean
  priority?: 'high' | 'medium' | 'low'
}

export class ErrorRecoveryManager {
  private metrics: RecoveryMetrics
  private serviceStatus: ServiceStatus
  private isInitialized: boolean = false
  private statusCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    this.metrics = this.initializeMetrics()
    this.serviceStatus = this.initializeServiceStatus()
  }

  private initializeMetrics(): RecoveryMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      offlineOperations: 0,
      retryOperations: 0,
      circuitBreakerTrips: 0,
      averageResponseTime: 0,
      startTime: Date.now()
    }
  }

  private initializeServiceStatus(): ServiceStatus {
    return {
      database: 'healthy',
      coo_dashboard: 'healthy',
      subscriptions: 'healthy',
      offline_support: 'available',
      overall: 'healthy'
    }
  }

  /**
   * Initialize the error recovery system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🛡️ Initializing Error Recovery Manager...')

    try {
      // Initialize offline mode
      await this.initializeOfflineMode()
      
      // Start service monitoring
      this.startServiceMonitoring()
      
      // Initialize service worker if available
      await this.initializeServiceWorker()
      
      // Setup network event listeners
      this.setupNetworkListeners()
      
      this.isInitialized = true
      console.log('✅ Error Recovery Manager initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Error Recovery Manager:', error)
      throw error
    }
  }

  /**
   * Execute an operation with comprehensive error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: RecoveryOptions = {}
  ): Promise<T> {
    const startTime = Date.now()
    const {
      enableCircuitBreaker = true,
      enableRetry = true,
      enableOffline = true,
      enableCaching = true,
      enableDeduplication = true,
      priority = 'medium'
    } = options

    this.metrics.totalOperations++

    try {
      let result: T

      // 1. Try cache first if enabled
      if (enableCaching) {
        const cachedResult = await this.tryCache<T>(operationName)
        if (cachedResult !== null) {
          this.recordSuccess(startTime)
          return cachedResult
        }
      }

      // 2. Use request deduplication if enabled
      if (enableDeduplication) {
        result = await globalRequestDeduplicator.execute(
          `${operationName}-${JSON.stringify(options)}`,
          async () => {
            // 3. Use circuit breaker if enabled
            if (enableCircuitBreaker) {
              const circuitBreaker = this.selectCircuitBreaker(operationName)
              return await circuitBreaker.execute(async () => {
                // 4. Execute with retry if enabled
                if (enableRetry) {
                  const retryResult = await retryWithBackoff(operation, {
                    maxRetries: this.getRetryCount(priority),
                    baseDelay: 1000,
                    maxDelay: 10000,
                    backoffFactor: 2
                  })
                  
                  if (!retryResult.success) {
                    throw new Error(retryResult.error || 'Operation failed')
                  }
                  
                  if (retryResult.retriesAttempted && retryResult.retriesAttempted > 0) {
                    this.metrics.retryOperations++
                  }
                  
                  return retryResult.data!
                } else {
                  return await operation()
                }
              })
            } else {
              return await operation()
            }
          }
        )
      } else {
        // Execute without deduplication
        if (enableCircuitBreaker) {
          const circuitBreaker = this.selectCircuitBreaker(operationName)
          result = await circuitBreaker.execute(operation)
        } else {
          result = await operation()
        }
      }

      // 5. Cache successful result
      if (enableCaching && result) {
        await this.cacheResult(operationName, result)
      }

      this.recordSuccess(startTime)
      return result

    } catch (error) {
      console.warn(`⚠️ Operation '${operationName}' failed:`, error)

      // 6. Try offline fallback if enabled
      if (enableOffline && !isOnline()) {
        const offlineResult = await this.tryOfflineFallback<T>(operationName)
        if (offlineResult !== null) {
          this.recordOfflineSuccess(startTime)
          return offlineResult
        }
      }

      this.recordFailure(startTime)
      throw error
    }
  }

  /**
   * Try to get result from cache
   */
  private async tryCache<T>(operationName: string): Promise<T | null> {
    try {
      // Try QueryBatcher cache first
      const cacheKey = `recovery_cache_${operationName}`
      // Note: This would need to be integrated with the QueryBatcher caching mechanism
      return null // Placeholder implementation
    } catch (error) {
      console.warn('Cache lookup failed:', error)
      return null
    }
  }

  /**
   * Cache operation result
   */
  private async cacheResult<T>(operationName: string, result: T): Promise<void> {
    try {
      // This would integrate with the QueryBatcher or other caching mechanism
      console.log(`💾 Caching result for operation: ${operationName}`)
    } catch (error) {
      console.warn('Failed to cache result:', error)
    }
  }

  /**
   * Try offline fallback
   */
  private async tryOfflineFallback<T>(operationName: string): Promise<T | null> {
    try {
      const offlineData = loadOfflineData()
      if (!offlineData) return null

      // Map operation names to offline data
      switch (operationName.toLowerCase()) {
        case 'getteams':
          return offlineData.teams as unknown as T
        case 'getteammembers':
          return Object.values(offlineData.members).flat() as unknown as T
        default:
          console.warn(`No offline fallback available for operation: ${operationName}`)
          return null
      }
    } catch (error) {
      console.error('Offline fallback failed:', error)
      return null
    }
  }

  /**
   * Select appropriate circuit breaker
   */
  private selectCircuitBreaker(operationName: string) {
    if (operationName.toLowerCase().includes('coo') || operationName.toLowerCase().includes('dashboard')) {
      return cooDashboardCircuitBreaker
    }
    return databaseCircuitBreaker
  }

  /**
   * Get retry count based on priority
   */
  private getRetryCount(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 5
      case 'medium': return 3
      case 'low': return 1
    }
  }

  /**
   * Initialize offline mode capabilities
   */
  private async initializeOfflineMode(): Promise<void> {
    if (typeof window === 'undefined') return

    // Check if offline data is available
    const offlineData = loadOfflineData()
    if (offlineData) {
      console.log(`📱 Offline data available: ${offlineData.teams.length} teams`)
      this.serviceStatus.offline_support = 'available'
    } else {
      this.serviceStatus.offline_support = 'unavailable'
    }

    // Setup periodic offline data updates
    setInterval(() => {
      this.updateOfflineData()
    }, 10 * 60 * 1000) // Update every 10 minutes
  }

  /**
   * Update offline data periodically
   */
  private async updateOfflineData(): Promise<void> {
    if (!isOnline()) return

    try {
      // This would fetch current data and update offline cache
      console.log('🔄 Updating offline data cache...')
      // Implementation would call actual data fetching functions
    } catch (error) {
      console.warn('Failed to update offline data:', error)
    }
  }

  /**
   * Initialize service worker for offline support
   */
  private async initializeServiceWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ Service Worker registered successfully')
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker update found')
      })
    } catch (error) {
      console.warn('⚠️ Service Worker registration failed:', error)
    }
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      console.log('🌐 Network connection restored')
      this.onNetworkRestored()
    })

    window.addEventListener('offline', () => {
      console.log('📱 Network connection lost')
      this.onNetworkLost()
    })
  }

  /**
   * Handle network restoration
   */
  private async onNetworkRestored(): Promise<void> {
    // Reset circuit breakers
    databaseCircuitBreaker.reset()
    cooDashboardCircuitBreaker.reset()

    // Reconnect subscriptions
    subscriptionManager.reconnectAll()

    // Update service status
    this.updateServiceStatus()

    // Update offline data
    await this.updateOfflineData()
  }

  /**
   * Handle network loss
   */
  private onNetworkLost(): void {
    // Update service status to reflect offline state
    this.serviceStatus.database = 'down'
    this.serviceStatus.coo_dashboard = 'down'
    this.serviceStatus.subscriptions = 'down'
    this.serviceStatus.overall = 'critical'
  }

  /**
   * Start service monitoring
   */
  private startServiceMonitoring(): void {
    this.statusCheckInterval = setInterval(() => {
      this.updateServiceStatus()
    }, 30 * 1000) // Check every 30 seconds
  }

  /**
   * Update service status based on circuit breaker states
   */
  private updateServiceStatus(): void {
    const dbStats = databaseCircuitBreaker.getStats()
    const cooStats = cooDashboardCircuitBreaker.getStats()
    const subscStats = subscriptionManager.getMemoryStats()

    // Update database status
    if (dbStats.state === 'OPEN') {
      this.serviceStatus.database = 'down'
      this.metrics.circuitBreakerTrips++
    } else if (dbStats.state === 'HALF_OPEN') {
      this.serviceStatus.database = 'degraded'
    } else {
      this.serviceStatus.database = 'healthy'
    }

    // Update COO dashboard status
    if (cooStats.state === 'OPEN') {
      this.serviceStatus.coo_dashboard = 'down'
    } else if (cooStats.state === 'HALF_OPEN') {
      this.serviceStatus.coo_dashboard = 'degraded'
    } else {
      this.serviceStatus.coo_dashboard = 'healthy'
    }

    // Update subscription status
    if (subscStats.activeSubscriptions === 0 && subscStats.totalSubscriptions > 0) {
      this.serviceStatus.subscriptions = 'down'
    } else if (subscStats.failedSubscriptions > 0) {
      this.serviceStatus.subscriptions = 'degraded'
    } else {
      this.serviceStatus.subscriptions = 'healthy'
    }

    // Update overall status
    const services = [
      this.serviceStatus.database,
      this.serviceStatus.coo_dashboard,
      this.serviceStatus.subscriptions
    ]

    if (services.some(status => status === 'down')) {
      this.serviceStatus.overall = 'critical'
    } else if (services.some(status => status === 'degraded')) {
      this.serviceStatus.overall = 'degraded'
    } else {
      this.serviceStatus.overall = 'healthy'
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(startTime: number): void {
    this.metrics.successfulOperations++
    const duration = Date.now() - startTime
    this.updateAverageResponseTime(duration)
  }

  /**
   * Record offline success
   */
  private recordOfflineSuccess(startTime: number): void {
    this.metrics.offlineOperations++
    this.metrics.successfulOperations++
    const duration = Date.now() - startTime
    this.updateAverageResponseTime(duration)
  }

  /**
   * Record failed operation
   */
  private recordFailure(startTime: number): void {
    this.metrics.failedOperations++
    const duration = Date.now() - startTime
    this.updateAverageResponseTime(duration)
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(duration: number): void {
    const totalOperations = this.metrics.successfulOperations + this.metrics.failedOperations
    if (totalOperations === 1) {
      this.metrics.averageResponseTime = duration
    } else {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (totalOperations - 1) + duration) / totalOperations
    }
  }

  /**
   * Get current service status
   */
  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus }
  }

  /**
   * Get recovery metrics
   */
  getMetrics(): RecoveryMetrics & { successRate: number; uptime: number } {
    const successRate = this.metrics.totalOperations > 0 
      ? (this.metrics.successfulOperations / this.metrics.totalOperations) * 100 
      : 0

    return {
      ...this.metrics,
      successRate: Math.round(successRate * 100) / 100,
      uptime: Date.now() - this.metrics.startTime
    }
  }

  /**
   * Generate health report
   */
  generateHealthReport(): string {
    const status = this.getServiceStatus()
    const metrics = this.getMetrics()

    let report = '# System Health Report\n\n'
    report += `Generated: ${new Date().toISOString()}\n\n`

    // Overall status
    report += `## Overall Status: ${status.overall.toUpperCase()}\n\n`

    // Service status
    report += '## Service Status\n\n'
    report += `- Database: ${status.database}\n`
    report += `- COO Dashboard: ${status.coo_dashboard}\n`
    report += `- Subscriptions: ${status.subscriptions}\n`
    report += `- Offline Support: ${status.offline_support}\n\n`

    // Metrics
    report += '## Performance Metrics\n\n'
    report += `- Total Operations: ${metrics.totalOperations}\n`
    report += `- Success Rate: ${metrics.successRate}%\n`
    report += `- Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms\n`
    report += `- Offline Operations: ${metrics.offlineOperations}\n`
    report += `- Retry Operations: ${metrics.retryOperations}\n`
    report += `- Circuit Breaker Trips: ${metrics.circuitBreakerTrips}\n`
    report += `- Uptime: ${(metrics.uptime / (1000 * 60)).toFixed(2)} minutes\n\n`

    // Recommendations
    report += '## Recommendations\n\n'
    if (metrics.successRate < 95) {
      report += '- Success rate is below optimal (95%). Investigate failing operations.\n'
    }
    if (metrics.circuitBreakerTrips > 5) {
      report += '- High number of circuit breaker trips. Check service stability.\n'
    }
    if (status.offline_support === 'unavailable') {
      report += '- Offline support is unavailable. Consider updating offline data cache.\n'
    }

    return report
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval)
    }
    console.log('🧹 Error Recovery Manager cleaned up')
  }
}

// Global instance
export const errorRecoveryManager = new ErrorRecoveryManager()

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  errorRecoveryManager.initialize().catch(error => {
    console.error('Failed to initialize error recovery:', error)
  })
}

export default errorRecoveryManager