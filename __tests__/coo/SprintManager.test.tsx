import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import SprintManager from '@/components/coo/SprintManager';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
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

const mockSprints = [
  {
    id: 1,
    name: 'Sprint 1',
    start_date: '2024-01-01',
    end_date: '2024-01-14',
    is_active: true,
    company_potential_hours: 280,
    progress_percentage: 75.5,
  },
  {
    id: 2,
    name: 'Sprint 2',
    start_date: '2024-01-15',
    end_date: '2024-01-28',
    is_active: false,
    company_potential_hours: 280,
    progress_percentage: 100,
  },
];

describe('SprintManager Component Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@supabase/supabase-js').createClient();
  });

  describe('Sprint Loading and Display', () => {
    it('should display loading state initially', () => {
      mockSupabase.from().select().order().mockImplementation(() => new Promise(() => {}));
      
      render(<SprintManager onRefresh={jest.fn()} />);
      
      expect(screen.getByTestId('loading-sprints')).toBeInTheDocument();
    });

    it('should display sprints after loading', async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });

      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
        expect(screen.getByText('Sprint 2')).toBeInTheDocument();
        expect(screen.getByText('75.5%')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('should handle loading error gracefully', async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading sprints/i)).toBeInTheDocument();
        expect(screen.getByText(/database error/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no sprints exist', async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: [],
        error: null,
      });

      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/no sprints found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sprint Creation', () => {
    beforeEach(async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });
    });

    it('should open create sprint form when add button is clicked', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/add new sprint/i));

      expect(screen.getByText(/create new sprint/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sprint name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });

    it('should create a new sprint successfully', async () => {
      const mockRefresh = jest.fn();
      mockSupabase.from().insert().mockResolvedValue({
        data: [{ id: 3, name: 'New Sprint' }],
        error: null,
      });

      render(<SprintManager onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/add new sprint/i));

      const nameInput = screen.getByLabelText(/sprint name/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(nameInput, 'New Sprint');
      await userEvent.type(startDateInput, '2024-02-01');
      await userEvent.type(endDateInput, '2024-02-14');

      fireEvent.click(screen.getByText(/create sprint/i));

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('sprint_history');
        expect(mockSupabase.from().insert).toHaveBeenCalledWith({
          name: 'New Sprint',
          start_date: '2024-02-01',
          end_date: '2024-02-14',
        });
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should validate required fields', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/add new sprint/i));
      fireEvent.click(screen.getByText(/create sprint/i));

      await waitFor(() => {
        expect(screen.getByText(/sprint name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
      });
    });

    it('should validate date order', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/add new sprint/i));

      const nameInput = screen.getByLabelText(/sprint name/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(nameInput, 'Invalid Sprint');
      await userEvent.type(startDateInput, '2024-02-14');
      await userEvent.type(endDateInput, '2024-02-01');

      fireEvent.click(screen.getByText(/create sprint/i));

      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      });
    });

    it('should handle creation errors', async () => {
      mockSupabase.from().insert().mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' },
      });

      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/add new sprint/i));

      const nameInput = screen.getByLabelText(/sprint name/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await userEvent.type(nameInput, 'Error Sprint');
      await userEvent.type(startDateInput, '2024-02-01');
      await userEvent.type(endDateInput, '2024-02-14');

      fireEvent.click(screen.getByText(/create sprint/i));

      await waitFor(() => {
        expect(screen.getByText(/error creating sprint/i)).toBeInTheDocument();
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sprint Editing', () => {
    beforeEach(async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });
    });

    it('should open edit form with existing values', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);

      expect(screen.getByText(/edit sprint/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sprint 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-14')).toBeInTheDocument();
    });

    it('should update sprint successfully', async () => {
      const mockRefresh = jest.fn();
      mockSupabase.from().update().eq().mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      });

      render(<SprintManager onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);

      const nameInput = screen.getByDisplayValue('Sprint 1');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Sprint');

      fireEvent.click(screen.getByText(/update sprint/i));

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          name: 'Updated Sprint',
          start_date: '2024-01-01',
          end_date: '2024-01-14',
        });
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle update errors', async () => {
      mockSupabase.from().update().eq().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText(/edit/i);
      fireEvent.click(editButtons[0]);

      fireEvent.click(screen.getByText(/update sprint/i));

      await waitFor(() => {
        expect(screen.getByText(/error updating sprint/i)).toBeInTheDocument();
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sprint Deletion', () => {
    beforeEach(async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });
    });

    it('should show confirmation dialog before deletion', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure.*Sprint 1/i)).toBeInTheDocument();
    });

    it('should delete sprint successfully', async () => {
      const mockRefresh = jest.fn();
      mockSupabase.from().delete().eq().mockResolvedValue({
        error: null,
      });

      render(<SprintManager onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByText(/confirm delete/i));

      await waitFor(() => {
        expect(mockSupabase.from().delete).toHaveBeenCalled();
        expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 1);
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle deletion errors', async () => {
      mockSupabase.from().delete().eq().mockResolvedValue({
        error: { message: 'Deletion failed' },
      });

      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByText(/confirm delete/i));

      await waitFor(() => {
        expect(screen.getByText(/error deleting sprint/i)).toBeInTheDocument();
        expect(screen.getByText(/deletion failed/i)).toBeInTheDocument();
      });
    });

    it('should cancel deletion when cancel is clicked', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText(/delete/i);
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByText(/cancel/i));

      expect(screen.queryByText(/confirm deletion/i)).not.toBeInTheDocument();
      expect(mockSupabase.from().delete).not.toHaveBeenCalled();
    });
  });

  describe('Sprint Activation', () => {
    beforeEach(async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });
    });

    it('should activate sprint successfully', async () => {
      const mockRefresh = jest.fn();
      mockSupabase.from().update().eq().mockResolvedValue({
        data: [{ id: 2 }],
        error: null,
      });

      render(<SprintManager onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 2')).toBeInTheDocument();
      });

      const activateButtons = screen.getAllByText(/activate/i);
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({ is_active: true });
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should deactivate sprint successfully', async () => {
      const mockRefresh = jest.fn();
      mockSupabase.from().update().eq().mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      });

      render(<SprintManager onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const deactivateButtons = screen.getAllByText(/deactivate/i);
      fireEvent.click(deactivateButtons[0]);

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({ is_active: false });
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('should handle activation errors', async () => {
      mockSupabase.from().update().eq().mockResolvedValue({
        data: null,
        error: { message: 'Activation failed' },
      });

      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 2')).toBeInTheDocument();
      });

      const activateButtons = screen.getAllByText(/activate/i);
      fireEvent.click(activateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/error updating sprint/i)).toBeInTheDocument();
        expect(screen.getByText(/activation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sprint Refresh', () => {
    it('should call onRefresh when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });

      render(<SprintManager onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const refreshButton = screen.getByLabelText(/refresh sprints/i);
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Progress Display', () => {
    beforeEach(async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });
    });

    it('should display progress percentage correctly', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('75.5%')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('should display progress bars with correct width', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        const progressBars = screen.getAllByTestId('progress-bar');
        expect(progressBars[0]).toHaveStyle('width: 75.5%');
        expect(progressBars[1]).toHaveStyle('width: 100%');
      });
    });

    it('should handle zero progress correctly', async () => {
      const zeroProgressSprint = {
        ...mockSprints[0],
        progress_percentage: 0,
      };
      
      mockSupabase.from().select().order().mockResolvedValue({
        data: [zeroProgressSprint],
        error: null,
      });

      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument();
        const progressBar = screen.getByTestId('progress-bar');
        expect(progressBar).toHaveStyle('width: 0%');
      });
    });
  });

  describe('Active Sprint Indicators', () => {
    beforeEach(async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });
    });

    it('should show active indicator for active sprints', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });
    });

    it('should show inactive indicator for inactive sprints', async () => {
      render(<SprintManager onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/inactive/i)).toBeInTheDocument();
      });
    });
  });
});