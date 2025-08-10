'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Users, TrendingUp, Eye } from 'lucide-react';
import { TeamDailyStatus } from '@/types';
import TeamDetailModal from '@/components/modals/TeamDetailModal';
import { useSwipeNavigation, usePullToRefresh } from '@/hooks/useTouchGestures';
import MobileLoadingSpinner, { MobileCardSkeleton, useLoadingStates } from './MobileLoadingSpinner';

interface MobileCOODashboardProps {
  teams: TeamDailyStatus[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  loading: boolean;
  companyMetrics: {
    totalCapacity: number;
    availableCapacity: number;
    utilization: number;
    teamsCount: number;
    membersCount: number;
  };
}

export default function MobileCOODashboard({
  teams,
  selectedDate,
  onDateChange,
  loading,
  companyMetrics
}: MobileCOODashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  
  // Enhanced loading states management
  const { setLoading, isLoading, isAnyLoading } = useLoadingStates();

  // Swipe navigation for date changes
  const swipeNavigation = useSwipeNavigation(
    () => changeDate(1),  // Swipe left = next day
    () => changeDate(-1), // Swipe right = previous day
    { threshold: 60, velocity: 0.3 }
  );

  // Pull-to-refresh functionality
  const pullToRefresh = usePullToRefresh(
    async () => {
      await new Promise(resolve => {
        setRefreshing(true);
        setTimeout(() => {
          window.location.reload();
          resolve(void 0);
        }, 1000);
      });
    },
    { 
      threshold: 80,
      refreshingText: 'Refreshing data...',
      pullText: 'Pull down to refresh',
      releaseText: 'Release to refresh'
    }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    // Force page refresh for cache invalidation
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long' 
    });
  };

  const changeDate = (days: number) => {
    setLoading('dateChange', true);
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    onDateChange(newDate);
    
    // Clear loading state after a short delay
    setTimeout(() => setLoading('dateChange', false), 300);
  };

  const handleTeamDetailsClick = (teamId: number) => {
    setSelectedTeamId(teamId);
    setIsTeamModalOpen(true);
  };

  const handleCloseTeamModal = () => {
    setIsTeamModalOpen(false);
    setSelectedTeamId(null);
  };

  return (
    <div 
      className="mobile-dashboard min-h-screen bg-gray-50 mobile-pull-to-refresh"
      {...swipeNavigation.bind()}
      {...pullToRefresh.bind()}
    >
      {/* Pull-to-refresh indicator */}
      {(pullToRefresh.state.isPulling || pullToRefresh.state.isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 bg-blue-50 border-b border-blue-200 z-50 py-3 px-4 text-center transition-all duration-300"
          style={{ 
            transform: `translateY(${pullToRefresh.state.isPulling ? Math.min(pullToRefresh.state.pullDistance / 2, 40) : pullToRefresh.state.isRefreshing ? 0 : -100}px)`,
            opacity: pullToRefresh.state.isPulling || pullToRefresh.state.isRefreshing ? 1 : 0
          }}
        >
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            {pullToRefresh.state.isRefreshing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>{pullToRefresh.state.message}</span>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">
              COO Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              נתוני החברה בזמן אמת • Real-time Company Data
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 text-gray-400 hover:text-gray-600 active:text-gray-700 transition-all duration-200 active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-gray-100"
            style={{ touchAction: 'manipulation' }}
            title="Refresh"
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="mobile-card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
            style={{ touchAction: 'manipulation' }}
            disabled={loading || isLoading('dateChange')}
            aria-label="Previous day"
          >
            {isLoading('dateChange') ? (
              <MobileLoadingSpinner variant="dots" size="sm" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
          
          <div className="text-center flex-1">
            <div className="font-semibold text-gray-900">{formatDate(selectedDate)}</div>
            <div className="text-sm text-gray-500">
              {selectedDate.toDateString() === new Date().toDateString() ? 'היום • Today' : 'תאריך נבחר • Selected Date'}
            </div>
          </div>
          
          <button
            onClick={() => changeDate(1)}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
            style={{ touchAction: 'manipulation' }}
            disabled={loading || isLoading('dateChange')}
            aria-label="Next day"
          >
            {isLoading('dateChange') ? (
              <MobileLoadingSpinner variant="dots" size="sm" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Simplified Mobile Metrics Cards */}
      <div className="space-y-3">
        <div className="mobile-card-header">
          <h2 className="text-base font-semibold">סיכום כללי • Company Overview</h2>
        </div>
        
        {/* Row 1: Total Workforce & Max Capacity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="mobile-card cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => {}}>
            <div className="mobile-metric">
              <div className="mobile-metric-value text-blue-600">{companyMetrics.membersCount}</div>
              <div className="mobile-metric-label">Total Workforce</div>
              <div className="text-xs text-gray-500 mt-1">{companyMetrics.teamsCount} teams</div>
            </div>
          </div>
          <div className="mobile-card">
            <div className="mobile-metric">
              <div className="mobile-metric-value text-purple-600">{companyMetrics.totalCapacity}h</div>
              <div className="mobile-metric-label">Max Capacity</div>
              <div className="text-xs text-gray-500 mt-1">Weekly capacity max</div>
            </div>
          </div>
        </div>
        
        {/* Row 2: Current Potential & Capacity Gap */}
        <div className="grid grid-cols-2 gap-3">
          <div className="mobile-card">
            <div className="mobile-metric">
              <div className="mobile-metric-value text-green-600">{companyMetrics.availableCapacity}h</div>
              <div className="mobile-metric-label">Current Potential</div>
              <div className="text-xs text-gray-500 mt-1">After deductions</div>
            </div>
          </div>
          <div className="mobile-card">
            <div className="mobile-metric">
              <div className="mobile-metric-value text-orange-600">
                {(companyMetrics.totalCapacity - companyMetrics.availableCapacity).toFixed(0)}h
              </div>
              <div className="mobile-metric-label">Capacity Gap</div>
              <div className="text-xs text-gray-500 mt-1">
                {companyMetrics.totalCapacity > companyMetrics.availableCapacity ? 'Under-utilized' : 'Over-capacity'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Row 3: Current Utilization (full width) */}
        <div className="mobile-card">
          <div className="mobile-metric text-center">
            <div className="mobile-metric-value text-indigo-600">{companyMetrics.utilization.toFixed(1)}%</div>
            <div className="mobile-metric-label">Current Utilization</div>
            <div className="text-xs text-gray-500 mt-1">
              {companyMetrics.utilization >= 90 ? 'Optimal' : 
               companyMetrics.utilization >= 80 ? 'Good' : 'Below Target'}
            </div>
          </div>
          
          {/* Utilization Progress Bar */}
          <div className="mt-3">
            <div className="mobile-status-bar">
              <div 
                className={`${companyMetrics.utilization > 85 ? 'bg-red-500' : 
                            companyMetrics.utilization > 70 ? 'bg-orange-500' : 
                            'mobile-status-available'}`}
                style={{ width: `${Math.min(companyMetrics.utilization, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Team Status Cards - CRITICAL FOR 5 TEAMS DISPLAY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold text-gray-900">
            סטטוס צוותים • Team Status ({teams.length}/5)
          </h3>
          {teams.length < 5 && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              Missing {5 - teams.length} teams
            </span>
          )}
        </div>
        
        {loading ? (
          <MobileCardSkeleton count={5} />
        ) : teams.length === 0 ? (
          <div className="mobile-card text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">No team data available</p>
            <button 
              onClick={handleRefresh}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Refresh to load teams
            </button>
          </div>
        ) : (
          teams.map(team => {
            const utilizationPercentage = team.total > 0 ? ((team.available + team.halfDay * 0.5) / team.total) * 100 : 0;
            
            return (
              <div key={team.id} className="mobile-card">
                {/* Team Header */}
                <div className="mobile-card-header">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{team.name}</h4>
                    <p className="text-sm text-gray-500 truncate">מנהל: {team.manager}</p>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-lg font-bold text-gray-900">
                      {team.available}/{team.total}
                    </div>
                    <div className="text-xs text-gray-500">זמינים</div>
                  </div>
                </div>

                {/* Team Metrics */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-medium">{team.available}</div>
                    <div className="text-xs text-gray-500">Full</div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-medium">{team.halfDay}</div>
                    <div className="text-xs text-gray-500">Half</div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-medium">{team.unavailable}</div>
                    <div className="text-xs text-gray-500">Absent</div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-1"></div>
                    <div className="text-sm font-medium">{team.reserveDuty.length}</div>
                    <div className="text-xs text-gray-500">Reserve</div>
                  </div>
                </div>

                {/* Team Status Bar */}
                <div className="mobile-status-bar mb-3">
                  {team.available > 0 && (
                    <div 
                      className="mobile-status-available"
                      style={{ flex: team.available }}
                    />
                  )}
                  {team.halfDay > 0 && (
                    <div 
                      className="mobile-status-half"
                      style={{ flex: team.halfDay }}
                    />
                  )}
                  {team.unavailable > 0 && (
                    <div 
                      className="mobile-status-unavailable"
                      style={{ flex: team.unavailable }}
                    />
                  )}
                  {team.reserveDuty.length > 0 && (
                    <div 
                      className="bg-blue-500"
                      style={{ flex: team.reserveDuty.length }}
                    />
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleTeamDetailsClick(team.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-3 px-3 text-xs bg-blue-100 hover:bg-blue-200 active:bg-blue-300 rounded-lg transition-all duration-200 active:scale-95 min-h-[44px]"
                    style={{ touchAction: 'manipulation' }}
                    aria-label={`View details for ${team.name}`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>פרטים • Details</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav">
        <div className="flex justify-around">
          <button 
            onClick={() => window.location.href = '/'}
            className="mobile-nav-item min-h-[56px] min-w-[56px] transition-all duration-200 active:scale-95"
            style={{ touchAction: 'manipulation' }}
            aria-label="Go to Teams dashboard"
          >
            <Users className="h-5 w-5 mobile-nav-item-icon" />
            <span className="mobile-nav-item-label">Teams</span>
          </button>
          <button 
            onClick={() => window.location.href = '/executive'}
            className="mobile-nav-item active min-h-[56px] min-w-[56px] transition-all duration-200 active:scale-95"
            style={{ touchAction: 'manipulation' }}
            aria-label="Executive dashboard (current page)"
          >
            <TrendingUp className="h-5 w-5 mobile-nav-item-icon" />
            <span className="mobile-nav-item-label">Executive</span>
          </button>
          <button 
            onClick={handleRefresh}
            className="mobile-nav-item min-h-[56px] min-w-[56px] transition-all duration-200 active:scale-95"
            style={{ touchAction: 'manipulation' }}
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 mobile-nav-item-icon ${refreshing ? 'animate-spin' : ''}`} />
            <span className="mobile-nav-item-label">Refresh</span>
          </button>
        </div>
      </div>

      {/* Team Detail Modal */}
      {selectedTeamId && (
        <TeamDetailModal
          teamId={selectedTeamId}
          isOpen={isTeamModalOpen}
          onClose={handleCloseTeamModal}
        />
      )}
    </div>
  );
}