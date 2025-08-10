/**
 * Professional Animation System
 * 
 * A comprehensive animation system with easing functions, keyframes, and 
 * professional micro-interactions for enterprise-grade applications.
 */

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

export const easings = {
  // Standard material design easing
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  
  // Professional easing curves
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  elegant: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  snappy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  gentle: 'cubic-bezier(0.16, 1, 0.3, 1)',
  
  // Micro-interaction specific
  buttonPress: 'cubic-bezier(0.02, 1.505, 0.745, 1.235)',
  cardHover: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  modalEnter: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  slideUp: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  
  // Accessibility friendly (reduced motion)
  instant: 'step-end',
  linear: 'linear'
} as const;

// =============================================================================
// DURATION TOKENS
// =============================================================================

export const durations = {
  instant: '0ms',
  micro: '75ms',     // Ultra-fast micro-interactions
  fast: '150ms',     // Button presses, small state changes
  normal: '250ms',   // Standard transitions
  medium: '350ms',   // Card animations, moderate changes
  slow: '500ms',     // Modal entrances, large state changes
  slower: '750ms',   // Page transitions
  slowest: '1000ms', // Complex animations
  
  // Specific use cases
  hover: '150ms',
  focus: '200ms',
  buttonPress: '100ms',
  cardLift: '250ms',
  modalEnter: '350ms',
  pageTransition: '400ms',
  loadingSpinner: '1200ms',
  pulse: '2000ms',
  
  // Reduced motion fallbacks
  reducedMotion: '1ms'
} as const;

// =============================================================================
// KEYFRAMES
// =============================================================================

export const keyframes = {
  // Entrance animations
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' }
  },
  
  fadeInUp: {
    '0%': { 
      opacity: '0', 
      transform: 'translateY(20px)' 
    },
    '100%': { 
      opacity: '1', 
      transform: 'translateY(0)' 
    }
  },
  
  fadeInDown: {
    '0%': { 
      opacity: '0', 
      transform: 'translateY(-20px)' 
    },
    '100%': { 
      opacity: '1', 
      transform: 'translateY(0)' 
    }
  },
  
  scaleIn: {
    '0%': { 
      opacity: '0', 
      transform: 'scale(0.95)' 
    },
    '100%': { 
      opacity: '1', 
      transform: 'scale(1)' 
    }
  },
  
  slideInRight: {
    '0%': { 
      opacity: '0', 
      transform: 'translateX(30px)' 
    },
    '100%': { 
      opacity: '1', 
      transform: 'translateX(0)' 
    }
  },
  
  // Professional card animations
  cardLift: {
    '0%': { 
      transform: 'translateY(0) scale(1)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    '100%': { 
      transform: 'translateY(-4px) scale(1.01)',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)'
    }
  },
  
  buttonPress: {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(0.95)' },
    '100%': { transform: 'scale(1)' }
  },
  
  // Loading and progress animations
  spin: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  },
  
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.6' }
  },
  
  shimmer: {
    '0%': { 
      backgroundPosition: '-200px 0' 
    },
    '100%': { 
      backgroundPosition: 'calc(200px + 100%) 0' 
    }
  },
  
  skeleton: {
    '0%': {
      backgroundPosition: '-200px 0'
    },
    '100%': {
      backgroundPosition: 'calc(200px + 100%) 0'
    }
  },
  
  // Micro-interactions
  wiggle: {
    '0%, 100%': { transform: 'rotate(-2deg)' },
    '50%': { transform: 'rotate(2deg)' }
  },
  
  bounce: {
    '0%, 20%, 53%, 80%, 100%': {
      animationTimingFunction: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)',
      transform: 'translate3d(0,0,0)'
    },
    '40%, 43%': {
      animationTimingFunction: 'cubic-bezier(0.755, 0.050, 0.855, 0.060)',
      transform: 'translate3d(0, -30px, 0)'
    },
    '70%': {
      animationTimingFunction: 'cubic-bezier(0.755, 0.050, 0.855, 0.060)',
      transform: 'translate3d(0, -15px, 0)'
    },
    '90%': {
      transform: 'translate3d(0,-4px,0)'
    }
  },
  
  // Status indicators
  heartbeat: {
    '0%': { transform: 'scale(1)' },
    '14%': { transform: 'scale(1.1)' },
    '28%': { transform: 'scale(1)' },
    '42%': { transform: 'scale(1.1)' },
    '70%': { transform: 'scale(1)' }
  },
  
  glow: {
    '0%, 100%': { 
      boxShadow: '0 0 5px rgba(59, 130, 246, 0.3)' 
    },
    '50%': { 
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' 
    }
  },
  
  // Mobile touch feedback
  ripple: {
    '0%': {
      transform: 'scale(0)',
      opacity: '0.6'
    },
    '100%': {
      transform: 'scale(4)',
      opacity: '0'
    }
  },
  
  // Focus indicators
  focusPulse: {
    '0%': {
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)'
    },
    '50%': {
      boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)'
    },
    '100%': {
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)'
    }
  }
} as const;

