/**
 * Sprint Logic Utilities
 * Core utilities for sprint-based availability system
 * Handles working days, capacity calculations, and manager-specific logic
 */

export interface SprintWorkingDay {
  date: Date;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  isWorkingDay: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export interface SprintCapacity {
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  holidayDays: number;
  maxHours: number; // For regular members
  managerMaxHours: number; // For managers (0.5 * working days)
}

export interface MemberSprintSummary {
  memberId: number;
  memberName: string;
  isManager: boolean;
  maxPossibleHours: number;
  actualHours: number;
  utilizationPercentage: number;
  workingDaysFilled: number;
  totalWorkingDays: number;
  missingDays: number;
  weekendDaysAutoFilled: number;
}

export interface TeamSprintSummary {
  teamId: number;
  teamName: string;
  sprintId: string;
  sprintNumber: number;
  totalMembers: number;
  managerCount: number;
  maxCapacityHours: number;
  actualHours: number;
  utilizationPercentage: number;
  completionPercentage: number;
  memberSummaries: MemberSprintSummary[];
}

/**
 * Core Sprint Logic Class
 * Handles all sprint-related calculations and validations
 */
export class SprintLogic {
  /**
   * Calculate working days for a date range (Sunday-Thursday only)
   */
  static getWorkingDays(startDate: Date, endDate: Date): SprintWorkingDay[] {
    const days: SprintWorkingDay[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay(); // 0=Sunday, 6=Saturday
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday/Saturday
      const isWorkingDay = !isWeekend;
      
      days.push({
        date: new Date(current),
        dayOfWeek,
        isWorkingDay,
        isWeekend,
        isHoliday: false, // TODO: Add holiday logic integration
        holidayName: undefined
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  /**
   * Calculate sprint capacity based on working days
   */
  static calculateSprintCapacity(workingDays: number): SprintCapacity {
    const weekendDays = Math.ceil(workingDays / 5) * 2; // Approximate weekends
    const totalDays = workingDays + weekendDays;
    
    return {
      totalDays,
      workingDays,
      weekendDays,
      holidayDays: 0, // TODO: Add holiday calculation
      maxHours: workingDays * 7, // Regular members: 7 hours per working day
      managerMaxHours: workingDays * 3.5 // Managers: 3.5 hours per working day (0.5)
    };
  }

  /**
   * Auto-generate weekend schedule entries for a sprint
   */
  static autoGenerateWeekendEntries(memberId: number, sprintDays: SprintWorkingDay[]): ScheduleEntry[] {
    return sprintDays
      .filter(day => day.isWeekend)
      .map(day => ({
        member_id: memberId,
        date: day.date.toISOString().split('T')[0],
        value: 'X' as const,
        reason: 'Weekend (auto-generated)',
        calculated_hours: 0,
        is_weekend: true
      }));
  }

  /**
   * Calculate end date based on start date and sprint length in weeks
   * Ensures exact number of working days
   */
  static calculateSprintEndDate(startDate: Date, lengthWeeks: number): Date {
    const workingDaysNeeded = lengthWeeks * 5; // 5 working days per week
    let current = new Date(startDate);
    let workingDaysAdded = 0;
    
    while (workingDaysAdded < workingDaysNeeded) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 0 && dayOfWeek <= 4) { // Sunday-Thursday
        workingDaysAdded++;
      }
      if (workingDaysAdded < workingDaysNeeded) {
        current.setDate(current.getDate() + 1);
      }
    }
    
    return current;
  }

  /**
   * Validate sprint dates and configuration
   */
  static validateSprintConfig(startDate: Date, endDate: Date, lengthWeeks: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic date validation
    if (startDate > endDate) {
      errors.push('Start date must be before end date');
    }

    // Length validation
    if (lengthWeeks < 1 || lengthWeeks > 4) {
      errors.push('Sprint length must be between 1 and 4 weeks');
    }

    // Working days validation
    const workingDays = this.getWorkingDays(startDate, endDate);
    const actualWorkingDays = workingDays.filter(day => day.isWorkingDay).length;
    const expectedWorkingDays = lengthWeeks * 5;

    if (actualWorkingDays !== expectedWorkingDays) {
      warnings.push(
        `Expected ${expectedWorkingDays} working days for ${lengthWeeks} weeks, but found ${actualWorkingDays}`
      );
    }

    // Weekend validation
    const weekends = workingDays.filter(day => day.isWeekend).length;
    const expectedWeekends = Math.ceil(lengthWeeks) * 2;
    
    if (weekends < expectedWeekends - 1) { // Allow for partial weeks
      warnings.push(`Sprint may not include enough weekend days for proper work-life balance`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get manager-specific work options
   */
  static getManagerWorkOptions(): WorkOption[] {
    return [
      {
        value: '0.5',
        label: '0.5',
        hours: 3.5,
        description: 'Half day (Management tasks)',
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
      },
      {
        value: 'X',
        label: 'X',
        hours: 0,
        description: 'Unavailable/Out',
        color: 'bg-red-100 border-red-300 text-red-800'
      }
    ];
  }

  /**
   * Get regular member work options
   */
  static getRegularMemberWorkOptions(): WorkOption[] {
    return [
      {
        value: '1',
        label: '1',
        hours: 7,
        description: 'Full day',
        color: 'bg-green-100 border-green-300 text-green-800'
      },
      {
        value: '0.5',
        label: '0.5',
        hours: 3.5,
        description: 'Half day',
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
      },
      {
        value: 'X',
        label: 'X',
        hours: 0,
        description: 'Unavailable/Out',
        color: 'bg-red-100 border-red-300 text-red-800'
      }
    ];
  }

  /**
   * Calculate member sprint summary
   */
  static calculateMemberSprintSummary(
    member: TeamMember,
    sprintDays: SprintWorkingDay[],
    scheduleData: { [dateKey: string]: ScheduleEntry }
  ): MemberSprintSummary {
    const workingDays = sprintDays.filter(day => day.isWorkingDay);
    const weekendDays = sprintDays.filter(day => day.isWeekend);
    
    const isManager = !!(member.isManager || member.is_manager);
    const maxHoursPerDay = isManager ? 3.5 : 7;
    const maxPossibleHours = workingDays.length * maxHoursPerDay;
    
    let actualHours = 0;
    let workingDaysFilled = 0;
    let weekendDaysAutoFilled = 0;
    
    // Calculate actual hours and filled days
    sprintDays.forEach(day => {
      const dateKey = day.date.toISOString().split('T')[0];
      const entry = scheduleData[dateKey];
      
      if (entry && entry.value) {
        if (day.isWeekend && entry.value === 'X') {
          weekendDaysAutoFilled++;
        } else if (day.isWorkingDay) {
          workingDaysFilled++;
          switch (entry.value) {
            case '1':
              actualHours += 7;
              break;
            case '0.5':
              actualHours += 3.5;
              break;
            case 'X':
              actualHours += 0;
              break;
          }
        }
      }
    });
    
    const utilizationPercentage = maxPossibleHours > 0 
      ? Math.round((actualHours / maxPossibleHours) * 100) 
      : 0;
    
    return {
      memberId: member.id,
      memberName: member.name,
      isManager,
      maxPossibleHours,
      actualHours,
      utilizationPercentage,
      workingDaysFilled,
      totalWorkingDays: workingDays.length,
      missingDays: workingDays.length - workingDaysFilled,
      weekendDaysAutoFilled
    };
  }

  /**
   * Calculate team sprint summary
   */
  static calculateTeamSprintSummary(
    team: Team,
    teamMembers: TeamMember[],
    currentSprint: any,
    scheduleData: { [memberId: number]: { [dateKey: string]: ScheduleEntry } }
  ): TeamSprintSummary {
    if (!currentSprint) {
      throw new Error('No active sprint found');
    }

    const sprintDays = this.getWorkingDays(
      new Date(currentSprint.start_date),
      new Date(currentSprint.end_date)
    );

    const memberSummaries = teamMembers.map(member => 
      this.calculateMemberSprintSummary(
        member,
        sprintDays,
        scheduleData[member.id] || {}
      )
    );

    const maxCapacityHours = memberSummaries.reduce(
      (sum, member) => sum + member.maxPossibleHours, 0
    );
    
    const actualHours = memberSummaries.reduce(
      (sum, member) => sum + member.actualHours, 0
    );

    const utilizationPercentage = maxCapacityHours > 0 
      ? Math.round((actualHours / maxCapacityHours) * 100) 
      : 0;

    const totalWorkingDays = sprintDays.filter(day => day.isWorkingDay).length;
    const totalPossibleEntries = teamMembers.length * totalWorkingDays;
    const totalFilledEntries = memberSummaries.reduce(
      (sum, member) => sum + member.workingDaysFilled, 0
    );
    
    const completionPercentage = totalPossibleEntries > 0 
      ? Math.round((totalFilledEntries / totalPossibleEntries) * 100) 
      : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      sprintId: currentSprint.id,
      sprintNumber: currentSprint.sprint_number,
      totalMembers: teamMembers.length,
      managerCount: teamMembers.filter(m => m.isManager || m.is_manager).length,
      maxCapacityHours,
      actualHours,
      utilizationPercentage,
      completionPercentage,
      memberSummaries
    };
  }

  /**
   * Check if a date is today
   */
  static isDateToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Check if a date is in the past
   */
  static isDatePast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format date range for display
   */
  static formatDateRange(startDate: Date, endDate: Date): string {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    
    if (startDate.getFullYear() === endDate.getFullYear()) {
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
      } else {
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${endDate.getFullYear()}`;
      }
    }
    
    return `${start} - ${end}`;
  }

  /**
   * Get day abbreviation
   */
  static getDayAbbrev(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  /**
   * Get day name
   */
  static getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  /**
   * Format date key for schedule data
   */
  static formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate sprint weeks for mobile display
   */
  static groupSprintDaysByWeek(sprintDays: SprintWorkingDay[]): SprintWorkingDay[][] {
    const weeks: SprintWorkingDay[][] = [];
    let currentWeek: SprintWorkingDay[] = [];
    
    sprintDays.forEach((day, index) => {
      if (day.dayOfWeek === 0 && currentWeek.length > 0) {
        // Start new week on Sunday
        weeks.push(currentWeek);
        currentWeek = [day];
      } else {
        currentWeek.push(day);
      }
    });
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }

  /**
   * Validate work option for user type
   */
  static isValidWorkOption(value: string, isManager: boolean): boolean {
    if (isManager) {
      return value === '0.5' || value === 'X';
    }
    return value === '1' || value === '0.5' || value === 'X';
  }

  /**
   * Get work option recommendation for user type
   */
  static getWorkOptionRecommendation(isManager: boolean): {
    defaultValue: string;
    availableOptions: string[];
    restrictions: string[];
  } {
    if (isManager) {
      return {
        defaultValue: '0.5',
        availableOptions: ['0.5', 'X'],
        restrictions: [
          'Managers cannot select full days (1.0) due to management responsibilities',
          'Default to half days (0.5) for management tasks'
        ]
      };
    }
    
    return {
      defaultValue: '1',
      availableOptions: ['1', '0.5', 'X'],
      restrictions: []
    };
  }
}

// Type definitions for compatibility with existing code
export interface WorkOption {
  value: '1' | '0.5' | 'X';
  label: string;
  hours: number;
  description: string;
  color: string;
}

export interface ScheduleEntry {
  id?: number;
  member_id: number;
  date: string;
  value: '1' | '0.5' | 'X';
  reason?: string;
  calculated_hours?: number;
  is_weekend?: boolean;
  sprint_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  hebrew: string;
  isManager?: boolean;
  is_manager?: boolean;
  email?: string;
  team_id?: number;
  role?: string;
  manager_max_hours?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Sprint Progress Utilities
 */
export class SprintProgressUtils {
  /**
   * Calculate sprint progress metrics
   */
  static calculateSprintProgress(sprint: any): {
    timeProgress: number;
    workProgress: number;
    daysElapsed: number;
    daysRemaining: number;
    workingDaysRemaining: number;
    isOnTrack: boolean;
  } {
    const now = new Date();
    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const timeProgress = totalDays > 0 ? Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)) : 0;
    
    // Calculate working days remaining
    const remainingDays = SprintLogic.getWorkingDays(now, endDate);
    const workingDaysRemaining = remainingDays.filter(day => day.isWorkingDay).length;
    
    // Work progress would need to be calculated based on actual vs expected completion
    // This is a simplified version - in reality, you'd calculate based on team completion rates
    const workProgress = sprint.completion_percentage || 0;
    
    const isOnTrack = workProgress >= timeProgress * 0.8; // Allow 20% buffer
    
    return {
      timeProgress: Math.round(timeProgress),
      workProgress: Math.round(workProgress),
      daysElapsed,
      daysRemaining,
      workingDaysRemaining,
      isOnTrack
    };
  }
}

export default SprintLogic;
