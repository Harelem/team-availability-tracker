/**
 * Enhanced Touch Gesture Hooks
 * 
 * Provides comprehensive touch interaction support including swipe navigation,
 * pull-to-refresh, long press, and pinch-to-zoom gestures for mobile optimization.
 */

import { useGesture } from '@use-gesture/react';
import { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';

// SSR-safe useLayoutEffect that falls back to useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Gesture Configuration Types
interface SwipeConfig {
  enabled?: boolean;
  threshold?: number;
  velocity?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface PullToRefreshConfig {
  enabled?: boolean;
  threshold?: number;
  onRefresh?: () => Promise<void>;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
}

interface LongPressConfig {
  enabled?: boolean;
  delay?: number;
  onLongPress?: (event: TouchEvent | MouseEvent) => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
}

interface PinchZoomConfig {
  enabled?: boolean;
  minScale?: number;
  maxScale?: number;
  onZoom?: (scale: number) => void;
  onZoomStart?: () => void;
  onZoomEnd?: (scale: number) => void;
}

interface TouchGestureConfig {
  swipe?: SwipeConfig;
  pullToRefresh?: PullToRefreshConfig;
  longPress?: LongPressConfig;
  pinchZoom?: PinchZoomConfig;
  preventDefaultSwipe?: boolean;
  preventScroll?: boolean;
}

// Pull-to-refresh state interface
interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  shouldRefresh: boolean;
  message: string;
}

/**
 * Main touch gesture hook that combines all gesture types
 */
export function useTouchGestures(config: TouchGestureConfig = {}) {
  const elementRef = useRef<HTMLElement>(null);
  const [isActive, setIsActive] = useState(false);

  // Swipe gesture handling
  const bind = useGesture(
    {
      onDrag: ({ direction: [dx, dy], velocity: [vx, vy], down, movement: [mx, my], cancel }) => {
        if (!config.swipe?.enabled) return;

        const threshold = config.swipe.threshold || 50;
        const velocityThreshold = config.swipe.velocity || 0.5;

        if (!down && (Math.abs(mx) > threshold || Math.abs(vx) > velocityThreshold)) {
          if (Math.abs(mx) > Math.abs(my)) {
            // Horizontal swipe
            if (mx > 0 && dx > 0) {
              config.swipe.onSwipeRight?.();
            } else if (mx < 0 && dx < 0) {
              config.swipe.onSwipeLeft?.();
            }
          } else {
            // Vertical swipe
            if (my > 0 && dy > 0) {
              config.swipe.onSwipeDown?.();
            } else if (my < 0 && dy < 0) {
              config.swipe.onSwipeUp?.();
            }
          }
        }

        if (config.preventDefaultSwipe && down) {
          cancel();
        }
      },
      onPinch: ({ origin: [ox, oy], first, movement: [ms], offset: [s], memo }) => {
        if (!config.pinchZoom?.enabled) return memo;

        const minScale = config.pinchZoom.minScale || 0.5;
        const maxScale = config.pinchZoom.maxScale || 3;
        const scale = Math.max(minScale, Math.min(maxScale, s));

        if (first) {
          config.pinchZoom.onZoomStart?.();
          return [ox, oy, s];
        }

        config.pinchZoom.onZoom?.(scale);

        return memo;
      },
      onPinchEnd: ({ offset: [s] }) => {
        if (!config.pinchZoom?.enabled) return;
        
        const minScale = config.pinchZoom.minScale || 0.5;
        const maxScale = config.pinchZoom.maxScale || 3;
        const scale = Math.max(minScale, Math.min(maxScale, s));
        
        config.pinchZoom.onZoomEnd?.(scale);
      }
    },
    {
      drag: {
        axis: config.swipe?.enabled ? undefined : undefined,
        filterTaps: true,
        pointer: { touch: true }
      },
      pinch: {
        scaleBounds: config.pinchZoom?.enabled ? 
          { min: config.pinchZoom.minScale || 0.5, max: config.pinchZoom.maxScale || 3 } : 
          undefined,
        rubberband: true
      }
    }
  );

  return {
    bind,
    ref: elementRef,
    isActive
  };
}

/**
 * Specialized hook for swipe navigation (week/calendar navigation)
 */
export function useSwipeNavigation(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  options: { threshold?: number; velocity?: number; disabled?: boolean } = {}
) {
  const { threshold = 50, velocity = 0.3, disabled = false } = options;

  return useTouchGestures({
    swipe: {
      enabled: !disabled,
      threshold,
      velocity,
      onSwipeLeft,
      onSwipeRight
    },
    preventDefaultSwipe: true
  });
}

/**
 * Pull-to-refresh hook with visual feedback
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: Omit<PullToRefreshConfig, 'onRefresh'> = {}
) {
  const {
    threshold = 80,
    refreshingText = 'Refreshing...',
    pullText = 'Pull to refresh',
    releaseText = 'Release to refresh'
  } = options;

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    shouldRefresh: false,
    message: pullText
  });

  const refresh = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      isRefreshing: true, 
      message: refreshingText 
    }));

    try {
      await onRefresh();
    } finally {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        shouldRefresh: false,
        message: pullText
      });
    }
  }, [onRefresh, refreshingText, pullText]);

  const gestureConfig = useTouchGestures({
    swipe: {
      enabled: true,
      threshold: 0, // We handle threshold manually for pull-to-refresh
      onSwipeDown: () => {
        // This will be handled in the drag gesture instead
      }
    }
  });

  // Override the drag handler for pull-to-refresh specific behavior
  const bind = useGesture({
    onDrag: ({ down, movement: [, my], velocity: [, vy] }) => {
      if (my > 0 && window.scrollY === 0) { // Only when at top of page
        const pullDistance = Math.min(my, threshold * 2);
        const shouldRefresh = pullDistance >= threshold;

        setState(prev => ({
          ...prev,
          isPulling: down,
          pullDistance,
          shouldRefresh,
          message: shouldRefresh ? releaseText : pullText
        }));

        if (!down && shouldRefresh && !state.isRefreshing) {
          refresh();
        }
      }
    }
  });

  return {
    bind,
    state,
    refresh
  };
}

/**
 * Long press hook for context menus
 */
export function useLongPress(
  onLongPress: (event: TouchEvent | MouseEvent) => void,
  options: Omit<LongPressConfig, 'onLongPress'> = {}
) {
  const { delay = 500 } = options;
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback((event: TouchEvent | MouseEvent) => {
    setIsPressed(true);
    options.onPressStart?.();

    timeoutRef.current = setTimeout(() => {
      onLongPress(event);
      setIsPressed(false);
    }, delay);
  }, [onLongPress, delay, options]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsPressed(false);
    options.onPressEnd?.();
  }, [options]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const bind = {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear
  };

  return {
    bind,
    isPressed
  };
}

/**
 * Pinch-to-zoom hook for detailed views
 */
export function usePinchZoom(
  onZoom: (scale: number) => void,
  options: Omit<PinchZoomConfig, 'onZoom'> = {}
) {
  const { minScale = 0.8, maxScale = 2.5 } = options;
  const [scale, setScale] = useState(1);

  return useTouchGestures({
    pinchZoom: {
      enabled: true,
      minScale,
      maxScale,
      onZoom: (newScale) => {
        setScale(newScale);
        onZoom(newScale);
      },
      onZoomStart: options.onZoomStart,
      onZoomEnd: options.onZoomEnd
    }
  });
}

/**
 * SSR-Safe Hook to detect if device supports touch
 * Defaults to false (no touch) during SSR to prevent hydration mismatches
 */
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false); // Default to no touch during SSR
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration effect
  useIsomorphicLayoutEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const checkTouch = () => {
      try {
        setIsTouchDevice(
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-ignore - for IE compatibility  
          navigator.msMaxTouchPoints > 0
        );
      } catch (error) {
        console.warn('Error checking touch device capabilities:', error);
        setIsTouchDevice(false);
      }
    };

    // Only run after hydration
    if (isHydrated) {
      checkTouch();
      window.addEventListener('resize', checkTouch);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkTouch);
      }
    };
  }, [isHydrated]);

  return isTouchDevice;
}

