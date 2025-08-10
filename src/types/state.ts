/**
 * Centralized State Management Types
 * 
 * This file defines all state interfaces and types for the unified app state management system.
 * It replaces scattered useState calls with a comprehensive, typed state structure.
 */

import { 
  Team, 
  TeamMember, 
  COODashboardData, 
  COOUser, 
  CurrentGlobalSprint, 
  TeamSprintStats,
  WeekData,
  DailyCompanyStatusData
} from './index';
import { AppError, ErrorCategory, ErrorSeverity } from './errors';

// =============================================================================
// LOADING AND ERROR STATES
// =============================================================================

export interface LoadingState {
  global: boolean;
  dashboard: boolean;
  teams: boolean;
  members: boolean;
  schedules: boolean;
  sprints: boolean;
  analytics: boolean;
  exports: boolean;
  [key: string]: boolean;
}

export interface ErrorState {
  global: AppError | string | null;
  dashboard: AppError | string | null;
  teams: AppError | string | null;
  members: AppError | string | null;
  schedules: AppError | string | null;
  sprints: AppError | string | null;
  analytics: AppError | string | null;
  exports: AppError | string | null;
  [key: string]: AppError | string | null;
}

// Enhanced error state with additional metadata
export interface EnhancedErrorState extends ErrorState {
  // Error history for debugging
  errorHistory: Array<{
    error: AppError;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
  }>;
  
  // Recovery state tracking
  recoveryAttempts: Record<string, {
    count: number;
    lastAttempt: Date;
    successful: boolean;
  }>;
  
  // Error analytics
  errorCounts: Record<ErrorCategory, number>;
  severityCounts: Record<ErrorSeverity, number>;
  
  // Global error handling configuration
  globalErrorHandling: {
    enabled: boolean;
    showUserNotifications: boolean;
    enableRetry: boolean;
    maxRetries: number;
    enableLogging: boolean;
  };
}

// =============================================================================
// UI STATE
// =============================================================================

export interface ModalState {
  // COO Dashboard Modals
  workforceStatus: {
    isOpen: boolean;
    selectedDate?: Date;
  };
  sprintPotential: {
    isOpen: boolean;
    dashboardData?: COODashboardData;
  };
  teamDetail: {
    isOpen: boolean;
    teamId?: number;
  };
  
  // Schedule Modals
  reasonDialog: {
    isOpen: boolean;
    data?: {
      memberId: number;
      date: Date;
      value: '0.5' | 'X';
    };
  };
  viewReasons: {
    isOpen: boolean;
  };
  
  // Management Modals
  memberForm: {
    isOpen: boolean;
    member?: TeamMember;
    mode: 'create' | 'edit';
  };
  sprintForm: {
    isOpen: boolean;
    sprintId?: number;
  };
  
  // Export Modals
  exportModal: {
    isOpen: boolean;
    type?: 'standard' | 'custom' | 'analytics';
  };
}

export interface NotificationState {
  items: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    duration?: number;
    action?: {
      label: string;
      handler: () => void;
    };
  }>;
  unreadCount: number;
}

export interface NavigationState {
  // COO Dashboard Tabs
  cooActiveTab: 'dashboard' | 'daily-status' | 'analytics' | 'sprint-planning';
  
  // Analytics Sections
  analyticsActiveSection: 'charts' | 'insights' | 'executive' | 'predictions';
  
  // Schedule Navigation
  currentWeekOffset: number;
  
  // Selected IDs
  selectedTeamId: number | null;
  selectedMemberId: number | null;
  selectedSprintId: number | null;
}

export interface UIState {
  loading: LoadingState;
  errors: ErrorState;
  modals: ModalState;
  notifications: NotificationState;
  navigation: NavigationState;
  
  // Refresh Keys (for forcing re-renders)
  refreshKeys: {
    dashboard: number;
    teams: number;
    schedules: number;
    analytics: number;
  };
  
  // Mobile/Responsive State
  isMobile: boolean;
  sidebarCollapsed: boolean;
  
  // Performance Flags
  hasLoadedCharts: boolean;
  hasLoadedAnalytics: boolean;
}

// =============================================================================
// DATA STATE
// =============================================================================

export interface TeamsState {
  items: Team[];
  allTeamsWithMembers: (Team & { team_members?: TeamMember[] })[];
  selectedTeam: Team | null;
  stats: Array<{
    teamId: number;
    teamName: string;
    memberCount: number;
    utilization: number;
    capacity: number;
  }>;
  lastFetch: Date | null;
}

