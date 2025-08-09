/**
 * Universal Mobile Header
 * 
 * Flexible mobile header component that adapts to different contexts:
 * - Week navigation for schedules
 * - Team management controls  
 * - Breadcrumb navigation
 * - Context-aware actions and buttons
 * - Responsive design for various screen sizes
 */

'use client';

import React, { useState, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Eye, 
  ChevronDown, 
  ChevronUp,
  Menu,
  ArrowLeft,
  Home,
  MoreHorizontal,
  Settings,
  Activity
} from 'lucide-react';
import { useTouchFriendly } from '@/hooks/useTouchGestures';
import { useMobileNavigation } from './MobileNavigationProvider';
import { TOUCH_TARGETS } from './NavigationConstants';

// Header Configuration Types
interface HeaderAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  badge?: number;
  hideOnSmallScreens?: boolean;
}

interface BreadcrumbItem {
  id: string;
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface WeekNavigationConfig {
  currentWeekOffset: number;
  onWeekChange: (offset: number) => void;
  getCurrentWeekString: () => string;
  showCurrentButton?: boolean;
}

// Header Props
interface UniversalMobileHeaderProps {
  // Header Type
  variant?: 'simple' | 'week-navigation' | 'breadcrumb' | 'team-context';
  
  // Title and Subtitle
  title?: string;
  subtitle?: string;
  
  // Navigation
  breadcrumbs?: BreadcrumbItem[];
  showBackButton?: boolean;
  onBack?: () => void;
  
  // Week Navigation (for schedule views)
  weekNavigation?: WeekNavigationConfig;
  
  // Team Context
  teamName?: string;
  userName?: string;
  userRole?: string;
  
  // Actions
  actions?: HeaderAction[];
  primaryAction?: HeaderAction;
  
  // Menu
  showMenuButton?: boolean;
  onMenuToggle?: () => void;
  
  // Status
  connectionStatus?: 'online' | 'offline' | 'connecting';
  showStatus?: boolean;
  
  // Additional Info
  additionalInfo?: string;
  expandableDetails?: React.ReactNode;
  
