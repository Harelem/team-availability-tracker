/**
 * Design System Constants for Team Availability Tracker
 * Provides consistent styling across all components
 */

export const DESIGN_SYSTEM = {
  // Consistent spacing scale
  spacing: {
    xs: 'p-2',
    sm: 'p-3', 
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
    // Responsive spacing
    responsive: {
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-6', 
      lg: 'p-6 sm:p-8',
    }
  },

  // Consistent shadows
  shadows: {
    sm: 'shadow-sm',
    default: 'shadow',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    none: 'shadow-none'
  },

  // Consistent border radius
  radius: {
    sm: 'rounded',
    md: 'rounded-lg', 
    lg: 'rounded-xl',
    full: 'rounded-full'
  },

  // Color scheme with semantic meaning
  colors: {
    primary: {
      bg: 'bg-blue-600',
      bgHover: 'hover:bg-blue-700',
      text: 'text-blue-600',
      bgLight: 'bg-blue-50',
      border: 'border-blue-200'
    },
    success: {
      bg: 'bg-green-600',
      bgHover: 'hover:bg-green-700', 
      text: 'text-green-600',
      bgLight: 'bg-green-50',
      border: 'border-green-200'
    },
    warning: {
      bg: 'bg-yellow-600',
      bgHover: 'hover:bg-yellow-700',
      text: 'text-yellow-600', 
      bgLight: 'bg-yellow-50',
      border: 'border-yellow-200'
    },
    danger: {
      bg: 'bg-red-600',
      bgHover: 'hover:bg-red-700',
      text: 'text-red-600',
      bgLight: 'bg-red-50', 
      border: 'border-red-200'
    },
    neutral: {
      bg: 'bg-gray-600',
      bgHover: 'hover:bg-gray-700',
      text: 'text-gray-600',
      bgLight: 'bg-gray-50',
      border: 'border-gray-200'
    },
    purple: {
      bg: 'bg-purple-600',
      bgHover: 'hover:bg-purple-700',
      text: 'text-purple-600',
      bgLight: 'bg-purple-50', 
      border: 'border-purple-200'
    }
  },

  // Typography scale
  typography: {
    h1: 'text-2xl sm:text-3xl font-bold',
    h2: 'text-xl sm:text-2xl font-semibold', 
    h3: 'text-lg sm:text-xl font-semibold',
    h4: 'text-base sm:text-lg font-medium',
    body: 'text-sm sm:text-base',
    caption: 'text-xs sm:text-sm',
    label: 'text-sm font-medium'
  },

  // Button styles
  buttons: {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-colors',
    secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors',
    success: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg transition-colors', 
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-lg transition-colors',
    ghost: 'hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors',
    // Size variants - Mobile-first with proper touch targets
    sm: 'px-3 py-2 text-sm min-h-[44px]',
    md: 'px-4 py-2.5 text-sm min-h-[48px]',
    lg: 'px-6 py-3 text-base min-h-[56px]',
    xl: 'px-8 py-4 text-lg min-h-[64px]',
    // Mobile-optimized touch targets
    touch: 'min-h-[44px] min-w-[44px] touch-manipulation',
    touchComfortable: 'min-h-[48px] min-w-[48px] touch-manipulation',
    touchLarge: 'min-h-[56px] min-w-[56px] touch-manipulation'
  },

  // Card styles
  cards: {
    default: 'bg-white rounded-lg shadow border border-gray-200',
    hover: 'hover:shadow-md transition-all duration-200 cursor-pointer',
    interactive: 'hover:shadow-md hover:bg-gray-50 transition-all duration-200 cursor-pointer',
    elevated: 'bg-white rounded-lg shadow-md',
    flat: 'bg-white rounded-lg border border-gray-200'
  },

  // Status indicators
  status: {
    excellent: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500'
    },
    good: {
      bg: 'bg-blue-100', 
      text: 'text-blue-800',
      dot: 'bg-blue-500'
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800', 
      dot: 'bg-yellow-500'
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500'
    }
  },

  // Grid layouts
  grids: {
    responsive1: 'grid grid-cols-1',
    responsive2: 'grid grid-cols-1 sm:grid-cols-2',
    responsive3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    responsive4: 'grid grid-cols-2 md:grid-cols-4',
    gap: {
      sm: 'gap-2',
      md: 'gap-4', 
      lg: 'gap-6'
    }
  },

  // Animation and transitions
  transitions: {
    default: 'transition-colors duration-200',
    all: 'transition-all duration-200',
    slow: 'transition-all duration-300',
    fast: 'transition-all duration-150'
  },

  // Mobile-specific enhancements
  mobile: {
    // Touch feedback
    touchFeedback: 'active:scale-95 transition-transform duration-150',
    // Improved tap targets
    tapTarget: 'relative before:absolute before:-inset-2 before:rounded-lg',
    // Safe area handling
    safeArea: {
      top: 'pt-[env(safe-area-inset-top)]',
      bottom: 'pb-[env(safe-area-inset-bottom)]',
      left: 'pl-[env(safe-area-inset-left)]',
      right: 'pr-[env(safe-area-inset-right)]',
      all: 'p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]'
    },
    // Mobile scrolling
    scroll: {
      smooth: 'scroll-smooth overscroll-y-contain',
      momentum: '-webkit-overflow-scrolling: touch',
      hideScrollbar: 'scrollbar-hide'
    },
    // Pull to refresh
    pullToRefresh: 'overscroll-y-contain',
    // Gesture support
    gestures: {
      swipe: 'touch-pan-x',
      scroll: 'touch-pan-y',
      zoom: 'touch-pinch-zoom'
    }
  }
} as const;

// Helper function to combine design system classes
export function combineClasses(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Helper function to get status-based styling
export function getStatusStyling(status: 'excellent' | 'good' | 'warning' | 'critical') {
  return DESIGN_SYSTEM.status[status];
}

// Helper function to get responsive card styling
export function getCardStyling(variant: 'default' | 'hover' | 'interactive' | 'elevated' | 'flat' = 'default', interactive = false) {
  const base = DESIGN_SYSTEM.cards[variant];
  return interactive ? `${base} ${DESIGN_SYSTEM.cards.hover}` : base;
}

// Helper function to get button styling
export function getButtonStyling(
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md'
) {
  return `${DESIGN_SYSTEM.buttons[variant]} ${DESIGN_SYSTEM.buttons[size]} ${DESIGN_SYSTEM.buttons.touch}`;
}

// Common component patterns
export const COMPONENT_PATTERNS = {
  // Modal backdrop
  modalBackdrop: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
  
  // Modal content
  modalContent: 'bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden',
  
  // Loading skeleton
  skeleton: 'animate-pulse bg-gray-200 rounded',
  
  // Avatar
  avatar: 'rounded-full flex items-center justify-center font-medium text-sm',
  
  // Badge
  badge: 'px-2 py-1 text-xs font-medium rounded-full',
  
  // Progress bar container
  progressContainer: 'w-full bg-gray-200 rounded-full h-2',
  
  // Progress bar fill
  progressFill: 'h-2 rounded-full transition-all duration-300',
  
  // Form input
  input: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  
  // Section header
  sectionHeader: 'flex items-center gap-2 mb-4',
  
  // Icon wrapper
  iconWrapper: 'w-5 h-5 flex-shrink-0'
} as const;