/**
 * Enhanced Date Utilities for Export System
 * Supports custom date ranges, sprint calculations, and working days
 */

import { DatabaseService } from '@/lib/database';

export type EnhancedExportType = 
  | 'current-week' 
  | 'current-sprint' 
  | 'previous-sprint' 
  | 'custom-range'
  | 'complete-overview';

export interface DateRangeResult {
  start: string;
  end: string;
  description: string;
  exportType: EnhancedExportType;
  workingDays: number;
  totalDays: number;
  weekDays: string[];
}

export interface SprintInfo {
  sprintNumber: number;
  startDate: string;
  endDate: string;
  lengthWeeks: number;
  isActive: boolean;
}

/**
 * Get comprehensive date range for any export type
 */
export const getEnhancedExportDateRange = async (
  exportType: EnhancedExportType,
  customStartDate?: string,
  customEndDate?: string
): Promise<DateRangeResult> => {
  console.log('📅 Calculating enhanced date range for:', exportType);
  
  let startDate: string;
  let endDate: string;
  let description: string;
  
  switch (exportType) {
    case 'current-week': {
      const weekRange = getCurrentWeekRange();
      startDate = weekRange.start;
      endDate = weekRange.end;
      description = `Current Week (${formatDateDisplay(new Date(startDate))} - ${formatDateDisplay(new Date(endDate))})`;
      break;
    }
    
    case 'current-sprint': {
      const sprintInfo = await getCurrentSprintInfo();
      if (!sprintInfo) {
        throw new Error('No current sprint found. Please set up sprint settings first.');
      }
      startDate = sprintInfo.startDate;
      endDate = sprintInfo.endDate;
      description = `Sprint ${sprintInfo.sprintNumber} (${formatDateDisplay(new Date(startDate))} - ${formatDateDisplay(new Date(endDate))})`;
      break;
    }
    
    case 'previous-sprint': {
      const prevSprintInfo = await getPreviousSprintInfo();
      if (!prevSprintInfo) {
        throw new Error('Cannot calculate previous sprint. Please ensure sprint settings are configured.');
      }
      startDate = prevSprintInfo.startDate;
      endDate = prevSprintInfo.endDate;
      description = `Previous Sprint ${prevSprintInfo.sprintNumber} (${formatDateDisplay(new Date(startDate))} - ${formatDateDisplay(new Date(endDate))})`;
      break;
    }
    
    case 'custom-range': {
      if (!customStartDate || !customEndDate) {
        throw new Error('Custom date range requires both start and end dates');
      }
      
      // Validate date range
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      
      if (start > end) {
        throw new Error('Start date must be before or equal to end date');
      }
      
      // Check if range is too large (more than 12 weeks)
      const diffTime = end.getTime() - start.getTime();
      const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
      
      if (diffWeeks > 12) {
        throw new Error('Date range cannot exceed 12 weeks. Please select a shorter period.');
      }
      
      startDate = customStartDate;
      endDate = customEndDate;
      description = `Custom Range (${formatDateDisplay(start)} - ${formatDateDisplay(end)})`;
      break;
    }
    
    case 'complete-overview': {
      // Last 4 weeks for complete overview
      const today = new Date();
      const fourWeeksAgo = new Date(today);
      fourWeeksAgo.setDate(today.getDate() - 28);
      
      startDate = fourWeeksAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
      description = `Complete Overview (Last 4 Weeks)`;
      break;
    }
    
    default:
      throw new Error(`Invalid export type: ${exportType}`);
  }
  
  // Calculate working days and generate week days array
  const workingDays = calculateWorkingDays(startDate, endDate);
  const totalDays = calculateTotalDays(startDate, endDate);
  const weekDays = generateWeekDaysArray(startDate, endDate);
  
  const result: DateRangeResult = {
    start: startDate,
    end: endDate,
    description,
    exportType,
    workingDays,
    totalDays,
    weekDays
  };
  
  console.log('📅 Enhanced date range calculated:', result);
  return result;
};

/**
 * Get current week range (Sunday to Thursday)
 */
