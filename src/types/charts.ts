/**
 * Chart Data Types for COO Dashboard
 * 
 * TypeScript interfaces for all chart components and data transformations
 */

import { TeamCapacityStatus, WeeklyUtilization, CurrentGlobalSprint } from './index';

// Base Chart Props
export interface BaseChartProps {
  className?: string;
  height?: number;
  loading?: boolean;
  error?: string | null;
}

// Sprint Capacity Bar Chart
export interface SprintCapacityData {
  teamName: string;
  teamId: number;
  potential: number;
  actual: number;
  utilization: number;
  color: string;
  status: 'optimal' | 'under' | 'over';
}

export interface SprintCapacityChartProps extends BaseChartProps {
  data: SprintCapacityData[];
  showPercentages?: boolean;
  onTeamClick?: (teamId: number) => void;
}

// Team Utilization Pie Chart
export interface UtilizationDistributionData {
  status: 'optimal' | 'under' | 'over';
  count: number;
  percentage: number;
  color: string;
  label: string;
}

export interface TeamUtilizationPieChartProps extends BaseChartProps {
  data: UtilizationDistributionData[];
  totalTeams: number;
  showLegend?: boolean;
}

// Sprint Progress Line Chart
export interface SprintProgressData {
  day: number;
  date: string;
  plannedHours: number;
  actualHours: number;
  cumulativePlanned: number;
  cumulativeActual: number;
  progressPercentage: number;
}

export interface SprintProgressChartProps extends BaseChartProps {
  data: SprintProgressData[];
  sprintInfo: CurrentGlobalSprint;
  showProjection?: boolean;
}

// Capacity Trend Area Chart
export interface CapacityTrendData {
  period: string;
  date: string;
  utilization: number;
  potential: number;
  actual: number;
  teamCount: number;
}

export interface CapacityTrendChartProps extends BaseChartProps {
  data: CapacityTrendData[];
  timeframe: 'weekly' | 'monthly' | 'quarterly';
  showAverage?: boolean;
}

// Team Comparison Horizontal Bar Chart
export interface TeamComparisonData {
  teamId: number;
  teamName: string;
  utilization: number;
  potential: number;
  actual: number;
  memberCount: number;
  color: string;
  status: 'optimal' | 'under' | 'over';
  rank: number;
}

export interface TeamComparisonChartProps extends BaseChartProps {
  data: TeamComparisonData[];
  sortBy: 'utilization' | 'actual' | 'potential';
  showRanking?: boolean;
  onTeamClick?: (teamId: number) => void;
}

// Chart Container and Layout
export interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export interface ChartGridLayoutProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  gap?: number;
  className?: string;
}

// Chart Filters and Controls
export interface ChartFilters {
  timeframe: 'current-week' | 'current-sprint' | 'last-4-weeks' | 'last-sprint';
  teams: number[];
  utilizationRange: [number, number];
  showProjections: boolean;
}

export interface ChartFilterControlsProps {
  filters: ChartFilters;
  onFiltersChange: (filters: Partial<ChartFilters>) => void;
  availableTeams: { id: number; name: string }[];
  className?: string;
}

// Data Transformation Utilities
export interface ChartDataTransformOptions {
  includeProjections?: boolean;
  aggregateBy?: 'day' | 'week' | 'sprint';
  filterEmptyData?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransformedChartData<T> {
  data: T[];
  metadata: {
    totalRecords: number;
    dateRange: {
      start: string;
      end: string;
    };
    averages: {
      utilization: number;
      potential: number;
      actual: number;
    };
    aggregationType: string;
  };
}

// Chart Export Types
export interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'csv';
  includeLegend: boolean;
  includeData: boolean;
  title?: string;
  description?: string;
}

export interface ChartExportData {
  chartType: string;
  exportFormat: string;
  data: unknown[];
  metadata: {
    generatedAt: Date;
    dateRange: string;
    filters: ChartFilters;
  };
}

// Error and Loading States
export interface ChartErrorState {
  type: 'data' | 'render' | 'network';
  message: string;
  retryAction?: () => void;
}

export interface ChartLoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

// Responsive Chart Configuration  
export interface ResponsiveChartConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  chartSizes: {
    mobile: { width: number; height: number };
    tablet: { width: number; height: number };
    desktop: { width: number; height: number };
  };
  showLegend: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
}