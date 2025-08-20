import { renderHook, waitFor } from '@testing-library/react';
import { useTeamDetailData, convertToLegacyFormat } from '../../src/hooks/useTeamDetailData';
import { DatabaseService } from '../../src/lib/database';

// Mock DatabaseService
jest.mock('../../src/lib/database');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Mock data
const mockCurrentSprint = {
  id: 1,
  current_sprint_number: 5,
  sprint_start_date: '2024-01-01',
  sprint_end_date: '2024-01-12',
  sprint_length_weeks: 2,
  is_current: true,
  is_active: true,
  progress_percentage: 50
};

const mockTeam = {
  id: 1,
  name: 'Product Team',
  description: 'Product development team',
  color: '#3B82F6',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockTeamMembers = [
  {
    id: 1,
    name: 'John Doe',
    hebrew: 'ג\'ון דו',
    email: 'john@example.com',
    isManager: true,
    team_id: 1
  },
  {
    id: 2,
    name: 'Jane Smith',
    hebrew: 'ג\'יין סמית',
    email: 'jane@example.com',
    isManager: false,
    team_id: 1
  },
  {
    id: 3,
    name: 'Bob Wilson',
    hebrew: 'בוב ווילסון',
    email: 'bob@example.com',
    isManager: false,
    team_id: 1
  }
];

const mockScheduleData = {
  1: { // John's schedule
    '2024-01-01': { value: '1' as const },
    '2024-01-02': { value: '1' as const },
    '2024-01-03': { value: '0.5' as const },
    '2024-01-04': { value: '1' as const },
    '2024-01-05': { value: '1' as const }
  },
  2: { // Jane's schedule
    '2024-01-01': { value: '1' as const },
    '2024-01-02': { value: '1' as const },
    '2024-01-03': { value: '1' as const },
    '2024-01-04': { value: '0.5' as const },
    '2024-01-05': { value: '1' as const }
  },
  3: { // Bob's schedule
    '2024-01-01': { value: '1' as const },
    '2024-01-02': { value: 'X' as const },
    '2024-01-03': { value: 'X' as const },
    '2024-01-04': { value: '1' as const },
    '2024-01-05': { value: '1' as const }
  }
};

describe('useTeamDetailData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockCurrentSprint);
    mockDatabaseService.getOperationalTeams.mockResolvedValue([mockTeam]);
    mockDatabaseService.getTeamMembers.mockResolvedValue(mockTeamMembers);
    mockDatabaseService.getSprintDateRange.mockReturnValue({
      startDate: '2024-01-01',
      endDate: '2024-01-12'
    });
    mockDatabaseService.getScheduleEntries.mockResolvedValue(mockScheduleData);
  });

  it('should fetch real data from database correctly', async () => {
    const { result } = renderHook(() => useTeamDetailData(1));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.teamData).toBeTruthy();
    expect(result.current.error).toBeNull();
    
    const teamData = result.current.teamData!;
    
    // Verify team info
    expect(teamData.teamInfo.name).toBe('Product Team');
    expect(teamData.teamInfo.totalMembers).toBe(3);
    expect(teamData.teamInfo.managerName).toBe('John Doe');
    
    // Verify sprint potential calculation
    // 3 members × 10 working days × 7 hours = 210 hours
    expect(teamData.currentSprint.potentialHours).toBe(210);
    expect(teamData.currentSprint.durationDays).toBe(10);
    
    // Verify planned hours calculation
    // John: 4×7 + 1×3.5 = 31.5h, Jane: 4×7 + 1×3.5 = 31.5h, Bob: 3×7 = 21h
    // Total: 31.5 + 31.5 + 21 = 84h
    expect(teamData.currentSprint.plannedHours).toBe(84);
    
    // Verify completion percentage
    // 84/210 = 40%
    expect(teamData.currentSprint.completionPercentage).toBe(40);
  });

  it('should calculate member statistics correctly', async () => {
    const { result } = renderHook(() => useTeamDetailData(1));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    const teamData = result.current.teamData!;
    
    // John should have 31.5 planned hours
    const john = teamData.memberStats.find(m => m.name === 'John Doe');
    expect(john).toBeTruthy();
    expect(john!.plannedHours).toBe(31.5);
    expect(john!.potentialHours).toBe(70); // 10 days × 7 hours
    expect(john!.completionPercentage).toBe(45); // 31.5/70 = 45%
    expect(john!.isManager).toBe(true);
    
    // Jane should have 31.5 planned hours  
    const jane = teamData.memberStats.find(m => m.name === 'Jane Smith');
    expect(jane).toBeTruthy();
    expect(jane!.plannedHours).toBe(31.5);
    expect(jane!.completionPercentage).toBe(45);
    expect(jane!.isManager).toBe(false);
    
    // Bob should have 21 planned hours (2 sick days)
    const bob = teamData.memberStats.find(m => m.name === 'Bob Wilson');
    expect(bob).toBeTruthy();
    expect(bob!.plannedHours).toBe(21);
    expect(bob!.completionPercentage).toBe(30); // 21/70 = 30%
    expect(bob!.isManager).toBe(false);
  });

  it('should generate recent activity from schedule updates', async () => {
    const { result } = renderHook(() => useTeamDetailData(1));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    const teamData = result.current.teamData!;
    
    // Should have activity entries for each schedule update
    expect(teamData.recentActivity).toBeDefined();
    expect(teamData.recentActivity.length).toBeGreaterThan(0);
    
    // Each activity should have proper structure
    const firstActivity = teamData.recentActivity[0];
    expect(firstActivity.memberName).toBeTruthy();
    expect(firstActivity.description).toBe('Updated availability');
    expect(firstActivity.details).toContain('Set');
    expect(firstActivity.hours).toBeGreaterThanOrEqual(0);
  });

  it('should calculate quick stats correctly', async () => {
    const { result } = renderHook(() => useTeamDetailData(1));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    const teamData = result.current.teamData!;
    
    // Average utilization should be (45 + 45 + 30) / 3 = 40%
    expect(teamData.quickStats.averageUtilization).toBe(40);
    
    // Should have proper health status
    expect(['excellent', 'good', 'warning', 'critical']).toContain(
      teamData.quickStats.sprintHealthStatus
    );
  });

  it('should handle missing sprint data gracefully', async () => {
    mockDatabaseService.getCurrentGlobalSprint.mockResolvedValue(null);
    
    const { result } = renderHook(() => useTeamDetailData(1));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.error).toContain('No active sprint found');
  });

  it('should handle missing team data gracefully', async () => {
    mockDatabaseService.getOperationalTeams.mockResolvedValue([]);
    
    const { result } = renderHook(() => useTeamDetailData(1));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.error).toContain('Team with ID 1 not found');
  });

  it('should handle database errors gracefully', async () => {
    mockDatabaseService.getCurrentGlobalSprint.mockRejectedValue(
      new Error('Database connection failed')
    );
    
    const { result } = renderHook(() => useTeamDetailData(1));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.error).toContain('Database connection failed');
  });

  it('should not fetch data when teamId is null', () => {
    const { result } = renderHook(() => useTeamDetailData(null));
    
    expect(result.current.teamData).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    
    // Should not have called any database methods
    expect(mockDatabaseService.getCurrentGlobalSprint).not.toHaveBeenCalled();
  });

  it('should refetch data correctly', async () => {
    const { result } = renderHook(() => useTeamDetailData(1));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Clear mocks to track refetch calls
    jest.clearAllMocks();
    mockDatabaseService.getCurrentGlobalSprint.mockResolvedValue(mockCurrentSprint);
    mockDatabaseService.getOperationalTeams.mockResolvedValue([mockTeam]);
    mockDatabaseService.getTeamMembers.mockResolvedValue(mockTeamMembers);
    mockDatabaseService.getScheduleEntries.mockResolvedValue(mockScheduleData);
    
    // Trigger refetch
    await result.current.refetch();
    
    // Should have called database methods again
    expect(mockDatabaseService.getCurrentGlobalSprint).toHaveBeenCalled();
    expect(mockDatabaseService.getOperationalTeams).toHaveBeenCalled();
    expect(mockDatabaseService.getTeamMembers).toHaveBeenCalled();
    expect(mockDatabaseService.getScheduleEntries).toHaveBeenCalled();
  });
});