export interface MembersState {
  items: TeamMember[];
  byTeamId: Record<number, TeamMember[]>;
  selectedMember: TeamMember | null;
  hoursStatus: Array<{
    memberId: number;
    currentWeek: number;
    nextWeek: number;
    status: 'available' | 'partial' | 'unavailable';
  }>;
  lastFetch: Date | null;
}

export interface SprintsState {
  currentSprint: CurrentGlobalSprint | null;
  teamStats: TeamSprintStats | null;
  history: Array<{
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status: 'upcoming' | 'active' | 'completed';
  }>;
  settings: {
    defaultLength: number;
    autoAdvance: boolean;
  };
  lastFetch: Date | null;
}

export interface SchedulesState {
  data: WeekData;
  currentWeekDates: Date[];
  weekDays: Date[];
  totalHours: {
    byMember: Record<number, number>;
    byTeam: Record<number, number>;
    total: number;
  };
  reasonEntries: Array<{
    memberId: number;
    date: Date;
    value: '0.5' | 'X';
    reason: string;
  }>;
  lastFetch: Date | null;
}

export interface DashboardState {
  // COO Dashboard Data
  cooData: COODashboardData | null;
  
  // Team Dashboard Data
  teamData: Record<number, {
    summary: any;
    dailyStatus: any;
    analytics: any;
  }>;
  
  // Company Daily Status
  dailyCompanyStatus: DailyCompanyStatusData | null;
  dailyStatusDate: Date | null;
  
  // Analytics State
  chartFilters: {
    timeframe: 'current-week' | 'current-sprint' | 'last-month';
    teams: number[];
    utilizationRange: [number, number];
    showProjections: boolean;
  };
  
  // Performance Metrics
  performanceData: {
    loadTimes: Record<string, number>;
    errorRates: Record<string, number>;
    userInteractions: Array<{
      action: string;
      timestamp: Date;
      duration?: number;
    }>;
  };
  
  lastFetch: Date | null;
}

export interface DataState {
  teams: TeamsState;
  members: MembersState;
  sprints: SprintsState;
  schedules: SchedulesState;
  dashboards: DashboardState;
}

// =============================================================================
// USER STATE
// =============================================================================

export interface UserState {
  currentUser: COOUser | TeamMember | null;
  userType: 'coo' | 'manager' | 'member' | null;
  permissions: {
    canManageTeams: boolean;
    canManageSprints: boolean;
    canViewAnalytics: boolean;
    canExportData: boolean;
    canManageMembers: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'he';
    timezone: string;
    dateFormat: string;
    hoursFormat: '12h' | '24h';
    defaultView: 'dashboard' | 'schedule' | 'analytics';
    notifications: {
      email: boolean;
      push: boolean;
      inApp: boolean;
    };
  };
  session: {
    loginTime: Date | null;
    lastActivity: Date | null;
    expiresAt: Date | null;
  };
}

// =============================================================================
// CACHE STATE
// =============================================================================

export interface CacheState {
  timestamps: {
    teams: Date | null;
    members: Date | null;
    schedules: Date | null;
    dashboards: Date | null;
    analytics: Date | null;
  };
  
  invalidation: {
    teams: boolean;
    members: boolean;
    schedules: boolean;
    dashboards: boolean;
    analytics: boolean;
  };
  
  // Cache policies
  policies: {
    teams: { ttl: number; staleWhileRevalidate: boolean };
    members: { ttl: number; staleWhileRevalidate: boolean };
    schedules: { ttl: number; staleWhileRevalidate: boolean };
    dashboards: { ttl: number; staleWhileRevalidate: boolean };
    analytics: { ttl: number; staleWhileRevalidate: boolean };
  };
}

// =============================================================================
// ROOT APP STATE
// =============================================================================

export interface AppState {
  ui: UIState;
  data: DataState;
  user: UserState;
  cache: CacheState;
  
  // Meta information
  version: string;
  initialized: boolean;
  debugMode: boolean;
  
