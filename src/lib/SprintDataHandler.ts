/**
 * Centralized Sprint Data Handler
 * 
 * Single source of truth for all sprint-related data and operations.
 * Handles intelligent fallbacks, caching, and consistent date calculations.
 * Eliminates "No current sprint data available" errors by providing reliable defaults.
 * 
 * Key Features:
 * - Intelligent fallback hierarchy (Database → Smart Detection → Emergency Defaults)
 * - Caching with proper invalidation
 * - Consistent date calculations across all components
 * - Automatic sprint initialization for empty databases
 * - Monday-Friday working week as default
 */

import { CurrentGlobalSprint, GlobalSprintSettings } from '@/types';
import { supabase } from './supabase';
import { debug, warn, error as logError } from '@/utils/debugLogger';

export interface SprintDataResult {
  success: boolean;
  sprint: CurrentGlobalSprint;
  source: 'database' | 'smart_detection' | 'emergency_default';
  cached: boolean;
  warnings: string[];
  errors: string[];
}

export interface SprintCacheEntry {
  data: CurrentGlobalSprint;
  timestamp: number;
  source: string;
  version: string;
}

class SprintDataManager {
  private cache: Map<string, SprintCacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_VERSION = '1.0.0';
  private initializationPromise: Promise<void> | null = null;

