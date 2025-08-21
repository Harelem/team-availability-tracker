'use client';

import { useMemo } from 'react';
import { detectCurrentSprintForDateSync } from '@/utils/smartSprintDetection';
import { Clock, MessageSquare } from 'lucide-react';
import { TeamMember, WorkOption } from '@/types';
import EnhancedDayCell from './EnhancedDayCell';
import { ComponentErrorBoundary } from './ErrorBoundary';

interface EnhancedAvailabilityTableProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  scheduleData: any;
  workOptions: WorkOption[];
  sprintDays: Date[];
  onWorkOptionClick: (memberId: number, date: Date, value: string) => void;
  onReasonRequired: (memberId: number, date: Date, value: '0.5' | 'X') => void;
  onQuickReasonSelect?: (memberId: number, date: Date, value: '0.5' | 'X', reason: string) => void;
  onFullSprintSet: (memberId: number) => void;
  calculateSprintHours: (memberId: number) => number;
  getTeamTotalHours: () => number;
  isToday: (date: Date) => boolean;
  isPastDate: (date: Date) => boolean;
  formatDate: (date: Date) => string;
}

export default function EnhancedAvailabilityTable({
  currentUser,
  teamMembers,
  scheduleData,
  workOptions,
  sprintDays,
  onWorkOptionClick,
  onReasonRequired,
  onQuickReasonSelect,
  onFullSprintSet,
  calculateSprintHours,
  getTeamTotalHours,
  isToday,
  isPastDate,
  formatDate
}: EnhancedAvailabilityTableProps) {
  
  // Debug logging to track table rendering
  console.log('📊 EnhancedAvailabilityTable: Rendering attempt', {
    currentUser: !!currentUser,
    teamMembers: teamMembers?.length || 0,
    scheduleData: !!scheduleData,
    workOptions: workOptions?.length || 0,
    sprintDays: sprintDays?.length || 0,
    timestamp: new Date().toISOString()
  });

  // Helper function for comprehensive date validation
  const validateSprintDate = (date: any): date is Date => {
    return date && 
           typeof date === 'object' && 
           date instanceof Date &&
           typeof date.toLocaleDateString === 'function' &&
           typeof date.toISOString === 'function' &&
           !isNaN(date.getTime()) &&
           date.getFullYear() >= 2020 && // Reasonable date range
           date.getFullYear() <= 2030;
  };

  // Generate calculated sprint fallback when no valid data is available
  const generateCalculatedSprintFallback = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    
    // Generate 10 working days (2-week sprint)
    const calculatedDays: Date[] = [];
    const currentDate = new Date(startOfWeek);
    let workingDaysAdded = 0;
    
    while (workingDaysAdded < 10) { // 2 weeks * 5 working days
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 0 && dayOfWeek <= 4) { // Sunday to Thursday
        calculatedDays.push(new Date(currentDate));
        workingDaysAdded++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      validatedSprintDays: calculatedDays,
      dayNames: calculatedDays.map(date => 
        date.toLocaleDateString('en-US', { weekday: 'long' })
      )
    };
  };

  // Enhanced date validation with smart fallback generation
  const { validatedSprintDays, dayNames } = useMemo(() => {
    // Priority 1: Use provided sprintDays if valid
    if (Array.isArray(sprintDays) && sprintDays.length > 0) {
      const validDates = sprintDays.filter(validateSprintDate);
      
      if (validDates.length === sprintDays.length && validDates.length > 0) {
        return {
          validatedSprintDays: validDates,
          dayNames: validDates.map(date => 
            date.toLocaleDateString('en-US', { weekday: 'long' })
          )
        };
      }
      
      // Some dates were invalid, log warning but continue with valid ones
      if (validDates.length > 0) {
        console.warn(`EnhancedAvailabilityTable: Filtered ${sprintDays.length - validDates.length} invalid dates from sprintDays`);
        return {
          validatedSprintDays: validDates,
          dayNames: validDates.map(date => 
            date.toLocaleDateString('en-US', { weekday: 'long' })
          )
        };
      }
    }
    
    // Priority 2: Generate smart fallback using smart sprint detection
    try {
      const smartSprint = detectCurrentSprintForDateSync();
      if (smartSprint && smartSprint.workingDays && smartSprint.workingDays.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.info('📅 EnhancedAvailabilityTable: Using smart sprint detection fallback', {
            sprint: smartSprint.sprintName,
            workingDays: smartSprint.workingDays.length,
            dateRange: `${smartSprint.startDate.toDateString()} - ${smartSprint.endDate.toDateString()}`
          });
        }
        
        return {
          validatedSprintDays: smartSprint.workingDays,
          dayNames: smartSprint.workingDays.map(date => 
            date.toLocaleDateString('en-US', { weekday: 'long' })
          )
        };
      }
    } catch (error) {
      console.warn('EnhancedAvailabilityTable: Smart sprint detection failed, using calculated fallback:', error);
    }
    
    // Priority 3: Generate calculated current sprint dates
    if (process.env.NODE_ENV === 'development') {
      console.info('📅 EnhancedAvailabilityTable: Using calculated sprint fallback');
    }
    
    return generateCalculatedSprintFallback();
  }, [sprintDays]);

  // Conditional debug logging - only when fallbacks are used or during development issues
  if (process.env.NODE_ENV === 'development' && 
      (!sprintDays || sprintDays.length === 0 || sprintDays.some(date => !validateSprintDate(date)))) {
    console.info('📅 EnhancedAvailabilityTable: Enhanced fallback system activated', {
      originalSprintDaysLength: sprintDays?.length || 0,
      validatedSprintDaysLength: validatedSprintDays?.length || 0,
      fallbackSource: !sprintDays || sprintDays.length === 0 ? 
        'empty-array' : 
        sprintDays.some(date => !validateSprintDate(date)) ? 
          'invalid-dates' : 
          'unknown',
      generatedDateRange: validatedSprintDays.length > 0 ? 
        `${validatedSprintDays[0]?.toDateString() || ''} - ${validatedSprintDays[validatedSprintDays.length - 1]?.toDateString() || ''}` : 
        'none'
    });
  }

  // Enhanced defensive checks with better debugging
  if (!currentUser || !Array.isArray(teamMembers) || !scheduleData || !Array.isArray(workOptions) || !Array.isArray(validatedSprintDays)) {
    console.error('❌ EnhancedAvailabilityTable: Missing required props - TABLE HIDDEN', {
      currentUser: !!currentUser,
      teamMembers: Array.isArray(teamMembers) ? teamMembers.length : 'NOT_ARRAY',
      scheduleData: !!scheduleData,
      workOptions: Array.isArray(workOptions) ? workOptions.length : 'NOT_ARRAY',
      validatedSprintDays: Array.isArray(validatedSprintDays) ? validatedSprintDays.length : 'NOT_ARRAY',
      originalSprintDays: Array.isArray(sprintDays) ? sprintDays.length : 'NOT_ARRAY'
    });
    
    // More informative error display
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-8 text-center">
        <p className="text-red-700 font-medium">⚠️ Table Loading Issue Detected</p>
        <p className="text-red-600 text-sm mt-2">
          Missing: {[
            !currentUser && 'User',
            !Array.isArray(teamMembers) && 'Team Members',
            !scheduleData && 'Schedule Data',
            !Array.isArray(workOptions) && 'Work Options',
            !Array.isArray(validatedSprintDays) && 'Sprint Days'
          ].filter(Boolean).join(', ')}
        </p>
        <p className="text-red-500 text-xs mt-1">Check console for detailed debugging info</p>
      </div>
    );
  }

  // ENHANCED: Validation check for validated arrays with better debugging
  if (validatedSprintDays.length === 0) {
    console.error('❌ EnhancedAvailabilityTable: All fallback systems failed - TABLE HIDDEN', {
      originalSprintDays: sprintDays?.length || 0,
      validatedSprintDays: validatedSprintDays?.length || 0,
      fallbackAttempted: true
    });
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
        <p className="text-yellow-800 font-medium">⚠️ Sprint Days Generation Failed</p>
        <p className="text-yellow-600 text-sm mt-2">Table hidden due to invalid sprint date configuration</p>
        <p className="text-yellow-500 text-xs mt-1">Check console for detailed debugging info</p>
      </div>
    );
  }

  // Arrays should now always match since dayNames is generated from validatedSprintDays
  // This validation should never trigger now, but kept for defensive programming
  if (validatedSprintDays.length !== dayNames.length) {
    console.error('EnhancedAvailabilityTable: Critical array mismatch in validation system');
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded-lg">
        <p className="text-red-800">Critical Error: Internal validation system failure</p>
        <p className="text-red-600 text-sm mt-2">Please refresh the page or contact support.</p>
      </div>
    );
  }

  // Create enhanced sprint calendar with weekend reference columns
  const enhancedSprintCalendar = useMemo(() => {
    if (!validatedSprintDays || validatedSprintDays.length === 0) return [];

    const calendar: Array<{date: Date, type: string, label: string, isVisible: boolean}> = [];
    let previousWeekEnd: Date | null = null;
    
    // Group working days by week and add weekend reference columns
    for (let i = 0; i < validatedSprintDays.length; i++) {
      const workingDay = validatedSprintDays[i];
      if (!workingDay) continue;
      const dayOfWeek = workingDay.getDay(); // 0=Sunday, 6=Saturday
      
      // Check if this is the start of a new week (Sunday)
      if (dayOfWeek === 0) {
        // Add weekend reference for the gap between weeks (only if we had a previous week)
        if (previousWeekEnd) {
          const friday = new Date(previousWeekEnd);
          friday.setDate(previousWeekEnd.getDate() + 1);
          const saturday = new Date(previousWeekEnd);
          saturday.setDate(previousWeekEnd.getDate() + 2);
          
          calendar.push({
            date: friday,
            type: 'weekend-reference',
            label: 'Fri',
            isVisible: true
          });
          
          calendar.push({
            date: saturday,
            type: 'weekend-reference',
            label: 'Sat',
            isVisible: true
          });
        }
        previousWeekEnd = null;
      }
      
      // Add the working day
      calendar.push({
        date: workingDay,
        type: 'working-day',
        label: workingDay.toLocaleDateString('en-US', { weekday: 'short' }),
        isVisible: true
      });
      
      // If it's Thursday (end of work week), mark it for potential weekend reference
      if (dayOfWeek === 4) {
        previousWeekEnd = new Date(workingDay);
      }
    }
    
    // Add final weekend reference if sprint ends on Thursday
    if (previousWeekEnd) {
      const friday = new Date(previousWeekEnd);
      friday.setDate(previousWeekEnd.getDate() + 1);
      const saturday = new Date(previousWeekEnd);
      saturday.setDate(previousWeekEnd.getDate() + 2);
      
      calendar.push({
        date: friday,
        type: 'weekend-reference',
        label: 'Fri',
        isVisible: true
      });
      
      calendar.push({
        date: saturday,
        type: 'weekend-reference',
        label: 'Sat',
        isVisible: true
      });
    }
    
    return calendar;
  }, [validatedSprintDays]);

  // Calculate daily totals for footer - ENHANCED DEFENSIVE PROGRAMMING
  const getDayTotal = (date: Date) => {
    if (!date || typeof date.toISOString !== 'function') {
      console.warn('getDayTotal: Invalid date provided:', date);
      return 0;
    }
    
    if (!Array.isArray(teamMembers) || !scheduleData || !Array.isArray(workOptions)) {
      console.warn('getDayTotal: Missing required data structures');
      return 0;
    }
    
    try {
      const dateKey = date.toISOString().split('T')[0];
      if (!dateKey) return 0;
      return teamMembers.reduce((total, member) => {
        if (!member?.id || typeof member.id !== 'number') return total;
        
        const memberSchedule = scheduleData[member.id];
        if (!memberSchedule || typeof memberSchedule !== 'object') return total;
        
        const value = memberSchedule[dateKey];
        if (!value || typeof value !== 'object') return total;
        
        const option = workOptions.find(opt => opt?.value === value?.value);
        const hours = option?.hours;
        return total + (typeof hours === 'number' ? hours : 0);
      }, 0);
    } catch (error) {
      console.error('getDayTotal error for date:', date, 'Error:', error);
      return 0;
    }
  };

  // Count reasons for the sprint - DEFENSIVE PROGRAMMING
  const getSprintReasonStats = () => {
    let totalReasons = 0;
    let halfDayReasons = 0;
    let absenceReasons = 0;

    try {
      if (!Array.isArray(teamMembers) || !scheduleData || typeof scheduleData !== 'object') {
        return { totalReasons, halfDayReasons, absenceReasons };
      }

      teamMembers.forEach(member => {
        if (!member?.id || typeof member.id !== 'number') return;
        
        const memberData = scheduleData[member.id];
        if (!memberData || typeof memberData !== 'object' || memberData === null) return;
        
        Object.values(memberData).forEach((entry: any) => {
          if (!entry || typeof entry !== 'object') return;
          
          if (entry.reason && typeof entry.reason === 'string' && entry.reason.trim().length > 0) {
            totalReasons++;
            if (entry.value === '0.5') halfDayReasons++;
            if (entry.value === 'X') absenceReasons++;
          }
        });
      });
    } catch (error) {
      console.warn('Error calculating sprint reason stats:', error);
    }

    return { totalReasons, halfDayReasons, absenceReasons };
  };

  const reasonStats = getSprintReasonStats();

  // Log successful rendering preparation
  console.log('✅ EnhancedAvailabilityTable: About to render table successfully', {
    teamMembers: teamMembers?.length || 0,
    validatedSprintDays: validatedSprintDays?.length || 0,
    hasScheduleData: Object.keys(scheduleData || {}).length > 0,
    timestamp: new Date().toISOString()
  });

  return (
    <ComponentErrorBoundary>
      <div className="bg-white rounded-2xl shadow-elevation-3 overflow-hidden border-2 border-gray-100">
      {/* Enhanced Team Statistics Dashboard */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-6 py-4 shadow-elevation-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">📊</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg tracking-tight">Team Sprint Overview</h3>
              <p className="text-blue-700 text-sm font-medium">{teamMembers.length} team members • {validatedSprintDays.length} working days</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getTeamTotalHours()}h</div>
              <div className="text-xs text-blue-500 font-medium">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round((getTeamTotalHours() / (teamMembers.length * validatedSprintDays.length * 7)) * 100)}%</div>
              <div className="text-xs text-green-500 font-medium">Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{reasonStats.totalReasons}</div>
              <div className="text-xs text-purple-500 font-medium">Reasons</div>
            </div>
          </div>
        </div>
        
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/60 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-bold text-gray-900">{teamMembers.reduce((acc, member) => {
                return acc + validatedSprintDays.reduce((dayAcc, day) => {
                  const dateKey = day.toISOString().split('T')[0];
                  if (!dateKey) return dayAcc;
                  const entry = scheduleData[member.id]?.[dateKey];
                  return dayAcc + (entry?.value === '1' ? 1 : 0);
                }, 0);
              }, 0)}</div>
              <div className="text-xs text-gray-600">Full Days</div>
            </div>
          </div>
          <div className="bg-white/60 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <div className="font-bold text-gray-900">{teamMembers.reduce((acc, member) => {
                return acc + validatedSprintDays.reduce((dayAcc, day) => {
                  const dateKey = day.toISOString().split('T')[0];
                  if (!dateKey) return dayAcc;
                  const entry = scheduleData[member.id]?.[dateKey];
                  return dayAcc + (entry?.value === '0.5' ? 1 : 0);
                }, 0);
              }, 0)}</div>
              <div className="text-xs text-gray-600">Half Days</div>
            </div>
          </div>
          <div className="bg-white/60 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <div className="font-bold text-gray-900">{teamMembers.reduce((acc, member) => {
                return acc + validatedSprintDays.reduce((dayAcc, day) => {
                  const dateKey = day.toISOString().split('T')[0];
                  if (!dateKey) return dayAcc;
                  const entry = scheduleData[member.id]?.[dateKey];
                  return dayAcc + (entry?.value === 'X' ? 1 : 0);
                }, 0);
              }, 0)}</div>
              <div className="text-xs text-gray-600">Absences</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reason Summary Bar (if there are reasons) */}
      {reasonStats.totalReasons > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-blue-700">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">{reasonStats.totalReasons} reasons this sprint</span>
              </div>
              {reasonStats.halfDayReasons > 0 && (
                <span className="text-yellow-700">
                  {reasonStats.halfDayReasons} half-day
                </span>
              )}
              {reasonStats.absenceReasons > 0 && (
                <span className="text-red-700">
                  {reasonStats.absenceReasons} absences
                </span>
              )}
            </div>
            <div className="text-blue-600 text-xs hidden sm:block">
              Click or hover over ℹ️ icons to see reason details
            </div>
          </div>
        </div>
      )}

      {/* Mobile Card View (hidden on larger screens) */}
      <div className="block md:hidden">
        <div className="p-4 space-y-4">
          {teamMembers.map((member) => {
            const canEdit = currentUser.isManager || member.id === currentUser.id;
            const isCurrentUserRow = member.id === currentUser.id;
            
            return (
              <div key={member.id} className={`bg-white rounded-xl border-2 shadow-elevation-2 transition-all duration-300 hover:shadow-elevation-3 ${
                isCurrentUserRow ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}>
                {/* Member Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isCurrentUserRow ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <span className={`font-bold text-lg ${
                          isCurrentUserRow ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{member.name}</h3>
                        <p className="text-gray-500">{member.hebrew}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {member.isManager && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              Manager
                            </span>
                          )}
                          {isCurrentUserRow && (
                            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-bold text-lg">{calculateSprintHours(member.id)}h</span>
                      </div>
                      <div className="text-xs text-gray-500">this sprint</div>
                    </div>
                  </div>
                  
                  {/* Full Sprint Button */}
                  {canEdit && (
                    <div className="mt-4">
                      <button
                        onClick={() => onFullSprintSet(member.id)}
                        className="w-full bg-green-50 text-green-700 border-2 border-green-200 rounded-lg py-3 px-4 font-medium hover:bg-green-100 active:bg-green-200 active:scale-[0.98] transition-all touch-manipulation min-h-[44px]"
                      >
                        Set Full Working Sprint
                      </button>
                    </div>
                  )}
                </div>

                {/* Days */}
                <div className="p-4 space-y-3">
                  {validatedSprintDays.map((date, index) => {
                    if (!date || typeof date.toISOString !== 'function') {
                      console.warn('Invalid date in sprintDays:', date, 'at index:', index);
                      return null;
                    }
                    
                    const dateKey = date.toISOString().split('T')[0];
                    const currentValue = dateKey ? scheduleData[member.id]?.[dateKey] : undefined;
                    const today = typeof isToday === 'function' ? isToday(date) : false;
                    const past = typeof isPastDate === 'function' ? isPastDate(date) : false;

                    return (
                      <div key={dateKey} className={`rounded-lg p-3 border-2 ${
                        today ? 'bg-blue-50 border-blue-200' : 
                        past ? 'bg-gray-50 border-gray-200' : 
                        'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              today ? 'text-blue-700' : 'text-gray-700'
                            }`}>
                              {Array.isArray(dayNames) && dayNames[index] ? dayNames[index] : `Day ${index + 1}`}
                            </span>
                            <span className={`text-sm ${
                              today ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              {typeof formatDate === 'function' ? formatDate(date) : date.toLocaleDateString()}
                            </span>
                            {today && (
                              <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                                Today
                              </span>
                            )}
                          </div>
                          {currentValue?.reason && (
                            <span className="text-xs text-gray-500 italic max-w-[160px] truncate">
                              {currentValue.reason}
                            </span>
                          )}
                        </div>
                        
                        {/* Work Options */}
                        <div className="flex gap-2">
                          {Array.isArray(workOptions) && workOptions.map(option => {
                            if (!option || !option.value) return null;
                            const isSelected = currentValue?.value === option.value;
                            return (
                              <button
                                key={option.value}
                                onClick={() => {
                                  if (canEdit) {
                                    if (option.value === '0.5' || option.value === 'X') {
                                      onReasonRequired(member.id, date, option.value);
                                    } else {
                                      onWorkOptionClick(member.id, date, option.value);
                                    }
                                  }
                                }}
                                disabled={!canEdit}
                                className={`flex-1 py-3 px-2 rounded-lg border-2 font-bold text-sm transition-all touch-manipulation min-h-[44px] ${
                                  canEdit ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-60'
                                } ${
                                  isSelected 
                                    ? option.color + ' ring-2 ring-blue-500 ring-offset-1 shadow-md' 
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                }`}
                                title={canEdit ? option.description : 'You can only edit your own schedule'}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-lg">{option.label}</span>
                                  <span className="text-xs opacity-80">{option.hours}h</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {/* Mobile Team Summary - CRITICAL FIX FOR ARRAY INDEX CRASH */}
          <div className="bg-gray-100 rounded-xl p-4 border-2 border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Team Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {validatedSprintDays.map((date) => {
                if (!date || typeof date.toISOString !== 'function') {
                  console.warn('EnhancedAvailabilityTable: Invalid date object:', date);
                  return null;
                }

                // Generate day name dynamically from date
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

                return (
                  <div key={date.toISOString().split('T')[0]} className="text-center p-2 bg-white rounded-lg">
                    <div className="font-medium text-gray-700">{dayName.slice(0, 3)}</div>
                    <div className="text-lg font-bold text-gray-900">{getDayTotal(date)}h</div>
                  </div>
                );
              })}
              <div className="col-span-2 text-center p-3 bg-blue-100 rounded-lg">
                <div className="text-blue-700 font-medium">Sprint Total</div>
                <div className="text-2xl font-bold text-blue-900">{getTeamTotalHours()}h</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View (hidden on mobile) */}
      <div className="hidden md:block overflow-auto scrollbar-hide max-h-[calc(100vh-120px)]">
        <table className="schedule-table-optimized min-w-[1200px]">
          {/* Table Header */}
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 text-left py-3 px-2 sm:py-4 sm:px-6 font-semibold text-gray-900 border-r min-w-[180px] lg:min-w-[220px] xl:min-w-[240px]">
                <div className="text-xs sm:text-sm">Team Member</div>
              </th>
              {enhancedSprintCalendar.map((dayInfo, index) => {
                // CRITICAL: Defensive check for valid date objects
                if (!dayInfo.date || typeof dayInfo.date.toISOString !== 'function') {
                  console.warn(`Header: Invalid date object at index ${index}:`, dayInfo);
                  return null;
                }
                
                const dayDate = dayInfo.date;
                const isWeekendRef = dayInfo.type === 'weekend-reference';
                const today = typeof isToday === 'function' ? isToday(dayDate) : false;
                const past = typeof isPastDate === 'function' ? isPastDate(dayDate) : false;
                
                return (
                  <th key={`${dayDate.toISOString().split('T')[0]}-${dayInfo.type}`} className={`text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold border-r table-day-column ${
                    isWeekendRef 
                      ? 'min-w-[60px] sm:min-w-[80px] bg-gray-100 text-gray-400' 
                      : ''
                  } ${
                    !isWeekendRef && today 
                      ? 'bg-blue-100 text-blue-900 border-blue-300' 
                      : !isWeekendRef && past
                      ? 'bg-gray-50 text-gray-600'
                      : !isWeekendRef 
                      ? 'bg-gray-50 text-gray-900'
                      : ''
                  }`}>
                    <div className="flex flex-col">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-xs sm:text-sm ${isWeekendRef ? 'font-normal text-gray-400' : 'font-medium'}`}>
                          {dayInfo.label}
                        </span>
                        {!isWeekendRef && today && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      {!isWeekendRef && (
                        <span className={`text-xs mt-0.5 sm:mt-1 ${
                          today ? 'text-blue-700 font-medium' : 'text-gray-500'
                        }`}>
                          {typeof formatDate === 'function' ? formatDate(dayDate) : dayDate.toLocaleDateString()}
                          {today && <span className="block text-xs font-medium">Today</span>}
                        </span>
                      )}
                      {isWeekendRef && (
                        <span className="text-xs mt-0.5 sm:mt-1 text-gray-400">
                          {dayDate.getDate()}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold text-gray-900 bg-blue-50 min-w-[80px] lg:min-w-[100px]">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Hours</span>
                </div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {teamMembers.map((member, memberIndex) => {
              const canEdit = currentUser.isManager || member.id === currentUser.id;
              const isCurrentUserRow = member.id === currentUser.id;
              
              return (
                <tr key={member.id} className={`border-b transition-colors ${
                  isCurrentUserRow ? 'bg-blue-50 ring-2 ring-blue-200' : 
                  memberIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}>
                  {/* Member Info */}
                  <td className="sticky left-0 z-10 py-3 px-2 sm:py-4 sm:px-6 font-medium text-gray-900 border-r bg-inherit">
                    <div className="flex items-center gap-1 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs sm:text-base">{member.name}</div>
                        <div className="text-xs text-gray-500 sm:block">{member.hebrew}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {member.isManager && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded">Mgr</span>
                          )}
                          {isCurrentUserRow && (
                            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => onFullSprintSet(member.id)}
                            className="mt-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded transition-colors btn-height-responsive touch-manipulation active:bg-green-300"
                            title="Set full working sprint"
                          >
                            Full Sprint
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Day Cells with Weekend References - ENHANCED SAFETY CHECKS */}
                  {enhancedSprintCalendar.map((dayInfo) => {
                    if (!dayInfo.date || typeof dayInfo.date.toISOString !== 'function') {
                      console.warn('Desktop table: Invalid date in enhancedSprintCalendar:', dayInfo);
                      return null;
                    }
                    
                    const date = dayInfo.date;
                    const dateKey = date.toISOString().split('T')[0];
                    const isWeekendRef = dayInfo.type === 'weekend-reference';
                    const currentValue = dateKey ? scheduleData[member.id]?.[dateKey] : undefined;
                    
                    if (isWeekendRef) {
                      // Weekend reference column - show weekend indicator
                      return (
                        <td key={`${dateKey}-weekend-${member.id}`} className="py-3 px-1 sm:py-4 sm:px-4 text-center bg-gray-50 border-r">
                          <div className="flex items-center justify-center">
                            <span className="text-gray-300 text-xs font-medium">
                              Weekend
                            </span>
                          </div>
                        </td>
                      );
                    }
                    
                    return (
                      <EnhancedDayCell
                        key={dateKey}
                        member={member}
                        date={date}
                        currentValue={currentValue}
                        workOptions={workOptions}
                        canEdit={canEdit}
                        isToday={typeof isToday === 'function' ? isToday(date) : false}
                        isPast={typeof isPastDate === 'function' ? isPastDate(date) : false}
                        onWorkOptionClick={onWorkOptionClick}
                        onReasonRequired={onReasonRequired}
                        onQuickReasonSelect={onQuickReasonSelect}
                      />
                    );
                  })}

                  {/* Sprint Hours */}
                  <td className="py-3 px-1 sm:py-4 sm:px-4 text-center bg-blue-50 font-bold text-xs sm:text-lg">
                    {calculateSprintHours(member.id)}h
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer */}
          <tfoot className="bg-gray-100 sticky bottom-0">
            <tr>
              <td className="sticky left-0 z-10 bg-gray-100 py-3 px-2 sm:py-4 sm:px-6 font-bold text-gray-900 border-r text-xs sm:text-base">
                Team Total
              </td>
              {enhancedSprintCalendar.map((dayInfo) => {
                if (!dayInfo.date || typeof dayInfo.date.toISOString !== 'function') {
                  console.warn('Footer totals: Invalid date in enhancedSprintCalendar:', dayInfo);
                  return null;
                }
                
                const date = dayInfo.date;
                const isWeekendRef = dayInfo.type === 'weekend-reference';
                
                if (isWeekendRef) {
                  // Weekend reference column in footer
                  return (
                    <td key={`${date.toISOString().split('T')[0]}-weekend-footer`} className="py-3 px-1 sm:py-4 sm:px-4 text-center border-r bg-gray-100">
                      <span className="text-gray-300 text-xs">—</span>
                    </td>
                  );
                }
                
                const dayTotal = getDayTotal(date);
                
                return (
                  <td key={date.toISOString().split('T')[0]} className="py-3 px-1 sm:py-4 sm:px-4 text-center border-r font-semibold text-xs sm:text-base">
                    {dayTotal}h
                  </td>
                );
              })}
              <td className="py-3 px-1 sm:py-4 sm:px-4 text-center bg-blue-100 font-bold text-sm sm:text-xl">
                {getTeamTotalHours()}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Enhanced Legend - Mobile and Desktop */}
      <div className="border-t-2 border-gray-200 p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">⚡</span>
          <h3 className="font-bold text-gray-900 text-base sm:text-lg">Work Options Guide</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {workOptions.map((option, index) => {
            const emojis = ['✅', '⏰', '❌'];
            return (
              <div key={option.value} className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{emojis[index]}</span>
                  <span className={`px-4 py-2 rounded-xl border-2 font-bold text-center min-w-[44px] min-h-[44px] flex items-center justify-center ${option.color} shadow-sm`}>
                    {option.label}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">{option.description}</div>
                  <div className="text-xs text-gray-600 font-medium">{option.hours} hours per day</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {option.value === '1' ? 'Click to cycle through options' : 
                     option.value === '0.5' ? 'Requires reason for half-day' : 
                     'Requires reason for absence'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Enhanced Hebrew Legend */}
        <div className="mt-6 pt-4 border-t-2 border-gray-300">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🇮🇱</span>
            <h4 className="font-semibold text-gray-900">Quick Hebrew Reasons</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div className="bg-white/60 rounded-lg p-2 flex items-center gap-2">
              <span>👤</span>
              <span><strong>אישי</strong> (Personal)</span>
            </div>
            <div className="bg-white/60 rounded-lg p-2 flex items-center gap-2">
              <span>🏖️</span>
              <span><strong>חופש</strong> (Vacation)</span>
            </div>
            <div className="bg-white/60 rounded-lg p-2 flex items-center gap-2">
              <span>🩺</span>
              <span><strong>רופא</strong> (Doctor)</span>
            </div>
            <div className="bg-white/60 rounded-lg p-2 flex items-center gap-2">
              <span>🛡️</span>
              <span><strong>שמירה</strong> (Reserve)</span>
            </div>
            <div className="bg-white/60 rounded-lg p-2 flex items-center gap-2">
              <span>🤒</span>
              <span><strong>מחלה</strong> (Sick)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ComponentErrorBoundary>
  );
}