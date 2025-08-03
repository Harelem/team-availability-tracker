'use client';

import { ChevronRight, Home, Users, User } from 'lucide-react';
import { Team, TeamMember } from '@/types';

interface MobileBreadcrumbProps {
  selectedTeam: Team | null;
  selectedUser: TeamMember | null;
  onNavigateToTeamSelection: () => void;
  onNavigateToMemberSelection: () => void;
  cooNavigationSource?: 'dashboard' | 'team' | null;
}

export default function MobileBreadcrumb({
  selectedTeam,
  selectedUser,
  onNavigateToTeamSelection,
  onNavigateToMemberSelection,
  cooNavigationSource
}: MobileBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 mb-3 lg:hidden">
      {/* Team Selection / COO Dashboard */}
      <button
        onClick={onNavigateToTeamSelection}
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors touch-manipulation min-h-[44px] min-w-[44px] ${
          !selectedTeam
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        title={cooNavigationSource === 'team' ? 'Back to COO Dashboard' : 'Back to Teams'}
      >
        <Home className="w-4 h-4" />
        <span className="hidden xs:inline text-sm font-medium">
          {cooNavigationSource === 'team' ? 'COO' : 'Teams'}
        </span>
      </button>

      {selectedTeam && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button
            onClick={selectedUser ? onNavigateToMemberSelection : undefined}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors touch-manipulation min-h-[44px] min-w-[44px] truncate max-w-[140px] ${
              selectedTeam && !selectedUser
                ? 'bg-blue-100 text-blue-700 font-medium'
                : selectedUser
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-500'
            }`}
            title={selectedTeam.name}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate text-sm font-medium">{selectedTeam.name}</span>
          </button>
        </>
      )}

      {selectedUser && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div 
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 font-medium rounded-md min-h-[44px] truncate max-w-[120px]"
            title={selectedUser.name}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate text-sm font-medium">{selectedUser.name}</span>
          </div>
        </>
      )}
    </nav>
  );
}