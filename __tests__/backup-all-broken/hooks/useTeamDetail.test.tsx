/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react';
// Mock the database service first
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getOperationalTeams: jest.fn(),
    getTeamMembers: jest.fn(),
    getCurrentGlobalSprint: jest.fn(),
    getTeamSprintStats: jest.fn(),
  }
}));

import { useTeamDetail } from '@/hooks/useTeamDetail';
import { DatabaseService } from '@/lib/database';

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Mock calculation service
jest.mock('@/lib/calculationService', () => ({
  formatHours: jest.fn((hours) => `${hours}h`),
  formatPercentage: jest.fn((percent) => `${percent}%`)
}));

describe('useTeamDetail', () => {
  const mockTeam = {
    id: 1,
    name: 'Engineering Team',
    description: 'Software development team',
    color: '#3B82F6',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  };

  const mockMembers = [
    {
      id: 1,
      name: 'John Doe',
      hebrew: 'ג\'ון דו',
      isManager: true,
      email: 'john@company.com',
      team_id: 1
    },
    {
      id: 2,
      name: 'Jane Smith',
      hebrew: 'ג\'יין סמית\'',
      isManager: false,
      email: 'jane@company.com',
      team_id: 1
    }
  ];

  const mockSprint = {
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
    updated_by: 'system'
  };

  const mockTeamStats = {
    potential_hours: 280,
    sprint_hours: 250,
    current_week_hours: 180,
    capacity_utilization: 85
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDatabaseService.getOperationalTeams.mockResolvedValue([mockTeam]);
    mockDatabaseService.getTeamMembers.mockResolvedValue(mockMembers);
    mockDatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockSprint);
    mockDatabaseService.getTeamSprintStats.mockResolvedValue(mockTeamStats);
  });

  it('should return initial state when teamId is null', () => {
    const { result } = renderHook(() => useTeamDetail(null));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetch).toBeNull();
  });

  it('should fetch team data successfully', async () => {
    const { result } = renderHook(() => useTeamDetail(1));

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.teamInfo.name).toBe('Engineering Team');
    expect(result.current.data?.members).toHaveLength(2);
    expect(result.current.data?.currentSprint.sprintNumber).toBe(5);
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetch).toBeInstanceOf(Date);
  });

  it('should handle team not found error', async () => {
    mockDatabaseService.getOperationalTeams.mockResolvedValue([]);

    const { result } = renderHook(() => useTeamDetail(999));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Team with ID 999 not found');
  });

  it('should handle database service errors', async () => {
    const errorMessage = 'Database connection failed';
    // Use a different team ID to avoid cache conflicts
    mockDatabaseService.getOperationalTeams.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useTeamDetail(999));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Failed to fetch team information');
  });

  it('should use cached data when available', async () => {
    // First render
    const { result: result1, unmount: unmount1 } = renderHook(() => useTeamDetail(1));

    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
    });

    const firstCallCount = mockDatabaseService.getOperationalTeams.mock.calls.length;
    unmount1();

    // Second render should use cache
    const { result: result2 } = renderHook(() => useTeamDetail(1));

    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    expect(result2.current.data).toBeDefined();
    // Should not make additional database calls due to caching
    expect(mockDatabaseService.getOperationalTeams.mock.calls.length).toBe(firstCallCount);
  });

  it('should handle sprint calculations correctly', async () => {
    const { result } = renderHook(() => useTeamDetail(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const sprintData = result.current.data?.currentSprint;
    expect(sprintData?.lengthWeeks).toBe(2);
    expect(sprintData?.potentialHours).toBe(280);
    expect(sprintData?.plannedHours).toBe(250);
    expect(sprintData?.completedHours).toBe(180);
    expect(sprintData?.healthStatus).toBe('good');
  });

  it('should calculate member details correctly', async () => {
    const { result } = renderHook(() => useTeamDetail(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const members = result.current.data?.members;
    expect(members).toHaveLength(2);
    
    // Manager should be first
    expect(members?.[0].isManager).toBe(true);
    expect(members?.[0].role).toBe('Team Manager');
    
    // Regular member should be second
    expect(members?.[1].isManager).toBe(false);
    expect(members?.[1].role).toBe('Team Member');

    // All members should have calculated fields
    members?.forEach(member => {
      expect(member.currentWeekHours).toBeGreaterThan(0);
      expect(member.sprintPlannedHours).toBeGreaterThan(0);
      expect(member.individualCompletionPercentage).toBeGreaterThanOrEqual(0);
      expect(member.availabilityColor).toBeDefined();
      expect(member.currentWeekStatus).toMatch(/^(available|partial|unavailable)$/);
    });
  });

  it('should generate statistics correctly', async () => {
    const { result } = renderHook(() => useTeamDetail(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const stats = result.current.data?.statistics;
    expect(stats?.averageUtilization).toBeGreaterThan(0);
    expect(stats?.mostProductiveDay).toBe('Tuesday');
    expect(stats?.topAbsenceReasons).toHaveLength(3);
    expect(stats?.comparisonToOtherTeams.totalTeams).toBe(5);
    expect(stats?.trendIndicator).toMatch(/^(improving|stable|declining)$/);
    expect(stats?.weeklyTrends).toHaveLength(4);
  });

  it('should include recent activity data', async () => {
    const { result } = renderHook(() => useTeamDetail(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const activities = result.current.data?.recentActivity;
    expect(activities).toHaveLength(3);
    
    activities?.forEach(activity => {
      expect(activity.id).toBeDefined();
      expect(activity.timestamp).toBeDefined();
      expect(activity.type).toBeDefined();
      expect(activity.description).toBeDefined();
      expect(activity.icon).toBeDefined();
      expect(activity.color).toBeDefined();
    });

    // Activities should be sorted by timestamp (newest first)
    if (activities && activities.length > 1) {
      const timestamps = activities.map(a => new Date(a.timestamp).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
      }
    }
  });

  it('should handle pending entries', async () => {
    const { result } = renderHook(() => useTeamDetail(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const pendingEntries = result.current.data?.pendingEntries;
    expect(pendingEntries).toHaveLength(2);
    
    pendingEntries?.forEach(entry => {
      expect(entry.memberId).toBeDefined();
      expect(entry.memberName).toBeDefined();
      expect(entry.date).toBeDefined();
      expect(entry.type).toBeDefined();
      expect(entry.description).toBeDefined();
      expect(entry.priority).toMatch(/^(high|medium|low)$/);
    });

    // Should be sorted by priority (high first)
    if (pendingEntries && pendingEntries.length > 1) {
      expect(pendingEntries[0].priority).toBe('high');
    }
  });

  it('should handle refetch correctly', async () => {
    const { result } = renderHook(() => useTeamDetail(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialData = result.current.data;
    const initialCallCount = mockDatabaseService.getOperationalTeams.mock.calls.length;

    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    // Should make new database calls (cache cleared)
    expect(mockDatabaseService.getOperationalTeams.mock.calls.length).toBeGreaterThan(initialCallCount);
    expect(result.current.data).toBeDefined();
    expect(result.current.lastFetch).toBeInstanceOf(Date);
  });

  it('should handle teamId changes correctly', async () => {
    const { result, rerender } = renderHook(
      ({ teamId }) => useTeamDetail(teamId),
      { initialProps: { teamId: 1 } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.teamInfo.id).toBe(1);

    // Change teamId to null
    rerender({ teamId: null });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetch).toBeNull();
  });

  it('should handle no active sprint scenario', async () => {
    // Use a different team ID and reset all other mocks for this test
    const testTeam = { ...mockTeam, id: 888 };
    mockDatabaseService.getOperationalTeams.mockResolvedValue([testTeam]);
    mockDatabaseService.getTeamMembers.mockResolvedValue(mockMembers.map(m => ({ ...m, team_id: 888 })));
    mockDatabaseService.getTeamSprintStats.mockResolvedValue(mockTeamStats);
    
    // Only fail the sprint fetch
    mockDatabaseService.getCurrentGlobalSprint.mockResolvedValue(null);

    const { result } = renderHook(() => useTeamDetail(888));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('No active sprint found');
  });

  it('should cleanup properly on unmount', async () => {
    const { result, unmount } = renderHook(() => useTeamDetail(1));

    // Start loading
    expect(result.current.loading).toBe(true);

    // Unmount before completion
    unmount();

    // Should not cause any errors or memory leaks
    expect(() => unmount()).not.toThrow();
  });
});