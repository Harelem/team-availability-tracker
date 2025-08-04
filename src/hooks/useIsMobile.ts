'use client';

import { useState, useEffect } from 'react';

/**
 * Mobile Detection Hook for Emergency Mobile UX Fix
 * 
 * Detects mobile devices and provides responsive breakpoints
 * for conditional rendering of mobile-optimized components
 */
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
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
    };

    // Check on mount
    checkMobile();

    // Add resize listener with debouncing
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', checkMobile);
      clearTimeout(timeoutId);
    };
  }, [breakpoint]);

  return { isMobile, isLoading };
}

/**
 * Advanced mobile detection with device-specific information
 */
export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
    screenSize: 'unknown' as 'small' | 'medium' | 'large' | 'unknown',
    orientation: 'portrait' as 'portrait' | 'landscape',
    hasTouch: false,
    isLoading: true
  });

  useEffect(() => {
    const detectDevice = () => {
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
    };

    detectDevice();

    // Listen for changes
    let timeoutId: NodeJS.Timeout;
    const debouncedDetect = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(detectDevice, 100);
    };

    window.addEventListener('resize', debouncedDetect);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', debouncedDetect);
      window.removeEventListener('orientationchange', detectDevice);
      clearTimeout(timeoutId);
    };
  }, []);

  return deviceInfo;
}

/**
 * Hook for mobile-first responsive design
 */
export function useResponsive() {
  const { isMobile, isLoading } = useIsMobile();
  const [breakpoints, setBreakpoints] = useState({
    xs: false, // < 480px
    sm: false, // 480px - 640px
    md: false, // 640px - 768px
    lg: false, // 768px - 1024px
    xl: false, // > 1024px
    isMobile: false, // < 768px
    isTablet: false, // 768px - 1024px
    isDesktop: false // > 1024px
  });

  useEffect(() => {
    const updateBreakpoints = () => {
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
    };

    updateBreakpoints();

    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoints, 100);
    };

    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('orientationchange', updateBreakpoints);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', updateBreakpoints);
      clearTimeout(timeoutId);
    };
  }, []);

  return { ...breakpoints, isLoading };
}