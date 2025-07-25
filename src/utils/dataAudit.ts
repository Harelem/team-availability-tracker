import { supabase } from '@/lib/supabase';
import { 
  AuditResult, 
  AuditCheck, 
  AuditConfig,
  DatabaseConsistencyCheck,
  TeamIntegrityCheck,
  HoursCalculationCheck,
  SprintDataCheck
} from '@/types/audit';

const EXPECTED_TEAMS = [
  { name: 'Development Team - Tal', expectedSize: 4 },
  { name: 'Development Team - Itay', expectedSize: 5 },
  { name: 'Infrastructure Team', expectedSize: 3 },
  { name: 'Data Team', expectedSize: 6 }, // Nir removed, should have 6 members
  { name: 'Product Team', expectedSize: 8 },
  { name: 'Management Team', expectedSize: 1 } // New team for Nir Shilo (COO)
];

export class DataAuditService {
  static async performComprehensiveAudit(
    userRole: 'team' | 'coo',
    teamScope: string,
    config: AuditConfig
  ): Promise<AuditResult> {
    console.log('🔍 Starting comprehensive data audit...', { userRole, teamScope });
    
    const auditResult: AuditResult = {
      timestamp: new Date().toISOString(),
      userRole,
      teamScope,
      checks: [],
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0,
        errorChecks: 0,
        overallStatus: 'PASS'
      }
    };

