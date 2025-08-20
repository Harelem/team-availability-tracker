/**
 * Mobile Touch and Viewport Utilities
 * Ensures proper touch targets and iOS compatibility
 */

// Touch target size constants (iOS Human Interface Guidelines)
export const TOUCH_TARGET_SIZES = {
  MINIMUM: 44, // 44px minimum for iOS
  RECOMMENDED: 48, // 48px recommended for better accessibility
  COMFORTABLE: 56, // 56dp for Android Material Design
  LARGE: 64, // For primary actions
} as const

// Viewport and device detection utilities
export const mobileViewportUtils = {
  /**
   * Check if device is iOS
   */
  isIOS(): boolean {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  },

  /**
   * Check if device is iOS Safari
   */
  isIOSSafari(): boolean {
    if (typeof window === 'undefined') return false
    const ua = navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua)
  },

  /**
   * Check if device is in standalone PWA mode
   */
  isStandalonePWA(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true
  },

  /**
   * Get safe area insets for iOS devices with notches
   */
  getSafeAreaInsets(): {
    top: number
    right: number
    bottom: number
    left: number
  } {
    if (typeof window === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 }
    }

    const computedStyle = getComputedStyle(document.documentElement)
    
    return {
      top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0', 10),
      right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0', 10),
      bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
      left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0', 10),
    }
  },

  /**
   * Apply iOS viewport fixes
   */
  applyIOSViewportFixes(): void {
    if (typeof window === 'undefined') return

    // Fix iOS viewport height issues
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', () => {
      setTimeout(setVH, 100) // Small delay for orientation change
    })

    // Prevent iOS scroll bounce on body
    document.body.style.overscrollBehavior = 'none'
    
    // Add iOS-specific CSS classes
    if (this.isIOS()) {
      document.documentElement.classList.add('ios')
      
      if (this.isIOSSafari()) {
        document.documentElement.classList.add('ios-safari')
      }
      
      if (this.isStandalonePWA()) {
        document.documentElement.classList.add('ios-standalone')
      }
    }
  }
}

// Touch gesture utilities
export const touchGestureUtils = {
  /**
   * Add haptic feedback if supported
   */
  hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (typeof window === 'undefined') return

    // Use Web Vibration API as fallback
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }

    // Use iOS Haptic Feedback API if available
    if ('haptic' in navigator) {
      (navigator as any).haptic.impact(type)
    }
  },

  /**
   * Prevent touch callouts and selection on iOS
   */
  preventIOSTouchCallouts(element: HTMLElement): void {
    element.style.webkitTouchCallout = 'none'
    element.style.webkitUserSelect = 'none'
    element.style.userSelect = 'none'
  },

  /**
   * Enable smooth scrolling with momentum on iOS
   */
  enableIOSMomentumScrolling(element: HTMLElement): void {
    element.style.webkitOverflowScrolling = 'touch'
    element.style.overflowScrolling = 'touch'
  },

  /**
   * Add active state styles for better touch feedback
   */
  addTouchActiveStates(element: HTMLElement): void {
    element.addEventListener('touchstart', () => {
      element.classList.add('touch-active')
    }, { passive: true })

    element.addEventListener('touchend', () => {
      setTimeout(() => {
        element.classList.remove('touch-active')
      }, 150)
    }, { passive: true })

    element.addEventListener('touchcancel', () => {
      element.classList.remove('touch-active')
    }, { passive: true })
  }
}

