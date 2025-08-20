/**
 * Design System Test Setup
 * 
 * Centralized test configuration and utilities for design system testing.
 * Includes Jest setup, mocks, and testing utilities.
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { expect, jest } from '@jest/globals';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  // Show suggestions when queries fail
  getElementError: (message, container) => {
    const error = new Error(message);
    error.name = 'TestingLibraryElementError';
    return error;
  },
});

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for layout tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for scroll-based tests
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock window.scrollTo for scroll tests
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Mock performance.now for performance tests
Object.defineProperty(performance, 'now', {
  writable: true,
  value: jest.fn(() => Date.now()),
});

// Mock CSS.supports for feature detection tests
Object.defineProperty(CSS, 'supports', {
  writable: true,
  value: jest.fn((property: string, value: string) => {
    // Mock support for common CSS features used in design system
    const supportedFeatures = [
      'display: grid',
      'display: flex',
      'backdrop-filter: blur(10px)',
      'transform: translateX(0)',
      'animation: fadeIn 0.2s ease-in-out',
    ];
    
    const query = `${property}: ${value}`;
    return supportedFeatures.some(feature => 
      feature.toLowerCase().includes(query.toLowerCase())
    );
  }),
});

// Mock getComputedStyle for styling tests
Object.defineProperty(window, 'getComputedStyle', {
  value: jest.fn().mockImplementation((element) => ({
    getPropertyValue: jest.fn((property) => {
      // Return mock values for common CSS properties
      const mockStyles: { [key: string]: string } = {
        'display': element.style?.display || 'block',
        'position': element.style?.position || 'static',
        'visibility': element.style?.visibility || 'visible',
        'opacity': element.style?.opacity || '1',
        'transform': element.style?.transform || 'none',
        'transition': element.style?.transition || 'none',
        'background-color': element.style?.backgroundColor || 'rgba(0, 0, 0, 0)',
        'color': element.style?.color || 'rgb(0, 0, 0)',
        'font-size': element.style?.fontSize || '16px',
        'font-weight': element.style?.fontWeight || '400',
        'padding': element.style?.padding || '0px',
        'margin': element.style?.margin || '0px',
        'border': element.style?.border || '0px none rgb(0, 0, 0)',
        'border-radius': element.style?.borderRadius || '0px',
        'box-shadow': element.style?.boxShadow || 'none',
        'width': element.style?.width || 'auto',
        'height': element.style?.height || 'auto',
      };
      
      return mockStyles[property] || '';
    }),
  })),
});

// Mock focus and blur methods for accessibility tests
HTMLElement.prototype.focus = jest.fn();
HTMLElement.prototype.blur = jest.fn();
HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock clipboard API for copy functionality tests
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock requestAnimationFrame for animation tests
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Suppress console warnings/errors in tests unless explicitly needed
const originalConsole = { ...console };
global.console = {
  ...console,
  // Keep log for debugging, but suppress warn/error by default
  warn: jest.fn(),
  error: jest.fn(),
  // Allow overriding in specific tests
  _restore: () => {
    global.console = originalConsole;
  },
  _mock: () => {
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
  },
};

// Custom test utilities
export const testUtils = {
  /**
   * Mock viewport size for responsive testing
   */
  mockViewport: (width: number, height: number = 800) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    
    // Update matchMedia to reflect new viewport
    window.matchMedia = jest.fn().mockImplementation((query) => {
      const matches = (() => {
        if (query.includes('max-width: 640px')) return width <= 640;
        if (query.includes('max-width: 768px')) return width <= 768;
        if (query.includes('max-width: 1024px')) return width <= 1024;
        if (query.includes('min-width: 641px')) return width >= 641;
        if (query.includes('min-width: 769px')) return width >= 769;
        if (query.includes('min-width: 1025px')) return width >= 1025;
        return false;
      })();
      
      return {
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  },

  /**
   * Mock reduced motion preference
   */
  mockReducedMotion: (prefersReduced: boolean = true) => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? prefersReduced : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  },

  /**
   * Mock dark mode preference
   */
  mockDarkMode: (prefersDark: boolean = true) => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  },

  /**
   * Mock touch device for mobile testing
   */
  mockTouchDevice: (isTouchDevice: boolean = true) => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: isTouchDevice ? 5 : 0,
    });
    
    // Mock touch events
    if (isTouchDevice) {
      window.TouchEvent = class TouchEvent extends Event {
        touches: any[] = [];
        targetTouches: any[] = [];
        changedTouches: any[] = [];
        
        constructor(type: string, eventInit: any = {}) {
          super(type, eventInit);
          this.touches = eventInit.touches || [];
          this.targetTouches = eventInit.targetTouches || [];
          this.changedTouches = eventInit.changedTouches || [];
        }
      };
    }
  },

  /**
   * Create performance benchmark for component rendering
   */
  benchmarkRender: (renderFn: () => void, iterations: number = 10) => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderFn();
      const end = performance.now();
      times.push(end - start);
    }
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      average: Math.round(average * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      times,
    };
  },

  /**
   * Wait for animations to complete
   */
  waitForAnimation: async (duration: number = 300) => {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  /**
   * Simulate user interaction delay
   */
  simulateUserDelay: async (ms: number = 100) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Mock local storage for persistent state tests
   */
  mockLocalStorage: () => {
    const store: { [key: string]: string } = {};
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          Object.keys(store).forEach(key => delete store[key]);
        }),
        length: Object.keys(store).length,
        key: jest.fn((index: number) => Object.keys(store)[index] || null),
      },
      writable: true,
    });
    
    return store;
  },

  /**
   * Create accessibility test helpers
   */
  a11y: {
    /**
     * Check if element has proper ARIA attributes
     */
    hasProperAria: (element: HTMLElement) => {
      const checks = {
        hasRole: element.hasAttribute('role'),
        hasLabel: element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'),
        hasDescription: element.hasAttribute('aria-describedby'),
        isHidden: element.hasAttribute('aria-hidden'),
      };
      
      return checks;
    },

    /**
     * Check focus management
     */
    checkFocusManagement: (container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      return {
        count: focusableElements.length,
        elements: Array.from(focusableElements),
        hasTabIndex: Array.from(focusableElements).some(el => 
          el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1'
        ),
      };
    },
  },
};

// Jest custom matchers
expect.extend({
  toBeInViewport(received: HTMLElement) {
    const rect = received.getBoundingClientRect();
    const isInViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
    
    return {
      message: () => `expected element ${isInViewport ? 'not ' : ''}to be in viewport`,
      pass: isInViewport,
    };
  },

  toHaveProperAria(received: HTMLElement, expectedAttributes: string[]) {
    const missingAttributes = expectedAttributes.filter(attr => 
      !received.hasAttribute(attr)
    );
    
    return {
      message: () => 
        `expected element to have ARIA attributes: ${expectedAttributes.join(', ')}. Missing: ${missingAttributes.join(', ')}`,
      pass: missingAttributes.length === 0,
    };
  },

  toBeFocusable(received: HTMLElement) {
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const isFocusable = received.matches(focusableSelector) || received.tabIndex >= 0;
    
    return {
      message: () => `expected element ${isFocusable ? 'not ' : ''}to be focusable`,
      pass: isFocusable,
    };
  },
});

// Extend Jest matchers type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInViewport(): R;
      toHaveProperAria(expectedAttributes: string[]): R;
      toBeFocusable(): R;
    }
  }
}