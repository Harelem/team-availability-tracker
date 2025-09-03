'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react';
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

const DayStatusModal = React.memo(function DayStatusModal({ isOpen, onClose, onSelect, date, memberName, currentStatus }: DayStatusModalProps) {
  // PERFORMANCE FIX: Proper focus management refs
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // PERFORMANCE FIX: Focus management and cleanup
  useEffect(() => {
    if (isOpen) {
      // Focus the first button when modal opens
      setTimeout(() => {
        firstButtonRef.current?.focus();
      }, 100);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !date) return null;

  // PERFORMANCE FIX: Handle backdrop click without focus conflicts
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
      dir="rtl"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="modal-title" className="text-xl font-bold text-gray-900">
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
          
          {DAY_STATUS_OPTIONS.map((option, index) => {
            const isSelected = currentStatus === option.value;
            return (
              <button
                key={option.value}
                ref={index === 0 ? firstButtonRef : undefined}
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
});

const PersonalCalendar = React.memo(function PersonalCalendar({
  user,
  team,
  editable = true,
  onDataChange
}: PersonalCalendarProps) {
  // PERFORMANCE FIX: State management with React 18 optimizations
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
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optimisticUpdatesRef = useRef<Record<string, { value: '1' | '0.5' | 'X' | null; reason?: string; }>>({});
  
  // PERFORMANCE FIX: Batch queue for multiple rapid updates
  const pendingBatchRef = useRef<Record<string, { date: Date; value: '1' | '0.5' | 'X' | null; reason?: string }>>({});
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format date as YYYY-MM-DD for database keys
  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // PERFORMANCE FIX: Optimized calendar days generation with stable today reference
  const todayRef = useRef(new Date());
  
  // Update today reference once per day
  useEffect(() => {
    const updateToday = () => {
      const now = new Date();
      if (now.toDateString() !== todayRef.current.toDateString()) {
        todayRef.current = now;
      }
    };
    
    updateToday();
    const interval = setInterval(updateToday, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date(todayRef.current);
    today.setHours(0, 0, 0, 0);
    
    // PERFORMANCE FIX: Pre-calculate common values
    const todayString = today.toDateString();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateKey = formatDateKey(date);
      const scheduleEntry = scheduleData[dateKey];
      const optimisticEntry = optimisticUpdatesRef.current[dateKey];
      const currentEntry = optimisticEntry || scheduleEntry;
      
      const isWeekend = date.getDay() === 5 || date.getDay() === 6;
      
      days.push({
        date: new Date(date),
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === todayString,
        isWeekend,
        isPast: date < today,
        value: (!isWeekend && currentEntry?.value) || null,
        reason: (!isWeekend && currentEntry?.reason) || undefined
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
      
      // Get optimized date range - current month plus minimal buffer
      const startDate = new Date(year, month, 1);
      startDate.setDate(startDate.getDate() - 7); // 1 week before current month
      const endDate = new Date(year, month + 1, 0);
      endDate.setDate(endDate.getDate() + 7); // 1 week after current month
      
      // Use cached getScheduleEntries for better performance (1-2 queries vs 8+)
      const allScheduleData = await DatabaseService.getScheduleEntries(
        formatDateKey(startDate),
        formatDateKey(endDate),
        undefined, // teamId - not needed for personal calendar
        false // forceRefresh - use cache for better performance
      );
      
      // Extract data for the current user only
      const dataObject = allScheduleData[user.id] || {};
      
      setScheduleData(dataObject);
    } catch (error) {
      console.error('Error fetching month data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  // Optimistic update function for immediate UI feedback
  const applyOptimisticUpdate = useCallback((date: Date, value: '1' | '0.5' | 'X' | null, reason?: string) => {
    const dateKey = formatDateKey(date);
    
    // Store optimistic update
    optimisticUpdatesRef.current[dateKey] = { value, reason };
    
    // Apply to local state immediately
    setScheduleData(prevData => {
      const updatedData = { ...prevData };
      if (value) {
        updatedData[dateKey] = { 
          value, 
          reason, 
          hours: value === '1' ? 7 : value === '0.5' ? 3.5 : 0 
        };
      } else {
        delete updatedData[dateKey];
      }
      return updatedData;
    });
  }, []);

  // Rollback optimistic update on error
  const rollbackOptimisticUpdate = useCallback((date: Date, originalData: any) => {
    const dateKey = formatDateKey(date);
    delete optimisticUpdatesRef.current[dateKey];
    
    setScheduleData(prevData => {
      const updatedData = { ...prevData };
      if (originalData) {
        updatedData[dateKey] = originalData;
      } else {
        delete updatedData[dateKey];
      }
      return updatedData;
    });
  }, []);

  // Stable reference to scheduleData for database updates
  const scheduleDataRef = useRef(scheduleData);
  useEffect(() => {
    scheduleDataRef.current = scheduleData;
  }, [scheduleData]);

  // Debounced database update function
  const updateScheduleDebounced = useCallback(async (date: Date, value: '1' | '0.5' | 'X' | null, reason?: string) => {
    if (!user || !isMountedRef.current) return;
    
    const dateKey = formatDateKey(date);
    const operationId = `${Date.now()}-${Math.random()}`;
    
    // Store original data for potential rollback
    const originalData = scheduleDataRef.current[dateKey] || null;
    
    // Prevent overlapping operations
    if (currentOperationRef.current) {
      return; // PERFORMANCE FIX: Silent block - no logging needed for performance
    }
    
    currentOperationRef.current = operationId;
    // PERFORMANCE FIX: Drastically reduced logging
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.02) { // Only 2% logging
      console.log('🔄 Starting operation:', operationId, { dateKey, value });
    }
    
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
      const updatedScheduleData = { ...scheduleDataRef.current };
      
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
      
      // PERFORMANCE FIX: Reduce success logging
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.02) { // Only 2% logging
        console.log('✅ Operation completed successfully:', operationId);
      }
      
    } catch (error) {
      console.error('❌ Error updating schedule:', error, 'Operation:', operationId);
      
      // Rollback optimistic update on error
      rollbackOptimisticUpdate(date, originalData);
      
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
        // PERFORMANCE FIX: Remove cleanup logging
      } else {
        // PERFORMANCE FIX: Remove superseded operation logging
      }
    }
  }, [user, onDataChange, rollbackOptimisticUpdate]); // Stable dependencies only

  // PERFORMANCE FIX: Batch processing function for multiple updates
  const processBatch = useCallback(async () => {
    if (!user || !isMountedRef.current) return;
    
    const batch = { ...pendingBatchRef.current };
    pendingBatchRef.current = {}; // Clear the batch
    
    if (Object.keys(batch).length === 0) return;
    
    setSaving(true);
    
    try {
      // Process all batched updates in parallel for better performance
      const promises = Object.entries(batch).map(async ([dateKey, update]) => {
        return DatabaseService.updateScheduleEntry(
          user.id,
          dateKey,
          update.value,
          update.reason
        );
      });
      
      await Promise.all(promises);
      
      // Notify parent of all changes at once
      if (onDataChange && user) {
        const updatedScheduleData = { ...scheduleDataRef.current };
        
        Object.entries(batch).forEach(([dateKey, update]) => {
          if (update.value) {
            updatedScheduleData[dateKey] = { 
              value: update.value, 
              reason: update.reason, 
              hours: update.value === '1' ? 7 : update.value === '0.5' ? 3.5 : 0 
            };
          } else {
            delete updatedScheduleData[dateKey];
          }
        });
        
        onDataChange({ [user.id]: updatedScheduleData });
      }
      
    } catch (error) {
      console.error('❌ Batch update failed:', error);
      // Rollback all optimistic updates in the batch
      Object.entries(batch).forEach(([dateKey, update]) => {
        const originalData = scheduleDataRef.current[dateKey] || null;
        rollbackOptimisticUpdate(update.date, originalData);
      });
      setLastError('Failed to save batch updates');
    } finally {
      setSaving(false);
    }
  }, [user, onDataChange, rollbackOptimisticUpdate]);

  // PERFORMANCE FIX: Enhanced update function with React 18 startTransition
  const updateSchedule = useCallback((date: Date, value: '1' | '0.5' | 'X' | null, reason?: string) => {
    if (!user || !isMountedRef.current) return;
    
    const dateKey = formatDateKey(date);
    
    // Apply optimistic update immediately using startTransition for non-urgent updates
    startTransition(() => {
      applyOptimisticUpdate(date, value, reason);
    });
    
    // Add to batch with improved batching logic
    pendingBatchRef.current[dateKey] = { date, value, reason };
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Reduced batch delay for better responsiveness
    batchTimeoutRef.current = setTimeout(() => {
      startTransition(() => {
        processBatch();
      });
    }, 200); // Shorter delay with startTransition
  }, [user, applyOptimisticUpdate, processBatch]);

  // PERFORMANCE FIX: Optimized day click handler with early returns
  const handleDayClick = useCallback((day: CalendarDay) => {
    if (!editable || !isMountedRef.current || saving || currentOperationRef.current) return;
    if (day.isWeekend || (day.isPast && !day.value)) return;
    
    // Use startTransition for modal state updates to avoid blocking user interactions
    startTransition(() => {
      setLastError(null);
      setSelectedDate(day.date);
      setStatusModalOpen(true);
    });
  }, [editable, saving]);

  // PERFORMANCE FIX: Stable getCurrentStatus function with reduced dependencies
  const getCurrentStatus = useMemo((): '1' | '0.5' | 'X' | null => {
    if (!selectedDate) return null;
    const dateKey = formatDateKey(selectedDate);
    const optimisticEntry = optimisticUpdatesRef.current[dateKey];
    return optimisticEntry?.value || scheduleData[dateKey]?.value || null;
  }, [selectedDate, scheduleData]);

  // PERFORMANCE FIX: Optimized status selection with batched state updates
  const handleStatusSelect = useCallback((status: '1' | '0.5' | 'X') => {
    startTransition(() => {
      setStatusModalOpen(false);
      
      if (status === '1') {
        if (selectedDate) {
          updateSchedule(selectedDate, status, undefined);
        }
        setSelectedDate(null);
      } else {
        setPendingValue(status);
        setReasonModalOpen(true);
      }
    });
  }, [selectedDate, updateSchedule]);

  // PERFORMANCE FIX: Optimized status modal close with batched updates
  const handleStatusModalClose = useCallback(() => {
    startTransition(() => {
      setStatusModalOpen(false);
      setSelectedDate(null);
    });
  }, []);

  // PERFORMANCE FIX: Optimized modal handlers with batched updates
  const handleReasonSubmit = useCallback((reason: string) => {
    if (selectedDate && pendingValue) {
      updateSchedule(selectedDate, pendingValue, reason);
    }
    
    startTransition(() => {
      setReasonModalOpen(false);
      setSelectedDate(null);
      setPendingValue(null);
    });
  }, [selectedDate, pendingValue, updateSchedule]);

  const handleReasonModalClose = useCallback(() => {
    startTransition(() => {
      setReasonModalOpen(false);
      setSelectedDate(null);
      setPendingValue(null);
    });
  }, []);

  // PERFORMANCE FIX: Navigation handlers with startTransition for smooth UI
  const goToPreviousMonth = useCallback(() => {
    startTransition(() => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    startTransition(() => {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    });
  }, []);

  const goToToday = useCallback(() => {
    startTransition(() => {
      setCurrentMonth(new Date());
    });
  }, []);

  const goToMonth = useCallback((year: number, month: number) => {
    startTransition(() => {
      setCurrentMonth(new Date(year, month, 1));
      setShowMonthPicker(false);
    });
  }, []);

  // Memoize expensive utility functions
  const getStatusColorClass = useCallback((value: '1' | '0.5' | 'X' | null): string => {
    switch (value) {
      case '1': return 'bg-green-100 text-gray-900 border-green-300';
      case '0.5': return 'bg-orange-100 text-gray-900 border-orange-300';
      case 'X': return 'bg-red-100 text-gray-900 border-red-300';
      default: return 'bg-gray-100 text-gray-400';
    }
  }, []);

  const getStatusIcon = useCallback((value: '1' | '0.5' | 'X' | null) => {
    switch (value) {
      case '1': return Check ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-green-600 text-sm">✓</span>;
      case '0.5': return <span className="text-orange-600 font-bold text-sm">½</span>;
      case 'X': return XIcon ? <XIcon className="w-4 h-4 text-red-600" /> : <span className="text-red-600 text-sm">✗</span>;
      default: return null;
    }
  }, []);

  // Load data when component mounts or month changes
  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  // Component lifecycle management and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      // PERFORMANCE FIX: Remove unmount logging completely for performance
      isMountedRef.current = false;
      
      // Clear any pending timeouts
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
        savingTimeoutRef.current = null;
      }
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      // PERFORMANCE FIX: Clear batch timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      
      // Reset operation tracking and clear optimistic updates and batch
      currentOperationRef.current = null;
      optimisticUpdatesRef.current = {};
      pendingBatchRef.current = {};
    };
  }, []);

  // PERFORMANCE FIX: Remove state transition logging completely
  // Saving state transitions logging removed for performance

  // PERFORMANCE FIX: More efficient status counts calculation
  const { isCurrentMonth, statusCounts } = useMemo(() => {
    const currentDate = new Date();
    let fullDayCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    
    // Single pass through schedule data for all counts
    Object.values(scheduleData).forEach(entry => {
      switch (entry.value) {
        case '1': fullDayCount++; break;
        case '0.5': halfDayCount++; break;
        case 'X': absentCount++; break;
      }
    });
    
    return {
      isCurrentMonth: currentMonth.getMonth() === currentDate.getMonth() && 
                     currentMonth.getFullYear() === currentDate.getFullYear(),
      statusCounts: {
        fullDays: fullDayCount,
        halfDays: halfDayCount,
        absences: absentCount
      }
    };
  }, [currentMonth, scheduleData]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">טוען לוח שנה...</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-2xl mx-auto" 
      dir="rtl" 
      style={{ 
        minHeight: '600px', 
        // PERFORMANCE FIX: Stable dimensions to prevent CLS
        width: '100%',
        maxWidth: '672px' // 2xl max-width in pixels
      }}
    >
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
                {statusCounts.fullDays}
              </div>
              <div className="text-xs text-gray-600">ימים מלאים</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {statusCounts.halfDays}
              </div>
              <div className="text-xs text-gray-600">חצי ימים</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {statusCounts.absences}
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
        <div className="hidden md:grid grid-cols-7 gap-2" style={{ minHeight: '350px' }}>
          {calendarDays.map((day, index) => (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={!editable || day.isWeekend || (day.isPast && !day.value) || saving}
              className={`
                relative rounded-lg border-2 transition-all duration-200 p-2 flex flex-col items-center justify-center
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
              style={{ 
                // PERFORMANCE FIX: Stable dimensions to prevent CLS
                minWidth: '60px',
                minHeight: '50px',
                maxWidth: '60px',
                maxHeight: '50px'
              }}
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
              style={{ 
                // PERFORMANCE FIX: Stable dimensions to prevent CLS on mobile
                minWidth: '60px',
                minHeight: '60px'
              }}
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
        
        {/* PERFORMANCE FIX: Non-blocking saving indicator */}
        {saving && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2 z-10 shadow-lg">
            <div className="animate-spin rounded-full h-3 w-3 border border-white border-b-transparent"></div>
            <span>Saving...</span>
          </div>
        )}
        
        {/* PERFORMANCE FIX: Non-blocking error indicator */}
        {lastError && !saving && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-2 rounded-lg text-xs flex items-center gap-2 z-10 shadow-lg max-w-xs">
            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs">{lastError}</p>
            </div>
            <button
              onClick={() => setLastError(null)}
              className="text-white hover:text-red-200 ml-2"
              title="Close error"
            >
              ×
            </button>
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
        currentStatus={getCurrentStatus}
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
});

export default PersonalCalendar;