// =============================================================================
// ANIMATION CLASSES
// =============================================================================

export const animations = {
  // Entrance animations
  'fade-in': {
    animation: `fadeIn ${durations.normal} ${easings.smooth} both`
  },
  
  'fade-in-up': {
    animation: `fadeInUp ${durations.normal} ${easings.smooth} both`
  },
  
  'fade-in-down': {
    animation: `fadeInDown ${durations.normal} ${easings.smooth} both`
  },
  
  'scale-in': {
    animation: `scaleIn ${durations.normal} ${easings.elegant} both`
  },
  
  'slide-in-right': {
    animation: `slideInRight ${durations.normal} ${easings.smooth} both`
  },
  
  // Interactive animations
  'card-lift': {
    animation: `cardLift ${durations.cardLift} ${easings.cardHover} both`
  },
  
  'button-press': {
    animation: `buttonPress ${durations.buttonPress} ${easings.buttonPress} both`
  },
  
  // Loading animations
  'spin': {
    animation: `spin ${durations.loadingSpinner} linear infinite`
  },
  
  'pulse': {
    animation: `pulse ${durations.pulse} ${easings.smooth} infinite`
  },
  
  'shimmer': {
    animation: `shimmer 1.5s ${easings.smooth} infinite`
  },
  
  'skeleton': {
    animation: `skeleton 1.5s ${easings.smooth} infinite`
  },
  
  // Micro-interactions
  'wiggle': {
    animation: `wiggle 0.8s ${easings.snappy} both`
  },
  
  'bounce': {
    animation: `bounce 1s ${easings.smooth} both`
  },
  
  'heartbeat': {
    animation: `heartbeat 1.5s ease-in-out infinite`
  },
  
  'glow': {
    animation: `glow ${durations.pulse} ${easings.smooth} infinite alternate`
  },
  
  'focus-pulse': {
    animation: `focusPulse 1.5s ${easings.smooth} infinite`
  }
} as const;

// =============================================================================
// TRANSITION UTILITIES
// =============================================================================

export const transitions = {
  // Standard transitions
  all: `all ${durations.normal} ${easings.standard}`,
  colors: `background-color ${durations.fast} ${easings.standard}, border-color ${durations.fast} ${easings.standard}, color ${durations.fast} ${easings.standard}`,
  transform: `transform ${durations.normal} ${easings.standard}`,
  opacity: `opacity ${durations.fast} ${easings.standard}`,
  
  // Component-specific transitions
  button: `all ${durations.hover} ${easings.standard}`,
  card: `all ${durations.cardLift} ${easings.cardHover}`,
  modal: `all ${durations.modalEnter} ${easings.modalEnter}`,
  focus: `box-shadow ${durations.focus} ${easings.standard}, border-color ${durations.focus} ${easings.standard}`,
  
  // Smooth property-specific transitions
  background: `background-color ${durations.fast} ${easings.standard}`,
  border: `border-color ${durations.fast} ${easings.standard}`,
  shadow: `box-shadow ${durations.normal} ${easings.standard}`,
  size: `width ${durations.normal} ${easings.standard}, height ${durations.normal} ${easings.standard}`,
  
  // Performance optimized transitions
  gpu: `transform ${durations.normal} ${easings.standard}, opacity ${durations.fast} ${easings.standard}`,
  
  // Accessibility - reduced motion
  none: 'none'
} as const;

