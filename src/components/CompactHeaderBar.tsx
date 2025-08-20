'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import EnhancedManagerExportButton from './EnhancedManagerExportButton';

interface CompactHeaderBarProps {
  currentUser: TeamMember;
  selectedTeam: Team;
  teamMembers: TeamMember[];
  scheduleData: any;
  currentSprintOffset: number;
  currentSprintDays: Date[];
  onSprintChange: (offset: number) => void;
  onViewReasons: () => void;
  getCurrentSprintString: () => string;
  getTeamTotalHours: () => number;
  // Week navigation props
  navigationMode?: 'sprint' | 'week';
  onNavigationModeChange?: (mode: 'sprint' | 'week') => void;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onCurrentWeek?: () => void;
  getCurrentWeekString?: () => string;
}

export default function CompactHeaderBar({
  currentUser,
  selectedTeam,
  teamMembers,
  scheduleData,
  currentSprintOffset,
  currentSprintDays,
  onSprintChange,
  onViewReasons,
  getCurrentSprintString,
  getTeamTotalHours,
  navigationMode = 'sprint',
  onNavigationModeChange,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  getCurrentWeekString
}: CompactHeaderBarProps) {
  console.log('🚨 CompactHeaderBar RENDERING - Navigation should now be visible!');
  const [isManagerNoticeExpanded, setIsManagerNoticeExpanded] = useState(false);
  const { currentSprint } = useGlobalSprint();

  // Calculate sprint completion percentage
  const getSprintCompletion = () => {
    if (!currentSprint) return 0;
    
    const totalHours = getTeamTotalHours();
    const targetHours = (currentSprint as any)?.targetHours || (teamMembers.length * 35); // 35h per person default
    
    return Math.min(Math.round((totalHours / targetHours) * 100), 100);
  };

  const sprintCompletion = getSprintCompletion();
  const sprintStatus = sprintCompletion >= 90 ? 'excellent' : sprintCompletion >= 70 ? 'good' : 'needs-attention';

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-elevation-2">
      {/* Premium Mobile Header */}
      <div className="px-4 py-4 safe-area-top">
        <div className="flex flex-col gap-4">
          {/* Top Row: Branding & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">☰</span>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Team Availability</h1>
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Manager Buttons */}
              {currentUser.isManager && (
                <>
                  <button 
                    onClick={onViewReasons}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-xl hover:bg-gray-700 active:bg-gray-800 active:scale-95 transition-all duration-200 text-sm touch-target font-medium shadow-elevation-1 hover:shadow-elevation-2"
                  >
                    <span className="text-lg">👤</span>
                    <span className="hidden sm:inline">Reasons</span>
                  </button>
                  
                  <EnhancedManagerExportButton
                    currentUser={currentUser}
                    teamMembers={teamMembers}
                    selectedTeam={selectedTeam}
                    scheduleData={scheduleData}
                    currentSprintDays={currentSprintDays}
                  />
                </>
              )}
              <span className="text-lg">⚙️</span>
            </div>
          </div>

          {/* Manager Mode Notice - Collapsible */}
          {currentUser.isManager && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-elevation-1">
              <button
                onClick={() => setIsManagerNoticeExpanded(!isManagerNoticeExpanded)}
                className="w-full flex items-center justify-between gap-3 touch-target"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👑</span>
                  <div className="text-left">
                    <div className="font-semibold text-blue-800 text-base">Manager Mode: Edit Any Schedule</div>
                    {!isManagerNoticeExpanded && (
                      <div className="text-sm text-blue-600 flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Blue dots = Reasons available</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-blue-600 transition-transform ${isManagerNoticeExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {isManagerNoticeExpanded && (
                <div className="mt-4 space-y-3 animate-slideInFromTop">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Blue dots indicate days with reasons available</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <span className="text-lg">📝</span>
                    <span>Tap any team member's schedule to edit their availability</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <span className="text-lg">📊</span>
                    <span>Export reports using the button in the top-right corner</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Mode Toggle - Enhanced */}
          {onNavigationModeChange && (
            <div className="flex items-center justify-center">
              <div className="bg-gray-100 rounded-2xl p-2 inline-flex shadow-inner border border-gray-200">
                <button
                  onClick={() => onNavigationModeChange('sprint')}
                  className={`px-6 py-3 rounded-xl font-semibold text-base transition-all touch-target ${
                    navigationMode === 'sprint' 
                      ? 'bg-blue-500 text-white shadow-elevation-2 transform scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  📅 Sprint
                </button>
                <button
                  onClick={() => onNavigationModeChange('week')}
                  className={`px-6 py-3 rounded-xl font-semibold text-base transition-all touch-target ${
                    navigationMode === 'week' 
                      ? 'bg-blue-500 text-white shadow-elevation-2 transform scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  📅 Week
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Navigation Controls - Thumb-friendly */}
          <div className="bg-white rounded-2xl shadow-elevation-2 p-3 border border-gray-100">
            <div className="flex items-center justify-between gap-3">
              {navigationMode === 'week' ? (
                // Enhanced Week Navigation
                <>
                  <button
                    onClick={() => {
                      console.log('🔄 Previous Week button clicked in CompactHeaderBar');
                      if (onPreviousWeek) {
                        onPreviousWeek();
                        console.log('✅ onPreviousWeek function called successfully');
                      } else {
                        console.warn('❌ onPreviousWeek function not provided');
                      }
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-4 rounded-xl hover:from-gray-200 hover:to-gray-300 active:scale-95 transition-all touch-target font-medium shadow-sm hover:shadow-md"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-semibold">←</span>
                  </button>
                  
                  <div className="flex-1 text-center px-2">
                    <div className="font-bold text-lg text-gray-900">
                      {getCurrentWeekString ? getCurrentWeekString() : getCurrentSprintString()}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-2 flex-wrap">
                      <span>Week 2 of Sprint 1</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full hidden sm:block"></span>
                      <span className="hidden sm:block">{teamMembers.length} members • {getTeamTotalHours()}h total</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      console.log('🔄 Current Week button clicked in CompactHeaderBar');
                      if (onCurrentWeek) {
                        onCurrentWeek();
                        console.log('✅ onCurrentWeek function called successfully');
                      } else {
                        console.warn('❌ onCurrentWeek function not provided');
                      }
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all touch-target font-medium shadow-brand-glow"
                    title="Go to Current Week"
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm font-semibold">📅 Today</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('🔄 Next Week button clicked in CompactHeaderBar');
                      if (onNextWeek) {
                        onNextWeek();
                        console.log('✅ onNextWeek function called successfully');
                      } else {
                        console.warn('❌ onNextWeek function not provided');
                      }
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-4 rounded-xl hover:from-gray-200 hover:to-gray-300 active:scale-95 transition-all touch-target font-medium shadow-sm hover:shadow-md"
                    title="Next Week"
                  >
                    <span className="text-sm font-semibold">→</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : (
                // Enhanced Sprint Navigation
                <>
                  <button
                    onClick={() => {
                      console.log('Previous Sprint button clicked, offset:', currentSprintOffset);
                      onSprintChange(currentSprintOffset - 1);
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-4 rounded-xl hover:from-gray-200 hover:to-gray-300 active:scale-95 transition-all touch-target font-medium shadow-sm hover:shadow-md"
                    title="Previous Sprint"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-semibold">←</span>
                  </button>
                  
                  <div className="flex-1 text-center px-2">
                    <div className="font-bold text-lg text-gray-900">
                      {getCurrentSprintString()}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-green-600 font-semibold">{sprintCompletion}% Complete</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full hidden sm:block"></span>
                      <span className="hidden sm:block">{teamMembers.length} members • {getTeamTotalHours()}h total</span>
                    </div>
                  </div>
                  
                  {currentSprintOffset !== 0 ? (
                    <button
                      onClick={() => {
                        console.log('Current Sprint button clicked, resetting offset to 0');
                        onSprintChange(0);
                      }}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all touch-target font-medium shadow-brand-glow"
                      title="Current Sprint"
                    >
                      <Calendar className="w-5 h-5" />
                      <span className="text-sm font-semibold">📅 Current</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        console.log('Next Sprint button clicked, offset:', currentSprintOffset);
                        onSprintChange(currentSprintOffset + 1);
                      }}
                      className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-4 rounded-xl hover:from-gray-200 hover:to-gray-300 active:scale-95 transition-all touch-target font-medium shadow-sm hover:shadow-md"
                      title="Next Sprint"
                    >
                      <span className="text-sm font-semibold">→</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sprint Progress Indicator */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                <span className="font-semibold text-blue-900">{selectedTeam?.name || 'Team'}</span>
              </div>
              <span className={`font-bold text-xl ${
                sprintStatus === 'excellent' ? 'text-green-600' :
                sprintStatus === 'good' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {sprintCompletion}% Complete
              </span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className={`h-full transition-all duration-700 shadow-sm ${
                  sprintStatus === 'excellent' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  sprintStatus === 'good' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                }`}
                style={{ width: `${sprintCompletion}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm text-blue-800">
              <div className="flex items-center gap-1">
                <span>⚡</span>
                <span className="font-medium">{getTeamTotalHours()}h total</span>
              </div>
              <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
              <div className="flex items-center gap-1">
                <span>👥</span>
                <span className="font-medium">{teamMembers.length} members</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}