/**
 * Advanced Analytics Data Processing Pipeline
 * 
 * Handles data collection, cleaning, feature engineering, and preparation
 * for machine learning models and statistical analysis.
 */

import { TeamMember, Team, ScheduleEntry, CurrentGlobalSprint } from '@/types';
import { DatabaseService } from '@/lib/database';

// Core data interfaces for analytics
export interface HistoricalDataPoint {
  date: string;
  teamId: number;
  memberId: number;
  plannedHours: number;
  actualHours: number;
  utilization: number;
  sprintNumber: number;
}

export interface ProcessedTeamData {
  teamId: number;
  teamName: string;
  historicalData: HistoricalDataPoint[];
  memberCount: number;
  avgUtilization: number;
  velocityTrend: number[];
  seasonalPatterns: SeasonalPattern[];
  dataQuality: DataQualityMetrics;
}

export interface SeasonalPattern {
  period: 'weekly' | 'monthly' | 'quarterly';
  pattern: number[];
  confidence: number;
}

export interface DataQualityMetrics {
  completeness: number; // 0-1, percentage of complete data
  consistency: number; // 0-1, data consistency score
  timeliness: number; // 0-1, data freshness score
  accuracy: number; // 0-1, estimated accuracy based on validation
}

export interface TimeSeriesData {
  timestamps: string[];
  values: number[];
  trend: number[];
  seasonal: number[];
  residual: number[];
}

export interface FeatureVector {
  teamId: number;
  features: {
    avgUtilization: number;
    utilizationStdDev: number;
    velocityTrend: number;
    teamStability: number;
    workloadVariability: number;
    seasonalIndex: number;
    historicalAccuracy: number;
    memberTurnover: number;
  };
}

/**
 * Main data processing service for analytics
 */
