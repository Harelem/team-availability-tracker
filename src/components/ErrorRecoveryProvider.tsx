/**
 * Error Recovery Provider Component
 * Provides error recovery context and UI components for the entire application
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { errorRecoveryManager } from '@/lib/errorRecoveryManager'
import { useSystemHealth } from '@/hooks/useErrorRecovery'

interface ErrorRecoveryContextType {
  isHealthy: boolean
  isDegraded: boolean
  isCritical: boolean
  showStatus: boolean
  metrics: any
  retryOperation: (operationName: string) => Promise<void>
  showHealthStatus: () => void
  hideHealthStatus: () => void
  registerFailedOperation: (operation: string, error: Error) => void
  getRecoveryActions: (operation: string) => RecoveryAction[]
  isRecovering: boolean
}

interface RecoveryAction {
  id: string
  label: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  autoRetry: boolean
  maxRetries: number
  action: () => Promise<boolean>
}

const ErrorRecoveryContext = createContext<ErrorRecoveryContextType | null>(null)

export function useErrorRecoveryContext() {
  const context = useContext(ErrorRecoveryContext)
  if (!context) {
    throw new Error('useErrorRecoveryContext must be used within ErrorRecoveryProvider')
  }
  return context
}

interface ErrorRecoveryProviderProps {
  children: React.ReactNode
  showStatusByDefault?: boolean
  enableNotifications?: boolean
}

export function ErrorRecoveryProvider({
  children,
  showStatusByDefault = false,
  enableNotifications = true
}: ErrorRecoveryProviderProps) {
  const { status, metrics, isHealthy, isDegraded, isCritical } = useSystemHealth()
  const [showStatus, setShowStatus] = useState(showStatusByDefault)
  const [hasShownCriticalAlert, setHasShownCriticalAlert] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const [failedOperations, setFailedOperations] = useState<Map<string, { error: Error, attempts: number, lastAttempt: Date }>>(new Map())
  const [recoveryActions, setRecoveryActions] = useState<Map<string, RecoveryAction[]>>(new Map())

  // Show status automatically when system becomes unhealthy
  useEffect(() => {
    if (!isHealthy && !showStatus) {
      setShowStatus(true)
    }
  }, [isHealthy, showStatus])

  // Show alert for critical status
  useEffect(() => {
    if (isCritical && !hasShownCriticalAlert && enableNotifications) {
      setHasShownCriticalAlert(true)
      
      // Show browser notification if possible
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('System Health Critical', {
          body: 'Some services are experiencing issues. The app may not function properly.',
          icon: '/favicon.ico'
        })
      }
      
      console.error('🚨 System health is critical:', status)
    } else if (!isCritical && hasShownCriticalAlert) {
      setHasShownCriticalAlert(false)
    }
  }, [isCritical, hasShownCriticalAlert, enableNotifications, status])

  const retryOperation = async (operationName: string) => {
    console.log(`🔄 Retrying operation: ${operationName}`)
    setIsRecovering(true)
    
    try {
      const actions = recoveryActions.get(operationName) || []
      
      for (const action of actions) {
        if (action.autoRetry) {
          console.log(`🔧 Executing recovery action: ${action.label}`)
          
          try {
            const success = await action.action()
            if (success) {
              console.log(`✅ Recovery action succeeded: ${action.label}`)
              
              // Clear failed operation record
              setFailedOperations(prev => {
                const updated = new Map(prev)
                updated.delete(operationName)
                return updated
              })
              
              return // Success, stop trying other actions
            }
          } catch (actionError) {
            console.error(`❌ Recovery action failed: ${action.label}`, actionError)
          }
        }
      }
      
      // If we get here, all recovery actions failed
      console.warn(`⚠️ All recovery actions failed for operation: ${operationName}`)
      
    } finally {
      setIsRecovering(false)
    }
  }
  
  const registerFailedOperation = (operation: string, error: Error) => {
    setFailedOperations(prev => {
      const updated = new Map(prev)
      const existing = updated.get(operation)
      
      updated.set(operation, {
        error,
        attempts: existing ? existing.attempts + 1 : 1,
        lastAttempt: new Date()
      })
      
      return updated
    })
    
    console.error(`🚨 Operation failed: ${operation}`, error)
    
    // Auto-retry for recoverable operations
    const actions = recoveryActions.get(operation) || []
    const autoRetryAction = actions.find(a => a.autoRetry)
    
    if (autoRetryAction && (!failedOperations.get(operation) || failedOperations.get(operation)!.attempts < autoRetryAction.maxRetries)) {
      setTimeout(() => {
        retryOperation(operation)
      }, Math.min(1000 * Math.pow(2, failedOperations.get(operation)?.attempts || 0), 10000)) // Exponential backoff, max 10s
    }
  }
  
  const getRecoveryActions = (operation: string): RecoveryAction[] => {
    return recoveryActions.get(operation) || []
  }
  
  // Register default recovery actions
  useEffect(() => {
    const defaultActions = new Map<string, RecoveryAction[]>()
    
    // Database operations
    defaultActions.set('database_query', [
      {
        id: 'db_reconnect',
        label: 'Reconnect Database',
        description: 'Attempt to reconnect to the database',
        severity: 'medium',
        autoRetry: true,
        maxRetries: 3,
        action: async () => {
          // Implement database reconnection logic
          return Math.random() > 0.3 // Simulate 70% success rate
        }
      }
    ])
    
    // Schedule updates
    defaultActions.set('schedule_update', [
      {
        id: 'cache_update',
        label: 'Update Local Cache',
        description: 'Refresh local data cache',
        severity: 'low',
        autoRetry: true,
        maxRetries: 2,
        action: async () => {
          // Implement cache refresh logic
          return Math.random() > 0.2 // Simulate 80% success rate
        }
      },
      {
        id: 'offline_mode',
        label: 'Enable Offline Mode',
        description: 'Switch to offline mode with cached data',
        severity: 'medium',
        autoRetry: false,
        maxRetries: 1,
        action: async () => {
          // Implement offline mode activation
          return true
        }
      }
    ])
    
    // Sprint operations
    defaultActions.set('sprint_operation', [
      {
        id: 'sprint_cache_refresh',
        label: 'Refresh Sprint Data',
        description: 'Reload sprint data from server',
        severity: 'medium',
        autoRetry: true,
        maxRetries: 3,
        action: async () => {
          // Implement sprint data refresh
          return Math.random() > 0.1 // Simulate 90% success rate
        }
      }
    ])
    
    setRecoveryActions(defaultActions)
  }, [])

  const contextValue: ErrorRecoveryContextType = {
    isHealthy,
    isDegraded,
    isCritical,
    showStatus,
    metrics,
    retryOperation,
    showHealthStatus: () => setShowStatus(true),
    hideHealthStatus: () => setShowStatus(false),
    registerFailedOperation,
    getRecoveryActions,
    isRecovering
  }

  return (
    <ErrorRecoveryContext.Provider value={contextValue}>
      {children}
      
      {/* Status indicator */}
      {showStatus && (
        <SystemHealthIndicator
          status={status}
          metrics={metrics}
          onClose={() => setShowStatus(false)}
          onRetry={retryOperation}
        />
      )}
      
      {/* Critical status overlay */}
      {isCritical && (
        <CriticalStatusOverlay
          status={status}
          onRetry={retryOperation}
        />
      )}
    </ErrorRecoveryContext.Provider>
  )
}