  // State history for debugging
  history: Array<{
    action: string;
    timestamp: Date;
    previousState?: Partial<AppState>;
    newState?: Partial<AppState>;
  }>;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

export type AppAction = 
  // UI Actions
  | { type: 'SET_LOADING'; payload: { key: keyof LoadingState; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof ErrorState; value: string | null } }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'OPEN_MODAL'; payload: { modal: keyof ModalState; props?: any } }
  | { type: 'CLOSE_MODAL'; payload: { modal: keyof ModalState } }
  | { type: 'CLOSE_ALL_MODALS' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<NotificationState['items'][0], 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: { id: string } }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_NAVIGATION'; payload: Partial<NavigationState> }
  | { type: 'INCREMENT_REFRESH_KEY'; payload: { key: keyof UIState['refreshKeys'] } }
  
  // Data Actions - Teams
  | { type: 'SET_TEAMS'; payload: { teams: Team[] } }
  | { type: 'SET_ALL_TEAMS_WITH_MEMBERS'; payload: { teams: (Team & { team_members?: TeamMember[] })[] } }
  | { type: 'SELECT_TEAM'; payload: { team: Team | null } }
  | { type: 'UPDATE_TEAM'; payload: { team: Team } }
  | { type: 'DELETE_TEAM'; payload: { teamId: number } }
  
  // Data Actions - Members
  | { type: 'SET_MEMBERS'; payload: { members: TeamMember[] } }
  | { type: 'SET_MEMBERS_BY_TEAM'; payload: { teamId: number; members: TeamMember[] } }
  | { type: 'SELECT_MEMBER'; payload: { member: TeamMember | null } }
  | { type: 'UPDATE_MEMBER'; payload: { member: TeamMember } }
  | { type: 'DELETE_MEMBER'; payload: { memberId: number } }
  
  // Data Actions - Sprints
  | { type: 'SET_CURRENT_SPRINT'; payload: { sprint: CurrentGlobalSprint | null } }
  | { type: 'SET_TEAM_SPRINT_STATS'; payload: { stats: TeamSprintStats | null } }
  | { type: 'UPDATE_SPRINT_SETTINGS'; payload: { settings: Partial<SprintsState['settings']> } }
  
  // Data Actions - Schedules
  | { type: 'SET_SCHEDULE_DATA'; payload: { data: WeekData } }
  | { type: 'UPDATE_SCHEDULE_ENTRY'; payload: { memberId: number; date: Date; value: string | null; reason?: string } }
  | { type: 'SET_CURRENT_WEEK_DATES'; payload: { dates: Date[] } }
  | { type: 'SET_TOTAL_HOURS'; payload: { totalHours: SchedulesState['totalHours'] } }
  
  // Data Actions - Dashboards
  | { type: 'SET_COO_DASHBOARD_DATA'; payload: { data: COODashboardData | null } }
  | { type: 'SET_DAILY_COMPANY_STATUS'; payload: { data: DailyCompanyStatusData | null; date: Date } }
  | { type: 'SET_CHART_FILTERS'; payload: { filters: Partial<DashboardState['chartFilters']> } }
  
  // User Actions
  | { type: 'SET_CURRENT_USER'; payload: { user: COOUser | TeamMember | null } }
  | { type: 'UPDATE_USER_PREFERENCES'; payload: { preferences: Partial<UserState['preferences']> } }
  | { type: 'UPDATE_PERMISSIONS'; payload: { permissions: Partial<UserState['permissions']> } }
  
  // Cache Actions
  | { type: 'UPDATE_CACHE_TIMESTAMP'; payload: { key: keyof CacheState['timestamps']; timestamp: Date } }
  | { type: 'INVALIDATE_CACHE'; payload: { key: keyof CacheState['invalidation'] } }
  | { type: 'CLEAR_ALL_CACHE' }
  
  // Meta Actions
  | { type: 'INITIALIZE_APP' }
  | { type: 'TOGGLE_DEBUG_MODE' }
  | { type: 'RESET_STATE' }
  | { type: 'HYDRATE_STATE'; payload: { state: Partial<AppState> } };

// =============================================================================
// SELECTORS
// =============================================================================

export interface AppSelectors {
  // UI Selectors
  isLoading: (key?: keyof LoadingState) => boolean;
  getError: (key: keyof ErrorState) => AppError | string | null;
  hasError: () => boolean;
  isModalOpen: (modal: keyof ModalState) => boolean;
  getModalProps: (modal: keyof ModalState) => any;
  
  // Data Selectors
  getTeams: () => Team[];
  getSelectedTeam: () => Team | null;
  getTeamMembers: (teamId?: number) => TeamMember[];
  getCurrentSprint: () => CurrentGlobalSprint | null;
  getScheduleData: () => WeekData;
  getCOODashboardData: () => COODashboardData | null;
  
  // User Selectors
  getCurrentUser: () => COOUser | TeamMember | null;
  getUserType: () => 'coo' | 'manager' | 'member' | null;
  hasPermission: (permission: keyof UserState['permissions']) => boolean;
  
  // Computed Selectors
  getTeamUtilization: (teamId: number) => number;
  getTotalCapacity: () => number;
  getWeeklyHours: (memberId?: number) => number;
  getActiveNotifications: () => NotificationState['items'];
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface AppStateContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  selectors: AppSelectors;
  isProviderReady?: boolean;
  
