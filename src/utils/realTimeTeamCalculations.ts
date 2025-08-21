/**
 * Real-time Team Calculation Utilities
 * 
 * This module provides functions to calculate team statistics and member completion
 * status using real database data instead of placeholder/mock calculations.
 * 
 * Replaces all hardcoded percentages and static calculations with dynamic,
 * sprint-aware database queries.
 */

import { DatabaseService } from '@/lib/database';
import { TeamMember, CurrentGlobalSprint, ScheduleEntry } from '@/types';

export interface TeamCompletionStats {
  totalMembers: number;
  completedMembers: number;
  partialMembers: number;
  incompletemembers: number;
  completionPercentage: number;
  totalSubmittedHours: number;
  sprintPotentialHours: number;
  capacityUtilization: number;
  memberStatuses: MemberCompletionStatus[];
}

export interface MemberCompletionStatus {
  memberId: number;
  name: string;
  hebrew?: string;
  isManager: boolean;
  submittedHours: number;
  potentialHours: number;
  completionPercentage: number;
  status: 'complete' | 'partial' | 'incomplete';
  lastSubmissionDate?: string;
}

export interface SprintWorkingDays {
  dates: Date[];
  totalDays: number;
  remainingDays: number;
  isWeekend: (date: Date) => boolean;
}

/**
 * Calculate working days for a sprint, excluding Israeli weekends (Friday-Saturday)
 */
export function calculateSprintWorkingDays(currentSprint: CurrentGlobalSprint | null): SprintWorkingDays {
  if (!currentSprint) {
    return {
      dates: [],
      totalDays: 0,
      remainingDays: 0,
      isWeekend: () => false
    };
  }

  const dates: Date[] = [];
  const start = new Date(currentSprint.sprint_start_date || Date.now());
  const end = new Date(currentSprint.sprint_end_date || Date.now() + 14 * 24 * 60 * 60 * 1000);
  const today = new Date();
  
  // Calculate all working days in sprint
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    // Skip Friday (5) and Saturday (6) - Israeli weekend
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      dates.push(new Date(d));
    }
  }

  // Calculate remaining working days from today
  let remainingDays = 0;
  for (let d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      remainingDays++;
    }
  }

  return {
    dates,
    totalDays: dates.length,
    remainingDays,
    isWeekend: (date: Date) => {
      const day = date.getDay();
      return day === 5 || day === 6; // Friday or Saturday
    }
  };
}

/**
 * Calculate actual team completion statistics using real database data
 */
export async function calculateRealTeamCompletionStats(
  teamMembers: TeamMember[],
  currentSprint: CurrentGlobalSprint | null
): Promise<TeamCompletionStats> {
  // Calculate working days
  const sprintDays = calculateSprintWorkingDays(currentSprint);
  const potentialHoursPerMember = sprintDays.totalDays * 7; // 7 hours per working day
  const totalPotentialHours = teamMembers.length * potentialHoursPerMember;

  if (!currentSprint || sprintDays.totalDays === 0) {
    // Return default stats if no sprint data
    return {
      totalMembers: teamMembers.length,
      completedMembers: 0,
      partialMembers: 0,
      incompletemembers: teamMembers.length,
      completionPercentage: 0,
      totalSubmittedHours: 0,
      sprintPotentialHours: totalPotentialHours,
      capacityUtilization: 0,
      memberStatuses: teamMembers.map(member => ({
        memberId: member.id,
        name: member.name,
        hebrew: member.hebrew,
        isManager: member.isManager,
        submittedHours: 0,
        potentialHours: potentialHoursPerMember,
        completionPercentage: 0,
        status: 'incomplete' as const,
      }))
    };
  }

  try {
    // Get actual schedule data for the sprint period
    const startDate = new Date(currentSprint.sprint_start_date).toISOString().split('T')[0];
    const endDate = new Date(currentSprint.sprint_end_date).toISOString().split('T')[0];
    
    // Get all schedule entries for the sprint period
    const scheduleData = await DatabaseService.getScheduleEntries(startDate, endDate);
    
    let totalSubmittedHours = 0;
    const memberStatuses: MemberCompletionStatus[] = [];
    let completedMembers = 0;
    let partialMembers = 0;
    let incompleteMembers = 0;

    // Calculate stats for each team member
    for (const member of teamMembers) {
      const memberSchedule = scheduleData[member.id] || {};
      let memberSubmittedHours = 0;
      let lastSubmissionDate: string | undefined;

      // Calculate submitted hours for this member
      for (const dateStr of Object.keys(memberSchedule)) {
        const entry = memberSchedule[dateStr];
        if (entry) {
          if (entry.value === '1') {
            memberSubmittedHours += 7;
          } else if (entry.value === '0.5') {
            memberSubmittedHours += 3.5;
          }
          // Track the most recent submission
          if (!lastSubmissionDate || dateStr > lastSubmissionDate) {
            lastSubmissionDate = dateStr;
          }
        }
      }

      totalSubmittedHours += memberSubmittedHours;
      
      // Calculate completion percentage for this member
      const memberCompletionPercentage = potentialHoursPerMember > 0 
        ? Math.round((memberSubmittedHours / potentialHoursPerMember) * 100)
        : 0;

      // Determine completion status
      let status: 'complete' | 'partial' | 'incomplete';
      if (memberCompletionPercentage >= 90) {
        status = 'complete';
        completedMembers++;
      } else if (memberCompletionPercentage >= 50) {
        status = 'partial';
        partialMembers++;
      } else {
        status = 'incomplete';
        incompleteMembers++;
      }

      memberStatuses.push({
        memberId: member.id,
        name: member.name,
        hebrew: member.hebrew,
        isManager: member.isManager,
        submittedHours: memberSubmittedHours,
        potentialHours: potentialHoursPerMember,
        completionPercentage: memberCompletionPercentage,
        status,
        lastSubmissionDate
      });
    }

    const overallCompletionPercentage = teamMembers.length > 0 
      ? Math.round((completedMembers / teamMembers.length) * 100)
      : 0;

    const capacityUtilization = totalPotentialHours > 0
      ? Math.round((totalSubmittedHours / totalPotentialHours) * 100)
      : 0;

    return {
      totalMembers: teamMembers.length,
      completedMembers,
      partialMembers,
      incompletemembers: incompleteMembers,
      completionPercentage: overallCompletionPercentage,
      totalSubmittedHours,
      sprintPotentialHours: totalPotentialHours,
      capacityUtilization,
      memberStatuses
    };

  } catch (error) {
    console.error('Error calculating real team completion stats:', error);
    
    // Return default stats on error
    return {
      totalMembers: teamMembers.length,
      completedMembers: 0,
      partialMembers: 0,
      incompletemembers: teamMembers.length,
      completionPercentage: 0,
      totalSubmittedHours: 0,
      sprintPotentialHours: totalPotentialHours,
      capacityUtilization: 0,
      memberStatuses: teamMembers.map(member => ({
        memberId: member.id,
        name: member.name,
        hebrew: member.hebrew,
        isManager: member.isManager,
        submittedHours: 0,
        potentialHours: potentialHoursPerMember,
        completionPercentage: 0,
        status: 'incomplete' as const,
      }))
    };
  }
}

