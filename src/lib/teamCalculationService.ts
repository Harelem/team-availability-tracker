/**
 * Team-Specific Calculation Service
 * 
 * Provides calculation methods specifically for individual team metrics.
 * Used by TeamSummaryOverview to display team-specific capacity metrics.
 * 
 * Based on the same calculation logic as COO dashboard but focused on single team.
 */

import { TeamMember, CurrentGlobalSprint, ScheduleEntry, TeamDashboardData, TeamMemberCapacityStatus } from '@/types';
import { DatabaseService } from './database';
import { debug } from '@/utils/debugLogger';

export interface TeamMetricsInput {
  teamId: number;
  teamMembers: TeamMember[];
  currentSprint: CurrentGlobalSprint | null;
  scheduleData?: { [memberId: number]: { [dateKey: string]: ScheduleEntry } };
}

export class TeamCalculationService {
  private static readonly HOURS_PER_DAY = 7;
  private static readonly WORKING_DAYS_PER_WEEK = 5;
  
  // Simple cache for team calculations to prevent redundant processing
  private static calculationCache = new Map<string, { data: TeamDashboardData; timestamp: number }>();
  private static readonly CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Generate cache key for team calculations
   */
  private static getCacheKey(input: TeamMetricsInput): string {
    const { teamId, currentSprint, scheduleData } = input;
    const scheduleHash = scheduleData ? Object.keys(scheduleData).length : 0;
    const sprintKey = currentSprint ? `${currentSprint.id}_${currentSprint.current_sprint_number}` : 'no_sprint';
    return `team_${teamId}_${sprintKey}_schedule_${scheduleHash}`;
  }

  /**
   * Check if cached data is still valid
   */
  private static isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Clear cache for specific team or all teams
   */
  static clearCache(teamId?: number): void {
    if (teamId) {
      // Clear cache for specific team
      const keysToDelete = Array.from(this.calculationCache.keys()).filter(key => 
        key.startsWith(`team_${teamId}_`)
      );
      keysToDelete.forEach(key => this.calculationCache.delete(key));
      debug(`Cleared cache for team ${teamId}`);
    } else {
      // Clear all cache
      this.calculationCache.clear();
      debug('Cleared all team calculation cache');
    }
  }

  /**
   * Calculate comprehensive team dashboard metrics
   */
  static async calculateTeamMetrics(input: TeamMetricsInput): Promise<TeamDashboardData> {
    const { teamId, teamMembers, currentSprint, scheduleData } = input;
    
    // Check cache first
    const cacheKey = this.getCacheKey(input);
    const cached = this.calculationCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      debug(`Using cached team metrics for team ${teamId}`);
      return cached.data;
    }
    
    debug(`Calculating fresh team metrics for team ${teamId}`);
    
    // Get team info
    const team = await DatabaseService.getTeamById(teamId);
    if (!team) {
      throw new Error(`Team with ID ${teamId} not found`);
    }

    // Calculate basic capacity metrics
    const memberCount = teamMembers.length;
    const managerCount = teamMembers.filter(m => m.isManager).length;
    
    // Calculate max capacity (theoretical maximum)
    const sprintWeeks = currentSprint?.sprint_length_weeks || 2;
    const maxCapacity = memberCount * sprintWeeks * this.WORKING_DAYS_PER_WEEK * this.HOURS_PER_DAY;
    
    // Calculate current week metrics
    const currentWeekMetrics = await this.calculateCurrentWeekMetrics(teamMembers, scheduleData);
    
    // Calculate sprint potential (max minus absences/reasons)
    const sprintPotential = await this.calculateSprintPotential(teamMembers, currentSprint, scheduleData);
    
    // Calculate sprint-to-date metrics for proper utilization
    const sprintToDateMetrics = await this.calculateSprintToDateMetrics(teamMembers, currentSprint, scheduleData);
    
    // Calculate sprint utilization (how much of our sprint-to-date potential we're using)
    const currentUtilization = sprintToDateMetrics.potentialHours > 0 ? (sprintToDateMetrics.actualHours / sprintToDateMetrics.potentialHours) * 100 : 0;
    