describe('convertToLegacyFormat', () => {
  const mockAccurateData = {
    teamInfo: {
      id: 1,
      name: 'Product Team',
      description: 'Product development team',
      managerName: 'John Doe',
      totalMembers: 3,
      activeMembers: 2
    },
    currentSprint: {
      sprintId: '1',
      sprintNumber: 5,
      startDate: '2024-01-01',
      endDate: '2024-01-12',
      durationDays: 10,
      potentialHours: 210,
      plannedHours: 84,
      completionPercentage: 40,
      daysRemaining: 5,
      isOnTrack: true,
      healthStatus: 'warning' as const,
      healthColor: '#F59E0B'
    },
    memberStats: [
      {
        id: 1,
        name: 'John Doe',
        hebrew: 'ג\'ון דו',
        isManager: true,
        plannedHours: 31.5,
        potentialHours: 70,
        completionPercentage: 45,
        currentWeekHours: 28,
        hasCompletedPlanning: true,
        availabilityStatus: 'available' as const,
        availabilityColor: '#10B981',
        lastActivity: '2024-01-05T00:00:00Z'
      }
    ],
    recentActivity: [
      {
        id: '1',
        timestamp: '2024-01-05T10:00:00Z',
        description: 'Updated availability',
        memberName: 'John Doe',
        details: 'Set full day for Monday',
        date: '2024-01-01',
        hours: 7
      }
    ],
    quickStats: {
      averageUtilization: 40,
      membersWithIncompleteHours: 1,
      totalHoursThisWeek: 28,
      sprintHealthStatus: 'warning' as const
    }
  };

  it('should convert accurate data to legacy format correctly', () => {
    const legacy = convertToLegacyFormat(mockAccurateData);
    
    // Team info
    expect(legacy.teamInfo.id).toBe(1);
    expect(legacy.teamInfo.name).toBe('Product Team');
    expect(legacy.teamInfo.managerName).toBe('John Doe');
    expect(legacy.teamInfo.memberCount).toBe(3);
    
    // Sprint summary
    expect(legacy.currentSprint.sprintNumber).toBe(5);
    expect(legacy.currentSprint.potentialHours).toBe(210);
    expect(legacy.currentSprint.plannedHours).toBe(84);
    expect(legacy.currentSprint.completionPercentage).toBe(40);
    expect(legacy.currentSprint.healthStatus).toBe('warning');
    expect(legacy.currentSprint.healthColor).toBe('#F59E0B');
    
    // Members
    expect(legacy.members).toHaveLength(1);
    const member = legacy.members[0];
    expect(member.name).toBe('John Doe');
    expect(member.isManager).toBe(true);
    expect(member.currentWeekStatus).toBe('available');
    expect(member.sprintPlannedHours).toBe(31.5);
    expect(member.individualCompletionPercentage).toBe(45);
    
    // Statistics
    expect(legacy.statistics.averageUtilization).toBe(40);
    expect(legacy.statistics.trendIndicator).toBe('stable');
    
    // Recent activity
    expect(legacy.recentActivity).toHaveLength(1);
    const activity = legacy.recentActivity[0];
    expect(activity.description).toBe('Updated availability');
    expect(activity.userName).toBe('John Doe');
    expect(activity.type).toBe('schedule_update');
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalData = {
      ...mockAccurateData,
      teamInfo: {
        ...mockAccurateData.teamInfo,
        description: undefined,
        managerName: undefined
      },
      memberStats: [
        {
          ...mockAccurateData.memberStats[0],
          hebrew: undefined,
          lastActivity: null
        }
      ]
    };
    
    const legacy = convertToLegacyFormat(minimalData);
    
    expect(legacy.teamInfo.description).toBeUndefined();
    expect(legacy.teamInfo.managerName).toBeUndefined();
    expect(legacy.members[0].hebrew).toBe('');
    expect(legacy.members[0].lastActivityTimestamp).toBeNull();
  });
});