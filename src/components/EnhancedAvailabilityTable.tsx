'use client';

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

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']; // Sprint working days (Israeli work week)

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

  // CRITICAL: Add debug logging for array mismatch investigation
  console.log('EnhancedAvailabilityTable Debug:', {
    sprintDaysLength: sprintDays?.length || 0,
    dayNamesLength: dayNames?.length || 0,
    sprintDaysFirst: sprintDays?.[0],
    sprintDaysLast: sprintDays?.[sprintDays.length - 1]
  });

  // Defensive checks for required props
  if (!currentUser || !Array.isArray(teamMembers) || !scheduleData || !Array.isArray(workOptions) || !Array.isArray(sprintDays)) {
    console.warn('EnhancedAvailabilityTable: Missing required props', {
      currentUser: !!currentUser,
      teamMembers: Array.isArray(teamMembers),
      scheduleData: !!scheduleData,
      workOptions: Array.isArray(workOptions),
      sprintDays: Array.isArray(sprintDays)
    });
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">Unable to load availability table - missing data</p>
      </div>
    );
  }

  // CRITICAL: Validation check for empty arrays
  if (sprintDays.length === 0) {
    console.error('EnhancedAvailabilityTable: Empty sprintDays array');
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
        <p className="text-yellow-800">Unable to load availability table: No sprint days provided</p>
      </div>
    );
  }

  // CRITICAL: Warn about array length mismatch
  if (sprintDays.length !== dayNames.length) {
    console.warn(`EnhancedAvailabilityTable: Array length mismatch! sprintDays: ${sprintDays.length}, dayNames: ${dayNames.length}`);
  }

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

  return (
    <ComponentErrorBoundary>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
              <div key={member.id} className={`bg-white rounded-xl border-2 shadow-sm transition-all ${
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
                  {sprintDays.map((date, index) => {
                    if (!date || typeof date.toISOString !== 'function') {
                      console.warn('Invalid date in sprintDays:', date, 'at index:', index);
                      return null;
                    }
                    
                    const dateKey = date.toISOString().split('T')[0];
                    const currentValue = scheduleData[member.id]?.[dateKey];
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
                            <span className="text-xs text-gray-500 italic max-w-[120px] truncate">
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
              {sprintDays.map((date, index) => {
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
      <div className="hidden md:block overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[640px]">
          {/* Table Header */}
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 text-left py-3 px-2 sm:py-4 sm:px-6 font-semibold text-gray-900 border-r min-w-[120px] sm:min-w-[140px]">
                <div className="text-xs sm:text-sm">Team Member</div>
              </th>
              {sprintDays.map((dayDate, index) => {
                // CRITICAL: Defensive check for valid date objects
                if (!dayDate || typeof dayDate.toISOString !== 'function') {
                  console.warn(`Header: Invalid date object at index ${index}:`, dayDate);
                  return null;
                }
                
                // Generate day name dynamically from date instead of using fixed array
                const day = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
                
                const today = typeof isToday === 'function' ? isToday(dayDate) : false;
                const past = typeof isPastDate === 'function' ? isPastDate(dayDate) : false;
                
                return (
                  <th key={day} className={`text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold border-r min-w-[85px] sm:min-w-[120px] ${
                    today 
                      ? 'bg-blue-100 text-blue-900 border-blue-300' 
                      : past
                      ? 'bg-gray-50 text-gray-600'
                      : 'bg-gray-50 text-gray-900'
                  }`}>
                    <div className="flex flex-col">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs sm:text-sm font-medium">{day.slice(0, 3)}</span>
                        {today && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <span className={`text-xs mt-0.5 sm:mt-1 ${
                        today ? 'text-blue-700 font-medium' : 'text-gray-500'
                      }`}>
                        {typeof formatDate === 'function' ? formatDate(dayDate) : dayDate.toLocaleDateString()}
                        {today && <span className="block text-xs font-medium">Today</span>}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold text-gray-900 bg-blue-50 min-w-[70px] sm:min-w-[80px]">
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
                        <div className="font-medium text-xs sm:text-base truncate">{member.name}</div>
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
                            className="mt-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded transition-colors min-h-[36px] min-w-[44px] touch-manipulation active:bg-green-300"
                            title="Set full working sprint"
                          >
                            Full Sprint
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Day Cells - ENHANCED SAFETY CHECKS */}
                  {sprintDays.map((date) => {
                    if (!date || typeof date.toISOString !== 'function') {
                      console.warn('Desktop table: Invalid date in sprintDays:', date);
                      return null;
                    }
                    
                    const dateKey = date.toISOString().split('T')[0];
                    const currentValue = scheduleData[member.id]?.[dateKey];
                    
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
              {sprintDays.map((date) => {
                if (!date || typeof date.toISOString !== 'function') {
                  console.warn('Footer totals: Invalid date in sprintDays:', date);
                  return null;
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

      {/* Legend - Mobile and Desktop */}
      <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
        <h3 className="font-semibold mb-3 text-sm sm:text-base">Work Options:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {workOptions.map(option => (
            <div key={option.value} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 sm:border-0 sm:bg-transparent sm:p-0">
              <span className={`px-3 py-2 rounded-lg border-2 font-bold text-center min-w-[44px] min-h-[44px] flex items-center justify-center ${option.color}`}>
                {option.label}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{option.description}</div>
                <div className="text-xs text-gray-500">{option.hours} hours</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Hebrew Legend */}
        <div className="mt-4 pt-3 border-t border-gray-300">
          <p className="text-xs text-gray-600">
            <strong>Quick Hebrew Reasons:</strong> 👤 אישי (Personal), 🏖️ חופש (Vacation), 🩺 רופא (Doctor), 
            🛡️ שמירה (Reserve), 🤒 מחלה (Sick)
          </p>
        </div>
      </div>
    </div>
    </ComponentErrorBoundary>
  );
}