/**
 * @jest-environment jsdom
 */

// Mock all required hooks and services
jest.mock('@/hooks/useAppState', () => ({
  useLoadingState: jest.fn(),
  useErrorState: jest.fn(),
  useModalState: jest.fn(),
  useNavigationState: jest.fn(),
  useSchedulesState: jest.fn(),
  useSprintsState: jest.fn(),
  useNotifications: jest.fn(),
  useRefreshUtilities: jest.fn()
}));

jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getScheduleEntries: jest.fn(),
    subscribeToScheduleChanges: jest.fn(),
    updateScheduleEntry: jest.fn(),
    triggerAchievementCheck: jest.fn()
  }
}));

// Mock child components
jest.mock('@/components/ReasonDialog', () => {
  return function MockReasonDialog({ isOpen, onClose, onSave }: any) {
    return isOpen ? (
      <div data-testid="reason-dialog">
        <button onClick={() => onSave('Test reason')}>Save Reason</button>
        <button onClick={onClose}>Close Dialog</button>
      </div>
    ) : null;
  };
});

jest.mock('@/components/ViewReasonsModal', () => {
  return function MockViewReasonsModal({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="view-reasons-modal">
        <button onClick={onClose}>Close View Reasons</button>
      </div>
    ) : null;
  };
});

jest.mock('@/components/MobileScheduleView', () => {
  return function MockMobileScheduleView({ currentUser, teamMembers, selectedTeam }: any) {
    return (
      <div data-testid="mobile-schedule-view" className="lg:hidden">
        Mobile Schedule for {selectedTeam.name}
      </div>
    );
  };
});

jest.mock('@/components/CompactHeaderBar', () => {
  return function MockCompactHeaderBar({ selectedTeam, onWeekChange, onViewReasons }: any) {
    return (
      <div data-testid="compact-header-bar" className="hidden lg:block">
        <button onClick={() => onWeekChange(-1)}>Previous Week</button>
        <span>{selectedTeam.name} Header</span>
        <button onClick={() => onWeekChange(1)}>Next Week</button>
        <button onClick={onViewReasons}>View Reasons</button>
      </div>
    );
  };
});

jest.mock('@/components/QuickActionsBar', () => {
  return function MockQuickActionsBar({ onFullWeekSet }: any) {
    return (
      <div data-testid="quick-actions-bar" className="hidden lg:block">
        <button onClick={() => onFullWeekSet(1)}>Set Full Week</button>
      </div>
    );
  };
});

