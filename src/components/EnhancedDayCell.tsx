'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Info } from 'lucide-react';
import { TeamMember, WorkOption } from '@/types';
import { canAccessManagerQuickReasons } from '@/utils/permissions';

interface EnhancedDayCellProps {
  member: TeamMember;
  date: Date;
  currentValue?: { value: '1' | '0.5' | 'X'; reason?: string };
  workOptions: WorkOption[];
  canEdit: boolean;
  isToday: boolean;
  isPast: boolean;
  onWorkOptionClick: (memberId: number, date: Date, value: string, reason?: string) => void;
  onReasonRequired: (memberId: number, date: Date, value: '0.5' | 'X') => void;
  onQuickReasonSelect?: (memberId: number, date: Date, value: '0.5' | 'X', reason: string) => void;
}

// Hebrew quick reason options
const HEBREW_QUICK_REASONS = {
  '0.5': [
    { emoji: '👤', text: 'אישי', value: 'עניין אישי' },
    { emoji: '🏖️', text: 'חופש', value: 'יום חופש' },
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' }
  ],
  'X': [
    { emoji: '👤', text: 'אישי', value: 'עניין אישי' },
    { emoji: '🏖️', text: 'חופש', value: 'יום חופש' },
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' }
  ]
};

// Manager-specific quick reason options (prominently features management reason)
const MANAGER_HEBREW_QUICK_REASONS = {
  '0.5': [
    { emoji: '🏢', text: 'ניהול', value: 'ניהול - פגישות ניהול ותכנון', isPrimary: true },
    { emoji: '👤', text: 'אישי', value: 'עניין אישי' },
    { emoji: '🏖️', text: 'חופש', value: 'יום חופש' },
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' }
  ],
  'X': [
    { emoji: '🏢', text: 'ניהול', value: 'ניהול - פגישות ניהול ותכנון', isPrimary: true },
    { emoji: '👤', text: 'אישי', value: 'עניין אישי' },
    { emoji: '🏖️', text: 'חופש', value: 'יום חופש' },
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' }
  ]
};

