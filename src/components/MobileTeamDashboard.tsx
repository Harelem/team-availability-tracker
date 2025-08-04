'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, BarChart, Eye, RefreshCw } from 'lucide-react';
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
  getCurrentWeekString: () => string;
  getTeamTotalHours: () => number;
}

export default function MobileTeamDashboard({
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
  getCurrentWeekString,
  getTeamTotalHours
}: MobileTeamDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Force page refresh for cache invalidation
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('he-IL', { 
      weekday: 'short' 
    });
  };

  const getDayStats = (date: Date) => {
    const daySchedule = scheduleData[date.toISOString().split('T')[0]] || {};
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
    <div className="mobile-dashboard min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {selectedTeam?.name || 'Team Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 truncate">
              {teamMembers.length} חברי צוות • {teamMembers.length} Team Members
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
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
            onClick={() => onWeekChange(currentWeekOffset - 1)}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="text-center flex-1">
            <div className="font-semibold text-gray-900">{getCurrentWeekString()}</div>
            <div className="text-sm text-gray-500">
              {currentWeekOffset === 0 ? 'שבוע נוכחי • Current Week' : 
               currentWeekOffset > 0 ? `+${currentWeekOffset} weeks` : 
               `${currentWeekOffset} weeks`}
            </div>
          </div>
          
          <button
            onClick={() => onWeekChange(currentWeekOffset + 1)}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Daily Schedule Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 px-1">
          לוח זמנים שבועי • Weekly Schedule
        </h3>
        
        {weekDays.map(date => {
          const stats = getDayStats(date);
          const isPast = isPastDate(date);
          const isCurrentDay = isToday(date);
          
          return (
            <div 
              key={date.toISOString()} 
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
                      onClick={() => onWorkOptionClick(currentUser.id, date, '1')}
                      className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg text-sm font-medium"
                    >
                      יום מלא
                    </button>
                    <button
                      onClick={() => onWorkOptionClick(currentUser.id, date, '0.5')}
                      className="flex-1 bg-yellow-100 text-yellow-700 py-2 px-3 rounded-lg text-sm font-medium"
                    >
                      חצי יום
                    </button>
                    <button
                      onClick={() => onWorkOptionClick(currentUser.id, date, 'X')}
                      className="flex-1 bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium"
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

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav">
        <div className="flex justify-around">
          <a href="/" className="mobile-nav-item active">
            <Calendar className="h-5 w-5 mobile-nav-item-icon" />
            <span className="mobile-nav-item-label">Schedule</span>
          </a>
          <a href="/teams" className="mobile-nav-item">
            <Users className="h-5 w-5 mobile-nav-item-icon" />
            <span className="mobile-nav-item-label">Teams</span>
          </a>
          <a href="/executive" className="mobile-nav-item">
            <BarChart className="h-5 w-5 mobile-nav-item-icon" />
            <span className="mobile-nav-item-label">Reports</span>
          </a>
          <button className="mobile-nav-item">
            <Eye className="h-5 w-5 mobile-nav-item-icon" />
            <span className="mobile-nav-item-label">View</span>
          </button>
        </div>
      </div>
    </div>
  );
}