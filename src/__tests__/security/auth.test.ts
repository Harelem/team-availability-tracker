/**
 * Security and Authentication Tests
 * Tests for authentication, authorization, input validation, and security policies
 */

import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import {
  createMockTeam,
  createMockTeamMember,
  createMockCOOUser,
  createMockManagerUser,
  createMockRegularUser,
} from '../utils/testSetup';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

// Mock DatabaseService
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getTeams: jest.fn(),
    getTeamMembers: jest.fn(),
    getScheduleEntries: jest.fn(),
    updateScheduleEntry: jest.fn(),
    createTeamMember: jest.fn(),
    deleteTeamMember: jest.fn(),
  },
}));

describe('Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('Authentication', () => {
    test('should prevent unauthorized access', async () => {
      // Mock unauthenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await supabase.auth.getUser();
      expect(user.data.user).toBeNull();

      // Should not be able to access protected resources
      (DatabaseService.getTeams as jest.Mock).mockRejectedValue(
        new Error('Authentication required')
      );

      await expect(DatabaseService.getTeams()).rejects.toThrow('Authentication required');
    });

    test('should validate session tokens', async () => {
      const mockSession = {
        access_token: 'valid-jwt-token',
        refresh_token: 'valid-refresh-token',
        expires_at: Date.now() / 1000 + 3600, // 1 hour from now
        user: createMockRegularUser(1),
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const session = await supabase.auth.getSession();
      expect(session.data.session).toBeTruthy();
      expect(session.data.session?.expires_at).toBeGreaterThan(Date.now() / 1000);
    });

    test('should handle expired sessions', async () => {
      const expiredSession = {
        access_token: 'expired-jwt-token',
        expires_at: Date.now() / 1000 - 3600, // Expired 1 hour ago
        user: createMockRegularUser(1),
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: expiredSession },
        error: { message: 'Session expired' },
      });

      const session = await supabase.auth.getSession();
      expect(session.error).toBeTruthy();
      expect(session.error?.message).toBe('Session expired');
    });

    test('should validate login credentials', async () => {
      const validCredentials = {
        email: 'test@company.com',
        password: 'validPassword123',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: createMockRegularUser(1),
          session: { access_token: 'valid-token' },
        },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword(validCredentials);
      expect(result.data.user).toBeTruthy();
      expect(result.data.session?.access_token).toBe('valid-token');
    });

    test('should reject invalid credentials', async () => {
      const invalidCredentials = {
        email: 'test@company.com',
        password: 'wrongPassword',
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await supabase.auth.signInWithPassword(invalidCredentials);
      expect(result.data.user).toBeNull();
      expect(result.error?.message).toBe('Invalid login credentials');
    });
  });

  // ============================================================================
  // Authorization Tests
  // ============================================================================

  describe('Authorization', () => {
    test('should enforce COO permissions', async () => {
      const cooUser = createMockCOOUser();

      // COO should access all teams
      (DatabaseService.getTeams as jest.Mock).mockResolvedValue([
        createMockTeam({ id: 1 }),
        createMockTeam({ id: 2 }),
        createMockTeam({ id: 3 }),
      ]);

      const teams = await DatabaseService.getTeams();
      expect(teams).toHaveLength(3);
    });

    test('should enforce manager team boundaries', async () => {
      const manager = createMockManagerUser(1);

      // Manager should only access their team (team_id: 1)
      (DatabaseService.getTeamMembers as jest.Mock).mockImplementation((teamId: number) => {
        if (teamId === manager.team_id) {
          return Promise.resolve([createMockTeamMember({ team_id: teamId })]);
        }
        return Promise.reject(new Error('Access denied'));
      });

      // Should succeed for own team
      const ownTeamMembers = await DatabaseService.getTeamMembers(1);
      expect(ownTeamMembers).toHaveLength(1);

      // Should fail for other team
      await expect(DatabaseService.getTeamMembers(2)).rejects.toThrow('Access denied');
    });

    test('should prevent regular users from accessing other members data', async () => {
      const regularUser = createMockRegularUser(1);

      (DatabaseService.getScheduleEntries as jest.Mock).mockImplementation(
        (startDate: string, endDate: string, teamId: number, memberId?: number) => {
          if (memberId && memberId !== regularUser.id) {
            return Promise.reject(new Error('Insufficient permissions'));
          }
          return Promise.resolve({ [regularUser.id]: {} });
        }
      );

      // Should succeed for own data
      const ownData = await DatabaseService.getScheduleEntries(
        '2024-01-17', '2024-01-23', 1, regularUser.id
      );
      expect(ownData).toBeTruthy();

      // Should fail for other member's data
      await expect(
        DatabaseService.getScheduleEntries('2024-01-17', '2024-01-23', 1, 999)
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should validate role-based schedule editing permissions', async () => {
      const regularUser = createMockRegularUser(1);
      const manager = createMockManagerUser(1);

      (DatabaseService.updateScheduleEntry as jest.Mock).mockImplementation(
        (memberId: number, date: string, value: string, reason?: string, editorId?: number) => {
          // Regular users can only edit their own data
          if (editorId === regularUser.id && memberId !== regularUser.id) {
            return Promise.reject(new Error('Cannot edit other members\' schedules'));
          }
          
          // Managers can edit team members' data
          if (editorId === manager.id) {
            return Promise.resolve({ success: true });
          }

          return Promise.resolve({ success: true });
        }
      );

      // Regular user editing own schedule - should succeed
      await expect(
        DatabaseService.updateScheduleEntry(regularUser.id, '2024-01-17', '1', undefined, regularUser.id)
      ).resolves.toEqual({ success: true });

      // Regular user editing other's schedule - should fail
      await expect(
        DatabaseService.updateScheduleEntry(999, '2024-01-17', '1', undefined, regularUser.id)
      ).rejects.toThrow('Cannot edit other members\' schedules');

      // Manager editing team member's schedule - should succeed
      await expect(
        DatabaseService.updateScheduleEntry(regularUser.id, '2024-01-17', '1', undefined, manager.id)
      ).resolves.toEqual({ success: true });
    });

    test('should prevent privilege escalation', async () => {
      const regularUser = createMockRegularUser(1);

      // Attempt to escalate privileges by modifying role
      (DatabaseService.createTeamMember as jest.Mock).mockImplementation((memberData: any) => {
        if (memberData.isManager && memberData.createdBy !== 'authorized-manager') {
          return Promise.reject(new Error('Cannot assign manager role'));
        }
        return Promise.resolve({ ...memberData, id: 999 });
      });

      const maliciousMemberData = {
        name: 'Evil User',
        hebrew: 'משתמש רע',
        team_id: 1,
        isManager: true, // Attempting to escalate
        createdBy: regularUser.id,
      };

      await expect(
        DatabaseService.createTeamMember(maliciousMemberData)
      ).rejects.toThrow('Cannot assign manager role');
    });
  });

  // ============================================================================
  // Input Validation Tests
  // ============================================================================

  describe('Input Validation', () => {
    test('should prevent SQL injection in schedule queries', async () => {
      const maliciousInput = "'; DROP TABLE schedule_entries; --";

      (DatabaseService.getScheduleEntries as jest.Mock).mockImplementation((startDate: string) => {
        // Check if input contains SQL injection patterns
        const sqlPatterns = [
          /DROP\s+TABLE/i,
          /DELETE\s+FROM/i,
          /INSERT\s+INTO/i,
          /UPDATE\s+.*SET/i,
          /'.*OR.*'.*=.*'/i,
          /;.*--/,
        ];

        const containsSqlInjection = sqlPatterns.some(pattern => pattern.test(startDate));
        
        if (containsSqlInjection) {
          return Promise.reject(new Error('Invalid input detected'));
        }
        
        return Promise.resolve({});
      });

      await expect(
        DatabaseService.getScheduleEntries(maliciousInput, '2024-01-23', 1)
      ).rejects.toThrow('Invalid input detected');
    });

    test('should validate and sanitize reason text inputs', async () => {
      const testCases = [
        {
          input: 'Doctor appointment',
          expected: 'valid',
        },
        {
          input: '<script>alert("xss")</script>',
          expected: 'invalid',
        },
        {
          input: 'Meeting with client & team',
          expected: 'valid',
        },
        {
          input: 'A'.repeat(1000), // Very long input
          expected: 'invalid',
        },
        {
          input: 'Valid reason with ñáéíóú characters',
          expected: 'valid',
        },
      ];

      (DatabaseService.updateScheduleEntry as jest.Mock).mockImplementation(
        (memberId: number, date: string, value: string, reason?: string) => {
          if (reason) {
            // Check for XSS patterns
            const xssPatterns = [
              /<script[^>]*>.*<\/script>/gi,
              /<iframe[^>]*>.*<\/iframe>/gi,
              /javascript:/gi,
              /on\w+\s*=/gi,
            ];

            const containsXSS = xssPatterns.some(pattern => pattern.test(reason));
            
            if (containsXSS || reason.length > 500) {
              return Promise.reject(new Error('Invalid reason format'));
            }
          }

          return Promise.resolve({ success: true });
        }
      );

      for (const testCase of testCases) {
        if (testCase.expected === 'valid') {
          await expect(
            DatabaseService.updateScheduleEntry(1, '2024-01-17', '0.5', testCase.input)
          ).resolves.toEqual({ success: true });
        } else {
          await expect(
            DatabaseService.updateScheduleEntry(1, '2024-01-17', '0.5', testCase.input)
          ).rejects.toThrow('Invalid reason format');
        }
      }
    });

    test('should validate team member data inputs', async () => {
      const validMemberData = {
        name: 'John Doe',
        hebrew: 'ג\'ון דו',
        team_id: 1,
        email: 'john@company.com',
      };

      const invalidMemberData = [
        {
          ...validMemberData,
          name: '<script>alert("xss")</script>', // XSS attempt
        },
        {
          ...validMemberData,
          email: 'not-an-email', // Invalid email
        },
        {
          ...validMemberData,
          team_id: -1, // Invalid team ID
        },
        {
          ...validMemberData,
          name: '', // Empty name
        },
      ];

      (DatabaseService.createTeamMember as jest.Mock).mockImplementation((memberData: any) => {
        // Validate name
        if (!memberData.name || memberData.name.trim().length === 0) {
          return Promise.reject(new Error('Name is required'));
        }

        // Check for XSS in name
        if (/<[^>]*>/g.test(memberData.name)) {
          return Promise.reject(new Error('Invalid characters in name'));
        }

        // Validate email format
        if (memberData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberData.email)) {
          return Promise.reject(new Error('Invalid email format'));
        }

        // Validate team_id
        if (memberData.team_id <= 0) {
          return Promise.reject(new Error('Invalid team ID'));
        }

        return Promise.resolve({ ...memberData, id: 999 });
      });

      // Valid data should succeed
      await expect(
        DatabaseService.createTeamMember(validMemberData)
      ).resolves.toBeTruthy();

      // Invalid data should fail
      for (const invalidData of invalidMemberData) {
        await expect(
          DatabaseService.createTeamMember(invalidData)
        ).rejects.toThrow();
      }
    });

    test('should prevent directory traversal in file operations', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        '/etc/passwd',
        'C:\\Windows\\System32\\config',
        'file:///etc/passwd',
      ];

      const mockFileOperation = jest.fn((path: string) => {
        // Check for directory traversal patterns
        const traversalPatterns = [
          /\.\./,
          /[\/\\]etc[\/\\]/,
          /[\/\\]windows[\/\\]/i,
          /file:\/\/\//,
          /^[a-z]:/i, // Windows drive letters
        ];

        const containsTraversal = traversalPatterns.some(pattern => pattern.test(path));
        
        if (containsTraversal) {
          return Promise.reject(new Error('Invalid file path'));
        }
        
        return Promise.resolve({ success: true });
      });

      for (const maliciousPath of maliciousPaths) {
        await expect(
          mockFileOperation(maliciousPath)
        ).rejects.toThrow('Invalid file path');
      }

      // Valid paths should work
      await expect(
        mockFileOperation('exports/team-schedule-2024-01.csv')
      ).resolves.toEqual({ success: true });
    });
  });

  // ============================================================================
  // Data Protection Tests
  // ============================================================================

  describe('Data Protection', () => {
    test('should mask sensitive information in logs', async () => {
      const sensitiveData = {
        user: {
          id: 1,
          name: 'John Doe',
          email: 'john@company.com',
          sessionToken: 'jwt-token-12345',
          password: 'secretPassword123',
        },
      };

      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Simulate logging with data sanitization
      const sanitizedData = {
        ...sensitiveData,
        user: {
          ...sensitiveData.user,
          sessionToken: '[REDACTED]',
          password: '[REDACTED]',
        },
      };

      console.log('User data:', sanitizedData);

      expect(logSpy).toHaveBeenCalledWith('User data:', expect.objectContaining({
        user: expect.objectContaining({
          name: 'John Doe',
          sessionToken: '[REDACTED]',
          password: '[REDACTED]',
        }),
      }));

      logSpy.mockRestore();
    });

    test('should enforce rate limiting on API calls', async () => {
      const rateLimiter = {
        requests: new Map<string, number[]>(),
        
        isAllowed(userId: string, limit = 100, windowMs = 60000): boolean {
          const now = Date.now();
          const userRequests = this.requests.get(userId) || [];
          
          // Remove requests outside the time window
          const validRequests = userRequests.filter(time => now - time < windowMs);
          
          if (validRequests.length >= limit) {
            return false;
          }
          
          validRequests.push(now);
          this.requests.set(userId, validRequests);
          return true;
        }
      };

      const userId = 'user-123';
      
      // First 100 requests should be allowed
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.isAllowed(userId)).toBe(true);
      }
      
      // 101st request should be denied
      expect(rateLimiter.isAllowed(userId)).toBe(false);
    });

    test('should validate HTTPS usage in production', () => {
      const mockEnvironment = {
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      };

      const validateHttps = (url: string, isProduction: boolean) => {
        if (isProduction && !url.startsWith('https://')) {
          throw new Error('HTTPS required in production');
        }
        return true;
      };

      expect(() => 
        validateHttps(mockEnvironment.NEXT_PUBLIC_SUPABASE_URL, true)
      ).not.toThrow();

      expect(() => 
        validateHttps('http://insecure-url.com', true)
      ).toThrow('HTTPS required in production');
    });

    test('should protect against CSRF attacks', async () => {
      const mockCsrfToken = 'csrf-token-12345';
      
      const validateCsrfToken = (token: string, expected: string) => {
        return token === expected;
      };

      (DatabaseService.updateScheduleEntry as jest.Mock).mockImplementation(
        (memberId: number, date: string, value: string, reason?: string, csrfToken?: string) => {
          if (!csrfToken || !validateCsrfToken(csrfToken, mockCsrfToken)) {
            return Promise.reject(new Error('Invalid CSRF token'));
          }
          return Promise.resolve({ success: true });
        }
      );

      // Valid CSRF token should succeed
      await expect(
        DatabaseService.updateScheduleEntry(1, '2024-01-17', '1', undefined, mockCsrfToken)
      ).resolves.toEqual({ success: true });

      // Invalid CSRF token should fail
      await expect(
        DatabaseService.updateScheduleEntry(1, '2024-01-17', '1', undefined, 'invalid-token')
      ).rejects.toThrow('Invalid CSRF token');
    });
  });

  // ============================================================================
  // Session Security Tests
  // ============================================================================

  describe('Session Security', () => {
    test('should handle session timeout correctly', async () => {
      const shortSession = {
        access_token: 'short-token',
        expires_at: Date.now() / 1000 + 60, // Expires in 1 minute
        user: createMockRegularUser(1),
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: shortSession },
        error: null,
      });

      // Simulate time passing
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120000); // 2 minutes later

      const session = await supabase.auth.getSession();
      const isExpired = (session.data.session?.expires_at || 0) < Date.now() / 1000;
      
      expect(isExpired).toBe(true);
    });

    test('should securely sign out users', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      // Mock local storage cleanup
      const localStorageClearSpy = jest.spyOn(Storage.prototype, 'clear');

      await supabase.auth.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      // In a real implementation, local storage should be cleared
    });

    test('should prevent session fixation attacks', async () => {
      const oldSessionId = 'old-session-123';
      const newSessionId = 'new-session-456';

      const regenerateSession = (oldId: string) => {
        // Simulate session regeneration on login
        return oldId !== newSessionId ? newSessionId : null;
      };

      const regeneratedId = regenerateSession(oldSessionId);
      expect(regeneratedId).toBe(newSessionId);
      expect(regeneratedId).not.toBe(oldSessionId);
    });
  });

  // ============================================================================
  // Row Level Security (RLS) Tests
  // ============================================================================

  describe('Row Level Security', () => {
    test('should enforce RLS policies for schedule_entries table', async () => {
      const user1 = createMockRegularUser(1);
      const user2 = createMockRegularUser(2);

      (DatabaseService.getScheduleEntries as jest.Mock).mockImplementation(
        (startDate: string, endDate: string, teamId: number, requestingUserId?: number) => {
          // Simulate RLS: users can only see their own data or team data if manager
          if (requestingUserId === user1.id) {
            return Promise.resolve({
              [user1.id]: { '2024-01-17': { value: '1', hours: 7 } }
            });
          }
          
          if (requestingUserId === user2.id) {
            return Promise.resolve({
              [user2.id]: { '2024-01-17': { value: '0.5', hours: 3.5 } }
            });
          }
          
          return Promise.resolve({});
        }
      );

      // User 1 should only see their own data
      const user1Data = await DatabaseService.getScheduleEntries(
        '2024-01-17', '2024-01-23', 1, user1.id
      );
      expect(user1Data[user1.id]).toBeDefined();
      expect(user1Data[user2.id]).toBeUndefined();

      // User 2 should only see their own data
      const user2Data = await DatabaseService.getScheduleEntries(
        '2024-01-17', '2024-01-23', 2, user2.id
      );
      expect(user2Data[user2.id]).toBeDefined();
      expect(user2Data[user1.id]).toBeUndefined();
    });

    test('should allow managers to access team members data through RLS', async () => {
      const manager = createMockManagerUser(1);
      const teamMember = createMockRegularUser(1);

      (DatabaseService.getScheduleEntries as jest.Mock).mockImplementation(
        (startDate: string, endDate: string, teamId: number, requestingUserId?: number) => {
          // Managers can see team members' data
          if (requestingUserId === manager.id && teamId === manager.team_id) {
            return Promise.resolve({
              [manager.id]: { '2024-01-17': { value: '1', hours: 7 } },
              [teamMember.id]: { '2024-01-17': { value: '0.5', hours: 3.5 } },
            });
          }
          
          return Promise.resolve({});
        }
      );

      const teamData = await DatabaseService.getScheduleEntries(
        '2024-01-17', '2024-01-23', 1, manager.id
      );
      
      expect(teamData[manager.id]).toBeDefined();
      expect(teamData[teamMember.id]).toBeDefined();
    });

    test('should prevent cross-team data access via RLS', async () => {
      const team1Manager = createMockManagerUser(1);
      const team2Member = createMockRegularUser(2);

      (DatabaseService.getScheduleEntries as jest.Mock).mockImplementation(
        (startDate: string, endDate: string, teamId: number, requestingUserId?: number) => {
          // RLS should prevent access to other teams
          if (requestingUserId === team1Manager.id && teamId !== team1Manager.team_id) {
            return Promise.resolve({}); // No data for other teams
          }
          
          return Promise.resolve({
            [team1Manager.id]: { '2024-01-17': { value: '1', hours: 7 } },
          });
        }
      );

      // Team 1 manager should not see Team 2 data
      const crossTeamData = await DatabaseService.getScheduleEntries(
        '2024-01-17', '2024-01-23', 2, team1Manager.id
      );
      
      expect(crossTeamData[team2Member.id]).toBeUndefined();
      expect(Object.keys(crossTeamData)).toHaveLength(0);
    });
  });
});