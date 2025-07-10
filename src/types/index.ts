export interface Team {
  id: number;
  name: string;
  description?: string;
  color?: string;
  sprint_length_weeks?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  hebrew: string;
  isManager?: boolean;
  email?: string;
  team_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkOption {
  value: '1' | '0.5' | 'X';
  label: string;
  hours: number;
  description: string;
  color: string;
}

export interface ScheduleEntry {
  value: '1' | '0.5' | 'X';
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DaySchedule {
  [dateKey: string]: ScheduleEntry;
}

export interface MemberSchedule {
  [dateKey: string]: ScheduleEntry;
}

export interface WeekData {
  [memberId: number]: MemberSchedule;
}

export interface ReasonDialogData {
  memberId: number;
  dateKey: string;
  value: '0.5' | 'X';
}

export interface TeamStats {
  id: number;
  name: string;
  description?: string;
  color?: string;
  sprint_length_weeks?: number;
  member_count: number;
  manager_count: number;
  current_sprint_number?: number;
  current_sprint_start?: string;
  current_sprint_end?: string;
  current_sprint_progress?: number;
}

export interface TeamContextType {
  selectedTeam: Team | null;
  teams: Team[];
  setSelectedTeam: (team: Team | null) => void;
  switchTeam: () => void;
}

// Global Sprint System Types
export interface GlobalSprintSettings {
  id: number;
  sprint_length_weeks: number;
  current_sprint_number: number;
  sprint_start_date: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface CurrentGlobalSprint {
  id: number;
  sprint_length_weeks: number;
  current_sprint_number: number;
  sprint_start_date: string;
  sprint_end_date: string;
  days_remaining: number;
  progress_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface TeamSprintStats {
  team_id: number;
  team_name: string;
  description?: string;
  color?: string;
  team_size: number;
  manager_count: number;
  current_sprint_number: number;
  sprint_start_date: string;
  sprint_end_date: string;
  progress_percentage: number;
  days_remaining: number;
  is_active: boolean;
  sprint_hours: number;
  current_week_hours: number;
  total_capacity_hours: number;
  capacity_utilization: number;
}

export interface GlobalSprintContextType {
  currentSprint: CurrentGlobalSprint | null;
  teamStats: TeamSprintStats | null;
  isLoading: boolean;
  error: string | null;
  refreshSprint: () => Promise<void>;
  updateSprintSettings: (settings: Partial<GlobalSprintSettings>) => Promise<boolean>;
  startNewSprint: (lengthWeeks: number) => Promise<boolean>;
}

// Export-related types
export type WeekExportType = 'current-week' | 'previous-week' | 'next-week' | 'specific-week';
export type SprintExportType = 'current-sprint' | 'previous-sprint' | 'specific-sprint';
export type ExportFormat = 'csv' | 'excel';
export type ExportGroupBy = 'week' | 'month' | 'none';

export interface WeekExportOptions {
  exportType: WeekExportType;
  specificWeekStart?: Date;
  includeReasons: boolean;
  includeStatistics: boolean;
  format: ExportFormat;
}

export interface SprintExportOptions {
  exportType: SprintExportType;
  sprintId?: number;
  includeWeeklyBreakdown: boolean;
  includeCapacityAnalysis: boolean;
  includeTeamSummary: boolean;
  format: ExportFormat;
}

export interface CustomExportOptions {
  startDate: Date;
  endDate: Date;
  groupBy: ExportGroupBy;
  includeReasons: boolean;
  includeStatistics: boolean;
  includeWeekends: boolean;
  format: ExportFormat;
}

export interface ExportOptions {
  type: 'week' | 'sprint' | 'custom';
  weekOptions?: WeekExportOptions;
  sprintOptions?: SprintExportOptions;
  customOptions?: CustomExportOptions;
}

export interface ExportData {
  teamName: string;
  exportType: string;
  dateRange: string;
  generatedBy: string;
  generatedAt: Date;
  members: TeamMember[];
  scheduleData: WeekData;
  statistics?: {
    totalHours: number;
    averageHours: number;
    utilizationPercentage: number;
    capacityHours: number;
  };
}