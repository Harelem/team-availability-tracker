'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Eye, RefreshCw } from 'lucide-react';
import MobileScheduleCard from './MobileScheduleCard';
import EnhancedManagerExportButton from './EnhancedManagerExportButton';
import { TeamMember, Team, WorkOption, WeekData } from '@/types';

interface MobileScheduleViewProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  selectedTeam: Team;
  scheduleData: WeekData;
  workOptions: WorkOption[];
  weekDays: Date[];
  currentWeekOffset: number;
  loading: boolean;
  onWeekChange: (offset: number) => void;
  onWorkOptionClick: (memberId: number, date: Date, value: string, reason?: string) => void;
  onFullWeekSet: (memberId: number) => void;
  onViewReasons: () => void;
  isToday: (date: Date) => boolean;
  isPastDate: (date: Date) => boolean;
  getCurrentSprintString: () => string;
  getTeamTotalHours: () => number;
}

const MobileScheduleView = memo(function MobileScheduleView({
  currentUser,
  teamMembers,
  selectedTeam,
  scheduleData,
  workOptions,
  weekDays,
  currentWeekOffset,
  loading,
  onWeekChange,
  onWorkOptionClick,
  onFullWeekSet,
  onViewReasons,
  isToday,
  isPastDate,
  getCurrentSprintString,
  getTeamTotalHours
}: MobileScheduleViewProps) {
  
  // Error boundary protection for the entire component
  if (!currentUser || !selectedTeam || !teamMembers) {
    return (
      <div className="lg:hidden p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 font-medium">Unable to load mobile schedule</p>
          <p className="text-red-500 text-sm mt-1">Missing required data. Please refresh the page.</p>
        </div>
      </div>
    );
  }
  const [refreshing, setRefreshing] = useState(false);
  const [isSwipeEnabled, setIsSwipeEnabled] = useState(false); // DISABLED: Swipe navigation conflicts with button navigation
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);
  const isPulling = useRef<boolean>(false);
  const pullStartY = useRef<number>(0);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh - in real app this would reload data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      await handleRefresh();
    } finally {
      setIsPullRefreshing(false);
      setPullDistance(0);
    }
  };

  // Swipe and pull-to-refresh gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isSwipeEnabled) return;
    
    touchStartX.current = e.touches[0]?.clientX || 0;
    touchStartY.current = e.touches[0]?.clientY || 0;
    pullStartY.current = e.touches[0]?.clientY || 0;
    isSwiping.current = false;
    isPulling.current = false;
    
    // Check if we're at the top of the scroll container for pull-to-refresh
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && scrollContainer.scrollTop === 0) {
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipeEnabled) return;
    
    const touchCurrentX = e.touches[0]?.clientX || 0;
    const touchCurrentY = e.touches[0]?.clientY || 0;
    const diffX = Math.abs(touchCurrentX - touchStartX.current);
    const diffY = Math.abs(touchCurrentY - touchStartY.current);
    const pullDiff = touchCurrentY - pullStartY.current;
    
    // Handle pull-to-refresh
    if (isPulling.current && pullDiff > 0 && diffY > diffX) {
      const distance = Math.min(pullDiff * 0.5, 120); // Max pull distance of 120px
      setPullDistance(distance);
      e.preventDefault();
      return;
    }
    
    // Only consider horizontal swipes (more horizontal than vertical)
    if (diffX > diffY && diffX > 20) {
      isSwiping.current = true;
      isPulling.current = false;
      setPullDistance(0);
      // Prevent default scrolling during swipe
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwipeEnabled) return;
    
    // Handle pull-to-refresh release
    if (isPulling.current && pullDistance > 60) {
      handlePullRefresh();
    } else {
      setPullDistance(0);
    }
    
    // DISABLED: Horizontal swipe navigation to prevent conflicts with button navigation
    if (isSwiping.current) {
      console.log('Swipe navigation disabled - use navigation buttons instead');
      // Horizontal swipe navigation disabled to prevent UI conflicts
    }
    
    // Reset states
    isSwiping.current = false;
    isPulling.current = false;
  };

  // Disable swipe during interactions with cards or buttons
  const handleInteractionStart = () => setIsSwipeEnabled(false);
  const handleInteractionEnd = () => setIsSwipeEnabled(true);

  useEffect(() => {
    // Re-enable swipe after interactions end
    const timer = setTimeout(() => setIsSwipeEnabled(true), 300);
    return () => clearTimeout(timer);
  }, [isSwipeEnabled]);

  if (loading) {
    return (
      <div className="lg:hidden">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="lg:hidden touch-manipulation relative overflow-hidden"
      ref={containerRef}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isPullRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 border-b border-blue-200 transition-all duration-200 z-10"
          style={{ 
            height: isPullRefreshing ? '60px' : `${Math.min(pullDistance, 60)}px`,
            transform: `translateY(${isPullRefreshing ? 0 : pullDistance - 60}px)`
          }}
        >
          <div className="flex items-center gap-2 text-blue-600">
            <RefreshCw 
              className={`w-5 h-5 ${isPullRefreshing ? 'animate-spin' : ''} ${pullDistance > 60 ? 'rotate-180' : ''} transition-transform`} 
            />
            <span className="text-sm font-medium">
              {isPullRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      
      <div
        ref={scrollContainerRef}
        className="mobile-scroll-container"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      {/* Mobile Header */}
      <div className="bg-white rounded-xl shadow-elevation-2 border border-gray-200 p-4 mb-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onWeekChange(currentWeekOffset - 1)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg active:bg-gray-200 active:scale-95 transition-all duration-200 text-sm min-h-[44px] touch-manipulation font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 active:scale-95 transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {currentWeekOffset !== 0 && (
              <button
                onClick={() => onWeekChange(0)}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg active:bg-blue-700 active:scale-95 transition-all duration-200 text-sm min-h-[44px] touch-manipulation font-medium shadow-brand-glow"
              >
                <Calendar className="w-4 h-4" />
                <span>Current</span>
              </button>
            )}
          </div>
          
          <button
            onClick={() => onWeekChange(currentWeekOffset + 1)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg active:bg-gray-200 active:scale-95 transition-all duration-200 text-sm min-h-[44px] touch-manipulation font-medium"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Enhanced Sprint Info */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🗓️</span>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              {(() => {
                try {
                  return getCurrentSprintString ? getCurrentSprintString() : 'Current Sprint';
                } catch (error) {
                  console.warn('Error getting sprint string:', error);
                  return 'Current Sprint';
                }
              })()}
            </h2>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <span className="text-blue-600">👥</span>
              <span>{selectedTeam?.name || 'Team'}</span>
            </div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="flex items-center gap-1">
              <span className="text-green-600">⚡</span>
              <span className="font-medium">{(() => {
                try {
                  return getTeamTotalHours ? getTeamTotalHours() : 0;
                } catch (error) {
                  console.warn('Error getting team total hours:', error);
                  return 0;
                }
              })()}h total</span>
            </div>
          </div>

          {/* Week Navigation Tabs */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-3">
            <button className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-full text-sm font-semibold transition-all duration-200 shadow-brand-glow">
              📅 Full Sprint
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
              <span>👆</span>
              <span>Tap navigation buttons above</span>
            </div>
          </div>
        </div>

        {/* Manager Actions */}
        {currentUser.isManager && (
          <div className="flex gap-2">
            <button 
              onClick={onViewReasons}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg active:bg-gray-200 active:scale-95 transition-all duration-200 text-sm min-h-[44px] touch-manipulation font-medium"
            >
              <Eye className="w-4 h-4" />
              <span>View Reasons</span>
            </button>
            <div className="flex-1">
              <EnhancedManagerExportButton
                currentUser={currentUser}
                teamMembers={teamMembers}
                selectedTeam={selectedTeam}
                scheduleData={scheduleData}
                currentSprintDays={weekDays}
              />
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Work Options Legend */}
      <div className="bg-white rounded-xl shadow-elevation-2 border-2 border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">⚡</span>
          <h3 className="font-bold text-gray-900 tracking-tight">Work Options</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {workOptions.map((option, index) => {
            const emojis = ['✅', '⏰', '❌'];
            return (
              <div key={option.value} className={`p-4 rounded-xl border-2 text-center transition-all duration-300 hover:scale-105 active:scale-95 ${option.color} shadow-elevation-1 hover:shadow-elevation-2`}>
                <div className="text-2xl mb-2">{emojis[index]}</div>
                <div className="font-bold text-lg mb-1">{option.label}</div>
                <div className="text-sm font-medium">{option.hours}h</div>
                <div className="text-xs mt-2 opacity-75">
                  {option.value === '1' ? 'Full Day' : 
                   option.value === '0.5' ? 'Half Day' : 'Sick/Out'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Members Cards */}
      <div className="space-y-0">
        {teamMembers.map((member) => {
          const canEdit = currentUser.isManager || member.id === currentUser.id;
          const isCurrentUserCard = member.id === currentUser.id;
          
          return (
            <div
              key={member.id}
              onTouchStart={handleInteractionStart}
              onTouchEnd={handleInteractionEnd}
            >
              <MobileScheduleCard
                member={member}
                sprintDays={weekDays}
                scheduleData={scheduleData[member.id] || {}}
                workOptions={workOptions}
                canEdit={canEdit}
                isCurrentUser={isCurrentUserCard}
                onWorkOptionClick={(date, value, reason) => onWorkOptionClick(member.id, date, value, reason)}
                onFullSprintSet={() => onFullWeekSet(member.id)}
                isToday={isToday}
                isPastDate={isPastDate}
              />
            </div>
          );
        })}
      </div>

      {/* Enhanced Mobile Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5 mt-4 shadow-elevation-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📱</span>
          <h3 className="font-bold text-blue-900 tracking-tight">Mobile Quick Guide</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm text-blue-800">
          <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
            <span className="text-lg">👆</span>
            <span><strong>Tap</strong> status buttons to cycle: Full → Half → Absent</span>
          </div>
          <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
            <span className="text-lg">👈👉</span>
            <span><strong>Swipe</strong> status buttons: Right = More hours, Left = Less hours</span>
          </div>
          <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
            <span className="text-lg">👆</span>
            <span><strong>Tap Previous/Next</strong> buttons to navigate sprints</span>
          </div>
          <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
            <span className="text-lg">↓</span>
            <span><strong>Pull down</strong> to refresh schedule data</span>
          </div>
          {currentUser.isManager && (
            <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
              <span className="text-lg">👑</span>
              <span><strong>Manager mode:</strong> You can edit anyone's schedule</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
            <span className="text-lg">🔵</span>
            <span><strong>Blue dots</strong> indicate days with reasons</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
});

export default MobileScheduleView;