/**
 * Touch Enhancer Component
 * 
 * Provides comprehensive touch interaction enhancements for mobile devices
 * including haptic feedback, visual feedback, gesture recognition, and
 * accessibility improvements.
 */

'use client';

import React, { 
  forwardRef, 
  ReactNode, 
  useRef, 
  useEffect, 
  useState, 
  useCallback 
} from 'react';
import { cx } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface TouchEnhancerProps {
  children: ReactNode;
  className?: string;
  
  // Touch feedback options
  enableHaptics?: boolean;
  hapticIntensity?: 'light' | 'medium' | 'heavy';
  enableVisualFeedback?: boolean;
  feedbackStyle?: 'ripple' | 'scale' | 'glow' | 'bounce';
  
  // Gesture recognition
  enableSwipe?: boolean;
  swipeThreshold?: number;
  enableLongPress?: boolean;
  longPressDelay?: number;
  enableDoubleTap?: boolean;
  doubleTapDelay?: number;
  
  // Touch area optimization
  minimumTouchTarget?: boolean;
  touchTargetSize?: number;
  expandTouchArea?: boolean;
  
  // Event handlers
  onTap?: (event: TouchEvent) => void;
  onDoubleTap?: (event: TouchEvent) => void;
  onLongPress?: (event: TouchEvent) => void;
  onSwipeLeft?: (event: TouchEvent) => void;
  onSwipeRight?: (event: TouchEvent) => void;
  onSwipeUp?: (event: TouchEvent) => void;
  onSwipeDown?: (event: TouchEvent) => void;
  
  // Accessibility
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  tabIndex?: number;
  
  // State management
  disabled?: boolean;
  loading?: boolean;
}

export interface TouchState {
  isPressed: boolean;
  isLongPressed: boolean;
  pressStartTime: number;
  initialTouch: { x: number; y: number } | null;
  lastTap: number;
  tapCount: number;
  isDisabled: boolean;
}

// =============================================================================
// HAPTIC FEEDBACK UTILS
// =============================================================================

export const HapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    // iOS Safari haptic feedback
    if ('hapticFeedback' in window) {
      (window as any).hapticFeedback.impactOccurred('light');
    }
  },
  
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
    if ('hapticFeedback' in window) {
      (window as any).hapticFeedback.impactOccurred('medium');
    }
  },
  
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    if ('hapticFeedback' in window) {
      (window as any).hapticFeedback.impactOccurred('heavy');
    }
  },
  
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([25, 25, 25]);
    }
    if ('hapticFeedback' in window) {
      (window as any).hapticFeedback.notificationOccurred('success');
    }
  },
  
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
    if ('hapticFeedback' in window) {
      (window as any).hapticFeedback.notificationOccurred('error');
    }
  },
  
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([25, 50, 25]);
    }
    if ('hapticFeedback' in window) {
      (window as any).hapticFeedback.notificationOccurred('warning');
    }
  }
};

// =============================================================================
// TOUCH ENHANCER COMPONENT
// =============================================================================

