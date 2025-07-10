/**
 * Date utilities for export functionality
 */

import { WeekExportType } from '@/types';

/**
 * Get the start of week (Sunday) for a given date
 */
export const getWeekStart = (date: Date): Date => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Get the end of week (Thursday) for a given date
 */
export const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 4); // Sunday + 4 days = Thursday
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Calculate week range based on export type
 */
export const calculateWeekRange = (
  type: WeekExportType, 
  specificDate?: Date
): { startDate: Date; endDate: Date } => {
  const today = new Date();
  let referenceDate: Date;

  switch (type) {
    case 'current-week':
      referenceDate = today;
      break;
    case 'previous-week':
      referenceDate = new Date(today);
      referenceDate.setDate(today.getDate() - 7);
      break;
    case 'next-week':
      referenceDate = new Date(today);
      referenceDate.setDate(today.getDate() + 7);
      break;
    case 'specific-week':
      if (!specificDate) {
        throw new Error('Specific date required for specific-week export type');
      }
      referenceDate = specificDate;
      break;
    default:
      referenceDate = today;
  }

  const startDate = getWeekStart(referenceDate);
  const endDate = getWeekEnd(referenceDate);

  return { startDate, endDate };
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Format date range for display
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * Get week days (Sunday through Thursday) for a given start date
 */
export const getWeekDays = (startDate: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  return days;
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if a date is in the past
 */
export const isPastDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

/**
 * Get the difference in days between two dates
 */
export const getDaysDifference = (startDate: Date, endDate: Date): number => {
  const timeDifference = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDifference / (1000 * 3600 * 24));
};

/**
 * Get the difference in weeks between two dates
 */
export const getWeeksDifference = (startDate: Date, endDate: Date): number => {
  const daysDiff = getDaysDifference(startDate, endDate);
  return Math.ceil(daysDiff / 7);
};

/**
 * Validate date range
 */
export const validateDateRange = (startDate: Date, endDate: Date): void => {
  if (startDate > endDate) {
    throw new Error('Start date must be before end date');
  }
  
  const maxRange = 365; // Maximum 1 year
  if (getDaysDifference(startDate, endDate) > maxRange) {
    throw new Error('Date range cannot exceed 1 year');
  }
};

/**
 * Generate filename for export
 */
export const generateExportFilename = (
  type: string,
  teamName: string,
  startDate: Date,
  endDate: Date,
  format: 'csv' | 'excel' = 'excel'
): string => {
  const teamSlug = teamName.toLowerCase().replace(/\s+/g, '-');
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  const extension = format === 'excel' ? 'xlsx' : 'csv';
  
  if (type === 'week') {
    return `${teamSlug}-week-${startStr}.${extension}`;
  } else if (type === 'sprint') {
    return `${teamSlug}-sprint-${startStr}.${extension}`;
  } else {
    return `${teamSlug}-custom-${startStr}-${endStr}.${extension}`;
  }
};