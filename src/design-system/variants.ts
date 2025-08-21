/**
 * Design System Component Variants
 * 
 * Defines consistent styling variants for all components in the design system.
 * These variants ensure visual consistency and provide a standardized API.
 */

import { designTokens } from './tokens';

// =============================================================================
// BUTTON VARIANTS
// =============================================================================

export const buttonVariants = {
  // Base styles applied to all buttons
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: designTokens.borderRadius.md,
    fontWeight: designTokens.typography.fontWeight.medium,
    transition: 'all 200ms ease-in-out',
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
    border: '1px solid transparent',
    position: 'relative',
    overflow: 'hidden'
  },

  // Visual variants
  variants: {
    primary: {
      backgroundColor: 'var(--color-primary-500)',
      color: 'white',
      borderColor: 'var(--color-primary-500)',
      '&:hover': {
        backgroundColor: 'var(--color-primary-600)',
        borderColor: 'var(--color-primary-600)'
      },
      '&:active': {
        backgroundColor: 'var(--color-primary-700)',
        borderColor: 'var(--color-primary-700)'
      },
      '&:focus': {
        boxShadow: `0 0 0 3px var(--color-primary-500, ${designTokens.colors.primary[500]})33`
      }
    },

    secondary: {
      backgroundColor: 'var(--color-background-secondary)',
      color: 'var(--color-text-primary)',
      borderColor: 'var(--color-border-medium)',
      '&:hover': {
        backgroundColor: 'var(--color-background-tertiary)',
        borderColor: 'var(--color-border-dark)'
      },
      '&:active': {
        backgroundColor: 'var(--color-background-primary)',
        borderColor: 'var(--color-border-dark)'
      },
      '&:focus': {
        boxShadow: `0 0 0 3px var(--color-border-focus, ${designTokens.colors.primary[500]})33`
      }
    },

    outline: {
      backgroundColor: 'transparent',
      color: 'var(--color-primary-500)',
      borderColor: 'var(--color-primary-500)',
      '&:hover': {
        backgroundColor: 'var(--color-primary-50)',
        borderColor: 'var(--color-primary-600)'
      },
      '&:active': {
        backgroundColor: 'var(--color-primary-100)',
        borderColor: 'var(--color-primary-700)'
      }
    },

    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-primary)',
      borderColor: 'transparent',
      '&:hover': {
        backgroundColor: 'var(--color-background-secondary)',
        borderColor: 'transparent'
      },
      '&:active': {
        backgroundColor: 'var(--color-background-tertiary)',
        borderColor: 'transparent'
      }
    },

    link: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-link)',
      borderColor: 'transparent',
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      '&:hover': {
        color: 'var(--color-text-link-hover)',
        textDecoration: 'underline'
      },
      '&:active': {
        color: 'var(--color-text-link-hover)'
      }
    },

    success: {
      backgroundColor: designTokens.colors.success[500],
      color: 'white',
      borderColor: designTokens.colors.success[500],
      '&:hover': {
        backgroundColor: designTokens.colors.success[600],
        borderColor: designTokens.colors.success[600]
      }
    },

    warning: {
      backgroundColor: designTokens.colors.warning[500],
      color: 'white',
      borderColor: designTokens.colors.warning[500],
      '&:hover': {
        backgroundColor: designTokens.colors.warning[600],
        borderColor: designTokens.colors.warning[600]
      }
    },

    error: {
      backgroundColor: designTokens.colors.error[500],
      color: 'white',
      borderColor: designTokens.colors.error[500],
      '&:hover': {
        backgroundColor: designTokens.colors.error[600],
        borderColor: designTokens.colors.error[600]
      }
    }
  },

  // Size variants
  sizes: {
    xs: {
      height: designTokens.componentSizes.xs.height,
      padding: designTokens.componentSizes.xs.padding,
      fontSize: designTokens.componentSizes.xs.fontSize,
      gap: designTokens.spacing[1]
    },
    sm: {
      height: designTokens.componentSizes.sm.height,
      padding: designTokens.componentSizes.sm.padding,
      fontSize: designTokens.componentSizes.sm.fontSize,
      gap: designTokens.spacing[1.5]
    },
    md: {
      height: designTokens.componentSizes.md.height,
      padding: designTokens.componentSizes.md.padding,
      fontSize: designTokens.componentSizes.md.fontSize,
      gap: designTokens.spacing[2]
    },
    lg: {
      height: designTokens.componentSizes.lg.height,
      padding: designTokens.componentSizes.lg.padding,
      fontSize: designTokens.componentSizes.lg.fontSize,
      gap: designTokens.spacing[2]
    },
    xl: {
      height: designTokens.componentSizes.xl.height,
      padding: designTokens.componentSizes.xl.padding,
      fontSize: designTokens.componentSizes.xl.fontSize,
      gap: designTokens.spacing[3]
    }
  },

  // State modifiers
  states: {
    disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
      pointerEvents: 'none'
    },
    loading: {
      cursor: 'wait',
      opacity: '0.8'
    },
    active: {
      transform: 'scale(0.98)'
    }
  }
} as const;

