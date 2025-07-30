import { 
  convertPatternToScheduleFormat, 
  extractPatternFromSchedule 
} from '../../src/hooks/useAvailabilityTemplates';
import { WeeklyPattern } from '../../src/types/templateTypes';

describe('useAvailabilityTemplates utility functions', () => {
  describe('convertPatternToScheduleFormat', () => {
    it('should convert Israeli work week pattern to schedule format', () => {
      const pattern: WeeklyPattern = {
        sun: 1,   // Full day Sunday
        mon: 1,   // Full day Monday
        tue: 0.5, // Half day Tuesday
        wed: 1,   // Full day Wednesday
        thu: 1,   // Full day Thursday
        fri: 0,   // Weekend Friday
        sat: 0,   // Weekend Saturday
        reason: 'Medical appointments on Tuesday afternoons'
      };

      // Create week starting from Sunday (Israeli work week)
      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-10'), // Wednesday
        new Date('2024-01-11'), // Thursday
      ];

      const result = convertPatternToScheduleFormat(pattern, 1, weekDays);

      expect(result['2024-01-07']).toEqual({ value: '1', reason: 'Medical appointments on Tuesday afternoons' });
      expect(result['2024-01-08']).toEqual({ value: '1', reason: 'Medical appointments on Tuesday afternoons' });
      expect(result['2024-01-09']).toEqual({ value: '0.5', reason: 'Medical appointments on Tuesday afternoons' });
      expect(result['2024-01-10']).toEqual({ value: '1', reason: 'Medical appointments on Tuesday afternoons' });
      expect(result['2024-01-11']).toEqual({ value: '1', reason: 'Medical appointments on Tuesday afternoons' });
    });

    it('should handle pattern with off days correctly', () => {
      const pattern: WeeklyPattern = {
        sun: 1, mon: 0, tue: 1, wed: 0, thu: 1, fri: 0, sat: 0
      };

      const weekDays = [
        new Date('2024-01-07'), // Sunday - work
        new Date('2024-01-08'), // Monday - off
        new Date('2024-01-09'), // Tuesday - work
        new Date('2024-01-10'), // Wednesday - off
        new Date('2024-01-11'), // Thursday - work
      ];

      const result = convertPatternToScheduleFormat(pattern, 1, weekDays);

      expect(result['2024-01-07']).toEqual({ value: '1' });
      expect(result['2024-01-08']).toBeUndefined(); // Off days are not included
      expect(result['2024-01-09']).toEqual({ value: '1' });
      expect(result['2024-01-10']).toBeUndefined(); // Off days are not included
      expect(result['2024-01-11']).toEqual({ value: '1' });
    });

    it('should handle empty pattern (all off)', () => {
      const pattern: WeeklyPattern = {
        sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0
      };

      const weekDays = [
        new Date('2024-01-07'),
        new Date('2024-01-08'),
        new Date('2024-01-09'),
        new Date('2024-01-10'),
        new Date('2024-01-11'),
      ];

      const result = convertPatternToScheduleFormat(pattern, 1, weekDays);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle pattern without reason', () => {
      const pattern: WeeklyPattern = {
        sun: 1, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0
      };

      const weekDays = [new Date('2024-01-07')]; // Just Sunday

      const result = convertPatternToScheduleFormat(pattern, 1, weekDays);

      expect(result['2024-01-07']).toEqual({ value: '1' });
    });
  });

  describe('extractPatternFromSchedule', () => {
    it('should extract pattern from Israeli work week schedule', () => {
      const scheduleData = {
        '2024-01-07': { value: '1' as const }, // Sunday
        '2024-01-08': { value: '1' as const }, // Monday
        '2024-01-09': { value: '0.5' as const, reason: 'Medical appointment' }, // Tuesday
        '2024-01-10': { value: '1' as const }, // Wednesday
        '2024-01-11': { value: '1' as const }, // Thursday
        // Friday and Saturday not in schedule (weekend)
      };

      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-10'), // Wednesday
        new Date('2024-01-11'), // Thursday
        new Date('2024-01-12'), // Friday
        new Date('2024-01-13'), // Saturday
      ];

      const result = extractPatternFromSchedule(scheduleData, weekDays);

      expect(result).toEqual({
        sun: 1,
        mon: 1,
        tue: 0.5,
        wed: 1,
        thu: 1,
        fri: 0,
        sat: 0,
        reason: 'Medical appointment' // First reason found
      });
    });

    it('should handle sick days (X values) as off days', () => {
      const scheduleData = {
        '2024-01-07': { value: '1' as const },
        '2024-01-08': { value: 'X' as const, reason: 'Sick day' },
        '2024-01-09': { value: '1' as const },
      };

      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-10'), // Wednesday
        new Date('2024-01-11'), // Thursday
        new Date('2024-01-12'), // Friday
        new Date('2024-01-13'), // Saturday
      ];

      const result = extractPatternFromSchedule(scheduleData, weekDays);

      expect(result.sun).toBe(1);
      expect(result.mon).toBe(0); // Sick day treated as off
      expect(result.tue).toBe(1);
      expect(result.wed).toBe(0); // No entry
      expect(result.thu).toBe(0); // No entry
      expect(result.reason).toBe('Sick day');
    });

    it('should handle empty schedule data', () => {
      const weekDays = [
        new Date('2024-01-07'),
        new Date('2024-01-08'),
        new Date('2024-01-09'),
        new Date('2024-01-10'),
        new Date('2024-01-11'),
        new Date('2024-01-12'),
        new Date('2024-01-13'),
      ];

      const result = extractPatternFromSchedule({}, weekDays);

      expect(result).toEqual({
        sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0
      });
    });

    it('should handle partial schedule data', () => {
      const scheduleData = {
        '2024-01-07': { value: '1' as const },
        '2024-01-09': { value: '0.5' as const },
        // Missing Monday, Wednesday, Thursday
      };

      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-10'), // Wednesday
        new Date('2024-01-11'), // Thursday
        new Date('2024-01-12'), // Friday
        new Date('2024-01-13'), // Saturday
      ];

      const result = extractPatternFromSchedule(scheduleData, weekDays);

      expect(result.sun).toBe(1);
      expect(result.mon).toBe(0); // Missing entry
      expect(result.tue).toBe(0.5);
      expect(result.wed).toBe(0); // Missing entry
      expect(result.thu).toBe(0); // Missing entry
      expect(result.fri).toBe(0);
      expect(result.sat).toBe(0);
    });
  });

  describe('pattern conversion round-trip', () => {
    it('should maintain data integrity through convert -> extract cycle', () => {
      const originalPattern: WeeklyPattern = {
        sun: 1,
        mon: 0.5,
        tue: 1,
        wed: 0,
        thu: 1,
        fri: 0,
        sat: 0,
        reason: 'Flexible work arrangement'
      };

      const weekDays = [
        new Date('2024-01-07'), // Sunday
        new Date('2024-01-08'), // Monday
        new Date('2024-01-09'), // Tuesday
        new Date('2024-01-10'), // Wednesday
        new Date('2024-01-11'), // Thursday
        new Date('2024-01-12'), // Friday
        new Date('2024-01-13'), // Saturday
      ];

      // Convert pattern to schedule format
      const scheduleData = convertPatternToScheduleFormat(originalPattern, 1, weekDays);

      // Extract pattern back from schedule data
      const extractedPattern = extractPatternFromSchedule(scheduleData, weekDays);

      // Should match original pattern (except off days don't preserve reasons)
      expect(extractedPattern.sun).toBe(originalPattern.sun);
      expect(extractedPattern.mon).toBe(originalPattern.mon);
      expect(extractedPattern.tue).toBe(originalPattern.tue);
      expect(extractedPattern.wed).toBe(originalPattern.wed);
      expect(extractedPattern.thu).toBe(originalPattern.thu);
      expect(extractedPattern.fri).toBe(originalPattern.fri);
      expect(extractedPattern.sat).toBe(originalPattern.sat);
      expect(extractedPattern.reason).toBe(originalPattern.reason);
    });
  });
});