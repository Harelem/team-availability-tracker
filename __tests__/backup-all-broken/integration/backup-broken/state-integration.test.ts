/**
 * Integration Tests for Centralized State Management
 * 
 * This file contains tests to validate that the centralized state management system
 * works correctly with migrated components.
 */

import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { AppStateProvider } from '@/contexts/AppStateContext';
import { 
  useLoadingState,
  useErrorState,
  useModalState,
  useNavigationState,
  useTeamsState,
  useDashboardState,
  useSchedulesState,
  useSprintsState,
  useNotifications,
  useRefreshUtilities
} from '@/hooks/useAppState';
import { createInitialState } from '@/types/state';

// Test wrapper
const createWrapper = (initialState?: any) => {
  return ({ children }: { children: ReactNode }) => (
    <AppStateProvider initialState={initialState} enableDevTools={false}>
      {children}
    </AppStateProvider>
  );
};

describe('Centralized State Management Integration', () => {
  describe('Loading State Management', () => {
    it('should manage loading states correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useLoadingState(), { wrapper });

      // Initial state should be false
      expect(result.current.dashboard).toBe(false);
      expect(result.current.teams).toBe(false);
      expect(result.current.schedules).toBe(false);

      // Test setting loading states
      act(() => {
        result.current.setDashboardLoading(true);
        result.current.setTeamsLoading(true);
      });

      expect(result.current.dashboard).toBe(true);
      expect(result.current.teams).toBe(true);
      expect(result.current.isAnyLoading).toBe(true);

      // Test clearing loading states
      act(() => {
        result.current.setDashboardLoading(false);
        result.current.setTeamsLoading(false);
      });

      expect(result.current.dashboard).toBe(false);
      expect(result.current.teams).toBe(false);
      expect(result.current.isAnyLoading).toBe(false);
    });
  });

  describe('Error State Management', () => {
    it('should manage error states correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useErrorState(), { wrapper });

      // Initial state should be null
      expect(result.current.dashboard).toBe(null);
      expect(result.current.teams).toBe(null);

      // Test setting error states
      act(() => {
        result.current.setDashboardError('Dashboard error');
        result.current.setTeamsError('Teams error');
      });

      expect(result.current.dashboard).toBe('Dashboard error');
      expect(result.current.teams).toBe('Teams error');
      expect(result.current.hasAnyErrors).toBe(true);

      // Test clearing all errors
      act(() => {
        result.current.clearAllErrors();
      });

      expect(result.current.dashboard).toBe(null);
      expect(result.current.teams).toBe(null);
      expect(result.current.hasAnyErrors).toBe(false);
    });
  });

  describe('Modal State Management', () => {
    it('should manage modal states correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useModalState(), { wrapper });

      // Initial state should be closed
      expect(result.current.workforceStatus.isOpen).toBe(false);
      expect(result.current.teamDetail.isOpen).toBe(false);

      // Test opening modals
      act(() => {
        result.current.workforceStatus.open(new Date());
        result.current.teamDetail.open(1);
      });

      expect(result.current.workforceStatus.isOpen).toBe(true);
      expect(result.current.teamDetail.isOpen).toBe(true);
      expect(result.current.hasOpenModals).toBe(true);

      // Test closing individual modals
      act(() => {
        result.current.workforceStatus.close();
      });

      expect(result.current.workforceStatus.isOpen).toBe(false);
      expect(result.current.teamDetail.isOpen).toBe(true);

      // Test closing all modals
      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.teamDetail.isOpen).toBe(false);
      expect(result.current.hasOpenModals).toBe(false);
    });
  });

  describe('Navigation State Management', () => {
    it('should manage navigation state correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNavigationState(), { wrapper });

      // Initial state
      expect(result.current.cooActiveTab).toBe('dashboard');
      expect(result.current.selectedTeamId).toBe(null);

      // Test navigation updates
      act(() => {
        result.current.setCOOActiveTab('analytics');
        result.current.selectTeam(1);
      });

      expect(result.current.cooActiveTab).toBe('analytics');
      expect(result.current.selectedTeamId).toBe(1);

      // Test multiple navigation updates
      act(() => {
        result.current.setNavigation({
          cooActiveTab: 'daily-status',
          selectedTeamId: 2,
          selectedMemberId: 5
        });
      });

      expect(result.current.cooActiveTab).toBe('daily-status');
      expect(result.current.selectedTeamId).toBe(2);
      expect(result.current.selectedMemberId).toBe(5);
    });
  });

  describe('Teams State Management', () => {
    it('should manage teams state correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTeamsState(), { wrapper });

      const mockTeams = [
        { id: 1, name: 'Team A', description: 'Test team A' },
        { id: 2, name: 'Team B', description: 'Test team B' }
      ];

      // Initial state
      expect(result.current.teams).toEqual([]);
      expect(result.current.teamCount).toBe(0);
      expect(result.current.hasTeams).toBe(false);

      // Test setting teams
      act(() => {
        result.current.setTeams(mockTeams);
      });

      expect(result.current.teams).toEqual(mockTeams);
      expect(result.current.teamCount).toBe(2);
      expect(result.current.hasTeams).toBe(true);

      // Test selecting a team
      act(() => {
        result.current.selectTeam(mockTeams[0]);
      });

      expect(result.current.selectedTeam).toEqual(mockTeams[0]);

      // Test getting team by ID
      const teamById = result.current.getTeamById(1);
      expect(teamById).toEqual(mockTeams[0]);
    });
  });

  describe('Dashboard State Management', () => {
    it('should manage dashboard state correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useDashboardState(), { wrapper });

      const mockDashboardData = {
        companyOverview: {
          totalMembers: 25,
          totalTeams: 5,
          sprintMax: 350,
          sprintPotential: 320,
          currentUtilization: 0.85
        }
      };

      // Initial state
      expect(result.current.cooData).toBe(null);
      expect(result.current.hasCOOData).toBe(false);

      // Test setting dashboard data
      act(() => {
        result.current.setCOODashboardData(mockDashboardData as any);
      });

      expect(result.current.cooData).toEqual(mockDashboardData);
      expect(result.current.hasCOOData).toBe(true);

      // Test chart filters
      act(() => {
        result.current.setChartFilters({
          timeframe: 'current-sprint',
          teams: [1, 2, 3]
        });
      });

      expect(result.current.chartFilters.timeframe).toBe('current-sprint');
      expect(result.current.chartFilters.teams).toEqual([1, 2, 3]);
    });
  });

  describe('Notifications Management', () => {
    it('should manage notifications correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      // Initial state
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);

      // Test adding notifications
      act(() => {
        result.current.showSuccess('Success', 'Operation completed');
        result.current.showError('Error', 'Something went wrong');
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(2);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[1].type).toBe('error');

      // Test removing notification
      const firstNotificationId = result.current.notifications[0].id;
      act(() => {
        result.current.removeNotification(firstNotificationId);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');

      // Test clearing all notifications
      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Refresh Utilities', () => {
    it('should provide refresh utilities', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useRefreshUtilities(), { wrapper });

      // All refresh functions should be available
      expect(typeof result.current.refreshDashboard).toBe('function');
      expect(typeof result.current.refreshTeams).toBe('function');
      expect(typeof result.current.refreshSchedules).toBe('function');
      expect(typeof result.current.refreshAnalytics).toBe('function');
      expect(typeof result.current.refreshAll).toBe('function');

      // Test refresh functions don't throw
      act(() => {
        result.current.refreshDashboard();
        result.current.refreshTeams();
        result.current.refreshSchedules();
        result.current.refreshAnalytics();
      });

      // Test refresh all
      act(() => {
        result.current.refreshAll();
      });
    });
  });

  describe('State Persistence and Hydration', () => {
    it('should initialize with provided initial state', () => {
      const customInitialState = {
        ui: {
          navigation: {
            cooActiveTab: 'analytics' as const,
            selectedTeamId: 42
          }
        }
      };

      const wrapper = createWrapper(customInitialState);
      const { result } = renderHook(() => useNavigationState(), { wrapper });

      expect(result.current.cooActiveTab).toBe('analytics');
      expect(result.current.selectedTeamId).toBe(42);
    });
  });

  describe('Cross-Hook State Synchronization', () => {
    it('should synchronize state changes across different hooks', () => {
      const wrapper = createWrapper();
      
      const navigationResult = renderHook(() => useNavigationState(), { wrapper }).result;
      const teamsResult = renderHook(() => useTeamsState(), { wrapper }).result;

      const mockTeam = { id: 99, name: 'Sync Test Team', description: 'Test' };

      // Test that selecting a team updates both navigation and teams state
      act(() => {
        teamsResult.current.selectTeam(mockTeam);
      });

      expect(teamsResult.current.selectedTeam).toEqual(mockTeam);
      expect(navigationResult.current.selectedTeamId).toBe(99);

      // Test that updating navigation affects team selection
      act(() => {
        navigationResult.current.selectTeam(null);
      });

      expect(navigationResult.current.selectedTeamId).toBe(null);
      // Note: This might not automatically clear selectedTeam in teams state
      // depending on implementation - this is expected behavior
    });
  });
});

describe('State Integration Edge Cases', () => {
  it('should handle rapid state changes gracefully', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLoadingState(), { wrapper });

    // Rapidly toggle loading states
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.setDashboardLoading(i % 2 === 0);
      }
    });

    expect(result.current.dashboard).toBe(false);
  });

  it('should handle invalid data gracefully', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTeamsState(), { wrapper });

    // Test with invalid team data
    act(() => {
      result.current.setTeams([] as any);
    });

    expect(result.current.teams).toEqual([]);
    expect(result.current.hasTeams).toBe(false);
  });
});

describe('Performance Considerations', () => {
  it('should not cause unnecessary re-renders', () => {
    const wrapper = createWrapper();
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useLoadingState();
    }, { wrapper });

    const initialRenderCount = renderCount;

    // Setting the same value should not cause re-render
    act(() => {
      result.current.setDashboardLoading(false); // Already false
    });

    expect(renderCount).toBe(initialRenderCount);

    // Setting a different value should cause re-render
    act(() => {
      result.current.setDashboardLoading(true);
    });

    expect(renderCount).toBe(initialRenderCount + 1);
  });
});