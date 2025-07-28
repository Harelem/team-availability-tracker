/**
 * Chart Data Transformation Utilities
 * 
 * Utilities to transform raw dashboard data into chart-ready formats
 * Integrates with CalculationService for consistent data processing
 */

import { 
  TeamCapacityStatus, 
  WeeklyUtilization, 
  CurrentGlobalSprint,
  COODashboardData 
} from '@/types';

import {
  SprintCapacityData,
  UtilizationDistributionData,
  SprintProgressData,
  CapacityTrendData,
  TeamComparisonData,
  TransformedChartData,
  ChartDataTransformOptions
} from '@/types/charts';

import { CalculationService, CALCULATION_CONSTANTS, formatHours, formatPercentage } from '@/lib/calculationService';

// Color palettes for charts
export const CHART_COLORS = {
  utilization: {
    optimal: '#10B981', // green-500
    under: '#F59E0B',   // amber-500
    over: '#EF4444'     // red-500
  },
  teams: [
    '#3B82F6', // blue-500
    '#8B5CF6', // violet-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#84CC16', // lime-500
  ],
  gradients: {
    primary: ['#3B82F6', '#1D4ED8'],
    success: ['#10B981', '#059669'],
    warning: ['#F59E0B', '#D97706'],
    danger: ['#EF4444', '#DC2626']
  }
} as const;

/**
 * Transform team capacity data for Sprint Capacity Bar Chart
 */
export function transformSprintCapacityData(
  teams: TeamCapacityStatus[],
  options: ChartDataTransformOptions = {}
): TransformedChartData<SprintCapacityData> {
  const { sortBy = 'utilization', sortOrder = 'desc' } = options;
  
  const data: SprintCapacityData[] = teams.map((team, index) => ({
    teamName: team.teamName,
    teamId: team.teamId,
    potential: Math.round(team.weeklyPotential),
    actual: Math.round(team.actualHours),
    utilization: Math.round(team.utilization * 100) / 100,
    color: team.color || CHART_COLORS.teams[index % CHART_COLORS.teams.length],
    status: team.capacityStatus
  }));

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortBy as keyof SprintCapacityData] as number;
    const bValue = b[sortBy as keyof SprintCapacityData] as number;
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Calculate metadata
  const totalPotential = data.reduce((sum, item) => sum + item.potential, 0);
  const totalActual = data.reduce((sum, item) => sum + item.actual, 0);
  const avgUtilization = data.length > 0 ? data.reduce((sum, item) => sum + item.utilization, 0) / data.length : 0;

  return {
    data: sortedData,
    metadata: {
      totalRecords: data.length,
      dateRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      averages: {
        utilization: Math.round(avgUtilization * 100) / 100,
        potential: Math.round(totalPotential),
        actual: Math.round(totalActual)
      },
      aggregationType: 'team'
    }
  };
}

/**
 * Transform team data for Team Utilization Pie Chart
 */
