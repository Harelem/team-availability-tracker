'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Bell,
  ExternalLink,
  Video,
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Mail,
  Phone
} from 'lucide-react';

import { TeamDetailModalProps, DetailedTeamMember, MemberFilterOptions } from '@/types/modalTypes';
import { useTeamDetail } from '@/hooks/useTeamDetail';
import { useTeamActions, useFileDownload, useNotificationActions } from '@/hooks/useTeamActions';
import { useModalKeyboard } from '@/hooks/useModalKeyboard';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { formatHours, formatPercentage } from '@/lib/calculationService';

/**
 * Comprehensive Team Detail Modal Component
 * Displays detailed team information with 6 main sections
 */
export default function TeamDetailModal({ teamId, isOpen, onClose }: TeamDetailModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [memberFilters, setMemberFilters] = useState<MemberFilterOptions>({
    status: 'all',
    role: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const isMobile = useMobileDetection();
  const { data, loading, error, refetch } = useTeamDetail(teamId);
  const { exportTeamData, sendReminders, navigateToTeamDashboard, scheduleMeeting, loading: actionsLoading } = useTeamActions(teamId);
  const { downloadFile } = useFileDownload();
  const { showSuccessNotification, showErrorNotification } = useNotificationActions();
  
  const { modalRef } = useModalKeyboard(isOpen, onClose, {
    trapFocus: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
    restoreFocus: true
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedMembers([]);
      setMemberFilters({
        status: 'all',
        role: 'all',
        sortBy: 'name',
        sortOrder: 'asc'
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle member selection
  const handleMemberSelect = (memberId: number, selected: boolean) => {
    if (selected) {
      setSelectedMembers(prev => [...prev, memberId]);
    } else {
      setSelectedMembers(prev => prev.filter(id => id !== memberId));
    }
  };

  const handleSelectAllMembers = () => {
    if (!data?.members) return;
    const allMemberIds = data.members.map(member => member.id);
    setSelectedMembers(allMemberIds);
  };

  const handleDeselectAllMembers = () => {
    setSelectedMembers([]);
  };

  // Filter and sort members
  const getFilteredMembers = () => {
    if (!data?.members) return [];

    let filtered = [...data.members];

    // Apply filters
    if (memberFilters.status !== 'all') {
      filtered = filtered.filter(member => member.currentWeekStatus === memberFilters.status);
    }

    if (memberFilters.role !== 'all') {
      filtered = filtered.filter(member => 
        memberFilters.role === 'manager' ? member.isManager : !member.isManager
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (memberFilters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'completion':
          aValue = a.individualCompletionPercentage;
          bValue = b.individualCompletionPercentage;
          break;
        case 'hours':
          aValue = a.currentWeekHours;
          bValue = b.currentWeekHours;
          break;
        case 'activity':
          aValue = new Date(a.lastActivityTimestamp || 0).getTime();
          bValue = new Date(b.lastActivityTimestamp || 0).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return memberFilters.sortOrder === 'asc' ? comparison : -comparison;
      } else {
        return memberFilters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return filtered;
  };

  // Action handlers
  const handleExport = async (format: 'csv' | 'excel') => {
    const result = await exportTeamData(format);
    if (result.success && result.downloadUrl && result.filename) {
      const success = downloadFile(result.downloadUrl, result.filename);
      if (success) {
        showSuccessNotification(`Team data exported successfully as ${format.toUpperCase()}`);
      } else {
        showErrorNotification('Failed to download exported file');
      }
    } else {
      showErrorNotification(result.error || 'Export failed');
    }
  };

  const handleSendReminders = async () => {
    if (selectedMembers.length === 0) {
      showErrorNotification('Please select team members to send reminders to');
      return;
    }

    const result = await sendReminders(selectedMembers);
    if (result.success) {
      showSuccessNotification(`Reminders sent to ${result.sentCount} team members`);
      if (result.failedCount > 0) {
        showErrorNotification(`${result.failedCount} reminders failed to send`);
      }
    } else {
      showErrorNotification(result.error || 'Failed to send reminders');
    }
  };

  const handleNavigateToDashboard = async () => {
    const result = await navigateToTeamDashboard();
    if (result.success) {
      onClose();
    } else {
      showErrorNotification(result.error || 'Navigation failed');
    }
  };

  const handleScheduleMeeting = async () => {
    if (selectedMembers.length === 0) {
      showErrorNotification('Please select team members for the meeting');
      return;
    }

    const result = await scheduleMeeting(selectedMembers);
    if (result.success) {
      showSuccessNotification('Meeting scheduled successfully');
      onClose();
    } else {
      showErrorNotification(result.error || 'Failed to schedule meeting');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto ${
          isMobile ? 'max-w-sm' : 'max-w-6xl'
        }`}
      >
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading team details...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Error Loading Team Details</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                  <button
                    onClick={refetch}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {data && !loading && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
                  {data.teamInfo.name}
                </h2>
                <p className="text-gray-600 mt-1">
                  Team Details & Current Sprint Status
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Section 1: Team Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      Team Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {data.teamInfo.name}</p>
                      {data.teamInfo.description && (
                        <p><span className="font-medium">Description:</span> {data.teamInfo.description}</p>
                      )}
                      <p><span className="font-medium">Members:</span> {data.teamInfo.memberCount}</p>
                      {data.teamInfo.managerName && (
                        <p><span className="font-medium">Manager:</span> {data.teamInfo.managerName}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-green-600" />
                      Current Sprint
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Sprint #{data.currentSprint.sprintNumber}</span></p>
                      <p><span className="font-medium">Duration:</span> {data.currentSprint.lengthWeeks} weeks</p>
                      <p><span className="font-medium">Days Remaining:</span> {data.currentSprint.daysRemaining}</p>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Status:</span>
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${data.currentSprint.healthColor}20`,
                            color: data.currentSprint.healthColor
                          }}
                        >
                          {data.currentSprint.healthStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                      Quick Stats
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Potential:</span> {formatHours(data.currentSprint.potentialHours)}</p>
                      <p><span className="font-medium">Planned:</span> {formatHours(data.currentSprint.plannedHours)}</p>
                      <p><span className="font-medium">Completion:</span> {formatPercentage(data.currentSprint.completionPercentage)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, data.currentSprint.completionPercentage)}%`,
                            backgroundColor: data.currentSprint.healthColor
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Team Members Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Team Members ({data.members.length})
                  </h3>
                  
                  {/* Member Controls */}
                  <div className="flex items-center space-x-2 text-sm">
                    <button
                      onClick={handleSelectAllMembers}
                      className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAllMembers}
                      className="px-3 py-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                    >
                      Clear
                    </button>
                    <span className="text-gray-500">
                      ({selectedMembers.length} selected)
                    </span>
                  </div>
                </div>

                {/* Member Filters */}
                <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <select
                    value={memberFilters.status}
                    onChange={(e) => setMemberFilters(prev => ({ ...prev, status: e.target.value as any }))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="partial">Partial</option>
                    <option value="unavailable">Unavailable</option>
                  </select>

                  <select
                    value={memberFilters.sortBy}
                    onChange={(e) => setMemberFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="completion">Sort by Completion</option>
                    <option value="hours">Sort by Hours</option>
                    <option value="activity">Sort by Activity</option>
                  </select>

                  <select
                    value={memberFilters.sortOrder}
                    onChange={(e) => setMemberFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>

                {/* Members List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFilteredMembers().map((member) => (
                    <div
                      key={member.id}
                      className={`p-4 border rounded-lg transition-all ${
                        selectedMembers.includes(member.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) => handleMemberSelect(member.id, e.target.checked)}
                            className="mr-3 h-4 w-4 text-blue-600"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.hebrew}</p>
                          </div>
                        </div>
                        {member.isManager && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            Manager
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: member.availabilityColor }}
                            />
                            <span className="capitalize">{member.currentWeekStatus}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>This Week:</span>
                          <span>{formatHours(member.currentWeekHours)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Sprint Progress:</span>
                          <span>{formatPercentage(member.individualCompletionPercentage)}</span>
                        </div>

                        {member.lastActivityTimestamp && (
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Last Activity:</span>
                            <span>{new Date(member.lastActivityTimestamp).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Team Statistics */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-green-600" />
                  Team Statistics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPercentage(data.statistics.averageUtilization)}
                    </div>
                    <div className="text-sm text-gray-600">Average Utilization</div>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {data.statistics.mostProductiveDay}
                    </div>
                    <div className="text-sm text-gray-600">Most Productive Day</div>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 flex items-center justify-center">
                      #{data.statistics.comparisonToOtherTeams.rank}
                      {data.statistics.trendIndicator === 'improving' ? (
                        <TrendingUp className="w-5 h-5 ml-1 text-green-500" />
                      ) : data.statistics.trendIndicator === 'declining' ? (
                        <TrendingDown className="w-5 h-5 ml-1 text-red-500" />
                      ) : (
                        <div className="w-5 h-5 ml-1 bg-gray-400 rounded-full" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Team Ranking</div>
                  </div>

                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {data.statistics.topAbsenceReasons[0]?.reason || 'None'}
                    </div>
                    <div className="text-sm text-gray-600">Top Absence Reason</div>
                  </div>
                </div>

                {/* Trend Indicator */}
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Performance Trend:</span>
                    <div className="flex items-center">
                      {data.statistics.trendIndicator === 'improving' ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : data.statistics.trendIndicator === 'declining' ? (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      ) : (
                        <div className="w-4 h-4 bg-gray-400 rounded-full mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        data.statistics.trendIndicator === 'improving' ? 'text-green-600' :
                        data.statistics.trendIndicator === 'declining' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {data.statistics.trendIndicator.charAt(0).toUpperCase() + data.statistics.trendIndicator.slice(1)}
                        {data.statistics.trendPercentage > 0 && ` (${formatPercentage(data.statistics.trendPercentage)})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-orange-600" />
                  Recent Activity
                </h3>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {data.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mr-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: activity.color }}
                        >
                          {activity.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        {activity.details && (
                          <p className="text-sm text-gray-600">{activity.details}</p>
                        )}
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          {activity.userName && <span>{activity.userName} • </span>}
                          <span>{new Date(activity.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pending Entries */}
                {data.pendingEntries.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
                      Pending Items ({data.pendingEntries.length})
                    </h4>
                    <div className="space-y-2">
                      {data.pendingEntries.slice(0, 3).map((entry, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded">
                          <div>
                            <p className="text-sm font-medium text-amber-900">{entry.memberName}</p>
                            <p className="text-xs text-amber-700">{entry.description}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            entry.priority === 'high' ? 'bg-red-100 text-red-800' :
                            entry.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Action Panel */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={handleNavigateToDashboard}
                    disabled={actionsLoading}
                    className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Dashboard
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={actionsLoading}
                      className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </button>
                  </div>

                  <button
                    onClick={handleSendReminders}
                    disabled={actionsLoading || selectedMembers.length === 0}
                    className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Send Reminders
                  </button>

                  <button
                    onClick={handleScheduleMeeting}
                    disabled={actionsLoading || selectedMembers.length === 0}
                    className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </button>
                </div>

                {selectedMembers.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {selectedMembers.length} team member{selectedMembers.length !== 1 ? 's' : ''} selected for actions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}