// =============================================================================
// MICRO-INTERACTION PRESETS
// =============================================================================

export const microInteractions = {
  // Button interactions
  buttonHover: {
    transition: transitions.button,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },
  
  buttonActive: {
    transform: 'translateY(0) scale(0.98)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  
  // Card interactions
  cardHover: {
    transition: transitions.card,
    transform: 'translateY(-2px) scale(1.005)',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)'
  },
  
  cardActive: {
    transform: 'translateY(0) scale(1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
  },
  
  // Input interactions
  inputFocus: {
    transition: transitions.focus,
    borderColor: 'rgb(59, 130, 246)',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
  },
  
  // Loading states
  loadingPulse: {
    animation: `pulse ${durations.pulse} ${easings.smooth} infinite`,
    backgroundColor: 'rgba(156, 163, 175, 0.4)'
  },
  
  loadingSkeleton: {
    background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
    backgroundSize: '200% 100%',
    animation: `shimmer 1.5s ${easings.smooth} infinite`
  }
} as const;

// =============================================================================
// RESPONSIVE ANIMATION UTILITIES
// =============================================================================

export const responsiveAnimations = {
  // Disable complex animations on mobile for performance
  mobile: {
    reducedMotion: {
      animation: 'none !important',
      transition: `opacity ${durations.fast} ${easings.linear} !important`
    }
  },
  
  // Tablet optimizations
  tablet: {
    moderateAnimations: {
      animationDuration: durations.fast,
      transitionDuration: durations.fast
    }
  },
  
  // Desktop full animations
  desktop: {
    fullAnimations: {
      // All animations enabled
    }
  }
} as const;

// =============================================================================
// ACCESSIBILITY UTILITIES
// =============================================================================

export const accessibility = {
  // Respect user preferences
  respectsReducedMotion: `@media (prefers-reduced-motion: reduce)`,
  respectsColorScheme: `@media (prefers-color-scheme: dark)`,
  
  // Reduced motion alternatives
  reducedMotion: {
    animation: 'none',
    transition: `opacity ${durations.reducedMotion} ${easings.instant}, transform ${durations.reducedMotion} ${easings.instant}`
  },
  
  // High contrast mode
  highContrast: {
    '@media (prefers-contrast: high)': {
      boxShadow: 'none',
      border: '2px solid currentColor'
    }
  },
  
  // Focus indicators for keyboard navigation
  focusVisible: {
    '&:focus-visible': {
      outline: '2px solid rgb(59, 130, 246)',
      outlineOffset: '2px',
      animation: `focusPulse 1.5s ${easings.smooth} infinite`
    }
  }
} as const;

// =============================================================================
// CSS-IN-JS UTILITIES
// =============================================================================

export const getAnimation = (name: keyof typeof animations) => {
  return animations[name];
};

export const getTransition = (type: keyof typeof transitions) => {
  return transitions[type];
};

export const getMicroInteraction = (type: keyof typeof microInteractions) => {
  return microInteractions[type];
};

// =============================================================================
// CSS CUSTOM PROPERTIES
// =============================================================================

export const cssVariables = {
  '--animation-duration-micro': durations.micro,
  '--animation-duration-fast': durations.fast,
  '--animation-duration-normal': durations.normal,
  '--animation-duration-slow': durations.slow,
  
  '--animation-easing-standard': easings.standard,
  '--animation-easing-smooth': easings.smooth,
  '--animation-easing-elegant': easings.elegant,
  '--animation-easing-snappy': easings.snappy,
  
  '--transition-button': transitions.button,
  '--transition-card': transitions.card,
  '--transition-modal': transitions.modal,
  '--transition-focus': transitions.focus
} as const;

// =============================================================================
// ANIMATION SYSTEM EXPORT
// =============================================================================

export const animationSystem = {
  easings,
  durations,
  keyframes,
  animations,
  transitions,
  microInteractions,
  responsiveAnimations,
  accessibility,
  cssVariables,
  
  // Utility functions
  getAnimation,
  getTransition,
  getMicroInteraction
} as const;

export default animationSystem;