/**
 * Design System Theme Utilities
 * 
 * Central theme management with TypeScript utilities for consistent styling
 * across the application. Includes support for animations, variants, and
 * accessibility features.
 */

import { designTokens } from './tokens';
import { variants } from './variants';
import { animationSystem } from './animations';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// =============================================================================
// CLASS UTILITY FUNCTION
// =============================================================================

/**
 * Combines and merges Tailwind CSS classes with conflict resolution
 */
export function cx(...inputs: (string | undefined | null | boolean)[]): string {
  return twMerge(clsx(inputs));
}

// =============================================================================
// THEME CONFIGURATION
// =============================================================================

export const theme = {
  tokens: designTokens,
  variants,
  animations: animationSystem,
  
  // Responsive breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Z-index scale
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  }
} as const;

// =============================================================================
// COMPONENT STYLING UTILITIES
// =============================================================================

/**
 * Creates consistent focus ring styles
 */
export const focusRing = (color: string = 'rgb(59 130 246)') => cx(
  'focus:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-offset-2',
  `focus-visible:ring-[${color}]`,
  'focus-visible:ring-opacity-50'
);

/**
 * Creates consistent shadow styles
 */
export const shadow = (level: keyof typeof designTokens.shadows) => 
  `shadow-${level}` as const;

/**
 * Creates consistent rounded corner styles
 */
export const rounded = (size: keyof typeof designTokens.borderRadius) => 
  `rounded-${size}` as const;

/**
 * Creates consistent spacing styles
 */
export const spacing = (size: keyof typeof designTokens.spacing) => 
  `p-${size}` as const;

/**
 * Creates professional button styles with micro-interactions
 */
export const buttonStyles = {
  base: cx(
    'inline-flex items-center justify-center',
    'font-medium text-sm',
    'border rounded-md',
    'transition-all duration-200 ease-in-out',
    'cursor-pointer select-none',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-[0.98]',
    'hover:shadow-md',
    'will-change-transform'
  ),
  
  variants: {
    primary: cx(
      'bg-blue-600 text-white border-blue-600',
      'hover:bg-blue-700 hover:border-blue-700',
      'focus:ring-blue-500',
      'shadow-sm'
    ),
    secondary: cx(
      'bg-white text-gray-700 border-gray-300',
      'hover:bg-gray-50 hover:border-gray-400',
      'focus:ring-gray-500',
      'shadow-sm'
    ),
    outline: cx(
      'bg-transparent text-blue-600 border-blue-600',
      'hover:bg-blue-50',
      'focus:ring-blue-500'
    ),
    ghost: cx(
      'bg-transparent text-gray-700 border-transparent',
      'hover:bg-gray-100',
      'focus:ring-gray-500'
    )
  },
  
  sizes: {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2'
  }
};

/**
 * Creates professional card styles with hover effects
 */
export const cardStyles = {
  base: cx(
    'bg-white rounded-lg border border-gray-200',
    'shadow-sm',
    'transition-all duration-300 ease-out',
    'will-change-transform'
  ),
  
  interactive: cx(
    'cursor-pointer',
    'hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01]',
    'active:translate-y-0 active:scale-100',
    'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
  ),
  
  variants: {
    default: 'shadow-sm',
    elevated: 'shadow-md hover:shadow-xl',
    outlined: 'shadow-none border-gray-300',
    filled: 'bg-gray-50 border-transparent shadow-none'
  }
};

/**
 * Creates consistent input styles
 */
export const inputStyles = {
  base: cx(
    'w-full px-3 py-2',
    'text-sm',
    'border border-gray-300 rounded-md',
    'bg-white',
    'placeholder-gray-400',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'disabled:bg-gray-50 disabled:text-gray-500'
  ),
  
  error: cx(
    'border-red-300 text-red-900',
    'focus:ring-red-500 focus:border-transparent'
  ),
  
  success: cx(
    'border-green-300 text-green-900',
    'focus:ring-green-500 focus:border-transparent'
  )
};

