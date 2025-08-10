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
    // Base styles
    const baseClasses = cx(
      'inline-flex items-center justify-center',
      'font-medium text-xs uppercase tracking-wide',
      'rounded-full border whitespace-nowrap',
      'transition-all duration-200 ease-in-out',
      pulse ? 'animate-pulse' : ''
    );

    // Variant styles
    const variantClasses = {
      primary: 'bg-blue-100 text-blue-800 border-blue-200',
      secondary: 'bg-gray-100 text-gray-800 border-gray-200',
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      outline: 'bg-transparent text-gray-700 border-gray-300 hover:bg-gray-50'
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