/**
 * Primary App State Hooks
 * 
 * This file provides the main useAppState hook and specialized hooks for different
 * parts of the application state. These hooks offer a clean API for components.
 */

import { useCallback, useMemo } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import { 
  Team, 
  TeamMember, 
  COODashboardData, 
  CurrentGlobalSprint,
  WeekData,
  DailyCompanyStatusData,
  COOUser
} from '@/types';
import { 
  LoadingState, 
  ErrorState, 
  ModalState, 
  NavigationState,
  NotificationState
} from '@/types/state';

// =============================================================================
// PRIMARY HOOK
// =============================================================================

export { useAppState } from '@/contexts/AppStateContext';

// =============================================================================
// LOADING STATE HOOKS
// =============================================================================

export function useLoadingState() {
  const { state, actions } = useAppState();

  return {
    // Current loading states
    ...state.ui.loading,
    
    // Computed loading states
    isAnyLoading: Object.values(state.ui.loading).some(Boolean),
    
    // Actions
    setLoading: actions.setLoading,
    
    // Convenience methods
    setGlobalLoading: useCallback((loading: boolean) => 
      actions.setLoading('global', loading), [actions]),
    setDashboardLoading: useCallback((loading: boolean) => 
      actions.setLoading('dashboard', loading), [actions]),
    setTeamsLoading: useCallback((loading: boolean) => 
      actions.setLoading('teams', loading), [actions]),
    setMembersLoading: useCallback((loading: boolean) => 
      actions.setLoading('members', loading), [actions]),
    setSchedulesLoading: useCallback((loading: boolean) => 
      actions.setLoading('schedules', loading), [actions]),
    setSprintsLoading: useCallback((loading: boolean) => 
      actions.setLoading('sprints', loading), [actions]),
    setAnalyticsLoading: useCallback((loading: boolean) => 
      actions.setLoading('analytics', loading), [actions]),
    setExportsLoading: useCallback((loading: boolean) => 
      actions.setLoading('exports', loading), [actions])
  };
}

// =============================================================================
// ERROR STATE HOOKS
// =============================================================================

export function useErrorState() {
  const { state, actions, dispatch } = useAppState();

  return {
    // Current error states
    ...state.ui.errors,
    
    // Computed error states
    hasAnyErrors: Object.values(state.ui.errors).some(error => error !== null),
    getActiveErrors: () => Object.entries(state.ui.errors)
      .filter(([, error]) => error !== null)
      .reduce((acc, [key, error]) => ({ ...acc, [key]: error }), {}),
    
    // Actions
    setError: actions.setError,
    clearAllErrors: useCallback(() => 
      dispatch({ type: 'CLEAR_ALL_ERRORS' }), [dispatch]),
    
    // Convenience methods
    setGlobalError: useCallback((error: string | null) => 
      actions.setError('global', error), [actions]),
    setDashboardError: useCallback((error: string | null) => 
      actions.setError('dashboard', error), [actions]),
    setTeamsError: useCallback((error: string | null) => 
      actions.setError('teams', error), [actions]),
    setMembersError: useCallback((error: string | null) => 
      actions.setError('members', error), [actions]),
    setSchedulesError: useCallback((error: string | null) => 
      actions.setError('schedules', error), [actions]),
    setSprintsError: useCallback((error: string | null) => 
      actions.setError('sprints', error), [actions]),
    setAnalyticsError: useCallback((error: string | null) => 
      actions.setError('analytics', error), [actions]),
    setExportsError: useCallback((error: string | null) => 
      actions.setError('exports', error), [actions])
  };
}

// =============================================================================
// MODAL STATE HOOKS
// =============================================================================

