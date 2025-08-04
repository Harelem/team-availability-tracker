'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Settings, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { canManageSprints } from '@/utils/permissions';
import EnhancedManagerExportButton from './EnhancedManagerExportButton';

interface CompactHeaderBarProps {
  currentUser: TeamMember;
  selectedTeam: Team;
  teamMembers: TeamMember[];
  scheduleData: any;
  currentWeekOffset: number;
  currentWeekDays: Date[];
  onWeekChange: (offset: number) => void;
  onViewReasons: () => void;
  onSprintSettings: () => void;
  getCurrentWeekString: () => string;
  getTeamTotalHours: () => number;
}

export default function CompactHeaderBar({
  currentUser,
  selectedTeam,
  teamMembers,
  scheduleData,
  currentWeekOffset,
  currentWeekDays,
  onWeekChange,
  onViewReasons,
  onSprintSettings,
  getCurrentWeekString,
  getTeamTotalHours
}: CompactHeaderBarProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const { currentSprint } = useGlobalSprint();

  // Calculate sprint completion percentage
  const getSprintCompletion = () => {
    if (!currentSprint) return 0;
    
    const totalHours = getTeamTotalHours();
    const targetHours = currentSprint.targetHours || (teamMembers.length * 35); // 35h per person default
    
    return Math.min(Math.round((totalHours / targetHours) * 100), 100);
  };

  const sprintCompletion = getSprintCompletion();
  const sprintStatus = sprintCompletion >= 90 ? 'excellent' : sprintCompletion >= 70 ? 'good' : 'needs-attention';

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      {/* Main Header Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Essential Info */}
          <div className="flex items-center gap-4">
            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onWeekChange(currentWeekOffset - 1)}
                className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm touch-target"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              
              {currentWeekOffset !== 0 && (
                <button
                  onClick={() => onWeekChange(0)}
                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm touch-target"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Current</span>
                </button>
              )}
              
              <button
                onClick={() => onWeekChange(currentWeekOffset + 1)}
                className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm touch-target"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week Info */}
            <div className="hidden md:block">
              <div className="text-sm font-medium text-gray-900">
                {getCurrentWeekString()}
              </div>
              <div className="text-xs text-gray-500">
                {teamMembers.length} members • {getTeamTotalHours()}h total
              </div>
            </div>
          </div>

          {/* Center: Team Details Toggle (visible on larger screens) */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Details
              {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Sprint Settings - Only for Harel Mazan */}
            {canManageSprints(currentUser) && (
              <button 
                onClick={onSprintSettings}
                className="flex items-center gap-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm touch-target"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Sprint</span>
              </button>
            )}
            
            {/* Manager Buttons */}
            {currentUser.isManager && (
              <>
                <button 
                  onClick={onViewReasons}
                  className="flex items-center gap-1 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm touch-target"
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Reasons</span>
                </button>
                
                <EnhancedManagerExportButton
                  currentUser={currentUser}
                  teamMembers={teamMembers}
                  selectedTeam={selectedTeam}
                  scheduleData={scheduleData}
                  currentWeekDays={currentWeekDays}
                />
              </>
            )}
          </div>
        </div>

        {/* Mobile Week Info */}
        <div className="md:hidden mt-2 text-center">
          <div className="text-sm font-medium text-gray-900">
            {getCurrentWeekString()}
          </div>
          <div className="text-xs text-gray-500">
            {teamMembers.length} members • {getTeamTotalHours()}h total
          </div>
        </div>
      </div>

      {/* Expandable Details Section */}
      {isDetailsExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sprint Information */}
            {currentSprint && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Sprint Details</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Progress:</span>
                    <span className={`font-bold ${
                      sprintStatus === 'excellent' ? 'text-green-600' :
                      sprintStatus === 'good' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {sprintCompletion}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Hours:</span>
                    <span className="font-medium">{getTeamTotalHours()}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">{currentSprint.targetHours || (teamMembers.length * 35)}h</span>
                  </div>
                </div>
              </div>
            )}

            {/* Team Status */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Team Status</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Members:</span>
                  <span className="font-medium">{teamMembers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active This Week:</span>
                  <span className="font-medium">
                    {teamMembers.filter(member => {
                      const memberData = scheduleData[member.id] || {};
                      return Object.keys(memberData).length > 0;
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Hours/Person:</span>
                  <span className="font-medium">
                    {teamMembers.length > 0 ? Math.round(getTeamTotalHours() / teamMembers.length) : 0}h
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Week Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Week of:</span>
                  <span className="font-medium">{getCurrentWeekString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    currentWeekOffset === 0 ? 'text-blue-600' :
                    currentWeekOffset < 0 ? 'text-gray-600' : 'text-purple-600'
                  }`}>
                    {currentWeekOffset === 0 ? 'Current' :
                     currentWeekOffset < 0 ? 'Past' : 'Future'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Capacity:</span>
                  <span className="font-medium">{teamMembers.length * 35}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}