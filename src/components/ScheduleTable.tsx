'use client';

import { useState, useEffect } from 'react';
// import { } from 'lucide-react'; // No icons used directly in this component
import { TeamMember, Team, WorkOption, WeekData, ReasonDialogData } from '@/types';
import ReasonDialog from './ReasonDialog';
import ViewReasonsModal from './ViewReasonsModal';
import MobileScheduleView from './MobileScheduleView';
import GlobalSprintSettings from './GlobalSprintSettings';
// import EnhancedManagerExportButton from './EnhancedManagerExportButton'; // Used in CompactHeaderBar
import TeamMemberManagement from './TeamMemberManagement';
import TeamHoursStatus from './TeamHoursStatus';
import TemplateManager from './TemplateManager';
import RecognitionDashboard from './recognition/RecognitionDashboard';
import TeamRecognitionLeaderboard from './recognition/TeamRecognitionLeaderboard';
import CompactHeaderBar from './CompactHeaderBar';
import QuickActionsBar from './QuickActionsBar';
import EnhancedAvailabilityTable from './EnhancedAvailabilityTable';
// import { canManageSprints } from '@/utils/permissions'; // Used in CompactHeaderBar
import { DatabaseService } from '@/lib/database';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { WeeklyPattern } from '@/types/templateTypes';
import { extractPatternFromSchedule, convertPatternToScheduleFormat } from '@/hooks/useAvailabilityTemplates';

interface ScheduleTableProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
}

const workOptions: WorkOption[] = [
  { value: '1', label: '1', hours: 7, description: 'Full day (7 hours)', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: '0.5', label: '0.5', hours: 3.5, description: 'Half day (3.5 hours)', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'X', label: 'X', hours: 0, description: 'Sick/OoO (0 hours)', color: 'bg-red-100 text-red-800 border-red-300' }
];

// const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']; // Used in EnhancedAvailabilityTable