// =============================================================================
// CARD VARIANTS
// =============================================================================

export const cardVariants = {
  base: {
    backgroundColor: 'var(--color-background-primary)',
    borderRadius: designTokens.borderRadius.lg,
    border: '1px solid var(--color-border-light)',
    overflow: 'hidden'
  },

  variants: {
    default: {
      boxShadow: designTokens.shadows.sm
    },
    
    elevated: {
      boxShadow: designTokens.shadows.md
    },

    outlined: {
      boxShadow: 'none',
      borderColor: 'var(--color-border-medium)'
    },

    filled: {
      backgroundColor: 'var(--color-background-secondary)',
      border: 'none',
      boxShadow: 'none'
    },

    interactive: {
      cursor: 'pointer',
      transition: 'all 200ms ease-in-out',
      '&:hover': {
        boxShadow: designTokens.shadows.md,
        transform: 'translateY(-2px)'
      },
      '&:active': {
        transform: 'translateY(0px)',
        boxShadow: designTokens.shadows.sm
      }
    },

    success: {
      borderColor: designTokens.colors.success[200],
      backgroundColor: designTokens.colors.success[50]
    },

    warning: {
      borderColor: designTokens.colors.warning[200],
      backgroundColor: designTokens.colors.warning[50]
    },

    error: {
      borderColor: designTokens.colors.error[200],
      backgroundColor: designTokens.colors.error[50]
    },

    info: {
      borderColor: designTokens.colors.info[200],
      backgroundColor: designTokens.colors.info[50]
    }
  },

  sizes: {
    sm: {
      padding: designTokens.spacing[3]
    },
    md: {
      padding: designTokens.spacing[4]
    },
    lg: {
      padding: designTokens.spacing[6]
    },
    xl: {
      padding: designTokens.spacing[8]
    }
  }
} as const;

// =============================================================================
// INPUT VARIANTS
// =============================================================================

