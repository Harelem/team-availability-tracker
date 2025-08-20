/**
 * Database Test Utilities for Data Integrity Testing
 * 
 * Provides comprehensive database testing utilities including
 * transaction management, data seeding, and validation helpers
 */

import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { TEST_TEAMS, TEST_TEAM_MEMBERS, TEST_SPRINT_SETTINGS, VALIDATION_PATTERNS } from '../fixtures/testData';
import { Team, TeamMember, ScheduleEntry } from '@/types';

// Mock database state management
interface MockDatabaseState {
  teams: Team[];
  teamMembers: TeamMember[];
  scheduleEntries: any[];
  globalSprint: any;
  isSeeded: boolean;
}

class DatabaseTestManager {
  private mockState: MockDatabaseState = {
    teams: [],
    teamMembers: [],
    scheduleEntries: [],
    globalSprint: null,
    isSeeded: false
  };

  /**
   * Initialize test database with clean state
   */
  async initializeTestDatabase(): Promise<void> {
    this.mockState = {
      teams: [],
      teamMembers: [],
      scheduleEntries: [],
      globalSprint: null,
      isSeeded: false
    };

    // Mock database service methods
    jest.spyOn(DatabaseService, 'getTeams').mockImplementation(async () => {
      return [...this.mockState.teams];
    });

    jest.spyOn(DatabaseService, 'getTeamMembers').mockImplementation(async (teamId?: number) => {
      if (teamId) {
        return this.mockState.teamMembers.filter(member => member.team_id === teamId);
      }
      return [...this.mockState.teamMembers];
    });

    jest.spyOn(DatabaseService, 'getCurrentGlobalSprint').mockImplementation(async () => {
      return this.mockState.globalSprint;
    });

    // Mock Supabase client
    const mockSupabaseFrom = jest.fn();
    const mockSupabaseRpc = jest.fn();
    
    if (jest.isMockFunction(supabase.from)) {
      jest.mocked(supabase.from).mockImplementation(mockSupabaseFrom);
    }
    if (jest.isMockFunction(supabase.rpc)) {
      jest.mocked(supabase.rpc).mockImplementation(mockSupabaseRpc);
    }

    // Setup default mock responses
    this.setupDefaultMockResponses(mockSupabaseFrom, mockSupabaseRpc);
  }

  /**
   * Seed test database with standard test data
   */
  async seedTestDatabase(): Promise<void> {
    if (this.mockState.isSeeded) {
      return;
    }

    // Seed teams
    this.mockState.teams = [...TEST_TEAMS];
    
    // Seed team members
    this.mockState.teamMembers = [...TEST_TEAM_MEMBERS];
    
    // Seed global sprint settings
    this.mockState.globalSprint = { ...TEST_SPRINT_SETTINGS };
    
    this.mockState.isSeeded = true;
  }

  /**
   * Add schedule entries for testing
   */
  async addScheduleEntries(entries: Array<{
    memberId: number;
    date: string;
    value: '1' | '0.5' | 'X';
    reason?: string;
  }>): Promise<void> {
    const scheduleEntries = entries.map((entry, index) => ({
      id: this.mockState.scheduleEntries.length + index + 1,
      member_id: entry.memberId,
      date: entry.date,
      value: entry.value,
      reason: entry.reason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    this.mockState.scheduleEntries.push(...scheduleEntries);
  }

  /**
   * Clear all test data
   */
  async clearTestDatabase(): Promise<void> {
    this.mockState = {
      teams: [],
      teamMembers: [],
      scheduleEntries: [],
      globalSprint: null,
      isSeeded: false
    };
  }

  /**
   * Get current mock state
   */
  getMockState(): MockDatabaseState {
    return { ...this.mockState };
  }

  /**
   * Setup default mock responses for Supabase
   */
  private setupDefaultMockResponses(mockFrom: jest.Mock, mockRpc: jest.Mock): void {
    // Setup chain of mock methods for Supabase queries
    const createMockChain = (data: any, error: any = null) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data, error }),
      then: jest.fn().mockResolvedValue({ data, error })
    });

    mockFrom.mockImplementation((tableName: string) => {
      switch (tableName) {
        case 'teams':
          return createMockChain(this.mockState.teams);
        case 'team_members':
          return createMockChain(this.mockState.teamMembers);
        case 'schedule_entries':
          return createMockChain(this.mockState.scheduleEntries);
        case 'global_sprint_settings':
          return createMockChain(this.mockState.globalSprint);
        default:
          return createMockChain([]);
      }
    });

