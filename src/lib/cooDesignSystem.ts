/**
 * COO Dashboard Design System
 * 
 * Unified design system for consistent UI components, styling, and layout
 * across all COO dashboard interfaces.
 */

import { LucideIcon } from 'lucide-react';

// =============================================================================
// COLOR SYSTEM
// =============================================================================

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main brand blue
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Status Colors
  status: {
    excellent: '#10b981', // Green
    good: '#3b82f6',      // Blue
    warning: '#f59e0b',   // Amber
    critical: '#ef4444',  // Red
    neutral: '#6b7280',   // Gray
  },

  // Semantic Colors
  semantic: {
    success: '#10b981',
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    muted: '#6b7280',
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    accent: '#eff6ff',
    gradient: {
      primary: 'from-blue-50 to-indigo-50',
      secondary: 'from-gray-50 to-gray-100',
      accent: 'from-blue-500 to-indigo-600',
    }
  },

  // Text Colors
  text: {
    primary: '#111827',   // Gray 900
    secondary: '#374151', // Gray 700
    tertiary: '#6b7280',  // Gray 500
    muted: '#9ca3af',     // Gray 400
    inverse: '#ffffff',
  },

  // Border Colors
  border: {
    light: '#e5e7eb',     // Gray 200
    medium: '#d1d5db',    // Gray 300
    strong: '#9ca3af',    // Gray 400
    accent: '#3b82f6',    // Blue 500
  }
} as const;

// =============================================================================
// TYPOGRAPHY SYSTEM
// =============================================================================

export const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['Fira Code', 'Menlo', 'Monaco', 'monospace'],
  },

  // Font Sizes
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line Heights
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  // Text Styles
  textStyles: {
    // Headlines
    h1: 'text-3xl font-bold text-gray-900 leading-tight',
    h2: 'text-2xl font-bold text-gray-900 leading-tight',
    h3: 'text-xl font-semibold text-gray-900 leading-tight',
    h4: 'text-lg font-semibold text-gray-900 leading-tight',
    h5: 'text-base font-semibold text-gray-900 leading-tight',
    h6: 'text-sm font-semibold text-gray-900 leading-tight',

    // Body Text
    bodyLarge: 'text-lg text-gray-700 leading-relaxed',
    body: 'text-base text-gray-700 leading-normal',
    bodySmall: 'text-sm text-gray-600 leading-normal',

    // Labels and Captions
    label: 'text-sm font-medium text-gray-700',
    caption: 'text-xs text-gray-500',
    overline: 'text-xs font-semibold text-gray-500 uppercase tracking-wide',

    // Interactive Text
    link: 'text-blue-600 hover:text-blue-700 underline',
    linkSubtle: 'text-blue-600 hover:text-blue-700',
  }
} as const;

// =============================================================================
// SPACING SYSTEM
// =============================================================================

export const spacing = {
  // Base spacing scale (rem units)
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px

  // Component-specific spacing
  component: {
    cardPadding: '1.5rem',      // 24px
    sectionGap: '2rem',         // 32px
    elementGap: '1rem',         // 16px
    buttonPadding: '0.75rem 1rem', // 12px 16px
    inputPadding: '0.75rem',    // 12px
  }
} as const;

// =============================================================================
// LAYOUT SYSTEM
// =============================================================================

