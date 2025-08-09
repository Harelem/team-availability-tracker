'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation, NAVIGATION_PAGES } from '@/contexts/NavigationContext';

export interface MobileNavigationConfig {
  enableSwipeGestures?: boolean;
  enableKeyboardNavigation?: boolean;
  animationDuration?: number;
  swipeThreshold?: number;
}

export interface SwipeGesture {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isActive: boolean;
}

const defaultConfig: Required<MobileNavigationConfig> = {
  enableSwipeGestures: true,
  enableKeyboardNavigation: true,
  animationDuration: 300,
  swipeThreshold: 100
};

export function useMobileNavigation(config: MobileNavigationConfig = {}) {
  const router = useRouter();
  const navigation = useNavigation();
  const fullConfig = { ...defaultConfig, ...config };
  
  // Swipe gesture state
  const [swipeGesture, setSwipeGesture] = useState<SwipeGesture>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    isActive: false
  });

  // Handle swipe start
  const handleSwipeStart = useCallback((e: TouchEvent | MouseEvent) => {
    if (!fullConfig.enableSwipeGestures) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setSwipeGesture({
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      deltaX: 0,
      deltaY: 0,
      isActive: true
    });
  }, [fullConfig.enableSwipeGestures]);

  // Handle swipe move
  const handleSwipeMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!fullConfig.enableSwipeGestures || !swipeGesture.isActive) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setSwipeGesture(prev => ({
      ...prev,
      currentX: clientX,
      currentY: clientY,
      deltaX: clientX - prev.startX,
      deltaY: clientY - prev.startY
    }));
  }, [fullConfig.enableSwipeGestures, swipeGesture.isActive]);

  // Handle swipe end
  const handleSwipeEnd = useCallback(() => {
    if (!fullConfig.enableSwipeGestures || !swipeGesture.isActive) return;
    
    const { deltaX, deltaY } = swipeGesture;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Check if swipe meets threshold and is primarily horizontal
    if (absX > fullConfig.swipeThreshold && absX > absY) {
      if (deltaX > 0) {
        // Swipe right - go back if possible
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      } else {
        // Swipe left - could be used for forward navigation
        // Currently not implemented
      }
    }
    
    // Check if swipe is primarily vertical and from left edge
    if (absY > fullConfig.swipeThreshold && absY > absX && swipeGesture.startX < 50) {
      if (deltaY < 0) {
        // Swipe up from left edge - open navigation
        navigation.openNavigation();
      }
    }
    
    setSwipeGesture(prev => ({
      ...prev,
      isActive: false,
      deltaX: 0,
      deltaY: 0
    }));
  }, [
    fullConfig.enableSwipeGestures,
    fullConfig.swipeThreshold,
    swipeGesture,
    navigation
  ]);

  // Keyboard navigation
  useEffect(() => {
    if (!fullConfig.enableKeyboardNavigation) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle escape key to close navigation
      if (e.key === 'Escape' && navigation.state.isNavigationOpen) {
        navigation.closeNavigation();
        return;
      }
      
      // Handle keyboard shortcuts (with Alt key)
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault();
            navigateToPage(NAVIGATION_PAGES.HOME);
            break;
          case 'm':
            e.preventDefault();
            navigation.toggleNavigation();
            break;
          case 's':
            e.preventDefault();
            navigateToPage(NAVIGATION_PAGES.SETTINGS);
            break;
          case 'arrowleft':
            e.preventDefault();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullConfig.enableKeyboardNavigation, navigation]);

  // Touch event listeners for swipe gestures
  useEffect(() => {
    if (!fullConfig.enableSwipeGestures) return;
    
    document.addEventListener('touchstart', handleSwipeStart, { passive: true });
    document.addEventListener('touchmove', handleSwipeMove, { passive: true });
    document.addEventListener('touchend', handleSwipeEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleSwipeStart);
      document.removeEventListener('touchmove', handleSwipeMove);
      document.removeEventListener('touchend', handleSwipeEnd);
    };
  }, [fullConfig.enableSwipeGestures, handleSwipeStart, handleSwipeMove, handleSwipeEnd]);

  // Navigation helpers
  const navigateToPage = useCallback((page: string) => {
    navigation.navigateTo(page);
    router.push(page);
  }, [navigation, router]);

  const navigateBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      router.back();
    }
  }, [navigation, router]);

  const navigateToTeamSelection = useCallback(() => {
    navigateToPage(NAVIGATION_PAGES.TEAM_SELECTION);
  }, [navigateToPage]);

  const navigateToHome = useCallback(() => {
    navigateToPage(NAVIGATION_PAGES.HOME);
  }, [navigateToPage]);

  const navigateToExecutive = useCallback(() => {
    navigateToPage(NAVIGATION_PAGES.EXECUTIVE_DASHBOARD);
  }, [navigateToPage]);

  const navigateToSettings = useCallback(() => {
    navigateToPage(NAVIGATION_PAGES.SETTINGS);
  }, [navigateToPage]);

  // Animation helpers
  const getTransitionStyle = useCallback((isVisible: boolean, direction: 'slide' | 'fade' = 'slide') => {
    const duration = `${fullConfig.animationDuration}ms`;
    
    if (direction === 'fade') {
      return {
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${duration} ease-in-out`
      };
    }
    
    return {
      transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
      transition: `transform ${duration} ease-out`
    };
  }, [fullConfig.animationDuration]);

  // Menu state helpers
  const isNavigationOpen = navigation.state.isNavigationOpen;
  const currentPage = navigation.state.currentPage;
  const canGoBack = navigation.canGoBack();

  return {
    // Navigation state
    isNavigationOpen,
    currentPage,
    canGoBack,
    breadcrumbs: navigation.state.breadcrumbs,
    
    // Navigation actions
    openNavigation: navigation.openNavigation,
    closeNavigation: navigation.closeNavigation,
    toggleNavigation: navigation.toggleNavigation,
    navigateToPage,
    navigateBack,
    navigateToTeamSelection,
    navigateToHome,
    navigateToExecutive,
    navigateToSettings,
    
    // Breadcrumb management
    setBreadcrumbs: navigation.setBreadcrumbs,
    addBreadcrumb: navigation.addBreadcrumb,
    
    // Animation helpers
    getTransitionStyle,
    
    // Swipe gesture state (for advanced usage)
    swipeGesture: fullConfig.enableSwipeGestures ? swipeGesture : null,
    
    // Configuration
    config: fullConfig
  };
}

// Hook for managing navigation menu animations
export function useNavigationAnimation(isOpen: boolean, duration = 300) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);
  
  return {
    shouldRender,
    isAnimating,
    animationClasses: {
      enter: isOpen && isAnimating,
      exit: !isOpen && isAnimating
    }
  };
}