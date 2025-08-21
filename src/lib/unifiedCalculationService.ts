/**
 * Unified Calculation Service - V2.2 Enhancement
 * 
 * Single source of truth for all calculation operations.
 * Replaces scattered calculation logic with centralized, consistent methods.
 * Ensures synchronized data between COO dashboard and team views.
 */

import { supabase } from './supabase';
import { DatabaseService } from './database';
import { dataConsistencyManager } from '@/utils/dataConsistencyManager';
import { enhancedCacheManager } from '@/utils/enhancedCacheManager';
import { calculationCacheManager } from '@/lib/performance/calculationCache';
import { TeamMember, CurrentGlobalSprint, ScheduleEntry, COODashboardData, TeamDashboardData, TeamCapacityStatus } from '@/types';
import { debug, operation, error as logError } from '@/utils/debugLogger';
import { retryOperation } from '@/utils/errorHandler';

// ================================================
// TYPES AND INTERFACES
// ================================================

export interface UnifiedSprintData {
  id: number;
  current_sprint_number: number;
  sprint_start_date: string;
  sprint_end_date: string;
  sprint_length_weeks: number;
  progress_percentage: number;
  days_remaining: number;
  total_days: number;
  is_active: boolean;
  validation_status: 'validated' | 'needs_validation';
  sync_timestamp: string;
}

export interface TeamCalculationResult {
  teamId: number;
  teamName: string;
  teamSize: number;
  sprintPotentialHours: number;
  actualHours: number;
  capacityUtilization: number;
  currentWeekHours: number;
  calculationTimestamp: string;
}

export interface CompanyCalculationResult {
  totalTeams: number;
  totalMembers: number;
  totalSprintHours: number;
  totalPotentialHours: number;
  overallUtilization: number;
  teamResults: TeamCalculationResult[];
  calculationTimestamp: string;
}

export interface SprintConsistencyResult {
  source: string;
  sprint_number: number;
  start_date: string;
  end_date: string;
  is_consistent: boolean;
  discrepancy: string;
}

// ================================================
// UNIFIED CALCULATION SERVICE CLASS
// ================================================

class UnifiedCalculationService {
  private static instance: UnifiedCalculationService;
  private databaseService: typeof DatabaseService;
  
  // Cache configuration
  private readonly CALCULATION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  private readonly SPRINT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {
    this.databaseService = DatabaseService;
  }

  static getInstance(): UnifiedCalculationService {
    if (!UnifiedCalculationService.instance) {
      UnifiedCalculationService.instance = new UnifiedCalculationService();
    }
    return UnifiedCalculationService.instance;
  }

  // ================================================
  // SPRINT DATA SYNCHRONIZATION
  // ================================================

