'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import { TeamMember, WorkOption, WeekData, ReasonDialogData } from '@/types';
import ReasonDialog from './ReasonDialog';
import ViewReasonsModal from './ViewReasonsModal';
import { DatabaseService } from '@/lib/database';
import * as XLSX from 'xlsx';

interface ScheduleTableProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
}

const workOptions: WorkOption[] = [
  { value: '1', label: '1', hours: 7, description: 'Full day (7 hours)', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: '0.5', label: '0.5', hours: 3.5, description: 'Half day (3.5 hours)', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'X', label: 'X', hours: 0, description: 'Sick/OoO (0 hours)', color: 'bg-red-100 text-red-800 border-red-300' }
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export default function ScheduleTable({ currentUser, teamMembers }: ScheduleTableProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [scheduleData, setScheduleData] = useState<WeekData>({});
  const [reasonDialog, setReasonDialog] = useState<{ isOpen: boolean; data: ReasonDialogData | null }>({ isOpen: false, data: null });
  const [viewReasonsModal, setViewReasonsModal] = useState(false);
  const [loading, setLoading] = useState(true);

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
        const data = await DatabaseService.getScheduleEntries(startDate, endDate);
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
  }, [currentWeekOffset]);

  // Set up real-time subscription
  useEffect(() => {
    const currentWeekDates = getCurrentWeekDates();
    const startDate = currentWeekDates[0].toISOString().split('T')[0];
    const endDate = currentWeekDates[4].toISOString().split('T')[0];
    
    const subscription = DatabaseService.subscribeToScheduleChanges(
      startDate,
      endDate,
      () => {
        // Reload data when changes occur
        const loadScheduleData = async () => {
          try {
            const data = await DatabaseService.getScheduleEntries(startDate, endDate);
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
  }, [currentWeekOffset]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCurrentWeekString = () => {
    const startDate = weekDays[0];
    const endDate = weekDays[4];
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
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

  const exportToExcel = () => {
    const worksheetData = [];
    
    // Add header row
    const headerRow = ['Team Member', 'Hebrew Name', 'Role', ...dayNames.map((day, index) => `${day} (${formatDate(weekDays[index])})`), 'Weekly Hours'];
    worksheetData.push(headerRow);
    
    // Add data rows
    teamMembers.forEach(member => {
      const row = [
        member.name,
        member.hebrew,
        member.isManager ? 'Manager' : 'Employee'
      ];
      
      // Add daily data
      weekDays.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const entry = scheduleData[member.id]?.[dateKey];
        if (entry) {
          const option = workOptions.find(opt => opt.value === entry.value);
          let cellValue = `${entry.value} (${option?.hours || 0}h)`;
          if (entry.reason) {
            cellValue += ` - ${entry.reason}`;
          }
          row.push(cellValue);
        } else {
          row.push('');
        }
      });
      
      // Add weekly total
      row.push(`${calculateWeeklyHours(member.id)}h`);
      worksheetData.push(row);
    });
    
    // Add totals row
    const totalsRow = ['TEAM TOTAL', '', ''];
    weekDays.forEach(date => {
      const dayTotal = teamMembers.reduce((total, member) => {
        const dateKey = date.toISOString().split('T')[0];
        const entry = scheduleData[member.id]?.[dateKey];
        const option = workOptions.find(opt => opt.value === entry?.value);
        return total + (option ? option.hours : 0);
      }, 0);
      totalsRow.push(`${dayTotal}h`);
    });
    totalsRow.push(`${getTeamTotalHours()}h`);
    worksheetData.push(totalsRow);
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Auto-size columns
    const columnWidths = [];
    for (let i = 0; i < headerRow.length; i++) {
      const maxLength = Math.max(
        ...worksheetData.map(row => (row[i] || '').toString().length)
      );
      columnWidths.push({ width: Math.min(maxLength + 2, 30) });
    }
    ws['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Team Availability');
    
    // Generate filename with current week
    const filename = `team-availability-${getCurrentWeekString().replace(/\s+/g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
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
      {/* Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Navigation buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            {currentWeekOffset !== 0 && (
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Current</span>
              </button>
            )}
          </div>
          
          {/* Week info and manager buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
            <div className="text-sm text-gray-600 font-medium">
              Week of {getCurrentWeekString()}
            </div>
            {currentUser.isManager && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewReasonsModal(true)}
                  className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">View Reasons</span>
                </button>
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Work Options:</h3>
          <div className="flex flex-wrap gap-3">
            {workOptions.map(option => (
              <div key={option.value} className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-md border font-medium text-sm ${option.color}`}>
                  {option.label}
                </span>
                <span className="text-sm text-gray-600 hidden sm:inline">{option.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-3 sm:px-6 font-semibold text-gray-900 border-r">
                  Team Member
                </th>
                {dayNames.map((day, index) => (
                  <th key={day} className="text-center py-4 px-2 sm:px-4 font-semibold text-gray-900 border-r min-w-[100px] sm:min-w-[120px]">
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-medium">{day}</span>
                      <span className="text-xs text-gray-500 mt-1 hidden sm:inline">{formatDate(weekDays[index])}</span>
                    </div>
                  </th>
                ))}
                <th className="text-center py-4 px-2 sm:px-4 font-semibold text-gray-900 bg-blue-50 min-w-[80px]">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">Weekly </span>Hours
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, memberIndex) => {
                const canEdit = currentUser.isManager || member.id === currentUser.id;
                const isCurrentUserRow = member.id === currentUser.id;
                
                return (
                  <tr key={member.id} className={`border-b hover:bg-gray-50 transition-colors ${
                    isCurrentUserRow ? 'bg-blue-50 ring-2 ring-blue-200' : 
                    memberIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}>
                    <td className="py-4 px-3 sm:px-6 font-medium text-gray-900 border-r">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div>
                          <div className="font-medium text-sm sm:text-base">{member.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">{member.hebrew}</div>
                          {member.isManager && (
                            <div className="text-xs text-blue-600">Manager</div>
                          )}
                        </div>
                        {isCurrentUserRow && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">You</span>
                        )}
                      </div>
                    </td>
                    {weekDays.map((date) => {
                      const dateKey = date.toISOString().split('T')[0];
                      const currentValue = scheduleData[member.id]?.[dateKey];
                      
                      return (
                        <td key={dateKey} className="py-4 px-2 sm:px-4 text-center border-r">
                          <div className="flex gap-1 justify-center">
                            {workOptions.map(option => {
                              const isSelected = currentValue?.value === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => canEdit && handleWorkOptionClick(member.id, date, option.value)}
                                  disabled={!canEdit}
                                  className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md border font-medium text-xs sm:text-sm transition-all ${
                                    canEdit ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-60'
                                  } ${
                                    isSelected 
                                      ? option.color + ' ring-2 ring-offset-1 ring-blue-500' 
                                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
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
                    <td className="py-4 px-2 sm:px-4 text-center bg-blue-50 font-bold text-sm sm:text-lg">
                      {calculateWeeklyHours(member.id)}h
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td className="py-4 px-3 sm:px-6 font-bold text-gray-900 border-r text-sm sm:text-base">
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
                    <td key={date.toISOString().split('T')[0]} className="py-4 px-2 sm:px-4 text-center border-r font-semibold text-sm sm:text-base">
                      {dayTotal}h
                    </td>
                  );
                })}
                <td className="py-4 px-2 sm:px-4 text-center bg-blue-100 font-bold text-lg sm:text-xl">
                  {getTeamTotalHours()}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Your row</strong> is highlighted - you can only edit your own availability</li>
          <li>• Click 1, 0.5, or X to set your daily status</li>
          <li>• <strong>1</strong> = Full day (7 hours), <strong>0.5</strong> = Half day (3.5 hours), <strong>X</strong> = Sick/Out (0 hours)</li>
          {currentUser.isManager && <li>• As a manager, you can edit anyone&apos;s schedule and export data</li>}
          <li>• <strong>Real-time sync</strong> - changes are automatically saved and synced across all devices</li>
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
    </div>
  );
}