'use client';

import { useEffect, useState } from 'react';
// import { } from 'lucide-react'; // No icons used directly in this component
import { TeamMember, Team, WorkOption, ReasonDialogData } from '@/types';
import ReasonDialog from './ReasonDialog';
import ViewReasonsModal from './ViewReasonsModal';
import MobileScheduleView from './MobileScheduleView';
// import EnhancedManagerExportButton from './EnhancedManagerExportButton'; // Used in CompactHeaderBar
import TeamMemberManagement from './TeamMemberManagement';
import TeamHoursStatus from './TeamHoursStatus';
import CompactHeaderBar from './CompactHeaderBar';
import QuickActionsBar from './QuickActionsBar';
import EnhancedAvailabilityTable from './EnhancedAvailabilityTable';
import TeamSummaryOverview from './TeamSummaryOverview';
import ClientOnly from './ClientOnly';
// import { canManageSprints } from '@/utils/permissions'; // Used in CompactHeaderBar
import { DatabaseService } from '@/lib/database';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';

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

export default function ScheduleTable({ currentUser, teamMembers, selectedTeam, viewMode = 'week', sprintDates }: ScheduleTableProps) {
  // Local state management (temporarily replacing centralized state)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<any>({});
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
    console.log('🔄 Initial currentWeek set to:', startOfWeek.toDateString());
    return startOfWeek;
  });
  const [navigationMode, setNavigationMode] = useState<'sprint' | 'week'>('week'); // 🔧 CHANGED: Default to week mode for testing
  
  // Sprint data from GlobalSprintContext
  const { currentSprint } = useGlobalSprint();
  
  // Helper functions for notifications
  const showError = (title: string, message: string) => {
    console.error(`${title}: ${message}`);
    setError(message);
  };
  const showSuccess = (title: string, message: string) => {
    console.log(`${title}: ${message}`);
  };
  
  // Helper functions for state updates
  const setSchedulesLoading = setLoading;
  const setSchedulesError = setError;
  const updateScheduleEntry = (memberId: number, date: Date, value: string | null, reason?: string) => {
    const dateKey = date.toISOString().split('T')[0];
    if (!dateKey) return;
    
    setScheduleData((prev: any) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [dateKey]: { value, reason }
      }
    }));
  };
  
  // Mock refresh function
  const refreshSchedules = () => {
    console.log('Refreshing schedules...');
  };

  // Week navigation functions
  const goToPreviousWeek = () => {
    console.log('🔄 goToPreviousWeek called, current week:', currentWeek.toDateString());
    setLoading(true); // Add visual feedback
    setCurrentWeek(prev => {
      const newWeek = new Date(prev);
      newWeek.setDate(prev.getDate() - 7);
      console.log('✅ Previous week navigation - NEW week:', newWeek.toDateString());
      return newWeek;
    });
    // Clear loading state after a brief delay to ensure data reloads
    setTimeout(() => setLoading(false), 1000);
  };

  const goToNextWeek = () => {
    console.log('🔄 goToNextWeek called, current week:', currentWeek.toDateString());
    setLoading(true); // Add visual feedback
    setCurrentWeek(prev => {
      const newWeek = new Date(prev);
      newWeek.setDate(prev.getDate() + 7);
      console.log('✅ Next week navigation - NEW week:', newWeek.toDateString());
      return newWeek;
    });
    // Clear loading state after a brief delay to ensure data reloads
    setTimeout(() => setLoading(false), 1000);
  };

  const goToCurrentWeek = () => {
    console.log('🔄 goToCurrentWeek called, current week:', currentWeek.toDateString());
    setLoading(true); // Add visual feedback
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    setCurrentWeek(startOfWeek);
    console.log('✅ Go to current week - NEW week:', startOfWeek.toDateString());
    // Clear loading state after a brief delay to ensure data reloads
    setTimeout(() => setLoading(false), 1000);
  };

  // Generate week days for current week
  const getWeekDays = (startDate: Date): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 5; i++) { // Sunday to Thursday
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get current week string for display
  const getCurrentWeekString = (): string => {
    const endOfWeek = new Date(currentWeek);
    endOfWeek.setDate(currentWeek.getDate() + 4); // Thursday
    
    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    };
    
    const weekString = `${formatDate(currentWeek)} - ${formatDate(endOfWeek)}`;
    console.log('📅 getCurrentWeekString called, currentWeek:', currentWeek.toDateString(), 'returning:', weekString);
    return weekString;
  };
  
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

  // Calculate current sprint dates (Sun-Thu working days)
  const getCurrentSprintDates = () => {
    if (!currentSprint) {
      // Fallback to smart sprint detection if no sprint data available
      console.warn('No current sprint data available, using smart detection fallback');
      return getSmartSprintDates();
    }

    // Validate that current sprint contains today's date
    const today = new Date();
    const sprintStart = new Date(currentSprint.sprint_start_date);
    const sprintEnd = new Date(currentSprint.sprint_end_date);
    
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
    try {
      // Use the smart detection logic directly
      const firstSprintStartDate = new Date('2025-07-27'); // Sprint 1 started July 27
      const sprintLengthWeeks = 2;
      const workingDaysPerWeek = 5;
      const workingDaysPerSprint = sprintLengthWeeks * workingDaysPerWeek; // 10 working days
      
      const targetDate = new Date();
      
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
        const offsetDays = currentSprintOffset * (sprintLengthWeeks * 7);
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
      
      console.log(`✅ Smart detection: Sprint ${currentSprintNumber} (${sprintStart.toDateString()} - ${sprintEnd.toDateString()}) - ${sprintWorkingDays.length} working days`);
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
    console.log('📅 getViewDates called - navigationMode:', navigationMode, 'viewMode:', viewMode);
    
    if (navigationMode === 'week') {
      // Use week navigation with currentWeek state
      const weekDates = getWeekDays(currentWeek);
      console.log('📅 Week mode dates:', weekDates.map(d => d.toDateString()));
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
      console.log('📅 Legacy week mode dates:', weekDays.map(d => d.toDateString()));
      return weekDays;
    }
    
    // Default to sprint mode - FIXED: Always calculate fresh dates
    const sprintDates = getCurrentSprintDates();
    console.log('📅 Sprint mode dates:', sprintDates.map(d => d.toDateString()));
    return sprintDates;
  };
  
  // Use sprint-appropriate dates
  const currentSprintDays = getViewDates();

  // Load schedule data from database
  useEffect(() => {
    const loadScheduleData = async () => {
      setSchedulesLoading(true);
      setSchedulesError(null);
      
      const viewDates = getViewDates();
      console.log('🔄 Loading schedule data for dates:', viewDates.map(d => d.toDateString()));
      
      if (viewDates.length === 0) {
        console.warn('No view dates available');
        setSchedulesLoading(false);
        return;
      }
      const startDate = viewDates[0]?.toISOString().split('T')[0];
      const endDate = viewDates[viewDates.length - 1]?.toISOString().split('T')[0];
      
      if (!startDate || !endDate) {
        console.warn('Invalid start or end date');
        setSchedulesLoading(false);
        return;
      }
      
      console.log('📡 Fetching schedule data from', startDate, 'to', endDate, 'for team', selectedTeam.id);
      
      try {
        const data = await DatabaseService.getScheduleEntries(startDate, endDate, selectedTeam.id);
        setScheduleData(data);
        setCurrentSprintDates(viewDates);
        // REMOVED: setSprintDays(viewDates) - eliminated circular dependency
        
        console.log('✅ Schedule data loaded successfully:', Object.keys(data).length, 'member entries');
        showSuccess('Schedule Loaded', 'Schedule data loaded successfully');
      } catch (error) {
        console.error('Error loading schedule data:', error);
        const errorMessage = `Failed to load schedule data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        setSchedulesError(errorMessage);
        showError('Load Error', errorMessage);
        // Fallback to empty state
        setScheduleData({});
      } finally {
        setSchedulesLoading(false);
      }
    };

    loadScheduleData();
  }, [
    // CRITICAL FIX: Include all navigation state that affects date calculation
    currentSprintOffset, 
    currentWeek, 
    navigationMode, 
    selectedTeam.id, 
    viewMode, 
    sprintDates,
    // FIXED: Add currentSprint dependency since it affects date calculation in getCurrentSprintDates()
    currentSprint?.current_sprint_number,
    currentSprint?.sprint_start_date,
    currentSprint?.sprint_end_date
  ]); // Enhanced dependency array to ensure data reloads on all navigation changes

  // Set up real-time subscription
  useEffect(() => {
    const viewDates = getViewDates();
    if (viewDates.length === 0) return;
    
    const startDate = viewDates[0]?.toISOString().split('T')[0];
    const endDate = viewDates[viewDates.length - 1]?.toISOString().split('T')[0];
    
    if (!startDate || !endDate) return;
    
    console.log('🔔 Setting up real-time subscription for', startDate, 'to', endDate);
    
    const subscription = DatabaseService.subscribeToScheduleChanges(
      startDate,
      endDate,
      selectedTeam.id,
      () => {
        // Reload data when changes occur
        console.log('🔔 Real-time update received, reloading data');
        const loadScheduleData = async () => {
          try {
            const data = await DatabaseService.getScheduleEntries(startDate, endDate, selectedTeam.id);
            setScheduleData(data);
            console.log('✅ Real-time data reload successful');
          } catch (error) {
            console.error('Error reloading schedule data:', error);
          }
        };
        loadScheduleData();
      }
    );

    return () => {
      console.log('🔔 Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, [
    // CRITICAL FIX: Same enhanced dependency array as data loading useEffect
    currentSprintOffset, 
    currentWeek, 
    navigationMode, 
    selectedTeam.id, 
    viewMode, 
    sprintDates,
    // FIXED: Add currentSprint dependency to match data loading effect
    currentSprint?.current_sprint_number,
    currentSprint?.sprint_start_date,
    currentSprint?.sprint_end_date
  ]);

  const formatDate = (date: Date | undefined) => {
    // ✅ Add null/undefined safety checks
    if (!date) {
      console.warn('formatDate called with undefined date');
      return 'Invalid Date';
    }
    
    // ✅ Ensure it's a valid Date object
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

  const getCurrentSprintString = () => {
    // Enhanced fallback logic: Use smart sprint detection when currentSprintDays is empty
    if (!currentSprintDays || currentSprintDays.length === 0) {
      // IMPROVED: Use smart sprint detection instead of warnings
      try {
        // First priority: Use database sprint if available and valid
        if (currentSprint) {
          const sprintStart = new Date(currentSprint.sprint_start_date);
          const sprintEnd = new Date(currentSprint.sprint_end_date);
          const today = new Date();
          
          // Validate that current date falls within database sprint range
          if (today >= sprintStart && today <= sprintEnd) {
            return `Sprint ${currentSprint.current_sprint_number} (${formatDate(sprintStart)} - ${formatDate(sprintEnd)})`;
          }
        }
        
        // Second priority: Use smart sprint detection for accurate fallback
        const smartSprintDates = getCurrentSprintDates();
        if (smartSprintDates && smartSprintDates.length > 0) {
          const startDate = smartSprintDates[0];
          const endDate = smartSprintDates[smartSprintDates.length - 1];
          
          // Determine sprint number from smart detection or database
          const sprintNumber = currentSprint?.current_sprint_number || 
            Math.floor((Date.now() - new Date('2025-08-10').getTime()) / (1000 * 60 * 60 * 24 * 14)) + 1;
          
          return `Sprint ${sprintNumber} (${formatDate(startDate)} - ${formatDate(endDate)})`;
        }
        
        // Final fallback: Current date with estimated sprint number
        const today = new Date();
        const sprintNumber = currentSprint?.current_sprint_number || 
          Math.floor((Date.now() - new Date('2025-08-10').getTime()) / (1000 * 60 * 60 * 24 * 14)) + 1;
        
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
    
    const sprintLabel = currentSprint ? 
      `Sprint ${currentSprint.current_sprint_number}` : 
      'Current Sprint';
    
    return `${sprintLabel} (${formatDate(startDate)} - ${formatDate(endDate)})`;
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


  const updateSchedule = async (memberId: number, date: Date, value: string | null, reason?: string) => {
    // Only allow users to edit their own schedule (unless they're a manager)
    if (!currentUser.isManager && memberId !== currentUser.id) return;

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
      
      // Update centralized state
      updateScheduleEntry(memberId, date, value, reason);
      
      showSuccess('Schedule Updated', 'Schedule entry updated successfully');
    } catch (error) {
      console.error('Error updating schedule:', error);
      showError('Update Error', 'Failed to update schedule entry');
    }
  };

  const handleWorkOptionClick = (memberId: number, date: Date, value: string, reason?: string) => {
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
  };

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

  const calculateSprintHours = (memberId: number) => {
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
  };

  const getTeamTotalHours = () => {
    return teamMembers.reduce((total, member) => total + calculateSprintHours(member.id), 0);
  };

  const handleMembersUpdated = () => {
    // Trigger a refresh using centralized state
    refreshSchedules();
  };



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

  return (
    <div className="space-y-0">
      {/* Mobile Team Summary - Only for Managers */}
      {currentUser.isManager && (
        <div className="lg:hidden">
          <TeamSummaryOverview
            team={selectedTeam}
            currentSprint={currentSprint}
            teamMembers={teamMembers}
            className="mb-4"
          />
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
          console.log('Sprint change:', offset);
        }}
        onWorkOptionClick={handleWorkOptionClick}
        onFullWeekSet={handleFullSprintSet}
        onViewReasons={() => viewReasons.open()}
        isToday={isToday}
        isPastDate={isPastDate}
        getCurrentSprintString={getCurrentSprintString}
        getTeamTotalHours={getTeamTotalHours}
      />

      {/* Navigation and Table Layout - Desktop only */}
      <div className="hidden lg:block space-y-0">
        {/* Compact Header Bar - Desktop only, sticky */}
        <CompactHeaderBar
          currentUser={currentUser}
          selectedTeam={selectedTeam}
          teamMembers={teamMembers}
          scheduleData={scheduleData}
          currentSprintOffset={currentSprintOffset}
          currentSprintDays={currentSprintDays}
          onSprintChange={(offset) => {
            console.log('🔄 Sprint change requested - current offset:', currentSprintOffset, 'new offset:', offset);
            setLoading(true); // Add visual feedback
            setCurrentSprintOffset(offset);
            console.log('✅ Sprint changed to offset:', offset);
            // Clear loading state after a brief delay to ensure data reloads
            setTimeout(() => setLoading(false), 1000);
          }}
          onViewReasons={() => viewReasons.open()}
          getCurrentSprintString={getCurrentSprintString}
          getTeamTotalHours={getTeamTotalHours}
          navigationMode={navigationMode}
          onNavigationModeChange={(mode) => {
            console.log('🔄 Navigation mode change requested - current mode:', navigationMode, 'new mode:', mode);
            setNavigationMode(mode);
            console.log('✅ Navigation mode changed to:', mode);
          }}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
          onCurrentWeek={goToCurrentWeek}
          getCurrentWeekString={getCurrentWeekString}
        />

        {/* Team Summary Overview - Only for Managers */}
        {currentUser.isManager && (
          <TeamSummaryOverview
            team={selectedTeam}
            currentSprint={currentSprint}
            teamMembers={teamMembers}
            className="mt-0"
          />
        )}


        {/* Quick Actions Bar - Quick actions */}
        <QuickActionsBar
          currentUser={currentUser}
          selectedTeam={selectedTeam}
          onFullWeekSet={handleFullSprintSet}
        />

        {/* Enhanced Availability Table - Main focus, immediately visible */}
        <EnhancedAvailabilityTable
          currentUser={currentUser}
          teamMembers={teamMembers}
          scheduleData={scheduleData}
          workOptions={workOptions}
          sprintDays={currentSprintDays}
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
      <div className="space-y-4 mt-6">
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
        {currentSprint && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 p-3">
              <h3 className="font-medium text-gray-900">Sprint Hours Status</h3>
            </div>
            <div className="p-4">
              <TeamHoursStatus 
                selectedTeam={selectedTeam}
                currentSprint={currentSprint}
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
}