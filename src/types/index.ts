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

export interface TeamSprint {
  id: number;
  team_id: number;
  sprint_number: number;
  start_date: string;
  end_date: string;
  created_at?: string;
}

export interface TeamAnalytics {
  currentWeekHours: number;
  sprintHours: number;
  averageHoursPerMember: number;
  capacityUtilization: number;
  teamCapacity: number;
}