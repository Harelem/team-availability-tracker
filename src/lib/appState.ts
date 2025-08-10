/**
 * Centralized App State Management
 * 
 * This file implements the core state management system with reducer, actions, and selectors.
 * It replaces scattered useState calls with a unified, typed state structure.
 */

import { useReducer, useCallback } from 'react';
import { 
  AppState, 
  AppAction, 
  AppSelectors,
  createInitialState,
  LoadingState,
  ErrorState,
  ModalState,
  NotificationState,
  NavigationState,
  UIState
} from '@/types/state';
import { AppError } from '@/types/errors';

// =============================================================================
// STATE REDUCER
// =============================================================================

export function appStateReducer(state: AppState, action: AppAction): AppState {
  // Track state changes for debugging
  const newState = (() => {
    switch (action.type) {
      // =============================================================================
      // UI ACTIONS
      // =============================================================================
      
      case 'SET_LOADING':
        return {
          ...state,
          ui: {
            ...state.ui,
            loading: {
              ...state.ui.loading,
              [action.payload.key]: action.payload.value
            }
          }
        };

      case 'SET_ERROR':
        return {
          ...state,
          ui: {
            ...state.ui,
            errors: {
              ...state.ui.errors,
              [action.payload.key]: action.payload.value
            }
          }
        };

      case 'CLEAR_ALL_ERRORS':
        return {
          ...state,
          ui: {
            ...state.ui,
            errors: Object.keys(state.ui.errors).reduce((acc, key) => ({
              ...acc,
              [key]: null
            }), {} as ErrorState)
          }
        };

      case 'OPEN_MODAL':
        return {
          ...state,
          ui: {
            ...state.ui,
            modals: {
              ...state.ui.modals,
              [action.payload.modal]: {
                isOpen: true,
                ...action.payload.props
              }
            }
          }
        };

      case 'CLOSE_MODAL':
        return {
          ...state,
          ui: {
            ...state.ui,
            modals: {
              ...state.ui.modals,
              [action.payload.modal]: {
                ...state.ui.modals[action.payload.modal],
                isOpen: false
              }
            }
          }
        };

      case 'CLOSE_ALL_MODALS':
        return {
          ...state,
          ui: {
            ...state.ui,
            modals: Object.keys(state.ui.modals).reduce((acc, key) => ({
              ...acc,
              [key]: {
                ...state.ui.modals[key as keyof ModalState],
                isOpen: false
              }
            }), {} as ModalState)
          }
        };

      case 'ADD_NOTIFICATION':
        const newNotification = {
          ...action.payload,
          id: action.payload.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        };
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: {
              items: [...state.ui.notifications.items, newNotification],
              unreadCount: state.ui.notifications.unreadCount + 1
            }
          }
        };

      case 'REMOVE_NOTIFICATION':
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: {
              ...state.ui.notifications,
              items: state.ui.notifications.items.filter(item => item.id !== action.payload.id)
            }
          }
        };

      case 'CLEAR_NOTIFICATIONS':
        return {
          ...state,
          ui: {
            ...state.ui,
            notifications: {
              items: [],
              unreadCount: 0
            }
          }
        };

      case 'SET_NAVIGATION':
        return {
          ...state,
          ui: {
            ...state.ui,
            navigation: {
              ...state.ui.navigation,
              ...action.payload
            }
          }
        };

      case 'INCREMENT_REFRESH_KEY':
        return {
          ...state,
          ui: {
            ...state.ui,
            refreshKeys: {
              ...state.ui.refreshKeys,
              [action.payload.key]: state.ui.refreshKeys[action.payload.key] + 1
            }
          }
        };

      // =============================================================================
      // DATA ACTIONS - TEAMS
      // =============================================================================
      
      case 'SET_TEAMS':
        return {
          ...state,
          data: {
            ...state.data,
            teams: {
              ...state.data.teams,
              items: action.payload.teams,
              lastFetch: new Date()
            }
          }
        };

      case 'SET_ALL_TEAMS_WITH_MEMBERS':
        return {
          ...state,
          data: {
            ...state.data,
            teams: {
              ...state.data.teams,
              allTeamsWithMembers: action.payload.teams,
              lastFetch: new Date()
            }
          }
        };

      case 'SELECT_TEAM':
        return {
          ...state,
          data: {
            ...state.data,
            teams: {
              ...state.data.teams,
              selectedTeam: action.payload.team
            }
          },
          ui: {
            ...state.ui,
            navigation: {
              ...state.ui.navigation,
              selectedTeamId: action.payload.team?.id || null
            }
          }
        };

      case 'UPDATE_TEAM':
        return {
          ...state,
          data: {
            ...state.data,
            teams: {
              ...state.data.teams,
              items: state.data.teams.items.map(team => 
                team.id === action.payload.team.id ? action.payload.team : team
              ),
              allTeamsWithMembers: state.data.teams.allTeamsWithMembers.map(team => 
                team.id === action.payload.team.id ? { ...team, ...action.payload.team } : team
              )
            }
          }
        };

      case 'DELETE_TEAM':
        return {
          ...state,
          data: {
            ...state.data,
            teams: {
              ...state.data.teams,
              items: state.data.teams.items.filter(team => team.id !== action.payload.teamId),
              allTeamsWithMembers: state.data.teams.allTeamsWithMembers.filter(team => team.id !== action.payload.teamId),
              selectedTeam: state.data.teams.selectedTeam?.id === action.payload.teamId ? null : state.data.teams.selectedTeam
            }
          }
        };

      // =============================================================================
      // DATA ACTIONS - MEMBERS
      // =============================================================================
      
      case 'SET_MEMBERS':
        return {
          ...state,
          data: {
            ...state.data,
            members: {
              ...state.data.members,
              items: action.payload.members,
              lastFetch: new Date()
            }
          }
        };

      case 'SET_MEMBERS_BY_TEAM':
        return {
          ...state,
          data: {
            ...state.data,
            members: {
              ...state.data.members,
              byTeamId: {
                ...state.data.members.byTeamId,
                [action.payload.teamId]: action.payload.members
              },
              lastFetch: new Date()
            }
          }
        };

      case 'SELECT_MEMBER':
        return {
          ...state,
          data: {
            ...state.data,
            members: {
              ...state.data.members,
              selectedMember: action.payload.member
            }
          },
          ui: {
            ...state.ui,
            navigation: {
              ...state.ui.navigation,
              selectedMemberId: action.payload.member?.id || null
            }
          }
        };

      case 'UPDATE_MEMBER':
        return {
          ...state,
          data: {
            ...state.data,
            members: {
              ...state.data.members,
              items: state.data.members.items.map(member => 
                member.id === action.payload.member.id ? action.payload.member : member
              ),
              byTeamId: Object.keys(state.data.members.byTeamId).reduce((acc, teamId) => ({
                ...acc,
                [teamId]: state.data.members.byTeamId[parseInt(teamId)].map(member =>
                  member.id === action.payload.member.id ? action.payload.member : member
                )
              }), {})
            }
          }
        };

      case 'DELETE_MEMBER':
        return {
          ...state,
          data: {
            ...state.data,
            members: {
              ...state.data.members,
              items: state.data.members.items.filter(member => member.id !== action.payload.memberId),
              byTeamId: Object.keys(state.data.members.byTeamId).reduce((acc, teamId) => ({
                ...acc,
                [teamId]: state.data.members.byTeamId[parseInt(teamId)].filter(member => member.id !== action.payload.memberId)
              }), {}),
              selectedMember: state.data.members.selectedMember?.id === action.payload.memberId ? null : state.data.members.selectedMember
            }
          }
        };

      // =============================================================================
      // DATA ACTIONS - SPRINTS
      // =============================================================================
      
      case 'SET_CURRENT_SPRINT':
        return {
          ...state,
          data: {
            ...state.data,
            sprints: {
              ...state.data.sprints,
              currentSprint: action.payload.sprint,
              lastFetch: new Date()
            }
          }
        };

      case 'SET_TEAM_SPRINT_STATS':
        return {
          ...state,
          data: {
            ...state.data,
            sprints: {
              ...state.data.sprints,
              teamStats: action.payload.stats,
              lastFetch: new Date()
            }
          }
        };

      case 'UPDATE_SPRINT_SETTINGS':
        return {
          ...state,
          data: {
            ...state.data,
            sprints: {
              ...state.data.sprints,
              settings: {
                ...state.data.sprints.settings,
                ...action.payload.settings
              }
            }
          }
        };

      // =============================================================================
      // DATA ACTIONS - SCHEDULES
      // =============================================================================
      
      case 'SET_SCHEDULE_DATA':
        return {
          ...state,
          data: {
            ...state.data,
            schedules: {
              ...state.data.schedules,
              data: action.payload.data,
              lastFetch: new Date()
            }
          }
        };

      case 'UPDATE_SCHEDULE_ENTRY':
        // This is a complex update that would need to modify the WeekData structure
        // For now, we'll trigger a refresh by incrementing the refresh key
        return {
          ...state,
          ui: {
            ...state.ui,
            refreshKeys: {
              ...state.ui.refreshKeys,
              schedules: state.ui.refreshKeys.schedules + 1
            }
          }
        };

      case 'SET_CURRENT_WEEK_DATES':
        return {
          ...state,
          data: {
            ...state.data,
            schedules: {
              ...state.data.schedules,
              currentWeekDates: action.payload.dates,
              weekDays: action.payload.dates
            }
          }
        };

      case 'SET_TOTAL_HOURS':
        return {
          ...state,
          data: {
            ...state.data,
            schedules: {
              ...state.data.schedules,
              totalHours: action.payload.totalHours
            }
          }
        };

      // =============================================================================
      // DATA ACTIONS - DASHBOARDS
      // =============================================================================
      
      case 'SET_COO_DASHBOARD_DATA':
        return {
          ...state,
          data: {
            ...state.data,
            dashboards: {
              ...state.data.dashboards,
              cooData: action.payload.data,
              lastFetch: new Date()
            }
          }
        };

      case 'SET_DAILY_COMPANY_STATUS':
        return {
          ...state,
          data: {
            ...state.data,
            dashboards: {
              ...state.data.dashboards,
              dailyCompanyStatus: action.payload.data,
              dailyStatusDate: action.payload.date,
              lastFetch: new Date()
            }
          }
        };

      case 'SET_CHART_FILTERS':
        return {
          ...state,
          data: {
            ...state.data,
            dashboards: {
              ...state.data.dashboards,
              chartFilters: {
                ...state.data.dashboards.chartFilters,
                ...action.payload.filters
              }
            }
          }
        };

      // =============================================================================
      // USER ACTIONS
      // =============================================================================
      
      case 'SET_CURRENT_USER':
        return {
          ...state,
          user: {
            ...state.user,
            currentUser: action.payload.user,
            userType: action.payload.user ? 
              ('role' in action.payload.user ? 'coo' : 'member') : null
          }
        };

      case 'UPDATE_USER_PREFERENCES':
        return {
          ...state,
          user: {
            ...state.user,
            preferences: {
              ...state.user.preferences,
              ...action.payload.preferences
            }
          }
        };

      case 'UPDATE_PERMISSIONS':
        return {
          ...state,
          user: {
            ...state.user,
            permissions: {
              ...state.user.permissions,
              ...action.payload.permissions
            }
          }
        };

      // =============================================================================
      // CACHE ACTIONS
      // =============================================================================
      
      case 'UPDATE_CACHE_TIMESTAMP':
        return {
          ...state,
          cache: {
            ...state.cache,
            timestamps: {
              ...state.cache.timestamps,
              [action.payload.key]: action.payload.timestamp
            }
          }
        };

      case 'INVALIDATE_CACHE':
        return {
          ...state,
          cache: {
            ...state.cache,
            invalidation: {
              ...state.cache.invalidation,
              [action.payload.key]: true
            }
          }
        };

      case 'CLEAR_ALL_CACHE':
        return {
          ...state,
          cache: {
            ...state.cache,
            timestamps: Object.keys(state.cache.timestamps).reduce((acc, key) => ({
              ...acc,
              [key]: null
            }), {} as typeof state.cache.timestamps),
            invalidation: Object.keys(state.cache.invalidation).reduce((acc, key) => ({
              ...acc,
              [key]: true
            }), {} as typeof state.cache.invalidation)
          }
        };

      // =============================================================================
      // META ACTIONS
      // =============================================================================
      
      case 'INITIALIZE_APP':
        return {
          ...state,
          initialized: true
        };

      case 'TOGGLE_DEBUG_MODE':
        return {
          ...state,
          debugMode: !state.debugMode
        };

      case 'RESET_STATE':
        return createInitialState();

      case 'HYDRATE_STATE':
        return {
          ...state,
          ...action.payload.state
        };

      default:
        return state;
    }
  })();

  // Add to state history for debugging (only if debug mode is enabled)
  if (state.debugMode) {
    const historyEntry = {
      action: action.type,
      timestamp: new Date(),
      previousState: state as Partial<AppState>,
      newState: newState as Partial<AppState>
    };

    newState.history = [...state.history.slice(-49), historyEntry]; // Keep last 50 entries
  }

  return newState as AppState;
}

