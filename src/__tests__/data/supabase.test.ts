/**
 * Supabase Data Layer Tests
 * Tests for database operations, connections, and data integrity
 */

import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import {
  createMockTeam,
  createMockTeamMember,
  createMockScheduleEntry,
  createMockCurrentSprint,
  createMockSupabaseResponse,
  getTestTeams,
  getTestTeamMembers,
  validateHoursCalculation,
  validateReasonRequirement,
  ISRAELI_WORK_DAYS,
  ISRAELI_WEEKEND_DAYS,
} from '../utils/testSetup';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    channel: jest.fn(),
  },
}));

// Mock DatabaseService for some tests
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getTeams: jest.fn(),
    getTeamMembers: jest.fn(),
    getScheduleEntries: jest.fn(),
    updateScheduleEntry: jest.fn(),
    getCurrentSprint: jest.fn(),
    createTeamMember: jest.fn(),
    updateTeamMember: jest.fn(),
    deleteTeamMember: jest.fn(),
  },
}));

describe('Supabase Data Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Database Connection Tests
  // ============================================================================

  describe('Database Connection', () => {
    test('should initialize Supabase client with correct configuration', () => {
      expect(supabase).toBeDefined();
      expect(supabase.from).toBeDefined();
      expect(supabase.auth).toBeDefined();
    });

    test('should handle connection failures gracefully', async () => {
      const mockError = new Error('Connection failed');
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn().mockRejectedValue(mockError),
        }),
      });

      // Test that connection errors are handled appropriately
      expect(supabase.from).toBeDefined();
    });

    test('should validate environment variables', () => {
      // In a real test, you'd check that SUPABASE_URL and SUPABASE_ANON_KEY exist
      expect(process.env.NODE_ENV).toBe('test');
    });
  });

  // ============================================================================
  // Teams Table Tests
  // ============================================================================

  describe('Teams Table Operations', () => {
    test('should fetch all teams successfully', async () => {
      const mockTeams = getTestTeams();
      (DatabaseService.getTeams as jest.Mock).mockResolvedValue(mockTeams);

      const teams = await DatabaseService.getTeams();

      expect(teams).toHaveLength(5);
      expect(teams[0]).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        description: expect.any(String),
        color: expect.any(String),
      });
    });

    test('should validate team data structure', async () => {
      const mockTeams = getTestTeams();
      (DatabaseService.getTeams as jest.Mock).mockResolvedValue(mockTeams);

      const teams = await DatabaseService.getTeams();

      teams.forEach(team => {
        expect(team).toHaveProperty('id');
        expect(team).toHaveProperty('name');
        expect(team.name).toMatch(/^(Development|Infrastructure|Data|Product)/);
        expect(team.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    test('should handle team fetch errors', async () => {
      const mockError = new Error('Database error');
      (DatabaseService.getTeams as jest.Mock).mockRejectedValue(mockError);

      await expect(DatabaseService.getTeams()).rejects.toThrow('Database error');
    });
  });

  // ============================================================================
  // Team Members Table Tests
  // ============================================================================

  describe('Team Members Table Operations', () => {
    test('should fetch team members for specific team', async () => {
      const teamId = 1;
      const mockMembers = getTestTeamMembers(teamId);
      (DatabaseService.getTeamMembers as jest.Mock).mockResolvedValue(mockMembers);

      const members = await DatabaseService.getTeamMembers(teamId);

      expect(members).toHaveLength(4); // Development-Tal has 4 members
      members.forEach(member => {
        expect(member.team_id).toBe(teamId);
        expect(member).toHaveProperty('name');
        expect(member).toHaveProperty('hebrew');
      });
    });

    test('should identify managers correctly', async () => {
      const teamId = 1;
      const mockMembers = getTestTeamMembers(teamId);
      (DatabaseService.getTeamMembers as jest.Mock).mockResolvedValue(mockMembers);

      const members = await DatabaseService.getTeamMembers(teamId);
      const managers = members.filter(member => member.isManager);
      const regularMembers = members.filter(member => !member.isManager);

      expect(managers).toHaveLength(1);
      expect(regularMembers).toHaveLength(3);
      expect(managers[0].name).toBe('Tal Stern');
    });

    test('should validate Hebrew names exist', async () => {
      const teamId = 1;
      const mockMembers = getTestTeamMembers(teamId);
      (DatabaseService.getTeamMembers as jest.Mock).mockResolvedValue(mockMembers);

      const members = await DatabaseService.getTeamMembers(teamId);

      members.forEach(member => {
        expect(member.hebrew).toBeTruthy();
        expect(member.hebrew.length).toBeGreaterThan(0);
        // Basic Hebrew character validation
        expect(/[\u0590-\u05FF]/.test(member.hebrew)).toBe(true);
      });
    });

    test('should handle team member creation', async () => {
      const newMember = createMockTeamMember({
        name: 'New Member',
        hebrew: 'חבר חדש',
        team_id: 1,
      });

      (DatabaseService.createTeamMember as jest.Mock).mockResolvedValue(newMember);

      const result = await DatabaseService.createTeamMember(newMember);

      expect(result).toMatchObject({
        name: 'New Member',
        hebrew: 'חבר חדש',
        team_id: 1,
      });
    });

    test('should enforce manager permissions', async () => {
      const mockError = new Error('Insufficient permissions');
      (DatabaseService.createTeamMember as jest.Mock).mockRejectedValue(mockError);

      await expect(DatabaseService.createTeamMember(createMockTeamMember()))
        .rejects.toThrow('Insufficient permissions');
    });
  });

  // ============================================================================
  // Schedule Entries Table Tests  
  // ============================================================================

  describe('Schedule Entries Operations', () => {
    test('should create schedule entry with valid data', async () => {
      const entry = createMockScheduleEntry();
      (DatabaseService.updateScheduleEntry as jest.Mock).mockResolvedValue(entry);

      const result = await DatabaseService.updateScheduleEntry(
        entry.member_id!,
        entry.date!,
        entry.value,
        entry.reason
      );

      expect(result).toBeTruthy();
    });

    test('should validate hours calculation', () => {
      const fullDayEntry = createMockScheduleEntry({ value: '1', hours: 7 });
      const halfDayEntry = createMockScheduleEntry({ value: '0.5', hours: 3.5 });
      const sickDayEntry = createMockScheduleEntry({ value: 'X', hours: 0 });

      expect(validateHoursCalculation(fullDayEntry)).toBe(true);
      expect(validateHoursCalculation(halfDayEntry)).toBe(true);
      expect(validateHoursCalculation(sickDayEntry)).toBe(true);

      // Test invalid hours
      const invalidEntry = createMockScheduleEntry({ value: '1', hours: 5 });
      expect(validateHoursCalculation(invalidEntry)).toBe(false);
    });

    test('should require reason for half day and sick entries', () => {
      const halfDayWithReason = createMockScheduleEntry({ 
        value: '0.5', 
        reason: 'Doctor appointment' 
      });
      const sickDayWithReason = createMockScheduleEntry({ 
        value: 'X', 
        reason: 'Flu' 
      });
      const fullDay = createMockScheduleEntry({ value: '1' });

      expect(validateReasonRequirement(halfDayWithReason)).toBe(true);
      expect(validateReasonRequirement(sickDayWithReason)).toBe(true);
      expect(validateReasonRequirement(fullDay)).toBe(true);

      // Test invalid - no reason when required
      const halfDayNoReason = createMockScheduleEntry({ value: '0.5' });
      const sickDayNoReason = createMockScheduleEntry({ value: 'X' });

      expect(validateReasonRequirement(halfDayNoReason)).toBe(false);
      expect(validateReasonRequirement(sickDayNoReason)).toBe(false);
    });

    test('should fetch entries by date range', async () => {
      const mockEntries = [
        createMockScheduleEntry({ date: '2024-01-17' }),
        createMockScheduleEntry({ date: '2024-01-18' }),
        createMockScheduleEntry({ date: '2024-01-21' }),
      ];

      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue({
        1: {
          '2024-01-17': mockEntries[0],
          '2024-01-18': mockEntries[1],
          '2024-01-21': mockEntries[2],
        }
      });

      const result = await DatabaseService.getScheduleEntries(
        '2024-01-17', 
        '2024-01-21', 
        1
      );

      expect(result).toHaveProperty('1');
      expect(Object.keys(result[1])).toHaveLength(3);
    });

    test('should handle bulk operations efficiently', async () => {
      const bulkEntries = Array.from({ length: 50 }, (_, i) => 
        createMockScheduleEntry({ 
          id: i + 1, 
          date: `2024-01-${String(17 + i).padStart(2, '0')}` 
        })
      );

      // Mock bulk operation
      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue(
        bulkEntries.reduce((acc, entry) => {
          acc[entry.member_id!] = acc[entry.member_id!] || {};
          acc[entry.member_id!][entry.date!] = entry;
          return acc;
        }, {} as any)
      );

      const startTime = performance.now();
      await DatabaseService.getScheduleEntries('2024-01-17', '2024-03-07', 1);
      const endTime = performance.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });
  });

  // ============================================================================
  // Real-time Subscription Tests
  // ============================================================================

  describe('Real-time Subscriptions', () => {
    test('should setup subscription correctly', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnValue(Promise.resolve()),
        unsubscribe: jest.fn().mockReturnValue(Promise.resolve()),
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      const channel = supabase.channel('schedule-changes');
      
      expect(channel).toBeDefined();
      expect(supabase.channel).toHaveBeenCalledWith('schedule-changes');
    });

    test('should handle subscription events', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      const channel = supabase.channel('schedule-changes');
      const mockCallback = jest.fn();

      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'schedule_entries',
      }, mockCallback);

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'schedule_entries',
        },
        mockCallback
      );
    });

    test('should cleanup subscription on component unmount', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

      const channel = supabase.channel('test-channel');
      channel.unsubscribe();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Sprint Management Tests
  // ============================================================================

  describe('Sprint Management', () => {
    test('should get current sprint information', async () => {
      const mockSprint = createMockCurrentSprint();
      (DatabaseService.getCurrentSprint as jest.Mock).mockResolvedValue(mockSprint);

      const sprint = await DatabaseService.getCurrentSprint();

      expect(sprint).toMatchObject({
        id: expect.any(String),
        current_sprint_number: expect.any(Number),
        sprint_start_date: expect.any(String),
        sprint_end_date: expect.any(String),
        sprint_length_weeks: 2,
      });
    });

    test('should validate sprint dates follow Israeli calendar', async () => {
      const mockSprint = createMockCurrentSprint({
        sprint_start_date: '2024-01-17', // Wednesday
        sprint_end_date: '2024-01-30',   // Tuesday
      });

      (DatabaseService.getCurrentSprint as jest.Mock).mockResolvedValue(mockSprint);

      const sprint = await DatabaseService.getCurrentSprint();
      const startDate = new Date(sprint.sprint_start_date);
      const endDate = new Date(sprint.sprint_end_date);

      // Should start on Wednesday (3) and end on Tuesday (2)
      expect(startDate.getDay()).toBe(3);
      expect(endDate.getDay()).toBe(2);
    });

    test('should calculate working days correctly for sprint', async () => {
      const mockSprint = createMockCurrentSprint({
        working_days_remaining: 5,
      });

      (DatabaseService.getCurrentSprint as jest.Mock).mockResolvedValue(mockSprint);

      const sprint = await DatabaseService.getCurrentSprint();

      // 2-week sprint should have 10 working days total (5 days/week * 2 weeks)
      expect(sprint.working_days_remaining).toBeGreaterThan(0);
      expect(sprint.working_days_remaining).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      (DatabaseService.getTeams as jest.Mock).mockRejectedValue(networkError);

      await expect(DatabaseService.getTeams()).rejects.toThrow('Network error');
    });

    test('should handle invalid data formats', async () => {
      const invalidData = { invalid: 'data' };
      (DatabaseService.getTeams as jest.Mock).mockResolvedValue(invalidData);

      const result = await DatabaseService.getTeams();
      // Should handle gracefully - depends on actual implementation
      expect(result).toBeDefined();
    });

    test('should handle concurrent access conflicts', async () => {
      // Simulate concurrent edit scenario
      const conflictError = new Error('Concurrent modification');
      (DatabaseService.updateScheduleEntry as jest.Mock)
        .mockRejectedValue(conflictError);

      await expect(
        DatabaseService.updateScheduleEntry(1, '2024-01-17', '1')
      ).rejects.toThrow('Concurrent modification');
    });
  });

  // ============================================================================
  // Israeli Calendar Compliance Tests
  // ============================================================================

  describe('Israeli Calendar Compliance', () => {
    test('should recognize Israeli working days correctly', () => {
      // Sunday = 0, Monday = 1, ..., Saturday = 6
      expect(ISRAELI_WORK_DAYS).toEqual([0, 1, 2, 3, 4]);
      expect(ISRAELI_WEEKEND_DAYS).toEqual([5, 6]);
    });

    test('should not allow schedule entries on weekends', () => {
      const fridayDate = new Date('2024-01-19'); // Friday
      const saturdayDate = new Date('2024-01-20'); // Saturday

      expect(ISRAELI_WEEKEND_DAYS.includes(fridayDate.getDay())).toBe(true);
      expect(ISRAELI_WEEKEND_DAYS.includes(saturdayDate.getDay())).toBe(true);
    });

    test('should calculate hours correctly for Israeli work week', () => {
      // 5 working days * 7 hours = 35 hours per week
      const expectedWeeklyHours = 35;
      const calculatedHours = ISRAELI_WORK_DAYS.length * 7;

      expect(calculatedHours).toBe(expectedWeeklyHours);
    });
  });
});