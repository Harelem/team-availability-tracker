export interface Team {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  hebrew: string;
  isManager?: boolean;
  is_manager?: boolean; // Database column name compatibility
  email?: string;
  team_id: number;
  role?: string; // NEW - member role (e.g., 'Team Manager', 'Team Member')
  is_critical?: boolean; // NEW - critical member flag for absence tracking
  inactive_date?: string; // NEW - for member lifecycle management
  created_at?: string;
  updated_at?: string;
}

export interface COOUser {
  id: number;
  name: string;
  hebrew: string;
  title: string;
  description: string;
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

// Access mode for the application
export type AccessMode = 'coo' | 'team' | null;

// Daily Company Status Types
export interface DailyMemberStatus {
  id: number;
  name: string;
  teamId: number;
  teamName: string;
  role?: string;
  hours: number; // 0, 0.5, or 1
  reason?: string;
  isCritical: boolean;
}

export interface TeamDailyStatus {
  id: number;
  name: string;
  manager: string;
  total: number;
  available: number;
  halfDay: number;
  unavailable: number;
  reserveDuty: DailyMemberStatus[];
  criticalAbsences: DailyMemberStatus[];
}

export interface DailyStatusSummary {
  available: number;
  halfDay: number;
  unavailable: number;
  reserve: number;
}

export interface DailyCompanyStatusData {
  summary: DailyStatusSummary;
  total: number;
  members: DailyMemberStatus[];
  teams: TeamDailyStatus[];
  selectedDate: Date;
}

// Team selection screen props
export interface TeamSelectionScreenProps {
  teams: Team[];
  onTeamSelect: (team: Team) => void;
}

// Global Sprint System Types
export interface GlobalSprintSettings {
  id: number;
  sprint_length_weeks: number;
  current_sprint_number: number;
  sprint_start_date: string;
  notes?: string;
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
  potential_hours: number;
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
  updateSprintDates: (startDate: string, endDate?: string) => Promise<boolean>;
}

// COO Hours View Toggle Types
export type HoursViewType = 'weekly' | 'sprint';

export interface DateRange {
  start: string;
  end: string;
  description: string;
  workingDays: number;
}

export interface TeamHoursData {
  current: number;
  potential: number;
  utilization: number;
}

export interface HoursViewToggleProps {
  currentView: HoursViewType;
  onViewChange: (view: HoursViewType) => void;
  sprintData: CurrentGlobalSprint | null;
}

export interface COOTeamCardProps {
  team: Team & { team_members?: TeamMember[] };
  hoursView: HoursViewType;
  sprintData: CurrentGlobalSprint | null;
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

// COO Dashboard Types
export interface CompanyCapacityMetrics {
  currentWeek: {
    potentialHours: number;
    actualHours: number;
    utilizationPercent: number;
    capacityGap: number;
    overCapacityTeams: TeamCapacityStatus[];
    underUtilizedTeams: TeamCapacityStatus[];
    allTeamsCapacity: TeamCapacityStatus[];
  };
  currentSprint: {
    totalPotentialHours: number;
    actualHoursToDate: number;
    projectedSprintTotal: number;
    sprintUtilizationTrend: number[];
    expectedSprintOutcome: number;
  };
  historicalTrends: {
    weeklyUtilization: WeeklyUtilization[];
    averageUtilization: number;
    peakUtilization: number;
    minimumUtilization: number;
  };
}

export interface TeamCapacityStatus {
  teamId: number;
  teamName: string;
  memberCount: number;
  weeklyPotential: number; // Keep for backwards compatibility - now represents "Potential" (Max minus absences)
  maxCapacity: number; // New field: team size × work days × 7 hours (theoretical maximum)
  actualHours: number;
  utilization: number;
  capacityGap: number;
  capacityStatus: 'optimal' | 'under' | 'over';
  color?: string;
}

export interface WeeklyUtilization {
  week: string;
  utilization: number;
  totalHours: number;
  potentialHours: number;
}

export interface CapacityForecast {
  nextWeekProjection: {
    potentialHours: number;
    projectedActual: number;
    expectedUtilization: number;
    confidenceLevel: number;
  };
  nextSprintProjection: {
    sprintPotential: number;
    projectedOutcome: number;
    riskFactors: string[];
    recommendedActions: string[];
  };
  quarterlyOutlook: {
    avgUtilization: number;
    capacityTrends: CapacityTrend[];
    resourceNeeds: ResourceNeed[];
  };
}

export interface CapacityTrend {
  period: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  value: number;
  change: number;
}

export interface ResourceNeed {
  team: string;
  needType: 'additional' | 'redistribution' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
}

export interface COODashboardData {
  companyOverview: {
    totalTeams: number;
    totalMembers: number;
    sprintMax: number;
    sprintPotential: number;
    currentUtilization: number;
    capacityGap: number;
    capacityGapPercentage: number;
  };
  teamComparison: TeamCapacityStatus[];
  sprintAnalytics: {
    currentSprintNumber: number;
    sprintWeeks: number;
    sprintPotential: number;
    sprintActual: number;
    sprintUtilization: number;
    weeklyBreakdown: {
      week: number;
      potential: number;
      actual: number;
      utilization: number;
    }[];
  };
  optimizationRecommendations: string[];
  capacityForecast: CapacityForecast;
}

// Enhanced Export Types
export type COOExportType = 'current-week' | 'current-sprint' | 'previous-sprint' | 'custom-range' | 'complete-overview';
export type ManagerExportType = 'current-week' | 'current-sprint' | 'previous-sprint' | 'custom-range';
export type EnhancedExportType = 'current-week' | 'current-sprint' | 'previous-sprint' | 'custom-range' | 'complete-overview';

export interface COOExportOptions {
  type: COOExportType;
  startDate?: Date;
  endDate?: Date;
  includeRecommendations: boolean;
  includeForecasting: boolean;
  includeTeamBreakdowns: boolean;
  format: 'excel' | 'csv';
}

export interface COOExportData {
  exportType: string;
  dateRange: string;
  generatedBy: string;
  generatedAt: Date;
  companyData: COODashboardData;
  detailedScheduleData?: DetailedCompanyScheduleData;
  additionalMetrics?: {
    historicalTrends: WeeklyUtilization[];
    teamPerformance: TeamPerformanceMetrics[];
    sprintHistory: SprintHistoryMetrics[];
  };
}

export interface DetailedCompanyScheduleData {
  teams: DetailedTeamScheduleData[];
  dateRange: {
    startDate: string;
    endDate: string;
    weekDays: string[];
  };
  companyTotals: {
    totalMembers: number;
    totalPotentialHours: number;
    totalActualHours: number;
    overallUtilization: number;
  };
}

export interface DetailedTeamScheduleData {
  teamId: number;
  teamName: string;
  teamColor: string;
  description?: string;
  members: DetailedMemberScheduleData[];
  teamTotals: {
    memberCount: number;
    potentialHours: number;
    actualHours: number;
    utilization: number;
    capacityGap: number;
  };
  managers: DetailedMemberScheduleData[];
}

export interface DetailedMemberScheduleData {
  memberId: number;
  memberName: string;
  memberHebrew: string;
  isManager: boolean;
  teamId: number;
  dailySchedule: { [dateKey: string]: MemberDaySchedule };
  weeklyTotals: {
    actualHours: number;
    potentialHours: number;
    utilization: number;
    daysWorked: number;
  };
  reasons: MemberReasonEntry[];
}

export interface MemberDaySchedule {
  date: string;
  value: '1' | '0.5' | 'X' | null;
  hours: number;
  reason?: string;
}

export interface MemberReasonEntry {
  date: string;
  value: '0.5' | 'X';
  reason: string;
  formattedDate: string;
}

export interface TeamPerformanceMetrics {
  teamId: number;
  teamName: string;
  memberCount: number;
  averageUtilization: number;
  consistencyScore: number;
  capacityTrend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface SprintHistoryMetrics {
  sprintNumber: number;
  startDate: string;
  endDate: string;
  totalPotential: number;
  actualHours: number;
  utilization: number;
  teamBreakdown: {
    teamId: number;
    teamName: string;
    potential: number;
    actual: number;
    utilization: number;
  }[];
}

// Enhanced Export Configuration Types
export interface EnhancedExportConfig {
  exportType: EnhancedExportType;
  customStartDate?: string;
  customEndDate?: string;
  includeDetailedSchedule: boolean;
  includeSprintAnalysis: boolean;
  includeReasons: boolean;
  includeUtilizationAnalysis: boolean;
  includeCrossTeamComparison?: boolean; // COO only
}

export interface DateRangeInfo {
  start: string;
  end: string;
  description: string;
  exportType: EnhancedExportType;
  workingDays: number;
  totalDays: number;
  weekDays: string[];
}

export interface SprintExportInfo {
  sprintNumber: number;
  startDate: string;
  endDate: string;
  lengthWeeks: number;
  isActive: boolean;
  totalWorkingDays: number;
}

export interface ExportStatistics {
  totalTeams: number;
  totalMembers: number;
  totalPotentialHours: number;
  totalActualHours: number;
  overallUtilization: number;
  exportPeriodDays: number;
  exportWorkingDays: number;
  highPerformingTeams: number;
  underPerformingTeams: number;
  overCapacityTeams: number;
}

export interface EnhancedExportData {
  config: EnhancedExportConfig;
  dateRange: DateRangeInfo;
  teams: DetailedTeamScheduleData[];
  scheduleEntries: unknown[];
  statistics: ExportStatistics;
  sprintInfo?: SprintExportInfo;
  userRole: 'coo' | 'manager';
  generatedBy: string;
  generatedAt: Date;
}

// Sprint Notes and Navigation Types
export interface SprintNotes {
  id: number;
  sprint_number: number;
  sprint_start_date: string;
  sprint_end_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface SprintNavigationData {
  sprint_number: number;
  sprint_start_date: string;
  sprint_end_date: string;
  sprint_length_weeks: number;
  is_current: boolean;
  is_past: boolean;
  is_future: boolean;
  status: 'current' | 'completed' | 'planned';
}

export interface SprintHistoryContext {
  current: SprintNavigationData;
  previous: SprintNavigationData | null;
  next: SprintNavigationData | null;
  position: {
    current: number;
    total: number;
    index: number;
  };
}

export interface EnhancedUnifiedSprintData {
  // Core sprint data
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  timeProgress: number;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  workingDaysRemaining: number;
  isOnTrack: boolean;
  settingsId: number;
  lastUpdated: string;
  sprintNumber: number;
  sprintWeeks: number;
  
