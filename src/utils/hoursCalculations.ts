import { supabase } from '@/lib/supabase';
import { HoursViewType, DateRange, TeamHoursData } from '@/types';
import { Team, TeamMember, CurrentGlobalSprint } from '@/types';

/**
 * Convert schedule entry value to hours
 * '1' = 7 hours (full day)
 * '0.5' = 3.5 hours (half day)
 * 'X' = 0 hours (absent)
 */
export function valueToHours(value: '1' | '0.5' | 'X' | string | null | undefined): number {
  if (!value) {
    console.warn('valueToHours: Received null/undefined value, defaulting to 0 hours');
    return 0;
  }
  
  switch (value) {
    case '1':
      return 7;
    case '0.5':
      return 3.5;
    case 'X':
      return 0;
    default:
      console.warn(`valueToHours: Unknown value "${value}", defaulting to 0 hours`);
      return 0;
  }
}

/**
 * Convert hours to schedule entry value
 * 7 hours = '1'
 * 3.5 hours = '0.5'
 * 0 hours = 'X'
 */
export function hoursToValue(hours: number): '1' | '0.5' | 'X' {
  if (hours >= 7) return '1';
  if (hours >= 3.5) return '0.5';
  return 'X';
}

/**
 * Validate team member object has required fields for new schema
 */
export function validateTeamMemberSchema(member: any): boolean {
  const requiredFields = ['id', 'name', 'team_id'];
  const missingFields = requiredFields.filter(field => !(field in member) || member[field] === undefined);
  
  if (missingFields.length > 0) {
    console.error(`validateTeamMemberSchema: Missing required fields: ${missingFields.join(', ')}`, member);
    return false;
  }
  
  return true;
}

/**
 * Validate schedule entry object has required fields
 */
