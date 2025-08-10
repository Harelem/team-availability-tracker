'use client';

import { useState, useEffect, useLayoutEffect } from 'react';

// SSR-safe useLayoutEffect that falls back to useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * SSR-Safe Mobile Detection Hook
 * 
 * Detects mobile devices and provides responsive breakpoints
 * for conditional rendering of mobile-optimized components.
 * 
 * Handles server-side rendering by defaulting to desktop view
 * and updating immediately on hydration to prevent mismatches.
 */
export function useIsMobile(breakpoint: number = 768) {
  // Initialize with SSR-safe defaults (assume desktop during SSR)
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration effect - runs immediately after mount
  useIsomorphicLayoutEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      try {
        // Check viewport width
        const isViewportMobile = window.innerWidth < breakpoint;
        
        // Check user agent for mobile patterns
        const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone|Mobile/i.test(
          navigator.userAgent
        );
        
        // Combine both checks - viewport takes priority
        const mobile = isViewportMobile || (isMobileUserAgent && window.innerWidth < 1024);
        
        setIsMobile(mobile);
        setIsLoading(false);
      } catch (error) {
        console.warn('Error detecting mobile device:', error);
        setIsMobile(false);
        setIsLoading(false);
      }
    };

    // Only run after hydration
    if (isHydrated) {
      checkMobile();
    }

    // Add resize listener with debouncing
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };

    if (isHydrated) {
      window.addEventListener('resize', debouncedResize);
      window.addEventListener('orientationchange', checkMobile);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', debouncedResize);
        window.removeEventListener('orientationchange', checkMobile);
        clearTimeout(timeoutId);
      }
    };
  }, [breakpoint, isHydrated]);

  return { 
    isMobile, 
    isLoading: !isHydrated || isLoading,
    isHydrated 
  };
}

/**
 * SSR-Safe Advanced mobile detection with device-specific information
 */
export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true, // Default to desktop during SSR
    isIOS: false,
    isAndroid: false,
    screenSize: 'large' as 'small' | 'medium' | 'large' | 'unknown', // Default to large during SSR
    orientation: 'landscape' as 'portrait' | 'landscape', // Default to landscape during SSR
    hasTouch: false,
    isLoading: true
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration effect
  useIsomorphicLayoutEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const detectDevice = () => {
      try {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const userAgent = navigator.userAgent;

        // Mobile patterns
        const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|Windows Phone/i.test(userAgent);
        const isTabletUA = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
        
        // Screen size categories
        const isSmallScreen = width < 640;
        const isMediumScreen = width >= 640 && width < 1024;
        const isLargeScreen = width >= 1024;

        // Device detection
        const isMobile = isSmallScreen || (isMobileUA && width < 768);
        const isTablet = isMediumScreen || (isTabletUA && !isMobile);
        const isDesktop = isLargeScreen && !isMobileUA && !isTabletUA;

        // Platform detection
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);

        // Screen size classification
        let screenSize: 'small' | 'medium' | 'large' = 'medium';
        if (isSmallScreen) screenSize = 'small';
        else if (isLargeScreen) screenSize = 'large';

        // Orientation
        const orientation = width > height ? 'landscape' : 'portrait';

        // Touch support
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        setDeviceInfo({
          isMobile,
          isTablet,
          isDesktop,
          isIOS,
          isAndroid,
          screenSize,
          orientation,
          hasTouch,
          isLoading: false
        });
      } catch (error) {
        console.warn('Error detecting device info:', error);
        setDeviceInfo(prev => ({ ...prev, isLoading: false }));
      }
    };

    // Only run after hydration
    if (isHydrated) {
      detectDevice();
    }

    // Listen for changes
    let timeoutId: NodeJS.Timeout;
    const debouncedDetect = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(detectDevice, 100);
    };

    if (isHydrated) {
      window.addEventListener('resize', debouncedDetect);
      window.addEventListener('orientationchange', detectDevice);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', debouncedDetect);
        window.removeEventListener('orientationchange', detectDevice);
        clearTimeout(timeoutId);
      }
    };
  }, [isHydrated]);

  return { ...deviceInfo, isHydrated };
}

/**
 * SSR-Safe Hook for mobile-first responsive design
 */
export function useResponsive() {
  const { isMobile, isLoading, isHydrated } = useIsMobile();
  const [breakpoints, setBreakpoints] = useState({
    xs: false, // < 480px
    sm: false, // 480px - 640px
    md: false, // 640px - 768px
    lg: false, // 768px - 1024px
    xl: true, // > 1024px - default to desktop during SSR
    isMobile: false, // < 768px
    isTablet: false, // 768px - 1024px
    isDesktop: true // > 1024px - default to desktop during SSR
  });

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const updateBreakpoints = () => {
      try {
        const width = window.innerWidth;

        setBreakpoints({
          xs: width < 480,
          sm: width >= 480 && width < 640,
          md: width >= 640 && width < 768,
          lg: width >= 768 && width < 1024,
          xl: width >= 1024,
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024
        });
      } catch (error) {
        console.warn('Error updating breakpoints:', error);
      }
    };

    // Only run after hydration
    if (isHydrated) {
      updateBreakpoints();
    }

    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoints, 100);
    };

    if (isHydrated) {
      window.addEventListener('resize', debouncedUpdate);
      window.addEventListener('orientationchange', updateBreakpoints);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', debouncedUpdate);
        window.removeEventListener('orientationchange', updateBreakpoints);
        clearTimeout(timeoutId);
      }
    };
  }, [isHydrated]);

  return { ...breakpoints, isLoading, isHydrated };
}