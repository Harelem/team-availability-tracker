/**
 * Centralized Calculation Service
 * 
 * Provides standardized calculation methods for team availability and sprint capacity.
 * This service ensures consistency across all dashboard components and export utilities.
 * 
 * Standard Rules:
 * - Working days: Sunday (0) through Thursday (4) 
 * - Hours per day: 7 hours
 * - Sprint potential = team size × sprint working days × 7 hours per day
 * - Adjusted capacity = sprint potential × focus factor (0.8) - vacation hours - meeting hours
 * - Focus factor: 0.8 (80% of potential due to meetings, breaks, etc.)
 */

import { TeamMember, CurrentGlobalSprint, ScheduleEntry } from '@/types';

// Calculation Input Types
export interface SprintPotentialInput {
  teamMembers: TeamMember[];
  sprintDays: number;
  hoursPerDay?: number;
}

export interface AdjustedCapacityInput {
  potential: number;
  vacationHours: number;
  meetingHours: number;
  focusFactor?: number;
}

export interface WeeklyHoursInput {
  scheduleEntries: { [dateKey: string]: ScheduleEntry };
  weekStartDate: Date;
}

export interface SprintHoursInput {
  scheduleEntries: { [dateKey: string]: ScheduleEntry };
  sprintStartDate: Date;
  sprintEndDate: Date;
}

export interface TeamUtilizationInput {
  plannedHours: number;
  availableHours: number;
}

export interface CompletionPercentageInput {
  completedHours: number;
  plannedHours: number;
}

// Calculation Output Types
export interface SprintPotentialResult {
  totalPotential: number;
  teamSize: number;
  sprintDays: number;
  hoursPerDay: number;
  dailyTeamPotential: number;
}

export interface AdjustedCapacityResult {
  adjustedCapacity: number;
  originalPotential: number;
  focusFactorReduction: number;
  vacationReduction: number;
  meetingReduction: number;
  focusFactor: number;
  effectiveUtilization: number;
}

export interface WeeklyHoursResult {
  totalHours: number;
  workingDays: number;
  dailyBreakdown: { [dateKey: string]: number };
  averageDaily: number;
}

export interface SprintHoursResult {
  totalHours: number;
  sprintDays: number;
  dailyBreakdown: { [dateKey: string]: number };
  weeklyBreakdown: { [weekKey: string]: number };
  averageDaily: number;
}

export interface TeamUtilizationResult {
  utilization: number;
  plannedHours: number;
  availableHours: number;
  hoursGap: number;
  status: 'under' | 'optimal' | 'over';
  statusColor: string;
}

export interface CompletionPercentageResult {
  completionPercentage: number;
  completedHours: number;
  plannedHours: number;
  remainingHours: number;
  isOnTrack: boolean;
}

// Constants
export const CALCULATION_CONSTANTS = {
  HOURS_PER_DAY: 7,
  WORK_DAYS_PER_WEEK: 5,
  DEFAULT_FOCUS_FACTOR: 0.8,
  WORKING_DAYS: [0, 1, 2, 3, 4], // Sunday through Thursday
  OPTIMAL_UTILIZATION_MIN: 80,
  OPTIMAL_UTILIZATION_MAX: 95,
} as const;

/**
 * Centralized Calculation Service
 */
export class CalculationService {
  /**
   * Calculate sprint potential hours for a team
   * 
   * @param input - Team members, sprint days, and hours per day
   * @returns Sprint potential calculation result
   */
  static calculateSprintPotential(input: SprintPotentialInput): SprintPotentialResult {
    // Input validation
    if (!Array.isArray(input.teamMembers)) {
      throw new Error('Team members must be an array');
    }
    
    if (!Number.isInteger(input.sprintDays) || input.sprintDays <= 0) {
      throw new Error('Sprint days must be a positive integer');
    }
    
    const hoursPerDay = input.hoursPerDay ?? CALCULATION_CONSTANTS.HOURS_PER_DAY;
    if (hoursPerDay <= 0) {
      throw new Error('Hours per day must be positive');
    }
    
    const teamSize = input.teamMembers.length;
    const dailyTeamPotential = teamSize * hoursPerDay;
    const totalPotential = dailyTeamPotential * input.sprintDays;
    
    return {
      totalPotential,
      teamSize,
      sprintDays: input.sprintDays,
      hoursPerDay,
      dailyTeamPotential,
    };
  }
  