  /**
   * Main entry point - Get current sprint data with intelligent fallback
   */
  async getCurrentSprint(): Promise<SprintDataResult> {
    const startTime = performance.now();
    const result: SprintDataResult = {
      success: false,
      sprint: null as any,
      source: 'database',
      cached: false,
      warnings: [],
      errors: []
    };

    try {
      // Check cache first
      const cached = this.getCachedSprint();
      if (cached) {
        result.sprint = cached.data;
        result.source = cached.source as any;
        result.cached = true;
        result.success = true;
        console.log(`✅ Sprint data from cache (${cached.source})`, cached.data);
        debug(`✅ Sprint data from cache (${cached.source})`);
        return result;
      }
      
      // PERFORMANCE FIX: Remove cache miss logging for production performance

      // Try database first
      const dbResult = await this.getSprintFromDatabase();
      if (dbResult.success) {
        this.setCachedSprint(dbResult.sprint, 'database');
        result.sprint = dbResult.sprint;
        result.source = 'database';
        result.success = true;
        result.warnings = dbResult.warnings;
        debug(`✅ Sprint data from database`);
        return result;
      }

      result.warnings.push(...dbResult.warnings);
      result.errors.push(...dbResult.errors);

      // Fallback to smart detection
      warn('Database sprint detection failed, using smart detection fallback');
      const smartResult = await this.getSprintFromSmartDetection();
      if (smartResult.success) {
        this.setCachedSprint(smartResult.sprint, 'smart_detection');
        result.sprint = smartResult.sprint;
        result.source = 'smart_detection';
        result.success = true;
        result.warnings.push(...smartResult.warnings);
        debug(`✅ Sprint data from smart detection`);
        return result;
      }

      result.warnings.push(...smartResult.warnings);
      result.errors.push(...smartResult.errors);

      // Final fallback - emergency default
      console.log('🚨 Smart detection failed, using emergency default sprint');
      warn('Smart detection failed, using emergency default sprint');
      const emergencyResult = this.createEmergencyDefaultSprint();
      console.log('📊 Emergency default sprint created:', emergencyResult.sprint);
      this.setCachedSprint(emergencyResult.sprint, 'emergency_default');
      result.sprint = emergencyResult.sprint;
      result.source = 'emergency_default';
      result.success = true;
      result.warnings.push('Using emergency default sprint configuration');
      
      debug(`⚠️ Using emergency default sprint (${performance.now() - startTime}ms)`);
      return result;

    } catch (error) {
      logError('Critical error in getCurrentSprint:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      // Even in error, provide emergency sprint to prevent app crash
      const emergencyResult = this.createEmergencyDefaultSprint();
      result.sprint = emergencyResult.sprint;
      result.source = 'emergency_default';
      result.success = true;
      result.warnings.push('Critical error occurred, using emergency configuration');
      
      return result;
    }
  }

  /**
   * Get sprint data from database with proper error handling
   */
  private async getSprintFromDatabase(): Promise<SprintDataResult> {
    const result: SprintDataResult = {
      success: false,
      sprint: null as any,
      source: 'database',
      cached: false,
      warnings: [],
      errors: []
    };

    try {
      // PERFORMANCE FIX: Remove sprint history table check logging
      
      // First, try to get from sprint_history table (preferred)
      const { data: historyData, error: historyError } = await supabase
        .from('sprint_history')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      // PERFORMANCE FIX: Remove sprint history query result logging

      if (!historyError && historyData && historyData.length > 0) {
        const sprintRecord = historyData[0];
        const sprint = this.convertHistoryToCurrentSprint(sprintRecord);
        result.sprint = sprint;
        result.success = true;
        // PERFORMANCE FIX: Remove found active sprint logging
        debug('Found active sprint in sprint_history table');
        return result;
      }

      if (historyError) {
        console.log('❌ Sprint history query error:', historyError);
        result.warnings.push(`Sprint history query error: ${historyError.message}`);
      } else {
        console.log('⚠️ No active sprint found in sprint_history table');
      }

      console.log('🔍 SprintDataHandler: Checking global_sprint_settings table...');
      
      // Fallback to global_sprint_settings table
      const { data: settingsData, error: settingsError } = await supabase
        .from('global_sprint_settings')
        .select('*')
        .limit(1);

      console.log('📊 Global sprint settings query result:', { 
        settingsData, 
        settingsError, 
        count: settingsData?.length 
      });

      if (!settingsError && settingsData && settingsData.length > 0) {
        const settings = settingsData[0];
        const sprint = this.convertSettingsToCurrentSprint(settings);
        result.sprint = sprint;
        result.success = true;
        console.log('✅ Found sprint in global_sprint_settings table:', settings);
        debug('Found sprint in global_sprint_settings table');
        return result;
      }

      if (settingsError) {
        console.log('❌ Global sprint settings error:', settingsError);
        result.errors.push(`Global sprint settings error: ${settingsError.message}`);
      } else {
        console.log('⚠️ No sprint found in global_sprint_settings table');
      }

      // No sprint data found in database
      console.log('❌ No active sprint found in any database tables');
      result.errors.push('No active sprint found in database tables');
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Database query failed');
      return result;
    }
  }

  /**
   * Get sprint data using smart detection (date-based calculation)
   */
  private async getSprintFromSmartDetection(): Promise<SprintDataResult> {
    const result: SprintDataResult = {
      success: false,
      sprint: null as any,
      source: 'smart_detection',
      cached: false,
      warnings: [],
      errors: []
    };

    try {
      const today = new Date();
      const sprint = this.calculateCurrentWeekSprint(today);
      result.sprint = sprint;
      result.success = true;
      debug('Generated sprint using smart detection');
      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Smart detection failed');
      return result;
    }
  }

  /**
   * Create emergency default sprint to prevent app crashes
   */
  private createEmergencyDefaultSprint(): SprintDataResult {
    const today = new Date();
    const sprint = this.calculateCurrentWeekSprint(today);
    
    return {
      success: true,
      sprint,
      source: 'emergency_default',
      cached: false,
      warnings: ['Using emergency default sprint configuration'],
      errors: []
    };
  }

  /**
   * Calculate current week-based sprint (Monday-Friday default)
   */
  private calculateCurrentWeekSprint(date: Date): CurrentGlobalSprint {
    // Get current Monday (start of work week)
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
    startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate Friday (end of work week)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 4); // Monday + 4 = Friday
    endOfWeek.setHours(23, 59, 59, 999);

    // Calculate progress and remaining days
    const now = new Date();
    const totalDays = 5; // Monday to Friday
    const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((now.getTime() - startOfWeek.getTime()) / (24 * 60 * 60 * 1000))));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const progressPercentage = Math.round((elapsedDays / totalDays) * 100);

    // Determine if weekend (Saturday/Sunday)
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const workingDaysRemaining = isWeekend ? 5 : Math.max(0, 6 - now.getDay()); // Monday=1, Friday=5

    return {
      id: `week-${this.formatDate(startOfWeek)}`,
      current_sprint_number: this.calculateWeekNumber(startOfWeek),
      sprint_length_weeks: 1,
      sprint_start_date: this.formatDate(startOfWeek),
      sprint_end_date: this.formatDate(endOfWeek),
      progress_percentage: progressPercentage,
      days_remaining: remainingDays,
      working_days_remaining: workingDaysRemaining,
      is_active: true,
      notes: `Week of ${this.formatDateForDisplay(startOfWeek)} - Auto-generated weekly sprint (Monday-Friday)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system'
    };
  }

  /**
   * Calculate week number for sprint numbering
   */
  private calculateWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    return weekNumber;
  }

  /**
   * Convert sprint_history record to CurrentGlobalSprint format
   */
  private convertHistoryToCurrentSprint(record: any): CurrentGlobalSprint {
    // PERFORMANCE FIX: Remove history conversion logging
    
    const startDate = new Date(record.sprint_start_date);
    const endDate = new Date(record.sprint_end_date);
    const now = new Date();
    
    // PERFORMANCE FIX: Remove date conversion logging
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const elapsedDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const progressPercentage = Math.round((elapsedDays / totalDays) * 100);
    
    // Calculate working days (assume 5 days per week)
    const workingDaysTotal = Math.ceil(totalDays * (5/7));
    const workingDaysElapsed = Math.ceil(elapsedDays * (5/7));
    const workingDaysRemaining = Math.max(0, workingDaysTotal - workingDaysElapsed);

    const convertedSprint = {
      id: record.id?.toString() || `history-${record.sprint_number}`,
      current_sprint_number: record.sprint_number,
      sprint_length_weeks: record.sprint_length_weeks,
      sprint_start_date: record.sprint_start_date,
      sprint_end_date: record.sprint_end_date,
      progress_percentage: progressPercentage,
      days_remaining: remainingDays,
      working_days_remaining: workingDaysRemaining,
      is_active: record.status === 'active',
      notes: record.notes || `Sprint ${record.sprint_number}`,
      created_at: record.created_at,
      updated_at: record.updated_at,
      updated_by: record.created_by || 'system'
    };
    
    // PERFORMANCE FIX: Remove converted sprint logging
    return convertedSprint;
  }

  /**
   * Convert global_sprint_settings to CurrentGlobalSprint format
   */
  private convertSettingsToCurrentSprint(settings: any): CurrentGlobalSprint {
    const startDate = new Date(settings.sprint_start_date);
    // Calculate end date if not provided (fallback for missing sprint_end_date column)
    const endDate = settings.sprint_end_date 
      ? new Date(settings.sprint_end_date)
      : new Date(startDate.getTime() + (settings.sprint_length_weeks || 2) * 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    console.log('🔧 Converting settings to sprint:', { 
      settingsData: settings,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      hasEndDate: !!settings.sprint_end_date
    });
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const elapsedDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const progressPercentage = Math.round((elapsedDays / totalDays) * 100);
    
    const workingDaysTotal = Math.ceil(totalDays * (5/7));
    const workingDaysElapsed = Math.ceil(elapsedDays * (5/7));
    const workingDaysRemaining = Math.max(0, workingDaysTotal - workingDaysElapsed);

    return {
      id: settings.id?.toString() || 'settings-current',
      current_sprint_number: settings.current_sprint_number || 1,
      sprint_length_weeks: settings.sprint_length_weeks || 2,
      sprint_start_date: settings.sprint_start_date,
      sprint_end_date: settings.sprint_end_date,
      progress_percentage: progressPercentage,
      days_remaining: remainingDays,
      working_days_remaining: workingDaysRemaining,
      is_active: true,
      notes: `Sprint ${settings.current_sprint_number || 1} - ${settings.description || 'From global sprint settings'}`,
      created_at: settings.created_at || new Date().toISOString(),
      updated_at: settings.updated_at || new Date().toISOString(),
      updated_by: 'system'
    };
  }

  /**
   * Cache management methods
   */
  private getCachedSprint(): SprintCacheEntry | null {
    const cached = this.cache.get('current_sprint');
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    const isWrongVersion = cached.version !== this.CACHE_VERSION;
    
    if (isExpired || isWrongVersion) {
      this.cache.delete('current_sprint');
      return null;
    }
    
    return cached;
  }

  private setCachedSprint(sprint: CurrentGlobalSprint, source: string): void {
    this.cache.set('current_sprint', {
      data: sprint,
      timestamp: Date.now(),
      source,
      version: this.CACHE_VERSION
    });
  }

  /**
   * Cache invalidation methods
   */
  public invalidateCache(): void {
    this.cache.clear();
    debug('Sprint cache invalidated');
  }

  public invalidateSprintCache(): void {
    this.cache.delete('current_sprint');
    debug('Sprint cache entry invalidated');
  }

  /**
   * Initialize sprint settings if database is empty
   */
  public async initializeSprintSettings(): Promise<boolean> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      return true;
    }

    this.initializationPromise = this.performInitialization();
    await this.initializationPromise;
    this.initializationPromise = null;
    return true;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Check if we already have sprint settings
      const { data: existingSettings } = await supabase
        .from('global_sprint_settings')
        .select('*')
        .limit(1);

      if (existingSettings && existingSettings.length > 0) {
        debug('Sprint settings already exist, skipping initialization');
        return;
      }

      // Create default sprint settings
      const today = new Date();
      const startOfWeek = this.calculateCurrentWeekSprint(today);
      
      const defaultSettings = {
        current_sprint_number: 1,
        sprint_length_weeks: 1,
        sprint_start_date: startOfWeek.sprint_start_date,
        sprint_end_date: startOfWeek.sprint_end_date,
        working_days_per_week: 5,
        description: 'Auto-initialized default sprint settings',
        created_by: 'SprintDataHandler',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('global_sprint_settings')
        .insert(defaultSettings);

      if (error) {
        warn('Failed to initialize sprint settings:', error.message);
      } else {
        debug('✅ Sprint settings initialized successfully');
        this.invalidateCache(); // Clear cache to force refresh
      }

    } catch (error) {
      logError('Error during sprint initialization:', error);
    }
  }

  /**
   * Utility methods for date formatting
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Health check method for monitoring
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const start = performance.now();
    const details: Record<string, any> = {};

    try {
      // Test sprint data retrieval
      const result = await this.getCurrentSprint();
      details.sprintDataAvailable = result.success;
      details.dataSource = result.source;
      details.cacheHit = result.cached;
      details.responseTime = performance.now() - start;
      details.warnings = result.warnings;
      details.errors = result.errors;

      // Determine health status
      if (result.success && result.source === 'database' && result.errors.length === 0) {
        return { status: 'healthy', details };
      } else if (result.success && result.warnings.length > 0) {
        return { status: 'degraded', details };
      } else {
        return { status: 'unhealthy', details };
      }

    } catch (error) {
      details.error = error instanceof Error ? error.message : 'Unknown error';
      details.responseTime = performance.now() - start;
      return { status: 'unhealthy', details };
    }
  }
}

// Export singleton instance
export const sprintDataHandler = new SprintDataManager();

// Export types and utilities already declared above