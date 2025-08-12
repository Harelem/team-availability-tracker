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

    const baseStyle = canEdit && !isPast ? 'cursor-pointer hover:scale-105' : 'cursor-default';
    
    switch (value) {
      case '1':
        return `bg-green-100 border-green-300 text-green-800 ${baseStyle}`;
      case '0.5':
        return `bg-yellow-100 border-yellow-300 text-yellow-800 ${baseStyle}`;
      case 'X':
        return `bg-red-100 border-red-300 text-red-800 ${baseStyle}`;
      default:
        return `bg-gray-50 border-gray-200 text-gray-400 ${baseStyle}`;
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
      <div
        onClick={handleClick}
        className={`
          relative w-full min-h-[44px] h-12 border-2 rounded-lg flex items-center justify-center
          transition-all duration-200 min-w-[48px] touch-manipulation
          ${getCellStyle()}
          ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
        `}
      >
        <div className="flex flex-col items-center justify-center">
          <span className="text-lg font-bold">
            {isWeekend ? 'X' : (value || '—')}
          </span>
          {reason && !isWeekend && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
          )}
        </div>

        {/* Tooltip for weekends */}
        {isWeekend && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Weekend (auto-excluded)
          </div>
        )}
      </div>

      {/* Options Modal */}
      {showOptions && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowOptions(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Set Availability</h3>
              {isManager && (
                <p className="text-sm text-purple-600 mt-1">Manager options</p>
              )}
            </div>
            
            <div className="space-y-3">
              {getAvailableOptions().map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(option.value)}
                  className={`
                    w-full px-4 py-4 rounded-xl border-2 font-medium min-h-[44px]
                    transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation
                    ${option.color}
                    ${value === option.value ? 'ring-2 ring-blue-400' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-2xl font-bold">{option.label}</div>
                      <div className="text-sm opacity-75">{option.hours} hours</div>
                      <div className="text-xs opacity-60">{option.description}</div>
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
              className="w-full mt-4 px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors min-h-[44px] touch-manipulation"
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
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Sprint Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
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

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-6 py-4 text-left text-sm font-medium text-gray-900 z-10 min-w-[200px]">
                Team Member
              </th>
              {sprintDays.filter(day => day.isWorkingDay).map((day, index) => (
                <th key={index} className="px-2 py-4 text-center text-sm font-medium text-gray-900 min-w-[60px]">
                  <div className="flex flex-col">
                    <span>{SprintLogic.getDayAbbrev(day.date)}</span>
                    <span className="text-xs text-gray-500 font-normal">
                      {day.date.getDate()}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 min-w-[100px]">
                Total Hours
              </th>
              <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 min-w-[80px]">
                Actions
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
                <tr key={member.id} className={`hover:bg-gray-50 transition-colors ${
                  member.id === currentUser.id ? 'bg-blue-50' : ''
                }`}>
                  {/* Member Name (Sticky) */}
                  <td className="sticky left-0 bg-white px-6 py-4 z-10 border-r border-gray-200">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {member.name}
                          {isManager && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
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
                      <td key={dayIndex} className={`px-2 py-4 text-center relative ${
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
                  <td className="px-4 py-4 text-center font-medium">
                    <div className={`inline-flex flex-col items-center gap-1 ${
                      (memberSummary?.actualHours || 0) > 0 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <span className="text-lg font-bold">{memberSummary?.actualHours || 0}h</span>
                      <span className="text-xs">
                        {memberSummary?.utilizationPercentage || 0}%
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-center">
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleSetFullSprint(member.id)}
                          className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors min-h-[36px] min-w-[44px] touch-manipulation active:bg-green-300"
                          title="Set full sprint availability"
                        >
                          Fill
                        </button>
                        <button
                          onClick={() => handleClearSprint(member.id)}
                          className="px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors min-h-[36px] min-w-[44px] touch-manipulation active:bg-red-300"
                          title="Clear sprint data"
                        >
                          Clear
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

      {/* Mobile View */}
      <div className="lg:hidden p-4 space-y-4">
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
              className={`bg-gray-50 rounded-xl border overflow-hidden transition-all duration-200 ${
                isCurrentUser ? 'ring-2 ring-blue-500 ring-opacity-20' : ''
              }`}
            >
              {/* Member Header */}
              <div 
                className="px-4 py-4 cursor-pointer select-none bg-white min-h-[44px] touch-manipulation active:bg-gray-50"
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
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                            Manager
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{member.hebrew}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {memberSummary?.actualHours || 0}h
                      </div>
                      <div className="text-xs text-gray-500">
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
                        <div className="grid grid-cols-5 gap-2">
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
                          className="px-4 py-3 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 min-h-[44px] touch-manipulation active:bg-green-800"
                        >
                          <Zap className="w-4 h-4" />
                          Fill Sprint
                        </button>
                        <button
                          onClick={() => handleClearSprint(member.id)}
                          className="px-4 py-3 bg-gray-600 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 min-h-[44px] touch-manipulation active:bg-gray-800"
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
      <div className="bg-gray-50 px-6 py-4 border-t">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Sprint Summary:</span>
            {' '}Complete sprint-based availability planning with automatic weekend handling
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-600">Full Day (7h)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span className="text-gray-600">Half Day (3.5h)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-gray-600">Unavailable (0h)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
