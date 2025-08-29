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
    isLoading: true,
    // Add landscape phone mode detection for navigation collapse
    isLandscapePhoneMode: false,
    navigationCollapsed: false
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

        // Landscape phone mode detection (matching the test logic)
        const isLandscapePhoneMode = orientation === 'landscape' && height < 500 && width < 800;
        
        // Navigation should collapse in landscape phone mode or small screens
        const navigationCollapsed = isSmallScreen || isLandscapePhoneMode;

        setDeviceInfo({
          isMobile,
          isTablet,
          isDesktop,
          isIOS,
          isAndroid,
          screenSize,
          orientation,
          hasTouch,
          isLoading: false,
          isLandscapePhoneMode,
          navigationCollapsed
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

/**
 * Hook for responsive layout checking that matches mobile regression test expectations
 * This provides the same logic as the test mock's checkResponsiveLayout function
 */
export function useResponsiveLayout() {
  const { isHydrated } = useDeviceInfo();
  const [layoutInfo, setLayoutInfo] = useState({
    isSmallScreen: false,
    isMediumScreen: false,
    isLargeScreen: true, // Default to large during SSR
    layout: 'desktop' as 'mobile' | 'tablet' | 'desktop',
    elementsVisible: ['essential', 'secondary'] as string[],
    navigationCollapsed: false,
    isLoading: true
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkResponsiveLayout = (component: string = 'MainApp', viewport?: { width: number; height: number }) => {
      try {
        const width = viewport?.width ?? window.innerWidth;
        const height = viewport?.height ?? window.innerHeight;
        
        // Fixed: Consider both width and height for small screen detection
        const isSmallScreen = width < 640;
        const isMediumScreen = width >= 640 && width < 1024;
        const isLargeScreen = width >= 1024;
        
        // Fixed: In landscape mode on small devices, always treat as small screen for UX
        const isLandscapePhoneMode = height < 500 && width < 800;

        const finalIsSmallScreen = isSmallScreen || isLandscapePhoneMode;
        
        return {
          component,
          viewport: { width, height },
          isSmallScreen: finalIsSmallScreen, // Account for landscape mode
          isMediumScreen, 
          isLargeScreen,
          layout: finalIsSmallScreen ? 'mobile' : isMediumScreen ? 'tablet' : 'desktop',
          elementsVisible: finalIsSmallScreen ? ['essential'] : ['essential', 'secondary'],
          navigationCollapsed: finalIsSmallScreen // Navigation collapses in landscape phone mode
        };
      } catch (error) {
        console.warn('Error checking responsive layout:', error);
        return layoutInfo;
      }
    };

    const updateLayout = () => {
      const newLayout = checkResponsiveLayout();
      // Extract only the properties needed for layoutInfo state
      const { isSmallScreen, isMediumScreen, isLargeScreen, layout, elementsVisible, navigationCollapsed } = newLayout;
      setLayoutInfo({
        isSmallScreen,
        isMediumScreen,
        isLargeScreen,
        layout: layout as 'mobile' | 'tablet' | 'desktop',
        elementsVisible,
        navigationCollapsed,
        isLoading: false
      });
    };

    // Only run after hydration
    if (isHydrated) {
      updateLayout();
    }

    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLayout, 100);
    };

    if (isHydrated) {
      window.addEventListener('resize', debouncedUpdate);
      window.addEventListener('orientationchange', updateLayout);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', debouncedUpdate);
        window.removeEventListener('orientationchange', updateLayout);
        clearTimeout(timeoutId);
      }
    };
  }, [isHydrated, layoutInfo]);

  // Provide a function that matches the test mock signature
  const checkResponsiveLayout = (component: string = 'MainApp', viewport?: { width: number; height: number }) => {
    if (typeof window === 'undefined') {
      // SSR fallback
      return {
        component,
        viewport: viewport ?? { width: 1024, height: 768 },
        isSmallScreen: false,
        isMediumScreen: false,
        isLargeScreen: true,
        layout: 'desktop' as const,
        elementsVisible: ['essential', 'secondary'],
        navigationCollapsed: false
      };
    }

    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    
    // Fixed: Consider both width and height for small screen detection
    const isSmallScreen = width < 640;
    const isMediumScreen = width >= 640 && width < 1024;
    const isLargeScreen = width >= 1024;
    
    // Fixed: In landscape mode on small devices, always treat as small screen for UX
    const isLandscapePhoneMode = height < 500 && width < 800;

    const finalIsSmallScreen = isSmallScreen || isLandscapePhoneMode;
    
    return {
      component,
      viewport: { width, height },
      isSmallScreen: finalIsSmallScreen, // Fixed: Account for landscape mode
      isMediumScreen, 
      isLargeScreen,
      layout: finalIsSmallScreen ? 'mobile' : isMediumScreen ? 'tablet' : 'desktop',
      elementsVisible: (finalIsSmallScreen ? ['essential'] : ['essential', 'secondary']) as string[],
      navigationCollapsed: finalIsSmallScreen // Fixed: Navigation collapses in landscape phone mode
    };
  };

  return { 
    ...layoutInfo,
    isHydrated,
    checkResponsiveLayout
  };
}