export function transformUtilizationDistributionData(
  teams: TeamCapacityStatus[]
): TransformedChartData<UtilizationDistributionData> {
  const totalTeams = teams.length;
  
  // Count teams by status
  const statusCounts = teams.reduce((acc, team) => {
    acc[team.capacityStatus] = (acc[team.capacityStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data: UtilizationDistributionData[] = [
    {
      status: 'optimal',
      count: statusCounts.optimal || 0,
      percentage: Math.round(((statusCounts.optimal || 0) / totalTeams) * 100 * 100) / 100,
      color: CHART_COLORS.utilization.optimal,
      label: 'Optimal (80-100%)'
    },
    {
      status: 'under',
      count: statusCounts.under || 0,
      percentage: Math.round(((statusCounts.under || 0) / totalTeams) * 100 * 100) / 100,
      color: CHART_COLORS.utilization.under,
      label: 'Under-utilized (<80%)'
    },
    {
      status: 'over',
      count: statusCounts.over || 0,
      percentage: Math.round(((statusCounts.over || 0) / totalTeams) * 100 * 100) / 100,
      color: CHART_COLORS.utilization.over,
      label: 'Over-capacity (>100%)'
    }
  ].filter(item => item.count > 0); // Only include statuses with teams

  return {
    data,
    metadata: {
      totalRecords: data.length,
      dateRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      averages: {
        utilization: teams.reduce((sum, team) => sum + team.utilization, 0) / totalTeams,
        potential: 0,
        actual: 0
      },
      aggregationType: 'status'
    }
  };
}

/**
 * Transform sprint data for Sprint Progress Line Chart
 */
export function transformSprintProgressData(
  sprintAnalytics: COODashboardData['sprintAnalytics'],
  currentSprint: CurrentGlobalSprint
): TransformedChartData<SprintProgressData> {
  const { weeklyBreakdown } = sprintAnalytics;
  
  let cumulativePlanned = 0;
  let cumulativeActual = 0;
  
  const data: SprintProgressData[] = weeklyBreakdown.map((week, index) => {
    cumulativePlanned += week.potential;
    cumulativeActual += week.actual;
    
    const progressPercentage = cumulativePlanned > 0 
      ? Math.round((cumulativeActual / cumulativePlanned) * 100 * 100) / 100
      : 0;

    return {
      day: index + 1,
      date: new Date(Date.now() + (index * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      plannedHours: Math.round(week.potential),
      actualHours: Math.round(week.actual),
      cumulativePlanned: Math.round(cumulativePlanned),
      cumulativeActual: Math.round(cumulativeActual),
      progressPercentage
    };
  });

  return {
    data,
    metadata: {
      totalRecords: data.length,
      dateRange: {
        start: currentSprint.sprint_start_date,
        end: currentSprint.sprint_end_date
      },
      averages: {
        utilization: sprintAnalytics.sprintUtilization,
        potential: Math.round(sprintAnalytics.sprintPotential / weeklyBreakdown.length),
        actual: Math.round(sprintAnalytics.sprintActual / weeklyBreakdown.length)
      },
      aggregationType: 'week'
    }
  };
}

/**
 * Transform historical data for Capacity Trend Area Chart
 */
export function transformCapacityTrendData(
  historicalData: WeeklyUtilization[],
  options: ChartDataTransformOptions = {}
): TransformedChartData<CapacityTrendData> {
  const { aggregateBy = 'week' } = options;
  
  const data: CapacityTrendData[] = historicalData.map((week) => ({
    period: week.week,
    date: week.week,
    utilization: Math.round(week.utilization * 100) / 100,
    potential: Math.round(week.potentialHours),
    actual: Math.round(week.totalHours),
    teamCount: 1 // This would need to be calculated from actual team data
  }));

  // Sort by date
  const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate averages
  const avgUtilization = data.reduce((sum, item) => sum + item.utilization, 0) / data.length;
  const avgPotential = data.reduce((sum, item) => sum + item.potential, 0) / data.length;
  const avgActual = data.reduce((sum, item) => sum + item.actual, 0) / data.length;

  return {
    data: sortedData,
    metadata: {
      totalRecords: data.length,
      dateRange: {
        start: sortedData[0]?.date || '',
        end: sortedData[sortedData.length - 1]?.date || ''
      },
      averages: {
        utilization: Math.round(avgUtilization * 100) / 100,
        potential: Math.round(avgPotential),
        actual: Math.round(avgActual)
      },
      aggregationType: aggregateBy
    }
  };
}

/**
 * Transform team data for Team Comparison Horizontal Bar Chart
 */
export function transformTeamComparisonData(
  teams: TeamCapacityStatus[],
  options: ChartDataTransformOptions = {}
): TransformedChartData<TeamComparisonData> {
  const { sortBy = 'utilization', sortOrder = 'desc' } = options;
  
  // Create base data
  const data: TeamComparisonData[] = teams.map((team, index) => ({
    teamId: team.teamId,
    teamName: team.teamName,
    utilization: Math.round(team.utilization * 100) / 100,
    potential: Math.round(team.weeklyPotential),
    actual: Math.round(team.actualHours),
    memberCount: team.memberCount,
    color: team.color || CHART_COLORS.teams[index % CHART_COLORS.teams.length],
    status: team.capacityStatus,
    rank: 0 // Will be set after sorting
  }));

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortBy as keyof TeamComparisonData] as number;
    const bValue = b[sortBy as keyof TeamComparisonData] as number;
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Add rankings
  sortedData.forEach((team, index) => {
    team.rank = index + 1;
  });

  // Calculate metadata
  const totalPotential = sortedData.reduce((sum, item) => sum + item.potential, 0);
  const totalActual = sortedData.reduce((sum, item) => sum + item.actual, 0);
  const avgUtilization = sortedData.reduce((sum, item) => sum + item.utilization, 0) / sortedData.length;

  return {
    data: sortedData,
    metadata: {
      totalRecords: sortedData.length,
      dateRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      averages: {
        utilization: Math.round(avgUtilization * 100) / 100,
        potential: Math.round(totalPotential / sortedData.length),
        actual: Math.round(totalActual / sortedData.length)
      },
      aggregationType: 'team'
    }
  };
}

/**
 * Get appropriate color for utilization value
 */
export function getUtilizationColor(utilization: number): string {
  if (utilization > 100) return CHART_COLORS.utilization.over;
  if (utilization >= CALCULATION_CONSTANTS.OPTIMAL_UTILIZATION_MIN) return CHART_COLORS.utilization.optimal;
  return CHART_COLORS.utilization.under;
}

/**
 * Format chart tooltip values
 */
export function formatChartTooltip(value: number, type: 'hours' | 'percentage' | 'count'): string {
  switch (type) {
    case 'hours':
      return formatHours(value);
    case 'percentage':
      return formatPercentage(value);
    case 'count':
      return value.toString();
    default:
      return value.toString();
  }
}

/**
 * Get responsive chart dimensions based on screen size
 */
export function getResponsiveChartDimensions(screenWidth: number): { width: number; height: number } {
  if (screenWidth < 640) { // mobile
    return { width: 300, height: 200 };
  } else if (screenWidth < 1024) { // tablet
    return { width: 400, height: 250 };
  } else { // desktop
    return { width: 500, height: 300 };
  }
}