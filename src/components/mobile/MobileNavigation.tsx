/**
 * Mobile Navigation System
 * 
 * Provides bottom tab navigation, hamburger menu, and mobile-optimized navigation
 * patterns for the team availability tracker application.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Calendar, 
  Users, 
  BarChart3,
  Menu,
  X,
  Settings,
  LogOut,
  User,
  Building2,
  Activity,
  Archive,
  Download,
  Moon,
  Sun,
  Accessibility
} from 'lucide-react';
import { useTouchFriendly } from '@/hooks/useTouchGestures';

// Navigation Configuration Types
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  onClick?: () => void;
  badge?: number;
  disabled?: boolean;
}

interface MobileNavigationProps {
  currentPath: string;
  currentUser?: {
    name: string;
    email?: string;
    role: string;
    isManager?: boolean;
    isCOO?: boolean;
  };
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  className?: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: MobileNavigationProps['currentUser'];
  onNavigate: (path: string) => void;
  onLogout?: () => void;
}

// Bottom Navigation Component
const BottomNavigation: React.FC<{
  items: NavigationItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
}> = ({ items, currentPath, onNavigate }) => {
  const { getInteractionProps } = useTouchFriendly();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => {
          const isActive = currentPath === item.path;
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.id}
              {...getInteractionProps(() => {
                if (item.onClick) {
                  item.onClick();
                } else if (item.path) {
                  onNavigate(item.path);
                }
              }, { hapticFeedback: true })}
              disabled={item.disabled}
              className={`
                flex flex-col items-center justify-center p-2 min-h-[60px] min-w-[60px] rounded-lg transition-all duration-200
                ${isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <IconComponent className="w-6 h-6" />
                {item.badge && item.badge > 0 && (
                  <span 
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                    aria-label={`${item.badge} notifications`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Mobile Hamburger Menu
const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigate,
  onLogout
}) => {
  const { getInteractionProps } = useTouchFriendly();
  
  // Secondary navigation items
  const secondaryItems: NavigationItem[] = [
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: User,
      onClick: () => {
        onNavigate('/profile');
        onClose();
      }
    },
    {
      id: 'team-management',
      label: 'Team Management',
      icon: Users,
      onClick: () => {
        onNavigate('/team-management');
        onClose();
      }
    },
    {
      id: 'exports',
      label: 'Export Data',
      icon: Download,
      onClick: () => {
        onNavigate('/exports');
        onClose();
      }
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      onClick: () => {
        onNavigate('/archive');
        onClose();
      }
    },
    {
      id: 'accessibility',
      label: 'Accessibility',
      icon: Accessibility,
      onClick: () => {
        onNavigate('/accessibility');
        onClose();
      }
    },
    {
      id: 'settings',
      label: 'App Settings',
      icon: Settings,
      onClick: () => {
        onNavigate('/settings');
        onClose();
      }
    }
  ];

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Menu Panel */}
      <div 
        className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 transform transition-transform"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            {...getInteractionProps(onClose)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Info */}
        {currentUser && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{currentUser.name}</p>
                <p className="text-sm text-gray-600">{currentUser.role}</p>
                {currentUser.email && (
                  <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <nav role="navigation" aria-label="Secondary navigation">
            {secondaryItems.map((item) => {
              const IconComponent = item.icon;
              
              return (
                <button
                  key={item.id}
                  {...getInteractionProps(() => item.onClick?.())}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-gray-100'}
                  `}
                  aria-label={item.label}
                >
                  <IconComponent className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Menu Footer */}
        <div className="border-t border-gray-200 p-4">
          {onLogout && (
            <button
              {...getInteractionProps(onLogout)}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors active:bg-red-100"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

// Main Mobile Navigation Component
const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentPath,
  currentUser,
  onNavigate,
  onLogout,
  className = ''
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { getInteractionProps } = useTouchFriendly();

  // Primary navigation items for bottom nav
  const primaryItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/'
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      path: '/schedule'
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: Users,
      path: '/teams'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/analytics',
      disabled: !currentUser?.isManager && !currentUser?.isCOO
    },
    {
      id: 'menu',
      label: 'More',
      icon: Menu,
      onClick: () => setIsMenuOpen(true)
    }
  ];

  // Add COO-specific navigation if applicable
  if (currentUser?.isCOO) {
    primaryItems.splice(-1, 0, {
      id: 'coo',
      label: 'COO',
      icon: Building2,
      path: '/coo-dashboard'
    });
  }

  return (
    <div className={className}>
      {/* Bottom Navigation */}
      <BottomNavigation
        items={primaryItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />

      {/* Hamburger Menu */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentUser={currentUser}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Spacer to prevent content overlap with bottom nav */}
      <div className="h-20" aria-hidden="true" />
    </div>
  );
};

export default MobileNavigation;