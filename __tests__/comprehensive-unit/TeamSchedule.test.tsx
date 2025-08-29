/**
 * Comprehensive Unit Tests - TeamSchedule Component
 * Tests core functionality for team schedule display across different user roles
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import TeamScheduleTable from '@/components/ScheduleTable';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/hooks/useTeamDetail');
jest.mock('@/utils/permissions');

const mockTeamMembers = [
  {
    id: 1,
    name: 'Ido Keller',
    team: 'Development-Tal',
    email: 'ido.keller@example.com',
    role: 'member'
  },
  {
    id: 2,
    name: 'Tal Vashdi',
    team: 'Development-Tal',
    email: 'tal.vashdi@example.com',
    role: 'manager'
  }
];

const mockScheduleData = [
  {
    id: 1,
    user_id: 1,
    date: '2024-01-17',
    value: 7,
    absence_reason: null
  },
  {
    id: 2,
    user_id: 1,
    date: '2024-01-18',
    value: 3.5,
    absence_reason: 'Personal'
  }
];

describe('TeamSchedule Component - Comprehensive Tests', () => {
  let mockUseTeamDetail: jest.Mock;
  let mockPermissions: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useTeamDetail hook
    mockUseTeamDetail = require('@/hooks/useTeamDetail').default as jest.Mock;
    mockUseTeamDetail.mockReturnValue({
      teamMembers: mockTeamMembers,
      scheduleData: mockScheduleData,
      loading: false,
      error: null,
      updateScheduleEntry: jest.fn(),
      refreshData: jest.fn()
    });

    // Mock permissions
    mockPermissions = require('@/utils/permissions').canEditSchedule as jest.Mock;
    mockPermissions.mockReturnValue(true);
  });

  describe('Regular User Role Tests', () => {
    beforeEach(() => {
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        currentUser: { id: 1, role: 'member' }
      });
    });

    it('renders team schedule correctly for regular user', () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Check that team members are displayed
      expect(screen.getByText('Ido Keller')).toBeInTheDocument();
      expect(screen.getByText('Tal Vashdi')).toBeInTheDocument();
    });

    it('allows regular user to edit their own schedule', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        updateScheduleEntry: mockUpdate
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Find and click on user's own cell
      const userCell = screen.getByTestId('schedule-cell-1-2024-01-17');
      await user.click(userCell);

      // Verify update function is called
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(1, '2024-01-17', expect.any(String));
      });
    });

    it('prevents regular user from editing others schedule', async () => {
      const user = userEvent.setup();
      mockPermissions.mockReturnValue(false);

      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Try to click on manager's cell (should be disabled)
      const managerCell = screen.getByTestId('schedule-cell-2-2024-01-17');
      expect(managerCell).toHaveAttribute('disabled');
    });

    it('displays schedule values correctly', () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Check full day display
      expect(screen.getByDisplayValue('7')).toBeInTheDocument();
      
      // Check half day with reason
      const halfDayCell = screen.getByDisplayValue('3.5');
      expect(halfDayCell).toBeInTheDocument();
      
      // Check absence reason is displayed
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });
  });

  describe('Manager Role Tests', () => {
    beforeEach(() => {
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        currentUser: { id: 2, role: 'manager' }
      });
      mockPermissions.mockReturnValue(true);
    });

    it('allows manager to edit all team members schedules', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        updateScheduleEntry: mockUpdate
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Manager should be able to edit any team member's schedule
      const memberCell = screen.getByTestId('schedule-cell-1-2024-01-17');
      await user.click(memberCell);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(1, '2024-01-17', expect.any(String));
      });
    });

    it('displays team management controls for manager', () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Manager should see additional controls
      expect(screen.getByTestId('team-management-controls')).toBeInTheDocument();
      expect(screen.getByText('Add Team Member')).toBeInTheDocument();
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });

    it('shows team completion status for manager', () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      expect(screen.getByTestId('team-completion-status')).toBeInTheDocument();
      expect(screen.getByText(/Team Completion:/)).toBeInTheDocument();
    });
  });

  describe('COO Role Tests', () => {
    beforeEach(() => {
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        currentUser: { id: 3, role: 'coo' }
      });
      mockPermissions.mockReturnValue(true);
    });

    it('displays comprehensive analytics for COO', () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      expect(screen.getByTestId('coo-analytics-panel')).toBeInTheDocument();
      expect(screen.getByText('Company-wide Access')).toBeInTheDocument();
    });

    it('shows cross-team comparison data', () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      expect(screen.getByTestId('cross-team-metrics')).toBeInTheDocument();
    });
  });

  describe('Data Loading States', () => {
    it('shows loading state correctly', () => {
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        loading: true
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading team data...')).toBeInTheDocument();
    });

    it('handles error state properly', () => {
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        error: new Error('Failed to load team data')
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByText('Failed to load team data')).toBeInTheDocument();
    });

    it('shows empty state when no data', () => {
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        teamMembers: [],
        scheduleData: []
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      expect(screen.getByText('No team members found')).toBeInTheDocument();
    });
  });

  describe('Week Navigation', () => {
    it('navigates to previous week correctly', async () => {
      const user = userEvent.setup();
      const mockRefresh = jest.fn();
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        refreshData: mockRefresh
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      const prevWeekButton = screen.getByTestId('prev-week-button');
      await user.click(prevWeekButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('navigates to next week correctly', async () => {
      const user = userEvent.setup();
      const mockRefresh = jest.fn();
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        refreshData: mockRefresh
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      const nextWeekButton = screen.getByTestId('next-week-button');
      await user.click(nextWeekButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('jumps to current week', async () => {
      const user = userEvent.setup();
      render(<TeamScheduleTable team="Development-Tal" />);
      
      const currentWeekButton = screen.getByTestId('current-week-button');
      await user.click(currentWeekButton);

      expect(screen.getByText('Current Week')).toBeInTheDocument();
    });
  });

  describe('Real-time Sync', () => {
    it('handles real-time updates correctly', async () => {
      const mockRefresh = jest.fn();
      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        refreshData: mockRefresh
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Simulate real-time update
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('displays update indicators', () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Should show last updated time
      expect(screen.getByTestId('last-updated-indicator')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Team schedule table');
      
      const cells = screen.getAllByRole('gridcell');
      expect(cells[0]).toHaveAttribute('aria-label');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Tab through the table
      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'gridcell');
    });

    it('announces changes to screen readers', async () => {
      render(<TeamScheduleTable team="Development-Tal" />);
      
      expect(screen.getByTestId('screen-reader-announcements')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders large datasets efficiently', () => {
      const largeTeamMembers = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Member ${i + 1}`,
        team: 'Development-Tal',
        email: `member${i + 1}@example.com`,
        role: 'member'
      }));

      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        teamMembers: largeTeamMembers
      });

      const startTime = performance.now();
      render(<TeamScheduleTable team="Development-Tal" />);
      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('uses virtualization for large lists', () => {
      const largeTeamMembers = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Member ${i + 1}`,
        team: 'Development-Tal',
        email: `member${i + 1}@example.com`,
        role: 'member'
      }));

      mockUseTeamDetail.mockReturnValue({
        ...mockUseTeamDetail(),
        teamMembers: largeTeamMembers
      });

      render(<TeamScheduleTable team="Development-Tal" />);
      
      // Should use virtualization for large datasets
      expect(screen.getByTestId('virtualized-table')).toBeInTheDocument();
    });
  });
});