export function useModalState() {
  const { state, actions, dispatch } = useAppState();

  return {
    // Current modal states
    modals: state.ui.modals,
    
    // Computed modal states
    getOpenModals: () => Object.entries(state.ui.modals)
      .filter(([, modal]) => modal.isOpen)
      .map(([name]) => name),
    hasOpenModals: Object.values(state.ui.modals).some(modal => modal.isOpen),
    
    // Actions
    openModal: actions.openModal,
    closeModal: actions.closeModal,
    closeAllModals: useCallback(() => 
      dispatch({ type: 'CLOSE_ALL_MODALS' }), [dispatch]),
    
    // Convenience methods for specific modals
    workforceStatus: {
      isOpen: state.ui.modals.workforceStatus.isOpen,
      open: useCallback((selectedDate?: Date) => 
        actions.openModal('workforceStatus', { selectedDate }), [actions]),
      close: useCallback(() => 
        actions.closeModal('workforceStatus'), [actions])
    },
    
    sprintPotential: {
      isOpen: state.ui.modals.sprintPotential.isOpen,
      open: useCallback((dashboardData?: COODashboardData) => 
        actions.openModal('sprintPotential', { dashboardData }), [actions]),
      close: useCallback(() => 
        actions.closeModal('sprintPotential'), [actions])
    },
    
    teamDetail: {
      isOpen: state.ui.modals.teamDetail.isOpen,
      open: useCallback((teamId: number) => 
        actions.openModal('teamDetail', { teamId }), [actions]),
      close: useCallback(() => 
        actions.closeModal('teamDetail'), [actions])
    },
    
    reasonDialog: {
      isOpen: state.ui.modals.reasonDialog.isOpen,
      open: useCallback((data: { memberId: number; date: Date; value: '0.5' | 'X' }) => 
        actions.openModal('reasonDialog', { data }), [actions]),
      close: useCallback(() => 
        actions.closeModal('reasonDialog'), [actions])
    },
    
    memberForm: {
      isOpen: state.ui.modals.memberForm.isOpen,
      open: useCallback((member?: TeamMember, mode: 'create' | 'edit' = 'create') => 
        actions.openModal('memberForm', { member, mode }), [actions]),
      close: useCallback(() => 
        actions.closeModal('memberForm'), [actions])
    },
    
    exportModal: {
      isOpen: state.ui.modals.exportModal.isOpen,
      open: useCallback((type?: 'standard' | 'custom' | 'analytics') => 
        actions.openModal('exportModal', { type }), [actions]),
      close: useCallback(() => 
        actions.closeModal('exportModal'), [actions])
    }
  };
}

// =============================================================================
// NOTIFICATION HOOKS
// =============================================================================

export function useNotifications() {
  const { state, actions, dispatch } = useAppState();

  return {
    // Current notifications
    notifications: state.ui.notifications.items,
    unreadCount: state.ui.notifications.unreadCount,
    
    // Actions
    addNotification: actions.addNotification,
    removeNotification: useCallback((id: string) => 
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: { id } }), [dispatch]),
    clearNotifications: useCallback(() => 
      dispatch({ type: 'CLEAR_NOTIFICATIONS' }), [dispatch]),
    
    // Convenience methods
    showSuccess: useCallback((title: string, message: string, duration?: number) => 
      actions.addNotification({ type: 'success', title, message, duration }), [actions]),
    showError: useCallback((title: string, message: string, duration?: number) => 
      actions.addNotification({ type: 'error', title, message, duration }), [actions]),
    showWarning: useCallback((title: string, message: string, duration?: number) => 
      actions.addNotification({ type: 'warning', title, message, duration }), [actions]),
    showInfo: useCallback((title: string, message: string, duration?: number) => 
      actions.addNotification({ type: 'info', title, message, duration }), [actions])
  };
}

// =============================================================================
// NAVIGATION HOOKS
// =============================================================================

export function useNavigationState() {
  const { state, dispatch } = useAppState();

  return {
    // Current navigation state
    ...state.ui.navigation,
    
    // Actions
    setNavigation: useCallback((updates: Partial<NavigationState>) => 
      dispatch({ type: 'SET_NAVIGATION', payload: updates }), [dispatch]),
    
    // Convenience methods
    setCOOActiveTab: useCallback((tab: NavigationState['cooActiveTab']) => 
      dispatch({ type: 'SET_NAVIGATION', payload: { cooActiveTab: tab } }), [dispatch]),
    setAnalyticsActiveSection: useCallback((section: NavigationState['analyticsActiveSection']) => 
      dispatch({ type: 'SET_NAVIGATION', payload: { analyticsActiveSection: section } }), [dispatch]),
    selectTeam: useCallback((teamId: number | null) => 
      dispatch({ type: 'SET_NAVIGATION', payload: { selectedTeamId: teamId } }), [dispatch]),
    selectMember: useCallback((memberId: number | null) => 
      dispatch({ type: 'SET_NAVIGATION', payload: { selectedMemberId: memberId } }), [dispatch]),
    selectSprint: useCallback((sprintId: number | null) => 
      dispatch({ type: 'SET_NAVIGATION', payload: { selectedSprintId: sprintId } }), [dispatch])
  };
}

