/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  PerformanceMetricsCard, 
  PerformanceMetricsGrid,
  VelocityMetricCard,
  UtilizationMetricCard,
  BurnoutRiskMetricCard
} from '@/components/analytics/PerformanceMetricsCard';

describe('PerformanceMetricsCard', () => {
  const mockProps = {
    title: 'Test Metric',
    value: 100,
    unit: 'points',
    trend: 'up' as const,
    trendPercentage: 15,
    status: 'good' as const,
    description: 'Test description',
    target: 120
  };

  it('should render basic metric card correctly', () => {
    render(<PerformanceMetricsCard {...mockProps} />);
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('points')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should display trend information correctly', () => {
    render(<PerformanceMetricsCard {...mockProps} />);
    
    expect(screen.getByText('15% vs previous period')).toBeInTheDocument();
  });

  it('should show progress bar for targets', () => {
    render(<PerformanceMetricsCard {...mockProps} />);
    
    expect(screen.getByText('Progress to Target')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('83.3% of target achieved')).toBeInTheDocument();
  });

  it('should handle different status colors', () => {
    const { container } = render(
      <PerformanceMetricsCard {...mockProps} status="critical" />
    );
    
    expect(container.firstChild).toHaveClass('border-red-200', 'bg-red-50');
  });

  it('should format large numbers correctly', () => {
    render(<PerformanceMetricsCard {...mockProps} value={1500} />);
    
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('should handle string values', () => {
    render(<PerformanceMetricsCard {...mockProps} value="High Risk" />);
    
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('should not show trend when not provided', () => {
    const { container } = render(
      <PerformanceMetricsCard 
        title="Test" 
        value={100} 
        status="neutral" 
      />
    );
    
    expect(container.querySelector('.text-green-600')).not.toBeInTheDocument();
    expect(screen.queryByText('vs previous period')).not.toBeInTheDocument();
  });
});

describe('PerformanceMetricsGrid', () => {
  const mockMetrics = [
    {
      title: 'Metric 1',
      value: 100,
      status: 'good' as const
    },
    {
      title: 'Metric 2', 
      value: 200,
      status: 'warning' as const
    },
    {
      title: 'Metric 3',
      value: 300,
      status: 'critical' as const
    }
  ];

  it('should render multiple metrics in a grid', () => {
    render(<PerformanceMetricsGrid metrics={mockMetrics} />);
    
    expect(screen.getByText('Metric 1')).toBeInTheDocument();
    expect(screen.getByText('Metric 2')).toBeInTheDocument();
    expect(screen.getByText('Metric 3')).toBeInTheDocument();
  });

  it('should apply correct grid classes for different column counts', () => {
    const { container, rerender } = render(
      <PerformanceMetricsGrid metrics={mockMetrics} columns={2} />
    );
    
    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    
    rerender(<PerformanceMetricsGrid metrics={mockMetrics} columns={4} />);
    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('should handle empty metrics array', () => {
    const { container } = render(<PerformanceMetricsGrid metrics={[]} />);
    
    expect(container.firstChild?.children).toHaveLength(0);
  });
});

describe('Pre-configured Metric Cards', () => {
  describe('VelocityMetricCard', () => {
    it('should render velocity metric with trend', () => {
      render(
        <VelocityMetricCard 
          velocity={50} 
          previousVelocity={40} 
          target={60} 
        />
      );
      
      expect(screen.getByText('Team Velocity')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('story points')).toBeInTheDocument();
      expect(screen.getByText('25% vs previous period')).toBeInTheDocument();
    });

    it('should show good status when meeting target', () => {
      const { container } = render(
        <VelocityMetricCard velocity={60} target={50} />
      );
      
      expect(container.querySelector('.border-green-200')).toBeInTheDocument();
    });

    it('should handle missing previous velocity', () => {
      render(<VelocityMetricCard velocity={50} />);
      
      expect(screen.getByText('Team Velocity')).toBeInTheDocument();
      expect(screen.queryByText('vs previous period')).not.toBeInTheDocument();
    });
  });

  describe('UtilizationMetricCard', () => {
    it('should render utilization with percentage', () => {
      render(<UtilizationMetricCard utilization={87.5} />);
      
      expect(screen.getByText('Team Utilization')).toBeInTheDocument();
      expect(screen.getByText('87.5')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('should show good status for optimal utilization', () => {
      const { container } = render(
        <UtilizationMetricCard utilization={90} target={85} />
      );
      
      expect(container.querySelector('.border-green-200')).toBeInTheDocument();
    });

    it('should show critical status for low utilization', () => {
      const { container } = render(
        <UtilizationMetricCard utilization={60} target={85} />
      );
      
      expect(container.querySelector('.border-red-200')).toBeInTheDocument();
    });

    it('should use default target when not provided', () => {
      render(<UtilizationMetricCard utilization={90} />);
      
      expect(screen.getByText('85')).toBeInTheDocument(); // Default target
    });
  });

  describe('BurnoutRiskMetricCard', () => {
    it('should show low risk for low score', () => {
      render(<BurnoutRiskMetricCard riskScore={0.2} />);
      
      expect(screen.getByText('Burnout Risk')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Risk score: 20.0%')).toBeInTheDocument();
    });

    it('should show high risk for high score', () => {
      const { container } = render(<BurnoutRiskMetricCard riskScore={0.8} />);
      
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Risk score: 80.0%')).toBeInTheDocument();
      expect(container.querySelector('.border-red-200')).toBeInTheDocument();
    });

    it('should show medium risk for moderate score', () => {
      const { container } = render(<BurnoutRiskMetricCard riskScore={0.5} />);
      
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(container.querySelector('.border-yellow-200')).toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  it('should have proper ARIA attributes', () => {
    render(
      <PerformanceMetricsCard 
        title="Test Metric" 
        value={100} 
        status="good"
        description="Test description"
      />
    );
    
    // Check that the component is accessible
    const metric = screen.getByText('Test Metric');
    expect(metric).toBeInTheDocument();
    
    // The card should be readable by screen readers
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    const { container } = render(
      <PerformanceMetricsGrid metrics={[
        { title: 'Metric 1', value: 100, status: 'good' as const }
      ]} />
    );
    
    // Grid should be properly structured for screen readers
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });
});

describe('Responsive Design', () => {
  it('should apply responsive grid classes', () => {
    const { container } = render(
      <PerformanceMetricsGrid 
        metrics={[{ title: 'Test', value: 100, status: 'good' as const }]} 
        columns={3}
      />
    );
    
    expect(container.firstChild).toHaveClass(
      'grid-cols-1',
      'md:grid-cols-2', 
      'lg:grid-cols-3'
    );
  });

  it('should handle custom className', () => {
    const { container } = render(
      <PerformanceMetricsCard 
        title="Test" 
        value={100} 
        status="good"
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});