export class DataProcessor {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or return null if expired
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Cache data with timestamp
   */
  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Collect historical data for a team
   */
  async collectHistoricalData(teamId: number, monthsBack: number = 6): Promise<HistoricalDataPoint[]> {
    const cacheKey = `historical_${teamId}_${monthsBack}`;
    const cached = this.getCached<HistoricalDataPoint[]>(cacheKey);
    if (cached) return cached;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      // Get team members and sprint data
      const [members, sprints] = await Promise.all([
        DatabaseService.getTeamMembers(teamId),
        this.getSprintHistory(startDate, endDate)
      ]);

      const historicalData: HistoricalDataPoint[] = [];

      // Process data for each sprint
      for (const sprint of sprints) {
        const sprintStart = new Date(sprint.sprint_start_date);
        const sprintEnd = new Date(sprint.sprint_end_date);

        for (const member of members) {
          // Get member's schedule data for this sprint
          const scheduleData = await this.getMemberScheduleData(
            member.id, 
            sprintStart, 
            sprintEnd
          );

          const { plannedHours, actualHours } = this.calculateSprintHours(
            scheduleData, 
            sprintStart, 
            sprintEnd
          );

          const utilization = plannedHours > 0 ? (actualHours / plannedHours) * 100 : 0;

          historicalData.push({
            date: sprint.sprint_start_date,
            teamId,
            memberId: member.id,
            plannedHours,
            actualHours,
            utilization,
            sprintNumber: sprint.sprint_number
          });
        }
      }

      this.setCached(cacheKey, historicalData);
      return historicalData;
    } catch (error) {
      console.error('Error collecting historical data:', error);
      return [];
    }
  }

  /**
   * Clean and validate data, handling missing values and outliers
   */
  cleanData(data: HistoricalDataPoint[]): HistoricalDataPoint[] {
    return data
      .filter(point => {
        // Remove null/undefined values
        return point.plannedHours !== null && 
               point.actualHours !== null && 
               point.utilization !== null &&
               !isNaN(point.plannedHours) && 
               !isNaN(point.actualHours) && 
               !isNaN(point.utilization);
      })
      .filter(point => {
        // Remove extreme outliers (utilization > 300% or < 0%)
        return point.utilization >= 0 && point.utilization <= 300;
      })
      .map(point => {
        // Cap utilization at reasonable maximum
        return {
          ...point,
          utilization: Math.min(point.utilization, 200) // Cap at 200%
        };
      });
  }

  /**
   * Generate feature vectors for machine learning models
   */
  generateFeatureVectors(processedData: ProcessedTeamData[]): FeatureVector[] {
    return processedData.map(teamData => {
      const utilizations = teamData.historicalData.map(d => d.utilization);
      const avgUtilization = this.mean(utilizations);
      const utilizationStdDev = this.standardDeviation(utilizations);
      
      return {
        teamId: teamData.teamId,
        features: {
          avgUtilization,
          utilizationStdDev,
          velocityTrend: this.calculateTrend(teamData.velocityTrend),
          teamStability: this.calculateTeamStability(teamData.historicalData),
          workloadVariability: utilizationStdDev / avgUtilization,
          seasonalIndex: this.calculateSeasonalIndex(teamData.seasonalPatterns),
          historicalAccuracy: teamData.dataQuality.accuracy,
          memberTurnover: this.calculateMemberTurnover(teamData.historicalData)
        }
      };
    });
  }

  /**
   * Perform time series decomposition (trend, seasonal, residual)
   */
  decomposeTimeSeries(data: number[], period: number = 14): TimeSeriesData {
    const timestamps = data.map((_, i) => new Date(Date.now() - (data.length - i) * 24 * 60 * 60 * 1000).toISOString());
    
    // Simple moving average for trend
    const trend = this.movingAverage(data, Math.floor(period / 2));
    
    // Calculate seasonal component using period
    const seasonal = this.extractSeasonal(data, period);
    
    // Residual = original - trend - seasonal
    const residual = data.map((val, i) => val - (trend[i] || 0) - (seasonal[i] || 0));

    return {
      timestamps,
      values: data,
      trend,
      seasonal,
      residual
    };
  }

  /**
   * Assess data quality metrics
   */
  assessDataQuality(data: HistoricalDataPoint[]): DataQualityMetrics {
    const totalPoints = data.length;
    if (totalPoints === 0) {
      return { completeness: 0, consistency: 0, timeliness: 0, accuracy: 0 };
    }

    // Completeness: percentage of non-null values
    const completePoints = data.filter(d => 
      d.plannedHours !== null && d.actualHours !== null && d.utilization !== null
    ).length;
    const completeness = completePoints / totalPoints;

    // Consistency: check for logical consistency
    const consistentPoints = data.filter(d => 
      d.utilization >= 0 && d.utilization <= 300 && 
      d.plannedHours >= 0 && d.actualHours >= 0
    ).length;
    const consistency = consistentPoints / totalPoints;

    // Timeliness: based on data freshness (last 30 days = 1.0)
    const latestDate = new Date(Math.max(...data.map(d => new Date(d.date).getTime())));
    const daysSinceLatest = Math.floor((Date.now() - latestDate.getTime()) / (24 * 60 * 60 * 1000));
    const timeliness = Math.max(0, 1 - daysSinceLatest / 30);

    // Accuracy: estimated based on variance in utilization patterns
    const utilizations = data.map(d => d.utilization);
    const variance = this.variance(utilizations);
    const accuracy = Math.max(0, 1 - variance / 10000); // Normalize variance

    return { completeness, consistency, timeliness, accuracy };
  }

  /**
   * Process data for all teams
   */
  async processAllTeams(): Promise<ProcessedTeamData[]> {
    const cacheKey = 'processed_all_teams';
    const cached = this.getCached<ProcessedTeamData[]>(cacheKey);
    if (cached) return cached;

    try {
      const teams = await DatabaseService.getOperationalTeams();
      const processedData: ProcessedTeamData[] = [];

      for (const team of teams) {
        const historicalData = await this.collectHistoricalData(team.id);
        const cleanedData = this.cleanData(historicalData);
        
        if (cleanedData.length === 0) continue;

        const utilizations = cleanedData.map(d => d.utilization);
        const avgUtilization = this.mean(utilizations);
        const velocityTrend = this.calculateVelocityTrend(cleanedData);
        const seasonalPatterns = this.detectSeasonalPatterns(cleanedData);
        const dataQuality = this.assessDataQuality(cleanedData);

        processedData.push({
          teamId: team.id,
          teamName: team.name,
          historicalData: cleanedData,
          memberCount: cleanedData.filter((d, i, arr) => 
            arr.findIndex(item => item.memberId === d.memberId) === i
          ).length,
          avgUtilization,
          velocityTrend,
          seasonalPatterns,
          dataQuality
        });
      }

      this.setCached(cacheKey, processedData);
      return processedData;
    } catch (error) {
      console.error('Error processing team data:', error);
      return [];
    }
  }

  // Utility methods for statistical calculations
  private mean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private variance(values: number[]): number {
    const avg = this.mean(values);
    return values.length > 0 ? 
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length : 0;
  }

  private standardDeviation(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  private movingAverage(data: number[], window: number): number[] {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.ceil(window / 2));
      const slice = data.slice(start, end);
      result.push(this.mean(slice));
    }
    return result;
  }

  private extractSeasonal(data: number[], period: number): number[] {
    const seasonal = new Array(data.length).fill(0);
    
    for (let i = 0; i < data.length; i++) {
      const seasonalValues: number[] = [];
      for (let j = i % period; j < data.length; j += period) {
        const value = data[j];
        if (value !== undefined) {
          seasonalValues.push(value);
        }
      }
      seasonal[i] = seasonalValues.length > 0 ? this.mean(seasonalValues) : 0;
    }
    
    return seasonal;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private calculateTeamStability(data: HistoricalDataPoint[]): number {
    // Calculate based on member consistency across sprints
    const memberIds = [...new Set(data.map(d => d.memberId))];
    const sprints = [...new Set(data.map(d => d.sprintNumber))];
    
    if (sprints.length <= 1) return 1;
    
    let stabilityScore = 0;
    for (const sprint of sprints) {
      const sprintMembers = new Set(
        data.filter(d => d.sprintNumber === sprint).map(d => d.memberId)
      );
      const memberRetention = sprintMembers.size / memberIds.length;
      stabilityScore += memberRetention;
    }
    
    return stabilityScore / sprints.length;
  }

  private calculateSeasonalIndex(patterns: SeasonalPattern[]): number {
    if (patterns.length === 0) return 0;
    
    return patterns.reduce((sum, pattern) => sum + pattern.confidence, 0) / patterns.length;
  }

  private calculateMemberTurnover(data: HistoricalDataPoint[]): number {
    const sprints = [...new Set(data.map(d => d.sprintNumber))].sort();
    
    if (sprints.length <= 1) return 0;
    
    let totalTurnover = 0;
    for (let i = 1; i < sprints.length; i++) {
      const prevSprint = sprints[i - 1];
      const currentSprint = sprints[i];
      
      const prevMembers = new Set(
        data.filter(d => d.sprintNumber === prevSprint).map(d => d.memberId)
      );
      const currentMembers = new Set(
        data.filter(d => d.sprintNumber === currentSprint).map(d => d.memberId)
      );
      
      const leavers = [...prevMembers].filter(id => !currentMembers.has(id));
      const turnoverRate = leavers.length / prevMembers.size;
      totalTurnover += turnoverRate;
    }
    
    return totalTurnover / (sprints.length - 1);
  }

  private calculateVelocityTrend(data: HistoricalDataPoint[]): number[] {
    const sprintGroups = new Map<number, HistoricalDataPoint[]>();
    
    data.forEach(point => {
      if (!sprintGroups.has(point.sprintNumber)) {
        sprintGroups.set(point.sprintNumber, []);
      }
      sprintGroups.get(point.sprintNumber)!.push(point);
    });
    
    const velocities = Array.from(sprintGroups.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, sprintData]) => {
        const totalHours = sprintData.reduce((sum, d) => sum + d.actualHours, 0);
        return totalHours;
      });
    
    return velocities;
  }

  private detectSeasonalPatterns(data: HistoricalDataPoint[]): SeasonalPattern[] {
    // Simple seasonal pattern detection
    const patterns: SeasonalPattern[] = [];
    
    // Weekly pattern (day of week effects)
    const weeklyPattern = this.analyzeWeeklyPattern(data);
    if (weeklyPattern.confidence > 0.6) {
      patterns.push(weeklyPattern);
    }
    
    // Monthly pattern
    const monthlyPattern = this.analyzeMonthlyPattern(data);
    if (monthlyPattern.confidence > 0.6) {
      patterns.push(monthlyPattern);
    }
    
    return patterns;
  }

  private analyzeWeeklyPattern(data: HistoricalDataPoint[]): SeasonalPattern {
    const dayOfWeekData: number[][] = new Array(7).fill(null).map(() => []);
    
    data.forEach(point => {
      const dayOfWeek = new Date(point.date).getDay();
      dayOfWeekData[dayOfWeek]?.push(point.utilization);
    });
    
    const pattern = dayOfWeekData.map(dayData => 
      dayData.length > 0 ? this.mean(dayData) : 0
    );
    
    // Calculate confidence based on data availability and variance
    const dataPoints = dayOfWeekData.reduce((sum, dayData) => sum + dayData.length, 0);
    const confidence = Math.min(1, dataPoints / (data.length * 0.7));
    
    return { period: 'weekly', pattern, confidence };
  }

  private analyzeMonthlyPattern(data: HistoricalDataPoint[]): SeasonalPattern {
    const monthData: number[][] = new Array(12).fill(null).map(() => []);
    
    data.forEach(point => {
      const month = new Date(point.date).getMonth();
      monthData[month]?.push(point.utilization);
    });
    
    const pattern = monthData.map(monthlyData => 
      monthlyData.length > 0 ? this.mean(monthlyData) : 0
    );
    
    const dataPoints = monthData.reduce((sum, monthly) => sum + monthly.length, 0);
    const confidence = Math.min(1, dataPoints / (data.length * 0.5));
    
    return { period: 'monthly', pattern, confidence };
  }

  // Helper methods for data collection
  private async getSprintHistory(startDate: Date, endDate: Date) {
    // Mock implementation - in real app would query sprint_history table
    const sprints = [];
    const sprintLength = 14; // 2 weeks
    
    let currentDate = new Date(startDate);
    let sprintNumber = 1;
    
    while (currentDate < endDate) {
      const sprintStart = new Date(currentDate);
      const sprintEnd = new Date(currentDate);
      sprintEnd.setDate(sprintEnd.getDate() + sprintLength);
      
      sprints.push({
        sprint_number: sprintNumber++,
        sprint_start_date: sprintStart.toISOString(),
        sprint_end_date: sprintEnd.toISOString()
      });
      
      currentDate = new Date(sprintEnd);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return sprints;
  }

  private async getMemberScheduleData(memberId: number, startDate: Date, endDate: Date) {
    // Mock implementation - would query actual schedule data
    const scheduleData: { [dateKey: string]: ScheduleEntry } = {};
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // Simulate schedule data with some variability
      const random = Math.random();
      if (dateKey && random > 0.85) {
        scheduleData[dateKey] = { value: 'X', reason: 'PTO' };
      } else if (dateKey && random > 0.75) {
        scheduleData[dateKey] = { value: '0.5', reason: 'Half day' };
      } else if (dateKey) {
        scheduleData[dateKey] = { value: '1' };
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return scheduleData;
  }

  private calculateSprintHours(
    scheduleData: { [dateKey: string]: ScheduleEntry }, 
    startDate: Date, 
    endDate: Date
  ): { plannedHours: number; actualHours: number } {
    let plannedHours = 0;
    let actualHours = 0;
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      // Only count working days (Sunday=0 to Thursday=4 in Israeli calendar)
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        const entry = dateKey ? scheduleData[dateKey] : undefined;
        if (entry) {
          const dayHours = entry.value === '1' ? 7 : entry.value === '0.5' ? 3.5 : 0;
          actualHours += dayHours;
        }
        plannedHours += 7; // Planned 7 hours per working day
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return { plannedHours, actualHours };
  }
}

// Export singleton instance
export const dataProcessor = new DataProcessor();