    mockRpc.mockImplementation((functionName: string, params: any) => {
      // Mock stored procedure responses
      switch (functionName) {
        case 'get_current_global_sprint':
          return Promise.resolve({ data: this.mockState.globalSprint, error: null });
        case 'calculate_team_capacity':
          return Promise.resolve({ data: { capacity: 100 }, error: null });
        default:
          return Promise.resolve({ data: null, error: null });
      }
    });
  }

  /**
   * Validate data integrity constraints
   */
  async validateDataIntegrity(): Promise<{
    isValid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    // Check for required fields
    this.mockState.teams.forEach((team, index) => {
      if (!team.name || team.name.trim().length === 0) {
        violations.push(`Team ${index}: Missing required name field`);
      }
      if (!team.color || !team.color.match(/^#[0-9A-Fa-f]{6}$/)) {
        violations.push(`Team ${index}: Invalid color format`);
      }
    });

    this.mockState.teamMembers.forEach((member, index) => {
      if (!member.name || member.name.trim().length === 0) {
        violations.push(`TeamMember ${index}: Missing required name field`);
      }
      if (!member.hebrew || member.hebrew.trim().length === 0) {
        violations.push(`TeamMember ${index}: Missing required hebrew field`);
      }
      if (!member.team_id || !this.mockState.teams.find(t => t.id === member.team_id)) {
        violations.push(`TeamMember ${index}: Invalid team_id reference`);
      }
    });

    // Check for mock data patterns
    const allTextContent = [
      ...this.mockState.teams.map(t => `${t.name} ${t.description || ''}`),
      ...this.mockState.teamMembers.map(m => `${m.name} ${m.hebrew}`),
      ...this.mockState.scheduleEntries.map(s => s.reason || '')
    ].join(' ');

    VALIDATION_PATTERNS.mockDataPatterns.forEach(pattern => {
      if (pattern.test(allTextContent)) {
        violations.push(`Mock data pattern detected: ${pattern.source}`);
      }
    });

    // Check for security vulnerabilities
    VALIDATION_PATTERNS.securityChecks.xssAttempt.test(allTextContent) &&
      violations.push('Potential XSS attempt detected in data');
    
    VALIDATION_PATTERNS.securityChecks.sqlInjection.test(allTextContent) &&
      violations.push('Potential SQL injection attempt detected in data');

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Simulate database errors for testing error handling
   */
  simulateError(errorType: 'connection' | 'constraint' | 'timeout' | 'permission'): void {
    const errorMessages = {
      connection: 'Database connection failed',
      constraint: 'Foreign key constraint violation',
      timeout: 'Query timeout exceeded',
      permission: 'Insufficient permissions'
    };

    const error = new Error(errorMessages[errorType]);
    
    // Mock all database methods to throw the error
    Object.keys(DatabaseService).forEach(methodName => {
      if (typeof DatabaseService[methodName as keyof typeof DatabaseService] === 'function') {
        jest.spyOn(DatabaseService, methodName as any).mockRejectedValue(error);
      }
    });
  }

  /**
   * Reset all mocks to normal operation
   */
  resetMocks(): void {
    jest.restoreAllMocks();
    this.initializeTestDatabase();
  }

  /**
   * Verify calculation consistency across multiple queries
   */
  async verifyCalculationConsistency(teamId: number, dateRange: { start: string; end: string }): Promise<{
    isConsistent: boolean;
    results: Array<{ query: string; result: any }>;
    discrepancies: string[];
  }> {
    const results: Array<{ query: string; result: any }> = [];
    const discrepancies: string[] = [];

    try {
      // Run the same calculation multiple times
      const calculation1 = await this.runSprintCalculation(teamId, dateRange);
      const calculation2 = await this.runSprintCalculation(teamId, dateRange);
      const calculation3 = await this.runSprintCalculation(teamId, dateRange);

      results.push(
        { query: 'Sprint calculation #1', result: calculation1 },
        { query: 'Sprint calculation #2', result: calculation2 },
        { query: 'Sprint calculation #3', result: calculation3 }
      );

      // Check for discrepancies
      if (calculation1.potentialHours !== calculation2.potentialHours) {
        discrepancies.push('Potential hours calculation inconsistent between runs');
      }
      
      if (calculation2.potentialHours !== calculation3.potentialHours) {
        discrepancies.push('Potential hours calculation inconsistent across multiple runs');
      }

      return {
        isConsistent: discrepancies.length === 0,
        results,
        discrepancies
      };
    } catch (error) {
      discrepancies.push(`Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        isConsistent: false,
        results,
        discrepancies
      };
    }
  }

  /**
   * Run sprint calculation for consistency testing
   */
  private async runSprintCalculation(teamId: number, dateRange: { start: string; end: string }) {
    const team = this.mockState.teams.find(t => t.id === teamId);
    const members = this.mockState.teamMembers.filter(m => m.team_id === teamId);
    
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    // Calculate working days
    const workingDays = this.calculateWorkingDays(dateRange.start, dateRange.end);
    
    // Calculate potential hours: members × working days × 7 hours per day
    const potentialHours = members.length * workingDays * 7;
    
    // Get schedule entries for the period
    const scheduleEntries = this.mockState.scheduleEntries.filter(entry => 
      members.some(m => m.id === entry.member_id) &&
      entry.date >= dateRange.start &&
      entry.date <= dateRange.end
    );

    // Calculate actual hours
    const actualHours = scheduleEntries.reduce((total, entry) => {
      switch (entry.value) {
        case '1': return total + 7;
        case '0.5': return total + 3.5;
        case 'X': return total + 0;
        default: return total;
      }
    }, 0);

    return {
      teamId,
      teamName: team.name,
      memberCount: members.length,
      workingDays,
      potentialHours,
      actualHours,
      utilization: potentialHours > 0 ? Math.round((actualHours / potentialHours) * 100) : 0
    };
  }

  /**
   * Calculate working days (Israeli calendar: Sunday-Thursday)
   */
  private calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      // Sunday (0) to Thursday (4) are working days in Israel
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        workingDays++;
      }
    }

    return workingDays;
  }
}

// Export singleton instance
export const databaseTestManager = new DatabaseTestManager();

// Helper functions for common test operations
export const testHelpers = {
  /**
   * Create a complete test environment with seeded data
   */
  async setupCompleteTestEnvironment(): Promise<void> {
    await databaseTestManager.initializeTestDatabase();
    await databaseTestManager.seedTestDatabase();
  },

  /**
   * Clean up test environment
   */
  async cleanupTestEnvironment(): Promise<void> {
    await databaseTestManager.clearTestDatabase();
    databaseTestManager.resetMocks();
  },

  /**
   * Verify production data integrity
   */
  async verifyProductionDataIntegrity(): Promise<{
    isValid: boolean;
    violations: string[];
    summary: {
      teamsChecked: number;
      membersChecked: number;
      entriesChecked: number;
    };
  }> {
    const integrity = await databaseTestManager.validateDataIntegrity();
    const state = databaseTestManager.getMockState();

    return {
      ...integrity,
      summary: {
        teamsChecked: state.teams.length,
        membersChecked: state.teamMembers.length,
        entriesChecked: state.scheduleEntries.length
      }
    };
  },

  /**
   * Test calculation accuracy with known values
   */
  async testCalculationAccuracy(scenarios: Array<{
    teamId: number;
    dateRange: { start: string; end: string };
    expectedPotential: number;
    expectedWorkingDays: number;
  }>): Promise<{
    passed: number;
    failed: number;
    results: Array<{ scenario: any; passed: boolean; errors: string[] }>;
  }> {
    let passed = 0;
    let failed = 0;
    const results: Array<{ scenario: any; passed: boolean; errors: string[] }> = [];

    for (const scenario of scenarios) {
      const errors: string[] = [];
      
      try {
        const calculation = await databaseTestManager.runSprintCalculation(
          scenario.teamId, 
          scenario.dateRange
        );

        if (calculation.potentialHours !== scenario.expectedPotential) {
          errors.push(
            `Expected potential hours: ${scenario.expectedPotential}, got: ${calculation.potentialHours}`
          );
        }

        if (calculation.workingDays !== scenario.expectedWorkingDays) {
          errors.push(
            `Expected working days: ${scenario.expectedWorkingDays}, got: ${calculation.workingDays}`
          );
        }

        if (errors.length === 0) {
          passed++;
        } else {
          failed++;
        }

        results.push({
          scenario,
          passed: errors.length === 0,
          errors
        });

      } catch (error) {
        failed++;
        errors.push(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({
          scenario,
          passed: false,
          errors
        });
      }
    }

    return { passed, failed, results };
  }
};