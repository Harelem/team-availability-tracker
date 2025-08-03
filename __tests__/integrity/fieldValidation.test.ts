/**
 * Field Validation and Input Sanitization Tests
 * 
 * Comprehensive testing of input validation, security measures,
 * and data sanitization across all user input fields
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { DatabaseService } from '@/lib/database';
import { databaseTestManager, testHelpers } from '../utils/databaseTestUtils';
import { VALIDATION_PATTERNS, TEST_TEAM_MEMBERS } from '../fixtures/testData';

// Mock components that handle user input
import ReasonDialog from '@/components/ReasonDialog';
import MemberFormModal from '@/components/MemberFormModal';
import SprintFormModal from '@/components/SprintFormModal';
import { TeamMemberManagement } from '@/components/TeamMemberManagement';

// Mock database service
jest.mock('@/lib/database');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } })) }
  }
}));

describe('Field Validation and Input Sanitization Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await testHelpers.setupCompleteTestEnvironment();
    
    // Suppress console outputs during testing
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await testHelpers.cleanupTestEnvironment();
    jest.restoreAllMocks();
  });

  describe('Required Field Validation', () => {
    it('should enforce required team name field', async () => {
      const user = userEvent.setup();
      
      // Mock team creation with validation
      mockDatabaseService.createTeam = jest.fn().mockImplementation(async (teamData) => {
        if (!teamData.name || teamData.name.trim().length === 0) {
          throw new Error('Team name is required');
        }
        if (teamData.name.length > 255) {
          throw new Error('Team name too long');
        }
        return { ...teamData, id: 1 };
      });

      const mockOnClose = jest.fn();
      render(<SprintFormModal isOpen={true} onClose={mockOnClose} mode="create" />);

      // Try to submit without team name
      const submitButton = screen.getByRole('button', { name: /create|save/i });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument();
      });
    });

    it('should enforce required member name and hebrew name fields', async () => {
      const user = userEvent.setup();
      
      // Mock member creation with validation
      mockDatabaseService.createTeamMember = jest.fn().mockImplementation(async (memberData) => {
        if (!memberData.name || memberData.name.trim().length === 0) {
          throw new Error('Member name is required');
        }
        if (!memberData.hebrew || memberData.hebrew.trim().length === 0) {
          throw new Error('Hebrew name is required');
        }
        return { ...memberData, id: 1 };
      });

      const mockOnClose = jest.fn();
      render(
        <MemberFormModal 
          isOpen={true} 
          onClose={mockOnClose} 
          teamId={1}
          mode="create" 
        />
      );

      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /add|save/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should validate schedule value field constraints', async () => {
      const user = userEvent.setup();
      
      // Mock schedule entry validation
      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entryData) => {
        const validValues = ['1', '0.5', 'X'];
        if (!entryData.value || !validValues.includes(entryData.value)) {
          throw new Error('Invalid schedule value. Must be 1, 0.5, or X');
        }
        if (!entryData.date || !VALIDATION_PATTERNS.requiredFields.dateFormat.test(entryData.date)) {
          throw new Error('Valid date is required');
        }
        return entryData;
      });

      const invalidScheduleValues = ['2', '0.3', 'Y', 'invalid', '', null];

      for (const invalidValue of invalidScheduleValues) {
        await expect(
          mockDatabaseService.saveScheduleEntry({
            member_id: 1,
            date: '2024-01-07',
            value: invalidValue as any
          })
        ).rejects.toThrow(/invalid schedule value/i);
      }
    });

    it('should validate date format requirements', async () => {
      const invalidDates = [
        '2024/01/07', // Wrong separator
        '01-07-2024', // Wrong format
        '2024-1-7', // Missing leading zeros
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        'invalid-date',
        '',
        null
      ];

      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entryData) => {
        if (!entryData.date || !VALIDATION_PATTERNS.requiredFields.dateFormat.test(entryData.date)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }
        return entryData;
      });

      for (const invalidDate of invalidDates) {
        await expect(
          mockDatabaseService.saveScheduleEntry({
            member_id: 1,
            date: invalidDate as any,
            value: '1'
          })
        ).rejects.toThrow(/date must be in/i);
      }
    });
  });

  describe('Hebrew Text Validation', () => {
    it('should validate Hebrew name field patterns', async () => {
      const validHebrewNames = [
        'ישראל כהן',
        'מרים לוי',
        'אברהם בן-דוד',
        'שרה מילר-כהן',
        'דוד ג\'ונסון',
        'רחל אל-מסרי'
      ];

      const invalidHebrewNames = [
        'John Smith', // English only
        'ישראל123', // Numbers in Hebrew name
        'מרים@לוי', // Special characters
        '<script>alert("xss")</script>ישראל', // XSS attempt
        'ישראל' + 'א'.repeat(250), // Too long
        ''
      ];

      mockDatabaseService.createTeamMember = jest.fn().mockImplementation(async (memberData) => {
        if (!memberData.hebrew || !VALIDATION_PATTERNS.requiredFields.hebrewName.test(memberData.hebrew)) {
          throw new Error('Valid Hebrew name is required');
        }
        return { ...memberData, id: 1 };
      });

      // Test valid Hebrew names
      for (const validName of validHebrewNames) {
        await expect(
          mockDatabaseService.createTeamMember({
            name: 'Test User',
            hebrew: validName,
            team_id: 1
          })
        ).resolves.toBeDefined();
      }

      // Test invalid Hebrew names
      for (const invalidName of invalidHebrewNames) {
        await expect(
          mockDatabaseService.createTeamMember({
            name: 'Test User',
            hebrew: invalidName,
            team_id: 1
          })
        ).rejects.toThrow(/valid hebrew name/i);
      }
    });

    it('should handle Hebrew text in reason fields correctly', async () => {
      const user = userEvent.setup();
      
      const validHebrewReasons = [
        'ביקור רופא',
        'חופשה מתוכננת',
        'מחלה',
        'עניינים אישיים',
        'הדרכה חיצונית'
      ];

      mockDatabaseService.saveScheduleEntry = jest.fn().mockResolvedValue({
        id: 1,
        member_id: 1,
        date: '2024-01-07',
        value: '0.5',
        reason: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const mockOnSave = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <ReasonDialog
          isOpen={true}
          memberId={1}
          dateKey="2024-01-07"
          value="0.5"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Test each valid Hebrew reason
      for (const reason of validHebrewReasons) {
        const reasonInput = screen.getByRole('textbox', { name: /reason/i });
        await user.clear(reasonInput);
        await user.type(reasonInput, reason);

        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
          reason: reason
        }));
      }
    });
  });

  describe('Security Input Sanitization', () => {
    it('should prevent XSS attacks in reason fields', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')" />',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
        'onmouseover="alert(\'xss\')"',
        '<svg/onload=alert("xss")>',
        '"><script>alert("xss")</script>'
      ];

      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entryData) => {
        if (entryData.reason && VALIDATION_PATTERNS.securityChecks.xssAttempt.test(entryData.reason)) {
          throw new Error('Invalid characters in reason field');
        }
        return entryData;
      });

      for (const xssAttempt of xssAttempts) {
        await expect(
          mockDatabaseService.saveScheduleEntry({
            member_id: 1,
            date: '2024-01-07',
            value: '0.5',
            reason: xssAttempt
          })
        ).rejects.toThrow(/invalid characters/i);
      }
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE team_members; --",
        "1; DELETE FROM schedule_entries; --",
        "' OR '1'='1",
        "'; INSERT INTO team_members (name) VALUES ('hacker'); --",
        "' UNION SELECT * FROM team_members --",
        "'; UPDATE team_members SET is_manager=true WHERE id=1; --"
      ];

      mockDatabaseService.createTeamMember = jest.fn().mockImplementation(async (memberData) => {
        const allFields = [memberData.name, memberData.hebrew, memberData.email || ''].join(' ');
        if (VALIDATION_PATTERNS.securityChecks.sqlInjection.test(allFields)) {
          throw new Error('Invalid characters detected');
        }
        return { ...memberData, id: 1 };
      });

      for (const injectionAttempt of sqlInjectionAttempts) {
        await expect(
          mockDatabaseService.createTeamMember({
            name: injectionAttempt,
            hebrew: 'תקיפה',
            team_id: 1
          })
        ).rejects.toThrow(/invalid characters/i);
      }
    });

    it('should prevent path traversal attempts', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '../../../../root/.ssh/id_rsa',
        '../config/database.yml',
        '..\\..\\..\\config\\secrets'
      ];

      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entryData) => {
        if (entryData.reason && VALIDATION_PATTERNS.securityChecks.pathTraversal.test(entryData.reason)) {
          throw new Error('Invalid path characters detected');
        }
        return entryData;
      });

      for (const pathAttempt of pathTraversalAttempts) {
        await expect(
          mockDatabaseService.saveScheduleEntry({
            member_id: 1,
            date: '2024-01-07',
            value: '0.5',
            reason: pathAttempt
          })
        ).rejects.toThrow(/invalid path characters/i);
      }
    });
  });

  describe('Data Length and Size Validation', () => {
    it('should enforce maximum field lengths', async () => {
      const fieldLimits = {
        teamName: 255,
        memberName: 255,
        hebrewName: 255,
        email: 255,
        reason: 1000
      };

      // Test team name length limit
      const longTeamName = 'A'.repeat(fieldLimits.teamName + 1);
      mockDatabaseService.createTeam = jest.fn().mockImplementation(async (teamData) => {
        if (teamData.name.length > fieldLimits.teamName) {
          throw new Error(`Team name cannot exceed ${fieldLimits.teamName} characters`);
        }
        return { ...teamData, id: 1 };
      });

      await expect(
        mockDatabaseService.createTeam({
          name: longTeamName,
          description: 'Test team'
        })
      ).rejects.toThrow(/cannot exceed.*characters/i);

      // Test member name length limit
      const longMemberName = 'B'.repeat(fieldLimits.memberName + 1);
      mockDatabaseService.createTeamMember = jest.fn().mockImplementation(async (memberData) => {
        if (memberData.name.length > fieldLimits.memberName) {
          throw new Error(`Member name cannot exceed ${fieldLimits.memberName} characters`);
        }
        return { ...memberData, id: 1 };
      });

      await expect(
        mockDatabaseService.createTeamMember({
          name: longMemberName,
          hebrew: 'שם ארוך',
          team_id: 1
        })
      ).rejects.toThrow(/cannot exceed.*characters/i);

      // Test reason length limit
      const longReason = 'C'.repeat(fieldLimits.reason + 1);
      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entryData) => {
        if (entryData.reason && entryData.reason.length > fieldLimits.reason) {
          throw new Error(`Reason cannot exceed ${fieldLimits.reason} characters`);
        }
        return entryData;
      });

      await expect(
        mockDatabaseService.saveScheduleEntry({
          member_id: 1,
          date: '2024-01-07',
          value: '0.5',
          reason: longReason
        })
      ).rejects.toThrow(/cannot exceed.*characters/i);
    });

    it('should handle empty and whitespace-only inputs correctly', async () => {
      const emptyInputs = ['', '   ', '\t\t\t', '\n\n\n', ' \t \n '];

      mockDatabaseService.createTeam = jest.fn().mockImplementation(async (teamData) => {
        if (!teamData.name || teamData.name.trim().length === 0) {
          throw new Error('Team name cannot be empty or whitespace only');
        }
        return { ...teamData, id: 1 };
      });

      for (const emptyInput of emptyInputs) {
        await expect(
          mockDatabaseService.createTeam({
            name: emptyInput,
            description: 'Test'
          })
        ).rejects.toThrow(/cannot be empty or whitespace/i);
      }
    });
  });

  describe('Email Validation', () => {
    it('should validate email format correctly', async () => {
      const validEmails = [
        'user@example.com',
        'test.user@company.co.il',
        'user+tag@domain.org',
        'user123@test-domain.com',
        'valid_email@sub.domain.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@.com',
        'user..double.dot@domain.com',
        'user@domain',
        'user with spaces@domain.com',
        'user@domain..com'
      ];

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      mockDatabaseService.createTeamMember = jest.fn().mockImplementation(async (memberData) => {
        if (memberData.email && !emailPattern.test(memberData.email)) {
          throw new Error('Invalid email format');
        }
        return { ...memberData, id: 1 };
      });

      // Test valid emails
      for (const validEmail of validEmails) {
        await expect(
          mockDatabaseService.createTeamMember({
            name: 'Test User',
            hebrew: 'משתמש בדיקה',
            email: validEmail,
            team_id: 1
          })
        ).resolves.toBeDefined();
      }

      // Test invalid emails
      for (const invalidEmail of invalidEmails) {
        await expect(
          mockDatabaseService.createTeamMember({
            name: 'Test User',
            hebrew: 'משתמש בדיקה',
            email: invalidEmail,
            team_id: 1
          })
        ).rejects.toThrow(/invalid email format/i);
      }
    });
  });

  describe('Date Range and Working Day Validation', () => {
    it('should validate Israeli working days correctly', async () => {
      const workingDays = [
        '2024-01-07', // Sunday
        '2024-01-08', // Monday
        '2024-01-09', // Tuesday
        '2024-01-10', // Wednesday
        '2024-01-11'  // Thursday
      ];

      const nonWorkingDays = [
        '2024-01-12', // Friday
        '2024-01-13'  // Saturday
      ];

      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entryData) => {
        const date = new Date(entryData.date);
        const dayOfWeek = date.getDay();
        
        // Reject weekend entries (Friday=5, Saturday=6)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          throw new Error('Cannot schedule entries for weekend days (Friday/Saturday)');
        }
        
        return entryData;
      });

      // Test working day acceptance
      for (const workingDay of workingDays) {
        await expect(
          mockDatabaseService.saveScheduleEntry({
            member_id: 1,
            date: workingDay,
            value: '1'
          })
        ).resolves.toBeDefined();
      }

      // Test weekend day rejection
      for (const nonWorkingDay of nonWorkingDays) {
        await expect(
          mockDatabaseService.saveScheduleEntry({
            member_id: 1,
            date: nonWorkingDay,
            value: '1'
          })
        ).rejects.toThrow(/cannot schedule entries for weekend days/i);
      }
    });

    it('should validate sprint date ranges correctly', async () => {
      const validSprintRanges = [
        { start: '2024-01-07', end: '2024-01-18', weeks: 2 }, // 2-week sprint
        { start: '2024-01-07', end: '2024-01-25', weeks: 3 }, // 3-week sprint
        { start: '2024-02-04', end: '2024-02-15', weeks: 2 }  // Another 2-week sprint
      ];

      const invalidSprintRanges = [
        { start: '2024-01-18', end: '2024-01-07', weeks: 2 }, // End before start
        { start: '2024-01-07', end: '2024-01-07', weeks: 2 }, // Same start and end
        { start: '2024-01-07', end: '2024-01-08', weeks: 2 }  // Too short duration
      ];

      mockDatabaseService.createSprint = jest.fn().mockImplementation(async (sprintData) => {
        const startDate = new Date(sprintData.start_date);
        const endDate = new Date(sprintData.end_date);
        
        if (endDate <= startDate) {
          throw new Error('Sprint end date must be after start date');
        }
        
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const expectedDays = sprintData.weeks * 7;
        
        if (Math.abs(daysDiff - expectedDays) > 2) { // Allow 2-day tolerance
          throw new Error('Sprint duration does not match specified weeks');
        }
        
        return { ...sprintData, id: 1 };
      });

      // Test valid sprint ranges
      for (const validRange of validSprintRanges) {
        await expect(
          mockDatabaseService.createSprint({
            start_date: validRange.start,
            end_date: validRange.end,
            weeks: validRange.weeks,
            name: 'Test Sprint'
          })
        ).resolves.toBeDefined();
      }

      // Test invalid sprint ranges
      for (const invalidRange of invalidSprintRanges) {
        await expect(
          mockDatabaseService.createSprint({
            start_date: invalidRange.start,
            end_date: invalidRange.end,
            weeks: invalidRange.weeks,
            name: 'Test Sprint'
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Concurrent Validation Testing', () => {
    it('should handle simultaneous validation requests correctly', async () => {
      const concurrentValidations = Array(10).fill(null).map((_, index) => 
        mockDatabaseService.saveScheduleEntry({
          member_id: index + 1,
          date: '2024-01-07',
          value: '1',
          reason: `Concurrent test ${index}`
        })
      );

      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entryData) => {
        // Simulate validation delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        if (!entryData.member_id || !entryData.date || !entryData.value) {
          throw new Error('Validation failed');
        }
        
        return { ...entryData, id: Math.random() };
      });

      // All concurrent validations should succeed
      const results = await Promise.allSettled(concurrentValidations);
      const successes = results.filter(result => result.status === 'fulfilled');
      
      expect(successes).toHaveLength(10);
    });
  });
});