export function validateScheduleEntrySchema(entry: any): boolean {
  const requiredFields = ['member_id', 'date', 'value'];
  const missingFields = requiredFields.filter(field => !(field in entry) || entry[field] === undefined);
  
  if (missingFields.length > 0) {
    console.error(`validateScheduleEntrySchema: Missing required fields: ${missingFields.join(', ')}`, entry);
    return false;
  }
  
  // Validate value is one of the expected types
  const validValues = ['1', '0.5', 'X'];
  if (!validValues.includes(entry.value)) {
    console.error(`validateScheduleEntrySchema: Invalid value "${entry.value}", expected one of: ${validValues.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * Safely get hours from a schedule entry, with fallback handling
 */
export function safeGetHoursFromEntry(entry: any): number {
  // If entry has pre-computed hours field (from enhanced view), use it
  if (entry && typeof entry.hours === 'number') {
    return entry.hours;
  }
  
  // Otherwise, convert from value field
  if (entry && entry.value) {
    return valueToHours(entry.value);
  }
  
  // Fallback: no entry or invalid entry
  return 0;
}

export class HoursCalculationService {
  /**
   * Get date range based on hours view type
   */
  static getDateRange(viewType: HoursViewType, sprintData?: CurrentGlobalSprint | null): DateRange {
    if (viewType === 'weekly') {
      return this.getCurrentWeekRange();
    } else {
      return this.getCurrentSprintRange(sprintData);
    }
  }

  /**
   * Get current week range (Sunday to Thursday)
   */
  static getCurrentWeekRange(): DateRange {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Thursday

    return {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
      description: `Current Week (${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)})`,
      workingDays: 5
    };
  }

  /**
   * Get current sprint range
   */
  static getCurrentSprintRange(sprintData?: CurrentGlobalSprint | null): DateRange {
    if (!sprintData) {
      // Fallback to current week if no sprint data
      return this.getCurrentWeekRange();
    }

    const startDate = new Date(sprintData.sprint_start_date);
    const endDate = new Date(sprintData.sprint_end_date);

    return {
      start: sprintData.sprint_start_date,
      end: sprintData.sprint_end_date,
      description: `Sprint ${sprintData.current_sprint_number} (${this.formatDate(startDate)} - ${this.formatDate(endDate)})`,
      workingDays: this.calculateWorkingDays(sprintData.sprint_start_date, sprintData.sprint_end_date)
    };
  }

  /**
   * Calculate working days in a date range (Monday-Friday)
   */
  static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Count Sunday (0) through Thursday (4) as working days for this app
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  /**
   * Calculate hours for a specific team
   */
  static async calculateTeamHours(
    team: Team & { team_members?: TeamMember[] },
    dateRange: DateRange
  ): Promise<TeamHoursData> {
    try {
      const memberIds = team.team_members?.map(m => m.id) || [];
      
      if (memberIds.length === 0) {
        return { current: 0, potential: 0, utilization: 0 };
      }

      // Get schedule entries for the date range
      const { data: entries } = await supabase
        .from('schedule_entries')
        .select('member_id, value, date')
        .in('member_id', memberIds)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      // Calculate actual hours using safe conversion utility
      let actualHours = 0;
      entries?.forEach(entry => {
        if (validateScheduleEntrySchema(entry)) {
          actualHours += safeGetHoursFromEntry(entry);
        }
      });

      // Calculate potential hours
      const potentialHours = memberIds.length * dateRange.workingDays * 7;

      // Calculate utilization percentage
      const utilization = potentialHours > 0 ? Math.round((actualHours / potentialHours) * 100) : 0;

      return {
        current: actualHours,
        potential: potentialHours,
        utilization
      };

    } catch (error) {
      console.error(`Error calculating hours for team ${team.name}:`, error);
      return { current: 0, potential: 0, utilization: 0 };
    }
  }

  /**
   * Calculate total hours across all teams
   */
  static async calculateCompanyTotals(
    teams: (Team & { team_members?: TeamMember[] })[],
    viewType: HoursViewType,
    sprintData?: CurrentGlobalSprint | null
  ): Promise<{ weekly: number; sprint: number; currentView: number }> {
    try {
      const weeklyRange = this.getCurrentWeekRange();
      const sprintRange = this.getCurrentSprintRange(sprintData);

      // Calculate weekly total
      let weeklyTotal = 0;
      for (const team of teams) {
        const weeklyHours = await this.calculateTeamHours(team, weeklyRange);
        weeklyTotal += weeklyHours.current;
      }

      // Calculate sprint total
      let sprintTotal = 0;
      for (const team of teams) {
        const sprintHours = await this.calculateTeamHours(team, sprintRange);
        sprintTotal += sprintHours.current;
      }

      return {
        weekly: weeklyTotal,
        sprint: sprintTotal,
        currentView: viewType === 'weekly' ? weeklyTotal : sprintTotal
      };

    } catch (error) {
      console.error('Error calculating company totals:', error);
      return { weekly: 0, sprint: 0, currentView: 0 };
    }
  }

  /**
   * Get utilization status and color
   */
  static getUtilizationStatus(utilization: number): {
    status: string;
    color: string;
    emoji: string;
  } {
    if (utilization >= 90) {
      return { status: 'Excellent', color: 'text-green-600', emoji: '🎉' };
    } else if (utilization >= 70) {
      return { status: 'Good', color: 'text-blue-600', emoji: '✅' };
    } else if (utilization >= 50) {
      return { status: 'Needs Attention', color: 'text-yellow-600', emoji: '⚠️' };
    } else {
      return { status: 'Critical', color: 'text-red-600', emoji: '🚨' };
    }
  }

  /**
   * Get utilization bar color
   */
  static getUtilizationBarColor(utilization: number): string {
    if (utilization >= 90) return 'bg-green-500';
    if (utilization >= 70) return 'bg-blue-500';
    if (utilization >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  /**
   * Format date for display
   */
  private static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Calculate hours for a specific member
   */
  static async calculateMemberHours(
    memberId: number,
    dateRange: DateRange
  ): Promise<number> {
    try {
      const { data: entries } = await supabase
        .from('schedule_entries')
        .select('value')
        .eq('member_id', memberId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      let totalHours = 0;
      entries?.forEach(entry => {
        if (validateScheduleEntrySchema(entry)) {
          totalHours += safeGetHoursFromEntry(entry);
        }
      });

      return totalHours;

    } catch (error) {
      console.error(`Error calculating hours for member ${memberId}:`, error);
      return 0;
    }
  }

  /**
   * Get hours breakdown by day for a team
   */
  static async getTeamHoursBreakdown(
    team: Team & { team_members?: TeamMember[] },
    dateRange: DateRange
  ): Promise<Record<string, number>> {
    try {
      const memberIds = team.team_members?.map(m => m.id) || [];
      
      if (memberIds.length === 0) {
        return {};
      }

      const { data: entries } = await supabase
        .from('schedule_entries')
        .select('date, value')
        .in('member_id', memberIds)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date');

      const breakdown: Record<string, number> = {};
      
      entries?.forEach(entry => {
        if (!breakdown[entry.date]) {
          breakdown[entry.date] = 0;
        }
        
        if (validateScheduleEntrySchema(entry)) {
          breakdown[entry.date] += safeGetHoursFromEntry(entry);
        }
      });

      return breakdown;

    } catch (error) {
      console.error(`Error getting hours breakdown for team ${team.name}:`, error);
      return {};
    }
  }
}