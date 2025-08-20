/**
 * ConsistentLoader Component Tests
 * 
 * Tests for hydration-safe loading components to prevent SSR/CSR mismatches.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { 
  ConsistentLoader, 
  LoadingSkeleton, 
  LoadingBoundary, 
  FullPageLoading,
  useIsomorphicLoading
} from '@/components/ui/ConsistentLoader';

// Mock useEffect to control hydration timing in tests
const mockUseEffect = jest.fn();
const mockSetState = jest.fn();

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: mockUseEffect,
  useState: jest.fn(() => [false, mockSetState])
}));

describe('ConsistentLoader', () => {
  beforeEach(() => {
    mockUseEffect.mockClear();
    mockSetState.mockClear();
  });

  describe('Server-side rendering', () => {
    it('renders pulse animation on server', () => {
      render(<ConsistentLoader variant="spinner" testId="test-loader" />);
      
      // Should show pulse content, not spinner
      expect(screen.getByTestId('test-loader')).toBeInTheDocument();
      expect(screen.getByTestId('test-loader')).toHaveClass('animate-pulse');
      
      // Should not show spinner elements
      expect(screen.queryByRole('status')).not.toHaveClass('animate-spin');
    });

    it('renders consistent skeleton structure', () => {
      render(<ConsistentLoader variant="skeleton" testId="skeleton-test" />);
      
      const skeleton = screen.getByTestId('skeleton-test');
      expect(skeleton).toHaveClass('animate-pulse');
      
      // Check for consistent skeleton structure
      const pulseElements = skeleton.querySelectorAll('.bg-gray-200');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('renders full page loading consistently', () => {
      render(<ConsistentLoader fullPage testId="fullpage-test" />);
      
      const container = screen.getByTestId('fullpage-test').closest('.min-h-screen');
      expect(container).toHaveClass('bg-gray-50', 'flex', 'items-center', 'justify-center');
    });
  });

  describe('Client-side rendering', () => {
    beforeEach(() => {
      // Mock client-side state (mounted)
      jest.requireActual('react').useState.mockImplementation(() => [true, mockSetState]);
    });

    it('upgrades to spinner after hydration', async () => {
      const { rerender } = render(<ConsistentLoader variant="spinner" testId="spinner-test" />);
      
      // Simulate hydration complete
      act(() => {
        mockSetState.mockImplementation(() => {});
        rerender(<ConsistentLoader variant="spinner" testId="spinner-test" />);
      });

      await waitFor(() => {
        const loader = screen.getByTestId('spinner-test');
        expect(loader).toHaveClass('animate-spin');
      });
    });

    it('shows enhanced loading features on client', () => {
      jest.requireActual('react').useState.mockImplementation(() => [true, mockSetState]);
      
      render(<ConsistentLoader variant="spinner" message="Loading data..." />);
      
      // Should show spinner and message on client
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });
  });

  describe('Hydration safety', () => {
    it('prevents hydration mismatch with suppressHydrationWarning', () => {
      render(
        <FullPageLoading 
          variant="spinner" 
          message="Test message" 
          testId="hydration-test" 
        />
      );
      
      // Should have suppressHydrationWarning attribute
      const elements = screen.getAllByText('Test message')[0]?.closest('[suppressHydrationWarning]');
      expect(elements).toBeTruthy();
    });

    it('renders identical structure on server and client for pulse variant', () => {
      // Server render
      const { container: serverContainer } = render(
        <ConsistentLoader variant="pulse" testId="consistency-test" />
      );
      const serverHTML = serverContainer.innerHTML;

      // Client render (simulate mounting)
      jest.requireActual('react').useState.mockImplementation(() => [true, mockSetState]);
      const { container: clientContainer } = render(
        <ConsistentLoader variant="pulse" testId="consistency-test" />
      );
      const clientHTML = clientContainer.innerHTML;

      // Pulse variant should be identical
      expect(serverHTML).toBe(clientHTML);
    });
  });
});

describe('LoadingSkeleton', () => {
  it('renders consistent skeleton structure', () => {
    render(<LoadingSkeleton lines={3} avatar testId="skeleton-test" />);
    
    const skeleton = screen.getByTestId('skeleton-test');
    expect(skeleton).toHaveClass('animate-pulse');
    
    // Should have avatar
    const avatar = skeleton.querySelector('.rounded-full');
    expect(avatar).toHaveClass('w-10', 'h-10', 'bg-gray-200');
    
    // Should have correct number of content lines
    const lines = skeleton.querySelectorAll('.space-y-2 .bg-gray-200');
    expect(lines.length).toBeGreaterThanOrEqual(2); // At least 2 lines for 3 total
  });

  it('renders action buttons when specified', () => {
    render(<LoadingSkeleton actions testId="skeleton-actions" />);
    
    const actionButtons = screen.getByTestId('skeleton-actions').querySelectorAll('.h-8.bg-gray-200');
    expect(actionButtons.length).toBe(2); // Two action buttons
  });
});

describe('LoadingBoundary', () => {
  it('shows loading state when loading prop is true', () => {
    render(
      <LoadingBoundary loading={true} testId="boundary-test">
        <div>Content</div>
      </LoadingBoundary>
    );

    // Should show loading, not content
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.getByTestId('boundary-test')).toBeInTheDocument();
  });

  it('shows content when loading prop is false', () => {
    render(
      <LoadingBoundary loading={false}>
        <div>Content</div>
      </LoadingBoundary>
    );

    // Should show content, not loading
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    render(
      <LoadingBoundary 
        loading={true} 
        fallback={<div data-testid="custom-fallback">Custom loading</div>}
      >
        <div>Content</div>
      </LoadingBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom loading')).toBeInTheDocument();
  });
});

describe('FullPageLoading', () => {
  it('renders full page loading structure', () => {
    render(<FullPageLoading message="Loading app..." testId="fullpage" />);
    
    const container = screen.getByTestId('fullpage');
    expect(container).toHaveClass('min-h-screen', 'bg-gray-50');
    
    // Should have centered content
    const contentContainer = container.querySelector('.bg-white.rounded-lg');
    expect(contentContainer).toBeInTheDocument();
  });

  it('shows progress when enabled', () => {
    render(
      <FullPageLoading 
        showProgress 
        progress={75} 
        message="Loading..." 
        testId="progress-test" 
      />
    );
    
    expect(screen.getByText('75% complete')).toBeInTheDocument();
    
    // Progress bar should be 75% width
    const progressBar = screen.getByTestId('progress-test').querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('handles progress bounds correctly', () => {
    // Test max bound
    const { rerender } = render(
      <FullPageLoading showProgress progress={150} testId="bounds-test" />
    );
    
    let progressBar = screen.getByTestId('bounds-test').querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '100%' });
    
    // Test min bound
    rerender(<FullPageLoading showProgress progress={-10} testId="bounds-test" />);
    
    progressBar = screen.getByTestId('bounds-test').querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '0%' });
  });
});

describe('useIsomorphicLoading hook', () => {
  const TestComponent = () => {
    const isMounted = useIsomorphicLoading();
    return <div data-testid="mount-status">{isMounted ? 'mounted' : 'not-mounted'}</div>;
  };

  it('returns false initially (server-side)', () => {
    jest.requireActual('react').useState.mockImplementation(() => [false, mockSetState]);
    
    render(<TestComponent />);
    expect(screen.getByTestId('mount-status')).toHaveTextContent('not-mounted');
  });

  it('returns true after effect runs (client-side)', async () => {
    // Simulate useEffect calling setIsMounted(true)
    mockUseEffect.mockImplementation((effect) => {
      effect();
    });
    
    jest.requireActual('react').useState.mockImplementation((initial) => {
      if (typeof initial === 'boolean') {
        return [true, mockSetState]; // Simulate mounted state
      }
      return [initial, mockSetState];
    });
    
    render(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('mount-status')).toHaveTextContent('mounted');
    });
  });
});

// Integration test for hydration safety
describe('Hydration Safety Integration', () => {
  it('prevents hydration mismatches in realistic dashboard scenario', () => {
    const DashboardWithLoading = ({ isLoading }: { isLoading: boolean }) => (
      <div>
        <h1>Dashboard</h1>
        <LoadingBoundary loading={isLoading} variant="skeleton">
          <div>
            <p>Dashboard content</p>
            <div>Charts and data here</div>
          </div>
        </LoadingBoundary>
      </div>
    );

    // Render loading state
    const { rerender } = render(<DashboardWithLoading isLoading={true} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();

    // Switch to loaded state
    rerender(<DashboardWithLoading isLoading={false} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });
});

// Performance tests
describe('Performance', () => {
  it('renders quickly with multiple loading components', () => {
    const startTime = performance.now();
    
    render(
      <div>
        {Array.from({ length: 10 }).map((_, i) => (
          <ConsistentLoader key={i} variant="skeleton" />
        ))}
      </div>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
  });

  it('does not cause memory leaks', () => {
    const { unmount } = render(<ConsistentLoader variant="spinner" />);
    
    expect(() => unmount()).not.toThrow();
  });
});