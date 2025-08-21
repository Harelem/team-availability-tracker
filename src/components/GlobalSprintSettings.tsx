'use client';

import { useState } from 'react';
import { X, Settings, Play, Calendar, Clock, AlertTriangle, Edit } from 'lucide-react';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import SprintDateEditor from './SprintDateEditor';

interface GlobalSprintSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSprintSettings({ isOpen, onClose }: GlobalSprintSettingsProps) {
  const { currentSprint, updateSprintSettings, startNewSprint, updateSprintDates, isLoading } = useGlobalSprint();
  const [newSprintLength, setNewSprintLength] = useState(1);
  const [isStartingNewSprint, setIsStartingNewSprint] = useState(false);
  const [showDateEditor, setShowDateEditor] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleUpdateSprintLength = async () => {
    if (!currentSprint || newSprintLength === currentSprint.sprint_length_weeks) {
      return;
    }

    const success = await updateSprintSettings({
      sprint_length_weeks: newSprintLength
    });

    if (success) {
      alert('Sprint length updated successfully!');
    } else {
      alert('Failed to update sprint length. Please try again.');
    }
  };

  const handleStartNewSprint = async () => {
    const confirmMessage = `Are you sure you want to start a new ${newSprintLength}-week sprint? This will end the current sprint and start fresh from today.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsStartingNewSprint(true);
    
    const success = await startNewSprint(newSprintLength);
    
    if (success) {
      alert('New sprint started successfully!');
      onClose();
    } else {
      alert('Failed to start new sprint. Please try again.');
    }
    
    setIsStartingNewSprint(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Global Sprint Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Sprint Info */}
              {currentSprint && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Current Sprint
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">Sprint Number:</span>
                      <div className="font-semibold text-blue-900">#{currentSprint.current_sprint_number}</div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Length:</span>
                      <div className="font-semibold text-blue-900">
                        {currentSprint.sprint_length_weeks} week{currentSprint.sprint_length_weeks !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Start Date:</span>
                      <div className="font-semibold text-blue-900">{formatDate(currentSprint.sprint_start_date)}</div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">End Date:</span>
                      <div className="font-semibold text-blue-900">{formatDate(currentSprint.sprint_end_date)}</div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Progress:</span>
                      <div className="font-semibold text-blue-900">{currentSprint.progress_percentage}%</div>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Days Remaining:</span>
                      <div className="font-semibold text-blue-900">
                        {currentSprint.days_remaining} day{currentSprint.days_remaining !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  {/* Edit Dates Button */}
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <button
                      onClick={() => setShowDateEditor(true)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Sprint Dates
                    </button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentSprint.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sprint Length Settings */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Sprint Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sprint Length (weeks)
                    </label>
                    <select
                      value={newSprintLength}
                      onChange={(e) => setNewSprintLength(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1 week</option>
                      <option value={2}>2 weeks</option>
                      <option value={3}>3 weeks</option>
                      <option value={4}>4 weeks</option>
                    </select>
                  </div>
                  
                  {currentSprint && newSprintLength !== currentSprint.sprint_length_weeks && (
                    <button
                      onClick={handleUpdateSprintLength}
                      disabled={isLoading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Update Current Sprint Length
                    </button>
                  )}
                </div>
              </div>

              {/* Start New Sprint */}
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Start New Sprint
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <strong>Warning:</strong> Starting a new sprint will end the current sprint immediately 
                        and begin a new {newSprintLength}-week sprint starting today. This action cannot be undone.
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleStartNewSprint}
                    disabled={isLoading || isStartingNewSprint}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isStartingNewSprint ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Starting New Sprint...
                      </span>
                    ) : (
                      `Start New ${newSprintLength}-Week Sprint`
                    )}
                  </button>
                </div>
              </div>

              {/* Admin Info */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-800">
                  <strong>Administrator Access:</strong> These settings affect all teams globally. 
                  Sprint changes apply to the entire organization and will be visible to all users.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Sprint Date Editor Modal */}
      {currentSprint && (
        <SprintDateEditor
          isOpen={showDateEditor}
          onClose={() => setShowDateEditor(false)}
          currentSprint={currentSprint}
          onUpdateDates={updateSprintDates}
        />
      )}
    </div>
  );
}