export default function EnhancedDayCell({
  member,
  date,
  currentValue,
  workOptions,
  canEdit,
  isToday,
  isPast,
  onWorkOptionClick,
  onReasonRequired,
  onQuickReasonSelect
}: EnhancedDayCellProps) {
  const [showQuickReasons, setShowQuickReasons] = useState(false);
  const [pendingValue, setPendingValue] = useState<'0.5' | 'X' | null>(null);
  const [showReasonTooltip, setShowReasonTooltip] = useState(false);
  const reasonTooltipRef = useRef<HTMLDivElement>(null);

  // Weekend detection (Friday = 5, Saturday = 6)
  const isWeekend = date.getDay() === 5 || date.getDay() === 6;

  // Status cycling logic: Full → Half → Absent → Full
  const getNextStatus = (currentVal?: '1' | '0.5' | 'X'): '1' | '0.5' | 'X' => {
    if (!currentVal || currentVal === 'X') return '1';
    if (currentVal === '1') return '0.5';
    if (currentVal === '0.5') return 'X';
    return '1';
  };

  // Get status emoji for desktop display
  const getStatusEmoji = (value?: '1' | '0.5' | 'X'): string => {
    switch (value) {
      case '1': return '✅';
      case '0.5': return '⏰';
      case 'X': return '❌';
      default: return '';
    }
  };

  // Enhanced cell click handler for 1-click cycling
  const handleCellClick = () => {
    if (!canEdit || isWeekend) return;
    
    const nextStatus = getNextStatus(currentValue?.value);
    
    // If next status requires reason, show quick reasons
    if (nextStatus === '0.5' || nextStatus === 'X') {
      setPendingValue(nextStatus);
      setShowQuickReasons(true);
      return;
    }
    
    // For full day (1), update directly
    onWorkOptionClick(member.id, date, nextStatus);
  };

  const handleWorkOptionClick = (value: string) => {
    // Prevent editing weekend days
    if (isWeekend) {
      return;
    }
    const currentVal = currentValue?.value;
    
    // If clicking the same value, deselect it
    if (currentVal === value) {
      onWorkOptionClick(member.id, date, ''); // Clear selection
      return;
    }
    
    // If selecting full day (1), update directly
    if (value === '1') {
      onWorkOptionClick(member.id, date, value);
      return;
    }
    
    // For 0.5 or X, show quick reasons
    if (value === '0.5' || value === 'X') {
      setPendingValue(value);
      setShowQuickReasons(true);
    }
  };

  const handleQuickReasonSelect = (reason: string) => {
    if (pendingValue) {
      // Use the new callback if available, otherwise fall back to old behavior
      if (onQuickReasonSelect) {
        onQuickReasonSelect(member.id, date, pendingValue, reason);
      } else {
        // Fallback to the old reason dialog system
        onReasonRequired(member.id, date, pendingValue);
      }
    }
    setShowQuickReasons(false);
    setPendingValue(null);
  };

  const handleCustomReason = () => {
    if (pendingValue) {
      onReasonRequired(member.id, date, pendingValue);
    }
    setShowQuickReasons(false);
    setPendingValue(null);
  };

  const handleReasonIconClick = () => {
    setShowReasonTooltip(!showReasonTooltip);
  };

  const handleReasonIconKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleReasonIconClick();
    }
    if (e.key === 'Escape') {
      setShowReasonTooltip(false);
    }
  };

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reasonTooltipRef.current && !reasonTooltipRef.current.contains(event.target as Node)) {
        setShowReasonTooltip(false);
      }
    };

    if (showReasonTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReasonTooltip]);

  const getCellBackgroundColor = () => {
    if (isWeekend) return 'bg-gray-100 border-gray-300';
    if (isToday) return 'bg-blue-50 border-blue-200';
    if (isPast) return 'bg-gray-25';
    return '';
  };

  const getReasonIndicator = () => {
    if (!currentValue?.reason) return null;
    
    return (
      <div className="absolute top-1 right-1 group" ref={reasonTooltipRef}>
        <button
          onClick={handleReasonIconClick}
          onKeyDown={handleReasonIconKeyDown}
          onMouseEnter={() => setShowReasonTooltip(true)}
          onMouseLeave={() => setShowReasonTooltip(false)}
          className="min-h-[24px] min-w-[24px] flex items-center justify-center rounded-full hover:bg-blue-50 active:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 touch-manipulation"
          aria-label={`Reason: ${currentValue.reason}`}
          tabIndex={0}
          role="button"
        >
          <Info className="w-3 h-3 text-blue-500 hover:text-blue-600" />
        </button>
        
        {/* Tooltip - shows on both hover and click */}
        {showReasonTooltip && (
          <div className="absolute right-0 top-6 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-[60] w-48 break-words transition-opacity duration-200 opacity-100 visible">
            {currentValue.reason}
            <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <td className={`relative py-2 px-1 sm:py-4 sm:px-4 text-center border-r ${getCellBackgroundColor()}`}>
      {/* Reason Indicator */}
      {getReasonIndicator()}
      
      {/* Work Option Buttons or Weekend Display */}
      {isWeekend ? (
        <div className="flex justify-center">
          <div className="min-h-[36px] px-3 py-2 rounded-xl border bg-gray-200 text-gray-600 border-gray-300 text-sm font-medium flex items-center gap-2">
            <span>❌</span>
            <span className="text-xs text-gray-500">Weekend</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Enhanced 1-Click Status Button */}
          {canEdit ? (
            <div className="flex justify-center">
              <button
                onClick={handleCellClick}
                className={`status-card-responsive rounded-xl border-2 font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
                  currentValue?.value
                    ? workOptions.find(opt => opt.value === currentValue.value)?.color + ' ring-2 ring-blue-400 ring-offset-1'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 border-gray-300 hover:from-gray-100 hover:to-gray-200'
                }`}
                title={`Click to cycle: ${currentValue?.value ? getNextStatus(currentValue.value) : '1'} (${workOptions.find(opt => opt.value === (currentValue?.value ? getNextStatus(currentValue.value) : '1'))?.description})`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getStatusEmoji(currentValue?.value)}</span>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {currentValue?.value
                        ? workOptions.find(opt => opt.value === currentValue.value)?.label || '?'
                        : 'Set'
                      }
                    </div>
                    <div className="text-xs opacity-75">
                      {currentValue?.value
                        ? `${workOptions.find(opt => opt.value === currentValue.value)?.hours || 0}h`
                        : 'Click to set'
                      }
                    </div>
                  </div>
                  {currentValue?.reason && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </button>
            </div>
          ) : (
            /* Read-only display */
            <div className="flex justify-center">
              <div className={`status-card-responsive rounded-xl border-2 font-bold text-sm opacity-60 ${
                currentValue?.value
                  ? workOptions.find(opt => opt.value === currentValue.value)?.color
                  : 'bg-gray-100 text-gray-600 border-gray-300'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getStatusEmoji(currentValue?.value)}</span>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {currentValue?.value
                        ? workOptions.find(opt => opt.value === currentValue.value)?.label || '?'
                        : '-'
                      }
                    </div>
                    <div className="text-xs opacity-75">
                      {currentValue?.value
                        ? `${workOptions.find(opt => opt.value === currentValue.value)?.hours || 0}h`
                        : 'Not set'
                      }
                    </div>
                  </div>
                  {currentValue?.reason && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Legacy button row removed for cleaner UI */}
        </div>
      )}

      {/* Quick Reasons Modal - Enhanced for mobile */}
      {showQuickReasons && pendingValue && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 lg:p-4">
          <div className="bg-white w-full h-full flex flex-col lg:rounded-lg lg:max-w-md lg:w-auto lg:h-auto lg:max-h-[80vh] lg:shadow-xl">
            {/* Header - Enhanced for mobile */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 lg:bg-white lg:border-b lg:border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 lg:text-lg">
                    {pendingValue === '0.5' ? 'Half Day Reason' : 'Absence Reason'}
                  </h3>
                  <p className="text-lg text-gray-600 lg:text-sm">
                    {pendingValue === '0.5' ? 'סיבה לחצי יום' : 'סיבת היעדרות'}
                  </p>
                </div>
                <button
                  onClick={() => setShowQuickReasons(false)}
                  className="text-gray-400 hover:text-gray-600 btn-height-responsive flex items-center justify-center touch-manipulation rounded-full hover:bg-gray-100"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg lg:mt-2 lg:p-2">
                <p className="text-base text-gray-700 lg:text-sm">
                  <strong>{member.name}</strong> • {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Content - Enhanced mobile layout */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 text-base lg:text-sm">
                  Quick Reasons • סיבות מהירות:
                </h4>
                
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-2">
                  {(() => {
                    // Use manager-specific reasons if the member is a manager
                    const isManager = canAccessManagerQuickReasons(member);
                    const reasonOptions = isManager ? MANAGER_HEBREW_QUICK_REASONS[pendingValue] : HEBREW_QUICK_REASONS[pendingValue];
                    
                    return reasonOptions.map((reason, index) => {
                      const isPrimary = (reason as any).isPrimary && isManager;
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            // Add haptic feedback
                            if ('vibrate' in navigator) {
                              navigator.vibrate(50);
                            }
                            handleQuickReasonSelect(reason.value);
                          }}
                          className={`flex items-center gap-3 p-4 text-left rounded-xl transition-all duration-200 border btn-height-responsive lg:p-3 shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation ${
                            isPrimary
                              ? 'bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-blue-300 hover:border-blue-400 active:border-blue-500 ring-2 ring-blue-200'
                              : 'bg-gray-50 hover:bg-blue-50 active:bg-blue-100 border-gray-200 hover:border-blue-300 active:border-blue-400'
                          }`}
                        >
                          <span className={`text-2xl lg:text-lg ${isPrimary ? 'animate-pulse' : ''}`}>
                            {reason.emoji}
                          </span>
                          <div className="flex-1">
                            <span className={`text-base lg:text-sm font-medium flex-1 ${
                              isPrimary ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {reason.text}
                              {isPrimary && (
                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                                  Manager
                                </span>
                              )}
                            </span>
                          </div>
                          <span className={isPrimary ? 'text-blue-400' : 'text-gray-400'}>→</span>
                        </button>
                      );
                    });
                  })()}
                </div>

                <div className="border-t border-gray-200 pt-4 mt-6 lg:pt-3 lg:mt-4">
                  <button
                    onClick={() => {
                      // Add haptic feedback
                      if ('vibrate' in navigator) {
                        navigator.vibrate(25);
                      }
                      handleCustomReason();
                    }}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all duration-200 text-base lg:text-sm font-medium text-gray-700 btn-height-responsive shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
                  >
                    <MessageSquare className="w-5 h-5 lg:w-4 lg:h-4" />
                    <span>Custom Reason • סיבה מותאמת אישית</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer - Enhanced mobile buttons */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 lg:bg-white">
              <button
                onClick={() => setShowQuickReasons(false)}
                className="w-full px-6 py-4 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 text-base lg:text-sm font-medium btn-height-responsive shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
              >
                Cancel • ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </td>
  );
}