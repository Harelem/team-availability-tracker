'use client';

import { useState, useRef, useEffect } from 'react';

interface SwipeableNavigationProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  disabled?: boolean;
  minSwipeDistance?: number;
  maxVerticalDistance?: number;
}

/**
 * SwipeableNavigation Component
 * 
 * Provides premium swipe gesture support for navigation
 * - Horizontal swipes for navigation (left/right)
 * - Prevents vertical scrolling interference
 * - Haptic feedback on supported devices
 * - Touch-friendly with proper event handling
 */
export default function SwipeableNavigation({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = '',
  disabled = false,
  minSwipeDistance = 50,
  maxVerticalDistance = 100
}: SwipeableNavigationProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Provide haptic feedback if available
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      if ('vibrate' in navigator) {
        // Different vibration patterns for different feedback types
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        };
        navigator.vibrate(patterns[type]);
      }
      
      // iOS haptic feedback (if available)
      if ('Haptics' in window && (window as any).Haptics) {
        (window as any).Haptics.impact(type);
      }
    } catch (error) {
      // Haptic feedback not available, silently continue
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    
    const touch = e.targetTouches[0];
    if (!touch) return;
    
    setTouchEnd(null);
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsTracking(true);
    
    // Add light haptic feedback on touch start
    triggerHapticFeedback('light');
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isTracking) return;
    
    const touch = e.targetTouches[0];
    if (!touch) return;
    
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
    
    // Prevent default scrolling if we're tracking a horizontal swipe
    if (touchStart) {
      const deltaX = Math.abs(touch.clientX - touchStart.x);
      const deltaY = Math.abs(touch.clientY - touchStart.y);
      
      // If horizontal movement is greater than vertical, prevent vertical scrolling
      if (deltaX > deltaY && deltaX > 20) {
        e.preventDefault();
      }
    }
  };

  const onTouchEnd = () => {
    if (disabled || !isTracking || !touchStart || !touchEnd) {
      setIsTracking(false);
      return;
    }
    
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = Math.abs(touchStart.y - touchEnd.y);
    
    // Check if the swipe meets our criteria
    const isValidHorizontalSwipe = Math.abs(deltaX) > minSwipeDistance;
    const isNotVerticalScroll = deltaY < maxVerticalDistance;
    
    if (isValidHorizontalSwipe && isNotVerticalScroll) {
      // Provide stronger haptic feedback for successful swipe
      triggerHapticFeedback('medium');
      
      if (deltaX > 0 && onSwipeLeft) {
        // Swiped left (moving to next)
        onSwipeLeft();
      } else if (deltaX < 0 && onSwipeRight) {
        // Swiped right (moving to previous)
        onSwipeRight();
      }
    }
    
    setIsTracking(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Clean up tracking state if touch is cancelled
  const onTouchCancel = () => {
    setIsTracking(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      // Only handle keyboard navigation if the container or its children are focused
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      if (e.key === 'ArrowLeft' && onSwipeRight) {
        e.preventDefault();
        onSwipeRight();
        triggerHapticFeedback('light');
      } else if (e.key === 'ArrowRight' && onSwipeLeft) {
        e.preventDefault();
        onSwipeLeft();
        triggerHapticFeedback('light');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onSwipeLeft, onSwipeRight]);

  return (
    <div
      ref={containerRef}
      className={`select-none ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{
        touchAction: 'pan-y', // Allow vertical scrolling but handle horizontal ourselves
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      role="region"
      aria-label="Swipeable navigation area"
      tabIndex={-1}
    >
      {children}
      
      {/* Visual swipe indicator for first-time users (optional) */}
      {isTracking && touchStart && touchEnd && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-black/20 text-white px-4 py-2 rounded-full text-sm font-medium">
            {Math.abs(touchStart.x - touchEnd.x) > minSwipeDistance 
              ? (touchStart.x > touchEnd.x ? '← Swipe Left' : 'Swipe Right →')
              : 'Continue swiping...'
            }
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for easier integration
export function useSwipeNavigation(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  options?: {
    minSwipeDistance?: number;
    maxVerticalDistance?: number;
    disabled?: boolean;
  }
) {
  const {
    minSwipeDistance = 50,
    maxVerticalDistance = 100,
    disabled = false
  } = options || {};

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.targetTouches[0];
      if (touch) {
        setTouchEnd(null);
        setTouchStart({ x: touch.clientX, y: touch.clientY });
      }
    },

    onTouchMove: (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.targetTouches[0];
      if (touch) {
        setTouchEnd({ x: touch.clientX, y: touch.clientY });
      }
    },

    onTouchEnd: () => {
      if (disabled || !touchStart || !touchEnd) return;

      const deltaX = touchStart.x - touchEnd.x;
      const deltaY = Math.abs(touchStart.y - touchEnd.y);

      const isValidHorizontalSwipe = Math.abs(deltaX) > minSwipeDistance;
      const isNotVerticalScroll = deltaY < maxVerticalDistance;

      if (isValidHorizontalSwipe && isNotVerticalScroll) {
        if (deltaX > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (deltaX < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }

      setTouchStart(null);
      setTouchEnd(null);
    }
  };

  return handlers;
}