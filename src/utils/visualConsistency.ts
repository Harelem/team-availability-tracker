/**
 * Visual Consistency Utilities
 * 
 * Centralized utilities to ensure consistent visual styling across
 * all components in the application.
 */

import { cx } from '@/design-system/theme';

// =============================================================================
// COMPONENT CONSISTENCY CLASSES
// =============================================================================

/**
 * Standard interactive element classes
 */
export const interactiveElement = cx(
  'transition-all duration-200 ease-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  'focus-visible:ring-opacity-50',
  'disabled:opacity-60 disabled:cursor-not-allowed',
  'disabled:transform-none disabled:shadow-none'
);

/**
 * Professional button styling
 */
export const professionalButton = cx(
  interactiveElement,
  'ui-button',
  'inline-flex items-center justify-center',
  'font-semibold text-sm',
  'px-4 py-2 rounded-lg',
  'shadow-sm',
  'hover:shadow-md hover:-translate-y-0.5',
  'active:scale-95 active:duration-75',
  'min-h-[44px] min-w-[44px]', // Mobile touch targets
  'touch-manipulation'
);

/**
 * Professional card styling
 */
export const professionalCard = cx(
  'ui-card',
  'bg-white border border-gray-200 rounded-lg',
  'shadow-sm',
  'transition-all duration-300 ease-out',
  'hover:shadow-lg hover:-translate-y-1 hover:scale-[1.005]',
  'will-change-transform transform-gpu'
);

/**
 * Interactive card styling
 */
export const interactiveCard = cx(
  professionalCard,
  'cursor-pointer',
  'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
  'active:scale-100 active:translate-y-0'
);

/**
 * Status badge styling
 */
export const statusBadge = cx(
  'inline-flex items-center',
  'px-2.5 py-1 text-xs font-medium',
  'rounded-full border',
  'transition-colors duration-200'
);

/**
 * Loading skeleton styling
 */
export const loadingSkeleton = cx(
  'animate-shimmer',
  'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
  'bg-[length:200%_100%]',
  'rounded-md'
);

/**
 * Form input styling
 */
export const formInput = cx(
  'w-full px-4 py-3',
  'text-sm font-medium',
  'border border-gray-300 rounded-lg',
  'bg-white placeholder-gray-500',
  'transition-all duration-200 ease-out',
  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  'focus:ring-opacity-50',
  'min-h-[48px]', // Mobile touch target
  'disabled:bg-gray-50 disabled:text-gray-500'
);

// =============================================================================
// STATUS VARIANTS
// =============================================================================

export const statusVariants = {
  success: {
    badge: 'bg-green-100 text-green-900 border-green-300',
    card: 'border-green-200 bg-green-50/50',
    text: 'text-green-800',
    icon: 'text-green-600'
  },
  warning: {
    badge: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    card: 'border-yellow-200 bg-yellow-50/50',
    text: 'text-yellow-800',
    icon: 'text-yellow-600'
  },
  error: {
    badge: 'bg-red-100 text-red-900 border-red-300',
    card: 'border-red-200 bg-red-50/50',
    text: 'text-red-800',
    icon: 'text-red-600'
  },
  info: {
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    card: 'border-blue-200 bg-blue-50/50',
    text: 'text-blue-800',
    icon: 'text-blue-600'
  }
} as const;

// =============================================================================
// SIZE VARIANTS
// =============================================================================

