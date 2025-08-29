/**
 * Comprehensive Unit Tests - ScheduleEntry Component  
 * Tests schedule entry editing with status changes, reason validation, and real-time sync
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import ScheduleEntry from '@/components/InlineEditableCell';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/hooks/useDebouncedScheduleUpdate');

describe('ScheduleEntry Component - Comprehensive Tests', () => {
  const defaultProps = {
    userId: 1,
    date: '2024-01-17',
    initialValue: 7,
    onUpdate: jest.fn(),
    readOnly: false,
    teamMemberName: 'Ido Keller'
  };

  let mockDebouncedUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock debounced update hook
    mockDebouncedUpdate = require('@/hooks/useDebouncedScheduleUpdate').default as jest.Mock;
    mockDebouncedUpdate.mockReturnValue({
      updateValue: jest.fn(),
      isUpdating: false,
      error: null
    });
  });

  describe('Status Value Changes', () => {
    it('handles full day (7 hours) entry correctly', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();

      render(<ScheduleEntry {...defaultProps} onUpdate={mockUpdate} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, '7');
      
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(1, '2024-01-17', '7', null);
      });
    });

    it('handles half day (3.5 hours) with reason requirement', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();

      render(<ScheduleEntry {...defaultProps} onUpdate={mockUpdate} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, '3.5');
      
      // Should show reason dialog
      await waitFor(() => {
        expect(screen.getByTestId('reason-dialog')).toBeInTheDocument();
      });

      // Enter reason
      const reasonInput = screen.getByLabelText('Reason for half day');
      await user.type(reasonInput, 'Doctor appointment');
      
      const submitButton = screen.getByText('Save');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(1, '2024-01-17', '3.5', 'Doctor appointment');
      });
    });

    it('handles absence (0 hours) with reason requirement', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();

      render(<ScheduleEntry {...defaultProps} onUpdate={mockUpdate} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, '0');
      
      // Should show reason dialog with absence reasons
      await waitFor(() => {
        expect(screen.getByTestId('absence-reason-dialog')).toBeInTheDocument();
      });

      // Select absence reason
      const sickOption = screen.getByText('Sick');
      await user.click(sickOption);
      
      const submitButton = screen.getByText('Save');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(1, '2024-01-17', '0', 'Sick');
      });
    });

    it('handles X status (absence) correctly', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();

      render(<ScheduleEntry {...defaultProps} onUpdate={mockUpdate} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, 'X');
      
      // Should automatically trigger absence dialog
      await waitFor(() => {
        expect(screen.getByTestId('absence-reason-dialog')).toBeInTheDocument();
      });

      const vacationOption = screen.getByText('Vacation');
      await user.click(vacationOption);
      
      const submitButton = screen.getByText('Save');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(1, '2024-01-17', '0', 'Vacation');
      });
    });
  });

  describe('Reason Validation', () => {
    it('requires reason for half-day entries', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, '3.5');
      
      await waitFor(() => {
        expect(screen.getByTestId('reason-dialog')).toBeInTheDocument();
      });

      // Try to submit without reason
      const submitButton = screen.getByText('Save');
      await user.click(submitButton);

      expect(screen.getByText('Reason is required for half days')).toBeInTheDocument();
    });

    it('requires reason for absence entries', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, '0');
      
      await waitFor(() => {
        expect(screen.getByTestId('absence-reason-dialog')).toBeInTheDocument();
      });

      // Try to submit without selecting reason
      const submitButton = screen.getByText('Save');
      await user.click(submitButton);

      expect(screen.getByText('Please select a reason for absence')).toBeInTheDocument();
    });

    it('validates custom reason input', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, '0');
      
      await waitFor(() => {
        expect(screen.getByTestId('absence-reason-dialog')).toBeInTheDocument();
      });

      // Select "Other" to show custom input
      const otherOption = screen.getByText('Other');
      await user.click(otherOption);

      const customReasonInput = screen.getByLabelText('Custom reason');
      
      // Try to submit with empty custom reason
      const submitButton = screen.getByText('Save');
      await user.click(submitButton);

      expect(screen.getByText('Please provide a custom reason')).toBeInTheDocument();

      // Enter valid custom reason
      await user.type(customReasonInput, 'Emergency family matter');
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onUpdate).toHaveBeenCalledWith(1, '2024-01-17', '0', 'Emergency family matter');
      });
    });
  });

  describe('Real-time Sync', () => {
    it('shows updating indicator during save', async () => {
      mockDebouncedUpdate.mockReturnValue({
        updateValue: jest.fn(),
        isUpdating: true,
        error: null
      });

      render(<ScheduleEntry {...defaultProps} />);
      
      expect(screen.getByTestId('updating-indicator')).toBeInTheDocument();
      expect(screen.getByLabelText('Saving...')).toBeInTheDocument();
    });

    it('handles update errors gracefully', async () => {
      const user = userEvent.setup();
      mockDebouncedUpdate.mockReturnValue({
        updateValue: jest.fn(),
        isUpdating: false,
        error: new Error('Network error')
      });

      render(<ScheduleEntry {...defaultProps} />);
      
      expect(screen.getByTestId('error-indicator')).toBeInTheDocument();
      expect(screen.getByText('Failed to save')).toBeInTheDocument();
      
      // Should show retry button
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      await user.click(retryButton);
      // Should attempt to save again
    });

    it('debounces rapid changes', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();
      mockDebouncedUpdate.mockReturnValue({
        updateValue: mockUpdate,
        isUpdating: false,
        error: null
      });

      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      
      // Type rapidly
      await user.clear(input);
      await user.type(input, '5');
      await user.type(input, '6');
      await user.type(input, '7');
      
      // Should only call update once after debounce
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Input Validation', () => {
    it('accepts valid hour values', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      const validValues = ['0', '1', '2', '3', '3.5', '4', '5', '6', '7', '8'];
      
      for (const value of validValues) {
        await user.clear(input);
        await user.type(input, value);
        
        // Should not show validation error
        expect(screen.queryByText('Invalid hours value')).not.toBeInTheDocument();
      }
    });

    it('rejects invalid hour values', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      const invalidValues = ['-1', '9', '10', 'abc', '3.75', '7.5'];
      
      for (const value of invalidValues) {
        await user.clear(input);
        await user.type(input, value);
        await user.tab(); // Trigger validation
        
        expect(screen.getByText('Invalid hours value')).toBeInTheDocument();
      }
    });

    it('accepts special characters for absence', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      const specialValues = ['X', 'x', '-'];
      
      for (const value of specialValues) {
        await user.clear(input);
        await user.type(input, value);
        
        // Should show absence reason dialog
        await waitFor(() => {
          expect(screen.getByTestId('absence-reason-dialog')).toBeInTheDocument();
        });

        // Close dialog for next iteration
        const cancelButton = screen.getByText('Cancel');
        await user.click(cancelButton);
      }
    });
  });

  describe('Read-only Mode', () => {
    it('disables input when read-only', () => {
      render(<ScheduleEntry {...defaultProps} readOnly={true} />);
      
      const input = screen.getByDisplayValue('7');
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('aria-readonly', 'true');
    });

    it('shows read-only indicator', () => {
      render(<ScheduleEntry {...defaultProps} readOnly={true} />);
      
      expect(screen.getByTestId('read-only-indicator')).toBeInTheDocument();
    });

    it('prevents interaction when read-only', async () => {
      const user = userEvent.setup();
      const mockUpdate = jest.fn();

      render(<ScheduleEntry {...defaultProps} readOnly={true} onUpdate={mockUpdate} />);
      
      const input = screen.getByDisplayValue('7');
      await user.click(input);
      
      // Should not trigger any updates
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      expect(input).toHaveAttribute('aria-label', 'Hours for Ido Keller on 2024-01-17');
      expect(input).toHaveAttribute('role', 'spinbutton');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      
      // Should focus on tab
      await user.tab();
      expect(input).toHaveFocus();
      
      // Arrow keys should modify values
      await user.keyboard('[ArrowUp]');
      expect(input).toHaveValue('8');
      
      await user.keyboard('[ArrowDown]');
      expect(input).toHaveValue('7');
    });

    it('announces changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, '3.5');
      
      // Should have live region announcement
      await waitFor(() => {
        expect(screen.getByTestId('sr-announcement')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Experience', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
    });

    it('shows mobile-optimized reason dialog', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      await user.clear(input);
      await user.type(input, '0');
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-reason-sheet')).toBeInTheDocument();
      });
    });

    it('handles touch interactions properly', async () => {
      const user = userEvent.setup();
      render(<ScheduleEntry {...defaultProps} />);
      
      const input = screen.getByDisplayValue('7');
      
      // Simulate touch tap
      fireEvent.touchStart(input);
      fireEvent.touchEnd(input);
      
      expect(input).toHaveFocus();
    });
  });
});