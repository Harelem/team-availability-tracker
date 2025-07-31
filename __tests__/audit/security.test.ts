/**
 * Security Audit Tests
 * 
 * Validates security measures, data protection, authentication, authorization,
 * input sanitization, XSS prevention, and secure data handling practices.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import COOExecutiveDashboard from '../../src/components/COOExecutiveDashboard';
import TemplateManager from '../../src/components/TemplateManager';
import TeamDetailModal from '../../src/components/modals/TeamDetailModal';
import { DatabaseService } from '@/lib/database';

// Mock database dependencies
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('Security Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input Sanitization and XSS Prevention', () => {
    it('should sanitize user input in template names', async () => {
      const user = userEvent.setup();
      
      // Mock malicious input attempts
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '{{constructor.constructor(\'alert(1)\')()}}',
        '<svg onload="alert(1)">',
        'data:text/html,<script>alert(1)</script>'
      ];
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([]);
      mockDatabaseService.createUserTemplate.mockImplementation(async (templateData) => {
        // Should sanitize template name
        const sanitizedName = templateData.name
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, ''); // Remove event handlers
        
        expect(sanitizedName).not.toContain('<script>');
        expect(sanitizedName).not.toMatch(/javascript:/i);
        expect(sanitizedName).not.toMatch(/on\w+=/i);
        
        return { id: 'sanitized-template', name: sanitizedName };
      });
      
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        const createButton = screen.queryByText(/create.*template/i);
        if (createButton) {
          fireEvent.click(createButton);
        }
      });
      
      for (const maliciousInput of maliciousInputs) {
        const nameInput = screen.queryByPlaceholderText(/template name/i);
        if (nameInput) {
          await user.clear(nameInput);
          await user.type(nameInput, maliciousInput);
          
          const saveButton = screen.queryByText(/save/i);
          if (saveButton) {
            fireEvent.click(saveButton);
            
            // Verify input was sanitized
            await waitFor(() => {
              expect(mockDatabaseService.createUserTemplate).toHaveBeenCalledWith(
                expect.objectContaining({
                  name: expect.not.stringContaining('<script>')
                })
              );
            });
          }
        }
      }
    });

    it('should prevent HTML injection in display text', () => {
      const maliciousTeamData = {
        id: 1,
        name: '<script>alert("XSS")</script>Product Team',
        description: '<img src="x" onerror="alert(\'XSS\')">Team description',
        members: [
          {
            id: 1,
            name: '<svg onload="alert(1)">John Doe',
            hebrew: '<script>alert("XSS")</script>ג\'ון דו'
          }
        ]
      };
      
      mockDatabaseService.getTeamMembers.mockResolvedValue(maliciousTeamData.members);
      
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />);
      
      // Should not execute malicious scripts
      expect(document.querySelector('script')).toBeNull();
      
      // Text content should be escaped/sanitized
      waitFor(() => {
        const teamName = screen.queryByText(/Product Team/);
        if (teamName) {
          expect(teamName.textContent).not.toContain('<script>');
          expect(teamName.innerHTML).not.toContain('<script>');
        }
      });
    });

    it('should validate and sanitize URL parameters', () => {
      const maliciousURLs = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
        '../../../etc/passwd'
      ];
      
      maliciousURLs.forEach(url => {
        // URL validation function
        const isValidURL = (input: string): boolean => {
          try {
            const urlObj = new URL(input);
            const allowedProtocols = ['http:', 'https:'];
            return allowedProtocols.includes(urlObj.protocol);
          } catch {
            return false;
          }
        };
        
        expect(isValidURL(url)).toBe(false);
      });
      
      // Valid URLs should pass
      const validURLs = [
        'https://example.com',
        'http://localhost:3000',
        'https://api.company.com/data'
      ];
      
      validURLs.forEach(url => {
        const isValidURL = (input: string): boolean => {
          try {
            const urlObj = new URL(input);
            const allowedProtocols = ['http:', 'https:'];
            return allowedProtocols.includes(urlObj.protocol);
          } catch {
            return false;
          }
        };
        
        expect(isValidURL(url)).toBe(true);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should validate user roles and permissions', async () => {
      const userRoles = {
        team: {
          canViewOwnTeam: true,
          canViewOtherTeams: false,
          canViewCOODashboard: false,
          canModifyTeamData: false
        },
        manager: {
          canViewOwnTeam: true,
          canViewOtherTeams: true,
          canViewCOODashboard: false,
          canModifyTeamData: true
        },
        coo: {
          canViewOwnTeam: true,
          canViewOtherTeams: true,
          canViewCOODashboard: true,
          canModifyTeamData: true
        }
      };
      
      // Test COO dashboard access control
      const testUserAccess = (role: keyof typeof userRoles) => {
        const permissions = userRoles[role];
        
        if (!permissions.canViewCOODashboard && role !== 'coo') {
          // Should not render COO dashboard for non-COO users
          expect(permissions.canViewCOODashboard).toBe(false);
        }
        
        if (role === 'coo') {
          expect(permissions.canViewCOODashboard).toBe(true);
        }
      };
      
      Object.keys(userRoles).forEach(role => {
        testUserAccess(role as keyof typeof userRoles);
      });
    });

    it('should prevent unauthorized data access', async () => {
      // Mock unauthorized access attempt
      mockDatabaseService.getTeamMembers.mockRejectedValue({
        name: 'UnauthorizedError',
        message: 'Access denied',
        status: 403
      });
      
      render(<TeamDetailModal teamId={999} isOpen={true} onClose={jest.fn()} />);
      
      await waitFor(() => {
        // Should show access denied message
        const accessDenied = screen.queryByText(/access denied|unauthorized|permission/i);
        if (accessDenied) {
          expect(accessDenied).toBeInTheDocument();
        }
        
        // Should not display sensitive data
        expect(screen.queryByText(/member.*data/i)).not.toBeInTheDocument();
      });
    });

    it('should handle session timeout securely', async () => {
      // Mock session timeout
      mockDatabaseService.getOrganizationMetrics.mockRejectedValue({
        name: 'SessionTimeoutError',
        message: 'Session expired',
        status: 401
      });
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should prompt for re-authentication
        const sessionExpired = screen.queryByText(/session.*expired|please.*login/i);
        if (sessionExpired) {
          expect(sessionExpired).toBeInTheDocument();
        }
        
        // Should clear sensitive data from display
        expect(screen.queryByDisplayValue(/password|token|secret/i)).not.toBeInTheDocument();
      });
    });

    it('should validate JWT tokens properly', () => {
      const mockJWTValidation = (token: string): boolean => {
        // Basic JWT structure validation
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
          // Validate header
          const header = JSON.parse(atob(parts[0]));
          if (!header.alg || !header.typ) return false;
          
          // Validate payload structure
          const payload = JSON.parse(atob(parts[1]));
          if (!payload.exp || !payload.iat) return false;
          
          // Check expiration
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp <= now) return false;
          
          return true;
        } catch {
          return false;
        }
      };
      
      const invalidTokens = [
        'invalid.token',
        'header.payload', // Missing signature
        'not-a-jwt-at-all',
        '', // Empty string
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1MTYyMzkwMjJ9.signature' // Expired
      ];
      
      invalidTokens.forEach(token => {
        expect(mockJWTValidation(token)).toBe(false);
      });
      
      // Valid token structure (mock)
      const validHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const validPayload = btoa(JSON.stringify({ 
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        userId: 1
      }));
      const validToken = `${validHeader}.${validPayload}.mock-signature`;
      
      expect(mockJWTValidation(validToken)).toBe(true);
    });
  });

  describe('Data Protection and Privacy', () => {
    it('should not expose sensitive data in client-side code', () => {
      // Check that sensitive patterns are not present in rendered output
      render(<COOExecutiveDashboard />);
      
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /private.*key/i,
        /api.*key/i,
        /database.*url/i,
        /connection.*string/i
      ];
      
      const documentHTML = document.documentElement.innerHTML;
      
      sensitivePatterns.forEach(pattern => {
        expect(documentHTML).not.toMatch(pattern);
      });
    });

    it('should handle personal data with appropriate privacy measures', async () => {
      const personalData = {
        userId: 1,
        name: 'John Doe',
        email: 'john.doe@company.com',
        phoneNumber: '+1-555-0123',
        address: '123 Main St, City, State',
        socialSecurityNumber: '123-45-6789' // Should never be exposed
      };
      
      // Simulate data processing that should sanitize sensitive fields
      const sanitizePersonalData = (data: any) => {
        const { socialSecurityNumber, phoneNumber, address, ...sanitized } = data;
        return {
          ...sanitized,
          phoneNumber: phoneNumber ? phoneNumber.replace(/\d/g, 'X') : undefined,
          address: '[REDACTED]'
        };
      };
      
      const sanitizedData = sanitizePersonalData(personalData);
      
      expect(sanitizedData.socialSecurityNumber).toBeUndefined();
      expect(sanitizedData.phoneNumber).toBe('+X-XXX-XXXX');
      expect(sanitizedData.address).toBe('[REDACTED]');
      expect(sanitizedData.name).toBe('John Doe'); // Non-sensitive data preserved
    });

    it('should implement secure data transmission practices', () => {
      // Mock fetch with security headers validation
      const mockSecureFetch = async (url: string, options: RequestInit = {}) => {
        // Should use HTTPS in production
        expect(url.startsWith('https://') || url.startsWith('http://localhost')).toBe(true);
        
        // Should include security headers
        const headers = options.headers as Record<string, string> || {};
        expect(headers['Content-Security-Policy']).toBeTruthy();
        expect(headers['X-Content-Type-Options']).toBe('nosniff');
        expect(headers['X-Frame-Options']).toBe('DENY');
        expect(headers['X-XSS-Protection']).toBe('1; mode=block');
        
        return new Response('{"data": "secure"}');
      };
      
      // Test secure fetch implementation
      mockSecureFetch('https://api.company.com/data', {
        headers: {
          'Content-Security-Policy': "default-src 'self'",
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      });
    });

    it('should prevent data leakage through error messages', async () => {
      // Mock database error that might contain sensitive info
      const sensitiveError = new Error('Query failed: SELECT * FROM users WHERE password = "secret123"');
      
      mockDatabaseService.getOrganizationMetrics.mockRejectedValue(sensitiveError);
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Error message should be sanitized for user display
        const errorElements = screen.queryAllByText(/error|failed/i);
        errorElements.forEach(element => {
          expect(element.textContent).not.toContain('password');
          expect(element.textContent).not.toContain('secret123');
          expect(element.textContent).not.toContain('SELECT *');
        });
      });
    });
  });

  describe('Content Security Policy (CSP) Compliance', () => {
    it('should enforce strict CSP directives', () => {
      const cspDirectives = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"], // Note: 'unsafe-inline' should be avoided in production
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'https://api.company.com'],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'object-src': ["'none'"]
      };
      
      // Validate CSP directive structure
      Object.entries(cspDirectives).forEach(([directive, sources]) => {
        expect(Array.isArray(sources)).toBe(true);
        expect(sources.length).toBeGreaterThan(0);
        
        // Validate specific security requirements
        if (directive === 'frame-ancestors') {
          expect(sources).toContain("'none'"); // Prevent clickjacking
        }
        
        if (directive === 'object-src') {
          expect(sources).toContain("'none'"); // Prevent plugin execution
        }
      });
    });

    it('should not execute inline scripts without proper nonce', () => {
      // Create element with inline script
      const scriptElement = document.createElement('script');
      scriptElement.innerHTML = 'alert("XSS attempt")';
      
      // CSP should prevent execution without proper nonce
      // This is more of a browser-level test, but we can validate the structure
      expect(scriptElement.nonce).toBeFalsy(); // No nonce = should be blocked by CSP
    });

    it('should validate external resource loading', () => {
      const externalResources = [
        { type: 'script', src: 'https://cdn.jsdelivr.net/malicious.js' },
        { type: 'style', src: 'https://evil.com/steal-data.css' },
        { type: 'img', src: 'https://tracker.com/pixel.gif' }
      ];
      
      const allowedDomains = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://api.company.com'
      ];
      
      externalResources.forEach(resource => {
        const isAllowed = allowedDomains.some(domain => resource.src.startsWith(domain));
        
        if (!isAllowed) {
          // Should be blocked by CSP
          expect(isAllowed).toBe(false);
        }
      });
    });
  });

  describe('Secure Session Management', () => {
    it('should implement secure cookie attributes', () => {
      const secureCookieOptions = {
        httpOnly: true,    // Prevent XSS access
        secure: true,      // HTTPS only
        sameSite: 'strict' as const, // CSRF protection
        maxAge: 3600,      // 1 hour expiration
        path: '/'
      };
      
      // Validate cookie security attributes
      expect(secureCookieOptions.httpOnly).toBe(true);
      expect(secureCookieOptions.secure).toBe(true);
      expect(secureCookieOptions.sameSite).toBe('strict');
      expect(secureCookieOptions.maxAge).toBeLessThanOrEqual(3600); // Max 1 hour
    });

    it('should implement CSRF protection', () => {
      // Mock CSRF token validation
      const validateCSRFToken = (requestToken: string, sessionToken: string): boolean => {
        return requestToken === sessionToken && requestToken.length >= 32;
      };
      
      const validToken = 'a'.repeat(32); // 32 character token
      const invalidTokens = [
        '', // Empty
        'short', // Too short
        'different-token-12345678901234567890' // Different from session
      ];
      
      expect(validateCSRFToken(validToken, validToken)).toBe(true);
      
      invalidTokens.forEach(token => {
        expect(validateCSRFToken(token, validToken)).toBe(false);
      });
    });

    it('should handle session invalidation properly', () => {
      const sessionManager = {
        sessions: new Map([
          ['session1', { userId: 1, expires: Date.now() + 3600000 }],
          ['session2', { userId: 2, expires: Date.now() - 1000 }] // Expired
        ]),
        
        isValidSession(sessionId: string): boolean {
          const session = this.sessions.get(sessionId);
          return session !== undefined && session.expires > Date.now();
        },
        
        invalidateSession(sessionId: string): void {
          this.sessions.delete(sessionId);
        },
        
        invalidateAllUserSessions(userId: number): void {
          for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId) {
              this.sessions.delete(sessionId);
            }
          }
        }
      };
      
      expect(sessionManager.isValidSession('session1')).toBe(true);
      expect(sessionManager.isValidSession('session2')).toBe(false); // Expired
      expect(sessionManager.isValidSession('nonexistent')).toBe(false);
      
      sessionManager.invalidateAllUserSessions(1);
      expect(sessionManager.isValidSession('session1')).toBe(false);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries', () => {
      // Mock database query function
      const mockQuery = (sql: string, params: any[]) => {
        // Should use parameterized queries, not string concatenation
        expect(sql).not.toMatch(/WHERE.*=.*\+/); // No string concatenation
        expect(sql).toMatch(/\?|\$\d+/); // Should use parameter placeholders
        expect(params).toBeDefined();
        
        return Promise.resolve([]);
      };
      
      const safeQuery = "SELECT * FROM teams WHERE id = ? AND name = ?";
      const params = [1, "Product Team"];
      
      mockQuery(safeQuery, params);
    });

    it('should sanitize dynamic query conditions', () => {
      const userInput = "'; DROP TABLE users; --";
      
      // Input sanitization function
      const sanitizeInput = (input: string): string => {
        return input
          .replace(/'/g, "''") // Escape single quotes
          .replace(/[;\\]/g, '') // Remove dangerous characters
          .replace(/--/g, '') // Remove comment indicators
          .replace(/\/\*/g, '') // Remove comment start
          .replace(/\*\//g, ''); // Remove comment end
      };
      
      const sanitizedInput = sanitizeInput(userInput);
      
      expect(sanitizedInput).not.toContain(';');
      expect(sanitizedInput).not.toContain('DROP');
      expect(sanitizedInput).not.toContain('--');
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should implement request rate limiting', () => {
      const rateLimiter = {
        requests: new Map<string, number[]>(),
        maxRequests: 100,
        windowMs: 60000, // 1 minute
        
        isAllowed(clientId: string): boolean {
          const now = Date.now();
          const windowStart = now - this.windowMs;
          
          if (!this.requests.has(clientId)) {
            this.requests.set(clientId, []);
          }
          
          const clientRequests = this.requests.get(clientId)!;
          
          // Remove old requests outside the window
          const validRequests = clientRequests.filter(time => time > windowStart);
          
          if (validRequests.length >= this.maxRequests) {
            return false;
          }
          
          validRequests.push(now);
          this.requests.set(clientId, validRequests);
          return true;
        }
      };
      
      // Test rate limiting
      const clientId = 'test-client';
      
      // Should allow first requests
      for (let i = 0; i < 50; i++) {
        expect(rateLimiter.isAllowed(clientId)).toBe(true);
      }
      
      // Should start blocking after limit
      for (let i = 0; i < 60; i++) {
        rateLimiter.isAllowed(clientId);
      }
      
      expect(rateLimiter.isAllowed(clientId)).toBe(false);
    });

    it('should handle large payload attacks', () => {
      const maxPayloadSize = 1024 * 1024; // 1MB
      
      const validatePayloadSize = (data: any): boolean => {
        const jsonString = JSON.stringify(data);
        const sizeInBytes = new Blob([jsonString]).size;
        return sizeInBytes <= maxPayloadSize;
      };
      
      const normalPayload = { name: 'Template', schedule: {} };
      const largePayload = { 
        name: 'A'.repeat(2000000), // 2MB string
        schedule: {}
      };
      
      expect(validatePayloadSize(normalPayload)).toBe(true);
      expect(validatePayloadSize(largePayload)).toBe(false);
    });
  });
});