export const getCurrentWeekRange = (): { start: string; end: string } => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Go to Sunday
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Thursday (Sunday + 4 days)
  
  return {
    start: weekStart.toISOString().split('T')[0],
    end: weekEnd.toISOString().split('T')[0]
  };
};

/**
 * Get current sprint information from database with smart detection fallback
 */
export const getCurrentSprintInfo = async (): Promise<SprintInfo | null> => {
  try {
    // First try to get sprint from database
    const sprint = await DatabaseService.getCurrentGlobalSprint();
    
    // If we got a sprint from database, validate it contains current date
    if (sprint) {
      const today = new Date();
      const sprintStart = new Date(sprint.sprint_start_date);
      const sprintEnd = new Date(sprint.sprint_end_date);
      
      // Check if current date falls within sprint range
      if (today >= sprintStart && today <= sprintEnd) {
        console.log('✅ Database sprint is valid for current date');
        return {
          sprintNumber: sprint.current_sprint_number,
          startDate: sprint.sprint_start_date,
          endDate: sprint.sprint_end_date,
          lengthWeeks: sprint.sprint_length_weeks,
          isActive: true
        };
      } else {
        console.warn(`⚠️ Database sprint (${sprint.current_sprint_number}) does not contain current date. Start: ${sprintStart.toDateString()}, End: ${sprintEnd.toDateString()}, Today: ${today.toDateString()}`);
        console.log('🔄 Falling back to smart sprint detection...');
      }
    }
    
    // Fallback to smart sprint detection
    const { detectCurrentSprintForDate } = await import('@/utils/smartSprintDetection');
    const smartSprint = await detectCurrentSprintForDate();
    
    if (!smartSprint) {
      throw new Error('Unable to detect current sprint information');
    }
    
    console.log(`✅ Smart detection activated: ${smartSprint.sprintName} for ${new Date().toDateString()}`);
    
    return {
      sprintNumber: smartSprint.sprintNumber,
      startDate: smartSprint.startDate.toISOString().split('T')[0],
      endDate: smartSprint.endDate.toISOString().split('T')[0],
      lengthWeeks: smartSprint.lengthWeeks,
      isActive: smartSprint.isActive
    };
    
  } catch (error) {
    console.error('Error fetching current sprint info:', error);
    return null;
  }
};

/**
 * Calculate previous sprint information
 */
export const getPreviousSprintInfo = async (): Promise<SprintInfo | null> => {
  try {
    const currentSprint = await getCurrentSprintInfo();
    
    if (!currentSprint) {
      return null;
    }
    
    // Calculate previous sprint dates
    const currentSprintStart = new Date(currentSprint.startDate);
    const prevSprintEnd = new Date(currentSprintStart);
    prevSprintEnd.setDate(currentSprintStart.getDate() - 1);
    
    const prevSprintStart = new Date(prevSprintEnd);
    prevSprintStart.setDate(prevSprintEnd.getDate() - (currentSprint.lengthWeeks * 7) + 1);
    
    return {
      sprintNumber: currentSprint.sprintNumber - 1,
      startDate: prevSprintStart.toISOString().split('T')[0],
      endDate: prevSprintEnd.toISOString().split('T')[0],
      lengthWeeks: currentSprint.lengthWeeks,
      isActive: false
    };
  } catch (error) {
    console.error('Error calculating previous sprint info:', error);
    return null;
  }
};

/**
 * Calculate working days (Sunday to Thursday) in date range
 */
export const calculateWorkingDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek >= 0 && dayOfWeek <= 4) { // Sunday (0) to Thursday (4)
      workingDays++;
    }
  }
  
  return workingDays;
};

/**
 * Calculate total days in date range
 */
export const calculateTotalDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Generate array of week days (only working days) in date range
 */
export const generateWeekDaysArray = (startDate: string, endDate: string): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const weekDays: string[] = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek >= 0 && dayOfWeek <= 4) { // Sunday (0) to Thursday (4)
      weekDays.push(d.toISOString().split('T')[0]);
    }
  }
  
  return weekDays;
};

/**
 * Format date for display
 */
export const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Format date range for display
 */
