'use client';

import { TeamMember, WeekData } from '@/types';

// Member status details for a specific day
export interface MemberDayStatus {
  id: number;
  name: string;
  hebrew?: string;
  status: 'full' | 'half' | 'absent' | 'missing';
  value?: '1' | '0.5' | 'X';
  reason?: string;
  hours: number;
}

// Team daily status interfaces
export interface DayStatus {
  fullDay: number;      // 7 hours (value: '1')
  halfDay: number;      // 3.5 hours (value: '0.5')  
  absent: number;       // 0 hours (value: 'X')
  notFilled: number;    // no entry
  totalHours: number;   // sum of all hours for the day
  date: string;         // ISO date string
  memberDetails: MemberDayStatus[];  // detailed breakdown by member
}

export interface WeekMetrics {
  totalHours: number;
  potentialHours: number;
  completionRate: number;    // percentage of schedules filled
  avgHoursPerDay: number;
  teamSize: number;
}

export interface TeamDayStatusData {
  teamId: number;
  teamName: string;
  weekDays: DayStatus[];
  weekMetrics: WeekMetrics;
  currentWeekOffset: number;
}

export class TeamDailyCalculationService {
  
  /**
   * Calculate daily status for a specific date and team members
   */
  static calculateDayStatus(
    date: Date, 
    teamMembers: TeamMember[], 
    scheduleEntries: WeekData
  ): DayStatus {
    const dateKey = date.toISOString().split('T')[0];
    
    const status: DayStatus = {
      fullDay: 0,
      halfDay: 0,
      absent: 0,
      notFilled: 0,
      totalHours: 0,
      date: dateKey,
      memberDetails: []
    };

    // Process each team member for this date
    teamMembers.forEach(member => {
      const memberSchedule = scheduleEntries[member.id];
      const dayEntry = memberSchedule?.[dateKey];
      
      let memberStatus: MemberDayStatus;
      
      if (!dayEntry) {
        // No entry found for this member on this date
        status.notFilled++;
        memberStatus = {
          id: member.id,
          name: member.name,
          hebrew: member.hebrew,
          status: 'missing',
          hours: 0
        };
      } else {
        // Process the schedule entry
        switch (dayEntry.value) {
          case '1':
            status.fullDay++;
            status.totalHours += 7;
            memberStatus = {
              id: member.id,
              name: member.name,
              hebrew: member.hebrew,
              status: 'full',
              value: '1',
              reason: dayEntry.reason,
              hours: 7
            };
            break;
          case '0.5':
            status.halfDay++;
            status.totalHours += 3.5;
            memberStatus = {
              id: member.id,
              name: member.name,
              hebrew: member.hebrew,
              status: 'half',
              value: '0.5',
              reason: dayEntry.reason,
              hours: 3.5
            };
            break;
          case 'X':
            status.absent++;
            memberStatus = {
              id: member.id,
              name: member.name,
              hebrew: member.hebrew,
              status: 'absent',
              value: 'X',
              reason: dayEntry.reason,
              hours: 0
            };
            break;
          default:
            // Unexpected value, treat as not filled
            status.notFilled++;
            memberStatus = {
              id: member.id,
              name: member.name,
              hebrew: member.hebrew,
              status: 'missing',
              hours: 0
            };
            break;
        }
      }
      
      status.memberDetails.push(memberStatus);
    });

    return status;
  }

  /**
   * Calculate week metrics for the entire team
   */
  static calculateWeekMetrics(
    weekDays: Date[], 
    teamMembers: TeamMember[], 
    scheduleEntries: WeekData
  ): WeekMetrics {
    let totalHours = 0;
    let totalEntries = 0;
    const teamSize = teamMembers.length;
    const potentialHours = teamSize * weekDays.length * 7; // Max possible hours
    const totalPossibleEntries = teamSize * weekDays.length;

    // Sum up all days
    weekDays.forEach(date => {
      const dayStatus = this.calculateDayStatus(date, teamMembers, scheduleEntries);
      totalHours += dayStatus.totalHours;
      totalEntries += (dayStatus.fullDay + dayStatus.halfDay + dayStatus.absent);
    });

    const completionRate = totalPossibleEntries > 0 
      ? Math.round((totalEntries / totalPossibleEntries) * 100) 
      : 0;

    const avgHoursPerDay = weekDays.length > 0 
      ? Math.round((totalHours / weekDays.length) * 10) / 10 
      : 0;

    return {
      totalHours,
      potentialHours,
      completionRate,
      avgHoursPerDay,
      teamSize
    };
  }

  /**
   * Get current week dates based on offset
   */
  static getCurrentWeekDates(weekOffset: number = 0): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) { // Include all 7 days for complete overview
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  }

  /**
   * Get work week dates (Sunday-Thursday) based on offset
   */
  static getWorkWeekDates(weekOffset: number = 0): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 5; i++) { // Sunday to Thursday (work days)
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  }

  /**
   * Format date for display (hydration-safe)
   */
  static formatDayName(date: Date, locale: string = 'en-US'): string {
    // Use consistent English day names to avoid hydration issues
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }

  /**
   * Format date for display (hydration-safe)
   */
  static formatDate(date: Date, locale: string = 'en-US'): string {
    // Use consistent formatting to avoid hydration issues
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }

  /**
   * Check if date is today (hydration-safe)
   */
  static isToday(date: Date, referenceDate?: Date): boolean {
    const today = referenceDate || new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  }

  /**
   * Check if date is weekend
   */
  static isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
  }

  /**
   * Get status color based on completion percentage
   */
  static getStatusColor(completionRate: number): string {
    if (completionRate >= 90) return 'text-green-600';
    if (completionRate >= 70) return 'text-yellow-600';
    if (completionRate >= 50) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Get status background color based on completion percentage
   */
  static getStatusBgColor(completionRate: number): string {
    if (completionRate >= 90) return 'bg-green-50 border-green-200';
    if (completionRate >= 70) return 'bg-yellow-50 border-yellow-200';
    if (completionRate >= 50) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  }
}

export default TeamDailyCalculationService;