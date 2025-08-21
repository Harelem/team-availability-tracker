/**
 * Full Sprint Table Component
 * Displays complete sprint schedule for team members
 * Supports sprint-based planning with working days only
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Award
} from 'lucide-react';
import { SprintLogic } from '@/utils/sprintLogic';
import { enhancedDatabaseService } from '@/lib/enhancedDatabaseService';
import type { TeamMember, Team, ScheduleEntry, CurrentGlobalSprint } from '@/types';

interface FullSprintTableProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
  currentSprint: CurrentGlobalSprint;
  onWorkOptionClick: (memberId: number, date: Date, value: string) => void;
  onMemberUpdate?: (memberId: number) => void;
  className?: string;
}

interface DayCellProps {
  value: '1' | '0.5' | 'X' | null;
  reason?: string;
  canEdit: boolean;
  isManager: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
  onClick: (value: string) => void;
}

// Individual day cell component
function SprintDayCell({ 
  value, 
  reason, 
  canEdit, 
  isManager, 
  isToday, 
  isPast,
  isWeekend,
  onClick 
}: DayCellProps) {
  const [showOptions, setShowOptions] = useState(false);

  const getCellStyle = () => {
    if (isWeekend) {
      return 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed';
    }
    
    if (!value) {
      return `bg-gray-50 border-gray-200 text-gray-400 ${canEdit && !isPast ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`;
    }

    const baseStyle = canEdit && !isPast ? 'cursor-pointer hover:scale-105 hover:shadow-md hover:z-10' : 'cursor-default';
    
    switch (value) {
      case '1':
        return `bg-gradient-to-br from-green-100 to-green-200 border-green-400 text-green-800 shadow-sm ${baseStyle} hover:from-green-200 hover:to-green-300`;
      case '0.5':
        return `bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400 text-yellow-800 shadow-sm ${baseStyle} hover:from-yellow-200 hover:to-yellow-300`;
      case 'X':
        return `bg-gradient-to-br from-red-100 to-red-200 border-red-400 text-red-800 shadow-sm ${baseStyle} hover:from-red-200 hover:to-red-300`;
      default:
        return `bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 text-gray-500 shadow-sm ${baseStyle} hover:from-gray-100 hover:to-gray-200`;
    }
  };

  const getAvailableOptions = () => {
    if (isManager) {
      return SprintLogic.getManagerWorkOptions();
    }
    return SprintLogic.getRegularMemberWorkOptions();
  };

  const handleClick = () => {
    if (!canEdit || isPast || isWeekend) return;
    setShowOptions(true);
  };

  const handleOptionSelect = (selectedValue: string) => {
    onClick(selectedValue);
    setShowOptions(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!canEdit || isPast || isWeekend}
        aria-label={`Set availability for ${isWeekend ? 'weekend (unavailable)' : 'working day'}. Current value: ${isWeekend ? 'Weekend' : (value || 'Not set')}`}
        className={`
          relative w-full min-h-[48px] sm:min-h-[44px] h-12 sm:h-12 border-2 rounded-lg flex items-center justify-center
          transition-all duration-200 min-w-[48px] sm:min-w-[44px] touch-manipulation
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-60
          ${getCellStyle()}
          ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
        `}
      >
        <div className="flex flex-col items-center justify-center relative">
          <span className="text-lg font-bold transition-transform duration-200 hover:scale-110">
            {isWeekend ? 'X' : (value || '—')}
          </span>
          {reason && !isWeekend && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-sm animate-pulse"></div>
          )}
        </div>

        {/* Tooltip for weekends */}
        {isWeekend && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Weekend (auto-excluded)
          </div>
        )}
      </button>

      {/* Options Modal */}
      {showOptions && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowOptions(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="availability-modal-title"
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <h3 id="availability-modal-title" className="text-lg font-bold text-gray-900">Set Availability</h3>
              {isManager && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-2 mt-2">
                  <p className="text-sm font-medium text-purple-700 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Manager Options Available
                  </p>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {getAvailableOptions().map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(option.value)}
                  aria-pressed={value === option.value}
                  aria-describedby={`option-${option.value}-desc`}
                  className={`
                    w-full px-4 py-4 rounded-xl border-2 font-medium min-h-[44px]
                    transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation
                    hover:shadow-lg active:shadow-sm transform-gpu
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${option.color}
                    ${value === option.value ? 'ring-2 ring-blue-400' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-2xl font-bold">{option.label}</div>
                      <div className="text-sm opacity-75">{option.hours} hours</div>
                      <div id={`option-${option.value}-desc`} className="text-xs opacity-60">{option.description}</div>
                    </div>
                    {value === option.value && (
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowOptions(false)}
              className="w-full mt-4 px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200 min-h-[44px] touch-manipulation active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function FullSprintTable({
  currentUser,
  teamMembers,
  selectedTeam,
  currentSprint,
  onWorkOptionClick,
  onMemberUpdate,
  className = ''
}: FullSprintTableProps) {
  const [scheduleData, setScheduleData] = useState<{ [memberId: number]: { [dateKey: string]: ScheduleEntry } }>({});
  const [loading, setLoading] = useState(true);
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set([currentUser.id]));

  // Calculate sprint days (working days only for display)
  const sprintDays = useMemo(() => {
    if (!currentSprint) return [];
    
    const startDate = new Date(currentSprint.sprint_start_date);
    const endDate = new Date(currentSprint.sprint_end_date);
    
    return SprintLogic.getWorkingDays(startDate, endDate);
  }, [currentSprint]);

  // Group days by weeks for better mobile display
  const sprintWeeks = useMemo(() => {
    return SprintLogic.groupSprintDaysByWeek(sprintDays);
  }, [sprintDays]);

  // Load schedule data
  useEffect(() => {
    if (!currentSprint || !selectedTeam) return;
    
    const loadScheduleData = async () => {
      setLoading(true);
      try {
        const data = await enhancedDatabaseService.getSprintScheduleData(String(currentSprint.id), selectedTeam.id);
        setScheduleData(data);
      } catch (error) {
        console.error('Error loading schedule data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadScheduleData();
  }, [currentSprint, selectedTeam]);

  // Calculate team summary
  const teamSummary = useMemo(() => {
    if (!currentSprint || teamMembers.length === 0) return null;

    return SprintLogic.calculateTeamSprintSummary(
      selectedTeam,
      teamMembers,
      currentSprint,
      scheduleData as any // Type assertion to handle interface mismatch
    );
  }, [selectedTeam, teamMembers, currentSprint, scheduleData]);

  // Handle work option click
  const handleWorkOptionClick = useCallback(async (memberId: number, date: Date, value: string) => {
    try {
      const dateKey = SprintLogic.formatDateKey(date);
      
      // Update local state immediately for responsiveness
      setScheduleData(prev => ({
        ...prev,
        [memberId]: {
          ...prev[memberId],
          [dateKey]: {
            member_id: memberId,
            date: dateKey,
            value: value as '1' | '0.5' | 'X',
            sprint_id: String(currentSprint.id)
          }
        }
      }));

      // Call parent handler
      await onWorkOptionClick(memberId, date, value);
      
      // Trigger member update if provided
      if (onMemberUpdate) {
        onMemberUpdate(memberId);
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      // Reload data on error
      window.location.reload();
    }
  }, [currentSprint, onWorkOptionClick, onMemberUpdate]);

  // Quick actions
  const handleSetFullSprint = async (memberId: number) => {
    if (!currentSprint) return;
    
    try {
      const member = teamMembers.find(m => m.id === memberId);
      const isManager = member?.isManager || member?.is_manager;
      
      await enhancedDatabaseService.setFullSprintAvailability(memberId, String(currentSprint.id), isManager);
      
      // Reload data
      const data = await enhancedDatabaseService.getSprintScheduleData(String(currentSprint.id), selectedTeam.id);
      setScheduleData(data);
    } catch (error) {
      console.error('Error setting full sprint:', error);
    }
  };

  const handleClearSprint = async (memberId: number) => {
    if (!currentSprint) return;
    
    if (!confirm('Are you sure you want to clear all sprint data for this member?')) {
      return;
    }
    
    try {
      await enhancedDatabaseService.clearMemberSprintData(memberId, String(currentSprint.id));
      
      // Reload data
      const data = await enhancedDatabaseService.getSprintScheduleData(String(currentSprint.id), selectedTeam.id);
      setScheduleData(data);
    } catch (error) {
      console.error('Error clearing sprint data:', error);
    }
  };

  // Toggle member expansion
  const toggleMemberExpansion = (memberId: number) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentSprint) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 font-medium">No active sprint found</p>
          <p className="text-sm text-gray-400 mt-1">Please contact your administrator to set up a sprint</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-shadow duration-200 hover:shadow-xl ${className}`}>
      {/* Sprint Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 relative overflow-hidden">
        {/* Header background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Sprint {currentSprint.current_sprint_number} Schedule
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {SprintLogic.formatDateRange(new Date(currentSprint.sprint_start_date), new Date(currentSprint.sprint_end_date))}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{sprintDays.filter(d => d.isWorkingDay).length}</div>
            <div className="text-blue-100 text-sm">Working Days</div>
          </div>
        </div>
        
        {/* Sprint Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentSprint.progress_percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-blue-100 mt-1">
            <span>Started</span>
            <span>{currentSprint.progress_percentage}% Complete</span>
            <span>{currentSprint.days_remaining} days left</span>
          </div>
        </div>

        {/* Team Summary */}
        {teamSummary && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold">{teamSummary.totalMembers}</div>
              <div className="text-blue-100 text-xs">Team Members</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{teamSummary.maxCapacityHours}h</div>
              <div className="text-blue-100 text-xs">Max Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{teamSummary.actualHours}h</div>
              <div className="text-blue-100 text-xs">Current Hours</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{teamSummary.utilizationPercentage}%</div>
              <div className="text-blue-100 text-xs">Utilization</div>
            </div>
          </div>
        )}
        </div>
        
        {/* Header shadow for depth */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-b from-blue-800/20 to-transparent"></div>
      </div>

      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-900 z-30 min-w-[160px] md:min-w-[200px] border-r-2 border-gray-300 shadow-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span>Team Member</span>
                </div>
              </th>
              {sprintDays.filter(day => day.isWorkingDay).map((day, index) => (
                <th key={index} className="px-1 md:px-2 py-3 md:py-4 text-center text-xs md:text-sm font-medium text-gray-900 min-w-[48px] md:min-w-[60px] border-l border-gray-200 first:border-l-0 hover:bg-white/50 transition-colors duration-150">
                  <div className="flex flex-col">
                    <span className="font-semibold">{SprintLogic.getDayAbbrev(day.date)}</span>
                    <span className="text-xs text-gray-500 font-normal bg-gray-100 px-1 rounded mt-1">
                      {day.date.getDate()}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-medium text-gray-900 min-w-[80px] md:min-w-[100px] border-l-2 border-gray-300 bg-gradient-to-r from-transparent to-gray-100">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span>Total Hours</span>
                </div>
              </th>
              <th className="px-2 md:px-4 py-3 md:py-4 text-center text-xs md:text-sm font-medium text-gray-900 min-w-[70px] md:min-w-[80px] border-l border-gray-300 bg-gray-100">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                  <span>Actions</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamMembers.map((member) => {
              const canEdit = currentUser.isManager || member.id === currentUser.id;
              const isManager = member.isManager || member.is_manager;
              const memberSchedule = scheduleData[member.id] || {};
              
              // Calculate total hours for sprint
              const memberSummary = teamSummary?.memberSummaries.find(s => s.memberId === member.id);
              
              return (
                <tr key={member.id} className={`hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 ${
                  member.id === currentUser.id ? 'bg-gradient-to-r from-blue-50 to-indigo-50/30 border-l-4 border-blue-400' : ''
                } hover:shadow-sm`}>
                  {/* Member Name (Sticky) */}
                  <td className="sticky left-0 bg-white px-4 md:px-6 py-3 md:py-4 z-10 border-r border-gray-200 shadow-sm">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {member.name}
                          {isManager && (
                            <span className="px-3 py-1 text-xs bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-full shadow-sm">
                              Manager
                            </span>
                          )}
                          {member.id === currentUser.id && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{member.hebrew}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Daily Schedule */}
                  {sprintDays.filter(day => day.isWorkingDay).map((day, dayIndex) => {
                    const dateKey = SprintLogic.formatDateKey(day.date);
                    const entry = memberSchedule[dateKey];
                    const isToday = SprintLogic.isDateToday(day.date);
                    const isPast = SprintLogic.isDatePast(day.date);
                    
                    return (
                      <td key={dayIndex} className={`px-1 md:px-2 py-3 md:py-4 text-center relative ${
                        isToday ? 'bg-blue-50' : ''
                      }`}>
                        <SprintDayCell
                          value={entry?.value || null}
                          reason={entry?.reason}
                          canEdit={canEdit}
                          isManager={!!isManager}
                          isToday={isToday}
                          isPast={isPast}
                          isWeekend={false}
                          onClick={(value) => handleWorkOptionClick(member.id, day.date, value)}
                        />
                      </td>
                    );
                  })}
                  
                  {/* Total Hours */}
                  <td className="px-4 py-4 text-center font-medium bg-gradient-to-r from-transparent to-gray-50">
                    <div className={`inline-flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                      (memberSummary?.actualHours || 0) > 0 
                        ? 'text-green-700 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-sm' 
                        : 'text-gray-500 bg-gray-50 border border-gray-200'
                    }`}>
                      <span className="text-lg font-bold">{memberSummary?.actualHours || 0}h</span>
                      <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">
                        {memberSummary?.utilizationPercentage || 0}%
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-center bg-gray-50">
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleSetFullSprint(member.id)}
                          className="px-3 py-2 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-md hover:from-green-600 hover:to-emerald-600 transition-all duration-200 min-h-[36px] min-w-[44px] touch-manipulation active:scale-95 shadow-sm hover:shadow-md"
                          title="Set full sprint availability"
                        >
                          Fill Sprint
                        </button>
                        <button
                          onClick={() => handleClearSprint(member.id)}
                          className="px-3 py-2 text-xs bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium rounded-md hover:from-red-600 hover:to-rose-600 transition-all duration-200 min-h-[36px] min-w-[44px] touch-manipulation active:scale-95 shadow-sm hover:shadow-md"
                          title="Clear sprint data"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden p-4 space-y-4">
        {teamMembers.map((member) => {
          const canEdit = currentUser.isManager || member.id === currentUser.id;
          const isManager = member.isManager || member.is_manager;
          const isCurrentUser = member.id === currentUser.id;
          const isExpanded = expandedMembers.has(member.id);
          const memberSchedule = scheduleData[member.id] || {};
          const memberSummary = teamSummary?.memberSummaries.find(s => s.memberId === member.id);
          
          return (
            <div 
              key={member.id}
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md ${
                isCurrentUser ? 'ring-2 ring-blue-500 ring-opacity-30 shadow-blue-100' : ''
              } ${
                isExpanded ? 'shadow-lg border-gray-300' : ''
              }`}
            >
              {/* Member Header */}
              <div 
                className="px-4 py-4 cursor-pointer select-none bg-gradient-to-r from-white to-gray-50 min-h-[48px] sm:min-h-[44px] touch-manipulation active:bg-gray-100 transition-all duration-150 hover:from-gray-50 hover:to-gray-100"
                onClick={() => toggleMemberExpansion(member.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      isCurrentUser ? 'bg-blue-500' : 
                      isManager ? 'bg-purple-500' : 'bg-gray-500'
                    }`}>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium text-gray-900 truncate">
                          {member.name}
                        </h3>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            You
                          </span>
                        )}
                        {isManager && (
                          <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-full shadow-sm">
                            Manager
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{member.hebrew}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {memberSummary?.actualHours || 0}h
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {memberSummary?.utilizationPercentage || 0}% util
                      </div>
                    </div>
                    <div className={`transform transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}>
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Expanded Schedule Grid */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4">
                  {/* Week-by-Week Layout */}
                  <div className="space-y-4">
                    {sprintWeeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="space-y-2">
                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Week {weekIndex + 1}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {week.filter(day => day.isWorkingDay).map((day, dayIndex) => {
                            const dateKey = SprintLogic.formatDateKey(day.date);
                            const entry = memberSchedule[dateKey];
                            const isToday = SprintLogic.isDateToday(day.date);
                            const isPast = SprintLogic.isDatePast(day.date);
                            
                            return (
                              <div key={dayIndex} className="space-y-1">
                                <div className="text-xs text-center text-gray-600">
                                  {SprintLogic.getDayAbbrev(day.date)}
                                </div>
                                <div className="text-xs text-center text-gray-500">
                                  {day.date.getDate()}
                                </div>
                                
                                <SprintDayCell
                                  value={entry?.value || null}
                                  reason={entry?.reason}
                                  canEdit={canEdit}
                                  isManager={!!isManager}
                                  isToday={isToday}
                                  isPast={isPast}
                                  isWeekend={false}
                                  onClick={(value) => handleWorkOptionClick(member.id, day.date, value)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick Actions */}
                  {canEdit && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleSetFullSprint(member.id)}
                          className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium text-sm hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] touch-manipulation active:scale-95 shadow-lg hover:shadow-xl"
                        >
                          <Zap className="w-4 h-4" />
                          Fill Sprint
                        </button>
                        <button
                          onClick={() => handleClearSprint(member.id)}
                          className="px-4 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-lg font-medium text-sm hover:from-slate-600 hover:to-gray-700 transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] touch-manipulation active:scale-95 shadow-lg hover:shadow-xl"
                        >
                          <XCircle className="w-4 h-4" />
                          Clear Sprint
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sprint Summary Footer */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-t border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Sprint Planning Overview
              </div>
              <div className="text-xs text-gray-600">
                Professional team availability tracking with automatic weekend handling
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
              <div className="w-4 h-4 bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-400 rounded-md shadow-sm"></div>
              <span className="text-gray-700 font-medium">Full Day</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">7h</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
              <div className="w-4 h-4 bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-400 rounded-md shadow-sm"></div>
              <span className="text-gray-700 font-medium">Half Day</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">3.5h</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
              <div className="w-4 h-4 bg-gradient-to-br from-red-100 to-red-200 border-2 border-red-400 rounded-md shadow-sm"></div>
              <span className="text-gray-700 font-medium">Unavailable</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">0h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
