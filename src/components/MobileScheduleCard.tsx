'use client';

import { useState } from 'react';
import { Clock, User, CheckCircle } from 'lucide-react';
import { TeamMember, WorkOption } from '@/types';

interface MobileScheduleCardProps {
  member: TeamMember;
  weekDays: Date[];
  scheduleData: Record<string, { value: '1' | '0.5' | 'X'; reason?: string }>;
  workOptions: WorkOption[];
  canEdit: boolean;
  isCurrentUser: boolean;
  onWorkOptionClick: (date: Date, value: string) => void;
  onFullWeekSet: () => void;
  isToday: (date: Date) => boolean;
  isPastDate: (date: Date) => boolean;
}

export default function MobileScheduleCard({
  member,
  weekDays,
  scheduleData,
  workOptions,
  canEdit,
  isCurrentUser,
  onWorkOptionClick,
  onFullWeekSet,
  isToday,
  isPastDate
}: MobileScheduleCardProps) {
  const [isExpanded, setIsExpanded] = useState(isCurrentUser);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calculateWeeklyHours = () => {
    let totalHours = 0;
    weekDays.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const value = scheduleData[dateKey];
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

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 mb-4 overflow-hidden transition-all duration-200 active:scale-[0.995] ${
      isCurrentUser ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
    }`}>
      {/* Card Header - Enhanced touch interaction */}
      <div 
        className="p-4 cursor-pointer touch-manipulation min-h-[56px] active:bg-gray-100 transition-all duration-150 active:scale-[0.99]"
        onClick={() => {
          // Add haptic feedback if supported
          if ('vibrate' in navigator) {
            navigator.vibrate(25);
          }
          setIsExpanded(!isExpanded);
        }}
        onTouchStart={() => {}} // Enable better touch response
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <User className={`w-6 h-6 ${isCurrentUser ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-base">{member.name}</h3>
              <p className="text-gray-500">{member.hebrew}</p>
              <div className="flex items-center gap-2 mt-1">
                {member.isManager && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                    Manager
                  </span>
                )}
                {isCurrentUser && (
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
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
                <span className="font-semibold text-gray-900 text-lg">{calculateWeeklyHours()}h</span>
              </div>
              <div className="text-xs text-gray-500">this week</div>
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
          {/* Full Week Button - Enhanced mobile design */}
          {canEdit && (
            <div className="mb-6">
              <button
                onClick={() => {
                  // Add haptic feedback
                  if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                  }
                  onFullWeekSet();
                }}
                className="w-full bg-green-50 text-green-700 border-2 border-green-200 rounded-xl py-5 px-6 font-semibold hover:bg-green-100 active:bg-green-200 active:scale-[0.98] transition-all duration-200 touch-manipulation min-h-[60px] shadow-md hover:shadow-lg transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-lg">Set Full Working Week</span>
                </div>
                <div className="text-xs text-green-600 mt-1 opacity-75">
                  Sets all weekdays to 7 hours each
                </div>
              </button>
            </div>
          )}

          {/* Days Grid */}
          <div className="space-y-3">
            {weekDays.map((date) => {
              const dateKey = date.toISOString().split('T')[0];
              const currentValue = scheduleData[dateKey];
              const today = isToday(date);
              const past = isPastDate(date);

              return (
                <div key={dateKey} className={`rounded-lg p-3 border ${
                  today 
                    ? 'bg-blue-50 border-blue-200' 
                    : past 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${
                        today ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {getDayShortName(date)}
                      </span>
                      <span className={`text-xs ${
                        today ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {formatDate(date)}
                      </span>
                      {today && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    {currentValue?.reason && (
                      <span className="text-xs text-gray-500 italic">
                        {currentValue.reason}
                      </span>
                    )}
                  </div>
                  
                  {/* Work Options - Enhanced mobile touch */}
                  <div className="flex gap-3">
                    {workOptions.map(option => {
                      const isSelected = currentValue?.value === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            if (!canEdit) return;
                            // Add haptic feedback
                            if ('vibrate' in navigator) {
                              navigator.vibrate(isSelected ? 25 : 50);
                            }
                            onWorkOptionClick(date, option.value);
                          }}
                          disabled={!canEdit}
                          className={`flex-1 py-4 px-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[56px] shadow-sm transform ${
                            canEdit ? 'active:scale-95 cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-60'
                          } ${
                            isSelected 
                              ? option.color + ' ring-2 ring-blue-500 ring-offset-2 shadow-lg scale-105' 
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-md'
                          }`}
                          title={canEdit ? option.description : 'You can only edit your own schedule'}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xl font-bold">{option.label}</span>
                            <span className="text-xs font-medium opacity-80">{option.hours}h</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}