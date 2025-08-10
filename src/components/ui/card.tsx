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
    // Base styles
    const baseClasses = cx(
      'bg-white rounded-lg border overflow-hidden',
      'transition-all duration-200 ease-in-out'
    );

    // Variant styles
    const variantClasses = {
      default: 'shadow-sm border-gray-200',
      elevated: 'shadow-md border-gray-200',
      outlined: 'shadow-none border-gray-300',
      filled: 'bg-gray-50 border-transparent shadow-none',
      interactive: cx(
        'cursor-pointer shadow-sm border-gray-200',
        'hover:shadow-md hover:-translate-y-0.5',
        'active:translate-y-0 active:shadow-sm'
      ),
      success: 'border-green-200 bg-green-50',
      warning: 'border-yellow-200 bg-yellow-50',
      error: 'border-red-200 bg-red-50',
      info: 'border-blue-200 bg-blue-50'
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
      (interactive && variant !== 'interactive') ? 'hover:shadow-md hover:-translate-y-0.5' : '',
      (interactive && variant !== 'interactive') ? 'active:translate-y-0 active:shadow-sm' : '',
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
    <div className={cx('px-6 py-4 border-b border-gray-200', className)}>
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
    <Component className={cx('text-lg font-semibold text-gray-900 leading-tight', className)}>
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
    <p className={cx('mt-1 text-sm text-gray-600', className)}>
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
      'px-6 py-4 border-t border-gray-200 bg-gray-50',
      'flex items-center justify-between',
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