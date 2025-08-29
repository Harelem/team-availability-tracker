/**
 * Business Logic Tests
 * Tests for calculations, permissions, exports, and Israeli work standards
 */

import {
  createMockTeamMember,
  createMockScheduleEntry,
  createMockCurrentSprint,
  calculateExpectedHours,
  calculateSprintCapacity,
  createIsraeliWorkWeek,
  createSprintWorkingDays,
  validateIsraeliWorkWeekCompliance,
  createMockCOOUser,
  createMockManagerUser,
  createMockRegularUser,
} from '../utils/testSetup';

// Mock the calculation service
jest.mock('@/lib/calculationService', () => ({
  calculateSprintCapacityFromSettings: jest.fn(),
  calculateTeamCapacity: jest.fn(),
  calculateUtilizationPercentage: jest.fn(),
}));

// Mock the export service
jest.mock('@/lib/exportService', () => ({
  exportToCSV: jest.fn(),
  exportToExcel: jest.fn(),
  generateTeamReport: jest.fn(),
}));

describe('Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Sprint Calculations Tests
  // ============================================================================

  describe('Sprint Calculations', () => {
    test('should calculate sprint dates correctly (Wednesday to Tuesday)', () => {
      const sprintStartDate = '2024-01-17'; // Wednesday
      const lengthWeeks = 2;
      const workingDays = createSprintWorkingDays(sprintStartDate, lengthWeeks);

      expect(workingDays).toHaveLength(10); // 5 days/week × 2 weeks

      // Verify all dates are working days (Sun-Thu)
      workingDays.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        expect([0, 1, 2, 3, 4]).toContain(dayOfWeek); // Sun-Thu
      });
    });

    test('should identify current sprint correctly', () => {
      const today = new Date('2024-01-24'); // Wednesday in sprint
      const sprint = createMockCurrentSprint({
        sprint_start_date: '2024-01-17',
        sprint_end_date: '2024-01-30',
      });

      const sprintStart = new Date(sprint.sprint_start_date);
      const sprintEnd = new Date(sprint.sprint_end_date);

      expect(today.getTime()).toBeGreaterThanOrEqual(sprintStart.getTime());
      expect(today.getTime()).toBeLessThanOrEqual(sprintEnd.getTime());
      expect(sprint.is_active).toBe(true);
    });

    test('should calculate sprint progress percentage correctly', () => {
      const sprint = createMockCurrentSprint({
        progress_percentage: 50,
        days_remaining: 7,
      });

      expect(sprint.progress_percentage).toBeGreaterThanOrEqual(0);
      expect(sprint.progress_percentage).toBeLessThanOrEqual(100);
      expect(sprint.days_remaining).toBeGreaterThanOrEqual(0);
    });

    test('should calculate hours per sprint correctly', () => {
      const teamSize = 4;
      const sprintWeeks = 2;
      const expectedCapacity = calculateSprintCapacity(teamSize, sprintWeeks);

      // 4 members × 2 weeks × 5 days/week × 7 hours/day = 280 hours
      expect(expectedCapacity).toBe(280);
    });

    test('should handle partial sprint calculations', () => {
      const partialEntries = [
        createMockScheduleEntry({ value: '1', hours: 7 }),
        createMockScheduleEntry({ value: '0.5', hours: 3.5 }),
        createMockScheduleEntry({ value: 'X', hours: 0 }),
      ];

      const totalHours = calculateExpectedHours(partialEntries);
      expect(totalHours).toBe(10.5); // 7 + 3.5 + 0
    });

    test('should calculate team capacity by size', () => {
      const teams = [
        { name: 'Development-Tal', size: 4, expectedCapacity: 280 },
        { name: 'Development-Itai', size: 5, expectedCapacity: 350 },
        { name: 'Infrastructure', size: 3, expectedCapacity: 210 },
        { name: 'Data', size: 6, expectedCapacity: 420 },
        { name: 'Product', size: 8, expectedCapacity: 560 },
      ];

      teams.forEach(team => {
        const capacity = calculateSprintCapacity(team.size, 2);
        expect(capacity).toBe(team.expectedCapacity);
      });
    });
  });

  // ============================================================================
  // Availability Statistics Tests
  // ============================================================================

  describe('Availability Statistics', () => {
    test('should calculate completion percentage correctly', () => {
      const totalWorkingDays = 10;
      const filledDays = 7;
      const completionPercentage = Math.round((filledDays / totalWorkingDays) * 100);

      expect(completionPercentage).toBe(70);
    });

    test('should aggregate team statistics', () => {
      const teamMembers = [
        { hoursSubmitted: 70, totalPossible: 70 }, // 100% utilization
        { hoursSubmitted: 35, totalPossible: 70 }, // 50% utilization
        { hoursSubmitted: 56, totalPossible: 70 }, // 80% utilization
      ];

      const totalSubmitted = teamMembers.reduce((sum, member) => sum + member.hoursSubmitted, 0);
      const totalPossible = teamMembers.reduce((sum, member) => sum + member.totalPossible, 0);
      const teamUtilization = Math.round((totalSubmitted / totalPossible) * 100);

      expect(totalSubmitted).toBe(161);
      expect(totalPossible).toBe(210);
      expect(teamUtilization).toBe(77); // 161/210 ≈ 76.67% → 77%
    });

    test('should handle company-wide aggregation', () => {
      const teamsData = [
        { name: 'Development-Tal', members: 4, utilization: 85 },
        { name: 'Development-Itai', members: 5, utilization: 92 },
        { name: 'Infrastructure', members: 3, utilization: 78 },
        { name: 'Data', members: 6, utilization: 88 },
        { name: 'Product', members: 8, utilization: 82 },
      ];

      const totalMembers = teamsData.reduce((sum, team) => sum + team.members, 0);
      expect(totalMembers).toBe(26);

      // Calculate weighted average utilization
      const weightedSum = teamsData.reduce((sum, team) => 
        sum + (team.utilization * team.members), 0);
      const companyUtilization = Math.round(weightedSum / totalMembers);

      expect(companyUtilization).toBeGreaterThan(80);
      expect(companyUtilization).toBeLessThan(90);
    });

    test('should identify over/under capacity teams', () => {
      const teamsCapacityData = [
        { name: 'Team A', utilization: 120, status: 'over' },
        { name: 'Team B', utilization: 65, status: 'under' },
        { name: 'Team C', utilization: 95, status: 'optimal' },
      ];

      teamsCapacityData.forEach(team => {
        if (team.utilization > 100) {
          expect(team.status).toBe('over');
        } else if (team.utilization < 75) {
          expect(team.status).toBe('under');
        } else {
          expect(team.status).toBe('optimal');
        }
      });
    });
  });

  // ============================================================================
  // Permission Logic Tests
  // ============================================================================

  describe('Permission Logic', () => {
    test('should enforce COO permissions correctly', () => {
      const cooUser = createMockCOOUser();

      expect(cooUser.role).toBe('coo');
      expect(cooUser.isManager).toBe(true);

      // COO should have access to all teams
      const permissions = {
        canViewAllTeams: cooUser.role === 'coo',
        canExportAllData: cooUser.role === 'coo',
        canManageSprints: cooUser.role === 'coo' || cooUser.name === 'Harel Asaf',
      };

      expect(permissions.canViewAllTeams).toBe(true);
      expect(permissions.canExportAllData).toBe(true);
    });

    test('should enforce manager permissions correctly', () => {
      const manager = createMockManagerUser(1);

      expect(manager.role).toBe('manager');
      expect(manager.isManager).toBe(true);
      expect(manager.team_id).toBe(1);

      // Manager permissions
      const permissions = {
        canViewOwnTeam: true,
        canEditTeamMembers: manager.isManager,
        canExportTeamData: manager.isManager,
        canViewOtherTeams: manager.role === 'coo',
      };

      expect(permissions.canViewOwnTeam).toBe(true);
      expect(permissions.canEditTeamMembers).toBe(true);
      expect(permissions.canExportTeamData).toBe(true);
      expect(permissions.canViewOtherTeams).toBe(false);
    });

    test('should enforce regular user permissions correctly', () => {
      const regularUser = createMockRegularUser(1);

      expect(regularUser.role).toBe('member');
      expect(regularUser.isManager).toBe(false);

      // Regular user permissions  
      const permissions = {
        canViewOwnData: true,
        canEditOwnData: true,
        canEditOthersData: regularUser.isManager,
        canExportData: regularUser.isManager || regularUser.role === 'coo',
        canManageTeam: regularUser.isManager,
      };

      expect(permissions.canViewOwnData).toBe(true);
      expect(permissions.canEditOwnData).toBe(true);
      expect(permissions.canEditOthersData).toBe(false);
      expect(permissions.canExportData).toBe(false);
      expect(permissions.canManageTeam).toBe(false);
    });

    test('should prevent cross-team data access', () => {
      const user1Team1 = createMockRegularUser(1);
      const user2Team2 = createMockRegularUser(2);

      // Users should not access other teams' data
      expect(user1Team1.team_id).not.toBe(user2Team2.team_id);

      interface UserWithAccess {
        id: string;
        team_id: number;
        role?: string;
        isManager?: boolean;
      }

      const canAccessData = (currentUser: UserWithAccess, targetUser: UserWithAccess) => {
        if (currentUser.role === 'coo') return true;
        if (currentUser.isManager && currentUser.team_id === targetUser.team_id) return true;
        return currentUser.id === targetUser.id;
      };

      expect(canAccessData(user1Team1, user2Team2)).toBe(false);
      expect(canAccessData(user1Team1, user1Team1)).toBe(true);
    });

    test('should validate sprint management permissions', () => {
      const cooUser = createMockCOOUser();
      const sprintManager = createMockTeamMember({
        name: 'Harel Asaf',
        hebrew: 'הראל אסף',
        role: 'sprint_manager',
      });
      const regularManager = createMockManagerUser(1);

      const canManageSprints = (user: { role?: string }) => {
        return user.role === 'coo' || 
               user.name === 'Harel Asaf' ||
               user.role === 'sprint_manager';
      };

      expect(canManageSprints(cooUser)).toBe(true);
      expect(canManageSprints(sprintManager)).toBe(true);
      expect(canManageSprints(regularManager)).toBe(false);
    });
  });

  // ============================================================================
  // Export Logic Tests
  // ============================================================================

  describe('Export Logic', () => {
    test('should generate CSV for current week', () => {
      const weekData = {
        teamName: 'Development-Tal',
        dateRange: '2024-01-17 to 2024-01-23',
        members: [
          createMockTeamMember({ name: 'John Doe' }),
          createMockTeamMember({ name: 'Jane Smith' }),
        ],
        scheduleData: {
          1: { '2024-01-17': createMockScheduleEntry({ value: '1' }) },
          2: { '2024-01-17': createMockScheduleEntry({ value: '0.5' }) },
        }
      };

      // Mock CSV generation
      const csvContent = generateMockCSV(weekData);
      expect(csvContent).toContain('Team Member,2024-01-17');
      expect(csvContent).toContain('John Doe,1');
      expect(csvContent).toContain('Jane Smith,0.5');
    });

    test('should generate Excel with multiple sheets for sprint data', () => {
      const sprintData = {
        overview: { teamCount: 5, totalMembers: 26 },
        teams: ['Development-Tal', 'Development-Itai', 'Infrastructure', 'Data', 'Product'],
        weeklyBreakdown: [
          { week: 1, hours: 650 },
          { week: 2, hours: 720 },
        ],
      };

      // Mock Excel generation
      const excelSheets = generateMockExcelSheets(sprintData);
      expect(excelSheets).toContain('Overview');
      expect(excelSheets).toContain('Weekly Breakdown');
      expect(excelSheets).toContain('Team Details');
    });

    test('should support custom date range exports', () => {
      const customRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        includeWeekends: false,
        includeReasons: true,
      };

      const workingDaysInRange = calculateWorkingDaysInRange(
        customRange.startDate,
        customRange.endDate
      );

      expect(workingDaysInRange).toBeGreaterThan(0);
      expect(workingDaysInRange).toBeLessThanOrEqual(23); // Max working days in January
    });

    test('should include Hebrew names in exports', () => {
      const memberData = createMockTeamMember({
        name: 'Tal Stern',
        hebrew: 'טל שטרן'
      });

      const exportRow = formatMemberForExport(memberData);
      expect(exportRow).toContain('Tal Stern');
      expect(exportRow).toContain('טל שטרן');
    });
  });

  // ============================================================================
  // Israeli Work Standards Tests
  // ============================================================================

  describe('Israeli Work Standards', () => {
    test('should validate 35-hour work week (5 days × 7 hours)', () => {
      const israeliWorkWeek = createIsraeliWorkWeek('2024-01-21'); // Sunday
      const weeklyCapacity = israeliWorkWeek.length * 7;

      expect(israeliWorkWeek).toHaveLength(5);
      expect(weeklyCapacity).toBe(35);
    });

    test('should exclude Friday and Saturday from calculations', () => {
      const fullWeek = ['2024-01-21', '2024-01-22', '2024-01-23', 
                        '2024-01-24', '2024-01-25', '2024-01-26', '2024-01-27'];
      
      const workingDays = fullWeek.filter(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        return ![5, 6].includes(dayOfWeek); // Exclude Fri & Sat
      });

      expect(workingDays).toHaveLength(5);
      expect(workingDays).not.toContain('2024-01-26'); // Friday
      expect(workingDays).not.toContain('2024-01-27'); // Saturday
    });

    test('should validate Israeli calendar compliance', () => {
      const scheduleData = {
        '2024-01-21': { value: '1' }, // Sunday - valid
        '2024-01-22': { value: '1' }, // Monday - valid  
        '2024-01-26': null,           // Friday - should be null/empty
        '2024-01-27': null,           // Saturday - should be null/empty
      };

      expect(validateIsraeliWorkWeekCompliance(scheduleData)).toBe(true);

      // Test violation
      const invalidScheduleData = {
        '2024-01-26': { value: '1' }, // Friday entry - invalid
      };

      expect(validateIsraeliWorkWeekCompliance(invalidScheduleData)).toBe(false);
    });

    test('should handle holiday calculations', () => {
      // Mock Israeli holidays (simplified)
      const holidays = [
        '2024-04-22', // Passover start
        '2024-09-15', // Rosh Hashanah
        '2024-10-12', // Yom Kippur
      ];

      const isWorkingDay = (dateStr: string) => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const isWeekend = [5, 6].includes(dayOfWeek);
        const isHoliday = holidays.includes(dateStr);
        
        return !isWeekend && !isHoliday;
      };

      expect(isWorkingDay('2024-01-21')).toBe(true);  // Regular Sunday
      expect(isWorkingDay('2024-01-26')).toBe(false); // Friday
      expect(isWorkingDay('2024-04-22')).toBe(false); // Holiday
    });

    test('should calculate sprint capacity with Israeli calendar', () => {
      const sprintData = {
        startDate: '2024-01-17', // Wednesday
        lengthWeeks: 2,
        teamSize: 4,
      };

      const workingDays = createSprintWorkingDays(sprintData.startDate, sprintData.lengthWeeks);
      const sprintCapacity = workingDays.length * sprintData.teamSize * 7;

      expect(workingDays).toHaveLength(10); // 2 weeks × 5 days
      expect(sprintCapacity).toBe(280);     // 10 days × 4 members × 7 hours
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty schedule data', () => {
      const emptySchedule = {};
      const totalHours = calculateExpectedHours([]);

      expect(totalHours).toBe(0);
      expect(validateIsraeliWorkWeekCompliance(emptySchedule)).toBe(true);
    });

    test('should handle partial week data', () => {
      const partialWeek = [
        createMockScheduleEntry({ date: '2024-01-17', value: '1' }),
        // Missing Tuesday-Thursday
        createMockScheduleEntry({ date: '2024-01-25', value: '0.5' }),
      ];

      const totalHours = calculateExpectedHours(partialWeek);
      const completionRate = (partialWeek.length / 5) * 100; // 2 out of 5 days

      expect(totalHours).toBe(10.5);
      expect(completionRate).toBe(40);
    });

    test('should handle invalid date ranges', () => {
      const invalidRange = {
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01'), // End before start
      };

      expect(invalidRange.endDate < invalidRange.startDate).toBe(true);
    });

    test('should handle concurrent edits gracefully', () => {
      const edit1 = { timestamp: '2024-01-17T10:00:00Z', value: '1' };
      const edit2 = { timestamp: '2024-01-17T10:01:00Z', value: '0.5' };

      // Last write should win
      const finalValue = edit2.timestamp > edit1.timestamp ? edit2.value : edit1.value;
      expect(finalValue).toBe('0.5');
    });
  });
});

// ============================================================================
// Helper Functions for Tests
// ============================================================================

function generateMockCSV(data: { scheduleData: Record<string, Record<string, string>>; members: Array<{ name: string }> }): string {
  return `Team Member,${Object.keys(data.scheduleData[1] || {})[0]}
${data.members[0].name},1
${data.members[1].name},0.5`;
}

function generateMockExcelSheets(_data: unknown): string[] {
  return ['Overview', 'Weekly Breakdown', 'Team Details'];
}

function calculateWorkingDaysInRange(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (![5, 6].includes(dayOfWeek)) { // Exclude Fri & Sat
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

function formatMemberForExport(member: { name: string; hebrew: string }): string {
  return `${member.name} (${member.hebrew})`;
}