/**
 * Creates loading skeleton styles
 */
export const skeletonStyles = cx(
  'animate-pulse bg-gray-200 rounded',
  'relative overflow-hidden',
  'before:absolute before:inset-0',
  'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
  'before:animate-shimmer'
);

// =============================================================================
// ACCESSIBILITY UTILITIES
// =============================================================================

/**
 * Screen reader only styles
 */
export const srOnly = cx(
  'absolute w-px h-px p-0 -m-px overflow-hidden',
  'whitespace-nowrap border-0'
);

/**
 * Focus visible styles for keyboard navigation
 */
export const focusVisible = cx(
  'focus-visible:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-blue-500',
  'focus-visible:ring-offset-2'
);

/**
 * High contrast mode support
 */
export const highContrast = cx(
  '@media (prefers-contrast: high)',
  'border-2 border-current'
);

/**
 * Reduced motion support
 */
export const respectReducedMotion = (animationClasses: string) => cx(
  animationClasses,
  'motion-reduce:transition-none',
  'motion-reduce:animate-none'
);

// =============================================================================
// MOBILE OPTIMIZATION UTILITIES
// =============================================================================

/**
 * Touch target optimization for mobile
 */
export const touchTarget = cx(
  'min-h-[44px] min-w-[44px]',
  'touch-manipulation'
);

/**
 * Mobile-specific styles
 */
export const mobileOptimized = cx(
  'touch-manipulation',
  '-webkit-tap-highlight-color: transparent',
  'will-change-transform'
);

/**
 * Safe area padding for devices with notches
 */
export const safeArea = {
  top: 'pt-[env(safe-area-inset-top)]',
  bottom: 'pb-[env(safe-area-inset-bottom)]',
  left: 'pl-[env(safe-area-inset-left)]',
  right: 'pr-[env(safe-area-inset-right)]',
  all: cx(
    'pt-[env(safe-area-inset-top)]',
    'pb-[env(safe-area-inset-bottom)]',
    'pl-[env(safe-area-inset-left)]',
    'pr-[env(safe-area-inset-right)]'
  )
};

// =============================================================================
// ANIMATION UTILITIES
// =============================================================================

/**
 * Creates staggered animation delays for lists
 */
export const staggeredAnimation = (index: number, baseDelay: number = 100) => ({
  animationDelay: `${index * baseDelay}ms`
});

/**
 * Hardware acceleration for smooth animations
 */
export const hardwareAccelerated = cx(
  'transform-gpu',
  'backface-hidden',
  'perspective-1000'
);

/**
 * Professional enter/exit animations
 */
export const enterAnimation = cx(
  'animate-in fade-in-0 slide-in-from-bottom-2',
  'duration-300 ease-out'
);

export const exitAnimation = cx(
  'animate-out fade-out-0 slide-out-to-bottom-2',
  'duration-200 ease-in'
);

// =============================================================================
// LAYOUT UTILITIES
// =============================================================================

/**
 * Common layout patterns
 */
export const layouts = {
  // Flexbox utilities
  flexCenter: cx('flex items-center justify-center'),
  flexBetween: cx('flex items-center justify-between'),
  flexStart: cx('flex items-center justify-start'),
  flexEnd: cx('flex items-center justify-end'),
  flexCol: cx('flex flex-col'),
  flexColCenter: cx('flex flex-col items-center justify-center'),
  
  // Grid utilities
  gridAuto: cx('grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))]'),
  gridResponsive: cx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'),
  
  // Container utilities
  container: cx('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'),
  containerSm: cx('max-w-2xl mx-auto px-4 sm:px-6'),
  containerFluid: cx('w-full px-4 sm:px-6 lg:px-8')
};

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Status color utilities
 */
export const statusColors = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-600'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-600'
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  designTokens,
  variants,
  animationSystem
};

export default theme;