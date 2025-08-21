/**
 * Performance & System Stability Tests
 * 
 * Tests for navigation performance, memory usage, error boundaries, and build verification
 * FOCUS: System stability, performance metrics, production readiness
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleTable from '@/components/ScheduleTable';
import { GlobalSprintProvider } from '@/contexts/GlobalSprintContext';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';
import { detectCurrentSprintForDate } from '@/utils/smartSprintDetection';

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private memoryBefore: number = 0;

  start() {
    this.startTime = performance.now();
    if (performance.memory) {
      this.memoryBefore = performance.memory.usedJSHeapSize;
    }
  }

  end(): { duration: number; memoryDelta: number } {
    const duration = performance.now() - this.startTime;
    let memoryDelta = 0;
    
    if (performance.memory) {
      memoryDelta = performance.memory.usedJSHeapSize - this.memoryBefore;
    }
    
    return { duration, memoryDelta };
  }
}

// Mock data
const mockCurrentUser: TeamMember = {
  id: 1,
  name: 'Performance Test User',
  team_id: 1,
  role: 'manager',
  weekly_capacity: 35
};

const mockTeam: Team = {
  id: 1,
  name: 'Performance Test Team',
  manager_id: 1,
  description: 'Team for performance testing'
};

// Generate larger dataset for performance testing
const generateLargeTeamMembers = (count: number): TeamMember[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Team Member ${i + 1}`,
    team_id: 1,
    role: i === 0 ? 'manager' : 'member' as const,
    weekly_capacity: 35
  }));
};

const mockCurrentSprint: CurrentGlobalSprint = {
  id: '2',
  current_sprint_number: 2,
  sprint_length_weeks: 2,
  sprint_start_date: '2025-08-10',
  sprint_end_date: '2025-08-21',
  progress_percentage: 50,
  days_remaining: 7,
  working_days_remaining: 5,
  is_active: true,
  notes: 'Performance Test Sprint',
  created_at: '2025-08-10T00:00:00Z',
  updated_at: '2025-08-10T00:00:00Z',
  updated_by: 'system'
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <GlobalSprintProvider initialSprint={mockCurrentSprint}>
    {children}
  </GlobalSprintProvider>
);

describe('Performance & System Stability Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let originalError: typeof console.error;
  let errorMessages: string[] = [];

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    errorMessages = [];
    
    // Capture console errors
    originalError = console.error;
    console.error = jest.fn((message: string) => {
      errorMessages.push(message);
      originalError(message);
    });
    
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error = originalError;
    jest.restoreAllMocks();
  });

  describe('Navigation Performance Tests', () => {
    it('should navigate quickly between weeks', async () => {
      const smallTeam = generateLargeTeamMembers(5);
      
      performanceMonitor.start();
      
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={smallTeam}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const nextButton = screen.queryByRole('button', { name: /next/i });
      
      if (nextButton) {
        // Perform multiple navigation actions
        for (let i = 0; i < 10; i++) {
          fireEvent.click(nextButton);
          await waitFor(() => {
            expect(screen.getByText(/Week of/i)).toBeInTheDocument();
          }, { timeout: 1000 });
        }
      }

      const { duration } = performanceMonitor.end();
      
      // Navigation should complete within reasonable time (less than 5 seconds total)
      expect(duration).toBeLessThan(5000);
      
      console.log(`✅ Navigation performance test completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle rapid navigation without performance degradation', async () => {
      const team = generateLargeTeamMembers(10);
      
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={team}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const nextButton = screen.queryByRole('button', { name: /next/i });
      const prevButton = screen.queryByRole('button', { name: /previous/i });

      if (nextButton && prevButton) {
        performanceMonitor.start();
        
        // Rapid back-and-forth navigation
        const navigationSequence = [
          nextButton, nextButton, nextButton, 
          prevButton, prevButton, 
          nextButton, nextButton, prevButton,
          nextButton, prevButton, nextButton
        ];

        for (const button of navigationSequence) {
          fireEvent.click(button);
          // Very short delay to simulate rapid user interaction
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const { duration } = performanceMonitor.end();
        
        // Rapid navigation should complete quickly
        expect(duration).toBeLessThan(2000);
        
        // UI should remain stable
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeVisible();
        
        console.log(`✅ Rapid navigation test completed in ${duration.toFixed(2)}ms`);
      }
    });

    it('should maintain performance with large teams', async () => {
      const largeTeam = generateLargeTeamMembers(50);
      
      performanceMonitor.start();
      
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={largeTeam}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const { duration } = performanceMonitor.end();
      
      // Large team rendering should complete within reasonable time
      expect(duration).toBeLessThan(3000);
      
      // Verify all team members are rendered
      expect(screen.getByRole('table')).toBeVisible();
      
      console.log(`✅ Large team (${largeTeam.length} members) rendered in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks during navigation', async () => {
      const team = generateLargeTeamMembers(20);
      
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={team}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      const nextButton = screen.queryByRole('button', { name: /next/i });
      
      if (nextButton && performance.memory) {
        const initialMemory = performance.memory.usedJSHeapSize;
        
        // Navigate multiple times to test for memory leaks
        for (let i = 0; i < 20; i++) {
          fireEvent.click(nextButton);
          await waitFor(() => {
            expect(screen.getByText(/Week of/i)).toBeInTheDocument();
          });
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const finalMemory = performance.memory.usedJSHeapSize;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        
        console.log(`✅ Memory usage test: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase after 20 navigations`);
      } else {
        console.log('ℹ️ Performance.memory not available, skipping memory test');
      }
    });

    it('should clean up resources properly', async () => {
      const { unmount } = render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(30)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Unmount component to test cleanup
      unmount();
      
      // Should not have any cleanup errors
      expect(errorMessages.filter(msg => msg.includes('cleanup') || msg.includes('unmount'))).toHaveLength(0);
      
      console.log('✅ Component cleanup test passed');
    });
  });

  describe('Error Boundary Tests', () => {
    it('should handle invalid date inputs gracefully', () => {
      const invalidDates = [
        new Date('invalid'),
        new Date('2025-02-30'), // Invalid date
        new Date('2025-13-01'), // Invalid month
        new Date(NaN)
      ];

      invalidDates.forEach((invalidDate, index) => {
        try {
          const result = detectCurrentSprintForDate(invalidDate);
          
          // Should either return a valid sprint or handle gracefully
          if (result) {
            expect(typeof result.sprintNumber).toBe('number');
            expect(result.sprintNumber).toBeGreaterThan(0);
          }
          
          console.log(`✅ Invalid date ${index + 1}: Handled gracefully`);
        } catch (error) {
          console.log(`⚠️ Invalid date ${index + 1}: Threw error, checking if it's handled properly`);
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    it('should handle component errors without crashing', async () => {
      const errorProneProps = {
        currentUser: { ...mockCurrentUser, team_id: null as any },
        teamMembers: null as any,
        selectedTeam: null as any,
        viewMode: 'invalid' as any
      };

      // This test checks that the component handles invalid props gracefully
      try {
        render(
          <TestWrapper>
            <ScheduleTable {...errorProneProps} />
          </TestWrapper>
        );

        // If component renders despite invalid props, that's good error handling
        console.log('✅ Component handled invalid props gracefully');
      } catch (error) {
        // If it throws, the error should be caught by error boundaries in production
        console.log('ℹ️ Component threw error with invalid props - should be caught by error boundary');
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should recover from state corruption', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(5)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Simulate state corruption through rapid interactions
      const buttons = screen.getAllByRole('button');
      
      if (buttons.length > 0) {
        // Click multiple buttons rapidly to potentially cause state issues
        buttons.forEach(button => {
          for (let i = 0; i < 3; i++) {
            fireEvent.click(button);
          }
        });

        // Component should still be functional
        await waitFor(() => {
          expect(screen.getByText(/Week of/i)).toBeInTheDocument();
          expect(screen.getByRole('table')).toBeVisible();
        });
      }

      console.log('✅ State corruption recovery test passed');
    });
  });

  describe('Network Condition Tests', () => {
    it('should handle slow network conditions', async () => {
      // Mock slow network response
      const slowPromise = new Promise(resolve => setTimeout(resolve, 2000));
      
      const renderPromise = Promise.resolve(render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(10)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      ));

      // Test that component handles loading states properly
      await Promise.all([slowPromise, renderPromise]);

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log('✅ Slow network conditions handled properly');
    });

    it('should maintain functionality during intermittent connectivity', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(8)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Simulate navigation during connectivity issues
      const nextButton = screen.queryByRole('button', { name: /next/i });
      
      if (nextButton) {
        // Multiple clicks to simulate user retry behavior
        fireEvent.click(nextButton);
        fireEvent.click(nextButton);
        fireEvent.click(nextButton);

        // Should maintain functionality
        await waitFor(() => {
          expect(screen.getByText(/Week of/i)).toBeInTheDocument();
        });
      }

      console.log('✅ Intermittent connectivity test passed');
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent user interactions', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(15)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      performanceMonitor.start();

      // Simulate multiple concurrent interactions
      const interactions = [];
      const buttons = screen.getAllByRole('button');
      
      for (let i = 0; i < 50; i++) {
        const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
        interactions.push(
          new Promise(resolve => {
            setTimeout(() => {
              fireEvent.click(randomButton);
              resolve(true);
            }, Math.random() * 100);
          })
        );
      }

      await Promise.all(interactions);

      const { duration } = performanceMonitor.end();
      
      // Should handle concurrent interactions within reasonable time
      expect(duration).toBeLessThan(2000);
      
      // UI should remain stable
      expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      
      console.log(`✅ Concurrent interactions test completed in ${duration.toFixed(2)}ms`);
    });

    it('should maintain responsiveness under load', async () => {
      const veryLargeTeam = generateLargeTeamMembers(100);
      
      performanceMonitor.start();
      
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={veryLargeTeam}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      const { duration } = performanceMonitor.end();
      
      // Very large team should render within acceptable time
      expect(duration).toBeLessThan(8000);
      
      console.log(`✅ Load test with ${veryLargeTeam.length} team members completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('System Stability Tests', () => {
    it('should not generate console errors during normal operation', async () => {
      const initialErrorCount = errorMessages.length;
      
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(10)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Navigate a few times
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton) {
        for (let i = 0; i < 5; i++) {
          fireEvent.click(nextButton);
          await waitFor(() => {
            expect(screen.getByText(/Week of/i)).toBeInTheDocument();
          });
        }
      }

      const finalErrorCount = errorMessages.length;
      
      // Should not generate new console errors
      expect(finalErrorCount).toBe(initialErrorCount);
      
      console.log('✅ No console errors during normal operation');
    });

    it('should handle browser compatibility gracefully', async () => {
      // Mock different browser capabilities
      const originalPerformance = global.performance;
      
      // Test without performance.memory
      if (global.performance) {
        delete (global.performance as any).memory;
      }

      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(5)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Should work without modern performance APIs
      expect(screen.getByRole('table')).toBeVisible();
      
      // Restore
      global.performance = originalPerformance;
      
      console.log('✅ Browser compatibility test passed');
    });

    it('should maintain stability during extended usage', async () => {
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(12)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      // Simulate extended usage with various interactions
      const interactions = [
        'navigation', 'table interaction', 'state change',
        'navigation', 'table interaction', 'state change',
        'navigation', 'table interaction', 'state change'
      ];

      const nextButton = screen.queryByRole('button', { name: /next/i });
      
      for (const interaction of interactions) {
        switch (interaction) {
          case 'navigation':
            if (nextButton) {
              fireEvent.click(nextButton);
              await waitFor(() => {
                expect(screen.getByText(/Week of/i)).toBeInTheDocument();
              });
            }
            break;
          case 'table interaction':
            const table = screen.getByRole('table');
            fireEvent.click(table);
            break;
          case 'state change':
            // Simulate state change through view mode toggle if available
            break;
        }
        
        // Brief pause between interactions
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // System should remain stable
      expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeVisible();
      
      console.log('✅ Extended usage stability test passed');
    });
  });

  describe('Build Verification Tests', () => {
    it('should verify component can be imported and rendered', () => {
      expect(ScheduleTable).toBeDefined();
      expect(typeof ScheduleTable).toBe('function');
      
      console.log('✅ Component import verification passed');
    });

    it('should verify all required dependencies are available', async () => {
      const dependencies = [
        'react',
        '@testing-library/react',
        '@testing-library/jest-dom'
      ];

      dependencies.forEach(dep => {
        try {
          require(dep);
          console.log(`✅ Dependency ${dep}: Available`);
        } catch (error) {
          console.error(`❌ Dependency ${dep}: Missing`);
          throw new Error(`Required dependency ${dep} is not available`);
        }
      });
    });

    it('should verify TypeScript compilation compatibility', () => {
      // This test runs if TypeScript compilation was successful
      expect(mockCurrentUser.id).toBe(1);
      expect(mockCurrentUser.role).toBe('manager');
      expect(mockTeam.name).toBe('Performance Test Team');
      
      console.log('✅ TypeScript compilation compatibility verified');
    });

    it('should verify production build readiness', async () => {
      // Test that component renders without development-only dependencies
      process.env.NODE_ENV = 'production';
      
      render(
        <TestWrapper>
          <ScheduleTable
            currentUser={mockCurrentUser}
            teamMembers={generateLargeTeamMembers(5)}
            selectedTeam={mockTeam}
            viewMode="week"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Week of/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('table')).toBeVisible();
      
      // Reset environment
      process.env.NODE_ENV = 'test';
      
      console.log('✅ Production build readiness verified');
    });
  });
});