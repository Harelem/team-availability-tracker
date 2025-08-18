/**
 * Smart Sprint Detection Tests
 * 
 * Critical validation tests to ensure users see the correct sprint
 * for August 15th, 2025 (should be Sprint 2, not Sprint 1)
 */

import { 
  detectCurrentSprintForDate, 
  detectSprintForAugust15th,
  convertToLegacySprintFormat,
  validateSprintContainsDate,
  getExpectedSprintSchedule,
  createSprintDetectionReport,
  type SmartSprintInfo 
} from '@/utils/smartSprintDetection';

describe('Smart Sprint Detection for August 15th Fix', () => {
  describe('August 15th Sprint Detection', () => {
    test('should correctly identify Sprint 2 for August 15th, 2025', () => {
      const august15th = new Date('2025-08-15');
      const sprintInfo = detectCurrentSprintForDate(august15th);
      
      // Critical assertions for the bug fix
      expect(sprintInfo.sprintNumber).toBe(2);
      expect(sprintInfo.sprintName).toBe('Sprint 2');
      expect(sprintInfo.isActive).toBe(true);
      expect(sprintInfo.isCurrentForDate).toBe(true);
      
      // Verify date range for Sprint 2
      expect(sprintInfo.startDate.getMonth()).toBe(7); // August (0-indexed)
      expect(sprintInfo.startDate.getDate()).toBe(10); // August 10th
      expect(sprintInfo.endDate.getMonth()).toBe(7); // August (0-indexed)
      expect(sprintInfo.endDate.getDate()).toBe(21); // August 21st
      
      console.log(`✅ Sprint 2 validation: ${sprintInfo.startDate.toDateString()} - ${sprintInfo.endDate.toDateString()}`);
    });
    
    test('should use dedicated August 15th detection function', () => {
      const sprintInfo = detectSprintForAugust15th();
      
      expect(sprintInfo.sprintNumber).toBe(2);
      expect(sprintInfo.startDate.getMonth()).toBe(7); // August
      expect(sprintInfo.startDate.getDate()).toBe(10); // 10th
      expect(sprintInfo.endDate.getDate()).toBe(21); // 21st
      expect(sprintInfo.isCurrentForDate).toBe(true);
    });
    
    test('should show correct working days for Sprint 2', () => {
      const sprintInfo = detectSprintForAugust15th();
      
      // Sprint 2 should have exactly 10 working days
      expect(sprintInfo.workingDays).toHaveLength(10);
      
      // Verify working days are Sunday-Thursday only
      sprintInfo.workingDays.forEach(date => {
        const dayOfWeek = date.getDay();
        expect(dayOfWeek).toBeGreaterThanOrEqual(0); // Sunday or later
        expect(dayOfWeek).toBeLessThanOrEqual(4); // Thursday or earlier
      });
      
      // August 15th is a Friday (non-working day), so it shouldn't be in working days
      // But August 11th (Monday) should be in working days
      const august11th = sprintInfo.workingDays.find(date => 
        date.getMonth() === 7 && date.getDate() === 11
      );
      expect(august11th).toBeDefined();
      expect(august11th?.getDay()).toBe(1); // Monday
      
      console.log('Working days in Sprint 2:', sprintInfo.workingDays.map(d => d.toDateString()));
    });
  });
  
  describe('Sprint Sequence Validation', () => {
    test('should validate complete sprint sequence from July 27th', () => {
      const schedule = getExpectedSprintSchedule();
      
      // Should have at least 3 sprints in schedule
      expect(schedule.length).toBeGreaterThanOrEqual(3);
      
      // Sprint 1 validation
      const sprint1 = schedule.find(s => s.sprintNumber === 1);
      expect(sprint1).toBeDefined();
      expect(sprint1?.startDate.getMonth()).toBe(6); // July
      expect(sprint1?.startDate.getDate()).toBe(27); // July 27th
      expect(sprint1?.status).toBe('completed'); // Should be completed by August 15th
      
      // Sprint 2 validation  
      const sprint2 = schedule.find(s => s.sprintNumber === 2);
      expect(sprint2).toBeDefined();
      expect(sprint2?.startDate.getMonth()).toBe(7); // August
      expect(sprint2?.startDate.getDate()).toBe(10); // August 10th
      expect(sprint2?.endDate.getDate()).toBe(21); // August 21st
      expect(sprint2?.status).toBe('current'); // Should be current for August 15th
      
      console.log('Sprint 1:', sprint1?.startDate.toDateString(), '-', sprint1?.endDate.toDateString(), `(${sprint1?.status})`);
      console.log('Sprint 2:', sprint2?.startDate.toDateString(), '-', sprint2?.endDate.toDateString(), `(${sprint2?.status})`);
    });
    
    test('should correctly calculate sprint boundaries', () => {
      // Test sprint boundary dates
      const aug7th = new Date('2025-08-07'); // Last day of Sprint 1
      const aug8th = new Date('2025-08-08'); // Friday (non-working day)
      const aug9th = new Date('2025-08-09'); // Saturday (non-working day)  
      const aug10th = new Date('2025-08-10'); // First day of Sprint 2
      const aug21st = new Date('2025-08-21'); // Last day of Sprint 2
      const aug22nd = new Date('2025-08-22'); // Friday (non-working day after Sprint 2)
      
      const sprint1End = detectCurrentSprintForDate(aug7th);
      const sprint2Start = detectCurrentSprintForDate(aug10th);
      const sprint2End = detectCurrentSprintForDate(aug21st);
      
      expect(sprint1End.sprintNumber).toBe(1);
      expect(sprint2Start.sprintNumber).toBe(2);
      expect(sprint2End.sprintNumber).toBe(2);
      
      // Verify boundary dates
      expect(sprint1End.endDate.getMonth()).toBe(7); // August
      expect(sprint1End.endDate.getDate()).toBe(7); // 7th
      expect(sprint2Start.startDate.getDate()).toBe(10); // 10th
      expect(sprint2End.endDate.getDate()).toBe(21); // 21st
    });
  });
  
  describe('Legacy Format Compatibility', () => {
    test('should convert to legacy CurrentGlobalSprint format', () => {
      const sprintInfo = detectSprintForAugust15th();
      const legacyFormat = convertToLegacySprintFormat(sprintInfo);
      
      // Validate legacy format fields
      expect(legacyFormat.current_sprint_number).toBe(2);
      expect(legacyFormat.sprint_length_weeks).toBe(2);
      expect(legacyFormat.sprint_start_date).toBe('2025-08-10');
      expect(legacyFormat.sprint_end_date).toBe('2025-08-21');
      expect(legacyFormat.is_active).toBe(true);
      expect(legacyFormat.notes).toContain('Sprint 2');
      
      // Should have calculated progress and remaining days
      expect(legacyFormat.progress_percentage).toBeGreaterThan(0);
      expect(legacyFormat.working_days_remaining).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Sprint Validation', () => {
    test('should validate sprint contains target date', () => {
      const sprintInfo = detectSprintForAugust15th();
      const august15th = new Date('2025-08-15');
      
      const validation = validateSprintContainsDate(sprintInfo, august15th);
      expect(validation.isValid).toBe(true);
      expect(validation.reason).toBeUndefined();
    });
    
    test('should detect invalid sprint date ranges', () => {
      const sprintInfo = detectSprintForAugust15th();
      const august5th = new Date('2025-08-05'); // Before Sprint 2
      const august25th = new Date('2025-08-25'); // After Sprint 2
      
      const beforeValidation = validateSprintContainsDate(sprintInfo, august5th);
      expect(beforeValidation.isValid).toBe(false);
      expect(beforeValidation.reason).toContain('before sprint start');
      
      const afterValidation = validateSprintContainsDate(sprintInfo, august25th);
      expect(afterValidation.isValid).toBe(false);
      expect(afterValidation.reason).toContain('after sprint end');
    });
  });
  
  describe('Working Day Calculations', () => {
    test('should correctly calculate working days between dates', () => {
      const july27th = new Date('2025-07-27'); // Sprint 1 start (Sunday)
      const august15th = new Date('2025-08-15'); // Target date (Monday)
      
      const sprintInfo = detectCurrentSprintForDate(august15th);
      
      // From July 27 to August 15 should span into Sprint 2
      expect(sprintInfo.sprintNumber).toBe(2);
      
      // Sprint 2 should contain exactly 10 working days
      const sprint2WorkingDays = sprintInfo.workingDays;
      expect(sprint2WorkingDays).toHaveLength(10);
      
      // Verify no Friday/Saturday dates
      sprint2WorkingDays.forEach(date => {
        expect(date.getDay()).not.toBe(5); // Not Friday
        expect(date.getDay()).not.toBe(6); // Not Saturday
      });
    });
    
    test('should handle sprint progress calculation correctly', () => {
      const august15th = new Date('2025-08-15');
      const sprintInfo = detectCurrentSprintForDate(august15th);
      
      // August 15th should be the 4th working day of Sprint 2
      // Sprint 2: Aug 10 (Sun), 11 (Mon), 12 (Tue), 13 (Wed), 14 (Thu), 15 (Mon)...
      // Progress should be around 40-60% through the sprint
      expect(sprintInfo.progressPercentage).toBeGreaterThan(30);
      expect(sprintInfo.progressPercentage).toBeLessThan(80);
      
      // Should have working days remaining
      expect(sprintInfo.workingDaysRemaining).toBeGreaterThan(0);
      expect(sprintInfo.workingDaysRemaining).toBeLessThan(10);
    });
  });
  
  describe('Debug Report Generation', () => {
    test('should generate comprehensive debug report for August 15th', () => {
      const august15th = new Date('2025-08-15');
      const report = createSprintDetectionReport(august15th);
      
      expect(report).toContain('SPRINT DETECTION REPORT');
      expect(report).toContain('Target Date: Fri Aug 15 2025');
      expect(report).toContain('Detected Sprint: Sprint 2');
      expect(report).toContain('Sprint Date Range: Sun Aug 10 2025 - Thu Aug 21 2025');
      expect(report).toContain('Is Active for Target Date: true');
      expect(report).toContain('Sprint 2: Sun Aug 10 2025 - Thu Aug 21 2025 (current) ← CURRENT');
      
      // Print report for debugging
      console.log('\n' + report);
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    test('should handle weekend dates correctly', () => {
      const friday = new Date('2025-08-15'); 
      friday.setDate(15); // Ensure it's Friday
      while (friday.getDay() !== 5) {
        friday.setDate(friday.getDate() + 1);
      }
      
      const sprintInfo = detectCurrentSprintForDate(friday);
      
      // Should still detect correct sprint even for non-working days
      expect(sprintInfo.sprintNumber).toBeGreaterThan(0);
      expect(sprintInfo.isActive).toBe(true);
    });
    
    test('should handle sprint transition periods', () => {
      // Test dates around sprint boundaries
      const endOfSprint1 = new Date('2025-08-07'); // Thursday - last working day of Sprint 1
      const startOfSprint2 = new Date('2025-08-10'); // Sunday - first day of Sprint 2
      
      const sprint1Info = detectCurrentSprintForDate(endOfSprint1);
      const sprint2Info = detectCurrentSprintForDate(startOfSprint2);
      
      expect(sprint1Info.sprintNumber).toBe(1);
      expect(sprint2Info.sprintNumber).toBe(2);
      
      // Verify clean transition
      expect(sprint1Info.endDate.getTime()).toBeLessThan(sprint2Info.startDate.getTime());
    });
  });
});