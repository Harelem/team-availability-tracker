'use client';

import { useState } from 'react';
import { Calendar, Download, X, AlertCircle } from 'lucide-react';
import { TeamMember, Team, ExportFormat } from '@/types';
import { DatabaseService } from '@/lib/database';
import { 
  validateDateRange, 
  formatDateRange, 
  generateExportFilename,
  getDaysDifference
} from '@/utils/dateUtils';
import { 
  generateWeekCSV, 
  downloadFile, 
  calculateExportStatistics 
} from '@/utils/exportUtils';

interface CustomRangeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
}

export default function CustomRangeExportModal({
  isOpen,
  onClose,
  currentUser,
  teamMembers,
  selectedTeam
}: CustomRangeExportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [includeReasons, setIncludeReasons] = useState(true);
  const [includeStatistics, setIncludeStatistics] = useState(true);
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default dates (current week)
  const setDefaultDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + (includeWeekends ? 6 : 4));
    
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
  };

  const setLastWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() - 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + (includeWeekends ? 6 : 4));
    
    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
  };

  const setLastMonthDates = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(lastMonthEnd.toISOString().split('T')[0]);
  };

  const validateInputs = (): boolean => {
    setError(null);
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return false;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    try {
      validateDateRange(start, end);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid date range');
      return false;
    }
    
    return true;
  };

  const handleExport = async () => {
    if (!validateInputs()) return;
    
    setIsExporting(true);
    setError(null);
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Fetch data for the custom range
      const customData = await DatabaseService.getScheduleEntries(
        startDate, 
        endDate, 
        selectedTeam.id
      );
      
      // Generate all days in the range
      const allDays: Date[] = [];
      const currentDate = new Date(start);
      while (currentDate <= end) {
        // Include weekends if requested, otherwise only weekdays (Sun-Thu)
        if (includeWeekends || (currentDate.getDay() >= 0 && currentDate.getDay() <= 4)) {
          allDays.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Calculate statistics
      const statistics = includeStatistics 
        ? calculateExportStatistics(teamMembers, customData, allDays)
        : undefined;
      
      // Prepare export data
      const exportData = {
        teamName: selectedTeam.name,
        exportType: `Custom Range (${getDaysDifference(start, end) + 1} days)`,
        dateRange: formatDateRange(start, end),
        generatedBy: currentUser.name,
        generatedAt: new Date(),
        members: teamMembers,
        scheduleData: customData,
        statistics
      };
      
      // Generate and download
      const csvContent = generateWeekCSV(exportData);
      const filename = generateExportFilename('custom', selectedTeam.name, start, end, format);
      downloadFile(csvContent, filename, format);
      
      // Close modal on success
      onClose();
      
    } catch (err) {
      console.error('Custom range export failed:', err);
      setError('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Custom Range Export</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Quick Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Selection
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={setDefaultDates}
                className="px-3 py-3 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
              >
                This Week
              </button>
              <button
                onClick={setLastWeekDates}
                className="px-3 py-3 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
              >
                Last Week
              </button>
              <button
                onClick={setLastMonthDates}
                className="px-3 py-3 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
              >
                Last Month
              </button>
            </div>
          </div>
          
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
          </div>
          
          {/* Export Options */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <button
                  onClick={() => setFormat('excel')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                    format === 'excel'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => setFormat('csv')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                    format === 'csv'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  CSV
                </button>
              </div>
            </div>
            
            {/* Include Options */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Include Options
              </label>
              
              <label className="flex items-center py-2">
                <input
                  type="checkbox"
                  checked={includeReasons}
                  onChange={(e) => setIncludeReasons(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Include reasons for half-days/absences</span>
              </label>
              
              <label className="flex items-center py-2">
                <input
                  type="checkbox"
                  checked={includeStatistics}
                  onChange={(e) => setIncludeStatistics(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Include summary statistics</span>
              </label>
              
              <label className="flex items-center py-2">
                <input
                  type="checkbox"
                  checked={includeWeekends}
                  onChange={(e) => setIncludeWeekends(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Include weekends (Friday-Saturday)</span>
              </label>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
          
          {/* Range Info */}
          {startDate && endDate && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  {formatDateRange(new Date(startDate), new Date(endDate))} 
                  ({getDaysDifference(new Date(startDate), new Date(endDate)) + 1} days)
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !startDate || !endDate}
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors touch-manipulation"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}