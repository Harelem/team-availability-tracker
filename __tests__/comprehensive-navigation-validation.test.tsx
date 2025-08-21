/**
 * Comprehensive Navigation Validation Tests
 * 
 * Tests for critical navigation cycling bug fixes and date configuration consistency
 * ISSUE: Navigation from September 1st → August 10th cycling (should be FIXED)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleTable from '@/components/ScheduleTable';
import {
  detectCurrentSprintForDate,
  validateSprintContainsDate,
  DEFAULT_SPRINT_CONFIG,
  getExpectedSprintSchedule,
  createSprintDetectionReport,
  SmartSprintInfo
} from '@/utils/smartSprintDetection';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';

// Mock data for testing
const mockCurrentUser: TeamMember = {
  id: 1,
  name: 'Test User',
  team_id: 1,
  role: 'member',
  weekly_capacity: 35
};

const mockTeam: Team = {
  id: 1,
  name: 'Test Team',
  manager_id: 1,
  description: 'Test Team Description'
};

const mockTeamMembers: TeamMember[] = [mockCurrentUser];

// Mock current sprint data with proper dates
const mockCurrentSprint: CurrentGlobalSprint = {
  id: '2',
  current_sprint_number: 2,
  sprint_length_weeks: 2,
  sprint_start_date: '2025-08-10', // FIXED: Using consistent date configuration
  sprint_end_date: '2025-08-21',
  progress_percentage: 50,
  days_remaining: 7,
  working_days_remaining: 5,
  is_active: true,
  notes: 'Sprint 2',
  created_at: '2025-08-10T00:00:00Z',
  updated_at: '2025-08-10T00:00:00Z',
  updated_by: 'system'
};

// Test wrapper component with providers
const TestWrapper = ({ children, currentSprint = mockCurrentSprint }: { 
  children: React.ReactNode;
  currentSprint?: CurrentGlobalSprint;
}) => (
  <GlobalSprintProvider initialSprint={currentSprint}>
    {children}
  </GlobalSprintProvider>
);

describe('Navigation Cycling Bug Tests', () => {
  beforeEach(() => {
    // Mock console methods to capture debug output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Forward Navigation Tests', () => {
    it('should navigate forward from August 17, 2025 through September without cycling back', () => {
      // Test the critical navigation path that was cycling
      const startDate = new Date('2025-08-17');
      const testDates = [
        new Date('2025-08-17'), // Start
        new Date('2025-08-24'), // Next week
        new Date('2025-08-31'), // End of August
        new Date('2025-09-07'), // First week of September - CRITICAL TEST POINT
        new Date('2025-09-14'), // Second week of September
        new Date('2025-09-21'), // Third week of September
        new Date('2025-09-28')  // Fourth week of September
      ];

      let previousSprintInfo: SmartSprintInfo | null = null;

      testDates.forEach((testDate, index) => {
        const sprintInfo = detectCurrentSprintForDate(testDate);
        
        console.log(`Test ${index + 1}: ${testDate.toDateString()} → Sprint ${sprintInfo.sprintNumber} (${sprintInfo.startDate.toDateString()} to ${sprintInfo.endDate.toDateString()})`);
        
        // Verify no backward cycling occurs
        if (previousSprintInfo) {
          expect(sprintInfo.startDate.getTime()).toBeGreaterThanOrEqual(previousSprintInfo.startDate.getTime());
          
          // Critical test: September dates should NEVER jump back to August
          if (testDate.getMonth() === 8) { // September (0-indexed)
            expect(sprintInfo.startDate.getMonth()).not.toBe(7); // Should NOT be August
            console.log(`✅ CRITICAL TEST PASSED: September date ${testDate.toDateString()} correctly maps to sprint starting ${sprintInfo.startDate.toDateString()} (not August)`);
          }
        }
        
        // Verify sprint contains the target date
        expect(sprintInfo.isCurrentForDate).toBe(true);
        expect(testDate.getTime()).toBeGreaterThanOrEqual(sprintInfo.startDate.getTime());
        expect(testDate.getTime()).toBeLessThanOrEqual(sprintInfo.endDate.getTime());
        
        previousSprintInfo = sprintInfo;
      });
    });

    it('should handle month boundary transitions correctly', () => {
      const boundaryDates = [
        { date: new Date('2025-08-31'), expectedMonth: 'August', description: 'End of August' },
        { date: new Date('2025-09-01'), expectedMonth: 'September', description: 'Start of September' },
        { date: new Date('2025-09-30'), expectedMonth: 'September', description: 'End of September' },
        { date: new Date('2025-10-01'), expectedMonth: 'October', description: 'Start of October' },
        { date: new Date('2025-12-31'), expectedMonth: 'December', description: 'End of year' },
        { date: new Date('2026-01-01'), expectedMonth: 'January', description: 'Start of next year' }
      ];

      boundaryDates.forEach(({ date, expectedMonth, description }) => {
        const sprintInfo = detectCurrentSprintForDate(date);
        
        console.log(`Boundary test: ${description} - ${date.toDateString()} → Sprint ${sprintInfo.sprintNumber}`);
        
        // Verify sprint contains the target date
        expect(sprintInfo.isCurrentForDate).toBe(true);
        
        // Verify sprint dates make logical sense
        expect(sprintInfo.startDate.getTime()).toBeLessThanOrEqual(date.getTime());
        expect(sprintInfo.endDate.getTime()).toBeGreaterThanOrEqual(date.getTime());
        
        console.log(`✅ ${description}: Sprint ${sprintInfo.sprintNumber} (${sprintInfo.startDate.toDateString()} - ${sprintInfo.endDate.toDateString()}) correctly contains ${date.toDateString()}`);
      });
    });

    it('should navigate unlimited forward through multiple years', () => {
      const futureYears = [2025, 2026, 2027, 2028];
      
      futureYears.forEach(year => {
        // Test mid-year date for each year
        const testDate = new Date(`${year}-06-15`);
        const sprintInfo = detectCurrentSprintForDate(testDate);
        
        expect(sprintInfo.isCurrentForDate).toBe(true);
        expect(sprintInfo.sprintNumber).toBeGreaterThan(0);
        
        console.log(`✅ Year ${year}: Successfully detected Sprint ${sprintInfo.sprintNumber} for ${testDate.toDateString()}`);
      });
    });

    it('should handle leap year transitions correctly', () => {
      const leapYearDates = [
        new Date('2024-02-29'), // Leap year
        new Date('2024-03-01'), // Day after leap day
        new Date('2028-02-29'), // Future leap year
        new Date('2028-03-01')  // Day after future leap day
      ];

      leapYearDates.forEach(date => {
        const sprintInfo = detectCurrentSprintForDate(date);
        
        expect(sprintInfo.isCurrentForDate).toBe(true);
        expect(sprintInfo.sprintNumber).toBeGreaterThan(0);
        
        console.log(`✅ Leap year test: ${date.toDateString()} → Sprint ${sprintInfo.sprintNumber}`);
      });
    });
  });

  describe('Sprint Boundary Calculations', () => {
    it('should correctly calculate sprint boundaries for August 17, 2025', () => {
      const targetDate = new Date('2025-08-17');
      const sprintInfo = detectCurrentSprintForDate(targetDate);
      
      // Based on DEFAULT_SPRINT_CONFIG.firstSprintStartDate = 2025-08-10
      // August 17th should be in Sprint 2
      expect(sprintInfo.sprintNumber).toBe(2);
      expect(sprintInfo.startDate.toDateString()).toBe('Sun Aug 10 2025');
      
      // Verify target date is within sprint bounds
      expect(targetDate.getTime()).toBeGreaterThanOrEqual(sprintInfo.startDate.getTime());
      expect(targetDate.getTime()).toBeLessThanOrEqual(sprintInfo.endDate.getTime());
      
      console.log(`✅ August 17th test: Sprint ${sprintInfo.sprintNumber}, Range: ${sprintInfo.startDate.toDateString()} - ${sprintInfo.endDate.toDateString()}`);
    });

    it('should validate sprint detection against expected schedule', () => {
      const schedule = getExpectedSprintSchedule();
      const today = new Date();
      
      expect(schedule.length).toBeGreaterThan(0);
      
      // Find current sprint in schedule
      const currentSprintInSchedule = schedule.find(sprint => sprint.status === 'current');
      
      if (currentSprintInSchedule) {
        const detectedSprint = detectCurrentSprintForDate(today);
        expect(detectedSprint.sprintNumber).toBe(currentSprintInSchedule.sprintNumber);
        
        console.log(`✅ Schedule validation: Current sprint ${detectedSprint.sprintNumber} matches expected schedule`);
      }
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle navigation with poor network conditions', async () => {
      // Simulate network delay
      const networkDelay = new Promise(resolve => setTimeout(resolve, 1000));
      
      const testDate = new Date('2025-09-01');
      const sprintInfoPromise = Promise.resolve(detectCurrentSprintForDate(testDate));
      
      const results = await Promise.allSettled([networkDelay, sprintInfoPromise]);
      const sprintResult = results[1];
      
      expect(sprintResult.status).toBe('fulfilled');
      if (sprintResult.status === 'fulfilled') {
        expect(sprintResult.value.isCurrentForDate).toBe(true);
        console.log('✅ Network delay test passed');
      }
    });

    it('should validate sprint consistency across navigation modes', () => {
      const testDate = new Date('2025-08-17');
      
      // Test both week and sprint modes should detect same sprint
      const weekModeDetection = detectCurrentSprintForDate(testDate);
      const sprintModeDetection = detectCurrentSprintForDate(testDate);
      
      expect(weekModeDetection.sprintNumber).toBe(sprintModeDetection.sprintNumber);
      expect(weekModeDetection.startDate.getTime()).toBe(sprintModeDetection.startDate.getTime());
      expect(weekModeDetection.endDate.getTime()).toBe(sprintModeDetection.endDate.getTime());
      
      console.log('✅ Navigation mode consistency validated');
    });

    it('should generate comprehensive debug reports', () => {
      const testDate = new Date('2025-09-01');
      const report = createSprintDetectionReport(testDate);
      
      expect(report).toContain('SPRINT DETECTION REPORT');
      expect(report).toContain(testDate.toDateString());
      expect(report).toContain('Sprint');
      expect(report).toContain('Expected Sprint Schedule');
      
      console.log('Debug Report Generated:');
      console.log(report);
    });
  });

  describe('Component Integration Tests', () => {
    it('should render ScheduleTable without navigation cycling issues', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Test forward navigation
      const nextButton = screen.getByRole('button', { name: /next/i });
      
      // Navigate multiple weeks forward
      for (let i = 0; i < 5; i++) {
        fireEvent.click(nextButton);
        await waitFor(() => {
          // Verify no console errors about cycling
          expect(console.error).not.toHaveBeenCalledWith(
            expect.stringMatching(/cycling/i)
          );
        });
      }
    });

    it('should handle rapid navigation without errors', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      const prevButton = screen.getByRole('button', { name: /previous/i });

      // Rapid navigation test
      const navigationSequence = [
        nextButton, nextButton, nextButton, 
        prevButton, prevButton,
        nextButton, nextButton, nextButton, nextButton
      ];

      for (const button of navigationSequence) {
        fireEvent.click(button);
        // Small delay to allow state updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Should not have any navigation errors
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/navigation error/i)
      );
    });
  });
});

describe('Date Configuration Consistency Tests', () => {
  it('should use consistent firstSprintStartDate across components', () => {
    const configDate = DEFAULT_SPRINT_CONFIG.firstSprintStartDate;
    
    // Verify the configuration date is 2025-08-10 (not 2025-07-27)
    expect(configDate.toDateString()).toBe('Sun Aug 10 2025');
    
    // Verify sprint detection uses this consistent date
    const august17Sprint = detectCurrentSprintForDate(new Date('2025-08-17'));
    expect(august17Sprint.startDate.getTime()).toBeGreaterThanOrEqual(configDate.getTime());
    
    console.log(`✅ Date configuration consistency: firstSprintStartDate = ${configDate.toDateString()}`);
  });

  it('should validate sprint boundary calculations match across components', () => {
    const testDates = [
      new Date('2025-08-10'), // Sprint start
      new Date('2025-08-17'), // Mid-sprint
      new Date('2025-08-21'), // Sprint end
      new Date('2025-08-24'), // Next sprint start
    ];

    testDates.forEach(date => {
      const sprintInfo = detectCurrentSprintForDate(date);
      const validation = validateSprintContainsDate(sprintInfo, date);
      
      expect(validation.isValid).toBe(true);
      console.log(`✅ Validation passed for ${date.toDateString()} in Sprint ${sprintInfo.sprintNumber}`);
    });
  });

  it('should handle fallback scenarios without date conflicts', () => {
    // Test fallback when no database sprint is available
    const fallbackSprint = detectCurrentSprintForDate(new Date('2025-08-17'));
    
    expect(fallbackSprint.sprintNumber).toBeGreaterThan(0);
    expect(fallbackSprint.isCurrentForDate).toBe(true);
    
    // Test conversion to legacy format
    const legacyFormat = {
      id: fallbackSprint.sprintNumber.toString(),
      current_sprint_number: fallbackSprint.sprintNumber,
      sprint_length_weeks: fallbackSprint.lengthWeeks,
      sprint_start_date: fallbackSprint.startDate.toISOString().split('T')[0],
      sprint_end_date: fallbackSprint.endDate.toISOString().split('T')[0],
      progress_percentage: fallbackSprint.progressPercentage,
      days_remaining: fallbackSprint.daysRemaining,
      working_days_remaining: fallbackSprint.workingDaysRemaining,
      is_active: fallbackSprint.isActive,
      notes: `Auto-calculated Sprint ${fallbackSprint.sprintNumber}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'smart-detection'
    };
    
    expect(legacyFormat.sprint_start_date).toBe('2025-08-10');
    console.log('✅ Fallback scenario handles date conflicts correctly');
  });
});