/**
 * Edge Case Testing Suite
 * 
 * Comprehensive testing of edge cases including empty sprints,
 * all absences, mixed availability, and boundary conditions
 */

import '@testing-library/jest-dom';
import { SprintCalculations, SPRINT_CALCULATION_CONSTANTS } from '@/lib/sprintCalculations';
import { DatabaseService } from '@/lib/database';
import { databaseTestManager, testHelpers } from '../utils/databaseTestUtils';
import { 
  TEST_TEAMS, 
  TEST_TEAM_MEMBERS, 
  TEST_SCHEDULE_SCENARIOS,
  EXPECTED_CALCULATIONS 
} from '../fixtures/testData';

// Mock database service
jest.mock('@/lib/database');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('Edge Case Testing Suite', () => {
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

  describe('Empty Sprint Scenarios', () => {
    it('should handle sprint with no schedule entries', async () => {
      const testTeam = TEST_TEAMS[0]; // Product Team
      const testMembers = TEST_TEAM_MEMBERS.filter(m => m.team_id === testTeam.id);
      
      // Mock empty schedule entries
      mockDatabaseService.getScheduleEntries = jest.fn().mockResolvedValue([]);
      
      // Calculate with no entries
      const emptySchedule = TEST_SCHEDULE_SCENARIOS.emptySprint();
      const actualHours = SprintCalculations.calculateActualPlannedHours(emptySchedule);
      const potentialHours = SprintCalculations.calculateSprintPotential(
        testMembers.length, 
        '2024-01-07', 
        '2024-01-18'
      );
      
      const utilization = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);
      
      // With no entries, actual hours should be 0
      expect(actualHours).toBe(0);
      expect(potentialHours).toBe(560); // 8 members × 10 days × 7 hours
      expect(utilization).toBe(0);
      
      // Sprint health should be critical
      const health = SprintCalculations.getSprintHealthStatus(utilization, 0, 10);
      expect(health.status).toBe('critical');
    });

    it('should handle team with no members', async () => {
      // Test with empty team
      const potentialHours = SprintCalculations.calculateSprintPotential(
        0, // No members
        '2024-01-07',
        '2024-01-18'
      );
      
      expect(potentialHours).toBe(0);
      
      // Utilization should be 0 for empty team
      const utilization = SprintCalculations.calculateCompletionPercentage(0, 0);
      expect(utilization).toBe(0);
    });

    it('should handle sprint with zero working days', () => {
      // Test weekend-only period
      const weekendWorkingDays = SprintCalculations.calculateWorkingDays(
        '2024-01-12', // Friday
        '2024-01-13'  // Saturday
      );
      
      expect(weekendWorkingDays).toBe(0);
      
      const potentialHours = SprintCalculations.calculateSprintPotential(
        8, // 8 members
        '2024-01-12',
        '2024-01-13'
      );
      
      expect(potentialHours).toBe(0);
    });

    it('should handle single-day sprint scenarios', () => {
      // Test single working day
      const singleDayWorkingDays = SprintCalculations.calculateWorkingDays(
        '2024-01-07', // Sunday
        '2024-01-07'  // Same day
      );
      
      expect(singleDayWorkingDays).toBe(1);
      
      const singleDayPotential = SprintCalculations.calculateSprintPotential(
        4, // 4 members
        '2024-01-07',
        '2024-01-07'
      );
      
      expect(singleDayPotential).toBe(28); // 4 members × 1 day × 7 hours
    });
  });

  describe('All Absences Scenarios', () => {
    it('should handle sprint with all sick days', async () => {
      const testMembers = TEST_TEAM_MEMBERS.slice(0, 4); // Use 4 members
      
      // Create all sick day entries for 2 weeks (10 working days)
      const allSickEntries = testMembers.flatMap(member =>
        Array(10).fill(null).map(() => ({
          member_id: member.id,
          value: 'X' as const,
          hours: 0,
          reason: 'Sick leave'
        }))
      );
      
      const actualHours = SprintCalculations.calculateActualPlannedHours(allSickEntries);
      const potentialHours = SprintCalculations.calculateSprintPotential(
        testMembers.length,
        '2024-01-07',
        '2024-01-18'
      );
      
      expect(actualHours).toBe(0); // All sick days = 0 hours
      expect(potentialHours).toBe(280); // 4 members × 10 days × 7 hours
      
      const utilization = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);
      expect(utilization).toBe(0);
      
      // Sprint health should be critical
      const health = SprintCalculations.getSprintHealthStatus(0, 0, 1);
      expect(health.status).toBe('critical');
      expect(health.color).toBe('#EF4444');
    });

    it('should handle mixed absences (sick days and partial days)', async () => {
      // Scenario: 2 members completely sick, 2 members partial availability
      const mixedAbsenceEntries = [
        // Member 1: All sick (5 days × 0 hours = 0 hours)
        ...Array(5).fill({ value: 'X', hours: 0, reason: 'Sick leave' }),
        
        // Member 2: All sick (5 days × 0 hours = 0 hours)
        ...Array(5).fill({ value: 'X', hours: 0, reason: 'Sick leave' }),
        
        // Member 3: All half days (5 days × 3.5 hours = 17.5 hours)
        ...Array(5).fill({ value: '0.5', hours: 3.5, reason: 'Medical appointments' }),
        
        // Member 4: All half days (5 days × 3.5 hours = 17.5 hours)
        ...Array(5).fill({ value: '0.5', hours: 3.5, reason: 'Personal matters' })
      ];
      
      const actualHours = SprintCalculations.calculateActualPlannedHours(mixedAbsenceEntries);
      const potentialHours = SprintCalculations.calculateSprintPotential(4, '2024-01-07', '2024-01-11'); // 1 week
      
      expect(actualHours).toBe(35); // 0 + 0 + 17.5 + 17.5 = 35 hours
      expect(potentialHours).toBe(140); // 4 members × 5 days × 7 hours
      
      const utilization = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);
      expect(utilization).toBe(25); // 35/140 = 25%
    });

    it('should handle team where everyone leaves mid-sprint', async () => {
      // Scenario: Full availability first week, all sick second week
      const midSprintExitEntries = [
        // First week: 4 members × 5 days × 7 hours = 140 hours
        ...Array(20).fill({ value: '1', hours: 7 }),
        
        // Second week: 4 members × 5 days × 0 hours = 0 hours  
        ...Array(20).fill({ value: 'X', hours: 0, reason: 'Team illness outbreak' })
      ];
      
      const actualHours = SprintCalculations.calculateActualPlannedHours(midSprintExitEntries);
      const potentialHours = SprintCalculations.calculateSprintPotential(4, '2024-01-07', '2024-01-18'); // 2 weeks
      
      expect(actualHours).toBe(140); // Only first week worked
      expect(potentialHours).toBe(280); // 4 members × 10 days × 7 hours
      
      const utilization = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);
      expect(utilization).toBe(50); // 140/280 = 50%
    });
  });

  describe('Mixed Availability Scenarios', () => {
    it('should handle complex mixed availability patterns', async () => {
      // Realistic mixed scenario for Product Team (8 members, varied schedules)
      const complexMixedEntries = [
        // 2 members full time (2 × 10 days × 7 hours = 140 hours)
        ...Array(20).fill({ value: '1', hours: 7 }),
        
        // 2 members mostly part-time (2 × 8 full days × 7 + 2 × 2 half days × 3.5 = 126 hours)
        ...Array(16).fill({ value: '1', hours: 7 }),    // 8 full days each
        ...Array(4).fill({ value: '0.5', hours: 3.5 }), // 2 half days each
        
        // 2 members with some sick days (2 × 7 full days × 7 + 2 × 3 sick days × 0 = 98 hours)
        ...Array(14).fill({ value: '1', hours: 7 }),    // 7 full days each
        ...Array(6).fill({ value: 'X', hours: 0 }),     // 3 sick days each
        
        // 2 members heavy part-time (2 × 10 half days × 3.5 = 70 hours)
        ...Array(20).fill({ value: '0.5', hours: 3.5 })
      ];
      
      const actualHours = SprintCalculations.calculateActualPlannedHours(complexMixedEntries);
      const potentialHours = SprintCalculations.calculateSprintPotential(8, '2024-01-07', '2024-01-18');
      
      // Expected: 140 + 126 + 98 + 70 = 434 hours
      expect(actualHours).toBe(434);
      expect(potentialHours).toBe(560); // 8 members × 10 days × 7 hours
      
      const utilization = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);
      expect(utilization).toBe(78); // 434/560 ≈ 77.5% rounded to 78%
    });

    it('should handle alternating schedule patterns', () => {
      // Pattern: Alternating full/half days across the sprint
      const alternatingPattern = Array(10).fill(null).flatMap((_, dayIndex) => {
        const isFullDay = dayIndex % 2 === 0;
        return Array(4).fill({ // 4 members
          value: isFullDay ? '1' : '0.5',
          hours: isFullDay ? 7 : 3.5
        });
      });
      
      const actualHours = SprintCalculations.calculateActualPlannedHours(alternatingPattern);
      
      // 5 full days (4 members × 5 days × 7 hours = 140 hours) + 
      // 5 half days (4 members × 5 days × 3.5 hours = 70 hours) = 210 hours
      expect(actualHours).toBe(210);
    });

    it('should handle random availability patterns', () => {
      // Generate deterministic "random" pattern for consistent testing
      const randomPattern = [];
      const values = ['1', '0.5', 'X'] as const;
      const hours = [7, 3.5, 0];
      
      for (let i = 0; i < 40; i++) { // 4 members × 10 days
        const index = i % 3;
        randomPattern.push({
          value: values[index],
          hours: hours[index]
        });
      }
      
      const actualHours = SprintCalculations.calculateActualPlannedHours(randomPattern);
      
      // Pattern repeats every 3: 7 + 3.5 + 0 = 10.5 hours per 3 entries
      // 40 entries = 13 complete cycles (39 entries) + 1 extra = (13 × 10.5) + 7 = 143.5 hours
      expect(actualHours).toBe(143.5);
    });
  });

  describe('Boundary Condition Testing', () => {
    it('should handle maximum team size scenarios', () => {
      const maxTeamSize = 100; // Large team
      const potentialHours = SprintCalculations.calculateSprintPotential(
        maxTeamSize,
        '2024-01-07',
        '2024-01-18'
      );
      
      // 100 members × 10 days × 7 hours = 7000 hours
      expect(potentialHours).toBe(7000);
      
      // Should handle large calculations without precision loss
      const actualHours = maxTeamSize * 10 * 7;
      expect(potentialHours).toBe(actualHours);
    });

    it('should handle minimum viable sprint durations', () => {
      // Test 1-day sprint
      const oneDayPotential = SprintCalculations.calculateSprintPotential(
        1, // 1 member
        '2024-01-07', // Sunday
        '2024-01-07'  // Same day
      );
      
      expect(oneDayPotential).toBe(7); // 1 member × 1 day × 7 hours
      
      // Test 1-week sprint  
      const oneWeekPotential = SprintCalculations.calculateSprintPotential(
        1,
        '2024-01-07',
        '2024-01-11'
      );
      
      expect(oneWeekPotential).toBe(35); // 1 member × 5 days × 7 hours
    });

    it('should handle cross-year date ranges', () => {
      // Test sprint crossing year boundary
      const crossYearDays = SprintCalculations.calculateWorkingDays(
        '2023-12-31', // Sunday
        '2024-01-11'  // Thursday
      );
      
      // Should be 2 weeks = 10 working days
      expect(crossYearDays).toBe(10);
      
      const crossYearPotential = SprintCalculations.calculateSprintPotential(
        5, // 5 members
        '2023-12-31',
        '2024-01-11'
      );
      
      expect(crossYearPotential).toBe(350); // 5 members × 10 days × 7 hours
    });

    it('should handle leap year February scenarios', () => {
      // Test leap year February (2024 is a leap year)
      const leapYearDays = SprintCalculations.calculateWorkingDays(
        '2024-02-25', // Sunday
        '2024-03-07'  // Thursday
      );
      
      // Should span February 29th correctly
      expect(leapYearDays).toBe(10); // 2 weeks of working days
    });

    it('should handle fractional hours edge cases', () => {
      const fractionalEntries = [
        { value: '0.5', hours: 3.5 },
        { value: '0.5', hours: 3.5 },
        { value: '0.5', hours: 3.5 }
      ];
      
      const totalHours = SprintCalculations.calculateActualPlannedHours(fractionalEntries);
      expect(totalHours).toBe(10.5);
      
      // Should maintain precision
      expect(totalHours % 0.5).toBe(0);
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle large dataset calculations efficiently', () => {
      const startTime = performance.now();
      
      // Generate large schedule dataset
      const largeSchedule = Array(10000).fill({ value: '1', hours: 7 });
      const totalHours = SprintCalculations.calculateActualPlannedHours(largeSchedule);
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      expect(totalHours).toBe(70000); // 10,000 × 7 hours
      expect(calculationTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle concurrent edge case calculations', async () => {
      const edgeCaseCalculations = [
        () => SprintCalculations.calculateSprintPotential(0, '2024-01-07', '2024-01-18'), // Empty team
        () => SprintCalculations.calculateWorkingDays('2024-01-12', '2024-01-13'), // Weekend only
        () => SprintCalculations.calculateActualPlannedHours([]), // Empty schedule
        () => SprintCalculations.calculateCompletionPercentage(0, 0), // Zero division
        () => SprintCalculations.calculateSprintPotential(100, '2024-01-07', '2024-01-07') // Large team, single day
      ];
      
      // Run all calculations concurrently
      const results = await Promise.allSettled(
        edgeCaseCalculations.map(calc => Promise.resolve(calc()))
      );
      
      // All should succeed without errors
      const failures = results.filter(result => result.status === 'rejected');
      expect(failures).toHaveLength(0);
      
      // Verify specific results
      expect((results[0] as PromiseFulfilledResult<number>).value).toBe(0);   // Empty team
      expect((results[1] as PromiseFulfilledResult<number>).value).toBe(0);   // Weekend only
      expect((results[2] as PromiseFulfilledResult<number>).value).toBe(0);   // Empty schedule
      expect((results[3] as PromiseFulfilledResult<number>).value).toBe(0);   // Zero division
      expect((results[4] as PromiseFulfilledResult<number>).value).toBe(700); // Large team single day
    });
  });

  describe('Data Consistency in Edge Cases', () => {
    it('should maintain calculation consistency with partial data', async () => {
      // Test with missing schedule entries (gaps in data)
      const partialSchedule = [
        { value: '1' as const, hours: 7 },     // Entry 1
        // Missing entry 2
        { value: '0.5' as const, hours: 3.5 }, // Entry 3
        // Missing entry 4
        { value: 'X' as const, hours: 0 }      // Entry 5
      ];
      
      const actualHours = SprintCalculations.calculateActualPlannedHours(partialSchedule);
      expect(actualHours).toBe(10.5); // 7 + 3.5 + 0 = 10.5
      
      // Should handle missing data gracefully
      const utilization = SprintCalculations.calculateCompletionPercentage(actualHours, 35);
      expect(utilization).toBe(30); // 10.5/35 = 30%
    });

    it('should handle timezone boundary edge cases', () => {
      // Test dates that might cross timezone boundaries
      const timezoneDates = [
        ['2024-01-07T00:00:00Z', '2024-01-11T23:59:59Z'], // UTC boundaries
        ['2024-01-07', '2024-01-11'], // Date only (no time)
        ['2024-03-10', '2024-03-16'], // During DST transition (if applicable)
      ];
      
      timezoneDates.forEach(([start, end]) => {
        const startDateOnly = start.split('T')[0];
        const endDateOnly = end.split('T')[0];
        
        const workingDays = SprintCalculations.calculateWorkingDays(startDateOnly, endDateOnly);
        expect(workingDays).toBe(5); // Should always be 5 working days for a week
      });
    });

    it('should validate calculations remain consistent under stress', () => {
      // Perform the same calculation 1000 times under different conditions
      const baseCalculation = () => SprintCalculations.calculateSprintPotential(8, '2024-01-07', '2024-01-18');
      
      const results = [];
      
      // Add some computational stress
      for (let i = 0; i < 1000; i++) {
        // Perform some dummy calculations to create CPU load
        Math.sqrt(Math.random() * 1000000);
        
        results.push(baseCalculation());
      }
      
      // All results should be identical
      const uniqueResults = [...new Set(results)];
      expect(uniqueResults).toHaveLength(1);
      expect(uniqueResults[0]).toBe(560);
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    it('should handle invalid input gracefully', () => {
      // Test with invalid dates
      const invalidDateResults = [
        SprintCalculations.calculateWorkingDays('invalid-date', '2024-01-18'),
        SprintCalculations.calculateWorkingDays('2024-01-07', 'invalid-date'),
        SprintCalculations.calculateWorkingDays('', ''),
      ];
      
      // Should handle gracefully (return 0 or handle error appropriately)
      invalidDateResults.forEach(result => {
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle corrupted schedule data', () => {
      const corruptedSchedule = [
        { value: '1' as const, hours: 7 },
        { value: 'invalid' as any, hours: -5 }, // Invalid value and negative hours
        { value: '0.5' as const, hours: null as any }, // Null hours
        { value: null as any, hours: 7 }, // Null value
        { value: undefined as any, hours: undefined as any } // Undefined fields
      ];
      
      // Should handle corrupted data without crashing
      expect(() => {
        SprintCalculations.calculateActualPlannedHours(corruptedSchedule);
      }).not.toThrow();
    });

    it('should maintain stability with extreme values', () => {
      const extremeValues = [
        SprintCalculations.calculateSprintPotential(Number.MAX_SAFE_INTEGER, '2024-01-07', '2024-01-07'),
        SprintCalculations.calculateSprintPotential(-1, '2024-01-07', '2024-01-18'),
        SprintCalculations.calculateCompletionPercentage(Number.MAX_VALUE, 1),
        SprintCalculations.calculateCompletionPercentage(1, Number.MIN_VALUE)
      ];
      
      // Should handle extreme values without crashing
      extremeValues.forEach(result => {
        expect(typeof result).toBe('number');
        expect(isFinite(result) || result === 0).toBe(true);
      });
    });
  });
});