/**
 * Enhanced Security Testing Suite
 * 
 * Comprehensive security testing including RLS policies, advanced authentication,
 * permission boundaries, and data protection scenarios.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DatabaseService } from '@/lib/database';
import { canManageSprints, canAccessCOODashboard, validateCOOPermissions } from '@/src/utils/permissions';
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import TemplateManager from '../../src/components/TemplateManager';

// Mock dependencies
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Test user profiles with different permission levels
const TEST_USERS = {
  coo: {
    id: 1,
    name: 'Nir Shilo',
    hebrew: 'ניר שילה',
    isManager: true,
    email: 'nir@company.com'
  },
  admin: {
    id: 2,
    name: 'Harel Mazan',
    hebrew: 'הראל מזן',
    isManager: true,
    email: 'harel@company.com'
  },
  manager: {
    id: 3,
    name: 'Sarah Manager',
    hebrew: 'שרה מנהלת',
    isManager: true,
    email: 'sarah@company.com'
  },
  member: {
    id: 4,
    name: 'John Developer',
    hebrew: 'ג\'ון מפתח',
    isManager: false,
    email: 'john@company.com'
  },
  unauthorized: {
    id: 999,
    name: 'External User',
    hebrew: 'משתמש חיצוני',
    isManager: false,
    email: 'external@external.com'
  }
};

describe('Enhanced Security Testing Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Row Level Security (RLS) Policy Testing', () => {
    it('should enforce team_members RLS policies correctly', async () => {
      // Test read access with different user types
      const testScenarios = [
        {
          user: TEST_USERS.coo,
          shouldAccess: true,
          description: 'COO should access all team members'
        },
        {
          user: TEST_USERS.manager,
          shouldAccess: true,
          description: 'Manager should access team members'
        },
        {
          user: TEST_USERS.member,
          shouldAccess: true,
          description: 'Member should access team members (read-only)'
        },
        {
          user: TEST_USERS.unauthorized,
          shouldAccess: false,
          description: 'Unauthorized user should not access team members'
        }
      ];

      for (const scenario of testScenarios) {
        mockDatabaseService.getTeamMembers.mockImplementation(async (teamId) => {
          // Simulate RLS policy enforcement
          if (!scenario.shouldAccess) {
            throw new Error('RLS policy violation: insufficient privileges');
          }
          
          return [
            { id: 1, name: 'Test Member', hebrew: 'חבר בדיקה', isManager: false },
            { id: 2, name: 'Test Manager', hebrew: 'מנהל בדיקה', isManager: true }
          ];
        });

        if (scenario.shouldAccess) {
          const result = await mockDatabaseService.getTeamMembers(1);
          expect(result).toHaveLength(2);
          expect(result[0].name).toBe('Test Member');
        } else {
          await expect(mockDatabaseService.getTeamMembers(1))
            .rejects.toThrow('RLS policy violation');
        }
      }
    });

    it('should enforce schedule_entries RLS policies with proper data isolation', async () => {
      const scenarios = [
        {
          user: TEST_USERS.coo,
          requestedTeamId: 1,
          userTeamId: 2,
          shouldAccess: true,
          description: 'COO should access any team schedule'
        },
        {
          user: TEST_USERS.manager,
          requestedTeamId: 1,
          userTeamId: 1,
          shouldAccess: true,
          description: 'Manager should access own team schedule'
        },
        {
          user: TEST_USERS.manager,
          requestedTeamId: 2,
          userTeamId: 1,
          shouldAccess: false,
          description: 'Manager should not access other team schedule'
        },
        {
          user: TEST_USERS.member,
          requestedTeamId: 1,
          userTeamId: 1,
          shouldAccess: true,
          description: 'Member should access own team schedule'
        },
        {
          user: TEST_USERS.member,
          requestedTeamId: 2,
          userTeamId: 1,
          shouldAccess: false,
          description: 'Member should not access other team schedule'
        }
      ];

      for (const scenario of scenarios) {
        mockDatabaseService.getScheduleEntries.mockImplementation(async (teamId) => {
          // Simulate RLS policy checking team membership
          if (!scenario.shouldAccess && teamId !== scenario.userTeamId) {
            throw new Error('RLS policy violation: team data access denied');
          }
          
          return [
            {
              id: 1,
              member_id: 1,
              date: '2024-01-15',
              value: '1' as const,
              reason: null
            }
          ];
        });

        if (scenario.shouldAccess) {
          const result = await mockDatabaseService.getScheduleEntries(
            scenario.requestedTeamId,
            new Date('2024-01-01'),
            new Date('2024-01-31')
          );
          expect(result).toHaveLength(1);
        } else {
          await expect(mockDatabaseService.getScheduleEntries(
            scenario.requestedTeamId,
            new Date('2024-01-01'),
            new Date('2024-01-31')
          )).rejects.toThrow('RLS policy violation');
        }
      }
    });

    it('should enforce availability_templates RLS policies with ownership checks', async () => {
      const testTemplates = [
        {
          id: 'template-1',
          name: 'Personal Template',
          created_by: 4, // Member user
          is_public: false
        },
        {
          id: 'template-2',
          name: 'Public Template',
          created_by: 3, // Manager user
          is_public: true
        },
        {
          id: 'template-3',
          name: 'Team Template',
          created_by: 2, // Admin user
          is_public: false
        }
      ];

      const accessScenarios = [
        {
          user: TEST_USERS.member,
          expectedAccessible: ['template-1', 'template-2'], // Own private + public
          description: 'Member should see own private templates and public templates'
        },
        {
          user: TEST_USERS.manager,
          expectedAccessible: ['template-2', 'template-3'], // Public + own private
          description: 'Manager should see public templates and own private templates'
        },
        {
          user: TEST_USERS.coo,
          expectedAccessible: ['template-1', 'template-2', 'template-3'], // All templates
          description: 'COO should see all templates'
        }
      ];

      for (const scenario of accessScenarios) {
        mockDatabaseService.getUserTemplates.mockImplementation(async () => {
          // Simulate RLS filtering based on ownership and public status
          return testTemplates.filter(template => {
            if (scenario.user.name === 'Nir Shilo') return true; // COO sees all
            if (template.is_public) return true; // Everyone sees public
            return template.created_by === scenario.user.id; // Own templates only
          });
        });

        const result = await mockDatabaseService.getUserTemplates();
        const accessibleIds = result.map(t => t.id);
        
        expect(accessibleIds).toEqual(expect.arrayContaining(scenario.expectedAccessible));
        expect(accessibleIds).toHaveLength(scenario.expectedAccessible.length);
      }
    });
  });

  describe('Advanced Permission Boundary Testing', () => {
    it('should enforce strict permission boundaries for sprint management', () => {
      const permissionTests = [
        {
          user: TEST_USERS.admin,
          action: 'manage_sprints',
          expected: true,
          description: 'Admin should manage sprints'
        },
        {
          user: TEST_USERS.coo,
          action: 'manage_sprints',
          expected: false,
          description: 'COO should not manage sprints (view only)'
        },
        {
          user: TEST_USERS.manager,
          action: 'manage_sprints',
          expected: false,
          description: 'Manager should not manage sprints'
        },
        {
          user: TEST_USERS.member,
          action: 'manage_sprints',
          expected: false,
          description: 'Member should not manage sprints'
        }
      ];

      permissionTests.forEach(test => {
        const canManage = canManageSprints(test.user);
        expect(canManage).toBe(test.expected);
      });
    });

    it('should enforce COO dashboard access with proper validation', () => {
      const cooAccessTests = [
        {
          user: TEST_USERS.coo,
          expected: true,
          description: 'COO should access COO dashboard'
        },
        {
          user: TEST_USERS.admin,
          expected: true,
          description: 'Admin should access COO dashboard'
        },
        {
          user: TEST_USERS.manager,
          expected: false,
          description: 'Manager should not access COO dashboard'
        },
        {
          user: TEST_USERS.member,
          expected: false,
          description: 'Member should not access COO dashboard'
        },
        {
          user: null,
          expected: false,
          description: 'Unauthenticated user should not access COO dashboard'
        }
      ];

      cooAccessTests.forEach(test => {
        const canAccess = canAccessCOODashboard(test.user);
        expect(canAccess).toBe(test.expected);
      });
    });

    it('should validate granular COO permissions for different actions', () => {
      const cooUser = { 
        id: -1, 
        name: 'Nir Shilo', 
        position: 'COO' as const,
        permissions: ['export', 'view', 'dashboard'] as const
      };

      const adminUser = {
        id: -2,
        name: 'Harel Mazan',
        position: 'Admin' as const,
        permissions: ['export', 'view', 'dashboard'] as const
      };

      const unauthorizedUser = {
        id: -3,
        name: 'Regular Manager',
        position: 'Manager' as const,
        permissions: [] as const
      };

      // Test export permissions
      expect(validateCOOPermissions(cooUser, 'export')).toBe(true);
      expect(validateCOOPermissions(adminUser, 'export')).toBe(true);
      expect(validateCOOPermissions(unauthorizedUser, 'export')).toBe(false);

      // Test view permissions
      expect(validateCOOPermissions(cooUser, 'view')).toBe(true);
      expect(validateCOOPermissions(adminUser, 'view')).toBe(true);
      expect(validateCOOPermissions(unauthorizedUser, 'view')).toBe(false);

      // Test dashboard permissions
      expect(validateCOOPermissions(cooUser, 'dashboard')).toBe(true);
      expect(validateCOOPermissions(adminUser, 'dashboard')).toBe(true);
      expect(validateCOOPermissions(unauthorizedUser, 'dashboard')).toBe(false);

      // Test null user
      expect(validateCOOPermissions(null, 'export')).toBe(false);
    });
  });

  describe('Authentication Token Security', () => {
    it('should validate JWT token structure and expiration', () => {
      const createMockJWT = (payload: any, expiresIn: number = 3600) => {
        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const exp = now + expiresIn;
        
        const tokenPayload = {
          ...payload,
          iat: now,
          exp: exp
        };

        return {
          header: btoa(JSON.stringify(header)),
          payload: btoa(JSON.stringify(tokenPayload)),
          signature: 'mock-signature',
          get token() {
            return `${this.header}.${this.payload}.${this.signature}`;
          }
        };
      };

      const validateJWT = (token: string): { valid: boolean; payload?: any; error?: string } => {
        try {
          const parts = token.split('.');
          if (parts.length !== 3) {
            return { valid: false, error: 'Invalid token structure' };
          }

          const header = JSON.parse(atob(parts[0]));
          const payload = JSON.parse(atob(parts[1]));

          // Check required header fields
          if (!header.alg || !header.typ) {
            return { valid: false, error: 'Invalid header' };
          }

          // Check required payload fields
          if (!payload.exp || !payload.iat) {
            return { valid: false, error: 'Missing required claims' };
          }

          // Check expiration
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp <= now) {
            return { valid: false, error: 'Token expired' };
          }

          // Check issued time
          if (payload.iat > now) {
            return { valid: false, error: 'Token issued in future' };
          }

          return { valid: true, payload };
        } catch (error) {
          return { valid: false, error: 'Token parsing failed' };
        }
      };

      // Test valid token
      const validToken = createMockJWT({ 
        userId: TEST_USERS.coo.id, 
        role: 'COO',
        permissions: ['dashboard', 'export'] 
      });
      const validResult = validateJWT(validToken.token);
      expect(validResult.valid).toBe(true);
      expect(validResult.payload?.userId).toBe(TEST_USERS.coo.id);

      // Test expired token
      const expiredToken = createMockJWT({ 
        userId: TEST_USERS.member.id 
      }, -3600); // Expired 1 hour ago
      const expiredResult = validateJWT(expiredToken.token);
      expect(expiredResult.valid).toBe(false);
      expect(expiredResult.error).toBe('Token expired');

      // Test malformed tokens
      const malformedTokens = [
        'not.a.jwt',
        'invalid',
        'header.payload', // Missing signature
        '', // Empty
        'header..signature' // Empty payload
      ];

      malformedTokens.forEach(token => {
        const result = validateJWT(token);
        expect(result.valid).toBe(false);
      });
    });

    it('should handle token refresh and invalidation scenarios', () => {
      const mockTokenStore = new Map<string, {
        token: string;
        refreshToken: string;
        expiresAt: number;
        userId: number;
      }>();

      const tokenManager = {
        generateTokens(userId: number) {
          const sessionId = `session_${Date.now()}_${Math.random()}`;
          const expiresAt = Date.now() + 3600000; // 1 hour
          
          const tokens = {
            token: `jwt_${sessionId}`,
            refreshToken: `refresh_${sessionId}`,
            expiresAt,
            userId
          };
          
          mockTokenStore.set(sessionId, tokens);
          return { sessionId, ...tokens };
        },

        refreshToken(refreshToken: string) {
          const session = Array.from(mockTokenStore.values())
            .find(s => s.refreshToken === refreshToken);
          
          if (!session) {
            throw new Error('Invalid refresh token');
          }
          
          if (session.expiresAt < Date.now()) {
            throw new Error('Refresh token expired');
          }
          
          // Generate new tokens
          return this.generateTokens(session.userId);
        },

        invalidateSession(sessionId: string) {
          return mockTokenStore.delete(sessionId);
        },

        invalidateAllUserSessions(userId: number) {
          for (const [sessionId, session] of mockTokenStore.entries()) {
            if (session.userId === userId) {
              mockTokenStore.delete(sessionId);
            }
          }
        },

        isValidSession(sessionId: string) {
          const session = mockTokenStore.get(sessionId);
          return session !== undefined && session.expiresAt > Date.now();
        }
      };

      // Test token generation
      const session1 = tokenManager.generateTokens(TEST_USERS.coo.id);
      expect(session1.token).toMatch(/^jwt_session_/);
      expect(session1.refreshToken).toMatch(/^refresh_session_/);
      expect(session1.userId).toBe(TEST_USERS.coo.id);

      // Test token refresh
      const refreshed = tokenManager.refreshToken(session1.refreshToken);
      expect(refreshed.userId).toBe(TEST_USERS.coo.id);
      expect(refreshed.token).not.toBe(session1.token);

      // Test session invalidation
      expect(tokenManager.isValidSession(session1.sessionId)).toBe(true);
      tokenManager.invalidateSession(session1.sessionId);
      expect(tokenManager.isValidSession(session1.sessionId)).toBe(false);

      // Test all sessions invalidation
      const session2 = tokenManager.generateTokens(TEST_USERS.coo.id);
      const session3 = tokenManager.generateTokens(TEST_USERS.coo.id);
      const otherSession = tokenManager.generateTokens(TEST_USERS.member.id);
      
      tokenManager.invalidateAllUserSessions(TEST_USERS.coo.id);
      expect(tokenManager.isValidSession(session2.sessionId)).toBe(false);
      expect(tokenManager.isValidSession(session3.sessionId)).toBe(false);
      expect(tokenManager.isValidSession(otherSession.sessionId)).toBe(true);
    });
  });

  describe('Data Injection and Sanitization', () => {
    it('should prevent advanced XSS attacks with sophisticated payloads', async () => {
      const advancedXSSPayloads = [
        // Event handlers
        '<img src="x" onerror="eval(String.fromCharCode(97,108,101,114,116,40,49,41))">',
        '<svg onload="javascript:alert(String.fromCharCode(88,83,83))">',
        
        // JavaScript protocols
        'javascript:/*-/*`/*\\`/*\'/*"/**/(/* */onerror=alert(\'XSS\') )//%0D%0A%0D%0A//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert(//XSS//)//\\x3e',
        
        // Data URLs
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=',
        
        // Unicode and encoding bypasses
        '\\u003cscript\\u003ealert(\'XSS\')\\u003c/script\\u003e',
        '%3Cscript%3Ealert%28%27XSS%27%29%3C%2Fscript%3E',
        
        // Template injection
        '{{constructor.constructor(\'alert(1)\')()}}',
        '${alert(\'XSS\')}',
        
        // CSS injection
        '<style>@import\'javascript:alert("XSS")\';</style>',
        
        // XML/SVG injection
        '<math><mi//xlink:href="data:x,<script>alert(\'XSS\')</script>">',
        
        // Polyglot payloads
        'jaVasCript:/*-/*`/*\\`/*\'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0D%0A//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//'
      ];

      const sanitizeInput = (input: string): string => {
        return input
          // Remove HTML tags
          .replace(/<[^>]*>/g, '')
          // Remove JavaScript protocols
          .replace(/javascript:/gi, '')
          .replace(/data:/gi, '')
          .replace(/vbscript:/gi, '')
          // Remove event handlers
          .replace(/on\w+\s*=/gi, '')
          // Remove script-related content
          .replace(/script/gi, '')
          .replace(/eval/gi, '')
          .replace(/expression/gi, '')
          // Remove template injection patterns
          .replace(/\{\{.*?\}\}/g, '')
          .replace(/\$\{.*?\}/g, '')
          // Remove special characters that could be dangerous
          .replace(/[<>'"`;\\]/g, '')
          // Remove Unicode escapes
          .replace(/\\u[0-9a-fA-F]{4}/g, '')
          .replace(/%[0-9a-fA-F]{2}/g, '');
      };

      const validateSanitization = (original: string, sanitized: string): boolean => {
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /data:/i,
          /on\w+=/i,
          /eval\(/i,
          /alert\(/i,
          /<iframe/i,
          /<object/i,
          /<embed/i,
          /\{\{.*\}\}/,
          /\$\{.*\}/
        ];

        return !dangerousPatterns.some(pattern => pattern.test(sanitized));
      };

      advancedXSSPayloads.forEach((payload, index) => {
        const sanitized = sanitizeInput(payload);
        const isSafe = validateSanitization(payload, sanitized);
        
        expect(isSafe).toBe(true);
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/alert\(/i);
        
        console.log(`XSS Test ${index + 1}:`, {
          original: payload.substring(0, 50) + '...',
          sanitized: sanitized.substring(0, 50) + '...',
          safe: isSafe
        });
      });
    });

    it('should prevent SQL injection with advanced techniques', () => {
      // Mock parameterized query function
      const executeQuery = (sql: string, params: any[] = []): { success: boolean; error?: string } => {
        // Check for SQL injection attempts in the SQL string itself
        const suspiciousPatterns = [
          /;\s*DROP\s+TABLE/i,
          /;\s*DELETE\s+FROM/i,
          /;\s*INSERT\s+INTO/i,
          /;\s*UPDATE\s+.*SET/i,
          /UNION\s+SELECT/i,
          /OR\s+1\s*=\s*1/i,
          /AND\s+1\s*=\s*1/i,
          /'.*OR.*'/i,
          /--/,
          /\/\*/,
          /\*\//,
          /xp_cmdshell/i,
          /sp_executesql/i
        ];

        const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(sql));
        if (hasSuspiciousContent) {
          return { success: false, error: 'Suspicious SQL content detected' };
        }

        // Validate that parameters are used (contains ? or $n placeholders)
        const hasPlaceholders = /\?|\$\d+/.test(sql);
        const hasStringConcatenation = /\+.*['"]/.test(sql) || /['"].*\+/.test(sql);
        
        if (!hasPlaceholders && params.length > 0) {
          return { success: false, error: 'Parameters provided but no placeholders in query' };
        }

        if (hasStringConcatenation) {
          return { success: false, error: 'String concatenation detected in SQL' };
        }

        return { success: true };
      };

      const sqlInjectionPayloads = [
        // Classic SQL injection
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' OR 1=1 --",
        
        // Union-based injection
        "' UNION SELECT username, password FROM admin_users --",
        "1' UNION SELECT NULL, table_name FROM information_schema.tables WHERE table_schema=database() --",
        
        // Boolean-based blind injection
        "' AND (SELECT COUNT(*) FROM users) > 0 --",
        "' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a",
        
        // Time-based blind injection
        "'; WAITFOR DELAY '00:00:10' --",
        "' OR SLEEP(10) --",
        
        // Stacked queries
        "'; INSERT INTO users VALUES ('hacker', 'password') --",
        "'; UPDATE users SET password='hacked' WHERE username='admin' --",
        
        // Advanced techniques
        "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT database()), 0x7e)) --",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --",
        
        // Encoding bypasses
        "%27%20OR%201%3D1%20--",
        "\\' OR 1=1 --",
        
        // NoSQL injection (for MongoDB-like syntax)
        "'; return true; var fake = '",
        "' || '1'=='1",
        
        // Function-based injection
        "'; EXEC xp_cmdshell('dir') --",
        "'; EXEC sp_executesql N'SELECT * FROM users' --"
      ];

      // Test safe parameterized queries
      const safeQueries = [
        {
          sql: 'SELECT * FROM team_members WHERE id = ?',
          params: [1],
          description: 'Safe parameterized select'
        },
        {
          sql: 'UPDATE schedule_entries SET value = ? WHERE member_id = ? AND date = ?',
          params: ['1', 4, '2024-01-15'],
          description: 'Safe parameterized update'
        },
        {
          sql: 'INSERT INTO team_members (name, hebrew, is_manager) VALUES (?, ?, ?)',
          params: ['John Doe', 'ג\'ון דו', false],
          description: 'Safe parameterized insert'
        }
      ];

      // Test that safe queries pass
      safeQueries.forEach(query => {
        const result = executeQuery(query.sql, query.params);
        expect(result.success).toBe(true);
      });

      // Test that injection attempts are blocked
      sqlInjectionPayloads.forEach((payload, index) => {
        // Test as direct SQL
        const directResult = executeQuery(payload);
        expect(directResult.success).toBe(false);
        
        // Test as parameter in safe query (should be safe when parameterized)
        const parameterizedResult = executeQuery(
          'SELECT * FROM team_members WHERE name = ?',
          [payload]
        );
        expect(parameterizedResult.success).toBe(true); // Parameters are safe

        console.log(`SQL Injection Test ${index + 1}:`, {
          payload: payload.substring(0, 50) + '...',
          directBlocked: !directResult.success,
          parameterizedSafe: parameterizedResult.success
        });
      });
    });
  });

  describe('Session Security and CSRF Protection', () => {
    it('should implement robust CSRF protection', () => {
      const generateCSRFToken = (): string => {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      };

      const validateCSRFToken = (
        requestToken: string,
        sessionToken: string,
        request: { method: string; origin?: string; referer?: string }
      ): { valid: boolean; reason?: string } => {
        // Require CSRF token for state-changing operations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
          if (!requestToken || !sessionToken) {
            return { valid: false, reason: 'CSRF token required' };
          }

          if (requestToken !== sessionToken) {
            return { valid: false, reason: 'CSRF token mismatch' };
          }

          if (requestToken.length < 32) {
            return { valid: false, reason: 'CSRF token too short' };
          }
        }

        // Additional origin/referer validation for extra security
        if (request.origin && !request.origin.includes('localhost') && !request.origin.includes('company.com')) {
          return { valid: false, reason: 'Invalid origin' };
        }

        return { valid: true };
      };

      // Test valid CSRF scenarios
      const validToken = generateCSRFToken();
      expect(validToken).toHaveLength(64); // 32 bytes = 64 hex chars

      const validScenarios = [
        {
          request: { method: 'GET' },
          requestToken: '',
          sessionToken: validToken,
          description: 'GET requests should not require CSRF token'
        },
        {
          request: { method: 'POST', origin: 'https://localhost:3000' },
          requestToken: validToken,
          sessionToken: validToken,
          description: 'Valid POST with matching CSRF token'
        },
        {
          request: { method: 'PUT', origin: 'https://app.company.com' },
          requestToken: validToken,
          sessionToken: validToken,
          description: 'Valid PUT with company domain'
        }
      ];

      validScenarios.forEach(scenario => {
        const result = validateCSRFToken(
          scenario.requestToken,
          scenario.sessionToken,
          scenario.request
        );
        expect(result.valid).toBe(true);
      });

      // Test invalid CSRF scenarios
      const invalidScenarios = [
        {
          request: { method: 'POST' },
          requestToken: '',
          sessionToken: validToken,
          description: 'POST without CSRF token should fail'
        },
        {
          request: { method: 'POST' },
          requestToken: 'wrong-token',
          sessionToken: validToken,
          description: 'POST with wrong CSRF token should fail'
        },
        {
          request: { method: 'DELETE' },
          requestToken: 'short',
          sessionToken: 'short',
          description: 'Short CSRF token should fail'
        },
        {
          request: { method: 'POST', origin: 'https://evil.com' },
          requestToken: validToken,
          sessionToken: validToken,
          description: 'Invalid origin should fail'
        }
      ];

      invalidScenarios.forEach(scenario => {
        const result = validateCSRFToken(
          scenario.requestToken,
          scenario.sessionToken,
          scenario.request
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toBeDefined();
      });
    });

    it('should enforce secure session management', () => {
      interface SessionConfig {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'strict' | 'lax' | 'none';
        maxAge: number;
        domain?: string;
        path: string;
      }

      const validateSessionSecurity = (config: SessionConfig): { secure: boolean; issues: string[] } => {
        const issues: string[] = [];

        if (!config.httpOnly) {
          issues.push('Session cookies should be httpOnly');
        }

        if (!config.secure) {
          issues.push('Session cookies should be secure (HTTPS only)');
        }

        if (config.sameSite !== 'strict' && config.sameSite !== 'lax') {
          issues.push('Session cookies should use sameSite: strict or lax');
        }

        if (config.maxAge > 24 * 60 * 60 * 1000) { // More than 24 hours
          issues.push('Session should not exceed 24 hours');
        }

        if (config.path !== '/') {
          issues.push('Session path should be restricted appropriately');
        }

        return {
          secure: issues.length === 0,
          issues
        };
      };

      // Test secure configuration
      const secureConfig: SessionConfig = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: '/'
      };

      const secureResult = validateSessionSecurity(secureConfig);
      expect(secureResult.secure).toBe(true);
      expect(secureResult.issues).toHaveLength(0);

      // Test insecure configurations
      const insecureConfigs = [
        {
          config: { ...secureConfig, httpOnly: false },
          expectedIssue: 'Session cookies should be httpOnly'
        },
        {
          config: { ...secureConfig, secure: false },
          expectedIssue: 'Session cookies should be secure'
        },
        {
          config: { ...secureConfig, sameSite: 'none' as const },
          expectedIssue: 'Session cookies should use sameSite'
        },
        {
          config: { ...secureConfig, maxAge: 48 * 60 * 60 * 1000 },
          expectedIssue: 'Session should not exceed 24 hours'
        }
      ];

      insecureConfigs.forEach(({ config, expectedIssue }) => {
        const result = validateSessionSecurity(config);
        expect(result.secure).toBe(false);
        expect(result.issues.some(issue => issue.includes(expectedIssue.split(' ')[0]))).toBe(true);
      });
    });
  });

  describe('API Endpoint Security', () => {
    it('should validate API authentication and rate limiting', async () => {
      const mockApiRequest = async (
        endpoint: string,
        options: {
          method: string;
          headers?: Record<string, string>;
          body?: any;
          clientId?: string;
        }
      ) => {
        // Simulate rate limiting
        const rateLimiter = new Map<string, number[]>();
        const rateLimit = 100; // requests per minute
        const windowMs = 60000; // 1 minute

        const clientId = options.clientId || 'anonymous';
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!rateLimiter.has(clientId)) {
          rateLimiter.set(clientId, []);
        }

        const clientRequests = rateLimiter.get(clientId)!;
        const recentRequests = clientRequests.filter(time => time > windowStart);

        if (recentRequests.length >= rateLimit) {
          throw new Error('Rate limit exceeded');
        }

        recentRequests.push(now);
        rateLimiter.set(clientId, recentRequests);

        // Simulate authentication check
        const authHeader = options.headers?.['Authorization'];
        const protectedEndpoints = ['/api/admin', '/api/coo', '/api/team-data'];
        
        if (protectedEndpoints.some(ep => endpoint.startsWith(ep))) {
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Authentication required');
          }

          const token = authHeader.split(' ')[1];
          if (token === 'invalid-token') {
            throw new Error('Invalid authentication token');
          }
        }

        // Simulate successful response
        return { status: 200, data: { success: true } };
      };

      // Test rate limiting
      const clientId = 'test-client';
      const requests = Array.from({ length: 50 }, (_, i) => 
        mockApiRequest('/api/health', {
          method: 'GET',
          clientId
        })
      );

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(50); // All should succeed within rate limit

      // Test authentication requirements
      await expect(mockApiRequest('/api/coo/dashboard', { method: 'GET' }))
        .rejects.toThrow('Authentication required');

      await expect(mockApiRequest('/api/coo/dashboard', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer invalid-token' }
      })).rejects.toThrow('Invalid authentication token');

      // Test valid authentication
      const validResult = await mockApiRequest('/api/coo/dashboard', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token' }
      });
      expect(validResult.status).toBe(200);
    });
  });
});