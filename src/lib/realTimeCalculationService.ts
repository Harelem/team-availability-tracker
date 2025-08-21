'use client';

import { DatabaseService } from './database';

export interface TeamCompletionStatus {
  totalMembers: number;
  completedMembers: number;
  completionPercentage: number;
  totalSubmittedHours: number;
  sprintPotentialHours: number;
  submissionPercentage: number;
}

export interface MemberCompletionDetails {
  memberId: number;
  memberName: string;
  isComplete: boolean;
  submittedHours: number;
  potentialHours: number;
  completionPercentage: number;
  lastSubmissionDate?: string;
  pendingDays: number;
}

export interface TeamMemberSubmissionStatus {
  memberId: number;
  memberName: string;
  hebrew: string;
  isManager: boolean;
  currentWeekStatus: 'complete' | 'partial' | 'missing';
  currentWeekHours: number;
  sprintSubmittedHours: number;
  sprintPotentialHours: number;
  sprintCompletionPercentage: number;
  lastActivityDate?: string;
  pendingEntries: number;
}

/**
 * Real-time calculation service that replaces all hardcoded percentages
 * with actual database queries and calculations
 */
export class RealTimeCalculationService {
  
  /**
   * Calculate real team completion status for the current sprint
   */
  static async getTeamCompletionStatus(teamId: number): Promise<TeamCompletionStatus> {
    try {
      // Get team members
      const teamMembers = await DatabaseService.getTeamMembers(teamId);
      const totalMembers = teamMembers.length;

      if (totalMembers === 0) {
        return {
          totalMembers: 0,
          completedMembers: 0,
          completionPercentage: 0,
          totalSubmittedHours: 0,
          sprintPotentialHours: 0,
          submissionPercentage: 0
        };
      }

      // Get current sprint dates
      const currentSprint = await DatabaseService.getCurrentGlobalSprint();
      if (!currentSprint) {
        throw new Error('No active sprint found');
      }

      const sprintRange = getCurrentSprintDateRange(currentSprint);
      const memberIds = teamMembers.map(m => m.id);

      // Get all schedule entries for the team in the current sprint
      const scheduleEntries = await DatabaseService.getScheduleEntriesBulk({
        memberIds,
        startDate: sprintRange.startDate,
        endDate: sprintRange.endDate
      });

      // Calculate working days in sprint (excluding weekends)
      const workingDays = this.getWorkingDaysInRange(sprintRange.startDate, sprintRange.endDate);
      const totalWorkingDays = workingDays.length;

      // Calculate potential hours (working days * members * 7 hours per day)
      const sprintPotentialHours = totalWorkingDays * totalMembers * 7;

      let completedMembers = 0;
      let totalSubmittedHours = 0;

      // Analyze each member's completion status
      for (const member of teamMembers) {
        const memberEntries = scheduleEntries.filter(entry => entry.member_id === member.id);
        const memberSubmittedDays = new Set(memberEntries.map(entry => entry.date)).size;
        const memberCompletionRate = totalWorkingDays > 0 ? memberSubmittedDays / totalWorkingDays : 0;

        // Member is considered "completed" if they have submitted 80% or more of their schedule
        if (memberCompletionRate >= 0.8) {
          completedMembers++;
        }

        // Calculate actual hours from member's entries
        for (const entry of memberEntries) {
          if (entry.value === '1') {
            totalSubmittedHours += 7;
          } else if (entry.value === '0.5') {
            totalSubmittedHours += 3.5;
          }
          // 'X' or absence entries contribute 0 hours
        }
      }

      const completionPercentage = totalMembers > 0 ? Math.round((completedMembers / totalMembers) * 100) : 0;
      const submissionPercentage = sprintPotentialHours > 0 ? Math.round((totalSubmittedHours / sprintPotentialHours) * 100) : 0;

      return {
        totalMembers,
        completedMembers,
        completionPercentage,
        totalSubmittedHours,
        sprintPotentialHours,
        submissionPercentage
      };

    } catch (error) {
      console.error('Error calculating team completion status:', error);
      
      // Return safe fallback values instead of throwing
      const teamMembers = await DatabaseService.getTeamMembers(teamId).catch(() => []);
      return {
        totalMembers: teamMembers.length,
        completedMembers: 0,
        completionPercentage: 0,
        totalSubmittedHours: 0,
        sprintPotentialHours: 0,
        submissionPercentage: 0
      };
    }
  }

