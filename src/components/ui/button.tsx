/**
 * Enhanced Button Component
 * 
 * A comprehensive button component with support for multiple variants, sizes,
 * loading states, icons, and full accessibility features.
 */

import React, { forwardRef, ReactNode } from 'react';
import { cx } from '@/design-system/theme';
import { ButtonVariant, ButtonSize } from '@/design-system/variants';

// =============================================================================
// TYPES
// =============================================================================

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
  className?: string;
  testId?: string;
}

// =============================================================================
// LOADING SPINNER COMPONENT
// =============================================================================

const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  return (
    <div
      className={cx(
        'animate-spin rounded-full',
        'border-2 border-current border-t-transparent',
        'motion-reduce:animate-pulse motion-reduce:border-solid',
        // Enhanced spinner with subtle styling
        'drop-shadow-sm opacity-90',
        sizeClasses[size]
      )}
      aria-hidden="true"
      role="presentation"
      style={{
        animation: 'spin 0.8s linear infinite'
      }}
    >
      <span className="sr-only">Loading</span>
    </div>
  );
};

// =============================================================================
// BUTTON COMPONENT
// =============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      iconOnly = false,
      fullWidth = false,
      disabled = false,
      className,
      testId,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // =============================================================================
    // STYLES
    // =============================================================================

    const baseClasses = cx(
      // Enhanced base layout with professional styling
      'inline-flex items-center justify-center',
      'font-semibold text-sm leading-tight',
      'border relative overflow-hidden',
      'cursor-pointer select-none outline-none',
      
      // Professional transitions and transforms
      'transition-all duration-200 ease-out',
      'transform will-change-transform',
      'active:scale-[0.96] active:duration-75',
      
      // Enhanced hover effects
      'hover:shadow-lg hover:-translate-y-0.5',
      'hover:duration-150',
      
      // Professional focus styles
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'focus-visible:ring-2 focus-visible:ring-offset-2',
      
      // Improved disabled states
      'disabled:opacity-60 disabled:cursor-not-allowed',
      'disabled:transform-none disabled:shadow-none',
      'disabled:hover:shadow-none disabled:hover:transform-none',
      
      // Accessibility and reduced motion
      'motion-reduce:transition-none motion-reduce:transform-none',
      
      // Mobile optimizations
      'touch-manipulation',
      'min-h-[44px]' // Minimum touch target
    );

    const variantClasses = {
      primary: cx(
        'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600',
        'shadow-sm shadow-blue-500/20',
        'hover:from-blue-700 hover:to-blue-800 hover:border-blue-700',
        'hover:shadow-md hover:shadow-blue-500/25',
        'active:from-blue-800 active:to-blue-900',
        'focus:ring-blue-500 focus:ring-opacity-50',
        'disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none'
      ),
      secondary: cx(
        'bg-white text-gray-700 border-gray-300 shadow-sm',
        'hover:bg-gray-50 hover:border-gray-400 hover:text-gray-800',
        'hover:shadow-md hover:shadow-gray-200/50',
        'active:bg-gray-100 active:border-gray-500',
        'focus:ring-gray-500 focus:ring-opacity-50'
      ),
      outline: cx(
        'bg-transparent text-blue-600 border-2 border-blue-600',
        'hover:bg-blue-50 hover:border-blue-700 hover:text-blue-700',
        'hover:shadow-md hover:shadow-blue-500/20',
        'active:bg-blue-100 active:border-blue-800',
        'focus:ring-blue-500 focus:ring-opacity-50'
      ),
      ghost: cx(
        'bg-transparent text-gray-700 border-transparent',
        'hover:bg-gray-100 hover:text-gray-800',
        'hover:shadow-sm',
        'active:bg-gray-200',
        'focus:ring-gray-500 focus:ring-opacity-50'
      ),
      link: cx(
        'bg-transparent text-blue-600 border-transparent p-0 shadow-none',
        'hover:text-blue-800 hover:underline hover:decoration-2',
        'hover:shadow-none hover:transform-none',
        'active:text-blue-900',
        'focus:ring-blue-500 focus:ring-opacity-50',
        'underline-offset-4 transition-colors duration-150'
      ),
      success: cx(
        'bg-gradient-to-r from-green-600 to-green-700 text-white border-green-600',
        'shadow-sm shadow-green-500/20',
        'hover:from-green-700 hover:to-green-800 hover:border-green-700',
        'hover:shadow-md hover:shadow-green-500/25',
        'active:from-green-800 active:to-green-900',
        'focus:ring-green-500 focus:ring-opacity-50'
      ),
      warning: cx(
        'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-500',
        'shadow-sm shadow-yellow-500/20',
        'hover:from-yellow-600 hover:to-yellow-700 hover:border-yellow-600',
        'hover:shadow-md hover:shadow-yellow-500/25',
        'active:from-yellow-700 active:to-yellow-800',
        'focus:ring-yellow-500 focus:ring-opacity-50'
      ),
      error: cx(
        'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-600',
        'shadow-sm shadow-red-500/20',
        'hover:from-red-700 hover:to-red-800 hover:border-red-700',
        'hover:shadow-md hover:shadow-red-500/25',
        'active:from-red-800 active:to-red-900',
        'focus:ring-red-500 focus:ring-opacity-50'
      )
    };

    const sizeClasses = {
      xs: cx(
        'h-8 px-3 text-xs rounded-md', // Increased from h-6 for better accessibility
        'min-h-[32px]', // Minimum touch target
        iconOnly ? 'w-8 min-w-[32px]' : 'min-w-[64px]',
        'gap-1 font-medium'
      ),
      sm: cx(
        'h-9 px-4 text-sm rounded-md',
        'min-h-[36px]', // Better mobile touch target
        iconOnly ? 'w-9 min-w-[36px]' : 'min-w-[80px]',
        'gap-1.5 font-medium'
      ),
      md: cx(
        'h-11 px-5 text-sm rounded-lg',
        'min-h-[44px]', // Optimal mobile touch target
        iconOnly ? 'w-11 min-w-[44px]' : 'min-w-[100px]',
        'gap-2 font-semibold'
      ),
      lg: cx(
        'h-12 px-6 text-base rounded-lg',
        'min-h-[48px]', // Comfortable touch target
        iconOnly ? 'w-12 min-w-[48px]' : 'min-w-[120px]',
        'gap-2.5 font-semibold'
      ),
      xl: cx(
        'h-14 px-8 text-lg rounded-xl',
        'min-h-[56px]', // Large touch target
        iconOnly ? 'w-14 min-w-[56px]' : 'min-w-[140px]',
        'gap-3 font-semibold'
      )
    };

    const buttonClasses = cx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? 'w-full justify-center' : '',
      loading ? cx(
        'cursor-wait pointer-events-none',
        'opacity-80',
        'transform-none hover:transform-none', // Disable hover effects when loading
        'shadow-sm' // Reduce shadow when loading
      ) : '',
      disabled ? cx(
        'transform-none hover:transform-none',
        'shadow-none hover:shadow-none'
      ) : '',
      className
    );

    // =============================================================================
    // CONTENT RENDERING
    // =============================================================================

    const renderContent = () => {
      if (loading) {
        return (
          <>
            <LoadingSpinner size={size} />
            {loadingText && !iconOnly && (
              <span className="ml-2">{loadingText}</span>
            )}
          </>
        );
      }

      return (
        <>
          {leftIcon && (
            <span 
              className={cx(
                'flex-shrink-0',
                (!iconOnly && children) ? 'mr-2' : ''
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          
          {!iconOnly && children && (
            <span className="truncate">{children}</span>
          )}
          
          {rightIcon && (
            <span 
              className={cx(
                'flex-shrink-0',
                (!iconOnly && children) ? 'ml-2' : ''
              )}
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </>
      );
    };

    // =============================================================================
    // ACCESSIBILITY
    // =============================================================================

    const accessibilityProps = {
      'aria-disabled': disabled || loading,
      'aria-busy': loading,
      'data-testid': testId
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={disabled || loading}
        {...accessibilityProps}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

Button.displayName = 'Button';

// =============================================================================
// BUTTON GROUP COMPONENT
// =============================================================================

export interface ButtonGroupProps {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  attached?: boolean;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  attached = false,
  spacing = 'sm',
  className
}) => {
  const spacingClasses = {
    none: '',
    sm: orientation === 'horizontal' ? 'space-x-2' : 'space-y-2',
    md: orientation === 'horizontal' ? 'space-x-3' : 'space-y-3',
    lg: orientation === 'horizontal' ? 'space-x-4' : 'space-y-4'
  };

  const groupClasses = cx(
    'inline-flex',
    orientation === 'horizontal' ? 'flex-row' : 'flex-col',
    !attached ? spacingClasses[spacing] : '',
    // Attached button styles
    (attached && orientation === 'horizontal') ? 
      '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:-ml-px' : '',
    (attached && orientation === 'vertical') ?
      '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:-mt-px' : '',
    className
  );

  return (
    <div className={groupClasses} role="group">
      {children}
    </div>
  );
};

// =============================================================================
// ICON BUTTON COMPONENT
// =============================================================================

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon' | 'iconOnly'> {
  icon: ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        iconOnly
        leftIcon={icon}
        {...props}
      >
        {/* Empty children for iconOnly button */}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// =============================================================================
// EXPORTS
// =============================================================================

export type { ButtonVariant, ButtonSize };
export default Button;