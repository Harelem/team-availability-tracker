/**
 * Types for team member completion tooltip functionality
 */

export interface MissingMember {
  id: number;
  name: string;
  hebrew: string;
  completionRate: number;
  missingDays: number;
}

export interface CompletedMember {
  id: number;
  name: string;
  hebrew: string;
}

export interface MissingMemberData {
  teamId: number;
  teamName: string;
  sprintPeriod: {
    start: string;
    end: string;
  };
  totalWorkingDays: number;
  missingMembers: MissingMember[];
  completedMembers: CompletedMember[];
  lastCalculated: Date;
}

export interface TooltipPosition {
  top: number;
  left: number;
  transform: string;
  maxWidth: string;
}

export interface TooltipState {
  hoveredTeam: string | null;
  tooltipData: Record<string, MissingMemberData>;
  tooltipLoading: Record<string, boolean>;
  showTooltip: Record<string, boolean>;
}

export interface TeamCardHoverEvent {
  teamId: number;
  teamName: string;
  sprintType: 'current' | 'next';
  cardElement: HTMLElement;
}

export interface TooltipHookOptions {
  debounceMs?: number;
  enableMobile?: boolean;
  cacheTimeout?: number; // minutes
}