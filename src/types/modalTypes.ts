/**
 * TypeScript interfaces for Team Detail Modal components
 */

import { Team, TeamMember, CurrentGlobalSprint } from './index';

// Core Modal Props
export interface TeamDetailModalProps {
  teamId: number;
  isOpen: boolean;
  onClose: () => void;
}

// Team Information Section
export interface TeamInfo {
  id: number;
  name: string;
  description?: string;
  color?: string;
  managerName?: string;
  managerEmail?: string;
  memberCount: number;
  created_at?: string;
  updated_at?: string;
}

// Sprint Summary Section
export interface SprintSummary {
  sprintNumber: number;
  startDate: string;
  endDate: string;
  lengthWeeks: number;
  potentialHours: number;
  plannedHours: number;
  completedHours: number;
  completionPercentage: number;
  daysRemaining: number;
  progressPercentage: number;
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  healthColor: string;
  isActive: boolean;
}

// Team Member with Extended Details
export interface DetailedTeamMember extends TeamMember {
  role?: string;
  currentWeekStatus: 'available' | 'partial' | 'unavailable';
  currentWeekHours: number;
  sprintPlannedHours: number;
  sprintCompletedHours: number;
  individualCompletionPercentage: number;
  lastActivityTimestamp?: string;
  lastActivityDescription?: string;
  availabilityColor: string;
}

// Team Statistics Section
export interface TeamStatistics {
  averageUtilization: number;
  currentSprintUtilization: number;
  mostProductiveDay: string;
  mostProductiveDayHours: number;
  topAbsenceReasons: AbsenceReason[];
  trendIndicator: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  comparisonToOtherTeams: {
    rank: number;
    totalTeams: number;
    percentile: number;
  };
  weeklyTrends: WeeklyTrend[];
}

export interface AbsenceReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface WeeklyTrend {
  week: string;
  utilization: number;
  hours: number;
}

// Activity Timeline Section
export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'schedule_update' | 'member_added' | 'member_removed' | 'sprint_change' | 'notification';
  description: string;
  userName?: string;
  userId?: number;
  memberName?: string;
  details?: string;
  icon: string;
  color: string;
}

export interface PendingEntry {
  memberId: number;
  memberName: string;
  date: string;
  type: 'missing_schedule' | 'missing_reason' | 'incomplete_data';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// Consolidated Team Detail Data
export interface TeamDetailData {
  teamInfo: TeamInfo;
  currentSprint: SprintSummary;
  members: DetailedTeamMember[];
  statistics: TeamStatistics;
  recentActivity: ActivityLog[];
  pendingEntries: PendingEntry[];
  lastUpdated: string;
}

// Action Results
export interface ExportResult {
  success: boolean;
  filename?: string;
  downloadUrl?: string;
  error?: string;
}


export interface NavigationResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

// Hook Return Types
export interface UseTeamDetailReturn {
  data: TeamDetailData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastFetch: Date | null;
}

export interface UseTeamActionsReturn {
  exportTeamData: (format: 'csv' | 'excel') => Promise<ExportResult>;
  navigateToTeamDashboard: () => Promise<NavigationResult>;
  loading: boolean;
  error: string | null;
}

export interface UseModalKeyboardReturn {
  handleKeyDown: (event: KeyboardEvent) => void;
  focusedElementIndex: number;
  setFocusedElement: (index: number) => void;
}

// Modal Section Props
export interface TeamHeaderProps {
  teamInfo: TeamInfo;
  currentSprint: SprintSummary;
}

export interface SprintSummaryProps {
  sprintData: SprintSummary;
  className?: string;
}

export interface TeamMembersGridProps {
  members: DetailedTeamMember[];
  onMemberClick?: (memberId: number) => void;
  className?: string;
}

export interface TeamStatisticsProps {
  statistics: TeamStatistics;
  className?: string;
}

export interface ActivityTimelineProps {
  activities: ActivityLog[];
  pendingEntries: PendingEntry[];
  className?: string;
}

export interface ActionPanelProps {
  teamId: number;
  teamName: string;
  memberIds: number[];
  onExport: (format: 'csv' | 'excel') => void;
  onNavigateToDashboard: () => void;
  onClose: () => void;
  loading?: boolean;
  className?: string;
}

// Modal State Management
export interface ModalState {
  isOpen: boolean;
  teamId: number | null;
  activeSection: 'header' | 'sprint' | 'members' | 'statistics' | 'activity' | 'actions';
  selectedMembers: number[];
}

// Filter and Sort Options
export interface MemberFilterOptions {
  status: 'all' | 'available' | 'partial' | 'unavailable';
  role: 'all' | 'manager' | 'member';
  sortBy: 'name' | 'completion' | 'hours' | 'activity';
  sortOrder: 'asc' | 'desc';
}

export interface ActivityFilterOptions {
  type: 'all' | 'schedule_update' | 'member_added' | 'member_removed' | 'sprint_change' | 'notification';
  dateRange: {
    start: string;
    end: string;
  };
  userId?: number;
}

// Error Types
export interface ModalError {
  type: 'network' | 'permission' | 'data' | 'validation';
  message: string;
  details?: string;
  timestamp: string;
  retryable: boolean;
}

// Loading States
export interface LoadingState {
  overall: boolean;
  sections: {
    teamInfo: boolean;
    sprint: boolean;
    members: boolean;
    statistics: boolean;
    activity: boolean;
  };
}

// Responsive Configuration
export interface ResponsiveConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  modalSize: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  sectionsPerRow: number;
  showCompactView: boolean;
}