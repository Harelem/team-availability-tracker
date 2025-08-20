/**
 * Sprint Logic Test Suite
 * Comprehensive tests for the sprint-based availability system
 */

import { SprintLogic, SprintProgressUtils } from '@/utils/sprintLogic';

describe('SprintLogic', () => {
  describe('getWorkingDays', () => {
    test('should correctly identify working days (Sunday-Thursday)', () => {
      // Test a full week starting on Sunday
      const startDate = new Date('2024-01-07'); // Sunday
      const endDate = new Date('2024-01-13'); // Saturday
      
      const workingDays = SprintLogic.getWorkingDays(startDate, endDate);
      
      expect(workingDays).toHaveLength(7);
      
      // Check Sunday through Thursday are working days
      const workingDaysOnly = workingDays.filter(day => day.isWorkingDay);
      expect(workingDaysOnly).toHaveLength(5);
      
      // Check Friday and Saturday are weekends
      const weekendDays = workingDays.filter(day => day.isWeekend);
      expect(weekendDays).toHaveLength(2);
      
      // Verify specific days
      expect(workingDays[0].dayOfWeek).toBe(0); // Sunday
      expect(workingDays[0].isWorkingDay).toBe(true);
      expect(workingDays[5].dayOfWeek).toBe(5); // Friday
      expect(workingDays[5].isWeekend).toBe(true);
      expect(workingDays[6].dayOfWeek).toBe(6); // Saturday
      expect(workingDays[6].isWeekend).toBe(true);
    });

    test('should handle partial weeks correctly', () => {
      // Test mid-week start
      const startDate = new Date('2024-01-09'); // Tuesday
      const endDate = new Date('2024-01-11'); // Thursday
      
      const workingDays = SprintLogic.getWorkingDays(startDate, endDate);
      
      expect(workingDays).toHaveLength(3);
      expect(workingDays.every(day => day.isWorkingDay)).toBe(true);
    });

    test('should handle weekend-only periods', () => {
      const startDate = new Date('2024-01-12'); // Friday
      const endDate = new Date('2024-01-13'); // Saturday
      
      const workingDays = SprintLogic.getWorkingDays(startDate, endDate);
      
      expect(workingDays).toHaveLength(2);
      expect(workingDays.every(day => day.isWeekend)).toBe(true);
    });
  });

  describe('calculateSprintCapacity', () => {
    test('should calculate correct capacity for different sprint lengths', () => {
      // 1 week sprint (5 working days)
      const oneWeekCapacity = SprintLogic.calculateSprintCapacity(5);
      expect(oneWeekCapacity.workingDays).toBe(5);
      expect(oneWeekCapacity.maxHours).toBe(35); // 5 * 7
      expect(oneWeekCapacity.managerMaxHours).toBe(17.5); // 5 * 3.5

      // 2 week sprint (10 working days)
      const twoWeekCapacity = SprintLogic.calculateSprintCapacity(10);
      expect(twoWeekCapacity.workingDays).toBe(10);
      expect(twoWeekCapacity.maxHours).toBe(70); // 10 * 7
      expect(twoWeekCapacity.managerMaxHours).toBe(35); // 10 * 3.5
    });

    test('should handle edge cases', () => {
      // Zero working days
      const zeroCapacity = SprintLogic.calculateSprintCapacity(0);
      expect(zeroCapacity.maxHours).toBe(0);
      expect(zeroCapacity.managerMaxHours).toBe(0);

      // Large sprint
      const largeCapacity = SprintLogic.calculateSprintCapacity(20);
      expect(largeCapacity.maxHours).toBe(140);
      expect(largeCapacity.managerMaxHours).toBe(70);
    });
  });

  describe('calculateSprintEndDate', () => {
    test('should calculate correct end date for working days', () => {
      // Start on Sunday, 1 week (5 working days) should end on Thursday
      const startDate = new Date('2024-01-07'); // Sunday
      const endDate = SprintLogic.calculateSprintEndDate(startDate, 1);
      
      expect(endDate.getDay()).toBe(4); // Thursday
      expect(endDate.getDate()).toBe(11); // January 11
    });

    test('should handle multi-week sprints', () => {
      // Start on Sunday, 2 weeks (10 working days) should end second Thursday
      const startDate = new Date('2024-01-07'); // Sunday
      const endDate = SprintLogic.calculateSprintEndDate(startDate, 2);
      
      expect(endDate.getDay()).toBe(4); // Thursday
      expect(endDate.getDate()).toBe(18); // January 18
    });

    test('should handle start dates that are not Sunday', () => {
      // Start on Wednesday, 1 week should include next Monday-Tuesday
      const startDate = new Date('2024-01-10'); // Wednesday
      const endDate = SprintLogic.calculateSprintEndDate(startDate, 1);
      
      // Should end 5 working days later (Wed, Thu, Sun, Mon, Tue)
      expect(endDate.getDate()).toBe(16); // January 16 (Tuesday)
    });
  });

  describe('validateSprintConfig', () => {
    test('should validate correct sprint configurations', () => {
      const startDate = new Date('2024-01-07');
      const endDate = new Date('2024-01-18');
      
      const validation = SprintLogic.validateSprintConfig(startDate, endDate, 2);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should catch invalid date ranges', () => {
      const startDate = new Date('2024-01-18');
      const endDate = new Date('2024-01-07'); // End before start
      
      const validation = SprintLogic.validateSprintConfig(startDate, endDate, 2);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Start date must be before end date');
    });

    test('should catch invalid sprint lengths', () => {
      const startDate = new Date('2024-01-07');
      const endDate = new Date('2024-01-18');
      
      const validation = SprintLogic.validateSprintConfig(startDate, endDate, 5); // Too long
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Sprint length must be between 1 and 4 weeks');
    });
  });

  describe('autoGenerateWeekendEntries', () => {
    test('should generate weekend entries correctly', () => {
      const memberId = 1;
      const sprintDays = SprintLogic.getWorkingDays(
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-13')  // Saturday
      );
      
      const weekendEntries = SprintLogic.autoGenerateWeekendEntries(memberId, sprintDays);
      
      expect(weekendEntries).toHaveLength(2); // Friday and Saturday
      expect(weekendEntries.every(entry => entry.value === 'X')).toBe(true);
      expect(weekendEntries.every(entry => entry.reason === 'Weekend (auto-generated)')).toBe(true);
      expect(weekendEntries.every(entry => entry.member_id === memberId)).toBe(true);
    });

    test('should not generate entries for working days', () => {
      const memberId = 1;
      const sprintDays = SprintLogic.getWorkingDays(
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-11')  // Thursday (no weekends)
      );
      
      const weekendEntries = SprintLogic.autoGenerateWeekendEntries(memberId, sprintDays);
      
      expect(weekendEntries).toHaveLength(0);
    });
  });

  describe('getManagerWorkOptions', () => {
    test('should return only 0.5 and X options for managers', () => {
      const managerOptions = SprintLogic.getManagerWorkOptions();
      
      expect(managerOptions).toHaveLength(2);
      expect(managerOptions.map(opt => opt.value)).toEqual(['0.5', 'X']);
      expect(managerOptions.find(opt => opt.value === '0.5')?.hours).toBe(3.5);
      expect(managerOptions.find(opt => opt.value === 'X')?.hours).toBe(0);
    });
  });

  describe('getRegularMemberWorkOptions', () => {
    test('should return all work options for regular members', () => {
      const regularOptions = SprintLogic.getRegularMemberWorkOptions();
      
      expect(regularOptions).toHaveLength(3);
      expect(regularOptions.map(opt => opt.value)).toEqual(['1', '0.5', 'X']);
      expect(regularOptions.find(opt => opt.value === '1')?.hours).toBe(7);
      expect(regularOptions.find(opt => opt.value === '0.5')?.hours).toBe(3.5);
      expect(regularOptions.find(opt => opt.value === 'X')?.hours).toBe(0);
    });
  });

  describe('calculateMemberSprintSummary', () => {
    const mockMember = {
      id: 1,
      name: 'Test User',
      hebrew: 'משתמש בדיקה',
      isManager: false,
      is_manager: false,
      team_id: 1
    };

    const mockManagerMember = {
      ...mockMember,
      id: 2,
      name: 'Test Manager',
      isManager: true,
      is_manager: true
    };

    test('should calculate correct summary for regular member', () => {
      const sprintDays = SprintLogic.getWorkingDays(
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-13')  // Saturday
      );

      const scheduleData = {
        '2024-01-07': { value: '1', calculated_hours: 7 }, // Sunday - full day
        '2024-01-08': { value: '0.5', calculated_hours: 3.5 }, // Monday - half day
        '2024-01-09': { value: 'X', calculated_hours: 0 }, // Tuesday - absent
        // Wednesday and Thursday missing
        '2024-01-12': { value: 'X', calculated_hours: 0 }, // Friday - weekend
        '2024-01-13': { value: 'X', calculated_hours: 0 }  // Saturday - weekend
      };

      const summary = SprintLogic.calculateMemberSprintSummary(mockMember, sprintDays, scheduleData);

      expect(summary.memberId).toBe(1);
      expect(summary.isManager).toBe(false);
      expect(summary.maxPossibleHours).toBe(35); // 5 working days * 7 hours
      expect(summary.actualHours).toBe(10.5); // 7 + 3.5 + 0
      expect(summary.workingDaysFilled).toBe(3); // Sun, Mon, Tue filled
      expect(summary.totalWorkingDays).toBe(5);
      expect(summary.missingDays).toBe(2); // Wed, Thu missing
      expect(summary.weekendDaysAutoFilled).toBe(2); // Fri, Sat
    });

    test('should calculate correct summary for manager', () => {
      const sprintDays = SprintLogic.getWorkingDays(
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-11')  // Thursday (1 week)
      );

      const scheduleData = {
        '2024-01-07': { value: '0.5', calculated_hours: 3.5 },
        '2024-01-08': { value: '0.5', calculated_hours: 3.5 },
        '2024-01-09': { value: 'X', calculated_hours: 0 },
        '2024-01-10': { value: '0.5', calculated_hours: 3.5 },
        '2024-01-11': { value: '0.5', calculated_hours: 3.5 }
      };

      const summary = SprintLogic.calculateMemberSprintSummary(mockManagerMember, sprintDays, scheduleData);

      expect(summary.isManager).toBe(true);
      expect(summary.maxPossibleHours).toBe(17.5); // 5 working days * 3.5 hours
      expect(summary.actualHours).toBe(14); // 3.5 * 4 days
      expect(summary.utilizationPercentage).toBe(80); // 14/17.5 * 100
    });
  });

  describe('isValidWorkOption', () => {
    test('should validate manager work options', () => {
      expect(SprintLogic.isValidWorkOption('0.5', true)).toBe(true);
      expect(SprintLogic.isValidWorkOption('X', true)).toBe(true);
      expect(SprintLogic.isValidWorkOption('1', true)).toBe(false); // Managers can't do full days
    });

    test('should validate regular member work options', () => {
      expect(SprintLogic.isValidWorkOption('1', false)).toBe(true);
      expect(SprintLogic.isValidWorkOption('0.5', false)).toBe(true);
      expect(SprintLogic.isValidWorkOption('X', false)).toBe(true);
    });
  });

  describe('groupSprintDaysByWeek', () => {
    test('should group sprint days by week correctly', () => {
      const sprintDays = SprintLogic.getWorkingDays(
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-20')  // Saturday (2 weeks)
      );

      const weeks = SprintLogic.groupSprintDaysByWeek(sprintDays);

      expect(weeks).toHaveLength(2);
      expect(weeks[0][0].dayOfWeek).toBe(0); // First week starts on Sunday
      expect(weeks[1][0].dayOfWeek).toBe(0); // Second week starts on Sunday
    });

    test('should handle partial weeks', () => {
      const sprintDays = SprintLogic.getWorkingDays(
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-15')  // Monday next week
      );

      const weeks = SprintLogic.groupSprintDaysByWeek(sprintDays);

      expect(weeks).toHaveLength(2);
      expect(weeks[0][0].dayOfWeek).toBe(2); // First partial week starts on Tuesday
      expect(weeks[1][0].dayOfWeek).toBe(0); // Second week starts on Sunday
    });
  });

  describe('utility methods', () => {
    test('isDateToday should work correctly', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(SprintLogic.isDateToday(today)).toBe(true);
      expect(SprintLogic.isDateToday(tomorrow)).toBe(false);
    });

    test('isDatePast should work correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(SprintLogic.isDatePast(yesterday)).toBe(true);
      expect(SprintLogic.isDatePast(tomorrow)).toBe(false);
    });

    test('formatDateKey should return ISO date string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(SprintLogic.formatDateKey(date)).toBe('2024-01-15');
    });

    test('formatDateRange should format ranges correctly', () => {
      const start = new Date('2024-01-07');
      const end = new Date('2024-01-13');
      
      const formatted = SprintLogic.formatDateRange(start, end);
      expect(formatted).toContain('January');
      expect(formatted).toContain('2024');
    });
  });
});

