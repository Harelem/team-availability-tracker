/**
 * Comprehensive TypeScript types for calculation service
 * 
 * This file contains all type definitions related to team availability
 * and sprint capacity calculations to ensure type safety and consistency.
 */

import { TeamMember, CurrentGlobalSprint, ScheduleEntry } from './index';

// Base calculation interfaces
export interface BaseCalculationInput {
  timestamp?: Date;
  source?: string;
}

export interface BaseCalculationResult {
  calculatedAt: Date;
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Sprint Potential Calculation Types
export interface SprintPotentialInput extends BaseCalculationInput {
  teamMembers: TeamMember[];
  sprintDays: number;
  hoursPerDay?: number;
  excludeManagersFromCapacity?: boolean;
}

export interface SprintPotentialResult extends BaseCalculationResult {
  totalPotential: number;
  teamSize: number;
  sprintDays: number;
  hoursPerDay: number;
  dailyTeamPotential: number;
  managerCount?: number;
  developerCount?: number;
  potentialByRole?: {
    managers: number;
    developers: number;
  };
}

// Adjusted Capacity Calculation Types
export interface AdjustedCapacityInput extends BaseCalculationInput {
  potential: number;
  vacationHours: number;
  meetingHours: number;
  focusFactor?: number;
  additionalDeductions?: {
    name: string;
    hours: number;
    reason?: string;
  }[];
}

export interface AdjustedCapacityResult extends BaseCalculationResult {
  adjustedCapacity: number;
  originalPotential: number;
  focusFactorReduction: number;
  vacationReduction: number;
  meetingReduction: number;
  focusFactor: number;
  effectiveUtilization: number;
  totalDeductions: number;
  deductionBreakdown: {
    focusFactor: number;
    vacation: number;
    meetings: number;
    additional: number;
  };
}

// Weekly Hours Calculation Types
export interface WeeklyHoursInput extends BaseCalculationInput {
  scheduleEntries: { [dateKey: string]: ScheduleEntry };
  weekStartDate: Date;
  includePartialDays?: boolean;
  validateDateRange?: boolean;
}

export interface WeeklyHoursResult extends BaseCalculationResult {
  totalHours: number;
  workingDays: number;
  dailyBreakdown: { [dateKey: string]: number };
  averageDaily: number;
  weekStartDate: string;
  weekEndDate: string;
  utilizationByDay: { [dateKey: string]: number };
  reasonBreakdown?: { [reason: string]: number };
}

// Sprint Hours Calculation Types
export interface SprintHoursInput extends BaseCalculationInput {
  scheduleEntries: { [dateKey: string]: ScheduleEntry };
  sprintStartDate: Date;
  sprintEndDate: Date;
  includeWeekends?: boolean;
  groupByWeek?: boolean;
}

export interface SprintHoursResult extends BaseCalculationResult {
  totalHours: number;
  sprintDays: number;
  dailyBreakdown: { [dateKey: string]: number };
  weeklyBreakdown: { [weekKey: string]: number };
  averageDaily: number;
  sprintStartDate: string;
  sprintEndDate: string;
  progressByWeek?: {
    [weekKey: string]: {
      hours: number;
      percentage: number;
      cumulativeHours: number;
    };
  };
}

// Team Utilization Calculation Types
export interface TeamUtilizationInput extends BaseCalculationInput {
  plannedHours: number;
  availableHours: number;
  includeBuffer?: boolean;
  bufferPercentage?: number;
}

export interface TeamUtilizationResult extends BaseCalculationResult {
  utilization: number;
  plannedHours: number;
  availableHours: number;
  hoursGap: number;
  status: UtilizationStatus;
  statusColor: string;
  recommendation?: string;
  riskLevel: RiskLevel;
  bufferHours?: number;
}

// Completion Percentage Calculation Types
export interface CompletionPercentageInput extends BaseCalculationInput {
  completedHours: number;
  plannedHours: number;
  targetDate?: Date;
  currentDate?: Date;
}

export interface CompletionPercentageResult extends BaseCalculationResult {
  completionPercentage: number;
  completedHours: number;
  plannedHours: number;
  remainingHours: number;
  isOnTrack: boolean;
  projectedCompletionDate?: Date;
  daysAheadBehind?: number;
  velocity?: number;
}

// Team Capacity Analysis Types
export interface TeamCapacityAnalysisInput extends BaseCalculationInput {
  teamMembers: TeamMember[];
  scheduleEntries: { [memberId: number]: { [dateKey: string]: ScheduleEntry } };
  sprintData: CurrentGlobalSprint;
  includeHistoricalData?: boolean;
}

export interface MemberCapacityInfo {
  memberId: number;
  memberName: string;
  isManager: boolean;
  weeklyPotential: number;
  actualHours: number;
  utilization: number;
  status: UtilizationStatus;
  reasonsBreakdown: { [reason: string]: number };
  consistencyScore: number;
}

export interface TeamCapacityAnalysisResult extends BaseCalculationResult {
  teamId: number;
  teamName: string;
  totalPotential: number;
  totalActual: number;
  teamUtilization: number;
  teamStatus: UtilizationStatus;
  memberAnalysis: MemberCapacityInfo[];
  riskFactors: string[];
  recommendations: string[];
  capacityTrend: CapacityTrend;
  benchmarkComparison?: {
    averageUtilization: number;
    ranking: number;
    totalTeams: number;
  };
}

// Company-Wide Analysis Types
export interface CompanyCapacityAnalysisInput extends BaseCalculationInput {
  allTeams: (TeamMember & { team_id: number })[];
  scheduleData: { [memberId: number]: { [dateKey: string]: ScheduleEntry } };
  sprintData: CurrentGlobalSprint;
  includeForecasting?: boolean;
}

export interface CompanyCapacityAnalysisResult extends BaseCalculationResult {
  totalPotential: number;
  totalActual: number;
  overallUtilization: number;
  teamBreakdown: TeamCapacityAnalysisResult[];
  utilizationDistribution: {
    excellent: number; // >= 90%
    good: number;      // 80-89%
    fair: number;      // 70-79%
    poor: number;      // < 70%
  };
  capacityGaps: {
    underUtilized: TeamCapacityAnalysisResult[];
    overCapacity: TeamCapacityAnalysisResult[];
    optimal: TeamCapacityAnalysisResult[];
  };
  forecasting?: CapacityForecast;
}

// Supporting Types
export type UtilizationStatus = 'under' | 'optimal' | 'over' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CapacityTrend = 'increasing' | 'decreasing' | 'stable' | 'volatile';

export interface CapacityForecast {
  nextWeek: {
    projectedUtilization: number;
    confidence: number;
    riskFactors: string[];
  };
  nextSprint: {
    projectedCapacity: number;
    expectedDelivery: number;
    recommendedAdjustments: string[];
  };
  longTerm: {
    trend: CapacityTrend;
    sustainabilityScore: number;
    growthNeeds: ResourceNeed[];
  };
}

export interface ResourceNeed {
  type: 'hiring' | 'redistribution' | 'process_improvement' | 'tooling';
  priority: 'immediate' | 'next_sprint' | 'next_quarter';
  description: string;
  impact: number; // Expected improvement in utilization
  effort: 'low' | 'medium' | 'high';
}

// Validation Types
export interface ValidationRule {
  field: string;
  rule: 'required' | 'positive' | 'range' | 'date' | 'array';
  params?: {
    min?: number;
    max?: number;
    message?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Calculation Configuration Types
export interface CalculationConfig {
  hoursPerDay: number;
  workingDaysPerWeek: number;
  focusFactor: number;
  utilizationThresholds: {
    optimal: { min: number; max: number };
    warning: { min: number; max: number };
  };
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  workingDays: number[];
  holidays?: Date[];
  companyPolicies?: {
    maxOvertimeHours?: number;
    minUtilizationTarget?: number;
    focusTimePercentage?: number;
  };
}

// Export/Import Types for Calculations
export interface CalculationExport {
  version: string;
  exportDate: Date;
  calculations: {
    sprintPotentials: SprintPotentialResult[];
    adjustedCapacities: AdjustedCapacityResult[];
    teamUtilizations: TeamUtilizationResult[];
    companyAnalysis: CompanyCapacityAnalysisResult;
  };
  metadata: {
    totalTeams: number;
    totalMembers: number;
    dateRange: {
      start: Date;
      end: Date;
    };
  };
}

// Audit Trail Types
export interface CalculationAudit {
  id: string;
  calculationType: string;
  input: BaseCalculationInput;
  result: BaseCalculationResult;
  userId?: string;
  timestamp: Date;
  duration: number; // milliseconds
  cacheHit: boolean;
}

// Performance Metrics
export interface CalculationPerformance {
  totalCalculations: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  slowQueries: {
    type: string;
    averageTime: number;
    count: number;
  }[];
}

// Factory Types for Batch Operations
export interface BatchCalculationRequest {
  calculations: {
    type: 'sprint_potential' | 'adjusted_capacity' | 'weekly_hours' | 'sprint_hours' | 'team_utilization' | 'completion_percentage';
    input: BaseCalculationInput;
    id?: string;
  }[];
  options?: {
    parallel?: boolean;
    maxConcurrency?: number;
    failFast?: boolean;
  };
}

export interface BatchCalculationResult {
  results: {
    id?: string;
    type: string;
    result?: BaseCalculationResult;
    error?: string;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
  };
}

// Historical Analysis Types
export interface HistoricalDataPoint {
  date: Date;
  utilization: number;
  totalHours: number;
  potentialHours: number;
  teamSize: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  correlation: number;
  seasonality?: {
    detected: boolean;
    pattern?: 'weekly' | 'monthly' | 'quarterly';
  };
}

export interface BenchmarkData {
  metric: string;
  currentValue: number;
  industryAverage?: number;
  companyAverage: number;
  bestInCompany: number;
  percentile: number;
}

// Default calculation configuration
export const DEFAULT_CALCULATION_CONFIG: CalculationConfig = {
  hoursPerDay: 7,
  workingDaysPerWeek: 5,
  focusFactor: 0.8,
  utilizationThresholds: {
    optimal: { min: 80, max: 95 },
    warning: { min: 70, max: 100 },
  },
  riskThresholds: {
    low: 75,
    medium: 60,
    high: 50,
  },
  workingDays: [0, 1, 2, 3, 4], // Sunday through Thursday
  companyPolicies: {
    maxOvertimeHours: 10,
    minUtilizationTarget: 80,
    focusTimePercentage: 20,
  },
};