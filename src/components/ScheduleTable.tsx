'use client';

import React, { useEffect, useState, useCallback, useMemo, startTransition, useRef } from 'react';
// import { } from 'lucide-react'; // No icons used directly in this component
import { TeamMember, Team, WorkOption, ReasonDialogData } from '@/types';
import ReasonDialog from './ReasonDialog';
import ViewReasonsModal from './ViewReasonsModal';
import MobileScheduleView from './MobileScheduleView';
import { useDebounce, logPerformanceMetric } from '@/utils/performanceOptimization';
// import EnhancedManagerExportButton from './EnhancedManagerExportButton'; // Used in CompactHeaderBar
import TeamMemberManagement from './TeamMemberManagement';
import TeamHoursStatus from './TeamHoursStatus';
import CompactHeaderBar from './CompactHeaderBar';
import QuickActionsBar from './QuickActionsBar';
import dynamic from 'next/dynamic';
import LoadingState from './LoadingState';

// Dynamic import for heavy table component to improve LCP
const EnhancedAvailabilityTable = dynamic(() => import('./EnhancedAvailabilityTable'), {
  loading: () => <LoadingState testId="availability-table-loading" showText text="Loading availability table..." />,
  ssr: false
});
import TeamSummaryOverview from './TeamSummaryOverview';
import ClientOnly from './ClientOnly';
// import { canManageSprints } from '@/utils/permissions'; // Used in CompactHeaderBar
import { DatabaseService } from '@/lib/database';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { DEFAULT_SPRINT_CONFIG } from '@/utils/smartSprintDetection';
import { useSprintData } from '@/hooks/useSprintData';

// TEMPORARILY REMOVED: Import centralized state management
// import {
//   useLoadingState,
//   useErrorState,
//   useModalState,
//   useNavigationState,
//   useSchedulesState,
//   useSprintsState,
//   useNotifications,
//   useRefreshUtilities
// } from '@/hooks/useAppState';

interface ScheduleTableProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
  viewMode?: 'week' | 'sprint';
  sprintDates?: Date[];
}

const workOptions: WorkOption[] = [
  { value: '1', label: '1', hours: 7, description: 'Full day (7 hours)', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: '0.5', label: '0.5', hours: 3.5, description: 'Half day (3.5 hours)', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'X', label: 'X', hours: 0, description: 'Sick/OoO (0 hours)', color: 'bg-red-100 text-red-800 border-red-300' }
];

// const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']; // Used in EnhancedAvailabilityTable

