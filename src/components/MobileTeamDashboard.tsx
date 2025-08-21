'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { TeamMember, Team, WeekData } from '@/types';

interface MobileTeamDashboardProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
  scheduleData: WeekData;
  weekDays: Date[];
  currentWeekOffset: number;
  loading: boolean;
  onWeekChange: (offset: number) => void;
  onWorkOptionClick: (memberId: number, date: Date, value: string) => void;
  isToday: (date: Date) => boolean;
  isPastDate: (date: Date) => boolean;
  getCurrentSprintString: () => string;
  getTeamTotalHours: () => number;
}

const MobileTeamDashboard = memo(function MobileTeamDashboard({
  currentUser,
  teamMembers,
  selectedTeam,
  scheduleData,
  weekDays,
  currentWeekOffset,
  loading,
  onWeekChange,
  onWorkOptionClick,
  isToday,
  isPastDate,
  getCurrentSprintString,
  getTeamTotalHours
}: MobileTeamDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Memoized handlers to prevent re-renders
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Force page refresh for cache invalidation
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  const handleWeekChange = useCallback((offset: number) => {
    React.startTransition(() => {
      onWeekChange(offset);
    });
  }, [onWeekChange]);

  // Enhanced navigation handler with loading state
  const handleNavigation = useCallback(async (action: () => void) => {
    setIsNavigating(true);
    try {
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([20]);
      }
      await action();
    } finally {
      setTimeout(() => setIsNavigating(false), 300); // Brief loading state
    }
  }, []);

  const handleWorkOptionClick = useCallback((memberId: number, date: Date, value: string) => {
    React.startTransition(() => {
      onWorkOptionClick(memberId, date, value);
    });
  }, [onWorkOptionClick]);

  // Memoized computations
  const formattedDates = useMemo(() => {
    return weekDays.map(date => ({
      date,
      formatted: date.toLocaleDateString('he-IL', { 
        day: 'numeric', 
        month: 'short' 
      }),
      isToday: isToday(date),
      isPast: isPastDate(date)
    }));
  }, [weekDays, isToday, isPastDate]);

  const teamStats = useMemo(() => ({
    totalHours: getTeamTotalHours ? getTeamTotalHours() : 0,
    sprintString: getCurrentSprintString ? getCurrentSprintString() : 'Loading...',
    memberCount: teamMembers.length
  }), [getTeamTotalHours, getCurrentSprintString, teamMembers.length]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('he-IL', { 
      day: 'numeric', 
      month: 'short' 
    });
  }, []);

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('he-IL', { 
      weekday: 'short' 
    });
  };

  const getDayStats = (date: Date) => {
    const dayKey = date.toISOString().split('T')[0];
    const daySchedule = dayKey ? (scheduleData as any)[dayKey] || {} : {};
    let full = 0, half = 0, absent = 0, missing = 0;
    
    teamMembers.forEach(member => {
      const value = daySchedule[member.id];
      if (value === '1') full++;
      else if (value === '0.5') half++;
      else if (value === 'X') absent++;
      else missing++;
    });

    const totalHours = full * 9 + half * 4.5;
    return { full, half, absent, missing, totalHours };
  };

  const getTeamCapacity = () => {
    const maxCapacity = teamMembers.length * 45; // 5 days * 9 hours
    const currentCapacity = getTeamTotalHours();
    const utilization = maxCapacity > 0 ? (currentCapacity / maxCapacity) * 100 : 0;
    return { maxCapacity, currentCapacity, utilization };
  };

  const capacity = getTeamCapacity();

  return (
    <div className="mobile-dashboard bg-gray-50 p-4 space-y-4">
      {/* Team stats header - simplified since navigation is handled separately */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600 truncate">
              {teamMembers.length} team members • {selectedTeam?.name || 'Team Dashboard'}
            </p>
            {currentUser.isManager && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium">Manager Mode</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || isNavigating}
          className={`
            p-2 min-w-[44px] min-h-[44px] rounded-lg
            touch-manipulation transition-all duration-200
            active:scale-95 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            shadow-sm hover:shadow-md cursor-pointer select-none
            ${refreshing || isNavigating 
              ? 'text-gray-400 cursor-not-allowed opacity-50 bg-gray-100' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }
          `}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          title="Refresh data"
          aria-label="Refresh team data"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Team Capacity Overview */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <h2 className="text-base font-semibold">נתוני צוות • Team Overview</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="mobile-metric">
            <div className="mobile-metric-value text-blue-600">{capacity.maxCapacity}h</div>
            <div className="mobile-metric-label">Max Capacity</div>
          </div>
          <div className="mobile-metric">
            <div className="mobile-metric-value text-green-600">{capacity.currentCapacity}h</div>
            <div className="mobile-metric-label">Available</div>
          </div>
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Utilization</span>
            <span className="font-medium">{capacity.utilization.toFixed(1)}%</span>
          </div>
          <div className="mobile-status-bar">
            <div 
              className="mobile-status-available"
              style={{ width: `${Math.min(capacity.utilization, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="mobile-card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleNavigation(() => handleWeekChange(currentWeekOffset - 1))}
            disabled={loading || isNavigating}
            className={`
              p-3 rounded-full transition-all duration-200
              touch-manipulation active:scale-95 cursor-pointer select-none
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              shadow-sm hover:shadow-md
              ${loading || isNavigating 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Previous sprint"
          >
            {isNavigating ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
          
          <div className="text-center flex-1">
            <div className="font-semibold text-gray-900">{getCurrentSprintString ? getCurrentSprintString() : 'Loading...'}</div>
            <div className="text-sm text-gray-500">
              {currentWeekOffset === 0 ? 'ספרינט נוכחי • Current Sprint' : 
               currentWeekOffset > 0 ? `+${currentWeekOffset} sprints` : 
               `${currentWeekOffset} sprints`}
            </div>
          </div>
          
          <button
            onClick={() => handleNavigation(() => handleWeekChange(currentWeekOffset + 1))}
            disabled={loading || isNavigating}
            className={`
              p-3 rounded-full transition-all duration-200
              touch-manipulation active:scale-95 cursor-pointer select-none
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              shadow-sm hover:shadow-md
              ${loading || isNavigating 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Next sprint"
          >
            {isNavigating ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Daily Schedule Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 px-1">
          לוח זמנים שבועי • Weekly Schedule
        </h3>
        
        {formattedDates.map(({ date, formatted, isToday: isCurrentDay, isPast }) => {
          const stats = getDayStats(date);
          
          return (
            <div 
              key={`mobile-day-${date.toISOString()}-${currentWeekOffset}`} 
              className={`mobile-day-card ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}`}
            >
              {/* Day Header */}
              <div className="mobile-day-header">
                <div>
                  <div className={`mobile-day-title ${isCurrentDay ? 'text-blue-600' : ''}`}>
                    {formatDayName(date)}
                    {isCurrentDay && ' (היום)'}
                  </div>
                  <div className="mobile-day-date">{formatDate(date)}</div>
                </div>
                <div className="text-right">
                  <div className="mobile-day-total">{stats.totalHours}h</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mb-1"></div>
                  <div className="text-sm font-medium">{stats.full}</div>
                  <div className="text-xs text-gray-500">Full</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mb-1"></div>
                  <div className="text-sm font-medium">{stats.half}</div>
                  <div className="text-xs text-gray-500">Half</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mb-1"></div>
                  <div className="text-sm font-medium">{stats.absent}</div>
                  <div className="text-xs text-gray-500">Absent</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-gray-400 rounded-full mb-1"></div>
                  <div className="text-sm font-medium">{stats.missing}</div>
                  <div className="text-xs text-gray-500">Missing</div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="mobile-status-bar mt-3">
                {stats.full > 0 && (
                  <div 
                    className="mobile-status-available"
                    style={{ flex: stats.full }}
                    title={`${stats.full} available`}
                  />
                )}
                {stats.half > 0 && (
                  <div 
                    className="mobile-status-half"
                    style={{ flex: stats.half }}
                    title={`${stats.half} half day`}
                  />
                )}
                {stats.absent > 0 && (
                  <div 
                    className="mobile-status-unavailable"
                    style={{ flex: stats.absent }}
                    title={`${stats.absent} unavailable`}
                  />
                )}
                {stats.missing > 0 && (
                  <div 
                    className="bg-gray-300"
                    style={{ flex: stats.missing }}
                    title={`${stats.missing} missing data`}
                  />
                )}
              </div>

              {/* Quick Actions */}
              {!isPast && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWorkOptionClick(currentUser.id, date, '1')}
                      className={`
                        flex-1 py-2 px-3 rounded-lg text-sm font-medium
                        touch-manipulation transition-all duration-200
                        active:scale-95 focus:ring-2 focus:ring-offset-2
                        shadow-sm hover:shadow-md cursor-pointer select-none
                        bg-green-100 text-green-700 border border-green-200
                        hover:bg-green-50 hover:border-green-300
                        active:bg-green-200 active:border-green-400
                        focus:ring-green-500
                      `}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      aria-label="סמן יום מלא"
                    >
                      יום מלא
                    </button>
                    <button
                      onClick={() => handleWorkOptionClick(currentUser.id, date, '0.5')}
                      className={`
                        flex-1 py-2 px-3 rounded-lg text-sm font-medium
                        touch-manipulation transition-all duration-200
                        active:scale-95 focus:ring-2 focus:ring-offset-2
                        shadow-sm hover:shadow-md cursor-pointer select-none
                        bg-yellow-100 text-yellow-700 border border-yellow-200
                        hover:bg-yellow-50 hover:border-yellow-300
                        active:bg-yellow-200 active:border-yellow-400
                        focus:ring-yellow-500
                      `}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      aria-label="סמן חצי יום"
                    >
                      חצי יום
                    </button>
                    <button
                      onClick={() => handleWorkOptionClick(currentUser.id, date, 'X')}
                      className={`
                        flex-1 py-2 px-3 rounded-lg text-sm font-medium
                        touch-manipulation transition-all duration-200
                        active:scale-95 focus:ring-2 focus:ring-offset-2
                        shadow-sm hover:shadow-md cursor-pointer select-none
                        bg-red-100 text-red-700 border border-red-200
                        hover:bg-red-50 hover:border-red-300
                        active:bg-red-200 active:border-red-400
                        focus:ring-red-500
                      `}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                      aria-label="סמן לא זמין"
                    >
                      לא זמין
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
});

export default MobileTeamDashboard;