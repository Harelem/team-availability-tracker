'use client';

import { Users, Zap } from 'lucide-react';
import { TeamMember, Team } from '@/types';
import { DESIGN_SYSTEM, combineClasses } from '@/utils/designSystem';

interface QuickActionsBarProps {
  currentUser: TeamMember;
  selectedTeam: Team;
  onFullWeekSet: (memberId: number) => void;
}

export default function QuickActionsBar({
  currentUser,
  selectedTeam,
  onFullWeekSet
}: QuickActionsBarProps) {
  return (
    <div className={combineClasses(
      'bg-white border-b border-gray-200',
      DESIGN_SYSTEM.spacing.responsive.sm
    )}>
      <div className="flex items-center justify-between">
        {/* Left: Quick Actions */}
        <div className={combineClasses(
          'flex items-center',
          DESIGN_SYSTEM.grids.gap.sm
        )}>
          <button
            onClick={() => onFullWeekSet(currentUser.id)}
            className={combineClasses(
              'flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200',
              DESIGN_SYSTEM.buttons.md,
              DESIGN_SYSTEM.buttons.touch,
              DESIGN_SYSTEM.radius.md,
              DESIGN_SYSTEM.transitions.default,
              'text-sm'
            )}
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Full Week • שבוע מלא</span>
            <span className="sm:hidden">Full Week</span>
          </button>
        </div>

        {/* Right: Team Info */}
        <div className={combineClasses(
          'hidden md:flex items-center text-sm text-gray-600',
          DESIGN_SYSTEM.grids.gap.sm
        )}>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{selectedTeam.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}