'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Settings, Plus, BarChart3 } from 'lucide-react';
import { Team, TeamSprint } from '@/types';
import { DatabaseService } from '@/lib/database';

interface SprintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  onSprintUpdate: () => void;
}

export default function SprintSettingsModal({ isOpen, onClose, team, onSprintUpdate }: SprintSettingsModalProps) {
  const [currentSprint, setCurrentSprint] = useState<TeamSprint | null>(null);
  const [sprints, setSprints] = useState<TeamSprint[]>([]);
  const [sprintLength, setSprintLength] = useState(team.sprint_length_weeks || 1);
  const [newSprintStart, setNewSprintStart] = useState('');
  const [newSprintEnd, setNewSprintEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'settings'>('current');

  useEffect(() => {
    if (isOpen) {
      loadSprintData();
    }
  }, [isOpen, team.id]);

  const loadSprintData = async () => {
    setLoading(true);
    try {
      const [current, history] = await Promise.all([
        DatabaseService.getCurrentSprint(team.id),
        DatabaseService.getTeamSprints(team.id)
      ]);
      
      setCurrentSprint(current);
      setSprints(history);
    } catch (error) {
      console.error('Error loading sprint data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSprintLengthUpdate = async () => {
    if (sprintLength === team.sprint_length_weeks) return;
    
    setLoading(true);
    try {
      const success = await DatabaseService.updateTeamSprintLength(team.id, sprintLength);
      if (success) {
        onSprintUpdate();
        alert('Sprint length updated successfully!');
      } else {
        alert('Failed to update sprint length');
      }
    } catch (error) {
      console.error('Error updating sprint length:', error);
      alert('Error updating sprint length');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async () => {
    if (!newSprintStart || !newSprintEnd) {
      alert('Please select both start and end dates');
      return;
    }
    
    const startDate = new Date(newSprintStart);
    const endDate = new Date(newSprintEnd);
    
    if (endDate <= startDate) {
      alert('End date must be after start date');
      return;
    }
    
    setLoading(true);
    try {
      const nextSprintNumber = Math.max(...sprints.map(s => s.sprint_number), 0) + 1;
      const newSprint = await DatabaseService.createSprint(
        team.id,
        nextSprintNumber,
        newSprintStart,
        newSprintEnd
      );
      
      if (newSprint) {
        await loadSprintData();
        setNewSprintStart('');
        setNewSprintEnd('');
        onSprintUpdate();
        alert('New sprint created successfully!');
      } else {
        alert('Failed to create sprint');
      }
    } catch (error) {
      console.error('Error creating sprint:', error);
      alert('Error creating sprint');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getSprintDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Sprint Management - {team.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'current'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Current Sprint
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sprint History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Current Sprint Tab */}
              {activeTab === 'current' && (
                <div className="space-y-6">
                  {currentSprint ? (
                    <div className="bg-blue-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-blue-900">
                          Sprint #{currentSprint.sprint_number}
                        </h3>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          Active
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span className="text-sm text-gray-600">Start:</span>
                          <span className="font-medium">{formatDate(currentSprint.start_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span className="text-sm text-gray-600">End:</span>
                          <span className="font-medium">{formatDate(currentSprint.end_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <span className="text-sm text-gray-600">Duration:</span>
                          <span className="font-medium">
                            {getSprintDuration(currentSprint.start_date, currentSprint.end_date)} days
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-blue-600" />
                          <span className="text-sm text-gray-600">Days Remaining:</span>
                          <span className="font-medium">
                            {getDaysRemaining(currentSprint.end_date)} days
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>
                            {Math.round(
                              ((new Date().getTime() - new Date(currentSprint.start_date).getTime()) /
                                (new Date(currentSprint.end_date).getTime() - new Date(currentSprint.start_date).getTime())) * 100
                            )}%
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, 
                                ((new Date().getTime() - new Date(currentSprint.start_date).getTime()) /
                                  (new Date(currentSprint.end_date).getTime() - new Date(currentSprint.start_date).getTime())) * 100
                              ))}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No current sprint found</p>
                      <p className="text-sm">Create a new sprint to get started</p>
                    </div>
                  )}

                  {/* Create New Sprint */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Create New Sprint
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={newSprintStart}
                          onChange={(e) => setNewSprintStart(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={newSprintEnd}
                          onChange={(e) => setNewSprintEnd(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleCreateSprint}
                      disabled={loading || !newSprintStart || !newSprintEnd}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Create Sprint
                    </button>
                  </div>
                </div>
              )}

              {/* Sprint History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {sprints.length > 0 ? (
                    sprints.map((sprint) => (
                      <div key={sprint.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Sprint #{sprint.sprint_number}</h3>
                          <span className="text-sm text-gray-500">
                            {getSprintDuration(sprint.start_date, sprint.end_date)} days
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No sprint history found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Sprint Configuration</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Sprint Length (weeks)
                        </label>
                        <select
                          value={sprintLength}
                          onChange={(e) => setSprintLength(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={1}>1 week</option>
                          <option value={2}>2 weeks</option>
                          <option value={3}>3 weeks</option>
                          <option value={4}>4 weeks</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={handleSprintLengthUpdate}
                        disabled={loading || sprintLength === team.sprint_length_weeks}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Update Sprint Length
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}