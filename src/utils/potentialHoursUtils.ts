'use client';

import { TeamMember, Team, WeekData } from '@/types';
import { valueToHours } from './hoursCalculations';

/**
 * Potential Hours Calculation Utilities
 * 
 * Standard calculations:
 * - Member weekly potential: 35 hours (7 hours × 5 days)
 * - Team weekly potential: memberCount × 35 hours
 * - Company weekly potential: sum of all team potentials
 * - Sprint potential: weekly potential × sprint weeks
 * - Utilization: (actual hours / potential hours) × 100
 */

// Constants
export const HOURS_PER_DAY = 7;
export const WORK_DAYS_PER_WEEK = 5;
export const MEMBER_WEEKLY_POTENTIAL = HOURS_PER_DAY * WORK_DAYS_PER_WEEK; // 35 hours

export interface PotentialHoursCalculation {
  memberWeeklyPotential: number;
  teamWeeklyPotential: number;
  companyWeeklyPotential: number;
  teamSprintPotential: number;
  companySprintPotential: number;
  teamUtilization: number;
  companyUtilization: number;
}

export interface TeamPotentialHours {
  teamId: number;
  teamName: string;
  memberCount: number;
  weeklyPotential: number;
  actualHours: number;
  utilization: number;
  capacityGap: number;
  capacityStatus: 'optimal' | 'under' | 'over';
}

export interface CompanyPotentialSummary {
  totalTeams: number;
  totalMembers: number;
  weeklyPotential: number;
  actualHours: number;
  utilization: number;
  capacityGap: number;
  sprintPotential: number;
  sprintActual: number;
  sprintUtilization: number;
  teams: TeamPotentialHours[];
}

export interface SprintPotentialTracking {
  sprintNumber: number;
  sprintWeeks: number;
  totalSprintPotential: number;
  actualHoursToDate: number;
  projectedSprintTotal: number;
  sprintUtilization: number;
  weeklyBreakdown: {
    week: number;
    potential: number;
    actual: number;
    utilization: number;
  }[];
}

/**
 * Calculate member weekly potential hours
 */
export const calculateMemberWeeklyPotential = (): number => {
  return MEMBER_WEEKLY_POTENTIAL;
};

/**
 * Calculate team weekly potential hours
 */
export const calculateTeamWeeklyPotential = (memberCount: number): number => {
  return memberCount * MEMBER_WEEKLY_POTENTIAL;
};

/**
 * Calculate company weekly potential hours
 */
export const calculateCompanyWeeklyPotential = (teams: { memberCount: number }[]): number => {
  return teams.reduce((total, team) => total + calculateTeamWeeklyPotential(team.memberCount), 0);
};

/**
 * Calculate team sprint potential hours
 */
export const calculateTeamSprintPotential = (memberCount: number, sprintWeeks: number): number => {
  return calculateTeamWeeklyPotential(memberCount) * sprintWeeks;
};

/**
 * Calculate company sprint potential hours
 */
export const calculateCompanySprintPotential = (teams: { memberCount: number }[], sprintWeeks: number): number => {
  return teams.reduce((total, team) => total + calculateTeamSprintPotential(team.memberCount, sprintWeeks), 0);
};

/**
 * Calculate utilization percentage
 */
export const calculateUtilization = (actualHours: number, potentialHours: number): number => {
  if (potentialHours === 0) return 0;
  return Math.round((actualHours / potentialHours) * 100);
};

/**
 * Calculate capacity gap
 */
export const calculateCapacityGap = (potentialHours: number, actualHours: number): number => {
  return potentialHours - actualHours;
};

/**
 * Determine capacity status
 */
export const getCapacityStatus = (utilization: number): 'optimal' | 'under' | 'over' => {
  if (utilization > 100) return 'over';
  if (utilization < 80) return 'under';
  return 'optimal';
};

/**
 * Calculate actual hours from schedule data
 */
export const calculateActualHours = (scheduleData: WeekData, memberIds: number[], days: Date[]): number => {
  let totalHours = 0;
  
  memberIds.forEach(memberId => {
    const memberSchedule = scheduleData[memberId];
    if (!memberSchedule) return;
    
    days.forEach(day => {
      const dateKey = day.toISOString().split('T')[0];
      const entry = memberSchedule[dateKey];
      if (!entry) return;
      
      totalHours += valueToHours(entry.value);
    });
  });
  
  return totalHours;
};

/**
 * Calculate team potential hours with actual data
 */
export const calculateTeamPotentialHours = (
  team: Team,
  members: TeamMember[],
  scheduleData: WeekData,
  days: Date[]
): TeamPotentialHours => {
  const teamMembers = members.filter(m => m.team_id === team.id);
  const memberCount = teamMembers.length;
  const weeklyPotential = calculateTeamWeeklyPotential(memberCount);
  const actualHours = calculateActualHours(scheduleData, teamMembers.map(m => m.id), days);
  const utilization = calculateUtilization(actualHours, weeklyPotential);
  const capacityGap = calculateCapacityGap(weeklyPotential, actualHours);
  const capacityStatus = getCapacityStatus(utilization);
  
  return {
    teamId: team.id,
    teamName: team.name,
    memberCount,
    weeklyPotential,
    actualHours,
    utilization,
    capacityGap,
    capacityStatus
  };
};

