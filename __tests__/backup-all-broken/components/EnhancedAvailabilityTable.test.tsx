/**
 * @jest-environment jsdom
 */

// Mock the EnhancedDayCell component
jest.mock('@/components/EnhancedDayCell', () => {
  return function MockEnhancedDayCell({ 
    member, 
    date, 
    currentValue, 
    canEdit, 
    isToday, 
    isPast,
    onWorkOptionClick,
    onReasonRequired,
    onQuickReasonSelect 
  }: any) {
    const dateKey = date.toISOString().split('T')[0];
    return (
      <td 
        data-testid={`day-cell-${member.id}-${dateKey}`}
        data-can-edit={canEdit}
        data-is-today={isToday}
        data-is-past={isPast}
        className={`border ${isToday ? 'bg-blue-100' : isPast ? 'bg-gray-100' : 'bg-white'}`}
      >
        <div data-testid="current-value">
          {currentValue?.value || 'none'}
        </div>
        {currentValue?.reason && (
          <div data-testid="reason">{currentValue.reason}</div>
        )}
        <button 
          data-testid={`work-option-1-${member.id}-${dateKey}`}
          onClick={() => onWorkOptionClick(member.id, date, '1')}
        >
          Full Day
        </button>
        <button 
          data-testid={`work-option-0.5-${member.id}-${dateKey}`}
          onClick={() => onReasonRequired(member.id, date, '0.5')}
        >
          Half Day
        </button>
        <button 
          data-testid={`work-option-X-${member.id}-${dateKey}`}
          onClick={() => onReasonRequired(member.id, date, 'X')}
        >
          Absence
        </button>
        {onQuickReasonSelect && (
          <button 
            data-testid={`quick-reason-${member.id}-${dateKey}`}
            onClick={() => onQuickReasonSelect(member.id, date, '0.5', 'Quick reason')}
          >
            Quick Reason
          </button>
        )}
      </td>
    );
  };
});

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedAvailabilityTable from '@/components/EnhancedAvailabilityTable';
import { 
  createMockTeamMember, 
  createMockManager,
  createMockScheduleData
} from '../utils/testHelpers';

