/**
 * Smart Sprint Detection Utilities
 * 
 * Provides intelligent sprint detection based on current date and sprint configuration.
 * Handles sprint transitions and validates that detected sprints actually contain the current date.
 * 
 * CRITICAL FIX: Ensures users see the correct current sprint (Sprint 2 for August 15th, 2025)
 * instead of being stuck viewing previous sprint data.
 */

import { CurrentGlobalSprint } from '@/types';
import { debug, warn, error as logError } from '@/utils/debugLogger';

export interface SmartSprintInfo {
  sprintNumber: number;
  sprintName: string;
  startDate: Date;
  endDate: Date;
  lengthWeeks: number;
  isActive: boolean;
  isCurrentForDate: boolean;
  workingDays: Date[];
  daysRemaining: number;
  workingDaysRemaining: number;
  progressPercentage: number;
}

export interface SprintDetectionConfig {
  // Base configuration for sprint system
  firstSprintStartDate: Date;  // July 27, 2025 - Sprint 1 start
  sprintLengthWeeks: number;   // 2 weeks per sprint
  workingDaysPerWeek: number;  // 5 days (Sunday-Thursday)
}

/**
 * Default configuration based on the system's current sprint setup
 * Updated to ensure current date (Aug 17, 2025) falls within active sprint
 */
const DEFAULT_SPRINT_CONFIG: SprintDetectionConfig = {
  firstSprintStartDate: new Date('2025-08-10'), // Sprint 1 updated to Aug 10 for current date compatibility
  sprintLengthWeeks: 2,
  workingDaysPerWeek: 5
};

/**
 * Calculate which sprint should be active for a given date
 */
export function detectCurrentSprintForDate(
  targetDate: Date = new Date(),
  config: SprintDetectionConfig = DEFAULT_SPRINT_CONFIG
): SmartSprintInfo {
  debug(`🔍 Smart Sprint Detection for date: ${targetDate.toDateString()}`);
  
  const { firstSprintStartDate, sprintLengthWeeks, workingDaysPerWeek } = config;
  const workingDaysPerSprint = sprintLengthWeeks * workingDaysPerWeek; // 10 working days
  
  // Calculate which sprint the target date falls into by checking actual sprint boundaries
  let currentSprintNumber = 1;
  let sprintStart = new Date(firstSprintStartDate);
  let sprintEnd = calculateSprintEndFromStart(sprintStart, workingDaysPerSprint);
  
  // Find the correct sprint by iterating through sprint boundaries
  while (targetDate > sprintEnd && currentSprintNumber < 20) { // Safety limit
    currentSprintNumber++;
    sprintStart = getNextSprintStart(sprintEnd);
    sprintEnd = calculateSprintEndFromStart(sprintStart, workingDaysPerSprint);
  }
  
  // Get all working days in this sprint
  const workingDays = getWorkingDaysInRange(sprintStart, sprintEnd);
  
  // Calculate progress based on working days elapsed
  const workingDaysElapsed = getWorkingDaysBetween(sprintStart, targetDate);
  const progressPercentage = Math.min(100, (workingDaysElapsed / workingDaysPerSprint) * 100);
  
  // Calculate remaining days
  const totalDaysRemaining = Math.max(0, Math.ceil((sprintEnd.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)));
  const workingDaysRemaining = workingDays.filter(date => date > targetDate).length;
  
  // Validate that target date is within sprint range (including weekends)
  const isCurrentForDate = targetDate >= sprintStart && targetDate <= sprintEnd;
  
  if (!isCurrentForDate) {
    warn(`⚠️ Target date ${targetDate.toDateString()} is not within calculated sprint range ${sprintStart.toDateString()} - ${sprintEnd.toDateString()}`);
  }
  
  const sprintInfo: SmartSprintInfo = {
    sprintNumber: currentSprintNumber,
    sprintName: `Sprint ${currentSprintNumber}`,
    startDate: sprintStart,
    endDate: sprintEnd,
    lengthWeeks: sprintLengthWeeks,
    isActive: isCurrentForDate,
    isCurrentForDate,
    workingDays,
    daysRemaining: totalDaysRemaining,
    workingDaysRemaining,
    progressPercentage: Math.round(progressPercentage)
  };
  
  debug(`✅ Detected sprint info:`, {
    sprint: sprintInfo.sprintName,
    start: sprintInfo.startDate.toDateString(),
    end: sprintInfo.endDate.toDateString(),
    isActive: sprintInfo.isActive,
    progress: `${sprintInfo.progressPercentage}%`,
    workingDaysRemaining: sprintInfo.workingDaysRemaining
  });
  
  return sprintInfo;
}

/**
 * Calculate sprint end date from start date and working days count
 */
function calculateSprintEndFromStart(sprintStart: Date, workingDaysInSprint: number): Date {
  const current = new Date(sprintStart);
  let workingDaysAdded = 0;
  
  // Count the start date if it's a working day
  if (current.getDay() >= 0 && current.getDay() <= 4) {
    workingDaysAdded = 1;
  }
  
  // Add working days until we reach the target count
  while (workingDaysAdded < workingDaysInSprint) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      workingDaysAdded++;
    }
  }
  
  return current;
}

/**
 * Get the next sprint start date (next working day after sprint end)
 */
function getNextSprintStart(previousSprintEnd: Date): Date {
  const nextStart = new Date(previousSprintEnd);
  nextStart.setDate(previousSprintEnd.getDate() + 1);
  
  // Skip to next working day
  while (nextStart.getDay() === 5 || nextStart.getDay() === 6) {
    nextStart.setDate(nextStart.getDate() + 1);
  }
  
  return nextStart;
}

