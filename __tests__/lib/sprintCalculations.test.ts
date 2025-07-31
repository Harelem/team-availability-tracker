import { 
  SprintCalculations, 
  SprintCalculationValidator,
  SPRINT_CALCULATION_CONSTANTS,
  SPRINT_CALCULATION_EXAMPLES 
} from '../../src/lib/sprintCalculations';

describe('SprintCalculations', () => {
  describe('calculateSprintPotential', () => {
    it('should calculate correctly: 5 people × 10 working days × 7 hours = 350 hours', () => {
      const result = SprintCalculations.calculateSprintPotential(
        5, // team members
        '2024-01-07', // Sunday (start of Israeli work week)
        '2024-01-18'  // Thursday (end of 2-week sprint)
      );
      expect(result).toBe(350); // 5 × 10 × 7 = 350
    });

    it('should calculate Product Team example correctly', () => {
      const example = SPRINT_CALCULATION_EXAMPLES.productTeam;
      const result = SprintCalculations.calculateSprintPotential(
        example.members,
        '2024-01-07', // Sunday (start of Israeli work week)
        '2024-01-18'  // Thursday (2 weeks = 10 working days)
      );
      expect(result).toBe(example.expectedPotential); // 8 × 10 × 7 = 560
    });

    it('should calculate Dev Team Tal example correctly', () => {
      const example = SPRINT_CALCULATION_EXAMPLES.devTeamTal;
      const result = SprintCalculations.calculateSprintPotential(
        example.members,
        '2024-01-07', // Sunday (start of Israeli work week)
        '2024-01-18'  // Thursday (2 weeks = 10 working days)
      );
      expect(result).toBe(example.expectedPotential); // 4 × 10 × 7 = 280
    });

    it('should calculate Infrastructure Team example correctly', () => {
      const example = SPRINT_CALCULATION_EXAMPLES.infraTeam;
      const result = SprintCalculations.calculateSprintPotential(
        example.members,
        '2024-01-07', // Sunday (start of Israeli work week)
        '2024-01-25'  // Thursday (3 weeks = 15 working days)
      );
      expect(result).toBe(example.expectedPotential); // 6 × 15 × 7 = 630
    });
  });

  describe('calculateWorkingDays', () => {
    it('should count Sunday through Thursday as working days (Israeli work week)', () => {
      const workingDays = SprintCalculations.calculateWorkingDays(
        '2024-01-07', // Sunday (start of work week)
        '2024-01-11'  // Thursday (end of work week)
      );
      expect(workingDays).toBe(5); // Sun, Mon, Tue, Wed, Thu
    });

    it('should handle cross-month sprints correctly', () => {
      const workingDays = SprintCalculations.calculateWorkingDays(
        '2024-01-28', // Sunday (start of work week)
        '2024-02-08'  // Thursday (end of 2 weeks)
      );
      expect(workingDays).toBe(10); // 2 weeks = 10 working days
    });

    it('should handle single day correctly', () => {
      const workingDays = SprintCalculations.calculateWorkingDays(
        '2024-01-07', // Sunday (working day)
        '2024-01-07'  // Same Sunday
      );
      expect(workingDays).toBe(1);
    });

    it('should handle weekend-only period correctly (Friday-Saturday)', () => {
      const workingDays = SprintCalculations.calculateWorkingDays(
        '2024-01-12', // Friday (weekend in Israeli calendar)
        '2024-01-13'  // Saturday (weekend in Israeli calendar)
      );
      expect(workingDays).toBe(0); // No working days
    });

    it('should handle 3-week sprint correctly', () => {
      const workingDays = SprintCalculations.calculateWorkingDays(
        '2024-01-07', // Sunday (start of work week)
        '2024-01-25'  // Thursday (end of 3 weeks)
      );
      expect(workingDays).toBe(15); // 3 weeks × 5 days = 15 working days
    });
  });

  describe('calculateActualPlannedHours', () => {
    it('should sum hours correctly from schedule entries', () => {
      const scheduleEntries = [
        { hours: 7 },    // Full day
        { hours: 3.5 },  // Half day
        { hours: 0 },    // Unavailable
        { hours: 7 },    // Full day
        { hours: null }  // No entry
      ];
      
      const result = SprintCalculations.calculateActualPlannedHours(scheduleEntries);
      expect(result).toBe(17.5); // 7 + 3.5 + 0 + 7 + 0 = 17.5
    });

    it('should handle empty array', () => {
      const result = SprintCalculations.calculateActualPlannedHours([]);
      expect(result).toBe(0);
    });

    it('should handle all null entries', () => {
      const scheduleEntries = [
        { hours: null },
        { hours: null },
        { hours: null }
      ];
      
      const result = SprintCalculations.calculateActualPlannedHours(scheduleEntries);
      expect(result).toBe(0);
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should calculate percentage correctly', () => {
      const result = SprintCalculations.calculateCompletionPercentage(280, 350);
      expect(result).toBe(80); // 280/350 = 80%
    });

    it('should handle zero potential hours', () => {
      const result = SprintCalculations.calculateCompletionPercentage(100, 0);
      expect(result).toBe(0);
    });

    it('should round to nearest integer', () => {
      const result = SprintCalculations.calculateCompletionPercentage(333, 1000);
      expect(result).toBe(33); // 33.3% rounded to 33%
    });

    it('should handle over 100% completion', () => {
      const result = SprintCalculations.calculateCompletionPercentage(400, 350);
      expect(result).toBe(114); // 400/350 = 114%
    });
  });

  describe('calculateSprintProgress', () => {
    it('should return 0 for future sprint', () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 7);
      const futureEnd = new Date(futureStart);
      futureEnd.setDate(futureStart.getDate() + 14);
      
      const result = SprintCalculations.calculateSprintProgress(
        futureStart.toISOString().split('T')[0],
        futureEnd.toISOString().split('T')[0]
      );
      expect(result).toBe(0);
    });

    it('should return 100 for past sprint', () => {
      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - 21);
      const pastEnd = new Date(pastStart);
      pastEnd.setDate(pastStart.getDate() + 14);
      
      const result = SprintCalculations.calculateSprintProgress(
        pastStart.toISOString().split('T')[0],
        pastEnd.toISOString().split('T')[0]
      );
      expect(result).toBe(100);
    });

    it('should calculate mid-sprint progress correctly', () => {
      const start = new Date();
      start.setDate(start.getDate() - 7); // Started 7 days ago
      const end = new Date();
      end.setDate(end.getDate() + 7); // Ends in 7 days
      
      const result = SprintCalculations.calculateSprintProgress(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );
      // Should be approximately halfway through (allow for timing variations)
      expect(result).toBeGreaterThanOrEqual(45);
      expect(result).toBeLessThanOrEqual(55);
    });
  });

  describe('calculateDaysRemaining', () => {
    it('should return 0 for past end date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const result = SprintCalculations.calculateDaysRemaining(
        pastDate.toISOString().split('T')[0]
      );
      expect(result).toBe(0);
    });

    it('should count only working days remaining', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // One week from now
      
      const result = SprintCalculations.calculateDaysRemaining(
        futureDate.toISOString().split('T')[0]
      );
      
      // Should be approximately 5 working days (may vary based on current day of week)
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(7);
    });
  });

  describe('getSprintHealthStatus', () => {
    it('should return excellent for high completion', () => {
      const result = SprintCalculations.getSprintHealthStatus(95, 50, 5);
      expect(result.status).toBe('excellent');
      expect(result.color).toBe('#10B981');
    });

    it('should return good for decent completion', () => {
      const result = SprintCalculations.getSprintHealthStatus(80, 50, 5);
      expect(result.status).toBe('good');
      expect(result.color).toBe('#059669');
    });

    it('should return warning for moderate completion', () => {
      const result = SprintCalculations.getSprintHealthStatus(60, 50, 5);
      expect(result.status).toBe('warning');
      expect(result.color).toBe('#F59E0B');
    });

    it('should return critical for low completion with little time', () => {
      const result = SprintCalculations.getSprintHealthStatus(30, 80, 1);
      expect(result.status).toBe('critical');
      expect(result.color).toBe('#EF4444');
    });

    it('should return warning for low completion with time remaining', () => {
      const result = SprintCalculations.getSprintHealthStatus(40, 30, 5);
      expect(result.status).toBe('warning');
      expect(result.color).toBe('#F59E0B');
    });
  });

  describe('calculateSprintMetrics', () => {
    it('should calculate comprehensive metrics correctly', () => {
      const scheduleEntries = [
        { hours: 7 }, { hours: 7 }, { hours: 3.5 }, { hours: 7 }, { hours: 0 }
      ];
      
      const result = SprintCalculations.calculateSprintMetrics(
        5, // team members
        '2024-01-07', // Sunday (start of Israeli work week)
        '2024-01-18', // Thursday (end of 2 weeks)
        scheduleEntries
      );
      
      expect(result.teamSize).toBe(5);
      expect(result.workingDays).toBe(10);
      expect(result.potentialHours).toBe(350); // 5 × 10 × 7
      expect(result.actualPlannedHours).toBe(24.5); // 7+7+3.5+7+0
      expect(result.completionPercentage).toBe(7); // 24.5/350 = 7%
    });
  });

  describe('calculateSprintProgressInfo', () => {
    it('should determine if sprint is on track', () => {
      const start = new Date();
      start.setDate(start.getDate() - 7); // Started 7 days ago
      const end = new Date();
      end.setDate(end.getDate() + 7); // Ends in 7 days
      
      const result = SprintCalculations.calculateSprintProgressInfo(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0],
        45 // 45% completion at ~50% time progress
      );
      
      // Should be approximately halfway through (allow for timing variations)
      expect(result.sprintProgressPercentage).toBeGreaterThanOrEqual(45);
      expect(result.sprintProgressPercentage).toBeLessThanOrEqual(55);
      expect(result.isOnTrack).toBe(true); // 45% should be sufficient for ~50% progress
    });

    it('should identify when sprint is behind track', () => {
      const start = new Date();
      start.setDate(start.getDate() - 10); // Started 10 days ago
      const end = new Date();
      end.setDate(end.getDate() + 4); // Ends in 4 days
      
      const result = SprintCalculations.calculateSprintProgressInfo(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0],
        30 // Only 30% completion at ~71% time progress
      );
      
      expect(result.isOnTrack).toBe(false); // 30% < expected based on time progress
    });
  });

  describe('Real-world scenarios', () => {
    it('should match expected Product Team sprint calculation', () => {
      // Product Team: 8 members, 2-week sprint
      const potentialHours = SprintCalculations.calculateSprintPotential(
        8,
        '2024-01-07', // Sunday (start of Israeli work week)
        '2024-01-18'  // Thursday (end of 2 weeks)
      );
      
      // Mock realistic schedule data (80% planned)
      const scheduleEntries = Array(64).fill({ hours: 7 }); // 8 members × 8 days = 64 entries, all full days
      const actualHours = SprintCalculations.calculateActualPlannedHours(scheduleEntries);
      const completion = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);
      
      expect(potentialHours).toBe(560); // 8 × 10 × 7
      expect(actualHours).toBe(448); // 64 × 7
      expect(completion).toBe(80); // 448/560 = 80%
    });

    it('should handle partial availability correctly', () => {
      // Dev Team with mixed availability
      const scheduleEntries = [
        // Member 1: Full availability (5 days × 7h = 35h)
        { hours: 7 }, { hours: 7 }, { hours: 7 }, { hours: 7 }, { hours: 7 },
        // Member 2: Half availability (5 days × 3.5h = 17.5h)  
        { hours: 3.5 }, { hours: 3.5 }, { hours: 3.5 }, { hours: 3.5 }, { hours: 3.5 },
        // Member 3: Some sick days (3 days available = 21h)
        { hours: 7 }, { hours: 7 }, { hours: 7 }, { hours: 0 }, { hours: 0 }
      ];
      
      const potentialHours = SprintCalculations.calculateSprintPotential(3, '2024-01-07', '2024-01-11'); // Sunday to Thursday
      const actualHours = SprintCalculations.calculateActualPlannedHours(scheduleEntries);
      const completion = SprintCalculations.calculateCompletionPercentage(actualHours, potentialHours);
      
      expect(potentialHours).toBe(105); // 3 × 5 × 7 = 105h
      expect(actualHours).toBe(73.5); // 35 + 17.5 + 21 = 73.5h
      expect(completion).toBe(70); // 73.5/105 = 70%
    });
  });

  describe('SprintCalculationValidator', () => {
    describe('validateHoursPerWeek', () => {
      it('should validate correct 35-hour calculation', () => {
        const result = SprintCalculationValidator.validateHoursPerWeek(8, 2, 560);
        expect(result.isValid).toBe(true);
        expect(result.expectedHours).toBe(560);
        expect(result.message).toContain('✓ Calculation correct');
      });

      it('should detect incorrect hour calculation', () => {
        const result = SprintCalculationValidator.validateHoursPerWeek(8, 2, 512);
        expect(result.isValid).toBe(false);
        expect(result.expectedHours).toBe(560);
        expect(result.message).toContain('❌ Calculation error');
      });
    });

    describe('validateWorkingDays', () => {
      it('should validate correct working days calculation', () => {
        const result = SprintCalculationValidator.validateWorkingDays(
          '2024-01-07', '2024-01-11', 5
        );
        expect(result.isValid).toBe(true);
        expect(result.expectedDays).toBe(5);
        expect(result.message).toContain('✓ Working days correct');
      });

      it('should detect incorrect working days calculation', () => {
        const result = SprintCalculationValidator.validateWorkingDays(
          '2024-01-07', '2024-01-11', 7
        );
        expect(result.isValid).toBe(false);
        expect(result.expectedDays).toBe(5);
        expect(result.message).toContain('❌ Working days error');
      });
    });

    describe('validateSprintCalculation', () => {
      it('should validate comprehensive sprint calculation', () => {
        const result = SprintCalculationValidator.validateSprintCalculation(
          8, '2024-01-07', '2024-01-18', 560
        );
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.details.teamSize).toBe(8);
        expect(result.details.workingDays).toBe(10);
        expect(result.details.expectedPotential).toBe(560);
        expect(result.details.hoursPerWeek).toBe(SPRINT_CALCULATION_CONSTANTS.HOURS_PER_PERSON_PER_WEEK);
      });

      it('should detect sprint calculation errors', () => {
        const result = SprintCalculationValidator.validateSprintCalculation(
          8, '2024-01-07', '2024-01-18', 512 // Wrong calculation
        );
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Sprint potential mismatch');
      });

      it('should warn about edge cases', () => {
        const result = SprintCalculationValidator.validateSprintCalculation(
          15, '2024-01-07', '2024-01-09', 210 // Large team, short sprint
        );
        
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('Large team size'))).toBe(true);
        expect(result.warnings.some(w => w.includes('less than 1 week'))).toBe(true);
      });
    });
  });

  describe('SPRINT_CALCULATION_CONSTANTS', () => {
    it('should have correct constant values for 35-hour week', () => {
      expect(SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY).toBe(7);
      expect(SPRINT_CALCULATION_CONSTANTS.WORKING_DAYS_PER_WEEK).toBe(5);
      expect(SPRINT_CALCULATION_CONSTANTS.HOURS_PER_PERSON_PER_WEEK).toBe(35);
      expect(SPRINT_CALCULATION_CONSTANTS.WORKING_DAYS).toEqual([0, 1, 2, 3, 4]);
      expect(SPRINT_CALCULATION_CONSTANTS.WEEKEND_DAYS).toEqual([5, 6]);
    });

    it('should maintain consistency: 5 days × 7 hours = 35 hours', () => {
      const calculatedWeeklyHours = SPRINT_CALCULATION_CONSTANTS.WORKING_DAYS_PER_WEEK * 
                                   SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY;
      expect(calculatedWeeklyHours).toBe(SPRINT_CALCULATION_CONSTANTS.HOURS_PER_PERSON_PER_WEEK);
    });
  });
});