interface SystemHealthIndicatorProps {
  status: any
  metrics: any
  onClose: () => void
  onRetry: (operationName: string) => Promise<void>
}

function SystemHealthIndicator({ status, metrics, onClose, onRetry }: SystemHealthIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = () => {
    switch (status.overall) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (status.overall) {
      case 'healthy': return '✅'
      case 'degraded': return '⚠️'
      case 'critical': return '🚨'
      default: return '❓'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`rounded-lg shadow-lg border ${
        status.overall === 'critical' ? 'bg-red-50 border-red-200' :
        status.overall === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
        'bg-green-50 border-green-200'
      }`}>
        {/* Header */}
        <div 
          className="p-3 cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
            <span className="font-medium text-sm">
              {getStatusIcon()} System Health: {status.overall.charAt(0).toUpperCase() + status.overall.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">
              {Math.round(metrics.successRate)}% success
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t px-3 pb-3">
            <div className="mt-2 space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className={`font-medium ${
                  status.database === 'healthy' ? 'text-green-600' :
                  status.database === 'degraded' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {status.database}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Subscriptions:</span>
                <span className={`font-medium ${
                  status.subscriptions === 'healthy' ? 'text-green-600' :
                  status.subscriptions === 'degraded' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {status.subscriptions}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Offline Support:</span>
                <span className={`font-medium ${
                  status.offline_support === 'available' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {status.offline_support}
                </span>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span>Operations:</span>
                  <span>{metrics.totalOperations}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response:</span>
                  <span>{metrics.averageResponseTime.toFixed(0)}ms</span>
                </div>
                {metrics.offlineOperations > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Offline Mode:</span>
                    <span>{metrics.offlineOperations} ops</span>
                  </div>
                )}
              </div>

              {(status.overall === 'degraded' || status.overall === 'critical') && (
                <button
                  onClick={() => onRetry('system_health_check')}
                  className="w-full mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                >
                  Retry Services
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface CriticalStatusOverlayProps {
  status: any
  onRetry: (operationName: string) => Promise<void>
}

function CriticalStatusOverlay({ status, onRetry }: CriticalStatusOverlayProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry('critical_recovery')
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🚨</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">
            System Health Critical
          </h2>
          <p className="text-gray-600 mb-4">
            Some core services are experiencing issues. The application may not function properly.
          </p>
          
          <div className="space-y-2 text-left bg-gray-50 p-3 rounded mb-4">
            <div className="flex justify-between text-sm">
              <span>Database:</span>
              <span className={`font-medium ${
                status.database === 'down' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {status.database}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>COO Dashboard:</span>
              <span className={`font-medium ${
                status.coo_dashboard === 'down' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {status.coo_dashboard}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Real-time Updates:</span>
              <span className={`font-medium ${
                status.subscriptions === 'down' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {status.subscriptions}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRetrying ? '🔄 Retrying...' : '🔄 Retry Services'}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
            >
              🔄 Reload Application
            </button>
            
            <p className="text-xs text-gray-500">
              If issues persist, please check your internet connection or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for components to request error recovery UI
 */
export function useErrorRecoveryUI() {
  const context = useErrorRecoveryContext()
  
  return {
    showHealthStatus: context.showHealthStatus,
    hideHealthStatus: context.hideHealthStatus,
    isHealthy: context.isHealthy,
    isDegraded: context.isDegraded,
    isCritical: context.isCritical,
    retryOperation: context.retryOperation
  }
}

export default ErrorRecoveryProvider