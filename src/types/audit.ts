export interface AuditCheck {
  category: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'ERROR';
  passed: number;
  total: number;
  issues: string[];
  details: DatabaseConsistencyCheck | { teams: TeamIntegrityCheck[] } | { checks: HoursCalculationCheck[] } | { sprint: SprintDataCheck | null } | Record<string, unknown>;
  timestamp?: string;
}

export interface AuditResult {
  timestamp: string;
  userRole: 'team' | 'coo';
  teamScope: string;
  checks: AuditCheck[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
    errorChecks: number;
    overallStatus: 'PASS' | 'FAIL' | 'WARNING' | 'ERROR';
  };
  error?: string;
}

export interface DatabaseConsistencyCheck {
  teamsFound: number;
  membersFound: number;
  scheduleEntriesFound: number;
  expectedTeams: string[];
  missingTeams: string[];
  orphanedMembers: unknown[];
  orphanedEntries: unknown[];
}

export interface TeamIntegrityCheck {
  teamName: string;
  expectedSize: number;
  actualSize: number;
  managersFound: number;
  membersWithoutTeam: unknown[];
  membersWithInvalidData: unknown[];
}

export interface HoursCalculationCheck {
  memberName: string;
  dateRange: { start: string; end: string };
  calculatedHours: number;
  displayedHours: number;
  difference: number;
  isAccurate: boolean;
}

export interface SprintDataCheck {
  sprintNumber: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  daysRemaining: number;
  progressPercentage: number;
}

export interface AuditConfig {
  includeDatabaseConsistency: boolean;
  includeTeamIntegrity: boolean;
  includeScheduleValidation: boolean;
  includeHoursCalculation: boolean;
  includeSprintData: boolean;
  includePermissions: boolean;
  dateRange?: { start: string; end: string };
  teamIds?: number[];
}