// =============================================================================
// SELECTORS
// =============================================================================

export function createSelectors(state: AppState): AppSelectors {
  return {
    // UI Selectors
    isLoading: (key?: keyof LoadingState) => 
      key ? state.ui.loading[key] : Object.values(state.ui.loading).some(Boolean),
    
    getError: (key: keyof ErrorState): AppError | string | null => state.ui.errors[key],
    
    hasError: () => Object.values(state.ui.errors).some(error => error !== null),
    
    isModalOpen: (modal: keyof ModalState) => state.ui.modals[modal].isOpen,
    
    getModalProps: (modal: keyof ModalState) => state.ui.modals[modal],

    // Data Selectors
    getTeams: () => state.data.teams.items,
    
    getSelectedTeam: () => state.data.teams.selectedTeam,
    
    getTeamMembers: (teamId?: number) => {
      if (teamId) {
        return state.data.members.byTeamId[teamId] || [];
      }
      return state.data.members.items;
    },
    
    getCurrentSprint: () => state.data.sprints.currentSprint,
    
    getScheduleData: () => state.data.schedules.data,
    
    getCOODashboardData: () => state.data.dashboards.cooData,

    // User Selectors
    getCurrentUser: () => state.user.currentUser,
    
    getUserType: () => state.user.userType,
    
    hasPermission: (permission: keyof typeof state.user.permissions) => 
      state.user.permissions[permission],

    // Computed Selectors
    getTeamUtilization: (teamId: number) => {
      const teamStats = state.data.teams.stats.find(s => s.teamId === teamId);
      return teamStats?.utilization || 0;
    },
    
    getTotalCapacity: () => {
      return state.data.teams.stats.reduce((total, team) => total + team.capacity, 0);
    },
    
    getWeeklyHours: (memberId?: number) => {
      if (memberId) {
        return state.data.schedules.totalHours.byMember[memberId] || 0;
      }
      return state.data.schedules.totalHours.total;
    },
    
    getActiveNotifications: () => state.ui.notifications.items
  };
}