/**
 * Get real-time team member submission status for COO dashboard
 */
export async function getTeamMemberSubmissionStatus(
  teamId: number,
  currentSprint: CurrentGlobalSprint | null
): Promise<{
  totalMembers: number;
  submittedMembers: number;
  submissionRate: number;
  lastUpdateTime: string;
}> {
  if (!currentSprint) {
    return {
      totalMembers: 0,
      submittedMembers: 0,
      submissionRate: 0,
      lastUpdateTime: new Date().toISOString()
    };
  }

  try {
    // Get team members
    const teamMembers = await DatabaseService.getTeamMembers(teamId);
    
    // Get sprint date range
    const startDate = new Date(currentSprint.sprint_start_date).toISOString().split('T')[0];
    const endDate = new Date(currentSprint.sprint_end_date).toISOString().split('T')[0];
    
    // Get schedule entries
    const scheduleData = await DatabaseService.getScheduleEntries(startDate, endDate, teamId);
    
    // Count members who have submitted at least one entry
    let submittedMembers = 0;
    for (const member of teamMembers) {
      const memberSchedule = scheduleData[member.id];
      if (memberSchedule && Object.keys(memberSchedule).length > 0) {
        submittedMembers++;
      }
    }

    const submissionRate = teamMembers.length > 0 
      ? Math.round((submittedMembers / teamMembers.length) * 100)
      : 0;

    return {
      totalMembers: teamMembers.length,
      submittedMembers,
      submissionRate,
      lastUpdateTime: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error getting team member submission status:', error);
    return {
      totalMembers: 0,
      submittedMembers: 0,
      submissionRate: 0,
      lastUpdateTime: new Date().toISOString()
    };
  }
}

/**
 * Calculate real capacity utilization across all teams for COO dashboard
 */
export async function calculateCrossTeamCapacityUtilization(
  currentSprint: CurrentGlobalSprint | null
): Promise<{
  totalCapacity: number;
  utilizedCapacity: number;
  utilizationPercentage: number;
  teamBreakdown: Array<{
    teamId: number;
    teamName: string;
    capacity: number;
    utilized: number;
    utilization: number;
  }>;
}> {
  if (!currentSprint) {
    return {
      totalCapacity: 0,
      utilizedCapacity: 0,
      utilizationPercentage: 0,
      teamBreakdown: []
    };
  }

  try {
    // Get all teams
    const teams = await DatabaseService.getTeams();
    const sprintDays = calculateSprintWorkingDays(currentSprint);
    
    const startDate = new Date(currentSprint.sprint_start_date).toISOString().split('T')[0];
    const endDate = new Date(currentSprint.sprint_end_date).toISOString().split('T')[0];
    
    let totalCapacity = 0;
    let utilizedCapacity = 0;
    const teamBreakdown = [];

    for (const team of teams) {
      // Get team members
      const teamMembers = await DatabaseService.getTeamMembers(team.id);
      const teamCapacity = teamMembers.length * sprintDays.totalDays * 7;
      
      // Get actual utilization
      const scheduleData = await DatabaseService.getScheduleEntries(startDate, endDate, team.id);
      let teamUtilized = 0;
      
      Object.values(scheduleData).forEach((memberData: any) => {
        Object.values(memberData || {}).forEach((entry: any) => {
          if (entry.value === '1') teamUtilized += 7;
          else if (entry.value === '0.5') teamUtilized += 3.5;
        });
      });

      totalCapacity += teamCapacity;
      utilizedCapacity += teamUtilized;
      
      teamBreakdown.push({
        teamId: team.id,
        teamName: team.name,
        capacity: teamCapacity,
        utilized: teamUtilized,
        utilization: teamCapacity > 0 ? Math.round((teamUtilized / teamCapacity) * 100) : 0
      });
    }

    const utilizationPercentage = totalCapacity > 0 
      ? Math.round((utilizedCapacity / totalCapacity) * 100)
      : 0;

    return {
      totalCapacity,
      utilizedCapacity,
      utilizationPercentage,
      teamBreakdown
    };

  } catch (error) {
    console.error('Error calculating cross-team capacity utilization:', error);
    return {
      totalCapacity: 0,
      utilizedCapacity: 0,
      utilizationPercentage: 0,
      teamBreakdown: []
    };
  }
}