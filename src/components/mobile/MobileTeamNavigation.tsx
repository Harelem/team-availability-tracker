/**
 * Enhanced Mobile Team Navigation with App-Wide Integration
 * 
 * Features:
 * - Integrated with MobileNavigationProvider for app-wide state management
 * - Enhanced touch-friendly interactions
 * - Universal navigation drawer with consistent styling
 * - Improved accessibility and keyboard navigation
 * - Better mobile responsiveness and animations
 * - App-wide navigation integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Activity,
  User,
  X,
  Home,
  Users,
  Building2,
  Settings,
  LogOut,
  Shield
} from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { useTouchFriendly } from '@/hooks/useTouchGestures';
import { useNavigation } from '@/contexts/NavigationContext';
import { TOUCH_TARGETS } from '@/components/navigation/NavigationConstants';

interface MobileTeamNavigationProps {
  currentUser: TeamMember;
  team: Team;
  onNavigateHome?: () => void;
  onSwitchUser?: () => void;
  onChangeTeam?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  className?: string;
}

interface DrawerButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

// Reusable drawer button component
const DrawerButton: React.FC<DrawerButtonProps> = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'default',
  disabled = false 
}) => {
  const { getInteractionProps } = useTouchFriendly();
  
  const baseClasses = "w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors touch-manipulation";
  const variantClasses = {
    default: "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
    danger: "text-red-600 hover:bg-red-50 active:bg-red-100"
  };
  const disabledClasses = "opacity-50 cursor-not-allowed";
  
  return (
    <button
      {...getInteractionProps(onClick, { hapticFeedback: true })}
      disabled={disabled}
      className={`mobile-nav-button ${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ''}`}
      style={{ 
        minHeight: TOUCH_TARGETS.COMFORTABLE
      }}
      aria-label={label}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium">{label}</span>
    </button>
  );
};

// Navigation drawer component
const NavigationDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentUser: TeamMember;
  team: Team;
  onNavigateHome?: () => void;
  onSwitchUser?: () => void;
  onChangeTeam?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  team,
  onNavigateHome,
  onSwitchUser,
  onChangeTeam,
  onSettings,
  onLogout
}) => {
  const { getInteractionProps } = useTouchFriendly();
  
  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50"
          onClick={onClose}
          aria-hidden="true"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`
          fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white
          transform transition-transform duration-300 ease-out shadow-xl
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!isOpen}
        style={{ 
          position: 'fixed',
          height: '100vh',
          zIndex: 51
        }}
      >
        {/* Drawer header with user info */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 safe-area-top">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Navigation</h2>
            <button 
              {...getInteractionProps(onClose, { hapticFeedback: true })}
              className="mobile-nav-button p-2 rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
              aria-label="Close menu"
              style={{ 
                minWidth: TOUCH_TARGETS.COMFORTABLE, 
                minHeight: TOUCH_TARGETS.COMFORTABLE
              }}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{currentUser.name}</p>
              <p className="text-sm opacity-90 truncate">{currentUser.hebrew}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs opacity-75">{team.name}</p>
                {currentUser.isManager && (
                  <>
                    <span className="text-xs opacity-50">•</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                      Manager
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-4 px-4">
          <nav className="space-y-2" role="navigation" aria-label="Main navigation">
            <div className="space-y-1">
              <DrawerButton 
                icon={Home} 
                label="Home Dashboard" 
                onClick={() => {
                  onNavigateHome?.();
                  onClose();
                }} 
              />
              
              <DrawerButton 
                icon={Users} 
                label="Switch User" 
                onClick={() => {
                  onSwitchUser?.();
                  onClose();
                }} 
              />
              
              <DrawerButton 
                icon={Building2} 
                label="Change Team" 
                onClick={() => {
                  onChangeTeam?.();
                  onClose();
                }} 
              />
              
              {currentUser.isManager && (
                <DrawerButton 
                  icon={Shield} 
                  label="Manager Controls" 
                  onClick={() => {
                    onClose();
                  }} 
                />
              )}
            </div>
            
            <div className="border-t border-gray-200 my-4" />
            
            <div className="space-y-1">
              <DrawerButton 
                icon={Settings} 
                label="Settings" 
                onClick={() => {
                  onSettings?.();
                  onClose();
                }} 
              />
            </div>
          </nav>
        </div>
        
        {/* Drawer footer */}
        {onLogout && (
          <div className="border-t border-gray-200 p-4 safe-area-bottom">
            <DrawerButton 
              icon={LogOut} 
              label="Sign Out" 
              onClick={() => {
                onLogout();
                onClose();
              }}
              variant="danger"
            />
          </div>
        )}
      </div>
    </>
  );
};

// Enhanced mobile team navigation component with app-wide integration
const MobileTeamNavigation: React.FC<MobileTeamNavigationProps> = ({
  currentUser,
  team,
  onNavigateHome,
  onSwitchUser,
  onChangeTeam,
  onSettings,
  onLogout,
  className = ''
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { getInteractionProps } = useTouchFriendly();
  
  // Integration with navigation context
  const navigation = useNavigation();
  
  useEffect(() => {
    // Set the current page in navigation context only once on mount
    navigation.navigateTo('/dashboard', { updateHistory: false });
  }, []); // Empty dependency array to run only once

  return (
    <>
      {/* Enhanced compact fixed header */}
      <header className={`bg-white border-b border-gray-200 sticky top-0 z-40 safe-area-top ${className}`}>
        <div className="px-4 py-3 flex items-center justify-between min-h-[64px]">
          {/* Left side: Menu + User info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button 
              {...getInteractionProps(() => setMenuOpen(true), { hapticFeedback: true })}
              className="mobile-nav-button p-3 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 flex-shrink-0 transition-all duration-200 active:scale-95"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              style={{ 
                minWidth: TOUCH_TARGETS.COMFORTABLE,
                minHeight: TOUCH_TARGETS.COMFORTABLE
              }}
              type="button"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-gray-900 truncate leading-tight">
                {currentUser.name}
              </p>
              <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
                {team.name}
                {currentUser.isManager && ' • Manager'}
              </p>
            </div>
          </div>
          
          {/* Right side: Status indicator */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-green-500" />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Active</span>
          </div>
        </div>
      </header>
      
      {/* Enhanced navigation drawer */}
      <NavigationDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentUser={currentUser}
        team={team}
        onNavigateHome={onNavigateHome}
        onSwitchUser={onSwitchUser}
        onChangeTeam={onChangeTeam}
        onSettings={onSettings}
        onLogout={onLogout}
      />
    </>
  );
};

export default MobileTeamNavigation;