  /**
   * Calculate adjusted capacity after applying focus factor and deductions
   * 
   * @param input - Potential hours and deduction factors
   * @returns Adjusted capacity calculation result
   */
  static calculateAdjustedCapacity(input: AdjustedCapacityInput): AdjustedCapacityResult {
    // Input validation
    if (input.potential < 0) {
      throw new Error('Potential hours cannot be negative');
    }
    
    if (input.vacationHours < 0 || input.meetingHours < 0) {
      throw new Error('Vacation and meeting hours cannot be negative');
    }
    
    const focusFactor = input.focusFactor ?? CALCULATION_CONSTANTS.DEFAULT_FOCUS_FACTOR;
    if (focusFactor <= 0 || focusFactor > 1) {
      throw new Error('Focus factor must be between 0 and 1');
    }
    
    // Apply focus factor first
    const focusAdjustedPotential = input.potential * focusFactor;
    const focusFactorReduction = input.potential - focusAdjustedPotential;
    
    // Subtract vacation and meeting hours
    const adjustedCapacity = Math.max(0, focusAdjustedPotential - input.vacationHours - input.meetingHours);
    
    // Calculate effective utilization (what percentage of original potential is available)
    const effectiveUtilization = input.potential > 0 ? (adjustedCapacity / input.potential) * 100 : 0;
    
    return {
      adjustedCapacity,
      originalPotential: input.potential,
      focusFactorReduction,
      vacationReduction: input.vacationHours,
      meetingReduction: input.meetingHours,
      focusFactor,
      effectiveUtilization,
    };
  }
  
