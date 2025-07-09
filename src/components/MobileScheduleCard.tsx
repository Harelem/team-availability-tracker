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
    <div className={`bg-white rounded-lg shadow-sm border-2 mb-4 overflow-hidden transition-all duration-200 ${
      isCurrentUser ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
    }`}>
      {/* Card Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <User className={`w-5 h-5 ${isCurrentUser ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-base">{member.name}</h3>
              <p className="text-sm text-gray-500">{member.hebrew}</p>
              <div className="flex items-center gap-2 mt-1">
                {member.isManager && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Manager
                  </span>
                )}
                {isCurrentUser && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{calculateWeeklyHours()}h</span>
              </div>
              <div className="text-xs text-gray-500">this week</div>
            </div>
            <div className={`w-6 h-6 rounded-full transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Card Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Full Week Button */}
          {canEdit && (
            <div className="mb-4">
              <button
                onClick={onFullWeekSet}
                className="w-full bg-green-50 text-green-700 border border-green-200 rounded-lg py-3 px-4 font-medium text-sm hover:bg-green-100 active:bg-green-200 transition-colors touch-manipulation"
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Set Full Working Week
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
                  
                  {/* Work Options */}
                  <div className="flex gap-2">
                    {workOptions.map(option => {
                      const isSelected = currentValue?.value === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => canEdit && onWorkOptionClick(date, option.value)}
                          disabled={!canEdit}
                          className={`flex-1 py-3 px-4 rounded-md border font-medium text-sm transition-all touch-manipulation min-h-[44px] ${
                            canEdit ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-60'
                          } ${
                            isSelected 
                              ? option.color + ' ring-2 ring-blue-500 ring-offset-1' 
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                          title={canEdit ? option.description : 'You can only edit your own schedule'}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-lg font-bold">{option.label}</span>
                            <span className="text-xs">{option.hours}h</span>
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