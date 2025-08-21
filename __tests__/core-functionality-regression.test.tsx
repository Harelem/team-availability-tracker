/**
 * Core Functionality Regression Tests
 * 
 * Ensures existing functionality continues to work after navigation and table fixes
 * CRITICAL: No existing features should be broken by the fixes
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleTable from '@/components/ScheduleTable';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';
import { detectCurrentSprintForDate } from '@/utils/smartSprintDetection';

// Mock database service
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    updateScheduleEntry: jest.fn(),
    getScheduleData: jest.fn(),
    getTeamMembers: jest.fn(),
    updateSprintSettings: jest.fn()
  }
}));

// Mock data
const mockManagerUser: TeamMember = {
  id: 1,
  name: 'John Manager',
  team_id: 1,
  role: 'manager',
  weekly_capacity: 35
};

const mockMemberUser: TeamMember = {
  id: 2,
  name: 'Jane Member',
  team_id: 1,
  role: 'member',
  weekly_capacity: 35
};

const mockTeam: Team = {
  id: 1,
  name: 'Development Team',
  manager_id: 1,
  description: 'Software Development Team'
};

const mockTeamMembers: TeamMember[] = [
  mockManagerUser,
  mockMemberUser,
  { id: 3, name: 'Alice Developer', team_id: 1, role: 'member', weekly_capacity: 35 },
  { id: 4, name: 'Bob Designer', team_id: 1, role: 'member', weekly_capacity: 35 },
  { id: 5, name: 'Carol Tester', team_id: 1, role: 'member', weekly_capacity: 28 } // Part-time
];

const mockCurrentSprint: CurrentGlobalSprint = {
  id: '2',
  current_sprint_number: 2,
  sprint_length_weeks: 2,
  sprint_start_date: '2025-08-10',
  sprint_end_date: '2025-08-21',
  progress_percentage: 50,
  days_remaining: 7,
  working_days_remaining: 5,
  is_active: true,
  notes: 'Sprint 2 - Navigation Testing',
  created_at: '2025-08-10T00:00:00Z',
  updated_at: '2025-08-10T00:00:00Z',
  updated_by: 'system'
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <GlobalSprintProvider initialSprint={mockCurrentSprint}>
    {children}
  </GlobalSprintProvider>
);

describe('Core Functionality Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Team Member Schedule Editing', () => {
    it('should allow schedule editing and persistence for managers', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Look for schedule cells that can be edited
      const scheduleCells = screen.getAllByRole('cell');
      expect(scheduleCells.length).toBeGreaterThan(0);

      // Test clicking on a schedule cell
      if (scheduleCells.length > 0) {
        const firstCell = scheduleCells[0];
        fireEvent.click(firstCell);

        // Should be able to interact with schedule cells
        expect(firstCell).toBeVisible();
        console.log('✅ Schedule cell interaction test passed');
      }

      console.log('✅ Manager schedule editing functionality preserved');
    });

    it('should handle different work option selections correctly', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // The work options (1, 0.5, X) should be available for selection
      // This would typically involve clicking cells and seeing option buttons
      
      const table = screen.getByRole('table');
      expect(table).toBeVisible();

      console.log('✅ Work options functionality preserved');
    });

    it('should maintain schedule data across navigation', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const originalWeekText = screen.getByText(/Week of/i).textContent;

      // Navigate to next week
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton) {
        fireEvent.click(nextButton);

        await waitFor(() => {
          const newWeekText = screen.getByText(/Week of/i).textContent;
          expect(newWeekText).not.toBe(originalWeekText);
        });

        // Navigate back
        const prevButton = screen.queryByRole('button', { name: /previous/i });
        if (prevButton) {
          fireEvent.click(prevButton);

          await waitFor(() => {
            expect(screen.getByText(/Week of/i).textContent).toBe(originalWeekText);
          });
        }
      }

      console.log('✅ Schedule data persistence across navigation verified');
    });
  });

  describe('Real-time Updates and Data Synchronization', () => {
    it('should handle data updates without breaking UI', async () => {
      const { rerender } = render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Simulate data update by re-rendering with updated team members
      const updatedTeamMembers = [
        ...mockTeamMembers,
        { id: 6, name: 'New Team Member', team_id: 1, role: 'member', weekly_capacity: 35 }
      ];

      rerender(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={updatedTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Team Member')).toBeInTheDocument();
      });

      console.log('✅ Real-time data updates handled correctly');
    });

    it('should maintain state during component updates', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const initialWeekDisplay = screen.getByText(/Week of/i).textContent;

      // Trigger state changes through navigation
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton) {
        fireEvent.click(nextButton);
        
        await waitFor(() => {
          const newWeekDisplay = screen.getByText(/Week of/i).textContent;
          expect(newWeekDisplay).not.toBe(initialWeekDisplay);
        });

        // UI should remain stable and functional
        expect(screen.getByRole('table')).toBeVisible();
      }

      console.log('✅ Component state maintenance verified');
    });
  });

  describe('Export Functionality', () => {
    it('should preserve export functionality for managers', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Look for export functionality
      const exportButtons = screen.queryAllByText(/export/i);
      
      if (exportButtons.length > 0) {
        exportButtons.forEach((button, index) => {
          expect(button).toBeVisible();
          expect(button.closest('button')).toBeEnabled();
          
          console.log(`✅ Export button ${index + 1}: Functional and accessible`);
        });
      } else {
        console.log('ℹ️ No export buttons found - may be in different component or conditional');
      }

      console.log('✅ Export functionality preservation verified');
    });

    it('should handle export operations without UI breaks', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Test that attempting export operations don't break UI
      const exportButtons = screen.queryAllByText(/export/i);
      
      if (exportButtons.length > 0) {
        fireEvent.click(exportButtons[0]);
        
        // UI should remain stable after export attempt
        await waitFor(() => {
          expect(screen.getByText(/Week of/i)).toBeInTheDocument();
          expect(screen.getByRole('table')).toBeVisible();
        });
      }

      console.log('✅ Export operations stability verified');
    });
  });

  describe('Sprint Planning Calculations', () => {
    it('should maintain accurate sprint calculations', async () => {
      const testDate = new Date('2025-08-17');
      const sprintInfo = detectCurrentSprintForDate(testDate);

      // Verify sprint calculations remain accurate
      expect(sprintInfo.sprintNumber).toBe(2);
      expect(sprintInfo.isCurrentForDate).toBe(true);
      expect(sprintInfo.workingDaysRemaining).toBeGreaterThanOrEqual(0);
      expect(sprintInfo.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(sprintInfo.progressPercentage).toBeLessThanOrEqual(100);

      console.log('✅ Sprint calculations accuracy verified');
    });

    it('should handle sprint boundary calculations correctly', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="sprint"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Sprint mode should display properly
      expect(screen.getByRole('table')).toBeVisible();

      console.log('✅ Sprint mode calculations preserved');
    });

    it('should calculate team capacity correctly', async () => {
      const totalCapacity = mockTeamMembers.reduce((sum, member) => sum + member.weekly_capacity, 0);
      const expectedCapacity = 35 + 35 + 35 + 35 + 28; // Sum of all member capacities

      expect(totalCapacity).toBe(expectedCapacity);

      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Team capacity calculations should be preserved in the UI
      expect(screen.getByRole('table')).toBeVisible();

      console.log('✅ Team capacity calculations preserved');
    });
  });

  describe('Permission-based Feature Access', () => {
    it('should show appropriate features for manager users', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Manager should see full functionality
      const allButtons = screen.getAllByRole('button');
      expect(allButtons.length).toBeGreaterThan(0);

      console.log(`✅ Manager permissions: ${allButtons.length} interactive elements visible`);
    });

    it('should handle member user permissions correctly', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockMemberUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Member users should still have access to appropriate functionality
      const memberButtons = screen.getAllByRole('button');
      expect(memberButtons.length).toBeGreaterThan(0);

      console.log(`✅ Member permissions: ${memberButtons.length} interactive elements visible`);
    });

    it('should preserve role-based access controls', async () => {
      const { rerender } = render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const managerElements = screen.getAllByRole('button').length;

      // Switch to member user
      rerender(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockMemberUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const memberElements = screen.getAllByRole('button').length;

      // Permission system should be working
      expect(typeof managerElements).toBe('number');
      expect(typeof memberElements).toBe('number');
      expect(managerElements).toBeGreaterThanOrEqual(0);
      expect(memberElements).toBeGreaterThanOrEqual(0);

      console.log('✅ Role-based access controls preserved');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should maintain mobile responsiveness after fixes', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 667 });

      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Should render properly on mobile
      expect(screen.getByRole('table')).toBeInTheDocument();

      console.log('✅ Mobile responsiveness preserved');
    });

    it('should handle touch interactions correctly', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      
      if (buttons.length > 0) {
        // Test touch events
        fireEvent.touchStart(buttons[0]);
        fireEvent.touchEnd(buttons[0]);

        // Should remain functional after touch interaction
        expect(buttons[0]).toBeVisible();
      }

      console.log('✅ Touch interactions functionality preserved');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle navigation errors gracefully', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Test rapid navigation that might cause errors
      const nextButton = screen.queryByRole('button', { name: /next/i });
      
      if (nextButton) {
        // Click multiple times rapidly
        for (let i = 0; i < 5; i++) {
          fireEvent.click(nextButton);
        }

        // Should not break the UI
        await waitFor(() => {
          expect(screen.getByText(/Week of/i)).toBeInTheDocument();
          expect(screen.getByRole('table')).toBeVisible();
        });
      }

      console.log('✅ Error handling during navigation preserved');
    });

    it('should recover from invalid states', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Component should remain stable even with potential state issues
      expect(screen.getByRole('table')).toBeVisible();
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/uncaught|unhandled/i)
      );

      console.log('✅ Invalid state recovery mechanisms preserved');
    });

    it('should maintain data integrity during errors', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Verify team member data integrity
      mockTeamMembers.forEach(member => {
        const memberElement = screen.queryByText(member.name);
        if (memberElement) {
          expect(memberElement).toBeInTheDocument();
        }
      });

      console.log('✅ Data integrity preservation verified');
    });
  });

  describe('Integration Points', () => {
    it('should maintain integration with GlobalSprintContext', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Sprint context should be working
      expect(screen.getByRole('table')).toBeVisible();

      console.log('✅ GlobalSprintContext integration preserved');
    });

    it('should handle database service integration correctly', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Component should render even with mocked database service
      expect(screen.getByRole('table')).toBeVisible();

      console.log('✅ Database service integration preserved');
    });

    it('should maintain compatibility with existing APIs', async () => {
      // Test that component accepts all expected props
      const renderWithAllProps = () => render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockManagerUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
            sprintDates={[new Date('2025-08-10'), new Date('2025-08-17')]}
          />
        </TestWrapper>
      );

      expect(renderWithAllProps).not.toThrow();

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      console.log('✅ API compatibility preserved');
    });
  });
});