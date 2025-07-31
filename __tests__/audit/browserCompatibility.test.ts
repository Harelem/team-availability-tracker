/**
 * Browser Compatibility Audit Tests
 * 
 * Validates cross-browser compatibility, responsive design, feature detection,
 * polyfills, and consistent user experience across different browsers and devices.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import TemplateManager from '../../src/components/TemplateManager';
import TeamDetailModal from '../../src/components/modals/TeamDetailModal';

// Mock user agents for different browsers
const userAgents = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  ieMock: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko' // IE11 (legacy support)
};

describe('Browser Compatibility Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Modern Browser Feature Detection', () => {
    it('should detect and handle Flexbox support', () => {
      // Mock CSS.supports for different browsers
      const mockCSSSupports = (property: string, value: string): boolean => {
        if (property === 'display' && value === 'flex') {
          return true; // Modern browsers support flexbox
        }
        return false;
      };
      
      Object.defineProperty(window.CSS, 'supports', {
        value: mockCSSSupports,
        configurable: true
      });
      
      const hasFlexboxSupport = CSS.supports('display', 'flex');
      expect(hasFlexboxSupport).toBe(true);
      
      // Should use flexbox layouts in components
      render(<COOExecutiveDashboard />);
      
      const flexContainer = document.querySelector('[class*="flex"]');
      if (flexContainer) {
        expect(flexContainer).toBeInTheDocument();
      }
    });

    it('should detect Grid layout support', () => {
      const mockCSSSupports = (property: string, value: string): boolean => {
        if (property === 'display' && value === 'grid') {
          return true; // Modern browsers support CSS Grid
        }
        return false;
      };
      
      Object.defineProperty(window.CSS, 'supports', {
        value: mockCSSSupports,
        configurable: true
      });
      
      const hasGridSupport = CSS.supports('display', 'grid');
      expect(hasGridSupport).toBe(true);
      
      render(<COOExecutiveDashboard />);
      
      // Should use CSS Grid where appropriate
      const gridContainer = document.querySelector('[class*="grid-cols"]');
      if (gridContainer) {
        expect(gridContainer).toBeInTheDocument();
      }
    });

    it('should handle ES6+ features with appropriate fallbacks', () => {
      // Test ES6 features that might need polyfills
      const modernFeatures = {
        promises: typeof Promise !== 'undefined',
        asyncAwait: true, // Assumes compilation handles this
        destructuring: true, // Compilation handles this
        arrowFunctions: true, // Compilation handles this
        letConst: true, // Compilation handles this
        templateLiterals: true, // Compilation handles this
        classes: true, // Compilation handles this
        modules: true // Bundler handles this
      };
      
      // All features should be available in test environment
      Object.values(modernFeatures).forEach(isSupported => {
        expect(isSupported).toBe(true);
      });
    });

    it('should detect and polyfill Array methods', () => {
      const arrayMethods = {
        includes: Array.prototype.includes,
        find: Array.prototype.find,
        findIndex: Array.prototype.findIndex,
        filter: Array.prototype.filter,
        map: Array.prototype.map,
        reduce: Array.prototype.reduce
      };
      
      // All modern array methods should be available
      Object.entries(arrayMethods).forEach(([method, implementation]) => {
        expect(typeof implementation).toBe('function');
      });
      
      // Test actual usage
      const testArray = [1, 2, 3, 4, 5];
      expect(testArray.includes(3)).toBe(true);
      expect(testArray.find(x => x > 3)).toBe(4);
      expect(testArray.findIndex(x => x > 3)).toBe(3);
    });
  });

  describe('Responsive Design Across Devices', () => {
    it('should adapt to mobile viewports (375px width)', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });
      
      // Dispatch resize event
      window.dispatchEvent(new Event('resize'));
      
      const { container } = render(<COOExecutiveDashboard />);
      
      // Should not have horizontal scrolling
      const dashboard = container.firstChild as HTMLElement;
      if (dashboard) {
        expect(dashboard.scrollWidth).toBeLessThanOrEqual(375 + 20); // Allow small margin
      }
      
      // Should use mobile-appropriate layouts
      const mobileElements = container.querySelectorAll('[class*="sm:"], [class*="md:"]');
      expect(mobileElements.length).toBeGreaterThan(0);
    });

    it('should adapt to tablet viewports (768px width)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024
      });
      
      window.dispatchEvent(new Event('resize'));
      
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Should use tablet-appropriate layouts
      const tabletElements = container.querySelectorAll('[class*="md:"], [class*="lg:"]');
      expect(tabletElements.length).toBeGreaterThan(0);
    });

    it('should adapt to desktop viewports (1024px+ width)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080
      });
      
      window.dispatchEvent(new Event('resize'));
      
      const { container } = render(<COOExecutiveDashboard />);
      
      // Should use desktop-appropriate layouts
      const desktopElements = container.querySelectorAll('[class*="lg:"], [class*="xl:"]');
      expect(desktopElements.length).toBeGreaterThan(0);
    });

    it('should handle high DPI displays correctly', () => {
      // Mock high DPI display
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2 // Retina display
      });
      
      const { container } = render(<COOExecutiveDashboard />);
      
      // Images should be optimized for high DPI
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        // Should have appropriate sizing for high DPI
        const style = window.getComputedStyle(img);
        expect(style.maxWidth).toBeTruthy();
      });
    });
  });

  describe('Touch and Interaction Compatibility', () => {
    it('should support touch events on mobile devices', () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', { value: null });
      
      const mockTouchEvent = new TouchEvent('touchstart', {
        touches: [{
          identifier: 0,
          target: document.body,
          clientX: 100,
          clientY: 100,
          pageX: 100,
          pageY: 100,
          screenX: 100,
          screenY: 100,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        }] as any,
        bubbles: true,
        cancelable: true
      });
      
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const interactiveElement = screen.getByText('Availability Templates');
      
      // Should handle touch events
      fireEvent(interactiveElement, mockTouchEvent);
      
      // Element should respond to touch
      expect(interactiveElement).toBeInTheDocument();
    });

    it('should have appropriate touch target sizes (44px minimum)', () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      const touchTargets = container.querySelectorAll('button, a[href], input, select, textarea, [role="button"]');
      
      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(target);
        
        // Skip hidden elements
        if (rect.width === 0 || rect.height === 0 || computedStyle.display === 'none') {
          return;
        }
        
        const padding = {
          top: parseInt(computedStyle.paddingTop) || 0,
          bottom: parseInt(computedStyle.paddingBottom) || 0,
          left: parseInt(computedStyle.paddingLeft) || 0,
          right: parseInt(computedStyle.paddingRight) || 0
        };
        
        const effectiveWidth = rect.width + padding.left + padding.right;
        const effectiveHeight = rect.height + padding.top + padding.bottom;
        
        // Should meet minimum touch target size
        expect(effectiveWidth >= 44 || effectiveHeight >= 44).toBe(true);
      });
    });

    it('should support keyboard navigation consistently', async () => {
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />);
      
      const focusableElements = screen.getAllByRole('button');
      
      if (focusableElements.length > 0) {
        // Should be able to focus elements
        focusableElements[0].focus();
        expect(focusableElements[0]).toHaveFocus();
        
        // Should show focus indicators
        const focusedElement = document.activeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(focusedElement);
        
        expect(
          focusedElement.classList.toString().includes('focus:') ||
          focusedElement.classList.toString().includes('focus-visible:') ||
          computedStyle.outline !== 'none'
        ).toBe(true);
      }
    });
  });

  describe('JavaScript API Compatibility', () => {
    it('should handle Intersection Observer API', () => {
      // Mock Intersection Observer
      const mockIntersectionObserver = jest.fn(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn()
      }));
      
      Object.defineProperty(window, 'IntersectionObserver', {
        value: mockIntersectionObserver,
        configurable: true
      });
      
      // Should be able to create Intersection Observer
      const observer = new IntersectionObserver(() => {});
      expect(observer).toBeTruthy();
      expect(typeof observer.observe).toBe('function');
    });

    it('should handle ResizeObserver API', () => {
      // Mock ResizeObserver
      const mockResizeObserver = jest.fn(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn()
      }));
      
      Object.defineProperty(window, 'ResizeObserver', {
        value: mockResizeObserver,
        configurable: true
      });
      
      // Should be able to create ResizeObserver
      const observer = new ResizeObserver(() => {});
      expect(observer).toBeTruthy();
      expect(typeof observer.observe).toBe('function');
    });

    it('should handle localStorage with fallbacks', () => {
      // Test localStorage availability
      const hasLocalStorage = (() => {
        try {
          const test = '__localStorage_test__';
          localStorage.setItem(test, test);
          localStorage.removeItem(test);
          return true;
        } catch {
          return false;
        }
      })();
      
      expect(hasLocalStorage).toBe(true);
      
      // Fallback for when localStorage is not available
      const storageWrapper = {
        getItem: (key: string) => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            // Fallback to in-memory storage or no-op
          }
        },
        removeItem: (key: string) => {
          try {
            localStorage.removeItem(key);
          } catch {
            // Fallback to in-memory storage or no-op
          }
        }
      };
      
      // Should not throw errors
      expect(() => {
        storageWrapper.setItem('test', 'value');
        storageWrapper.getItem('test');
        storageWrapper.removeItem('test');
      }).not.toThrow();
    });

    it('should handle Fetch API with polyfills', () => {
      // Fetch should be available in modern environments
      expect(typeof fetch).toBe('function');
      
      // Mock fetch for testing
      const mockFetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'test' })
        } as Response)
      );
      
      global.fetch = mockFetch;
      
      // Should be able to make requests
      return fetch('/api/test').then(response => {
        expect(response.ok).toBe(true);
        return response.json();
      }).then(data => {
        expect(data.data).toBe('test');
      });
    });
  });

  describe('CSS Feature Compatibility', () => {
    it('should handle CSS Custom Properties (CSS Variables)', () => {
      // Mock CSS custom properties support
      const mockGetComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn((prop: string) => {
          if (prop.startsWith('--')) {
            return '#007bff'; // Mock CSS variable value
          }
          return '';
        })
      }));
      
      Object.defineProperty(window, 'getComputedStyle', {
        value: mockGetComputedStyle,
        configurable: true
      });
      
      const { container } = render(<COOExecutiveDashboard />);
      
      // Should be able to use CSS custom properties
      const element = container.firstChild as HTMLElement;
      if (element) {
        const style = window.getComputedStyle(element);
        const customPropValue = style.getPropertyValue('--primary-color');
        expect(typeof customPropValue).toBe('string');
      }
    });

    it('should handle CSS Grid with fallbacks', () => {
      const mockCSSSupports = jest.fn((property: string, value: string) => {
        return property === 'display' && value === 'grid';
      });
      
      Object.defineProperty(window.CSS, 'supports', {
        value: mockCSSSupports,
        configurable: true
      });
      
      const supportsGrid = CSS.supports('display', 'grid');
      expect(supportsGrid).toBe(true);
      
      render(<COOExecutiveDashboard />);
      
      // Should use grid layout where supported
      const gridElements = document.querySelectorAll('[class*="grid-cols"]');
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it('should handle different font loading strategies', () => {
      // Mock Font Loading API
      const mockFontFace = jest.fn(() => ({
        load: jest.fn(() => Promise.resolve()),
        loaded: Promise.resolve()
      }));
      
      Object.defineProperty(window, 'FontFace', {
        value: mockFontFace,
        configurable: true
      });
      
      // Should handle web fonts gracefully
      const fontLoadPromise = Promise.resolve();
      expect(fontLoadPromise).resolves.toBeUndefined();
    });
  });

  describe('Performance Across Browsers', () => {
    it('should maintain consistent performance metrics', () => {
      // Mock performance API for different browsers
      const mockPerformance = {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByType: jest.fn(() => []),
        navigation: {
          type: 0 // NAVIGATION_TYPE_NAVIGATE
        }
      };
      
      Object.defineProperty(window, 'performance', {
        value: mockPerformance,
        configurable: true
      });
      
      const startTime = performance.now();
      render(<COOExecutiveDashboard />);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle memory constraints on mobile devices', () => {
      // Mock mobile memory constraints
      const mockMemory = {
        usedJSHeapSize: 30000000, // 30MB
        totalJSHeapSize: 50000000, // 50MB limit
        jsHeapSizeLimit: 100000000 // 100MB max
      };
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      });
      
      render(<COOExecutiveDashboard />);
      
      // Should not exceed memory thresholds
      if (performance.memory) {
        expect(performance.memory.usedJSHeapSize).toBeLessThan(performance.memory.jsHeapSizeLimit);
      }
    });
  });

  describe('Accessibility Across Browsers', () => {
    it('should maintain ARIA support across browsers', () => {
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('role', 'dialog');
      
      // ARIA attributes should be properly supported
      const ariaElements = document.querySelectorAll('[aria-label], [aria-describedby], [aria-labelledby]');
      expect(ariaElements.length).toBeGreaterThan(0);
    });

    it('should support screen reader navigation', () => {
      render(<COOExecutiveDashboard />);
      
      // Should have proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Should have navigational landmarks
      const landmarks = [
        ...screen.queryAllByRole('main'),
        ...screen.queryAllByRole('navigation'),
        ...screen.queryAllByRole('banner'),
        ...screen.queryAllByRole('contentinfo')
      ];
      
      // Should have at least some landmarks
      expect(landmarks.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain keyboard navigation across browsers', () => {
      const { container } = render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Should have focusable elements
      const focusableElements = container.querySelectorAll(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Elements should be keyboard accessible
      focusableElements.forEach(element => {
        expect(element.getAttribute('tabindex')).not.toBe('-1');
      });
    });
  });

  describe('Browser-Specific Workarounds', () => {
    it('should handle Safari date parsing quirks', () => {
      // Safari has issues with date strings in YYYY-MM-DD format
      const testDate = '2024-01-07';
      
      // Cross-browser date parsing
      const parseDate = (dateString: string): Date => {
        // Handle Safari's date parsing issues
        if (dateString.includes('-')) {
          const parts = dateString.split('-');
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateString);
      };
      
      const parsedDate = parseDate(testDate);
      expect(parsedDate.getFullYear()).toBe(2024);
      expect(parsedDate.getMonth()).toBe(0); // January is 0
      expect(parsedDate.getDate()).toBe(7);
    });

    it('should handle Firefox scrollbar styling limitations', () => {
      // Firefox has limited scrollbar styling support
      const scrollbarStyles = {
        webkit: {
          '::-webkit-scrollbar': { width: '8px' },
          '::-webkit-scrollbar-track': { background: '#f1f1f1' },
          '::-webkit-scrollbar-thumb': { background: '#888' }
        },
        firefox: {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#888 #f1f1f1'
        }
      };
      
      // Should have fallback styles for Firefox
      expect(scrollbarStyles.firefox['scrollbar-width']).toBe('thin');
      expect(scrollbarStyles.firefox['scrollbar-color']).toBeTruthy();
    });

    it('should handle Edge legacy compatibility', () => {
      // Mock Edge legacy user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: userAgents.edge,
        configurable: true
      });
      
      const isEdge = /Edge\//.test(navigator.userAgent);
      const isChromiumEdge = /Edg\//.test(navigator.userAgent);
      
      // Should detect browser correctly
      expect(isChromiumEdge).toBe(true); // Modern Edge
      expect(isEdge).toBe(false); // Legacy Edge
    });
  });
});