export const inputVariants = {
  base: {
    width: '100%',
    borderRadius: designTokens.borderRadius.md,
    border: '1px solid var(--color-border-medium)',
    backgroundColor: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
    fontSize: designTokens.typography.fontSize.base[0],
    transition: 'all 200ms ease-in-out',
    outline: 'none',
    '&::placeholder': {
      color: 'var(--color-text-tertiary)'
    },
    '&:focus': {
      borderColor: 'var(--color-border-focus)',
      boxShadow: `0 0 0 3px var(--color-border-focus, ${designTokens.colors.primary[500]})20`
    }
  },

  variants: {
    default: {},
    
    filled: {
      backgroundColor: 'var(--color-background-secondary)',
      border: 'none',
      '&:focus': {
        backgroundColor: 'var(--color-background-primary)',
        boxShadow: `0 0 0 2px var(--color-border-focus, ${designTokens.colors.primary[500]})`
      }
    },

    flushed: {
      borderRadius: '0',
      border: 'none',
      borderBottom: '1px solid var(--color-border-medium)',
      backgroundColor: 'transparent',
      '&:focus': {
        borderBottomColor: 'var(--color-border-focus)',
        boxShadow: `0 1px 0 0 var(--color-border-focus, ${designTokens.colors.primary[500]})`
      }
    }
  },

  sizes: {
    sm: {
      height: designTokens.componentSizes.sm.height,
      padding: `0 ${designTokens.spacing[3]}`,
      fontSize: designTokens.componentSizes.sm.fontSize
    },
    md: {
      height: designTokens.componentSizes.md.height,
      padding: `0 ${designTokens.spacing[4]}`,
      fontSize: designTokens.componentSizes.md.fontSize
    },
    lg: {
      height: designTokens.componentSizes.lg.height,
      padding: `0 ${designTokens.spacing[5]}`,
      fontSize: designTokens.componentSizes.lg.fontSize
    }
  },

  states: {
    error: {
      borderColor: designTokens.colors.error[500],
      '&:focus': {
        borderColor: designTokens.colors.error[500],
        boxShadow: `0 0 0 3px ${designTokens.colors.error[500]}20`
      }
    },
    success: {
      borderColor: designTokens.colors.success[500],
      '&:focus': {
        borderColor: designTokens.colors.success[500],
        boxShadow: `0 0 0 3px ${designTokens.colors.success[500]}20`
      }
    },
    disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
      backgroundColor: 'var(--color-background-tertiary)'
    }
  }
} as const;

// =============================================================================
// BADGE VARIANTS
// =============================================================================

export const badgeVariants = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: designTokens.borderRadius.full,
    fontWeight: designTokens.typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: designTokens.typography.letterSpacing.wide,
    whiteSpace: 'nowrap'
  },

  variants: {
    primary: {
      backgroundColor: designTokens.colors.primary[100],
      color: designTokens.colors.primary[800]
    },
    secondary: {
      backgroundColor: designTokens.colors.gray[100],
      color: designTokens.colors.gray[800]
    },
    success: {
      backgroundColor: designTokens.colors.success[100],
      color: designTokens.colors.success[800]
    },
    warning: {
      backgroundColor: designTokens.colors.warning[100],
      color: designTokens.colors.warning[800]
    },
    error: {
      backgroundColor: designTokens.colors.error[100],
      color: designTokens.colors.error[800]
    },
    info: {
      backgroundColor: designTokens.colors.info[100],
      color: designTokens.colors.info[800]
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border-medium)'
    }
  },

  sizes: {
    sm: {
      padding: `${designTokens.spacing[0.5]} ${designTokens.spacing[2]}`,
      fontSize: designTokens.typography.fontSize.xs[0],
      height: designTokens.spacing[5]
    },
    md: {
      padding: `${designTokens.spacing[1]} ${designTokens.spacing[2.5]}`,
      fontSize: designTokens.typography.fontSize.sm[0],
      height: designTokens.spacing[6]
    },
    lg: {
      padding: `${designTokens.spacing[1.5]} ${designTokens.spacing[3]}`,
      fontSize: designTokens.typography.fontSize.base[0],
      height: designTokens.spacing[7]
    }
  }
} as const;

// =============================================================================
// MODAL VARIANTS
// =============================================================================

export const modalVariants = {
  overlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'var(--color-background-overlay)',
    zIndex: designTokens.zIndex.modal,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing[4]
  },

  content: {
    backgroundColor: 'var(--color-background-primary)',
    borderRadius: designTokens.borderRadius.lg,
    boxShadow: designTokens.shadows['2xl'],
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    width: '100%',
    outline: 'none'
  },

  sizes: {
    xs: { maxWidth: '320px' },
    sm: { maxWidth: '384px' },
    md: { maxWidth: '448px' },
    lg: { maxWidth: '512px' },
    xl: { maxWidth: '576px' },
    '2xl': { maxWidth: '672px' },
    '3xl': { maxWidth: '768px' },
    '4xl': { maxWidth: '896px' },
    '5xl': { maxWidth: '1024px' },
    '6xl': { maxWidth: '1152px' },
    full: { maxWidth: '100vw', maxHeight: '100vh', borderRadius: '0' }
  }
} as const;

