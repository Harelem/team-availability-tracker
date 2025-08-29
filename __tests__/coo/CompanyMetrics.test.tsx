import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import CompanyMetrics from '@/components/coo/CompanyMetrics';

// Use the global Supabase mock from jest setup

const mockActiveSprint = {
  id: 1,
  name: 'Active Sprint',
  start_date: '2024-01-15',
  end_date: '2024-01-28',
  is_active: true,
  company_potential_hours: 280,
  progress_percentage: 75.5,
};

const mockProfiles = [
  { id: 'user1', full_name: 'John Doe', team: 'Development' },
  { id: 'user2', full_name: 'Jane Smith', team: 'Development' },
  { id: 'user3', full_name: 'Bob Wilson', team: 'QA' },
  { id: 'user4', full_name: 'Alice Brown', team: 'Design' },
  { id: 'user5', full_name: 'Charlie Green', team: 'Development' },
];

const mockScheduleEntries = [
  { id: 1, user_id: 'user1', date: '2024-01-15', value: 8 },
  { id: 2, user_id: 'user2', date: '2024-01-15', value: 7 },
  { id: 3, user_id: 'user3', date: '2024-01-15', value: 6 },
  { id: 4, user_id: 'user4', date: '2024-01-15', value: 8 },
  { id: 5, user_id: 'user1', date: '2024-01-16', value: 7 },
  { id: 6, user_id: 'user2', date: '2024-01-16', value: 8 },
];

