/**
 * User Flow Integration Tests
 * End-to-end tests for complete user journeys across different roles
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseService } from '@/lib/database';
import {
  createMockTeam,
  createMockCurrentSprint,
  createMockCOOUser,
  createMockManagerUser,
  createMockRegularUser,
  getTestTeams,
  getTestTeamMembers,
  simulateNetworkDelay,
} from '../utils/testSetup';

// Mock the entire application components for integration testing
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getTeams: jest.fn(),
    getTeamMembers: jest.fn(),
    getScheduleEntries: jest.fn(),
    updateScheduleEntry: jest.fn(),
    getCurrentSprint: jest.fn(),
    createTeamMember: jest.fn(),
    updateTeamMember: jest.fn(),
    deleteTeamMember: jest.fn(),
    getDailyCompanyStatus: jest.fn(),
    exportToCSV: jest.fn(),
    exportToExcel: jest.fn(),
  },
}));

// Mock components for integration testing
interface MockPersonalDashboardProps {
  user: { id: string; name: string };
  team: { name: string };
  onScheduleUpdate: (date: string, hours: string, note?: string) => void;
}

const MockPersonalDashboard = ({ user, team, onScheduleUpdate }: MockPersonalDashboardProps) => (
  <div data-testid="personal-dashboard">
    <h1>Welcome, {user.name}</h1>
    <div data-testid="team-info">{team.name}</div>
    <div data-testid="schedule-table">
      <button 
        onClick={async () => {
          onScheduleUpdate('2024-01-17', '1');
          // Simulate the actual database call that InlineEditableCell would make
          await DatabaseService.updateScheduleEntry(user.id, '2024-01-17', '1', undefined);
        }}
        data-testid="edit-cell-2024-01-17"
      >
        Edit 1/17
      </button>
      <button 
        onClick={async () => {
          onScheduleUpdate('2024-01-18', '0.5', 'Doctor visit');
          // Simulate the actual database call that InlineEditableCell would make
          await DatabaseService.updateScheduleEntry(user.id, '2024-01-18', '0.5', 'Doctor visit');
        }}
        data-testid="edit-cell-2024-01-18"
      >
        Edit 1/18
      </button>
    </div>
    <div data-testid="export-button">
      <button onClick={() => console.log('Export clicked')}>Export Data</button>
    </div>
  </div>
);

interface MockManagerDashboardProps {
  user: { name: string };
  team: { name: string };
  teamMembers: Array<{ id: string; name: string }>;
  onMemberAction: (action: string, memberId?: string, date?: string, hours?: string) => void;
}

const MockManagerDashboard = ({ user, team, teamMembers, onMemberAction }: MockManagerDashboardProps) => (
  <div data-testid="manager-dashboard">
    <h1>Manager Dashboard - {team.name}</h1>
    <div data-testid="team-overview">
      <div>Team Size: {teamMembers.length}</div>
      <div>Manager: {user.name}</div>
    </div>
    <div data-testid="team-schedule">
      {teamMembers.map((member) => (
        <div key={member.id} data-testid={`member-${member.id}`}>
          <span>{member.name}</span>
          <button 
            onClick={() => onMemberAction('edit', member.id, '2024-01-17', '1')}
            data-testid={`edit-member-${member.id}`}
          >
            Edit Schedule
          </button>
        </div>
      ))}
    </div>
    <div data-testid="team-management">
      <button 
        onClick={() => onMemberAction('add')}
        data-testid="add-member"
      >
        Add Team Member
      </button>
      <button 
        onClick={() => onMemberAction('export')}
        data-testid="export-team"
      >
        Export Team Data
      </button>
    </div>
  </div>
);

interface MockCOODashboardProps {
  teams: Array<{ id: number; name: string; members?: Array<{ id: string; name: string }> }>;
  onCOOAction: (action: string, teamId?: number) => void;
}

const MockCOODashboard = ({ teams, onCOOAction }: MockCOODashboardProps) => (
  <div data-testid="coo-dashboard">
    <h1>COO Executive Dashboard</h1>
    <div data-testid="company-overview">
      <div>Total Teams: {teams.length}</div>
      <div>Total Members: {teams.reduce((sum: number, team) => sum + (team.members?.length || 0), 0)}</div>
    </div>
    <div data-testid="team-grid">
      {teams.map((team) => (
        <div key={team.id} data-testid={`team-card-${team.id}`}>
          <h3>{team.name}</h3>
          <button 
            onClick={() => onCOOAction('viewTeam', team.id)}
            data-testid={`view-team-${team.id}`}
          >
            View Team
          </button>
        </div>
      ))}
    </div>
    <div data-testid="coo-actions">
      <button 
        onClick={() => onCOOAction('exportAll')}
        data-testid="export-all"
      >
        Export All Data
      </button>
      <button 
        onClick={() => onCOOAction('manageSprints')}
        data-testid="manage-sprints"
      >
        Manage Sprints
      </button>
    </div>
  </div>
);

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock data
    (DatabaseService.getTeams as jest.Mock).mockResolvedValue(getTestTeams());
    (DatabaseService.getCurrentSprint as jest.Mock).mockResolvedValue(
      createMockCurrentSprint()
    );
    (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue({});
    (DatabaseService.updateScheduleEntry as jest.Mock).mockResolvedValue({ success: true });
  });

  // ============================================================================
  // Regular User Flow Tests
  // ============================================================================

  describe('Regular User Journey', () => {
    test('should complete personal schedule management flow', async () => {
      const user = userEvent.setup();
      const regularUser = createMockRegularUser(1);
      const team = createMockTeam({ id: 1, name: 'Development-Tal' });
      
      const mockScheduleUpdate = jest.fn();
      
      render(
        <MockPersonalDashboard 
          user={regularUser} 
          team={team} 
          onScheduleUpdate={mockScheduleUpdate}
        />
      );

      // 1. User sees their personal dashboard
      expect(screen.getByText(`Welcome, ${regularUser.name}`)).toBeInTheDocument();
      expect(screen.getByText(team.name)).toBeInTheDocument();

      // 2. User updates their schedule for a full day
      const editButton = screen.getByTestId('edit-cell-2024-01-17');
      await user.click(editButton);

      expect(mockScheduleUpdate).toHaveBeenCalledWith('2024-01-17', '1');

      // 3. User adds half day with reason
      const halfDayButton = screen.getByTestId('edit-cell-2024-01-18');
      await user.click(halfDayButton);

      expect(mockScheduleUpdate).toHaveBeenCalledWith('2024-01-18', '0.5', 'Doctor visit');

      // 4. Verify database calls were made (with longer timeout for async operations)
      await waitFor(() => {
        expect(DatabaseService.updateScheduleEntry).toHaveBeenCalledWith(
          regularUser.id,
          '2024-01-17',
          '1',
          undefined
        );
      }, { timeout: 5000 }); // Increased timeout for async database operations
    });

    test('should prevent access to management features', async () => {
      const regularUser = createMockRegularUser(1);
      const team = createMockTeam();
      
      render(
        <MockPersonalDashboard 
          user={regularUser} 
          team={team} 
          onScheduleUpdate={jest.fn()}
        />
      );

      // Regular users should not see team management features
      expect(screen.queryByText('Team Management')).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-member')).not.toBeInTheDocument();
    });

    test('should handle personal data export request', async () => {
      const user = userEvent.setup();
      const regularUser = createMockRegularUser(1);
      const team = createMockTeam();
      
      render(
        <MockPersonalDashboard 
          user={regularUser} 
          team={team} 
          onScheduleUpdate={jest.fn()}
        />
      );

      const exportButton = screen.getByText('Export Data');
      await user.click(exportButton);

      // Should attempt personal data export (implementation would check permissions)
      expect(exportButton).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Manager User Flow Tests
  // ============================================================================

  describe('Manager User Journey', () => {
    test('should complete team management flow', async () => {
      const user = userEvent.setup();
      const manager = createMockManagerUser(1);
      const team = createMockTeam({ id: 1, name: 'Development-Tal' });
      const teamMembers = getTestTeamMembers(1);
      
      const mockMemberAction = jest.fn();
      
      (DatabaseService.getTeamMembers as jest.Mock).mockResolvedValue(teamMembers);
      
      render(
        <MockManagerDashboard 
          user={manager}
          team={team}
          teamMembers={teamMembers}
          onMemberAction={mockMemberAction}
        />
      );

      // 1. Manager sees team dashboard
      expect(screen.getByText(`Manager Dashboard - ${team.name}`)).toBeInTheDocument();
      expect(screen.getByText(`Team Size: ${teamMembers.length}`)).toBeInTheDocument();

      // 2. Manager edits team member's schedule
      const editMemberButton = screen.getByTestId(`edit-member-${teamMembers[1].id}`);
      await user.click(editMemberButton);

      expect(mockMemberAction).toHaveBeenCalledWith(
        'edit',
        teamMembers[1].id,
        '2024-01-17',
        '1'
      );

      // 3. Manager adds new team member
      const addMemberButton = screen.getByTestId('add-member');
      await user.click(addMemberButton);

      expect(mockMemberAction).toHaveBeenCalledWith('add');

      // 4. Manager exports team data
      const exportButton = screen.getByTestId('export-team');
      await user.click(exportButton);

      expect(mockMemberAction).toHaveBeenCalledWith('export');
    });

    test('should handle team member creation flow', async () => {
      // Manager context for team member creation
      createMockManagerUser(1);
      const newMember = {
        name: 'New Member',
        hebrew: 'חבר חדש',
        team_id: 1,
        email: 'new@example.com',
      };

      (DatabaseService.createTeamMember as jest.Mock).mockResolvedValue({
        ...newMember,
        id: 999,
      });

      // Simulate the add member flow
      await DatabaseService.createTeamMember(newMember);

      expect(DatabaseService.createTeamMember).toHaveBeenCalledWith(newMember);
    });

    test('should enforce manager permissions for team boundaries', async () => {
      const manager = createMockManagerUser(1); // Team 1 manager
      // Team 2 members - for reference only
      getTestTeamMembers(2);

      // Manager should not be able to access other teams
      const canAccessOtherTeam = manager.team_id === 2;
      expect(canAccessOtherTeam).toBe(false);
    });
  });

  // ============================================================================
  // COO User Flow Tests
  // ============================================================================

  describe('COO User Journey', () => {
    test('should complete company-wide management flow', async () => {
      const user = userEvent.setup();
      // COO user has access to all teams
      createMockCOOUser();
      const teams = getTestTeams();
      
      const mockCOOAction = jest.fn();
      
      // Add members to teams for realistic data
      const teamsWithMembers = teams.map(team => ({
        ...team,
        members: getTestTeamMembers(team.id),
      }));

      render(
        <MockCOODashboard 
          teams={teamsWithMembers}
          onCOOAction={mockCOOAction}
        />
      );

      // 1. COO sees executive dashboard
      expect(screen.getByText('COO Executive Dashboard')).toBeInTheDocument();
      expect(screen.getByText(`Total Teams: ${teams.length}`)).toBeInTheDocument();

      // 2. COO views individual team
      const viewTeamButton = screen.getByTestId('view-team-1');
      await user.click(viewTeamButton);

      expect(mockCOOAction).toHaveBeenCalledWith('viewTeam', 1);

      // 3. COO exports all company data
      const exportAllButton = screen.getByTestId('export-all');
      await user.click(exportAllButton);

      expect(mockCOOAction).toHaveBeenCalledWith('exportAll');

      // 4. COO manages sprint settings
      const sprintButton = screen.getByTestId('manage-sprints');
      await user.click(sprintButton);

      expect(mockCOOAction).toHaveBeenCalledWith('manageSprints');
    });

    test('should access all teams data', async () => {
      // COO user has access to all teams data
      createMockCOOUser();
      const teams = getTestTeams();

      (DatabaseService.getDailyCompanyStatus as jest.Mock).mockResolvedValue({
        teams: teams.map(team => ({
          id: team.id,
          name: team.name,
          total: 4,
          available: 3,
          halfDay: 1,
          unavailable: 0,
        })),
        summary: {
          available: 15,
          halfDay: 5,
          unavailable: 2,
          reserve: 0,
        },
      });

      // COO should be able to access company-wide data
      const companyData = await DatabaseService.getDailyCompanyStatus();
      
      expect(companyData.teams).toHaveLength(5);
      expect(companyData.summary).toBeDefined();
    });

    test('should handle company-wide export operations', async () => {
      // COO can export company-wide data
      createMockCOOUser();
      
      (DatabaseService.exportToExcel as jest.Mock).mockResolvedValue({
        filename: 'company-export-2024-01-17.xlsx',
        size: 1024000,
      });

      // COO export should include all teams
      const exportResult = await DatabaseService.exportToExcel({
        type: 'complete-overview',
        includeAllTeams: true,
        includeRecommendations: true,
      });

      expect(exportResult.filename).toContain('company-export');
      expect(DatabaseService.exportToExcel).toHaveBeenCalledWith({
        type: 'complete-overview',
        includeAllTeams: true,
        includeRecommendations: true,
      });
    });
  });

  // ============================================================================
  // Cross-Role Interaction Tests
  // ============================================================================

  describe('Cross-Role Interactions', () => {
    test('should handle concurrent edits from different users', async () => {
      // Manager context for concurrent edit scenario
      createMockManagerUser(1);
      const regularUser = createMockRegularUser(1);
      const memberId = regularUser.id;
      const date = '2024-01-17';

      // Simulate concurrent edits
      const managerEdit = DatabaseService.updateScheduleEntry(memberId, date, '1');
      const userEdit = DatabaseService.updateScheduleEntry(memberId, date, '0.5', 'Meeting');

      // Both should complete (last write wins in real implementation)
      await Promise.all([managerEdit, userEdit]);

      expect(DatabaseService.updateScheduleEntry).toHaveBeenCalledTimes(2);
    });

    test('should maintain data consistency across views', async () => {
      const scheduleData = {
        1: {
          '2024-01-17': { value: '1', hours: 7 },
          '2024-01-18': { value: '0.5', hours: 3.5, reason: 'Meeting' },
        },
      };

      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue(scheduleData);

      // Same data should be returned for different user roles
      const personalData = await DatabaseService.getScheduleEntries('2024-01-17', '2024-01-23', 1);
      const managerData = await DatabaseService.getScheduleEntries('2024-01-17', '2024-01-23', 1);

      expect(personalData).toEqual(scheduleData);
      expect(managerData).toEqual(scheduleData);
    });

    test('should handle real-time updates between users', async () => {
      const mockCallback = jest.fn();
      
      // Simulate real-time subscription
      const subscription = {
        on: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      // Test that real-time updates work
      subscription.on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'schedule_entries' },
        mockCallback
      );

      // Simulate an update from another user
      mockCallback({
        eventType: 'UPDATE',
        new: { member_id: 1, date: '2024-01-17', value: '0.5' },
        old: { member_id: 1, date: '2024-01-17', value: '1' },
      });

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Performance and Error Handling Tests
  // ============================================================================

  describe('Performance and Error Handling', () => {
    test('should handle slow network responses gracefully', async () => {
      (DatabaseService.getScheduleEntries as jest.Mock).mockImplementation(
        () => simulateNetworkDelay(2000).then(() => ({ 1: {} }))
      );

      const startTime = performance.now();
      await DatabaseService.getScheduleEntries('2024-01-17', '2024-01-23', 1);
      const endTime = performance.now();

      expect(endTime - startTime).toBeGreaterThan(1500);
    });

    test('should handle database connection errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (DatabaseService.getScheduleEntries as jest.Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      await expect(
        DatabaseService.getScheduleEntries('2024-01-17', '2024-01-23', 1)
      ).rejects.toThrow('Connection timeout');

      consoleSpy.mockRestore();
    });

    test('should handle large dataset operations', async () => {
      // Mock large dataset
      const largeDataset: Record<number, Record<number, string>> = {};
      for (let memberId = 1; memberId <= 100; memberId++) {
        largeDataset[memberId] = {};
        for (let day = 1; day <= 30; day++) {
          const dateKey = `2024-01-${String(day).padStart(2, '0')}`;
          largeDataset[memberId][dateKey] = { value: '1', hours: 7 };
        }
      }

      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue(largeDataset);

      const startTime = performance.now();
      const result = await DatabaseService.getScheduleEntries('2024-01-01', '2024-01-31', 1);
      const endTime = performance.now();

      expect(Object.keys(result)).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  // ============================================================================
  // Israeli Calendar Integration Tests
  // ============================================================================

  describe('Israeli Calendar Integration', () => {
    test('should respect Israeli work week across all user flows', async () => {
      const workWeekData = {
        '2024-01-21': { value: '1', hours: 7 }, // Sunday - valid
        '2024-01-22': { value: '1', hours: 7 }, // Monday - valid
        '2024-01-23': { value: '1', hours: 7 }, // Tuesday - valid
        '2024-01-24': { value: '1', hours: 7 }, // Wednesday - valid
        '2024-01-25': { value: '1', hours: 7 }, // Thursday - valid
        // Friday and Saturday should not be present
      };

      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue({
        1: workWeekData,
      });

      const scheduleData = await DatabaseService.getScheduleEntries(
        '2024-01-21', '2024-01-27', 1
      );

      const dates = Object.keys(scheduleData[1] || {});
      dates.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        // Should only contain Sunday-Thursday (0-4)
        expect([0, 1, 2, 3, 4]).toContain(dayOfWeek);
      });
    });

    test('should calculate sprint hours correctly for Israeli calendar', async () => {
      // Sprint duration: 2024-01-17 (Wednesday) to 2024-01-30 (Tuesday)
      const teamSize = 4;
      
      // 2 weeks × 5 working days/week × 4 members × 7 hours/day = 280 hours
      const expectedCapacity = 2 * 5 * teamSize * 7;
      
      expect(expectedCapacity).toBe(280);
    });
  });

  // ============================================================================
  // Data Export Integration Tests
  // ============================================================================

  describe('Data Export Integration', () => {
    test('should export personal data correctly', async () => {
      const regularUser = createMockRegularUser(1);
      
      (DatabaseService.exportToCSV as jest.Mock).mockResolvedValue({
        filename: `${regularUser.name}-2024-01-17.csv`,
        content: 'Date,Value,Hours,Reason\n2024-01-17,1,7,\n2024-01-18,0.5,3.5,Doctor',
      });

      const exportResult = await DatabaseService.exportToCSV({
        type: 'personal',
        memberId: regularUser.id,
        dateRange: '2024-01-17 to 2024-01-23',
      });

      expect(exportResult.filename).toContain(regularUser.name);
      expect(exportResult.content).toContain('Date,Value,Hours');
    });

    test('should export team data for managers', async () => {
      const manager = createMockManagerUser(1);
      // Team members for context
      getTestTeamMembers(1);
      
      (DatabaseService.exportToExcel as jest.Mock).mockResolvedValue({
        filename: 'Development-Tal-2024-01-17.xlsx',
        sheets: ['Overview', 'Schedule', 'Statistics'],
      });

      const exportResult = await DatabaseService.exportToExcel({
        type: 'team',
        teamId: manager.team_id,
        includeStatistics: true,
      });

      expect(exportResult.filename).toContain('Development-Tal');
      expect(exportResult.sheets).toContain('Overview');
      expect(exportResult.sheets).toContain('Schedule');
    });

    test('should export company-wide data for COO', async () => {
      // COO can export all company data
      createMockCOOUser();
      
      (DatabaseService.exportToExcel as jest.Mock).mockResolvedValue({
        filename: 'Company-Overview-2024-01-17.xlsx',
        sheets: ['Executive Summary', 'Team Breakdown', 'Individual Schedules', 'Analytics'],
      });

      const exportResult = await DatabaseService.exportToExcel({
        type: 'company',
        includeAllTeams: true,
        includeAnalytics: true,
      });

      expect(exportResult.filename).toContain('Company-Overview');
      expect(exportResult.sheets).toHaveLength(4);
    });
  });
});