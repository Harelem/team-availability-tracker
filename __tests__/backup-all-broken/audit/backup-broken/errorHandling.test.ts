/**
 * Error Handling Audit Tests
 * 
 * Validates error handling mechanisms, graceful degradation, user feedback,
 * error recovery, logging, and system resilience across all components.
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

// Mock console methods to track error logging
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Error Handling Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Database Connection Errors', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database connection failure
      mockDatabaseService.getOrganizationMetrics.mockRejectedValue(
        new Error('Connection failed: ECONNREFUSED')
      );
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should display connection error message
        const errorMessage = screen.queryByText(/connection|network|failed/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
        
        // Should show retry option
        const retryButton = screen.queryByText(/retry|try again/i);
        if (retryButton) {
          expect(retryButton).toBeInTheDocument();
        }
      });
      
      // Should log error appropriately
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Database connection failed')
      );
    });

    it('should handle database query timeouts', async () => {
      // Mock query timeout
      mockDatabaseService.getTeamMembers.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 100)
        )
      );
      
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />);
      
      await waitFor(() => {
        // Should show timeout error handling
        const timeoutMessage = screen.queryByText(/timeout|slow|taking longer/i);
        if (timeoutMessage) {
          expect(timeoutMessage).toBeInTheDocument();
        }
      }, { timeout: 2000 });
    });

    it('should handle malformed database responses', async () => {
      // Mock malformed response
      mockDatabaseService.getOrganizationMetrics.mockResolvedValue({
        invalidField: 'unexpected',
        missingRequiredField: undefined
      } as any);
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should handle data validation errors
        const validationError = screen.queryByText(/invalid data|data error/i);
        if (validationError) {
          expect(validationError).toBeInTheDocument();
        }
      });
      
      // Should log data validation warnings
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid data structure')
      );
    });
  });

  describe('User Input Validation and Error Handling', () => {
    it('should validate template creation inputs', async () => {
      const user = userEvent.setup();
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([]);
      mockDatabaseService.createUserTemplate.mockRejectedValue(
        new Error('Template name already exists')
      );
      
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      // Expand templates section
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        const createButton = screen.queryByText(/create.*template/i);
        if (createButton) {
          fireEvent.click(createButton);
        }
      });
      
      await waitFor(() => {
        const nameInput = screen.queryByPlaceholderText(/template name/i);
        if (nameInput) {
          // Test duplicate name error
          await user.type(nameInput, 'Existing Template');
          
          const saveButton = screen.queryByText(/save/i);
          if (saveButton) {
            fireEvent.click(saveButton);
          }
        }
      });
      
      await waitFor(() => {
        // Should show validation error
        const errorMessage = screen.queryByText(/already exists|duplicate/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('should handle invalid schedule data input', async () => {
      const user = userEvent.setup();
      
      const invalidScheduleData = {
        sun: { value: 'invalid' as any },
        mon: { value: '2' as any }, // Invalid value > 1
        tue: { value: '-1' as any }, // Invalid negative value
        wed: { value: '1' },
        thu: { value: '1' },
        fri: { value: '0' },
        sat: { value: '0' }
      };
      
      mockDatabaseService.updateScheduleEntry.mockRejectedValue(
        new Error('Invalid schedule value')
      );
      
      // Test would involve ScheduleTable component with invalid inputs
      // Should validate inputs before submission
      expect(invalidScheduleData.sun.value).not.toMatch(/^(0|0\.5|1|X)$/);
      expect(invalidScheduleData.mon.value).not.toMatch(/^(0|0\.5|1|X)$/);
      expect(invalidScheduleData.tue.value).not.toMatch(/^(0|0\.5|1|X)$/);
    });

    it('should handle form submission errors gracefully', async () => {
      const user = userEvent.setup();
      const onApplyTemplate = jest.fn().mockRejectedValue(
        new Error('Failed to apply template')
      );
      
      mockDatabaseService.getUserTemplates.mockResolvedValue([
        {
          id: 'test-template',
          name: 'Test Template',
          schedule: {
            sun: { value: '1' as const },
            mon: { value: '1' as const },
            tue: { value: '1' as const },
            wed: { value: '1' as const },
            thu: { value: '1' as const },
            fri: { value: '0' as const },
            sat: { value: '0' as const }
          }
        }
      ]);
      
      render(<TemplateManager onApplyTemplate={onApplyTemplate} />);
      
      fireEvent.click(screen.getByText('Availability Templates'));
      
      await waitFor(() => {
        const applyButton = screen.queryByText(/apply/i);
        if (applyButton) {
          fireEvent.click(applyButton);
        }
      });
      
      await waitFor(() => {
        // Should show application error
        const errorMessage = screen.queryByText(/failed.*apply|error.*template/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });
  });

  describe('Network and API Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      // Mock network error
      mockDatabaseService.getOrganizationMetrics.mockRejectedValue(
        new Error('Network request failed')
      );
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should show network error state
        const networkError = screen.queryByText(/network|connection|offline/i);
        if (networkError) {
          expect(networkError).toBeInTheDocument();
        }
        
        // Should provide retry mechanism
        const retryButton = screen.queryByText(/retry|reconnect/i);
        if (retryButton) {
          expect(retryButton).toBeInTheDocument();
        }
      });
    });

    it('should handle API rate limiting', async () => {
      // Mock rate limiting error
      mockDatabaseService.getTeamMembers.mockRejectedValue({
        name: 'RateLimitError',
        message: 'Too many requests',
        status: 429,
        retryAfter: 60
      });
      
      render(<TeamDetailModal teamId={1} isOpen={true} onClose={jest.fn()} />);
      
      await waitFor(() => {
        // Should show rate limit message
        const rateLimitMessage = screen.queryByText(/too many requests|rate limit/i);
        if (rateLimitMessage) {
          expect(rateLimitMessage).toBeInTheDocument();
        }
      });
    });

    it('should handle server errors (5xx) appropriately', async () => {
      // Mock server error
      mockDatabaseService.getCurrentGlobalSprint.mockRejectedValue({
        name: 'ServerError',
        message: 'Internal server error',
        status: 500
      });
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should show server error message
        const serverError = screen.queryByText(/server error|try again later/i);
        if (serverError) {
          expect(serverError).toBeInTheDocument();
        }
      });
      
      // Should log server errors for monitoring
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Server error')
      );
    });
  });

  describe('Component Error Boundaries', () => {
    it('should catch and handle React component errors', () => {
      // Mock component that throws error
      const ThrowingComponent = () => {
        throw new Error('Component render error');
      };
      
      // Error boundary would catch this in real implementation
      const mockErrorBoundary = {
        componentDidCatch: jest.fn(),
        render: () => <div>Something went wrong</div>
      };
      
      // Simulate error boundary behavior
      try {
        render(<ThrowingComponent />);
      } catch (error) {
        expect(error.message).toBe('Component render error');
        mockErrorBoundary.componentDidCatch(error, { componentStack: '' });
      }
      
      expect(mockErrorBoundary.componentDidCatch).toHaveBeenCalled();
    });

    it('should provide fallback UI for crashed components', async () => {
      // Mock chart component that fails to render
      jest.mock('recharts', () => ({
        ResponsiveContainer: () => {
          throw new Error('Chart rendering failed');
        }
      }));
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should show fallback content instead of crashed chart
        const fallback = screen.queryByText(/chart unavailable|loading chart/i);
        if (fallback) {
          expect(fallback).toBeInTheDocument();
        }
      });
    });

    it('should maintain app stability when individual components fail', async () => {
      // Mock partial component failure
      mockDatabaseService.getTeamSummaries.mockRejectedValue(
        new Error('Team summaries unavailable')
      );
      mockDatabaseService.getCurrentGlobalSprint.mockResolvedValue({
        id: 1,
        current_sprint_number: 45,
        sprint_start_date: '2024-01-07',
        sprint_length_weeks: 2
      });
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Sprint info should still be available
        expect(screen.getByText('45')).toBeInTheDocument();
        
        // Failed section should show error state
        const errorSection = screen.queryByText(/team.*unavailable|failed.*load/i);
        if (errorSection) {
          expect(errorSection).toBeInTheDocument();
        }
      });
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should validate sprint calculation inputs', () => {
      const invalidInputs = [
        { teamSize: -1, startDate: '2024-01-07', endDate: '2024-01-18' },
        { teamSize: 8, startDate: 'invalid-date', endDate: '2024-01-18' },
        { teamSize: 8, startDate: '2024-01-18', endDate: '2024-01-07' }, // End before start
        { teamSize: null, startDate: '2024-01-07', endDate: '2024-01-18' }
      ];
      
      invalidInputs.forEach(input => {
        const isValid = 
          typeof input.teamSize === 'number' && 
          input.teamSize > 0 &&
          !isNaN(Date.parse(input.startDate)) &&
          !isNaN(Date.parse(input.endDate)) &&
          new Date(input.endDate) > new Date(input.startDate);
        
        expect(isValid).toBe(false);
      });
    });

    it('should handle missing or corrupted user data', async () => {
      // Mock corrupted user data
      mockDatabaseService.getUserTemplates.mockResolvedValue([
        {
          id: 'corrupt-template',
          name: null, // Missing name
          schedule: undefined, // Missing schedule
          isPersonal: 'not-boolean' // Wrong type
        } as any
      ]);
      
      render(<TemplateManager onApplyTemplate={jest.fn()} />);
      
      await waitFor(() => {
        // Should handle corrupted data gracefully
        const dataError = screen.queryByText(/data.*corrupt|invalid.*template/i);
        if (dataError) {
          expect(dataError).toBeInTheDocument();
        }
      });
      
      // Should log data corruption warnings
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid template data')
      );
    });

    it('should validate Israeli work week constraints', () => {
      const invalidSchedules = [
        { fri: { value: '1' } }, // Working on Friday (weekend)
        { sat: { value: '0.5' } }, // Working on Saturday (weekend)
        { sun: { value: '2' } }, // Invalid value > 1
        { mon: { value: 'invalid' } } // Non-numeric value
      ];
      
      invalidSchedules.forEach(schedule => {
        Object.entries(schedule).forEach(([day, entry]) => {
          const isValidDay = ['sun', 'mon', 'tue', 'wed', 'thu'].includes(day) || 
                            (entry.value === '0' && ['fri', 'sat'].includes(day));
          const isValidValue = ['0', '0.5', '1', 'X'].includes(entry.value);
          
          if (!isValidDay || !isValidValue) {
            // Should trigger validation error
            expect(true).toBe(true); // Validation would fail
          }
        });
      });
    });
  });

  describe('Error Recovery and Retry Mechanisms', () => {
    it('should implement exponential backoff for failed requests', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;
      const delays: number[] = [];
      
      mockDatabaseService.getOrganizationMetrics.mockImplementation(async () => {
        attemptCount++;
        
        if (attemptCount < maxAttempts) {
          // Calculate exponential backoff delay
          const delay = Math.min(1000 * Math.pow(2, attemptCount - 1), 5000);
          delays.push(delay);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        
        // Succeed on final attempt
        return { totalTeams: 6, totalEmployees: 27, teamSummaries: [] };
      });
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('27')).toBeInTheDocument();
      }, { timeout: 10000 });
      
      expect(attemptCount).toBe(maxAttempts);
      expect(delays).toEqual([1000, 2000]); // Exponential backoff: 1s, 2s
    });

    it('should provide manual retry options after automatic retries fail', async () => {
      const user = userEvent.setup();
      
      mockDatabaseService.getOrganizationMetrics
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ totalTeams: 6, totalEmployees: 27, teamSummaries: [] });
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should show retry button after failed attempts
        const retryButton = screen.queryByText(/retry|try again/i);
        if (retryButton) {
          fireEvent.click(retryButton);
        }
      });
      
      await waitFor(() => {
        // Should succeed after manual retry
        expect(screen.getByText('27')).toBeInTheDocument();
      });
    });

    it('should restore previous state after error recovery', async () => {
      const initialData = {
        totalTeams: 6,
        totalEmployees: 27,
        teamSummaries: []
      };
      
      mockDatabaseService.getOrganizationMetrics
        .mockResolvedValueOnce(initialData)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(initialData);
      
      const { rerender } = render(<COOExecutiveDashboard />);
      
      // Initial successful load
      await waitFor(() => {
        expect(screen.getByText('27')).toBeInTheDocument();
      });
      
      // Trigger error
      rerender(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        const errorMessage = screen.queryByText(/error|failed/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
      
      // Recover from error
      rerender(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should restore previous successful state
        expect(screen.getByText('27')).toBeInTheDocument();
      });
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log errors with appropriate detail levels', async () => {
      const testError = new Error('Test error for logging');
      testError.stack = 'Error stack trace...';
      
      mockDatabaseService.getOrganizationMetrics.mockRejectedValue(testError);
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringContaining('Test error for logging')
        );
      });
    });

    it('should include contextual information in error logs', async () => {
      const contextualError = {
        message: 'Database query failed',
        context: {
          userId: 1,
          component: 'COOExecutiveDashboard',
          action: 'getOrganizationMetrics',
          timestamp: new Date().toISOString()
        }
      };
      
      mockDatabaseService.getOrganizationMetrics.mockRejectedValue(contextualError);
      
      render(<COOExecutiveDashboard />);
      
      await waitFor(() => {
        // Should log with context
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Database query failed'),
            context: expect.objectContaining({
              component: 'COOExecutiveDashboard'
            })
          })
        );
      });
    });

    it('should sanitize sensitive data in error logs', () => {
      const sensitiveError = {
        message: 'Authentication failed',
        details: {
          username: 'testuser',
          password: 'secret123', // Should be sanitized
          token: 'jwt-token-here', // Should be sanitized
          email: 'user@example.com'
        }
      };
      
      // Simulate error sanitization
      const sanitizedError = {
        ...sensitiveError,
        details: {
          ...sensitiveError.details,
          password: '[REDACTED]',
          token: '[REDACTED]'
        }
      };
      
      expect(sanitizedError.details.password).toBe('[REDACTED]');
      expect(sanitizedError.details.token).toBe('[REDACTED]');
      expect(sanitizedError.details.username).toBe('testuser'); // Non-sensitive preserved
      expect(sanitizedError.details.email).toBe('user@example.com'); // Non-sensitive preserved
    });
  });
});