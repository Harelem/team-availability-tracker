/**
 * Custom hook for debounced hover functionality
 * Prevents tooltip flicker on quick mouse movements
 */

import { useState, useCallback, useRef } from 'react';

interface UseDebouncedHoverOptions {
  debounceMs?: number;
  onHoverStart?: (key: string) => void;
  onHoverEnd?: (key: string) => void;
}

interface UseDebouncedHoverReturn {
  hoveredItem: string | null;
  handleMouseEnter: (key: string) => void;
  handleMouseLeave: (key: string) => void;
  clearHover: () => void;
}

export const useDebouncedHover = ({
  debounceMs = 100,
  onHoverStart,
  onHoverEnd
}: UseDebouncedHoverOptions = {}): UseDebouncedHoverReturn => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((key: string) => {
    // Clear any pending leave timeout
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    // Clear any pending enter timeout
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
    }

    // Set new enter timeout
    enterTimeoutRef.current = setTimeout(() => {
      setHoveredItem(key);
      onHoverStart?.(key);
      enterTimeoutRef.current = null;
    }, debounceMs);
  }, [debounceMs, onHoverStart]);

  const handleMouseLeave = useCallback((key: string) => {
    // Clear any pending enter timeout
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }

    // Set leave timeout
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
      onHoverEnd?.(key);
      leaveTimeoutRef.current = null;
    }, debounceMs / 2); // Faster leave for better UX
  }, [debounceMs, onHoverEnd]);

  const clearHover = useCallback(() => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredItem(null);
  }, []);

  // Cleanup timeouts on unmount
  const cleanup = useCallback(() => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
  }, []);

  // Effect to cleanup on unmount
  useState(() => {
    return () => cleanup();
  });

  return {
    hoveredItem,
    handleMouseEnter,
    handleMouseLeave,
    clearHover
  };
};