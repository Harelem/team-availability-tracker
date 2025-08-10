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
  const [sprintDays, setSprintDays] = useState<Date[]>([]);
  
  // Modal state
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonDialogData, setReasonDialogData] = useState<{memberId: number; date: Date; value: '0.5' | 'X'} | null>(null);
  const [viewReasonsOpen, setViewReasonsOpen] = useState(false);
  
  // Navigation state 
  const [currentSprintOffset, setCurrentSprintOffset] = useState(0);
  
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
  
  // Modal state objects to match the old API
  const reasonDialog = {
    isOpen: reasonDialogOpen,
    open: (data: {memberId: number; date: Date; value: '0.5' | 'X'}) => {
      setReasonDialogData(data);
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
      // Fallback to current week if no sprint data
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (currentSprintOffset * 7));
      
      const sprintDays = [];
      for (let i = 0; i <= 4; i++) { // Sun(0) to Thu(4)
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        sprintDays.push(date);
      }
      return sprintDays;
    }

    // Use sprint dates from GlobalSprintContext
    const sprintStart = new Date(currentSprint.sprint_start_date);
    const sprintEnd = new Date(currentSprint.sprint_end_date);
    
    // Navigate to different sprints based on offset
    const offsetStart = new Date(sprintStart);
    const offsetEnd = new Date(sprintEnd);
    const sprintLengthDays = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
    
    offsetStart.setDate(offsetStart.getDate() + (currentSprintOffset * sprintLengthDays));
    offsetEnd.setDate(offsetEnd.getDate() + (currentSprintOffset * sprintLengthDays));
    
    // Generate working days (Sun-Thu) within sprint period
    const sprintWorkingDays = [];
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

  // Get dates based on view mode (now defaulting to sprint)
  const getViewDates = () => {
    if (viewMode === 'week') {
      // Legacy week mode support
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (currentSprintOffset * 7));
      
      const weekDays = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        weekDays.push(date);
      }
      return weekDays;
    }
    
    // Default to sprint mode
    return sprintDays.length > 0 ? sprintDays : getCurrentSprintDates();
  };
  
  // Use sprint-appropriate dates
  const currentSprintDays = getViewDates();

  // Load schedule data from database
  useEffect(() => {
    const loadScheduleData = async () => {
      setSchedulesLoading(true);
      setSchedulesError(null);
      
      const viewDates = getViewDates();
      const startDate = viewDates[0].toISOString().split('T')[0];
      const endDate = viewDates[viewDates.length - 1].toISOString().split('T')[0];
      
      try {
        const data = await DatabaseService.getScheduleEntries(startDate, endDate, selectedTeam.id);
        setScheduleData(data);
        setCurrentSprintDates(viewDates);
        setSprintDays(viewDates);
        
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
  }, [currentSprintOffset, selectedTeam.id, viewMode, sprintDates]); // Include view mode and sprint dates

  // Set up real-time subscription
  useEffect(() => {
    const viewDates = getViewDates();
    const startDate = viewDates[0].toISOString().split('T')[0];
    const endDate = viewDates[viewDates.length - 1].toISOString().split('T')[0];
    
    const subscription = DatabaseService.subscribeToScheduleChanges(
      startDate,
      endDate,
      selectedTeam.id,
      () => {
        // Reload data when changes occur
        const loadScheduleData = async () => {
          try {
            const data = await DatabaseService.getScheduleEntries(startDate, endDate, selectedTeam.id);
            setScheduleData(data);
          } catch (error) {
            console.error('Error reloading schedule data:', error);
          }
        };
        loadScheduleData();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentSprintOffset, selectedTeam.id, viewMode, sprintDates]);

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
    // ✅ Add safety check for empty sprintDays array
    if (!sprintDays || sprintDays.length === 0) {
      console.warn('getCurrentSprintString called with empty sprintDays');
      if (currentSprint) {
        return `Sprint ${currentSprint.current_sprint_number} (${formatDate(new Date(currentSprint.sprint_start_date))} - ${formatDate(new Date(currentSprint.sprint_end_date))})`;
      }
      return `Sprint of ${formatDate(new Date())}`; // Fallback to today
    }
    
    const startDate = sprintDays[0];
    const endDate = sprintDays[sprintDays.length - 1]; // Last available day
    
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

  const handleWorkOptionClick = (memberId: number, date: Date, value: string) => {
    // Only allow users to edit their own schedule (unless they're a manager)
    if (!currentUser.isManager && memberId !== currentUser.id) return;

    const dateKey = date.toISOString().split('T')[0];
    const currentValue = scheduleData[memberId]?.[dateKey]?.value;
    
    // If clicking the same value, deselect it
    if (currentValue === value) {
      updateSchedule(memberId, date, null);
      return;
    }
    
    // If selecting 0.5 or X, show reason dialog
    if (value === '0.5' || value === 'X') {
      reasonDialog.open({ memberId, date, value: value as '0.5' | 'X' });
    } else {
      // For value '1', update directly
      updateSchedule(memberId, date, value);
    }
  };

  const handleReasonSave = (reason: string) => {
    // The reasonDialog from centralized state should have the data
    // This might need adjustment based on the modal implementation
    if (reasonDialog.isOpen) {
      // We'll need to get the data from the modal state
      // For now, we'll handle this in a basic way
      console.log('Reason saved:', reason);
      reasonDialog.close();
    }
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
      const value = memberData[dateKey];
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

      {/* Desktop Table-First Layout */}
      <div className="hidden lg:block space-y-0">
        {/* Compact Header Bar - Always visible, sticky */}
        <CompactHeaderBar
          currentUser={currentUser}
          selectedTeam={selectedTeam}
          teamMembers={teamMembers}
          scheduleData={scheduleData}
          currentSprintOffset={currentSprintOffset}
          currentSprintDays={currentSprintDays}
          onSprintChange={(offset) => {
            setCurrentSprintOffset(offset);
            console.log('Sprint changed to offset:', offset);
          }}
          onViewReasons={() => viewReasons.open()}
          getCurrentSprintString={getCurrentSprintString}
          getTeamTotalHours={getTeamTotalHours}
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
        data={null} // We'll need to adjust this based on modal implementation
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