// Touch target validation utilities
export const touchTargetValidation = {
  /**
   * Check if an element meets minimum touch target size
   */
  validateTouchTarget(element: HTMLElement): {
    isValid: boolean
    actualSize: { width: number; height: number }
    recommendedSize: { width: number; height: number }
    issues: string[]
  } {
    const rect = element.getBoundingClientRect()
    const issues: string[] = []
    
    const minSize = TOUCH_TARGET_SIZES.MINIMUM
    const isValid = rect.width >= minSize && rect.height >= minSize

    if (rect.width < minSize) {
      issues.push(`Width ${rect.width}px is below minimum ${minSize}px`)
    }
    
    if (rect.height < minSize) {
      issues.push(`Height ${rect.height}px is below minimum ${minSize}px`)
    }

    return {
      isValid,
      actualSize: { width: rect.width, height: rect.height },
      recommendedSize: { 
        width: Math.max(rect.width, TOUCH_TARGET_SIZES.RECOMMENDED), 
        height: Math.max(rect.height, TOUCH_TARGET_SIZES.RECOMMENDED) 
      },
      issues
    }
  },

  /**
   * Scan page for touch target violations
   */
  scanPageForTouchTargets(): Array<{
    element: HTMLElement
    selector: string
    validation: ReturnType<typeof touchTargetValidation.validateTouchTarget>
  }> {
    const interactiveSelectors = [
      'button',
      'a[href]',
      '[role="button"]',
      '[onclick]',
      'input[type="button"]',
      'input[type="submit"]',
      'input[type="checkbox"]',
      'input[type="radio"]',
      '.clickable',
      '.btn',
      '.touch-target'
    ]

    const elements = document.querySelectorAll(interactiveSelectors.join(', '))
    const results: Array<{
      element: HTMLElement
      selector: string
      validation: ReturnType<typeof touchTargetValidation.validateTouchTarget>
    }> = []

    elements.forEach(element => {
      const htmlElement = element as HTMLElement
      const validation = this.validateTouchTarget(htmlElement)
      
      if (!validation.isValid) {
        results.push({
          element: htmlElement,
          selector: this.getElementSelector(htmlElement),
          validation
        })
      }
    })

    return results
  },

  /**
   * Generate CSS selector for an element
   */
  getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(Boolean)
      if (classes.length > 0) {
        return `.${classes.join('.')}`
      }
    }
    
    return element.tagName.toLowerCase()
  },

  /**
   * Auto-fix touch targets by adding minimum size
   */
  autoFixTouchTargets(): number {
    const violations = this.scanPageForTouchTargets()
    let fixedCount = 0

    violations.forEach(({ element, validation }) => {
      const { recommendedSize } = validation
      
      // Add minimum touch target size
      element.style.minWidth = `${recommendedSize.width}px`
      element.style.minHeight = `${recommendedSize.height}px`
      
      // Add flexbox centering for better visual appearance
      if (element.tagName === 'BUTTON') {
        element.style.display = 'flex'
        element.style.alignItems = 'center'
        element.style.justifyContent = 'center'
      }
      
      fixedCount++
    })

    if (fixedCount > 0) {
      console.log(`🔧 Auto-fixed ${fixedCount} touch target violations`)
    }

    return fixedCount
  }
}

// CSS class generators for touch targets
export const touchTargetClasses = {
  /**
   * Generate Tailwind classes for touch targets
   */
  button: {
    small: 'min-h-[44px] min-w-[44px] touch-manipulation active:scale-95 transition-transform',
    medium: 'min-h-[48px] min-w-[48px] touch-manipulation active:scale-95 transition-transform',
    large: 'min-h-[56px] min-w-[56px] touch-manipulation active:scale-95 transition-transform',
    extraLarge: 'min-h-[64px] min-w-[64px] touch-manipulation active:scale-95 transition-transform'
  },
  
  /**
   * Generate classes for card touch targets
   */
  card: {
    interactive: 'touch-manipulation active:scale-[0.98] transition-transform cursor-pointer',
    withHaptic: 'touch-manipulation active:scale-[0.98] transition-transform cursor-pointer select-none'
  },
  
  /**
   * Generate classes for iOS-specific optimizations
   */
  ios: {
    preventCallout: '-webkit-touch-callout-none select-none',
    smoothScroll: '-webkit-overflow-scrolling-touch',
    safeArea: 'pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right'
  }
}

// React hook for mobile touch optimization
export function useMobileTouch(elementRef: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Apply touch optimizations
    touchGestureUtils.preventIOSTouchCallouts(element)
    touchGestureUtils.addTouchActiveStates(element)
    
    // Validate touch target size
    const validation = touchTargetValidation.validateTouchTarget(element)
    if (!validation.isValid && process.env.NODE_ENV === 'development') {
      console.warn('Touch target validation failed:', validation)
    }

  }, [elementRef])
}

// Auto-initialization for mobile optimizations
if (typeof window !== 'undefined') {
  // Apply viewport fixes on load
  document.addEventListener('DOMContentLoaded', () => {
    mobileViewportUtils.applyIOSViewportFixes()
    
    // Auto-fix touch targets in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        touchTargetValidation.autoFixTouchTargets()
      }, 1000)
    }
  })
}

// Export React import
import React from 'react'

export default {
  mobileViewportUtils,
  touchGestureUtils,
  touchTargetValidation,
  touchTargetClasses,
  useMobileTouch,
  TOUCH_TARGET_SIZES
}