describe('SprintProgressUtils', () => {
  describe('calculateSprintProgress', () => {
    test('should calculate progress correctly for active sprint', () => {
      const mockSprint = {
        start_date: '2024-01-01',
        end_date: '2024-01-14', // 2 weeks
        completion_percentage: 60
      };

      // Mock current date to be 7 days into sprint
      const originalDate = Date;
      global.Date = jest.fn(() => new Date('2024-01-08')) as any;
      global.Date.prototype = originalDate.prototype;

      const progress = SprintProgressUtils.calculateSprintProgress(mockSprint);

      expect(progress.daysElapsed).toBe(7);
      expect(progress.daysRemaining).toBe(6);
      expect(progress.timeProgress).toBe(50); // 7/14 * 100
      expect(progress.workProgress).toBe(60);
      expect(progress.isOnTrack).toBe(true); // 60% >= 50% * 0.8

      // Restore original Date
      global.Date = originalDate;
    });

    test('should handle sprint that is behind schedule', () => {
      const mockSprint = {
        start_date: '2024-01-01',
        end_date: '2024-01-14',
        completion_percentage: 20 // Low completion
      };

      global.Date = jest.fn(() => new Date('2024-01-08')) as any;

      const progress = SprintProgressUtils.calculateSprintProgress(mockSprint);

      expect(progress.isOnTrack).toBe(false); // 20% < 50% * 0.8
    });

    test('should handle completed sprint', () => {
      const mockSprint = {
        start_date: '2024-01-01',
        end_date: '2024-01-14',
        completion_percentage: 100
      };

      global.Date = jest.fn(() => new Date('2024-01-20')) as any; // After end date

      const progress = SprintProgressUtils.calculateSprintProgress(mockSprint);

      expect(progress.timeProgress).toBe(100);
      expect(progress.daysRemaining).toBe(0);
    });
  });
});

