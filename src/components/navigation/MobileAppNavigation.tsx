'use client';

import React from 'react';
import { 
  Home, 
  Users, 
  BarChart3, 
  Calendar,
  User
} from 'lucide-react';
import { TeamMember } from '@/types';
import { DESIGN_SYSTEM, combineClasses, COMPONENT_PATTERNS } from '@/utils/designSystem';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { NAVIGATION_PAGES } from '@/contexts/NavigationContext';

export interface MobileAppNavigationProps {
  currentUser?: TeamMember;
  currentPage?: string;
  showExecutive?: boolean;
  className?: string;
  
  // Navigation handlers
  onNavigateHome?: () => void;
  onNavigateTeams?: () => void;
  onNavigateExecutive?: () => void;
  onNavigateProfile?: () => void;
  // Note: Settings navigation removed in v2.2 for cleaner mobile experience
}

interface NavTabProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string | number;
  disabled?: boolean;
}

const NavTab: React.FC<NavTabProps> = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick, 
  badge,
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={combineClasses(
        'mobile-nav-button flex flex-col items-center justify-center flex-1 py-2 px-1 relative transition-all duration-200',
        DESIGN_SYSTEM.buttons.touchComfortable,
        DESIGN_SYSTEM.mobile.touchFeedback,
        'min-h-[64px]', // Increased for better mobile experience
        'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2',
        isActive 
          ? 'text-blue-600' 
          : disabled 
          ? 'text-gray-400 cursor-not-allowed' 
          : 'text-gray-600 hover:text-blue-500 active:text-blue-700'
      )}
      aria-label={`${label}${isActive ? ' (current page)' : ''}${badge ? `, ${badge} notifications` : ''}`}
      aria-current={isActive ? 'page' : undefined}
      aria-describedby={badge ? `${label.toLowerCase()}-badge` : undefined}
      role="tab"
      tabIndex={disabled ? -1 : 0}
    >
      <div className="relative">
        <Icon className={combineClasses(
          'w-6 h-6 transition-transform duration-200',
          isActive ? 'scale-110' : 'scale-100'
        )} />
        
        {/* Active indicator */}
        {isActive && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
        )}
        
        {/* Badge */}
        {badge && !disabled && (
          <span 
            id={`${label.toLowerCase()}-badge`}
            className={combineClasses(
              COMPONENT_PATTERNS.badge,
              'absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center'
            )}
            aria-label={`${badge} notifications`}
            role="status"
          >
            {badge}
          </span>
        )}
      </div>
      
      <span className={combineClasses(
        'text-xs mt-1 font-medium transition-all duration-200',
        'max-w-[60px] truncate leading-tight',
        isActive ? 'text-blue-600' : ''
      )}>
        {label}
      </span>
    </button>
  );
};

