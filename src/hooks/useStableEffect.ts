/**
 * Stable Effect Hooks
 * Prevents infinite re-renders by providing stable references and effect controls
 */

import React, { useRef, useEffect, useCallback, useMemo, DependencyList } from 'react'

/**
 * Hook that provides a stable callback reference that doesn't change on every render
 * Useful for preventing infinite re-renders in useEffect dependencies
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback)
  
  // Update the ref whenever the callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  // Return a stable function that calls the current callback
  return useCallback((...args: any[]) => {
    return callbackRef.current(...args)
  }, []) as T
}

/**
 * Hook that only runs effect when dependencies have actually changed (deep comparison)
 * Prevents effects from running when dependencies are the same but different references
 */
export function useDeepEffect(effect: () => void | (() => void), deps: DependencyList) {
  const prevDepsRef = useRef<DependencyList | undefined>(undefined)
  const cleanupRef = useRef<(() => void) | void>(undefined)

  // Deep comparison helper
  const depsEqual = (a: DependencyList, b: DependencyList): boolean => {
    if (a.length !== b.length) return false
    
    return a.every((aItem, index) => {
      const bItem = b[index]
      
      // Handle primitive types
      if (typeof aItem !== 'object' || aItem === null) {
        return aItem === bItem
      }
      
      // Handle arrays
      if (Array.isArray(aItem) && Array.isArray(bItem)) {
        return JSON.stringify(aItem) === JSON.stringify(bItem)
      }
      
      // Handle objects
      if (typeof bItem === 'object' && bItem !== null) {
        return JSON.stringify(aItem) === JSON.stringify(bItem)
      }
      
      return false
    })
  }

  useEffect(() => {
    // Check if dependencies have actually changed
    if (!prevDepsRef.current || !depsEqual(prevDepsRef.current, deps)) {
      // Clean up previous effect
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      
      // Run the effect
      cleanupRef.current = effect()
      
      // Update previous dependencies
      prevDepsRef.current = deps
    }
  }, deps)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])
}

/**
 * Hook that prevents effects from running too frequently
 * Useful for expensive operations that might be triggered rapidly
 */
export function useThrottledEffect(
  effect: () => void | (() => void),
  deps: DependencyList,
  throttleMs: number = 100
) {
  const lastRunRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupRef = useRef<(() => void) | void>(undefined)

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastRun = now - lastRunRef.current

    if (timeSinceLastRun >= throttleMs) {
      // Run immediately
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      cleanupRef.current = effect()
      lastRunRef.current = now
    } else {
      // Schedule to run after throttle period
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        if (cleanupRef.current) {
          cleanupRef.current()
        }
        cleanupRef.current = effect()
        lastRunRef.current = Date.now()
      }, throttleMs - timeSinceLastRun)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, deps)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
}

/**
 * Hook that provides a stable object reference with shallow comparison
 * Prevents re-renders when object contents are the same but reference is different
 */
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  const prevObjRef = useRef<T>(obj)
  
  return useMemo(() => {
    // Shallow comparison
    const keys = Object.keys(obj)
    const prevKeys = Object.keys(prevObjRef.current)
    
    if (keys.length !== prevKeys.length) {
      prevObjRef.current = obj
      return obj
    }
    
    const hasChanged = keys.some(key => obj[key] !== prevObjRef.current[key])
    
    if (hasChanged) {
      prevObjRef.current = obj
      return obj
    }
    
    return prevObjRef.current
  }, [obj])
}

/**
 * Hook that provides a stable array reference with shallow comparison
 */
export function useStableArray<T>(arr: T[]): T[] {
  const prevArrRef = useRef<T[]>(arr)
  
  return useMemo(() => {
    if (arr.length !== prevArrRef.current.length) {
      prevArrRef.current = arr
      return arr
    }
    
    const hasChanged = arr.some((item, index) => item !== prevArrRef.current[index])
    
    if (hasChanged) {
      prevArrRef.current = arr
      return arr
    }
    
    return prevArrRef.current
  }, [arr])
}

/**
 * Hook that tracks render count and warns about excessive re-renders
 */
export function useRenderTracker(componentName: string, warnThreshold: number = 10) {
  const renderCountRef = useRef(0)
  const lastWarnRef = useRef(0)
  
  renderCountRef.current++
  
  useEffect(() => {
    if (
      renderCountRef.current > warnThreshold && 
      renderCountRef.current - lastWarnRef.current >= warnThreshold
    ) {
      console.warn(
        `🐌 Component "${componentName}" has rendered ${renderCountRef.current} times. ` +
        `This might indicate a re-render loop or inefficient dependencies.`
      )
      lastWarnRef.current = renderCountRef.current
    }
  })

  // Reset counter periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (renderCountRef.current > 0) {
        renderCountRef.current = 0
        lastWarnRef.current = 0
      }
    }, 5000) // Reset every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return renderCountRef.current
}

/**
 * Hook that prevents rapid state updates
 */
export function useStableState<T>(
  initialValue: T,
  compareFunction?: (a: T, b: T) => boolean
): [T, (newValue: T) => void] {
  const [state, setState] = React.useState<T>(initialValue)
  const compare = compareFunction || ((a, b) => a === b)

  const setStableState = useCallback((newValue: T) => {
    setState(currentValue => {
      if (compare(currentValue, newValue)) {
        return currentValue // Don't update if values are the same
      }
      return newValue
    })
  }, [compare])

  return [state, setStableState]
}

/**
 * Hook that batches multiple state updates together
 */
export function useBatchedState<T>(
  initialValue: T,
  batchMs: number = 16 // Default to one frame (16ms)
): [T, (newValue: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = React.useState<T>(initialValue)
  const pendingUpdateRef = useRef<T | ((prev: T) => T) | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const batchedSetState = useCallback((newValue: T | ((prev: T) => T)) => {
    pendingUpdateRef.current = newValue

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingUpdateRef.current !== null) {
        setState(pendingUpdateRef.current)
        pendingUpdateRef.current = null
      }
    }, batchMs)
  }, [batchMs])

  const flushUpdate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    if (pendingUpdateRef.current !== null) {
      setState(pendingUpdateRef.current)
      pendingUpdateRef.current = null
    }
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [state, batchedSetState, flushUpdate]
}