  /**
   * Get detailed completion status for each team member
   */
  static async getTeamMemberSubmissionStatus(teamId: number): Promise<TeamMemberSubmissionStatus[]> {
    try {
      const teamMembers = await DatabaseService.getTeamMembers(teamId);
      
      if (teamMembers.length === 0) {
        return [];
      }

      // Get current sprint and week ranges
      const currentSprint = await DatabaseService.getCurrentGlobalSprint();
      if (!currentSprint) {
        throw new Error('No active sprint found');
      }

      const sprintRange = getCurrentSprintDateRange(currentSprint);
      const weekRange = getCurrentWeekDateRange();
      const memberIds = teamMembers.map(m => m.id);

      // Get schedule entries for both sprint and current week
      const [sprintEntries, weekEntries] = await Promise.all([
        DatabaseService.getScheduleEntriesBulk({
          memberIds,
          startDate: sprintRange.startDate,
          endDate: sprintRange.endDate
        }),
        DatabaseService.getScheduleEntriesBulk({
          memberIds,
          startDate: weekRange.startDate,
          endDate: weekRange.endDate
        })
      ]);

      const workingDaysInSprint = this.getWorkingDaysInRange(sprintRange.startDate, sprintRange.endDate);
      const workingDaysInWeek = this.getWorkingDaysInRange(weekRange.startDate, weekRange.endDate);

      const memberStatuses: TeamMemberSubmissionStatus[] = [];

      for (const member of teamMembers) {
        // Calculate sprint metrics
        const memberSprintEntries = sprintEntries.filter(entry => entry.member_id === member.id);
        const sprintSubmittedDays = new Set(memberSprintEntries.map(entry => entry.date)).size;
        const sprintPotentialHours = workingDaysInSprint.length * 7;
        
        let sprintSubmittedHours = 0;
        for (const entry of memberSprintEntries) {
          if (entry.value === '1') sprintSubmittedHours += 7;
          else if (entry.value === '0.5') sprintSubmittedHours += 3.5;
        }

        // Calculate current week metrics
        const memberWeekEntries = weekEntries.filter(entry => entry.member_id === member.id);
        const weekSubmittedDays = new Set(memberWeekEntries.map(entry => entry.date)).size;
        
        let currentWeekHours = 0;
        for (const entry of memberWeekEntries) {
          if (entry.value === '1') currentWeekHours += 7;
          else if (entry.value === '0.5') currentWeekHours += 3.5;
        }

        // Determine current week status
        const weekCompletionRate = workingDaysInWeek.length > 0 ? weekSubmittedDays / workingDaysInWeek.length : 0;
        let currentWeekStatus: 'complete' | 'partial' | 'missing';
        
        if (weekCompletionRate >= 0.9) {
          currentWeekStatus = 'complete';
        } else if (weekCompletionRate >= 0.3) {
          currentWeekStatus = 'partial';
        } else {
          currentWeekStatus = 'missing';
        }

        // Calculate pending entries (days not yet submitted in sprint)
        const pendingEntries = Math.max(0, workingDaysInSprint.length - sprintSubmittedDays);

        // Find last activity date
        const lastActivityDate = memberSprintEntries.length > 0 
          ? memberSprintEntries
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
              ?.created_at
          : undefined;

        const sprintCompletionPercentage = sprintPotentialHours > 0 
          ? Math.round((sprintSubmittedHours / sprintPotentialHours) * 100) 
          : 0;

        memberStatuses.push({
          memberId: member.id,
          memberName: member.name,
          hebrew: member.hebrew,
          isManager: member.isManager,
          currentWeekStatus,
          currentWeekHours,
          sprintSubmittedHours,
          sprintPotentialHours,
          sprintCompletionPercentage,
          lastActivityDate,
          pendingEntries
        });
      }

      // Sort by managers first, then by completion status
      return memberStatuses.sort((a, b) => {
        if (a.isManager && !b.isManager) return -1;
        if (!a.isManager && b.isManager) return 1;
        return b.sprintCompletionPercentage - a.sprintCompletionPercentage;
      });

    } catch (error) {
      console.error('Error getting team member submission status:', error);
      
      // Return basic member info as fallback
      try {
        const teamMembers = await DatabaseService.getTeamMembers(teamId);
        return teamMembers.map(member => ({
          memberId: member.id,
          memberName: member.name,
          hebrew: member.hebrew,
          isManager: member.isManager,
          currentWeekStatus: 'missing' as const,
          currentWeekHours: 0,
          sprintSubmittedHours: 0,
          sprintPotentialHours: 0,
          sprintCompletionPercentage: 0,
          pendingEntries: 0
        }));
      } catch {
        return [];
      }
    }
  }

