'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react';
import { TeamMember, Team, ScheduleEntry } from '@/types';
import { DatabaseService } from '@/lib/database';
import { formatDateKey } from '@/utils/dateUtils';
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

// Component mount counter for debugging multiple initializations
let mountCounter = 0;

const PersonalCalendar = React.memo(function PersonalCalendar({
  user,
  team,
  editable = true,
  onDataChange
}: PersonalCalendarProps) {
  // COMPONENT MOUNT TRACKING
  const mountId = ++mountCounter;
  console.log(`🏗️ COMPONENT MOUNT: PersonalCalendar instance #${mountId} initializing`, {
    userId: user?.id,
    teamId: team?.id,
    editable,
    hasOnDataChange: !!onDataChange
  });
  
  // PERFORMANCE FIX: State management with React 18 optimizations + Enhanced Month persistence
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Restore last viewed month from robust storage, fallback to current date
    console.log('🔄 MONTH PERSISTENCE: Initializing calendar component...');
    
    if (typeof window !== 'undefined') {
      console.log('🌐 MONTH PERSISTENCE: Window is available, checking storage...');
      
      // Use helper method to load from storage with fallback
      let savedMonth = null;
      let storageType = 'none';
      
      // Try localStorage first
      try {
        savedMonth = localStorage.getItem('personal-calendar-month');
        if (savedMonth) {
          storageType = 'localStorage';
        }
      } catch (error) {
        console.warn('⚠️ MONTH PERSISTENCE: localStorage read failed:', error);
      }
      
      // Fallback to sessionStorage
      if (!savedMonth) {
        try {
          savedMonth = sessionStorage.getItem('personal-calendar-month');
          if (savedMonth) {
            storageType = 'sessionStorage';
          }
        } catch (error) {
          console.warn('⚠️ MONTH PERSISTENCE: sessionStorage read failed:', error);
        }
      }
      
      console.log('📂 MONTH PERSISTENCE: Retrieved from storage:', { 
        savedMonth, 
        storageType,
        localStorageAvailable: !!window.localStorage,
        sessionStorageAvailable: !!window.sessionStorage
      });
      
      if (savedMonth) {
        try {
          // Handle both new format (YYYY-MM) and legacy format (ISO date)
          let restoredDate: Date;
          
          if (savedMonth.match(/^\d{4}-\d{2}$/)) {
            // New format: "2025-09"
            const [year, month] = savedMonth.split('-').map(Number);
            restoredDate = new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
            console.log('📅 MONTH PERSISTENCE: Parsing new format month string:', {
              originalValue: savedMonth,
              year: year,
              month: month,
              parsedDate: restoredDate,
              storageSource: storageType
            });
          } else {
            // Legacy format: ISO date string
            restoredDate = new Date(savedMonth);
            console.log('📅 MONTH PERSISTENCE: Parsing legacy ISO date:', {
              originalValue: savedMonth,
              parsedDate: restoredDate,
              isValidDate: !isNaN(restoredDate.getTime()),
              storageSource: storageType
            });
          }
          
          // Validate restored date - ensure it's not invalid or too far in the future
          const now = new Date();
          const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), 1);
          
          if (!isNaN(restoredDate.getTime()) && restoredDate <= twoYearsFromNow) {
            console.log('✅ MONTH PERSISTENCE: Successfully restored month from storage:', {
              month: restoredDate.getMonth() + 1,
              year: restoredDate.getFullYear(),
              savedValue: savedMonth,
              storageSource: storageType
            });
            
            // Sync between storages if one is missing
            if (storageType === 'sessionStorage') {
              try {
                localStorage.setItem('personal-calendar-month', savedMonth);
                console.log('🔄 MONTH PERSISTENCE: Synced from sessionStorage to localStorage');
              } catch (syncError) {
                console.warn('⚠️ MONTH PERSISTENCE: Could not sync to localStorage:', syncError);
              }
            }
            
            return restoredDate;
          } else {
            console.warn('⚠️ MONTH PERSISTENCE: Invalid saved month detected, cleaning up', {
              restoredDate: restoredDate.toString(),
              isNaN: isNaN(restoredDate.getTime()),
              isFuture: restoredDate > twoYearsFromNow,
              storageSource: storageType
            });
            
            // Clear from both storages
            try {
              localStorage.removeItem('personal-calendar-month');
              sessionStorage.removeItem('personal-calendar-month');
            } catch (clearError) {
              console.warn('⚠️ MONTH PERSISTENCE: Could not clear invalid data:', clearError);
            }
          }
        } catch (error) {
          console.error('❌ MONTH PERSISTENCE: Error parsing saved month:', error);
          // Clear corrupted data
          try {
            localStorage.removeItem('personal-calendar-month');
            sessionStorage.removeItem('personal-calendar-month');
          } catch (clearError) {
            console.warn('⚠️ MONTH PERSISTENCE: Could not clear corrupted data:', clearError);
          }
        }
      } else {
        console.log('📭 MONTH PERSISTENCE: No saved month found in any storage');
      }
    } else {
      console.warn('⚠️ MONTH PERSISTENCE: Window is undefined, cannot access storage');
    }
    
    const currentDate = new Date();
    console.log('📅 MONTH PERSISTENCE: Using current date as fallback:', {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    });
    return currentDate;
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduleData, setScheduleDataInternal] = useState<{[key: string]: ScheduleEntry}>({});
  const [isReasonModalOpen, setReasonModalOpen] = useState(false);
  
  // Wrapper function to log all schedule data state changes
  const setScheduleData = useCallback((updater: any) => {
    if (typeof updater === 'function') {
      setScheduleDataInternal(prevData => {
        const newData = updater(prevData);
        console.log('📊 SCHEDULE STATE: Data updated via function:', {
          previousCount: Object.keys(prevData).length,
          newCount: Object.keys(newData).length,
          changedKeys: Object.keys(newData).filter(key => 
            JSON.stringify(newData[key]) !== JSON.stringify(prevData[key])
          ),
          operation: 'function update'
        });
        return newData;
      });
    } else {
      console.log('📊 SCHEDULE STATE: Data set directly:', {
        entryCount: Object.keys(updater).length,
        dateKeys: Object.keys(updater),
        operation: 'direct set'
      });
      setScheduleDataInternal(updater);
    }
  }, []);
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
  // External schedule update manager reference for integration
  const scheduleUpdateManagerRef = useRef<any>(null);
  
  // Legacy batch refs kept for cleanup compatibility
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced storage helper methods
  const saveMonthToStorage = useCallback((monthValue: string) => {
    const storageOperations = [];
    
    // Try to save to both localStorage and sessionStorage for redundancy
    try {
      localStorage.setItem('personal-calendar-month', monthValue);
      storageOperations.push('localStorage');
    } catch (error) {
      console.warn('⚠️ MONTH PERSISTENCE: localStorage save failed:', error);
    }
    
    try {
      sessionStorage.setItem('personal-calendar-month', monthValue);
      storageOperations.push('sessionStorage');
    } catch (error) {
      console.warn('⚠️ MONTH PERSISTENCE: sessionStorage save failed:', error);
    }
    
    console.log('💾 MONTH PERSISTENCE: Saved to storage:', {
      monthValue,
      savedTo: storageOperations,
      timestamp: new Date().toISOString()
    });
    
    return storageOperations.length > 0;
  }, []);

  const loadMonthFromStorage = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    let savedMonth = null;
    let storageType = 'none';
    
    // Try localStorage first
    try {
      savedMonth = localStorage.getItem('personal-calendar-month');
      if (savedMonth) {
        storageType = 'localStorage';
      }
    } catch (error) {
      console.warn('⚠️ MONTH PERSISTENCE: localStorage read failed:', error);
    }
    
    // Fallback to sessionStorage
    if (!savedMonth) {
      try {
        savedMonth = sessionStorage.getItem('personal-calendar-month');
        if (savedMonth) {
          storageType = 'sessionStorage';
          // Sync back to localStorage if possible
          try {
            localStorage.setItem('personal-calendar-month', savedMonth);
            console.log('🔄 MONTH PERSISTENCE: Synced from sessionStorage to localStorage');
          } catch (syncError) {
            console.warn('⚠️ MONTH PERSISTENCE: Could not sync to localStorage:', syncError);
          }
        }
      } catch (error) {
        console.warn('⚠️ MONTH PERSISTENCE: sessionStorage read failed:', error);
      }
    }
    
    console.log('📂 MONTH PERSISTENCE: Retrieved from storage:', { 
      savedMonth, 
      storageType,
      timestamp: new Date().toISOString()
    });
    
    return savedMonth;
  }, []);

  const clearMonthFromStorage = useCallback(() => {
    const clearOperations = [];
    
    try {
      localStorage.removeItem('personal-calendar-month');
      clearOperations.push('localStorage');
    } catch (error) {
      console.warn('⚠️ MONTH PERSISTENCE: localStorage clear failed:', error);
    }
    
    try {
      sessionStorage.removeItem('personal-calendar-month');
      clearOperations.push('sessionStorage');
    } catch (error) {
      console.warn('⚠️ MONTH PERSISTENCE: sessionStorage clear failed:', error);
    }
    
    console.log('🚮 MONTH PERSISTENCE: Cleared from storage:', {
      clearedFrom: clearOperations
    });
  }, []);


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
  
  // Get optimistic updates from external schedule update manager
  const getOptimisticValue = useCallback((memberId: number, dateKey: string) => {
    if (scheduleUpdateManagerRef.current) {
      return scheduleUpdateManagerRef.current.getOptimisticValue(memberId, dateKey);
    }
    return null;
  }, []);
  
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // DEBUG: Log calendar generation
    console.log('📆 CALENDAR GENERATION:', {
      currentMonth: `${year}-${String(month + 1).padStart(2, '0')}`,
      scheduleDataKeys: Object.keys(scheduleData).length,
      sampleKeys: Object.keys(scheduleData).slice(0, 5)
    });
    
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
      
      // DEBUG: Log data lookup for September dates and show complete comparison
      if (date.getMonth() === 8 && i < 10) { // September is month 8 (0-indexed)
        console.log(`📍 DAY DATA CHECK for ${dateKey}:`, {
          dateKey,
          hasEntry: !!scheduleEntry,
          entryValue: scheduleEntry?.value,
          scheduleDataHasKey: dateKey in scheduleData,
          // Show comparison for debugging
          allAvailableKeys: Object.keys(scheduleData).slice(0, 10),
          exactMatch: scheduleData[dateKey],
          similarKeys: Object.keys(scheduleData).filter(key => 
            key.includes(String(date.getDate()).padStart(2, '0'))
          )
        });
      }
      
      // Get optimistic update from external manager if available
      const optimisticUpdate = user ? getOptimisticValue(user.id, dateKey) : null;
      const currentEntry = optimisticUpdate ? {
        value: optimisticUpdate.value,
        reason: optimisticUpdate.reason
        // optimistic: true
      } : scheduleEntry;
      
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
  }, [currentMonth, scheduleData, user, getOptimisticValue]);

  // Fetch schedule data for the visible month
  const fetchMonthData = useCallback(async () => {
    if (!user) {
      console.log('📅 DATA FETCH: Skipped - no user available');
      return;
    }
    
    console.log('📅 DATA FETCH: Starting data fetch for month:', {
      month: currentMonth.getMonth() + 1,
      year: currentMonth.getFullYear(),
      userId: user.id
    });
    
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Get optimized date range - current month plus minimal buffer
      const startDate = new Date(year, month, 1);
      startDate.setDate(startDate.getDate() - 7); // 1 week before current month
      const endDate = new Date(year, month + 1, 0);
      endDate.setDate(endDate.getDate() + 7); // 1 week after current month
      
      const startDateKey = formatDateKey(startDate);
      const endDateKey = formatDateKey(endDate);
      
      console.log('📅 DATA FETCH: Query parameters:', {
        startDateKey,
        endDateKey,
        dateRange: `${startDateKey} to ${endDateKey}`
      });
      
      // Use cached getScheduleEntries for better performance (1-2 queries vs 8+)
      const allScheduleData = await DatabaseService.getScheduleEntries(
        startDateKey,
        endDateKey,
        undefined, // teamId - not needed for personal calendar
        false // forceRefresh - use cache for better performance
      );
      
      console.log('📅 DATA FETCH: Raw database response:', {
        totalUsers: Object.keys(allScheduleData).length,
        hasCurrentUser: user.id in allScheduleData,
        allUserIds: Object.keys(allScheduleData)
      });
      
      // Extract data for the current user only
      const dataObject = allScheduleData[user.id] || {};
      
      console.log('📅 DATA FETCH: User data extracted:', {
        userId: user.id,
        entryCount: Object.keys(dataObject).length,
        dateKeys: Object.keys(dataObject),
        sampleEntries: Object.keys(dataObject).slice(0, 5).map(key => ({
          date: key,
          value: dataObject[key]?.value,
          reason: dataObject[key]?.reason
        }))
      });
      
      // CRITICAL DEBUG: Show exact date formats
      console.log('🔑 DATE KEY ANALYSIS:', {
        firstDateKey: Object.keys(dataObject)[0],
        lastDateKey: Object.keys(dataObject)[Object.keys(dataObject).length - 1],
        allDateKeys: Object.keys(dataObject).slice(0, 10),
        currentMonthString: `${year}-${String(month + 1).padStart(2, '0')}`,
        septemberDates: Object.keys(dataObject).filter(key => key.startsWith('2025-09')),
        // New debugging for format verification
        formatTestToday: formatDateKey(new Date()),
        formatTestSep1: formatDateKey(new Date('2025-09-01')),
        formatTestSep15: formatDateKey(new Date('2025-09-15'))
      });
      
      // DATE FORMAT DEBUG: Check if recently saved dates exist in fetched data
      const today = new Date();
      const recentDates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateKey = formatDateKey(date);
        recentDates.push({
          dateKey,
          exists: dateKey in dataObject,
          value: dataObject[dateKey]?.value,
          displayDate: date.toDateString()
        });
      }
      
      console.log('🔍 DATE FORMAT DEBUG: Recent dates check:', {
        recentDatesFound: recentDates.filter(d => d.exists),
        recentDatesMissing: recentDates.filter(d => !d.exists),
        formatExample: `formatDateKey creates: ${formatDateKey(today)}`,
        todayFormatted: formatDateKey(today)
      });
      
      setScheduleData(dataObject);
      
      console.log('📅 DATA FETCH: Successfully updated schedule data state with', Object.keys(dataObject).length, 'entries');
      
      // CRITICAL DEBUG: Show the actual schedule data structure
      console.log('🔍 SCHEDULE DATA SAMPLE:', {
        totalEntries: Object.keys(dataObject).length,
        firstFewEntries: Object.keys(dataObject).slice(0, 5).reduce((acc, key) => {
          acc[key] = dataObject[key];
          return acc;
        }, {} as Record<string, any>),
        septemberEntries: Object.keys(dataObject).filter(key => key.startsWith('2025-09')).reduce((acc, key) => {
          acc[key] = dataObject[key];
          return acc;
        }, {} as Record<string, any>)
      });
    } catch (error) {
      console.error('Error fetching month data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  // Effect to ensure data is fetched when month changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📅 Personal Calendar: Viewing', HEBREW_MONTHS[currentMonth.getMonth()], currentMonth.getFullYear());
    }
    fetchMonthData();
  }, [currentMonth, fetchMonthData]);

  // Optimistic update function for immediate UI feedback - integrated with scheduleUpdateManager
  const applyOptimisticUpdate = useCallback((date: Date, value: '1' | '0.5' | 'X' | null, reason?: string) => {
    const dateKey = formatDateKey(date);
    
    // Apply to local state immediately for instant UI feedback
    setScheduleData(prevData => {
      const updatedData = { ...prevData };
      if (value) {
        updatedData[dateKey] = { 
          value, 
          reason, 
          hours: value === '1' ? 7 : value === '0.5' ? 3.5 : 0
          // optimistic: true // Mark as optimistic for UI differentiation
        };
      } else {
        delete updatedData[dateKey];
      }
      return updatedData;
    });
    
    // Also notify parent component immediately for responsive UI
    if (onDataChange && user) {
      const updatedScheduleData = { ...scheduleDataRef.current };
      if (value) {
        updatedScheduleData[dateKey] = { 
          value, 
          reason, 
          hours: value === '1' ? 7 : value === '0.5' ? 3.5 : 0
          // optimistic: true
        };
      } else {
        delete updatedScheduleData[dateKey];
      }
      onDataChange({ [user.id]: updatedScheduleData });
    }
  }, [onDataChange, user]);

  // Rollback optimistic update on error
  const rollbackOptimisticUpdate = useCallback((date: Date, originalData: any) => {
    const dateKey = formatDateKey(date);
    
    setScheduleData(prevData => {
      const updatedData = { ...prevData };
      if (originalData) {
        updatedData[dateKey] = originalData;
      } else {
        delete updatedData[dateKey];
      }
      return updatedData;
    });
    
    // Also rollback parent component state
    if (onDataChange && user) {
      const rolledBackScheduleData = { ...scheduleDataRef.current };
      if (originalData) {
        rolledBackScheduleData[dateKey] = originalData;
      } else {
        delete rolledBackScheduleData[dateKey];
      }
      onDataChange({ [user.id]: rolledBackScheduleData });
    }
  }, [onDataChange, user]);

  // Stable reference to scheduleData for database updates
  const scheduleDataRef = useRef(scheduleData);
  useEffect(() => {
    scheduleDataRef.current = scheduleData;
  }, [scheduleData]);

  // Legacy debounced function removed - functionality moved to scheduleUpdateManager
  // All database operations now handled by external scheduleUpdateManager for better consistency

  // LEGACY: Batch processing function removed - now handled by scheduleUpdateManager
  // Functionality moved to external scheduleUpdateManager for better performance and consistency

  // PERFORMANCE FIX: Enhanced update function integrated with scheduleUpdateManager
  const updateSchedule = useCallback(async (date: Date, value: '1' | '0.5' | 'X' | null, reason?: string) => {
    if (!user || !isMountedRef.current) {
      return;
    }
    
    // Apply local optimistic update immediately for instant UI feedback
    startTransition(() => {
      applyOptimisticUpdate(date, value, reason);
    });
    
    try {
      // Use external schedule update manager for database operations
      if (!scheduleUpdateManagerRef.current) {
        const { scheduleUpdateManager } = await import('../lib/scheduleUpdateManager');
        scheduleUpdateManagerRef.current = scheduleUpdateManager;
      }
      
      // Ensure the month containing this date is persisted for page refresh recovery
      if (typeof window !== 'undefined') {
        // Use timezone-neutral month format instead of ISO date to avoid timezone bugs
        const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const saveSuccess = saveMonthToStorage(monthValue);
        if (saveSuccess) {
          console.log('✅ MONTH PERSISTENCE: Successfully saved month to storage:', {
            date: date.toDateString(),
            savedMonth: date.getMonth() + 1,
            savedYear: date.getFullYear(),
            storedValue: monthValue
          });
        } else {
          console.error('❌ MONTH PERSISTENCE: All storage methods failed');
        }
      } else {
        console.warn('⚠️ MONTH PERSISTENCE: window is undefined, cannot save to localStorage');
      }
      
      // Call external update manager (handles optimistic updates, retries, etc.)
      await scheduleUpdateManagerRef.current.updateScheduleEntry(
        user.id,
        formatDateKey(date),
        value,
        reason,
        { priority: 'normal' }
      );
      
      // On success, sync local state with the confirmed data
      const dateKey = formatDateKey(date);
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
      
    } catch (error) {
      console.error('❌ Update failed, rolling back optimistic update:', error);
      // Get original data for rollback
      const dateKey = formatDateKey(date);
      const originalData = scheduleDataRef.current[dateKey] || null;
      rollbackOptimisticUpdate(date, originalData);
      
      setLastError(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [user, applyOptimisticUpdate, rollbackOptimisticUpdate]);

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
    if (!selectedDate || !user) return null;
    const dateKey = formatDateKey(selectedDate);
    const optimisticUpdate = getOptimisticValue(user.id, dateKey);
    return optimisticUpdate?.value || scheduleData[dateKey]?.value || null;
  }, [selectedDate, scheduleData, user, getOptimisticValue]);

  // PERFORMANCE FIX: Optimized status selection with batched state updates
  const handleStatusSelect = useCallback((status: '1' | '0.5' | 'X') => {
    // Add timeout protection to prevent infinite hanging
    const statusSelectTimeout = setTimeout(() => {
      console.error('⚠️ STATUS SELECT TIMEOUT - Force clearing modal states');
      setStatusModalOpen(false);
      setReasonModalOpen(false);
      setSelectedDate(null);
      setPendingValue(null);
    }, 5000);
    
    try {
      setStatusModalOpen(false);
      
      if (status === '1') {
        if (selectedDate) {
          console.log('💾 MONTH PERSISTENCE: Initiating full day save for:', {
            date: selectedDate.toDateString(),
            status: status,
            month: selectedDate.getMonth() + 1,
            year: selectedDate.getFullYear()
          });
          // Set saving state for immediate UI feedback
          setSaving(true);
          updateSchedule(selectedDate, status, undefined).finally(() => {
            setSaving(false);
          });
        }
        setSelectedDate(null);
        clearTimeout(statusSelectTimeout);
      } else {
        setPendingValue(status);
        setReasonModalOpen(true);
        clearTimeout(statusSelectTimeout);
      }
    } catch (error) {
      console.error('❌ Error in handleStatusSelect:', error);
      clearTimeout(statusSelectTimeout);
      // Force cleanup on error
      setStatusModalOpen(false);
      setReasonModalOpen(false);
      setSelectedDate(null);
      setPendingValue(null);
    }
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
    // Add timeout protection to prevent infinite hanging
    const reasonSubmitTimeout = setTimeout(() => {
      console.error('⚠️ REASON SUBMIT TIMEOUT - Force clearing modal states');
      setReasonModalOpen(false);
      setSelectedDate(null);
      setPendingValue(null);
    }, 5000);
    
    try {
      // Capture current values to prevent race conditions
      const currentDate = selectedDate;
      const currentPendingValue = pendingValue;
      
      if (currentDate && currentPendingValue) {
        console.log('💾 MONTH PERSISTENCE: Initiating partial/absent save for:', {
          date: currentDate.toDateString(),
          status: currentPendingValue,
          reason: reason,
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        });
        // Set saving state for immediate UI feedback
        setSaving(true);
        updateSchedule(currentDate, currentPendingValue, reason).finally(() => {
          setSaving(false);
        });
      }
      
      // Clean up modal state immediately - don't wait for startTransition
      setReasonModalOpen(false);
      setSelectedDate(null);
      setPendingValue(null);
      
      clearTimeout(reasonSubmitTimeout);
    } catch (error) {
      console.error('❌ Error in handleReasonSubmit:', error);
      clearTimeout(reasonSubmitTimeout);
      // Force cleanup on error
      setReasonModalOpen(false);
      setSelectedDate(null);
      setPendingValue(null);
    }
  }, [selectedDate, pendingValue, updateSchedule]);

  const handleReasonModalClose = useCallback(() => {
    // Clean up modal state immediately - don't wait for startTransition
    setReasonModalOpen(false);
    setSelectedDate(null);
    setPendingValue(null);
  }, []);

  // Helper function to persist month changes
  const updateCurrentMonth = useCallback((newMonth: Date) => {
    setCurrentMonth(newMonth);
    // Persist month to localStorage for page refresh recovery
    if (typeof window !== 'undefined') {
      // Use timezone-neutral month format instead of ISO date to avoid timezone bugs
      const monthValue = `${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, '0')}`;
      
      const saveSuccess = saveMonthToStorage(monthValue);
      if (saveSuccess) {
        console.log('📅 MONTH PERSISTENCE: Navigation updated month in storage:', {
          month: newMonth.getMonth() + 1,
          year: newMonth.getFullYear(),
          storedValue: monthValue
        });
      } else {
        console.error('❌ MONTH PERSISTENCE: Navigation storage failed for all methods');
      }
    } else {
      console.warn('⚠️ MONTH PERSISTENCE: window undefined during navigation, cannot save');
    }
  }, [saveMonthToStorage]);

  // PERFORMANCE FIX: Navigation handlers with startTransition for smooth UI + Month persistence
  const goToPreviousMonth = useCallback(() => {
    startTransition(() => {
      const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      updateCurrentMonth(newMonth);
    });
  }, [currentMonth, updateCurrentMonth]);

  const goToNextMonth = useCallback(() => {
    startTransition(() => {
      const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      updateCurrentMonth(newMonth);
    });
  }, [currentMonth, updateCurrentMonth]);

  const goToToday = useCallback(() => {
    startTransition(() => {
      updateCurrentMonth(new Date());
    });
  }, [updateCurrentMonth]);

  // Month navigation functionality removed - not currently used in this component
  // Month picker would be added here if needed for future UI enhancements

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

  // Component lifecycle management and real-time optimistic update event listeners
  useEffect(() => {
    isMountedRef.current = true;
    
    // Listen for external optimistic update events
    const handleOptimisticUpdate = (event: CustomEvent) => {
      const { key, update } = event.detail;
      if (user && key.startsWith(`${user.id}-`)) {
        // Update triggered by this user, sync local state
        const dateKey = key.split('-').slice(1).join('-'); // Remove member ID prefix
        
        setScheduleData(prevData => {
          const updatedData = { ...prevData };
          if (update.value) {
            updatedData[dateKey] = {
              value: update.value,
              reason: update.reason,
              hours: update.value === '1' ? 7 : update.value === '0.5' ? 3.5 : 0
            };
          } else {
            delete updatedData[dateKey];
          }
          return updatedData;
        });
      }
    };
    
    const handleOptimisticRollback = (event: CustomEvent) => {
      const { key, update } = event.detail;
      if (user && key.startsWith(`${user.id}-`)) {
        // Rollback triggered by this user, restore original state
        const dateKey = key.split('-').slice(1).join('-');
        const originalData = update.rollbackData;
        
        setScheduleData(prevData => {
          const updatedData = { ...prevData };
          if (originalData?.originalValue) {
            updatedData[dateKey] = {
              value: originalData.originalValue,
              reason: originalData.originalReason,
              hours: originalData.originalValue === '1' ? 7 : originalData.originalValue === '0.5' ? 3.5 : 0
            };
          } else {
            delete updatedData[dateKey];
          }
          return updatedData;
        });
      }
    };
    
    const handleOptimisticClear = () => {
      // Clear any optimistic updates and refresh data
      fetchMonthData();
    };
    
    // Add event listeners for external optimistic update integration
    if (typeof window !== 'undefined') {
      window.addEventListener('schedule-optimistic-update', handleOptimisticUpdate as EventListener);
      window.addEventListener('schedule-optimistic-rollback', handleOptimisticRollback as EventListener);
      window.addEventListener('schedule-optimistic-clear', handleOptimisticClear);
    }
    
    return () => {
      console.log(`🗑️ COMPONENT UNMOUNT: PersonalCalendar instance #${mountId} cleaning up`);
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
      
      // Clear batch timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      
      // Reset operation tracking
      currentOperationRef.current = null;
      
      // Remove event listeners
      if (typeof window !== 'undefined') {
        window.removeEventListener('schedule-optimistic-update', handleOptimisticUpdate as EventListener);
        window.removeEventListener('schedule-optimistic-rollback', handleOptimisticRollback as EventListener);
        window.removeEventListener('schedule-optimistic-clear', handleOptimisticClear);
      }
    };
  }, [user, fetchMonthData]);

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
          {calendarDays.map((day, dayIndex) => (
            <button
              key={dayIndex}
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
          {calendarDays.map((day, dayIndex) => (
            <button
              key={dayIndex}
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
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.user?.id === nextProps.user?.id &&
    prevProps.user?.name === nextProps.user?.name &&
    prevProps.user?.hebrew === nextProps.user?.hebrew &&
    prevProps.editable === nextProps.editable &&
    prevProps.onScheduleUpdate === nextProps.onScheduleUpdate
  );
});

export default PersonalCalendar;