// =============================================================================
// TEAMS STATE HOOKS
// =============================================================================

export function useTeamsState() {
  const { state, dispatch, selectors } = useAppState();

  return {
    // Current teams data
    teams: state.data.teams.items,
    allTeamsWithMembers: state.data.teams.allTeamsWithMembers,
    selectedTeam: state.data.teams.selectedTeam,
    teamStats: state.data.teams.stats,
    lastFetch: state.data.teams.lastFetch,
    
    // Computed data
    teamCount: state.data.teams.items.length,
    hasTeams: state.data.teams.items.length > 0,
    
    // Actions
    setTeams: useCallback((teams: Team[]) => 
      dispatch({ type: 'SET_TEAMS', payload: { teams } }), [dispatch]),
    setAllTeamsWithMembers: useCallback((teams: (Team & { team_members?: TeamMember[] })[]) => 
      dispatch({ type: 'SET_ALL_TEAMS_WITH_MEMBERS', payload: { teams } }), [dispatch]),
    selectTeam: useCallback((team: Team | null) => 
      dispatch({ type: 'SELECT_TEAM', payload: { team } }), [dispatch]),
    updateTeam: useCallback((team: Team) => 
      dispatch({ type: 'UPDATE_TEAM', payload: { team } }), [dispatch]),
    deleteTeam: useCallback((teamId: number) => 
      dispatch({ type: 'DELETE_TEAM', payload: { teamId } }), [dispatch]),
    
    // Selectors
    getTeamById: useCallback((teamId: number) => 
      state.data.teams.items.find(team => team.id === teamId), [state.data.teams.items]),
    getTeamWithMembersById: useCallback((teamId: number) => 
      state.data.teams.allTeamsWithMembers.find(team => team.id === teamId), [state.data.teams.allTeamsWithMembers]),
    getTeamUtilization: selectors.getTeamUtilization
  };
}

// =============================================================================
// MEMBERS STATE HOOKS
// =============================================================================

export function useMembersState() {
  const { state, dispatch, selectors } = useAppState();

  return {
    // Current members data
    members: state.data.members.items,
    membersByTeam: state.data.members.byTeamId,
    selectedMember: state.data.members.selectedMember,
    hoursStatus: state.data.members.hoursStatus,
    lastFetch: state.data.members.lastFetch,
    
    // Computed data
    memberCount: state.data.members.items.length,
    hasMembers: state.data.members.items.length > 0,
    
    // Actions
    setMembers: useCallback((members: TeamMember[]) => 
      dispatch({ type: 'SET_MEMBERS', payload: { members } }), [dispatch]),
    setMembersByTeam: useCallback((teamId: number, members: TeamMember[]) => 
      dispatch({ type: 'SET_MEMBERS_BY_TEAM', payload: { teamId, members } }), [dispatch]),
    selectMember: useCallback((member: TeamMember | null) => 
      dispatch({ type: 'SELECT_MEMBER', payload: { member } }), [dispatch]),
    updateMember: useCallback((member: TeamMember) => 
      dispatch({ type: 'UPDATE_MEMBER', payload: { member } }), [dispatch]),
    deleteMember: useCallback((memberId: number) => 
      dispatch({ type: 'DELETE_MEMBER', payload: { memberId } }), [dispatch]),
    
    // Selectors
    getMemberById: useCallback((memberId: number) => 
      state.data.members.items.find(member => member.id === memberId), [state.data.members.items]),
    getTeamMembers: selectors.getTeamMembers,
    getMemberHours: useCallback((memberId: number) => 
      state.data.schedules.totalHours.byMember[memberId] || 0, [state.data.schedules.totalHours.byMember])
  };
}

