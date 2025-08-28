import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import DailyStatus from '@/components/coo/DailyStatus';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
  })),
}));

const mockScheduleEntries = [
  {
    id: 1,
    user_id: 'user1',
    date: '2024-01-15',
    value: 8,
    absence_reason: null,
    profiles: { full_name: 'John Doe', team: 'Development' },
  },
  {
    id: 2,
    user_id: 'user2',
    date: '2024-01-15',
    value: 4,
    absence_reason: null,
    profiles: { full_name: 'Jane Smith', team: 'Development' },
  },
  {
    id: 3,
    user_id: 'user3',
    date: '2024-01-15',
    value: 0,
    absence_reason: 'Sick Leave',
    profiles: { full_name: 'Bob Wilson', team: 'QA' },
  },
  {
    id: 4,
    user_id: 'user4',
    date: '2024-01-15',
    value: 7,
    absence_reason: null,
    profiles: { full_name: 'Alice Brown', team: 'Design' },
  },
];

const mockProfiles = [
  { id: 'user1', full_name: 'John Doe', team: 'Development' },
  { id: 'user2', full_name: 'Jane Smith', team: 'Development' },
  { id: 'user3', full_name: 'Bob Wilson', team: 'QA' },
  { id: 'user4', full_name: 'Alice Brown', team: 'Design' },
  { id: 'user5', full_name: 'Charlie Green', team: 'Development' },
];