export default function ScheduleTable({ currentUser, teamMembers, selectedTeam }: ScheduleTableProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [scheduleData, setScheduleData] = useState<WeekData>({});
  const [reasonDialog, setReasonDialog] = useState<{ isOpen: boolean; data: ReasonDialogData | null }>({ isOpen: false, data: null });
  const [viewReasonsModal, setViewReasonsModal] = useState(false);
  const [globalSprintSettings, setGlobalSprintSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger parent refresh

  // Get global sprint data for hours status
  const { currentSprint } = useGlobalSprint();

  // Calculate current week dates
  const getCurrentWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  const weekDays = getCurrentWeekDates();

  // Load schedule data from database
  useEffect(() => {
    const loadScheduleData = async () => {
      setLoading(true);
      const currentWeekDates = getCurrentWeekDates();
      const startDate = currentWeekDates[0].toISOString().split('T')[0];
      const endDate = currentWeekDates[4].toISOString().split('T')[0];
      
      try {
        const data = await DatabaseService.getScheduleEntries(startDate, endDate, selectedTeam.id);
        setScheduleData(data);
      } catch (error) {
        console.error('Error loading schedule data:', error);
        // Fallback to empty state
        setScheduleData({});
      } finally {
        setLoading(false);
      }
    };

    loadScheduleData();
  }, [currentWeekOffset, selectedTeam.id]);

  // Set up real-time subscription
  useEffect(() => {
    const currentWeekDates = getCurrentWeekDates();
    const startDate = currentWeekDates[0].toISOString().split('T')[0];
    const endDate = currentWeekDates[4].toISOString().split('T')[0];
    
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
  }, [currentWeekOffset, selectedTeam.id]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCurrentWeekString = () => {
    const startDate = weekDays[0];
    const endDate = weekDays[4];
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
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
      
      // Update local state optimistically
      setScheduleData((prev) => {
        const newPrev = { ...prev };
        if (!newPrev[memberId]) {
          newPrev[memberId] = {};
        }
        
        if (value && (value === '1' || value === '0.5' || value === 'X')) {
          newPrev[memberId][dateKey] = { 
            value: value as '1' | '0.5' | 'X',
            reason: reason || undefined
          };
        } else {
          delete newPrev[memberId][dateKey];
        }
        
        return newPrev;
      });
      
      // Trigger achievement check for recognition system
      try {
        await DatabaseService.triggerAchievementCheck(memberId);
      } catch (achievementError) {
        console.error('Error checking achievements:', achievementError);
        // Don't fail the main update if achievement check fails
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
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
      setReasonDialog({ 
        isOpen: true, 
        data: { memberId, dateKey, value: value as '0.5' | 'X' }
      });
    } else {
      // For value '1', update directly
      updateSchedule(memberId, date, value);
    }
  };

  const handleReasonSave = (reason: string) => {
    if (reasonDialog.data) {
      const { memberId, dateKey, value } = reasonDialog.data;
      const date = new Date(dateKey);
      updateSchedule(memberId, date, value, reason);
    }
  };

  const handleReasonRequired = (memberId: number, date: Date, value: '0.5' | 'X') => {
    const dateKey = date.toISOString().split('T')[0];
    setReasonDialog({ 
      isOpen: true, 
      data: { memberId, dateKey, value }
    });
  };

  const handleFullWeekSet = async (memberId: number) => {
    const confirmMessage = currentUser.isManager && memberId !== currentUser.id 
      ? `Set full week (all working days) for ${teamMembers.find(m => m.id === memberId)?.name}?`
      : 'Set your full week to all working days?';
      
    if (!confirm(confirmMessage)) return;

    try {
      // Set each weekday to full working day
      for (const date of weekDays) {
        await updateSchedule(memberId, date, '1');
      }
    } catch (error) {
      console.error('Error setting full week:', error);
    }
  };

  const calculateWeeklyHours = (memberId: number) => {
    let totalHours = 0;
    const memberData = scheduleData[memberId] || {};

    weekDays.forEach(date => {
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
    return teamMembers.reduce((total, member) => total + calculateWeeklyHours(member.id), 0);
  };

  const handleMembersUpdated = () => {
    // Trigger a refresh of the parent component's team members
    setRefreshKey(prev => prev + 1);
  };

  // Template-related functions
  const getCurrentWeekPattern = (): WeeklyPattern | undefined => {
    const memberData = scheduleData[currentUser.id];
    if (!memberData) return undefined;
    
    return extractPatternFromSchedule(memberData, weekDays);
  };

  const handleApplyTemplate = async (pattern: WeeklyPattern) => {
    try {
      // Apply the template pattern to the current user's schedule
      const scheduleFormat = convertPatternToScheduleFormat(pattern, currentUser.id, weekDays);
      
      // Update each day in the schedule
      for (const [dateKey, entry] of Object.entries(scheduleFormat)) {
        const date = new Date(dateKey);
        await updateSchedule(currentUser.id, date, entry.value, entry.reason);
      }
      
      // Clear any days not in the pattern (set to null)
      for (const date of weekDays) {
        const dateKey = date.toISOString().split('T')[0];
        if (!scheduleFormat[dateKey]) {
          await updateSchedule(currentUser.id, date, null);
        }
      }
    } catch (error) {
      console.error('Error applying template:', error);
    }
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
      {/* Mobile View - Keep existing mobile implementation */}
      <MobileScheduleView
        currentUser={currentUser}
        teamMembers={teamMembers}
        selectedTeam={selectedTeam}
        scheduleData={scheduleData}
        workOptions={workOptions}
        weekDays={weekDays}
        currentWeekOffset={currentWeekOffset}
        loading={loading}
        onWeekChange={setCurrentWeekOffset}
        onWorkOptionClick={handleWorkOptionClick}
        onFullWeekSet={handleFullWeekSet}
        onViewReasons={() => setViewReasonsModal(true)}
        isToday={isToday}
        isPastDate={isPastDate}
        getCurrentWeekString={getCurrentWeekString}
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
          currentWeekOffset={currentWeekOffset}
          currentWeekDays={weekDays}
          onWeekChange={setCurrentWeekOffset}
          onViewReasons={() => setViewReasonsModal(true)}
          onSprintSettings={() => setGlobalSprintSettings(true)}
          getCurrentWeekString={getCurrentWeekString}
          getTeamTotalHours={getTeamTotalHours}
        />

        {/* Quick Actions Bar - Template dropdown and quick actions */}
        <QuickActionsBar
          currentUser={currentUser}
          selectedTeam={selectedTeam}
          currentWeekPattern={getCurrentWeekPattern()}
          onApplyTemplate={handleApplyTemplate}
          onFullWeekSet={handleFullWeekSet}
          onSaveCurrentAsTemplate={() => {
            // This will trigger the existing template creation modal
            // For now, we'll use a simple alert - can be enhanced later
            alert('Save current week as template - Feature coming soon!');
          }}
        />

        {/* Enhanced Availability Table - Main focus, immediately visible */}
        <EnhancedAvailabilityTable
          currentUser={currentUser}
          teamMembers={teamMembers}
          scheduleData={scheduleData}
          workOptions={workOptions}
          weekDays={weekDays}
          onWorkOptionClick={handleWorkOptionClick}
          onReasonRequired={handleReasonRequired}
          onFullWeekSet={handleFullWeekSet}
          calculateWeeklyHours={calculateWeeklyHours}
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

        {/* Availability Templates - Collapsed by default */}
        <div className="bg-white rounded-lg border border-gray-200">
          <TemplateManager
            onApplyTemplate={handleApplyTemplate}
            currentWeekPattern={getCurrentWeekPattern()}
            teamId={selectedTeam.id}
            currentUserId={currentUser.id}
            className=""
          />
        </div>

        {/* Recognition Dashboard */}
        <div className="bg-white rounded-lg border border-gray-200">
          <RecognitionDashboard
            userId={currentUser.id}
            timeframe="week"
            className=""
          />
        </div>

        {/* Team Recognition Leaderboard - Managers Only */}
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
        onClose={() => setReasonDialog({ isOpen: false, data: null })}
        onSave={handleReasonSave}
        data={reasonDialog.data}
      />
      
      <ViewReasonsModal
        isOpen={viewReasonsModal}
        onClose={() => setViewReasonsModal(false)}
        scheduleData={scheduleData}
        teamMembers={teamMembers}
        weekDays={weekDays}
      />
      
      <GlobalSprintSettings
        isOpen={globalSprintSettings}
        onClose={() => setGlobalSprintSettings(false)}
      />
    </div>
  );
}