/**
 * SSR-Safe Hook for handling touch-friendly interactions
 * Provides different behaviors for touch vs mouse devices
 */
export function useTouchFriendly() {
  const isTouchDevice = useTouchDevice();
  
  // Provide different behaviors for touch vs mouse
  const getInteractionProps = useCallback((
    onClick: () => void,
    options: { hapticFeedback?: boolean } = {}
  ) => {
    const handleInteraction = (event?: React.MouseEvent | React.TouchEvent) => {
      // Prevent double firing on touch devices
      if (event && event.type === 'touchend') {
        event.preventDefault();
      }
      
      // Provide haptic feedback on supported devices
      if (options.hapticFeedback && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(10); // Short vibration for feedback
        } catch (error) {
          // Silently handle vibration errors
          console.debug('Haptic feedback not available:', error);
        }
      }
      onClick();
    };

    // Use different event handlers for touch vs mouse to prevent conflicts
    if (isTouchDevice) {
      return {
        onTouchEnd: handleInteraction,
        style: { 
          cursor: 'pointer', 
          touchAction: 'manipulation' 
        },
        'data-touch-device': true
      };
    } else {
      return {
        onClick: handleInteraction,
        style: { 
          cursor: 'pointer', 
          touchAction: 'auto' 
        },
        'data-touch-device': false
      };
    }
  }, [isTouchDevice]);

  return {
    isTouchDevice,
    getInteractionProps
  };
}

export default useTouchGestures;