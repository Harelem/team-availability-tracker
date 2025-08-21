/**
 * Comprehensive Test Suite for CalculationService
 * 
 * Tests all calculation methods with various scenarios including:
 * - Valid inputs and expected outputs
 * - Edge cases and boundary conditions
 * - Error handling and validation
 * - Integration scenarios with real-world data
 */

import {
  CalculationService,
  CALCULATION_CONSTANTS,
  calculateWorkingDaysBetween,
  formatHours,
  formatPercentage,
  getUtilizationStatusColor,
} from '../src/lib/calculationService';
import { TeamMember, ScheduleEntry } from '../src/types';

// Test data setup
const mockTeamMembers: TeamMember[] = [
  {
    id: 1,
    name: 'John Doe',
    hebrew: 'ג\'ון דו',
    isManager: true,
    team_id: 1,
  },
  {
    id: 2,
    name: 'Jane Smith',
    hebrew: 'ג\'יין סמית\'',
    isManager: false,
    team_id: 1,
  },
  {
    id: 3,
    name: 'Bob Johnson',
    hebrew: 'בוב ג\'ונסון',
    isManager: false,
    team_id: 1,
  },
];

const mockScheduleEntries: { [dateKey: string]: ScheduleEntry } = {
  '2024-01-14': { value: '1' }, // Sunday - full day
  '2024-01-15': { value: '1' }, // Monday - full day
  '2024-01-16': { value: '0.5', reason: 'Doctor appointment' }, // Tuesday - half day
  '2024-01-17': { value: 'X', reason: 'Sick day' }, // Wednesday - sick
  '2024-01-18': { value: '1' }, // Thursday - full day
};

