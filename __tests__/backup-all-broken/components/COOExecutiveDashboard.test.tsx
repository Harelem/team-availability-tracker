/**
 * @jest-environment jsdom
 */

// Mock all required hooks and services
jest.mock('@/hooks/useAppState', () => ({
  useLoadingState: jest.fn(),
  useErrorState: jest.fn(),
  useModalState: jest.fn(),
  useNavigationState: jest.fn(),
  useTeamsState: jest.fn(),
  useDashboardState: jest.fn(),
  useSprintsState: jest.fn(),
  useRefreshUtilities: jest.fn(),
  useNotifications: jest.fn()
}));

jest.mock('@/hooks/useMobileDetection', () => ({
  useMobileDetection: jest.fn()
}));

jest.mock('@/hooks/useErrorBoundary', () => ({
  useErrorBoundary: jest.fn()
}));

jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getCOODashboardData: jest.fn(),
    getOperationalTeams: jest.fn(),
    getTeamMembers: jest.fn()
  }
}));

jest.mock('@/lib/calculationService', () => ({
  formatHours: jest.fn((hours) => `${hours}h`),
  formatPercentage: jest.fn((percent) => `${percent}%`)
}));

// Mock child components
jest.mock('@/components/COOExportButton', () => {
  return function MockCOOExportButton({ currentUser, disabled }: any) {
    return (
      <button data-testid="coo-export-button" disabled={disabled}>
        Export Data
      </button>
    );
  };
});

jest.mock('@/components/MobileCOODashboard', () => {
  return function MockMobileCOODashboard({ currentUser, onBack, onRefresh }: any) {
    return (
      <div data-testid="mobile-coo-dashboard">
        Mobile COO Dashboard for {currentUser?.name}
        <button onClick={onBack}>Back</button>
        <button onClick={onRefresh}>Refresh</button>
      </div>
    );
  };
});

jest.mock('@/components/SimplifiedMetricsCards', () => {
  return function MockSimplifiedMetricsCards({ dashboardData }: any) {
    return (
      <div data-testid="simplified-metrics-cards">
        Metrics: {dashboardData.companyOverview.totalMembers} members
      </div>
    );
  };
});

jest.mock('@/components/COOHoursStatusOverview', () => {
  return function MockCOOHoursStatusOverview({ allTeams, currentSprint }: any) {
    return (
      <div data-testid="coo-hours-status-overview">
        Hours Overview: {allTeams.length} teams, Sprint {currentSprint.current_sprint_number}
      </div>
    );
  };
});

jest.mock('@/components/analytics/ConsolidatedAnalytics', () => {
  return function MockConsolidatedAnalytics({ currentUser, dashboardData }: any) {
    return (
      <div data-testid="consolidated-analytics">
        Analytics for {currentUser?.name}: {dashboardData.companyOverview.totalTeams} teams
      </div>
    );
  };
});

jest.mock('@/components/coo/DailyCompanyStatus', () => {
  return function MockDailyCompanyStatus() {
    return <div data-testid="daily-company-status">Daily Status View</div>;
  };
});

jest.mock('@/components/SprintPlanningCalendar', () => {
  return function MockSprintPlanningCalendar() {
    return <div data-testid="sprint-planning-calendar">Sprint Planning Calendar</div>;
  };
});

