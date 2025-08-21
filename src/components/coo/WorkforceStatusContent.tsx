'use client';

import React, { useMemo } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { DailyMemberStatus } from '@/types';
import { WorkforceStatusContentProps } from '@/types/modalTypes';

export default function WorkforceStatusContent({
  dailyStatus,
  isLoading,
  selectedDate,
  isMobile = false
}: WorkforceStatusContentProps) {
  
  // Status categories with Hebrew labels and colors
  const statusCategories = {
    available: { 
      label: 'זמינים', 
      englishLabel: 'Available',
      color: 'bg-green-500', 
      lightColor: 'bg-green-50 border-green-200',
      icon: '✅'
    },
    halfDay: { 
      label: 'חצי יום', 
      englishLabel: 'Half Day',
      color: 'bg-yellow-500', 
      lightColor: 'bg-yellow-50 border-yellow-200',
      icon: '⏰'
    },
    unavailable: { 
      label: 'לא זמינים', 
      englishLabel: 'Unavailable',
      color: 'bg-red-500', 
      lightColor: 'bg-red-50 border-red-200',
      icon: '❌'
    },
    reserve: { 
      label: 'שמירה', 
      englishLabel: 'Reserve Duty',
      color: 'bg-blue-500', 
      lightColor: 'bg-blue-50 border-blue-200',
      icon: '🛡️'
    }
  };

  // Group members by status
  const groupedMembers = useMemo(() => {
    if (!dailyStatus?.members) return {};

    const groups = {
      available: [] as DailyMemberStatus[],
      halfDay: [] as DailyMemberStatus[],
      unavailable: [] as DailyMemberStatus[],
      reserve: [] as DailyMemberStatus[]
    };

    dailyStatus.members.forEach(member => {
      if (member.reason === 'שמירה') {
        groups.reserve.push(member);
      } else if (member.hours === 1) {
        groups.available.push(member);
      } else if (member.hours === 0.5) {
        groups.halfDay.push(member);
      } else {
        groups.unavailable.push(member);
      }
    });

    // Sort each group by team name, then by member name
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups].sort((a, b) => {
        if (a.teamName !== b.teamName) {
          return a.teamName.localeCompare(b.teamName);
        }
        return a.name.localeCompare(b.name);
      });
    });

    return groups;
  }, [dailyStatus?.members]);

  // Format member display text as requested: "John - שמירה [his reason]"
  const formatMemberDisplay = (member: DailyMemberStatus) => {
    const statusText = member.reason === 'שמירה' ? 'שמירה' :
                     member.hours === 1 ? 'זמין' :
                     member.hours === 0.5 ? 'חצי יום' : 'לא זמין';
    
    const reasonPart = member.reason ? ` [${member.reason}]` : '';
    return `${member.name} - ${statusText}${reasonPart}`;
  };

  const getStatusIcon = (member: DailyMemberStatus) => {
    if (member.reason === 'שמירה') return statusCategories.reserve.icon;
    if (member.hours === 0) return statusCategories.unavailable.icon;
    if (member.hours === 0.5) return statusCategories.halfDay.icon;
    return statusCategories.available.icon;
  };

  const getStatusCategory = (member: DailyMemberStatus): keyof typeof statusCategories => {
    if (member.reason === 'שמירה') return 'reserve';
    if (member.hours === 0) return 'unavailable';
    if (member.hours === 0.5) return 'halfDay';
    return 'available';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading workforce status...</p>
        </div>
      </div>
    );
  }

  if (!dailyStatus || !dailyStatus.members || dailyStatus.members.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 px-6">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <div className="text-lg mb-2">No workforce data available</div>
        <div className="text-sm">לא זמינים נתוני כוח אדם</div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-6`}>
      {/* Summary Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Daily Summary • סיכום יומי
          </h3>
          <div className="text-sm text-gray-600">
            {dailyStatus.total} total members • סה"כ עובדים
          </div>
        </div>
        
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          {Object.entries(statusCategories).map(([key, category]) => {
            const count = (groupedMembers as any)[key]?.length || 0;
            return (
              <div key={key} className="text-center">
                <div className={`inline-flex items-center justify-center rounded-full ${category.color} text-white text-sm font-bold mb-2 ${
                  isMobile ? 'w-10 h-10' : 'w-8 h-8'
                }`}>
                  {count}
                </div>
                <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  <div>{category.label}</div>
                  <div>{category.englishLabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Member Groups */}
      {Object.entries(statusCategories).map(([statusKey, category]) => {
        const members = (groupedMembers as any)[statusKey] || [];
        
        if (members.length === 0) return null;

        return (
          <div key={statusKey} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${category.color}`}></div>
              <h4 className="text-lg font-semibold text-gray-900">
                {category.label} • {category.englishLabel} ({members.length})
              </h4>
            </div>
            
            <div className={`grid gap-3 ${
              isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {members.map((member: any) => (
                <div
                  key={member.id}
                  className={`border rounded-lg transition-all hover:shadow-sm ${category.lightColor} ${
                    member.isCritical && member.hours === 0 ? 'ring-2 ring-red-400' : ''
                  } ${isMobile ? 'p-4 min-h-[80px]' : 'p-3'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Member name and status in requested format */}
                      <div className="font-medium text-gray-900 text-sm mb-1">
                        {formatMemberDisplay(member)}
                      </div>
                      
                      {/* Team info */}
                      <div className="text-xs text-gray-600 mb-2">
                        {member.teamName}
                        {member.role && ` • ${member.role}`}
                      </div>

                      {/* Hours info */}
                      <div className="text-xs text-gray-500">
                        {member.hours === 1 ? '7 hours' : 
                         member.hours === 0.5 ? '3.5 hours' : '0 hours'}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="text-lg">{getStatusIcon(member)}</div>
                      {member.isCritical && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Critical
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}