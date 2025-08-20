/**
 * @jest-environment jsdom
 */

// Mock the utility functions
jest.mock('@/lib/calculationService', () => ({
  formatHours: jest.fn((hours) => `${hours}h`),
  formatPercentage: jest.fn((percent) => `${percent}%`)
}));

// Mock child components
jest.mock('@/components/ui/COOCard', () => ({
  COOMetricCard: function MockCOOMetricCard({ 
    title, 
    value, 
    trend, 
    icon, 
    variant, 
    status, 
    interactive, 
    onClick, 
    className,
    trendDirection,
    'aria-label': ariaLabel
  }: any) {
    const IconComponent = icon;
    return (
      <div 
        data-testid="coo-metric-card"
        data-title={title}
        data-value={value}
        data-trend={trend}
        data-variant={variant}
        data-status={status}
        data-interactive={interactive}
        data-trend-direction={trendDirection}
        className={className}
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        aria-label={ariaLabel}
      >
        <div data-testid="card-icon">
          <IconComponent data-testid={`${title.toLowerCase().replace(/\s+/g, '-')}-icon`} />
        </div>
        <div data-testid="card-title">{title}</div>
        <div data-testid="card-value">{value}</div>
        <div data-testid="card-trend">{trend}</div>
      </div>
    );
  }
}));