// =============================================================================
// SPRINTS STATE HOOKS
// =============================================================================

export function useSprintsState() {
  const { state, dispatch, selectors } = useAppState();

  return {
    // Current sprints data
    currentSprint: state.data.sprints.currentSprint,
    teamStats: state.data.sprints.teamStats,
    history: state.data.sprints.history,
    settings: state.data.sprints.settings,
    lastFetch: state.data.sprints.lastFetch,
    
    // Computed data
    hasActiveSprint: state.data.sprints.currentSprint !== null,
    sprintDaysRemaining: state.data.sprints.currentSprint?.days_remaining || 0,
    sprintProgress: state.data.sprints.currentSprint?.progress_percentage || 0,
    
    // Actions
    setCurrentSprint: useCallback((sprint: CurrentGlobalSprint | null) => 
      dispatch({ type: 'SET_CURRENT_SPRINT', payload: { sprint } }), [dispatch]),
    setTeamSprintStats: useCallback((stats: any) => 
      dispatch({ type: 'SET_TEAM_SPRINT_STATS', payload: { stats } }), [dispatch]),
    updateSprintSettings: useCallback((settings: Partial<typeof state.data.sprints.settings>) => 
      dispatch({ type: 'UPDATE_SPRINT_SETTINGS', payload: { settings } }), [dispatch]),
    
    // Selectors
    getCurrentSprint: selectors.getCurrentSprint
  };
}

// =============================================================================
// SCHEDULES STATE HOOKS
// =============================================================================

export function useSchedulesState() {
  const { state, dispatch, selectors } = useAppState();

  return {
    // Current schedules data
    scheduleData: state.data.schedules.data,
    currentWeekDates: state.data.schedules.currentWeekDates,
    weekDays: state.data.schedules.weekDays,
    totalHours: state.data.schedules.totalHours,
    reasonEntries: state.data.schedules.reasonEntries,
    lastFetch: state.data.schedules.lastFetch,
    
    // Computed data
    hasScheduleData: Object.keys(state.data.schedules.data).length > 0,
    totalWeeklyHours: state.data.schedules.totalHours.total,
    
    // Actions
    setScheduleData: useCallback((data: WeekData) => 
      dispatch({ type: 'SET_SCHEDULE_DATA', payload: { data } }), [dispatch]),
    updateScheduleEntry: useCallback((memberId: number, date: Date, value: string | null, reason?: string) => 
      dispatch({ type: 'UPDATE_SCHEDULE_ENTRY', payload: { memberId, date, value, reason } }), [dispatch]),
    setCurrentWeekDates: useCallback((dates: Date[]) => 
      dispatch({ type: 'SET_CURRENT_WEEK_DATES', payload: { dates } }), [dispatch]),
    setTotalHours: useCallback((totalHours: typeof state.data.schedules.totalHours) => 
      dispatch({ type: 'SET_TOTAL_HOURS', payload: { totalHours } }), [dispatch]),
    
    // Selectors
    getScheduleData: selectors.getScheduleData,
    getWeeklyHours: selectors.getWeeklyHours
  };
}

// =============================================================================
// DASHBOARD STATE HOOKS
// =============================================================================

export function useDashboardState() {
  const { state, dispatch, selectors } = useAppState();

  return {
    // Current dashboard data
    cooData: state.data.dashboards.cooData,
    teamData: state.data.dashboards.teamData,
    dailyCompanyStatus: state.data.dashboards.dailyCompanyStatus,
    dailyStatusDate: state.data.dashboards.dailyStatusDate,
    chartFilters: state.data.dashboards.chartFilters,
    performanceData: state.data.dashboards.performanceData,
    lastFetch: state.data.dashboards.lastFetch,
    
    // Computed data
    hasCOOData: state.data.dashboards.cooData !== null,
    hasDailyStatus: state.data.dashboards.dailyCompanyStatus !== null,
    
    // Actions
    setCOODashboardData: useCallback((data: COODashboardData | null) => 
      dispatch({ type: 'SET_COO_DASHBOARD_DATA', payload: { data } }), [dispatch]),
    setDailyCompanyStatus: useCallback((data: DailyCompanyStatusData | null, date: Date) => 
      dispatch({ type: 'SET_DAILY_COMPANY_STATUS', payload: { data, date } }), [dispatch]),
    setChartFilters: useCallback((filters: Partial<typeof state.data.dashboards.chartFilters>) => 
      dispatch({ type: 'SET_CHART_FILTERS', payload: { filters } }), [dispatch]),
    
    // Selectors
    getCOODashboardData: selectors.getCOODashboardData
  };
}

