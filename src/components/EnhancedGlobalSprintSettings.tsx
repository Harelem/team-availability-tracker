/**
 * Enhanced Global Sprint Settings Component
 * Complete sprint configuration interface for COO
 * Supports the new sprint-based system with working days calculation
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Settings, 
  Play, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Edit,
  CheckCircle,
  Info,
  TrendingUp,
  Users,
  CalendarDays
} from 'lucide-react';
import { SprintLogic } from '@/utils/sprintLogic';
import { enhancedDatabaseService } from '@/lib/enhancedDatabaseService';

interface EnhancedGlobalSprintSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onSprintCreated?: (sprint: any) => void;
}

interface SprintPreview {
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  maxHours: number;
  managerMaxHours: number;
  workingDaysBreakdown: { week: number; days: number }[];
}

export default function EnhancedGlobalSprintSettings({ 
  isOpen, 
  onClose, 
  currentUser,
  onSprintCreated 
}: EnhancedGlobalSprintSettingsProps) {
  
  // State management
  const [loading, setLoading] = useState(false);
  const [currentSprint, setCurrentSprint] = useState<any>(null);
  const [formData, setFormData] = useState({
    sprintLength: 2,
    startDate: new Date(),
    customEndDate: null as Date | null,
    notes: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Load current sprint data
  useEffect(() => {
    if (isOpen) {
      loadCurrentSprint();
    }
  }, [isOpen]);

  const loadCurrentSprint = async () => {
    setLoading(true);
    try {
      const sprint = await enhancedDatabaseService.getCurrentSprint();
      setCurrentSprint(sprint);
      
      if (sprint) {
        // Set next sprint number
        setFormData(prev => ({
          ...prev,
          sprintLength: sprint.sprint_length_weeks || 2
        }));
      }
    } catch (error) {
      console.error('Error loading current sprint:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate sprint preview
  const sprintPreview = useMemo((): SprintPreview => {
    const startDate = formData.startDate;
    const endDate = formData.customEndDate || 
      SprintLogic.calculateSprintEndDate(startDate, formData.sprintLength);
    
    const sprintDays = SprintLogic.getWorkingDays(startDate, endDate);
    const workingDays = sprintDays.filter(day => day.isWorkingDay);
    const weekendDays = sprintDays.filter(day => day.isWeekend);
    const capacity = SprintLogic.calculateSprintCapacity(workingDays.length);
    
    // Group working days by week for breakdown
    const weeks = SprintLogic.groupSprintDaysByWeek(workingDays);
    const workingDaysBreakdown = weeks.map((week, index) => ({
      week: index + 1,
      days: week.filter(day => day.isWorkingDay).length
    }));

    return {
      totalDays: sprintDays.length,
      workingDays: workingDays.length,
      weekendDays: weekendDays.length,
      maxHours: capacity.maxHours,
      managerMaxHours: capacity.managerMaxHours,
      workingDaysBreakdown
    };
  }, [formData.sprintLength, formData.startDate, formData.customEndDate]);

  // Validate sprint configuration
  useEffect(() => {
    const startDate = formData.startDate;
    const endDate = formData.customEndDate || 
      SprintLogic.calculateSprintEndDate(startDate, formData.sprintLength);
    
    const validation = SprintLogic.validateSprintConfig(startDate, endDate, formData.sprintLength);
    setErrors(validation.errors);
    setWarnings(validation.warnings);
  }, [formData]);

  // Handle form changes
  const handleSprintLengthChange = (weeks: number) => {
    setFormData(prev => ({
      ...prev,
      sprintLength: weeks,
      customEndDate: null // Reset custom end date when changing length
    }));
  };

  const handleStartDateChange = (date: string) => {
    setFormData(prev => ({
      ...prev,
      startDate: new Date(date),
      customEndDate: null // Reset custom end date when changing start date
    }));
  };

  const handleEndDateChange = (date: string) => {
    setFormData(prev => ({
      ...prev,
      customEndDate: new Date(date)
    }));
  };

  const handleNotesChange = (notes: string) => {
    setFormData(prev => ({
      ...prev,
      notes
    }));
  };

  // Create new sprint
  const handleCreateSprint = async () => {
    if (errors.length > 0) {
      return;
    }

    const confirmMessage = `Are you sure you want to start a new ${formData.sprintLength}-week sprint?\n\nThis will:\n- End the current sprint immediately\n- Start fresh sprint tracking\n- Auto-generate weekend entries for all team members\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsCreating(true);
    
    try {
      const nextSprintNumber = (currentSprint?.sprint_number || 0) + 1;
      const endDate = formData.customEndDate || 
        SprintLogic.calculateSprintEndDate(formData.startDate, formData.sprintLength);

      const newSprint = await enhancedDatabaseService.createSprint({
        sprint_number: nextSprintNumber,
        start_date: formData.startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        length_weeks: formData.sprintLength,
        notes: formData.notes,
        created_by: currentUser?.name || 'COO'
      });

      // Auto-generate weekend entries
      await enhancedDatabaseService.autoGenerateWeekendEntries(newSprint.id);

      alert(`✅ Sprint ${nextSprintNumber} created successfully!\n\n${sprintPreview.workingDays} working days planned\n${sprintPreview.weekendDays} weekend days auto-filled`);
      
      if (onSprintCreated) {
        onSprintCreated(newSprint);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating sprint:', error);
      alert(`❌ Failed to create sprint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Settings className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Sprint Configuration Center</h2>
                <p className="text-blue-100 mt-1">Configure sprint duration and working days for all teams</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading sprint data...</span>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Current Sprint Info */}
              {currentSprint && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-blue-900">Current Sprint</h3>
                    <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full font-medium">
                      Active
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">#{currentSprint.sprint_number}</div>
                      <div className="text-sm text-blue-700 font-medium">Sprint Number</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{currentSprint.length_weeks}</div>
                      <div className="text-sm text-blue-700 font-medium">Week{currentSprint.length_weeks !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{currentSprint.working_days_count}</div>
                      <div className="text-sm text-blue-700 font-medium">Working Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">{currentSprint.days_remaining}</div>
                      <div className="text-sm text-blue-700 font-medium">Days Left</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-700">Sprint Progress</span>
                      <span className="text-sm font-bold text-blue-900">{currentSprint.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${currentSprint.progress_percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-blue-600 mt-1">
                      <span>{formatDate(new Date(currentSprint.start_date))}</span>
                      <span>{formatDate(new Date(currentSprint.end_date))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sprint Length Selector */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  New Sprint Configuration
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(weeks => (
                    <button
                      key={weeks}
                      onClick={() => handleSprintLengthChange(weeks)}
                      className={`p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                        formData.sprintLength === weeks
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-2">{weeks}</div>
                        <div className="text-sm text-gray-600 mb-1">Week{weeks !== 1 ? 's' : ''}</div>
                        <div className="text-xs text-gray-500">{weeks * 5} working days</div>
                        <div className="text-xs text-gray-500 mt-1">{weeks * 7 * 5} total hours</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Configuration */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">
                    Sprint Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate.toISOString().split('T')[0]}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500">
                    Sprint will start on {SprintLogic.getDayName(formData.startDate)}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">
                    Sprint End Date
                    {!formData.customEndDate && (
                      <span className="text-xs font-normal text-gray-500 ml-1">(Auto-calculated)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={(formData.customEndDate || SprintLogic.calculateSprintEndDate(formData.startDate, formData.sprintLength)).toISOString().split('T')[0]}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500">
                    Includes exactly {sprintPreview.workingDays} working days
                  </p>
                </div>
              </div>

              {/* Sprint Preview */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                  Sprint Preview & Analysis
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{sprintPreview.totalDays}</div>
                    <div className="text-xs text-gray-600">Total Days</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{sprintPreview.workingDays}</div>
                    <div className="text-xs text-gray-600">Working Days</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{sprintPreview.weekendDays}</div>
                    <div className="text-xs text-gray-600">Weekend Days</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{sprintPreview.maxHours}</div>
                    <div className="text-xs text-gray-600">Max Hours</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{sprintPreview.managerMaxHours}</div>
                    <div className="text-xs text-gray-600">Manager Hours</div>
                  </div>
                </div>

                {/* Working Days Breakdown */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Working Days Breakdown:</h5>
                  <div className="flex flex-wrap gap-2">
                    {sprintPreview.workingDaysBreakdown.map((week) => (
                      <div key={week.week} className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                        Week {week.week}: {week.days} days
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekend Auto-Generation Info */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong>Automatic Weekend Handling:</strong> The system will automatically mark all Fridays and Saturdays as unavailable (X) for all team members. This ensures proper work-life balance and accurate capacity calculations.
                    </div>
                  </div>
                </div>
              </div>

              {/* Sprint Notes */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">
                  Sprint Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add any notes about this sprint (goals, special considerations, etc.)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Validation Messages */}
              {(errors.length > 0 || warnings.length > 0) && (
                <div className="space-y-3">
                  {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h4 className="font-medium text-red-800">Configuration Errors</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-medium text-yellow-800">Configuration Warnings</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-yellow-700">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSprint}
                  disabled={isCreating || errors.length > 0}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Sprint...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start New {formData.sprintLength}-Week Sprint
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
