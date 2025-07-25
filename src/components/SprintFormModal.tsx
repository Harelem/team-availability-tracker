'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, X, AlertTriangle, Check, Zap, Target } from 'lucide-react';
import { CreateSprintRequest, SprintHistoryEntry, DatabaseService } from '@/lib/database';

interface SprintTemplate {
  id: string;
  name: string;
  description: string;
  lengthWeeks: number;
  icon: string;
  color: string;
}

interface SprintFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sprintData: CreateSprintRequest) => Promise<void>;
  editingSprint?: SprintHistoryEntry | null;
  prefilledDates?: {
    startDate: string;
    endDate: string;
    lengthWeeks: number;
  };
}

export default function SprintFormModal({
  isOpen,
  onClose,
  onSave,
  editingSprint,
  prefilledDates
}: SprintFormModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    sprint_name: '',
    sprint_start_date: '',
    sprint_end_date: '',
    sprint_length_weeks: 2,
    description: '',
    created_by: 'System'
  });

  // UI state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<SprintHistoryEntry[]>([]);

  // Sprint templates
  const sprintTemplates: SprintTemplate[] = [
    {
      id: '1-week',
      name: '1 Week Sprint',
      description: 'Short sprint for quick iterations',
      lengthWeeks: 1,
      icon: '⚡',
      color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
    },
    {
      id: '2-week',
      name: '2 Week Sprint',
      description: 'Standard sprint duration',
      lengthWeeks: 2,
      icon: '🎯',
      color: 'bg-blue-100 border-blue-300 text-blue-800'
    },
    {
      id: '3-week',
      name: '3 Week Sprint',
      description: 'Extended sprint for complex features',
      lengthWeeks: 3,
      icon: '🚀',
      color: 'bg-green-100 border-green-300 text-green-800'
    },
    {
      id: '4-week',
      name: '4 Week Sprint',
      description: 'Maximum recommended sprint length',
      lengthWeeks: 4,
      icon: '🏆',
      color: 'bg-purple-100 border-purple-300 text-purple-800'
    }
  ];

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingSprint) {
        // Editing existing sprint
        setFormData({
          sprint_name: editingSprint.sprint_name || '',
          sprint_start_date: editingSprint.sprint_start_date,
          sprint_end_date: editingSprint.sprint_end_date,
          sprint_length_weeks: editingSprint.sprint_length_weeks,
          description: editingSprint.description || '',
          created_by: editingSprint.updated_by || 'System'
        });
        setSelectedTemplate(null);
      } else if (prefilledDates) {
        // Creating with pre-selected dates
        setFormData({
          sprint_name: '',
          sprint_start_date: prefilledDates.startDate,
          sprint_end_date: prefilledDates.endDate,
          sprint_length_weeks: prefilledDates.lengthWeeks,
          description: '',
          created_by: 'System'
        });
        
        // Auto-select matching template
        const matchingTemplate = sprintTemplates.find(t => t.lengthWeeks === prefilledDates.lengthWeeks);
        setSelectedTemplate(matchingTemplate?.id || null);
      } else {
        // Creating new sprint from scratch
        const today = new Date();
        const nextSunday = new Date(today);
        nextSunday.setDate(today.getDate() + (7 - today.getDay()));
        
        const endDate = new Date(nextSunday);
        endDate.setDate(nextSunday.getDate() + 13); // 2 week default
        
        setFormData({
          sprint_name: '',
          sprint_start_date: nextSunday.toISOString().split('T')[0],
          sprint_end_date: endDate.toISOString().split('T')[0],
          sprint_length_weeks: 2,
          description: '',
          created_by: 'System'
        });
        setSelectedTemplate('2-week');
      }
      
      // Reset UI state
      setError(null);
      setWarnings([]);
      setValidationErrors([]);
      setConflicts([]);
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingSprint, prefilledDates]);

  // Validate form and check for conflicts
  useEffect(() => {
    if (formData.sprint_start_date && formData.sprint_end_date) {
      validateForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sprint_start_date, formData.sprint_end_date]);

  const validateForm = async () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const startDate = new Date(formData.sprint_start_date);
    const endDate = new Date(formData.sprint_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Basic validation
    if (!formData.sprint_start_date || !formData.sprint_end_date) {
      errors.push('Both start and end dates are required');
    }
    
    if (startDate >= endDate) {
      errors.push('Start date must be before end date');
    }
    
    // Calculate duration
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const durationWeeks = Math.ceil(durationDays / 7);
    
    if (durationDays < 7) {
      errors.push('Sprint must be at least 1 week long');
    }
    
    if (durationDays > 28) {
      errors.push('Sprint cannot be longer than 4 weeks');
    }
    
    // Update calculated sprint length
    if (durationWeeks !== formData.sprint_length_weeks) {
      setFormData(prev => ({ ...prev, sprint_length_weeks: durationWeeks }));
    }
    
    // Date alignment warnings
    if (startDate.getDay() !== 0) {
      warnings.push('Start date is not a Sunday - consider aligning sprints to Sunday-Saturday');
    }
    
    if (endDate.getDay() !== 6) {
      warnings.push('End date is not a Saturday - consider aligning sprints to Sunday-Saturday');
    }
    
    // Past date warnings
    if (startDate < today) {
      warnings.push('Start date is in the past');
    }
    
    // Check for conflicts
    try {
      const { isValid, conflicts: sprintConflicts } = await DatabaseService.validateSprintDateRange(
        formData.sprint_start_date,
        formData.sprint_end_date,
        editingSprint?.id
      );
      
      if (!isValid && sprintConflicts.length > 0) {
        errors.push(`Sprint overlaps with ${sprintConflicts.length} existing sprint(s)`);
        setConflicts(sprintConflicts);
      } else {
        setConflicts([]);
      }
    } catch (err) {
      console.error('Error validating sprint dates:', err);
      warnings.push('Unable to check for sprint conflicts');
    }
    
    setValidationErrors(errors);
    setWarnings(warnings);
  };

  const handleTemplateSelect = (template: SprintTemplate) => {
    setSelectedTemplate(template.id);
    
    if (formData.sprint_start_date) {
      const startDate = new Date(formData.sprint_start_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (template.lengthWeeks * 7) - 1);
      
      setFormData(prev => ({
        ...prev,
        sprint_end_date: endDate.toISOString().split('T')[0],
        sprint_length_weeks: template.lengthWeeks
      }));
    }
  };

  const handleStartDateChange = (newStartDate: string) => {
    setFormData(prev => {
      const startDate = new Date(newStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (prev.sprint_length_weeks * 7) - 1);
      
      return {
        ...prev,
        sprint_start_date: newStartDate,
        sprint_end_date: endDate.toISOString().split('T')[0]
      };
    });
  };

  const handleEndDateChange = (newEndDate: string) => {
    setFormData(prev => ({ ...prev, sprint_end_date: newEndDate }));
    setSelectedTemplate(null); // Clear template selection when manually changing end date
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }
    
    // Confirm if there are warnings
    if (warnings.length > 0 && !editingSprint) {
      const warningMessage = `Are you sure you want to create this sprint?\n\nWarnings:\n${warnings.map(w => `• ${w}`).join('\n')}`;
      if (!confirm(warningMessage)) {
        return;
      }
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sprint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSprintPreview = () => {
    if (!formData.sprint_start_date || !formData.sprint_end_date) return null;
    
    const startDate = new Date(formData.sprint_start_date);
    const endDate = new Date(formData.sprint_end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      durationDays,
      durationWeeks: Math.ceil(durationDays / 7),
      startDay: startDate.toLocaleDateString('en-US', { weekday: 'long' }),
      endDay: endDate.toLocaleDateString('en-US', { weekday: 'long' })
    };
  };

  const sprintPreview = getSprintPreview();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">
              {editingSprint ? 'Edit Sprint' : 'Create New Sprint'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Sprint Templates */}
            {!editingSprint && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Sprint Templates</h3>
                <div className="grid grid-cols-2 gap-3">
                  {sprintTemplates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedTemplate === template.id
                          ? template.color + ' border-current'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{template.icon}</span>
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sprint Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprint Name (Optional)
              </label>
              <input
                type="text"
                value={formData.sprint_name}
                onChange={(e) => setFormData(prev => ({ ...prev, sprint_name: e.target.value }))}
                placeholder="e.g., Feature Development Sprint, Bug Fix Sprint"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.sprint_start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.sprint_end_date}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Sprint Preview */}
            {sprintPreview && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Sprint Preview
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Duration:</span>
                    <div className="text-blue-900">{sprintPreview.durationWeeks} week{sprintPreview.durationWeeks !== 1 ? 's' : ''} ({sprintPreview.durationDays} days)</div>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Days:</span>
                    <div className="text-blue-900">{sprintPreview.startDay} → {sprintPreview.endDay}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Sprint goals, objectives, or notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Sprint Conflicts
                </h4>
                <div className="space-y-1">
                  {conflicts.map(conflict => (
                    <div key={conflict.id} className="text-sm text-red-700">
                      Sprint #{conflict.sprint_number} ({new Date(conflict.sprint_start_date).toLocaleDateString()} - {new Date(conflict.sprint_end_date).toLocaleDateString()})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && validationErrors.length === 0 && (
              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-yellow-800">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Success Indicator */}
            {validationErrors.length === 0 && formData.sprint_start_date && formData.sprint_end_date && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">Sprint dates are valid and ready to save</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || validationErrors.length > 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {editingSprint ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {editingSprint ? <Target className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                {editingSprint ? 'Update Sprint' : 'Create Sprint'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}