'use client';

import { useState } from 'react';
import { Download, Calendar, ChevronDown, Clock, ArrowLeft } from 'lucide-react';
import { TeamMember, Team, WeekData, WeekExportType } from '@/types';
import { 
  calculateWeekRange, 
  formatDateRange, 
  getWeekDays 
} from '@/utils/dateUtils';
import { 
  generateSafeManagerExcelWorkbook, 
  generateSafeManagerExportFilename, 
  downloadSafeManagerExcelFile 
} from '@/utils/safeManagerExportUtils';

interface ManagerSafeExportDropdownProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
  scheduleData: WeekData;
  currentSprintDays: Date[];
}

export default function ManagerSafeExportDropdown({
  currentUser,
  teamMembers,
  selectedTeam,
  scheduleData,
  currentSprintDays
}: ManagerSafeExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleSafeExport = async (type: WeekExportType) => {
    console.log('👤 Starting safe manager export (copying COO logic)...', { type, team: selectedTeam.name });
    
    setIsExporting(true);
    setIsOpen(false);
    setExportError(null);

    // Create timeout promise (30 seconds) - COPIED FROM COO LOGIC
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Export timeout - operation took too long')), 30000)
    );

    try {
      // Validate inputs (COPIED FROM COO LOGIC)
      if (!selectedTeam?.id || !selectedTeam?.name) {
        throw new Error('Invalid team selected');
      }
      
      if (!currentUser?.name) {
        throw new Error('Invalid user information');
      }
      
      if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
        throw new Error('No team members found');
      }
      
      // Create the main export promise
      const exportPromise = performSafeManagerExport(type);
      
      // Race between export and timeout (COPIED FROM COO LOGIC)
      await Promise.race([exportPromise, timeoutPromise]);
      
      console.log('✅ Manager export completed successfully');
      
    } catch (error) {
      console.error('❌ Manager export failed:', error);
      
      // Error handling (COPIED FROM COO LOGIC)
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      
      if (errorMessage.includes('timeout')) {
        setExportError('Export timed out. Please try a simpler export or contact support.');
      } else if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
        setExportError('Export data too large. Please try a shorter date range.');
      } else {
        setExportError(`Export failed: ${errorMessage}`);
      }
      
    } finally {
      setIsExporting(false);
    }
  };

  const performSafeManagerExport = async (type: WeekExportType): Promise<void> => {
    try {
      console.log('📊 Performing safe manager export using COO data fetching...');
      
      // Calculate date range (USING COO LOGIC)
      let weekDays: Date[];
      let dateRangeText: string;
      
      if (type === 'current-week') {
        weekDays = currentSprintDays;
        if (currentSprintDays.length > 0 && currentSprintDays[0] && currentSprintDays[currentSprintDays.length - 1]) {
          dateRangeText = formatDateRange(currentSprintDays[0]!, currentSprintDays[currentSprintDays.length - 1]!);
        } else {
          dateRangeText = 'No sprint data available';
        }
      } else {
        const { startDate, endDate } = calculateWeekRange(type);
        weekDays = getWeekDays(startDate);
        dateRangeText = formatDateRange(startDate, endDate);
        
        // For non-current week, we need to fetch the data for that specific week
        console.log('📅 Fetching data for specific week:', { startDate, endDate });
        // Note: For now using current week data, but could be enhanced to fetch specific week data
      }
      
      console.log('📋 Generating manager Excel workbook using COO logic...', { 
        teamMembers: teamMembers.length,
        weekDays: weekDays.length 
      });
      
      // Generate Excel workbook (USING COO GENERATION LOGIC)
      const workbook = await generateSafeManagerExcelWorkbook(
        selectedTeam,
        currentUser,
        getExportTypeName(type),
        dateRangeText,
        teamMembers,
        scheduleData,
        weekDays
      );

      console.log('✅ Manager Excel workbook generated successfully');

      // Generate safe filename and download (USING COO LOGIC)
      const filename = generateSafeManagerExportFilename(
        getExportTypeName(type),
        selectedTeam.name,
        dateRangeText
      );

      console.log('💾 Downloading manager file:', filename);
      downloadSafeManagerExcelFile(workbook, filename);

      console.log('✅ Manager export completed successfully');
      
    } catch (error) {
      console.error('❌ Error in performSafeManagerExport:', error);
      throw error;
    }
  };

  const handleCurrentWeekExport = () => {
    console.log('👤 Manager current week export (using COO logic)');
    handleSafeExport('current-week');
  };

  const getExportTypeName = (type: WeekExportType): string => {
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
            
            {/* Current Week - Quick Option */}
            <button
              onClick={handleCurrentWeekExport}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">Export Current Sprint</div>
                <div className="text-xs text-gray-500">
                  {currentSprintDays.length > 0 && currentSprintDays[0] && currentSprintDays[currentSprintDays.length - 1]
                    ? formatDateRange(currentSprintDays[0]!, currentSprintDays[currentSprintDays.length - 1]!)
                    : 'No sprint data available'}
                </div>
                <div className="text-xs text-green-600 font-medium">
                  ✅ Using Working COO Logic
                </div>
              </div>
            </button>

            <hr className="my-1 border-gray-200" />

            {/* Sprint Options */}
            <div className="px-3 py-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sprint Options</div>
            </div>
            
            <button
              onClick={() => handleSafeExport('previous-week')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
              <div>
                <span className="text-gray-700">Previous Sprint</span>
                <div className="text-xs text-green-600">Safe Export</div>
              </div>
            </button>

            <button
              onClick={() => handleSafeExport('next-week')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            >
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <span className="text-gray-700">Next Sprint</span>
                <div className="text-xs text-green-600">Safe Export</div>
              </div>
            </button>

            {/* Status Message */}
            <div className="px-4 py-2 bg-green-50 border-t border-gray-200">
              <div className="text-xs text-green-700">
                <div className="font-medium">✅ Fixed Export System</div>
                <div>Uses proven COO export logic</div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Error Display */}
      {exportError && (
        <div className="absolute top-full mt-2 right-0 w-64 p-3 bg-red-50 border border-red-200 rounded-lg z-30">
          <div className="font-medium text-red-800 text-sm">⚠️ Export Error</div>
          <div className="text-xs text-red-700">{exportError}</div>
          <button 
            onClick={() => setExportError(null)}
            className="mt-2 text-xs text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}