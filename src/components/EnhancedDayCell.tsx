'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { TeamMember, WorkOption } from '@/types';

interface EnhancedDayCellProps {
  member: TeamMember;
  date: Date;
  currentValue?: { value: '1' | '0.5' | 'X'; reason?: string };
  workOptions: WorkOption[];
  canEdit: boolean;
  isToday: boolean;
  isPast: boolean;
  onWorkOptionClick: (memberId: number, date: Date, value: string) => void;
  onReasonRequired: (memberId: number, date: Date, value: '0.5' | 'X') => void;
  onQuickReasonSelect?: (memberId: number, date: Date, value: '0.5' | 'X', reason: string) => void;
}

// Hebrew quick reason options
const HEBREW_QUICK_REASONS = {
  '0.5': [
    { emoji: '🩺', text: 'רופא', value: 'רופא - תור רפואי' },
    { emoji: '👨‍👩‍👧‍👦', text: 'משפחה', value: 'עניין משפחתי חשוב' },
    { emoji: '📋', text: 'אישי', value: 'עניין אישי דחוף' },
    { emoji: '🏢', text: 'רשמי', value: 'עניין רשמי/ביורוקרטי' },
    { emoji: '🚗', text: 'נסיעה', value: 'נסיעה/תחבורה' },
    { emoji: '📞', text: 'שיחה', value: 'שיחת עבודה חשובה' }
  ],
  'X': [
    { emoji: '🤒', text: 'מחלה', value: 'מחלה/אי הרגשה טובה' },
    { emoji: '🛡️', text: 'שמירה', value: 'שמירה/מילואים' },
    { emoji: '🏖️', text: 'חופשה', value: 'יום חופשה' },
    { emoji: '👨‍👩‍👧‍👦', text: 'משפחה', value: 'חירום משפחתי' },
    { emoji: '📅', text: 'מתוכנן', value: 'יום חופש מתוכנן' },
    { emoji: '🚫', text: 'אחר', value: 'סיבה אחרת' }
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

  // const dateKey = date.toISOString().split('T')[0]; // Not used in this component

  const handleWorkOptionClick = (value: string) => {
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

  const getCellBackgroundColor = () => {
    if (isToday) return 'bg-blue-50 border-blue-200';
    if (isPast) return 'bg-gray-25';
    return '';
  };

  const getReasonIndicator = () => {
    if (!currentValue?.reason) return null;
    
    return (
      <div className="absolute top-1 right-1 group">
        <MessageSquare className="w-3 h-3 text-blue-500" />
        <div className="absolute right-0 top-5 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50 w-48 break-words">
          {currentValue.reason}
        </div>
      </div>
    );
  };

  return (
    <td className={`relative py-2 px-1 sm:py-4 sm:px-4 text-center border-r ${getCellBackgroundColor()}`}>
      {/* Reason Indicator */}
      {getReasonIndicator()}
      
      {/* Work Option Buttons */}
      <div className="flex gap-0.5 sm:gap-1 justify-center">
        {workOptions.map(option => {
          const isSelected = currentValue?.value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => canEdit && handleWorkOptionClick(option.value)}
              disabled={!canEdit}
              className={`min-h-[36px] w-8 sm:w-auto px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-md border font-medium text-xs sm:text-sm transition-all touch-manipulation relative ${
                canEdit ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-60'
              } ${
                isSelected 
                  ? option.color + ' ring-2 ring-offset-1 ring-blue-500' 
                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
              }`}
              title={canEdit ? option.description : 'You can only edit your own schedule'}
            >
              {option.label}
              {isSelected && currentValue?.reason && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Reasons Modal - Enhanced for mobile */}
      {showQuickReasons && pendingValue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 lg:p-4">
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
                  className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation rounded-full hover:bg-gray-100"
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
                  {HEBREW_QUICK_REASONS[pendingValue].map((reason, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Add haptic feedback
                        if ('vibrate' in navigator) {
                          navigator.vibrate(50);
                        }
                        handleQuickReasonSelect(reason.value);
                      }}
                      className="flex items-center gap-3 p-4 text-left bg-gray-50 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-all duration-200 border border-gray-200 hover:border-blue-300 active:border-blue-400 min-h-[60px] lg:min-h-[44px] lg:p-3 shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
                    >
                      <span className="text-2xl lg:text-lg">{reason.emoji}</span>
                      <span className="text-base lg:text-sm font-medium text-gray-900 flex-1">
                        {reason.text}
                      </span>
                      <span className="text-gray-400">→</span>
                    </button>
                  ))}
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
                    className="w-full flex items-center justify-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-all duration-200 text-base lg:text-sm font-medium text-gray-700 min-h-[56px] lg:min-h-[44px] shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
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
                className="w-full px-6 py-4 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 text-base lg:text-sm font-medium min-h-[56px] lg:min-h-[44px] shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation"
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