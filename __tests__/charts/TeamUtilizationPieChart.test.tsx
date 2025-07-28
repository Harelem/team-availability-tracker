/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeamUtilizationPieChart } from '@/components/charts/TeamUtilizationPieChart';
import { UtilizationDistributionData } from '@/types/charts';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />
}));

const mockData: UtilizationDistributionData[] = [
  {
    status: 'optimal',
    count: 3,
    percentage: 50,
    color: '#10B981',
    label: 'Optimal (80-100%)'
  },
  {
    status: 'under',
    count: 2,
    percentage: 33.33,
    color: '#F59E0B',
    label: 'Under-utilized (<80%)'
  },
  {
    status: 'over',
    count: 1,
    percentage: 16.67,
    color: '#EF4444',
    label: 'Over-capacity (>100%)'
  }
];

describe('TeamUtilizationPieChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart components when data is provided', () => {
    render(<TeamUtilizationPieChart data={mockData} totalTeams={6} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('displays loading state when loading prop is true', () => {
    render(<TeamUtilizationPieChart data={[]} totalTeams={0} loading={true} />);
    
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('displays error state when error prop is provided', () => {
    const errorMessage = 'Failed to load utilization data';
    render(<TeamUtilizationPieChart data={[]} totalTeams={0} error={errorMessage} />);
    
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('displays empty state when no data is provided', () => {
    render(<TeamUtilizationPieChart data={[]} totalTeams={0} />);
    
    expect(screen.getByText('No utilization data available')).toBeInTheDocument();
    expect(screen.getByText('Team utilization will appear here once data is loaded')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows center text with total teams count', () => {
    render(<TeamUtilizationPieChart data={mockData} totalTeams={6} />);
    
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });
});