  /**
   * Get unified sprint data with cross-validation and optimized caching
   */
  async getUnifiedSprintData(): Promise<UnifiedSprintData | null> {
    const cacheKey = 'unified_sprint_data';
    
    return calculationCacheManager.getSprintData(
      cacheKey,
      async () => {
        debug('Fetching unified sprint data with validation');
        
        try {
          // Try enhanced sprint view first
          const { data: enhancedData, error: enhancedError } = await supabase
            .from('current_enhanced_sprint')
            .select('*')
            .single();

          if (enhancedData && !enhancedError) {
            debug('Enhanced sprint data retrieved successfully');
            return enhancedData as UnifiedSprintData;
          }

          // Fallback to legacy view
          logError('Enhanced sprint view failed, using legacy fallback:', enhancedError);
          const { data: legacyData, error: legacyError } = await supabase
            .from('current_global_sprint')
            .select('*')
            .single();

          if (legacyData && !legacyError) {
            // Convert legacy format to unified format
            const unifiedData: UnifiedSprintData = {
              id: legacyData.id,
              current_sprint_number: legacyData.current_sprint_number,
              sprint_start_date: legacyData.sprint_start_date,
              sprint_end_date: legacyData.sprint_end_date,
              sprint_length_weeks: legacyData.sprint_length_weeks,
              progress_percentage: legacyData.progress_percentage,
              days_remaining: legacyData.days_remaining,
              total_days: legacyData.sprint_end_date && legacyData.sprint_start_date 
                ? Math.ceil((new Date(legacyData.sprint_end_date).getTime() - new Date(legacyData.sprint_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
                : 0,
              is_active: legacyData.is_active || false,
              validation_status: 'needs_validation',
              sync_timestamp: new Date().toISOString()
            };
            
            debug('Legacy sprint data converted to unified format');
            return unifiedData;
          }

          throw new Error('Both enhanced and legacy sprint views failed');
        } catch (error) {
          logError('Failed to get unified sprint data:', error);
          return null;
        }
      }
    );
  }

  /**
   * Validate sprint data consistency across all sources
   */
  async validateSprintConsistency(): Promise<SprintConsistencyResult[]> {
    const cacheKey = 'sprint_consistency_validation';
    
    return dataConsistencyManager.getCachedOrFetch(
      cacheKey,
      async () => {
        debug('Validating sprint consistency across sources');
        
        try {
          const { data, error } = await supabase
            .rpc('validate_sprint_consistency');

          if (error) {
            throw error;
          }

          return data as SprintConsistencyResult[];
        } catch (error) {
          logError('Sprint consistency validation failed:', error);
          return [];
        }
      },
      { cacheDuration: this.VALIDATION_CACHE_DURATION }
    );
  }

  /**
   * Force sprint data synchronization
   */
  async synchronizeSprintData(): Promise<boolean> {
    debug('Forcing sprint data synchronization');
    
    try {
      // Clear all caches to force fresh data
      dataConsistencyManager.clearAll();
      
      // Validate consistency
      const validationResults = await this.validateSprintConsistency();
      const hasInconsistencies = validationResults.some(result => !result.is_consistent);
      
      if (hasInconsistencies) {
        logError('Sprint data inconsistencies detected:', validationResults);
        return false;
      }
      
      debug('Sprint data synchronization completed successfully');
      return true;
    } catch (error) {
      logError('Sprint synchronization failed:', error);
      return false;
    }
  }

  // ================================================
  // UNIFIED CALCULATION METHODS
  // ================================================

  /**
   * Calculate team hours using unified database function
   */
  async calculateTeamHours(
    teamId: number, 
    startDate: string, 
    endDate: string
  ): Promise<number> {
    const cacheKey = `team_hours_${teamId}_${startDate}_${endDate}`;
    
    return dataConsistencyManager.getCachedOrFetch(
      cacheKey,
      async () => {
        debug(`Calculating team hours for team ${teamId} from ${startDate} to ${endDate}`);
        
        try {
          const { data, error } = await supabase
            .rpc('calculate_team_hours_unified', {
              p_team_id: teamId,
              p_start_date: startDate,
              p_end_date: endDate
            });

          if (error) {
            throw error;
          }

          return data?.[0]?.total_hours || 0;
        } catch (error) {
          logError(`Failed to calculate team hours for team ${teamId}:`, error);
          return 0;
        }
      },
      { cacheDuration: this.CALCULATION_CACHE_DURATION }
    );
  }

  /**
   * Calculate sprint capacity for a team using unified function with optimized caching
   */
  async calculateTeamSprintCapacity(teamId: number): Promise<TeamCalculationResult | null> {
    const cacheKey = `team_sprint_capacity_${teamId}`;
    
    return calculationCacheManager.getTeamData(
      teamId,
      cacheKey,
      async () => {
        debug(`Calculating sprint capacity for team ${teamId}`);
        
        try {
          const { data, error } = await supabase
            .rpc('calculate_sprint_capacity_unified', {
              p_team_id: teamId
            });

          if (error) {
            throw error;
          }

          const result = data?.[0];
          if (!result) {
            return null;
          }

          return {
            teamId: result.team_id,
            teamName: result.team_name,
            teamSize: result.team_size,
            sprintPotentialHours: result.sprint_potential_hours,
            actualHours: result.actual_hours,
            capacityUtilization: result.capacity_utilization,
            currentWeekHours: 0, // Will be calculated separately
            calculationTimestamp: result.calculation_timestamp
          } as TeamCalculationResult;
        } catch (error) {
          logError(`Failed to calculate sprint capacity for team ${teamId}:`, error);
          return null;
        }
      }
    );
  }

  /**
   * Calculate company-wide metrics using unified approach with optimized caching
   */
  async calculateCompanyTotals(): Promise<CompanyCalculationResult> {
    const cacheKey = 'company_totals_unified';
    
    return calculationCacheManager.getCompanyData(
      cacheKey,
      async () => {
        debug('Calculating company-wide metrics');
        
        try {
          // Get all team calculations
          const { data, error } = await supabase
            .rpc('calculate_sprint_capacity_unified');

          if (error) {
            throw error;
          }

          const teamResults: TeamCalculationResult[] = data.map((team: any) => ({
            teamId: team.team_id,
            teamName: team.team_name,
            teamSize: team.team_size,
            sprintPotentialHours: team.sprint_potential_hours,
            actualHours: team.actual_hours,
            capacityUtilization: team.capacity_utilization,
            currentWeekHours: 0, // Will be calculated if needed
            calculationTimestamp: team.calculation_timestamp
          }));

          const companyResult: CompanyCalculationResult = {
            totalTeams: teamResults.length,
            totalMembers: teamResults.reduce((sum, team) => sum + team.teamSize, 0),
            totalSprintHours: teamResults.reduce((sum, team) => sum + team.actualHours, 0),
            totalPotentialHours: teamResults.reduce((sum, team) => sum + team.sprintPotentialHours, 0),
            overallUtilization: 0,
            teamResults,
            calculationTimestamp: new Date().toISOString()
          };

          // Calculate overall utilization
          if (companyResult.totalPotentialHours > 0) {
            companyResult.overallUtilization = Math.round(
              (companyResult.totalSprintHours * 100) / companyResult.totalPotentialHours * 100
            ) / 100;
          }

          debug('Company totals calculated successfully');
          return companyResult;
        } catch (error) {
          logError('Failed to calculate company totals:', error);
          
          // Return empty result on error
          return {
            totalTeams: 0,
            totalMembers: 0,
            totalSprintHours: 0,
            totalPotentialHours: 0,
            overallUtilization: 0,
            teamResults: [],
            calculationTimestamp: new Date().toISOString()
          };
        }
      }
    );
  }

  // ================================================
  // COO DASHBOARD OPTIMIZATION
  // ================================================

  /**
   * Get optimized COO dashboard data using database view with enhanced caching
   */
  async getCOODashboardOptimized(): Promise<COODashboardData> {
    const cacheKey = 'coo_dashboard_optimized';
    
    return calculationCacheManager.getCOODashboardData(
      cacheKey,
      async () => {
        debug('Fetching optimized COO dashboard data');
        
        try {
          const { data, error } = await supabase
            .from('coo_dashboard_optimized')
            .select('*');

          if (error) {
            throw error;
          }

          // Convert database result to COODashboardData format
          const teams = data.map((row: any) => ({
            id: row.team_id,
            name: row.team_name,
            color: row.color,
            size: row.team_size,
            managerCount: row.manager_count,
            sprintHours: row.sprint_hours,
            currentWeekHours: row.current_week_hours,
            capacityHours: row.total_capacity_hours,
            utilization: row.capacity_utilization,
            sprintData: {
              currentSprintNumber: row.current_sprint_number,
              sprintStartDate: row.sprint_start_date,
              sprintEndDate: row.sprint_end_date,
              progressPercentage: row.progress_percentage,
              daysRemaining: row.days_remaining
            }
          }));

          // Map database teams to TeamCapacityStatus format
          const teamComparison: TeamCapacityStatus[] = teams.map((team: any) => ({
            teamId: team.id,
            teamName: team.name,
            memberCount: team.size,
            weeklyPotential: team.capacityHours,
            maxCapacity: team.capacityHours,
            actualHours: team.currentWeekHours,
            utilization: team.utilization,
            capacityGap: team.capacityHours - team.sprintHours,
            capacityStatus: team.utilization > 100 ? 'over' : 
                           team.utilization < 70 ? 'under' : 'optimal',
            color: team.color
          }));

          const totalMembers = data[0]?.total_team_members || 0;
          const totalSprintHours = data[0]?.total_sprint_hours || 0;
          const totalCapacityHours = data[0]?.total_capacity_hours || 0;
          const currentSprintNumber = data[0]?.current_sprint_number || 1;
          const sprintWeeks = 2; // Default sprint length

          const result: COODashboardData = {
            companyOverview: {
              totalTeams: teams.length,
              totalMembers: totalMembers,
              sprintMax: totalCapacityHours,
              sprintPotential: totalCapacityHours,
              currentUtilization: totalCapacityHours > 0 
                ? Math.round((totalSprintHours / totalCapacityHours) * 100)
                : 0,
              capacityGap: totalCapacityHours - totalSprintHours,
              capacityGapPercentage: totalCapacityHours > 0 
                ? Math.round(((totalCapacityHours - totalSprintHours) / totalCapacityHours) * 100)
                : 0
            },
            teamComparison: teamComparison,
            sprintAnalytics: {
              currentSprintNumber: currentSprintNumber,
              sprintWeeks: sprintWeeks,
              sprintPotential: totalCapacityHours,
              sprintActual: totalSprintHours,
              sprintUtilization: totalCapacityHours > 0 
                ? Math.round((totalSprintHours / totalCapacityHours) * 100)
                : 0,
              weeklyBreakdown: [
                { 
                  week: 1, 
                  potential: totalCapacityHours / sprintWeeks, 
                  actual: totalSprintHours / sprintWeeks, 
                  utilization: totalCapacityHours > 0 
                    ? Math.round(((totalSprintHours / sprintWeeks) / (totalCapacityHours / sprintWeeks)) * 100)
                    : 0
                }
              ]
            },
            optimizationRecommendations: teamComparison
              .filter(team => team.capacityStatus !== 'optimal')
              .map(team => 
                team.capacityStatus === 'over' 
                  ? `${team.teamName}: ${Math.abs(team.capacityGap)}h over-committed - review sprint commitments`
                  : `${team.teamName}: ${team.capacityGap}h under-utilized - investigate capacity constraints`
              ),
            capacityForecast: {
              nextWeekProjection: {
                potentialHours: totalCapacityHours,
                projectedActual: totalSprintHours * 1.05,
                expectedUtilization: (totalCapacityHours > 0 
                  ? Math.round((totalSprintHours / totalCapacityHours) * 100)
                  : 0) * 1.05,
                confidenceLevel: 85
              },
              nextSprintProjection: {
                sprintPotential: totalCapacityHours,
                projectedOutcome: totalSprintHours,
                riskFactors: ['Team capacity constraints'],
                recommendedActions: ['Monitor team utilization']
              },
              quarterlyOutlook: {
                avgUtilization: totalCapacityHours > 0 
                  ? Math.round((totalSprintHours / totalCapacityHours) * 100)
                  : 0,
                capacityTrends: [
                  { period: 'Q1', trend: 'stable', value: 85, change: 0 }
                ],
                resourceNeeds: []
              }
            }
          };

          debug('COO dashboard data retrieved and formatted successfully');
          return result;
        } catch (error) {
          logError('Failed to get optimized COO dashboard data:', error);
          
          // Return fallback data with proper COODashboardData structure
          return {
            companyOverview: {
              totalTeams: 0,
              totalMembers: 0,
              sprintMax: 0,
              sprintPotential: 0,
              currentUtilization: 0,
              capacityGap: 0,
              capacityGapPercentage: 0
            },
            teamComparison: [],
            sprintAnalytics: {
              currentSprintNumber: 1,
              sprintWeeks: 2,
              sprintPotential: 0,
              sprintActual: 0,
              sprintUtilization: 0,
              weeklyBreakdown: []
            },
            optimizationRecommendations: [],
            capacityForecast: {
              nextWeekProjection: {
                potentialHours: 0,
                projectedActual: 0,
                expectedUtilization: 0,
                confidenceLevel: 0
              },
              nextSprintProjection: {
                sprintPotential: 0,
                projectedOutcome: 0,
                riskFactors: [],
                recommendedActions: []
              },
              quarterlyOutlook: {
                avgUtilization: 0,
                capacityTrends: [],
                resourceNeeds: []
              }
            }
          };
        }
      }
    );
  }

  // ================================================
  // VALIDATION AND CONSISTENCY METHODS
  // ================================================

  /**
   * Validate calculation consistency between team and COO views
   */
  async validateCalculationConsistency(
    teamId: number
  ): Promise<{ isConsistent: boolean; teamLevel: number; cooLevel: number; difference: number }> {
    debug(`Validating calculation consistency for team ${teamId}`);
    
    try {
      // Get team-level calculation
      const teamResult = await this.calculateTeamSprintCapacity(teamId);
      const teamLevel = teamResult?.actualHours || 0;
      
      // Get COO-level calculation for the same team
      const cooData = await this.getCOODashboardOptimized();
      const cooTeam = cooData.teamComparison.find(team => team.teamId === teamId);
      const cooLevel = cooTeam?.weeklyPotential || 0;
      
      const difference = Math.abs(teamLevel - cooLevel);
      const isConsistent = difference < 0.01; // Allow for minimal floating point differences
      
      if (!isConsistent) {
        logError(`Calculation inconsistency detected for team ${teamId}:`, {
          teamLevel,
          cooLevel,
          difference
        });
      }
      
      return { isConsistent, teamLevel, cooLevel, difference };
    } catch (error) {
      logError(`Failed to validate calculation consistency for team ${teamId}:`, error);
      return { isConsistent: false, teamLevel: 0, cooLevel: 0, difference: 0 };
    }
  }

  /**
   * Reconcile calculation differences when inconsistencies are found
   */
  async reconcileCalculationDifferences(teamId: number): Promise<boolean> {
    debug(`Reconciling calculation differences for team ${teamId}`);
    
    try {
      // Clear relevant caches to force fresh calculations using calculation cache manager
      calculationCacheManager.invalidateTeamCaches(teamId);
      
      // Wait a moment for cache clearing to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Re-validate consistency
      const validation = await this.validateCalculationConsistency(teamId);
      
      return validation.isConsistent;
    } catch (error) {
      logError(`Failed to reconcile calculation differences for team ${teamId}:`, error);
      return false;
    }
  }

  // ================================================
  // CACHE MANAGEMENT
  // ================================================

  /**
   * Invalidate all calculation caches using optimized cache manager
   */
  invalidateAllCaches(): void {
    debug('Invalidating all calculation caches using optimized cache manager');
    
    // Use the calculation cache manager for efficient invalidation
    calculationCacheManager.invalidateAllCalculationCaches();
  }

  /**
   * Warm up critical caches
   */
  async warmupCaches(): Promise<void> {
    debug('Warming up critical calculation caches');
    
    try {
      // Pre-load critical data
      const promises = [
        this.getUnifiedSprintData(),
        this.getCOODashboardOptimized(),
        this.calculateCompanyTotals()
      ];
      
      await Promise.allSettled(promises);
      debug('Cache warmup completed');
    } catch (error) {
      logError('Cache warmup failed:', error);
    }
  }

  // ================================================
  // PERFORMANCE MONITORING
  // ================================================

  /**
   * Monitor calculation performance
   */
  async monitorCalculationPerformance(
    operation: string,
    executionTimeMs: number
  ): Promise<void> {
    try {
      await supabase.rpc('monitor_query_performance', {
        p_query_type: operation,
        p_execution_time_ms: executionTimeMs,
        p_table_name: 'calculation_service'
      });
    } catch (error) {
      // Don't fail the main operation if monitoring fails
      logError('Performance monitoring failed:', error);
    }
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export const unifiedCalculationService = UnifiedCalculationService.getInstance();
export default unifiedCalculationService;