  /**
   * Calculate company-wide completion rates
   */
  static async getCompanyCompletionStatus(): Promise<{
    totalMembers: number;
    completedMembers: number;
    completionRate: number;
    totalTeams: number;
    teamsData: Array<{
      id: number;
      name: string;
      totalMembers: number;
      completedMembers: number;
      completionRate: number;
      status: 'excellent' | 'good' | 'needs_attention' | 'critical';
    }>;
  }> {
    try {
      const teams = await DatabaseService.getOperationalTeams();
      
      let totalMembersCompany = 0;
      let totalCompletedCompany = 0;
      const teamsData = [];

      for (const team of teams) {
        try {
          const teamStatus = await this.getTeamCompletionStatus(team.id);
          
          totalMembersCompany += teamStatus.totalMembers;
          totalCompletedCompany += teamStatus.completedMembers;

          let status: 'excellent' | 'good' | 'needs_attention' | 'critical';
          if (teamStatus.completionPercentage >= 90) {
            status = 'excellent';
          } else if (teamStatus.completionPercentage >= 75) {
            status = 'good';
          } else if (teamStatus.completionPercentage >= 50) {
            status = 'needs_attention';
          } else {
            status = 'critical';
          }

          teamsData.push({
            id: team.id,
            name: team.name,
            totalMembers: teamStatus.totalMembers,
            completedMembers: teamStatus.completedMembers,
            completionRate: teamStatus.completionPercentage,
            status
          });

        } catch (error) {
          console.warn(`Failed to get completion status for team ${team.name}:`, error);
          
          // Add team with zero data to show it exists
          teamsData.push({
            id: team.id,
            name: team.name,
            totalMembers: 0,
            completedMembers: 0,
            completionRate: 0,
            status: 'critical'
          });
        }
      }

      const companyCompletionRate = totalMembersCompany > 0 
        ? Math.round((totalCompletedCompany / totalMembersCompany) * 100)
        : 0;

      return {
        totalMembers: totalMembersCompany,
        completedMembers: totalCompletedCompany,
        completionRate: companyCompletionRate,
        totalTeams: teams.length,
        teamsData
      };

    } catch (error) {
      console.error('Error calculating company completion status:', error);
      
      return {
        totalMembers: 0,
        completedMembers: 0,
        completionRate: 0,
        totalTeams: 0,
        teamsData: []
      };
    }
  }

  /**
   * Get working days in a date range (excluding Israeli weekends: Friday-Saturday)
   */
  static getWorkingDaysInRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      // Skip Friday (5) and Saturday (6) - Israeli weekend
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  }

  /**
   * Calculate individual member completion details
   */
  static async getMemberCompletionDetails(memberId: number, teamId?: number): Promise<MemberCompletionDetails | null> {
    try {
      // Get member info
      const teamMembers = teamId 
        ? await DatabaseService.getTeamMembers(teamId)
        : await DatabaseService.getAllMembers();
      
      const member = teamMembers.find(m => m.id === memberId);
      if (!member) {
        return null;
      }

      // Get current sprint
      const currentSprint = await DatabaseService.getCurrentGlobalSprint();
      if (!currentSprint) {
        throw new Error('No active sprint found');
      }

      const sprintRange = getCurrentSprintDateRange(currentSprint);
      
      // Get member's schedule entries for the sprint
      const scheduleEntries = await DatabaseService.getScheduleEntriesBulk({
        memberIds: [memberId],
        startDate: sprintRange.startDate,
        endDate: sprintRange.endDate
      });

      const workingDays = this.getWorkingDaysInRange(sprintRange.startDate, sprintRange.endDate);
      const potentialHours = workingDays.length * 7;
      
      let submittedHours = 0;
      const submittedDays = new Set(scheduleEntries.map(entry => entry.date));
      
      for (const entry of scheduleEntries) {
        if (entry.value === '1') submittedHours += 7;
        else if (entry.value === '0.5') submittedHours += 3.5;
      }

      const completionPercentage = potentialHours > 0 ? Math.round((submittedHours / potentialHours) * 100) : 0;
      const isComplete = submittedDays.size >= workingDays.length * 0.8; // 80% of days submitted
      const pendingDays = Math.max(0, workingDays.length - submittedDays.size);
      
      const lastSubmissionDate = scheduleEntries.length > 0
        ? scheduleEntries
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            ?.date
        : undefined;

      return {
        memberId: member.id,
        memberName: member.name,
        isComplete,
        submittedHours,
        potentialHours,
        completionPercentage,
        lastSubmissionDate,
        pendingDays
      };

    } catch (error) {
      console.error('Error getting member completion details:', error);
      return null;
    }
  }
}

// Add date utility functions if they don't exist
function getCurrentWeekDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = now.getDay();
  const diff = now.getDate() - day; // Start from Sunday
  startOfWeek.setDate(diff);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return {
    startDate: startOfWeek.toISOString().split('T')[0],
    endDate: endOfWeek.toISOString().split('T')[0]
  };
}

function getCurrentSprintDateRange(sprint: any): { startDate: string; endDate: string } {
  const startDate = new Date(sprint.sprint_start_date);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (sprint.sprint_length_weeks * 7) - 1);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}