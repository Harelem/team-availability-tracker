/**
 * Accessibility Provider Component
 * 
 * Provides comprehensive accessibility enhancements including screen reader support,
 * keyboard navigation improvements, focus management, and ARIA live regions.
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useRef, 
  useCallback,
  ReactNode
} from 'react';
import { cx } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface AccessibilityContextType {
  // Screen reader support
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  setLiveRegionContent: (content: string, priority?: 'polite' | 'assertive') => void;
  
  // Focus management
  trapFocus: (container: HTMLElement) => () => void;
  restoreFocus: () => void;
  setInitialFocus: (element: HTMLElement) => void;
  
  // Keyboard navigation
  isKeyboardUser: boolean;
  currentFocusedElement: HTMLElement | null;
  enableKeyboardNavigation: () => void;
  disableKeyboardNavigation: () => void;
  
  // High contrast and reduced motion
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  
  // Settings
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  accessibilitySettings: AccessibilitySettings;
}

export interface AccessibilitySettings {
  enableScreenReader: boolean;
  enableKeyboardNavigation: boolean;
  showFocusIndicators: boolean;
  enableSkipLinks: boolean;
  announcePageChanges: boolean;
  announceFormErrors: boolean;
  announceStatusUpdates: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  reducedMotion: boolean;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface AccessibilityProviderProps {
  children: ReactNode;
  initialSettings?: Partial<AccessibilitySettings>;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  initialSettings = {}
}) => {
  // Default settings
  const defaultSettings: AccessibilitySettings = {
    enableScreenReader: true,
    enableKeyboardNavigation: true,
    showFocusIndicators: true,
    enableSkipLinks: true,
    announcePageChanges: true,
    announceFormErrors: true,
    announceStatusUpdates: true,
    fontSize: 'medium',
    highContrast: false,
    reducedMotion: false,
    ...initialSettings
  };

  // State
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [currentFocusedElement, setCurrentFocusedElement] = useState<HTMLElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  // Refs
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const assertiveLiveRegionRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  // =============================================================================
  // MEDIA QUERY DETECTION
  // =============================================================================

  useEffect(() => {
    // Detect user preferences
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      setAccessibilitySettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
      setAccessibilitySettings(prev => ({ ...prev, highContrast: e.matches }));
    };

    // Set initial values
    setPrefersReducedMotion(reducedMotionQuery.matches);
    setPrefersHighContrast(highContrastQuery.matches);

    // Add listeners
    reducedMotionQuery.addListener(handleReducedMotionChange);
    highContrastQuery.addListener(handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeListener(handleReducedMotionChange);
      highContrastQuery.removeListener(handleHighContrastChange);
    };
  }, []);

  // =============================================================================
  // KEYBOARD NAVIGATION DETECTION
  // =============================================================================

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMousedown = () => {
      setIsKeyboardUser(false);
    };

    const handleFocus = (event: FocusEvent) => {
      setCurrentFocusedElement(event.target as HTMLElement);
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousedown', handleMousedown);
    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handleMousedown);
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);

  // =============================================================================
  // SCREEN READER ANNOUNCEMENTS
  // =============================================================================

  const announceToScreenReader = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (!accessibilitySettings.enableScreenReader) return;

    const liveRegion = priority === 'assertive' 
      ? assertiveLiveRegionRef.current 
      : liveRegionRef.current;

    if (liveRegion) {
      // Clear existing content first to ensure the announcement is read
      liveRegion.textContent = '';
      
      // Use setTimeout to ensure the clearing happens before setting new content
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = message;
        }
      }, 10);

      // Clear the message after a delay so it doesn't interfere with other announcements
      setTimeout(() => {
        if (liveRegion && liveRegion.textContent === message) {
          liveRegion.textContent = '';
        }
      }, 5000);
    }
  }, [accessibilitySettings.enableScreenReader]);

  const setLiveRegionContent = useCallback((
    content: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    const liveRegion = priority === 'assertive' 
      ? assertiveLiveRegionRef.current 
      : liveRegionRef.current;

    if (liveRegion) {
      liveRegion.textContent = content;
    }
  }, []);

  // =============================================================================
  // FOCUS MANAGEMENT
  // =============================================================================

  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'details',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      'a[href]:not([disabled])',
      '[contenteditable="true"]:not([disabled])'
    ].join(',');

    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });
  }, []);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    focusableElementsRef.current = focusableElements;

    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Focus the first element
    firstElement.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeydown);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeydown);
    };
  }, [getFocusableElements]);

  const restoreFocus = useCallback(() => {
    if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, []);

  const setInitialFocus = useCallback((element: HTMLElement) => {
    element.focus();
    announceToScreenReader(`Focused on ${element.getAttribute('aria-label') || element.textContent || 'element'}`);
  }, [announceToScreenReader]);

  // =============================================================================
  // KEYBOARD NAVIGATION HELPERS
  // =============================================================================

  const enableKeyboardNavigation = useCallback(() => {
    setAccessibilitySettings(prev => ({ ...prev, enableKeyboardNavigation: true }));
    document.body.classList.add('keyboard-navigation');
  }, []);

  const disableKeyboardNavigation = useCallback(() => {
    setAccessibilitySettings(prev => ({ ...prev, enableKeyboardNavigation: false }));
    document.body.classList.remove('keyboard-navigation');
  }, []);

  // =============================================================================
  // SETTINGS MANAGEMENT
  // =============================================================================

  const updateAccessibilitySettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setAccessibilitySettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Apply font size to document
      document.documentElement.style.fontSize = {
        small: '14px',
        medium: '16px',
        large: '18px',
        'extra-large': '20px'
      }[updated.fontSize];

      // Apply high contrast theme
      if (updated.highContrast) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }

      // Apply reduced motion
      if (updated.reducedMotion) {
        document.documentElement.classList.add('reduced-motion');
      } else {
        document.documentElement.classList.remove('reduced-motion');
      }

      // Save to localStorage
      localStorage.setItem('accessibility-settings', JSON.stringify(updated));
      
      return updated;
    });
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        updateAccessibilitySettings(parsed);
      } catch (error) {
        console.warn('Failed to parse accessibility settings from localStorage:', error);
      }
    }
  }, [updateAccessibilitySettings]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: AccessibilityContextType = {
    announceToScreenReader,
    setLiveRegionContent,
    trapFocus,
    restoreFocus,
    setInitialFocus,
    isKeyboardUser,
    currentFocusedElement,
    enableKeyboardNavigation,
    disableKeyboardNavigation,
    prefersReducedMotion,
    prefersHighContrast,
    fontSize: accessibilitySettings.fontSize,
    updateAccessibilitySettings,
    accessibilitySettings
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip Links */}
      {accessibilitySettings.enableSkipLinks && <SkipLinks />}
      
      {/* Main Content */}
      <div
        className={cx(
          'accessibility-enhanced',
          isKeyboardUser && accessibilitySettings.showFocusIndicators && 'show-focus-indicators',
          accessibilitySettings.highContrast && 'high-contrast',
          accessibilitySettings.reducedMotion && 'reduced-motion'
        )}
      >
        {children}
      </div>

      {/* Live Regions for Screen Reader Announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="accessibility-live-region-polite"
      />
      
      <div
        ref={assertiveLiveRegionRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="accessibility-live-region-assertive"
      />

      {/* Accessibility Controls Panel */}
      {process.env.NODE_ENV === 'development' && <AccessibilityControlPanel />}
    </AccessibilityContext.Provider>
  );
};