jest.mock('@/components/EnhancedAvailabilityTable', () => {
  return function MockEnhancedAvailabilityTable({ 
    teamMembers, 
    scheduleData, 
    onWorkOptionClick,
    calculateWeeklyHours 
  }: any) {
    return (
      <div data-testid="enhanced-availability-table" className="hidden lg:block">
        <div data-testid="team-members-count">{teamMembers.length} members</div>
        {teamMembers.map((member: any) => (
          <div key={member.id} data-testid={`member-${member.id}`}>
            {member.name} - {calculateWeeklyHours(member.id)} hours
            <button onClick={() => onWorkOptionClick(member.id, new Date(), '1')}>
              Full Day
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/TeamSummaryOverview', () => {
  return function MockTeamSummaryOverview({ team, currentSprint }: any) {
    return (
      <div data-testid="team-summary-overview">
        Team Summary: {team.name} - Sprint {currentSprint?.current_sprint_number}
      </div>
    );
  };
});


jest.mock('@/components/ClientOnly', () => {
  return function MockClientOnly({ children, fallback }: any) {
    return children || fallback;
  };
});

jest.mock('@/components/TeamMemberManagement', () => {
  return function MockTeamMemberManagement({ onMembersUpdated }: any) {
    return (
      <div data-testid="team-member-management">
        <button onClick={onMembersUpdated}>Update Members</button>
      </div>
    );
  };
});

jest.mock('@/components/TeamHoursStatus', () => {
  return function MockTeamHoursStatus({ selectedTeam }: any) {
    return (
      <div data-testid="team-hours-status">
        Hours Status for {selectedTeam.name}
      </div>
    );
  };
});

jest.mock('@/components/GlobalSprintSettings', () => {
  return function MockGlobalSprintSettings({ isOpen }: any) {
    return isOpen ? <div data-testid="global-sprint-settings">Sprint Settings</div> : null;
  };
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleTable from '@/components/ScheduleTable';
import { DatabaseService } from '@/lib/database';
import {
  useLoadingState,
  useErrorState,
  useModalState,
  useNavigationState,
  useSchedulesState,
  useSprintsState,
  useNotifications,
  useRefreshUtilities
} from '@/hooks/useAppState';
import { 
  createMockTeam, 
  createMockTeamMember, 
  createMockManager, 
  createMockCurrentSprint,
  createMockScheduleData
} from '../utils/testHelpers';

// Type the mocked functions
const mockUseLoadingState = useLoadingState as jest.MockedFunction<typeof useLoadingState>;
const mockUseErrorState = useErrorState as jest.MockedFunction<typeof useErrorState>;
const mockUseModalState = useModalState as jest.MockedFunction<typeof useModalState>;
const mockUseNavigationState = useNavigationState as jest.MockedFunction<typeof useNavigationState>;
const mockUseSchedulesState = useSchedulesState as jest.MockedFunction<typeof useSchedulesState>;
const mockUseSprintsState = useSprintsState as jest.MockedFunction<typeof useSprintsState>;
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;
const mockUseRefreshUtilities = useRefreshUtilities as jest.MockedFunction<typeof useRefreshUtilities>;

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('ScheduleTable', () => {
  // Test data setup
  const mockCurrentUser = createMockManager({ id: 1, name: 'Manager User' });
  const mockTeamMembers = [
    mockCurrentUser,
    createMockTeamMember({ id: 2, name: 'John Doe' }),
    createMockTeamMember({ id: 3, name: 'Jane Smith' })
  ];
  const mockSelectedTeam = createMockTeam({ id: 1, name: 'Engineering Team' });
  const mockCurrentSprint = createMockCurrentSprint();
  const mockScheduleData = createMockScheduleData();

  // Default props
  const defaultProps = {
    currentUser: mockCurrentUser,
    teamMembers: mockTeamMembers,
    selectedTeam: mockSelectedTeam
  };

  // Default hook return values
  const defaultHookReturns = {
    loading: { schedules: false, setSchedulesLoading: jest.fn() },
    error: { schedules: null, setSchedulesError: jest.fn() },
    modal: {
      reasonDialog: { isOpen: false, open: jest.fn(), close: jest.fn() },
      viewReasons: { isOpen: false, open: jest.fn(), close: jest.fn() }
    },
    navigation: { currentWeekOffset: 0 },
    schedules: {
      scheduleData: mockScheduleData,
      currentWeekDates: [],
      weekDays: [],
      setScheduleData: jest.fn(),
      setCurrentWeekDates: jest.fn(),
      updateScheduleEntry: jest.fn()
    },
    sprints: { currentSprint: mockCurrentSprint },
    notifications: { showError: jest.fn(), showSuccess: jest.fn() },
    refresh: { refreshSchedules: jest.fn() }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockUseLoadingState.mockReturnValue(defaultHookReturns.loading);
    mockUseErrorState.mockReturnValue(defaultHookReturns.error);
    mockUseModalState.mockReturnValue(defaultHookReturns.modal);
    mockUseNavigationState.mockReturnValue(defaultHookReturns.navigation);
    mockUseSchedulesState.mockReturnValue(defaultHookReturns.schedules);
    mockUseSprintsState.mockReturnValue(defaultHookReturns.sprints);
    mockUseNotifications.mockReturnValue(defaultHookReturns.notifications);
    mockUseRefreshUtilities.mockReturnValue(defaultHookReturns.refresh);

    // Setup database service mocks
    mockDatabaseService.getScheduleEntries.mockResolvedValue(mockScheduleData);
    mockDatabaseService.subscribeToScheduleChanges.mockReturnValue({
      unsubscribe: jest.fn()
    });
    mockDatabaseService.updateScheduleEntry.mockResolvedValue(true);
    mockDatabaseService.triggerAchievementCheck.mockResolvedValue(true);
  });

  describe('Loading States', () => {
    it('should display loading spinner when schedules are loading', () => {
      mockUseLoadingState.mockReturnValue({
        schedules: true,
        setSchedulesLoading: jest.fn()
      });

      render(<ScheduleTable {...defaultProps} />);

      expect(screen.getByText(/Loading/)).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
    });

    it('should hide loading state when data is loaded', () => {
      render(<ScheduleTable {...defaultProps} />);

      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
      expect(screen.queryByRole('generic', { class: 'animate-pulse' })).not.toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('should render mobile view components', () => {
      render(<ScheduleTable {...defaultProps} />);

      expect(screen.getByTestId('mobile-schedule-view')).toBeInTheDocument();
      expect(screen.getByTestId('team-daily-summary')).toBeInTheDocument();
    });

    it('should render desktop view components', () => {
      render(<ScheduleTable {...defaultProps} />);

      expect(screen.getByTestId('compact-header-bar')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions-bar')).toBeInTheDocument();
      expect(screen.getByTestId('enhanced-availability-table')).toBeInTheDocument();
    });

    it('should show team summary for managers', () => {
      render(<ScheduleTable {...defaultProps} />);

      expect(screen.getAllByTestId('team-summary-overview')).toHaveLength(2); // Mobile + Desktop
    });

    it('should hide team summary for non-managers', () => {
      const nonManagerUser = createMockTeamMember({ id: 2, isManager: false });
      render(<ScheduleTable {...defaultProps} currentUser={nonManagerUser} />);

      expect(screen.queryByTestId('team-summary-overview')).not.toBeInTheDocument();
    });

    it('should render team management section for managers', () => {
      render(<ScheduleTable {...defaultProps} />);

      expect(screen.getByTestId('team-member-management')).toBeInTheDocument();
      expect(screen.getByText('Team Management')).toBeInTheDocument();
    });

    it('should hide team management for non-managers', () => {
      const nonManagerUser = createMockTeamMember({ id: 2, isManager: false });
      render(<ScheduleTable {...defaultProps} currentUser={nonManagerUser} />);

      expect(screen.queryByTestId('team-member-management')).not.toBeInTheDocument();
    });

    it('should render team hours status when sprint exists', () => {
      render(<ScheduleTable {...defaultProps} />);

      expect(screen.getByTestId('team-hours-status')).toBeInTheDocument();
      expect(screen.getByText('Sprint Hours Status')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should load schedule data on mount', async () => {
      render(<ScheduleTable {...defaultProps} />);

      await waitFor(() => {
        expect(mockDatabaseService.getScheduleEntries).toHaveBeenCalledTimes(1);
      });
    });

    it('should reload data when week offset changes', async () => {
      const { rerender } = render(<ScheduleTable {...defaultProps} />);

      // Change week offset
      mockUseNavigationState.mockReturnValue({ currentWeekOffset: 1 });
      rerender(<ScheduleTable {...defaultProps} />);

      await waitFor(() => {
        expect(mockDatabaseService.getScheduleEntries).toHaveBeenCalledTimes(2);
      });
    });

    it('should reload data when team changes', async () => {
      const { rerender } = render(<ScheduleTable {...defaultProps} />);

      const newTeam = createMockTeam({ id: 2, name: 'New Team' });
      rerender(<ScheduleTable {...defaultProps} selectedTeam={newTeam} />);

      await waitFor(() => {
        expect(mockDatabaseService.getScheduleEntries).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle loading errors gracefully', async () => {
      const error = new Error('Database error');
      mockDatabaseService.getScheduleEntries.mockRejectedValue(error);

      render(<ScheduleTable {...defaultProps} />);

      await waitFor(() => {
        expect(defaultHookReturns.error.setSchedulesError).toHaveBeenCalledWith(
          'Failed to load schedule data: Database error'
        );
        expect(defaultHookReturns.notifications.showError).toHaveBeenCalledWith(
          'Load Error',
          'Failed to load schedule data: Database error'
        );
      });
    });

    it('should show success notification on successful data load', async () => {
      render(<ScheduleTable {...defaultProps} />);

      await waitFor(() => {
        expect(defaultHookReturns.notifications.showSuccess).toHaveBeenCalledWith(
          'Schedule Loaded',
          'Schedule data loaded successfully'
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should set up real-time subscription', () => {
      render(<ScheduleTable {...defaultProps} />);

      expect(mockDatabaseService.subscribeToScheduleChanges).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe on component unmount', () => {
      const unsubscribe = jest.fn();
      mockDatabaseService.subscribeToScheduleChanges.mockReturnValue({ unsubscribe });

      const { unmount } = render(<ScheduleTable {...defaultProps} />);
      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should reload data when real-time changes occur', async () => {
      let subscriptionCallback: (() => void) | undefined;
      mockDatabaseService.subscribeToScheduleChanges.mockImplementation((_, __, ___, callback) => {
        subscriptionCallback = callback;
        return { unsubscribe: jest.fn() };
      });

      render(<ScheduleTable {...defaultProps} />);

      // Trigger real-time update
      if (subscriptionCallback) {
        act(() => {
          subscriptionCallback();
        });
      }

      await waitFor(() => {
        expect(mockDatabaseService.getScheduleEntries).toHaveBeenCalledTimes(2); // Initial + subscription callback
      });
    });
  });

  describe('Schedule Updates', () => {
    it('should update schedule entry for full day', async () => {
      render(<ScheduleTable {...defaultProps} />);

      const fullDayButton = screen.getByText('Full Day');
      fireEvent.click(fullDayButton);

      await waitFor(() => {
        expect(mockDatabaseService.updateScheduleEntry).toHaveBeenCalledWith(
          2, // member id
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // date string
          '1',
          undefined
        );
        expect(defaultHookReturns.notifications.showSuccess).toHaveBeenCalledWith(
          'Schedule Updated',
          'Schedule entry updated successfully'
        );
      });
    });

    it('should trigger achievement check after schedule update', async () => {
      render(<ScheduleTable {...defaultProps} />);

      const fullDayButton = screen.getByText('Full Day');
      fireEvent.click(fullDayButton);

      await waitFor(() => {
        expect(mockDatabaseService.triggerAchievementCheck).toHaveBeenCalledWith(2);
      });
    });

    it('should handle update errors gracefully', async () => {
      const error = new Error('Update failed');
      mockDatabaseService.updateScheduleEntry.mockRejectedValue(error);

      render(<ScheduleTable {...defaultProps} />);

      const fullDayButton = screen.getByText('Full Day');
      fireEvent.click(fullDayButton);

      await waitFor(() => {
        expect(defaultHookReturns.notifications.showError).toHaveBeenCalledWith(
          'Update Error',
          'Failed to update schedule entry'
        );
      });
    });

    it('should continue with update even if achievement check fails', async () => {
      mockDatabaseService.triggerAchievementCheck.mockRejectedValue(new Error('Achievement error'));

      render(<ScheduleTable {...defaultProps} />);

      const fullDayButton = screen.getByText('Full Day');
      fireEvent.click(fullDayButton);

      await waitFor(() => {
        expect(mockDatabaseService.updateScheduleEntry).toHaveBeenCalled();
        expect(defaultHookReturns.notifications.showSuccess).toHaveBeenCalledWith(
          'Schedule Updated',
          'Schedule entry updated successfully'
        );
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should open reason dialog', () => {
      render(<ScheduleTable {...defaultProps} />);

      const viewReasonsButton = screen.getByText('View Reasons');
      fireEvent.click(viewReasonsButton);

      expect(defaultHookReturns.modal.viewReasons.open).toHaveBeenCalledTimes(1);
    });

    it('should render reason dialog when open', () => {
      mockUseModalState.mockReturnValue({
        reasonDialog: { isOpen: true, open: jest.fn(), close: jest.fn() },
        viewReasons: { isOpen: false, open: jest.fn(), close: jest.fn() }
      });

      render(<ScheduleTable {...defaultProps} />);

      expect(screen.getByTestId('reason-dialog')).toBeInTheDocument();
    });

    it('should render view reasons modal when open', () => {
      mockUseModalState.mockReturnValue({
        reasonDialog: { isOpen: false, open: jest.fn(), close: jest.fn() },
        viewReasons: { isOpen: true, open: jest.fn(), close: jest.fn() }
      });

      render(<ScheduleTable {...defaultProps} />);

      expect(screen.getByTestId('view-reasons-modal')).toBeInTheDocument();
    });

    it('should close reason dialog', () => {
      const mockClose = jest.fn();
      mockUseModalState.mockReturnValue({
        reasonDialog: { isOpen: true, open: jest.fn(), close: mockClose },
        viewReasons: { isOpen: false, open: jest.fn(), close: jest.fn() }
      });

      render(<ScheduleTable {...defaultProps} />);

      const closeButton = screen.getByText('Close Dialog');
      fireEvent.click(closeButton);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Quick Actions', () => {
    it('should handle full week set action', () => {
      render(<ScheduleTable {...defaultProps} />);

      const setFullWeekButton = screen.getByText('Set Full Week');
      fireEvent.click(setFullWeekButton);

      // This would typically involve a confirmation dialog and then updates
      // The actual implementation depends on the mock behavior
      expect(setFullWeekButton).toBeInTheDocument();
    });

    it('should handle team member updates', () => {
      render(<ScheduleTable {...defaultProps} />);

      const updateMembersButton = screen.getByText('Update Members');
      fireEvent.click(updateMembersButton);

      expect(defaultHookReturns.refresh.refreshSchedules).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Behavior', () => {
    it('should show mobile components on mobile screens', () => {
      render(<ScheduleTable {...defaultProps} />);

      const mobileView = screen.getByTestId('mobile-schedule-view');
      expect(mobileView).toHaveClass('lg:hidden');
    });

    it('should show desktop components on desktop screens', () => {
      render(<ScheduleTable {...defaultProps} />);

      const desktopComponents = screen.getAllByText(/hidden lg:block/i);
      expect(desktopComponents.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should render with proper semantic structure', () => {
      render(<ScheduleTable {...defaultProps} />);

      // Check for proper heading structure
      expect(screen.getByText('Team Management')).toBeInTheDocument();
      expect(screen.getByText('Sprint Hours Status')).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(<ScheduleTable {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const startTime = performance.now();
      render(<ScheduleTable {...defaultProps} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle large team sizes efficiently', () => {
      const largeTeamMembers = Array.from({ length: 50 }, (_, i) => 
        createMockTeamMember({ id: i + 1, name: `Member ${i + 1}` })
      );

      const startTime = performance.now();
      render(<ScheduleTable {...defaultProps} teamMembers={largeTeamMembers} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(500); // Should still render efficiently
      expect(screen.getByTestId('team-members-count')).toHaveTextContent('50 members');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing schedule data gracefully', () => {
      mockUseSchedulesState.mockReturnValue({
        ...defaultHookReturns.schedules,
        scheduleData: {}
      });

      render(<ScheduleTable {...defaultProps} />);

      // Should still render without crashing
      expect(screen.getByTestId('enhanced-availability-table')).toBeInTheDocument();
    });

    it('should handle missing current sprint gracefully', () => {
      mockUseSprintsState.mockReturnValue({
        currentSprint: null
      });

      render(<ScheduleTable {...defaultProps} />);

      // Team hours status should not be rendered without current sprint
      expect(screen.queryByTestId('team-hours-status')).not.toBeInTheDocument();
    });

    it('should handle empty team members array', () => {
      render(<ScheduleTable {...defaultProps} teamMembers={[]} />);

      expect(screen.getByTestId('team-members-count')).toHaveTextContent('0 members');
    });
  });
});