  /**
   * Calculate actual hours worked in a week from schedule entries
   * 
   * @param input - Schedule entries and week start date
   * @returns Weekly hours calculation result
   */
  static calculateWeeklyHours(input: WeeklyHoursInput): WeeklyHoursResult {
    // Input validation
    if (!input.scheduleEntries || typeof input.scheduleEntries !== 'object') {
      throw new Error('Schedule entries must be a valid object');
    }
    
    if (!(input.weekStartDate instanceof Date)) {
      throw new Error('Week start date must be a Date object');
    }
    
    // Get all working days for the week
    const weekDays = this.getWorkingDaysInWeek(input.weekStartDate);
    const dailyBreakdown: { [dateKey: string]: number } = {};
    let totalHours = 0;
    let workingDays = 0;
    
    weekDays.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const entry = input.scheduleEntries[dateKey];
      let dayHours = 0;
      
      if (entry && entry.value) {
        dayHours = this.getHoursFromScheduleValue(entry.value);
        workingDays++;
      }
      
      dailyBreakdown[dateKey] = dayHours;
      totalHours += dayHours;
    });
    
    const averageDaily = workingDays > 0 ? totalHours / workingDays : 0;
    
    return {
      totalHours,
      workingDays,
      dailyBreakdown,
      averageDaily,
    };
  }
  
  /**
   * Calculate actual hours worked in a sprint from schedule entries
   * 
   * @param input - Schedule entries and sprint date range
   * @returns Sprint hours calculation result
   */
  static calculateSprintHours(input: SprintHoursInput): SprintHoursResult {
    // Input validation
    if (!input.scheduleEntries || typeof input.scheduleEntries !== 'object') {
      throw new Error('Schedule entries must be a valid object');
    }
    
    if (!(input.sprintStartDate instanceof Date) || !(input.sprintEndDate instanceof Date)) {
      throw new Error('Sprint dates must be Date objects');
    }
    
    if (input.sprintStartDate >= input.sprintEndDate) {
      throw new Error('Sprint start date must be before end date');
    }
    
    // Get all working days in the sprint period
    const sprintDays = this.getWorkingDaysInPeriod(input.sprintStartDate, input.sprintEndDate);
    const dailyBreakdown: { [dateKey: string]: number } = {};
    const weeklyBreakdown: { [weekKey: string]: number } = {};
    let totalHours = 0;
    
    sprintDays.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const entry = input.scheduleEntries[dateKey];
      const dayHours = entry && entry.value ? this.getHoursFromScheduleValue(entry.value) : 0;
      
      dailyBreakdown[dateKey] = dayHours;
      totalHours += dayHours;
      
      // Add to weekly breakdown
      const weekKey = this.getWeekKey(date);
      weeklyBreakdown[weekKey] = (weeklyBreakdown[weekKey] || 0) + dayHours;
    });
    
    const averageDaily = sprintDays.length > 0 ? totalHours / sprintDays.length : 0;
    
    return {
      totalHours,
      sprintDays: sprintDays.length,
      dailyBreakdown,
      weeklyBreakdown,
      averageDaily,
    };
  }
  
  /**
   * Calculate team utilization percentage
   * 
   * @param input - Planned hours vs available hours
   * @returns Team utilization calculation result
   */
  static calculateTeamUtilization(input: TeamUtilizationInput): TeamUtilizationResult {
    // Input validation
    if (input.plannedHours < 0 || input.availableHours < 0) {
      throw new Error('Planned and available hours cannot be negative');
    }
    
    const utilization = input.availableHours > 0 ? (input.plannedHours / input.availableHours) * 100 : 0;
    const hoursGap = input.availableHours - input.plannedHours;
    
    // Determine status based on utilization
    let status: 'under' | 'optimal' | 'over';
    let statusColor: string;
    
    if (utilization > 100) {
      status = 'over';
      statusColor = 'text-red-600 bg-red-100';
    } else if (utilization >= CALCULATION_CONSTANTS.OPTIMAL_UTILIZATION_MIN) {
      status = 'optimal';
      statusColor = 'text-green-600 bg-green-100';
    } else {
      status = 'under';
      statusColor = 'text-yellow-600 bg-yellow-100';
    }
    
    return {
      utilization: Math.round(utilization * 100) / 100, // Round to 2 decimal places
      plannedHours: input.plannedHours,
      availableHours: input.availableHours,
      hoursGap,
      status,
      statusColor,
    };
  }
  
  /**
   * Calculate completion percentage
   * 
   * @param input - Completed hours vs planned hours
   * @returns Completion percentage calculation result
   */
  static calculateCompletionPercentage(input: CompletionPercentageInput): CompletionPercentageResult {
    // Input validation
    if (input.completedHours < 0 || input.plannedHours < 0) {
      throw new Error('Completed and planned hours cannot be negative');
    }
    
    const completionPercentage = input.plannedHours > 0 ? (input.completedHours / input.plannedHours) * 100 : 0;
    const remainingHours = Math.max(0, input.plannedHours - input.completedHours);
    
    // Consider "on track" if completion is >= 80% or if completed >= planned
    const isOnTrack = completionPercentage >= 80 || input.completedHours >= input.plannedHours;
    
    return {
      completionPercentage: Math.round(completionPercentage * 100) / 100, // Round to 2 decimal places
      completedHours: input.completedHours,
      plannedHours: input.plannedHours,
      remainingHours,
      isOnTrack,
    };
  }
  
  // Helper Methods
  
  /**
   * Get working days in a week starting from given date
   */
  private static getWorkingDaysInWeek(weekStartDate: Date): Date[] {
    const days: Date[] = [];
    const startOfWeek = new Date(weekStartDate);
    
    // Adjust to Sunday if not already
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    // Add Sunday through Thursday (working days)
    for (let i = 0; i < 5; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  }
  
  /**
   * Get all working days in a date period
   */
  private static getWorkingDaysInPeriod(startDate: Date, endDate: Date): Date[] {
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      // Check if it's a working day (Sunday = 0 through Thursday = 4)
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        days.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }
  
  /**
   * Convert schedule entry value to hours
   */
  private static getHoursFromScheduleValue(value: '1' | '0.5' | 'X'): number {
    switch (value) {
      case '1':
        return CALCULATION_CONSTANTS.HOURS_PER_DAY;
      case '0.5':
        return CALCULATION_CONSTANTS.HOURS_PER_DAY / 2;
      case 'X':
        return 0;
      default:
        return 0;
    }
  }
  
  /**
   * Get week key for grouping (YYYY-MM-DD format of week start)
   */
  private static getWeekKey(date: Date): string {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Go to Sunday
    return weekStart.toISOString().split('T')[0];
  }
}

// Utility Functions for Common Calculations

/**
 * Calculate working days between two dates (inclusive)
 */
export function calculateWorkingDaysBetween(startDate: Date, endDate: Date): number {
  if (startDate > endDate) {
    throw new Error('Start date must be before or equal to end date');
  }
  
  let workingDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Get sprint dates from current global sprint data
 */
export function getSprintDates(currentSprint: CurrentGlobalSprint): { startDate: Date; endDate: Date } {
  return {
    startDate: new Date(currentSprint.sprint_start_date),
    endDate: new Date(currentSprint.sprint_end_date),
  };
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  return `${Math.round(hours)}h`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number): string {
  return `${Math.round(percentage * 100) / 100}%`;
}

/**
 * Get utilization status color class
 */
export function getUtilizationStatusColor(utilization: number): string {
  if (utilization >= 100) return 'text-red-600 bg-red-100';
  if (utilization >= CALCULATION_CONSTANTS.OPTIMAL_UTILIZATION_MAX) return 'text-green-600 bg-green-100';
  if (utilization >= CALCULATION_CONSTANTS.OPTIMAL_UTILIZATION_MIN) return 'text-yellow-600 bg-yellow-100';
  return 'text-gray-600 bg-gray-100';
}