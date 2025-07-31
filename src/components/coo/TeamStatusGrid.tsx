'use client';

import { Download, Eye, Users as UsersIcon } from 'lucide-react';
import { TeamDailyStatus } from '@/types';

interface TeamStatusGridProps {
  teams: TeamDailyStatus[];
  selectedTeam: string | null;
  filterByReason: string | null;
  selectedDate: Date;
  onTeamSelect: (teamId: string | null) => void;
}

export default function TeamStatusGrid({
  teams,
  selectedTeam,
  filterByReason,
  selectedDate,
  onTeamSelect
}: TeamStatusGridProps) {
  const filteredTeams = selectedTeam ? teams.filter(t => t.id.toString() === selectedTeam) : teams;

  const openTeamDetail = (teamId: number) => {
    // TODO: Implement team detail modal or navigation
    console.log('Open team detail for:', teamId);
  };

  const exportTeamDay = (teamId: number, date: Date) => {
    // TODO: Implement team day export functionality
    console.log('Export team day for:', teamId, date);
  };

  if (filteredTeams.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <div>לא נמצאו צוותים התואמים לקריטריונים • No teams match the current criteria</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredTeams.map(team => (
        <div key={team.id} className="border border-gray-200 rounded-lg p-4 transition-shadow hover:shadow-md">
          {/* Team Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{team.name}</h3>
              <p className="text-sm text-gray-500 truncate">מנהל: {team.manager}</p>
            </div>
            <div className="text-right ml-3">
              <div className="text-lg font-bold text-gray-900">
                {team.available}/{team.total}
              </div>
              <div className="text-xs text-gray-500">זמינים • Available</div>
            </div>
          </div>

          {/* Team Status Breakdown */}
          <div className="space-y-3">
            <TeamStatusBar team={team} />
            
            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-green-50 p-2 rounded text-center">
                <div className="font-medium text-green-800">{team.available}</div>
                <div className="text-green-600">זמינים</div>
              </div>
              <div className="bg-yellow-50 p-2 rounded text-center">
                <div className="font-medium text-yellow-800">{team.halfDay}</div>
                <div className="text-yellow-600">חצי יום</div>
              </div>
            </div>

            {/* Critical Absences */}
            {team.criticalAbsences.length > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <div className="text-xs font-medium text-red-800 mb-1">
                  חסרים קריטיים • Critical Absences:
                </div>
                {team.criticalAbsences.map(absence => (
                  <div key={absence.id} className="text-xs text-red-700">
                    • {absence.name} - {absence.reason || 'לא צוין'}
                  </div>
                ))}
              </div>
            )}

            {/* Reserve Duty */}
            {team.reserveDuty.length > 0 && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs font-medium text-blue-800 mb-1">
                  שמירה • Reserve Duty:
                </div>
                {team.reserveDuty.map(reserve => (
                  <div key={reserve.id} className="text-xs text-blue-700">
                    • {reserve.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
            <button
              onClick={() => openTeamDetail(team.id)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>פרטי צוות</span>
            </button>
            <button
              onClick={() => exportTeamDay(team.id, selectedDate)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>ייצוא</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Team Status Bar Component
interface TeamStatusBarProps {
  team: TeamDailyStatus;
}

function TeamStatusBar({ team }: TeamStatusBarProps) {
  const total = team.total;
  
  if (total === 0) {
    return (
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div className="bg-gray-400 h-3 rounded-full w-full opacity-50" />
      </div>
    );
  }

  const availableWidth = (team.available / total) * 100;
  const halfDayWidth = (team.halfDay / total) * 100;
  const reserveWidth = (team.reserveDuty.length / total) * 100;
  const unavailableWidth = (team.unavailable / total) * 100;

  return (
    <div className="space-y-1">
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className="flex h-full">
          {availableWidth > 0 && (
            <div 
              className="bg-green-500" 
              style={{ width: `${availableWidth}%` }}
              title={`${team.available} זמינים • ${team.available} Available`}
            />
          )}
          {halfDayWidth > 0 && (
            <div 
              className="bg-yellow-500" 
              style={{ width: `${halfDayWidth}%` }}
              title={`${team.halfDay} חצי יום • ${team.halfDay} Half Day`}
            />
          )}
          {reserveWidth > 0 && (
            <div 
              className="bg-blue-500" 
              style={{ width: `${reserveWidth}%` }}
              title={`${team.reserveDuty.length} שמירה • ${team.reserveDuty.length} Reserve Duty`}
            />
          )}
          {unavailableWidth > 0 && (
            <div 
              className="bg-red-500" 
              style={{ width: `${unavailableWidth}%` }}
              title={`${team.unavailable} לא זמינים • ${team.unavailable} Unavailable`}
            />
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-between text-xs text-gray-600">
        <span>{Math.round((team.available / total) * 100)}% זמינים</span>
        <span>{total} סה"כ</span>
      </div>
    </div>
  );
}