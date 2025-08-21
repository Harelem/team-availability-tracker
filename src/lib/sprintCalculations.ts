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

// Sprint Calculation Constants - Central source of truth for all sprint calculations
export const SPRINT_CALCULATION_CONSTANTS = {
  HOURS_PER_DAY: 7,
  WORKING_DAYS_PER_WEEK: 5,
  HOURS_PER_PERSON_PER_WEEK: 35, // 5 days × 7 hours = 35 hours
  WORKING_DAYS: [0, 1, 2, 3, 4], // Sunday through Thursday (Israeli work week)
  WEEKEND_DAYS: [5, 6], // Friday and Saturday
} as const;

export class SprintCalculations {
  private static readonly HOURS_PER_DAY = SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY;
  
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
   * Calculate only working days (Sunday-Thursday) in sprint - Israeli work week
   */
  static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Use central constants for working days (Sunday through Thursday)
      if (SPRINT_CALCULATION_CONSTANTS.WORKING_DAYS.includes(dayOfWeek as 0 | 1 | 2 | 3 | 4)) {
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
      // Use central constants for working days (Sunday through Thursday)
      if (SPRINT_CALCULATION_CONSTANTS.WORKING_DAYS.includes(dayOfWeek as 0 | 1 | 2 | 3 | 4)) {
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
 * Validation utility functions for sprint calculations
 */
export class SprintCalculationValidator {
  /**
   * Validate that calculated hours match expected 35 hours per person per week
   */
  static validateHoursPerWeek(
    teamSize: number,
    sprintWeeks: number,
    calculatedHours: number
  ): { isValid: boolean; expectedHours: number; message: string } {
    const expectedHours = teamSize * sprintWeeks * SPRINT_CALCULATION_CONSTANTS.HOURS_PER_PERSON_PER_WEEK;
    const isValid = calculatedHours === expectedHours;
    
    return {
      isValid,
      expectedHours,
      message: isValid 
        ? `✓ Calculation correct: ${teamSize} people × ${sprintWeeks} weeks × 35h/week = ${expectedHours}h`
        : `❌ Calculation error: Expected ${expectedHours}h but got ${calculatedHours}h`
    };
  }

  /**
   * Validate working days calculation for a date range
   */
  static validateWorkingDays(
    startDate: string,
    endDate: string,
    calculatedDays: number
  ): { isValid: boolean; expectedDays: number; message: string } {
    const expectedDays = SprintCalculations.calculateWorkingDays(startDate, endDate);
    const isValid = calculatedDays === expectedDays;
    
    return {
      isValid,
      expectedDays,
      message: isValid
        ? `✓ Working days correct: ${expectedDays} days (Sunday-Thursday)`
        : `❌ Working days error: Expected ${expectedDays} but got ${calculatedDays}`
    };
  }

  /**
   * Comprehensive sprint calculation validation
   */
  static validateSprintCalculation(
    teamSize: number,
    startDate: string,
    endDate: string,
    calculatedPotential: number
  ): { isValid: boolean; errors: string[]; warnings: string[]; details: any } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Calculate expected values
    const workingDays = SprintCalculations.calculateWorkingDays(startDate, endDate);
    const expectedPotential = teamSize * workingDays * SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY;
    const sprintWeeks = Math.ceil(workingDays / SPRINT_CALCULATION_CONSTANTS.WORKING_DAYS_PER_WEEK);
    
    // Validate potential hours
    if (calculatedPotential !== expectedPotential) {
      errors.push(`Sprint potential mismatch: Expected ${expectedPotential}h, got ${calculatedPotential}h`);
    }
    
    // Validate hours per week consistency
    const hoursPerWeek = calculatedPotential / teamSize / sprintWeeks;
    if (Math.abs(hoursPerWeek - SPRINT_CALCULATION_CONSTANTS.HOURS_PER_PERSON_PER_WEEK) > 0.1) {
      errors.push(`Hours per week inconsistent: Expected 35h/person/week, calculated ${hoursPerWeek.toFixed(1)}h`);
    }
    
    // Warnings for edge cases
    if (workingDays < 5) {
      warnings.push('Sprint duration less than 1 week may lead to inaccurate capacity planning');
    }
    
    if (teamSize > 12) {
      warnings.push('Large team size (>12) may have coordination overhead affecting actual capacity');
    }
    
    if (workingDays > 60) {
      warnings.push('Long sprint duration (>12 weeks) increases uncertainty in capacity planning');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        teamSize,
        workingDays,
        sprintWeeks,
        expectedPotential,
        calculatedPotential,
        hoursPerDay: SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY,
        hoursPerWeek: SPRINT_CALCULATION_CONSTANTS.HOURS_PER_PERSON_PER_WEEK,
        breakdown: `${teamSize} people × ${workingDays} working days × ${SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY}h/day = ${expectedPotential}h`
      }
    };
  }
}

/**
 * Example usage and validation
 */
export const SPRINT_CALCULATION_EXAMPLES = {
  // Product Team: 8 members, 2 weeks (10 working days)
  productTeam: {
    members: 8,
    workingDays: 10,
    expectedPotential: 8 * 10 * SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY, // 560 hours
  },
  
  // Dev Team Tal: 4 members, 2 weeks (10 working days)  
  devTeamTal: {
    members: 4,
    workingDays: 10,
    expectedPotential: 4 * 10 * SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY, // 280 hours
  },
  
  // Infrastructure Team: 6 members, 3 weeks (15 working days)
  infraTeam: {
    members: 6,
    workingDays: 15,
    expectedPotential: 6 * 15 * SPRINT_CALCULATION_CONSTANTS.HOURS_PER_DAY, // 630 hours
  }
};