// =============================================================================
// TABLE VARIANTS
// =============================================================================

export const tableVariants = {
  base: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'var(--color-background-primary)'
  },

  variants: {
    simple: {
      border: 'none'
    },
    striped: {
      '& tbody tr:nth-child(even)': {
        backgroundColor: 'var(--color-background-secondary)'
      }
    },
    bordered: {
      border: '1px solid var(--color-border-light)',
      '& th, & td': {
        border: '1px solid var(--color-border-light)'
      }
    }
  },

  sizes: {
    sm: {
      '& th, & td': {
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        fontSize: designTokens.typography.fontSize.sm[0]
      }
    },
    md: {
      '& th, & td': {
        padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
        fontSize: designTokens.typography.fontSize.base[0]
      }
    },
    lg: {
      '& th, & td': {
        padding: `${designTokens.spacing[4]} ${designTokens.spacing[6]}`,
        fontSize: designTokens.typography.fontSize.lg[0]
      }
    }
  }
} as const;

// =============================================================================
// LOADING VARIANTS
// =============================================================================

export const loadingVariants = {
  spinner: {
    base: {
      border: '2px solid transparent',
      borderTop: '2px solid currentColor',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    sizes: {
      xs: { width: '12px', height: '12px' },
      sm: { width: '16px', height: '16px' },
      md: { width: '20px', height: '20px' },
      lg: { width: '24px', height: '24px' },
      xl: { width: '32px', height: '32px' }
    }
  },

  pulse: {
    base: {
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    },
    variants: {
      circle: { borderRadius: '50%' },
      rectangle: { borderRadius: designTokens.borderRadius.md },
      text: { height: '1em', borderRadius: designTokens.borderRadius.sm }
    }
  },

  skeleton: {
    base: {
      backgroundColor: 'var(--color-background-secondary)',
      backgroundImage: 'linear-gradient(90deg, transparent, var(--color-background-tertiary), transparent)',
      backgroundSize: '200px 100%',
      backgroundRepeat: 'no-repeat',
      animation: 'skeleton-loading 1.5s ease-in-out infinite'
    }
  }
} as const;

// =============================================================================
// VARIANT UTILITY TYPES
// =============================================================================

export type ButtonVariant = keyof typeof buttonVariants.variants;
export type ButtonSize = keyof typeof buttonVariants.sizes;
export type CardVariant = keyof typeof cardVariants.variants;
export type CardSize = keyof typeof cardVariants.sizes;
export type InputVariant = keyof typeof inputVariants.variants;
export type InputSize = keyof typeof inputVariants.sizes;
export type BadgeVariant = keyof typeof badgeVariants.variants;
export type BadgeSize = keyof typeof badgeVariants.sizes;
export type ModalSize = keyof typeof modalVariants.sizes;
export type TableVariant = keyof typeof tableVariants.variants;
export type TableSize = keyof typeof tableVariants.sizes;

// =============================================================================
// VARIANT UTILITIES
// =============================================================================

export const getVariantStyles = <T extends Record<string, any>>(
  variants: T,
  variant: keyof T,
  fallback: keyof T = 'default' as keyof T
): T[keyof T] => {
  return variants[variant] || variants[fallback] || ({} as T[keyof T]);
};

export const combineVariants = <T extends Record<string, any>>(
  base: T,
  ...variants: Partial<T>[]
): T => {
  return Object.assign({}, base, ...variants);
};

// Export all variants
export const variants = {
  button: buttonVariants,
  card: cardVariants,
  input: inputVariants,
  badge: badgeVariants,
  modal: modalVariants,
  table: tableVariants,
  loading: loadingVariants
} as const;