/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SprintCapacityBarChart } from '@/components/charts/SprintCapacityBarChart';
import { SprintCapacityData } from '@/types/charts';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: () => <div data-testid="cell" />
}));

const mockData: SprintCapacityData[] = [
  {
    teamName: 'Engineering Team',
    teamId: 1,
    potential: 280,
    actual: 245,
    utilization: 87.5,
    color: '#3B82F6',
    status: 'optimal'
  },
  {
    teamName: 'Design Team',
    teamId: 2,
    potential: 140,
    actual: 98,
    utilization: 70,
    color: '#10B981',
    status: 'under'
  },
  {
    teamName: 'QA Team',
    teamId: 3,
    potential: 210,
    actual: 231,
    utilization: 110,
    color: '#EF4444',
    status: 'over'
  }
];

describe('SprintCapacityBarChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chart components when data is provided', () => {
    render(<SprintCapacityBarChart data={mockData} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('bar')).toHaveLength(2); // Potential and Actual bars
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('displays loading state when loading prop is true', () => {
    render(<SprintCapacityBarChart data={[]} loading={true} />);
    
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('displays error state when error prop is provided', () => {
    const errorMessage = 'Network connection failed';
    render(<SprintCapacityBarChart data={[]} error={errorMessage} />);
    
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('displays empty state when no data is provided', () => {
    render(<SprintCapacityBarChart data={[]} />);
    
    expect(screen.getByText('No team data available')).toBeInTheDocument();
    expect(screen.getByText('Teams will appear here once data is loaded')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('shows percentage labels when showPercentages is true', () => {
    render(<SprintCapacityBarChart data={mockData} showPercentages={true} />);
    
    // Check that team names are rendered in percentage labels
    expect(screen.getByText(/Engineering Team/)).toBeInTheDocument();
    expect(screen.getByText(/Design Team/)).toBeInTheDocument();
    expect(screen.getByText(/QA Team/)).toBeInTheDocument();
    
    // Check that utilization percentages are shown
    expect(screen.getByText(/87.5%/)).toBeInTheDocument();
    expect(screen.getByText(/70%/)).toBeInTheDocument();
    expect(screen.getByText(/110%/)).toBeInTheDocument();
  });

  it('renders without error when height is provided', () => {
    const customHeight = 400;
    
    expect(() => {
      render(<SprintCapacityBarChart data={mockData} height={customHeight} />);
    }).not.toThrow();
    
    // Chart should still render normally
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<SprintCapacityBarChart data={[]} />);
    
    expect(screen.getByText('No team data available')).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });
});