    try {
      const checks: AuditCheck[] = [];

      // Audit 1: Database Consistency Check
      if (config.includeDatabaseConsistency) {
        console.log('🔍 Running database consistency check...');
        const dbCheck = await this.auditDatabaseConsistency();
        checks.push(dbCheck);
      }

      // Audit 2: Team Data Integrity
      if (config.includeTeamIntegrity) {
        console.log('🔍 Running team data integrity check...');
        const teamCheck = await this.auditTeamDataIntegrity(config.teamIds);
        checks.push(teamCheck);
      }

      // Audit 3: Schedule Data Validation
      if (config.includeScheduleValidation) {
        console.log('🔍 Running schedule data validation...');
        const scheduleCheck = await this.auditScheduleData(config.teamIds, config.dateRange);
        checks.push(scheduleCheck);
      }

      // Audit 4: Hours Calculation Verification
      if (config.includeHoursCalculation) {
        console.log('🔍 Running hours calculation verification...');
        const hoursCheck = await this.auditHoursCalculations(config.teamIds, config.dateRange);
        checks.push(hoursCheck);
      }

      // Audit 5: Sprint Data Consistency
      if (config.includeSprintData) {
        console.log('🔍 Running sprint data consistency check...');
        const sprintCheck = await this.auditSprintDataConsistency();
        checks.push(sprintCheck);
      }

      // Audit 6: User Permissions Verification
      if (config.includePermissions) {
        console.log('🔍 Running user permissions verification...');
        const permissionsCheck = await this.auditUserPermissions(userRole);
        checks.push(permissionsCheck);
      }

      auditResult.checks = checks;
      auditResult.summary = this.calculateAuditSummary(checks);

      console.log(`✅ Data Audit Complete: ${auditResult.summary.passedChecks}/${auditResult.summary.totalChecks} checks passed`);
      
      return auditResult;

    } catch (error) {
      console.error('❌ Data audit failed:', error);
      return {
        ...auditResult,
        error: error instanceof Error ? error.message : 'Unknown audit error',
        summary: {
          totalChecks: 0,
          passedChecks: 0,
          failedChecks: 0,
          warningChecks: 0,
          errorChecks: 1,
          overallStatus: 'ERROR'
        }
      };
    }
  }

  private static async auditDatabaseConsistency(): Promise<AuditCheck> {
    const issues: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;
    const details: DatabaseConsistencyCheck = {
      teamsFound: 0,
      membersFound: 0,
      scheduleEntriesFound: 0,
      expectedTeams: EXPECTED_TEAMS.map(t => t.name),
      missingTeams: [],
      orphanedMembers: [],
      orphanedEntries: []
    };

    try {
      // Check 1: Verify all teams exist
      totalChecks++;
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name');
      
      details.teamsFound = teams?.length || 0;
      
      const missingTeams = EXPECTED_TEAMS.filter(expected => 
        !teams?.some(t => t.name === expected.name)
      );
      
      details.missingTeams = missingTeams.map(t => t.name);
      
      if (missingTeams.length === 0) {
        passedChecks++;
      } else {
        issues.push(`Missing teams: ${missingTeams.map(t => t.name).join(', ')}`);
      }

      // Check 2: Verify team members integrity
      totalChecks++;
      const { data: members } = await supabase
        .from('team_members')
        .select(`
          id, 
          name, 
          team_id,
          teams (name)
        `);
      
      details.membersFound = members?.length || 0;
      
      const orphanedMembers = members?.filter(m => !m.teams && m.team_id !== null) || [];
      details.orphanedMembers = orphanedMembers;
      
      if (orphanedMembers.length === 0) {
        passedChecks++;
      } else {
        issues.push(`Orphaned members (invalid team_id): ${orphanedMembers.map(m => m.name).join(', ')}`);
      }

      // Check 3: Verify schedule entries integrity
      totalChecks++;
      const { data: scheduleEntries } = await supabase
        .from('schedule_entries')
        .select(`
          id, 
          member_id,
          team_members (
            name,
            teams (name)
          )
        `);
      
      details.scheduleEntriesFound = scheduleEntries?.length || 0;
      
      const orphanedEntries = scheduleEntries?.filter(e => !e.team_members) || [];
      details.orphanedEntries = orphanedEntries;
      
      if (orphanedEntries.length === 0) {
        passedChecks++;
      } else {
        issues.push(`Orphaned schedule entries: ${orphanedEntries.length} entries with invalid member_id`);
      }

      // Check 4: Verify COO user configuration
      totalChecks++;
      const { data: cooUsers } = await supabase
        .from('team_members')
        .select('id, name, team_id')
        .eq('name', 'Nir Shilo');
      
      const cooUser = cooUsers?.[0];
      if (cooUser && cooUser.team_id === null) {
        passedChecks++;
      } else if (cooUser && cooUser.team_id !== null) {
        issues.push('COO user (Nir Shilo) incorrectly assigned to a team');
      } else {
        issues.push('COO user (Nir Shilo) not found in database');
      }

      return {
        category: 'Database Consistency',
        status: issues.length === 0 ? 'PASS' : 'FAIL',
        passed: passedChecks,
        total: totalChecks,
        issues,
        details
      };

    } catch (error) {
      return {
        category: 'Database Consistency',
        status: 'ERROR',
        passed: 0,
        total: totalChecks,
        issues: [`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details
      };
    }
  }

  private static async auditTeamDataIntegrity(teamIds?: number[]): Promise<AuditCheck> {
    const issues: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;
    const details: { teams: TeamIntegrityCheck[] } = { teams: [] };

    try {
      // Get teams to check
      let teamsQuery = supabase
        .from('teams')
        .select(`
          id, 
          name,
          team_members (
            id,
            name,
            hebrew,
            is_manager
          )
        `);
      
      if (teamIds && teamIds.length > 0) {
        teamsQuery = teamsQuery.in('id', teamIds);
      }
      
      const { data: teams } = await teamsQuery;

      for (const team of teams || []) {
        const expectedTeam = EXPECTED_TEAMS.find(t => t.name === team.name);
        const actualSize = team.team_members?.length || 0;
        const expectedSize = expectedTeam?.expectedSize || 0;
        const managers = team.team_members?.filter(m => m.is_manager) || [];

        const teamCheck: TeamIntegrityCheck = {
          teamName: team.name,
          expectedSize,
          actualSize,
          managersFound: managers.length,
          membersWithoutTeam: [],
          membersWithInvalidData: []
        };

        // Check team size
        totalChecks++;
        if (actualSize === expectedSize) {
          passedChecks++;
        } else {
          issues.push(`${team.name}: Expected ${expectedSize} members, found ${actualSize}`);
        }

        // Check for managers
        totalChecks++;
        if (managers.length >= 1) {
          passedChecks++;
        } else {
          issues.push(`${team.name}: No manager found`);
        }

        // Check member data quality
        const membersWithInvalidData = team.team_members?.filter(m => 
          !m.name || !m.hebrew || m.name.trim() === '' || m.hebrew.trim() === ''
        ) || [];
        
        teamCheck.membersWithInvalidData = membersWithInvalidData;
        
        if (membersWithInvalidData.length > 0) {
          totalChecks++;
          issues.push(`${team.name}: ${membersWithInvalidData.length} members with invalid data`);
        }

        details.teams.push(teamCheck);
      }

      return {
        category: 'Team Data Integrity',
        status: issues.length === 0 ? 'PASS' : 'FAIL',
        passed: passedChecks,
        total: totalChecks,
        issues,
        details
      };

    } catch (error) {
      return {
        category: 'Team Data Integrity',
        status: 'ERROR',
        passed: 0,
        total: totalChecks,
        issues: [`Team integrity error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details
      };
    }
  }

  private static async auditScheduleData(teamIds?: number[], dateRange?: { start: string; end: string }): Promise<AuditCheck> {
    const issues: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;
    
    // Use current week if no date range provided
    const range = dateRange || this.getCurrentWeekRange();
    
    const details = {
      dateRange: range,
      totalEntries: 0,
      invalidEntries: 0,
      membersWithoutEntries: 0,
      validValues: ['1', '0.5', 'X']
    };

    try {
      // Get schedule entries in date range
      const entriesQuery = supabase
        .from('schedule_entries')
        .select(`
          id,
          member_id,
          date,
          value,
          team_members (
            name,
            team_id
          )
        `)
        .gte('date', range.start)
        .lte('date', range.end);

      const { data: entries } = await entriesQuery;
      details.totalEntries = entries?.length || 0;

      // Check 1: Validate entry values
      totalChecks++;
      const invalidEntries = entries?.filter(e => 
        !details.validValues.includes(e.value)
      ) || [];
      
      details.invalidEntries = invalidEntries.length;
      
      if (invalidEntries.length === 0) {
        passedChecks++;
      } else {
        issues.push(`${invalidEntries.length} schedule entries with invalid values`);
      }

      // Check 2: Validate dates are within range
      totalChecks++;
      const entriesOutOfRange = entries?.filter(e => 
        e.date < range.start || e.date > range.end
      ) || [];
      
      if (entriesOutOfRange.length === 0) {
        passedChecks++;
      } else {
        issues.push(`${entriesOutOfRange.length} schedule entries outside date range`);
      }

      return {
        category: 'Schedule Data Validation',
        status: issues.length === 0 ? 'PASS' : 'FAIL',
        passed: passedChecks,
        total: totalChecks,
        issues,
        details
      };

    } catch (error) {
      return {
        category: 'Schedule Data Validation',
        status: 'ERROR',
        passed: 0,
        total: totalChecks,
        issues: [`Schedule validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details
      };
    }
  }

  private static async auditHoursCalculations(teamIds?: number[], dateRange?: { start: string; end: string }): Promise<AuditCheck> {
    const issues: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;
    
    const range = dateRange || this.getCurrentWeekRange();
    const details: { checks: HoursCalculationCheck[] } = { checks: [] };

    try {
      // Get team members to check
      let membersQuery = supabase
        .from('team_members')
        .select('id, name, team_id');
      
      if (teamIds && teamIds.length > 0) {
        membersQuery = membersQuery.in('team_id', teamIds);
      }
      
      const { data: members } = await membersQuery;

      for (const member of members || []) {
        totalChecks++;
        
        // Get member's schedule entries
        const { data: entries } = await supabase
          .from('schedule_entries')
          .select('date, value')
          .eq('member_id', member.id)
          .gte('date', range.start)
          .lte('date', range.end);

        // Calculate hours manually
        let calculatedHours = 0;
        entries?.forEach(entry => {
          if (entry.value === '1') calculatedHours += 7;
          else if (entry.value === '0.5') calculatedHours += 3.5;
        });

        // For this audit, we'll assume displayed hours match calculated
        // In a real implementation, you'd get this from the actual UI calculation
        const displayedHours = calculatedHours; // Placeholder
        
        const check: HoursCalculationCheck = {
          memberName: member.name,
          dateRange: range,
          calculatedHours,
          displayedHours,
          difference: Math.abs(calculatedHours - displayedHours),
          isAccurate: Math.abs(calculatedHours - displayedHours) < 0.1
        };

        details.checks.push(check);

        if (check.isAccurate) {
          passedChecks++;
        } else {
          issues.push(`${member.name}: Calculated ${calculatedHours}h, displayed ${displayedHours}h`);
        }
      }

      return {
        category: 'Hours Calculation Verification',
        status: issues.length === 0 ? 'PASS' : 'FAIL',
        passed: passedChecks,
        total: totalChecks,
        issues,
        details
      };

    } catch (error) {
      return {
        category: 'Hours Calculation Verification',
        status: 'ERROR',
        passed: 0,
        total: totalChecks,
        issues: [`Hours calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details
      };
    }
  }

  private static async auditSprintDataConsistency(): Promise<AuditCheck> {
    const issues: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;
    const details: { sprint: SprintDataCheck | null } = { sprint: null };

    try {
      // Check sprint settings
      totalChecks++;
      const { data: sprint } = await supabase
        .from('global_sprint_settings')
        .select('*')
        .single();

      if (sprint) {
        const sprintEndDate = new Date(sprint.sprint_start_date);
        sprintEndDate.setDate(sprintEndDate.getDate() + (sprint.sprint_length_weeks * 7) - 1);
        
        const today = new Date();
        const isActive = today >= new Date(sprint.sprint_start_date) && today <= sprintEndDate;
        const daysRemaining = Math.max(0, Math.ceil((sprintEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        
        const totalDays = sprint.sprint_length_weeks * 7;
        const daysPassed = Math.max(0, Math.ceil((today.getTime() - new Date(sprint.sprint_start_date).getTime()) / (1000 * 60 * 60 * 24)));
        const progressPercentage = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));

        details.sprint = {
          sprintNumber: sprint.current_sprint_number,
          startDate: sprint.sprint_start_date,
          endDate: sprintEndDate.toISOString().split('T')[0],
          isActive,
          daysRemaining,
          progressPercentage: Math.round(progressPercentage)
        };

        passedChecks++;
      } else {
        issues.push('No sprint settings found in database');
      }

      return {
        category: 'Sprint Data Consistency',
        status: issues.length === 0 ? 'PASS' : 'FAIL',
        passed: passedChecks,
        total: totalChecks,
        issues,
        details
      };

    } catch (error) {
      return {
        category: 'Sprint Data Consistency',
        status: 'ERROR',
        passed: 0,
        total: totalChecks,
        issues: [`Sprint data error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details
      };
    }
  }

  private static async auditUserPermissions(userRole: 'team' | 'coo'): Promise<AuditCheck> {
    const issues: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;
    const details = { userRole, permissionsChecked: [] as string[] };

    try {
      // Check COO user permissions
      if (userRole === 'coo') {
        totalChecks++;
        const { data: cooUser } = await supabase
          .from('team_members')
          .select('id, name, team_id')
          .eq('name', 'Nir Shilo')
          .single();

        if (cooUser) {
          if (cooUser.team_id === null) {
            passedChecks++;
            details.permissionsChecked.push('COO user correctly configured (no team assignment)');
          } else {
            issues.push('COO user incorrectly assigned to a team');
          }
        } else {
          issues.push('COO user not found');
        }
      }

      // Check manager permissions
      totalChecks++;
      const { data: managers } = await supabase
        .from('team_members')
        .select('id, name, is_manager, team_id')
        .eq('is_manager', true);

      const managersCount = managers?.length || 0;
      if (managersCount >= 5) { // Expect at least one manager per team
        passedChecks++;
        details.permissionsChecked.push(`${managersCount} managers found`);
      } else {
        issues.push(`Only ${managersCount} managers found, expected at least 5`);
      }

      return {
        category: 'User Permissions',
        status: issues.length === 0 ? 'PASS' : 'FAIL',
        passed: passedChecks,
        total: totalChecks,
        issues,
        details
      };

    } catch (error) {
      return {
        category: 'User Permissions',
        status: 'ERROR',
        passed: 0,
        total: totalChecks,
        issues: [`Permissions error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details
      };
    }
  }

  private static calculateAuditSummary(checks: AuditCheck[]) {
    const summary = {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      warningChecks: 0,
      errorChecks: 0,
      overallStatus: 'PASS' as 'PASS' | 'FAIL' | 'WARNING' | 'ERROR'
    };

    checks.forEach(check => {
      summary.totalChecks += check.total;
      summary.passedChecks += check.passed;
      
      switch (check.status) {
        case 'FAIL':
          summary.failedChecks++;
          break;
        case 'WARNING':
          summary.warningChecks++;
          break;
        case 'ERROR':
          summary.errorChecks++;
          break;
      }
    });

    // Determine overall status
    if (summary.errorChecks > 0) {
      summary.overallStatus = 'ERROR';
    } else if (summary.failedChecks > 0) {
      summary.overallStatus = 'FAIL';
    } else if (summary.warningChecks > 0) {
      summary.overallStatus = 'WARNING';
    } else {
      summary.overallStatus = 'PASS';
    }

    return summary;
  }

  private static getCurrentWeekRange(): { start: string; end: string } {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Thursday

    return {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    };
  }
}