  // Action helpers
  actions: {
    setLoading: (key: keyof LoadingState, value: boolean) => void;
    setError: (key: keyof ErrorState, error: string | null) => void;
    openModal: (modal: keyof ModalState, props?: any) => void;
    closeModal: (modal: keyof ModalState) => void;
    addNotification: (notification: Omit<NotificationState['items'][0], 'id' | 'timestamp'>) => void;
    refreshData: (key: keyof UIState['refreshKeys']) => void;
  };
  
  // Debug utilities
  debug: {
    getStateHistory: () => AppState['history'];
    exportState: () => string;
    importState: (state: string) => void;
    clearHistory: () => void;
  };
}

// =============================================================================
// INITIAL STATE FACTORY
// =============================================================================

export const createInitialState = (): AppState => ({
  ui: {
    loading: {
      global: false,
      dashboard: false,
      teams: false,
      members: false,
      schedules: false,
      sprints: false,
      analytics: false,
      exports: false,
    },
    errors: {
      global: null,
      dashboard: null,
      teams: null,
      members: null,
      schedules: null,
      sprints: null,
      analytics: null,
      exports: null,
    },
    modals: {
      workforceStatus: { isOpen: false },
      sprintPotential: { isOpen: false },
      teamDetail: { isOpen: false },
      reasonDialog: { isOpen: false },
      viewReasons: { isOpen: false },
      memberForm: { isOpen: false, mode: 'create' },
      sprintForm: { isOpen: false },
      exportModal: { isOpen: false },
    },
    notifications: {
      items: [],
      unreadCount: 0,
    },
    navigation: {
      cooActiveTab: 'dashboard',
      analyticsActiveSection: 'charts',
      currentWeekOffset: 0,
      selectedTeamId: null,
      selectedMemberId: null,
      selectedSprintId: null,
    },
    refreshKeys: {
      dashboard: 0,
      teams: 0,
      schedules: 0,
      analytics: 0,
    },
    isMobile: false,
    sidebarCollapsed: false,
    hasLoadedCharts: false,
    hasLoadedAnalytics: false,
  },
  data: {
    teams: {
      items: [],
      allTeamsWithMembers: [],
      selectedTeam: null,
      stats: [],
      lastFetch: null,
    },
    members: {
      items: [],
      byTeamId: {},
      selectedMember: null,
      hoursStatus: [],
      lastFetch: null,
    },
    sprints: {
      currentSprint: null,
      teamStats: null,
      history: [],
      settings: {
        defaultLength: 2,
        autoAdvance: false,
      },
      lastFetch: null,
    },
    schedules: {
      data: {},
      currentWeekDates: [],
      weekDays: [],
      totalHours: {
        byMember: {},
        byTeam: {},
        total: 0,
      },
      reasonEntries: [],
      lastFetch: null,
    },
    dashboards: {
      cooData: null,
      teamData: {},
      dailyCompanyStatus: null,
      dailyStatusDate: null,
      chartFilters: {
        timeframe: 'current-week',
        teams: [],
        utilizationRange: [0, 200],
        showProjections: true,
      },
      performanceData: {
        loadTimes: {},
        errorRates: {},
        userInteractions: [],
      },
      lastFetch: null,
    },
  },
  user: {
    currentUser: null,
    userType: null,
    permissions: {
      canManageTeams: false,
      canManageSprints: false,
      canViewAnalytics: false,
      canExportData: false,
      canManageMembers: false,
    },
    preferences: {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/dd/yyyy',
      hoursFormat: '24h',
      defaultView: 'dashboard',
      notifications: {
        email: true,
        push: true,
        inApp: true,
      },
    },
    session: {
      loginTime: null,
      lastActivity: null,
      expiresAt: null,
    },
  },
  cache: {
    timestamps: {
      teams: null,
      members: null,
      schedules: null,
      dashboards: null,
      analytics: null,
    },
    invalidation: {
      teams: false,
      members: false,
      schedules: false,
      dashboards: false,
      analytics: false,
    },
    policies: {
      teams: { ttl: 300000, staleWhileRevalidate: true }, // 5 minutes
      members: { ttl: 300000, staleWhileRevalidate: true },
      schedules: { ttl: 60000, staleWhileRevalidate: true }, // 1 minute
      dashboards: { ttl: 120000, staleWhileRevalidate: true }, // 2 minutes
      analytics: { ttl: 600000, staleWhileRevalidate: true }, // 10 minutes
    },
  },
  version: '1.0.0',
  initialized: false,
  debugMode: process.env.NODE_ENV === 'development',
  history: [],
});

export default AppState;