// =============================================================================
// SKIP LINKS COMPONENT
// =============================================================================

const SkipLinks: React.FC = () => {
  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#search', label: 'Skip to search' },
    { href: '#footer', label: 'Skip to footer' }
  ];

  return (
    <div className="sr-only focus-within:not-sr-only">
      {skipLinks.map(link => (
        <a
          key={link.href}
          href={link.href}
          className="absolute top-4 left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onFocus={() => console.log(`Skip link focused: ${link.label}`)}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};

// =============================================================================
// ACCESSIBILITY CONTROL PANEL (DEV ONLY)
// =============================================================================

const AccessibilityControlPanel: React.FC = () => {
  const { accessibilitySettings, updateAccessibilitySettings } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Open accessibility controls"
      >
        ♿
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Accessibility Controls</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close accessibility controls"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium mb-2">Font Size</label>
          <select
            value={accessibilitySettings.fontSize}
            onChange={(e) => updateAccessibilitySettings({ 
              fontSize: e.target.value as AccessibilitySettings['fontSize'] 
            })}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="extra-large">Extra Large</option>
          </select>
        </div>

        {/* Checkboxes */}
        {[
          { key: 'enableScreenReader', label: 'Screen Reader Support' },
          { key: 'enableKeyboardNavigation', label: 'Keyboard Navigation' },
          { key: 'showFocusIndicators', label: 'Show Focus Indicators' },
          { key: 'announcePageChanges', label: 'Announce Page Changes' },
          { key: 'announceFormErrors', label: 'Announce Form Errors' },
          { key: 'announceStatusUpdates', label: 'Announce Status Updates' },
          { key: 'highContrast', label: 'High Contrast Mode' },
          { key: 'reducedMotion', label: 'Reduced Motion' }
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center">
            <input
              type="checkbox"
              checked={accessibilitySettings[key as keyof AccessibilitySettings] as boolean}
              onChange={(e) => updateAccessibilitySettings({ [key]: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

export const useScreenReader = () => {
  const { announceToScreenReader, setLiveRegionContent } = useAccessibility();
  
  const announceSuccess = useCallback((message: string) => {
    announceToScreenReader(`Success: ${message}`, 'polite');
  }, [announceToScreenReader]);

  const announceError = useCallback((message: string) => {
    announceToScreenReader(`Error: ${message}`, 'assertive');
  }, [announceToScreenReader]);

  const announceLoading = useCallback((message: string) => {
    announceToScreenReader(`Loading: ${message}`, 'polite');
  }, [announceToScreenReader]);

  return {
    announceToScreenReader,
    setLiveRegionContent,
    announceSuccess,
    announceError,
    announceLoading
  };
};

export const useFocusManagement = () => {
  const { trapFocus, restoreFocus, setInitialFocus } = useAccessibility();
  
  return {
    trapFocus,
    restoreFocus,
    setInitialFocus
  };
};

export const useKeyboardNavigation = (containerRef: React.RefObject<HTMLElement>) => {
  const { isKeyboardUser } = useAccessibility();
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current || !isKeyboardUser) return;

    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), a[href]:not([disabled])'
    );

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev + 1) % focusableElements.length;
          focusableElements[next]?.focus();
          return next;
        });
        break;
      
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        setFocusedIndex(prev => {
          const next = prev <= 0 ? focusableElements.length - 1 : prev - 1;
          focusableElements[next]?.focus();
          return next;
        });
        break;
        
      case 'Home':
        event.preventDefault();
        focusableElements[0]?.focus();
        setFocusedIndex(0);
        break;
        
      case 'End':
        event.preventDefault();
        const lastIndex = focusableElements.length - 1;
        focusableElements[lastIndex]?.focus();
        setFocusedIndex(lastIndex);
        break;
    }
  }, [containerRef, isKeyboardUser]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, containerRef]);

  return { focusedIndex };
};

export default AccessibilityProvider;