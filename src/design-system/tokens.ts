/**
 * Design System Tokens
 * 
 * Central definition of all design tokens used throughout the application.
 * These tokens ensure consistency across all components and enable easy theming.
 */

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
    950: '#172554'
  },

  // Secondary Colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },

  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16'
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
  },

  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49'
  },

  // Neutral Grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712'
  },

  // Special Purpose Colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    overlay: 'rgba(0, 0, 0, 0.5)',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },

  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    link: '#2563eb',
    linkHover: '#1d4ed8'
  },

  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
    focus: '#3b82f6'
  }
} as const;

// =============================================================================
// TYPOGRAPHY SYSTEM
// =============================================================================

export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif'
    ],
    mono: [
      'JetBrains Mono',
      'Monaco',
      'Menlo',
      'Ubuntu Mono',
      'monospace'
    ]
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
    '7xl': ['4.5rem', { lineHeight: '1' }],       // 72px
    '8xl': ['6rem', { lineHeight: '1' }],         // 96px
    '9xl': ['8rem', { lineHeight: '1' }]          // 128px
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  }
} as const;

// =============================================================================
// SPACING SYSTEM
// =============================================================================

export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
  72: '18rem',       // 288px
  80: '20rem',       // 320px
  96: '24rem'        // 384px
} as const;

// =============================================================================
// SHADOW SYSTEM
// =============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  outline: '0 0 0 3px rgb(59 130 246 / 0.5)', // focus ring
  error: '0 0 0 3px rgb(239 68 68 / 0.5)',    // error focus ring
  success: '0 0 0 3px rgb(34 197 94 / 0.5)'   // success focus ring
} as const;

// =============================================================================
// BORDER RADIUS SYSTEM
// =============================================================================

export const borderRadius = {
  none: '0px',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px'    // circular
} as const;

// =============================================================================
// BREAKPOINT SYSTEM
// =============================================================================

export const breakpoints = {
  xs: '475px',      // Mobile
  sm: '640px',      // Small tablet
  md: '768px',      // Tablet
  lg: '1024px',     // Desktop
  xl: '1280px',     // Large desktop
  '2xl': '1536px'   // Extra large desktop
} as const;

// =============================================================================
// Z-INDEX SYSTEM
// =============================================================================

export const zIndex = {
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
} as const;

// =============================================================================
// ANIMATION SYSTEM
// =============================================================================

export const animations = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '1000ms'
  },

  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  },

  keyframes: {
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' }
    },
    fadeOut: {
      from: { opacity: '1' },
      to: { opacity: '0' }
    },
    slideUp: {
      from: { transform: 'translateY(100%)' },
      to: { transform: 'translateY(0)' }
    },
    slideDown: {
      from: { transform: 'translateY(-100%)' },
      to: { transform: 'translateY(0)' }
    },
    slideLeft: {
      from: { transform: 'translateX(100%)' },
      to: { transform: 'translateX(0)' }
    },
    slideRight: {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' }
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: '0' },
      to: { transform: 'scale(1)', opacity: '1' }
    },
    scaleOut: {
      from: { transform: 'scale(1)', opacity: '1' },
      to: { transform: 'scale(0.95)', opacity: '0' }
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' }
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' }
    },
    bounce: {
      '0%, 100%': { 
        transform: 'translateY(-25%)', 
        animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' 
      },
      '50%': { 
        transform: 'none', 
        animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' 
      }
    }
  }
} as const;

// =============================================================================
// COMPONENT SIZES
// =============================================================================

export const componentSizes = {
  xs: {
    height: '1.5rem',    // 24px
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    iconSize: '0.875rem'
  },
  sm: {
    height: '2rem',      // 32px
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    iconSize: '1rem'
  },
  md: {
    height: '2.5rem',    // 40px
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    iconSize: '1.125rem'
  },
  lg: {
    height: '3rem',      // 48px
    padding: '0.75rem 1.5rem',
    fontSize: '1.125rem',
    iconSize: '1.25rem'
  },
  xl: {
    height: '3.5rem',    // 56px
    padding: '1rem 2rem',
    fontSize: '1.25rem',
    iconSize: '1.5rem'
  }
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ColorScale = typeof colors.primary;
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type ShadowToken = keyof typeof shadows;
export type BorderRadiusToken = keyof typeof borderRadius;
export type BreakpointToken = keyof typeof breakpoints;
export type ZIndexToken = keyof typeof zIndex;
export type ComponentSizeToken = keyof typeof componentSizes;

// =============================================================================
// TOKEN UTILITIES
// =============================================================================

export const getColorValue = (color: string): string => {
  const parts = color.split('.');
  if (parts.length === 1) {
    return (colors as any)[parts[0]] || color;
  }
  if (parts.length === 2) {
    return (colors as any)[parts[0]]?.[parts[1]] || color;
  }
  return color;
};

export const getSpacingValue = (space: SpacingToken): string => {
  return spacing[space];
};

export const getShadowValue = (shadow: ShadowToken): string => {
  return shadows[shadow];
};

export const getBreakpointValue = (breakpoint: BreakpointToken): string => {
  return breakpoints[breakpoint];
};

// Export all tokens as a single object for easy access
export const designTokens = {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  breakpoints,
  zIndex,
  animations,
  componentSizes
} as const;

export type DesignTokens = typeof designTokens;