describe('DailyStatus Component Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@supabase/supabase-js').createClient();
  });

  describe('Data Loading and Display', () => {
    it('should display loading state initially', () => {
      mockSupabase.from().select().eq().gte().lte().mockImplementation(() => new Promise(() => {}));
      
      render(<DailyStatus onRefresh={jest.fn()} />);
      
      expect(screen.getByTestId('loading-daily-status')).toBeInTheDocument();
    });

    it('should display daily status data after loading', async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValueOnce({
          data: mockScheduleEntries,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfiles,
          error: null,
        });

      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Development (2)')).toBeInTheDocument();
        expect(screen.getByText('QA (1)')).toBeInTheDocument();
        expect(screen.getByText('Design (1)')).toBeInTheDocument();
      });
    });

    it('should handle loading errors gracefully', async () => {
      mockSupabase.from().select().eq().gte().lte().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading daily status/i)).toBeInTheDocument();
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      });
    });

    it('should display company summary correctly', async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValueOnce({
          data: mockScheduleEntries,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfiles,
          error: null,
        });

      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/total hours: 19/i)).toBeInTheDocument();
        expect(screen.getByText(/present: 3/i)).toBeInTheDocument();
        expect(screen.getByText(/absent: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/not scheduled: 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Selection', () => {
    beforeEach(async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should default to today\'s date', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      render(<DailyStatus onRefresh={jest.fn()} />);

      const dateInput = screen.getByLabelText(/select date/i);
      expect(dateInput).toHaveValue(today);
    });

    it('should update data when date is changed', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      const dateInput = screen.getByLabelText(/select date/i);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '2024-01-16');

      await waitFor(() => {
        expect(mockSupabase.from().select().eq().gte().lte).toHaveBeenCalledWith(
          expect.stringContaining('2024-01-16')
        );
      });
    });

    it('should handle weekend dates correctly', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      const dateInput = screen.getByLabelText(/select date/i);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '2024-01-13'); // Saturday

      await waitFor(() => {
        expect(screen.getByText(/weekend day/i)).toBeInTheDocument();
      });
    });
  });

  describe('Team Breakdown', () => {
    beforeEach(async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValueOnce({
          data: mockScheduleEntries,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfiles,
          error: null,
        });
    });

    it('should group employees by team correctly', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Development (2)')).toBeInTheDocument();
        expect(screen.getByText('QA (1)')).toBeInTheDocument();
        expect(screen.getByText('Design (1)')).toBeInTheDocument();
      });
    });

    it('should show expandable team details', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Development (2)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Development (2)'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('8 hours')).toBeInTheDocument();
        expect(screen.getByText('4 hours')).toBeInTheDocument();
      });
    });

    it('should collapse team details when clicked again', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Development (2)')).toBeInTheDocument();
      });

      const teamHeader = screen.getByText('Development (2)');
      fireEvent.click(teamHeader);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.click(teamHeader);

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('should display absence reasons correctly', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('QA (1)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('QA (1)'));

      await waitFor(() => {
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        expect(screen.getByText('Sick Leave')).toBeInTheDocument();
      });
    });

    it('should show team totals correctly', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Development (2)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Development (2)'));

      await waitFor(() => {
        expect(screen.getByText(/total: 12 hours/i)).toBeInTheDocument();
      });
    });
  });

  describe('Personnel Exclusions', () => {
    it('should exclude Nir Shilo and Ran Avraham from counts', async () => {
      const entriesWithExcluded = [
        ...mockScheduleEntries,
        {
          id: 5,
          user_id: 'nir-shilo',
          date: '2024-01-15',
          value: 8,
          absence_reason: null,
          profiles: { full_name: 'Nir Shilo', team: 'Management' },
        },
        {
          id: 6,
          user_id: 'ran-avraham',
          date: '2024-01-15',
          value: 7,
          absence_reason: null,
          profiles: { full_name: 'Ran Avraham', team: 'Management' },
        },
      ];

      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValueOnce({
          data: entriesWithExcluded,
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            ...mockProfiles,
            { id: 'nir-shilo', full_name: 'Nir Shilo', team: 'Management' },
            { id: 'ran-avraham', full_name: 'Ran Avraham', team: 'Management' },
          ],
          error: null,
        });

      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/total hours: 19/i)).toBeInTheDocument();
        expect(screen.getByText(/present: 3/i)).toBeInTheDocument();
        expect(screen.queryByText('Nir Shilo')).not.toBeInTheDocument();
        expect(screen.queryByText('Ran Avraham')).not.toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should set up real-time subscription', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('daily-status-realtime');
        expect(mockSupabase.channel().on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: '*',
            schema: 'public',
            table: 'schedule_entries',
          }),
          expect.any(Function)
        );
        expect(mockSupabase.channel().subscribe).toHaveBeenCalled();
      });
    });

    it('should handle real-time updates', async () => {
      let realtimeCallback: any;
      mockSupabase.channel().on.mockImplementation((event: any, config: any, callback: any) => {
        realtimeCallback = callback;
        return mockSupabase.channel();
      });

      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(realtimeCallback).toBeDefined();
      });

      const mockUpdate = {
        eventType: 'UPDATE',
        new: {
          id: 1,
          user_id: 'user1',
          date: '2024-01-15',
          value: 6,
          absence_reason: null,
        },
      };

      realtimeCallback(mockUpdate);

      await waitFor(() => {
        expect(mockSupabase.from().select().eq().gte().lte).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Empty States', () => {
    it('should display empty state when no data available', async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfiles,
          error: null,
        });

      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/no attendance data/i)).toBeInTheDocument();
      });
    });

    it('should handle teams with no members scheduled', async () => {
      const limitedEntries = [mockScheduleEntries[0]]; // Only Development team member

      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValueOnce({
          data: limitedEntries,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfiles,
          error: null,
        });

      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Development (1)')).toBeInTheDocument();
        expect(screen.queryByText('QA')).not.toBeInTheDocument();
        expect(screen.queryByText('Design')).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should call onRefresh when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      render(<DailyStatus onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Development (2)')).toBeInTheDocument();
      });

      const refreshButton = screen.getByLabelText(/refresh daily status/i);
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should reload data when internal refresh is triggered', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(mockSupabase.from().select().eq().gte().lte).toHaveBeenCalledTimes(2);
      });

      const internalRefreshButton = screen.getByTestId('internal-refresh');
      fireEvent.click(internalRefreshButton);

      await waitFor(() => {
        expect(mockSupabase.from().select().eq().gte().lte).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('Weekend Handling', () => {
    it('should identify Friday as weekend', async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValue({
          data: [],
          error: null,
        });

      render(<DailyStatus onRefresh={jest.fn()} />);

      const dateInput = screen.getByLabelText(/select date/i);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '2024-01-12'); // Friday

      await waitFor(() => {
        expect(screen.getByText(/weekend day/i)).toBeInTheDocument();
      });
    });

    it('should identify Saturday as weekend', async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValue({
          data: [],
          error: null,
        });

      render(<DailyStatus onRefresh={jest.fn()} />);

      const dateInput = screen.getByLabelText(/select date/i);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '2024-01-13'); // Saturday

      await waitFor(() => {
        expect(screen.getByText(/weekend day/i)).toBeInTheDocument();
      });
    });

    it('should not identify weekdays as weekend', async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });

      render(<DailyStatus onRefresh={jest.fn()} />);

      const dateInput = screen.getByLabelText(/select date/i);
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '2024-01-15'); // Monday

      await waitFor(() => {
        expect(screen.queryByText(/weekend day/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Indicators', () => {
    beforeEach(async () => {
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValueOnce({
          data: mockScheduleEntries,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockProfiles,
          error: null,
        });
    });

    it('should show correct status indicators for team members', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Development (2)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Development (2)'));

      await waitFor(() => {
        const presentIndicators = screen.getAllByTestId('status-present');
        expect(presentIndicators).toHaveLength(2);
      });
    });

    it('should show absent status for absent members', async () => {
      render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('QA (1)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('QA (1)'));

      await waitFor(() => {
        const absentIndicator = screen.getByTestId('status-absent');
        expect(absentIndicator).toBeInTheDocument();
      });
    });
  });
});