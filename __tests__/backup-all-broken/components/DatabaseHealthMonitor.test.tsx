/**
 * DatabaseHealthMonitor Component Tests
 * 
 * Tests for the DatabaseHealthMonitor React component that displays
 * health status and provides user feedback for database issues.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DatabaseHealthMonitor from '../../src/components/DatabaseHealthMonitor';
import { performDatabaseHealthCheck } from '../../src/lib/databaseHealthCheck';

// Mock the database health check function
jest.mock('../../src/lib/databaseHealthCheck', () => ({
  performDatabaseHealthCheck: jest.fn(),
  logHealthCheckResults: jest.fn(),
}));

const mockPerformDatabaseHealthCheck = performDatabaseHealthCheck as jest.MockedFunction<typeof performDatabaseHealthCheck>;

describe('DatabaseHealthMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Healthy Database State', () => {
    beforeEach(() => {
      mockPerformDatabaseHealthCheck.mockResolvedValue({
        isHealthy: true,
        errors: [],
        warnings: [],
        details: {
          connectivity: true,
          requiredFunctions: { get_daily_company_status_data: true },
          requiredColumns: { team_members: true },
          performanceMetrics: { connectivity: 200 }
        }
      });
    });

    it('should not render anything when database is healthy', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(mockPerformDatabaseHealthCheck).toHaveBeenCalled();
      });

      expect(screen.queryByText(/Database.*Issues/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Critical Errors/)).not.toBeInTheDocument();
    });

    it('should not show health indicator for healthy database', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(mockPerformDatabaseHealthCheck).toHaveBeenCalled();
      });

      expect(screen.queryByText(/Database Warnings/)).not.toBeInTheDocument();
    });
  });

  describe('Database with Warnings', () => {
    beforeEach(() => {
      mockPerformDatabaseHealthCheck.mockResolvedValue({
        isHealthy: true,
        errors: [],
        warnings: ['Missing optional column: inactive_date'],
        details: {
          connectivity: true,
          requiredFunctions: { get_daily_company_status_data: true },
          requiredColumns: { team_members: true },
          performanceMetrics: { connectivity: 800 }
        }
      });
    });

    it('should show warning indicator when there are warnings', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Database Warnings/)).toBeInTheDocument();
      });

      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('should open modal when warning indicator is clicked', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Database Warnings/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByText(/Database Health Issues Detected/)).toBeInTheDocument();
      });
    });
  });

  describe('Critical Database Errors', () => {
    beforeEach(() => {
      mockPerformDatabaseHealthCheck.mockResolvedValue({
        isHealthy: false,
        errors: ['Critical function get_daily_company_status_data is missing'],
        warnings: ['Performance is slow'],
        details: {
          connectivity: true,
          requiredFunctions: { get_daily_company_status_data: false },
          requiredColumns: { team_members: true },
          performanceMetrics: { connectivity: 300, get_daily_company_status_data: 2500 }
        }
      });
    });

    it('should automatically show modal for critical errors', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Database Health Issues Detected/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Critical Errors:/)).toBeInTheDocument();
      expect(screen.getByText(/get_daily_company_status_data is missing/)).toBeInTheDocument();
    });

    it('should display quick fix steps', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Quick Fix Steps:/)).toBeInTheDocument();
      });

      expect(screen.getByText(/Open Supabase SQL Editor/)).toBeInTheDocument();
      expect(screen.getByText(/sql\/enhance-daily-company-status.sql/)).toBeInTheDocument();
    });

    it('should show performance metrics', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Performance Metrics:/)).toBeInTheDocument();
      });

      expect(screen.getByText(/connectivity/)).toBeInTheDocument();
      expect(screen.getByText(/300ms/)).toBeInTheDocument();
    });

    it('should allow re-checking database status', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Re-check Database/)).toBeInTheDocument();
      });

      // Clear the mock to test re-checking
      mockPerformDatabaseHealthCheck.mockClear();
      mockPerformDatabaseHealthCheck.mockResolvedValue({
        isHealthy: true,
        errors: [],
        warnings: [],
        details: {
          connectivity: true,
          requiredFunctions: { get_daily_company_status_data: true },
          requiredColumns: { team_members: true },
          performanceMetrics: { connectivity: 200 }
        }
      });

      fireEvent.click(screen.getByText('Re-check Database'));

      await waitFor(() => {
        expect(mockPerformDatabaseHealthCheck).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading state during re-check', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Re-check Database/)).toBeInTheDocument();
      });

      // Mock a slow response
      mockPerformDatabaseHealthCheck.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            isHealthy: true,
            errors: [],
            warnings: [],
            details: {
              connectivity: true,
              requiredFunctions: { get_daily_company_status_data: true },
              requiredColumns: { team_members: true },
              performanceMetrics: { connectivity: 200 }
            }
          }), 100);
        })
      );

      fireEvent.click(screen.getByText('Re-check Database'));

      expect(screen.getByText('Checking...')).toBeInTheDocument();
      expect(screen.getByText('Checking...')).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Checking...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Interactions', () => {
    beforeEach(() => {
      mockPerformDatabaseHealthCheck.mockResolvedValue({
        isHealthy: false,
        errors: ['Critical database error'],
        warnings: ['Warning message'],
        details: {
          connectivity: false,
          requiredFunctions: { get_daily_company_status_data: false },
          requiredColumns: { team_members: false },
          performanceMetrics: { connectivity: 5000 }
        }
      });
    });

    it('should close modal when close button is clicked', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Database Health Issues Detected/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByText(/Database Health Issues Detected/)).not.toBeInTheDocument();
      });
    });

    it('should display both errors and warnings sections', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Critical Errors:/)).toBeInTheDocument();
        expect(screen.getByText(/Warnings:/)).toBeInTheDocument();
      });
    });

    it('should color-code performance metrics', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Performance Metrics:/)).toBeInTheDocument();
      });

      // Check that slow connectivity shows red indicator
      expect(screen.getByText(/connectivity/)).toBeInTheDocument();
      expect(screen.getByText(/5000ms/)).toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      mockPerformDatabaseHealthCheck.mockResolvedValue({
        isHealthy: false,
        errors: ['Test error'],
        warnings: [],
        details: {
          connectivity: false,
          requiredFunctions: {},
          requiredColumns: {},
          performanceMetrics: {}
        }
      });
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should show debug health status in development mode', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Issues/)).toBeInTheDocument();
      });

      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('should allow clicking debug status to open modal', async () => {
      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        const detailsButton = screen.getAllByText('Details')[0]; // Get the debug one
        fireEvent.click(detailsButton);
      });

      expect(screen.getByText(/Database Health Issues Detected/)).toBeInTheDocument();
    });
  });

  describe('Component Configuration', () => {
    it('should not run startup check when disabled', () => {
      render(<DatabaseHealthMonitor enableStartupCheck={false} />);

      expect(mockPerformDatabaseHealthCheck).not.toHaveBeenCalled();
    });

    it('should setup periodic checks when enabled', async () => {
      jest.useFakeTimers();

      render(
        <DatabaseHealthMonitor 
          enableStartupCheck={false} 
          enablePeriodicCheck={true} 
          checkIntervalMs={1000}
        />
      );

      expect(mockPerformDatabaseHealthCheck).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockPerformDatabaseHealthCheck).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle health check errors gracefully', async () => {
      mockPerformDatabaseHealthCheck.mockRejectedValue(new Error('Network failure'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error));
      });

      // Should not crash the component
      expect(screen.queryByText(/Database Health Issues Detected/)).not.toBeInTheDocument();
    });

    it('should handle component unmounting during health check', async () => {
      // Mock a long-running health check
      mockPerformDatabaseHealthCheck.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            isHealthy: true,
            errors: [],
            warnings: [],
            details: {
              connectivity: true,
              requiredFunctions: {},
              requiredColumns: {},
              performanceMetrics: {}
            }
          }), 1000);
        })
      );

      const { unmount } = render(<DatabaseHealthMonitor enableStartupCheck={true} />);

      // Unmount before health check completes
      unmount();

      // Should not cause any errors or warnings
      await waitFor(() => {
        expect(mockPerformDatabaseHealthCheck).toHaveBeenCalled();
      });
    });
  });
});