describe('CalculationService', () => {
  describe('calculateSprintPotential', () => {
    it('should calculate basic sprint potential correctly', () => {
      const input = {
        teamMembers: mockTeamMembers,
        sprintDays: 10,
      };

      const result = CalculationService.calculateSprintPotential(input);

      expect(result.totalPotential).toBe(210); // 3 members × 10 days × 7 hours
      expect(result.teamSize).toBe(3);
      expect(result.sprintDays).toBe(10);
      expect(result.hoursPerDay).toBe(7);
      expect(result.dailyTeamPotential).toBe(21); // 3 members × 7 hours
    });

    it('should handle zero team members', () => {
      const input = {
        teamMembers: [],
        sprintDays: 10,
      };

      const result = CalculationService.calculateSprintPotential(input);

      expect(result.totalPotential).toBe(0);
      expect(result.teamSize).toBe(0);
      expect(result.dailyTeamPotential).toBe(0);
    });

    it('should handle custom hours per day', () => {
      const input = {
        teamMembers: mockTeamMembers,
        sprintDays: 5,
        hoursPerDay: 8,
      };

      const result = CalculationService.calculateSprintPotential(input);

      expect(result.totalPotential).toBe(120); // 3 members × 5 days × 8 hours
      expect(result.hoursPerDay).toBe(8);
      expect(result.dailyTeamPotential).toBe(24); // 3 members × 8 hours
    });

    it('should validate input parameters', () => {
      // Test invalid team members
      expect(() => {
        CalculationService.calculateSprintPotential({
          teamMembers: null as any,
          sprintDays: 10,
        });
      }).toThrow('Team members must be an array');

      // Test invalid sprint days
      expect(() => {
        CalculationService.calculateSprintPotential({
          teamMembers: mockTeamMembers,
          sprintDays: 0,
        });
      }).toThrow('Sprint days must be a positive integer');

      expect(() => {
        CalculationService.calculateSprintPotential({
          teamMembers: mockTeamMembers,
          sprintDays: -5,
        });
      }).toThrow('Sprint days must be a positive integer');

      // Test invalid hours per day
      expect(() => {
        CalculationService.calculateSprintPotential({
          teamMembers: mockTeamMembers,
          sprintDays: 10,
          hoursPerDay: -1,
        });
      }).toThrow('Hours per day must be positive');
    });

    it('should handle single team member', () => {
      const input = {
        teamMembers: [mockTeamMembers[0]],
        sprintDays: 5,
      };

      const result = CalculationService.calculateSprintPotential(input);

      expect(result.totalPotential).toBe(35); // 1 member × 5 days × 7 hours
      expect(result.teamSize).toBe(1);
    });
  });

  describe('calculateAdjustedCapacity', () => {
    it('should apply focus factor correctly', () => {
      const input = {
        potential: 100,
        vacationHours: 0,
        meetingHours: 0,
        focusFactor: 0.8,
      };

      const result = CalculationService.calculateAdjustedCapacity(input);

      expect(result.adjustedCapacity).toBe(80); // 100 × 0.8
      expect(result.focusFactorReduction).toBe(20);
      expect(result.effectiveUtilization).toBe(80);
    });

    it('should subtract vacation and meeting hours', () => {
      const input = {
        potential: 100,
        vacationHours: 8,
        meetingHours: 12,
        focusFactor: 0.8,
      };

      const result = CalculationService.calculateAdjustedCapacity(input);

      expect(result.adjustedCapacity).toBe(60); // (100 × 0.8) - 8 - 12 = 60
      expect(result.vacationReduction).toBe(8);
      expect(result.meetingReduction).toBe(12);
      expect(result.effectiveUtilization).toBe(60);
    });

    it('should handle negative results by returning zero', () => {
      const input = {
        potential: 50,
        vacationHours: 30,
        meetingHours: 30,
        focusFactor: 0.8,
      };

      const result = CalculationService.calculateAdjustedCapacity(input);

      expect(result.adjustedCapacity).toBe(0); // (50 × 0.8) - 30 - 30 = -20, clamped to 0
      expect(result.effectiveUtilization).toBe(0);
    });

    it('should validate percentage inputs', () => {
      // Test negative potential
      expect(() => {
        CalculationService.calculateAdjustedCapacity({
          potential: -10,
          vacationHours: 0,
          meetingHours: 0,
        });
      }).toThrow('Potential hours cannot be negative');

      // Test negative vacation hours
      expect(() => {
        CalculationService.calculateAdjustedCapacity({
          potential: 100,
          vacationHours: -5,
          meetingHours: 0,
        });
      }).toThrow('Vacation and meeting hours cannot be negative');

      // Test invalid focus factor
      expect(() => {
        CalculationService.calculateAdjustedCapacity({
          potential: 100,
          vacationHours: 0,
          meetingHours: 0,
          focusFactor: 1.5,
        });
      }).toThrow('Focus factor must be between 0 and 1');

      expect(() => {
        CalculationService.calculateAdjustedCapacity({
          potential: 100,
          vacationHours: 0,
          meetingHours: 0,
          focusFactor: 0,
        });
      }).toThrow('Focus factor must be between 0 and 1');
    });

    it('should use default focus factor when not provided', () => {
      const input = {
        potential: 100,
        vacationHours: 0,
        meetingHours: 0,
      };

      const result = CalculationService.calculateAdjustedCapacity(input);

      expect(result.focusFactor).toBe(CALCULATION_CONSTANTS.DEFAULT_FOCUS_FACTOR);
      expect(result.adjustedCapacity).toBe(80); // 100 × 0.8
    });
  });

  describe('calculateWeeklyHours', () => {
    const mockWeekStart = new Date('2024-01-14'); // Sunday

    it('should sum hours for a complete week', () => {
      const input = {
        scheduleEntries: mockScheduleEntries,
        weekStartDate: mockWeekStart,
      };

      const result = CalculationService.calculateWeeklyHours(input);

      // Expected: 7 + 7 + 3.5 + 0 + 7 = 24.5 hours
      expect(result.totalHours).toBe(24.5);
      expect(result.workingDays).toBe(5); // 5 days with entries (including X = 0 hours)
      expect(result.averageDaily).toBe(24.5 / 5); // Average across all working days
    });

    it('should handle partial weeks', () => {
      const partialEntries = {
        '2024-01-14': { value: '1' }, // Sunday
        '2024-01-15': { value: '0.5' }, // Monday
      };

      const input = {
        scheduleEntries: partialEntries,
        weekStartDate: mockWeekStart,
      };

      const result = CalculationService.calculateWeeklyHours(input);

      expect(result.totalHours).toBe(10.5); // 7 + 3.5
      expect(result.workingDays).toBe(2);
    });

    it('should handle empty schedule entries', () => {
      const input = {
        scheduleEntries: {},
        weekStartDate: mockWeekStart,
      };

      const result = CalculationService.calculateWeeklyHours(input);

      expect(result.totalHours).toBe(0);
      expect(result.workingDays).toBe(0);
      expect(result.averageDaily).toBe(0);
    });

    it('should handle different week start dates', () => {
      const mondayStart = new Date('2024-01-15'); // Monday
      const input = {
        scheduleEntries: mockScheduleEntries,
        weekStartDate: mondayStart,
      };

      const result = CalculationService.calculateWeeklyHours(input);

      // Should adjust to start from the previous Sunday
      expect(result.totalHours).toBe(24.5);
    });

    it('should validate input parameters', () => {
      expect(() => {
        CalculationService.calculateWeeklyHours({
          scheduleEntries: null as any,
          weekStartDate: mockWeekStart,
        });
      }).toThrow('Schedule entries must be a valid object');

      expect(() => {
        CalculationService.calculateWeeklyHours({
          scheduleEntries: mockScheduleEntries,
          weekStartDate: 'invalid-date' as any,
        });
      }).toThrow('Week start date must be a Date object');
    });
  });

  describe('calculateSprintHours', () => {
    const sprintStart = new Date('2024-01-14'); // Sunday
    const sprintEnd = new Date('2024-01-18'); // Thursday

    it('should sum hours for sprint period', () => {
      const input = {
        scheduleEntries: mockScheduleEntries,
        sprintStartDate: sprintStart,
        sprintEndDate: sprintEnd,
      };

      const result = CalculationService.calculateSprintHours(input);

      expect(result.totalHours).toBe(24.5); // 7 + 7 + 3.5 + 0 + 7
      expect(result.sprintDays).toBe(5); // All 5 working days
      expect(result.averageDaily).toBe(24.5 / 5);
    });

    it('should handle longer sprint periods', () => {
      const longerEnd = new Date('2024-01-25'); // Next Thursday
      const extendedEntries = {
        ...mockScheduleEntries,
        '2024-01-21': { value: '1' }, // Next Sunday
        '2024-01-22': { value: '1' }, // Next Monday
        '2024-01-23': { value: '1' }, // Next Tuesday
        '2024-01-24': { value: '1' }, // Next Wednesday
        '2024-01-25': { value: '1' }, // Next Thursday
      };

      const input = {
        scheduleEntries: extendedEntries,
        sprintStartDate: sprintStart,
        sprintEndDate: longerEnd,
      };

      const result = CalculationService.calculateSprintHours(input);

      expect(result.totalHours).toBe(59.5); // 24.5 + 35 (5 × 7)
      expect(result.sprintDays).toBe(10);
    });

    it('should validate date parameters', () => {
      expect(() => {
        CalculationService.calculateSprintHours({
          scheduleEntries: mockScheduleEntries,
          sprintStartDate: 'invalid' as any,
          sprintEndDate: sprintEnd,
        });
      }).toThrow('Sprint dates must be Date objects');

      expect(() => {
        CalculationService.calculateSprintHours({
          scheduleEntries: mockScheduleEntries,
          sprintStartDate: sprintEnd,
          sprintEndDate: sprintStart,
        });
      }).toThrow('Sprint start date must be before end date');
    });
  });

  describe('calculateTeamUtilization', () => {
    it('should calculate utilization correctly', () => {
      const input = {
        plannedHours: 80,
        availableHours: 100,
      };

      const result = CalculationService.calculateTeamUtilization(input);

      expect(result.utilization).toBe(80);
      expect(result.hoursGap).toBe(20);
      expect(result.status).toBe('optimal');
      expect(result.statusColor).toContain('green');
    });

    it('should handle over-capacity scenarios', () => {
      const input = {
        plannedHours: 120,
        availableHours: 100,
      };

      const result = CalculationService.calculateTeamUtilization(input);

      expect(result.utilization).toBe(120);
      expect(result.hoursGap).toBe(-20);
      expect(result.status).toBe('over');
      expect(result.statusColor).toContain('red');
    });

    it('should handle under-utilization scenarios', () => {
      const input = {
        plannedHours: 60,
        availableHours: 100,
      };

      const result = CalculationService.calculateTeamUtilization(input);

      expect(result.utilization).toBe(60);
      expect(result.status).toBe('under');
      expect(result.statusColor).toContain('yellow');
    });

    it('should handle zero available hours', () => {
      const input = {
        plannedHours: 50,
        availableHours: 0,
      };

      const result = CalculationService.calculateTeamUtilization(input);

      expect(result.utilization).toBe(0);
      expect(result.status).toBe('under');
    });

    it('should validate input parameters', () => {
      expect(() => {
        CalculationService.calculateTeamUtilization({
          plannedHours: -10,
          availableHours: 100,
        });
      }).toThrow('Planned and available hours cannot be negative');

      expect(() => {
        CalculationService.calculateTeamUtilization({
          plannedHours: 80,
          availableHours: -50,
        });
      }).toThrow('Planned and available hours cannot be negative');
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should calculate completion percentage correctly', () => {
      const input = {
        completedHours: 75,
        plannedHours: 100,
      };

      const result = CalculationService.calculateCompletionPercentage(input);

      expect(result.completionPercentage).toBe(75);
      expect(result.remainingHours).toBe(25);
      expect(result.isOnTrack).toBe(false); // < 80%
    });

    it('should handle completion above 100%', () => {
      const input = {
        completedHours: 120,
        plannedHours: 100,
      };

      const result = CalculationService.calculateCompletionPercentage(input);

      expect(result.completionPercentage).toBe(120);
      expect(result.remainingHours).toBe(0);
      expect(result.isOnTrack).toBe(true);
    });

    it('should handle zero planned hours', () => {
      const input = {
        completedHours: 50,
        plannedHours: 0,
      };

      const result = CalculationService.calculateCompletionPercentage(input);

      expect(result.completionPercentage).toBe(0);
      expect(result.remainingHours).toBe(0);
    });

    it('should validate input parameters', () => {
      expect(() => {
        CalculationService.calculateCompletionPercentage({
          completedHours: -10,
          plannedHours: 100,
        });
      }).toThrow('Completed and planned hours cannot be negative');
    });
  });

  describe('Integration Tests', () => {
    it('should produce consistent results across all calculation methods', () => {
      // Test a realistic scenario with all calculations
      const teamPotential = CalculationService.calculateSprintPotential({
        teamMembers: mockTeamMembers,
        sprintDays: 10,
      });

      const adjustedCapacity = CalculationService.calculateAdjustedCapacity({
        potential: teamPotential.totalPotential,
        vacationHours: 14,
        meetingHours: 28,
        focusFactor: 0.8,
      });

      const teamUtilization = CalculationService.calculateTeamUtilization({
        plannedHours: 150,
        availableHours: adjustedCapacity.adjustedCapacity,
      });

      // Verify the chain of calculations makes sense
      expect(teamPotential.totalPotential).toBe(210);
      expect(adjustedCapacity.adjustedCapacity).toBe(126); // (210 × 0.8) - 14 - 28
      expect(teamUtilization.utilization).toBe(119.05); // 150/126 × 100, over capacity
      expect(teamUtilization.status).toBe('over');
    });

    it('should handle real-world data scenarios', () => {
      // Simulate a realistic team scenario
      const realWorldEntries: { [dateKey: string]: ScheduleEntry } = {
        '2024-01-07': { value: '1' },
        '2024-01-08': { value: '1' },
        '2024-01-09': { value: '0.5', reason: 'Dentist appointment' },
        '2024-01-10': { value: '1' },
        '2024-01-11': { value: 'X', reason: 'Sick leave' },
      };

      const weeklyHours = CalculationService.calculateWeeklyHours({
        scheduleEntries: realWorldEntries,
        weekStartDate: new Date('2024-01-07'),
      });

      const completion = CalculationService.calculateCompletionPercentage({
        completedHours: weeklyHours.totalHours,
        plannedHours: 35, // Expected full week
      });

      expect(weeklyHours.totalHours).toBe(24.5); // 7 + 7 + 3.5 + 7 + 0
      expect(completion.completionPercentage).toBe(70); // 24.5/35 × 100
      expect(completion.isOnTrack).toBe(false);
    });

    it('should maintain precision with decimal hours', () => {
      const input = {
        teamMembers: [mockTeamMembers[0]],
        sprintDays: 3,
        hoursPerDay: 7.5,
      };

      const result = CalculationService.calculateSprintPotential(input);

      expect(result.totalPotential).toBe(22.5); // 1 × 3 × 7.5
      expect(result.hoursPerDay).toBe(7.5);
    });
  });
});

