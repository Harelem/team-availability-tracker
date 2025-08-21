'use client';

import { useMemo } from 'react';
import { Phone, Mail, Users, AlertTriangle } from 'lucide-react';
import { DailyMemberStatus, TeamDailyStatus } from '@/types';

interface DailyMembersListProps {
  members: DailyMemberStatus[];
  teams: TeamDailyStatus[];
  selectedTeam: string | null;
  filterByReason: string | null;
  selectedDate: Date;
}

export default function DailyMembersList({
  members,
  teams,
  selectedTeam,
  filterByReason,
  selectedDate
}: DailyMembersListProps) {
  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Filter by team
    if (selectedTeam) {
      filtered = filtered.filter(m => m.teamId.toString() === selectedTeam);
    }

    // Filter by reason/status
    if (filterByReason) {
      filtered = filtered.filter(m => {
        switch (filterByReason) {
          case 'available': return m.hours === 1;
          case 'halfDay': return m.hours === 0.5;
          case 'unavailable': return m.hours === 0 && m.reason !== 'שמירה';
          case 'reserve': return m.reason === 'שמירה';
          default: return true;
        }
      });
    }

    // Sort by priority: critical absences first, then by team, then by name
    return filtered.sort((a, b) => {
      // Critical members first
      if (a.isCritical && a.hours === 0 && (!b.isCritical || b.hours !== 0)) return -1;
      if (b.isCritical && b.hours === 0 && (!a.isCritical || a.hours !== 0)) return 1;
      
      // Then by team
      if (a.teamName !== b.teamName) {
        return a.teamName.localeCompare(b.teamName);
      }
      
      // Then by status (unavailable first for attention)
      if (a.hours !== b.hours) {
        return a.hours - b.hours; // 0 first, then 0.5, then 1
      }
      
      // Finally by name
      return a.name.localeCompare(b.name);
    });
  }, [members, selectedTeam, filterByReason]);

  const getStatusIcon = (member: DailyMemberStatus) => {
    if (member.reason === 'שמירה') return '🛡️';
    if (member.hours === 0) return '❌';
    if (member.hours === 0.5) return '⏰';
    return '✅';
  };

  const getStatusColor = (member: DailyMemberStatus) => {
    if (member.reason === 'שמירה') return 'border-blue-200 bg-blue-50';
    if (member.hours === 0) return 'border-red-200 bg-red-50';
    if (member.hours === 0.5) return 'border-yellow-200 bg-yellow-50';
    return 'border-green-200 bg-green-50';
  };

  const getStatusText = (member: DailyMemberStatus) => {
    if (member.reason === 'שמירה') return { he: 'שמירה', en: 'Reserve Duty' };
    if (member.hours === 0) return { he: 'לא זמין', en: 'Unavailable' };
    if (member.hours === 0.5) return { he: 'חצי יום', en: 'Half Day' };
    return { he: 'זמין', en: 'Available' };
  };

  const getHoursText = (hours: number) => {
    if (hours === 1) return '7h';
    if (hours === 0.5) return '3.5h';
    return '0h';
  };

  const contactMember = (memberId: number) => {
    // TODO: Implement contact functionality
    console.log('Contact member:', memberId);
  };

  return (
    <div className="overflow-hidden">
      {/* Summary Bar */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-sm">
          <div className="text-gray-600">
            מציג {filteredMembers.length} מתוך {members.length} עובדים • 
            Showing {filteredMembers.length} of {members.length} employees
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>זמין • Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>חצי יום • Half Day</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>שמירה • Reserve</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>לא זמין • Unavailable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="p-4">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <div className="text-lg mb-2">לא נמצאו עובדים</div>
            <div className="text-sm">No employees match the current criteria</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMembers.map(member => {
              const statusText = getStatusText(member);
              
              return (
                <div
                  key={member.id}
                  className={`border rounded-lg p-3 transition-all hover:shadow-md ${getStatusColor(member)} ${
                    member.isCritical && member.hours === 0 ? 'ring-2 ring-red-400' : ''
                  }`}
                >
                  {/* Member Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-300 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-600">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {member.teamName}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="text-lg">{getStatusIcon(member)}</div>
                      <div className="text-xs text-gray-600">
                        {getHoursText(member.hours)}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {statusText.he} • {statusText.en}
                    </div>
                  </div>

                  {/* Reason */}
                  {member.reason && (
                    <div className="mb-3 p-2 bg-white bg-opacity-50 rounded border">
                      <div className="text-xs text-gray-600 mb-1">
                        <span className="font-medium">סיבה • Reason:</span>
                      </div>
                      <div className="text-xs text-gray-800 break-words">
                        {member.reason}
                      </div>
                    </div>
                  )}

                  {/* Critical Badge */}
                  {member.isCritical && (
                    <div className="mb-2">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        <span>קריטי • Critical</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions for Unavailable/Critical Members */}
                  {(member.hours === 0 || member.isCritical) && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => contactMember(member.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          title="Contact member"
                        >
                          <Phone className="w-3 h-3" />
                          <span>קשר</span>
                        </button>
                        <button 
                          onClick={() => contactMember(member.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          title="Send email"
                        >
                          <Mail className="w-3 h-3" />
                          <span>מייל</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}