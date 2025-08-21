/**
 * Enhanced Badge Component
 * 
 * A flexible badge component with multiple variants, sizes, and styling options.
 * Integrates with the design system for consistent appearance.
 */

import React, { forwardRef, ReactNode } from 'react';
import { cx } from '@/design-system/theme';
import { BadgeVariant, BadgeSize } from '@/design-system/variants';
import { X } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  removable?: boolean;
  onRemove?: () => void;
  icon?: ReactNode;
  pulse?: boolean;
  className?: string;
  testId?: string;
}

// =============================================================================
// BADGE COMPONENT
// =============================================================================

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      removable = false,
      onRemove,
      icon,
      pulse = false,
      className,
      testId
    },
    ref
  ) => {
    // Enhanced base styles with professional polish
    const baseClasses = cx(
      'inline-flex items-center justify-center',
      'font-medium text-xs uppercase tracking-wider',
      'rounded-full border-2 whitespace-nowrap',
      'transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1)',
      'transform will-change-transform',
      'hover:scale-105 hover:shadow-md',
      'active:scale-95 active:duration-75',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      'motion-reduce:transition-none motion-reduce:transform-none',
      'backdrop-blur-sm shadow-sm',
      pulse ? 'animate-pulse' : ''
    );

    // Enhanced variant styles with WCAG AA compliance and professional gradients
    const variantClasses = {
      primary: cx(
        'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 border-blue-300',
        'dark:from-blue-900/30 dark:to-blue-800/20 dark:text-blue-200 dark:border-blue-700',
        'hover:from-blue-100 hover:to-blue-150 hover:border-blue-400',
        'focus:ring-blue-500 focus:ring-opacity-50'
      ),
      secondary: cx(
        'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 border-gray-300',
        'dark:from-gray-800 dark:to-gray-700 dark:text-gray-200 dark:border-gray-600',
        'hover:from-gray-100 hover:to-gray-150 hover:border-gray-400',
        'focus:ring-gray-500 focus:ring-opacity-50'
      ),
      success: cx(
        'bg-gradient-to-br from-green-50 to-green-100 text-green-900 border-green-300',
        'dark:from-green-900/30 dark:to-green-800/20 dark:text-green-200 dark:border-green-700',
        'hover:from-green-100 hover:to-green-150 hover:border-green-400',
        'focus:ring-green-500 focus:ring-opacity-50'
      ),
      warning: cx(
        'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-900 border-yellow-300',
        'dark:from-yellow-900/30 dark:to-yellow-800/20 dark:text-yellow-200 dark:border-yellow-700',
        'hover:from-yellow-100 hover:to-yellow-150 hover:border-yellow-400',
        'focus:ring-yellow-500 focus:ring-opacity-50'
      ),
      error: cx(
        'bg-gradient-to-br from-red-50 to-red-100 text-red-900 border-red-300',
        'dark:from-red-900/30 dark:to-red-800/20 dark:text-red-200 dark:border-red-700',
        'hover:from-red-100 hover:to-red-150 hover:border-red-400',
        'focus:ring-red-500 focus:ring-opacity-50'
      ),
      info: cx(
        'bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-900 border-cyan-300',
        'dark:from-cyan-900/30 dark:to-cyan-800/20 dark:text-cyan-200 dark:border-cyan-700',
        'hover:from-cyan-100 hover:to-cyan-150 hover:border-cyan-400',
        'focus:ring-cyan-500 focus:ring-opacity-50'
      ),
      outline: cx(
        'bg-transparent text-gray-800 border-gray-400',
        'dark:text-gray-200 dark:border-gray-500',
        'hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:border-gray-500',
        'dark:hover:from-gray-800 dark:hover:to-gray-700',
        'focus:ring-gray-500 focus:ring-opacity-50'
      )
    };

    // Size styles
    const sizeClasses = {
      sm: cx(
        'px-2 py-0.5 text-xs h-5',
        icon ? 'gap-1' : '',
        removable ? 'pr-1' : ''
      ),
      md: cx(
        'px-2.5 py-1 text-xs h-6',
        icon ? 'gap-1.5' : '',
        removable ? 'pr-1.5' : ''
      ),
      lg: cx(
        'px-3 py-1.5 text-sm h-7',
        icon ? 'gap-2' : '',
        removable ? 'pr-2' : ''
      )
    };

    // Icon sizes
    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4'
    };

    const badgeClasses = cx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    return (
      <span
        ref={ref}
        className={badgeClasses}
        data-testid={testId}
      >
        {icon && (
          <span className={cx('flex-shrink-0', iconSizes[size])}>
            {icon}
          </span>
        )}
        
        <span className="truncate">{children}</span>
        
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={cx(
              'ml-1 flex-shrink-0 rounded-full p-0.5',
              'hover:bg-black hover:bg-opacity-10',
              'focus:outline-none focus:ring-1 focus:ring-current',
              'transition-colors duration-150',
              iconSizes[size]
            )}
            aria-label="Remove badge"
          >
            <X className="w-full h-full" />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// =============================================================================
// BADGE GROUP COMPONENT
// =============================================================================

export interface BadgeGroupProps {
  children: ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
  wrap?: boolean;
  className?: string;
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
  children,
  spacing = 'md',
  wrap = true,
  className
}) => {
  const spacingClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3'
  };

  return (
    <div
      className={cx(
        'flex items-center',
        spacingClasses[spacing],
        wrap ? 'flex-wrap' : '',
        className
      )}
    >
      {children}
    </div>
  );
};

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

export interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy' | 'unknown';
  showText?: boolean;
  size?: BadgeSize;
  className?: string;
  testId?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showText = true,
  size = 'md',
  className,
  testId
}) => {
  const statusConfig = {
    online: { variant: 'success' as BadgeVariant, text: 'Online', color: 'bg-green-500' },
    offline: { variant: 'secondary' as BadgeVariant, text: 'Offline', color: 'bg-gray-500' },
    away: { variant: 'warning' as BadgeVariant, text: 'Away', color: 'bg-yellow-500' },
    busy: { variant: 'error' as BadgeVariant, text: 'Busy', color: 'bg-red-500' },
    unknown: { variant: 'outline' as BadgeVariant, text: 'Unknown', color: 'bg-gray-400' }
  };

  const config = statusConfig[status];

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  return (
    <Badge
      variant={config.variant}
      size={size}
      className={className}
      testId={testId}
      icon={
        <span
          className={cx(
            'rounded-full',
            dotSizes[size],
            config.color
          )}
        />
      }
    >
      {showText ? config.text : ''}
    </Badge>
  );
};

// =============================================================================
// NOTIFICATION BADGE COMPONENT
// =============================================================================

export interface NotificationBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  size?: BadgeSize;
  className?: string;
  testId?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  max = 99,
  showZero = false,
  size = 'sm',
  className,
  testId
}) => {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant="error"
      size={size}
      className={cx('min-w-fit', className)}
      testId={testId}
    >
      {displayCount}
    </Badge>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export type { BadgeVariant, BadgeSize };
export default Badge;