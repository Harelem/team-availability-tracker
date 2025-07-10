'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, X, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { CurrentGlobalSprint } from '@/types';

interface SprintDateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentSprint: CurrentGlobalSprint;
  onUpdateDates: (startDate: string, endDate?: string) => Promise<boolean>;
}

export default function SprintDateEditor({
  isOpen,
  onClose,
  currentSprint,
  onUpdateDates
}: SprintDateEditorProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Initialize dates when modal opens
  useEffect(() => {
    if (isOpen && currentSprint) {
      setStartDate(currentSprint.sprint_start_date);
      setEndDate(currentSprint.sprint_end_date);
      setCustomEndDate(false);
      setError(null);
      setWarnings([]);
    }
  }, [isOpen, currentSprint]);

  // Calculate end date based on start date and sprint length
  const calculateEndDate = (start: string, lengthWeeks: number): string => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + (lengthWeeks * 7) - 1);
    return endDateObj.toISOString().split('T')[0];
  };

  // Validate dates and generate warnings
  const validateDates = (start: string, end: string): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const today = new Date().toISOString().split('T')[0];
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const originalStart = new Date(currentSprint.sprint_start_date);
    const originalEnd = new Date(currentSprint.sprint_end_date);

    // Basic validation
    if (!start || !end) {
      errors.push('Both start and end dates are required');
    }

    if (startDateObj >= endDateObj) {
      errors.push('Start date must be before end date');
    }

    // Calculate sprint duration
    const durationDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const durationWeeks = Math.round(durationDays / 7);

    if (durationDays < 7) {
      errors.push('Sprint must be at least 1 week long');
    }

    if (durationDays > 28) {
      errors.push('Sprint cannot be longer than 4 weeks');
    }

    // Warnings for significant changes
    if (startDateObj.getTime() !== originalStart.getTime()) {
      if (start < today) {
        warnings.push('Start date is in the past - this will affect progress calculations');
      }
      if (Math.abs(startDateObj.getTime() - originalStart.getTime()) > 7 * 24 * 60 * 60 * 1000) {
        warnings.push('Start date changed by more than a week - progress percentage will be recalculated');
      }
    }

    if (endDateObj.getTime() !== originalEnd.getTime()) {
      if (end < today) {
        warnings.push('End date is in the past - sprint will show as completed');
      }
      warnings.push('End date change will affect all sprint calculations');
    }

    if (durationWeeks !== currentSprint.sprint_length_weeks) {
      warnings.push(`Sprint duration will change from ${currentSprint.sprint_length_weeks} to ${durationWeeks} weeks`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  };

  // Handle start date change
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    
    if (!customEndDate && newStartDate) {
      // Auto-calculate end date based on current sprint length
      const calculatedEndDate = calculateEndDate(newStartDate, currentSprint.sprint_length_weeks);
      setEndDate(calculatedEndDate);
    }
    
    if (newStartDate && endDate) {
      const validation = validateDates(newStartDate, endDate);
      setError(validation.errors.length > 0 ? validation.errors[0] : null);
      setWarnings(validation.warnings);
    }
  };

  // Handle end date change
  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate);
    setCustomEndDate(true);
    
    if (startDate && newEndDate) {
      const validation = validateDates(startDate, newEndDate);
      setError(validation.errors.length > 0 ? validation.errors[0] : null);
      setWarnings(validation.warnings);
    }
  };

  // Reset to auto-calculated end date
  const resetToAutoEndDate = () => {
    if (startDate) {
      const calculatedEndDate = calculateEndDate(startDate, currentSprint.sprint_length_weeks);
      setEndDate(calculatedEndDate);
      setCustomEndDate(false);
      
      const validation = validateDates(startDate, calculatedEndDate);
      setError(validation.errors.length > 0 ? validation.errors[0] : null);
      setWarnings(validation.warnings);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!startDate || !endDate) return;
    
    const validation = validateDates(startDate, endDate);
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    // Confirm changes if there are warnings
    if (warnings.length > 0) {
      const confirmMessage = `Are you sure you want to update the sprint dates?\n\nWarnings:\n${warnings.map(w => `• ${w}`).join('\n')}`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setIsUpdating(true);
    setError(null);

    try {
      const success = await onUpdateDates(startDate, customEndDate ? endDate : undefined);
      
      if (success) {
        onClose();
      } else {
        setError('Failed to update sprint dates. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate sprint info
  const getSprintInfo = () => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const durationWeeks = Math.round(durationDays / 7);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    let progress = 0;
    let daysRemaining = 0;
    
    if (today >= start && today <= end) {
      const totalDays = durationDays;
      const daysPassed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      progress = Math.round((daysPassed / totalDays) * 100);
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    } else if (today < start) {
      progress = 0;
      daysRemaining = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      progress = 100;
      daysRemaining = 0;
    }
    
    return {
      durationDays,
      durationWeeks,
      progress,
      daysRemaining
    };
  };

  const sprintInfo = getSprintInfo();
  const hasChanges = startDate !== currentSprint.sprint_start_date || endDate !== currentSprint.sprint_end_date;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Edit Sprint Dates</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Current Sprint Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Current Sprint #{currentSprint.current_sprint_number}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Original: {new Date(currentSprint.sprint_start_date).toLocaleDateString()} - {new Date(currentSprint.sprint_end_date).toLocaleDateString()}</div>
              <div>Length: {currentSprint.sprint_length_weeks} week{currentSprint.sprint_length_weeks !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
                {!customEndDate && (
                  <span className="text-xs text-gray-500 ml-1">(auto-calculated)</span>
                )}
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {customEndDate && (
                  <button
                    type="button"
                    onClick={resetToAutoEndDate}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset to auto-calculated
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sprint Preview */}
          {sprintInfo && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Updated Sprint Preview
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Duration:</span>
                  <div className="text-blue-900">{sprintInfo.durationWeeks} week{sprintInfo.durationWeeks !== 1 ? 's' : ''} ({sprintInfo.durationDays} days)</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Progress:</span>
                  <div className="text-blue-900">{sprintInfo.progress}%</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Days Remaining:</span>
                  <div className="text-blue-900">{sprintInfo.daysRemaining} day{sprintInfo.daysRemaining !== 1 ? 's' : ''}</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Status:</span>
                  <div className="text-blue-900">
                    {sprintInfo.progress === 0 ? 'Not Started' : 
                     sprintInfo.progress === 100 ? 'Completed' : 'In Progress'}
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${sprintInfo.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && !error && (
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-yellow-800">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Changes Indicator */}
          {hasChanges && !error && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Sprint dates will be updated</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUpdating || !!error || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                Update Sprint Dates
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}