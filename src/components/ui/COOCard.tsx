'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn, getStatusStyles, createComponentClass } from '@/lib/cooDesignSystem';

// =============================================================================
// TYPES
// =============================================================================

export interface COOCardProps {
  // Content
  title?: string;
  subtitle?: string;
  description?: string;
  children?: React.ReactNode;
  
  // Styling
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  elevated?: boolean;
  gradient?: boolean;
  
  // Header Configuration
  icon?: LucideIcon;
  iconColor?: string;
  headerAction?: React.ReactNode;
  
  // Footer Configuration
  footer?: React.ReactNode;
  
  // Status and Metadata
  status?: 'excellent' | 'good' | 'warning' | 'critical' | 'neutral';
  badge?: {
    text: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  };
  
  // Layout
  fullWidth?: boolean;
  className?: string;
  
  // Interaction
  onClick?: () => void;
  href?: string;
  
  // Loading State
  loading?: boolean;
  
  // Accessibility
  'aria-label'?: string;
  role?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function COOCard({
  title,
  subtitle,
  description,
  children,
  variant = 'default',
  size = 'md',
  interactive = false,
  elevated = false,
  gradient = false,
  icon: Icon,
  iconColor,
  headerAction,
  footer,
  status,
  badge,
  fullWidth = false,
  className,
  onClick,
  href,
  loading = false,
  'aria-label': ariaLabel,
  role,
}: COOCardProps) {
  
  // =============================================================================
  // STYLING COMPUTATION
  // =============================================================================
  
  const cardClasses = cn(
    // Base card styles
    createComponentClass('card', variant, size),
    
    // Interactive states
    interactive && 'cursor-pointer hover:shadow-md transition-shadow duration-200',
    elevated && 'shadow-md',
    gradient && 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100',
    
    // Layout
    fullWidth && 'w-full',
    
    // Loading state
    loading && 'opacity-60 pointer-events-none',
    
    // Custom classes
    className
  );

  const statusStyles = status ? getStatusStyles(status) : null;
  
  // =============================================================================
  // COMPONENT STRUCTURE
  // =============================================================================
  
  const CardContent = () => (
    <div className={cardClasses} role={role} aria-label={ariaLabel}>
      {/* Status Border */}
      {status && (
        <div 
          className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
          style={{ backgroundColor: statusStyles?.color }}
        />
      )}
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Header Section */}
      {(title || subtitle || Icon || headerAction || badge) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Icon */}
            {Icon && (
              <div className="flex-shrink-0">
                <Icon 
                  className={cn(
                    'w-5 h-5',
                    iconColor || (status ? statusStyles?.text : 'text-blue-600')
                  )} 
                />
              </div>
            )}
            
            {/* Title and Subtitle */}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* Header Actions and Badge */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {badge && (
              <span className={createComponentClass('badge', badge.variant || 'default', 'sm')}>
                {badge.text}
              </span>
            )}
            {headerAction && (
              <div className="flex items-center">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 mb-4">
          {description}
        </p>
      )}
      
      {/* Main Content */}
      {children && (
        <div className="flex-1">
          {children}
        </div>
      )}
      
      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
  
  // =============================================================================
  // RENDERING
  // =============================================================================
  
  // If it's a link, wrap in anchor tag
  if (href) {
    return (
      <a 
        href={href} 
        className="block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        aria-label={ariaLabel}
      >
        <CardContent />
      </a>
    );
  }
  
  // If it's interactive, make it clickable
  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        aria-label={ariaLabel}
      >
        <CardContent />
      </button>
    );
  }
  
  // Default static card
  return <CardContent />;
}

// =============================================================================
// SPECIALIZED CARD VARIANTS
// =============================================================================

export function COOMetricCard({
  title,
  value,
  unit,
  trend,
  trendDirection,
  icon: Icon,
  className,
  ...props
}: {
  title: string;
  value: string | number;
  unit?: string;
  trend?: string | number;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  className?: string;
} & Omit<COOCardProps, 'children' | 'title'>) {
  
  const trendColor = trendDirection === 'up' ? 'text-green-600' : 
                    trendDirection === 'down' ? 'text-red-600' : 
                    'text-gray-600';

  return (
    <COOCard
      title={title}
      icon={Icon}
      className={cn('text-center', className)}
      {...props}
    >
      <div className="space-y-2">
        <div className="text-3xl font-bold text-gray-900">
          {value}
          {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
        </div>
        {trend && (
          <div className={cn('text-sm font-medium', trendColor)}>
            {trend}
          </div>
        )}
      </div>
    </COOCard>
  );
}

export function COOStatCard({
  label,
  value,
  description,
  status,
  className,
  ...props
}: {
  label: string;
  value: string | number;
  description?: string;
  status?: 'excellent' | 'good' | 'warning' | 'critical' | 'neutral';
  className?: string;
} & Omit<COOCardProps, 'children' | 'title'>) {
  
  const statusStyles = status ? getStatusStyles(status) : null;

  return (
    <COOCard
      status={status}
      className={cn('relative', className)}
      {...props}
    >
      <div className="text-center space-y-2">
        <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          {label}
        </div>
        <div className={cn(
          'text-2xl font-bold',
          statusStyles?.text || 'text-gray-900'
        )}>
          {value}
        </div>
        {description && (
          <div className="text-xs text-gray-500">
            {description}
          </div>
        )}
      </div>
    </COOCard>
  );
}

export function COOActionCard({
  title,
  description,
  actionText,
  onAction,
  actionVariant = 'primary',
  actionLoading = false,
  icon: Icon,
  className,
  ...props
}: {
  title: string;
  description?: string;
  actionText: string;
  onAction: () => void;
  actionVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  actionLoading?: boolean;
  icon?: LucideIcon;
  className?: string;
} & Omit<COOCardProps, 'children' | 'title' | 'onClick'>) {

  return (
    <COOCard
      title={title}
      description={description}
      icon={Icon}
      className={className}
      footer={
        <button
          onClick={onAction}
          disabled={actionLoading}
          className={createComponentClass('button', actionVariant, 'md')}
        >
          {actionLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Loading...
            </>
          ) : (
            actionText
          )}
        </button>
      }
      {...props}
    />
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default COOCard;