export const formatDateRangeDisplay = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${formatDateDisplay(start)} - ${formatDateDisplay(end)}`;
};

/**
 * Calculate date range duration description
 */
export const calculateDateRangeDuration = (startDate: string, endDate: string): string => {
  const totalDays = calculateTotalDays(startDate, endDate);
  const workingDays = calculateWorkingDays(startDate, endDate);
  
  if (totalDays === 1) {
    return '1 day';
  }
  
  if (workingDays === totalDays) {
    return `${totalDays} working days`;
  }
  
  return `${totalDays} total days (${workingDays} working days)`;
};

/**
 * Validate custom date range
 */
export const validateCustomDateRange = (startDate: string, endDate: string): { isValid: boolean; error?: string } => {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Both start and end dates are required' };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  if (start > end) {
    return { isValid: false, error: 'Start date must be before or equal to end date' };
  }
  
  // Check if range is too large (more than 12 weeks)
  const diffTime = end.getTime() - start.getTime();
  const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
  
  if (diffWeeks > 12) {
    return { isValid: false, error: 'Date range cannot exceed 12 weeks' };
  }
  
  // Check if dates are too far in the future (more than 4 weeks)
  const today = new Date();
  const fourWeeksFromNow = new Date(today);
  fourWeeksFromNow.setDate(today.getDate() + 28);
  
  if (start > fourWeeksFromNow) {
    return { isValid: false, error: 'Start date cannot be more than 4 weeks in the future' };
  }
  
  return { isValid: true };
};

/**
 * Get sprint end date for display
 */
export const calculateSprintEndDate = (sprint: { sprint_start_date: string; sprint_length_weeks: number }): string => {
  if (!sprint) return 'N/A';
  
  const startDate = new Date(sprint.sprint_start_date);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (sprint.sprint_length_weeks * 7) - 1);
  
  return formatDateDisplay(endDate);
};

/**
 * Check if date is in current week
 */
export const isInCurrentWeek = (date: string): boolean => {
  const currentWeek = getCurrentWeekRange();
  return date >= currentWeek.start && date <= currentWeek.end;
};

/**
 * Check if date is in current sprint
 */
export const isInCurrentSprint = async (date: string): Promise<boolean> => {
  const currentSprint = await getCurrentSprintInfo();
  if (!currentSprint) return false;
  
  return date >= currentSprint.startDate && date <= currentSprint.endDate;
};

/**
 * Generate export filename with enhanced context
 */
export const generateEnhancedExportFilename = (
  exportType: EnhancedExportType,
  userRole: 'coo' | 'manager',
  teamName?: string,
  startDate?: string,
  endDate?: string
): string => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Role prefix
    const rolePrefix = userRole === 'coo' ? 'COO-Company' : `Manager-${(teamName || 'Team').replace(/\s+/g, '-')}`;
    
    // Export type context
    let typeContext: string;
    switch (exportType) {
      case 'current-week':
        typeContext = 'Current-Week';
        break;
      case 'current-sprint':
        typeContext = 'Current-Sprint';
        break;
      case 'previous-sprint':
        typeContext = 'Previous-Sprint';
        break;
      case 'custom-range':
        if (startDate && endDate) {
          typeContext = `Custom-${startDate}-to-${endDate}`;
        } else {
          typeContext = 'Custom-Range';
        }
        break;
      case 'complete-overview':
        typeContext = 'Complete-Overview';
        break;
      default:
        typeContext = 'Export';
    }
    
    // Clean up filename components
    const cleanRolePrefix = rolePrefix.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 30);
    const cleanTypeContext = typeContext.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 40);
    
    return `${cleanRolePrefix}-${cleanTypeContext}-${timestamp}.xlsx`;
  } catch (error) {
    console.error('Error generating enhanced filename:', error);
    return `Export-${Date.now()}.xlsx`;
  }
};

/**
 * Get default custom date range (current week)
 */
export const getDefaultCustomDateRange = (): { startDate: string; endDate: string } => {
  const currentWeek = getCurrentWeekRange();
  return {
    startDate: currentWeek.start,
    endDate: currentWeek.end
  };
};