describe('CompanyMetrics Component Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/lib/supabase').supabase;
  });

  describe('Data Loading and Display', () => {
    it('should display loading state initially', () => {
      mockSupabase.from().select().eq().single.mockImplementation(() => new Promise(() => {}));
      
      render(<CompanyMetrics onRefresh={jest.fn()} />);
      
      expect(screen.getByTestId('loading-metrics')).toBeInTheDocument();
    });

    it('should display company metrics after loading', async () => {
      // Mock the first query chain for active sprint
      const firstQuery = mockSupabase.from();
      firstQuery.mockResolvedValueOnce({
        data: mockActiveSprint,
        error: null,
      });
      
      // Mock subsequent query chains for teams and members
      const secondQuery = mockSupabase.from();
      secondQuery.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Development' }],
        error: null,
      });

      const thirdQuery = mockSupabase.from(); 
      thirdQuery.mockResolvedValueOnce({
        data: mockProfiles,
        error: null,
      });

      const fourthQuery = mockSupabase.from();
      fourthQuery.mockResolvedValueOnce({
        data: mockScheduleEntries,
        error: null,
      });

      const fifthQuery = mockSupabase.from();
      fifthQuery.mockResolvedValueOnce({
        data: mockScheduleEntries,
        error: null,
      });

      render(<CompanyMetrics />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-metrics')).not.toBeInTheDocument();
      });
    });

    it('should handle no active sprint gracefully', async () => {
      // Mock no active sprint (PGRST116 error code for no rows)
      const firstQuery = mockSupabase.from();
      firstQuery.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      
      // Mock teams query
      const secondQuery = mockSupabase.from();
      secondQuery.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Development' }],
        error: null,
      });

      // Mock team members query
      const thirdQuery = mockSupabase.from(); 
      thirdQuery.mockResolvedValueOnce({
        data: mockProfiles,
        error: null,
      });

      render(<CompanyMetrics />);

      await waitFor(() => {
        expect(screen.getByTestId('no-active-sprint')).toBeInTheDocument();
      });
    });

    it('should handle loading errors gracefully', async () => {
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' },
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Company Potential Hours Calculation', () => {
    beforeEach(() => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });
      
      mockSupabase.from().select()
        .mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should calculate potential hours correctly', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('280')).toBeInTheDocument();
      });
    });

    it('should exclude weekends from calculation', async () => {
      const sprintWithWeekend = {
        ...mockActiveSprint,
        start_date: '2024-01-12', // Friday
        end_date: '2024-01-15', // Monday
      };

      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: sprintWithWeekend,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        const workingDays = 2; // Friday and Monday (excluding weekend)
        const eligibleMembers = 5; // All mock profiles
        const expectedHours = workingDays * eligibleMembers * 7;
        expect(screen.getByText(expectedHours.toString())).toBeInTheDocument();
      });
    });

    it('should exclude Nir Shilo and Ran Avraham from calculation', async () => {
      const profilesWithExcluded = [
        ...mockProfiles,
        { id: 'nir-shilo', full_name: 'Nir Shilo', team: 'Management' },
        { id: 'ran-avraham', full_name: 'Ran Avraham', team: 'Management' },
      ];

      mockSupabase.from().select()
        .mockResolvedValue({
          data: profilesWithExcluded,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('280')).toBeInTheDocument();
      });
    });

    it('should handle empty team correctly', async () => {
      mockSupabase.from().select()
        .mockResolvedValue({
          data: [],
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('Working Days Calculation', () => {
    beforeEach(() => {
      mockSupabase.from().select()
        .mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should calculate working days excluding weekends', async () => {
      const sprintTwoWeeks = {
        ...mockActiveSprint,
        start_date: '2024-01-15', // Monday
        end_date: '2024-01-26', // Friday (2 weeks)
      };

      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: sprintTwoWeeks,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        const workingDays = 10; // 2 weeks * 5 working days
        const eligibleMembers = 5;
        const expectedHours = workingDays * eligibleMembers * 7;
        expect(screen.getByText(expectedHours.toString())).toBeInTheDocument();
      });
    });

    it('should handle single day sprint', async () => {
      const singleDaySprint = {
        ...mockActiveSprint,
        start_date: '2024-01-15', // Monday
        end_date: '2024-01-15', // Same Monday
      };

      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: singleDaySprint,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        const workingDays = 1;
        const eligibleMembers = 5;
        const expectedHours = workingDays * eligibleMembers * 7;
        expect(screen.getByText(expectedHours.toString())).toBeInTheDocument();
      });
    });

    it('should handle weekend-only sprint correctly', async () => {
      const weekendSprint = {
        ...mockActiveSprint,
        start_date: '2024-01-13', // Saturday
        end_date: '2024-01-14', // Sunday
      };

      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: weekendSprint,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(() => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });
      
      mockSupabase.from().select()
        .mockResolvedValue({
          data: mockProfiles,
          error: null,
        });
    });

    it('should display progress percentage correctly', async () => {
      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('75.5%')).toBeInTheDocument();
      });
    });

    it('should calculate actual hours worked', async () => {
      const totalHours = mockScheduleEntries.reduce((sum, entry) => sum + entry.value, 0);

      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(totalHours.toString())).toBeInTheDocument();
      });
    });

    it('should display utilization rate correctly', async () => {
      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        const totalActual = mockScheduleEntries.reduce((sum, entry) => sum + entry.value, 0);
        const utilization = ((totalActual / 280) * 100).toFixed(1);
        expect(screen.getByText(`${utilization}%`)).toBeInTheDocument();
      });
    });

    it('should handle zero actual hours', async () => {
      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: [],
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });
  });

  describe('Sprint Details Display', () => {
    beforeEach(() => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });
      
      mockSupabase.from().select()
        .mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should display sprint name and dates', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Active Sprint')).toBeInTheDocument();
        expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
        expect(screen.getByText(/2024-01-28/)).toBeInTheDocument();
      });
    });

    it('should show sprint duration', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        const duration = Math.ceil((new Date('2024-01-28').getTime() - new Date('2024-01-15').getTime()) / (1000 * 60 * 60 * 24)) + 1;
        expect(screen.getByText(`${duration} days`)).toBeInTheDocument();
      });
    });

    it('should display working days count', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/working days/i)).toBeInTheDocument();
      });
    });
  });

  describe('Team Statistics', () => {
    beforeEach(() => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });
      
      mockSupabase.from().select()
        .mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should display total team size', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/team size: 5/i)).toBeInTheDocument();
      });
    });

    it('should show active team members', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        const uniqueUsers = new Set(mockScheduleEntries.map(entry => entry.user_id)).size;
        expect(screen.getByText(`active members: ${uniqueUsers}`, { exact: false })).toBeInTheDocument();
      });
    });

    it('should display average hours per member', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        const totalHours = mockScheduleEntries.reduce((sum, entry) => sum + entry.value, 0);
        const uniqueUsers = new Set(mockScheduleEntries.map(entry => entry.user_id)).size;
        const average = (totalHours / uniqueUsers).toFixed(1);
        expect(screen.getByText(`${average}h avg`)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    beforeEach(() => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });
      
      mockSupabase.from().select()
        .mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should call onRefresh when refresh button is clicked', async () => {
      const mockRefresh = jest.fn();
      render(<CompanyMetrics onRefresh={mockRefresh} />);

      await waitFor(() => {
        expect(screen.getByText('Active Sprint')).toBeInTheDocument();
      });

      const refreshButton = screen.getByLabelText(/refresh metrics/i);
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should reload data when internal refresh is triggered', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(mockSupabase.from().select().eq().single).toHaveBeenCalledTimes(1);
      });

      const internalRefreshButton = screen.getByTestId('internal-refresh');
      fireEvent.click(internalRefreshButton);

      await waitFor(() => {
        expect(mockSupabase.from().select().eq().single).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle sprint data error', async () => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: null,
          error: { message: 'Sprint not found' },
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/error.*sprint not found/i)).toBeInTheDocument();
      });
    });

    it('should handle profiles data error', async () => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });
      
      mockSupabase.from().select()
        .mockResolvedValue({
          data: null,
          error: { message: 'Profiles not found' },
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/error.*profiles not found/i)).toBeInTheDocument();
      });
    });

    it('should handle schedule entries error', async () => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });
      
      mockSupabase.from().select()
        .mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: null,
          error: { message: 'Schedule entries not found' },
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/error.*schedule entries not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Validation', () => {
    it('should handle invalid date ranges gracefully', async () => {
      const invalidSprint = {
        ...mockActiveSprint,
        start_date: '2024-01-28',
        end_date: '2024-01-15', // End before start
      };

      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: invalidSprint,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/invalid date range/i)).toBeInTheDocument();
      });
    });

    it('should handle null dates gracefully', async () => {
      const nullDateSprint = {
        ...mockActiveSprint,
        start_date: null,
        end_date: null,
      };

      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: nullDateSprint,
          error: null,
        });

      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/invalid sprint dates/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(() => {
      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: mockActiveSprint,
          error: null,
        });
      
      mockSupabase.from().select()
        .mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

      mockSupabase.from().select().gte().lte()
        .mockResolvedValue({
          data: mockScheduleEntries,
          error: null,
        });
    });

    it('should display efficiency rating', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/efficiency/i)).toBeInTheDocument();
      });
    });

    it('should show capacity utilization', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/capacity utilization/i)).toBeInTheDocument();
      });
    });

    it('should display projected completion', async () => {
      render(<CompanyMetrics onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/projected completion/i)).toBeInTheDocument();
      });
    });
  });
});