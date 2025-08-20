/**
 * Sprint Dashboard Validation Test
 * 
 * Tests to validate that sprint dashboard shows correct:
 * - Sprint dates (August 2025, not July 27th)
 * - Hours calculations (35/70 for 2-week sprints, not 35/42)
 * - User table rendering (10 working days, not 5)
 */

import { SprintLogic } from '@/utils/sprintLogic';
import { getCurrentSprintInfo } from '@/utils/enhancedDateUtils';
import { calculateTeamSprintPotential } from '@/utils/potentialHoursUtils';
import { CalculationService, calculateRealSprintCapacity } from '@/lib/calculationService';

describe('Sprint Dashboard Validation', () => {
  describe('Sprint Date Calculations', () => {
    test('should calculate correct sprint end date for 2-week sprint', () => {
      // Test with current date in August 2025
      const startDate = new Date('2025-08-11'); // Monday
      const lengthWeeks = 2;
      
      const endDate = SprintLogic.calculateSprintEndDate(startDate, lengthWeeks);
      
      // Israeli work week: Sunday-Thursday (5 days per week)
      // For 2-week sprint starting Aug 11, 2025 (Monday):
      // Week 1: Mon 11, Tue 12, Wed 13, Thu 14 (4 days) + Sun 17 (1 day) = 5 days
      // Week 2: Mon 18, Tue 19, Wed 20, Thu 21 (4 days) + Sun 24 (1 day) = 5 days
      // Total: 10 working days, ending on Sunday Aug 24
      expect(endDate.getMonth()).toBe(7); // August (0-indexed)
      expect(endDate.getFullYear()).toBe(2025);
      expect(endDate.getDate()).toBe(24); // Should be Aug 24th (Sunday)
    });

    test('should generate correct working days for 2-week sprint', () => {
      const startDate = new Date('2025-08-11');
      const endDate = new Date('2025-08-24'); // Corrected end date
      
      const workingDays = SprintLogic.getWorkingDays(startDate, endDate);
      const actualWorkingDays = workingDays.filter(day => day.isWorkingDay);
      
      expect(actualWorkingDays).toHaveLength(10); // 2 weeks × 5 working days
      
      // Verify dates are in August 2025
      actualWorkingDays.forEach(day => {
        expect(day.date.getMonth()).toBe(7); // August
        expect(day.date.getFullYear()).toBe(2025);
      });
    });
  });

  describe('Hours Capacity Calculations', () => {
    test('should calculate correct sprint capacity for 2-week sprint', () => {
      const workingDays = 10; // 2 weeks × 5 working days
      
      const capacity = SprintLogic.calculateSprintCapacity(workingDays);
      
      expect(capacity.workingDays).toBe(10);
      expect(capacity.maxHours).toBe(70); // 10 working days × 7 hours
      expect(capacity.managerMaxHours).toBe(35); // 10 working days × 3.5 hours
    });

    test('should calculate team sprint potential correctly', () => {
      const memberCount = 6;
      const sprintWeeks = 2;
      
      const potential = calculateTeamSprintPotential(memberCount, sprintWeeks);
      
      // 6 members × 35 hours/week × 2 weeks = 420 hours
      expect(potential).toBe(420);
    });

    test('should calculate real sprint capacity from dates', () => {
      const teamMembers = [
        { id: 1, name: 'Member 1' },
        { id: 2, name: 'Member 2' },
        { id: 3, name: 'Member 3' },
        { id: 4, name: 'Member 4' },
        { id: 5, name: 'Member 5' },
        { id: 6, name: 'Member 6' }
      ];
      
      const sprintStart = new Date('2025-08-11');
      const sprintEnd = new Date('2025-08-24');
      
      // Use the export function from CalculationService
      const capacity = calculateRealSprintCapacity(
        teamMembers as any,
        sprintStart,
        sprintEnd
      );
      
      // 6 members × 10 working days × 7 hours = 420 hours
      expect(capacity).toBe(420);
    });

    test('should NOT calculate weekly capacity (42 hours) for sprint display', () => {
      const memberCount = 6;
      const workingDaysPerWeek = 5;
      const hoursPerDay = 7;
      
      // This is what we DON'T want to see in sprint context
      const weeklyCapacity = memberCount * workingDaysPerWeek * hoursPerDay;
      expect(weeklyCapacity).toBe(210); // 6 × 5 × 7 = 210 hours per week
      
      // For 2-week sprint, should be double
      const sprintCapacity = calculateTeamSprintPotential(memberCount, 2);
      expect(sprintCapacity).toBe(420); // Should be 420, not 210
      expect(sprintCapacity).not.toBe(252); // Definitely not 252 (6 × 6 × 7)
    });
  });

  describe('Sprint vs Weekly Calculation Validation', () => {
    test('should identify common calculation mistakes', () => {
      const memberCount = 6;
      const sprintWeeks = 2;
      
      // Correct calculation
      const correctSprintCapacity = calculateTeamSprintPotential(memberCount, sprintWeeks);
      expect(correctSprintCapacity).toBe(420);
      
      // Common mistakes we want to avoid:
      
      // Mistake 1: Using 6 working days instead of 5 (some systems count Fri/Sat)
      const mistake1 = memberCount * 6 * 7 * sprintWeeks; // 504 hours
      expect(correctSprintCapacity).not.toBe(mistake1);
      
      // Mistake 2: Using only 1 week worth of days for 2-week sprint  
      const mistake2 = memberCount * 5 * 7; // 210 hours (weekly, not sprint)
      expect(correctSprintCapacity).not.toBe(mistake2);
      
      // Mistake 3: Using 6 working days for 1 week (6 × 7 = 42 per person)
      const mistake3 = memberCount * 42; // 252 hours
      expect(correctSprintCapacity).not.toBe(mistake3);
      
      // The issue might be displaying 35/42 instead of 35/70
      // 42 would come from: 6 working days × 7 hours = 42 hours per person
      // But Israeli work week is Sunday-Thursday (5 days), not 6 days
    });

    test('should validate individual member capacity calculations', () => {
      const sprintWeeks = 2;
      const workingDaysPerWeek = 5;
      const hoursPerDay = 7;
      
      // Individual member capacity for 2-week sprint
      const memberSprintCapacity = sprintWeeks * workingDaysPerWeek * hoursPerDay;
      expect(memberSprintCapacity).toBe(70); // 2 × 5 × 7 = 70 hours per member
      
      // This should NOT be 42 (which would be 6 × 7 = 42)
      expect(memberSprintCapacity).not.toBe(42);
      
      // For 6 members
      const teamSprintCapacity = 6 * memberSprintCapacity;
      expect(teamSprintCapacity).toBe(420);
    });
  });

  describe('Working Days Generation', () => {
    test('should generate correct number of working days for sprint table', () => {
      const startDate = new Date('2025-08-11'); // Monday
      const lengthWeeks = 2;
      const endDate = SprintLogic.calculateSprintEndDate(startDate, lengthWeeks);
      
      const allDays = SprintLogic.getWorkingDays(startDate, endDate);
      const workingDays = allDays.filter(day => day.isWorkingDay);
      
      // Should have 10 working days for table headers
      expect(workingDays).toHaveLength(10);
      
      // Should NOT have 5 working days (which would cause table mismatch)
      expect(workingDays.length).not.toBe(5);
      
      // Verify day names would be generated correctly
      const dayNames = workingDays.map(day => 
        day.date.toLocaleDateString('en-US', { weekday: 'long' })
      );
      
      expect(dayNames).toHaveLength(10);
      expect(dayNames[0]).toBe('Monday'); // Aug 11
      expect(dayNames[4]).toBe('Sunday'); // Aug 17 (5th working day)
      expect(dayNames[5]).toBe('Monday'); // Aug 18 (6th working day)
      expect(dayNames[9]).toBe('Sunday'); // Aug 24 (10th working day - last day of sprint)
    });
  });

  describe('Date Range Validation', () => {
    test('should show August 2025 dates, not July 27th', () => {
      // Current date is August 12, 2025 according to the user
      const currentDate = new Date('2025-08-12');
      
      // Mock sprint that should be active
      const mockSprint = {
        sprint_start_date: '2025-08-11',
        sprint_length_weeks: 2,
        current_sprint_number: 15
      };
      
      // Calculate end date
      const startDate = new Date(mockSprint.sprint_start_date);
      const endDate = SprintLogic.calculateSprintEndDate(startDate, mockSprint.sprint_length_weeks);
      
      // Should be August 24, 2025, not July 27th
      expect(endDate.getMonth()).toBe(7); // August (0-indexed)
      expect(endDate.getDate()).toBe(24);
      expect(endDate.getFullYear()).toBe(2025);
      
      // Should NOT be July 27th
      expect(endDate.getMonth()).not.toBe(6); // Not July
      expect(endDate.getDate()).not.toBe(27);
    });
  });
});

describe('Database Integration Validation', () => {
  test('should validate enhanced sprint schema compatibility', () => {
    // Test that our enhanced sprint calculation methods work with both schemas
    const legacySprint = {
      id: 1,
      current_sprint_number: 15,
      sprint_length_weeks: 2,
      sprint_start_date: '2025-08-11',
      sprint_end_date: '2025-08-24'
    };
    
    const enhancedSprint = {
      id: 'uuid-123',
      sprint_number: 15,
      length_weeks: 2,
      start_date: '2025-08-11',
      end_date: '2025-08-24',
      working_days_count: 10,
      is_active: true
    };
    
    // Both should work with our calculation functions
    const workingDays1 = SprintLogic.getWorkingDays(
      new Date(legacySprint.sprint_start_date),
      new Date(legacySprint.sprint_end_date)
    ).filter(d => d.isWorkingDay).length;
    
    const workingDays2 = SprintLogic.getWorkingDays(
      new Date(enhancedSprint.start_date),
      new Date(enhancedSprint.end_date)
    ).filter(d => d.isWorkingDay).length;
    
    expect(workingDays1).toBe(10);
    expect(workingDays2).toBe(10);
    expect(enhancedSprint.working_days_count).toBe(10);
  });
});