export const TouchEnhancer = forwardRef<HTMLDivElement, TouchEnhancerProps>(
  (
    {
      children,
      className,
      
      // Touch feedback
      enableHaptics = true,
      hapticIntensity = 'light',
      enableVisualFeedback = true,
      feedbackStyle = 'scale',
      
      // Gesture recognition
      enableSwipe = false,
      swipeThreshold = 50,
      enableLongPress = false,
      longPressDelay = 500,
      enableDoubleTap = false,
      doubleTapDelay = 300,
      
      // Touch area optimization
      minimumTouchTarget = true,
      touchTargetSize = 44,
      expandTouchArea = false,
      
      // Event handlers
      onTap,
      onDoubleTap,
      onLongPress,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      
      // Accessibility
      role = 'button',
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      tabIndex = 0,
      
      // State
      disabled = false,
      loading = false,
      
      ...props
    },
    ref
  ) => {
    // State management
    const [touchState, setTouchState] = useState<TouchState>({
      isPressed: false,
      isLongPressed: false,
      pressStartTime: 0,
      initialTouch: null,
      lastTap: 0,
      tapCount: 0,
      isDisabled: disabled || loading
    });
    
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const elementRef = useRef<HTMLDivElement>(null);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const rippleIdRef = useRef(0);

    // Update disabled state
    useEffect(() => {
      setTouchState(prev => ({ ...prev, isDisabled: disabled || loading }));
    }, [disabled, loading]);

    // =============================================================================
    // VISUAL FEEDBACK FUNCTIONS
    // =============================================================================

    const createRipple = useCallback((x: number, y: number) => {
      if (!enableVisualFeedback || feedbackStyle !== 'ripple') return;
      
      const rippleId = ++rippleIdRef.current;
      setRipples(prev => [...prev, { id: rippleId, x, y }]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== rippleId));
      }, 600);
    }, [enableVisualFeedback, feedbackStyle]);

    const triggerHapticFeedback = useCallback(() => {
      if (!enableHaptics || touchState.isDisabled) return;
      
      switch (hapticIntensity) {
        case 'light':
          HapticFeedback.light();
          break;
        case 'medium':
          HapticFeedback.medium();
          break;
        case 'heavy':
          HapticFeedback.heavy();
          break;
      }
    }, [enableHaptics, hapticIntensity, touchState.isDisabled]);

    // =============================================================================
    // TOUCH EVENT HANDLERS
    // =============================================================================

    const handleTouchStart = useCallback((event: React.TouchEvent) => {
      if (touchState.isDisabled) return;
      
      const touch = event.touches[0];
      if (!touch) return;
      
      const rect = elementRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      setTouchState(prev => ({
        ...prev,
        isPressed: true,
        pressStartTime: Date.now(),
        initialTouch: { x: touch.clientX, y: touch.clientY }
      }));
      
      // Create ripple effect at touch point
      createRipple(x, y);
      
      // Trigger haptic feedback
      triggerHapticFeedback();
      
      // Set up long press detection
      if (enableLongPress && onLongPress) {
        longPressTimeoutRef.current = setTimeout(() => {
          setTouchState(prev => ({ ...prev, isLongPressed: true }));
          HapticFeedback.medium();
          onLongPress(event.nativeEvent);
        }, longPressDelay);
      }
    }, [
      touchState.isDisabled,
      enableLongPress,
      onLongPress,
      longPressDelay,
      createRipple,
      triggerHapticFeedback
    ]);

    const handleTouchMove = useCallback((event: React.TouchEvent) => {
      if (touchState.isDisabled || !touchState.initialTouch) return;
      
      const touch = event.touches[0];
      if (!touch) return;
      
      const deltaX = touch.clientX - touchState.initialTouch.x;
      const deltaY = touch.clientY - touchState.initialTouch.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Cancel long press if finger moved too much
      if (distance > 10 && longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }, [touchState.isDisabled, touchState.initialTouch]);

    const handleTouchEnd = useCallback((event: React.TouchEvent) => {
      if (touchState.isDisabled) return;
      
      // Clear long press timeout
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      
      // Don't process tap if it was a long press
      if (touchState.isLongPressed) {
        setTouchState(prev => ({
          ...prev,
          isPressed: false,
          isLongPressed: false,
          initialTouch: null
        }));
        return;
      }
      
      const touch = event.changedTouches[0];
      if (!touch || !touchState.initialTouch) {
        setTouchState(prev => ({ ...prev, isPressed: false, initialTouch: null }));
        return;
      }
      
      // Check for swipe gestures
      if (enableSwipe) {
        const deltaX = touch.clientX - touchState.initialTouch.x;
        const deltaY = touch.clientY - touchState.initialTouch.y;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (Math.max(absDeltaX, absDeltaY) > swipeThreshold) {
          // Determine swipe direction
          if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0) {
              HapticFeedback.light();
              onSwipeRight?.(event.nativeEvent);
            } else {
              HapticFeedback.light();
              onSwipeLeft?.(event.nativeEvent);
            }
          } else {
            // Vertical swipe
            if (deltaY > 0) {
              HapticFeedback.light();
              onSwipeDown?.(event.nativeEvent);
            } else {
              HapticFeedback.light();
              onSwipeUp?.(event.nativeEvent);
            }
          }
          
          setTouchState(prev => ({ ...prev, isPressed: false, initialTouch: null }));
          return;
        }
      }
      
      // Handle tap and double tap
      const now = Date.now();
      const timeSinceLastTap = now - touchState.lastTap;
      
      if (enableDoubleTap && timeSinceLastTap < doubleTapDelay) {
        // Double tap detected
        if (doubleTapTimeoutRef.current) {
          clearTimeout(doubleTapTimeoutRef.current);
          doubleTapTimeoutRef.current = null;
        }
        
        HapticFeedback.medium();
        onDoubleTap?.(event.nativeEvent);
        
        setTouchState(prev => ({
          ...prev,
          isPressed: false,
          initialTouch: null,
          lastTap: 0,
          tapCount: 0
        }));
      } else {
        // Single tap (potentially)
        setTouchState(prev => ({
          ...prev,
          isPressed: false,
          initialTouch: null,
          lastTap: now,
          tapCount: prev.tapCount + 1
        }));
        
        // Wait to see if there's a double tap
        if (enableDoubleTap && onDoubleTap) {
          doubleTapTimeoutRef.current = setTimeout(() => {
            onTap?.(event.nativeEvent);
            setTouchState(prev => ({ ...prev, tapCount: 0 }));
          }, doubleTapDelay);
        } else {
          onTap?.(event.nativeEvent);
        }
      }
    }, [
      touchState.isDisabled,
      touchState.isLongPressed,
      touchState.initialTouch,
      touchState.lastTap,
      enableSwipe,
      swipeThreshold,
      enableDoubleTap,
      doubleTapDelay,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onTap,
      onDoubleTap
    ]);

    // Cleanup timeouts on unmount
    useEffect(() => {
      return () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
        }
        if (doubleTapTimeoutRef.current) {
          clearTimeout(doubleTapTimeoutRef.current);
        }
      };
    }, []);

    // =============================================================================
    // KEYBOARD SUPPORT
    // =============================================================================

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
      if (touchState.isDisabled) return;
      
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        triggerHapticFeedback();
        
        // Simulate a tap event
        const syntheticTouchEvent = new TouchEvent('touchend', {
          touches: [],
          changedTouches: [new Touch({
            identifier: 0,
            target: event.target as Element,
            clientX: 0,
            clientY: 0,
            radiusX: 0,
            radiusY: 0,
            rotationAngle: 0,
            force: 1
          })]
        });
        
        onTap?.(syntheticTouchEvent);
      }
    }, [touchState.isDisabled, triggerHapticFeedback, onTap]);

    // =============================================================================
    // STYLES
    // =============================================================================

    const enhancedClassName = cx(
      // Base styles
      'relative select-none outline-none',
      'transition-all duration-150 ease-out',
      
      // Touch target optimization
      minimumTouchTarget && touchTargetSize === 44 && 'min-h-[44px] min-w-[44px]',
      minimumTouchTarget && touchTargetSize === 48 && 'min-h-[48px] min-w-[48px]',
      minimumTouchTarget && touchTargetSize === 56 && 'min-h-[56px] min-w-[56px]',
      
      // Expand touch area (invisible padding)
      expandTouchArea && 'before:absolute before:inset-[-8px] before:content-[\"\"] before:z-0',
      
      // Visual feedback styles
      enableVisualFeedback && feedbackStyle === 'ripple' && 'transform-none',
      enableVisualFeedback && feedbackStyle === 'scale' && !touchState.isDisabled && 'active:scale-95',
      enableVisualFeedback && feedbackStyle === 'glow' && !touchState.isDisabled && 'active:shadow-lg',
      enableVisualFeedback && feedbackStyle === 'bounce' && !touchState.isDisabled && 'active:animate-bounce',
      
      // State-based styles
      touchState.isPressed && enableVisualFeedback && feedbackStyle === 'scale' && 'scale-95',
      touchState.isPressed && enableVisualFeedback && feedbackStyle === 'glow' && 'shadow-lg',
      touchState.isPressed && enableVisualFeedback && 'bg-opacity-80',
      
      touchState.isDisabled && 'opacity-50 pointer-events-none',
      loading && 'cursor-wait',
      
      // Focus styles for accessibility
      'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      
      className
    );

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
      <div
        ref={elementRef || ref}
        className={enhancedClassName}
        role={role}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        tabIndex={touchState.isDisabled ? -1 : tabIndex}
        
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        
        {...props}
      >
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Ripple effects */}
        {enableVisualFeedback && feedbackStyle === 'ripple' && (
          <div className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none">
            {ripples.map(ripple => (
              <div
                key={ripple.id}
                className="absolute w-0 h-0 bg-white bg-opacity-30 rounded-full animate-ping"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  animation: 'ripple 0.6s ease-out forwards'
                }}
              />
            ))}
          </div>
        )}
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-20 flex items-center justify-center rounded-inherit">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
          </div>
        )}
        
        {/* Screen reader feedback */}
        <div className="sr-only" aria-live="polite">
          {touchState.isPressed ? 'Pressed' : ''}
          {touchState.isLongPressed ? 'Long pressed' : ''}
          {loading ? 'Loading' : ''}
          {touchState.isDisabled ? 'Disabled' : ''}
        </div>
      </div>
    );
  }
);

