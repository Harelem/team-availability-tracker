/**
 * Hydration Debugging and Monitoring Utilities
 * Helps detect and diagnose hydration mismatches in development
 */

interface HydrationMismatch {
  timestamp: number
  component: string
  expectedHTML: string
  actualHTML: string
  stackTrace: string
  userAgent: string
  viewport: { width: number; height: number }
}

interface HydrationMetrics {
  startTime: number
  endTime: number
  duration: number
  mismatches: HydrationMismatch[]
  componentsHydrated: string[]
  errors: Error[]
}

class HydrationDebugger {
  private metrics: HydrationMetrics
  private isEnabled: boolean
  private observers: Map<string, MutationObserver> = new Map()
  private hydrationStartTime: number = 0

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development'
    this.metrics = this.createEmptyMetrics()
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.setupHydrationMonitoring()
    }
  }

  private createEmptyMetrics(): HydrationMetrics {
    return {
      startTime: 0,
      endTime: 0,
      duration: 0,
      mismatches: [],
      componentsHydrated: [],
      errors: []
    }
  }

  private setupHydrationMonitoring(): void {
    // Monitor hydration start
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.hydrationStartTime = performance.now()
        this.metrics.startTime = this.hydrationStartTime
      })
    } else {
      this.hydrationStartTime = performance.now()
      this.metrics.startTime = this.hydrationStartTime
    }

    // Monitor hydration completion
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.metrics.endTime = performance.now()
        this.metrics.duration = this.metrics.endTime - this.metrics.startTime
        this.logHydrationSummary()
      }, 100) // Small delay to catch any remaining hydration
    })

    // Catch hydration errors
    this.setupErrorHandling()
    
    // Monitor React hydration warnings
    this.setupReactHydrationMonitoring()
  }

  private setupErrorHandling(): void {
    // Catch general errors
    window.addEventListener('error', (event) => {
      if (this.isHydrationRelatedError(event.error)) {
        this.metrics.errors.push(event.error)
        this.logHydrationError(event.error)
      }
    })

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isHydrationRelatedError(event.reason)) {
        this.metrics.errors.push(event.reason)
        this.logHydrationError(event.reason)
      }
    })
  }

  private setupReactHydrationMonitoring(): void {
    // Override console.error to catch React hydration warnings
    const originalConsoleError = console.error
    
    console.error = (...args: any[]) => {
      const message = args.join(' ')
      
      if (this.isReactHydrationWarning(message)) {
        this.logHydrationWarning(message, args)
      }
      
      originalConsoleError.apply(console, args)
    }

    // Override console.warn for hydration warnings
    const originalConsoleWarn = console.warn
    
    console.warn = (...args: any[]) => {
      const message = args.join(' ')
      
      if (this.isReactHydrationWarning(message)) {
        this.logHydrationWarning(message, args)
      }
      
      originalConsoleWarn.apply(console, args)
    }
  }

  private isHydrationRelatedError(error: any): boolean {
    if (!error || !error.message) return false
    
    const hydrationKeywords = [
      'hydrat',
      'Text content does not match',
      'Expected server HTML',
      'Warning: Text content did not match',
      'Warning: Expected server HTML',
      'suppressHydrationWarning'
    ]

    return hydrationKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  private isReactHydrationWarning(message: string): boolean {
    const hydrationPatterns = [
      /Warning: Text content did not match/,
      /Warning: Expected server HTML/,
      /Warning: Extra attributes from the server/,
      /Warning: Prop .* did not match/,
      /Hydration failed/,
      /suppressHydrationWarning/
    ]

    return hydrationPatterns.some(pattern => pattern.test(message))
  }

  /**
   * Register a component for hydration monitoring
   */
  registerComponent(name: string, element: HTMLElement): void {
    if (!this.isEnabled) return

    this.metrics.componentsHydrated.push(name)
    
    // Monitor DOM mutations for this component
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          this.checkForHydrationMismatch(name, element, mutation)
        }
      })
    })

    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    })

    this.observers.set(name, observer)

    console.log(`🔍 Hydration monitor: Registered component "${name}"`)
  }

  /**
   * Unregister a component from hydration monitoring
   */
  unregisterComponent(name: string): void {
    const observer = this.observers.get(name)
    if (observer) {
      observer.disconnect()
      this.observers.delete(name)
      console.log(`🔍 Hydration monitor: Unregistered component "${name}"`)
    }
  }

  private checkForHydrationMismatch(
    componentName: string, 
    element: HTMLElement, 
    mutation: MutationRecord
  ): void {
    // This is a simplified check - in practice, you'd want more sophisticated detection
    if (mutation.type === 'characterData' && mutation.oldValue !== mutation.target.textContent) {
      const mismatch: HydrationMismatch = {
        timestamp: Date.now(),
        component: componentName,
        expectedHTML: mutation.oldValue || '',
        actualHTML: mutation.target.textContent || '',
        stackTrace: new Error().stack || '',
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }

      this.metrics.mismatches.push(mismatch)
      this.logHydrationMismatch(mismatch)
    }
  }

  private logHydrationError(error: Error): void {
    console.group('🚨 Hydration Error Detected')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    console.error('Time since hydration start:', performance.now() - this.hydrationStartTime, 'ms')
    console.groupEnd()
  }

  private logHydrationWarning(message: string, args: any[]): void {
    console.group('⚠️ Hydration Warning Detected')
    console.warn('Message:', message)
    console.warn('Full args:', args)
    console.warn('Time since hydration start:', performance.now() - this.hydrationStartTime, 'ms')
    console.groupEnd()
  }

  private logHydrationMismatch(mismatch: HydrationMismatch): void {
    console.group(`🔍 Hydration Mismatch in ${mismatch.component}`)
    console.warn('Expected:', mismatch.expectedHTML)
    console.warn('Actual:', mismatch.actualHTML)
    console.warn('Component:', mismatch.component)
    console.warn('Stack trace:', mismatch.stackTrace)
    console.groupEnd()
  }

  private logHydrationSummary(): void {
    if (!this.isEnabled) return

    const {
      duration,
      componentsHydrated,
      mismatches,
      errors
    } = this.metrics

    console.group('📊 Hydration Summary')
    console.log(`⏱️ Total hydration time: ${duration.toFixed(2)}ms`)
    console.log(`✅ Components hydrated: ${componentsHydrated.length}`)
    console.log(`⚠️ Mismatches detected: ${mismatches.length}`)
    console.log(`❌ Errors encountered: ${errors.length}`)

    if (componentsHydrated.length > 0) {
      console.log('Components:', componentsHydrated.join(', '))
    }

    if (mismatches.length > 0) {
      console.warn('Mismatches found in:', mismatches.map(m => m.component).join(', '))
    }

    if (errors.length > 0) {
      console.error('Errors:', errors.map(e => e.message).join(', '))
    }

    // Performance assessment
    if (duration > 1000) {
      console.warn('⚠️ Slow hydration detected. Consider optimizing component mounting.')
    } else if (duration < 100) {
      console.log('🚀 Fast hydration completed successfully!')
    }

    console.groupEnd()
  }

  /**
   * Get current hydration metrics
   */
  getMetrics(): HydrationMetrics {
    return { ...this.metrics }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2)
  }

  /**
   * Clear all metrics and observers
   */
  reset(): void {
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    
    // Reset metrics
    this.metrics = this.createEmptyMetrics()
  }

  /**
   * Enable/disable debugging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    
    if (!enabled) {
      this.reset()
    }
  }
}

// Create global instance
export const hydrationDebugger = new HydrationDebugger()

/**
 * React hook for component hydration monitoring
 */