    // Debug logging available in development mode
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_CALCULATIONS === 'true') {
      console.log('=== SPRINT UTILIZATION DEBUG ===');
      console.log('Max Capacity:', maxCapacity, 'hours');
      console.log('Sprint Potential (available):', sprintPotential, 'hours');
      console.log('Sprint-to-date Actual:', sprintToDateMetrics.actualHours, 'hours');
      console.log('Sprint-to-date Potential:', sprintToDateMetrics.potentialHours, 'hours');
      console.log('Current Utilization:', currentUtilization.toFixed(2), '%');
      console.log('=== END DEBUG ===');
    }
    
    // Validation: Ensure utilization never exceeds 100%
    if (currentUtilization > 100) {
      console.warn('⚠️ UTILIZATION OVER 100%:', currentUtilization, '% - This indicates a calculation error');
      console.warn('Actual:', sprintToDateMetrics.actualHours, 'Potential:', sprintToDateMetrics.potentialHours);
      // Cap at 100% to prevent display issues
      // const currentUtilization = Math.min(currentUtilization, 100);
    }
    
    // Additional validation for negative values
    if (currentUtilization < 0) {
      console.warn('⚠️ NEGATIVE UTILIZATION:', currentUtilization, '% - This indicates a calculation error');
    }
    
    // Calculate capacity gap (difference between max and available capacity)
    const capacityGap = maxCapacity - sprintPotential;
    const capacityGapPercentage = maxCapacity > 0 ? Math.round((capacityGap / maxCapacity) * 100) : 0;
    
    // Calculate member breakdown
    const memberBreakdown = await this.calculateMemberBreakdown(teamMembers, scheduleData);
    
    // Sprint progress (if sprint is active)
    const sprintProgress = currentSprint ? await this.calculateSprintProgress(teamMembers, currentSprint, scheduleData) : undefined;

    const result: TeamDashboardData = {
      teamOverview: {
        teamId,
        teamName: team.name,
        memberCount,
        managerCount,
        maxCapacity,
        sprintPotential,
        currentUtilization,
        capacityGap,
        capacityGapPercentage,
      },
      memberBreakdown,
      currentWeekMetrics,
      sprintProgress,
    };

    // Cache the result
    this.calculationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Calculate current week metrics for the team
   */
  private static async calculateCurrentWeekMetrics(
    teamMembers: TeamMember[],
    scheduleData?: { [memberId: number]: { [dateKey: string]: ScheduleEntry } }
  ) {
    const currentWeek = this.getCurrentWeekDates();
    let actualHours = 0;
    let absentMembers = 0;
    let halfDayMembers = 0;
    
    // Potential hours for current week (5 days × 7 hours × team size)
    const potentialHours = teamMembers.length * this.WORKING_DAYS_PER_WEEK * this.HOURS_PER_DAY;
    
    if (scheduleData) {
      teamMembers.forEach(member => {
        const memberSchedule = scheduleData[member.id] || {};
        let memberWeekHours = 0;
        let hasHalfDay = false;
        let hasAbsence = false;
        
        currentWeek.forEach(date => {
          const dateKey = date.toISOString().split('T')[0];
          const entry = memberSchedule[dateKey];
          
          if (entry) {
            if (entry.value === '1') {
              memberWeekHours += this.HOURS_PER_DAY;
            } else if (entry.value === '0.5') {
              memberWeekHours += this.HOURS_PER_DAY / 2;
              hasHalfDay = true;
            } else if (entry.value === 'X') {
              hasAbsence = true;
            }
          }
          // Don't assume anything about missing entries - they might be intentionally not working
        });
        
        actualHours += memberWeekHours;
        if (hasAbsence) absentMembers++;
        else if (hasHalfDay) halfDayMembers++;
      });
    } else {
      // Default assumption: all members work full time
      actualHours = potentialHours;
    }
    
    const utilization = potentialHours > 0 ? (actualHours / potentialHours) * 100 : 0;
    
    return {
      potentialHours,
      actualHours,
      utilization,
      absentMembers,
      halfDayMembers,
    };
  }

  /**
   * Calculate sprint potential (available capacity accounting for planned absences)
   * This represents the realistic available capacity for the sprint
   */
  private static async calculateSprintPotential(
    teamMembers: TeamMember[],
    currentSprint: CurrentGlobalSprint | null,
    scheduleData?: { [memberId: number]: { [dateKey: string]: ScheduleEntry } }
  ): Promise<number> {
    if (!currentSprint) {
      // Default to 2-week sprint if no sprint active
      const defaultSprintDates = this.getDefaultSprintDateRange();
      return this.calculateAvailableCapacity(teamMembers, defaultSprintDates, scheduleData);
    }

    const sprintDates = this.getSprintDateRange(currentSprint);
    return this.calculateAvailableCapacity(teamMembers, sprintDates, scheduleData);
  }

  /**
   * Calculate available capacity by starting with max and subtracting only known absences
   */
  private static calculateAvailableCapacity(
    teamMembers: TeamMember[],
    dates: Date[],
    scheduleData?: { [memberId: number]: { [dateKey: string]: ScheduleEntry } }
  ): number {
    // Start with theoretical maximum
    const maxCapacity = teamMembers.length * dates.length * this.HOURS_PER_DAY;
    let totalAbsenceHours = 0;

    teamMembers.forEach(member => {
      const memberSchedule = scheduleData?.[member.id] || {};

      dates.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const entry = memberSchedule[dateKey];

        if (entry) {
          // Only subtract from capacity if it's less than full day
          if (entry.value === '0.5') {
            totalAbsenceHours += this.HOURS_PER_DAY / 2; // Lost 3.5 hours
          } else if (entry.value === 'X') {
            totalAbsenceHours += this.HOURS_PER_DAY; // Lost 7 hours
          }
          // For '1' (full day), no reduction needed
        }
        // For missing entries, assume full availability (no reduction)
      });
    });

    return maxCapacity - totalAbsenceHours;
  }

  /**
   * Calculate sprint-to-date metrics (only up to current date)
   */
  private static async calculateSprintToDateMetrics(
    teamMembers: TeamMember[],
    currentSprint: CurrentGlobalSprint | null,
    scheduleData?: { [memberId: number]: { [dateKey: string]: ScheduleEntry } }
  ): Promise<{ actualHours: number; potentialHours: number; utilization: number }> {
    if (!currentSprint) {
      // Use current week as fallback
      const currentWeek = this.getCurrentWeekDates();
      const actualHours = this.calculateHoursFromScheduleData(teamMembers, currentWeek, scheduleData, true);
      const potentialHours = teamMembers.length * currentWeek.length * this.HOURS_PER_DAY;
      const utilization = potentialHours > 0 ? (actualHours / potentialHours) * 100 : 0;
      
      return { actualHours, potentialHours, utilization };
    }

    // Get sprint dates up to today only
    const sprintDates = this.getSprintDateRange(currentSprint);
    const today = new Date();
    const sprintToDateDates = sprintDates.filter(date => date <= today);
    
    const actualHours = this.calculateHoursFromScheduleData(teamMembers, sprintToDateDates, scheduleData, true);
    const potentialHours = teamMembers.length * sprintToDateDates.length * this.HOURS_PER_DAY;
    const utilization = potentialHours > 0 ? (actualHours / potentialHours) * 100 : 0;

    return { actualHours, potentialHours, utilization };
  }

  /**
   * Helper method to calculate hours from schedule data
   */
  private static calculateHoursFromScheduleData(
    teamMembers: TeamMember[],
    dates: Date[],
    scheduleData?: { [memberId: number]: { [dateKey: string]: ScheduleEntry } },
    defaultToFullDay: boolean = false
  ): number {
    let totalHours = 0;

    teamMembers.forEach(member => {
      const memberSchedule = scheduleData?.[member.id] || {};

      dates.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const entry = memberSchedule[dateKey];

        if (entry) {
          totalHours += this.getHoursFromEntry(entry);
        } else if (defaultToFullDay) {
          // Only default to full day when explicitly requested (for actual calculations)
          totalHours += this.HOURS_PER_DAY;
        }
        // For potential calculations, don't assume anything about missing entries
      });
    });

    return totalHours;
  }

  /**
   * Calculate individual member capacity status
   */
  private static async calculateMemberBreakdown(
    teamMembers: TeamMember[],
    scheduleData?: { [memberId: number]: { [dateKey: string]: ScheduleEntry } }
  ): Promise<TeamMemberCapacityStatus[]> {
    const currentWeek = this.getCurrentWeekDates();
    
    return teamMembers.map(member => {
      const memberSchedule = scheduleData?.[member.id] || {};
      let actualHours = 0;
      let status: 'available' | 'half-day' | 'unavailable' = 'available';
      let reason: string | undefined;
      
      const weeklyPotential = this.WORKING_DAYS_PER_WEEK * this.HOURS_PER_DAY;
      
      currentWeek.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const entry = memberSchedule[dateKey];
        
        if (entry) {
          if (entry.value === '1') {
            actualHours += this.HOURS_PER_DAY;
          } else if (entry.value === '0.5') {
            actualHours += this.HOURS_PER_DAY / 2;
            if (status === 'available') status = 'half-day';
            if (entry.reason && !reason) reason = entry.reason;
          } else if (entry.value === 'X') {
            status = 'unavailable';
            if (entry.reason && !reason) reason = entry.reason;
          }
        } else {
          // Default to full day
          actualHours += this.HOURS_PER_DAY;
        }
      });
      
      const utilization = weeklyPotential > 0 ? (actualHours / weeklyPotential) * 100 : 0;
      
      return {
        memberId: member.id,
        memberName: member.name,
        isManager: member.isManager || false,
        weeklyPotential,
        actualHours,
        utilization,
        status,
        reason,
      };
    });
  }

  /**
   * Calculate sprint progress metrics
   */
  private static async calculateSprintProgress(
    teamMembers: TeamMember[],
    currentSprint: CurrentGlobalSprint,
    scheduleData?: { [memberId: number]: { [dateKey: string]: ScheduleEntry } }
  ) {
    const sprintDates = this.getSprintDateRange(currentSprint);
    let sprintActual = 0;
    
    teamMembers.forEach(member => {
      const memberSchedule = scheduleData?.[member.id] || {};
      
      // Calculate total sprint hours
      sprintDates.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const entry = memberSchedule[dateKey];
        const hours = this.getHoursFromEntry(entry);
        sprintActual += hours;
      });
    });
    
    const sprintPotential = teamMembers.length * sprintDates.length * this.HOURS_PER_DAY;
    const sprintUtilization = sprintPotential > 0 ? (sprintActual / sprintPotential) * 100 : 0;
    
    return {
      sprintNumber: currentSprint.current_sprint_number,
      sprintWeeks: currentSprint.sprint_length_weeks,
      sprintPotential,
      sprintActual,
      sprintUtilization,
      daysRemaining: currentSprint.days_remaining,
    };
  }

  /**
   * Get current week working days (Sunday to Thursday)
   */
  private static getCurrentWeekDates(): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    
    const weekDays: Date[] = [];
    for (let i = 0; i < this.WORKING_DAYS_PER_WEEK; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    
    return weekDays;
  }

  /**
   * Get all working days in a sprint
   */
  private static getSprintDateRange(sprint: CurrentGlobalSprint): Date[] {
    const startDate = new Date(sprint.sprint_start_date);
    const endDate = new Date(sprint.sprint_end_date);
    const dates: Date[] = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      // Only include working days (Sunday = 0 to Thursday = 4)
      if (current.getDay() >= 0 && current.getDay() <= 4) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Get default 2-week sprint date range from current date
   */
  private static getDefaultSprintDateRange(): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    
    const dates: Date[] = [];
    const current = new Date(startOfWeek);
    
    // Generate 2 weeks (10 working days)
    for (let week = 0; week < 2; week++) {
      for (let day = 0; day < this.WORKING_DAYS_PER_WEEK; day++) {
        const date = new Date(current);
        date.setDate(current.getDate() + (week * 7) + day);
        dates.push(date);
      }
    }
    
    return dates;
  }

  /**
   * Get hours from schedule entry
   */
  private static getHoursFromEntry(entry?: ScheduleEntry): number {
    if (!entry) return this.HOURS_PER_DAY; // Default to full day
    
    switch (entry.value) {
      case '1': return this.HOURS_PER_DAY;
      case '0.5': return this.HOURS_PER_DAY / 2;
      case 'X': return 0;
      default: return this.HOURS_PER_DAY;
    }
  }
}