jest.mock('@/components/modals/TeamDetailModal', () => {
  return function MockTeamDetailModal({ teamId, isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="team-detail-modal">
        Team Detail Modal for team {teamId}
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null;
  };
});

jest.mock('@/components/ui/COOCard', () => ({
  COOCard: function MockCOOCard({ title, children, onClick, interactive, badge, status }: any) {
    return (
      <div 
        data-testid="coo-card" 
        data-title={title}
        data-status={status}
        data-interactive={interactive}
        onClick={onClick}
        className={interactive ? 'cursor-pointer' : ''}
      >
        <div data-testid="card-title">{title}</div>
        {badge && <div data-testid="card-badge">{badge.text}</div>}
        <div data-testid="card-content">{children}</div>
      </div>
    );
  }
}));

jest.mock('@/components/ui/ErrorDisplay', () => {
  return function MockErrorDisplay({ error, onRetry, onDismiss, variant }: any) {
    return (
      <div data-testid="error-display" data-variant={variant}>
        <div data-testid="error-message">{error.userMessage}</div>
        {onRetry && <button onClick={onRetry} data-testid="retry-button">Retry</button>}
        {onDismiss && <button onClick={onDismiss} data-testid="dismiss-button">Dismiss</button>}
      </div>
    );
  };
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import COOExecutiveDashboard from '@/components/COOExecutiveDashboard';
import { DatabaseService } from '@/lib/database';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';
import {
  useLoadingState,
  useErrorState,
  useModalState,
  useNavigationState,
  useTeamsState,
  useDashboardState,
  useSprintsState,
  useRefreshUtilities,
  useNotifications
} from '@/hooks/useAppState';
import { 
  createMockTeam, 
  createMockTeamMember, 
  createMockCurrentSprint,
  createMockCOODashboardData
} from '../utils/testHelpers';
import { ErrorCategory } from '@/types/errors';

// Type the mocked functions
const mockUseMobileDetection = useMobileDetection as jest.MockedFunction<typeof useMobileDetection>;
const mockUseErrorBoundary = useErrorBoundary as jest.MockedFunction<typeof useErrorBoundary>;
const mockUseLoadingState = useLoadingState as jest.MockedFunction<typeof useLoadingState>;
const mockUseErrorState = useErrorState as jest.MockedFunction<typeof useErrorState>;
const mockUseModalState = useModalState as jest.MockedFunction<typeof useModalState>;
const mockUseNavigationState = useNavigationState as jest.MockedFunction<typeof useNavigationState>;
const mockUseTeamsState = useTeamsState as jest.MockedFunction<typeof useTeamsState>;
const mockUseDashboardState = useDashboardState as jest.MockedFunction<typeof useDashboardState>;
const mockUseSprintsState = useSprintsState as jest.MockedFunction<typeof useSprintsState>;
const mockUseRefreshUtilities = useRefreshUtilities as jest.MockedFunction<typeof useRefreshUtilities>;
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

describe('COOExecutiveDashboard', () => {
  // Test data setup
  const mockCurrentUser = {
    id: 1,
    name: 'COO User',
    title: 'Chief Operating Officer',
    email: 'coo@company.com'
  };

  const mockTeams = [
    createMockTeam({ id: 1, name: 'Engineering' }),
    createMockTeam({ id: 2, name: 'Product' }),
    createMockTeam({ id: 3, name: 'Design' }),
    createMockTeam({ id: 4, name: 'Marketing' }),
    createMockTeam({ id: 5, name: 'Operations' })
  ];

  const mockTeamsWithMembers = mockTeams.map(team => ({
    ...team,
    team_members: [
      createMockTeamMember({ id: team.id * 10 + 1, team_id: team.id }),
      createMockTeamMember({ id: team.id * 10 + 2, team_id: team.id })
    ]
  }));

  const mockCurrentSprint = createMockCurrentSprint();
  const mockDashboardData = createMockCOODashboardData();

  // Default hook return values
  const defaultHookReturns = {
    loading: { dashboard: false, setDashboardLoading: jest.fn() },
    error: { dashboard: null, setDashboardError: jest.fn() },
    modal: {
      teamDetail: { isOpen: false, open: jest.fn(), close: jest.fn() },
      workforceStatus: { isOpen: false, open: jest.fn(), close: jest.fn() }
    },
    navigation: {
      cooActiveTab: 'dashboard' as const,
      setCOOActiveTab: jest.fn(),
      selectedTeamId: null,
      selectTeam: jest.fn()
    },
    teams: {
      allTeamsWithMembers: mockTeamsWithMembers,
      setAllTeamsWithMembers: jest.fn(),
      setTeams: jest.fn()
    },
    dashboard: {
      cooData: mockDashboardData,
      setCOODashboardData: jest.fn()
    },
    sprints: { currentSprint: mockCurrentSprint },
    refresh: { refreshDashboard: jest.fn() },
    notifications: { showError: jest.fn(), showSuccess: jest.fn() },
    errorBoundary: {
      hasError: false,
      error: null,
      isRecovering: false,
      retryCount: 0,
      captureError: jest.fn(),
      retry: jest.fn(),
      reset: jest.fn(),
      dismiss: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockUseMobileDetection.mockReturnValue(false);
    mockUseErrorBoundary.mockReturnValue(defaultHookReturns.errorBoundary);
    mockUseLoadingState.mockReturnValue(defaultHookReturns.loading);
    mockUseErrorState.mockReturnValue(defaultHookReturns.error);
    mockUseModalState.mockReturnValue(defaultHookReturns.modal);
    mockUseNavigationState.mockReturnValue(defaultHookReturns.navigation);
    mockUseTeamsState.mockReturnValue(defaultHookReturns.teams);
    mockUseDashboardState.mockReturnValue(defaultHookReturns.dashboard);
    mockUseSprintsState.mockReturnValue(defaultHookReturns.sprints);
    mockUseRefreshUtilities.mockReturnValue(defaultHookReturns.refresh);
    mockUseNotifications.mockReturnValue(defaultHookReturns.notifications);

    // Setup database service mocks
    mockDatabaseService.getCOODashboardData.mockResolvedValue(mockDashboardData);
    mockDatabaseService.getOperationalTeams.mockResolvedValue(mockTeams);
    mockDatabaseService.getTeamMembers.mockResolvedValue([
      createMockTeamMember({ id: 1 }),
      createMockTeamMember({ id: 2 })
    ]);
  });

  describe('Loading States', () => {
    it('should display loading spinner when dashboard is loading', () => {
      mockUseLoadingState.mockReturnValue({
        dashboard: true,
        setDashboardLoading: jest.fn()
      });

      render(<COOExecutiveDashboard />);

      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
      expect(screen.queryByText('COO Executive Dashboard')).not.toBeInTheDocument();
    });

    it('should show loading state in refresh button when loading', () => {
      mockUseLoadingState.mockReturnValue({
        dashboard: true,
        setDashboardLoading: jest.fn()
      });
      mockUseDashboardState.mockReturnValue({
        cooData: mockDashboardData,
        setCOODashboardData: jest.fn()
      });

      render(<COOExecutiveDashboard />);

      const refreshButton = screen.getByText('Refreshing...');
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toBeDisabled();
    });

    it('should hide loading state when data is loaded', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.queryByRole('generic', { class: 'animate-pulse' })).not.toBeInTheDocument();
      expect(screen.getByText('COO Executive Dashboard')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render mobile dashboard on mobile devices', () => {
      mockUseMobileDetection.mockReturnValue(true);

      render(<COOExecutiveDashboard currentUser={mockCurrentUser} />);

      expect(screen.getByTestId('mobile-coo-dashboard')).toBeInTheDocument();
      expect(screen.queryByText('COO Executive Dashboard')).not.toBeInTheDocument();
    });

    it('should render desktop dashboard on desktop devices', () => {
      mockUseMobileDetection.mockReturnValue(false);

      render(<COOExecutiveDashboard currentUser={mockCurrentUser} />);

      expect(screen.queryByTestId('mobile-coo-dashboard')).not.toBeInTheDocument();
      expect(screen.getByText('COO Executive Dashboard')).toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('should render main header with user information', () => {
      render(<COOExecutiveDashboard currentUser={mockCurrentUser} />);

      expect(screen.getByText('COO Executive Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Welcome, COO User/)).toBeInTheDocument();
      expect(screen.getByText(/Chief Operating Officer/)).toBeInTheDocument();
    });

    it('should render header without user information when no current user', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.getByText('COO Executive Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Company-wide workforce capacity analytics/)).toBeInTheDocument();
    });

    it('should render back button when onBack is provided', () => {
      const mockOnBack = jest.fn();
      render(<COOExecutiveDashboard onBack={mockOnBack} />);

      const backButton = screen.getByText('Back to Selection');
      expect(backButton).toBeInTheDocument();
      
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should render all tab navigation buttons', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(screen.getByText('Daily Status')).toBeInTheDocument();
      expect(screen.getByText('Analytics & Insights')).toBeInTheDocument();
      expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
    });

    it('should render simplified metrics cards', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.getByTestId('simplified-metrics-cards')).toBeInTheDocument();
    });

    it('should render export button', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.getByTestId('coo-export-button')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should load dashboard data on mount', async () => {
      render(<COOExecutiveDashboard />);

      await waitFor(() => {
        expect(mockDatabaseService.getCOODashboardData).toHaveBeenCalledTimes(1);
        expect(mockDatabaseService.getOperationalTeams).toHaveBeenCalledTimes(1);
      });
    });

    it('should load team members for all teams', async () => {
      render(<COOExecutiveDashboard />);

      await waitFor(() => {
        expect(mockDatabaseService.getTeamMembers).toHaveBeenCalledTimes(5); // Once per team
      });
    });

    it('should update centralized state with loaded data', async () => {
      render(<COOExecutiveDashboard />);

      await waitFor(() => {
        expect(defaultHookReturns.dashboard.setCOODashboardData).toHaveBeenCalledWith(mockDashboardData);
        expect(defaultHookReturns.teams.setAllTeamsWithMembers).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: 'Engineering', team_members: expect.any(Array) })
          ])
        );
      });
    });

    it('should show success notification on successful load', async () => {
      render(<COOExecutiveDashboard />);

      await waitFor(() => {
        expect(defaultHookReturns.notifications.showSuccess).toHaveBeenCalledWith(
          'Dashboard Updated',
          'Successfully loaded dashboard data'
        );
      });
    });

    it('should handle data loading errors', async () => {
      const error = new Error('Database error');
      mockDatabaseService.getCOODashboardData.mockRejectedValue(error);

      render(<COOExecutiveDashboard />);

      await waitFor(() => {
        expect(defaultHookReturns.errorBoundary.captureError).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            action: 'loadDashboardData'
          })
        );
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to daily status tab', () => {
      render(<COOExecutiveDashboard />);

      const dailyStatusTab = screen.getByText('Daily Status');
      fireEvent.click(dailyStatusTab);

      expect(defaultHookReturns.navigation.setCOOActiveTab).toHaveBeenCalledWith('daily-status');
    });

    it('should switch to analytics tab', () => {
      render(<COOExecutiveDashboard />);

      const analyticsTab = screen.getByText('Analytics & Insights');
      fireEvent.click(analyticsTab);

      expect(defaultHookReturns.navigation.setCOOActiveTab).toHaveBeenCalledWith('analytics');
    });

    it('should switch to sprint planning tab', () => {
      render(<COOExecutiveDashboard />);

      const sprintPlanningTab = screen.getByText('Sprint Planning');
      fireEvent.click(sprintPlanningTab);

      expect(defaultHookReturns.navigation.setCOOActiveTab).toHaveBeenCalledWith('sprint-planning');
    });

    it('should display dashboard content by default', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.getByTestId('simplified-metrics-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('daily-company-status')).not.toBeInTheDocument();
    });

    it('should display daily status content when tab is active', () => {
      mockUseNavigationState.mockReturnValue({
        ...defaultHookReturns.navigation,
        cooActiveTab: 'daily-status'
      });

      render(<COOExecutiveDashboard />);

      expect(screen.getByTestId('daily-company-status')).toBeInTheDocument();
      expect(screen.queryByTestId('simplified-metrics-cards')).not.toBeInTheDocument();
    });

    it('should display analytics content when tab is active', () => {
      mockUseNavigationState.mockReturnValue({
        ...defaultHookReturns.navigation,
        cooActiveTab: 'analytics'
      });

      render(<COOExecutiveDashboard />);

      expect(screen.getByTestId('consolidated-analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('simplified-metrics-cards')).not.toBeInTheDocument();
    });

    it('should display sprint planning content when tab is active', () => {
      mockUseNavigationState.mockReturnValue({
        ...defaultHookReturns.navigation,
        cooActiveTab: 'sprint-planning'
      });

      render(<COOExecutiveDashboard />);

      expect(screen.getByTestId('sprint-planning-calendar')).toBeInTheDocument();
      expect(screen.queryByTestId('simplified-metrics-cards')).not.toBeInTheDocument();
    });
  });

  describe('Team Analysis', () => {
    it('should render team capacity cards', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.getByText('Team Capacity Analysis')).toBeInTheDocument();
      
      // Should render cards for each team in dashboard data
      mockDashboardData.teamComparison.forEach(team => {
        expect(screen.getByText(team.teamName)).toBeInTheDocument();
      });
    });

    it('should handle team card clicks with navigation callback', () => {
      const mockOnTeamNavigate = jest.fn();
      render(<COOExecutiveDashboard onTeamNavigate={mockOnTeamNavigate} />);

      const teamCard = screen.getAllByTestId('coo-card')[0];
      fireEvent.click(teamCard);

      expect(mockOnTeamNavigate).toHaveBeenCalledWith({
        id: mockDashboardData.teamComparison[0].teamId,
        name: mockDashboardData.teamComparison[0].teamName
      });
    });

    it('should handle team card clicks without navigation callback', () => {
      render(<COOExecutiveDashboard />);

      const teamCard = screen.getAllByTestId('coo-card')[0];
      fireEvent.click(teamCard);

      expect(defaultHookReturns.navigation.selectTeam).toHaveBeenCalledWith(
        mockDashboardData.teamComparison[0].teamId
      );
      expect(defaultHookReturns.modal.teamDetail.open).toHaveBeenCalledWith(
        mockDashboardData.teamComparison[0].teamId
      );
    });

    it('should show team structure warning for incorrect team count', () => {
      mockUseTeamsState.mockReturnValue({
        ...defaultHookReturns.teams,
        allTeamsWithMembers: mockTeamsWithMembers.slice(0, 3) // Only 3 teams instead of 5
      });

      render(<COOExecutiveDashboard />);

      expect(screen.getByText('Team Structure Warning')).toBeInTheDocument();
      expect(screen.getByText(/Expected 5 operational teams, but found 3/)).toBeInTheDocument();
    });

    it('should not show warning for correct team count', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.queryByText('Team Structure Warning')).not.toBeInTheDocument();
    });
  });

  describe('Optimization Recommendations', () => {
    it('should render optimization recommendations when available', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.getByText('Optimization Recommendations')).toBeInTheDocument();
      mockDashboardData.optimizationRecommendations.forEach(recommendation => {
        expect(screen.getByText(recommendation)).toBeInTheDocument();
      });
    });

    it('should hide recommendations section when none available', () => {
      const dataWithoutRecommendations = {
        ...mockDashboardData,
        optimizationRecommendations: []
      };
      mockUseDashboardState.mockReturnValue({
        cooData: dataWithoutRecommendations,
        setCOODashboardData: jest.fn()
      });

      render(<COOExecutiveDashboard />);

      expect(screen.queryByText('Optimization Recommendations')).not.toBeInTheDocument();
    });
  });

  describe('Capacity Forecast', () => {
    it('should render capacity forecast section', () => {
      render(<COOExecutiveDashboard />);

      expect(screen.getByText('Capacity Forecast')).toBeInTheDocument();
      expect(screen.getByText('Next Week Projection')).toBeInTheDocument();
      expect(screen.getByText('Sprint Outlook')).toBeInTheDocument();
    });
  });

  describe('Team Detail Modal', () => {
    it('should render team detail modal when open', () => {
      mockUseNavigationState.mockReturnValue({
        ...defaultHookReturns.navigation,
        selectedTeamId: 1
      });
      mockUseModalState.mockReturnValue({
        ...defaultHookReturns.modal,
        teamDetail: { isOpen: true, open: jest.fn(), close: jest.fn() }
      });

      render(<COOExecutiveDashboard />);

      expect(screen.getByTestId('team-detail-modal')).toBeInTheDocument();
    });

    it('should close modal and clear selection', () => {
      mockUseNavigationState.mockReturnValue({
        ...defaultHookReturns.navigation,
        selectedTeamId: 1
      });
      mockUseModalState.mockReturnValue({
        ...defaultHookReturns.modal,
        teamDetail: { isOpen: true, open: jest.fn(), close: jest.fn() }
      });

      render(<COOExecutiveDashboard />);

      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);

      expect(defaultHookReturns.modal.teamDetail.close).toHaveBeenCalledTimes(1);
      expect(defaultHookReturns.navigation.selectTeam).toHaveBeenCalledWith(null);
    });
  });

  describe('Error Handling', () => {
    it('should render error display for critical errors', () => {
      const criticalError = {
        userMessage: 'Critical database error',
        severity: ErrorCategory.CRITICAL,
        isRetryable: true
      };
      mockUseErrorBoundary.mockReturnValue({
        ...defaultHookReturns.errorBoundary,
        hasError: true,
        error: criticalError
      });

      render(<COOExecutiveDashboard />);

      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Critical database error');
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should render inline error display for non-critical errors', () => {
      const minorError = {
        userMessage: 'Minor data sync issue',
        severity: ErrorCategory.WARNING,
        isRetryable: true
      };
      mockUseErrorBoundary.mockReturnValue({
        ...defaultHookReturns.errorBoundary,
        hasError: true,
        error: minorError
      });

      render(<COOExecutiveDashboard />);

      const errorDisplay = screen.getByTestId('error-display');
      expect(errorDisplay).toHaveAttribute('data-variant', 'banner');
      expect(screen.getByText('COO Executive Dashboard')).toBeInTheDocument(); // Main content still visible
    });

    it('should handle error retry', async () => {
      const error = {
        userMessage: 'Database connection error',
        isRetryable: true
      };
      mockUseErrorBoundary.mockReturnValue({
        ...defaultHookReturns.errorBoundary,
        hasError: true,
        error,
        retry: jest.fn().mockResolvedValue(undefined)
      });

      render(<COOExecutiveDashboard />);

      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      expect(defaultHookReturns.errorBoundary.retry).toHaveBeenCalledTimes(1);
    });

    it('should show fallback error for missing dashboard data', () => {
      mockUseDashboardState.mockReturnValue({
        cooData: null,
        setCOODashboardData: jest.fn()
      });

      render(<COOExecutiveDashboard />);

      expect(screen.getByText('Error loading COO dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dashboard data unavailable')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should handle refresh button click', async () => {
      const mockRefresh = jest.fn();
      mockUseRefreshUtilities.mockReturnValue({ refreshDashboard: mockRefresh });

      render(<COOExecutiveDashboard />);

      const refreshButton = screen.getByText('Refresh Data');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockDatabaseService.getCOODashboardData).toHaveBeenCalledTimes(2); // Initial + refresh
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable refresh button when loading', () => {
      mockUseLoadingState.mockReturnValue({
        dashboard: true,
        setDashboardLoading: jest.fn()
      });
      mockUseDashboardState.mockReturnValue({
        cooData: mockDashboardData,
        setCOODashboardData: jest.fn()
      });

      render(<COOExecutiveDashboard />);

      const refreshButton = screen.getByText('Refreshing...');
      expect(refreshButton).toBeDisabled();
    });

    it('should hide refresh button on analytics and daily-status tabs', () => {
      mockUseNavigationState.mockReturnValue({
        ...defaultHookReturns.navigation,
        cooActiveTab: 'analytics'
      });

      render(<COOExecutiveDashboard />);

      expect(screen.queryByText('Refresh Data')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<COOExecutiveDashboard />);

      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { name: /COO Executive Dashboard/ })).toBeInTheDocument();
    });

    it('should have accessible navigation buttons', () => {
      render(<COOExecutiveDashboard />);

      const tabButtons = screen.getAllByRole('button').filter(button => 
        ['Dashboard Overview', 'Daily Status', 'Analytics & Insights', 'Sprint Planning'].includes(button.textContent?.trim() || '')
      );
      
      expect(tabButtons).toHaveLength(4);
      tabButtons.forEach(button => {
        expect(button).toBeVisible();
      });
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = performance.now();
      render(<COOExecutiveDashboard />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle large team datasets efficiently', () => {
      const largeTeamData = {
        ...mockDashboardData,
        teamComparison: Array.from({ length: 50 }, (_, i) => ({
          teamId: i + 1,
          teamName: `Team ${i + 1}`,
          maxCapacity: 280,
          weeklyPotential: 245,
          actualHours: 210,
          utilization: 85.7,
          capacityGap: 35,
          capacityStatus: 'optimal' as const,
          memberCount: 8
        }))
      };

      mockUseDashboardState.mockReturnValue({
        cooData: largeTeamData,
        setCOODashboardData: jest.fn()
      });

      const startTime = performance.now();
      render(<COOExecutiveDashboard />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(500); // Should still render efficiently
      expect(screen.getAllByTestId('coo-card')).toHaveLength(50);
    });
  });
});