// Integration tests for the complete sprint workflow
describe('Sprint Integration Tests', () => {
  test('complete sprint creation and validation workflow', () => {
    // 1. Create sprint configuration
    const startDate = new Date('2024-01-07'); // Sunday
    const lengthWeeks = 2;
    const endDate = SprintLogic.calculateSprintEndDate(startDate, lengthWeeks);

    // 2. Validate configuration
    const validation = SprintLogic.validateSprintConfig(startDate, endDate, lengthWeeks);
    expect(validation.isValid).toBe(true);

    // 3. Generate working days
    const sprintDays = SprintLogic.getWorkingDays(startDate, endDate);
    const workingDays = sprintDays.filter(day => day.isWorkingDay);
    expect(workingDays).toHaveLength(10); // 2 weeks * 5 days

    // 4. Calculate capacity
    const capacity = SprintLogic.calculateSprintCapacity(workingDays.length);
    expect(capacity.maxHours).toBe(70);
    expect(capacity.managerMaxHours).toBe(35);

    // 5. Generate weekend entries
    const weekendEntries = SprintLogic.autoGenerateWeekendEntries(1, sprintDays);
    expect(weekendEntries).toHaveLength(4); // 2 weekends * 2 days
  });

  test('manager vs regular member workflow differences', () => {
    const sprintDays = SprintLogic.getWorkingDays(
      new Date('2024-01-07'),
      new Date('2024-01-11') // 1 week
    );

    const regularMember = { id: 1, name: 'Regular', isManager: false, hebrew: '', team_id: 1 };
    const manager = { id: 2, name: 'Manager', isManager: true, hebrew: '', team_id: 1 };

    // Regular member can use all options
    const regularOptions = SprintLogic.getRegularMemberWorkOptions();
    expect(regularOptions).toHaveLength(3);

    // Manager has limited options
    const managerOptions = SprintLogic.getManagerWorkOptions();
    expect(managerOptions).toHaveLength(2);

    // Validate work options
    expect(SprintLogic.isValidWorkOption('1', false)).toBe(true);
    expect(SprintLogic.isValidWorkOption('1', true)).toBe(false);

    // Calculate different capacities
    const regularSummary = SprintLogic.calculateMemberSprintSummary(regularMember, sprintDays, {});
    const managerSummary = SprintLogic.calculateMemberSprintSummary(manager, sprintDays, {});

    expect(regularSummary.maxPossibleHours).toBe(35); // 5 * 7
    expect(managerSummary.maxPossibleHours).toBe(17.5); // 5 * 3.5
  });
});
