/**
 * Enhanced Test Utilities
 * Comprehensive testing helpers for consistent test setup and mocking
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { Team, TeamMember, COODashboardData, CurrentGlobalSprint } from '@/types';

// ============================================================================
// Mock Data Factories
// ============================================================================

export const createMockTeam = (overrides?: Partial<Team>): Team => ({
  id: 1,
  name: 'Engineering Team',
  description: 'Software development team',
  color: '#3B82F6',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides
});

export const createMockTeamMember = (overrides?: Partial<TeamMember>): TeamMember => ({
  id: 1,
  name: 'John Doe',
  hebrew: 'ג\'ון דו',
  isManager: false,
  email: 'john@company.com',
  team_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides
});

export const createMockManager = (overrides?: Partial<TeamMember>): TeamMember => 
  createMockTeamMember({ 
    id: 99, 
    name: 'Manager User', 
    hebrew: 'מנהל', 
    isManager: true, 
    email: 'manager@company.com',
    ...overrides 
  });

export const createMockCurrentSprint = (overrides?: Partial<CurrentGlobalSprint>): CurrentGlobalSprint => ({
  id: 1,
  current_sprint_number: 5,
  sprint_length_weeks: 2,
  sprint_start_date: '2024-01-01T00:00:00Z',
  sprint_end_date: '2024-01-14T23:59:59Z',
  days_remaining: 7,
  progress_percentage: 65,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-08T00:00:00Z',
  updated_by: 'system',
  ...overrides
});

export const createMockCOODashboardData = (overrides?: Partial<COODashboardData>): COODashboardData => ({
  companyOverview: {
    totalMembers: 25,
    totalTeams: 5,
    sprintMax: 875,
    sprintPotential: 820,
    currentUtilization: 85.2,
    capacityGap: 55,
    capacityGapPercentage: 6.3
  },
  teamComparison: [
    {
      teamId: 1,
      teamName: 'Engineering',
      maxCapacity: 280,
      weeklyPotential: 245,
      actualHours: 210,
      utilization: 85.7,
      capacityGap: 35,
      capacityStatus: 'optimal',
      memberCount: 8
    },
    {
      teamId: 2,
      teamName: 'Product',
      maxCapacity: 175,
      weeklyPotential: 165,
      actualHours: 140,
      utilization: 84.8,
      capacityGap: 25,
      capacityStatus: 'optimal',
      memberCount: 5
    }
  ],
  sprintAnalytics: {
    currentSprintNumber: 5,
    sprintWeeks: 2,
    sprintPotential: 820,
    sprintActual: 698,
    sprintUtilization: 85.1,
    weeklyBreakdown: [
      { week: 1, potential: 410, actual: 359, utilization: 87.6 },
      { week: 2, potential: 410, actual: 339, utilization: 82.7 }
    ]
  },
  capacityForecast: {
    nextWeekProjection: {
      potentialHours: 410,
      projectedActual: 358,
      expectedUtilization: 87.3,
      confidenceLevel: 78
    },
    nextSprintProjection: {
      sprintPotential: 875,
      projectedOutcome: 759,
      riskFactors: ['Holiday period', 'Team training']
    },
    quarterlyOutlook: {
      trend: 'stable',
      averageUtilization: 84.8,
      capacityTrends: [
        { period: '2024-01', value: 83.2 },
        { period: '2024-02', value: 85.1 },
        { period: '2024-03', value: 86.4 }
      ]
    }
  },
  optimizationRecommendations: [
    'Consider cross-training team members to balance workload',
    'Review sprint planning process for better capacity estimation'
  ],
  lastUpdated: '2024-01-15T12:00:00Z',
  ...overrides
});

export const createMockScheduleData = () => ({
  1: { // Member ID 1
    '2024-01-15': { value: '1' as const, reason: undefined },
    '2024-01-16': { value: '0.5' as const, reason: 'Doctor appointment' },
    '2024-01-17': { value: 'X' as const, reason: 'Sick leave' },
    '2024-01-18': { value: '1' as const, reason: undefined },
    '2024-01-19': { value: '1' as const, reason: undefined }
  },
  2: { // Member ID 2
    '2024-01-15': { value: '1' as const, reason: undefined },
    '2024-01-16': { value: '1' as const, reason: undefined },
    '2024-01-17': { value: '1' as const, reason: undefined },
    '2024-01-18': { value: '0.5' as const, reason: 'Personal time' },
    '2024-01-19': { value: '1' as const, reason: undefined }
  }
});

// ============================================================================
// Mock Functions and Services
// ============================================================================

export const createMockDatabaseService = () => ({
  getOperationalTeams: jest.fn().mockResolvedValue([createMockTeam()]),
  getTeamMembers: jest.fn().mockResolvedValue([createMockTeamMember(), createMockManager()]),
  getCurrentGlobalSprint: jest.fn().mockResolvedValue(createMockCurrentSprint()),
  getCOODashboardData: jest.fn().mockResolvedValue(createMockCOODashboardData()),
  getScheduleEntries: jest.fn().mockResolvedValue(createMockScheduleData()),
  updateScheduleEntry: jest.fn().mockResolvedValue(true),
  subscribeToScheduleChanges: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
  triggerAchievementCheck: jest.fn().mockResolvedValue(true),
  getTeamSprintStats: jest.fn().mockResolvedValue({
    potential_hours: 280,
    sprint_hours: 250,
    current_week_hours: 180,
    capacity_utilization: 85
  })
});

export const createMockAppStateHooks = () => ({
  useLoadingState: jest.fn(() => ({
    dashboard: false,
    schedules: false,
    setDashboardLoading: jest.fn(),
    setSchedulesLoading: jest.fn()
  })),
  useErrorState: jest.fn(() => ({
    dashboard: null,
    schedules: null,
    setDashboardError: jest.fn(),
    setSchedulesError: jest.fn()
  })),
  useModalState: jest.fn(() => ({
    reasonDialog: { isOpen: false, open: jest.fn(), close: jest.fn() },
    viewReasons: { isOpen: false, open: jest.fn(), close: jest.fn() },
    teamDetail: { isOpen: false, open: jest.fn(), close: jest.fn() },
    workforceStatus: { isOpen: false, open: jest.fn(), close: jest.fn() }
  })),
  useNavigationState: jest.fn(() => ({
    cooActiveTab: 'dashboard',
    currentWeekOffset: 0,
    selectedTeamId: null,
    setCOOActiveTab: jest.fn(),
    setCurrentWeekOffset: jest.fn(),
    selectTeam: jest.fn()
  })),
  useTeamsState: jest.fn(() => ({
    allTeamsWithMembers: [createMockTeam()],
    setAllTeamsWithMembers: jest.fn(),
    setTeams: jest.fn()
  })),
  useDashboardState: jest.fn(() => ({
    cooData: createMockCOODashboardData(),
    setCOODashboardData: jest.fn()
  })),
  useSprintsState: jest.fn(() => ({
    currentSprint: createMockCurrentSprint()
  })),
  useRefreshUtilities: jest.fn(() => ({
    refreshDashboard: jest.fn(),
    refreshSchedules: jest.fn()
  })),
  useNotifications: jest.fn(() => ({
    showError: jest.fn(),
    showSuccess: jest.fn()
  })),
  useSchedulesState: jest.fn(() => ({
    scheduleData: createMockScheduleData(),
    currentWeekDates: [],
    weekDays: [],
    setScheduleData: jest.fn(),
    setCurrentWeekDates: jest.fn(),
    updateScheduleEntry: jest.fn()
  }))
});

// ============================================================================
// Test Environment Setup
// ============================================================================

export const setupTestEnvironment = () => {
  // Mock window.matchMedia for responsive tests
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock Intersection Observer for performance tests
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock ResizeObserver for responsive tests
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Mock console methods for cleaner test output
  const originalError = console.error;
  const originalWarn = console.warn;
  
  beforeEach(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
};

// ============================================================================
// Test Utilities
// ============================================================================

export const getCurrentWeekDates = (weekOffset = 0) => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
  
  const weekDays = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDays.push(date);
  }
  return weekDays;
};

export const waitForLoadingToFinish = async () => {
  // Wait for any loading states to complete
  await new Promise(resolve => setTimeout(resolve, 100));
};

export const mockDateNow = (dateString?: string) => {
  const mockDate = dateString ? new Date(dateString) : new Date('2024-01-15T12:00:00Z');
  jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());
  return mockDate;
};

// ============================================================================
// Custom Render Function
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialState, ...renderOptions } = options;

  // Set up any providers here if needed
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(React.Fragment, null, children);
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// ============================================================================
// Assertion Helpers
// ============================================================================

export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveAccessibleName = (element: HTMLElement, name: string) => {
  expect(element).toHaveAccessibleName(name);
};

export const expectLoadingState = (container: HTMLElement) => {
  expect(container.querySelector('[data-testid="loading"]') || 
         container.querySelector('.animate-pulse') ||
         container.textContent).toMatch(/loading|Loading/i);
};

export const expectErrorState = (container: HTMLElement, message?: string) => {
  const errorElement = container.querySelector('[data-testid="error"]') || 
                      container.querySelector('.text-red-500');
  expect(errorElement).toBeInTheDocument();
  if (message) {
    expect(container.textContent).toMatch(new RegExp(message, 'i'));
  }
};

// ============================================================================
// Performance Testing Helpers
// ============================================================================

export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const expectPerformanceWithinThreshold = (renderTime: number, maxMs: number) => {
  expect(renderTime).toBeLessThan(maxMs);
};

// ============================================================================
// Export all utilities
// ============================================================================

export default {
  createMockTeam,
  createMockTeamMember,
  createMockManager,
  createMockCurrentSprint,
  createMockCOODashboardData,
  createMockScheduleData,
  createMockDatabaseService,
  createMockAppStateHooks,
  setupTestEnvironment,
  getCurrentWeekDates,
  waitForLoadingToFinish,
  mockDateNow,
  renderWithProviders,
  expectElementToBeVisible,
  expectElementToHaveAccessibleName,
  expectLoadingState,
  expectErrorState,
  measureRenderTime,
  expectPerformanceWithinThreshold
};