  // Enhanced features
  notes: string;
  navigation: {
    hasPrevious: boolean;
    hasNext: boolean;
    previousSprint: SprintNavigationData | null;
    nextSprint: SprintNavigationData | null;
    position: {
      current: number;
      total: number;
      index: number;
    };
  };
}

// Team Dashboard Types (similar to COO but for single team)
export interface TeamDashboardData {
  teamOverview: {
    teamId: number;
    teamName: string;
    memberCount: number;
    managerCount: number;
    maxCapacity: number;
    sprintPotential: number;
    currentUtilization: number;
    capacityGap: number;
    capacityGapPercentage: number;
  };
  memberBreakdown: TeamMemberCapacityStatus[];
  currentWeekMetrics: {
    potentialHours: number;
    actualHours: number;
    utilization: number;
    absentMembers: number;
    halfDayMembers: number;
  };
  sprintProgress?: {
    sprintNumber: number;
    sprintWeeks: number;
    sprintPotential: number;
    sprintActual: number;
    sprintUtilization: number;
    daysRemaining: number;
  };
}

export interface TeamMemberCapacityStatus {
  memberId: number;
  memberName: string;
  isManager: boolean;
  weeklyPotential: number;
  actualHours: number;
  utilization: number;
  status: 'available' | 'half-day' | 'unavailable';
  reason?: string;
}