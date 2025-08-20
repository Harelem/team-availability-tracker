/**
 * Enhanced Hydration Safe Wrapper
 * Prevents hydration mismatches with improved performance and error handling
 */

'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'

interface HydrationSafeWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  delay?: number
  onHydrationComplete?: () => void
  suppressHydrationWarning?: boolean
  errorBoundary?: boolean
  className?: string
  testId?: string
}

/**
 * Enhanced ClientOnly wrapper with performance optimizations
 */
export function HydrationSafeWrapper({
  children,
  fallback = null,
  delay = 0,
  onHydrationComplete,
  suppressHydrationWarning = false,
  errorBoundary = false,
  className,
  testId
}: HydrationSafeWrapperProps) {
  const [hasMounted, setHasMounted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return // Prevent double mounting

    const mount = () => {
      if (!mountedRef.current) {
        mountedRef.current = true
        setHasMounted(true)
        onHydrationComplete?.()
      }
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(mount, delay)
    } else {
      mount()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [delay, onHydrationComplete])

  // Error boundary logic
  useEffect(() => {
    if (errorBoundary) {
      const handleError = (error: ErrorEvent) => {
        console.error('Hydration error caught:', error)
        setHasError(true)
      }

      window.addEventListener('error', handleError)
      return () => window.removeEventListener('error', handleError)
    }
  }, [errorBoundary])

  if (hasError && errorBoundary) {
    return (
      <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
        Hydration error occurred. Please refresh the page.
      </div>
    )
  }

  if (!hasMounted) {
    const fallbackContent = fallback || (
      <div className="animate-pulse bg-gray-200 rounded h-8 w-full" />
    )

    return (
      <div 
        className={className}
        data-testid={testId}
        {...(suppressHydrationWarning && { suppressHydrationWarning: true })}
      >
        {fallbackContent}
      </div>
    )
  }

  return (
    <div className={className} data-testid={testId}>
      {children}
    </div>
  )
}

/**
 * Hook for hydration-safe state management
 */
export function useHydrationSafeState<T>(
  serverValue: T,
  clientValue: T,
  deps?: React.DependencyList
): T {
  const [hasMounted, setHasMounted] = useState(false)
  const [value, setValue] = useState(serverValue)

  useEffect(() => {
    setHasMounted(true)
    setValue(clientValue)
  }, deps ? [clientValue, ...deps] : [clientValue])

  return hasMounted ? value : serverValue
}

/**
 * Hook for hydration-safe localStorage
 */
export function useHydrationSafeLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: {
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  } = {}
): [T, (value: T) => void, boolean] {
  const { 
    serialize = JSON.stringify, 
    deserialize = JSON.parse 
  } = options

  const [hasMounted, setHasMounted] = useState(false)
  const [storedValue, setStoredValue] = useState<T>(defaultValue)

  useEffect(() => {
    setHasMounted(true)
    
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(deserialize(item))
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
  }, [key, deserialize])

  const setValue = useMemo(() => (value: T) => {
    try {
      setStoredValue(value)
      if (hasMounted) {
        window.localStorage.setItem(key, serialize(value))
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, serialize, hasMounted])

  return [storedValue, setValue, hasMounted]
}

/**
 * Hook for hydration-safe media queries
 */
export function useHydrationSafeMediaQuery(query: string): boolean {
  const [hasMounted, setHasMounted] = useState(false)
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addListener(handler)
    return () => mediaQuery.removeListener(handler)
  }, [query])

  // Return false during SSR to prevent hydration mismatches
  return hasMounted ? matches : false
}

/**
 * HOC for making any component hydration-safe
 */
export function withHydrationSafety<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: React.ReactNode
    delay?: number
    errorBoundary?: boolean
  } = {}
) {
  const HydrationSafeComponent = (props: P) => (
    <HydrationSafeWrapper {...options}>
      <Component {...props} />
    </HydrationSafeWrapper>
  )

  HydrationSafeComponent.displayName = `HydrationSafe(${Component.displayName || Component.name})`
  
  return HydrationSafeComponent
}

/**
 * Provider for hydration context
 */
interface HydrationContextValue {
  isHydrated: boolean
  hydrationTime: number | null
}

const HydrationContext = React.createContext<HydrationContextValue>({
  isHydrated: false,
  hydrationTime: null
})

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [hydrationTime, setHydrationTime] = useState<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    setIsHydrated(true)
    setHydrationTime(performance.now() - startTime)
  }, [])

  const value = useMemo(() => ({
    isHydrated,
    hydrationTime
  }), [isHydrated, hydrationTime])

  return (
    <HydrationContext.Provider value={value}>
      {children}
    </HydrationContext.Provider>
  )
}

export function useHydration() {
  return React.useContext(HydrationContext)
}

/**
 * Component for conditional rendering based on hydration status
 */
export function HydrationBoundary({
  children,
  fallback,
  inverse = false
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  inverse?: boolean
}) {
  const { isHydrated } = useHydration()
  
  const shouldRender = inverse ? !isHydrated : isHydrated
  
  if (shouldRender) {
    return <>{children}</>
  }
  
  return <>{fallback || null}</>
}

/**
 * Safe wrapper for third-party components that might cause hydration issues
 */
export function ThirdPartySafeWrapper({
  children,
  fallback,
  minDelay = 100
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  minDelay?: number
}) {
  return (
    <HydrationSafeWrapper
      fallback={fallback}
      delay={minDelay}
      suppressHydrationWarning={true}
      errorBoundary={true}
    >
      {children}
    </HydrationSafeWrapper>
  )
}

/**
 * Utility for creating hydration-safe dynamic imports
 */
export function createHydrationSafeDynamic<P extends object>(
  importFunction: () => Promise<{ default: React.ComponentType<P> }>,
  options: {
    loading?: React.ComponentType
    ssr?: boolean
    delay?: number
  } = {}
) {
  const { loading: Loading, ssr = false, delay = 0 } = options

  return React.forwardRef<HTMLElement, P>((props, ref) => {
    const [Component, setComponent] = useState<React.ComponentType<P> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
      const loadComponent = async () => {
        try {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          
          const module = await importFunction()
          setComponent(() => module.default)
        } catch (err) {
          setError(err as Error)
        } finally {
          setIsLoading(false)
        }
      }

      loadComponent()
    }, [])

    if (error) {
      return (
        <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
          Error loading component: {error.message}
        </div>
      )
    }

    if (isLoading || !Component) {
      if (Loading) {
        return <Loading />
      }
      
      return (
        <div className="animate-pulse bg-gray-200 rounded h-8 w-full" />
      )
    }

    if (!ssr) {
      return (
        <HydrationSafeWrapper suppressHydrationWarning>
          <Component {...(props as any)} {...(ref ? { ref } : {})} />
        </HydrationSafeWrapper>
      )
    }

    return <Component {...(props as any)} {...(ref ? { ref } : {})} />
  })
}

export default HydrationSafeWrapper