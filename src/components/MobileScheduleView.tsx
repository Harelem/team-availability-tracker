'use client';

import { useState, useRef, useEffect } from 'react';
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
  onWorkOptionClick: (memberId: number, date: Date, value: string) => void;
  onFullWeekSet: (memberId: number) => void;
  onViewReasons: () => void;
  isToday: (date: Date) => boolean;
  isPastDate: (date: Date) => boolean;
  getCurrentWeekString: () => string;
  getTeamTotalHours: () => number;
}

export default function MobileScheduleView({
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
  getCurrentWeekString,
  getTeamTotalHours
}: MobileScheduleViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [isSwipeEnabled, setIsSwipeEnabled] = useState(true);
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
    
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    pullStartY.current = e.touches[0].clientY;
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
    
    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
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
    
    // Handle horizontal swipe
    if (isSwiping.current) {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchStartX.current - touchEndX;
      const minSwipeDistance = 50;
      
      // Add haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      if (Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          // Swipe left - next week
          onWeekChange(currentWeekOffset + 1);
        } else {
          // Swipe right - previous week
          onWeekChange(currentWeekOffset - 1);
        }
      }
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onWeekChange(currentWeekOffset - 1)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg active:bg-gray-200 transition-colors text-sm min-h-[44px] touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 active:scale-95 transition-all min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {currentWeekOffset !== 0 && (
              <button
                onClick={() => onWeekChange(0)}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg active:bg-blue-700 transition-colors text-sm min-h-[44px] touch-manipulation"
              >
                <Calendar className="w-4 h-4" />
                <span>Current</span>
              </button>
            )}
          </div>
          
          <button
            onClick={() => onWeekChange(currentWeekOffset + 1)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg active:bg-gray-200 transition-colors text-sm min-h-[44px] touch-manipulation"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Week Info */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Week of {getCurrentWeekString()}
          </h2>
          <div className="text-sm text-gray-600 mb-2">
            {selectedTeam.name} • {getTeamTotalHours()}h total
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span>←</span>
              <span>Swipe to navigate</span>
              <span>→</span>
            </div>
            <span>•</span>
            <span>החלק לניווט</span>
          </div>
        </div>

        {/* Manager Actions */}
        {currentUser.isManager && (
          <div className="flex gap-2">
            <button 
              onClick={onViewReasons}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg active:bg-gray-200 transition-colors text-sm min-h-[44px] touch-manipulation"
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
                currentWeekDays={weekDays}
              />
            </div>
          </div>
        )}
      </div>

      {/* Work Options Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="font-medium text-gray-900 mb-3 text-sm">Work Options:</h3>
        <div className="grid grid-cols-3 gap-2">
          {workOptions.map(option => (
            <div key={option.value} className={`p-3 rounded-lg border text-center ${option.color}`}>
              <div className="font-bold text-lg mb-1">{option.label}</div>
              <div className="text-xs">{option.hours}h</div>
              <div className="text-xs mt-1 opacity-75">
                {option.value === '1' ? 'Full Day' : 
                 option.value === '0.5' ? 'Half Day' : 'Sick/Out'}
              </div>
            </div>
          ))}
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
                weekDays={weekDays}
                scheduleData={scheduleData[member.id] || {}}
                workOptions={workOptions}
                canEdit={canEdit}
                isCurrentUser={isCurrentUserCard}
                onWorkOptionClick={(date, value) => onWorkOptionClick(member.id, date, value)}
                onFullWeekSet={() => onFullWeekSet(member.id)}
                isToday={isToday}
                isPastDate={isPastDate}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile Footer */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mt-4">
        <h3 className="font-medium text-blue-900 mb-2 text-sm">Quick Guide:</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• <strong>Swipe left/right</strong> to navigate between weeks</li>
          <li>• <strong>Pull down</strong> to refresh schedule data</li>
          <li>• <strong>Tap member names</strong> to expand/collapse their schedule</li>
          <li>• <strong>Your schedule</strong> is highlighted and expanded by default</li>
          <li>• <strong>Tap work options</strong> to set your availability</li>
          <li>• <strong>Use &quot;Set Full Working Week&quot;</strong> for quick scheduling</li>
          {currentUser.isManager && <li>• <strong>As a manager</strong> you can edit anyone&apos;s schedule</li>}
          <li>• <strong>Today&apos;s column</strong> is highlighted in blue</li>
        </ul>
      </div>
      </div>
    </div>
  );
}