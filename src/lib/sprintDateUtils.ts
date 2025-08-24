import { startOfWeek, addDays, format } from 'date-fns';
import { DEFAULT_SPRINT_CONFIG } from '@/utils/smartSprintDetection';

/**
 * Unified Sprint Date Utilities
 * 
 * This module provides consistent date calculations across all components
 * to prevent data inconsistency when switching between week and sprint views.
 * 
 * CRITICAL: All components should use these utilities to ensure single source of truth
 */

export interface SprintDateRange {
  start: Date;
  end: Date;
  dates: Date[];
  workingDates: string[]; // ISO format for database queries
}

/**
 * Get the start date of a sprint containing the given reference date
 */
export const getSprintStartDate = (referenceDate: Date = new Date()): Date => {
  // Get the start of the current week (Sunday)
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  
  // Calculate weeks since the first sprint
  const firstSprintStart = new Date(DEFAULT_SPRINT_CONFIG.firstSprintStartDate);
  const weeksSinceFirst = Math.floor((weekStart.getTime() - firstSprintStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
  
  // Determine which sprint we're in (sprints are 2 weeks long)
  const sprintNumber = Math.floor(weeksSinceFirst / 2);
  
  // Calculate the start of the current sprint
  const sprintStartDate = new Date(firstSprintStart);
  sprintStartDate.setDate(firstSprintStart.getDate() + (sprintNumber * 14));
  
  return sprintStartDate;
};

/**
 * Get the complete date range for a sprint (including non-working days)
 */
export const getSprintDateRange = (referenceDate: Date = new Date(), offset: number = 0): SprintDateRange => {
  const baseSprintStart = getSprintStartDate(referenceDate);
  
  // Apply offset (offset in sprints, not weeks)
  const sprintStart = new Date(baseSprintStart);
  sprintStart.setDate(baseSprintStart.getDate() + (offset * 14));
  
  // Sprint end is 13 days later (14 days total including start)
  const sprintEnd = new Date(sprintStart);
  sprintEnd.setDate(sprintStart.getDate() + 13);
  
  // Generate all dates in the sprint
  const allDates: Date[] = [];
  const workingDates: string[] = [];
  
  let currentDate = new Date(sprintStart);
  while (currentDate <= sprintEnd) {
    const dayOfWeek = currentDate.getDay();
    allDates.push(new Date(currentDate));
    
    // Include Sunday(0) through Thursday(4) as working days
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      workingDates.push(format(currentDate, 'yyyy-MM-dd'));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    start: sprintStart,
    end: sprintEnd,
    dates: allDates,
    workingDates
  };
};

/**
 * Get working days for a specific week
 */
export const getWeekDateRange = (referenceDate: Date = new Date(), weekOffset: number = 0): SprintDateRange => {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  weekStart.setDate(weekStart.getDate() + (weekOffset * 7));
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday to Saturday
  
  // Generate working days (Sun-Thu)
  const workingDates: Date[] = [];
  const workingDateStrings: string[] = [];
  
  for (let i = 0; i < 5; i++) { // Sunday to Thursday
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    workingDates.push(date);
    workingDateStrings.push(format(date, 'yyyy-MM-dd'));
  }
  
  return {
    start: weekStart,
    end: weekEnd,
    dates: workingDates,
    workingDates: workingDateStrings
  };
};

/**
 * Get the optimal date range that covers both week and sprint views
 * This ensures single data fetch covers all possible navigation scenarios
 */
export const getUnifiedDateRange = (referenceDate: Date = new Date()): SprintDateRange => {
  // Always use the full sprint range to cover both week and sprint navigation
  return getSprintDateRange(referenceDate, 0);
};

/**
 * Check if a date is a working day (Sunday through Thursday)
 */
export const isWorkingDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 0 && dayOfWeek <= 4;
};

/**
 * Filter dates to show only what's relevant for the current view mode
 */
export const getDisplayDatesForView = (
  viewMode: 'week' | 'sprint',
  referenceDate: Date = new Date(),
  offset: number = 0
): Date[] => {
  if (viewMode === 'week') {
    return getWeekDateRange(referenceDate, offset).dates;
  } else {
    return getSprintDateRange(referenceDate, offset).dates.filter(isWorkingDay);
  }
};

/**
 * Format a date range for display
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * Get human-readable description of current period
 */
export const getPeriodDescription = (
  viewMode: 'week' | 'sprint',
  referenceDate: Date = new Date(),
  offset: number = 0,
  sprintNumber?: number
): string => {
  if (viewMode === 'week') {
    const weekRange = getWeekDateRange(referenceDate, offset);
    return `Week of ${formatDateRange(weekRange.start, weekRange.dates[4])}`;
  } else {
    const sprintRange = getSprintDateRange(referenceDate, offset);
    const displayNumber = sprintNumber || 'Current';
    return `Sprint ${displayNumber} (${formatDateRange(sprintRange.start, sprintRange.end)})`;
  }
};