export function useHydrationMonitoring(componentName: string) {
  const elementRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    if (elementRef.current) {
      hydrationDebugger.registerComponent(componentName, elementRef.current)
    }

    return () => {
      hydrationDebugger.unregisterComponent(componentName)
    }
  }, [componentName])

  return elementRef
}

/**
 * Utility functions for hydration debugging
 */
export const hydrationUtils = {
  /**
   * Check if running in hydration phase
   */
  isHydrating(): boolean {
    return typeof window !== 'undefined' && 
           !window.document.documentElement.hasAttribute('data-hydrated')
  },

  /**
   * Mark hydration as complete
   */
  markHydrationComplete(): void {
    if (typeof window !== 'undefined') {
      window.document.documentElement.setAttribute('data-hydrated', 'true')
    }
  },

  /**
   * Log hydration checkpoint
   */
  checkpoint(name: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Hydration checkpoint: ${name} at ${performance.now()}ms`)
    }
  },

  /**
   * Measure hydration performance
   */
  measureHydration<T>(name: string, fn: () => T): T {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ Hydration measurement "${name}": ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  }
}

// Auto-start monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Mark when hydration monitoring starts
  console.log('🔍 Hydration debugging enabled')
  
  // Auto-mark hydration complete after a delay
  setTimeout(() => {
    hydrationUtils.markHydrationComplete()
  }, 1000)
}

// Import React types
import React from 'react'

export default hydrationDebugger