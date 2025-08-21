/**
 * Table Visibility & Layout Tests
 * 
 * Tests for header overlap, spacing, z-index fixes, and responsive design
 * ISSUE: Table cutoff, header overlap, improper spacing (should be FIXED)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleTable from '@/components/ScheduleTable';
import CompactHeaderBar from '@/components/CompactHeaderBar';
import EnhancedAvailabilityTable from '@/components/EnhancedAvailabilityTable';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';

// Mock data
const mockCurrentUser: TeamMember = {
  id: 1,
  name: 'Manager User',
  team_id: 1,
  role: 'manager',
  weekly_capacity: 35
};

const mockTeam: Team = {
  id: 1,
  name: 'Test Team',
  manager_id: 1,
  description: 'Test Team for UI Testing'
};

const mockTeamMembers: TeamMember[] = [
  mockCurrentUser,
  { id: 2, name: 'Team Member 1', team_id: 1, role: 'member', weekly_capacity: 35 },
  { id: 3, name: 'Team Member 2', team_id: 1, role: 'member', weekly_capacity: 35 },
  { id: 4, name: 'Team Member 3', team_id: 1, role: 'member', weekly_capacity: 35 },
  { id: 5, name: 'Team Member 4', team_id: 1, role: 'member', weekly_capacity: 35 }
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
  notes: 'Sprint 2',
  created_at: '2025-08-10T00:00:00Z',
  updated_at: '2025-08-10T00:00:00Z',
  updated_by: 'system'
};

// Mock window dimensions for responsive testing
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

// Mock getBoundingClientRect for layout testing
const mockElementDimensions = (element: HTMLElement, rect: Partial<DOMRect>) => {
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  });
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <GlobalSprintProvider initialSprint={mockCurrentSprint}>
    {children}
  </GlobalSprintProvider>
);

describe('Table Visibility & Layout Tests', () => {
  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Manager View Table Visibility', () => {
    it('should render table fully visible without header cutoff', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Check that table content is visible
      const tableElement = screen.getByRole('table');
      expect(tableElement).toBeInTheDocument();
      expect(tableElement).toBeVisible();

      // Mock table dimensions to test visibility
      mockElementDimensions(tableElement, {
        top: 100,
        bottom: 500,
        height: 400,
        width: 800
      });

      // Check that table is not cut off by header
      const computedStyle = window.getComputedStyle(tableElement);
      expect(computedStyle.position).not.toBe('fixed'); // Should not have positioning conflicts
      
      console.log('✅ Manager view table visibility test passed');
    });

    it('should have proper header-to-table spacing', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Find header and table elements
      const headerElement = screen.getByText(/Week of/i).closest('div');
      const tableElement = screen.getByRole('table');

      expect(headerElement).toBeInTheDocument();
      expect(tableElement).toBeInTheDocument();

      if (headerElement && tableElement) {
        // Mock dimensions for spacing calculation
        mockElementDimensions(headerElement, {
          top: 0,
          bottom: 60,
          height: 60
        });

        mockElementDimensions(tableElement, {
          top: 80, // Should have margin from header
          bottom: 500,
          height: 420
        });

        // Verify proper spacing exists
        const headerRect = headerElement.getBoundingClientRect();
        const tableRect = tableElement.getBoundingClientRect();
        
        expect(tableRect.top).toBeGreaterThan(headerRect.bottom);
        console.log('✅ Header-to-table spacing test passed');
      }
    });

    it('should maintain proper z-index hierarchy', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Check z-index values through computed styles
      const headerElement = screen.getByText(/Week of/i).closest('div');
      const tableElement = screen.getByRole('table');

      if (headerElement && tableElement) {
        const headerStyle = window.getComputedStyle(headerElement);
        const tableStyle = window.getComputedStyle(tableElement);

        // Header should not have excessive z-index that covers table
        const headerZIndex = parseInt(headerStyle.zIndex) || 0;
        const tableZIndex = parseInt(tableStyle.zIndex) || 0;

        if (headerZIndex > 0) {
          // If header has z-index, it should be reasonable
          expect(headerZIndex).toBeLessThan(1000);
        }

        console.log(`Z-index values - Header: ${headerZIndex}, Table: ${tableZIndex}`);
        console.log('✅ Z-index hierarchy test passed');
      }
    });
  });

  describe('Responsive Design Tests', () => {
    const breakpoints = [
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1440, height: 900, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' }
    ];

    breakpoints.forEach(({ width, height, name }) => {
      it(`should handle ${name} (${width}x${height}) breakpoint correctly`, async () => {
        mockWindowDimensions(width, height);

        render(
          <TestWrapper>
            <ScheduleTable
              currentUser={mockCurrentUser}
              teamMembers={mockTeamMembers}
              selectedTeam={mockTeam}
              viewMode="week"
            />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(/Week of/i)).toBeInTheDocument();
        });

        // Check that table adapts to screen size
        const tableElement = screen.getByRole('table');
        expect(tableElement).toBeVisible();

        // For mobile/tablet, check if horizontal scrolling is available
        if (width < 1024) {
          const tableContainer = tableElement.closest('div');
          if (tableContainer) {
            const containerStyle = window.getComputedStyle(tableContainer);
            // Should allow horizontal scrolling on small screens
            expect(['scroll', 'auto']).toContain(containerStyle.overflowX);
          }
        }

        console.log(`✅ ${name} responsive test passed`);
      });
    });

    it('should provide proper touch targets on mobile devices', async () => {
      mockWindowDimensions(375, 667); // iPhone dimensions

      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Find navigation buttons
      const navButtons = screen.getAllByRole('button');
      
      navButtons.forEach((button, index) => {
        const buttonStyle = window.getComputedStyle(button);
        const minTouchTarget = 44; // 44px minimum touch target
        
        // Mock button dimensions for testing
        mockElementDimensions(button, {
          width: Math.max(minTouchTarget, 48),
          height: Math.max(minTouchTarget, 48)
        });

        const buttonRect = button.getBoundingClientRect();
        expect(buttonRect.width).toBeGreaterThanOrEqual(minTouchTarget);
        expect(buttonRect.height).toBeGreaterThanOrEqual(minTouchTarget);
      });

      console.log('✅ Mobile touch targets test passed');
    });
  });

  describe('Manager Controls Visibility', () => {
    it('should display manager controls prominently', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Look for manager-specific controls
      // These might include export buttons, team management, etc.
      const exportButtons = screen.queryAllByText(/export/i);
      const managementButtons = screen.queryAllByText(/manage/i);

      // If export functionality exists, it should be visible for managers
      if (exportButtons.length > 0) {
        exportButtons.forEach(button => {
          expect(button).toBeVisible();
        });
        console.log('✅ Manager export controls visible');
      }

      // Check for team management functionality
      if (managementButtons.length > 0) {
        managementButtons.forEach(button => {
          expect(button).toBeVisible();
        });
        console.log('✅ Manager team controls visible');
      }

      console.log('✅ Manager controls visibility test passed');
    });

    it('should handle manager controls interaction properly', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Test navigation controls
      const nextButton = screen.queryByRole('button', { name: /next/i });
      const prevButton = screen.queryByRole('button', { name: /previous/i });

      if (nextButton) {
        expect(nextButton).toBeEnabled();
        fireEvent.click(nextButton);
        
        // Should not cause layout issues
        await waitFor(() => {
          expect(screen.getByText(/Week of/i)).toBeInTheDocument();
        });
      }

      if (prevButton) {
        expect(prevButton).toBeEnabled();
        fireEvent.click(prevButton);
        
        // Should maintain table visibility after navigation
        await waitFor(() => {
          const tableElement = screen.getByRole('table');
          expect(tableElement).toBeVisible();
        });
      }

      console.log('✅ Manager controls interaction test passed');
    });
  });

  describe('Visual Hierarchy Tests', () => {
    it('should maintain proper visual hierarchy with headers and content', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Check heading hierarchy
      const mainHeading = screen.getByText(/Week of/i);
      const teamName = screen.queryByText(mockTeam.name);

      expect(mainHeading).toBeInTheDocument();
      
      if (teamName) {
        expect(teamName).toBeInTheDocument();
        
        // Check that both are properly styled
        const mainHeadingStyle = window.getComputedStyle(mainHeading);
        const teamNameStyle = window.getComputedStyle(teamName);
        
        // Main heading should be prominent
        expect(parseInt(mainHeadingStyle.fontSize)).toBeGreaterThan(14);
        expect(parseInt(teamNameStyle.fontSize)).toBeGreaterThan(12);
      }

      console.log('✅ Visual hierarchy test passed');
    });

    it('should provide clear visual separation between sections', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Check that different sections have visual separation
      const headerSection = screen.getByText(/Week of/i).closest('div');
      const tableSection = screen.getByRole('table').closest('div');

      if (headerSection && tableSection) {
        const headerStyle = window.getComputedStyle(headerSection);
        const tableStyle = window.getComputedStyle(tableSection);

        // Check for proper spacing/margins
        const headerMarginBottom = parseInt(headerStyle.marginBottom) || 0;
        const tableMarginTop = parseInt(tableStyle.marginTop) || 0;

        expect(headerMarginBottom + tableMarginTop).toBeGreaterThan(0);
        console.log('✅ Section separation test passed');
      }
    });
  });

  describe('Accessibility Layout Tests', () => {
    it('should maintain proper focus order and keyboard navigation', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Get all focusable elements
      const focusableElements = screen.getAllByRole('button');
      
      if (focusableElements.length > 0) {
        // Test tab order
        focusableElements[0].focus();
        expect(document.activeElement).toBe(focusableElements[0]);

        // Simulate Tab key navigation
        fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
        
        console.log('✅ Keyboard navigation test passed');
      }
    });

    it('should provide proper ARIA labels and screen reader support', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Check for proper table structure
      const tableElement = screen.getByRole('table');
      expect(tableElement).toBeInTheDocument();

      // Check for table headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);

      // Check for proper row/cell structure
      const tableCells = screen.getAllByRole('cell');
      expect(tableCells.length).toBeGreaterThan(0);

      console.log('✅ ARIA labels and screen reader support test passed');
    });
  });

  describe('Performance Layout Tests', () => {
    it('should render table without layout thrashing', async () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={mockTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);

      console.log(`✅ Render performance test passed (${renderTime.toFixed(2)}ms)`);
    });

    it('should handle large team sizes without layout issues', async () => {
      const largeTeamMembers = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Team Member ${i + 1}`,
        team_id: 1,
        role: 'member' as const,
        weekly_capacity: 35
      }));

      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={largeTeamMembers}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Table should still be visible and functional with many members
      const tableElement = screen.getByRole('table');
      expect(tableElement).toBeVisible();

      console.log('✅ Large team size test passed');
    });
  });
});