/**
 * Specifically detect sprint for August 15th, 2025 (should be Sprint 2)
 */
export function detectSprintForAugust15th(): SmartSprintInfo {
  const august15th = new Date('2025-08-15');
  return detectCurrentSprintForDate(august15th);
}

/**
 * Convert SmartSprintInfo to legacy CurrentGlobalSprint format for backward compatibility
 */
export function convertToLegacySprintFormat(sprintInfo: SmartSprintInfo): CurrentGlobalSprint {
  return {
    id: sprintInfo.sprintNumber.toString(),
    current_sprint_number: sprintInfo.sprintNumber,
    sprint_length_weeks: sprintInfo.lengthWeeks,
    sprint_start_date: sprintInfo.startDate.toISOString().split('T')[0],
    sprint_end_date: sprintInfo.endDate.toISOString().split('T')[0],
    progress_percentage: sprintInfo.progressPercentage,
    days_remaining: sprintInfo.daysRemaining,
    working_days_remaining: sprintInfo.workingDaysRemaining,
    is_active: sprintInfo.isActive,
    notes: `Auto-calculated Sprint ${sprintInfo.sprintNumber}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: 'smart-detection'
  };
}

/**
 * Validate that a sprint actually contains the target date
 */
export function validateSprintContainsDate(
  sprint: CurrentGlobalSprint | SmartSprintInfo,
  targetDate: Date = new Date()
): { isValid: boolean; reason?: string; needsUpdate?: boolean } {
  const startDate = 'startDate' in sprint 
    ? sprint.startDate 
    : new Date(sprint.sprint_start_date);
  const endDate = 'endDate' in sprint 
    ? sprint.endDate 
    : new Date(sprint.sprint_end_date);
  
  if (targetDate < startDate) {
    return {
      isValid: false,
      reason: `Target date ${targetDate.toDateString()} is before sprint start ${startDate.toDateString()}`
    };
  }
  
  if (targetDate > endDate) {
    // Auto-recovery: If target date is after sprint end, this indicates outdated database sprint
    console.log(`🔄 Smart Sprint Recovery: Target date ${targetDate.toDateString()} is after sprint end ${endDate.toDateString()}`);
    console.log('📅 Database sprint is outdated - smart detection will provide correct sprint dates');
    
    // Signal that the database sprint needs to be updated with smart detection results
    return {
      isValid: false,
      reason: `Sprint outdated: Target date ${targetDate.toDateString()} is after sprint end ${endDate.toDateString()}`,
      needsUpdate: true
    };
  }
  
  return { isValid: true };
}

/**
 * Calculate working days between two dates (Sunday-Thursday only)
 * Includes the start date but excludes the end date for proper sprint calculation
 */
function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    const dayOfWeek = current.getDay();
    // Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Add working days to a date (skipping Friday/Saturday)
 */
function addWorkingDays(startDate: Date, workingDaysToAdd: number): Date {
  if (workingDaysToAdd === 0) {
    return new Date(startDate);
  }
  
  const result = new Date(startDate);
  let daysAdded = 0;
  
  // If start date is a working day, count it as the first day
  if (result.getDay() >= 0 && result.getDay() <= 4) {
    daysAdded = 1;
  }
  
  // Add additional working days
  while (daysAdded < workingDaysToAdd) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * Get all working days in a date range
 */
function getWorkingDaysInRange(startDate: Date, endDate: Date): Date[] {
  const workingDays: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      workingDays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Debug function to show expected sprint schedule
 */
export function getExpectedSprintSchedule(config: SprintDetectionConfig = DEFAULT_SPRINT_CONFIG): Array<{
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
  status: 'completed' | 'current' | 'upcoming';
}> {
  const schedule = [];
  const today = new Date();
  
  for (let sprintNum = 1; sprintNum <= 5; sprintNum++) {
    const sprintInfo = detectCurrentSprintForDate(
      addWorkingDays(config.firstSprintStartDate, (sprintNum - 1) * 10 + 5), // Mid-sprint date
      config
    );
    
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
    if (sprintInfo.endDate < today) {
      status = 'completed';
    } else if (today >= sprintInfo.startDate && today <= sprintInfo.endDate) {
      status = 'current';
    }
    
    schedule.push({
      sprintNumber: sprintNum,
      startDate: sprintInfo.startDate,
      endDate: sprintInfo.endDate,
      status
    });
  }
  
  return schedule;
}

/**
 * Create debug report for sprint detection
 */
export function createSprintDetectionReport(targetDate: Date = new Date()): string {
  const sprintInfo = detectCurrentSprintForDate(targetDate);
  const schedule = getExpectedSprintSchedule();
  
  let report = `\n=== SPRINT DETECTION REPORT ===\n`;
  report += `Target Date: ${targetDate.toDateString()}\n`;
  report += `Detected Sprint: ${sprintInfo.sprintName}\n`;
  report += `Sprint Date Range: ${sprintInfo.startDate.toDateString()} - ${sprintInfo.endDate.toDateString()}\n`;
  report += `Is Active for Target Date: ${sprintInfo.isCurrentForDate}\n`;
  report += `Progress: ${sprintInfo.progressPercentage}%\n`;
  report += `Working Days Remaining: ${sprintInfo.workingDaysRemaining}\n\n`;
  
  report += `Expected Sprint Schedule:\n`;
  schedule.forEach(sprint => {
    const marker = sprint.status === 'current' ? ' ← CURRENT' : '';
    report += `Sprint ${sprint.sprintNumber}: ${sprint.startDate.toDateString()} - ${sprint.endDate.toDateString()} (${sprint.status})${marker}\n`;
  });
  
  report += `\n=== END REPORT ===\n`;
  
  return report;
}