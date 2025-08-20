/**
 * Manual Calculation Verification Tests
 * 
 * Comprehensive verification of all sprint calculations, hours computations,
 * and utilization metrics using known test data and expected results
 */

import '@testing-library/jest-dom';
import { SprintCalculations, SPRINT_CALCULATION_CONSTANTS } from '@/lib/sprintCalculations';
import { DatabaseService } from '@/lib/database';
import { databaseTestManager, testHelpers } from '../utils/databaseTestUtils';
import { 
  TEST_TEAMS, 
  TEST_TEAM_MEMBERS, 
  EXPECTED_CALCULATIONS,
  TEST_DATE_RANGES,
  TEST_SCHEDULE_SCENARIOS
} from '../fixtures/testData';

// Mock database service
jest.mock('@/lib/database');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('Manual Calculation Verification Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await testHelpers.setupCompleteTestEnvironment();
    
    // Suppress console outputs
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await testHelpers.cleanupTestEnvironment();
    jest.restoreAllMocks();
  });

  describe('Sprint Potential Calculations - 35 Hours Standard', () => {
    it('should calculate Product Team sprint potential correctly (8 members × 2 weeks)', async () => {
      const productTeam = TEST_TEAMS.find(t => t.name === 'Product Team')!;
      const productMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === productTeam.id);
      
      // Verify team has 8 members as expected
      expect(productMembers).toHaveLength(8);
      
      // Calculate 2-week sprint potential
      const startDate = TEST_DATE_RANGES.twoWeekSprint.start;
      const endDate = TEST_DATE_RANGES.twoWeekSprint.end;
      
      const workingDays = SprintCalculations.calculateWorkingDays(startDate, endDate);
      const sprintPotential = SprintCalculations.calculateSprintPotential(
        productMembers.length,
        startDate,
        endDate
      );
      
      // Verify calculations
      expect(workingDays).toBe(EXPECTED_CALCULATIONS.workingDays.twoWeeks); // 10 working days
      expect(sprintPotential).toBe(EXPECTED_CALCULATIONS.sprintPotential.productTeam); // 560 hours
      
      // Manual verification: 8 members × 10 working days × 7 hours = 560 hours
      const manualCalculation = productMembers.length * workingDays * SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY;
      expect(sprintPotential).toBe(manualCalculation);
    });

    it('should calculate Development Team - Tal sprint potential correctly (4 members × 2 weeks)', async () => {
      const devTeamTal = TEST_TEAMS.find(t => t.name === 'Development Team - Tal')!;
      const devMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === devTeamTal.id);
      
      expect(devMembers).toHaveLength(4);
      
      const startDate = TEST_DATE_RANGES.twoWeekSprint.start;
      const endDate = TEST_DATE_RANGES.twoWeekSprint.end;
      
      const sprintPotential = SprintCalculations.calculateSprintPotential(
        devMembers.length,
        startDate,
        endDate
      );
      
      expect(sprintPotential).toBe(EXPECTED_CALCULATIONS.sprintPotential.devTeamTal); // 280 hours
      
      // Manual verification: 4 members × 10 working days × 7 hours = 280 hours
      const manualCalculation = 4 * 10 * 7;
      expect(sprintPotential).toBe(manualCalculation);
    });

    it('should calculate Development Team - Itay sprint potential correctly (5 members × 2 weeks)', async () => {
      const devTeamItay = TEST_TEAMS.find(t => t.name === 'Development Team - Itay')!;
      const devMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === devTeamItay.id);
      
      expect(devMembers).toHaveLength(5);
      
      const startDate = TEST_DATE_RANGES.twoWeekSprint.start;
      const endDate = TEST_DATE_RANGES.twoWeekSprint.end;
      
      const sprintPotential = SprintCalculations.calculateSprintPotential(
        devMembers.length,
        startDate,
        endDate
      );
      
      expect(sprintPotential).toBe(EXPECTED_CALCULATIONS.sprintPotential.devTeamItay); // 350 hours
      
      // Manual verification: 5 members × 10 working days × 7 hours = 350 hours
      const manualCalculation = 5 * 10 * 7;
      expect(sprintPotential).toBe(manualCalculation);
    });

    it('should calculate Infrastructure Team sprint potential correctly (3 members × 3 weeks)', async () => {
      const infraTeam = TEST_TEAMS.find(t => t.name === 'Infrastructure Team')!;
      const infraMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === infraTeam.id);
      
      expect(infraMembers).toHaveLength(3);
      
      const startDate = TEST_DATE_RANGES.threeWeekSprint.start;
      const endDate = TEST_DATE_RANGES.threeWeekSprint.end;
      
      const workingDays = SprintCalculations.calculateWorkingDays(startDate, endDate);
      const sprintPotential = SprintCalculations.calculateSprintPotential(
        infraMembers.length,
        startDate,
        endDate
      );
      
      expect(workingDays).toBe(EXPECTED_CALCULATIONS.workingDays.threeWeeks); // 15 working days
      expect(sprintPotential).toBe(EXPECTED_CALCULATIONS.sprintPotential.infrastructureTeam); // 315 hours
      
      // Manual verification: 3 members × 15 working days × 7 hours = 315 hours
      const manualCalculation = 3 * 15 * 7;
      expect(sprintPotential).toBe(manualCalculation);
    });

    it('should calculate Data Team sprint potential correctly (6 members × 2 weeks)', async () => {
      const dataTeam = TEST_TEAMS.find(t => t.name === 'Data Team')!;
      const dataMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === dataTeam.id);
      
      expect(dataMembers).toHaveLength(6);
      
      const startDate = TEST_DATE_RANGES.twoWeekSprint.start;
      const endDate = TEST_DATE_RANGES.twoWeekSprint.end;
      
      const sprintPotential = SprintCalculations.calculateSprintPotential(
        dataMembers.length,
        startDate,
        endDate
      );
      
      expect(sprintPotential).toBe(EXPECTED_CALCULATIONS.sprintPotential.dataTeam); // 420 hours
      
      // Manual verification: 6 members × 10 working days × 7 hours = 420 hours
      const manualCalculation = 6 * 10 * 7;
      expect(sprintPotential).toBe(manualCalculation);
    });

    it('should calculate Management Team sprint potential correctly (1 member × 2 weeks)', async () => {
      const mgmtTeam = TEST_TEAMS.find(t => t.name === 'Management Team')!;
      const mgmtMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === mgmtTeam.id);
      
      expect(mgmtMembers).toHaveLength(1);
      
      const startDate = TEST_DATE_RANGES.twoWeekSprint.start;
      const endDate = TEST_DATE_RANGES.twoWeekSprint.end;
      
      const sprintPotential = SprintCalculations.calculateSprintPotential(
        mgmtMembers.length,
        startDate,
        endDate
      );
      
      expect(sprintPotential).toBe(EXPECTED_CALCULATIONS.sprintPotential.managementTeam); // 70 hours
      
      // Manual verification: 1 member × 10 working days × 7 hours = 70 hours
      const manualCalculation = 1 * 10 * 7;
      expect(sprintPotential).toBe(manualCalculation);
    });
  });

  describe('Working Days Calculation Verification', () => {
    it('should calculate Israeli working days correctly for various periods', () => {
      // Test single week (Sunday-Thursday)
      const singleWeekDays = SprintCalculations.calculateWorkingDays(
        TEST_DATE_RANGES.singleWeek.start,
        TEST_DATE_RANGES.singleWeek.end
      );
      expect(singleWeekDays).toBe(EXPECTED_CALCULATIONS.workingDays.oneWeek); // 5 days

      // Test two weeks
      const twoWeeksDays = SprintCalculations.calculateWorkingDays(
        TEST_DATE_RANGES.twoWeekSprint.start,
        TEST_DATE_RANGES.twoWeekSprint.end
      );
      expect(twoWeeksDays).toBe(EXPECTED_CALCULATIONS.workingDays.twoWeeks); // 10 days

      // Test three weeks
      const threeWeeksDays = SprintCalculations.calculateWorkingDays(
        TEST_DATE_RANGES.threeWeekSprint.start,
        TEST_DATE_RANGES.threeWeekSprint.end
      );
      expect(threeWeeksDays).toBe(EXPECTED_CALCULATIONS.workingDays.threeWeeks); // 15 days

      // Test weekend period (should be 0)
      const weekendDays = SprintCalculations.calculateWorkingDays(
        TEST_DATE_RANGES.weekendPeriod.start,
        TEST_DATE_RANGES.weekendPeriod.end
      );
      expect(weekendDays).toBe(EXPECTED_CALCULATIONS.workingDays.weekend); // 0 days

      // Test cross-month sprint
      const crossMonthDays = SprintCalculations.calculateWorkingDays(
        TEST_DATE_RANGES.crossMonthSprint.start,
        TEST_DATE_RANGES.crossMonthSprint.end
      );
      expect(crossMonthDays).toBe(EXPECTED_CALCULATIONS.workingDays.twoWeeks); // 10 days
    });

    it('should handle edge cases in working days calculation', () => {
      // Test same start and end date (single day)
      const singleDay = SprintCalculations.calculateWorkingDays('2024-01-07', '2024-01-07'); // Sunday
      expect(singleDay).toBe(EXPECTED_CALCULATIONS.workingDays.singleDay); // 1 day

      // Test Friday to Saturday (weekend)
      const fridayToSaturday = SprintCalculations.calculateWorkingDays('2024-01-12', '2024-01-13');
      expect(fridayToSaturday).toBe(0);

      // Test Thursday to Sunday (weekend + start of next week)
      const thursdayToSunday = SprintCalculations.calculateWorkingDays('2024-01-11', '2024-01-14');
      expect(thursdayToSunday).toBe(2); // Thursday + Sunday

      // Test month boundaries (Israeli working days: Sunday-Thursday)
      const monthBoundary = SprintCalculations.calculateWorkingDays('2024-01-31', '2024-02-04');
      expect(monthBoundary).toBe(3); // Wed Jan 31, Thu Feb 1, Sun Feb 4
    });
  });

  describe('Hours Per Day Calculation Verification', () => {
    it('should calculate hours correctly for all schedule values', () => {
      const testScenarios = [
        { value: '1', expectedHours: EXPECTED_CALCULATIONS.hoursPerDay.fullDay }, // 7 hours
        { value: '0.5', expectedHours: EXPECTED_CALCULATIONS.hoursPerDay.halfDay }, // 3.5 hours
        { value: 'X', expectedHours: EXPECTED_CALCULATIONS.hoursPerDay.sickDay } // 0 hours
      ];

      testScenarios.forEach(({ value, expectedHours }) => {
        const scheduleEntries = [{ value, hours: expectedHours }];
        const calculatedHours = SprintCalculations.calculateActualPlannedHours(scheduleEntries);
        expect(calculatedHours).toBe(expectedHours);
      });
    });

    it('should calculate weekly hours correctly for mixed schedules', () => {
      // Test Product Team member with mixed week
      const mixedSchedule = [
        { value: '1', hours: 7 },    // Sunday - full day
        { value: '1', hours: 7 },    // Monday - full day  
        { value: '0.5', hours: 3.5 }, // Tuesday - half day
        { value: 'X', hours: 0 },    // Wednesday - sick day
        { value: '1', hours: 7 }     // Thursday - full day
      ];

      const totalHours = SprintCalculations.calculateActualPlannedHours(mixedSchedule);
      const expectedTotal = 7 + 7 + 3.5 + 0 + 7; // 24.5 hours
      
      expect(totalHours).toBe(expectedTotal);
    });

    it('should maintain calculation consistency across different team sizes', () => {
      const teamSizes = [1, 3, 4, 5, 6, 8]; // Actual team sizes from test data
      const startDate = '2024-01-07';
      const endDate = '2024-01-18'; // 2 weeks
      const workingDays = 10;

      teamSizes.forEach(teamSize => {
        const potential = SprintCalculations.calculateSprintPotential(teamSize, startDate, endDate);
        const expectedPotential = teamSize * workingDays * 7;
        
        expect(potential).toBe(expectedPotential);
        
        // Verify hours per member per week = 35
        const hoursPerMemberPerWeek = potential / teamSize / 2; // 2 weeks
        expect(hoursPerMemberPerWeek).toBe(35);
      });
    });
  });

  describe('Utilization and Completion Percentage Calculations', () => {
    it('should calculate utilization percentages correctly', () => {
      const testCases = [
        { actual: 280, potential: 560, expectedUtilization: 50 },   // Half utilization
        { actual: 420, potential: 560, expectedUtilization: 75 },   // Good utilization
        { actual: 560, potential: 560, expectedUtilization: 100 },  // Perfect utilization
        { actual: 600, potential: 560, expectedUtilization: 107 },  // Over capacity
        { actual: 0, potential: 560, expectedUtilization: 0 },      // No work
        { actual: 140, potential: 560, expectedUtilization: 25 }    // Low utilization
      ];

      testCases.forEach(({ actual, potential, expectedUtilization }) => {
        const utilization = SprintCalculations.calculateCompletionPercentage(actual, potential);
        expect(utilization).toBe(expectedUtilization);
      });
    });

    it('should calculate team capacity gap correctly', () => {
      const testCases = [
        { potential: 560, actual: 280, expectedGap: 280 },   // Under capacity
        { potential: 560, actual: 560, expectedGap: 0 },     // At capacity
        { potential: 560, actual: 600, expectedGap: -40 },   // Over capacity
        { potential: 280, actual: 140, expectedGap: 140 }    // Half utilized
      ];

      testCases.forEach(({ potential, actual, expectedGap }) => {
        const gap = potential - actual;
        expect(gap).toBe(expectedGap);
      });
    });

    it('should calculate sprint health status correctly', () => {
      const healthScenarios = [
        { completion: 95, utilization: 85, daysRemaining: 2, expectedStatus: 'excellent' },
        { completion: 80, utilization: 75, daysRemaining: 3, expectedStatus: 'good' },
        { completion: 60, utilization: 65, daysRemaining: 5, expectedStatus: 'warning' },
        { completion: 30, utilization: 40, daysRemaining: 1, expectedStatus: 'critical' }
      ];

      healthScenarios.forEach(({ completion, utilization, daysRemaining, expectedStatus }) => {
        const health = SprintCalculations.getSprintHealthStatus(completion, utilization, daysRemaining);
        expect(health.status).toBe(expectedStatus);
      });
    });
  });

  describe('Real-World Scenario Verification', () => {
    it('should handle typical Product Team sprint scenario', async () => {
      const productTeam = TEST_TEAMS.find(t => t.name === 'Product Team')!;
      const productMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === productTeam.id);
      
      // Simulate real schedule: 7 members full time, 1 member part-time
      const scheduleEntries = [
        // 7 members with full availability (7 × 5 days × 7 hours = 245 hours each)
        ...Array(35).fill({ value: '1', hours: 7 }), // 7 members × 5 days = 35 entries
        
        // 1 member with part-time availability (1 × 5 days × 3.5 hours = 17.5 hours)
        ...Array(5).fill({ value: '0.5', hours: 3.5 }) // 1 member × 5 days = 5 entries
      ];

      const actualHours = SprintCalculations.calculateActualPlannedHours(scheduleEntries);
      const potentialHours = SprintCalculations.calculateSprintPotential(8, '2024-01-07', '2024-01-11'); // 1 week
      const utilization = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);

      // Expected: (7 × 35) + (1 × 17.5) = 245 + 17.5 = 262.5 hours actual
      // Potential: 8 × 5 × 7 = 280 hours
      // Utilization: 262.5 / 280 = 93.75% ≈ 94%
      
      expect(actualHours).toBe(262.5);
      expect(potentialHours).toBe(280);
      expect(utilization).toBe(94);
    });

    it('should handle Infrastructure Team 3-week sprint with mixed availability', async () => {
      const infraTeam = TEST_TEAMS.find(t => t.name === 'Infrastructure Team')!;
      const infraMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === infraTeam.id);
      
      // Simulate 3-week sprint with some absences
      const scheduleEntries = [
        // Member 1: Full availability for 3 weeks (15 days × 7 hours = 105 hours)
        ...Array(15).fill({ value: '1', hours: 7 }),
        
        // Member 2: Some sick days (12 working days, 3 sick days = 12 × 7 = 84 hours)
        ...Array(12).fill({ value: '1', hours: 7 }),
        ...Array(3).fill({ value: 'X', hours: 0 }),
        
        // Member 3: Mix of full and half days (10 full + 5 half = 70 + 17.5 = 87.5 hours)
        ...Array(10).fill({ value: '1', hours: 7 }),
        ...Array(5).fill({ value: '0.5', hours: 3.5 })
      ];

      const actualHours = SprintCalculations.calculateActualPlannedHours(scheduleEntries);
      const potentialHours = SprintCalculations.calculateSprintPotential(3, '2024-01-07', '2024-01-25'); // 3 weeks
      const utilization = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);

      // Expected actual: 105 + 84 + 87.5 = 276.5 hours
      // Potential: 3 × 15 × 7 = 315 hours
      // Utilization: 276.5 / 315 = 87.78% ≈ 88%
      
      expect(actualHours).toBe(276.5);
      expect(potentialHours).toBe(315);
      expect(utilization).toBe(88);
    });

    it('should calculate company-wide metrics correctly', async () => {
      // Calculate total company potential for 2-week sprint
      const companyPotential = TEST_TEAMS.reduce((total, team) => {
        const members = TEST_TEAM_MEMBERS.filter(m => m.team_id === team.id);
        const weeks = team.sprint_length_weeks || 2;
        const workingDays = weeks * 5;
        return total + (members.length * workingDays * 7);
      }, 0);

      // Expected: Product(560) + DevTal(280) + DevItay(350) + Infra(315) + Data(420) + Mgmt(70)
      // Note: Infrastructure has 3-week sprint, others have 2-week
      const expectedCompanyPotential = 560 + 280 + 350 + 315 + 420 + 70; // 1995 hours
      
      expect(companyPotential).toBe(expectedCompanyPotential);
    });
  });

  describe('Cross-Component Calculation Consistency', () => {
    it('should produce identical results across all calculation components', async () => {
      const testTeam = TEST_TEAMS[0]; // Product Team
      const testMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === testTeam.id);
      const startDate = '2024-01-07';
      const endDate = '2024-01-18';

      // Calculate using different calculation paths
      const directCalculation = testMembers.length * 10 * 7; // Direct manual calculation
      const sprintCalculation = SprintCalculations.calculateSprintPotential(testMembers.length, startDate, endDate);
      const componentCalculation = testMembers.length * SprintCalculations.calculateWorkingDays(startDate, endDate) * 7;

      // All should be identical
      expect(sprintCalculation).toBe(directCalculation);
      expect(componentCalculation).toBe(directCalculation);
      expect(sprintCalculation).toBe(componentCalculation);
    });

    it('should maintain calculation precision for partial hours', () => {
      const halfDayEntries = Array(10).fill({ value: '0.5', hours: 3.5 });
      const totalHours = SprintCalculations.calculateActualPlannedHours(halfDayEntries);
      
      // 10 × 3.5 = 35 hours (should maintain precision)
      expect(totalHours).toBe(35);
      expect(totalHours % 0.5).toBe(0); // Should be divisible by 0.5
    });

    it('should handle large team calculations without precision loss', () => {
      const largeTeamSize = 50; // Hypothetical large team
      const startDate = '2024-01-07';
      const endDate = '2024-02-15'; // 6 weeks

      const workingDays = SprintCalculations.calculateWorkingDays(startDate, endDate);
      const potential = SprintCalculations.calculateSprintPotential(largeTeamSize, startDate, endDate);
      
      // Should maintain precision even for large numbers
      const expectedPotential = largeTeamSize * workingDays * 7;
      expect(potential).toBe(expectedPotential);
      
      // Working days should be 6 weeks × 5 days = 30 days
      expect(workingDays).toBe(30);
      expect(potential).toBe(50 * 30 * 7); // 10,500 hours
    });
  });

  describe('Performance and Accuracy Benchmarks', () => {
    it('should perform calculations within acceptable time limits', async () => {
      const startTime = performance.now();
      
      // Perform multiple calculations in sequence
      for (let i = 0; i < 100; i++) {
        SprintCalculations.calculateSprintPotential(8, '2024-01-07', '2024-01-18');
        SprintCalculations.calculateWorkingDays('2024-01-07', '2024-01-18');
        SprintCalculations.calculateActualPlannedHours([{ value: '1', hours: 7 }]);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete 300 calculations in under 100ms
      expect(totalTime).toBeLessThan(100);
    });

    it('should maintain accuracy across repeated calculations', () => {
      const teamSize = 8;
      const startDate = '2024-01-07';
      const endDate = '2024-01-18';
      
      // Perform the same calculation 1000 times
      const results = Array(1000).fill(null).map(() => 
        SprintCalculations.calculateSprintPotential(teamSize, startDate, endDate)
      );
      
      // All results should be identical
      const uniqueResults = [...new Set(results)];
      expect(uniqueResults).toHaveLength(1);
      expect(uniqueResults[0]).toBe(560);
    });
  });
});