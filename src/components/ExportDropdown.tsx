'use client';

import { useState } from 'react';
import { Download, Calendar, ChevronDown, Clock, BarChart3, ArrowLeft, Settings } from 'lucide-react';
import { TeamMember, Team, WeekData, WeekExportType } from '@/types';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import CustomRangeExportModal from './CustomRangeExportModal';
import { DatabaseService } from '@/lib/database';
import { 
  calculateWeekRange, 
  formatDateRange, 
  getWeekDays, 
  generateExportFilename 
} from '@/utils/dateUtils';
import { 
  generateWeekCSV, 
  generateSprintCSV, 
  downloadFile, 
  calculateExportStatistics 
} from '@/utils/exportUtils';

interface ExportDropdownProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
  scheduleData: WeekData;
  currentSprintDays: Date[];
}

export default function ExportDropdown({
  currentUser,
  teamMembers,
  selectedTeam,
  scheduleData,
  currentSprintDays
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const { currentSprint } = useGlobalSprint();

  const handleWeekExport = async (type: WeekExportType) => {
    setIsExporting(true);
    setIsOpen(false);
    
    try {
      // Validate inputs
      if (!selectedTeam?.id || !selectedTeam?.name) {
        throw new Error('Invalid team selected');
      }
      
      if (!currentUser?.name) {
        throw new Error('Invalid user information');
      }
      
      if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
        throw new Error('No team members found');
      }
      
      const { startDate, endDate } = calculateWeekRange(type);
      const weekDays = getWeekDays(startDate);
      
      // Validate calculated dates
      if (!startDate || !endDate || weekDays.length === 0) {
        throw new Error('Invalid date range calculated');
      }
      
      // Fetch data for the specific week
      const startDateStr = startDate.toISOString().split('T')[0] || '' || '';
      const endDateStr = endDate.toISOString().split('T')[0] || '' || '';
      const weekData = await DatabaseService.getScheduleEntries(startDateStr, endDateStr, selectedTeam.id);
      
      // Handle case where no data is returned
      if (!weekData) {
        console.warn('No schedule data found for the selected week');
        // Continue with empty data - this is valid for weeks without entries
      }
      
      // Calculate statistics with error handling
      const statistics = calculateExportStatistics(teamMembers, weekData || {}, weekDays);
      
      // Prepare export data with validation
      const exportData = {
        teamName: selectedTeam.name,
        exportType: getWeekExportTypeName(type),
        dateRange: formatDateRange(startDate, endDate),
        generatedBy: currentUser.name,
        generatedAt: new Date(),
        members: teamMembers,
        scheduleData: weekData || {},
        statistics
      };
      
      // Generate and download with error handling
      const csvContent = generateWeekCSV(exportData);
      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error('Failed to generate export content');
      }
      
      const filename = generateExportFilename('week', selectedTeam.name, startDate, endDate, 'excel');
      if (!filename) {
        throw new Error('Failed to generate filename');
      }
      
      downloadFile(csvContent, filename, 'excel');
      
    } catch (error) {
      console.error('Week export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      alert(`Export failed: ${errorMessage}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSprintExport = async () => {
    if (!currentSprint) {
      alert('No active sprint found');
      return;
    }
    
    setIsExporting(true);
    setIsOpen(false);
    
    try {
      const sprintStartDate = new Date(currentSprint.sprint_start_date);
      const sprintEndDate = new Date(currentSprint.sprint_end_date);
      
      // Fetch data for the sprint period
      const startDateStr = sprintStartDate.toISOString().split('T')[0] || '';
      const endDateStr = sprintEndDate.toISOString().split('T')[0] || '';
      const sprintData = await DatabaseService.getScheduleEntries(startDateStr, endDateStr, selectedTeam.id);
      
      // Get all days in sprint period
      const sprintDays: Date[] = [];
      const currentDate = new Date(sprintStartDate);
      while (currentDate <= sprintEndDate) {
        // Only include weekdays (Sunday to Thursday)
        if (currentDate.getDay() >= 0 && currentDate.getDay() <= 4) {
          sprintDays.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Calculate statistics
      const statistics = calculateExportStatistics(teamMembers, sprintData, sprintDays);
      
      // Prepare export data
      const exportData = {
        teamName: selectedTeam.name,
        exportType: `Sprint ${currentSprint.current_sprint_number}`,
        dateRange: formatDateRange(sprintStartDate, sprintEndDate),
        generatedBy: currentUser.name,
        generatedAt: new Date(),
        members: teamMembers,
        scheduleData: sprintData,
        statistics
      };
      
      // Generate and download
      const csvContent = generateSprintCSV(exportData, {
        sprintNumber: currentSprint.current_sprint_number,
        sprintLength: currentSprint.sprint_length_weeks
      });
      const filename = generateExportFilename('sprint', selectedTeam.name, sprintStartDate, sprintEndDate, 'excel');
      downloadFile(csvContent, filename, 'excel');
      
    } catch (error) {
      console.error('Sprint export failed:', error);
      alert('Sprint export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCurrentSprintExport = () => {
    // Use existing schedule data for current sprint
    const statistics = calculateExportStatistics(teamMembers, scheduleData, currentSprintDays);
    
    const exportData = {
      teamName: selectedTeam.name,
      exportType: 'Current Sprint',
      dateRange: currentSprintDays.length > 0 ? formatDateRange(currentSprintDays[0]!, currentSprintDays[currentSprintDays.length - 1]!) : '',
      generatedBy: currentUser.name,
      generatedAt: new Date(),
      members: teamMembers,
      scheduleData,
      statistics
    };
    
    const csvContent = generateWeekCSV(exportData);
    const filename = generateExportFilename('week', selectedTeam.name, currentSprintDays[0]!, currentSprintDays[currentSprintDays.length - 1]!, 'excel');
    downloadFile(csvContent, filename, 'excel');
    setIsOpen(false);
  };

  const getWeekExportTypeName = (type: WeekExportType): string => {
    switch (type) {
      case 'current-week': return 'Current Sprint';
      case 'previous-week': return 'Previous Sprint';
      case 'next-week': return 'Next Sprint';
      case 'specific-week': return 'Specific Sprint';
      default: return 'Sprint Export';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm min-h-[44px] touch-manipulation disabled:opacity-50 w-full sm:w-auto justify-center sm:justify-start"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 sm:right-0 top-full mt-1 w-64 sm:w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 max-h-96 overflow-y-auto transform-gpu">
            {/* Current Sprint - Quick Option */}
            <button
              onClick={handleCurrentSprintExport}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">Export Current Sprint</div>
                <div className="text-xs text-gray-500">
                  {currentSprintDays.length > 0 ? formatDateRange(currentSprintDays[0]!, currentSprintDays[currentSprintDays.length - 1]!) : 'No dates available'}
                </div>
              </div>
            </button>

            {/* Current Sprint - If Available */}
            {currentSprint && (
              <button
                onClick={() => handleSprintExport()}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
              >
                <BarChart3 className="w-4 h-4 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Export Current Sprint</div>
                  <div className="text-xs text-gray-500">
                    Sprint {currentSprint.current_sprint_number} • {currentSprint.sprint_length_weeks} week{currentSprint.sprint_length_weeks !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>
            )}

            <hr className="my-1 border-gray-200" />

            {/* Sprint Period Options */}
            <div className="px-3 py-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sprint Period Options</div>
            </div>
            
            <button
              onClick={() => handleWeekExport('previous-week')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">Previous Sprint</span>
            </button>

            <button
              onClick={() => handleWeekExport('next-week')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">Next Sprint</span>
            </button>

            <hr className="my-1 border-gray-200" />

            {/* Custom Range Export */}
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCustomModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <Settings className="w-4 h-4 text-purple-600" />
              <span className="text-gray-700">Custom Range Export</span>
            </button>
          </div>
        </>
      )}
      
      {/* Custom Range Export Modal */}
      <CustomRangeExportModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        currentUser={currentUser}
        teamMembers={teamMembers}
        selectedTeam={selectedTeam}
      />
    </div>
  );
}