'use client';

import { ChevronRight, Home, Users, User } from 'lucide-react';
import { Team, TeamMember } from '@/types';

interface MobileBreadcrumbProps {
  selectedTeam: Team | null;
  selectedUser: TeamMember | null;
  onNavigateToTeamSelection: () => void;
  onNavigateToMemberSelection: () => void;
}

export default function MobileBreadcrumb({
  selectedTeam,
  selectedUser,
  onNavigateToTeamSelection,
  onNavigateToMemberSelection
}: MobileBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm mb-3 lg:hidden">
      {/* Team Selection */}
      <button
        onClick={onNavigateToTeamSelection}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors touch-manipulation min-h-[32px] ${
          !selectedTeam
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Home className="w-3 h-3" />
        <span className="hidden xs:inline">Teams</span>
      </button>

      {selectedTeam && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <button
            onClick={selectedUser ? onNavigateToMemberSelection : undefined}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors touch-manipulation min-h-[32px] truncate max-w-[120px] ${
              selectedTeam && !selectedUser
                ? 'bg-blue-100 text-blue-700 font-medium'
                : selectedUser
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-500'
            }`}
          >
            <Users className="w-3 h-3 shrink-0" />
            <span className="truncate text-xs">{selectedTeam.name}</span>
          </button>
        </>
      )}

      {selectedUser && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 font-medium rounded-md min-h-[32px] truncate max-w-[100px]">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate text-xs">{selectedUser.name}</span>
          </div>
        </>
      )}
    </nav>
  );
}