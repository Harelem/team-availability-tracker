'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Save, AlertCircle } from 'lucide-react';
import { DatabaseService } from '@/lib/database';

interface SimplifiedSprintSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSprintUpdated?: () => void;
}

export default function SimplifiedSprintSettings({
  isOpen,
  onClose,
  onSprintUpdated
}: SimplifiedSprintSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSprint, setCurrentSprint] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: ''
  });

  // Load current sprint data
  useEffect(() => {
    if (isOpen) {
      loadCurrentSprint();
    }
  }, [isOpen]);

  const loadCurrentSprint = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sprint = await DatabaseService.getCurrentGlobalSprint();
      
      if (sprint) {
        setCurrentSprint(sprint);
        setFormData({
          startDate: sprint.sprint_start_date?.split('T')[0] || '',
          endDate: sprint.sprint_end_date?.split('T')[0] || ''
        });
      } else {
        // Set default dates for a new sprint
        const today = new Date();
        const twoWeeksLater = new Date(today);
        twoWeeksLater.setDate(today.getDate() + 14);
        
        setFormData({
          startDate: today.toISOString().split('T')[0],
          endDate: twoWeeksLater.toISOString().split('T')[0]
        });
      }
    } catch (err) {
      setError('Failed to load current sprint data');
      console.error('Error loading sprint:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.startDate || !formData.endDate) {
      setError('Please provide both start and end dates');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    
    if (endDate <= startDate) {
      setError('End date must be after start date');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Update sprint dates
      const success = await DatabaseService.updateSprintDates(
        formData.startDate,
        formData.endDate,
        'COO'
      );

      if (success) {
        onSprintUpdated?.();
        onClose();
      } else {
        setError('Failed to update sprint dates');
      }
    } catch (err) {
      setError('Error updating sprint dates');
      console.error('Sprint update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: 'startDate' | 'endDate', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sprint Settings</h2>
            <p className="text-sm text-gray-600">Set sprint start and end dates</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading sprint data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sprint Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sprint End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {currentSprint && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">
                      Current Sprint #{currentSprint.current_sprint_number}
                    </p>
                  </div>
                  <p className="text-xs text-blue-700">
                    Changes will affect all team dashboards and calculations
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Sprint Dates
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}