// =============================================================================
// CUSTOM HOOK
// =============================================================================

export function useAppStateReducer(initialState?: Partial<AppState>) {
  const [state, dispatch] = useReducer(
    appStateReducer, 
    initialState ? { ...createInitialState(), ...initialState } : createInitialState()
  );

  const selectors = createSelectors(state);

  // Action helpers
  const actions = {
    setLoading: useCallback((key: keyof LoadingState, value: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: { key, value } });
    }, []),

    setError: useCallback((key: keyof ErrorState, error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: { key, value: error } });
    }, []),

    openModal: useCallback((modal: keyof ModalState, props?: any) => {
      dispatch({ type: 'OPEN_MODAL', payload: { modal, props } });
    }, []),

    closeModal: useCallback((modal: keyof ModalState) => {
      dispatch({ type: 'CLOSE_MODAL', payload: { modal } });
    }, []),

    addNotification: useCallback((notification: Omit<NotificationState['items'][0], 'id' | 'timestamp'>) => {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    }, []),

    refreshData: useCallback((key: keyof UIState['refreshKeys']) => {
      dispatch({ type: 'INCREMENT_REFRESH_KEY', payload: { key } });
    }, [])
  };

  // Debug utilities
  const debug = {
    getStateHistory: useCallback(() => state.history, [state.history]),
    
    exportState: useCallback(() => JSON.stringify(state, null, 2), [state]),
    
    importState: useCallback((stateStr: string) => {
      try {
        const importedState = JSON.parse(stateStr);
        dispatch({ type: 'HYDRATE_STATE', payload: { state: importedState } });
      } catch (error) {
        console.error('Failed to import state:', error);
      }
    }, []),
    
    clearHistory: useCallback(() => {
      dispatch({ type: 'HYDRATE_STATE', payload: { state: { ...state, history: [] } } });
    }, [state])
  };

  return {
    state,
    dispatch,
    selectors,
    actions,
    debug
  };
}