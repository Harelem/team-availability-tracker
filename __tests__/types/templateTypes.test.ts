import { 
  isValidWorkValue, 
  isValidWeeklyPattern, 
  isAvailabilityTemplate,
  WeeklyPattern,
  AvailabilityTemplate,
  DAY_LABELS,
  ISRAELI_WORK_WEEK
} from '../../src/types/templateTypes';

describe('templateTypes', () => {
  describe('ISRAELI_WORK_WEEK constants', () => {
    it('should define correct working days (Sunday-Thursday)', () => {
      expect(ISRAELI_WORK_WEEK.WORKING_DAYS).toEqual(['sun', 'mon', 'tue', 'wed', 'thu']);
    });

    it('should define correct weekend days (Friday-Saturday)', () => {
      expect(ISRAELI_WORK_WEEK.WEEKEND_DAYS).toEqual(['fri', 'sat']);
    });

    it('should define correct working hours per day', () => {
      expect(ISRAELI_WORK_WEEK.HOURS_PER_WORKING_DAY).toBe(7);
    });

    it('should define correct working days per week', () => {
      expect(ISRAELI_WORK_WEEK.WORKING_DAYS_PER_WEEK).toBe(5);
    });
  });

  describe('DAY_LABELS', () => {
    it('should include Hebrew translations for all days', () => {
      expect(DAY_LABELS.sun.hebrew).toBe('ראשון');
      expect(DAY_LABELS.mon.hebrew).toBe('שני');
      expect(DAY_LABELS.tue.hebrew).toBe('שלישי');
      expect(DAY_LABELS.wed.hebrew).toBe('רביעי');
      expect(DAY_LABELS.thu.hebrew).toBe('חמישי');
      expect(DAY_LABELS.fri.hebrew).toBe('שישי');
      expect(DAY_LABELS.sat.hebrew).toBe('שבת');
    });

    it('should have correct day abbreviations for Israeli work week', () => {
      expect(DAY_LABELS.sun.abbr).toBe('S');
      expect(DAY_LABELS.mon.abbr).toBe('M');
      expect(DAY_LABELS.tue.abbr).toBe('T');
      expect(DAY_LABELS.wed.abbr).toBe('W');
      expect(DAY_LABELS.thu.abbr).toBe('R'); // Updated to avoid confusion with Tuesday
      expect(DAY_LABELS.fri.abbr).toBe('F');
      expect(DAY_LABELS.sat.abbr).toBe('S');
    });
  });

  describe('isValidWorkValue', () => {
    it('should accept valid work values', () => {
      expect(isValidWorkValue(0)).toBe(true);
      expect(isValidWorkValue(0.5)).toBe(true);
      expect(isValidWorkValue(1)).toBe(true);
    });

    it('should reject invalid work values', () => {
      expect(isValidWorkValue(0.25)).toBe(false);
      expect(isValidWorkValue(2)).toBe(false);
      expect(isValidWorkValue(-1)).toBe(false);
      expect(isValidWorkValue('1')).toBe(false);
      expect(isValidWorkValue(null)).toBe(false);
      expect(isValidWorkValue(undefined)).toBe(false);
    });
  });

  describe('isValidWeeklyPattern', () => {
    it('should accept valid weekly pattern with Sunday-first order', () => {
      const validPattern = {
        sun: 1,
        mon: 1,
        tue: 1,
        wed: 1,
        thu: 1,
        fri: 0,
        sat: 0
      };
      expect(isValidWeeklyPattern(validPattern)).toBe(true);
    });

    it('should accept pattern with mixed work values', () => {
      const mixedPattern = {
        sun: 0.5,
        mon: 1,
        tue: 1,
        wed: 0,
        thu: 1,
        fri: 0,
        sat: 0
      };
      expect(isValidWeeklyPattern(mixedPattern)).toBe(true);
    });

    it('should accept pattern with optional reason', () => {
      const patternWithReason = {
        sun: 1,
        mon: 1,
        tue: 1,
        wed: 1,
        thu: 1,
        fri: 0,
        sat: 0,
        reason: 'Medical appointments on Wednesday afternoons'
      };
      expect(isValidWeeklyPattern(patternWithReason)).toBe(true);
    });

    it('should reject invalid patterns', () => {
      expect(isValidWeeklyPattern(null)).toBe(false);
      expect(isValidWeeklyPattern(undefined)).toBe(false);
      expect(isValidWeeklyPattern({})).toBe(false);
      expect(isValidWeeklyPattern({ sun: 1 })).toBe(false); // Missing days
      expect(isValidWeeklyPattern({ 
        sun: 2, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0 
      })).toBe(false); // Invalid work value
    });
  });

  describe('isAvailabilityTemplate', () => {
    const validTemplate: AvailabilityTemplate = {
      id: 'template-123',
      name: 'Full Week Template',
      description: 'Standard work week',
      pattern: {
        sun: 1, mon: 1, tue: 1, wed: 1, thu: 1, fri: 0, sat: 0
      },
      isPublic: true,
      createdBy: 1,
      teamId: 5,
      usageCount: 10,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    it('should accept valid template', () => {
      expect(isAvailabilityTemplate(validTemplate)).toBe(true);
    });

    it('should accept template without optional fields', () => {
      const minimalTemplate = {
        ...validTemplate,
        description: undefined,
        teamId: undefined
      };
      expect(isAvailabilityTemplate(minimalTemplate)).toBe(true);
    });

    it('should reject invalid templates', () => {
      expect(isAvailabilityTemplate(null)).toBe(false);
      expect(isAvailabilityTemplate({})).toBe(false);
      
      // Missing required fields
      expect(isAvailabilityTemplate({ ...validTemplate, id: undefined })).toBe(false);
      expect(isAvailabilityTemplate({ ...validTemplate, name: undefined })).toBe(false);
      expect(isAvailabilityTemplate({ ...validTemplate, pattern: undefined })).toBe(false);
      
      // Invalid field types
      expect(isAvailabilityTemplate({ ...validTemplate, isPublic: 'true' })).toBe(false);
      expect(isAvailabilityTemplate({ ...validTemplate, createdBy: '1' })).toBe(false);
      expect(isAvailabilityTemplate({ ...validTemplate, usageCount: '10' })).toBe(false);
    });
  });

  describe('WeeklyPattern structure', () => {
    it('should have Sunday as first day for Israeli work week', () => {
      const pattern: WeeklyPattern = {
        sun: 1, // Sunday is first
        mon: 1,
        tue: 1,
        wed: 1,
        thu: 1, // Thursday is last working day
        fri: 0, // Friday is weekend
        sat: 0  // Saturday is weekend
      };
      
      // Verify pattern can be created and used
      expect(pattern.sun).toBe(1);
      expect(pattern.thu).toBe(1);
      expect(pattern.fri).toBe(0);
      expect(pattern.sat).toBe(0);
    });

    it('should support partial work patterns', () => {
      const partialPattern: WeeklyPattern = {
        sun: 1,     // Full day
        mon: 1,     // Full day
        tue: 0.5,   // Half day
        wed: 1,     // Full day
        thu: 0,     // Off day
        fri: 0,     // Weekend
        sat: 0,     // Weekend
        reason: 'Medical appointments on Tuesdays and off on Thursdays'
      };
      
      expect(isValidWeeklyPattern(partialPattern)).toBe(true);
      expect(partialPattern.reason).toBeDefined();
    });
  });
});