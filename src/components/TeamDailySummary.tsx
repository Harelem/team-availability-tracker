'use client';

import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Users, AlertTriangle } from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeamDailyStatus } from '@/hooks/useTeamDailyStatus';
import { TeamDailyCalculationService, DayStatus } from '@/lib/teamDailyCalculationService';
import { getUserRole } from '@/utils/permissions';
import DayStatusDetailModal from '@/components/ui/DayStatusDetailModal';

interface TeamDailySummaryProps {
  team: Team;
  teamMembers: TeamMember[];
  currentWeekOffset: number;
  currentUser: TeamMember;
  className?: string;
}

interface DailyStatusCardProps {
  dayStatus: DayStatus;
  isToday: boolean;
  isWeekend: boolean;
  onStatusClick: (statusType: 'full' | 'half' | 'absent' | 'missing') => void;
}

const DailyStatusCard: React.FC<DailyStatusCardProps> = ({ 
  dayStatus, 
  isToday, 
  isWeekend,
  onStatusClick
}) => {
  const date = new Date(dayStatus.date);
  const dayName = TeamDailyCalculationService.formatDayName(date);
  const dateFormatted = TeamDailyCalculationService.formatDate(date);
  
  // Status indicators with colors and click handlers
  const statusItems = [
    { 
      count: dayStatus.fullDay, 
      label: 'Full', 
      color: 'text-green-600', 
      bgColor: 'bg-green-500',
      icon: '●',
      statusType: 'full' as const
    },
    { 
      count: dayStatus.halfDay, 
      label: 'Half', 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-500',
      icon: '●',
      statusType: 'half' as const
    },
    { 
      count: dayStatus.absent, 
      label: 'Absent', 
      color: 'text-red-600', 
      bgColor: 'bg-red-500',
      icon: '●',
      statusType: 'absent' as const
    },
    { 
      count: dayStatus.notFilled, 
      label: 'Missing', 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-400',
      icon: '●',
      statusType: 'missing' as const
    }
  ];

  return (
    <div className={`
      border rounded-lg p-2 sm:p-3 text-center transition-all duration-200
      ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50'}
      ${isWeekend ? 'bg-gray-100 opacity-75' : ''}
    `}>
      {/* Day header */}
      <div className="mb-2">
        <div className={`text-xs sm:text-sm font-medium ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
          {dayName}
        </div>
        <div className={`text-xs ${isToday ? 'text-blue-700' : 'text-gray-600'}`}>
          {dateFormatted}
        </div>
        {isWeekend && (
          <div className="text-xs text-gray-500 italic">Weekend</div>
        )}
      </div>
      
      {/* Status indicators */}
      <div className="space-y-1">
        {statusItems.map((item, index) => (
          <button
            key={index} 
            onClick={() => item.count > 0 && onStatusClick(item.statusType)}
            disabled={item.count === 0}
            className={`
              flex items-center justify-center text-xs w-full rounded px-1 py-0.5 transition-colors
              ${item.color}
              ${item.count > 0 ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}
              ${item.count === 0 ? 'opacity-50' : ''}
            `}
            title={item.count > 0 ? `Click to see ${item.label.toLowerCase()} team members` : undefined}
            aria-label={item.count > 0 ? `View ${item.count} ${item.label.toLowerCase()} team members` : undefined}
          >
            <span className={`w-2 h-2 ${item.bgColor} rounded-full mr-1 flex-shrink-0`}></span>
            <span className="font-medium">{item.count}</span>
            <span className="ml-1 truncate">{item.label}</span>
          </button>
        ))}
      </div>
      
      {/* Total hours for the day */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className={`text-sm font-semibold ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
          {dayStatus.totalHours}h
        </div>
      </div>
    </div>
  );
};

const TeamMetricsRow: React.FC<{ 
  totalHours: number;
  completionRate: number;
  avgHoursPerDay: number;
  teamSize: number;
}> = ({ totalHours, completionRate, avgHoursPerDay, teamSize }) => {
  const metrics = [
    {
      value: `${totalHours}h`,
      label: 'Total Hours',
      color: 'text-blue-600'
    },
    {
      value: `${completionRate}%`,
      label: 'Completion Rate',
      color: TeamDailyCalculationService.getStatusColor(completionRate)
    },
    {
      value: `${avgHoursPerDay}h`,
      label: 'Avg Hours/Day',
      color: 'text-orange-600'
    },
    {
      value: teamSize.toString(),
      label: 'Team Size',
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
      {metrics.map((metric, index) => (
        <div key={index} className="text-center">
          <div className={`text-lg font-bold ${metric.color}`}>
            {metric.value}
          </div>
          <div className="text-sm text-gray-600">{metric.label}</div>
        </div>
      ))}
    </div>
  );
};

export default function TeamDailySummary({
  team,
  teamMembers,
  currentWeekOffset,
  currentUser,
  className = ''
}: TeamDailySummaryProps) {
  const [isClient, setIsClient] = useState(false);
  
  // Handle hydration by only showing time-dependent content on client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const { data, isLoading, error, refetch } = useTeamDailyStatus({
    team,
    teamMembers,
    currentWeekOffset
  });

  // Modal state for status details
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    date: string;
    statusType: 'full' | 'half' | 'absent' | 'missing';
    dayStatus: DayStatus | null;
  }>({
    isOpen: false,
    date: '',
    statusType: 'full',
    dayStatus: null
  });

  const isManager = currentUser.isManager;
  const userRole = getUserRole(currentUser);

  // Handle status click to open modal
  const handleStatusClick = (dayStatus: DayStatus, statusType: 'full' | 'half' | 'absent' | 'missing') => {
    setModalState({
      isOpen: true,
      date: dayStatus.date,
      statusType,
      dayStatus
    });
  };

  // Close modal
  const closeModal = () => {
    setModalState({
      isOpen: false,
      date: '',
      statusType: 'full',
      dayStatus: null
    });
  };

  const exportTeamSummary = () => {
    if (!data) return;
    
    // Create a simple export of team summary data
    const exportData = {
      teamName: data.teamName,
      weekOffset: data.currentWeekOffset,
      weekMetrics: data.weekMetrics,
      dailyData: data.weekDays.map(day => ({
        date: day.date,
        totalHours: day.totalHours,
        fullDay: day.fullDay,
        halfDay: day.halfDay,
        absent: day.absent,
        notFilled: day.notFilled
      })),
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team.name.replace(/\s+/g, '_')}_team_summary_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className={`mb-6 ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-200 rounded h-12"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={`mb-6 border-l-4 border-red-500 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-800">Team Summary Error</h3>
                <p className="text-sm text-red-600 mt-1">
                  {error || 'Unable to load team daily summary'}
                </p>
              </div>
            </div>
            <button
              onClick={refetch}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`mb-6 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>{data.teamName} Team Summary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-normal">Current Week</span>
            {isManager && (
              <button
                onClick={exportTeamSummary}
                className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                title="Export team summary"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
            <button
              onClick={refetch}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh summary"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Daily status grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
          {data.weekDays.map((dayStatus) => {
            const date = new Date(dayStatus.date);
            // Only calculate isToday on client side to avoid hydration issues
            const isToday = isClient ? TeamDailyCalculationService.isToday(date) : false;
            const isWeekend = TeamDailyCalculationService.isWeekend(date);
            
            return (
              <DailyStatusCard
                key={dayStatus.date}
                dayStatus={dayStatus}
                isToday={isToday}
                isWeekend={isWeekend}
                onStatusClick={(statusType) => handleStatusClick(dayStatus, statusType)}
              />
            );
          })}
        </div>
        
        {/* Team metrics */}
        <TeamMetricsRow
          totalHours={data.weekMetrics.totalHours}
          completionRate={data.weekMetrics.completionRate}
          avgHoursPerDay={data.weekMetrics.avgHoursPerDay}
          teamSize={data.weekMetrics.teamSize}
        />

        {/* Additional info for managers */}
        {isManager && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Role: {userRole} • Team Size: {teamMembers.length} members</span>
              <span>Week Offset: {currentWeekOffset === 0 ? 'Current' : currentWeekOffset > 0 ? `+${currentWeekOffset}` : currentWeekOffset}</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Status Detail Modal */}
      <DayStatusDetailModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        date={modalState.date}
        statusType={modalState.statusType}
        members={modalState.dayStatus?.memberDetails || []}
        teamName={team.name}
      />
    </Card>
  );
}