/**
 * Calculate company-wide potential hours summary
 */
export const calculateCompanyPotentialSummary = (
  teams: Team[],
  allMembers: TeamMember[],
  scheduleData: WeekData,
  days: Date[]
): CompanyPotentialSummary => {
  const teamPotentials = teams.map(team => 
    calculateTeamPotentialHours(team, allMembers, scheduleData, days)
  );
  
  const totalTeams = teams.length;
  const totalMembers = allMembers.length;
  const weeklyPotential = teamPotentials.reduce((sum, team) => sum + team.weeklyPotential, 0);
  const actualHours = teamPotentials.reduce((sum, team) => sum + team.actualHours, 0);
  const utilization = calculateUtilization(actualHours, weeklyPotential);
  const capacityGap = calculateCapacityGap(weeklyPotential, actualHours);
  
  return {
    totalTeams,
    totalMembers,
    weeklyPotential,
    actualHours,
    utilization,
    capacityGap,
    sprintPotential: 0, // To be calculated with sprint data
    sprintActual: 0, // To be calculated with sprint data
    sprintUtilization: 0, // To be calculated with sprint data
    teams: teamPotentials
  };
};

/**
 * Calculate sprint potential tracking
 */
export const calculateSprintPotentialTracking = (
  teams: Team[],
  allMembers: TeamMember[],
  sprintData: { week: number; scheduleData: WeekData; days: Date[] }[],
  sprintNumber: number,
  sprintWeeks: number
): SprintPotentialTracking => {
  const totalMembers = allMembers.length;
  const weeklyPotential = calculateTeamWeeklyPotential(totalMembers);
  const totalSprintPotential = weeklyPotential * sprintWeeks;
  
  const weeklyBreakdown = sprintData.map(({ week, scheduleData, days }) => {
    const actualHours = calculateActualHours(scheduleData, allMembers.map(m => m.id), days);
    const utilization = calculateUtilization(actualHours, weeklyPotential);
    
    return {
      week,
      potential: weeklyPotential,
      actual: actualHours,
      utilization
    };
  });
  
  const actualHoursToDate = weeklyBreakdown.reduce((sum, week) => sum + week.actual, 0);
  const avgUtilization = weeklyBreakdown.length > 0 
    ? weeklyBreakdown.reduce((sum, week) => sum + week.utilization, 0) / weeklyBreakdown.length
    : 0;
  
  const projectedSprintTotal = totalSprintPotential * (avgUtilization / 100);
  const sprintUtilization = calculateUtilization(actualHoursToDate, totalSprintPotential);
  
  return {
    sprintNumber,
    sprintWeeks,
    totalSprintPotential,
    actualHoursToDate,
    projectedSprintTotal,
    sprintUtilization,
    weeklyBreakdown
  };
};

/**
 * Get capacity status color
 */
export const getCapacityStatusColor = (status: 'optimal' | 'under' | 'over'): string => {
  switch (status) {
    case 'optimal':
      return 'text-green-600 bg-green-100';
    case 'under':
      return 'text-yellow-600 bg-yellow-100';
    case 'over':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

/**
 * Get utilization color based on percentage
 */
export const getUtilizationColor = (percentage: number): string => {
  if (percentage >= 100) return 'text-red-600 bg-red-100';
  if (percentage >= 90) return 'text-green-600 bg-green-100';
  if (percentage >= 80) return 'text-yellow-600 bg-yellow-100';
  return 'text-gray-600 bg-gray-100';
};

/**
 * Format hours for display
 */
export const formatHours = (hours: number): string => {
  return `${Math.round(hours)}h`;
};

/**
 * Format percentage for display
 */
export const formatPercentage = (percentage: number): string => {
  return `${Math.round(percentage)}%`;
};

/**
 * Generate capacity optimization recommendations
 */
export const generateOptimizationRecommendations = (
  companyPotential: CompanyPotentialSummary
): string[] => {
  const recommendations: string[] = [];
  
  // Check for over-capacity teams
  const overCapacityTeams = companyPotential.teams.filter(team => team.capacityStatus === 'over');
  const underUtilizedTeams = companyPotential.teams.filter(team => team.capacityStatus === 'under');
  
  if (overCapacityTeams.length > 0) {
    overCapacityTeams.forEach(team => {
      recommendations.push(`${team.teamName}: ${formatHours(Math.abs(team.capacityGap))} over-committed - review sprint commitments`);
    });
  }
  
  if (underUtilizedTeams.length > 0) {
    underUtilizedTeams.forEach(team => {
      recommendations.push(`${team.teamName}: ${formatHours(team.capacityGap)} under-utilized - investigate capacity constraints`);
    });
  }
  
  // Cross-team balancing recommendations
  if (overCapacityTeams.length > 0 && underUtilizedTeams.length > 0) {
    recommendations.push('Consider redistributing work from over-capacity teams to under-utilized teams');
  }
  
  // Overall utilization recommendations
  if (companyPotential.utilization < 80) {
    recommendations.push('Overall company utilization is low - consider increasing sprint commitments');
  } else if (companyPotential.utilization > 95) {
    recommendations.push('Overall company utilization is high - monitor for burnout and sustainability');
  }
  
  return recommendations;
};