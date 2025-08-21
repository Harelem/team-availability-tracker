'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TeamMember, Team, WorkOption } from '@/types';
import { DatabaseService } from '@/lib/database';
import ReasonDialog from './ReasonDialog';
import { MessageSquare, Info, Clock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { canAccessManagerQuickReasons } from '@/utils/permissions';

interface PersonalScheduleTableProps {
  user: TeamMember;
  team: Team;
  sprintDates: Date[];
  scheduleData: any;
  onDataChange?: (newData: any) => void;
  editable?: boolean;
  personalStats?: {
    hoursSubmitted: number;
    sprintProgress: number;
  };
}

const allWorkOptions: WorkOption[] = [
  { value: '1', label: '1', hours: 7, description: 'Full day (7 hours)', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: '0.5', label: '0.5', hours: 3.5, description: 'Half day (3.5 hours)', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'X', label: 'X', hours: 0, description: 'Sick/OoO (0 hours)', color: 'bg-red-100 text-red-800 border-red-300' }
];


// Hebrew quick reason options
const HEBREW_QUICK_REASONS = {
  '0.5': [
    { emoji: '👤', text: 'אישי', value: 'עניין אישי' },
    { emoji: '🏖️', text: 'חופש', value: 'יום חופש' },
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' }
  ],
  'X': [
    { emoji: '👤', text: 'אישי', value: 'עניין אישי' },
    { emoji: '🏖️', text: 'חופש', value: 'יום חופש' },
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' }
  ]
};

// Manager-specific quick reason options
const MANAGER_HEBREW_QUICK_REASONS = {
  '0.5': [
    { emoji: '🏢', text: 'ניהול', value: 'ניהול - פגישות ניהול ותכנון', isPrimary: true },
    { emoji: '👤', text: 'אישי', value: 'עניין אישי' },
    { emoji: '🏖️', text: 'חופש', value: 'יום חופש' },
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' }
  ],
  'X': [
    { emoji: '🏢', text: 'ניהול', value: 'ניהול - פגישות ניהול ותכנון', isPrimary: true },
    { emoji: '👤', text: 'אישי', value: 'עניין אישי' },
    { emoji: '🏖️', text: 'חופש', value: 'יום חופש' },
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' }
  ]
};

export default function PersonalScheduleTable({
  user,
  team,
  sprintDates,
  scheduleData,
  onDataChange,
  editable = true,
  personalStats = { hoursSubmitted: 0, sprintProgress: 0 }
}: PersonalScheduleTableProps) {
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonDialogData, setReasonDialogData] = useState<{memberId: number; date: Date; value: '0.5' | 'X'} | null>(null);
  const [showQuickReasons, setShowQuickReasons] = useState(false);
  const [pendingValue, setPendingValue] = useState<'0.5' | 'X' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [showReasonTooltips, setShowReasonTooltips] = useState<{[key: string]: boolean}>({});
  const reasonTooltipRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Navigation state for week/sprint navigation
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [displayDates, setDisplayDates] = useState<Date[]>(sprintDates);
  const [navigationMode, setNavigationMode] = useState<'sprint' | 'week'>('week');
  
  // All users (including managers) use the same work options: 1, 0.5, X
  const workOptions = allWorkOptions;
  
  // Calculate week dates based on offset
  const getWeekDates = (offset: number): Date[] => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (offset * 7));
    
    const dates: Date[] = [];
    // Sunday to Thursday (Israeli work week)
    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  
  // Calculate sprint dates based on offset
  const getSprintDates = (offset: number): Date[] => {
    // If we have sprint dates, calculate based on sprint length
    if (sprintDates && sprintDates.length > 0) {
      const firstDate = new Date(sprintDates[0]);
      const lastDate = new Date(sprintDates[sprintDates.length - 1]);
      const sprintLength = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const newFirstDate = new Date(firstDate);
      newFirstDate.setDate(firstDate.getDate() + (offset * sprintLength));
      
      const dates: Date[] = [];
      let currentDate = new Date(newFirstDate);
      
      // Add working days (Sunday-Thursday)
      for (let i = 0; i < sprintLength; i++) {
        if (currentDate.getDay() >= 0 && currentDate.getDay() <= 4) { // Sunday to Thursday
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    }
    
    // Fallback to week calculation
    return getWeekDates(offset);
  };
  
  // Handle week/sprint navigation
  const handleWeekChange = (offset: number) => {
    setCurrentWeekOffset(offset);
    const newDates = navigationMode === 'sprint' 
      ? getSprintDates(offset) 
      : getWeekDates(offset);
    setDisplayDates(newDates);
  };
  
  // Go to current week/sprint
  const goToCurrentWeek = () => {
    handleWeekChange(0);
  };
  
  // Update display dates when navigation changes
  useEffect(() => {
    if (currentWeekOffset === 0) {
      setDisplayDates(sprintDates);
    } else {
      const newDates = navigationMode === 'sprint' 
        ? getSprintDates(currentWeekOffset) 
        : getWeekDates(currentWeekOffset);
      setDisplayDates(newDates);
    }
  }, [sprintDates, currentWeekOffset, navigationMode]);
  
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

  // Status cycling logic: Full → Half → Absent → Full
  const getNextStatus = (currentVal?: '1' | '0.5' | 'X'): '1' | '0.5' | 'X' => {
    if (!currentVal || currentVal === 'X') return '1';
    if (currentVal === '1') return '0.5';
    if (currentVal === '0.5') return 'X';
    return '1';
  };

  // Get status emoji for display
  const getStatusEmoji = (value?: '1' | '0.5' | 'X'): string => {
    switch (value) {
      case '1': return '✅';
      case '0.5': return '⏰';
      case 'X': return '❌';
      default: return '';
    }
  };

  // Enhanced cell click handler for 1-click cycling
  const handleCellClick = (date: Date) => {
    if (!editable) return;
    
    const dateKey = date.toISOString().split('T')[0];
    const currentValue = dateKey ? scheduleData[user.id]?.[dateKey]?.value : undefined;
    const nextStatus = getNextStatus(currentValue);
    
    // If next status requires reason, show quick reasons
    if (nextStatus === '0.5' || nextStatus === 'X') {
      setPendingValue(nextStatus);
      setPendingDate(date);
      setShowQuickReasons(true);
      return;
    }
    
    // For full day (1), update directly
    updateSchedule(user.id, date, nextStatus);
  };

  const handleWorkOptionClick = (date: Date, value: string) => {
    if (!editable) return;
    
    const dateKey = date.toISOString().split('T')[0];
    const currentValue = dateKey ? scheduleData[user.id]?.[dateKey]?.value : undefined;
    
    // If clicking the same value, deselect it
    if (currentValue === value) {
      updateSchedule(user.id, date, null);
      return;
    }
    
    // If selecting 0.5 or X, show quick reasons
    if (value === '0.5' || value === 'X') {
      setPendingValue(value as '0.5' | 'X');
      setPendingDate(date);
      setShowQuickReasons(true);
    } else {
      // For value '1', update directly
      updateSchedule(user.id, date, value);
    }
  };

  const handleReasonRequired = (date: Date, value: '0.5' | 'X') => {
    setPendingValue(value);
    setPendingDate(date);
    setShowQuickReasons(true);
  };

  const handleQuickReasonSelectFromButton = (date: Date, value: '0.5' | 'X', reason: string) => {
    updateSchedule(user.id, date, value, reason);
  };

  const handleReasonSubmit = (reason: string) => {
    if (reasonDialogData) {
      updateSchedule(reasonDialogData.memberId, reasonDialogData.date, reasonDialogData.value, reason);
    }
    setReasonDialogOpen(false);
    setReasonDialogData(null);
  };

  const handleQuickReasonSelect = (reason: string) => {
    if (pendingValue && pendingDate) {
      updateSchedule(user.id, pendingDate, pendingValue, reason);
    }
    setShowQuickReasons(false);
    setPendingValue(null);
    setPendingDate(null);
  };

  const handleCustomReason = () => {
    if (pendingValue && pendingDate) {
      setReasonDialogData({ memberId: user.id, date: pendingDate, value: pendingValue });
      setReasonDialogOpen(true);
    }
    setShowQuickReasons(false);
    setPendingValue(null);
    setPendingDate(null);
  };

  const handleReasonIconClick = (dateKey: string) => {
    setShowReasonTooltips(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  // Handle click outside to close tooltips
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(showReasonTooltips).forEach(dateKey => {
        const ref = reasonTooltipRefs.current[dateKey];
        if (ref && !ref.contains(event.target as Node)) {
          setShowReasonTooltips(prev => ({
            ...prev,
            [dateKey]: false
          }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReasonTooltips]);

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

  displayDates.forEach(date => {
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

  if (displayDates.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-elevation-3 overflow-hidden border-2 border-gray-100">
      {/* Enhanced Statistics Header - Matching Team Schedule Style */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">📅</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Personal Sprint Schedule</h3>
              <p className="text-blue-700 text-sm">
                {user.name} • {displayDates.length} working days
                {currentWeekOffset !== 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs">
                    {currentWeekOffset > 0 ? `+${currentWeekOffset} weeks` : `${currentWeekOffset} weeks`}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{personalStats.hoursSubmitted || 0}h</div>
              <div className="text-xs text-blue-500 font-medium">Submitted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{personalStats.sprintProgress || 0}%</div>
              <div className="text-xs text-green-500 font-medium">Progress</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Week Navigation Controls - Desktop */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
        <button
          onClick={() => handleWeekChange(currentWeekOffset - 1)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] shadow-sm hover:shadow-md active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Week</span>
        </button>
        
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-600">
            {displayDates[0] && displayDates[displayDates.length - 1] && (
              <>
                {displayDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                {displayDates[displayDates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </>
            )}
          </span>
          {currentWeekOffset !== 0 && (
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg 
                         hover:bg-blue-600 transition-colors min-h-[44px]
                         shadow-sm hover:shadow-md active:scale-95"
            >
              Current Week
            </button>
          )}
        </div>
        
        <button
          onClick={() => handleWeekChange(currentWeekOffset + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] shadow-sm hover:shadow-md active:scale-95"
        >
          <span>Next Week</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop View - Enhanced Table Design */}
      <div className="hidden md:block overflow-x-auto scrollbar-hide">
        <div className="min-w-[1000px]">
          <table className="schedule-table-optimized w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 text-left py-3 px-2 sm:py-4 sm:px-6 font-semibold text-gray-900 border-r min-w-[180px] lg:min-w-[220px] xl:min-w-[240px]">
                  <div className="text-xs sm:text-sm">Team Member</div>
                </th>
                {displayDates.map(date => {
                  const today = isToday(date);
                  const past = isPastDate(date);
                  return (
                    <th key={date.toISOString()} className={
                      `text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold border-r table-day-column min-w-[140px] ${
                        today 
                          ? 'bg-blue-100 text-blue-900 border-blue-300' 
                          : past
                          ? 'bg-gray-50 text-gray-600'
                          : 'bg-gray-50 text-gray-900'
                      }`
                    }>
                      <div className="flex flex-col">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs sm:text-sm font-medium">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          {today && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <span className={
                          `text-xs mt-0.5 sm:mt-1 ${today ? 'text-blue-700 font-medium' : 'text-gray-500'}`
                        }>
                          {formatDate(date)}
                          {today && <span className="block text-xs font-medium">Today</span>}
                        </span>
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
            <tbody>
              <tr className="border-b transition-colors bg-blue-50 ring-2 ring-blue-200">
                <td className="sticky left-0 z-10 py-3 px-2 sm:py-4 sm:px-6 font-medium text-gray-900 border-r bg-inherit">
                  <div className="flex items-center gap-1 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-xs sm:text-base">{user.name}</div>
                      <div className="text-xs text-gray-500 sm:block">{user.hebrew}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">You</span>
                      </div>
                    </div>
                  </div>
                </td>
                {displayDates.map(date => {
                  const dateKey = date.toISOString().split('T')[0];
                  const value = getValueForDate(date);
                  const reason = getReasonForDate(date);
                  const isPast = isPastDate(date);
                  
                  return (
                    <td key={date.toISOString()} className={
                      `relative py-3 px-1 sm:py-4 sm:px-4 text-center border-r ${
                        isToday(date) ? 'bg-blue-50 border-blue-200' :
                        isPast ? 'bg-gray-50' : 'bg-white'
                      }`
                    }>
                      {/* Reason Indicator */}
                      {reason && (
                        <div className="absolute top-1 right-1 group" ref={(el) => {
                          if (el && dateKey) reasonTooltipRefs.current[dateKey] = el;
                        }}>
                          <button
                            onClick={() => dateKey && handleReasonIconClick(dateKey)}
                            onMouseEnter={() => dateKey && setShowReasonTooltips(prev => ({ ...prev, [dateKey]: true }))}
                            onMouseLeave={() => dateKey && setShowReasonTooltips(prev => ({ ...prev, [dateKey]: false }))}
                            className="min-h-[24px] min-w-[24px] flex items-center justify-center rounded-full hover:bg-blue-50 active:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 touch-manipulation"
                            aria-label={`Reason: ${reason}`}
                            tabIndex={0}
                            role="button"
                          >
                            <Info className="w-3 h-3 text-blue-500 hover:text-blue-600" />
                          </button>
                          
                          {/* Tooltip */}
                          {dateKey && showReasonTooltips[dateKey] && (
                            <div className="absolute right-0 top-6 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-[60] w-48 break-words transition-opacity duration-200 opacity-100 visible">
                              {reason}
                              <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Modern 3-Button Interface */}
                      <div className="flex justify-center">
                        {editable ? (
                          <div className="flex gap-2 w-full max-w-[300px]">
                            {workOptions.map(option => {
                              const isSelected = value === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    if (option.value === '0.5' || option.value === 'X') {
                                      handleReasonRequired(date, option.value);
                                    } else {
                                      handleWorkOptionClick(date, option.value);
                                    }
                                  }}
                                  disabled={isPast && !value}
                                  className={
                                    `flex-1 py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm min-h-[60px] ${
                                      isSelected 
                                        ? option.color + ' ring-2 ring-blue-500 ring-offset-1 shadow-md'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                    } ${
                                      isPast && !value ? 'opacity-50 cursor-not-allowed' : ''
                                    }`
                                  }
                                  title={option.description}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-lg">
                                      {option.value === '1' ? '✅' : option.value === '0.5' ? '⏰' : '❌'}
                                    </span>
                                    <div className="text-center">
                                      <div className="text-base font-bold">{option.label}</div>
                                      <div className="text-xs opacity-75">{option.hours}h</div>
                                    </div>
                                    {isSelected && reason && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* Read-only display with 3-button layout */
                          <div className="flex gap-2 w-full max-w-[300px]">
                            {workOptions.map(option => {
                              const isSelected = value === option.value;
                              return (
                                <div
                                  key={option.value}
                                  className={
                                    `flex-1 py-3 px-2 rounded-xl border-2 font-bold text-sm opacity-60 min-h-[60px] ${
                                      isSelected 
                                        ? option.color
                                        : 'bg-gray-100 text-gray-600 border-gray-300'
                                    }`
                                  }
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-lg">
                                      {option.value === '1' ? '✅' : option.value === '0.5' ? '⏰' : '❌'}
                                    </span>
                                    <div className="text-center">
                                      <div className="text-base font-bold">
                                        {isSelected ? option.label : '-'}
                                      </div>
                                      <div className="text-xs opacity-75">{option.hours}h</div>
                                    </div>
                                    {isSelected && reason && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
                {/* Sprint Hours */}
                <td className="py-3 px-1 sm:py-4 sm:px-4 text-center bg-blue-50 font-bold text-xs sm:text-lg">
                  {personalStats.hoursSubmitted || 0}h
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View - Enhanced Touch-Friendly Design */}
      <div className="md:hidden">
        {/* Mobile Navigation Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleWeekChange(currentWeekOffset - 1)}
              className="p-2 rounded-lg bg-gray-100 active:bg-gray-200 min-h-[44px] min-w-[44px]
                         shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="font-medium text-gray-900 text-sm">
                {displayDates[0] && displayDates[displayDates.length - 1] && (
                  <>
                    {displayDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                    {displayDates[displayDates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </>
                )}
              </div>
              {currentWeekOffset !== 0 && (
                <button
                  onClick={goToCurrentWeek}
                  className="text-sm text-blue-600 font-medium mt-1 min-h-[32px] px-2"
                >
                  Go to Current Week
                </button>
              )}
            </div>
            
            <button
              onClick={() => handleWeekChange(currentWeekOffset + 1)}
              className="p-2 rounded-lg bg-gray-100 active:bg-gray-200 min-h-[44px] min-w-[44px]
                         shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="space-y-4 p-4">
        {weekGroups.map((week, weekIndex) => (
          <div key={weekIndex} className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">
              Week of {week.weekStart?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h3>
            
            <div className="space-y-3">
              {week.dates.map((date: Date) => {
                const value = getValueForDate(date);
                const reason = getReasonForDate(date);
                const isPast = isPastDate(date);
                
                return (
                  <div key={date.toISOString()} className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md">
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
                    
                    {/* Modern 3-Button Interface for Mobile */}
                    <div className="flex justify-center">
                      {editable ? (
                        <div className="flex gap-2 w-full">
                          {workOptions.map(option => {
                            const isSelected = value === option.value;
                            return (
                              <button
                                key={option.value}
                                onClick={() => {
                                  if (option.value === '0.5' || option.value === 'X') {
                                    handleReasonRequired(date, option.value);
                                  } else {
                                    handleWorkOptionClick(date, option.value);
                                  }
                                }}
                                disabled={isPast && !value}
                                className={
                                  `flex-1 py-4 px-2 rounded-xl border-2 font-bold text-base transition-all duration-200 active:scale-95 cursor-pointer shadow-sm touch-manipulation min-h-[72px] ${
                                    isSelected 
                                      ? option.color + ' ring-2 ring-blue-500 ring-offset-1 shadow-md'
                                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                  } ${
                                    isPast && !value ? 'opacity-50 cursor-not-allowed' : ''
                                  }`
                                }
                                title={option.description}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-2xl">
                                    {option.value === '1' ? '✅' : option.value === '0.5' ? '⏰' : '❌'}
                                  </span>
                                  <div className="text-center">
                                    <div className="text-lg font-bold">{option.label}</div>
                                    <div className="text-sm opacity-75">{option.hours}h</div>
                                  </div>
                                  {isSelected && reason && (
                                    <div className="flex items-center gap-1">
                                      <Info className="w-4 h-4 text-blue-500" />
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* Read-only display for mobile with 3-button layout */
                        <div className="flex gap-2 w-full">
                          {workOptions.map(option => {
                            const isSelected = value === option.value;
                            return (
                              <div
                                key={option.value}
                                className={
                                  `flex-1 py-4 px-2 rounded-xl border-2 font-bold text-base opacity-60 min-h-[72px] ${
                                    isSelected 
                                      ? option.color
                                      : 'bg-gray-100 text-gray-600 border-gray-300'
                                  }`
                                }
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-2xl">
                                    {option.value === '1' ? '✅' : option.value === '0.5' ? '⏰' : '❌'}
                                  </span>
                                  <div className="text-center">
                                    <div className="text-lg font-bold">
                                      {isSelected ? option.label : '-'}
                                    </div>
                                    <div className="text-sm opacity-75">{option.hours}h</div>
                                  </div>
                                  {isSelected && reason && (
                                    <div className="flex items-center gap-1">
                                      <Info className="w-4 h-4 text-blue-500" />
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {reason && (
                      <div className="mt-3 text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong className="text-blue-900">Reason:</strong>
                            <span className="text-blue-800 ml-1">{reason}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Quick Reasons Modal */}
      {showQuickReasons && pendingValue && pendingDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 lg:p-4">
          <div className="bg-white w-full h-full flex flex-col lg:rounded-lg lg:max-w-md lg:w-auto lg:h-auto lg:max-h-[80vh] lg:shadow-xl">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 lg:bg-white lg:border-b lg:border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 lg:text-lg">
                    {pendingValue === '0.5' ? 'Half Day Reason' : 'Absence Reason'}
                  </h3>
                  <p className="text-lg text-gray-600 lg:text-sm">
                    {pendingValue === '0.5' ? 'סיבה לחצי יום' : 'סיבת היעדרות'}
                  </p>
                </div>
                <button
                  onClick={() => setShowQuickReasons(false)}
                  className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation rounded-full hover:bg-gray-100"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg lg:mt-2 lg:p-2">
                <p className="text-base text-gray-700 lg:text-sm">
                  <strong>{user.name}</strong> • {pendingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 text-base lg:text-sm">
                  Quick Reasons • סיבות מהירות:
                </h4>
                
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-2">
                  {(() => {
                    // Use manager-specific reasons if the user is a manager
                    const isManager = canAccessManagerQuickReasons(user);
                    const reasonOptions = isManager ? MANAGER_HEBREW_QUICK_REASONS[pendingValue] : HEBREW_QUICK_REASONS[pendingValue];
                    
                    return reasonOptions.map((reason, index) => {
                      const isPrimary = (reason as any).isPrimary && isManager;
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            // Add haptic feedback
                            if ('vibrate' in navigator) {
                              navigator.vibrate(50);
                            }
                            handleQuickReasonSelect(reason.value);
                          }}
                          className={
                            `flex items-center gap-3 p-4 text-left rounded-xl transition-all duration-200 border min-h-[56px] lg:p-3 shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation ${
                              isPrimary
                                ? 'bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-blue-300 hover:border-blue-400 active:border-blue-500 ring-2 ring-blue-200'
                                : 'bg-gray-50 hover:bg-blue-50 active:bg-blue-100 border-gray-200 hover:border-blue-300 active:border-blue-400'
                            }`
                          }
                        >
                          <span className={
                            `text-2xl lg:text-lg ${isPrimary ? 'animate-pulse' : ''}`
                          }>
                            {reason.emoji}
                          </span>
                          <div className="flex-1">
                            <span className={
                              `text-base lg:text-sm font-medium flex-1 ${
                                isPrimary ? 'text-blue-900' : 'text-gray-900'
                              }`
                            }>
                              {reason.text}
                              {isPrimary && (
                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                                  Manager
                                </span>
                              )}
                            </span>
                          </div>
                          <span className={isPrimary ? 'text-blue-400' : 'text-gray-400'}>→</span>
                        </button>
                      );
                    });
                  })()}
                </div>

                <div className="border-t border-gray-200 pt-4 mt-6 lg:pt-3 lg:mt-4">
                  <button
                    onClick={() => {
                      // Add haptic feedback
                      if ('vibrate' in navigator) {
                        navigator.vibrate(25);
                      }
                      handleCustomReason();
                    }}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all duration-200 text-base lg:text-sm font-medium text-gray-700 min-h-[56px] shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
                  >
                    <MessageSquare className="w-5 h-5 lg:w-4 lg:h-4" />
                    <span>Custom Reason • סיבה מותאמת אישית</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 lg:bg-white">
              <button
                onClick={() => setShowQuickReasons(false)}
                className="w-full px-6 py-4 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 text-base lg:text-sm font-medium min-h-[56px] shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
              >
                Cancel • ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Legend - Matching Team Schedule Style */}
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
                  <span className={
                    `px-4 py-2 rounded-xl border-2 font-bold text-center min-w-[44px] min-h-[44px] flex items-center justify-center ${option.color} shadow-sm`
                  }>
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