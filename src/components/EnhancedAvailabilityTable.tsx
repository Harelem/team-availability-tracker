'use client';

import { Clock, MessageSquare } from 'lucide-react';
import { TeamMember, WorkOption } from '@/types';
import EnhancedDayCell from './EnhancedDayCell';

interface EnhancedAvailabilityTableProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  scheduleData: any;
  workOptions: WorkOption[];
  weekDays: Date[];
  onWorkOptionClick: (memberId: number, date: Date, value: string) => void;
  onReasonRequired: (memberId: number, date: Date, value: '0.5' | 'X') => void;
  onFullWeekSet: (memberId: number) => void;
  calculateWeeklyHours: (memberId: number) => number;
  getTeamTotalHours: () => number;
  isToday: (date: Date) => boolean;
  isPastDate: (date: Date) => boolean;
  formatDate: (date: Date) => string;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export default function EnhancedAvailabilityTable({
  currentUser,
  teamMembers,
  scheduleData,
  workOptions,
  weekDays,
  onWorkOptionClick,
  onReasonRequired,
  onFullWeekSet,
  calculateWeeklyHours,
  getTeamTotalHours,
  isToday,
  isPastDate,
  formatDate
}: EnhancedAvailabilityTableProps) {

  // Calculate daily totals for footer
  const getDayTotal = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return teamMembers.reduce((total, member) => {
      const value = scheduleData[member.id]?.[dateKey];
      const option = workOptions.find(opt => opt.value === value?.value);
      return total + (option ? option.hours : 0);
    }, 0);
  };

  // Count reasons for the week
  const getWeekReasonStats = () => {
    let totalReasons = 0;
    let halfDayReasons = 0;
    let absenceReasons = 0;

    teamMembers.forEach(member => {
      const memberData = scheduleData[member.id] || {};
      Object.values(memberData).forEach((entry: any) => {
        if (entry?.reason) {
          totalReasons++;
          if (entry.value === '0.5') halfDayReasons++;
          if (entry.value === 'X') absenceReasons++;
        }
      });
    });

    return { totalReasons, halfDayReasons, absenceReasons };
  };

  const reasonStats = getWeekReasonStats();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Reason Summary Bar (if there are reasons) */}
      {reasonStats.totalReasons > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-blue-700">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">{reasonStats.totalReasons} reasons this week</span>
              </div>
              {reasonStats.halfDayReasons > 0 && (
                <span className="text-yellow-700">
                  {reasonStats.halfDayReasons} half-day
                </span>
              )}
              {reasonStats.absenceReasons > 0 && (
                <span className="text-red-700">
                  {reasonStats.absenceReasons} absences
                </span>
              )}
            </div>
            <div className="text-blue-600 text-xs">
              Hover over 💬 icons to see reason details
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[640px]">
          {/* Table Header */}
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-gray-50 text-left py-3 px-2 sm:py-4 sm:px-6 font-semibold text-gray-900 border-r min-w-[120px] sm:min-w-[140px]">
                <div className="text-xs sm:text-sm">Team Member</div>
              </th>
              {dayNames.map((day, index) => {
                const dayDate = weekDays[index];
                const today = isToday(dayDate);
                const past = isPastDate(dayDate);
                
                return (
                  <th key={day} className={`text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold border-r min-w-[85px] sm:min-w-[120px] ${
                    today 
                      ? 'bg-blue-100 text-blue-900 border-blue-300' 
                      : past
                      ? 'bg-gray-50 text-gray-600'
                      : 'bg-gray-50 text-gray-900'
                  }`}>
                    <div className="flex flex-col">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs sm:text-sm font-medium">{day.slice(0, 3)}</span>
                        {today && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <span className={`text-xs mt-0.5 sm:mt-1 ${
                        today ? 'text-blue-700 font-medium' : 'text-gray-500'
                      }`}>
                        {formatDate(dayDate)}
                        {today && <span className="block text-xs font-medium">Today</span>}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="text-center py-3 px-1 sm:py-4 sm:px-4 font-semibold text-gray-900 bg-blue-50 min-w-[70px] sm:min-w-[80px]">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Hours</span>
                </div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {teamMembers.map((member, memberIndex) => {
              const canEdit = currentUser.isManager || member.id === currentUser.id;
              const isCurrentUserRow = member.id === currentUser.id;
              
              return (
                <tr key={member.id} className={`border-b transition-colors ${
                  isCurrentUserRow ? 'bg-blue-50 ring-2 ring-blue-200' : 
                  memberIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}>
                  {/* Member Info */}
                  <td className="sticky left-0 z-10 py-3 px-2 sm:py-4 sm:px-6 font-medium text-gray-900 border-r bg-inherit">
                    <div className="flex items-center gap-1 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs sm:text-base truncate">{member.name}</div>
                        <div className="text-xs text-gray-500 sm:block">{member.hebrew}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {member.isManager && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded">Mgr</span>
                          )}
                          {isCurrentUserRow && (
                            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => onFullWeekSet(member.id)}
                            className="mt-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                            title="Set full working week"
                          >
                            Full Week
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Day Cells */}
                  {weekDays.map((date) => {
                    const dateKey = date.toISOString().split('T')[0];
                    const currentValue = scheduleData[member.id]?.[dateKey];
                    
                    return (
                      <EnhancedDayCell
                        key={dateKey}
                        member={member}
                        date={date}
                        currentValue={currentValue}
                        workOptions={workOptions}
                        canEdit={canEdit}
                        isToday={isToday(date)}
                        isPast={isPastDate(date)}
                        onWorkOptionClick={onWorkOptionClick}
                        onReasonRequired={onReasonRequired}
                      />
                    );
                  })}

                  {/* Weekly Hours */}
                  <td className="py-3 px-1 sm:py-4 sm:px-4 text-center bg-blue-50 font-bold text-xs sm:text-lg">
                    {calculateWeeklyHours(member.id)}h
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer */}
          <tfoot className="bg-gray-100 sticky bottom-0">
            <tr>
              <td className="sticky left-0 z-10 bg-gray-100 py-3 px-2 sm:py-4 sm:px-6 font-bold text-gray-900 border-r text-xs sm:text-base">
                Team Total
              </td>
              {weekDays.map((date) => {
                const dayTotal = getDayTotal(date);
                
                return (
                  <td key={date.toISOString().split('T')[0]} className="py-3 px-1 sm:py-4 sm:px-4 text-center border-r font-semibold text-xs sm:text-base">
                    {dayTotal}h
                  </td>
                );
              })}
              <td className="py-3 px-1 sm:py-4 sm:px-4 text-center bg-blue-100 font-bold text-sm sm:text-xl">
                {getTeamTotalHours()}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
        <h3 className="font-semibold mb-2 text-sm sm:text-base">Work Options:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {workOptions.map(option => (
            <div key={option.value} className="flex items-center gap-2 p-2 sm:p-0 bg-white sm:bg-transparent rounded-lg">
              <span className={`px-2 sm:px-3 py-1 rounded-md border font-medium text-xs sm:text-sm min-w-[32px] text-center ${option.color}`}>
                {option.label}
              </span>
              <span className="text-xs sm:text-sm text-gray-600 flex-1">{option.description}</span>
            </div>
          ))}
        </div>
        
        {/* Hebrew Legend */}
        <div className="mt-3 pt-3 border-t border-gray-300">
          <p className="text-xs text-gray-600">
            <strong>Quick Hebrew Reasons:</strong> 🛡️ שמירה (Reserve), 🤒 מחלה (Sick), 🏖️ חופשה (Vacation), 
            🩺 רופא (Doctor), 👨‍👩‍👧‍👦 משפחה (Family), 📋 אישי (Personal)
          </p>
        </div>
      </div>
    </div>
  );
}