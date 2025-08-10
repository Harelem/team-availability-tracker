/**
 * Enhanced Card Component
 * 
 * A flexible card component with support for different variants, sizes,
 * and interactive states. Follows the design system patterns.
 */

import React, { forwardRef, ReactNode } from 'react';
import { cx } from '@/design-system/theme';
import { CardVariant, CardSize } from '@/design-system/variants';

// =============================================================================
// TYPES
// =============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  interactive?: boolean;
  className?: string;
  testId?: string;
}

export interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

// =============================================================================
// MAIN CARD COMPONENT
// =============================================================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      interactive = false,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    // Enhanced base styles with professional polish
    const baseClasses = cx(
      'bg-white dark:bg-gray-800 rounded-lg border overflow-hidden',
      'transition-all duration-300 ease-out will-change-transform',
      'transform-gpu backface-hidden',
      'motion-reduce:transition-none motion-reduce:transform-none'
    );

    // Enhanced variant styles with professional animations
    const variantClasses = {
      default: cx(
        'shadow-sm border-gray-200 dark:border-gray-700',
        'hover:shadow-md hover:border-gray-300'
      ),
      elevated: cx(
        'shadow-md border-gray-200 dark:border-gray-700',
        'hover:shadow-xl hover:-translate-y-1 hover:scale-[1.005]',
        'hover:border-gray-300 dark:hover:border-gray-600',
        'transition-all duration-300 ease-out'
      ),
      outlined: cx(
        'shadow-none border-gray-300 dark:border-gray-600',
        'hover:border-gray-400 hover:shadow-sm'
      ),
      filled: cx(
        'bg-gray-50 dark:bg-gray-900 border-transparent shadow-none',
        'dark:text-gray-100',
        'hover:bg-gray-100 dark:hover:bg-gray-800'
      ),
      interactive: cx(
        'cursor-pointer shadow-sm border-gray-200 dark:border-gray-700',
        'hover:shadow-xl hover:-translate-y-2 hover:scale-[1.01]',
        'hover:border-gray-300 dark:hover:border-gray-600',
        'active:translate-y-0 active:scale-100 active:shadow-lg',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
        'focus-within:ring-opacity-50',
        'transition-all duration-300 ease-out',
        'motion-reduce:hover:transform-none motion-reduce:active:transform-none'
      ),
      success: cx(
        'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50',
        'dark:text-green-100 shadow-sm shadow-green-500/10',
        'hover:bg-green-50 hover:shadow-md hover:shadow-green-500/15'
      ),
      warning: cx(
        'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/50',
        'dark:text-yellow-100 shadow-sm shadow-yellow-500/10',
        'hover:bg-yellow-50 hover:shadow-md hover:shadow-yellow-500/15'
      ),
      error: cx(
        'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50',
        'dark:text-red-100 shadow-sm shadow-red-500/10',
        'hover:bg-red-50 hover:shadow-md hover:shadow-red-500/15'
      ),
      info: cx(
        'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50',
        'dark:text-blue-100 shadow-sm shadow-blue-500/10',
        'hover:bg-blue-50 hover:shadow-md hover:shadow-blue-500/15'
      )
    };

    // Size styles
    const sizeClasses = {
      sm: '',
      md: '',
      lg: '',
      xl: ''
    };

    const cardClasses = cx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      (interactive && variant !== 'interactive') ? cx(
        'cursor-pointer',
        'hover:shadow-lg hover:-translate-y-1 hover:scale-[1.005]',
        'hover:border-gray-300 dark:hover:border-gray-600',
        'active:translate-y-0 active:scale-100 active:shadow-md',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
        'focus-within:ring-opacity-50',
        'transition-all duration-300 ease-out',
        'motion-reduce:hover:transform-none motion-reduce:active:transform-none'
      ) : '',
      className
    );

    return (
      <div
        ref={ref}
        className={cardClasses}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// =============================================================================
// CARD HEADER
// =============================================================================

export const CardHeader: React.FC<CardHeaderProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cx(
      'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
      'bg-gradient-to-r from-gray-50/80 to-gray-100/50',
      'dark:from-gray-800/80 dark:to-gray-700/50',
      'backdrop-blur-sm',
      className
    )}>
      {children}
    </div>
  );
};

// =============================================================================
// CARD TITLE
// =============================================================================

export const CardTitle: React.FC<CardTitleProps> = ({ 
  children, 
  className,
  as: Component = 'h3'
}) => {
  return (
    <Component className={cx(
      'text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight',
      'tracking-tight',
      className
    )}>
      {children}
    </Component>
  );
};

// =============================================================================
// CARD DESCRIPTION
// =============================================================================

export const CardDescription: React.FC<CardDescriptionProps> = ({ 
  children, 
  className 
}) => {
  return (
    <p className={cx(
      'mt-1 text-sm text-gray-600 dark:text-gray-400',
      'leading-relaxed',
      className
    )}>
      {children}
    </p>
  );
};

// =============================================================================
// CARD CONTENT
// =============================================================================

export const CardContent: React.FC<CardContentProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cx('px-6 py-4', className)}>
      {children}
    </div>
  );
};

// =============================================================================
// CARD FOOTER
// =============================================================================

export const CardFooter: React.FC<CardFooterProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cx(
      'px-6 py-4 border-t border-gray-200 dark:border-gray-700',
      'bg-gradient-to-r from-gray-50/90 to-gray-100/60',
      'dark:from-gray-800/90 dark:to-gray-700/60',
      'flex items-center justify-between',
      'backdrop-blur-sm',
      className
    )}>
      {children}
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export type { CardVariant, CardSize };
export default Card;