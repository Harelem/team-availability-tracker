'use client';

import { useState, useEffect } from 'react';

/**
 * Simple mobile detection hook for emergency use
 * Bypasses complex systems and provides basic mobile detection
 */
export function useIsMobileSimple() {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Simple mobile detection based on screen width
    const checkIsMobile = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        const isMobileDevice = width <= 768;
        setIsMobile(isMobileDevice);
        return isMobileDevice;
      }
      return false;
    };

    // Initial check
    checkIsMobile();

    // Listen for resize events
    const handleResize = () => {
      checkIsMobile();
    };

    window.addEventListener('resize', handleResize);
    
    // Also check orientation change for mobile devices
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    isMobile: isClient ? isMobile : false,
    isClient,
    isLoading: !isClient
  };
}