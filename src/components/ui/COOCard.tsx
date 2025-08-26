/**
 * COO Card Component
 * 
 * Specialized metric card component for COO dashboard
 * Displays key performance metrics with consistent styling
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cx } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface COOMetricCardProps {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  className?: string;
  onClick?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const COOMetricCard: React.FC<COOMetricCardProps> = ({
  title,
  value,
  trend,
  trendDirection,
  icon: Icon,
  variant = 'primary',
  status = 'good',
  className,
  onClick
}) => {
  const isInteractive = !!onClick;

  // Status color mappings
  const statusColors = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200'
  };

  // Icon color mappings
  const iconColors = {
    excellent: 'text-green-600',
    good: 'text-blue-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600'
  };

  const baseClasses = cx(
    'p-4 rounded-lg border transition-all duration-200',
    'bg-white dark:bg-gray-800',
    'border-gray-200 dark:border-gray-700',
    isInteractive && 'cursor-pointer hover:shadow-md hover:border-gray-300',
    className
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={baseClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? 'button' : 'presentation'}
      tabIndex={isInteractive ? 0 : -1}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </h3>
        {Icon && (
          <Icon 
            className={cx(
              'w-5 h-5', 
              iconColors[status]
            )} 
          />
        )}
      </div>
      
      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {trend && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {trend}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export default COOMetricCard;