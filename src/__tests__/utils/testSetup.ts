/**
 * Enhanced Test Setup Utilities
 * Specialized utilities for Team Availability Tracker testing
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { TeamMember, Team, ScheduleEntry, CurrentGlobalSprint, DailyCompanyStatusData } from '@/types';
import teamMembersFixture from '../fixtures/teamMembers.json';
import scheduleEntriesFixture from '../fixtures/scheduleEntries.json';

// ============================================================================
// Test Data Generators
// ============================================================================

export function createMockTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 1,
    name: 'Test Team',
    description: 'Test team description',
    color: '#3B82F6',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockTeamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 1,
    name: 'Test Member',
    hebrew: 'טסט מבחן',
    team_id: 1,
    isManager: false,
    role: 'member',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockScheduleEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: 1,
    member_id: 1,
    date: '2024-01-17',
    value: '1',
    hours: 7,
    sprint_id: 'test-sprint-2024-01',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockCurrentSprint(overrides: Partial<CurrentGlobalSprint> = {}): CurrentGlobalSprint {
  return {
    id: 'test-sprint-2024-01',
    sprint_length_weeks: 2,
    current_sprint_number: 1,
    sprint_start_date: '2024-01-17',
    sprint_end_date: '2024-01-30',
    days_remaining: 7,
    working_days_remaining: 5,
    progress_percentage: 50,
    is_active: true,
    status: 'active',
    notes: 'Test sprint notes',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    updated_by: 'test-user',
    ...overrides,
  };
}

// ============================================================================
// Israeli Calendar Utilities
// ============================================================================

export const ISRAELI_WORK_DAYS = [0, 1, 2, 3, 4]; // Sunday through Thursday
export const ISRAELI_WEEKEND_DAYS = [5, 6]; // Friday and Saturday

export function isIsraeliWorkDay(date: Date): boolean {
  return ISRAELI_WORK_DAYS.includes(date.getDay());
}

export function createIsraeliWorkWeek(startDate: string = '2024-01-21'): string[] {
  // Creates a Sun-Thu work week starting from the given date
  const start = new Date(startDate);
  const workDays: string[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    
    if (isIsraeliWorkDay(date)) {
      workDays.push(date.toISOString().split('T')[0]);
    }
  }
  
  return workDays;
}

export function createSprintWorkingDays(sprintStartDate: string, lengthWeeks: number = 2): string[] {
  const workingDays: string[] = [];
  const start = new Date(sprintStartDate);
  const totalDays = lengthWeeks * 7;
  
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    
    if (isIsraeliWorkDay(date)) {
      workingDays.push(date.toISOString().split('T')[0]);
    }
  }
  
  return workingDays;
}

// ============================================================================
// Hours Calculation Utilities
// ============================================================================

export function calculateExpectedHours(entries: ScheduleEntry[]): number {
  return entries.reduce((total, entry) => {
    switch (entry.value) {
      case '1': return total + 7;
      case '0.5': return total + 3.5;
      case 'X': return total + 0;
      default: return total;
    }
  }, 0);
}

export function calculateSprintCapacity(teamSize: number, sprintWeeks: number = 2): number {
  const workingDaysPerWeek = 5; // Sun-Thu
  const hoursPerDay = 7;
  return teamSize * sprintWeeks * workingDaysPerWeek * hoursPerDay;
}

// ============================================================================
// Permission Testing Utilities
// ============================================================================

export function createMockCOOUser() {
  return createMockTeamMember({
    id: 100,
    name: 'Nir Shilha',
    hebrew: 'ניר שילה',
    role: 'coo',
    isManager: true,
  });
}

export function createMockManagerUser(teamId: number = 1) {
  return createMockTeamMember({
    id: 10 + teamId,
    name: `Manager ${teamId}`,
    hebrew: `מנהל ${teamId}`,
    team_id: teamId,
    role: 'manager',
    isManager: true,
  });
}

export function createMockRegularUser(teamId: number = 1) {
  return createMockTeamMember({
    id: 20 + teamId,
    name: `Member ${teamId}`,
    hebrew: `חבר ${teamId}`,
    team_id: teamId,
    role: 'member',
    isManager: false,
  });
}

// ============================================================================
// Database Mock Utilities
// ============================================================================

export function createMockSupabaseResponse<T>(data: T, error: any = null) {
  return Promise.resolve({ data, error });
}

export function createMockDatabaseService() {
  return {
    getTeams: jest.fn(() => createMockSupabaseResponse(teamMembersFixture.teams)),
    getTeamMembers: jest.fn((teamId: number) => 
      createMockSupabaseResponse(
        teamMembersFixture.teamMembers.filter(member => member.team_id === teamId)
      )
    ),
    getScheduleEntries: jest.fn(() => createMockSupabaseResponse({})),
    updateScheduleEntry: jest.fn(() => createMockSupabaseResponse({ success: true })),
    getCurrentSprint: jest.fn(() => createMockSupabaseResponse(createMockCurrentSprint())),
    // Add more mock methods as needed
  };
}

// ============================================================================
// Component Testing Utilities
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: TeamMember;
  team?: Team;
  currentSprint?: CurrentGlobalSprint;
}

export function renderWithTestContext(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { user, team, currentSprint, ...renderOptions } = options;

  // Create test providers wrapper
  function TestWrapper({ children }: { children: React.ReactNode }) {
    // Mock context providers would go here
    return React.createElement('div', { 'data-testid': 'test-wrapper' }, children);
  }

  return render(ui, { wrapper: TestWrapper, ...renderOptions });
}

// ============================================================================
// Performance Testing Utilities
// ============================================================================

export function measureRenderTime<T>(renderFn: () => T): Promise<{ result: T; timeMs: number }> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    // Allow for React's async updates
    setTimeout(() => {
      resolve({
        result,
        timeMs: endTime - startTime
      });
    }, 0);
  });
}

export function simulateNetworkDelay(delay: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

// ============================================================================
// Accessibility Testing Utilities
// ============================================================================

export function simulateKeyboardNavigation(element: HTMLElement, key: string) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
}

export function simulateScreenReaderFocus(element: HTMLElement) {
  element.focus();
  const event = new FocusEvent('focus', { bubbles: true });
  element.dispatchEvent(event);
}

// ============================================================================
// Data Integrity Testing
// ============================================================================

export function validateIsraeliWorkWeekCompliance(scheduleData: Record<string, any>): boolean {
  for (const [dateStr, entry] of Object.entries(scheduleData)) {
    const date = new Date(dateStr);
    const isWeekend = ISRAELI_WEEKEND_DAYS.includes(date.getDay());
    
    // Weekend entries should not exist or should be null
    if (isWeekend && entry && entry.value) {
      return false;
    }
  }
  return true;
}

export function validateHoursCalculation(entry: ScheduleEntry): boolean {
  const expectedHours = entry.value === '1' ? 7 : entry.value === '0.5' ? 3.5 : 0;
  return entry.hours === expectedHours;
}

export function validateReasonRequirement(entry: ScheduleEntry): boolean {
  if (entry.value === '0.5' || entry.value === 'X') {
    return Boolean(entry.reason && entry.reason.trim().length > 0);
  }
  return true; // No reason required for full days
}

// ============================================================================
// Test Fixture Loaders
// ============================================================================

export function getTestTeams(): Team[] {
  return teamMembersFixture.teams.map(team => ({
    ...team,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }));
}

export function getTestTeamMembers(teamId?: number): TeamMember[] {
  const members = teamMembersFixture.teamMembers;
  const filtered = teamId ? members.filter(member => member.team_id === teamId) : members;
  
  return filtered.map(member => ({
    ...member,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }));
}

export function getTestScheduleEntries(): ScheduleEntry[] {
  return scheduleEntriesFixture.scheduleEntries.map(entry => ({
    ...entry,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  }));
}

// ============================================================================
// Export everything
// ============================================================================

export * from '../../../__tests__/utils/testHelpers';
export {
  teamMembersFixture,
  scheduleEntriesFixture,
};