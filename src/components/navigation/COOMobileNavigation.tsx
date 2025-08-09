/**
 * COO Mobile Navigation
 * 
 * Specialized mobile navigation component for the executive/COO dashboard.
 * Provides executive-level navigation patterns, company-wide controls,
 * and high-level management functions optimized for mobile devices.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { 
  Building2, 
  TrendingUp,
  Users,
  BarChart3,
  Activity,
  Settings,
  Download,
  RefreshCw,
  Calendar,
  Bell,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  Search,
  ArrowLeft,
  Home
} from 'lucide-react';
import { useTouchFriendly } from '@/hooks/useTouchGestures';
import { useMobileNavigation } from './MobileNavigationProvider';
import UniversalMobileHeader from './UniversalMobileHeader';
import { TOUCH_TARGETS } from './NavigationConstants';

// COO Navigation Types
interface COOUser {
  id: string;
  name: string;
  email?: string;
  role: 'coo';
}

interface COONavigationProps {
  currentUser: COOUser;
  onNavigateHome?: () => void;
  onRefreshData?: () => void;
  onExportData?: () => void;
  onFilterChange?: (filters: any) => void;
  onSearchCompanies?: (query: string) => void;
  showTeamFilters?: boolean;
  currentFilters?: any;
  className?: string;
}

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  badge?: number;
  disabled?: boolean;
}

// Quick Action Button Component
const QuickActionButton: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  onClick,
  variant = 'secondary',
  badge,
  disabled = false
}) => {
  const { getInteractionProps } = useTouchFriendly();

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200',
    accent: 'bg-green-600 text-white hover:bg-green-700 shadow-md'
  };

  return (
    <button
      {...getInteractionProps(onClick, { hapticFeedback: true })}
      disabled={disabled}
      className={`
        relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:shadow-lg'}
      `}
      style={{
        minHeight: TOUCH_TARGETS.LARGE,
        minWidth: TOUCH_TARGETS.LARGE
      }}
      aria-label={label}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
      
      {badge && badge > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};

// Executive Stats Card Component
const ExecutiveStatsCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
}> = ({ title, value, subtitle, trend, trendValue, onClick }) => {
  const { getInteractionProps } = useTouchFriendly();

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div
      {...(onClick ? getInteractionProps(onClick, { hapticFeedback: true }) : {})}
      className={`
        bg-white rounded-lg p-4 border border-gray-200 shadow-sm
        ${onClick ? 'hover:shadow-md active:scale-98 cursor-pointer transition-all duration-200' : ''}
      `}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `View ${title}` : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 ${trendColors[trend]}`}>
            <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
            <span className="text-xs font-medium">{trendValue}</span>
          </div>
        )}
      </div>
      
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
};

// COO Mobile Navigation Component
const COOMobileNavigation: React.FC<COONavigationProps> = ({
  currentUser,
  onNavigateHome,
  onRefreshData,
  onExportData,
  onFilterChange,
  onSearchCompanies,
  showTeamFilters = false,
  currentFilters,
  className = ''
}) => {
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { navigate } = useMobileNavigation();

  // Quick Actions for COO Dashboard
  const quickActions = [
    {
      icon: TrendingUp,
      label: 'Company Analytics',
      onClick: () => navigate('/company-analytics'),
      variant: 'primary' as const
    },
    {
      icon: Activity,
      label: 'Workforce Status',
      onClick: () => navigate('/workforce-status'),
      variant: 'accent' as const
    },
    {
      icon: Users,
      label: 'All Teams',
      onClick: () => navigate('/teams'),
      variant: 'secondary' as const
    },
    {
      icon: Download,
      label: 'Export Data',
      onClick: () => onExportData?.(),
      variant: 'secondary' as const
    },
    {
      icon: Bell,
      label: 'Alerts',
      onClick: () => navigate('/notifications'),
      variant: 'secondary' as const,
      badge: 0 // Will be updated based on actual notifications
    },
    {
      icon: Settings,
      label: 'COO Settings',
      onClick: () => navigate('/coo-settings'),
      variant: 'secondary' as const
    }
  ];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshData]);

  // Header Actions
  const headerActions = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: RefreshCw,
      onClick: handleRefresh,
      disabled: isRefreshing
    },
    {
      id: 'filter',
      label: 'Filter',
      icon: Filter,
      onClick: () => {
        // Open filter modal or drawer
        console.log('Open filters');
      },
      badge: currentFilters ? Object.keys(currentFilters).length : undefined
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      onClick: () => {
        // Open search interface
        console.log('Open search');
      }
    }
  ];

  const primaryAction = {
    id: 'home',
    label: 'Home',
    icon: Home,
    onClick: () => onNavigateHome ? onNavigateHome() : navigate('/')
  };

  return (
    <div className={className}>
      {/* COO Header */}
      <UniversalMobileHeader
        variant="team-context"
        userName={`COO Dashboard`}
        teamName={`Executive View • ${currentUser.name}`}
        userRole="Chief Operating Officer"
        actions={headerActions}
        primaryAction={primaryAction}
        showMenuButton={true}
        showStatus={true}
        connectionStatus="online"
        className="bg-gradient-to-r from-blue-600 to-blue-700 border-blue-700 text-white"
        expandableDetails={
          showTeamFilters ? (
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">Executive Filters</h4>
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Toggle quick actions"
                >
                  {showQuickActions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              
              {showQuickActions && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {quickActions.slice(0, 6).map((action, index) => (
                    <div key={index} className="bg-white/10 rounded-lg p-2">
                      <button
                        onClick={action.onClick}
                        className="flex items-center gap-2 text-white hover:text-white/80 transition-colors w-full text-left"
                        aria-label={action.label}
                      >
                        <action.icon className="w-4 h-4" />
                        <span className="text-sm font-medium truncate">{action.label}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Quick Actions Grid */}
      {showQuickActions && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Executive Actions
            </h3>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {quickActions.map((action, index) => (
              <QuickActionButton
                key={index}
                icon={action.icon}
                label={action.label}
                onClick={action.onClick}
                variant={action.variant}
                badge={action.badge}
              />
            ))}
          </div>
        </div>
      )}

      {/* Executive Summary Cards */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Company Overview
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <ExecutiveStatsCard
            title="Total Teams"
            value="12"
            subtitle="Active teams"
            trend="up"
            trendValue="+2"
            onClick={() => navigate('/teams')}
          />
          
          <ExecutiveStatsCard
            title="Total Employees"
            value="156"
            subtitle="Company-wide"
            trend="up"
            trendValue="+8"
            onClick={() => navigate('/workforce-status')}
          />
          
          <ExecutiveStatsCard
            title="Weekly Hours"
            value="4,830h"
            subtitle="This week"
            trend="neutral"
            trendValue="±0%"
            onClick={() => navigate('/company-analytics')}
          />
          
          <ExecutiveStatsCard
            title="Efficiency"
            value="94.2%"
            subtitle="Company avg"
            trend="up"
            trendValue="+2.1%"
            onClick={() => navigate('/efficiency-report')}
          />
        </div>

        {/* Quick Access Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/team-comparison')}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 active:scale-98"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Team Comparison</p>
                <p className="text-sm text-gray-500">Cross-team analytics</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 rotate-270" />
          </button>

          <button
            onClick={() => navigate('/capacity-planning')}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 active:scale-98"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Capacity Planning</p>
                <p className="text-sm text-gray-500">Resource allocation</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 rotate-270" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-gray-700 font-medium">Refreshing data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default COOMobileNavigation;