export default function MobileAppNavigation({
  currentUser,
  currentPage = '/',
  showExecutive = false,
  className = '',
  onNavigateHome,
  onNavigateTeams,
  onNavigateExecutive,
  onNavigateProfile
  // onNavigateSettings removed in v2.2
}: MobileAppNavigationProps) {
  const { 
    navigateToHome,
    navigateToTeamSelection,
    navigateToExecutive
    // navigateToSettings removed in v2.2 for cleaner mobile experience
  } = useMobileNavigation();

  // Determine active tab based on current page
  const getActiveTab = () => {
    if (currentPage.includes('/executive')) return 'executive';
    if (currentPage.includes('/profile')) return 'profile';
    if (currentPage.includes('/team')) return 'teams';
    return 'home';
  };

  const activeTab = getActiveTab();

  // Navigation handlers with fallbacks
  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      navigateToHome();
    }
  };

  const handleNavigateTeams = () => {
    if (onNavigateTeams) {
      onNavigateTeams();
    } else {
      navigateToTeamSelection();
    }
  };

  const handleNavigateExecutive = () => {
    if (onNavigateExecutive) {
      onNavigateExecutive();
    } else {
      navigateToExecutive();
    }
  };

  // Settings navigation removed in v2.2 for cleaner mobile experience
  // const handleNavigateSettings = () => {
  //   if (onNavigateSettings) {
  //     onNavigateSettings();
  //   } else {
  //     navigateToSettings();
  //   }
  // };

  const handleNavigateProfile = () => {
    if (onNavigateProfile) {
      onNavigateProfile();
    } else {
      // Navigate to profile page (to be implemented)
      console.log('Profile navigation not implemented yet');
    }
  };

  return (
    <nav 
      className={combineClasses(
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom',
        'shadow-lg backdrop-blur-md bg-white/95',
        className
      )}
      role="tablist"
      aria-label="Main navigation"
      aria-orientation="horizontal"
    >
      <div className={combineClasses(
        'flex items-center justify-around px-2',
        'max-w-screen-xl mx-auto' // Limit width on very wide screens
      )}>
        
        {/* Home/Dashboard */}
        <NavTab
          icon={Home}
          label="Dashboard"
          isActive={activeTab === 'home'}
          onClick={handleNavigateHome}
        />
        
        {/* Teams */}
        <NavTab
          icon={Users}
          label="Teams"
          isActive={activeTab === 'teams'}
          onClick={handleNavigateTeams}
        />
        
        {/* Executive Dashboard (conditional) */}
        {showExecutive && (
          <NavTab
            icon={BarChart3}
            label="Executive"
            isActive={activeTab === 'executive'}
            onClick={handleNavigateExecutive}
          />
        )}
        
        {/* Profile (show user initial if logged in) */}
        {currentUser && (
          <NavTab
            icon={User}
            label="Profile"
            isActive={activeTab === 'profile'}
            onClick={handleNavigateProfile}
          />
        )}
      </div>
      
      {/* Safe area bottom padding for devices with home indicators */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white border-t border-gray-200" />
    </nav>
  );
}

// Alternative compact version for when space is limited
export function CompactMobileAppNavigation({
  currentUser,
  currentPage = '/',
  onNavigateHome,
  onNavigateTeams,
  onNavigateExecutive,
  className = ''
}: Omit<MobileAppNavigationProps, 'showExecutive' | 'onNavigateSettings' | 'onNavigateProfile'>) {
  const activeTab = currentPage.includes('/executive') ? 'executive' : 
                   currentPage.includes('/team') ? 'teams' : 'home';

  return (
    <nav 
      className={combineClasses(
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom',
        'shadow-md backdrop-blur-sm bg-white/90',
        className
      )}
      role="navigation"
      aria-label="Quick navigation"
    >
      <div className="flex items-center justify-center px-4 py-2">
        
        {/* Home */}
        <button
          onClick={onNavigateHome}
          className={combineClasses(
            'flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200',
            DESIGN_SYSTEM.buttons.touchComfortable,
            DESIGN_SYSTEM.mobile.touchFeedback,
            activeTab === 'home' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:bg-gray-100'
          )}
          aria-current={activeTab === 'home' ? 'page' : undefined}
        >
          <Home className="w-5 h-5" />
          <span className="text-sm font-medium">Home</span>
        </button>
        
        {/* Teams */}
        <button
          onClick={onNavigateTeams}
          className={combineClasses(
            'flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200',
            DESIGN_SYSTEM.buttons.touchComfortable,
            DESIGN_SYSTEM.mobile.touchFeedback,
            activeTab === 'teams' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:bg-gray-100'
          )}
          aria-current={activeTab === 'teams' ? 'page' : undefined}
        >
          <Users className="w-5 h-5" />
          <span className="text-sm font-medium">Teams</span>
        </button>
        
        {/* Executive (if applicable) */}
        {onNavigateExecutive && (
          <button
            onClick={onNavigateExecutive}
            className={combineClasses(
              'flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200',
              DESIGN_SYSTEM.buttons.touchComfortable,
              DESIGN_SYSTEM.mobile.touchFeedback,
              activeTab === 'executive' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            )}
            aria-current={activeTab === 'executive' ? 'page' : undefined}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium">COO</span>
          </button>
        )}
      </div>
    </nav>
  );
}