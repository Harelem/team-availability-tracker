'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TeamMember, Team, ScheduleEntry } from '@/types';
import { DatabaseService } from '@/lib/database';
import MobileReasonInput from './MobileReasonInput';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Check,
  Clock,
  X as XIcon,
  Info
} from 'lucide-react';

interface PersonalCalendarProps {
  user?: TeamMember;
  team?: Team;
  editable?: boolean;
  onDataChange?: (scheduleData: Record<number, Record<string, ScheduleEntry>>) => void;
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
    icon: Check ? <Check className="w-6 h-6" /> : <span className="text-xl">✓</span>,
    color: 'border-green-300 bg-green-50 hover:bg-green-100 text-green-900'
  },
  {
    value: '0.5',
    label: 'חצי יום',
    description: '3.5 שעות עבודה',
    icon: Clock ? <Clock className="w-6 h-6" /> : <span className="text-xl">🕐</span>,
    color: 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900'
  },
  {
    value: 'X',
    label: 'חופש / מחלה',
    description: '0 שעות עבודה',
    icon: XIcon ? <XIcon className="w-6 h-6" /> : <span className="text-xl">✗</span>,
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
  currentStatus?: '1' | '0.5' | 'X' | null;
}

function DayStatusModal({ isOpen, onClose, onSelect, date, memberName, currentStatus }: DayStatusModalProps) {
  if (!isOpen || !date) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {currentStatus ? 'עריכת סטטוס יום' : 'בחירת סטטוס יום'}
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
            {currentStatus ? 'שנה את סוג היום:' : 'אנא בחר את סוג היום:'}
          </p>
          
          {DAY_STATUS_OPTIONS.map((option) => {
            const isSelected = currentStatus === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onSelect(option.value)}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md active:scale-[0.98] text-right ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg border-blue-400 ' + option.color
                    : option.color
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg">
                      {option.label}
                      {isSelected && (
                        <span className="mr-2 text-blue-600">✓</span>
                      )}
                    </div>
                    <div className="text-sm opacity-75">{option.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
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
  editable = true,
  onDataChange
}: PersonalCalendarProps) {
  // State management
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduleData, setScheduleData] = useState<{[key: string]: ScheduleEntry}>({});
  const [isReasonModalOpen, setReasonModalOpen] = useState(false);
  const [isStatusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<'0.5' | 'X' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Critical refs for preventing race conditions and memory leaks
  const isMountedRef = useRef(true);
  const currentOperationRef = useRef<string | null>(null);
  const savingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      const isWeekend = date.getDay() === 5 || date.getDay() === 6; // Friday or Saturday
      
      days.push({
        date: new Date(date),
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        isWeekend,
        isPast: date < today,
        value: (!isWeekend && scheduleEntry?.value) || null, // Exclude weekend values
        reason: (!isWeekend && scheduleEntry?.reason) || undefined // Exclude weekend reasons
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

  // Update schedule entry with race condition prevention and robust error handling
  const updateSchedule = useCallback(async (date: Date, value: '1' | '0.5' | 'X' | null, reason?: string) => {
    if (!user || !isMountedRef.current) return;
    
    const dateKey = formatDateKey(date);
    const operationId = `${Date.now()}-${Math.random()}`;
    
    // Prevent overlapping operations
    if (currentOperationRef.current) {
      console.log('⚠️ Blocking overlapping operation, current:', currentOperationRef.current);
      return;
    }
    
    currentOperationRef.current = operationId;
    console.log('🔄 Starting operation:', operationId, { dateKey, value, reason });
    
    // Clear any previous errors
    setLastError(null);
    
    // Set saving with failsafe timeout
    setSaving(true);
    savingTimeoutRef.current = setTimeout(() => {
      console.error('⚠️ Force clearing saving state - operation timeout');
      if (isMountedRef.current && currentOperationRef.current === operationId) {
        setSaving(false);
        currentOperationRef.current = null;
        setLastError('Operation timed out. Please try again.');
      }
    }, 10000); // 10-second timeout
    
    try {
      await DatabaseService.updateScheduleEntry(
        user.id,
        dateKey,
        value,
        reason
      );
      
      // Only proceed if this is still the current operation and component is mounted
      if (!isMountedRef.current || currentOperationRef.current !== operationId) {
        console.log('🚫 Operation cancelled or superseded:', operationId);
        return;
      }
      
      // Update local state carefully to preserve existing data
      const updatedScheduleData = { ...scheduleData };
      
      if (value) {
        // Add or update entry
        updatedScheduleData[dateKey] = { 
          value, 
          reason, 
          hours: value === '1' ? 7 : value === '0.5' ? 3.5 : 0 
        };
      } else {
        // Remove entry (delete case)
        delete updatedScheduleData[dateKey];
      }
      
      setScheduleData(updatedScheduleData);
      
      // Notify parent component of data change
      if (onDataChange && user) {
        onDataChange({
          [user.id]: updatedScheduleData
        });
      }
      
      console.log('✅ Operation completed successfully:', operationId);
      
    } catch (error) {
      console.error('❌ Error updating schedule:', error, 'Operation:', operationId);
      
      // Only update error state if component is still mounted and operation is current
      if (isMountedRef.current && currentOperationRef.current === operationId) {
        setLastError(`Failed to save schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      // Clean up timeout
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
        savingTimeoutRef.current = null;
      }
      
      // Only clear saving state if component is mounted and this is the current operation
      if (isMountedRef.current && currentOperationRef.current === operationId) {
        setSaving(false);
        currentOperationRef.current = null;
        console.log('🧹 Operation cleanup completed:', operationId);
      } else {
        console.log('🚫 Skipping cleanup - component unmounted or operation superseded:', operationId);
      }
    }
  }, [user, scheduleData, onDataChange]);

  // Handle day click - UNIFIED FLOW with enhanced error handling
  const handleDayClick = (day: CalendarDay) => {
    if (!editable || !isMountedRef.current) return;
    
    // Clear any previous errors when user interacts
    setLastError(null);
    
    // Prevent clicks during save operations
    if (saving || currentOperationRef.current) {
      console.log('🚫 Calendar interaction blocked - operation in progress:', {
        saving,
        currentOperation: currentOperationRef.current
      });
      return;
    }
    
    // Prevent clicks on weekends
    if (day.isWeekend) {
      console.log('🚫 Cannot report on weekends');
      return;
    }
    
    // Prevent clicks on past dates (unless already has value)
    if (day.isPast && !day.value) {
      console.log('🚫 Cannot edit past dates without existing value');
      return;
    }
    
    console.log('✅ Day click allowed:', {
      date: day.date.toISOString().split('T')[0],
      currentValue: day.value,
      editable,
      saving
    });
    
    // UNIFIED FLOW: Always show status selection modal first (empty or filled)
    setSelectedDate(day.date);
    setStatusModalOpen(true);
  };

  // Get current status for the selected date
  const getCurrentStatus = (): '1' | '0.5' | 'X' | null => {
    if (!selectedDate) return null;
    const dateKey = formatDateKey(selectedDate);
    return scheduleData[dateKey]?.value || null;
  };

  // Handle status selection from first modal
  const handleStatusSelect = (status: '1' | '0.5' | 'X') => {
    setStatusModalOpen(false);
    
    if (status === '1') {
      // Full day - save directly and clear any existing reason
      if (selectedDate) {
        updateSchedule(selectedDate, status, undefined); // Clear reason
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
      case '1': return Check ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-green-600 text-sm">✓</span>;
      case '0.5': return <span className="text-orange-600 font-bold text-sm">½</span>;
      case 'X': return XIcon ? <XIcon className="w-4 h-4 text-red-600" /> : <span className="text-red-600 text-sm">✗</span>;
      default: return null;
    }
  };

  // Load data when component mounts or month changes
  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  // Component lifecycle management and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      console.log('🧹 PersonalCalendar unmounting - cleaning up');
      isMountedRef.current = false;
      
      // Clear any pending timeouts
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
        savingTimeoutRef.current = null;
      }
      
      // Reset operation tracking
      currentOperationRef.current = null;
    };
  }, []);

  // Enhanced debug logging for saving state transitions
  useEffect(() => {
    console.log('📊 PersonalCalendar state update:', {
      saving,
      currentOperation: currentOperationRef.current,
      isMounted: isMountedRef.current,
      lastError
    });
  }, [saving, lastError]);

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
            {ChevronRight && <ChevronRight className="w-4 h-4" />}
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
                {CalendarIcon && <CalendarIcon className="w-4 h-4" />}
                <span>היום</span>
              </button>
            )}
          </div>
          
          <button
            onClick={goToNextMonth}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] shadow-sm"
          >
            <span>חודש הבא</span>
            {ChevronLeft && <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6 relative">
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
              disabled={!editable || day.isWeekend || (day.isPast && !day.value) || saving}
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
              {day.value && !day.isWeekend && (
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
              disabled={!editable || day.isWeekend || (day.isPast && !day.value) || saving}
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
              {day.value && !day.isWeekend && (
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
        
        {/* Saving overlay */}
        {saving && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-4 py-3 border">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-gray-700">שומר...</span>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {lastError && !saving && (
          <div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center z-10">
            <div className="max-w-sm mx-4 bg-white rounded-lg shadow-lg border-2 border-red-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-red-900 mb-1">שגיאה בשמירה</h4>
                  <p className="text-xs text-red-700 mb-3">{lastError}</p>
                  <button
                    onClick={() => setLastError(null)}
                    className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t-2 border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-blue-50">
        <h3 className="font-bold text-gray-900 text-lg mb-4">מקרא</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
              {Check ? <Check className="w-4 h-4 text-white" /> : <span className="text-white text-sm">✓</span>}
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
              {XIcon ? <XIcon className="w-4 h-4 text-white" /> : <span className="text-white text-sm">✗</span>}
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
        currentStatus={getCurrentStatus()}
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