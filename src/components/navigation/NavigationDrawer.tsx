'use client';

import React, { useEffect } from 'react';
import { 
  X, 
  Home, 
  Users, 
  Building2, 
  Settings, 
  LogOut, 
  Shield,
  BarChart3,
  Calendar,
  User,
  ChevronRight
} from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { DESIGN_SYSTEM, combineClasses, COMPONENT_PATTERNS } from '@/utils/designSystem';
import { useMobileNavigation, useNavigationAnimation } from '@/hooks/useMobileNavigation';
import { HydrationSafeWrapper } from '@/components/HydrationSafeWrapper';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  badge?: string | number;
  description?: string;
  requiresManager?: boolean;
  requiresExecutive?: boolean;
}

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: TeamMember;
  team?: Team;
  className?: string;
  
  // Navigation handlers
  onNavigateHome?: () => void;
  onSwitchUser?: () => void;
  onChangeTeam?: () => void;
  onNavigateToExecutive?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  
  // Custom navigation items
  customNavItems?: NavigationItem[];
}

// Reusable navigation button component
const NavigationButton: React.FC<{
  item: NavigationItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const handleClick = () => {
    if (!item.disabled) {
      item.onClick();
      onClose();
    }
  };

  const baseClasses = combineClasses(
    'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200',
    DESIGN_SYSTEM.buttons.touch,
    'text-left'
  );

  const variantClasses = {
    default: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
    primary: 'text-blue-700 hover:bg-blue-50 active:bg-blue-100',
    danger: 'text-red-600 hover:bg-red-50 active:bg-red-100'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <button
      onClick={handleClick}
      disabled={item.disabled}
      className={combineClasses(
        'mobile-nav-button',
        baseClasses,
        variantClasses[item.variant || 'default'],
        item.disabled && disabledClasses
      )}
      aria-label={item.label}
    >
      <div className="flex items-center gap-3">
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-medium block truncate">{item.label}</span>
          {item.description && (
            <span className="text-xs opacity-75 block truncate">{item.description}</span>
          )}
        </div>
        {item.badge && (
          <span className={combineClasses(
            COMPONENT_PATTERNS.badge,
            'bg-blue-100 text-blue-800 min-w-[20px] text-center'
          )}>
            {item.badge}
          </span>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
};

export default function NavigationDrawer({
  isOpen,
  onClose,
  currentUser,
  team,
  className = '',
  onNavigateHome,
  onSwitchUser,
  onChangeTeam,
  onNavigateToExecutive,
  onSettings,
  onLogout,
  customNavItems = []
}: NavigationDrawerProps) {
  const { shouldRender } = useNavigationAnimation(isOpen);

  // Close drawer on escape key and handle body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scroll when drawer is open
      document.body.style.overflow = 'hidden';
      // Add safe area padding for iOS devices
      document.body.style.paddingRight = 'env(safe-area-inset-right)';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, onClose]);

  // Build navigation items
  const buildNavigationItems = (): NavigationItem[] => {
    const items: NavigationItem[] = [];

    // Primary navigation
    if (onNavigateHome) {
      items.push({
        id: 'home',
        label: 'Dashboard',
        icon: Home,
        onClick: onNavigateHome,
        description: 'Go to main dashboard'
      });
    }

    if (currentUser && team) {
      if (onSwitchUser) {
        items.push({
          id: 'switch-user',
          label: 'Switch User',
          icon: User,
          onClick: onSwitchUser,
          description: `Currently: ${currentUser.name}`
        });
      }

      if (onChangeTeam) {
        items.push({
          id: 'change-team',
          label: 'Change Team',
          icon: Building2,
          onClick: onChangeTeam,
          description: `Currently: ${team.name}`
        });
      }
    }

    // Executive access
    if (onNavigateToExecutive) {
      items.push({
        id: 'executive',
        label: 'Executive Dashboard',
        icon: BarChart3,
        onClick: onNavigateToExecutive,
        variant: 'primary',
        requiresExecutive: true
      });
    }

    // Manager-specific items
    if (currentUser?.isManager) {
      items.push({
        id: 'manager-controls',
        label: 'Manager Tools',
        icon: Shield,
        onClick: () => {
          // Navigate to manager-specific features
          console.log('Manager tools clicked');
        },
        requiresManager: true,
        description: 'Team management features'
      });
    }

    // Add custom navigation items
    items.push(...customNavItems);

    return items;
  };

  const navigationItems = buildNavigationItems();

  // Separate items by category
  const primaryItems = navigationItems.filter(item => 
    !item.requiresManager && !item.requiresExecutive && item.variant !== 'danger'
  );
  
  const managerItems = navigationItems.filter(item => item.requiresManager);
  const executiveItems = navigationItems.filter(item => item.requiresExecutive);
  const settingsItems = onSettings ? [{
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    onClick: onSettings,
    description: 'App preferences and configuration'
  }] : [];

  if (!shouldRender) return null;

  return (
    <HydrationSafeWrapper 
      suppressHydrationWarning={true}
      fallback={
        <div className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-xl -translate-x-full transition-transform duration-300 ease-out" style={{ position: 'fixed', height: '100vh', zIndex: 51 }}>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 animate-pulse">
            <div className="h-6 bg-white/20 rounded mb-4" />
            <div className="h-12 bg-white/20 rounded" />
          </div>
        </div>
      }
    >
      {/* Emergency fixed backdrop - single backdrop only */}
      {isOpen && (
        <div 
          className="mobile-nav-backdrop-emergency fixed inset-0"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Drawer - Emergency z-index fix */}
      <div 
        className={combineClasses(
          'mobile-nav-drawer-emergency fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white transform transition-transform duration-300 ease-out shadow-xl',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!isOpen}
        id="navigation-drawer"
      >
        {/* Drawer header */}
        <div className={combineClasses(
          'bg-gradient-to-r from-blue-500 to-blue-600 text-white safe-area-top',
          DESIGN_SYSTEM.spacing.md
        )}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={combineClasses(
              DESIGN_SYSTEM.typography.h3,
              'text-white'
            )}>
              Navigation
            </h2>
            <button 
              onClick={onClose}
              className="mobile-nav-button p-2 rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors"
              aria-label="Close menu"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* User info */}
          {currentUser && team && (
            <div className="flex items-center gap-3">
              <div className={combineClasses(
                'w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0',
                COMPONENT_PATTERNS.avatar
              )}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg truncate">{currentUser.name}</p>
                <p className="text-sm opacity-90 truncate">{currentUser.hebrew}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs opacity-75 truncate">{team.name}</p>
                  {currentUser.isManager && (
                    <>
                      <span className="text-xs opacity-50">•</span>
                      <span className={combineClasses(
                        'text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium',
                        COMPONENT_PATTERNS.badge
                      )}>
                        Manager
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation content */}
        <div className="flex-1 overflow-y-auto py-4 px-4">
          <nav className="space-y-6" role="navigation" aria-label="Main navigation">
            
            {/* Primary navigation */}
            {primaryItems.length > 0 && (
              <div className="space-y-1">
                {primaryItems.map(item => (
                  <NavigationButton 
                    key={item.id} 
                    item={item} 
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
            
            {/* Executive items */}
            {executiveItems.length > 0 && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500 px-4 mb-2">
                  Executive
                </h3>
                {executiveItems.map(item => (
                  <NavigationButton 
                    key={item.id} 
                    item={item} 
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
            
            {/* Manager items */}
            {managerItems.length > 0 && currentUser?.isManager && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500 px-4 mb-2">
                  Manager Tools
                </h3>
                {managerItems.map(item => (
                  <NavigationButton 
                    key={item.id} 
                    item={item} 
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
            
            {/* Settings */}
            {settingsItems.length > 0 && (
              <div className="space-y-1">
                <div className="border-t border-gray-200 mb-4" />
                {settingsItems.map(item => (
                  <NavigationButton 
                    key={item.id} 
                    item={item} 
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
          </nav>
        </div>
        
        {/* Drawer footer */}
        {onLogout && (
          <div className={combineClasses(
            'border-t border-gray-200 safe-area-bottom',
            DESIGN_SYSTEM.spacing.md
          )}>
            <NavigationButton 
              item={{
                id: 'logout',
                label: 'Sign Out',
                icon: LogOut,
                onClick: onLogout,
                variant: 'danger'
              }}
              onClose={onClose}
            />
          </div>
        )}
      </div>
    </HydrationSafeWrapper>
  );
}