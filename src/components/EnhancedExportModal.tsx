'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BarChart3, Download, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { EnhancedExportType, EnhancedExportConfig } from '@/types';
import { 
  getEnhancedExportDateRange, 
  getCurrentSprintInfo, 
  formatDateRangeDisplay,
  calculateDateRangeDuration,
  validateCustomDateRange,
  getDefaultCustomDateRange
} from '@/utils/enhancedDateUtils';

interface EnhancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: EnhancedExportConfig) => Promise<void>;
  userRole: 'coo' | 'manager';
  teamName?: string;
}

interface SprintDisplayInfo {
  sprintNumber: number;
  startDate: string;
  endDate: string;
  lengthWeeks: number;
}

export default function EnhancedExportModal({
  isOpen,
  onClose,
  onExport,
  userRole,
  teamName
}: EnhancedExportModalProps) {
  // State management
  const [exportType, setExportType] = useState<EnhancedExportType>('current-week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [includeDetailedSchedule, setIncludeDetailedSchedule] = useState(true);
  const [includeSprintAnalysis, setIncludeSprintAnalysis] = useState(true);
  const [includeReasons, setIncludeReasons] = useState(true);
  const [includeUtilizationAnalysis, setIncludeUtilizationAnalysis] = useState(true);
  const [includeCrossTeamComparison, setIncludeCrossTeamComparison] = useState(true);
  
  // Loading and validation states
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [currentSprint, setCurrentSprint] = useState<SprintDisplayInfo | null>(null);
  const [dateRangePreview, setDateRangePreview] = useState<string>('');
  const [dateValidation, setDateValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });

  // Define functions first
  const loadSprintInfo = async () => {
    try {
      const sprint = await getCurrentSprintInfo();
      if (sprint) {
        setCurrentSprint({
          sprintNumber: sprint.sprintNumber,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          lengthWeeks: sprint.lengthWeeks
        });
      }
    } catch (error) {
      console.error('Error loading sprint info:', error);
    }
  };

  const setDefaultDates = () => {
    const defaultRange = getDefaultCustomDateRange();
    setCustomStartDate(defaultRange.startDate);
    setCustomEndDate(defaultRange.endDate);
  };

  const updateDateRangePreview = useCallback(async () => {
    try {
      if (exportType === 'custom-range' && (!customStartDate || !customEndDate)) {
        setDateRangePreview('Please select both start and end dates');
        return;
      }

      const dateRange = await getEnhancedExportDateRange(exportType, customStartDate, customEndDate);
      const duration = calculateDateRangeDuration(dateRange.start, dateRange.end);
      setDateRangePreview(`${formatDateRangeDisplay(dateRange.start, dateRange.end)} • ${duration}`);
    } catch (error) {
      setDateRangePreview(error instanceof Error ? error.message : 'Error calculating date range');
    }
  }, [exportType, customStartDate, customEndDate]);

  // Initialize component
  useEffect(() => {
    if (isOpen) {
      loadSprintInfo();
      setDefaultDates();
      setExportError(null);
    }
  }, [isOpen]);

  // Update date range preview when dates change
  useEffect(() => {
    updateDateRangePreview();
  }, [updateDateRangePreview]);

  // Validate custom date range
  useEffect(() => {
    if (exportType === 'custom-range') {
      const validation = validateCustomDateRange(customStartDate, customEndDate);
      setDateValidation(validation);
    } else {
      setDateValidation({ isValid: true });
    }
  }, [exportType, customStartDate, customEndDate]);

  const handleExport = async () => {
    if (!dateValidation.isValid) {
      setExportError(dateValidation.error || 'Invalid date range');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const config: EnhancedExportConfig = {
        exportType,
        customStartDate: exportType === 'custom-range' ? customStartDate : undefined,
        customEndDate: exportType === 'custom-range' ? customEndDate : undefined,
        includeDetailedSchedule,
        includeSprintAnalysis: includeSprintAnalysis && (exportType.includes('sprint') || exportType === 'complete-overview'),
        includeReasons,
        includeUtilizationAnalysis,
        includeCrossTeamComparison: userRole === 'coo' ? includeCrossTeamComparison : false
      };

      await onExport(config);
      onClose();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const isExportDisabled = () => {
    if (isExporting) return true;
    if (exportType === 'custom-range' && (!customStartDate || !customEndDate)) return true;
    if (!dateValidation.isValid) return true;
    if ((exportType === 'current-sprint' || exportType === 'previous-sprint') && !currentSprint) return true;
    return false;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            📊 {userRole === 'coo' ? 'Executive' : 'Team'} Export Options
            {teamName && userRole === 'manager' && (
              <span className="text-sm font-normal text-gray-600 block">Team: {teamName}</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Type Selection */}
        <div className="mb-6">
          <label className="block text-base font-medium text-gray-700 mb-3">
            Export Type
          </label>
          <div className="space-y-3">
            {/* Current Week */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="current-week"
                checked={exportType === 'current-week'}
                onChange={(e) => setExportType(e.target.value as EnhancedExportType)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">Current Sprint</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Sunday to Thursday (current sprint)</p>
              </div>
            </label>

            {/* Current Sprint */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="current-sprint"
                checked={exportType === 'current-sprint'}
                onChange={(e) => setExportType(e.target.value as EnhancedExportType)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={!currentSprint}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-900">Current Sprint</span>
                  {!currentSprint && <span className="text-xs text-red-500">(Not Available)</span>}
                </div>
                {currentSprint ? (
                  <p className="text-sm text-gray-500 mt-1">
                    Sprint {currentSprint.sprintNumber} ({formatDateRangeDisplay(currentSprint.startDate, currentSprint.endDate)})
                  </p>
                ) : (
                  <p className="text-sm text-red-500 mt-1">No active sprint found. Please set up sprint settings.</p>
                )}
              </div>
            </label>

            {/* Previous Sprint */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="previous-sprint"
                checked={exportType === 'previous-sprint'}
                onChange={(e) => setExportType(e.target.value as EnhancedExportType)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                disabled={!currentSprint}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-gray-900">Previous Sprint</span>
                  {!currentSprint && <span className="text-xs text-red-500">(Not Available)</span>}
                </div>
                {currentSprint ? (
                  <p className="text-sm text-gray-500 mt-1">Last completed sprint period</p>
                ) : (
                  <p className="text-sm text-red-500 mt-1">Sprint settings required for previous sprint calculation.</p>
                )}
              </div>
            </label>

            {/* Custom Range */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="custom-range"
                checked={exportType === 'custom-range'}
                onChange={(e) => setExportType(e.target.value as EnhancedExportType)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-900">Custom Date Range</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Choose your own start and end dates</p>
              </div>
            </label>

            {/* Complete Overview (COO only) */}
            {userRole === 'coo' && (
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="complete-overview"
                  checked={exportType === 'complete-overview'}
                  onChange={(e) => setExportType(e.target.value as EnhancedExportType)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-gray-900">Complete Overview</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Comprehensive 4-week company analysis</p>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {exportType === 'custom-range' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Custom Date Range</h4>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Date Range Validation */}
            {!dateValidation.isValid && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>{dateValidation.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Date Range Preview */}
        {dateRangePreview && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Export Period:</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{dateRangePreview}</p>
          </div>
        )}

        {/* Export Options */}
        <div className="mb-6">
          <label className="block text-base font-medium text-gray-700 mb-3">
            Include in Export
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDetailedSchedule}
                onChange={(e) => setIncludeDetailedSchedule(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">📋 Team member details and daily schedules</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeUtilizationAnalysis}
                onChange={(e) => setIncludeUtilizationAnalysis(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">📊 Weekly and total hours calculations</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReasons}
                onChange={(e) => setIncludeReasons(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">💬 Absence reasons and explanations</span>
            </label>
            
            {(exportType.includes('sprint') || exportType === 'complete-overview') && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSprintAnalysis}
                  onChange={(e) => setIncludeSprintAnalysis(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">📈 Sprint analysis and capacity metrics</span>
              </label>
            )}
            
            {userRole === 'coo' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCrossTeamComparison}
                  onChange={(e) => setIncludeCrossTeamComparison(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">🏢 Cross-team comparison and recommendations</span>
              </label>
            )}
          </div>
        </div>

        {/* Error Display */}
        {exportError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-800">Export Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{exportError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExportDisabled()}
            className="flex-1 px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>📥 Generate Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}