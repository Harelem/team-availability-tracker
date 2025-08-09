'use client';

import React, { useState } from 'react';
import { 
  Menu, 
  ArrowLeft, 
  Search, 
  Bell,
  Wifi,
  Activity,
  ChevronLeft,
  MoreVertical
} from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { DESIGN_SYSTEM, combineClasses, COMPONENT_PATTERNS } from '@/utils/designSystem';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import NavigationDrawer from './NavigationDrawer';

export interface MobileHeaderProps {
  // Page info
  title: string;
  subtitle?: string;
  showBack?: boolean;
  
  // User context
  currentUser?: TeamMember;
  team?: Team;
  
  // Navigation
  onBack?: () => void;
  onMenuToggle?: () => void;
  showMenu?: boolean;
  
  // Search functionality
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  
  // Notifications
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  
  // Status indicators
  showConnectionStatus?: boolean;
  isOnline?: boolean;
  
  // Actions
  actions?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  }>;
  
  // Navigation handlers for drawer
  onNavigateHome?: () => void;
  onSwitchUser?: () => void;
  onChangeTeam?: () => void;
  onNavigateToExecutive?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  
  className?: string;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder, className = '' }) => {
  const [query, setQuery] = useState('');
  const [isActive, setIsActive] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Optional: Live search
    // onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className={combineClasses('flex-1', className)}>
      <div className={combineClasses(
        'relative flex items-center',
        'bg-gray-100 rounded-lg px-3 py-2 transition-all duration-200',
        isActive ? 'bg-white border border-blue-300 shadow-sm' : 'border border-transparent'
      )}>
        <Search className="w-4 h-4 text-gray-500 mr-2" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500 text-gray-900"
          style={{ touchAction: 'manipulation' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
    </form>
  );
};

export default function MobileHeader({
  title,
  subtitle,
  showBack = false,
  currentUser,
  team,
  onBack,
  onMenuToggle,
  showMenu = true,
  showSearch = false,
  onSearch,
  searchPlaceholder = 'Search...',
  showNotifications = false,
  notificationCount = 0,
  onNotificationClick,
  showConnectionStatus = true,
  isOnline = true,
  actions = [],
  onNavigateHome,
  onSwitchUser,
  onChangeTeam,
  onNavigateToExecutive,
  onSettings,
  onLogout,
  className = ''
}: MobileHeaderProps) {
  const { 
    isNavigationOpen, 
    openNavigation, 
    closeNavigation, 
    canGoBack, 
    navigateBack 
  } = useMobileNavigation();

  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (canGoBack) {
      navigateBack();
    }
  };

  // Handle menu toggle
  const handleMenuToggle = () => {
    if (onMenuToggle) {
      onMenuToggle();
    } else {
      openNavigation();
    }
  };

  return (
    <>
      <header className={combineClasses(
        'bg-white border-b border-gray-200 sticky top-0 z-40 safe-area-top',
        className
      )}>
        <div className={combineClasses(
          'px-4 py-3 flex items-center justify-between',
          'min-h-[64px]'
        )}>
          
          {/* Left section */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            
            {/* Back button or Menu button */}
            {showBack ? (
              <button 
                onClick={handleBack}
                className={combineClasses(
                  'p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 flex-shrink-0 transition-colors',
                  DESIGN_SYSTEM.buttons.touch
                )}
                aria-label="Go back"
                style={{ touchAction: 'manipulation' }}
                type="button"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
            ) : showMenu && (
              <button 
                onClick={handleMenuToggle}
                className={combineClasses(
                  'p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 flex-shrink-0 transition-colors',
                  DESIGN_SYSTEM.buttons.touch
                )}
                aria-label="Open navigation menu"
                aria-expanded={isNavigationOpen}
                style={{ touchAction: 'manipulation' }}
                type="button"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            )}
            
            {/* Title and subtitle */}
            {!showSearch && (
              <div className="min-w-0 flex-1">
                <h1 className={combineClasses(
                  'text-base font-semibold text-gray-900 truncate leading-tight',
                  DESIGN_SYSTEM.typography.h4
                )}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            
            {/* Search bar */}
            {showSearch && onSearch && (
              <SearchBar 
                onSearch={onSearch}
                placeholder={searchPlaceholder}
                className="mx-2"
              />
            )}
          </div>
          
          {/* Right section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            
            {/* Connection status */}
            {showConnectionStatus && (
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Activity className="w-3 h-3 text-green-500" />
                ) : (
                  <Wifi className="w-3 h-3 text-red-500" />
                )}
                <div className={combineClasses(
                  'w-2 h-2 rounded-full',
                  isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                )} />
              </div>
            )}
            
            {/* Notifications */}
            {showNotifications && (
              <button
                onClick={onNotificationClick}
                className={combineClasses(
                  'p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 relative transition-colors',
                  DESIGN_SYSTEM.buttons.touch
                )}
                aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
                style={{ touchAction: 'manipulation' }}
                type="button"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {notificationCount > 0 && (
                  <span className={combineClasses(
                    COMPONENT_PATTERNS.badge,
                    'absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center'
                  )}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
            )}
            
            {/* Action buttons */}
            {actions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className={combineClasses(
                    'p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors',
                    DESIGN_SYSTEM.buttons.touch
                  )}
                  aria-label="More actions"
                  aria-expanded={showActionsMenu}
                  style={{ touchAction: 'manipulation' }}
                  type="button"
                >
                  <MoreVertical className="w-5 h-5 text-gray-700" />
                </button>
                
                {/* Actions dropdown */}
                {showActionsMenu && (
                  <div className={combineClasses(
                    'absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50',
                    'min-w-[160px]'
                  )}>
                    {actions.map(action => (
                      <button
                        key={action.id}
                        onClick={() => {
                          action.onClick();
                          setShowActionsMenu(false);
                        }}
                        className={combineClasses(
                          'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 active:bg-gray-200 transition-colors',
                          DESIGN_SYSTEM.buttons.touch
                        )}
                        style={{ touchAction: 'manipulation' }}
                      >
                        <action.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={isNavigationOpen}
        onClose={closeNavigation}
        currentUser={currentUser}
        team={team}
        onNavigateHome={onNavigateHome}
        onSwitchUser={onSwitchUser}
        onChangeTeam={onChangeTeam}
        onNavigateToExecutive={onNavigateToExecutive}
        onSettings={onSettings}
        onLogout={onLogout}
      />
      
      {/* Backdrop for actions menu */}
      {showActionsMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowActionsMenu(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}

// Simplified header for minimal layouts
export function SimpleHeader({ 
  title, 
  onBack, 
  className = '' 
}: { 
  title: string; 
  onBack?: () => void; 
  className?: string; 
}) {
  return (
    <header className={combineClasses(
      'bg-white border-b border-gray-200 sticky top-0 z-40 safe-area-top',
      className
    )}>
      <div className="px-4 py-3 flex items-center gap-3 min-h-[56px]">
        {onBack && (
          <button 
            onClick={onBack}
            className={combineClasses(
              'p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors',
              DESIGN_SYSTEM.buttons.touch
            )}
            aria-label="Go back"
            type="button"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {title}
        </h1>
      </div>
    </header>
  );
}