describe('Utility Functions', () => {
  describe('calculateWorkingDaysBetween', () => {
    it('should calculate working days correctly', () => {
      const start = new Date('2024-01-14'); // Sunday
      const end = new Date('2024-01-18'); // Thursday

      const workingDays = calculateWorkingDaysBetween(start, end);

      expect(workingDays).toBe(5); // Sun, Mon, Tue, Wed, Thu
    });

    it('should handle same day', () => {
      const date = new Date('2024-01-15'); // Monday

      const workingDays = calculateWorkingDaysBetween(date, date);

      expect(workingDays).toBe(1);
    });

    it('should handle weekends', () => {
      const start = new Date('2024-01-19'); // Friday
      const end = new Date('2024-01-20'); // Saturday

      const workingDays = calculateWorkingDaysBetween(start, end);

      expect(workingDays).toBe(0); // No working days
    });

    it('should validate date order', () => {
      const start = new Date('2024-01-18');
      const end = new Date('2024-01-14');

      expect(() => {
        calculateWorkingDaysBetween(start, end);
      }).toThrow('Start date must be before or equal to end date');
    });
  });

  describe('formatHours', () => {
    it('should format hours correctly', () => {
      expect(formatHours(24.7)).toBe('25h');
      expect(formatHours(0)).toBe('0h');
      expect(formatHours(100.4)).toBe('100h');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(85.67)).toBe('85.67%');
      expect(formatPercentage(100)).toBe('100%');
      expect(formatPercentage(0)).toBe('0%');
    });
  });

  describe('getUtilizationStatusColor', () => {
    it('should return correct colors for different utilizations', () => {
      expect(getUtilizationStatusColor(120)).toContain('red');
      expect(getUtilizationStatusColor(95)).toContain('green'); // >= 95% is green
      expect(getUtilizationStatusColor(90)).toContain('yellow'); // 80-94% is yellow
      expect(getUtilizationStatusColor(70)).toContain('gray'); // < 80% is gray
    });
  });
});

describe('Constants', () => {
  it('should have correct default values', () => {
    expect(CALCULATION_CONSTANTS.HOURS_PER_DAY).toBe(7);
    expect(CALCULATION_CONSTANTS.WORK_DAYS_PER_WEEK).toBe(5);
    expect(CALCULATION_CONSTANTS.DEFAULT_FOCUS_FACTOR).toBe(0.8);
    expect(CALCULATION_CONSTANTS.WORKING_DAYS).toEqual([0, 1, 2, 3, 4]);
    expect(CALCULATION_CONSTANTS.OPTIMAL_UTILIZATION_MIN).toBe(80);
    expect(CALCULATION_CONSTANTS.OPTIMAL_UTILIZATION_MAX).toBe(95);
  });
});