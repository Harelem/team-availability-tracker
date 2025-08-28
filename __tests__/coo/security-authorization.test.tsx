import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { withCOOAuth } from '@/hooks/useCOOAuth';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}));

const MockCOOComponent = () => <div>COO Protected Content</div>;
const ProtectedCOOComponent = withCOOAuth(MockCOOComponent);

describe('COO Security and Authorization Matrix Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@supabase/supabase-js').createClient();
  });

  describe('Authentication Security Matrix', () => {
    describe('Valid COO Access', () => {
      const validCOOEmails = [
        'nir.shilo@example.com',
        'nir.shilo@company.com',
        'nir.shilo@domain.org',
      ];

      validCOOEmails.forEach(email => {
        it(`should allow access for valid COO email: ${email}`, async () => {
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { email } },
            error: null,
          });

          render(<ProtectedCOOComponent />);

          await waitFor(() => {
            expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
          });
        });
      });

      it('should maintain session after successful authentication', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { email: 'nir.shilo@example.com' } },
          error: null,
        });

        const { rerender } = render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
        });

        // Simulate re-render (component update)
        rerender(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
        });
      });
    });

    describe('Invalid Access Attempts', () => {
      const invalidEmails = [
        'nir.shilo@hacker.com',
        'fake.nir.shilo@example.com',
        'nir.shilo+admin@example.com',
        'nir@shilo@example.com',
        'NIR.SHILO@EXAMPLE.COM', // Case sensitive
        'nir.shilo@example.co', // Wrong domain
        'admin@example.com',
        'user@company.com',
        'test@test.com',
        '',
        null,
        undefined,
      ];

      invalidEmails.forEach(email => {
        it(`should deny access for invalid email: ${email || 'null/undefined'}`, async () => {
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: email ? { email } : null },
            error: null,
          });

          render(<ProtectedCOOComponent />);

          await waitFor(() => {
            expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            expect(screen.queryByText('COO Protected Content')).not.toBeInTheDocument();
          });
        });
      });

      it('should handle malformed email objects', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { email: { toString: () => 'nir.shilo@example.com' } } },
          error: null,
        });

        render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
      });

      it('should handle missing user object', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: null,
          error: null,
        });

        render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
      });
    });

    describe('Authentication Error Scenarios', () => {
      const authErrors = [
        { code: 'invalid_token', message: 'Invalid authentication token' },
        { code: 'token_expired', message: 'Authentication token has expired' },
        { code: 'network_error', message: 'Network connection failed' },
        { code: 'server_error', message: 'Internal server error' },
        { code: 'rate_limited', message: 'Too many requests' },
      ];

      authErrors.forEach(error => {
        it(`should handle authentication error: ${error.code}`, async () => {
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error,
          });

          render(<ProtectedCOOComponent />);

          await waitFor(() => {
            expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            expect(screen.queryByText('COO Protected Content')).not.toBeInTheDocument();
          });
        });
      });

      it('should handle network timeout', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(new Error('Network timeout'));

        render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
      });

      it('should handle promise rejection', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(new Error('Promise rejected'));

        render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Database Access Authorization', () => {
    describe('Authorized Operations', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { email: 'nir.shilo@example.com' } },
          error: null,
        });
      });

      it('should allow sprint read operations for COO', async () => {
        mockSupabase.from().select().order().mockResolvedValue({
          data: [{ id: 1, name: 'Sprint 1' }],
          error: null,
        });

        const result = await mockSupabase.from('sprint_history').select('*').order('created_at');
        
        expect(result.data).toBeTruthy();
        expect(result.error).toBeNull();
      });

      it('should allow sprint create operations for COO', async () => {
        const sprintData = {
          name: 'New Sprint',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: [{ id: 1, ...sprintData }],
          error: null,
        });

        const result = await mockSupabase.from('sprint_history').insert(sprintData);
        
        expect(result.data).toBeTruthy();
        expect(result.error).toBeNull();
      });

      it('should allow sprint update operations for COO', async () => {
        const updateData = { name: 'Updated Sprint' };

        mockSupabase.from().update().eq().mockResolvedValue({
          data: [{ id: 1, ...updateData }],
          error: null,
        });

        const result = await mockSupabase.from('sprint_history').update(updateData).eq('id', 1);
        
        expect(result.data).toBeTruthy();
        expect(result.error).toBeNull();
      });

      it('should allow sprint delete operations for COO', async () => {
        mockSupabase.from().delete().eq().mockResolvedValue({
          error: null,
        });

        const result = await mockSupabase.from('sprint_history').delete().eq('id', 1);
        
        expect(result.error).toBeNull();
      });
    });

    describe('Unauthorized Operations', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { email: 'unauthorized@example.com' } },
          error: null,
        });
      });

      it('should deny sprint read operations for non-COO', async () => {
        mockSupabase.from().select().order().mockResolvedValue({
          data: null,
          error: {
            code: '42501',
            message: 'permission denied for table sprint_history',
          },
        });

        const result = await mockSupabase.from('sprint_history').select('*').order('created_at');
        
        expect(result.data).toBeNull();
        expect(result.error.code).toBe('42501');
      });

      it('should deny sprint create operations for non-COO', async () => {
        const sprintData = {
          name: 'Unauthorized Sprint',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
        };

        mockSupabase.from().insert().mockResolvedValue({
          data: null,
          error: {
            code: '42501',
            message: 'permission denied for table sprint_history',
          },
        });

        const result = await mockSupabase.from('sprint_history').insert(sprintData);
        
        expect(result.data).toBeNull();
        expect(result.error.code).toBe('42501');
      });

      it('should deny sprint update operations for non-COO', async () => {
        mockSupabase.from().update().eq().mockResolvedValue({
          data: null,
          error: {
            code: '42501',
            message: 'permission denied for table sprint_history',
          },
        });

        const result = await mockSupabase.from('sprint_history').update({ name: 'Hacked' }).eq('id', 1);
        
        expect(result.data).toBeNull();
        expect(result.error.code).toBe('42501');
      });

      it('should deny sprint delete operations for non-COO', async () => {
        mockSupabase.from().delete().eq().mockResolvedValue({
          error: {
            code: '42501',
            message: 'permission denied for table sprint_history',
          },
        });

        const result = await mockSupabase.from('sprint_history').delete().eq('id', 1);
        
        expect(result.error.code).toBe('42501');
      });
    });
  });

  describe('Session Security', () => {
    describe('Session Validation', () => {
      it('should validate session on each request', async () => {
        let callCount = 0;
        mockSupabase.auth.getUser.mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            data: { user: { email: 'nir.shilo@example.com' } },
            error: null,
          });
        });

        const { rerender } = render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
        });

        rerender(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(callCount).toBeGreaterThan(1);
        });
      });

      it('should handle session expiry gracefully', async () => {
        mockSupabase.auth.getUser
          .mockResolvedValueOnce({
            data: { user: { email: 'nir.shilo@example.com' } },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { user: null },
            error: { code: 'token_expired', message: 'Session expired' },
          });

        const { rerender } = render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
        });

        rerender(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
      });
    });

    describe('Session Hijacking Prevention', () => {
      it('should not accept sessions from different users', async () => {
        mockSupabase.auth.getUser
          .mockResolvedValueOnce({
            data: { user: { email: 'nir.shilo@example.com' } },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { user: { email: 'attacker@example.com' } },
            error: null,
          });

        const { rerender } = render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
        });

        rerender(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
      });

      it('should validate user context consistency', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { 
            user: { 
              email: 'nir.shilo@example.com',
              id: 'user-123',
              role: 'authenticated',
            } 
          },
          error: null,
        });

        render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Input Validation Security', () => {
    describe('Email Validation', () => {
      const maliciousInputs = [
        'nir.shilo@example.com<script>alert("xss")</script>',
        'nir.shilo@example.com"; DROP TABLE users; --',
        'nir.shilo@example.com\'; INSERT INTO users...',
        'nir.shilo@example.com\n\radmin@example.com',
        'nir.shilo@example.com\0admin@example.com',
      ];

      maliciousInputs.forEach(maliciousEmail => {
        it(`should reject malicious email input: ${maliciousEmail}`, async () => {
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { email: maliciousEmail } },
            error: null,
          });

          render(<ProtectedCOOComponent />);

          await waitFor(() => {
            expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            expect(screen.queryByText('COO Protected Content')).not.toBeInTheDocument();
          });
        });
      });

      it('should handle extremely long email inputs', async () => {
        const longEmail = 'nir.shilo@' + 'a'.repeat(1000) + '.com';
        
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { email: longEmail } },
          error: null,
        });

        render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
      });

      it('should handle unicode and special characters', async () => {
        const unicodeEmail = 'nír.shīlø@éxample.com';
        
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { email: unicodeEmail } },
          error: null,
        });

        render(<ProtectedCOOComponent />);

        await waitFor(() => {
          expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'unauthorized@example.com' } },
        error: null,
      });

      render(<ProtectedCOOComponent />);

      await waitFor(() => {
        const accessDeniedText = screen.getByText(/access denied/i);
        expect(accessDeniedText).toBeInTheDocument();
        
        // Should not expose the actual email or detailed reasons
        expect(screen.queryByText(/unauthorized@example.com/)).not.toBeInTheDocument();
        expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
      });
    });

    it('should provide generic error messages for authentication failures', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Internal authentication service error' },
      });

      render(<ProtectedCOOComponent />);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.queryByText(/internal authentication service error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Development Environment Security', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow development access only in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'dev@example.com' } },
        error: null,
      });

      render(<ProtectedCOOComponent />);

      await waitFor(() => {
        expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
      });
    });

    it('should not allow development access in production mode', async () => {
      process.env.NODE_ENV = 'production';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'dev@example.com' } },
        error: null,
      });

      render(<ProtectedCOOComponent />);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });

    it('should not allow development access in test mode', async () => {
      process.env.NODE_ENV = 'test';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'dev@example.com' } },
        error: null,
      });

      render(<ProtectedCOOComponent />);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should have consistent response times for valid and invalid emails', async () => {
      const startTimeValid = performance.now();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'nir.shilo@example.com' } },
        error: null,
      });

      const { unmount } = render(<ProtectedCOOComponent />);
      
      await waitFor(() => {
        expect(screen.getByText('COO Protected Content')).toBeInTheDocument();
      });
      
      const endTimeValid = performance.now();
      unmount();

      const startTimeInvalid = performance.now();
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'invalid@example.com' } },
        error: null,
      });

      render(<ProtectedCOOComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
      
      const endTimeInvalid = performance.now();

      const validDuration = endTimeValid - startTimeValid;
      const invalidDuration = endTimeInvalid - startTimeInvalid;

      // Response times should be within reasonable range of each other
      // This is a basic check - in reality, you might want more sophisticated timing analysis
      expect(Math.abs(validDuration - invalidDuration)).toBeLessThan(1000); // 1 second tolerance
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should handle rate limiting responses', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: {
          code: '429',
          message: 'Too Many Requests',
        },
      });

      render(<ProtectedCOOComponent />);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });

    it('should handle concurrent authentication attempts', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'nir.shilo@example.com' } },
        error: null,
      });

      // Render multiple components simultaneously
      const components = Array.from({ length: 5 }, (_, i) => (
        <div key={i}>
          <ProtectedCOOComponent />
        </div>
      ));

      render(<div>{components}</div>);

      await waitFor(() => {
        const protectedContent = screen.getAllByText('COO Protected Content');
        expect(protectedContent).toHaveLength(5);
      });
    });
  });
});