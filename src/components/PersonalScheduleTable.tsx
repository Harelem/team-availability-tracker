'use client';

import React, { useState, useCallback } from 'react';
import { TeamMember, Team, WorkOption } from '@/types';
import { DatabaseService } from '@/lib/database';
import ReasonDialog from './ReasonDialog';

interface PersonalScheduleTableProps {
  user: TeamMember;
  team: Team;
  sprintDates: Date[];
  scheduleData: any;
  onDataChange?: (newData: any) => void;
  editable?: boolean;
}

const allWorkOptions: WorkOption[] = [
  { value: '1', label: '1', hours: 7, description: 'Full day (7 hours)', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: '0.5', label: '0.5', hours: 3.5, description: 'Half day (3.5 hours)', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'X', label: 'X', hours: 0, description: 'Sick/OoO (0 hours)', color: 'bg-red-100 text-red-800 border-red-300' }
];

const managerWorkOptions: WorkOption[] = [
  { value: '0.5', label: '0.5', hours: 3.5, description: 'Half day (3.5 hours)', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'X', label: 'X', hours: 0, description: 'Sick/OoO (0 hours)', color: 'bg-red-100 text-red-800 border-red-300' }
];

export default function PersonalScheduleTable({
  user,
  team,
  sprintDates,
  scheduleData,
  onDataChange,
  editable = true
}: PersonalScheduleTableProps) {
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonDialogData, setReasonDialogData] = useState<{memberId: number; date: Date; value: '0.5' | 'X'} | null>(null);
  
  // Determine work options based on user role
  const workOptions = (user.isManager || user.is_manager || user.role === 'manager') 
    ? managerWorkOptions 
    : allWorkOptions;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short' 
    });
  };

  const formatDateFull = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'long' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const updateSchedule = useCallback(async (memberId: number, date: Date, value: string | null, reason?: string) => {
    const dateKey = date.toISOString().split('T')[0];
    
    if (!dateKey) {
      console.error('Invalid date key generated');
      return;
    }
    
    try {
      await DatabaseService.updateScheduleEntry(
        memberId,
        dateKey,
        value as '1' | '0.5' | 'X' | null,
        reason
      );
      
      // Update local state
      const newData = {
        ...scheduleData,
        [memberId]: {
          ...scheduleData[memberId],
          [dateKey]: { value, reason }
        }
      };
      
      if (onDataChange) {
        onDataChange(newData);
      }
      
    } catch (error) {
      console.error('Error updating schedule:', error);
      // You could add a toast notification here
    }
  }, [scheduleData, onDataChange]);

  const handleWorkOptionClick = (date: Date, value: string) => {
    if (!editable) return;
    
    const dateKey = date.toISOString().split('T')[0];
    const currentValue = dateKey ? scheduleData[user.id]?.[dateKey]?.value : undefined;
    
    // If clicking the same value, deselect it
    if (currentValue === value) {
      updateSchedule(user.id, date, null);
      return;
    }
    
    // If selecting 0.5 or X, show reason dialog
    if (value === '0.5' || value === 'X') {
      setReasonDialogData({ memberId: user.id, date, value: value as '0.5' | 'X' });
      setReasonDialogOpen(true);
    } else {
      // For value '1', update directly
      updateSchedule(user.id, date, value);
    }
  };

  const handleReasonSubmit = (reason: string) => {
    if (reasonDialogData) {
      updateSchedule(reasonDialogData.memberId, reasonDialogData.date, reasonDialogData.value, reason);
    }
    setReasonDialogOpen(false);
    setReasonDialogData(null);
  };

  const getValueForDate = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return dateKey ? scheduleData[user.id]?.[dateKey]?.value || null : null;
  };

  const getReasonForDate = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return dateKey ? scheduleData[user.id]?.[dateKey]?.reason || null : null;
  };

  // Group dates by week for better display
  const weekGroups: any[] = [];
  let currentWeek: Date[] = [];
  let currentWeekStart: Date | null = null;

  sprintDates.forEach(date => {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    
    if (currentWeekStart === null || weekStart.getTime() !== currentWeekStart.getTime()) {
      if (currentWeek.length > 0) {
        weekGroups.push({
          weekStart: currentWeekStart,
          dates: currentWeek
        });
      }
      currentWeekStart = weekStart;
      currentWeek = [];
    }
    
    currentWeek.push(date);
  });

  if (currentWeek.length > 0) {
    weekGroups.push({
      weekStart: currentWeekStart,
      dates: currentWeek
    });
  }

  if (sprintDates.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No sprint data available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900 bg-gray-50">
                  Week
                </th>
                {sprintDates.map(date => (
                  <th key={date.toISOString()} className="text-center py-3 px-2 font-medium text-gray-900 bg-gray-50 min-w-[100px]">
                    <div className="text-sm">
                      {formatDate(date)}
                    </div>
                    {isToday(date) && (
                      <div className="text-xs text-blue-600 font-medium">Today</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 px-4 font-medium text-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.hebrew}</div>
                    </div>
                  </div>
                </td>
                {sprintDates.map(date => {
                  const value = getValueForDate(date);
                  const reason = getReasonForDate(date);
                  const isPast = isPastDate(date);
                  
                  return (
                    <td key={date.toISOString()} className="py-2 px-2">
                      <div className="flex flex-col gap-1">
                        {workOptions.map(option => {
                          const isSelected = value === option.value;
                          const isDisabled = !editable || (isPast && !isSelected);
                          
                          return (
                            <button
                              key={option.value}
                              onClick={() => handleWorkOptionClick(date, option.value)}
                              disabled={isDisabled}
                              className={`
                                px-2 py-1 text-xs rounded border transition-colors
                                ${isSelected ? option.color : 'bg-white text-gray-600 border-gray-300'}
                                ${isDisabled 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:bg-gray-50 cursor-pointer'
                                }
                              `}
                              title={`${option.description}${reason ? ` - ${reason}` : ''}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                        {reason && (
                          <div className="text-xs text-gray-500 truncate" title={reason}>
                            {reason}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {weekGroups.map((week, weekIndex) => (
          <div key={weekIndex} className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              Week of {week.weekStart?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h3>
            
            <div className="space-y-3">
              {week.dates.map((date: Date) => {
                const value = getValueForDate(date);
                const reason = getReasonForDate(date);
                const isPast = isPastDate(date);
                
                return (
                  <div key={date.toISOString()} className="bg-white rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDateFull(date)}
                        </div>
                        {isToday(date) && (
                          <div className="text-xs text-blue-600 font-medium">Today</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {workOptions.map(option => {
                        const isSelected = value === option.value;
                        const isDisabled = !editable || (isPast && !isSelected);
                        
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleWorkOptionClick(date, option.value)}
                            disabled={isDisabled}
                            className={`
                              flex-1 px-3 py-2 text-sm rounded border transition-colors
                              ${isSelected ? option.color : 'bg-white text-gray-600 border-gray-300'}
                              ${isDisabled 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-gray-50 cursor-pointer'
                              }
                            `}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    
                    {reason && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                        <strong>Reason:</strong> {reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Reason Dialog */}
      <ReasonDialog
        isOpen={reasonDialogOpen}
        onClose={() => {
          setReasonDialogOpen(false);
          setReasonDialogData(null);
        }}
        onSave={handleReasonSubmit}
        data={reasonDialogData && 'dateKey' in reasonDialogData ? reasonDialogData as any : null}
      />
    </div>
  );
}