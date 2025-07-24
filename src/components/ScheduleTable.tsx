'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, Eye, Settings } from 'lucide-react';
import { TeamMember, Team, WorkOption, WeekData, ReasonDialogData } from '@/types';
import ReasonDialog from './ReasonDialog';
import ViewReasonsModal from './ViewReasonsModal';
import MobileScheduleView from './MobileScheduleView';
import GlobalSprintSettings from './GlobalSprintSettings';
import EnhancedManagerExportButton from './EnhancedManagerExportButton';
import TeamMemberManagement from './TeamMemberManagement';
import TeamHoursStatus from './TeamHoursStatus';
import { canManageSprints } from '@/utils/permissions';
import { DatabaseService } from '@/lib/database';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';

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

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

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
    <div className="space-y-6">
      {/* Mobile View */}
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

      {/* Team Member Management - Managers Only */}
      {currentUser.isManager && (
        <TeamMemberManagement 
          currentUser={currentUser}
          selectedTeam={selectedTeam}
          onMembersUpdated={handleMembersUpdated}
        />
      )}

      {/* Team Hours Status */}
      {currentSprint && (
        <TeamHoursStatus 
          selectedTeam={selectedTeam}
          currentSprint={currentSprint}
        />
      )}

      {/* Desktop Header */}
      <div className="hidden lg:block bg-white rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Week info - moved to top for mobile */}
          <div className="text-center sm:text-left">
            <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              Week of {getCurrentWeekString()}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Navigation buttons */}
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <button
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg active:bg-gray-200 transition-colors text-sm min-h-[44px] touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="sm:inline">Previous</span>
              </button>
              {currentWeekOffset !== 0 && (
                <button
                  onClick={() => setCurrentWeekOffset(0)}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-lg active:bg-blue-700 transition-colors text-sm min-h-[44px] touch-manipulation"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="sm:inline">Current</span>
                </button>
              )}
              <button
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg active:bg-gray-200 transition-colors text-sm min-h-[44px] touch-manipulation"
              >
                <span className="sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Manager buttons */}
            <div className="flex gap-2 justify-center sm:justify-end">
              {/* Sprint Settings - Only for Harel Mazan */}
              {canManageSprints(currentUser) && (
                <button 
                  onClick={() => setGlobalSprintSettings(true)}
                  className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2.5 rounded-lg active:bg-purple-700 transition-colors text-sm min-h-[44px] touch-manipulation"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Sprint Settings</span>
                </button>
              )}
              
              {/* Standard manager buttons */}
              {currentUser.isManager && (
                <>
                  <button 
                    onClick={() => setViewReasonsModal(true)}
                    className="flex items-center gap-1.5 bg-gray-600 text-white px-3 py-2.5 rounded-lg active:bg-gray-700 transition-colors text-sm min-h-[44px] touch-manipulation"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Reasons</span>
                  </button>
                  <EnhancedManagerExportButton
                    currentUser={currentUser}
                    teamMembers={teamMembers}
                    selectedTeam={selectedTeam}
                    scheduleData={scheduleData}
                    currentWeekDays={weekDays}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">Work Options:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {workOptions.map(option => (
              <div key={option.value} className="flex items-center gap-2 p-2 sm:p-0 bg-gray-50 sm:bg-transparent rounded-lg">
                <span className={`px-2 sm:px-3 py-1 rounded-md border font-medium text-xs sm:text-sm min-w-[32px] text-center ${option.color}`}>
                  {option.label}
                </span>
                <span className="text-xs sm:text-sm text-gray-600 flex-1">{option.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Schedule Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 text-left py-3 px-2 sm:py-4 sm:px-6 font-semibold text-gray-900 border-r min-w-[120px] sm:min-w-[140px]">
                  <div className="text-xs sm:text-sm">Team Member</div>
                </th>
                {dayNames.map((day, index) => {
                  const dayDate = weekDays[index];
                  const today = isToday(dayDate);
                  const past = isPastDate(dayDate);
                  
                  return (
                    <th key={day} className={`text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold border-r min-w-[85px] sm:min-w-[120px] ${
                      today 
                        ? 'bg-blue-100 text-blue-900 border-blue-300' 
                        : past
                        ? 'bg-gray-50 text-gray-600'
                        : 'bg-gray-50 text-gray-900'
                    }`}>
                      <div className="flex flex-col">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs sm:text-sm font-medium">{day.slice(0, 3)}</span>
                          {today && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <span className={`text-xs mt-0.5 sm:mt-1 ${
                          today ? 'text-blue-700 font-medium' : 'text-gray-500'
                        }`}>
                          {formatDate(dayDate)}
                          {today && <span className="block text-xs font-medium">Today</span>}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold text-gray-900 bg-blue-50 min-w-[70px] sm:min-w-[80px]">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Hours</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, memberIndex) => {
                const canEdit = currentUser.isManager || member.id === currentUser.id;
                const isCurrentUserRow = member.id === currentUser.id;
                
                return (
                  <tr key={member.id} className={`border-b transition-colors ${
                    isCurrentUserRow ? 'bg-blue-50 ring-2 ring-blue-200' : 
                    memberIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}>
                    <td className="sticky left-0 z-10 py-3 px-2 sm:py-4 sm:px-6 font-medium text-gray-900 border-r bg-inherit">
                      <div className="flex items-center gap-1 sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-xs sm:text-base truncate">{member.name}</div>
                          <div className="text-xs text-gray-500 sm:block">{member.hebrew}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {member.isManager && (
                              <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded">Mgr</span>
                            )}
                            {isCurrentUserRow && (
                              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">You</span>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => handleFullWeekSet(member.id)}
                              className="mt-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                              title="Set full working week"
                            >
                              Full Week
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDays.map((date) => {
                      const dateKey = date.toISOString().split('T')[0];
                      const currentValue = scheduleData[member.id]?.[dateKey];
                      const today = isToday(date);
                      const past = isPastDate(date);
                      
                      return (
                        <td key={dateKey} className={`py-2 px-1 sm:py-4 sm:px-4 text-center border-r ${
                          today 
                            ? 'bg-blue-50 border-blue-200' 
                            : past
                            ? 'bg-gray-25'
                            : ''
                        }`}>
                          <div className="flex gap-0.5 sm:gap-1 justify-center">
                            {workOptions.map(option => {
                              const isSelected = currentValue?.value === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => canEdit && handleWorkOptionClick(member.id, date, option.value)}
                                  disabled={!canEdit}
                                  className={`min-h-[36px] w-8 sm:w-auto px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-md border font-medium text-xs sm:text-sm transition-all touch-manipulation ${
                                    canEdit ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-60'
                                  } ${
                                    isSelected 
                                      ? option.color + ' ring-2 ring-offset-1 ring-blue-500' 
                                      : 'bg-gray-50 text-gray-400 border-gray-200 active:bg-gray-100'
                                  }`}
                                  title={canEdit ? option.description : 'You can only edit your own schedule'}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3 px-1 sm:py-4 sm:px-4 text-center bg-blue-50 font-bold text-xs sm:text-lg">
                      {calculateWeeklyHours(member.id)}h
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 sticky bottom-0">
              <tr>
                <td className="sticky left-0 z-10 bg-gray-100 py-3 px-2 sm:py-4 sm:px-6 font-bold text-gray-900 border-r text-xs sm:text-base">
                  Team Total
                </td>
                {weekDays.map((date) => {
                  const dayTotal = teamMembers.reduce((total, member) => {
                    const dateKey = date.toISOString().split('T')[0];
                    const value = scheduleData[member.id]?.[dateKey];
                    const option = workOptions.find(opt => opt.value === value?.value);
                    return total + (option ? option.hours : 0);
                  }, 0);
                  
                  return (
                    <td key={date.toISOString().split('T')[0]} className="py-3 px-1 sm:py-4 sm:px-4 text-center border-r font-semibold text-xs sm:text-base">
                      {dayTotal}h
                    </td>
                  );
                })}
                <td className="py-3 px-1 sm:py-4 sm:px-4 text-center bg-blue-100 font-bold text-sm sm:text-xl">
                  {getTeamTotalHours()}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Desktop Instructions */}
      <div className="hidden lg:block bg-blue-50 rounded-lg p-3 sm:p-4">
        <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Quick Guide:</h3>
        <ul className="text-xs sm:text-sm text-blue-800 space-y-1.5">
          <li>• <strong>Your row</strong> is highlighted - tap buttons to set your availability</li>
          <li>• <strong>1</strong> = Full day (7h), <strong>0.5</strong> = Half day (3.5h), <strong>X</strong> = Sick/Out (0h)</li>
          {currentUser.isManager && <li>• <strong>Manager access:</strong> You can edit anyone&apos;s schedule and export data</li>}
          <li>• <strong>Real-time sync</strong> - changes save automatically across all devices</li>
          <li className="sm:hidden">• <strong>Scroll table</strong> horizontally to see all days</li>
        </ul>
      </div>

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