export const sizeVariants = {
  xs: {
    padding: 'p-2',
    text: 'text-xs',
    spacing: 'gap-1',
    minHeight: 'min-h-[28px]'
  },
  sm: {
    padding: 'p-3',
    text: 'text-sm',
    spacing: 'gap-2',
    minHeight: 'min-h-[36px]'
  },
  md: {
    padding: 'p-4',
    text: 'text-base',
    spacing: 'gap-3',
    minHeight: 'min-h-[44px]'
  },
  lg: {
    padding: 'p-6',
    text: 'text-lg',
    spacing: 'gap-4',
    minHeight: 'min-h-[48px]'
  },
  xl: {
    padding: 'p-8',
    text: 'text-xl',
    spacing: 'gap-6',
    minHeight: 'min-h-[56px]'
  }
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get status styling for a given variant
 */
export const getStatusStyling = (
  status: keyof typeof statusVariants,
  type: keyof typeof statusVariants.success
) => {
  return statusVariants[status][type];
};

/**
 * Get size styling for a given variant
 */
export const getSizeStyling = (
  size: keyof typeof sizeVariants,
  property: keyof typeof sizeVariants.md
) => {
  return sizeVariants[size][property];
};

/**
 * Create consistent component classes
 */
export const createComponentClasses = (config: {
  base: string;
  variants?: Record<string, string>;
  sizes?: Record<string, string>;
  states?: Record<string, string>;
}) => {
  return {
    base: cx(config.base),
    variants: config.variants || {},
    sizes: config.sizes || {},
    states: config.states || {}
  };
};

/**
 * Professional gradient backgrounds
 */
export const gradientBackgrounds = {
  primary: 'bg-gradient-to-r from-blue-600 to-blue-700',
  success: 'bg-gradient-to-r from-green-600 to-green-700',
  warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
  error: 'bg-gradient-to-r from-red-600 to-red-700',
  subtle: 'bg-gradient-to-r from-gray-50 to-gray-100'
} as const;

/**
 * Professional shadow variants
 */
export const shadowVariants = {
  subtle: 'shadow-sm',
  soft: 'shadow-md',
  medium: 'shadow-lg',
  strong: 'shadow-xl',
  dramatic: 'shadow-2xl',
  colored: {
    primary: 'shadow-lg shadow-blue-500/25',
    success: 'shadow-lg shadow-green-500/25',
    warning: 'shadow-lg shadow-yellow-500/25',
    error: 'shadow-lg shadow-red-500/25'
  }
} as const;

/**
 * Animation timing functions
 */
export const animations = {
  micro: 'duration-100 ease-out',
  fast: 'duration-200 ease-out',
  normal: 'duration-300 ease-out',
  slow: 'duration-500 ease-out',
  elastic: 'duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]'
} as const;

// =============================================================================
// RESPONSIVE UTILITIES
// =============================================================================

/**
 * Mobile-first responsive classes
 */
export const responsiveClasses = {
  stack: 'flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-6',
  grid: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
  center: 'flex items-center justify-center',
  between: 'flex items-center justify-between'
} as const;

/**
 * Safe area utilities for mobile devices
 */
export const safeAreaClasses = {
  top: 'pt-safe',
  bottom: 'pb-safe',
  left: 'pl-safe',
  right: 'pr-safe',
  all: 'p-safe'
} as const;

// =============================================================================
// ACCESSIBILITY UTILITIES
// =============================================================================

/**
 * Screen reader utilities
 */
export const a11y = {
  srOnly: 'sr-only',
  focusable: 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2',
  skipLink: cx(
    'absolute top-0 left-0 z-50',
    'px-4 py-2 bg-blue-600 text-white',
    'transform -translate-y-full',
    'focus:translate-y-0',
    'transition-transform duration-200'
  )
} as const;

/**
 * Color contrast utilities
 */
export const contrast = {
  high: 'text-gray-900 dark:text-gray-100',
  medium: 'text-gray-700 dark:text-gray-300',
  low: 'text-gray-500 dark:text-gray-500'
} as const;

/**
 * Focus management utilities
 */
export const focus = {
  ring: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  visible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  within: 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  interactiveElement,
  professionalButton,
  professionalCard,
  interactiveCard,
  statusBadge,
  loadingSkeleton,
  formInput,
  statusVariants,
  sizeVariants,
  gradientBackgrounds,
  shadowVariants,
  animations,
  responsiveClasses,
  safeAreaClasses,
  a11y,
  contrast,
  focus,
  getStatusStyling,
  getSizeStyling,
  createComponentClasses
};