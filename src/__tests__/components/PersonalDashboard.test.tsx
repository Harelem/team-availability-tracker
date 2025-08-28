/**
 * PersonalDashboard Component Tests
 * Tests for personal stats, calendar integration, and sprint progress
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PersonalDashboard from '@/components/PersonalDashboard';
import { DatabaseService } from '@/lib/database';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import {
  createMockTeam,
  createMockTeamMember,
  createMockCurrentSprint,
  createSprintWorkingDays,
} from '../utils/testSetup';

// Mock the dependencies
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getScheduleEntries: jest.fn(),
  },
}));

jest.mock('@/contexts/GlobalSprintContext', () => ({
  useGlobalSprint: jest.fn(),
}));

// Mock child components
jest.mock('@/components/PersonalCalendar', () => {
  return function MockPersonalCalendar({ onDataChange }: any) {
    return (
      <div data-testid="personal-calendar">
        <button 
          onClick={() => onDataChange({ 1: { '2024-01-17': { value: '1', hours: 7 } } })}
        >
          Update Schedule
        </button>
      </div>
    );
  };
});

jest.mock('@/components/PersonalStatsCard', () => {
  return function MockPersonalStatsCard({ title, value, description }: any) {
    return (
      <div data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h3>{title}</h3>
        <div>{value}</div>
        <p>{description}</p>
      </div>
    );
  };
});

jest.mock('@/components/PersonalHoursStatus', () => {
  return function MockPersonalHoursStatus() {
    return <div data-testid="personal-hours-status">Hours Status</div>;
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  User: () => <div data-testid="user-icon" />,
  Award: () => <div data-testid="award-icon" />,
}));

describe('PersonalDashboard', () => {
  const mockUser = createMockTeamMember({
    id: 1,
    name: 'John Doe',
    hebrew: 'ג\'ון דו',
    team_id: 1,
  });

  const mockTeam = createMockTeam({
    id: 1,
    name: 'Development-Tal',
    description: 'Frontend & Backend Development Team',
  });

  const mockCurrentSprint = createMockCurrentSprint({
    sprint_start_date: '2024-01-17',
    sprint_end_date: '2024-01-30',
    length_weeks: 2,
  });

  const defaultProps = {
    user: mockUser,
    team: mockTeam,
    teamMembers: [mockUser],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useGlobalSprint as jest.Mock).mockReturnValue({
      currentSprint: mockCurrentSprint,
      isLoading: false,
    });

    (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue({
      1: {
        '2024-01-17': { value: '1', hours: 7 },
        '2024-01-18': { value: '0.5', hours: 3.5, reason: 'Doctor appointment' },
        '2024-01-21': { value: 'X', hours: 0, reason: 'Sick leave' },
        '2024-01-22': { value: '1', hours: 7 },
        '2024-01-23': { value: '1', hours: 7 },
      },
    });
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    test('should render personal header with user information', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument();
        expect(screen.getByText('ג\'ון דו • Development-Tal')).toBeInTheDocument();
      });
    });

    test('should render current sprint information', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Current Sprint')).toBeInTheDocument();
        expect(screen.getByText(/\(10 working days\)/)).toBeInTheDocument();
      });
    });

    test('should render all stats cards', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('stats-card-hours-submitted')).toBeInTheDocument();
        expect(screen.getByTestId('stats-card-days-submitted')).toBeInTheDocument();
        expect(screen.getByTestId('stats-card-sprint-progress')).toBeInTheDocument();
        expect(screen.getByTestId('stats-card-status')).toBeInTheDocument();
      });
    });

    test('should render personal calendar component', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('personal-calendar')).toBeInTheDocument();
        expect(screen.getByText('My Sprint Schedule')).toBeInTheDocument();
      });
    });

    test('should render quick tips section', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('💡 Quick Tips')).toBeInTheDocument();
        expect(screen.getByText(/1.*Full day \(7 hours\)/)).toBeInTheDocument();
        expect(screen.getByText(/0\.5.*Half day \(3\.5 hours\)/)).toBeInTheDocument();
        expect(screen.getByText(/X.*Sick\/Out of office \(0 hours\)/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Loading States Tests
  // ============================================================================

  describe('Loading States', () => {
    test('should show loading skeleton when loading', () => {
      (useGlobalSprint as jest.Mock).mockReturnValue({
        currentSprint: null,
        isLoading: true,
      });

      render(<PersonalDashboard {...defaultProps} />);

      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
    });

    test('should show no sprint message when no active sprint', async () => {
      (useGlobalSprint as jest.Mock).mockReturnValue({
        currentSprint: null,
        isLoading: false,
      });

      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No Active Sprint')).toBeInTheDocument();
        expect(screen.getByText(/There is no active sprint currently/)).toBeInTheDocument();
      });
    });

    test('should handle data loading errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (DatabaseService.getScheduleEntries as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error loading personal data:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Statistics Calculation Tests
  // ============================================================================

  describe('Statistics Calculation', () => {
    test('should calculate hours submitted correctly', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        // Based on mock data: 7 + 3.5 + 0 + 7 + 7 = 24.5h
        const hoursCard = screen.getByTestId('stats-card-hours-submitted');
        expect(hoursCard).toHaveTextContent('24.5h');
      });
    });

    test('should calculate days submitted correctly', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        // 5 days submitted out of 10 total sprint working days
        const daysCard = screen.getByTestId('stats-card-days-submitted');
        expect(daysCard).toHaveTextContent('5/10');
      });
    });

    test('should calculate sprint progress percentage', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        // 5 out of 10 days = 50%
        const progressCard = screen.getByTestId('stats-card-sprint-progress');
        expect(progressCard).toHaveTextContent('50%');
      });
    });

    test('should determine completion status correctly', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        // Partial completion
        const statusCard = screen.getByTestId('stats-card-status');
        expect(statusCard).toHaveTextContent('In Progress');
      });
    });

    test('should show completed status when all days filled', async () => {
      // Mock complete data
      const completeScheduleData = {};
      const workingDays = createSprintWorkingDays('2024-01-17', 2);
      workingDays.forEach(date => {
        (completeScheduleData as any)[date] = { value: '1', hours: 7 };
      });

      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue({
        1: completeScheduleData,
      });

      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        const statusCard = screen.getByTestId('stats-card-status');
        expect(statusCard).toHaveTextContent('Complete');
        
        // Should show completion badge
        expect(screen.getByText('Sprint Complete!')).toBeInTheDocument();
        expect(screen.getByTestId('award-icon')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Real-time Updates Tests
  // ============================================================================

  describe('Real-time Updates', () => {
    test('should update statistics when schedule data changes', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        const hoursCard = screen.getByTestId('stats-card-hours-submitted');
        expect(hoursCard).toHaveTextContent('24.5h');
      });

      // Simulate schedule update via PersonalCalendar
      const updateButton = screen.getByText('Update Schedule');
      updateButton.click();

      // Should recalculate stats immediately
      await waitFor(() => {
        const hoursCard = screen.getByTestId('stats-card-hours-submitted');
        // New data: just one full day (7h)
        expect(hoursCard).toHaveTextContent('7h');
      });
    });

    test('should maintain consistency between calendar and stats', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        const progressCard = screen.getByTestId('stats-card-sprint-progress');
        expect(progressCard).toHaveTextContent('50%');
      });

      // Update schedule
      const updateButton = screen.getByText('Update Schedule');
      updateButton.click();

      await waitFor(() => {
        const progressCard = screen.getByTestId('stats-card-sprint-progress');
        // 1 day out of 10 = 10%
        expect(progressCard).toHaveTextContent('10%');
      });
    });
  });

  // ============================================================================
  // Israeli Calendar Integration Tests
  // ============================================================================

  describe('Israeli Calendar Integration', () => {
    test('should calculate working days correctly for Israeli calendar', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        // 2-week sprint should have 10 working days (Sun-Thu only)
        expect(screen.getByText(/\(10 working days\)/)).toBeInTheDocument();
      });
    });

    test('should handle sprint dates starting on Wednesday', async () => {
      const wednesdayStartSprint = createMockCurrentSprint({
        sprint_start_date: '2024-01-17', // Wednesday
        sprint_end_date: '2024-01-30',   // Tuesday
      });

      (useGlobalSprint as jest.Mock).mockReturnValue({
        currentSprint: wednesdayStartSprint,
        isLoading: false,
      });

      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Current Sprint')).toBeInTheDocument();
        // Should display dates correctly
        expect(screen.getByText(/1\/17\/2024.*1\/30\/2024/)).toBeInTheDocument();
      });
    });

    test('should exclude weekends from calculations', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        // Sprint potential should be based on working days only
        const potentialHours = '70h'; // 10 working days × 7 hours
        const hoursCard = screen.getByTestId('stats-card-hours-submitted');
        const description = hoursCard.textContent;
        expect(description).toContain(potentialHours);
      });
    });
  });

  // ============================================================================
  // Sprint Progress Indicators Tests
  // ============================================================================

  describe('Sprint Progress Indicators', () => {
    test('should show appropriate progress descriptions', async () => {
      const testCases = [
        { percentage: 0, expected: 'Not started yet' },
        { percentage: 25, expected: 'Getting started' },
        { percentage: 75, expected: 'Great progress' },
        { percentage: 100, expected: 'Fully completed!' },
      ];

      for (const testCase of testCases) {
        // Mock different completion levels
        const mockData: any = {};
        const workingDays = createSprintWorkingDays('2024-01-17', 2);
        const filledDays = Math.floor((testCase.percentage / 100) * workingDays.length);
        
        for (let i = 0; i < filledDays; i++) {
          mockData[workingDays[i]] = { value: '1', hours: 7 };
        }

        (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue({
          1: mockData,
        });

        const { rerender } = render(<PersonalDashboard {...defaultProps} />);

        await waitFor(() => {
          const progressCard = screen.getByTestId('stats-card-sprint-progress');
          expect(progressCard).toHaveTextContent(testCase.expected);
        });

        rerender(<div />); // Clear between test cases
      }
    });

    test('should show completion badge only when fully complete', async () => {
      // Test partial completion - no badge
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Sprint Complete!')).not.toBeInTheDocument();
        expect(screen.queryByTestId('award-icon')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle empty schedule data gracefully', async () => {
      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue({});

      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        const hoursCard = screen.getByTestId('stats-card-hours-submitted');
        expect(hoursCard).toHaveTextContent('0h');
        
        const daysCard = screen.getByTestId('stats-card-days-submitted');
        expect(daysCard).toHaveTextContent('0/10');
        
        const progressCard = screen.getByTestId('stats-card-sprint-progress');
        expect(progressCard).toHaveTextContent('0%');
      });
    });

    test('should handle invalid date ranges', async () => {
      const invalidSprint = createMockCurrentSprint({
        sprint_start_date: '2024-01-30', // End before start
        sprint_end_date: '2024-01-17',
      });

      (useGlobalSprint as jest.Mock).mockReturnValue({
        currentSprint: invalidSprint,
        isLoading: false,
      });

      render(<PersonalDashboard {...defaultProps} />);

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument();
      });
    });

    test('should handle missing sprint working days', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock scenario where working days calculation fails
      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue({
        1: { '2024-01-17': { value: '1', hours: 7 } },
      });

      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toHaveTextContent('Welcome, John Doe');

        const subHeadings = screen.getAllByRole('heading', { level: 2 });
        expect(subHeadings.length).toBeGreaterThan(0);
      });
    });

    test('should have accessible stats cards', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        const statsCards = screen.getAllByTestId(/^stats-card-/);
        expect(statsCards.length).toBe(4);
        
        statsCards.forEach(card => {
          expect(card).toBeInTheDocument();
        });
      });
    });

    test('should provide screen reader friendly content', async () => {
      render(<PersonalDashboard {...defaultProps} />);

      await waitFor(() => {
        // Sprint status should be clearly announced
        expect(screen.getByText(/Current Sprint/)).toBeInTheDocument();
        expect(screen.getByText(/working days/)).toBeInTheDocument();
      });
    });
  });
});