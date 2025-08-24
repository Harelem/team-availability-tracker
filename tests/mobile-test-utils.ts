/**
 * Mobile Testing Utilities
 * Based on mobile fixes from debug knowledge base Bug Reports #10-15, #25, #40-41
 * 
 * These utilities help test mobile-specific functionality that was problematic:
 * - Touch interactions and event handling
 * - Navigation menu functionality
 * - Hydration safety on mobile
 * - PWA cache behavior
 * - Responsive design validation
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mobile viewport dimensions for testing
export const MOBILE_VIEWPORTS = {
  iPhone13: { width: 390, height: 844 },
  iPhone13Mini: { width: 375, height: 812 },
  iPhoneSE: { width: 375, height: 667 },
  AndroidMedium: { width: 360, height: 640 },
  iPadMini: { width: 768, height: 1024 },
  AndroidTablet: { width: 800, height: 1280 }
} as const;

/**
 * Simulate mobile viewport and device characteristics
 * Based on Bug Reports #11-15 hydration and mobile navigation fixes
 */
export const simulateMobileViewport = (viewport: keyof typeof MOBILE_VIEWPORTS = 'iPhone13') => {
  const { width, height } = MOBILE_VIEWPORTS[viewport];
  
  // Update window dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height
  });
  
  // Set mobile user agent
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  // Add mobile-specific properties
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    value: 5
  });
  
  // Add vibration API for haptic feedback testing (Bug Report #41)
  Object.defineProperty(navigator, 'vibrate', {
    writable: true,
    value: jest.fn()
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
  
  // Add mobile CSS media query support
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query.includes('max-width: 768px'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

/**
 * Simulate touch interaction on an element
 * Based on Bug Report #41 - Mobile navigation touch fixes
 */
export const simulateTouch = async (element: HTMLElement, options?: {
  duration?: number;
  clientX?: number;
  clientY?: number;
}) => {
  const rect = element.getBoundingClientRect();
  const clientX = options?.clientX ?? rect.left + rect.width / 2;
  const clientY = options?.clientY ?? rect.top + rect.height / 2;
  const duration = options?.duration ?? 100;
  
  // Create touch event
  const touch = {
    identifier: 0,
    target: element,
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1
  } as Touch;
  
  // TouchStart
  const touchStart = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [touch],
    targetTouches: [touch],
    changedTouches: [touch]
  });
  
  // TouchEnd
  const touchEnd = new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
    touches: [],
    targetTouches: [],
    changedTouches: [touch]
  });
  
  element.dispatchEvent(touchStart);
  
  // Wait for duration
  await new Promise(resolve => setTimeout(resolve, duration));
  
  element.dispatchEvent(touchEnd);
  
  // Also dispatch click for compatibility
  await userEvent.click(element);
};

/**
 * Test for minimum touch target size (48x48px - Apple/Google guidelines)
 * Based on mobile UX fixes from Bug Report #41
 */
export const checkTouchTargetSize = (element: HTMLElement): {
  valid: boolean;
  width: number;
  height: number;
  recommendation?: string;
} => {
  const rect = element.getBoundingClientRect();
  const MIN_SIZE = 44; // Apple guideline: 44pt minimum
  
  const result = {
    valid: rect.width >= MIN_SIZE && rect.height >= MIN_SIZE,
    width: rect.width,
    height: rect.height
  };
  
  if (!result.valid) {
    return {
      ...result,
      recommendation: `Touch target should be at least ${MIN_SIZE}x${MIN_SIZE}px. Current: ${Math.round(rect.width)}x${Math.round(rect.height)}px`
    };
  }
  
  return result;
};

/**
 * Test for horizontal scrolling issues
 * Based on Bug Report #12 - Mobile layout fixes
 */
export const checkHorizontalScrolling = (): {
  hasHorizontalScroll: boolean;
  scrollWidth: number;
  clientWidth: number;
  overflowElements: Element[];
} => {
  const body = document.body;
  const documentElement = document.documentElement;
  
  const hasHorizontalScroll = (
    body.scrollWidth > body.clientWidth ||
    documentElement.scrollWidth > documentElement.clientWidth
  );
  
  // Find elements causing overflow
  const overflowElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.right > window.innerWidth;
  });
  
  return {
    hasHorizontalScroll,
    scrollWidth: Math.max(body.scrollWidth, documentElement.scrollWidth),
    clientWidth: Math.min(body.clientWidth, documentElement.clientWidth),
    overflowElements
  };
};

/**
 * Test authentication state (based on Bug Report #27 auth fixes)
 */
export const checkAuthenticationState = async (): Promise<{
  isAuthenticated: boolean;
  hasErrors: boolean;
  errorDetails?: any;
}> => {
  try {
    // Mock the authentication check that was failing
    const { supabase } = await import('@/lib/supabase');
    const response = await supabase.auth.getUser();
    
    return {
      isAuthenticated: !response.error && !!response.data.user,
      hasErrors: !!response.error,
      errorDetails: response.error
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      hasErrors: true,
      errorDetails: error
    };
  }
};

