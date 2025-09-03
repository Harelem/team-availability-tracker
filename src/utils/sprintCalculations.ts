import { CurrentGlobalSprint } from '@/types';

export interface SprintPeriod {
  startDate: string;
  endDate: string;
}

// PERFORMANCE FIX: Enhanced cache for sprint period calculations with TTL
interface CachedSprintPeriod {
  data: SprintPeriod;
  timestamp: number;
}

const sprintPeriodCache = new Map<string, CachedSprintPeriod>();
const SPRINT_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours cache

export const calculateSprintPeriod = (currentSprint: CurrentGlobalSprint, offset: number = 0): SprintPeriod => {
  // Create cache key
  const cacheKey = `${currentSprint.sprint_start_date}_${currentSprint.sprint_length_weeks}_${offset}`;
  
  // PERFORMANCE FIX: Check cache with TTL
  const cached = sprintPeriodCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SPRINT_CACHE_TTL) {
    return cached.data;
  }
  
  const sprintStart = new Date(currentSprint.sprint_start_date);
  const sprintWeeks = currentSprint.sprint_length_weeks;
  
  // PERFORMANCE FIX: Remove all debug logging for performance
  
  // Calculate target sprint start (current + offset)
  const targetSprintStart = new Date(sprintStart);
  targetSprintStart.setDate(sprintStart.getDate() + (offset * sprintWeeks * 7));
  
  const targetSprintEnd = new Date(targetSprintStart);
  targetSprintEnd.setDate(targetSprintStart.getDate() + (sprintWeeks * 7) - 1);
  
  const result = {
    startDate: targetSprintStart.toISOString().split('T')[0],
    endDate: targetSprintEnd.toISOString().split('T')[0]
  };
  
  // PERFORMANCE FIX: Cache with timestamp for TTL
  sprintPeriodCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });
  
  return result;
};

// Helper function to check if a day is a working day (Israeli work week: Sunday-Thursday)
export const isWorkingDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  // Sunday (0) to Thursday (4) are working days
  // Friday (5) and Saturday (6) are weekend days
  return dayOfWeek >= 0 && dayOfWeek <= 4;
};

// Helper function to get working day name for debugging
export const getWorkingDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
};

// PERFORMANCE FIX: Enhanced cache for working days calculations with TTL
interface CachedWorkingDays {
  data: number;
  timestamp: number;
}

const workingDaysCache = new Map<string, CachedWorkingDays>();
const WORKING_DAYS_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours cache (longer since working days don't change)

export const calculateWorkingDaysInPeriod = (startDate: string, endDate: string): number => {
  // Create cache key
  const cacheKey = `${startDate}_${endDate}`;
  
  // PERFORMANCE FIX: Check cache with TTL
  const cached = workingDaysCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WORKING_DAYS_CACHE_TTL) {
    return cached.data;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validate input dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('🔍 calculateWorkingDaysInPeriod ERROR: Invalid dates', {
      startDate,
      endDate
    });
    return 0;
  }
  
  if (start > end) {
    console.error('🔍 calculateWorkingDaysInPeriod ERROR: Start date after end date', {
      startDate,
      endDate
    });
    return 0;
  }
  
  let workingDays = 0;
  const workingDaysList: string[] = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Use the helper function for consistency
    if (isWorkingDay(d)) {
      workingDays++;
      if (process.env.NODE_ENV === 'development') {
        workingDaysList.push(d.toISOString().split('T')[0]);
      }
    }
  }
  
  // PERFORMANCE FIX: Cache with timestamp for TTL
  workingDaysCache.set(cacheKey, {
    data: workingDays,
    timestamp: Date.now()
  });
  
  // PERFORMANCE FIX: Remove all debug logging for performance
  
  return workingDays;
};

export const getSprintDescription = (offset: number): string => {
  switch (offset) {
    case -1:
      return 'Previous Sprint';
    case 0:
      return 'Current Sprint';
    case 1:
      return 'Next Sprint';
    default:
      return `Sprint ${offset > 0 ? '+' : ''}${offset}`;
  }
};

// Calculate working days remaining from today to end date (inclusive)
export const calculateRemainingWorkingDaysFromToday = (endDate: string): number => {
  const today = new Date();
  const end = new Date(endDate);
  
  // If end date is in the past, return 0
  if (end < today) {
    return 0;
  }
  
  // Start counting from tomorrow if today is a working day, or next working day if not
  let startDate: Date;
  const todayIsWorkingDay = isWorkingDay(today);
  
  if (todayIsWorkingDay) {
    // If today is a working day, start counting from tomorrow
    startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
  } else {
    // If today is weekend (Friday/Saturday), find next working day (Sunday)
    startDate = new Date(today);
    while (!isWorkingDay(startDate)) {
      startDate.setDate(startDate.getDate() + 1);
    }
  }
  
  return calculateWorkingDaysInPeriod(
    startDate.toISOString().split('T')[0],
    endDate
  );
};

export const formatSprintDateRange = (period: SprintPeriod): string => {
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);
  
  const startFormatted = start.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  const endFormatted = end.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${startFormatted} - ${endFormatted}`;
};