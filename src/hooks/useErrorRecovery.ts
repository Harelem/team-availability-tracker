/**
 * React Hook for Error Recovery Integration
 * Provides easy integration with the comprehensive error recovery system
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { errorRecoveryManager } from '@/lib/errorRecoveryManager'
import { isOnline, waitForOnline } from '@/utils/errorRecovery'

interface UseErrorRecoveryOptions {
  enableAutoRetry?: boolean
  enableOfflineSupport?: boolean
  enableCircuitBreaker?: boolean
  priority?: 'high' | 'medium' | 'low'
  onError?: (error: Error, fromOffline: boolean) => void
  onSuccess?: (data: any, fromOffline: boolean) => void
  onStatusChange?: (status: any) => void
}

interface ErrorRecoveryState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  isOffline: boolean
  fromOfflineMode: boolean
  retryCount: number
  isRetrying: boolean
}

export function useErrorRecovery<T = any>(options: UseErrorRecoveryOptions = {}) {
  const {
    enableAutoRetry = true,
    enableOfflineSupport = true,
    enableCircuitBreaker = true,
    priority = 'medium',
    onError,
    onSuccess,
    onStatusChange
  } = options

  const [state, setState] = useState<ErrorRecoveryState<T>>({
    data: null,
    loading: false,
    error: null,
    isOffline: false,
    fromOfflineMode: false,
    retryCount: 0,
    isRetrying: false
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setState(prev => ({
        ...prev,
        isOffline: !isOnline()
      }))
    }

    updateOnlineStatus()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Monitor service status changes
  useEffect(() => {
    if (onStatusChange) {
      const interval = setInterval(() => {
        const status = errorRecoveryManager.getServiceStatus()
        onStatusChange(status)
      }, 5000) // Check every 5 seconds

      return () => clearInterval(interval)
    }
  }, [onStatusChange])

  /**
   * Execute an operation with error recovery
   */
  const execute = useCallback(async <TResult = T>(
    operation: () => Promise<TResult>,
    operationName: string = 'operation'
  ): Promise<TResult> => {
    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      isRetrying: false
    }))

    try {
      const result = await errorRecoveryManager.executeWithRecovery<TResult>(
        async () => {
          // Check if operation was aborted
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Operation was aborted')
          }
          return await operation()
        },
        operationName,
        {
          enableCircuitBreaker,
          enableRetry: enableAutoRetry,
          enableOffline: enableOfflineSupport,
          priority
        }
      )

      setState(prev => ({
        ...prev,
        data: result as T,
        loading: false,
        error: null,
        fromOfflineMode: false,
        retryCount: 0,
        isRetrying: false
      }))

      if (onSuccess) {
        onSuccess(result, false)
      }

      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorObj,
        retryCount: prev.retryCount + 1,
        isRetrying: false
      }))

      if (onError) {
        onError(errorObj, false)
      }

      throw errorObj
    }
  }, [enableAutoRetry, enableOfflineSupport, enableCircuitBreaker, priority, onError, onSuccess])

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async () => {
    if (state.loading || !state.error) return

    setState(prev => ({
      ...prev,
      isRetrying: true,
      error: null
    }))

    // Wait for network if offline
    if (!isOnline()) {
      console.log('⏳ Waiting for network connection before retry...')
      const networkAvailable = await waitForOnline(10000) // Wait up to 10 seconds
      
      if (!networkAvailable) {
        setState(prev => ({
          ...prev,
          isRetrying: false,
          error: new Error('Network connection required for retry')
        }))
        return
      }
    }

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    // Add a small delay before retry
    retryTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isRetrying: false
      }))
    }, 1000)
  }, [state.loading, state.error])

  /**
   * Reset the error recovery state
   */
  const reset = useCallback(() => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    setState({
      data: null,
      loading: false,
      error: null,
      isOffline: !isOnline(),
      fromOfflineMode: false,
      retryCount: 0,
      isRetrying: false
    })
  }, [])

  /**
   * Get current service health status
   */
  const getServiceStatus = useCallback(() => {
    return errorRecoveryManager.getServiceStatus()
  }, [])

  /**
   * Get error recovery metrics
   */
  const getMetrics = useCallback(() => {
    return errorRecoveryManager.getMetrics()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    ...state,
    
    // Actions
    execute,
    retry,
    reset,
    
    // Status
    getServiceStatus,
    getMetrics,
    
    // Computed properties
    canRetry: !state.loading && !!state.error && !state.isRetrying,
    hasData: !!state.data,
    isHealthy: getServiceStatus().overall === 'healthy'
  }
}

/**
 * Hook for monitoring overall system health
 */
export function useSystemHealth() {
  const [status, setStatus] = useState(errorRecoveryManager.getServiceStatus())
  const [metrics, setMetrics] = useState(errorRecoveryManager.getMetrics())

  useEffect(() => {
    const updateStatus = () => {
      setStatus(errorRecoveryManager.getServiceStatus())
      setMetrics(errorRecoveryManager.getMetrics())
    }

    // Update immediately
    updateStatus()

    // Update every 10 seconds
    const interval = setInterval(updateStatus, 10000)

    return () => clearInterval(interval)
  }, [])

  return {
    status,
    metrics,
    isHealthy: status.overall === 'healthy',
    isDegraded: status.overall === 'degraded',
    isCritical: status.overall === 'critical',
    generateReport: () => errorRecoveryManager.generateHealthReport()
  }
}

/**
 * Hook for offline data management
 */
export function useOfflineData() {
  const [isOffline, setIsOffline] = useState(!isOnline())
  const [hasOfflineData, setHasOfflineData] = useState(false)

  useEffect(() => {
    const updateStatus = () => {
      setIsOffline(!isOnline())
    }

    updateStatus()

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  const refreshOfflineData = useCallback(async () => {
    // This would integrate with the offline data refresh mechanism
    console.log('🔄 Refreshing offline data...')
  }, [])

  return {
    isOffline,
    hasOfflineData,
    refreshOfflineData,
    canUseOfflineData: isOffline && hasOfflineData
  }
}

/**
 * Hook for API operations with error recovery
 */
export function useApiWithRecovery<T = any>(options: UseErrorRecoveryOptions = {}) {
  const recovery = useErrorRecovery<T>(options)

  /**
   * Execute GET request with error recovery
   */
  const get = useCallback(async (url: string): Promise<T> => {
    return recovery.execute(
      async () => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.json()
      },
      `GET ${url}`
    )
  }, [recovery])

  /**
   * Execute POST request with error recovery
   */
  const post = useCallback(async (url: string, data: any): Promise<T> => {
    return recovery.execute(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.json()
      },
      `POST ${url}`
    )
  }, [recovery])

  return {
    ...recovery,
    get,
    post
  }
}

export default useErrorRecovery