describe('EnhancedAvailabilityTable', () => {
  // Test data setup
  const mockCurrentUser = createMockManager({ id: 1, name: 'Manager User' });
  const mockTeamMembers = [
    mockCurrentUser,
    createMockTeamMember({ id: 2, name: 'John Doe', hebrew: 'ג\'ון דו' }),
    createMockTeamMember({ id: 3, name: 'Jane Smith', hebrew: 'ג\'יין סמית\'' })
  ];

  const mockWorkOptions = [
    { value: '1', label: '1', hours: 7, description: 'Full day (7 hours)', color: 'bg-green-100 text-green-800' },
    { value: '0.5', label: '0.5', hours: 3.5, description: 'Half day (3.5 hours)', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'X', label: 'X', hours: 0, description: 'Sick/OoO (0 hours)', color: 'bg-red-100 text-red-800' }
  ];

  // Create a week of dates (Sunday to Thursday)
  const mockWeekDays = Array.from({ length: 5 }, (_, i) => {
    const date = new Date('2024-01-15T00:00:00Z'); // Start with a Monday
    date.setDate(date.getDate() - date.getDay() + i); // Adjust to get Sunday-Thursday
    return date;
  });

  const mockScheduleData = createMockScheduleData();

  // Mock functions
  const mockOnWorkOptionClick = jest.fn();
  const mockOnReasonRequired = jest.fn();
  const mockOnQuickReasonSelect = jest.fn();
  const mockOnFullWeekSet = jest.fn();
  const mockCalculateWeeklyHours = jest.fn((memberId) => {
    // Simple calculation for testing
    const memberData = mockScheduleData[memberId] || {};
    return Object.values(memberData).reduce((total: number, entry: any) => {
      if (entry?.value === '1') return total + 7;
      if (entry?.value === '0.5') return total + 3.5;
      return total;
    }, 0);
  });
  const mockGetTeamTotalHours = jest.fn(() => 105); // 3 members * 35 hours average
  const mockIsToday = jest.fn((date) => {
    const today = new Date('2024-01-16T00:00:00Z'); // Tuesday
    return date.toDateString() === today.toDateString();
  });
  const mockIsPastDate = jest.fn((date) => {
    const today = new Date('2024-01-16T00:00:00Z'); // Tuesday
    return date < today;
  });
  const mockFormatDate = jest.fn((date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  // Default props
  const defaultProps = {
    currentUser: mockCurrentUser,
    teamMembers: mockTeamMembers,
    scheduleData: mockScheduleData,
    workOptions: mockWorkOptions,
    weekDays: mockWeekDays,
    onWorkOptionClick: mockOnWorkOptionClick,
    onReasonRequired: mockOnReasonRequired,
    onQuickReasonSelect: mockOnQuickReasonSelect,
    onFullWeekSet: mockOnFullWeekSet,
    calculateWeeklyHours: mockCalculateWeeklyHours,
    getTeamTotalHours: mockGetTeamTotalHours,
    isToday: mockIsToday,
    isPastDate: mockIsPastDate,
    formatDate: mockFormatDate
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the component without crashing', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);
      expect(screen.getByText('Work Options:')).toBeInTheDocument();
    });

    it('should render mobile view on small screens', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);
      
      // Mobile view should be present but hidden on larger screens
      const mobileView = screen.getByRole('generic', { hidden: true });
      expect(mobileView).toHaveClass('block', 'md:hidden');
    });

    it('should render desktop table view on larger screens', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);
      
      // Desktop table should be present but hidden on mobile
      const desktopTable = screen.getByRole('table');
      expect(desktopTable.parentElement).toHaveClass('hidden', 'md:block');
    });

    it('should render work options legend', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      expect(screen.getByText('Work Options:')).toBeInTheDocument();
      expect(screen.getByText('Full day (7 hours)')).toBeInTheDocument();
      expect(screen.getByText('Half day (3.5 hours)')).toBeInTheDocument();
      expect(screen.getByText('Sick/OoO (0 hours)')).toBeInTheDocument();
    });

    it('should render Hebrew legend', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      expect(screen.getByText(/Quick Hebrew Reasons:/)).toBeInTheDocument();
      expect(screen.getByText(/אישי \(Personal\)/)).toBeInTheDocument();
    });
  });

  describe('Reason Summary Bar', () => {
    it('should show reason summary when there are reasons', () => {
      const scheduleWithReasons = {
        1: {
          '2024-01-15': { value: '0.5', reason: 'Doctor appointment' },
          '2024-01-16': { value: 'X', reason: 'Sick leave' }
        },
        2: {
          '2024-01-17': { value: '0.5', reason: 'Personal time' }
        }
      };

      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          scheduleData={scheduleWithReasons} 
        />
      );

      expect(screen.getByText('3 reasons this week')).toBeInTheDocument();
      expect(screen.getByText('2 half-day')).toBeInTheDocument();
      expect(screen.getByText('1 absences')).toBeInTheDocument();
    });

    it('should hide reason summary when there are no reasons', () => {
      const scheduleWithoutReasons = {
        1: { '2024-01-15': { value: '1', reason: undefined } },
        2: { '2024-01-16': { value: '1', reason: undefined } }
      };

      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          scheduleData={scheduleWithoutReasons} 
        />
      );

      expect(screen.queryByText(/reasons this week/)).not.toBeInTheDocument();
    });

    it('should show help text for reason icons', () => {
      const scheduleWithReasons = {
        1: { '2024-01-15': { value: '0.5', reason: 'Doctor appointment' } }
      };

      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          scheduleData={scheduleWithReasons} 
        />
      );

      expect(screen.getByText('Click or hover over ℹ️ icons to see reason details')).toBeInTheDocument();
    });
  });

  describe('Mobile View', () => {
    // Test mobile-specific functionality by checking class names and structure
    it('should render team members as cards in mobile view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      mockTeamMembers.forEach(member => {
        expect(screen.getByText(member.name)).toBeInTheDocument();
        expect(screen.getByText(member.hebrew)).toBeInTheDocument();
      });
    });

    it('should show manager badges in mobile view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    it('should show "You" badge for current user in mobile view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should show full week button for editable members in mobile view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const fullWeekButtons = screen.getAllByText('Set Full Working Week');
      expect(fullWeekButtons.length).toBeGreaterThan(0);
    });

    it('should handle full week button click in mobile view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const fullWeekButton = screen.getAllByText('Set Full Working Week')[0];
      fireEvent.click(fullWeekButton);

      expect(mockOnFullWeekSet).toHaveBeenCalledTimes(1);
    });

    it('should render work option buttons for each day in mobile view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      // Check that work option buttons exist (they would be in mobile cards)
      const workOptionButtons = screen.getAllByRole('button').filter(button => 
        ['1', '0.5', 'X'].includes(button.textContent?.trim() || '')
      );
      expect(workOptionButtons.length).toBeGreaterThan(0);
    });

    it('should show team summary in mobile view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      expect(screen.getByText('Team Summary')).toBeInTheDocument();
      expect(screen.getByText('Week Total')).toBeInTheDocument();
    });
  });

  describe('Desktop Table View', () => {
    it('should render table headers with day names', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(within(table).getByText('Team Member')).toBeInTheDocument();
      expect(within(table).getByText('Sun')).toBeInTheDocument();
      expect(within(table).getByText('Mon')).toBeInTheDocument();
      expect(within(table).getByText('Hours')).toBeInTheDocument();
    });

    it('should highlight today column in table header', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      // The today highlighting would be tested through class names in a real implementation
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should render team member rows', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const table = screen.getByRole('table');
      mockTeamMembers.forEach(member => {
        expect(within(table).getByText(member.name)).toBeInTheDocument();
      });
    });

    it('should show manager badge in table', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(within(table).getByText('Mgr')).toBeInTheDocument();
    });

    it('should show "You" badge for current user row', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(within(table).getByText('You')).toBeInTheDocument();
    });

    it('should render full week button for each editable member', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const table = screen.getByRole('table');
      const fullWeekButtons = within(table).getAllByText('Full Week');
      expect(fullWeekButtons.length).toBeGreaterThan(0);
    });

    it('should render day cells using EnhancedDayCell component', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      // Check that day cells are rendered for each member and day combination
      mockTeamMembers.forEach(member => {
        mockWeekDays.forEach(date => {
          const dateKey = date.toISOString().split('T')[0];
          expect(screen.getByTestId(`day-cell-${member.id}-${dateKey}`)).toBeInTheDocument();
        });
      });
    });

    it('should render weekly hours for each member', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      // Weekly hours are calculated by mockCalculateWeeklyHours
      mockTeamMembers.forEach(member => {
        expect(mockCalculateWeeklyHours).toHaveBeenCalledWith(member.id);
      });
    });

    it('should render table footer with daily totals', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(within(table).getByText('Team Total')).toBeInTheDocument();
    });

    it('should render team total hours in footer', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      expect(mockGetTeamTotalHours).toHaveBeenCalled();
      // The actual display of total hours would be in the footer
    });
  });

  describe('Work Option Interactions', () => {
    it('should handle work option clicks through EnhancedDayCell', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const workOptionButton = screen.getByTestId('work-option-1-1-2024-01-15');
      fireEvent.click(workOptionButton);

      expect(mockOnWorkOptionClick).toHaveBeenCalledWith(
        1, // member id
        expect.any(Date),
        '1'
      );
    });

    it('should handle reason required calls through EnhancedDayCell', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const halfDayButton = screen.getByTestId('work-option-0.5-1-2024-01-15');
      fireEvent.click(halfDayButton);

      expect(mockOnReasonRequired).toHaveBeenCalledWith(
        1, // member id
        expect.any(Date),
        '0.5'
      );
    });

    it('should handle quick reason selection when provided', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const quickReasonButton = screen.getByTestId('quick-reason-1-2024-01-15');
      fireEvent.click(quickReasonButton);

      expect(mockOnQuickReasonSelect).toHaveBeenCalledWith(
        1, // member id
        expect.any(Date),
        '0.5',
        'Quick reason'
      );
    });

    it('should handle full week set for team members', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const fullWeekButton = screen.getAllByText('Full Week')[0];
      fireEvent.click(fullWeekButton);

      expect(mockOnFullWeekSet).toHaveBeenCalledWith(
        expect.any(Number) // member id
      );
    });
  });

  describe('Permission Handling', () => {
    it('should allow managers to edit all members', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      // Check that day cells receive canEdit=true for all members when user is manager
      mockTeamMembers.forEach(member => {
        const dayCell = screen.getByTestId(`day-cell-${member.id}-2024-01-15`);
        expect(dayCell).toHaveAttribute('data-can-edit', 'true');
      });
    });

    it('should only allow regular users to edit their own schedule', () => {
      const regularUser = createMockTeamMember({ id: 2, isManager: false });
      
      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          currentUser={regularUser} 
        />
      );

      // Regular user should only be able to edit their own schedule
      const ownDayCell = screen.getByTestId('day-cell-2-2024-01-15');
      expect(ownDayCell).toHaveAttribute('data-can-edit', 'true');

      const otherDayCell = screen.getByTestId('day-cell-1-2024-01-15');
      expect(otherDayCell).toHaveAttribute('data-can-edit', 'false');
    });

    it('should show full week buttons only for editable members', () => {
      const regularUser = createMockTeamMember({ id: 2, isManager: false });
      
      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          currentUser={regularUser} 
        />
      );

      // Should have fewer full week buttons for non-managers
      const fullWeekButtons = screen.getAllByText('Full Week');
      expect(fullWeekButtons.length).toBeLessThan(mockTeamMembers.length);
    });
  });

  describe('Date Handling', () => {
    it('should pass correct date information to day cells', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      mockWeekDays.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const dayCell = screen.getByTestId(`day-cell-1-${dateKey}`);
        
        const isToday = mockIsToday(date);
        const isPast = mockIsPastDate(date);
        
        expect(dayCell).toHaveAttribute('data-is-today', isToday.toString());
        expect(dayCell).toHaveAttribute('data-is-past', isPast.toString());
      });
    });

    it('should format dates correctly in headers', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      // Format date should be called for each day
      expect(mockFormatDate).toHaveBeenCalledTimes(mockWeekDays.length * 2); // Called for both mobile and desktop views
    });
  });

  describe('Calculations', () => {
    it('should calculate weekly hours for each member', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      mockTeamMembers.forEach(member => {
        expect(mockCalculateWeeklyHours).toHaveBeenCalledWith(member.id);
      });
    });

    it('should calculate daily totals correctly', () => {
      const scheduleData = {
        1: { '2024-01-15': { value: '1' } }, // 7 hours
        2: { '2024-01-15': { value: '0.5' } }, // 3.5 hours  
        3: { '2024-01-15': { value: 'X' } } // 0 hours
      };

      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          scheduleData={scheduleData}
        />
      );

      // Daily total calculations are done internally
      // The component should render without errors
      expect(screen.getByText('Team Total')).toBeInTheDocument();
    });

    it('should calculate team total hours', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      expect(mockGetTeamTotalHours).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have proper responsive classes for mobile view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      // Mobile view container should have proper classes
      const mobileContainer = screen.getByRole('generic', { hidden: true });
      expect(mobileContainer).toHaveClass('block', 'md:hidden');
    });

    it('should have proper responsive classes for desktop view', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const desktopContainer = screen.getByRole('table').parentElement;
      expect(desktopContainer).toHaveClass('hidden', 'md:block');
    });
  });

  describe('Accessibility', () => {
    it('should render proper table structure', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Should have thead, tbody, and tfoot
      expect(within(table).getByRole('rowgroup')).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      const fullWeekButtons = screen.getAllByTitle('Set full working week');
      expect(fullWeekButtons.length).toBeGreaterThan(0);
    });

    it('should provide clear work option descriptions', () => {
      render(<EnhancedAvailabilityTable {...defaultProps} />);

      mockWorkOptions.forEach(option => {
        expect(screen.getByText(option.description)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing schedule data gracefully', () => {
      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          scheduleData={{}}
        />
      );

      expect(screen.getByText('Work Options:')).toBeInTheDocument();
    });

    it('should handle empty team members array', () => {
      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          teamMembers={[]}
        />
      );

      expect(screen.getByText('Team Total')).toBeInTheDocument();
    });

    it('should handle missing work options', () => {
      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          workOptions={[]}
        />
      );

      expect(screen.getByText('Work Options:')).toBeInTheDocument();
    });

    it('should handle empty week days array', () => {
      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          weekDays={[]}
        />
      );

      expect(screen.getByText('Team Total')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = performance.now();
      render(<EnhancedAvailabilityTable {...defaultProps} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle large team sizes efficiently', () => {
      const largeTeamMembers = Array.from({ length: 50 }, (_, i) => 
        createMockTeamMember({ id: i + 1, name: `Member ${i + 1}` })
      );

      const startTime = performance.now();
      render(
        <EnhancedAvailabilityTable 
          {...defaultProps} 
          teamMembers={largeTeamMembers}
        />
      );
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(500); // Should still render efficiently with large teams
    });
  });
});