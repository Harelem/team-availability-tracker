/**
 * Hydration Safe Loader - Specialized wrapper for preventing hydration mismatches
 * This component handles the common case where components need to show different
 * content during server rendering vs client hydration
 */

'use client'

import React, { useEffect, useState, useRef, ReactNode } from 'react'

interface HydrationSafeLoaderProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
  testId?: string
}

/**
 * Simple hydration-safe loader that prevents server/client mismatches
 * Perfect for components that depend on browser APIs or client-only state
 */
export function HydrationSafeLoader({
  children,
  fallback = <div className="animate-pulse bg-gray-200 rounded h-6 w-32" />,
  className = '',
  testId
}: HydrationSafeLoaderProps) {
  const [isMounted, setIsMounted] = useState(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      setIsMounted(true)
    }
  }, [])

  return (
    <div 
      className={className}
      data-testid={testId}
      suppressHydrationWarning
    >
      {isMounted ? children : fallback}
    </div>
  )
}

/**
 * Hook for hydration-safe conditional rendering
 */
export function useHydrationSafe(serverContent: ReactNode, clientContent: ReactNode): ReactNode {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted ? clientContent : serverContent
}

/**
 * Component for conditionally rendering content only after hydration
 */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component for rendering content only during server-side rendering
 */
export function ServerOnly({ children }: { children: ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (hasMounted) {
    return null
  }

  return <>{children}</>
}

/**
 * Higher-order component to make any component hydration-safe
 */
export function withHydrationSafe<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const HydrationSafeComponent = (props: P) => (
    <HydrationSafeLoader fallback={fallback}>
      <Component {...props} />
    </HydrationSafeLoader>
  )

  HydrationSafeComponent.displayName = `HydrationSafe(${Component.displayName || Component.name})`
  
  return HydrationSafeComponent
}

export default HydrationSafeLoader