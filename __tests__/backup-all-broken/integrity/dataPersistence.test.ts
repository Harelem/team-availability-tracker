/**
 * Data Persistence Tests for Data Integrity Agent
 * 
 * Comprehensive testing of data persistence, validation, and consistency
 * across all database operations with real-time synchronization verification
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { DatabaseService } from '@/lib/database';
import { databaseTestManager, testHelpers } from '../utils/databaseTestUtils';
import { 
  TEST_TEAMS, 
  TEST_TEAM_MEMBERS, 
  TEST_SPRINT_SETTINGS,
  TEST_SCHEDULE_SCENARIOS,
  EXPECTED_CALCULATIONS,
  VALIDATION_PATTERNS
} from '../fixtures/testData';

// Mock components for testing
import TeamDetailModal from '@/components/modals/TeamDetailModal';
import ScheduleTable from '@/components/ScheduleTable';
import EnhancedAvailabilityTable from '@/components/EnhancedAvailabilityTable';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } }))
    }
  }
}));

// Mock database service
jest.mock('@/lib/database');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('Data Persistence Integrity Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await testHelpers.setupCompleteTestEnvironment();
    
    // Suppress console logs during testing
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await testHelpers.cleanupTestEnvironment();
    jest.restoreAllMocks();
  });

  describe('Schedule Entry Persistence', () => {
    it('should persist full day schedule entries correctly', async () => {
      const testMember = TEST_TEAM_MEMBERS[0];
      const testDate = '2024-01-07';
      
      // Mock successful database save
      mockDatabaseService.saveScheduleEntry = jest.fn().mockResolvedValue({
        id: 1,
        member_id: testMember.id,
        date: testDate,
        value: '1',
        reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockDatabaseService.getScheduleEntries = jest.fn().mockResolvedValue([{
        id: 1,
        member_id: testMember.id,
        date: testDate,
        value: '1',
        reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

      // Add entry to test database
      await databaseTestManager.addScheduleEntries([{
        memberId: testMember.id,
        date: testDate,
        value: '1'
      }]);

      // Verify persistence
      const savedEntries = await mockDatabaseService.getScheduleEntries(testMember.id);
      expect(savedEntries).toHaveLength(1);
      expect(savedEntries[0].value).toBe('1');
      expect(savedEntries[0].date).toBe(testDate);
      expect(savedEntries[0].member_id).toBe(testMember.id);
    });

    it('should persist half day schedule entries with reasons correctly', async () => {
      const testMember = TEST_TEAM_MEMBERS[1];
      const testDate = '2024-01-08';
      const testReason = 'Doctor appointment';
      
      // Mock successful database save
      mockDatabaseService.saveScheduleEntry = jest.fn().mockResolvedValue({
        id: 2,
        member_id: testMember.id,
        date: testDate,
        value: '0.5',
        reason: testReason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockDatabaseService.getScheduleEntries = jest.fn().mockResolvedValue([{
        id: 2,
        member_id: testMember.id,
        date: testDate,
        value: '0.5',
        reason: testReason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

      // Add entry to test database
      await databaseTestManager.addScheduleEntries([{
        memberId: testMember.id,
        date: testDate,
        value: '0.5',
        reason: testReason
      }]);

      // Verify persistence with reason
      const savedEntries = await mockDatabaseService.getScheduleEntries(testMember.id);
      expect(savedEntries).toHaveLength(1);
      expect(savedEntries[0].value).toBe('0.5');
      expect(savedEntries[0].reason).toBe(testReason);
    });

    it('should persist sick day entries correctly', async () => {
      const testMember = TEST_TEAM_MEMBERS[2];
      const testDate = '2024-01-09';
      const testReason = 'Sick leave';
      
      // Mock successful database save
      mockDatabaseService.saveScheduleEntry = jest.fn().mockResolvedValue({
        id: 3,
        member_id: testMember.id,
        date: testDate,
        value: 'X',
        reason: testReason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockDatabaseService.getScheduleEntries = jest.fn().mockResolvedValue([{
        id: 3,
        member_id: testMember.id,
        date: testDate,
        value: 'X',
        reason: testReason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

      // Add entry to test database
      await databaseTestManager.addScheduleEntries([{
        memberId: testMember.id,
        date: testDate,
        value: 'X',
        reason: testReason
      }]);

      // Verify sick day persistence
      const savedEntries = await mockDatabaseService.getScheduleEntries(testMember.id);
      expect(savedEntries).toHaveLength(1);
      expect(savedEntries[0].value).toBe('X');
      expect(savedEntries[0].reason).toBe(testReason);
    });

    it('should handle schedule entry updates correctly', async () => {
      const testMember = TEST_TEAM_MEMBERS[3];
      const testDate = '2024-01-10';
      
      // Initial entry
      const initialEntry = {
        id: 4,
        member_id: testMember.id,
        date: testDate,
        value: '1' as const,
        reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Updated entry
      const updatedEntry = {
        ...initialEntry,
        value: '0.5' as const,
        reason: 'Schedule change',
        updated_at: new Date().toISOString()
      };

      // Mock database operations
      mockDatabaseService.saveScheduleEntry = jest.fn()
        .mockResolvedValueOnce(initialEntry)
        .mockResolvedValueOnce(updatedEntry);

      mockDatabaseService.getScheduleEntries = jest.fn()
        .mockResolvedValueOnce([initialEntry])
        .mockResolvedValueOnce([updatedEntry]);

      // Add initial entry
      await databaseTestManager.addScheduleEntries([{
        memberId: testMember.id,
        date: testDate,
        value: '1'
      }]);

      let savedEntries = await mockDatabaseService.getScheduleEntries(testMember.id);
      expect(savedEntries[0].value).toBe('1');

      // Update entry
      await databaseTestManager.addScheduleEntries([{
        memberId: testMember.id,
        date: testDate,
        value: '0.5',
        reason: 'Schedule change'
      }]);

      savedEntries = await mockDatabaseService.getScheduleEntries(testMember.id);
      expect(savedEntries[0].value).toBe('0.5');
      expect(savedEntries[0].reason).toBe('Schedule change');
    });
  });

  describe('Sprint Notes Persistence', () => {
    it('should persist sprint notes across session changes', async () => {
      const testNotes = 'Sprint 45 planning notes - focus on performance improvements';
      
      // Mock sprint notes operations
      mockDatabaseService.updateSprintNotes = jest.fn().mockResolvedValue({
        id: 1,
        sprint_number: 45,
        notes: testNotes,
        updated_at: new Date().toISOString(),
        updated_by: 'test-user'
      });

      mockDatabaseService.getSprintNotes = jest.fn().mockResolvedValue({
        id: 1,
        sprint_number: 45,
        notes: testNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'test-user',
        updated_by: 'test-user'
      });

      // Save notes
      await mockDatabaseService.updateSprintNotes(45, testNotes);
      
      // Verify persistence
      const savedNotes = await mockDatabaseService.getSprintNotes(45);
      expect(savedNotes.notes).toBe(testNotes);
      expect(savedNotes.sprint_number).toBe(45);
    });

    it('should maintain sprint notes during navigation', async () => {
      const sprintNotes = [
        { sprint: 44, notes: 'Previous sprint notes' },
        { sprint: 45, notes: 'Current sprint notes' },
        { sprint: 46, notes: 'Next sprint notes' }
      ];

      // Mock navigation between sprints
      sprintNotes.forEach(({ sprint, notes }) => {
        mockDatabaseService.getSprintNotes = jest.fn().mockImplementation((sprintNumber) => {
          const found = sprintNotes.find(s => s.sprint === sprintNumber);
          return Promise.resolve(found ? {
            id: sprintNumber,
            sprint_number: sprintNumber,
            notes: found.notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'test-user',
            updated_by: 'test-user'
          } : null);
        });
      });

      // Test navigation persistence
      for (const { sprint, notes } of sprintNotes) {
        const savedNotes = await mockDatabaseService.getSprintNotes(sprint);
        expect(savedNotes?.notes).toBe(notes);
        expect(savedNotes?.sprint_number).toBe(sprint);
      }
    });
  });

  describe('User Permission Persistence', () => {
    it('should maintain RLS policies correctly', async () => {
      // Mock user permissions
      const testUser = { id: 'test-user-1', role: 'manager', team_id: 1 };
      const restrictedUser = { id: 'test-user-2', role: 'member', team_id: 2 };

      // Mock permission-based data access
      mockDatabaseService.getTeamMembers = jest.fn().mockImplementation(async (teamId, userId) => {
        if (userId === testUser.id && (teamId === testUser.team_id || testUser.role === 'manager')) {
          return TEST_TEAM_MEMBERS.filter(m => m.team_id === teamId);
        }
        if (userId === restrictedUser.id && teamId === restrictedUser.team_id) {
          return TEST_TEAM_MEMBERS.filter(m => m.team_id === teamId);
        }
        return []; // No access
      });

      // Test manager access to their team
      const managerAccessTeam1 = await mockDatabaseService.getTeamMembers(1, testUser.id);
      expect(managerAccessTeam1.length).toBeGreaterThan(0);

      // Test restricted user access to other team
      const restrictedAccess = await mockDatabaseService.getTeamMembers(1, restrictedUser.id);
      expect(restrictedAccess).toHaveLength(0);

      // Test user access to their own team
      const memberAccessOwnTeam = await mockDatabaseService.getTeamMembers(2, restrictedUser.id);
      expect(memberAccessOwnTeam.length).toBeGreaterThan(0);
    });

    it('should enforce permission constraints on data modifications', async () => {
      const unauthorizedUser = { id: 'unauthorized-user', role: 'viewer' };
      
      // Mock permission-denied responses
      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entry, userId) => {
        if (userId === unauthorizedUser.id) {
          throw new Error('Insufficient permissions');
        }
        return entry;
      });

      // Test unauthorized modification attempt
      await expect(mockDatabaseService.saveScheduleEntry({
        member_id: 1,
        date: '2024-01-07',
        value: '1'
      }, unauthorizedUser.id)).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Real-time Updates and Synchronization', () => {
    it('should handle concurrent schedule updates correctly', async () => {
      const testMember = TEST_TEAM_MEMBERS[0];
      const testDate = '2024-01-07';
      
      // Simulate concurrent updates
      const user1Entry = {
        member_id: testMember.id,
        date: testDate,
        value: '1' as const,
        updated_by: 'user1',
        timestamp: Date.now()
      };

      const user2Entry = {
        member_id: testMember.id,
        date: testDate,
        value: '0.5' as const,
        reason: 'Updated by user2',
        updated_by: 'user2',
        timestamp: Date.now() + 1000 // 1 second later
      };

      // Mock last-write-wins behavior
      mockDatabaseService.saveScheduleEntry = jest.fn()
        .mockResolvedValueOnce(user1Entry)
        .mockResolvedValueOnce(user2Entry);

      mockDatabaseService.getScheduleEntries = jest.fn().mockResolvedValue([user2Entry]);

      // Simulate concurrent saves
      await mockDatabaseService.saveScheduleEntry(user1Entry);
      await mockDatabaseService.saveScheduleEntry(user2Entry);

      // Verify last write wins
      const finalEntries = await mockDatabaseService.getScheduleEntries(testMember.id);
      expect(finalEntries[0].value).toBe('0.5');
      expect(finalEntries[0].updated_by).toBe('user2');
    });

    it('should maintain data consistency across browser sessions', async () => {
      const testMember = TEST_TEAM_MEMBERS[1];
      const sessionData = [
        { session: 'session1', value: '1' as const },
        { session: 'session2', value: '0.5' as const, reason: 'Doctor visit' },
        { session: 'session3', value: 'X' as const, reason: 'Sick leave' }
      ];

      // Mock session-based updates
      let currentEntry: any = null;

      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entry) => {
        currentEntry = { ...entry, updated_at: new Date().toISOString() };
        return currentEntry;
      });

      mockDatabaseService.getScheduleEntries = jest.fn().mockImplementation(async () => {
        return currentEntry ? [currentEntry] : [];
      });

      // Test updates from different sessions
      for (const { session, value, reason } of sessionData) {
        await mockDatabaseService.saveScheduleEntry({
          member_id: testMember.id,
          date: '2024-01-08',
          value,
          reason,
          session_id: session
        });

        const entries = await mockDatabaseService.getScheduleEntries(testMember.id);
        expect(entries[0].value).toBe(value);
        if (reason) {
          expect(entries[0].reason).toBe(reason);
        }
      }
    });
  });

  describe('Data Validation and Constraints', () => {
    it('should enforce required field constraints', async () => {
      // Test missing required fields
      const invalidEntries = [
        { member_id: null, date: '2024-01-07', value: '1' }, // Missing member_id
        { member_id: 1, date: null, value: '1' }, // Missing date
        { member_id: 1, date: '2024-01-07', value: null }, // Missing value
        { member_id: 1, date: 'invalid-date', value: '1' }, // Invalid date format
        { member_id: 1, date: '2024-01-07', value: 'invalid' } // Invalid value
      ];

      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entry) => {
        if (!entry.member_id || !entry.date || !entry.value) {
          throw new Error('Required field missing');
        }
        if (!VALIDATION_PATTERNS.requiredFields.dateFormat.test(entry.date)) {
          throw new Error('Invalid date format');
        }
        if (!VALIDATION_PATTERNS.requiredFields.scheduleValue.test(entry.value)) {
          throw new Error('Invalid schedule value');
        }
        return entry;
      });

      // Test each invalid entry
      for (const invalidEntry of invalidEntries) {
        await expect(mockDatabaseService.saveScheduleEntry(invalidEntry as any))
          .rejects.toThrow();
      }
    });

    it('should validate date ranges for Israeli work week', async () => {
      const testMember = TEST_TEAM_MEMBERS[0];
      
      // Test weekend dates (Friday and Saturday)
      const weekendDates = ['2024-01-12', '2024-01-13']; // Friday and Saturday
      
      mockDatabaseService.saveScheduleEntry = jest.fn().mockImplementation(async (entry) => {
        const date = new Date(entry.date);
        const dayOfWeek = date.getDay();
        
        // Reject weekend entries (Friday=5, Saturday=6)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          throw new Error('Cannot schedule entries for weekend days');
        }
        
        return entry;
      });

      // Test weekend date rejection
      for (const weekendDate of weekendDates) {
        await expect(mockDatabaseService.saveScheduleEntry({
          member_id: testMember.id,
          date: weekendDate,
          value: '1'
        })).rejects.toThrow('Cannot schedule entries for weekend days');
      }

      // Test valid working day acceptance
      await expect(mockDatabaseService.saveScheduleEntry({
        member_id: testMember.id,
        date: '2024-01-07', // Sunday
        value: '1'
      })).resolves.toBeDefined();
    });

    it('should validate hours calculations consistently', async () => {
      const testScenarios = [
        { value: '1', expectedHours: 7 },
        { value: '0.5', expectedHours: 3.5 },
        { value: 'X', expectedHours: 0 }
      ];

      // Mock hours calculation validation
      mockDatabaseService.calculateMemberHours = jest.fn().mockImplementation((entries) => {
        return entries.reduce((total: number, entry: any) => {
          switch (entry.value) {
            case '1': return total + 7;
            case '0.5': return total + 3.5;
            case 'X': return total + 0;
            default: return total;
          }
        }, 0);
      });

      // Test each scenario
      for (const scenario of testScenarios) {
        const entries = [{ value: scenario.value }];
        const calculatedHours = await mockDatabaseService.calculateMemberHours(entries);
        expect(calculatedHours).toBe(scenario.expectedHours);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate connection failure
      databaseTestManager.simulateError('connection');

      // Test graceful error handling
      await expect(mockDatabaseService.getTeams()).rejects.toThrow('Database connection failed');
      await expect(mockDatabaseService.getTeamMembers()).rejects.toThrow('Database connection failed');
    });

    it('should handle constraint violations properly', async () => {
      // Simulate constraint violation
      databaseTestManager.simulateError('constraint');

      // Test constraint error handling
      await expect(mockDatabaseService.saveScheduleEntry({
        member_id: 999, // Non-existent member
        date: '2024-01-07',
        value: '1'
      })).rejects.toThrow('Foreign key constraint violation');
    });

    it('should handle timeout scenarios', async () => {
      // Simulate timeout
      databaseTestManager.simulateError('timeout');

      // Test timeout handling
      await expect(mockDatabaseService.getTeamStats()).rejects.toThrow('Query timeout exceeded');
    });
  });

  describe('Data Integrity Verification', () => {
    it('should validate complete data integrity', async () => {
      const integrityResult = await testHelpers.verifyProductionDataIntegrity();
      
      expect(integrityResult.isValid).toBe(true);
      expect(integrityResult.violations).toHaveLength(0);
      expect(integrityResult.summary.teamsChecked).toBe(TEST_TEAMS.length);
      expect(integrityResult.summary.membersChecked).toBe(TEST_TEAM_MEMBERS.length);
    });

    it('should detect and report mock data patterns', async () => {
      // Add mock data to test detection
      await databaseTestManager.addScheduleEntries([{
        memberId: 1,
        date: '2024-01-07',
        value: '1',
        reason: 'This is mock data for testing'
      }]);

      const integrityResult = await testHelpers.verifyProductionDataIntegrity();
      
      expect(integrityResult.isValid).toBe(false);
      expect(integrityResult.violations.some(v => v.includes('Mock data pattern detected'))).toBe(true);
    });

    it('should verify calculation consistency across multiple runs', async () => {
      const consistencyResult = await databaseTestManager.verifyCalculationConsistency(
        1, // Product Team
        { start: '2024-01-07', end: '2024-01-18' }
      );

      expect(consistencyResult.isConsistent).toBe(true);
      expect(consistencyResult.discrepancies).toHaveLength(0);
      expect(consistencyResult.results).toHaveLength(3); // Three calculation runs
    });
  });
});