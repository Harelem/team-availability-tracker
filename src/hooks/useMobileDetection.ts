'use client';

import { useState, useEffect, useLayoutEffect } from 'react';

// SSR-safe useLayoutEffect that falls back to useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * SSR-Safe Custom hook to detect mobile screen size
 * Returns true for screens smaller than 768px
 * Handles server-side rendering by defaulting to false (desktop)
 */
export const useMobileDetection = (): boolean => {
  const [isMobile, setIsMobile] = useState(false); // Default to desktop during SSR
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration effect
  useIsomorphicLayoutEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      try {
        setIsMobile(window.innerWidth < 768);
      } catch (error) {
        console.warn('Error checking mobile detection:', error);
        setIsMobile(false);
      }
    };

    // Only run after hydration
    if (isHydrated) {
      checkMobile();
      // Add resize listener
      window.addEventListener('resize', checkMobile);
    }

    // Cleanup listener on unmount
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkMobile);
      }
    };
  }, [isHydrated]);

  return isMobile;
};

/**
 * SSR-Safe Custom hook for tablet detection (768px - 1024px)
 */
export const useTabletDetection = (): boolean => {
  const [isTablet, setIsTablet] = useState(false); // Default to desktop during SSR
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration effect
  useIsomorphicLayoutEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const checkTablet = () => {
      try {
        const width = window.innerWidth;
        setIsTablet(width >= 768 && width < 1024);
      } catch (error) {
        console.warn('Error checking tablet detection:', error);
        setIsTablet(false);
      }
    };

    // Only run after hydration
    if (isHydrated) {
      checkTablet();
      window.addEventListener('resize', checkTablet);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkTablet);
      }
    };
  }, [isHydrated]);

  return isTablet;
};

/**
 * SSR-Safe Custom hook for comprehensive screen size detection
 */
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: 1024, // Default to desktop width during SSR
    height: 768, // Default to desktop height during SSR
    isMobile: false,
    isTablet: false,
    isDesktop: true // Default to desktop during SSR
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration effect
  useIsomorphicLayoutEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const updateScreenSize = () => {
      try {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        setScreenSize({
          width,
          height,
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024
        });
      } catch (error) {
        console.warn('Error updating screen size:', error);
      }
    };

    // Only run after hydration
    if (isHydrated) {
      updateScreenSize();
      window.addEventListener('resize', updateScreenSize);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateScreenSize);
      }
    };
  }, [isHydrated]);

  return { ...screenSize, isHydrated };
};