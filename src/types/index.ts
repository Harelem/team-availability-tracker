export interface TeamMember {
  id: number;
  name: string;
  hebrew: string;
  isManager?: boolean;
  email?: string;
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