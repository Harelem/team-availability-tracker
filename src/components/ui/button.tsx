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
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  return (
    <div
      className={cx(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        sizeClasses[size]
      )}
      aria-hidden="true"
    />
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
      // Base layout and interaction
      'inline-flex items-center justify-center',
      'font-medium transition-all duration-200 ease-in-out',
      'cursor-pointer select-none outline-none',
      'border relative overflow-hidden',
      
      // Focus styles
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      
      // Disabled styles
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
    );

    const variantClasses = {
      primary: cx(
        'bg-blue-600 text-white border-blue-600',
        'hover:bg-blue-700 hover:border-blue-700',
        'active:bg-blue-800 active:border-blue-800',
        'focus:ring-blue-500'
      ),
      secondary: cx(
        'bg-gray-100 text-gray-900 border-gray-300',
        'hover:bg-gray-200 hover:border-gray-400',
        'active:bg-gray-300 active:border-gray-500',
        'focus:ring-gray-500'
      ),
      outline: cx(
        'bg-transparent text-blue-600 border-blue-600',
        'hover:bg-blue-50 hover:border-blue-700',
        'active:bg-blue-100 active:border-blue-800',
        'focus:ring-blue-500'
      ),
      ghost: cx(
        'bg-transparent text-gray-700 border-transparent',
        'hover:bg-gray-100 hover:border-transparent',
        'active:bg-gray-200 active:border-transparent',
        'focus:ring-gray-500'
      ),
      link: cx(
        'bg-transparent text-blue-600 border-transparent',
        'hover:text-blue-800 hover:underline',
        'active:text-blue-900',
        'focus:ring-blue-500',
        'underline-offset-4'
      ),
      success: cx(
        'bg-green-600 text-white border-green-600',
        'hover:bg-green-700 hover:border-green-700',
        'active:bg-green-800 active:border-green-800',
        'focus:ring-green-500'
      ),
      warning: cx(
        'bg-yellow-600 text-white border-yellow-600',
        'hover:bg-yellow-700 hover:border-yellow-700',
        'active:bg-yellow-800 active:border-yellow-800',
        'focus:ring-yellow-500'
      ),
      error: cx(
        'bg-red-600 text-white border-red-600',
        'hover:bg-red-700 hover:border-red-700',
        'active:bg-red-800 active:border-red-800',
        'focus:ring-red-500'
      )
    };

    const sizeClasses = {
      xs: cx(
        'h-6 px-2 text-xs rounded',
        iconOnly ? 'w-6' : 'min-w-6',
        'gap-1'
      ),
      sm: cx(
        'h-8 px-3 text-sm rounded-md',
        iconOnly ? 'w-8' : 'min-w-8',
        'gap-1.5'
      ),
      md: cx(
        'h-10 px-4 text-sm rounded-md',
        iconOnly ? 'w-10' : 'min-w-10',
        'gap-2'
      ),
      lg: cx(
        'h-12 px-6 text-base rounded-lg',
        iconOnly ? 'w-12' : 'min-w-12',
        'gap-2'
      ),
      xl: cx(
        'h-14 px-8 text-lg rounded-lg',
        iconOnly ? 'w-14' : 'min-w-14',
        'gap-3'
      )
    };

    const buttonClasses = cx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? 'w-full' : '',
      loading ? 'opacity-80 cursor-wait' : '',
      (!disabled && !loading) ? 'active:scale-95' : '',
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