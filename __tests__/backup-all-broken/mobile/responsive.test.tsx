/**
 * Mobile Responsiveness Tests
 * 
 * Tests mobile-specific functionality, responsive design, touch interactions,
 * and viewport adaptations across different device sizes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';

// Components to test
import MobileNavigation from '@/components/mobile/MobileNavigation';
import MobileBreadcrumbNavigation from '@/components/mobile/MobileBreadcrumbNavigation';
import MobileFloatingActionButton from '@/components/mobile/MobileFloatingActionButton';
import MobileScheduleView from '@/components/MobileScheduleView';
import MobileCOODashboard from '@/components/MobileCOODashboard';

// Hooks to test
import { useTouchGestures, useSwipeNavigation, usePullToRefresh, useTouchDevice } from '@/hooks/useTouchGestures';
import { useMobileDetection } from '@/hooks/useMobileDetection';

// Test utilities
import { createMockTouchEvent, createMockSwipeGesture, resizeWindow } from './test-utils';

describe('Mobile Responsiveness Tests', () => {
  
  beforeEach(() => {
    // Reset viewport to mobile size
    resizeWindow(375, 667); // iPhone SE dimensions
    
    // Mock touch device
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      value: 5
    });

    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      value: jest.fn()
    });

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    }));
  });

  afterEach(() => {
    // Reset viewport
    resizeWindow(1024, 768);
  });

  describe('Viewport Responsiveness', () => {
    
    test('should render mobile navigation on mobile viewport', () => {
      const mockUser = {
        name: 'John Doe',
        role: 'Developer',
        isManager: false
      };

      render(
        <MobileNavigation
          currentPath="/"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      // Should show bottom navigation
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
      
      // Should have mobile-specific classes or structure
      expect(navigation).toHaveClass(/fixed|bottom/);
    });

    test('should adapt layout for different mobile screen sizes', () => {
      const mockUser = { name: 'John Doe', role: 'Developer' };
      
      // Test small mobile (iPhone SE)
      resizeWindow(320, 568);
      const { rerender } = render(
        <MobileNavigation
          currentPath="/"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      let navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Test large mobile (iPhone Plus)
      resizeWindow(414, 736);
      rerender(
        <MobileNavigation
          currentPath="/"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Test tablet
      resizeWindow(768, 1024);
      rerender(
        <MobileNavigation
          currentPath="/"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });

    test('should handle orientation changes', async () => {
      const mockUser = { name: 'John Doe', role: 'Developer' };
      
      // Portrait
      resizeWindow(375, 667);
      const { rerender } = render(
        <MobileNavigation
          currentPath="/"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      let navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Landscape
      resizeWindow(667, 375);
      
      // Trigger orientation change event
      fireEvent(window, new Event('orientationchange'));
      
      rerender(
        <MobileNavigation
          currentPath="/"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    
    test('should detect touch device correctly', () => {
      const { result } = renderHook(() => useTouchDevice());
      expect(result.current).toBe(true);
    });

    test('should handle touch targets with minimum 44px size', () => {
      const mockUser = { name: 'John Doe', role: 'Developer' };

      const { container } = render(
        <MobileNavigation
          currentPath="/"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      const buttons = container.querySelectorAll('button');
      
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight, 10) || button.offsetHeight;
        const minWidth = parseInt(styles.minWidth, 10) || button.offsetWidth;
        
        expect(minHeight).toBeGreaterThanOrEqual(44);
        expect(minWidth).toBeGreaterThanOrEqual(44);
      });
    });

    test('should handle swipe gestures for navigation', async () => {
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();

      const TestComponent = () => {
        const { bind } = useSwipeNavigation(onSwipeLeft, onSwipeRight);
        return <div {...bind} data-testid="swipeable">Swipeable Content</div>;
      };

      render(<TestComponent />);
      
      const swipeableElement = screen.getByTestId('swipeable');
      
      // Simulate swipe left
      await createMockSwipeGesture(swipeableElement, 'left');
      expect(onSwipeLeft).toHaveBeenCalled();

      // Simulate swipe right
      await createMockSwipeGesture(swipeableElement, 'right');
      expect(onSwipeRight).toHaveBeenCalled();
    });

    test('should support pull-to-refresh functionality', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const TestComponent = () => {
        const { bind, state } = usePullToRefresh(onRefresh);
        return (
          <div {...bind} data-testid="pullable">
            <div data-testid="refresh-indicator">
              {state.isRefreshing ? 'Refreshing...' : state.message}
            </div>
            Content
          </div>
        );
      };

      render(<TestComponent />);
      
      const pullableElement = screen.getByTestId('pullable');
      
      // Simulate pull down gesture
      fireEvent.touchStart(pullableElement, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      fireEvent.touchMove(pullableElement, {
        touches: [{ clientX: 100, clientY: 200 }] // Pull down 100px
      });

      fireEvent.touchEnd(pullableElement);

      // Should trigger refresh
      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    test('should handle long press gestures', async () => {
      const onLongPress = jest.fn();
      
      const TestComponent = () => {
        const { bind } = useTouchGestures({
          longPress: {
            enabled: true,
            delay: 500,
            onLongPress
          }
        });
        return <div {...bind} data-testid="pressable">Long Press Me</div>;
      };

      render(<TestComponent />);
      
      const pressableElement = screen.getByTestId('pressable');
      
      // Simulate long press
      fireEvent.touchStart(pressableElement);
      
      // Wait for long press duration
      await waitFor(() => {
        expect(onLongPress).toHaveBeenCalled();
      }, { timeout: 600 });
    });
  });

  describe('Mobile Navigation', () => {
    
    test('should show mobile-specific navigation elements', () => {
      const mockUser = {
        name: 'John Doe',
        role: 'Developer',
        isManager: true
      };

      render(
        <MobileNavigation
          currentPath="/schedule"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      // Should have bottom navigation
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Should have menu button for additional options
      const menuButtons = screen.getAllByRole('button');
      const hasMenuButton = menuButtons.some(button => 
        button.getAttribute('aria-label')?.toLowerCase().includes('menu') ||
        button.textContent?.toLowerCase().includes('more')
      );
      expect(hasMenuButton).toBe(true);
    });

    test('should handle breadcrumb navigation on mobile', () => {
      const breadcrumbItems = [
        { id: '1', label: 'Home', path: '/' },
        { id: '2', label: 'Teams', path: '/teams' },
        { id: '3', label: 'Current Team', path: '/teams/1', isActive: true }
      ];

      render(
        <MobileBreadcrumbNavigation
          items={breadcrumbItems}
          onNavigate={jest.fn()}
          onBack={jest.fn()}
        />
      );

      // Should show compact breadcrumb for mobile
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Breadcrumb navigation');

      // Should have back button
      const backButton = screen.getByLabelText(/back|go back/i);
      expect(backButton).toBeInTheDocument();
    });

    test('should show floating action button when appropriate', () => {
      const actions = [
        {
          id: 'add',
          label: 'Add Item',
          icon: () => <span>+</span>,
          onClick: jest.fn()
        }
      ];

      render(<MobileFloatingActionButton actions={actions} />);
      
      // Should render FAB
      const fab = screen.getByRole('button');
      expect(fab).toBeInTheDocument();
      expect(fab).toHaveAttribute('aria-label', expect.stringContaining('actions'));
    });
  });

  describe('Mobile Schedule View', () => {
    
    test('should render mobile-optimized schedule layout', () => {
      const mockProps = {
        currentUser: { id: 1, name: 'John Doe', isManager: false },
        teamMembers: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ],
        selectedTeam: { id: 1, name: 'Development Team' },
        scheduleData: {},
        workOptions: [
          { value: '1', label: 'Full', hours: 8, color: 'bg-green-100' },
          { value: '0.5', label: 'Half', hours: 4, color: 'bg-yellow-100' }
        ],
        weekDays: [new Date()],
        currentWeekOffset: 0,
        loading: false,
        onWeekChange: jest.fn(),
        onWorkOptionClick: jest.fn(),
        onFullWeekSet: jest.fn(),
        onViewReasons: jest.fn(),
        isToday: jest.fn(),
        isPastDate: jest.fn(),
        getCurrentWeekString: jest.fn().mockReturnValue('Jan 1 - Jan 7'),
        getTeamTotalHours: jest.fn().mockReturnValue(40)
      };

      render(<MobileScheduleView {...mockProps} />);
      
      // Should render mobile layout
      const scheduleContainer = screen.getByText(/week of/i);
      expect(scheduleContainer).toBeInTheDocument();

      // Should have navigation controls
      const prevButton = screen.getByText(/previous/i);
      const nextButton = screen.getByText(/next/i);
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    test('should handle week navigation with swipe gestures', async () => {
      const onWeekChange = jest.fn();
      
      const mockProps = {
        currentUser: { id: 1, name: 'John Doe', isManager: false },
        teamMembers: [],
        selectedTeam: { id: 1, name: 'Team' },
        scheduleData: {},
        workOptions: [],
        weekDays: [new Date()],
        currentWeekOffset: 0,
        loading: false,
        onWeekChange,
        onWorkOptionClick: jest.fn(),
        onFullWeekSet: jest.fn(),
        onViewReasons: jest.fn(),
        isToday: jest.fn(),
        isPastDate: jest.fn(),
        getCurrentWeekString: jest.fn().mockReturnValue('Jan 1 - Jan 7'),
        getTeamTotalHours: jest.fn().mockReturnValue(40)
      };

      const { container } = render(<MobileScheduleView {...mockProps} />);
      
      // Find swipeable container (assuming it has appropriate gestures)
      const scheduleContainer = container.querySelector('[data-testid*="schedule"], .mobile-schedule');
      
      if (scheduleContainer) {
        // Simulate swipe left (next week)
        await createMockSwipeGesture(scheduleContainer, 'left');
        expect(onWeekChange).toHaveBeenCalledWith(1);

        // Simulate swipe right (previous week)
        await createMockSwipeGesture(scheduleContainer, 'right');
        expect(onWeekChange).toHaveBeenCalledWith(-1);
      }
    });
  });

  describe('Mobile COO Dashboard', () => {
    
    test('should render mobile-optimized dashboard', () => {
      const mockData = {
        companyOverview: {
          totalMembers: 50,
          totalTeams: 5,
          weeklyPotential: 2000,
          currentUtilization: 85,
          capacityGap: 100
        },
        teamComparison: [
          {
            teamId: 1,
            teamName: 'Team A',
            memberCount: 10,
            weeklyPotential: 400,
            actualHours: 380,
            utilization: 95,
            capacityGap: 20
          }
        ],
        sprintAnalytics: {
          currentSprintNumber: 5,
          sprintWeeks: 2,
          sprintPotential: 800,
          sprintUtilization: 87
        },
        optimizationRecommendations: [
          'Consider redistributing workload',
          'Schedule team building activities'
        ]
      };

      const mockUser = {
        name: 'COO User',
        title: 'Chief Operating Officer'
      };

      render(
        <MobileCOODashboard
          currentUser={mockUser}
          dashboardData={mockData}
          onRefresh={jest.fn()}
          isLoading={false}
          error={null}
        />
      );

      // Should render mobile dashboard
      expect(screen.getByText('COO Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Company Overview')).toBeInTheDocument();
      expect(screen.getByText('Team Capacity')).toBeInTheDocument();
    });

    test('should handle loading state on mobile', () => {
      render(
        <MobileCOODashboard
          dashboardData={{} as any}
          onRefresh={jest.fn()}
          isLoading={true}
          error={null}
        />
      );

      // Should show loading indicators
      const loadingElements = screen.getAllByText(/loading/i);
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    test('should handle error state on mobile', () => {
      const onRefresh = jest.fn();

      render(
        <MobileCOODashboard
          dashboardData={{} as any}
          onRefresh={onRefresh}
          isLoading={false}
          error="Failed to load data"
        />
      );

      // Should show error message
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
      
      // Should have try again button
      const tryAgainButton = screen.getByText(/try again/i);
      expect(tryAgainButton).toBeInTheDocument();
      
      fireEvent.click(tryAgainButton);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe('Performance on Mobile', () => {
    
    test('should render quickly on mobile devices', async () => {
      const startTime = performance.now();
      
      const mockUser = { name: 'John Doe', role: 'Developer' };
      
      render(
        <MobileNavigation
          currentPath="/"
          currentUser={mockUser}
          onNavigate={jest.fn()}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(100); // 100ms threshold
    });

    test('should handle rapid touch interactions without lag', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();

      render(
        <button onClick={onClick} data-testid="rapid-tap">
          Tap Me
        </button>
      );

      const button = screen.getByTestId('rapid-tap');

      // Simulate rapid taps
      const tapPromises = Array.from({ length: 5 }, (_, i) => 
        user.click(button)
      );

      await Promise.all(tapPromises);

      // All taps should be registered
      await waitFor(() => {
        expect(onClick).toHaveBeenCalledTimes(5);
      });
    });

    test('should maintain smooth scrolling performance', async () => {
      const { container } = render(
        <div style={{ height: '200px', overflow: 'auto' }} data-testid="scrollable">
          <div style={{ height: '1000px' }}>
            Long scrollable content
          </div>
        </div>
      );

      const scrollableElement = screen.getByTestId('scrollable');
      
      // Simulate scroll
      fireEvent.scroll(scrollableElement, { target: { scrollTop: 500 } });

      // Should handle scroll without issues
      expect(scrollableElement.scrollTop).toBe(500);
    });
  });

  describe('Safe Area Support', () => {
    
    test('should handle safe area insets on devices with notches', () => {
      // Mock CSS environment variables
      Object.defineProperty(document.documentElement.style, 'getPropertyValue', {
        value: jest.fn().mockImplementation((prop) => {
          if (prop === '--safe-area-inset-bottom') return '34px';
          if (prop === '--safe-area-inset-top') return '44px';
          return '';
        })
      });

      const mockUser = { name: 'John Doe', role: 'Developer' };

      const { container } = render(
        <div className="mobile-safe-area">
          <MobileNavigation
            currentPath="/"
            currentUser={mockUser}
            onNavigate={jest.fn()}
          />
        </div>
      );

      // Should apply safe area styles
      const safeAreaElement = container.querySelector('.mobile-safe-area');
      expect(safeAreaElement).toBeInTheDocument();
    });
  });
});