// =============================================================================
// USER STATE HOOKS
// =============================================================================

export function useUserState() {
  const { state, dispatch, selectors } = useAppState();

  return {
    // Current user data
    currentUser: state.user.currentUser,
    userType: state.user.userType,
    permissions: state.user.permissions,
    preferences: state.user.preferences,
    session: state.user.session,
    
    // Computed data
    isLoggedIn: state.user.currentUser !== null,
    isCOO: state.user.userType === 'coo',
    isManager: state.user.userType === 'manager',
    isMember: state.user.userType === 'member',
    
    // Actions
    setCurrentUser: useCallback((user: COOUser | TeamMember | null) => 
      dispatch({ type: 'SET_CURRENT_USER', payload: { user } }), [dispatch]),
    updateUserPreferences: useCallback((preferences: Partial<typeof state.user.preferences>) => 
      dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: { preferences } }), [dispatch]),
    updatePermissions: useCallback((permissions: Partial<typeof state.user.permissions>) => 
      dispatch({ type: 'UPDATE_PERMISSIONS', payload: { permissions } }), [dispatch]),
    
    // Selectors
    getCurrentUser: selectors.getCurrentUser,
    getUserType: selectors.getUserType,
    hasPermission: selectors.hasPermission
  };
}

// =============================================================================
// CACHE STATE HOOKS
// =============================================================================

export function useCacheState() {
  const { state, dispatch } = useAppState();

  return {
    // Current cache data
    timestamps: state.cache.timestamps,
    invalidation: state.cache.invalidation,
    policies: state.cache.policies,
    
    // Computed data
    getCacheAge: useCallback((key: keyof typeof state.cache.timestamps) => {
      const timestamp = state.cache.timestamps[key];
      return timestamp ? Date.now() - timestamp.getTime() : null;
    }, [state.cache.timestamps]),
    
    isCacheValid: useCallback((key: keyof typeof state.cache.timestamps) => {
      const timestamp = state.cache.timestamps[key];
      const policy = state.cache.policies[key];
      if (!timestamp || !policy) return false;
      
      const age = Date.now() - timestamp.getTime();
      return age < policy.ttl && !state.cache.invalidation[key];
    }, [state.cache.timestamps, state.cache.policies, state.cache.invalidation]),
    
    // Actions
    updateCacheTimestamp: useCallback((key: keyof typeof state.cache.timestamps, timestamp: Date) => 
      dispatch({ type: 'UPDATE_CACHE_TIMESTAMP', payload: { key, timestamp } }), [dispatch]),
    invalidateCache: useCallback((key: keyof typeof state.cache.invalidation) => 
      dispatch({ type: 'INVALIDATE_CACHE', payload: { key } }), [dispatch]),
    clearAllCache: useCallback(() => 
      dispatch({ type: 'CLEAR_ALL_CACHE' }), [dispatch])
  };
}

// =============================================================================
// REFRESH UTILITIES
// =============================================================================

export function useRefreshUtilities() {
  const { actions } = useAppState();

  return {
    refreshDashboard: useCallback(() => actions.refreshData('dashboard'), [actions]),
    refreshTeams: useCallback(() => actions.refreshData('teams'), [actions]),
    refreshSchedules: useCallback(() => actions.refreshData('schedules'), [actions]),
    refreshAnalytics: useCallback(() => actions.refreshData('analytics'), [actions]),
    refreshAll: useCallback(() => {
      actions.refreshData('dashboard');
      actions.refreshData('teams');
      actions.refreshData('schedules');
      actions.refreshData('analytics');
    }, [actions])
  };
}