  // Styling
  className?: string;
  sticky?: boolean;
}

// Week Navigation Component
const WeekNavigationControls: React.FC<{ 
  config: WeekNavigationConfig;
  compact?: boolean;
}> = ({ config, compact = false }) => {
  const { getInteractionProps } = useTouchFriendly();
  const { currentWeekOffset, onWeekChange, getCurrentWeekString, showCurrentButton = true } = config;

  return (
    <div className="flex items-center gap-1">
      {/* Previous Week */}
      <button
        {...getInteractionProps(() => onWeekChange(currentWeekOffset - 1), { hapticFeedback: true })}
        className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        style={{ minHeight: TOUCH_TARGETS.MINIMUM }}
        aria-label="Previous week"
      >
        <ChevronLeft className="w-4 h-4" />
        {!compact && <span className="hidden sm:inline">Prev</span>}
      </button>
      
      {/* Current Week Button */}
      {currentWeekOffset !== 0 && showCurrentButton && (
        <button
          {...getInteractionProps(() => onWeekChange(0), { hapticFeedback: true })}
          className="flex items-center gap-1 bg-blue-600 text-white px-2 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          style={{ minHeight: TOUCH_TARGETS.MINIMUM }}
          aria-label="Current week"
        >
          <Calendar className="w-4 h-4" />
          {!compact && <span className="hidden sm:inline">Current</span>}
        </button>
      )}
      
      {/* Next Week */}
      <button
        {...getInteractionProps(() => onWeekChange(currentWeekOffset + 1), { hapticFeedback: true })}
        className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        style={{ minHeight: TOUCH_TARGETS.MINIMUM }}
        aria-label="Next week"
      >
        {!compact && <span className="hidden sm:inline">Next</span>}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// Breadcrumb Navigation Component
const BreadcrumbNavigation: React.FC<{ 
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
}> = ({ items, onNavigate }) => {
  const { getInteractionProps } = useTouchFriendly();

  if (items.length === 0) return null;

  const currentItem = items[items.length - 1];
  const parentItems = items.slice(0, -1);

  return (
    <div className="flex items-center gap-1 min-w-0 flex-1">
      {/* Mobile compact view */}
      <div className="flex sm:hidden items-center gap-1 min-w-0 flex-1">
        {parentItems.length > 0 && (
          <button
            {...getInteractionProps(() => {
              const parent = parentItems[parentItems.length - 1];
              if (parent.path) onNavigate(parent.path);
            })}
            className="text-sm text-gray-500 hover:text-gray-700 truncate max-w-[100px] py-1 px-2 rounded hover:bg-gray-50"
          >
            {parentItems[parentItems.length - 1].label}
          </button>
        )}
        {parentItems.length > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
        <span className="text-sm font-medium text-gray-900 truncate">{currentItem.label}</span>
      </div>

      {/* Desktop full breadcrumb */}
      <div className="hidden sm:flex items-center gap-1 min-w-0 flex-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const IconComponent = item.icon;

          return (
            <React.Fragment key={item.id}>
              <div className="flex items-center gap-1 min-w-0">
                {IconComponent && index === 0 && (
                  <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                
                {item.path && !isLast ? (
                  <button
                    {...getInteractionProps(() => onNavigate(item.path!))}
                    className="text-sm text-blue-600 hover:text-blue-800 truncate max-w-[120px] py-1 px-2 rounded hover:bg-blue-50"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className={`text-sm truncate max-w-[120px] py-1 px-2 rounded ${
                    isLast ? 'text-gray-900 font-medium' : 'text-gray-600'
                  }`}>
                    {item.label}
                  </span>
                )}
              </div>
              {!isLast && <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Action Button Component
const ActionButton: React.FC<{ 
  action: HeaderAction;
  size?: 'small' | 'medium';
}> = ({ action, size = 'medium' }) => {
  const { getInteractionProps } = useTouchFriendly();
  const IconComponent = action.icon;

  const baseClasses = `
    flex items-center gap-1 rounded-lg transition-colors text-sm font-medium relative
    ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
  `;

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  const sizeClasses = {
    small: 'px-2 py-2',
    medium: 'px-3 py-2'
  };

  return (
    <button
      {...getInteractionProps(action.onClick, { hapticFeedback: true })}
      disabled={action.disabled}
      className={`${baseClasses} ${variantClasses[action.variant || 'secondary']} ${sizeClasses[size]}`}
      style={{ 
        minHeight: TOUCH_TARGETS.MINIMUM,
        display: action.hideOnSmallScreens ? { xs: 'none', sm: 'flex' } as any : 'flex'
      }}
      aria-label={action.label}
    >
      <IconComponent className="w-4 h-4" />
      {!action.hideOnSmallScreens && (
        <span className="hidden sm:inline">{action.label}</span>
      )}
      {action.badge && action.badge > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {action.badge > 99 ? '99+' : action.badge}
        </span>
      )}
    </button>
  );
};

// Main Universal Mobile Header Component
const UniversalMobileHeader: React.FC<UniversalMobileHeaderProps> = ({
  variant = 'simple',
  title,
  subtitle,
  breadcrumbs = [],
  showBackButton = false,
  onBack,
  weekNavigation,
  teamName,
  userName,
  userRole,
  actions = [],
  primaryAction,
  showMenuButton = false,
  onMenuToggle,
  connectionStatus,
  showStatus = false,
  additionalInfo,
  expandableDetails,
  className = '',
  sticky = true
}) => {
  const { getInteractionProps } = useTouchFriendly();
  const { navigate, navigateBack, toggleMenu } = useMobileNavigation();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigateBack();
    }
  }, [onBack, navigateBack]);

  const handleMenuToggle = useCallback(() => {
    if (onMenuToggle) {
      onMenuToggle();
    } else {
      toggleMenu();
    }
  }, [onMenuToggle, toggleMenu]);

  return (
    <header className={`
      bg-white border-b border-gray-200 shadow-sm z-30
      ${sticky ? 'sticky top-0' : ''}
      ${className}
    `}>
      {/* Main Header Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left Section */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Back Button */}
            {showBackButton && (
              <button
                {...getInteractionProps(handleBack, { hapticFeedback: true })}
                className="flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                style={{ 
                  minWidth: TOUCH_TARGETS.MINIMUM,
                  minHeight: TOUCH_TARGETS.MINIMUM 
                }}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* Menu Button */}
            {showMenuButton && (
              <button
                {...getInteractionProps(handleMenuToggle, { hapticFeedback: true })}
                className="flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                style={{ 
                  minWidth: TOUCH_TARGETS.MINIMUM,
                  minHeight: TOUCH_TARGETS.MINIMUM 
                }}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* Content based on variant */}
            <div className="flex-1 min-w-0">
              {variant === 'breadcrumb' && breadcrumbs.length > 0 && (
                <BreadcrumbNavigation items={breadcrumbs} onNavigate={navigate} />
              )}

              {variant === 'team-context' && (
                <div className="min-w-0">
                  {userName && (
                    <p className="text-base font-semibold text-gray-900 truncate leading-tight">
                      {userName}
                    </p>
                  )}
                  {teamName && (
                    <p className="text-xs text-gray-500 truncate leading-tight">
                      {teamName}{userRole && ` • ${userRole}`}
                    </p>
                  )}
                </div>
              )}

              {(variant === 'simple' || (!breadcrumbs.length && !userName)) && (
                <div className="min-w-0">
                  {title && (
                    <h1 className="text-lg font-semibold text-gray-900 truncate leading-tight">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-600 truncate leading-tight">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}

              {variant === 'week-navigation' && weekNavigation && (
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">
                    {weekNavigation.getCurrentWeekString()}
                  </div>
                  {additionalInfo && (
                    <div className="text-xs text-gray-500">{additionalInfo}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Section - Week Navigation */}
          {variant === 'week-navigation' && weekNavigation && (
            <div className="hidden lg:flex items-center gap-3">
              <WeekNavigationControls config={weekNavigation} />
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status Indicator */}
            {showStatus && connectionStatus && (
              <div className="flex items-center gap-1.5">
                <Activity className={`w-3 h-3 ${
                  connectionStatus === 'online' ? 'text-green-500' :
                  connectionStatus === 'offline' ? 'text-red-500' : 'text-yellow-500'
                }`} />
                <span className="text-xs text-gray-500 font-medium capitalize hidden sm:inline">
                  {connectionStatus}
                </span>
              </div>
            )}

            {/* Actions */}
            {actions.map((action) => (
              <ActionButton key={action.id} action={action} size="small" />
            ))}

            {/* Primary Action */}
            {primaryAction && <ActionButton action={primaryAction} />}

            {/* Details Toggle */}
            {expandableDetails && (
              <button
                {...getInteractionProps(() => setIsDetailsExpanded(!isDetailsExpanded))}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 rounded-lg px-2 py-2 transition-colors"
                style={{ minHeight: TOUCH_TARGETS.MINIMUM }}
                aria-label="Toggle details"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Week Navigation */}
        {variant === 'week-navigation' && weekNavigation && (
          <div className="md:hidden mt-3 flex items-center justify-between">
            <WeekNavigationControls config={weekNavigation} compact />
            <div className="text-sm text-gray-600 text-right">
              {weekNavigation.getCurrentWeekString()}
            </div>
          </div>
        )}

        {/* Mobile Additional Info */}
        {variant === 'week-navigation' && additionalInfo && (
          <div className="md:hidden mt-2 text-center text-sm text-gray-600">
            {additionalInfo}
          </div>
        )}
      </div>

      {/* Expandable Details Section */}
      {expandableDetails && isDetailsExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          {expandableDetails}
        </div>
      )}
    </header>
  );
};

export default UniversalMobileHeader;