export const layout = {
  // Container Widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  },

  // Grid System
  grid: {
    cols1: 'grid-cols-1',
    cols2: 'grid-cols-2',
    cols3: 'grid-cols-3',
    cols4: 'grid-cols-4',
    cols6: 'grid-cols-6',
    cols12: 'grid-cols-12',
    responsive: {
      dashboard: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      charts: 'grid-cols-1 lg:grid-cols-2',
    }
  },

  // Flexbox Utilities
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    start: 'flex items-center justify-start',
    end: 'flex items-center justify-end',
    column: 'flex flex-col',
    wrap: 'flex flex-wrap',
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
} as const;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const components = {
  // Card Components
  card: {
    base: `bg-white rounded-lg border border-gray-200 shadow-sm`,
    interactive: `bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200`,
    elevated: `bg-white rounded-lg shadow-md`,
    gradient: `bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100`,
    
    // Card Variants
    variants: {
      default: 'bg-white border-gray-200',
      primary: 'bg-blue-50 border-blue-200',
      success: 'bg-green-50 border-green-200',
      warning: 'bg-yellow-50 border-yellow-200',
      error: 'bg-red-50 border-red-200',
    },

    // Card Sizes
    sizes: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }
  },

  // Button Components
  button: {
    base: `inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-lg 
           focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200
           min-h-[44px] touch-manipulation active:scale-95`,
    
    // Button Variants
    variants: {
      primary: `bg-blue-600 border-transparent text-white hover:bg-blue-700 
                focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`,
      secondary: `bg-white border-gray-300 text-gray-700 hover:bg-gray-50 
                  focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`,
      success: `bg-green-600 border-transparent text-white hover:bg-green-700 
                focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed`,
      warning: `bg-yellow-600 border-transparent text-white hover:bg-yellow-700 
                focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed`,
      danger: `bg-red-600 border-transparent text-white hover:bg-red-700 
               focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed`,
      ghost: `bg-transparent border-transparent text-gray-700 hover:bg-gray-100 
              focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`,
    },

    // Button Sizes
    sizes: {
      xs: 'px-2.5 py-1.5 text-xs',
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-4 py-2 text-base',
      xl: 'px-6 py-3 text-base',
    }
  },

  // Input Components
  input: {
    base: `block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
           focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500`,
    
    variants: {
      default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
      error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
      success: 'border-green-300 focus:border-green-500 focus:ring-green-500',
    }
  },

  // Badge Components
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    
    variants: {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
    },

    sizes: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm',
    }
  },

  // Status Indicators
  status: {
    excellent: {
      color: colors.status.excellent,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      badge: 'bg-green-100 text-green-800',
    },
    good: {
      color: colors.status.good,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-800',
    },
    warning: {
      color: colors.status.warning,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-800',
    },
    critical: {
      color: colors.status.critical,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
    },
    neutral: {
      color: colors.status.neutral,
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
      badge: 'bg-gray-100 text-gray-800',
    }
  }
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Combines multiple CSS classes, handling conditional classes and duplicates
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Gets status-specific styling based on status type
 */
export function getStatusStyles(status: keyof typeof components.status) {
  return components.status[status] || components.status.neutral;
}

/**
 * Gets component variant styling
 */
export function getVariantStyles(
  component: keyof typeof components,
  variant: string
): string {
  const comp = components[component] as any;
  return comp?.variants?.[variant] || '';
}

/**
 * Gets component size styling
 */
export function getSizeStyles(
  component: keyof typeof components,
  size: string
): string {
  const comp = components[component] as any;
  return comp?.sizes?.[size] || '';
}

/**
 * Creates a complete component class string
 */
export function createComponentClass(
  component: keyof typeof components,
  variant?: string,
  size?: string,
  additionalClasses?: string
): string {
  const comp = components[component] as any;
  const baseClass = comp?.base || '';
  const variantClass = variant ? getVariantStyles(component, variant) : '';
  const sizeClass = size ? getSizeStyles(component, size) : '';

  return cn(baseClass, variantClass, sizeClass, additionalClasses);
}

// =============================================================================
// ANIMATION SYSTEM
// =============================================================================

export const animations = {
  // Transition Durations
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },

  // Easing Functions
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },

  // Common Animations
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  slideIn: 'animate-slide-in',
  slideOut: 'animate-slide-out',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',

  // Transition Classes
  transition: {
    all: 'transition-all duration-200',
    colors: 'transition-colors duration-200',
    shadow: 'transition-shadow duration-200',
    transform: 'transition-transform duration-200',
  }
} as const;

// =============================================================================
// RESPONSIVE BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// =============================================================================
// ICON SYSTEM
// =============================================================================

export interface IconProps {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export const icons = {
  sizes: {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  },
  
  colors: {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    muted: 'text-gray-400',
  }
} as const;

// =============================================================================
// MOBILE TOUCH TARGET UTILITIES
// =============================================================================

export const touchTargets = {
  // Standard touch target sizes based on Apple/Android guidelines
  small: 'min-h-[36px] min-w-[36px]',      // For compact layouts
  medium: 'min-h-[44px] min-w-[44px]',     // Standard iOS/Android minimum
  large: 'min-h-[48px] min-w-[48px]',      // For primary actions
  
  // Touch-friendly interaction patterns
  touch: 'touch-manipulation active:scale-95 transition-transform duration-150',
  cardTouch: 'touch-manipulation active:scale-[0.98] transition-transform duration-150',
  
  // Mobile-optimized spacing for easier touch interaction
  spacing: {
    tight: 'gap-2',      // 8px
    normal: 'gap-3',     // 12px  
    loose: 'gap-4',      // 16px
    comfortable: 'gap-6' // 24px
  }
} as const;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  colors,
  typography,
  spacing,
  layout,
  components,
  animations,
  breakpoints,
  icons,
  touchTargets,
  // Utility functions
  cn,
  getStatusStyles,
  getVariantStyles,
  getSizeStyles,
  createComponentClass,
} as const;