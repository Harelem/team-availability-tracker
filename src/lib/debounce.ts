/**
 * Debouncing and Throttling Utilities
 * Prevents excessive API calls and infinite re-renders
 */

// Basic debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Advanced debounce with cancellation and immediate execution options
export class AdvancedDebouncer<T extends (...args: any[]) => any> {
  private timeout: NodeJS.Timeout | null = null
  private lastArgs: Parameters<T> | null = null
  private lastCallTime: number = 0
  private maxWait: number | null = null
  private immediate: boolean = false
  
  constructor(
    private func: T,
    private wait: number,
    options: {
      maxWait?: number
      immediate?: boolean
    } = {}
  ) {
    this.maxWait = options.maxWait || null
    this.immediate = options.immediate || false
  }

  execute(...args: Parameters<T>): void {
    this.lastArgs = args
    this.lastCallTime = Date.now()

    if (this.immediate && !this.timeout) {
      this.func(...args)
    }

    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.timeout = setTimeout(() => {
      if (!this.immediate && this.lastArgs) {
        this.func(...this.lastArgs)
      }
      this.timeout = null
      this.lastArgs = null
    }, this.wait)

    // Max wait enforcement
    if (this.maxWait && !this.immediate) {
      setTimeout(() => {
        if (this.lastArgs && Date.now() - this.lastCallTime >= this.maxWait!) {
          this.cancel()
          this.func(...this.lastArgs)
          this.lastArgs = null
        }
      }, this.maxWait)
    }
  }

  cancel(): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    this.lastArgs = null
  }

  flush(): void {
    if (this.lastArgs) {
      this.cancel()
      this.func(...this.lastArgs)
      this.lastArgs = null
    }
  }

  pending(): boolean {
    return this.timeout !== null
  }
}

// Batch debouncer for collecting multiple calls and executing them together
export class BatchDebouncer<T> {
  private items: Set<T> = new Set()
  private timeout: NodeJS.Timeout | null = null

  constructor(
    private batchFunc: (items: T[]) => void,
    private wait: number,
    private maxBatchSize: number = 100
  ) {}

  add(item: T): void {
    this.items.add(item)

    // If we've reached max batch size, execute immediately
    if (this.items.size >= this.maxBatchSize) {
      this.flush()
      return
    }

    // Otherwise, debounce
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.timeout = setTimeout(() => {
      this.flush()
    }, this.wait)
  }

  flush(): void {
    if (this.items.size > 0) {
      const itemsArray = Array.from(this.items)
      this.items.clear()
      if (this.timeout) {
        clearTimeout(this.timeout)
        this.timeout = null
      }
      this.batchFunc(itemsArray)
    }
  }

  cancel(): void {
    this.items.clear()
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }

  size(): number {
    return this.items.size
  }
}

// Keyed debouncer for independent debouncing based on keys
export class KeyedDebouncer<K, T extends (...args: any[]) => any> {
  private debouncers = new Map<K, AdvancedDebouncer<T>>()

  constructor(
    private func: T,
    private wait: number,
    private options?: { maxWait?: number; immediate?: boolean }
  ) {}

  execute(key: K, ...args: Parameters<T>): void {
    let debouncer = this.debouncers.get(key)
    
    if (!debouncer) {
      debouncer = new AdvancedDebouncer(this.func, this.wait, this.options)
      this.debouncers.set(key, debouncer)
    }

    debouncer.execute(...args)
  }

  cancel(key: K): void {
    const debouncer = this.debouncers.get(key)
    if (debouncer) {
      debouncer.cancel()
    }
  }

  cancelAll(): void {
    for (const debouncer of this.debouncers.values()) {
      debouncer.cancel()
    }
    this.debouncers.clear()
  }

  flush(key: K): void {
    const debouncer = this.debouncers.get(key)
    if (debouncer) {
      debouncer.flush()
    }
  }

  flushAll(): void {
    for (const debouncer of this.debouncers.values()) {
      debouncer.flush()
    }
  }

  getPendingKeys(): K[] {
    const pendingKeys: K[] = []
    for (const [key, debouncer] of this.debouncers) {
      if (debouncer.pending()) {
        pendingKeys.push(key)
      }
    }
    return pendingKeys
  }

  size(): number {
    return this.debouncers.size
  }
}

// React hook for debouncing values
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// React hook for debouncing callbacks
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
  const callbackRef = React.useRef(callback)
  const debouncedRef = React.useRef<AdvancedDebouncer<T> | null>(null)

  // Update callback reference
  React.useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Create or update debouncer
  React.useEffect(() => {
    debouncedRef.current = new AdvancedDebouncer(
      (...args: Parameters<T>) => callbackRef.current(...args),
      delay
    )

    return () => {
      if (debouncedRef.current) {
        debouncedRef.current.cancel()
      }
    }
  }, [delay, ...deps])

  // Return the debounced function
  return React.useCallback((...args: Parameters<T>) => {
    if (debouncedRef.current) {
      debouncedRef.current.execute(...args)
    }
  }, [])
}

// React hook for throttling callbacks
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
  const callbackRef = React.useRef(callback)
  const throttledRef = React.useRef<(...args: Parameters<T>) => void | null>(null)

  React.useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  React.useEffect(() => {
    throttledRef.current = throttle(
      (...args: Parameters<T>) => callbackRef.current(...args),
      delay
    )
  }, [delay, ...deps])

  return React.useCallback((...args: Parameters<T>) => {
    if (throttledRef.current) {
      throttledRef.current(...args)
    }
  }, [])
}

// Import React types if available
let React: any
try {
  React = require('react')
} catch (e) {
  // React not available, hooks won't work but other utilities will
}