TouchEnhancer.displayName = 'TouchEnhancer';

// =============================================================================
// UTILITY HOOKS
// =============================================================================

export const useTouchFeedback = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
  return useCallback(() => {
    switch (intensity) {
      case 'light':
        HapticFeedback.light();
        break;
      case 'medium':
        HapticFeedback.medium();
        break;
      case 'heavy':
        HapticFeedback.heavy();
        break;
    }
  }, [intensity]);
};

export const useGestureRecognition = (element: HTMLElement | null) => {
  const [gestureState, setGestureState] = useState({
    isPressed: false,
    swipeDirection: null as 'left' | 'right' | 'up' | 'down' | null,
    longPressed: false
  });

  useEffect(() => {
    if (!element) return;

    const handleGestureStart = () => {
      setGestureState(prev => ({ ...prev, isPressed: true }));
    };

    const handleGestureEnd = () => {
      setGestureState(prev => ({ ...prev, isPressed: false, swipeDirection: null }));
    };

    element.addEventListener('touchstart', handleGestureStart, { passive: true });
    element.addEventListener('touchend', handleGestureEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleGestureStart);
      element.removeEventListener('touchend', handleGestureEnd);
    };
  }, [element]);

  return gestureState;
};

// =============================================================================
// CSS FOR RIPPLE ANIMATION
// =============================================================================

// Add this to your global CSS:
/*
@keyframes ripple {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    width: 100px;
    height: 100px;
    margin-left: -50px;
    margin-top: -50px;
    opacity: 0;
  }
}
*/

export default TouchEnhancer;