const ScheduleTable = React.memo(function ScheduleTable({ currentUser, teamMembers, selectedTeam, viewMode = 'week', sprintDates }: ScheduleTableProps) {
  // Local state management (temporarily replacing centralized state)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<any>({});
  const [connectionError, setConnectionError] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSprintDates, setCurrentSprintDates] = useState<Date[]>([]);
  // REMOVED: sprintDays state was causing circular dependency
  
  // Modal state
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonDialogData, setReasonDialogData] = useState<ReasonDialogData | null>(null);
  const [viewReasonsOpen, setViewReasonsOpen] = useState(false);
  
  // Navigation state 
  const [currentSprintOffset, setCurrentSprintOffset] = useState(0);
  
  // Week navigation state
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    return startOfWeek;
  });
  const [navigationMode, setNavigationMode] = useState<'sprint' | 'week'>('week');
  
  // PERFORMANCE FIX: Add refs for cleanup
  const isMountedRef = useRef(true);

  // Cleanup effect to mark component as unmounted
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Sprint data from GlobalSprintContext
  const { currentSprint } = useGlobalSprint();
  
  // Enhanced sprint data with fallback logic
  const sprintDataResult = useSprintData({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    autoInitialize: true,
    debugMode: process.env.NODE_ENV === 'development'
  });
  
  // Helper functions for notifications
  const showError = (title: string, message: string) => {
    console.error(`${title}: ${message}`);
    setError(message);
  };
  const showSuccess = (title: string, message: string) => {
  };
  
  // Performance-optimized helper functions for state updates
  const setSchedulesLoading = setLoading;
  const setSchedulesError = setError;
  
  // PERFORMANCE FIX: Batched schedule entry updates to prevent cascade renders
  const batchedUpdatesRef = useRef<Map<string, { memberId: number; date: Date; value: string | null; reason?: string }>>(new Map());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const processBatchedUpdates = useCallback(() => {
    const updates = Array.from(batchedUpdatesRef.current.values());
    if (updates.length === 0) return;
    
    // Clear the batch
    batchedUpdatesRef.current.clear();
    
    // Apply all updates in a single state update using React 18 automatic batching
    startTransition(() => {
      setScheduleData((prev: any) => {
        const updated = { ...prev };
        
        updates.forEach(({ memberId, date, value, reason }) => {
          const dateKey = date.toISOString().split('T')[0];
          if (!dateKey) return;
          
          if (!updated[memberId]) {
            updated[memberId] = {};
          }
          updated[memberId][dateKey] = { value, reason };
        });
        
        return updated;
      });
    });
  }, []);
  
  const updateScheduleEntry = useCallback((memberId: number, date: Date, value: string | null, reason?: string) => {
    const updateKey = `${memberId}-${date.toISOString().split('T')[0]}`;
    
    // Add to batch
    batchedUpdatesRef.current.set(updateKey, { memberId, date, value, reason });
    
    // Clear existing timeout and set new one
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Process batch after 100ms of inactivity (React 18 automatic batching)
    batchTimeoutRef.current = setTimeout(processBatchedUpdates, 100);
  }, [processBatchedUpdates]);
  
  // Mock refresh function
  const refreshSchedules = () => {
  };

  // PERFORMANCE FIX: Memoized navigation functions to prevent re-renders
  const goToPreviousWeek = useCallback(() => {
    startTransition(() => {
      setCurrentWeek(prev => {
        const newWeek = new Date(prev);
        newWeek.setDate(prev.getDate() - 7);
        return newWeek;
      });
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    startTransition(() => {
      setCurrentWeek(prev => {
        const newWeek = new Date(prev);
        newWeek.setDate(prev.getDate() + 7);
        return newWeek;
      });
    });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    startTransition(() => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      setCurrentWeek(startOfWeek);
    });
  }, []);

  // PERFORMANCE FIX: Memoized week days calculation
  const getWeekDays = useMemo(() => (startDate: Date): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }, []);

  // PERFORMANCE FIX: Memoized current week string calculation
  const getCurrentWeekString = useCallback((): string => {
    const endOfWeek = new Date(currentWeek);
    endOfWeek.setDate(currentWeek.getDate() + 4);
    
    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    };
    
    return `${formatDate(currentWeek)} - ${formatDate(endOfWeek)}`;
  }, [currentWeek]);
  
  // Modal state objects to match the old API
  const reasonDialog = {
    isOpen: reasonDialogOpen,
    open: (data: {memberId: number; date: Date; value: '0.5' | 'X'}) => {
      setReasonDialogData({
        memberId: data.memberId,
        dateKey: data.date?.toISOString().split('T')[0] || '',
        value: data.value
      });
      setReasonDialogOpen(true);
    },
    close: () => {
      setReasonDialogOpen(false);
      setReasonDialogData(null);
    }
  };
  
  const viewReasons = {
    isOpen: viewReasonsOpen,
    open: () => setViewReasonsOpen(true),
    close: () => setViewReasonsOpen(false)
  };

  // Calculate current sprint dates using reliable sprint data handler
  const getCurrentSprintDates = () => {
    // Use the enhanced sprint data which guarantees valid data
    const sprintToUse = sprintDataResult.sprint || currentSprint;
    
    if (!sprintToUse) {
      // This should rarely happen with the new system, but provide fallback
      console.warn('No sprint data available from any source, using smart detection fallback');
      return getSmartSprintDates();
    }

    // Validate that current sprint contains today's date
    const today = new Date();
    const sprintStart = new Date(sprintToUse.sprint_start_date);
    const sprintEnd = new Date(sprintToUse.sprint_end_date);
    
    // Check if today falls within the sprint range
    if (today < sprintStart || today > sprintEnd) {
      console.warn(`🔄 Current date ${today.toDateString()} is outside sprint range ${sprintStart.toDateString()} - ${sprintEnd.toDateString()}, using smart detection`);
      return getSmartSprintDates();
    }
    
    // Navigate to different sprints based on offset
    const offsetStart = new Date(sprintStart);
    const offsetEnd = new Date(sprintEnd);
    const sprintLengthDays = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
    
    offsetStart.setDate(offsetStart.getDate() + (currentSprintOffset * sprintLengthDays));
    offsetEnd.setDate(offsetEnd.getDate() + (currentSprintOffset * sprintLengthDays));
    
    // Generate working days (Sun-Thu) within sprint period
    const sprintWorkingDays: Date[] = [];
    const currentDate = new Date(offsetStart);
    
    while (currentDate <= offsetEnd) {
      const dayOfWeek = currentDate.getDay();
      // Include Sunday(0) through Thursday(4) - Israeli work week
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        sprintWorkingDays.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return sprintWorkingDays;
  };

  // Smart sprint detection fallback
  const getSmartSprintDates = () => {
    // Smart sprint detection fallback triggered
    
    try {
      // Use the smart detection logic directly
      const firstSprintStartDate = new Date(DEFAULT_SPRINT_CONFIG.firstSprintStartDate); // Use centralized configuration
      const sprintLengthWeeks = DEFAULT_SPRINT_CONFIG.sprintLengthWeeks;
      const workingDaysPerWeek = DEFAULT_SPRINT_CONFIG.workingDaysPerWeek;
      const workingDaysPerSprint = sprintLengthWeeks * workingDaysPerWeek; // 10 working days
      
      const targetDate = new Date();
      
      // Smart sprint detection configuration
      
      // Calculate which sprint the target date falls into
      let currentSprintNumber = 1;
      let sprintStart = new Date(firstSprintStartDate);
      let sprintEnd = calculateSprintEndFromStart(sprintStart, workingDaysPerSprint);
      
      // Find the correct sprint by iterating through sprint boundaries
      while (targetDate > sprintEnd && currentSprintNumber < 20) { // Safety limit
        currentSprintNumber++;
        sprintStart = getNextSprintStart(sprintEnd);
        sprintEnd = calculateSprintEndFromStart(sprintStart, workingDaysPerSprint);
      }
      
      // Apply navigation offset if needed
      if (currentSprintOffset !== 0) {
        const offsetDays = currentSprintOffset * (DEFAULT_SPRINT_CONFIG.sprintLengthWeeks * 7);
        sprintStart.setDate(sprintStart.getDate() + offsetDays);
        sprintEnd.setDate(sprintEnd.getDate() + offsetDays);
      }
      
      // Generate working days (Sun-Thu) within sprint period
      const sprintWorkingDays: Date[] = [];
      const currentDate = new Date(sprintStart);
      
      while (currentDate <= sprintEnd) {
        const dayOfWeek = currentDate.getDay();
        // Include Sunday(0) through Thursday(4) - Israeli work week
        if (dayOfWeek >= 0 && dayOfWeek <= 4) {
          sprintWorkingDays.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      
      // Enhanced debugging for date calculation differences
      // Smart sprint calculation summary
      
      return sprintWorkingDays;
      
    } catch (error) {
      console.error('Smart sprint detection failed:', error);
      // Final fallback to current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (currentSprintOffset * 7));
      
      const sprintDays: Date[] = [];
      for (let i = 0; i <= 4; i++) { // Sun(0) to Thu(4)
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        sprintDays.push(date);
      }
      return sprintDays;
    }
  };

  // Helper functions for smart sprint calculation
  const calculateSprintEndFromStart = (sprintStart: Date, workingDaysInSprint: number): Date => {
    const current = new Date(sprintStart);
    let workingDaysAdded = 0;
    
    // Count the start date if it's a working day
    if (current.getDay() >= 0 && current.getDay() <= 4) {
      workingDaysAdded = 1;
    }
    
    // Add working days until we reach the target count
    while (workingDaysAdded < workingDaysInSprint) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        workingDaysAdded++;
      }
    }
    
    return current;
  };

  const getNextSprintStart = (previousSprintEnd: Date): Date => {
    const nextStart = new Date(previousSprintEnd);
    nextStart.setDate(previousSprintEnd.getDate() + 1);
    
    // Skip to next working day
    while (nextStart.getDay() === 5 || nextStart.getDay() === 6) {
      nextStart.setDate(nextStart.getDate() + 1);
    }
    
    return nextStart;
  };

  // Get dates based on navigation mode
  const getViewDates = () => {
    // Navigation state debug
    
    if (navigationMode === 'week') {
      // Use week navigation with currentWeek state
      const weekDates = getWeekDays(currentWeek);
      return weekDates;
    }
    
    if (viewMode === 'week') {
      // Legacy week mode support with sprint offset
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (currentSprintOffset * 7));
      
      const weekDays: Date[] = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        weekDays.push(date);
      }
      return weekDays;
    }
    
    // Default to sprint mode - FIXED: Always calculate fresh dates
    const calculatedSprintDates = getCurrentSprintDates();
    return calculatedSprintDates;
  };
  
  // Use sprint-appropriate dates
  const currentSprintDays = getViewDates();
  
  // Enhanced debugging for table rendering decisions
  // Table rendering decision matrix

  // SINGLE DATA SOURCE: Load ALL schedule data that covers both week and sprint views
  useEffect(() => {
    const loadAllScheduleData = async () => {
      setSchedulesLoading(true);
      setSchedulesError(null);
      
      try {
        setAuthError(false);
        setConnectionError(false);
        
        // Get FULL sprint date range to cover both week and sprint views
        const sprintDates = getCurrentSprintDates();
        
        // If we have valid sprint dates, use the full sprint range
        let startDate, endDate;
        if (sprintDates && sprintDates.length > 0) {
          startDate = sprintDates[0].toISOString().split('T')[0];
          endDate = sprintDates[sprintDates.length - 1].toISOString().split('T')[0];
        } else {
          // Fallback: use current week extended to cover potential sprint
          const today = new Date();
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay()); // Go to Sunday
          
          startDate = weekStart.toISOString().split('T')[0];
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 13); // Cover 2 weeks (full sprint)
          endDate = weekEnd.toISOString().split('T')[0];
        }
        
        console.log(`📊 SINGLE SOURCE: Loading data from ${startDate} to ${endDate} (covers both week & sprint views)`);
        
        // Fetch ALL data for the extended period ONCE
        const data = await DatabaseService.getScheduleEntries(startDate, endDate, selectedTeam.id);
        setScheduleData(data);
        
        // Set current dates for display
        const currentViewDates = getViewDates();
        setCurrentSprintDates(currentViewDates);
        
        // Reset retry count on success
        setRetryCount(0);
        console.log(`✅ SINGLE SOURCE: Loaded ${Object.keys(data).length} team member schedules for full period`);
        showSuccess('Schedule Loaded', 'Schedule data loaded successfully');
      } catch (error: any) {
        console.error('Error loading schedule data:', error);
        
        // Enhanced error handling for different types of failures
        if (error?.code === 'PGRST301' || error?.message?.includes('401') || error?.status === 401) {
          setAuthError(true);
          console.error('❌ Authentication error detected:', error.message);
          const errorMessage = 'Authentication failed - please refresh the page to reconnect';
          setSchedulesError(errorMessage);
          showError('Authentication Error', errorMessage);
        } else if (error?.message?.includes('NetworkError') || error?.message?.includes('fetch')) {
          setConnectionError(true);
          console.error('❌ Network connection error:', error.message);
          const errorMessage = 'Network connection failed - please check your internet connection';
          setSchedulesError(errorMessage);
          showError('Connection Error', errorMessage);
          
          // Auto-retry for network errors (up to 3 times)
          if (retryCount < 3) {
            console.log(`⏳ Auto-retrying in 2 seconds... (attempt ${retryCount + 1}/3)`);
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              loadAllScheduleData();
            }, 2000 * (retryCount + 1)); // Exponential backoff
            return;
          }
        } else {
          console.error('❌ General error loading schedule data:', error);
          const errorMessage = `Failed to load schedule data: ${error instanceof Error ? error.message : 'Unknown error'}`;
          setSchedulesError(errorMessage);
          showError('Load Error', errorMessage);
        }
        
        // Fallback to empty state for all error types
        setScheduleData({});
      } finally {
        setSchedulesLoading(false);
      }
    };

    if (isMountedRef.current) {
      loadAllScheduleData();
    }
  }, [
    selectedTeam.id,
    sprintDataResult.sprint?.current_sprint_number || currentSprint?.current_sprint_number,
    sprintDataResult.sprint?.sprint_start_date || currentSprint?.sprint_start_date,
    sprintDataResult.sprint?.sprint_end_date || currentSprint?.sprint_end_date
  ]);
  
  // PERFORMANCE FIX: Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  // Set up real-time subscription for the FULL date range (covers both views)
  useEffect(() => {
    // Get FULL sprint date range to cover both week and sprint views
    const sprintDates = getCurrentSprintDates();
    
    // Use the same date range logic as the data loading effect
    let startDate, endDate;
    if (sprintDates && sprintDates.length > 0) {
      startDate = sprintDates[0].toISOString().split('T')[0];
      endDate = sprintDates[sprintDates.length - 1].toISOString().split('T')[0];
    } else {
      // Fallback: use current week extended to cover potential sprint
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Go to Sunday
      
      startDate = weekStart.toISOString().split('T')[0];
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 13); // Cover 2 weeks (full sprint)
      endDate = weekEnd.toISOString().split('T')[0];
    }
    
    console.log(`🔄 REALTIME: Subscribing to changes from ${startDate} to ${endDate} (covers both views)`);
    
    const subscription = DatabaseService.subscribeToScheduleChanges(
      startDate,
      endDate,
      selectedTeam.id,
      (payload) => {
        // Add additional throttling at component level to prevent UI flooding
        const now = Date.now();
        const lastReload = (subscription as any).lastReload || 0;
        if (now - lastReload < 2000) { // Minimum 2 seconds between reloads
          console.log('🔄 REALTIME: Throttling reload - too frequent updates');
          return;
        }
        
        // Reload data when changes occur - using same full range
        const reloadScheduleData = async () => {
          try {
            (subscription as any).lastReload = Date.now();
            console.log('🔄 REALTIME: Processing subscription update:', (payload as any)?.eventType);
            
            const data = await DatabaseService.getScheduleEntries(startDate, endDate, selectedTeam.id);
            if (isMountedRef.current) {
              setScheduleData(data);
              console.log('🔄 REALTIME: Data refresh successful for full range');
            }
          } catch (error: any) {
            console.error('Error reloading schedule data from realtime:', error);
            if (isMountedRef.current) {
              if (error?.code === 'PGRST301' || error?.message?.includes('401')) {
                setAuthError(true);
                setConnectionError(false);
              } else {
                setConnectionError(true);
              }
            }
          }
        };
        
        // Debounce the reload to prevent excessive calls
        if ((subscription as any).reloadTimer) {
          clearTimeout((subscription as any).reloadTimer);
        }
        (subscription as any).reloadTimer = setTimeout(reloadScheduleData, 300);
      },
      {
        throttleMs: 1000, // 1 second throttling at subscription level
        debounceMs: 200   // 200ms debouncing
      }
    );

    return () => {
      // Clear any pending reload timer
      if ((subscription as any).reloadTimer) {
        clearTimeout((subscription as any).reloadTimer);
      }
      subscription.unsubscribe();
    };
  }, [
    // FIXED: Same reduced dependencies as data loading effect
    selectedTeam.id,
    // Use enhanced sprint data as primary source
    sprintDataResult.sprint?.current_sprint_number || currentSprint?.current_sprint_number,
    sprintDataResult.sprint?.sprint_start_date || currentSprint?.sprint_start_date,
    sprintDataResult.sprint?.sprint_end_date || currentSprint?.sprint_end_date
  ]); // Realtime subscription matches data loading scope

  // Type-safe date formatting helper
  const formatDate = (date: Date | undefined): string => {
    // Enhanced null/undefined safety checks with type safety
    if (!date) {
      console.warn('formatDate called with undefined date');
      return 'Invalid Date';
    }
    
    // Ensure it's a valid Date object with proper type checking
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('formatDate called with invalid date:', date);
      return 'Invalid Date';
    }
    
    try {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', date);
      return 'Invalid Date';
    }
  };

  // Type-safe date validation helper
  const isValidDate = (date: any): date is Date => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  const getCurrentSprintString = () => {
    // Enhanced fallback logic: Use reliable sprint data handler
    if (!currentSprintDays || currentSprintDays.length === 0) {
      // IMPROVED: Use enhanced sprint data with guaranteed fallback
      try {
        // First priority: Use enhanced sprint data (guaranteed to be available)
        const sprintToUse = sprintDataResult.sprint || currentSprint;
        if (sprintToUse) {
          const sprintStart = new Date(sprintToUse.sprint_start_date);
          const sprintEnd = new Date(sprintToUse.sprint_end_date);
          const today = new Date();
          
          // Validate that current date falls within sprint range
          if (today >= sprintStart && today <= sprintEnd) {
            return `Sprint ${sprintToUse.current_sprint_number} (${formatDate(sprintStart)} - ${formatDate(sprintEnd)})`;
          }
        }
        
        // Second priority: Use smart sprint detection for accurate fallback
        const smartSprintDates = getCurrentSprintDates();
        if (smartSprintDates && smartSprintDates.length > 0) {
          const startDate = smartSprintDates[0];
          const endDate = smartSprintDates[smartSprintDates.length - 1];
          
          // Determine sprint number from enhanced sprint data or database
          const sprintNumber = sprintDataResult.sprint?.current_sprint_number || currentSprint?.current_sprint_number || 
            Math.floor((Date.now() - DEFAULT_SPRINT_CONFIG.firstSprintStartDate.getTime()) / (1000 * 60 * 60 * 24 * DEFAULT_SPRINT_CONFIG.sprintLengthWeeks * 7)) + 1;
          
          return `Sprint ${sprintNumber} (${formatDate(startDate)} - ${formatDate(endDate)})`;
        }
        
        // Final fallback: Current date with estimated sprint number
        const today = new Date();
        const sprintNumber = sprintDataResult.sprint?.current_sprint_number || currentSprint?.current_sprint_number || 
          Math.floor((Date.now() - DEFAULT_SPRINT_CONFIG.firstSprintStartDate.getTime()) / (1000 * 60 * 60 * 24 * DEFAULT_SPRINT_CONFIG.sprintLengthWeeks * 7)) + 1;
        
        return `Sprint ${sprintNumber} (${formatDate(today)})`;
        
      } catch (error) {
        // Graceful error handling: provide minimal but functional sprint string
        console.warn('Error in getCurrentSprintString fallback logic:', error);
        const today = new Date();
        return `Current Sprint (${formatDate(today)})`;
      }
    }
    
    // Normal operation: currentSprintDays is available
    const startDate = currentSprintDays[0];
    const endDate = currentSprintDays[currentSprintDays.length - 1];
    
    const sprintToUse = sprintDataResult.sprint || currentSprint;
    const sprintLabel = sprintToUse ? 
      `Sprint ${sprintToUse.current_sprint_number}` : 
      'Current Sprint';
    
    return `${sprintLabel} (${formatDate(startDate)} - ${formatDate(endDate)})`;
  };

  // PERFORMANCE FIX: Memoized date utility functions
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  const isPastDate = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  }, []);


  // PERFORMANCE FIX: Memoized and optimized schedule update function
  const updateSchedule = useCallback(async (memberId: number, date: Date, value: string | null, reason?: string) => {
    if (!isMountedRef.current || (!currentUser.isManager && memberId !== currentUser.id)) return;

    const dateKey = date.toISOString().split('T')[0];
    if (!dateKey) return;
    
    try {
      // Update UI immediately with optimistic update
      updateScheduleEntry(memberId, date, value, reason);
      
      // Then sync with server
      await DatabaseService.updateScheduleEntry(
        memberId,
        dateKey,
        value as '1' | '0.5' | 'X' | null,
        reason
      );
      
      if (isMountedRef.current) {
        showSuccess('Schedule Updated', 'Schedule entry updated successfully');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      if (isMountedRef.current) {
        showError('Update Error', 'Failed to update schedule entry');
      }
    }
  }, [currentUser.isManager, currentUser.id, updateScheduleEntry, showSuccess, showError]);

  // PERFORMANCE FIX: Memoized click handler to prevent child re-renders
  const handleWorkOptionClick = useCallback((memberId: number, date: Date, value: string, reason?: string) => {
    // Only allow users to edit their own schedule (unless they're a manager)
    if (!currentUser.isManager && memberId !== currentUser.id) return;

    const dateKey = date.toISOString().split('T')[0];
    const currentValue = dateKey ? scheduleData[memberId]?.[dateKey]?.value : undefined;
    
    // If clicking the same value, deselect it
    if (currentValue === value && !reason) {
      updateSchedule(memberId, date, null);
      return;
    }
    
    // If reason is provided, update directly (from mobile bottom sheet)
    if (reason) {
      updateSchedule(memberId, date, value, reason);
      return;
    }
    
    // If selecting 0.5 or X, show reason dialog (desktop behavior)
    if (value === '0.5' || value === 'X') {
      reasonDialog.open({ memberId, date, value: value as '0.5' | 'X' });
    } else {
      // For value '1', update directly
      updateSchedule(memberId, date, value);
    }
  }, [currentUser.isManager, currentUser.id, scheduleData, updateSchedule, reasonDialog]);

  const handleReasonSave = (reason: string) => {
    if (reasonDialogData) {
      const date = new Date(reasonDialogData.dateKey);
      updateSchedule(reasonDialogData.memberId, date, reasonDialogData.value, reason);
    }
    reasonDialog.close();
  };

  const handleReasonRequired = (memberId: number, date: Date, value: '0.5' | 'X') => {
    reasonDialog.open({ memberId, date, value });
  };

  const handleQuickReasonSelect = (memberId: number, date: Date, value: '0.5' | 'X', reason: string) => {
    // Directly update the schedule with the quick reason, bypassing the dialog
    updateSchedule(memberId, date, value, reason);
  };

  const handleFullSprintSet = async (memberId: number) => {
    const confirmMessage = currentUser.isManager && memberId !== currentUser.id 
      ? `Set full sprint (all working days) for ${teamMembers.find(m => m.id === memberId)?.name}?`
      : 'Set your full sprint to all working days?';
      
    if (!confirm(confirmMessage)) return;

    try {
      // Set each sprint working day to full working day
      for (const date of currentSprintDays) {
        await updateSchedule(memberId, date, '1');
      }
    } catch (error) {
      console.error('Error setting full sprint:', error);
    }
  };

  // PERFORMANCE FIX: Memoized hours calculations to prevent recalculation on every render
  const calculateSprintHours = useCallback((memberId: number) => {
    let totalHours = 0;
    const memberData = scheduleData[memberId] || {};

    currentSprintDays.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const value = dateKey ? memberData[dateKey] : undefined;
      const option = workOptions.find(opt => opt.value === value?.value);
      if (option) {
        totalHours += option.hours;
      }
    });
    return totalHours;
  }, [scheduleData, currentSprintDays]);

  const getTeamTotalHours = useCallback(() => {
    return teamMembers.reduce((total, member) => total + calculateSprintHours(member.id), 0);
  }, [teamMembers, calculateSprintHours]);

  const handleMembersUpdated = () => {
    // Trigger a refresh using centralized state
    refreshSchedules();
  };



  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Authentication error display with user-friendly actions
  if (authError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Authentication Error</h3>
          <p className="text-red-700 mb-6">
            Unable to access schedule data due to authentication issues. Please refresh the page or check your connection.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                setAuthError(false);
                setConnectionError(false);
                setRetryCount(0);
                // Retry loading manually
                setLoading(true);
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connection error display with retry capability
  if (connectionError && !authError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Connection Error</h3>
          <p className="text-orange-700 mb-4">
            Network connection failed. Please check your internet connection and try again.
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-orange-600 mb-4">
              Retry attempt {retryCount}/3 failed. Manual retry available.
            </p>
          )}
          <button
            onClick={() => {
              setConnectionError(false);
              setRetryCount(0);
              window.location.reload();
            }}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // PERFORMANCE FIX: Memoized team summary props to prevent unnecessary re-renders
  const teamSummaryProps = useMemo(() => ({
    team: selectedTeam,
    currentSprint: sprintDataResult.sprint || currentSprint,
    teamMembers,
    className: "mb-2"
  }), [selectedTeam, sprintDataResult.sprint, currentSprint, teamMembers]);
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Mobile Team Summary - Only for Managers */}
      {currentUser.isManager && (
        <div className="md:hidden">
          <TeamSummaryOverview {...teamSummaryProps} />
        </div>
      )}


      {/* Mobile View - Keep existing mobile implementation */}
      <MobileScheduleView
        currentUser={currentUser}
        teamMembers={teamMembers}
        selectedTeam={selectedTeam}
        scheduleData={scheduleData}
        workOptions={workOptions}
        weekDays={currentSprintDays}
        currentWeekOffset={currentSprintOffset}
        loading={loading}
        onWeekChange={(offset) => {
          setCurrentSprintOffset(offset);
        }}
        onWorkOptionClick={handleWorkOptionClick}
        onFullWeekSet={handleFullSprintSet}
        onViewReasons={() => viewReasons.open()}
        isToday={isToday}
        isPastDate={isPastDate}
        getCurrentSprintString={getCurrentSprintString}
        getTeamTotalHours={getTeamTotalHours}
      />

      {/* Navigation and Table Layout - Show on tablets and up */}
      <div className="hidden md:flex md:flex-col flex-1 pt-6 pb-6">
        {/* Compact Header Bar - Desktop only, sticky */}
        <CompactHeaderBar
          currentUser={currentUser}
          selectedTeam={selectedTeam}
          teamMembers={teamMembers}
          scheduleData={scheduleData}
          currentSprintOffset={currentSprintOffset}
          currentSprintDays={currentSprintDays}
          onSprintChange={(offset) => {
            setCurrentSprintOffset(offset);
            console.log(`📅 NAVIGATION: Sprint offset changed to ${offset} (display only, no refetch)`);
            // NO data refetch - data is already loaded for full range
          }}
          onViewReasons={() => viewReasons.open()}
          getCurrentSprintString={getCurrentSprintString}
          getTeamTotalHours={getTeamTotalHours}
          navigationMode={navigationMode}
          onNavigationModeChange={(mode) => {
            setNavigationMode(mode);
          }}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
          onCurrentWeek={goToCurrentWeek}
          getCurrentWeekString={getCurrentWeekString}
        />

        {/* Team Summary Overview - Only for Managers */}
        {currentUser.isManager && (
          <TeamSummaryOverview
            {...teamSummaryProps}
            className="mt-0"
          />
        )}


        {/* Quick Actions Bar - Quick actions */}
        <QuickActionsBar
          currentUser={currentUser}
          selectedTeam={selectedTeam}
          onFullWeekSet={handleFullSprintSet}
        />

        {/* Enhanced Availability Table - Main focus, immediately visible with proper spacing */}
        <div className="flex-1 overflow-hidden mt-2">
          <EnhancedAvailabilityTable
          currentUser={currentUser}
          teamMembers={teamMembers}
          scheduleData={scheduleData}
          workOptions={workOptions}
          sprintDays={currentSprintDays}
          selectedTeam={selectedTeam}
          onWorkOptionClick={handleWorkOptionClick}
          onReasonRequired={handleReasonRequired}
          onQuickReasonSelect={handleQuickReasonSelect}
          onFullSprintSet={handleFullSprintSet}
          calculateSprintHours={calculateSprintHours}
          getTeamTotalHours={getTeamTotalHours}
          isToday={isToday}
          isPastDate={isPastDate}
          formatDate={formatDate}
        />
        </div>

        {/* Quick Guide - Compact version */}
        <div className="bg-blue-50 rounded-lg p-3 border-t-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs text-blue-800">
              <span>• <strong>1</strong> = Full day (7h)</span>
              <span>• <strong>0.5</strong> = Half day (3.5h)</span>
              <span>• <strong>X</strong> = Sick/Out (0h)</span>
              <span>• Click for Hebrew quick reasons • לחץ לסיבות מהירות בעברית</span>
            </div>
            <div className="text-xs text-blue-600">
              Real-time sync • סנכרון בזמן אמת
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Management Sections - Auto-collapsed to save space */}
      <div className="space-y-4 mt-4">
        {/* Team Member Management - Managers Only */}
        {currentUser.isManager && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 p-3">
              <h3 className="font-medium text-gray-900">Team Management</h3>
            </div>
            <div className="p-4">
              <TeamMemberManagement 
                currentUser={currentUser}
                selectedTeam={selectedTeam}
                onMembersUpdated={handleMembersUpdated}
              />
            </div>
          </div>
        )}


        {/* RECOGNITION FEATURES TEMPORARILY DISABLED FOR PRODUCTION
        Recognition Dashboard
        <div className="bg-white rounded-lg border border-gray-200">
          <RecognitionDashboard
            userId={currentUser.id}
            timeframe="week"
            className=""
          />
        </div>
        */}

        {/* RECOGNITION FEATURES TEMPORARILY DISABLED FOR PRODUCTION
        Team Recognition Leaderboard - Managers Only
        {currentUser.isManager && (
          <div className="bg-white rounded-lg border border-gray-200">
            <TeamRecognitionLeaderboard
              teamId={selectedTeam.id}
              timeframe="week"
              limit={5}
              showTeamStats={true}
              className=""
            />
          </div>
        )}
        */}

        {/* Team Hours Status - Collapsed */}
        {(sprintDataResult.sprint || currentSprint) && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 p-3">
              <h3 className="font-medium text-gray-900">Sprint Hours Status</h3>
            </div>
            <div className="p-4">
              <TeamHoursStatus 
                selectedTeam={selectedTeam}
                currentSprint={sprintDataResult.sprint || currentSprint}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ReasonDialog
        isOpen={reasonDialog.isOpen}
        onClose={() => reasonDialog.close()}
        onSave={handleReasonSave}
        data={reasonDialogData}
      />
      
      <ViewReasonsModal
        isOpen={viewReasons.isOpen}
        onClose={() => viewReasons.close()}
        scheduleData={scheduleData}
        teamMembers={teamMembers}
        weekDays={currentSprintDays}
      />
    </div>
  );
});

export default ScheduleTable;