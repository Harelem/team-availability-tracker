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

// Day status options for initial selection
interface DayStatusOption {
  value: '1' | '0.5' | 'X';
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const DAY_STATUS_OPTIONS: DayStatusOption[] = [
  {
    value: '1',
    label: 'יום מלא',
    description: '7 שעות עבודה',
    icon: <Check className="w-6 h-6" />,
    color: 'border-green-300 bg-green-50 hover:bg-green-100 text-green-900'
  },
  {
    value: '0.5',
    label: 'חצי יום',
    description: '3.5 שעות עבודה',
    icon: <Clock className="w-6 h-6" />,
    color: 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900'
  },
  {
    value: 'X',
    label: 'חופש / מחלה',
    description: '0 שעות עבודה',
    icon: <XIcon className="w-6 h-6" />,
    color: 'border-red-300 bg-red-50 hover:bg-red-100 text-red-900'
  }
];

// DayStatusModal component
interface DayStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (status: '1' | '0.5' | 'X') => void;
  date: Date | null;
  memberName?: string;
}

function DayStatusModal({ isOpen, onClose, onSelect, date, memberName }: DayStatusModalProps) {
  if (!isOpen || !date) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                בחירת סטטוס יום
              </h3>
              <p className="text-gray-600 mt-1">
                {date.toLocaleDateString('he-IL', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          
          {memberName && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{memberName}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          <p className="text-gray-700 font-medium mb-4">
            אנא בחר את סוג היום:
          </p>
          
          {DAY_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md active:scale-[0.98] text-right ${option.color}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{option.label}</div>
                  <div className="text-sm opacity-75">{option.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [isStatusModalOpen, setStatusModalOpen] = useState(false);
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
    
    // NEW FLOW: For empty dates, show status selection modal first
    if (!day.value) {
      setSelectedDate(day.date);
      setStatusModalOpen(true);
      return;
    }
    
    // EXISTING FLOW: For dates with values, cycle through: 1 → 0.5 → X → null
    let nextValue: '1' | '0.5' | 'X' | null;
    
    if (day.value === '1') {
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
      // Update directly (for null value or full day)
      updateSchedule(day.date, nextValue);
    }
  };

  // Handle status selection from first modal
  const handleStatusSelect = (status: '1' | '0.5' | 'X') => {
    setStatusModalOpen(false);
    
    if (status === '1') {
      // Full day - save directly without reason
      if (selectedDate) {
        updateSchedule(selectedDate, status);
      }
      setSelectedDate(null);
    } else {
      // Half day or absent - show reason modal
      setPendingValue(status);
      setReasonModalOpen(true);
    }
  };

  // Handle status modal close
  const handleStatusModalClose = () => {
    setStatusModalOpen(false);
    setSelectedDate(null);
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

  // Get status color class with subtle tints
  const getStatusColorClass = (value: '1' | '0.5' | 'X' | null): string => {
    switch (value) {
      case '1': return 'bg-green-100 text-gray-900 border-green-300';
      case '0.5': return 'bg-orange-100 text-gray-900 border-orange-300';
      case 'X': return 'bg-red-100 text-gray-900 border-red-300';
      default: return 'bg-gray-100 text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (value: '1' | '0.5' | 'X' | null) => {
    switch (value) {
      case '1': return <Check className="w-4 h-4 text-green-600" />;
      case '0.5': return <span className="text-orange-600 font-bold text-sm">½</span>;
      case 'X': return <XIcon className="w-4 h-4 text-red-600" />;
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
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-2xl mx-auto" dir="rtl">
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
            onClick={goToPreviousMonth}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
            <span>חודש קודם</span>
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
            onClick={goToNextMonth}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] shadow-sm"
          >
            <span>חודש הבא</span>
            <ChevronLeft className="w-4 h-4" />
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
                relative w-[60px] h-[50px] rounded-lg border-2 transition-all duration-200 p-2 flex flex-col items-center justify-center
                ${day.isCurrentMonth ? 'border-gray-200' : 'border-gray-100'}
                ${day.isToday ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                ${day.isWeekend ? 'bg-gray-100 cursor-not-allowed' : ''}
                ${day.isWeekend ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(0,0,0,0.03)_8px,rgba(0,0,0,0.03)_16px)]' : ''}
                ${!day.isWeekend && editable && !day.isPast ? 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer' : ''}
                ${day.isPast && !day.value ? 'opacity-50 cursor-not-allowed' : ''}
                ${!day.isCurrentMonth ? 'opacity-30' : ''}
                ${day.value ? getStatusColorClass(day.value) : 'bg-white'}
                ${day.value ? 'hover:opacity-80' : ''}
              `}
              title={day.isWeekend ? 'סופי שבוע - לא ניתן לדיווח' : day.reason || ''}
            >
              {/* Day number */}
              <span className={`text-sm font-bold ${
                day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.dayNumber}
              </span>
              
              {/* Status icon */}
              {day.value && (
                <div className="absolute top-1 right-1">
                  <div className="w-4 h-4 flex items-center justify-center">
                    {getStatusIcon(day.value)}
                  </div>
                </div>
              )}
              
              {/* Reason indicator */}
              {day.reason && (
                <div className="absolute bottom-1 left-1">
                  <Info className="w-2.5 h-2.5 text-white opacity-75" />
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
                day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
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

      {/* Status Selection Modal */}
      <DayStatusModal
        isOpen={isStatusModalOpen}
        onClose={handleStatusModalClose}
        onSelect={handleStatusSelect}
        date={selectedDate}
        memberName={user?.hebrew || user?.name}
      />

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