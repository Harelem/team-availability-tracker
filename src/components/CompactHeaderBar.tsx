'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { useTouchFriendly } from '@/hooks/useTouchGestures';
import EnhancedManagerExportButton from './EnhancedManagerExportButton';
import { useState } from 'react';

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
  // Loading state for navigation feedback
  isNavigating?: boolean;
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
  getCurrentWeekString,
  isNavigating = false
}: CompactHeaderBarProps) {
  const { currentSprint } = useGlobalSprint();
  const { getInteractionProps, isTouchDevice } = useTouchFriendly();
  const [localNavigating, setLocalNavigating] = useState(false);

  // Enhanced navigation handler with loading state
  const handleNavigation = async (action: () => void) => {
    setLocalNavigating(true);
    try {
      await action();
    } finally {
      setTimeout(() => setLocalNavigating(false), 300); // Brief loading state
    }
  };

  const isCurrentlyNavigating = isNavigating || localNavigating;

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
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 max-h-20 flex-shrink-0">
      {/* Hidden accessibility help for screen readers */}
      <div id="navigation-help" className="sr-only">
        Use navigation buttons to move between {navigationMode}s. 
        Current button returns to today's date.
        {currentUser.isManager && ' As a manager, you can tap schedule cells to edit team member availability.'}
      </div>
      
      {/* Compact Horizontal Header - Single Row Layout */}
      <div 
        className="px-2 py-2"
        role="navigation"
        aria-label={`${navigationMode} navigation controls`}
        aria-describedby="navigation-help"
      >
        <div className="flex items-center justify-between gap-2">
          {/* Left: Title + Manager Notice Inline */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">Team Availability</h1>
            {currentUser.isManager && (
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium">Manager Mode</span>
                <span className="text-xs opacity-75 hidden sm:inline">• Tap cells to edit</span>
              </div>
            )}
          </div>
          
          {/* Center: Navigation Controls */}
          <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
            {/* Enhanced Sprint/Week Toggle */}
            {onNavigationModeChange && (
              <div className="flex bg-gray-100 p-1 rounded-lg border">
                <button
                  {...getInteractionProps(() => onNavigationModeChange('sprint'), { hapticFeedback: true })}
                  className={`
                    min-h-[44px] px-3 py-2 text-sm font-medium
                    rounded-md transition-all duration-200
                    touch-manipulation select-none cursor-pointer
                    active:scale-95
                    ${navigationMode === 'sprint'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Switch to Sprint view"
                >
                  Sprint
                </button>
                <button
                  {...getInteractionProps(() => onNavigationModeChange('week'), { hapticFeedback: true })}
                  className={`
                    min-h-[44px] px-3 py-2 text-sm font-medium
                    rounded-md transition-all duration-200
                    touch-manipulation select-none cursor-pointer
                    active:scale-95
                    ${navigationMode === 'week'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Switch to Week view"
                >
                  Week
                </button>
              </div>
            )}
            
            {/* Date Navigation */}
            <div className="flex items-center gap-1 relative z-50">
              {navigationMode === 'week' ? (
                <>
                  <button
                    {...getInteractionProps(() => {
                      console.log('🔵 Previous Week button pressed');
                      if (onPreviousWeek) handleNavigation(onPreviousWeek);
                    }, { hapticFeedback: true })}
                    disabled={isCurrentlyNavigating}
                    className={`
                      min-h-[44px] min-w-[44px] p-3
                      text-gray-600 bg-white border border-gray-200
                      hover:bg-gray-50 hover:border-gray-300
                      active:bg-gray-100 active:border-gray-400
                      focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      rounded-lg shadow-sm hover:shadow-md
                      touch-manipulation select-none
                      active:scale-95 transition-all duration-150
                      cursor-pointer
                      ${isCurrentlyNavigating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    aria-label="Previous Week"
                    title="Previous Week"
                  >
                    {isCurrentlyNavigating ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <ChevronLeft className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="text-sm font-medium text-gray-900 min-w-0 truncate px-2">
                    {getCurrentWeekString ? getCurrentWeekString() : getCurrentSprintString()}
                  </div>
                  
                  <button
                    {...getInteractionProps(() => {
                      console.log('🔵 Next Week button pressed');
                      if (onNextWeek) handleNavigation(onNextWeek);
                    }, { hapticFeedback: true })}
                    disabled={isCurrentlyNavigating}
                    className={`
                      min-h-[44px] min-w-[44px] p-3
                      text-gray-600 bg-white border border-gray-200
                      hover:bg-gray-50 hover:border-gray-300
                      active:bg-gray-100 active:border-gray-400
                      focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      rounded-lg shadow-sm hover:shadow-md
                      touch-manipulation select-none
                      active:scale-95 transition-all duration-150
                      cursor-pointer
                      ${isCurrentlyNavigating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    aria-label="Next Week"
                    title="Next Week"
                  >
                    {isCurrentlyNavigating ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    {...getInteractionProps(() => {
                      console.log('🔵 Previous Sprint button pressed - offset going from', currentSprintOffset, 'to', currentSprintOffset - 1);
                      handleNavigation(() => onSprintChange(currentSprintOffset - 1));
                    }, { hapticFeedback: true })}
                    disabled={isCurrentlyNavigating}
                    className={`
                      min-h-[44px] min-w-[44px] p-3
                      text-gray-600 bg-white border border-gray-200
                      hover:bg-gray-50 hover:border-gray-300
                      active:bg-gray-100 active:border-gray-400
                      focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      rounded-lg shadow-sm hover:shadow-md
                      touch-manipulation select-none
                      active:scale-95 transition-all duration-150
                      cursor-pointer
                      ${isCurrentlyNavigating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    aria-label="Previous Sprint"
                    title="Previous Sprint"
                  >
                    {isCurrentlyNavigating ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <ChevronLeft className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="text-sm font-medium text-gray-900 min-w-0 truncate px-2">
                    {getCurrentSprintString()}
                  </div>
                  
                  <button
                    {...getInteractionProps(() => {
                      console.log('🔵 Next Sprint button pressed - offset going from', currentSprintOffset, 'to', currentSprintOffset + 1);
                      handleNavigation(() => onSprintChange(currentSprintOffset + 1));
                    }, { hapticFeedback: true })}
                    disabled={isCurrentlyNavigating}
                    className={`
                      min-h-[44px] min-w-[44px] p-3
                      text-gray-600 bg-white border border-gray-200
                      hover:bg-gray-50 hover:border-gray-300
                      active:bg-gray-100 active:border-gray-400
                      focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      rounded-lg shadow-sm hover:shadow-md
                      touch-manipulation select-none
                      active:scale-95 transition-all duration-150
                      cursor-pointer
                      ${isCurrentlyNavigating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    aria-label="Next Sprint"
                    title="Next Sprint"
                  >
                    {isCurrentlyNavigating ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </>
              )}
            </div>
            
            {/* Breadcrumb Navigation Indicator */}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${currentSprintOffset === -2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <div className={`w-2 h-2 rounded-full ${currentSprintOffset === -1 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <div className={`w-2 h-2 rounded-full ${currentSprintOffset === 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <div className={`w-2 h-2 rounded-full ${currentSprintOffset === 1 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <div className={`w-2 h-2 rounded-full ${currentSprintOffset === 2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            </div>
            
            {/* Progress Indicator - Inline */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-600">
              <span>{sprintCompletion}%</span>
              <div className="w-12 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-full rounded-full ${
                    sprintStatus === 'excellent' ? 'bg-green-500' :
                    sprintStatus === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${sprintCompletion}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1">
            {navigationMode === 'week' ? (
              <button
                {...getInteractionProps(() => {
                  console.log('🔵 Current Week button pressed');
                  if (onCurrentWeek) handleNavigation(onCurrentWeek);
                }, { hapticFeedback: true })}
                disabled={isCurrentlyNavigating}
                className={`
                  min-h-[44px] min-w-[80px] px-4 py-2
                  text-sm font-medium rounded-lg
                  transition-all duration-200
                  touch-manipulation select-none cursor-pointer
                  active:scale-95 focus:ring-2 focus:ring-offset-2
                  shadow-md hover:shadow-lg
                  bg-gradient-to-r from-blue-500 to-blue-600 
                  text-white border border-blue-600
                  hover:from-blue-600 hover:to-blue-700
                  active:from-blue-700 active:to-blue-800
                  focus:ring-blue-500
                  shadow-blue-200
                  ${isCurrentlyNavigating ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Go to Current Week"
              >
                {isCurrentlyNavigating ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-200 border-t-white mx-auto" />
                ) : (
                  'Current'
                )}
              </button>
            ) : (
              <button
                {...getInteractionProps(() => {
                  console.log('🔵 Current Sprint button pressed - resetting offset to 0');
                  handleNavigation(() => onSprintChange(0));
                }, { hapticFeedback: true })}
                disabled={isCurrentlyNavigating}
                className={`
                  min-h-[44px] min-w-[80px] px-4 py-2
                  text-sm font-medium rounded-lg
                  transition-all duration-200
                  touch-manipulation select-none cursor-pointer
                  active:scale-95 focus:ring-2 focus:ring-offset-2
                  shadow-md hover:shadow-lg
                  ${currentSprintOffset === 0
                    ? `
                      bg-gradient-to-r from-blue-500 to-blue-600 
                      text-white border border-blue-600
                      hover:from-blue-600 hover:to-blue-700
                      active:from-blue-700 active:to-blue-800
                      focus:ring-blue-500
                      shadow-blue-200
                    `
                    : `
                      bg-white text-gray-700 border border-gray-300
                      hover:bg-gray-50 hover:border-gray-400
                      active:bg-gray-100 active:border-gray-500
                      focus:ring-gray-500
                    `
                  }
                  ${isCurrentlyNavigating ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Go to Current Sprint"
              >
                {isCurrentlyNavigating ? (
                  <div className={`w-4 h-4 animate-spin rounded-full border-2 mx-auto ${
                    currentSprintOffset === 0 
                      ? 'border-blue-200 border-t-white' 
                      : 'border-gray-300 border-t-gray-600'
                  }`} />
                ) : (
                  'Current'
                )}
              </button>
            )}
            
            {currentUser.isManager && (
              <>
                <button 
                  {...getInteractionProps(() => {
                    console.log('🔵 View Reasons button pressed');
                    onViewReasons();
                  }, { hapticFeedback: true })}
                  className="flex items-center gap-1 bg-gray-600 text-white min-h-[44px] px-3 py-2 rounded-lg hover:bg-gray-700 active:bg-gray-800 text-xs touch-manipulation select-none active:scale-95 cursor-pointer transition-all"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  title="View Reasons"
                  aria-label="View team member reasons"
                >
                  <span>👤</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}