jest.mock('@/components/modals/WorkforceStatusModal', () => {
  return function MockWorkforceStatusModal({ isOpen, onClose, selectedDate }: any) {
    return isOpen ? (
      <div data-testid="workforce-status-modal">
        <div data-testid="modal-date">{selectedDate.toISOString()}</div>
        <button onClick={onClose} data-testid="modal-close-button">Close Modal</button>
      </div>
    ) : null;
  };
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimplifiedMetricsCards from '@/components/SimplifiedMetricsCards';
import { formatHours, formatPercentage } from '@/lib/calculationService';
import { createMockCOODashboardData } from '../utils/testHelpers';

// Type the mocked functions
const mockFormatHours = formatHours as jest.MockedFunction<typeof formatHours>;
const mockFormatPercentage = formatPercentage as jest.MockedFunction<typeof formatPercentage>;

describe('SimplifiedMetricsCards', () => {
  // Test data setup
  const mockDashboardData = createMockCOODashboardData();
  const mockSelectedDate = new Date('2024-01-15T12:00:00Z');

  // Mock functions
  const mockOnTotalWorkforceClick = jest.fn();

  // Default props
  const defaultProps = {
    dashboardData: mockDashboardData,
    onTotalWorkforceClick: mockOnTotalWorkforceClick,
    selectedDate: mockSelectedDate
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup format function mocks
    mockFormatHours.mockImplementation((hours) => `${hours}h`);
    mockFormatPercentage.mockImplementation((percent) => `${percent}%`);
  });

  describe('Basic Rendering', () => {
    it('should render all metric cards', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      expect(cards).toHaveLength(5);
    });

    it('should render with proper grid layout classes', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const container = screen.getAllByTestId('coo-metric-card')[0].parentElement;
      expect(container).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-5',
        'gap-4'
      );
    });

    it('should apply custom className when provided', () => {
      render(<SimplifiedMetricsCards {...defaultProps} className="custom-class" />);

      const container = screen.getAllByTestId('coo-metric-card')[0].parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should use default date when selectedDate is not provided', () => {
      const { selectedDate, ...propsWithoutDate } = defaultProps;
      render(<SimplifiedMetricsCards {...propsWithoutDate} />);

      expect(screen.getAllByTestId('coo-metric-card')).toHaveLength(5);
    });
  });

  describe('Total Workforce Card', () => {
    it('should render total workforce card with correct data', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0]; // First card is Total Workforce
      expect(totalWorkforceCard).toHaveAttribute('data-title', 'Total Workforce');
      expect(totalWorkforceCard).toHaveAttribute('data-value', '25');
      expect(totalWorkforceCard).toHaveAttribute('data-trend', '5 teams');
      expect(totalWorkforceCard).toHaveAttribute('data-variant', 'primary');
      expect(totalWorkforceCard).toHaveAttribute('data-status', 'good');
      expect(totalWorkforceCard).toHaveAttribute('data-interactive', 'true');
    });

    it('should have proper accessibility label', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      expect(totalWorkforceCard).toHaveAttribute(
        'aria-label',
        'Total workforce: 25 members across 5 teams. Click for daily status details.'
      );
    });

    it('should be interactive and call handler when clicked', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      expect(totalWorkforceCard).toHaveAttribute('role', 'button');
      
      fireEvent.click(totalWorkforceCard);
      expect(mockOnTotalWorkforceClick).toHaveBeenCalledTimes(1);
    });

    it('should open workforce modal when no click handler provided', async () => {
      const { onTotalWorkforceClick, ...propsWithoutHandler } = defaultProps;
      render(<SimplifiedMetricsCards {...propsWithoutHandler} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      fireEvent.click(totalWorkforceCard);

      await waitFor(() => {
        expect(screen.getByTestId('workforce-status-modal')).toBeInTheDocument();
      });
    });

    it('should have hover styling classes', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      expect(totalWorkforceCard).toHaveClass(
        'cursor-pointer',
        'hover:shadow-md',
        'transition-shadow',
        'duration-200'
      );
    });

    it('should render Users icon', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(screen.getByTestId('total-workforce-icon')).toBeInTheDocument();
    });
  });

  describe('Max Capacity Card', () => {
    it('should render max capacity card with formatted hours', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const maxCapacityCard = cards[1];

      expect(maxCapacityCard).toHaveAttribute('data-title', 'Max Capacity');
      expect(maxCapacityCard).toHaveAttribute('data-value', '875h');
      expect(maxCapacityCard).toHaveAttribute('data-trend', '25 × 2 weeks × 7h');
      expect(maxCapacityCard).toHaveAttribute('data-variant', 'info');
      expect(maxCapacityCard).toHaveAttribute('data-status', 'excellent');
    });

    it('should call formatHours for max capacity value', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(mockFormatHours).toHaveBeenCalledWith(mockDashboardData.companyOverview.sprintMax);
    });

    it('should render Calendar icon', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(screen.getByTestId('max-capacity-icon')).toBeInTheDocument();
    });

    it('should not be interactive', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const maxCapacityCard = cards[1];

      expect(maxCapacityCard).toHaveAttribute('data-interactive', 'false');
      expect(maxCapacityCard).not.toHaveAttribute('role', 'button');
    });
  });

  describe('Current Potential Card', () => {
    it('should render current potential card with formatted hours', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const currentPotentialCard = cards[2];

      expect(currentPotentialCard).toHaveAttribute('data-title', 'Current Potential');
      expect(currentPotentialCard).toHaveAttribute('data-value', '820h');
      expect(currentPotentialCard).toHaveAttribute('data-trend', 'After deducting absences/reasons');
      expect(currentPotentialCard).toHaveAttribute('data-variant', 'success');
      expect(currentPotentialCard).toHaveAttribute('data-status', 'excellent');
    });

    it('should call formatHours for current potential value', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(mockFormatHours).toHaveBeenCalledWith(mockDashboardData.companyOverview.sprintPotential);
    });

    it('should render CheckCircle icon', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(screen.getByTestId('current-potential-icon')).toBeInTheDocument();
    });
  });

  describe('Capacity Gap Card', () => {
    it('should render capacity gap as percentage for small gaps', () => {
      const dataWithSmallGap = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          capacityGap: 5, // Small gap
          capacityGapPercentage: 0.6
        }
      };

      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithSmallGap} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const capacityGapCard = cards[3];

      expect(capacityGapCard).toHaveAttribute('data-value', '0.6%');
      expect(capacityGapCard).toHaveAttribute('data-trend', '5h capacity lost');
    });

    it('should render capacity gap as hours for large gaps', () => {
      const dataWithLargeGap = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          capacityGap: 150, // Large gap
          capacityGapPercentage: 15.5
        }
      };

      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithLargeGap} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const capacityGapCard = cards[3];

      expect(capacityGapCard).toHaveAttribute('data-value', '150h');
      expect(capacityGapCard).toHaveAttribute('data-trend', 'Under-utilized');
    });

    it('should handle negative capacity gap (over-capacity)', () => {
      const dataWithNegativeGap = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          capacityGap: -25,
          capacityGapPercentage: -2.5
        }
      };

      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithNegativeGap} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const capacityGapCard = cards[3];

      expect(capacityGapCard).toHaveAttribute('data-trend', '25h capacity gained');
      expect(capacityGapCard).toHaveAttribute('data-trend-direction', 'up');
    });

    it('should set correct status based on gap size', () => {
      // Test small gap (good status)
      const dataWithSmallGap = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          capacityGap: 5
        }
      };

      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithSmallGap} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const capacityGapCard = cards[3];

      expect(capacityGapCard).toHaveAttribute('data-status', 'good');
    });

    it('should render Zap icon', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(screen.getByTestId('capacity-gap-icon')).toBeInTheDocument();
    });
  });

  describe('Current Utilization Card', () => {
    it('should render utilization with formatted percentage', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const utilizationCard = cards[4];

      expect(utilizationCard).toHaveAttribute('data-title', 'Current Utilization');
      expect(utilizationCard).toHaveAttribute('data-value', '85.2%');
      expect(utilizationCard).toHaveAttribute('data-variant', 'primary');
    });

    it('should show "Optimal" trend for high utilization', () => {
      const dataWithHighUtilization = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          currentUtilization: 95
        }
      };

      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithHighUtilization} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const utilizationCard = cards[4];

      expect(utilizationCard).toHaveAttribute('data-trend', 'Optimal');
      expect(utilizationCard).toHaveAttribute('data-status', 'excellent');
      expect(utilizationCard).toHaveAttribute('data-trend-direction', 'up');
    });

    it('should show "Good" trend for medium utilization', () => {
      const dataWithMediumUtilization = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          currentUtilization: 85
        }
      };

      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithMediumUtilization} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const utilizationCard = cards[4];

      expect(utilizationCard).toHaveAttribute('data-trend', 'Good');
      expect(utilizationCard).toHaveAttribute('data-status', 'good');
      expect(utilizationCard).toHaveAttribute('data-trend-direction', 'up');
    });

    it('should show "Below Target" trend for low utilization', () => {
      const dataWithLowUtilization = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          currentUtilization: 70
        }
      };

      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithLowUtilization} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const utilizationCard = cards[4];

      expect(utilizationCard).toHaveAttribute('data-trend', 'Below Target');
      expect(utilizationCard).toHaveAttribute('data-status', 'warning');
      expect(utilizationCard).toHaveAttribute('data-trend-direction', 'down');
    });

    it('should call formatPercentage for utilization value', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(mockFormatPercentage).toHaveBeenCalledWith(mockDashboardData.companyOverview.currentUtilization);
    });

    it('should render TrendingUp icon', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(screen.getByTestId('current-utilization-icon')).toBeInTheDocument();
    });
  });

  describe('Workforce Status Modal', () => {
    it('should not render modal by default', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(screen.queryByTestId('workforce-status-modal')).not.toBeInTheDocument();
    });

    it('should open modal when total workforce is clicked without handler', async () => {
      const { onTotalWorkforceClick, ...propsWithoutHandler } = defaultProps;
      render(<SimplifiedMetricsCards {...propsWithoutHandler} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      fireEvent.click(totalWorkforceCard);

      await waitFor(() => {
        expect(screen.getByTestId('workforce-status-modal')).toBeInTheDocument();
      });
    });

    it('should pass selected date to modal', async () => {
      const { onTotalWorkforceClick, ...propsWithoutHandler } = defaultProps;
      render(<SimplifiedMetricsCards {...propsWithoutHandler} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      fireEvent.click(totalWorkforceCard);

      await waitFor(() => {
        const modalDate = screen.getByTestId('modal-date');
        expect(modalDate).toHaveTextContent(mockSelectedDate.toISOString());
      });
    });

    it('should close modal when close button is clicked', async () => {
      const { onTotalWorkforceClick, ...propsWithoutHandler } = defaultProps;
      render(<SimplifiedMetricsCards {...propsWithoutHandler} />);

      // Open modal
      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      fireEvent.click(totalWorkforceCard);

      await waitFor(() => {
        expect(screen.getByTestId('workforce-status-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByTestId('modal-close-button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('workforce-status-modal')).not.toBeInTheDocument();
      });
    });

    it('should prioritize provided click handler over modal', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      fireEvent.click(totalWorkforceCard);

      expect(mockOnTotalWorkforceClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('workforce-status-modal')).not.toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('should format all hours values correctly', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(mockFormatHours).toHaveBeenCalledWith(mockDashboardData.companyOverview.sprintMax);
      expect(mockFormatHours).toHaveBeenCalledWith(mockDashboardData.companyOverview.sprintPotential);
    });

    it('should format percentage values correctly', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      expect(mockFormatPercentage).toHaveBeenCalledWith(mockDashboardData.companyOverview.currentUtilization);
    });

    it('should handle edge cases in capacity gap formatting', () => {
      // Test zero capacity gap
      const dataWithZeroGap = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          capacityGap: 0,
          capacityGapPercentage: 0
        }
      };

      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithZeroGap} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const capacityGapCard = cards[3];

      expect(capacityGapCard).toHaveAttribute('data-value', '0%');
      expect(capacityGapCard).toHaveAttribute('data-trend', '0h capacity lost');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dashboard data gracefully', () => {
      const incompleteData = {
        companyOverview: {
          totalMembers: 10,
          totalTeams: 2
          // Missing other required fields
        }
      } as any;

      expect(() => 
        render(<SimplifiedMetricsCards {...defaultProps} dashboardData={incompleteData} />)
      ).not.toThrow();
    });

    it('should handle undefined values in dashboard data', () => {
      const dataWithUndefinedValues = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          currentUtilization: undefined as any,
          capacityGap: undefined as any
        }
      };

      expect(() => 
        render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithUndefinedValues} />)
      ).not.toThrow();
    });

    it('should handle null selectedDate', () => {
      expect(() => 
        render(<SimplifiedMetricsCards {...defaultProps} selectedDate={null as any} />)
      ).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const totalWorkforceCard = cards[0];
      expect(totalWorkforceCard).toHaveAttribute('aria-label');
      expect(totalWorkforceCard).toHaveAttribute('role', 'button');
    });

    it('should not have button role for non-interactive cards', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const cards = screen.getAllByTestId('coo-metric-card');
      const nonInteractiveCards = cards.slice(1); // All except the first (Total Workforce)

      nonInteractiveCards.forEach(card => {
        expect(card).not.toHaveAttribute('role', 'button');
      });
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = performance.now();
      render(<SimplifiedMetricsCards {...defaultProps} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle large numbers efficiently', () => {
      const dataWithLargeNumbers = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          totalMembers: 10000,
          sprintMax: 1000000,
          sprintPotential: 900000,
          capacityGap: 100000
        }
      };

      const startTime = performance.now();
      render(<SimplifiedMetricsCards {...defaultProps} dashboardData={dataWithLargeNumbers} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(150);
    });

    it('should re-render efficiently when data changes', () => {
      const { rerender } = render(<SimplifiedMetricsCards {...defaultProps} />);

      const startTime = performance.now();
      
      // Re-render with different data
      const newData = {
        ...mockDashboardData,
        companyOverview: {
          ...mockDashboardData.companyOverview,
          totalMembers: 30,
          currentUtilization: 90
        }
      };

      rerender(<SimplifiedMetricsCards {...defaultProps} dashboardData={newData} />);
      
      const endTime = performance.now();
      const rerenderTime = endTime - startTime;

      expect(rerenderTime).toBeLessThan(50);
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      render(<SimplifiedMetricsCards {...defaultProps} />);

      const container = screen.getAllByTestId('coo-metric-card')[0].parentElement;
      expect(container).toHaveClass(
        'grid-cols-1', // Mobile
        'sm:grid-cols-2', // Small screens
        'lg:grid-cols-5' // Large screens
      );
    });
  });
});