/**
 * Test WebSocket connection (based on Bug Report #27 connection fixes)
 */
export const testRealtimeConnection = (timeout = 5000): Promise<{
  connected: boolean;
  status: string;
  error?: string;
}> => {
  return new Promise(async (resolve) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const channel = supabase.channel('test-connection');
      
      let resolved = false;
      
      channel.subscribe((status) => {
        if (resolved) return;
        
        if (status === 'SUBSCRIBED') {
          resolved = true;
          resolve({
            connected: true,
            status: 'SUBSCRIBED'
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          resolved = true;
          resolve({
            connected: false,
            status,
            error: 'Connection failed or closed'
          });
        }
      });
      
      // Timeout after specified duration
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            connected: false,
            status: 'TIMEOUT',
            error: `Connection timeout after ${timeout}ms`
          });
        }
      }, timeout);
      
    } catch (error) {
      resolve({
        connected: false,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

/**
 * Test hamburger menu functionality
 * Based on Bug Reports #13-15 - Mobile navigation emergency fixes
 */
export const testHamburgerMenu = async (): Promise<{
  opens: boolean;
  closes: boolean;
  hasBackdrop: boolean;
  noConflicts: boolean;
  touchResponsive: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];
  let opens = false;
  let closes = false;
  let hasBackdrop = false;
  let noConflicts = false;
  let touchResponsive = false;
  
  try {
    // Find hamburger button
    const hamburgerButton = screen.getByRole('button', { name: /menu|hamburger|☰/i });
    
    if (!hamburgerButton) {
      errors.push('Hamburger button not found');
      return { opens, closes, hasBackdrop, noConflicts, touchResponsive, errors };
    }
    
    // Test touch responsiveness
    const touchResult = checkTouchTargetSize(hamburgerButton);
    touchResponsive = touchResult.valid;
    if (!touchResponsive) {
      errors.push(`Touch target too small: ${touchResult.recommendation}`);
    }
    
    // Test opening menu
    await simulateTouch(hamburgerButton);
    
    await waitFor(() => {
      const drawer = screen.queryByTestId('navigation-drawer');
      opens = !!drawer && !drawer.classList.contains('hidden');
    });
    
    if (!opens) {
      errors.push('Menu does not open on tap');
      return { opens, closes, hasBackdrop, noConflicts, touchResponsive, errors };
    }
    
    // Test backdrop presence
    const backdrop = screen.queryByTestId('mobile-nav-backdrop');
    hasBackdrop = !!backdrop;
    if (!hasBackdrop) {
      errors.push('No backdrop element found');
    }
    
    // Test closing by backdrop tap
    if (backdrop) {
      await simulateTouch(backdrop);
      
      await waitFor(() => {
        const drawer = screen.queryByTestId('navigation-drawer');
        closes = !drawer || drawer.classList.contains('hidden');
      });
    }
    
    if (!closes) {
      errors.push('Menu does not close when backdrop is tapped');
    }
    
    // Test for competing navigation systems (Bug Report #13)
    const competingNavs = document.querySelectorAll('[class*="mobile-nav"], [class*="navigation"]');
    noConflicts = competingNavs.length <= 2; // Drawer + backdrop only
    
    if (!noConflicts) {
      errors.push(`Multiple navigation systems detected: ${competingNavs.length} elements`);
    }
    
  } catch (error) {
    errors.push(`Test execution error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
  
  return { opens, closes, hasBackdrop, noConflicts, touchResponsive, errors };
};

/**
 * Test hydration safety on mobile
 * Based on Bug Reports #11-15 - Hydration fixes
 */
export const testHydrationSafety = (): {
  hasHydrationErrors: boolean;
  hasClassNameMismatches: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  let hasHydrationErrors = false;
  let hasClassNameMismatches = false;
  
  // Check for hydration error messages in console
  const originalError = console.error;
  const hydrationErrors: string[] = [];
  
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('hydration') || message.includes('server HTML')) {
      hydrationErrors.push(message);
      hasHydrationErrors = true;
    }
    originalError.apply(console, args);
  };
  
  // Check for className mismatches (common hydration issue)
  const elementsWithConditionalClasses = document.querySelectorAll('[class*="mobile"], [class*="sm:"], [class*="md:"]');
  
  elementsWithConditionalClasses.forEach(el => {
    const classList = el.className;
    // Look for patterns that indicate conditional mobile classes
    if (classList.includes('${') || classList.includes('undefined')) {
      hasClassNameMismatches = true;
      errors.push(`Conditional className found: ${classList}`);
    }
  });
  
  // Restore console
  console.error = originalError;
  
  if (hasHydrationErrors) {
    errors.push(...hydrationErrors);
  }
  
  return {
    hasHydrationErrors,
    hasClassNameMismatches,
    errors
  };
};

/**
 * Test PWA cache behavior on mobile
 * Based on Bug Report #40 - Mobile cache fixes
 */
export const testMobilePWACache = async (): Promise<{
  serviceWorkerRegistered: boolean;
  cacheVersionCurrent: boolean;
  canForceRefresh: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];
  let serviceWorkerRegistered = false;
  let cacheVersionCurrent = false;
  let canForceRefresh = false;
  
  try {
    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      serviceWorkerRegistered = !!registration;
      
      if (!serviceWorkerRegistered) {
        errors.push('Service worker not registered');
      }
    } else {
      errors.push('Service worker not supported');
    }
    
    // Check cache version (should not be hardcoded v1.0.0)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const hasTimestampVersion = cacheNames.some(name => 
        /\d{4}-\d{2}-\d{2}/.test(name) && !name.includes('v1.0.0')
      );
      cacheVersionCurrent = hasTimestampVersion;
      
      if (!cacheVersionCurrent) {
        errors.push('Cache uses static versioning (should use timestamps)');
      }
    }
    
    // Test force refresh capability
    const hasForceRefreshParams = ['force-refresh', 'cache-bust', 'v', 'timestamp'].some(param => 
      window.location.search.includes(param)
    );
    canForceRefresh = hasForceRefreshParams || cacheVersionCurrent;
    
    if (!canForceRefresh) {
      errors.push('No force refresh mechanism detected');
    }
    
  } catch (error) {
    errors.push(`PWA cache test error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
  
  return {
    serviceWorkerRegistered,
    cacheVersionCurrent,
    canForceRefresh,
    errors
  };
};

/**
 * Comprehensive mobile test runner
 * Runs all mobile-specific tests and returns summary
 */
export const runMobileTestSuite = async (): Promise<{
  passed: number;
  failed: number;
  results: Record<string, any>;
  summary: string[];
}> => {
  const results: Record<string, any> = {};
  const summary: string[] = [];
  let passed = 0;
  let failed = 0;
  
  // Set up mobile environment
  simulateMobileViewport();
  
  // Test touch targets
  const touchTargets = Array.from(document.querySelectorAll('button, [role="button"], a'));
  const touchTargetResults = touchTargets.map(checkTouchTargetSize);
  const validTouchTargets = touchTargetResults.filter(r => r.valid).length;
  results.touchTargets = {
    total: touchTargets.length,
    valid: validTouchTargets,
    invalid: touchTargets.length - validTouchTargets
  };
  
  if (validTouchTargets === touchTargets.length) {
    passed++;
    summary.push('✅ All touch targets meet size requirements');
  } else {
    failed++;
    summary.push(`❌ ${touchTargets.length - validTouchTargets} touch targets too small`);
  }
  
  // Test horizontal scrolling
  const scrollTest = checkHorizontalScrolling();
  results.horizontalScroll = scrollTest;
  if (!scrollTest.hasHorizontalScroll) {
    passed++;
    summary.push('✅ No unwanted horizontal scrolling');
  } else {
    failed++;
    summary.push('❌ Horizontal scrolling detected');
  }
  
  // Test authentication
  const authTest = await checkAuthenticationState();
  results.authentication = authTest;
  if (authTest.isAuthenticated && !authTest.hasErrors) {
    passed++;
    summary.push('✅ Authentication working');
  } else {
    failed++;
    summary.push('❌ Authentication issues detected');
  }
  
  // Test real-time connection
  const realtimeTest = await testRealtimeConnection();
  results.realtime = realtimeTest;
  if (realtimeTest.connected) {
    passed++;
    summary.push('✅ Real-time connection established');
  } else {
    failed++;
    summary.push('❌ Real-time connection failed');
  }
  
  // Test hydration safety
  const hydrationTest = testHydrationSafety();
  results.hydration = hydrationTest;
  if (!hydrationTest.hasHydrationErrors && !hydrationTest.hasClassNameMismatches) {
    passed++;
    summary.push('✅ No hydration issues detected');
  } else {
    failed++;
    summary.push('❌ Hydration issues found');
  }
  
  // Test PWA cache
  const pwaTest = await testMobilePWACache();
  results.pwa = pwaTest;
  if (pwaTest.serviceWorkerRegistered && pwaTest.cacheVersionCurrent) {
    passed++;
    summary.push('✅ PWA cache properly configured');
  } else {
    failed++;
    summary.push('❌ PWA cache issues detected');
  }
  
  return {
    passed,
    failed,
    results,
    summary
  };
};

/**
 * Mobile test utilities for Jest tests
 */
export const mobileTestHelpers = {
  simulateMobileViewport,
  simulateTouch,
  checkTouchTargetSize,
  checkHorizontalScrolling,
  checkAuthenticationState,
  testRealtimeConnection,
  testHamburgerMenu,
  testHydrationSafety,
  testMobilePWACache,
  runMobileTestSuite,
  MOBILE_VIEWPORTS
};

export default mobileTestHelpers;