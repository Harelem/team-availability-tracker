'use client';

import { useState, useRef } from 'react';
import { Clock, User, CheckCircle, ChevronRight } from 'lucide-react';
import { TeamMember, WorkOption } from '@/types';
import MobileReasonInput from './MobileReasonInput';

interface MobileScheduleCardProps {
  member: TeamMember;
  sprintDays: Date[];
  scheduleData: Record<string, { value: '1' | '0.5' | 'X'; reason?: string }>;
  workOptions: WorkOption[];
  canEdit: boolean;
  isCurrentUser: boolean;
  onWorkOptionClick: (date: Date, value: string, reason?: string) => void;
  onFullSprintSet: () => void;
  isToday: (date: Date) => boolean;
  isPastDate: (date: Date) => boolean;
}

export default function MobileScheduleCard({
  member,
  sprintDays,
  scheduleData,
  workOptions,
  canEdit,
  isCurrentUser,
  onWorkOptionClick,
  onFullSprintSet,
  isToday,
  isPastDate
}: MobileScheduleCardProps) {
  const [isExpanded, setIsExpanded] = useState(isCurrentUser);
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    date?: Date;
    statusType?: '0.5' | 'X';
  }>({ isOpen: false });

  // Touch gesture state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calculateSprintHours = () => {
    let totalHours = 0;
    sprintDays.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const value = scheduleData[dateKey as keyof typeof scheduleData];
      const option = workOptions.find(opt => opt.value === value?.value);
      if (option) {
        totalHours += option.hours;
      }
    });
    return totalHours;
  };

  const getDayShortName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Status cycling logic: Full → Half → Absent → Full
  const getNextStatus = (currentValue?: '1' | '0.5' | 'X'): '1' | '0.5' | 'X' => {
    if (!currentValue || currentValue === 'X') return '1';
    if (currentValue === '1') return '0.5';
    if (currentValue === '0.5') return 'X';
    return '1';
  };

  const getPreviousStatus = (currentValue?: '1' | '0.5' | 'X'): '1' | '0.5' | 'X' => {
    if (!currentValue || currentValue === '1') return 'X';
    if (currentValue === 'X') return '0.5';
    if (currentValue === '0.5') return '1';
    return 'X';
  };

  // Enhanced status click/tap handler with cycling
  const handleStatusTap = (date: Date, currentValue?: '1' | '0.5' | 'X') => {
    if (!canEdit) return;

    const nextStatus = getNextStatus(currentValue);
    
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // If status requires reason, show bottom sheet
    if (nextStatus === '0.5' || nextStatus === 'X') {
      setReasonModal({
        isOpen: true,
        date,
        statusType: nextStatus
      });
    } else {
      onWorkOptionClick(date, nextStatus);
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent, date: Date, currentValue?: '1' | '0.5' | 'X') => {
    if (!canEdit) return;
    
    touchStartX.current = e.touches[0]?.clientX || 0;
    touchStartY.current = e.touches[0]?.clientY || 0;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canEdit) return;

    const touchCurrentX = e.touches[0]?.clientX || 0;
    const touchCurrentY = e.touches[0]?.clientY || 0;
    const diffX = Math.abs(touchCurrentX - touchStartX.current);
    const diffY = Math.abs(touchCurrentY - touchStartY.current);

    // Only track as dragging if horizontal movement is significant
    if (diffX > 20 && diffX > diffY) {
      isDragging.current = true;
      e.preventDefault(); // Prevent scrolling
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, date: Date, currentValue?: '1' | '0.5' | 'X') => {
    if (!canEdit || !isDragging.current) {
      // If not dragging, treat as tap
      if (!isDragging.current) {
        handleStatusTap(date, currentValue);
      }
      return;
    }

    const touchEndX = e.changedTouches[0]?.clientX || 0;
    const diffX = touchStartX.current - touchEndX;
    const minSwipeDistance = 80;

    if (Math.abs(diffX) > minSwipeDistance) {
      let newStatus: '1' | '0.5' | 'X';
      
      if (diffX > 0) {
        // Swipe left = less hours
        newStatus = getPreviousStatus(currentValue);
      } else {
        // Swipe right = more hours  
        newStatus = getNextStatus(currentValue);
      }

      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }

      // If status requires reason, show bottom sheet
      if (newStatus === '0.5' || newStatus === 'X') {
        setReasonModal({
          isOpen: true,
          date,
          statusType: newStatus
        });
      } else {
        onWorkOptionClick(date, newStatus);
      }
    }

    isDragging.current = false;
  };

  const handleReasonSave = (reason: string) => {
    if (reasonModal.date && reasonModal.statusType) {
      onWorkOptionClick(reasonModal.date, reasonModal.statusType, reason);
    }
    setReasonModal({ isOpen: false });
  };

  // Get status emoji for visual feedback
  const getStatusEmoji = (value?: '1' | '0.5' | 'X'): string => {
    switch (value) {
      case '1': return '✅';
      case '0.5': return '⏰';
      case 'X': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-elevation-2 border-2 mb-4 overflow-hidden transition-all duration-300 active:scale-[0.995] hover:shadow-elevation-3 ${
      isCurrentUser ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
    }`}>
      {/* Card Header - Enhanced touch interaction with larger touch targets */}
      <div 
        className="p-6 cursor-pointer touch-manipulation min-h-[72px] active:bg-gray-100 transition-all duration-200 active:scale-[0.98] rounded-t-xl"
        onClick={() => {
          // Add haptic feedback if supported
          if ('vibrate' in navigator) {
            navigator.vibrate(25);
          }
          setIsExpanded(!isExpanded);
        }}
        onTouchStart={() => {}} // Enable better touch response
        style={{ touchAction: 'manipulation' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <User className={`w-6 h-6 ${isCurrentUser ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base tracking-tight">{member.name}</h3>
              <p className="text-gray-500 text-sm font-medium">{member.hebrew}</p>
              <div className="flex items-center gap-2 mt-1">
                {member.isManager && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    Manager
                  </span>
                )}
                {isCurrentUser && (
                  <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    You
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-gray-900 text-lg tracking-tight">{calculateSprintHours()}h</span>
              </div>
              <div className="text-xs text-gray-600 font-medium">this sprint</div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Card Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Full Sprint Button - Enhanced mobile design with better touch targets */}
          {canEdit && (
            <div className="mb-8">
              <button
                onClick={() => {
                  // Add haptic feedback
                  if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                  }
                  onFullSprintSet();
                }}
                className="w-full bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-3 border-green-200 rounded-2xl py-6 px-8 font-bold text-lg hover:bg-green-100 active:bg-green-200 active:scale-[0.98] transition-all duration-200 touch-manipulation min-h-[72px] shadow-elevation-3 hover:shadow-elevation-4 transform hover:scale-[1.01]"
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-lg font-semibold">Set Full Working Sprint</span>
                </div>
                <div className="text-xs text-green-600 mt-1 opacity-75">
                  Sets all sprint working days to 7 hours each
                </div>
              </button>
            </div>
          )}

          {/* Days Grid */}
          <div className="space-y-4">
            {sprintDays.map((date) => {
              const dateKey = date.toISOString().split('T')[0];
              const currentValue = scheduleData[dateKey as keyof typeof scheduleData];
              const today = isToday(date);
              const past = isPastDate(date);

              return (
                <div key={dateKey} className={`rounded-2xl p-6 border-3 transition-all duration-300 min-h-[140px] ${
                  today 
                    ? 'bg-blue-50 border-blue-400 shadow-lg ring-2 ring-blue-200 ring-offset-2' 
                    : past 
                    ? 'bg-gray-50 border-gray-300 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}>
                  {/* Day Header - Enhanced for better visibility */}
                  <div className="flex items-center justify-between mb-6 p-2 rounded-xl bg-white/70">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getStatusEmoji(currentValue?.value)}</span>
                        <div>
                          <span className={`font-semibold text-base ${
                            today ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            {getDayShortName(date)}
                          </span>
                          <span className={`text-sm ml-2 ${
                            today ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {formatDate(date)}
                          </span>
                        </div>
                      </div>
                      {today && (
                        <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-medium">
                          Today
                        </span>
                      )}
                    </div>
                    {currentValue?.reason && (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="text-xs text-gray-600 italic max-w-[100px] truncate">
                          {currentValue.reason}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Status Button with Swipe Support and Improved Touch Targets */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <button
                        onTouchStart={(e) => handleTouchStart(e, date, currentValue?.value)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={(e) => handleTouchEnd(e, date, currentValue?.value)}
                        disabled={!canEdit}
                        className={`w-full py-8 px-8 rounded-3xl border-4 font-bold text-xl transition-all duration-300 touch-manipulation min-h-[100px] shadow-xl transform ${
                          canEdit 
                            ? 'active:scale-95 cursor-pointer hover:scale-[1.02] hover:shadow-2xl' 
                            : 'cursor-not-allowed opacity-60'
                        } ${
                          currentValue?.value
                            ? workOptions.find(opt => opt.value === currentValue.value)?.color + ' ring-4 ring-blue-400 ring-offset-4 scale-[1.02] shadow-2xl'
                            : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 border-gray-300 hover:from-gray-100 hover:to-gray-200'
                        }`}
                        style={{ touchAction: 'manipulation' }}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{getStatusEmoji(currentValue?.value)}</span>
                            <div>
                              <div className="text-xl font-bold">
                                {currentValue?.value
                                  ? workOptions.find(opt => opt.value === currentValue.value)?.label || 'Set Status'
                                  : 'Tap to Set'
                                }
                              </div>
                              <div className="text-sm opacity-75">
                                {currentValue?.value
                                  ? `${workOptions.find(opt => opt.value === currentValue.value)?.hours || 0}h`
                                  : 'Swipe ← → or Tap'
                                }
                              </div>
                            </div>
                          </div>
                          
                          {canEdit && (
                            <div className="flex items-center gap-2 text-xs opacity-60 mt-1">
                              <span>← Less Hours</span>
                              <span>•</span>
                              <span>Tap to Cycle</span>
                              <span>•</span>
                              <span>More Hours →</span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Quick Status Preview - Enhanced for better touch targets */}
                    {canEdit && (
                      <div className="flex justify-center gap-3 mt-4">
                        {workOptions.map((option, index) => (
                          <div
                            key={option.value}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] ${
                              currentValue?.value === option.value
                                ? 'bg-blue-100 text-blue-800 font-bold ring-2 ring-blue-300 shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <span className="text-lg">{getStatusEmoji(option.value)}</span>
                            <span className="font-medium">{option.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Reason Input Modal */}
      <MobileReasonInput
        isOpen={reasonModal.isOpen}
        onClose={() => setReasonModal({ isOpen: false })}
        onSave={handleReasonSave}
        statusType={reasonModal.statusType || '0.5'}
        memberName={member.name}
        date={reasonModal.date}
      />
    </div>
  );
}