/**
 * Mobile Floating Action Button (FAB)
 * 
 * Provides quick access to primary actions with expandable menu support
 * and accessibility features for mobile interfaces.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Calendar, Users, Download, Settings, Zap } from 'lucide-react';
import { useTouchFriendly } from '@/hooks/useTouchGestures';
import FocusTrap from 'focus-trap-react';

interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
}

interface MobileFloatingActionButtonProps {
  actions?: FABAction[];
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  expandDirection?: 'up' | 'left' | 'right';
}

const MobileFloatingActionButton: React.FC<MobileFloatingActionButtonProps> = ({
  actions = [],
  primaryAction,
  position = 'bottom-right',
  className = '',
  size = 'md',
  expandDirection = 'up'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { getInteractionProps } = useTouchFriendly();
  const fabRef = useRef<HTMLDivElement>(null);

  // Size configurations
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7'
  };

  // Position configurations
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-center': 'bottom-20 left-1/2 transform -translate-x-1/2'
  };

  // Color configurations for actions
  const colorClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-gray-200',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-green-200',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    if (actions.length === 0) {
      // If no actions, just trigger primary action
      primaryAction?.onClick();
      return;
    }

    setIsAnimating(true);
    setIsExpanded(prev => !prev);
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);

  // Get action layout styles based on expand direction
  const getActionStyles = (index: number) => {
    const spacing = 70; // Distance between actions
    const offset = (index + 1) * spacing;

    switch (expandDirection) {
      case 'up':
        return {
          transform: isExpanded 
            ? `translateY(-${offset}px) scale(1)` 
            : 'translateY(0) scale(0)',
          transformOrigin: 'center bottom'
        };
      case 'left':
        return {
          transform: isExpanded 
            ? `translateX(-${offset}px) scale(1)` 
            : 'translateX(0) scale(0)',
          transformOrigin: 'right center'
        };
      case 'right':
        return {
          transform: isExpanded 
            ? `translateX(${offset}px) scale(1)` 
            : 'translateX(0) scale(0)',
          transformOrigin: 'left center'
        };
      default:
        return {};
    }
  };

  const fabContent = (
    <div 
      ref={fabRef}
      className={`fixed z-50 ${positionClasses[position]} ${className}`}
    >
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 -z-10"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Action buttons (rendered before main FAB for proper stacking) */}
      {actions.map((action, index) => {
        const IconComponent = action.icon;
        const colorClass = colorClasses[action.color || 'primary'];

        return (
          <button
            key={action.id}
            {...getInteractionProps(() => {
              action.onClick();
              setIsExpanded(false);
            }, { hapticFeedback: true })}
            disabled={action.disabled}
            className={`
              absolute ${sizeClasses[size]} rounded-full ${colorClass} shadow-lg
              flex items-center justify-center transition-all duration-300 ease-out
              ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              ${isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `}
            style={getActionStyles(index)}
            aria-label={action.label}
          >
            <IconComponent className={iconSizes[size]} />
            
            {/* Action label */}
            <span 
              className={`
                absolute bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap
                ${expandDirection === 'up' ? 'bottom-full mb-2' : 
                  expandDirection === 'left' ? 'right-full mr-2' : 'left-full ml-2'}
                ${isExpanded ? 'opacity-90' : 'opacity-0'}
                transition-opacity duration-300 delay-100
              `}
            >
              {action.label}
            </span>
          </button>
        );
      })}

      {/* Main FAB */}
      <button
        {...getInteractionProps(toggleExpanded, { hapticFeedback: true })}
        className={`
          ${sizeClasses[size]} bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg
          flex items-center justify-center transition-all duration-300 relative z-10
          active:scale-95 hover:shadow-xl
          ${isAnimating ? 'animate-pulse' : ''}
        `}
        aria-label={
          actions.length > 0 
            ? isExpanded ? 'Close actions menu' : 'Open actions menu'
            : primaryAction?.label || 'Primary action'
        }
        aria-expanded={actions.length > 0 ? isExpanded : undefined}
        aria-haspopup={actions.length > 0 ? 'menu' : undefined}
      >
        {actions.length > 0 ? (
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`}>
            <Plus className={iconSizes[size]} />
          </div>
        ) : (
          <Plus className={iconSizes[size]} />
        )}
      </button>
    </div>
  );

  // Wrap in focus trap if expanded with actions
  if (isExpanded && actions.length > 0) {
    return (
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          escapeDeactivates: true,
          onDeactivate: () => setIsExpanded(false)
        }}
      >
        {fabContent}
      </FocusTrap>
    );
  }

  return fabContent;
};

// Preset FAB configurations for common use cases
export const ScheduleFAB: React.FC<{
  onAddEvent: () => void;
  onQuickSchedule: () => void;
  onViewCalendar: () => void;
}> = ({ onAddEvent, onQuickSchedule, onViewCalendar }) => {
  const actions: FABAction[] = [
    {
      id: 'add-event',
      label: 'Add Event',
      icon: Plus,
      onClick: onAddEvent,
      color: 'primary'
    },
    {
      id: 'quick-schedule',
      label: 'Quick Schedule',
      icon: Zap,
      onClick: onQuickSchedule,
      color: 'success'
    },
    {
      id: 'calendar',
      label: 'View Calendar',
      icon: Calendar,
      onClick: onViewCalendar,
      color: 'secondary'
    }
  ];

  return <MobileFloatingActionButton actions={actions} />;
};

export const TeamManagementFAB: React.FC<{
  onAddMember: () => void;
  onExportData: () => void;
  onSettings: () => void;
}> = ({ onAddMember, onExportData, onSettings }) => {
  const actions: FABAction[] = [
    {
      id: 'add-member',
      label: 'Add Member',
      icon: Users,
      onClick: onAddMember,
      color: 'primary'
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: Download,
      onClick: onExportData,
      color: 'secondary'
    },
    {
      id: 'settings',
      label: 'Team Settings',
      icon: Settings,
      onClick: onSettings,
      color: 'secondary'
    }
  ];

  return <MobileFloatingActionButton actions={actions} />;
};

export default MobileFloatingActionButton;