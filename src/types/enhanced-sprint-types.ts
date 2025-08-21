/**
 * Enhanced Sprint Type Definitions for V2.2
 * 
 * Updated interface definitions to match the new enhanced sprint infrastructure
 * Created as part of Database Schema Audit Report implementation
 */

// Enhanced Sprint View Interface (matches current_enhanced_sprint view)
export interface EnhancedSprintView {
  id: string;
  sprint_number: number;
  start_date: string;
  end_date: string;
  length_weeks: number;
  working_days_count: number;
  is_active: boolean;
  notes: string;
  days_elapsed: number;
  days_remaining: number;
  total_days: number;
  progress_percentage: number;
  working_days_remaining: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Enhanced Sprint Config Table Interface
export interface EnhancedSprintConfig {
  id: string;
  sprint_number: number;
  start_date: string;
  end_date: string;
  length_weeks: number;
  working_days_count?: number;
  is_active: boolean;
  created_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Updated Database Interface (temporarily commented out to fix build)
// TODO: Re-enable when proper Database type is available
/*
export interface DatabaseEnhanced extends Database {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      enhanced_sprint_configs: {
        Row: EnhancedSprintConfig;
        Insert: Omit<EnhancedSprintConfig, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<EnhancedSprintConfig, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
    };
    Views: Database['public']['Views'] & {
      current_enhanced_sprint: {
        Row: EnhancedSprintView;
      };
    };
  };
}
*/

// Sprint Data Consistency Validation Interface
export interface SprintDataValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sprint_source: 'enhanced_view' | 'legacy_view' | 'smart_detection';
  validation_timestamp: string;
}

// Working Day Calculation Interface  
export interface WorkingDayInfo {
  work_date: string;
  day_of_week: number;
  is_working_day: boolean;
  week_number: number;
}

// Sprint Validation Result Interface
export interface SprintValidationResult {
  calculated_end_date: string;
  total_days: number;
  working_days: number;
  weekend_days: number;
}

// Cache Key Updates for Enhanced Sprint Data
export const EnhancedCacheKeys = {
  ENHANCED_SPRINT_VIEW: 'enhanced_sprint_view',
  ENHANCED_SPRINT_CONFIG: (sprintNumber: number) => `enhanced_sprint_config_${sprintNumber}`,
  WORKING_DAYS_CURRENT_SPRINT: 'current_sprint_working_days',
  SPRINT_VALIDATION: (startDate: string, weeks: number) => `sprint_validation_${startDate}_${weeks}w`
} as const;

// Type guards for runtime validation
export function isEnhancedSprintView(obj: any): obj is EnhancedSprintView {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.sprint_number === 'number' &&
    typeof obj.start_date === 'string' &&
    typeof obj.end_date === 'string' &&
    typeof obj.working_days_count === 'number' &&
    typeof obj.is_current === 'boolean'
  );
}

export function isEnhancedSprintConfig(obj: any): obj is EnhancedSprintConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.sprint_number === 'number' &&
    typeof obj.start_date === 'string' &&
    typeof obj.end_date === 'string' &&
    typeof obj.is_active === 'boolean'
  );
}

// Migration utility functions
export function convertLegacyToEnhanced(legacy: CurrentGlobalSprint): Partial<EnhancedSprintView> {
  return {
    id: legacy.id?.toString() || 'unknown',
    sprint_number: legacy.current_sprint_number,
    start_date: legacy.sprint_start_date,
    end_date: legacy.sprint_end_date,
    length_weeks: legacy.sprint_length_weeks,
    progress_percentage: Number(legacy.progress_percentage),
    days_remaining: legacy.days_remaining,
    working_days_remaining: legacy.working_days_remaining || 0,
    is_active: legacy.is_active,
    is_current: legacy.is_active,
    notes: legacy.notes || '',
    created_at: legacy.created_at,
    updated_at: legacy.updated_at,
    created_by: legacy.updated_by
  };
}

export function validateSprintDataConsistency(
  enhanced: EnhancedSprintView,
  legacy: CurrentGlobalSprint
): SprintDataValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical field validation
  if (enhanced.sprint_number !== legacy.current_sprint_number) {
    errors.push(`Sprint number mismatch: ${enhanced.sprint_number} vs ${legacy.current_sprint_number}`);
  }

  if (enhanced.start_date !== legacy.sprint_start_date) {
    errors.push(`Start date mismatch: ${enhanced.start_date} vs ${legacy.sprint_start_date}`);
  }

  if (enhanced.end_date !== legacy.sprint_end_date) {
    errors.push(`End date mismatch: ${enhanced.end_date} vs ${legacy.sprint_end_date}`);
  }

  // Warning-level validations
  if (Math.abs(enhanced.progress_percentage - Number(legacy.progress_percentage)) > 1) {
    warnings.push(`Progress percentage difference: ${enhanced.progress_percentage}% vs ${legacy.progress_percentage}%`);
  }

  if (enhanced.is_current !== legacy.is_active) {
    warnings.push(`Active status mismatch: ${enhanced.is_current} vs ${legacy.is_active}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sprint_source: 'enhanced_view',
    validation_timestamp: new Date().toISOString()
  };
}

// Import the existing CurrentGlobalSprint type for compatibility
import type { CurrentGlobalSprint } from '@/types';
// Note: Database type temporarily commented out to fix build