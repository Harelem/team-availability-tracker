/**
 * Standardized Sprint Calculations
 * Provides accurate sprint capacity and progress calculations
 */

export interface SprintMetrics {
  potentialHours: number;
  actualPlannedHours: number;
  completionPercentage: number;
  workingDays: number;
  teamSize: number;
}

export interface SprintProgress {
  sprintProgressPercentage: number;
  daysRemaining: number;
  isOnTrack: boolean;
}

export class SprintCalculations {
  private static readonly HOURS_PER_DAY = 7;
  
  /**
   * Calculate sprint potential hours correctly
   * Formula: Number of team members × Working days in sprint × 7 hours per day
   */
  static calculateSprintPotential(
    teamMemberCount: number,
    sprintStartDate: string,
    sprintEndDate: string
  ): number {
    const workingDays = this.calculateWorkingDays(sprintStartDate, sprintEndDate);
    return teamMemberCount * workingDays * this.HOURS_PER_DAY;
  }

  /**
   * Calculate only working days (Monday-Friday) in sprint
   */
  static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 1 = Monday, 5 = Friday (working days)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  /**
   * Calculate actual planned hours from schedule entries
   */
  static calculateActualPlannedHours(scheduleEntries: Array<{ hours: number | null }>): number {
    return scheduleEntries.reduce((total, entry) => {
      return total + (entry.hours || 0);
    }, 0);
  }

  /**
   * Calculate sprint completion percentage
   */
  static calculateCompletionPercentage(
    actualPlannedHours: number,
    sprintPotentialHours: number
  ): number {
    if (sprintPotentialHours === 0) return 0;
    return Math.round((actualPlannedHours / sprintPotentialHours) * 100);
  }

  /**
   * Get current sprint progress (what percentage of sprint time has passed)
   */
  static calculateSprintProgress(
    sprintStartDate: string,
    sprintEndDate: string
  ): number {
    const start = new Date(sprintStartDate);
    const end = new Date(sprintEndDate);
    const now = new Date();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.round((elapsed / totalDuration) * 100);
  }

  /**
   * Calculate days remaining in sprint (working days only)
   */
  static calculateDaysRemaining(sprintEndDate: string): number {
    const end = new Date(sprintEndDate);
    const now = new Date();
    
    if (now > end) return 0;
    
    let remainingDays = 0;
    const current = new Date(now);
    
    while (current < end) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        remainingDays++;
      }
    }
    
    return remainingDays;
  }

  /**
   * Determine sprint health status based on completion and progress
   */
  static getSprintHealthStatus(
    completionPercentage: number,
    sprintProgressPercentage: number,
    daysRemaining: number
  ): { status: 'excellent' | 'good' | 'warning' | 'critical'; color: string } {
    // Excellent: High completion rate and on track
    if (completionPercentage >= 90) {
      return { status: 'excellent', color: '#10B981' };
    }
    
    // Good: Decent completion rate
    if (completionPercentage >= 75) {
      return { status: 'good', color: '#059669' };
    }
    
    // Warning: Behind but still recoverable
    if (completionPercentage >= 50 || daysRemaining > 3) {
      return { status: 'warning', color: '#F59E0B' };
    }
    
    // Critical: Significantly behind with little time left
    return { status: 'critical', color: '#EF4444' };
  }

  /**
   * Calculate comprehensive sprint metrics for a team
   */
  static calculateSprintMetrics(
    teamMemberCount: number,
    sprintStartDate: string,
    sprintEndDate: string,
    scheduleEntries: Array<{ hours: number | null }>
  ): SprintMetrics {
    const potentialHours = this.calculateSprintPotential(
      teamMemberCount,
      sprintStartDate,
      sprintEndDate
    );
    
    const actualPlannedHours = this.calculateActualPlannedHours(scheduleEntries);
    
    const completionPercentage = this.calculateCompletionPercentage(
      actualPlannedHours,
      potentialHours
    );
    
    const workingDays = this.calculateWorkingDays(sprintStartDate, sprintEndDate);
    
    return {
      potentialHours,
      actualPlannedHours,
      completionPercentage,
      workingDays,
      teamSize: teamMemberCount
    };
  }

  /**
   * Calculate sprint progress information
   */
  static calculateSprintProgressInfo(
    sprintStartDate: string,
    sprintEndDate: string,
    completionPercentage: number
  ): SprintProgress {
    const sprintProgressPercentage = this.calculateSprintProgress(
      sprintStartDate,
      sprintEndDate
    );
    
    const daysRemaining = this.calculateDaysRemaining(sprintEndDate);
    
    // Consider sprint "on track" if completion is within reasonable range of progress
    const expectedCompletion = Math.max(20, sprintProgressPercentage * 0.8); // At least 80% of time progress
    const isOnTrack = completionPercentage >= expectedCompletion;
    
    return {
      sprintProgressPercentage,
      daysRemaining,
      isOnTrack
    };
  }
}

/**
 * Helper function to format hours for display
 */
export function formatHours(hours: number): string {
  return `${hours.toLocaleString()}h`;
}

/**
 * Helper function to format percentage for display
 */
export function formatPercentage(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

/**
 * Example usage and validation
 */
export const SPRINT_CALCULATION_EXAMPLES = {
  // Product Team: 8 members, 2 weeks (10 working days)
  productTeam: {
    members: 8,
    workingDays: 10,
    expectedPotential: 8 * 10 * 7, // 560 hours
  },
  
  // Dev Team Tal: 4 members, 2 weeks (10 working days)  
  devTeamTal: {
    members: 4,
    workingDays: 10,
    expectedPotential: 4 * 10 * 7, // 280 hours
  },
  
  // Infrastructure Team: 6 members, 3 weeks (15 working days)
  infraTeam: {
    members: 6,
    workingDays: 15,
    expectedPotential: 6 * 15 * 7, // 630 hours
  }
};