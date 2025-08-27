'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TeamMember, Team, ScheduleEntry } from '@/types';
import { DatabaseService } from '@/lib/database';
import MobileReasonInput from './MobileReasonInput';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Today,
  Check,
  Clock,
  X as XIcon,
  Info
} from 'lucide-react';

interface PersonalCalendarProps {
  user?: TeamMember;
  team?: Team;
  editable?: boolean;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  value: '1' | '0.5' | 'X' | null;
  reason?: string;
}

// Hebrew month names
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// Hebrew day abbreviations (Sunday to Saturday)
const HEBREW_DAY_ABBREV = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function PersonalCalendar({
  user,
  team,
  editable = true
}: PersonalCalendarProps) {
  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduleData, setScheduleData] = useState<{[key: string]: ScheduleEntry}>({});
  const [isReasonModalOpen, setReasonModalOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<'0.5' | 'X' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Format date as YYYY-MM-DD for database keys
  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Generate calendar days for display
  const generateCalendarDays = useCallback((): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate 42 days (6 weeks × 7 days)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateKey = formatDateKey(date);
      const scheduleEntry = scheduleData[dateKey];
      
      days.push({
        date: new Date(date),
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        isWeekend: date.getDay() === 5 || date.getDay() === 6, // Friday or Saturday
        isPast: date < today,
        value: scheduleEntry?.value || null,
        reason: scheduleEntry?.reason
      });
    }
    
    return days;
  }, [currentMonth, scheduleData]);

  // Fetch schedule data for the visible month
  const fetchMonthData = useCallback(async () => {
    if (!user) return;
    
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Get first and last day of month with some buffer
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month + 2, 0);
      
      const result = await DatabaseService.getScheduleEntriesPaginated({
        memberId: user.id,
        startDate: formatDateKey(startDate),
        endDate: formatDateKey(endDate),
        limit: 100
      });
      
      if (!result || !result.data) {
        console.error('Error fetching schedule data: Invalid response');
        return;
      }
      
      const { data } = result;
      
      // Convert array to object for easy lookup
      const dataObject = (data || []).reduce((acc: any, entry: any) => {
        if (entry.date) {
          acc[entry.date] = {
            value: entry.value,
            reason: entry.reason,
            hours: entry.calculated_hours || entry.hours
          };
        }
        return acc;
      }, {});
      
      setScheduleData(dataObject);
    } catch (error) {
      console.error('Error fetching month data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  // Update schedule entry
  const updateSchedule = useCallback(async (date: Date, value: '1' | '0.5' | 'X' | null, reason?: string) => {
    if (!user) return;
    
    const dateKey = formatDateKey(date);
    
    try {
      await DatabaseService.updateScheduleEntry(
        user.id,
        dateKey,
        value,
        reason
      );
      
      // Update local state
      setScheduleData(prev => ({
        ...prev,
        [dateKey]: value ? { value, reason, hours: value === '1' ? 7 : value === '0.5' ? 3.5 : 0 } : undefined
      }));
      
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  }, [user]);

  // Handle day click
  const handleDayClick = (day: CalendarDay) => {
    if (!editable) return;
    
    // Prevent clicks on weekends
    if (day.isWeekend) {
      // Add toast notification if available
      console.log('Cannot report on weekends');
      return;
    }
    
    // Prevent clicks on past dates (unless already has value)
    if (day.isPast && !day.value) {
      console.log('Cannot edit past dates');
      return;
    }
    
    // Cycle through values: null → 1 → 0.5 → X → null
    let nextValue: '1' | '0.5' | 'X' | null;
    
    if (!day.value) {
      nextValue = '1';
    } else if (day.value === '1') {
      nextValue = '0.5';
    } else if (day.value === '0.5') {
      nextValue = 'X';
    } else {
      nextValue = null;
    }
    
    // If next value requires reason, show modal
    if (nextValue === '0.5' || nextValue === 'X') {
      setSelectedDate(day.date);
      setPendingValue(nextValue);
      setReasonModalOpen(true);
    } else {
      // Update directly
      updateSchedule(day.date, nextValue);
    }
  };

  // Handle reason submission
  const handleReasonSubmit = (reason: string) => {
    if (selectedDate && pendingValue) {
      updateSchedule(selectedDate, pendingValue, reason);
    }
    setReasonModalOpen(false);
    setSelectedDate(null);
    setPendingValue(null);
  };

  // Handle reason modal close
  const handleReasonModalClose = () => {
    setReasonModalOpen(false);
    setSelectedDate(null);
    setPendingValue(null);
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const goToMonth = (year: number, month: number) => {
    setCurrentMonth(new Date(year, month, 1));
    setShowMonthPicker(false);
  };

  // Get status color class
  const getStatusColorClass = (value: '1' | '0.5' | 'X' | null): string => {
    switch (value) {
      case '1': return 'bg-green-500 text-white';
      case '0.5': return 'bg-orange-500 text-white';
      case 'X': return 'bg-red-500 text-white';
      default: return 'bg-gray-100 text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (value: '1' | '0.5' | 'X' | null) => {
    switch (value) {
      case '1': return <Check className="w-4 h-4" />;
      case '0.5': return <Clock className="w-4 h-4" />;
      case 'X': return <XIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  // Load data when component mounts or month changes
  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  const calendarDays = generateCalendarDays();
  const currentDate = new Date();
  const isCurrentMonth = currentMonth.getMonth() === currentDate.getMonth() && 
                        currentMonth.getFullYear() === currentDate.getFullYear();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">טוען לוח שנה...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">לוח שנה אישי</h2>
              <p className="text-blue-700 text-sm">
                {user ? `${user.hebrew || user.name}` : 'משתמש'} • תצוגה חודשית
              </p>
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {Object.values(scheduleData).filter(entry => entry.value === '1').length}
              </div>
              <div className="text-xs text-gray-600">ימים מלאים</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {Object.values(scheduleData).filter(entry => entry.value === '0.5').length}
              </div>
              <div className="text-xs text-gray-600">חצי ימים</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {Object.values(scheduleData).filter(entry => entry.value === 'X').length}
              </div>
              <div className="text-xs text-gray-600">היעדרויות</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToNextMonth}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] shadow-sm"
          >
            <span>חודש הבא</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors px-4 py-2 rounded-lg hover:bg-white/50"
            >
              {HEBREW_MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </button>
            {!isCurrentMonth && (
              <button
                onClick={goToToday}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors min-h-[44px] shadow-sm"
              >
                <Today className="w-4 h-4" />
                <span>היום</span>
              </button>
            )}
          </div>
          
          <button
            onClick={goToPreviousMonth}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
            <span>חודש קודם</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {HEBREW_DAY_ABBREV.map((day, index) => (
            <div key={day} className="text-center py-3 font-semibold text-gray-600 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days - Desktop */}
        <div className="hidden md:grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={!editable || day.isWeekend || (day.isPast && !day.value)}
              className={`
                relative aspect-square min-h-[120px] rounded-lg border-2 transition-all duration-200 p-3 flex flex-col items-center justify-center
                ${day.isCurrentMonth ? 'border-gray-200' : 'border-gray-100'}
                ${day.isToday ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                ${day.isWeekend ? 'bg-gray-100 cursor-not-allowed' : ''}
                ${day.isWeekend ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.05)_10px,rgba(0,0,0,0.05)_20px)]' : ''}
                ${!day.isWeekend && editable && !day.isPast ? 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer' : ''}
                ${day.isPast && !day.value ? 'opacity-50 cursor-not-allowed' : ''}
                ${!day.isCurrentMonth ? 'opacity-30' : ''}
                ${day.value ? getStatusColorClass(day.value) : 'bg-white'}
                ${day.value ? 'hover:opacity-80' : ''}
              `}
              title={day.isWeekend ? 'סופי שבוע - לא ניתן לדיווח' : day.reason || ''}
            >
              {/* Day number */}
              <span className={`text-xl font-bold mb-1 ${
                day.value ? 'text-white' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.dayNumber}
              </span>
              
              {/* Status icon */}
              {day.value && (
                <div className="mb-1">
                  {getStatusIcon(day.value)}
                </div>
              )}
              
              {/* Reason indicator */}
              {day.reason && (
                <div className="absolute bottom-2 left-2">
                  <Info className="w-3 h-3 text-white opacity-75" />
                </div>
              )}
              
              {/* Today indicator */}
              {day.isToday && (
                <div className="absolute bottom-2 right-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Calendar days - Mobile */}
        <div className="md:hidden grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={!editable || day.isWeekend || (day.isPast && !day.value)}
              className={`
                relative aspect-square min-h-[60px] rounded-lg border-2 transition-all duration-200 p-1 flex flex-col items-center justify-center touch-manipulation
                ${day.isCurrentMonth ? 'border-gray-200' : 'border-gray-100'}
                ${day.isToday ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                ${day.isWeekend ? 'bg-gray-100 cursor-not-allowed' : ''}
                ${day.isWeekend ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(0,0,0,0.05)_5px,rgba(0,0,0,0.05)_10px)]' : ''}
                ${!day.isWeekend && editable && !day.isPast ? 'active:bg-blue-50 active:border-blue-300 cursor-pointer' : ''}
                ${day.isPast && !day.value ? 'opacity-50 cursor-not-allowed' : ''}
                ${!day.isCurrentMonth ? 'opacity-30' : ''}
                ${day.value ? getStatusColorClass(day.value) : 'bg-white'}
                ${day.value ? 'active:opacity-80' : ''}
              `}
              title={day.isWeekend ? 'סופי שבוע - לא ניתן לדיווח' : day.reason || ''}
            >
              {/* Day number */}
              <span className={`text-sm font-bold ${
                day.value ? 'text-white' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.dayNumber}
              </span>
              
              {/* Status icon - smaller for mobile */}
              {day.value && (
                <div className="absolute top-1 right-1">
                  <div className="w-3 h-3 flex items-center justify-center">
                    {getStatusIcon(day.value)}
                  </div>
                </div>
              )}
              
              {/* Today indicator */}
              {day.isToday && (
                <div className="absolute bottom-1 right-1">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t-2 border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-blue-50">
        <h3 className="font-bold text-gray-900 text-lg mb-4">מקרא</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-medium">יום מלא</div>
              <div className="text-sm text-gray-600">7 שעות</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-medium">חצי יום</div>
              <div className="text-sm text-gray-600">3.5 שעות (דורש סיבה)</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
              <XIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-medium">היעדרות</div>
              <div className="text-sm text-gray-600">0 שעות (דורש סיבה)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reason Modal */}
      <MobileReasonInput
        isOpen={isReasonModalOpen}
        onClose={handleReasonModalClose}
        onSave={handleReasonSubmit}
        statusType={pendingValue || 'X'}
        memberName={user?.hebrew || user?.name}
        date={selectedDate || undefined}
      />
    </div>
  );
}