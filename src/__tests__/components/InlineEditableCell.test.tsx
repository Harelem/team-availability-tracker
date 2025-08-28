/**
 * InlineEditableCell Component Tests
 * Tests for click-to-edit functionality, auto-save, and reason validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineEditableCell from '@/components/InlineEditableCell';
import { DatabaseService } from '@/lib/database';
import { CellValue } from '@/components/InlineEditableCell';

// Mock the DatabaseService
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    updateScheduleEntry: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => <div className={className} data-testid="loading-icon" />,
}));

describe('InlineEditableCell', () => {
  const defaultProps = {
    value: null as CellValue | null,
    date: '2024-01-17',
    memberId: '1',
    teamId: '1',
    isManagerView: true,
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (DatabaseService.updateScheduleEntry as jest.Mock).mockResolvedValue({ success: true });
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    test('should render empty cell by default', () => {
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      expect(cell).toBeInTheDocument();
      expect(cell).toHaveClass('bg-white');
    });

    test('should display full day value correctly', () => {
      const value: CellValue = { value: '1', hours: 7 };
      render(<InlineEditableCell {...defaultProps} value={value} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('should display half day value with symbol', () => {
      const value: CellValue = { value: '0.5', hours: 3.5 };
      render(<InlineEditableCell {...defaultProps} value={value} />);
      
      expect(screen.getByText('½')).toBeInTheDocument();
    });

    test('should display sick/OOO value', () => {
      const value: CellValue = { value: 'X', hours: 0 };
      render(<InlineEditableCell {...defaultProps} value={value} />);
      
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    test('should show reason indicator for entries with reasons', () => {
      const value: CellValue = { value: '0.5', hours: 3.5, reason: 'Doctor appointment' };
      render(<InlineEditableCell {...defaultProps} value={value} />);
      
      const reasonIndicator = screen.getByRole('generic');
      expect(reasonIndicator).toHaveClass('bg-blue-400');
    });

    test('should apply correct styling based on value', () => {
      const { rerender } = render(<InlineEditableCell {...defaultProps} value={{ value: '1', hours: 7 }} />);
      let cell = screen.getByRole('generic');
      expect(cell).toHaveClass('bg-green-50');

      rerender(<InlineEditableCell {...defaultProps} value={{ value: '0.5', hours: 3.5 }} />);
      cell = screen.getByRole('generic');
      expect(cell).toHaveClass('bg-yellow-50');

      rerender(<InlineEditableCell {...defaultProps} value={{ value: 'X', hours: 0 }} />);
      cell = screen.getByRole('generic');
      expect(cell).toHaveClass('bg-red-50');
    });
  });

  // ============================================================================
  // Interaction Tests
  // ============================================================================

  describe('User Interactions', () => {
    test('should enter edit mode on click for managers', async () => {
      const user = userEvent.setup();
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      // Should show value selection buttons
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '0.5' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'X' })).toBeInTheDocument();
    });

    test('should not enter edit mode for non-manager view', async () => {
      const user = userEvent.setup();
      render(<InlineEditableCell {...defaultProps} isManagerView={false} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      // Should not show edit buttons
      expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    });

    test('should save full day entry directly', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();
      
      render(<InlineEditableCell {...defaultProps} onSave={mockOnSave} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const fullDayButton = screen.getByRole('button', { name: '1' });
      await user.click(fullDayButton);
      
      await waitFor(() => {
        expect(DatabaseService.updateScheduleEntry).toHaveBeenCalledWith(
          1,
          '2024-01-17',
          '1',
          undefined
        );
      });

      expect(mockOnSave).toHaveBeenCalledWith({
        value: '1',
        hours: 7,
      });
    });

    test('should prompt for reason when selecting half day', async () => {
      const user = userEvent.setup();
      
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const halfDayButton = screen.getByRole('button', { name: '0.5' });
      await user.click(halfDayButton);
      
      // Should show reason input
      expect(screen.getByPlaceholderText('Enter reason...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    test('should require reason for half day and sick entries', async () => {
      const user = userEvent.setup();
      
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const sickButton = screen.getByRole('button', { name: 'X' });
      await user.click(sickButton);
      
      const reasonInput = screen.getByPlaceholderText('Enter reason...');
      const saveButton = screen.getByRole('button', { name: 'Save' });
      
      // Save should be disabled without reason
      expect(saveButton).toBeDisabled();
      
      // Enter reason
      await user.type(reasonInput, 'Flu symptoms');
      
      // Save should now be enabled
      expect(saveButton).not.toBeDisabled();
    });

    test('should save entry with reason', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();
      
      render(<InlineEditableCell {...defaultProps} onSave={mockOnSave} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const sickButton = screen.getByRole('button', { name: 'X' });
      await user.click(sickButton);
      
      const reasonInput = screen.getByPlaceholderText('Enter reason...');
      await user.type(reasonInput, 'Medical appointment');
      
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(DatabaseService.updateScheduleEntry).toHaveBeenCalledWith(
          1,
          '2024-01-17',
          'X',
          'Medical appointment'
        );
      });

      expect(mockOnSave).toHaveBeenCalledWith({
        value: 'X',
        reason: 'Medical appointment',
        hours: 0,
      });
    });

    test('should cancel edit mode', async () => {
      const user = userEvent.setup();
      
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const halfDayButton = screen.getByRole('button', { name: '0.5' });
      await user.click(halfDayButton);
      
      const reasonInput = screen.getByPlaceholderText('Enter reason...');
      await user.type(reasonInput, 'Some reason');
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      
      // Should exit edit mode
      expect(screen.queryByPlaceholderText('Enter reason...')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Keyboard Navigation Tests
  // ============================================================================

  describe('Keyboard Navigation', () => {
    test('should handle keyboard shortcuts in edit mode', async () => {
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      fireEvent.click(cell);
      
      // Test '1' key for full day
      fireEvent.keyDown(cell, { key: '1' });
      
      await waitFor(() => {
        expect(DatabaseService.updateScheduleEntry).toHaveBeenCalledWith(
          1,
          '2024-01-17',
          '1',
          undefined
        );
      });
    });

    test('should handle Escape key to cancel', () => {
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      fireEvent.click(cell);
      
      // Should show edit buttons
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      
      // Press Escape
      fireEvent.keyDown(cell, { key: 'Escape' });
      
      // Should exit edit mode
      expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    });

    test('should handle Enter key in reason input', async () => {
      const user = userEvent.setup();
      
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const halfDayButton = screen.getByRole('button', { name: '0.5' });
      await user.click(halfDayButton);
      
      const reasonInput = screen.getByPlaceholderText('Enter reason...');
      await user.type(reasonInput, 'Doctor visit');
      
      // Press Enter
      fireEvent.keyDown(reasonInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(DatabaseService.updateScheduleEntry).toHaveBeenCalledWith(
          1,
          '2024-01-17',
          '0.5',
          'Doctor visit'
        );
      });
    });
  });

  // ============================================================================
  // Loading and Error States
  // ============================================================================

  describe('Loading and Error States', () => {
    test('should show loading spinner while saving', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      (DatabaseService.updateScheduleEntry as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const fullDayButton = screen.getByRole('button', { name: '1' });
      await user.click(fullDayButton);
      
      // Should show loading spinner
      expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-icon')).not.toBeInTheDocument();
      });
    });

    test('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (DatabaseService.updateScheduleEntry as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const fullDayButton = screen.getByRole('button', { name: '1' });
      await user.click(fullDayButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error saving schedule entry:',
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });

    test('should prevent interactions while saving', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      (DatabaseService.updateScheduleEntry as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      await user.click(cell);
      
      const fullDayButton = screen.getByRole('button', { name: '1' });
      await user.click(fullDayButton);
      
      // Try to click again while saving
      await user.click(cell);
      
      // Should not enter edit mode while saving
      expect(screen.queryByRole('button', { name: '0.5' })).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Outside Click Tests
  // ============================================================================

  describe('Outside Click Handling', () => {
    test('should cancel edit mode on outside click', async () => {
      render(
        <div>
          <InlineEditableCell {...defaultProps} />
          <div data-testid="outside-element">Outside</div>
        </div>
      );
      
      const cell = screen.getByRole('generic');
      fireEvent.click(cell);
      
      // Should be in edit mode
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      
      // Click outside
      const outsideElement = screen.getByTestId('outside-element');
      fireEvent.mouseDown(outsideElement);
      
      // Should exit edit mode
      expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    });

    test('should not cancel on clicks within the cell', () => {
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      fireEvent.click(cell);
      
      // Should be in edit mode
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      
      // Click within the cell
      fireEvent.mouseDown(cell);
      
      // Should still be in edit mode
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    test('should be keyboard accessible', () => {
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      
      // Should be focusable for managers
      expect(cell).toHaveAttribute('tabIndex', '0');
    });

    test('should not be focusable for non-manager view', () => {
      render(<InlineEditableCell {...defaultProps} isManagerView={false} />);
      
      const cell = screen.getByRole('generic');
      
      // Should not be focusable for regular users
      expect(cell).toHaveAttribute('tabIndex', '-1');
    });

    test('should have proper ARIA attributes', () => {
      const value: CellValue = { value: '1', hours: 7 };
      render(<InlineEditableCell {...defaultProps} value={value} />);
      
      const cell = screen.getByRole('generic');
      
      // Should have appropriate classes for screen readers
      expect(cell).toHaveClass('cursor-pointer');
    });

    test('should handle focus and blur events', () => {
      render(<InlineEditableCell {...defaultProps} />);
      
      const cell = screen.getByRole('generic');
      
      fireEvent.focus(cell);
      fireEvent.blur(cell);
      
      // Should not crash and maintain proper state
      expect(cell).toBeInTheDocument();
    });
  });
});