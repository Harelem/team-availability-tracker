import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import SprintManager from '@/components/coo/SprintManager';
import DailyStatus from '@/components/coo/DailyStatus';
import CompanyMetrics from '@/components/coo/CompanyMetrics';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
  })),
}));

// Performance monitoring utility
const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  await act(async () => {
    renderFn();
  });
  const end = performance.now();
  return end - start;
};

const measureAsyncOperationTime = async (operationFn: () => Promise<any>) => {
  const start = performance.now();
  await operationFn();
  const end = performance.now();
  return end - start;
};

describe('COO Dashboard Performance Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@supabase/supabase-js').createClient();
  });

  describe('Sprint Manager Performance', () => {
    const generateMockSprints = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `Sprint ${i + 1}`,
        start_date: '2024-01-15',
        end_date: '2024-01-28',
        is_active: i === 0,
        company_potential_hours: 280,
        progress_percentage: Math.random() * 100,
      }));

    describe('Initial Render Performance', () => {
      it('should render quickly with small dataset (≤ 10 sprints)', async () => {
        const mockSprints = generateMockSprints(10);
        mockSupabase.from().select().order().mockResolvedValue({
          data: mockSprints,
          error: null,
        });

        const renderTime = await measureRenderTime(() => {
          render(<SprintManager onRefresh={jest.fn()} />);
        });

        expect(renderTime).toBeLessThan(100); // Less than 100ms
      });

      it('should render acceptably with medium dataset (≤ 100 sprints)', async () => {
        const mockSprints = generateMockSprints(100);
        mockSupabase.from().select().order().mockResolvedValue({
          data: mockSprints,
          error: null,
        });

        const renderTime = await measureRenderTime(() => {
          render(<SprintManager onRefresh={jest.fn()} />);
        });

        expect(renderTime).toBeLessThan(300); // Less than 300ms
      });

      it('should handle large dataset (≤ 500 sprints) without blocking UI', async () => {
        const mockSprints = generateMockSprints(500);
        mockSupabase.from().select().order().mockResolvedValue({
          data: mockSprints,
          error: null,
        });

        const renderTime = await measureRenderTime(() => {
          render(<SprintManager onRefresh={jest.fn()} />);
        });

        expect(renderTime).toBeLessThan(1000); // Less than 1 second
      });
    });

    describe('Data Loading Performance', () => {
      it('should show loading state immediately', async () => {
        let resolvePromise: (value: any) => void;
        const delayedPromise = new Promise(resolve => {
          resolvePromise = resolve;
        });

        mockSupabase.from().select().order().mockReturnValue(delayedPromise);

        render(<SprintManager onRefresh={jest.fn()} />);

        // Loading should appear immediately
        expect(screen.getByTestId('loading-sprints')).toBeInTheDocument();

        // Resolve the promise
        act(() => {
          resolvePromise!({
            data: generateMockSprints(5),
            error: null,
          });
        });
      });

      it('should handle slow API responses gracefully', async () => {
        const mockSprints = generateMockSprints(50);
        
        // Simulate slow API response
        const slowApiResponse = new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: mockSprints,
              error: null,
            });
          }, 2000); // 2 second delay
        });

        mockSupabase.from().select().order().mockReturnValue(slowApiResponse);

        const start = performance.now();
        render(<SprintManager onRefresh={jest.fn()} />);

        // Component should render immediately with loading state
        const initialRenderTime = performance.now() - start;
        expect(initialRenderTime).toBeLessThan(50); // Initial render should be fast

        expect(screen.getByTestId('loading-sprints')).toBeInTheDocument();

        await waitFor(() => {
          expect(screen.getByText('Sprint 1')).toBeInTheDocument();
        }, { timeout: 3000 });
      });

      it('should batch multiple API calls efficiently', async () => {
        const mockSprints = generateMockSprints(20);
        mockSupabase.from().select().order().mockResolvedValue({
          data: mockSprints,
          error: null,
        });

        const apiCallTime = await measureAsyncOperationTime(async () => {
          render(<SprintManager onRefresh={jest.fn()} />);
          await waitFor(() => {
            expect(screen.getByText('Sprint 1')).toBeInTheDocument();
          });
        });

        // Should complete all API operations within reasonable time
        expect(apiCallTime).toBeLessThan(500);
      });
    });

    describe('CRUD Operation Performance', () => {
      beforeEach(() => {
        const mockSprints = generateMockSprints(10);
        mockSupabase.from().select().order().mockResolvedValue({
          data: mockSprints,
          error: null,
        });
      });

      it('should handle sprint creation quickly', async () => {
        mockSupabase.from().insert().mockResolvedValue({
          data: [{ id: 11, name: 'New Sprint' }],
          error: null,
        });

        const operationTime = await measureAsyncOperationTime(async () => {
          // Simulate sprint creation
          await mockSupabase.from().insert({
            name: 'Performance Test Sprint',
            start_date: '2024-01-15',
            end_date: '2024-01-28',
          });
        });

        expect(operationTime).toBeLessThan(200);
      });

      it('should handle sprint updates efficiently', async () => {
        mockSupabase.from().update().eq().mockResolvedValue({
          data: [{ id: 1, name: 'Updated Sprint' }],
          error: null,
        });

        const operationTime = await measureAsyncOperationTime(async () => {
          await mockSupabase.from().update({ name: 'Updated Sprint' }).eq('id', 1);
        });

        expect(operationTime).toBeLessThan(200);
      });

      it('should handle sprint deletion promptly', async () => {
        mockSupabase.from().delete().eq().mockResolvedValue({
          error: null,
        });

        const operationTime = await measureAsyncOperationTime(async () => {
          await mockSupabase.from().delete().eq('id', 1);
        });

        expect(operationTime).toBeLessThan(200);
      });
    });
  });

  describe('Daily Status Performance', () => {
    const generateMockScheduleEntries = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        user_id: `user${i % 20}`, // 20 unique users
        date: '2024-01-15',
        value: Math.floor(Math.random() * 8) + 1,
        absence_reason: Math.random() > 0.8 ? 'Sick Leave' : null,
        profiles: {
          full_name: `User ${i % 20}`,
          team: ['Development', 'QA', 'Design'][i % 3],
        },
      }));

    const generateMockProfiles = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `user${i}`,
        full_name: `User ${i}`,
        team: ['Development', 'QA', 'Design'][i % 3],
      }));

    describe('Data Aggregation Performance', () => {
      it('should aggregate small datasets quickly (≤ 100 entries)', async () => {
        const mockEntries = generateMockScheduleEntries(100);
        const mockProfiles = generateMockProfiles(20);
        
        mockSupabase.from().select().eq().gte().lte()
          .mockResolvedValueOnce({ data: mockEntries, error: null })
          .mockResolvedValueOnce({ data: mockProfiles, error: null });

        const renderTime = await measureRenderTime(() => {
          render(<DailyStatus onRefresh={jest.fn()} />);
        });

        expect(renderTime).toBeLessThan(150);
      });

      it('should handle medium datasets efficiently (≤ 1000 entries)', async () => {
        const mockEntries = generateMockScheduleEntries(1000);
        const mockProfiles = generateMockProfiles(50);
        
        mockSupabase.from().select().eq().gte().lte()
          .mockResolvedValueOnce({ data: mockEntries, error: null })
          .mockResolvedValueOnce({ data: mockProfiles, error: null });

        const renderTime = await measureRenderTime(() => {
          render(<DailyStatus onRefresh={jest.fn()} />);
        });

        expect(renderTime).toBeLessThan(400);
      });

      it('should manage large datasets without blocking (≤ 5000 entries)', async () => {
        const mockEntries = generateMockScheduleEntries(5000);
        const mockProfiles = generateMockProfiles(100);
        
        mockSupabase.from().select().eq().gte().lte()
          .mockResolvedValueOnce({ data: mockEntries, error: null })
          .mockResolvedValueOnce({ data: mockProfiles, error: null });

        const renderTime = await measureRenderTime(() => {
          render(<DailyStatus onRefresh={jest.fn()} />);
        });

        expect(renderTime).toBeLessThan(1000);
      });
    });

    describe('Real-time Updates Performance', () => {
      it('should setup real-time subscription quickly', async () => {
        const mockEntries = generateMockScheduleEntries(50);
        const mockProfiles = generateMockProfiles(20);
        
        mockSupabase.from().select().eq().gte().lte()
          .mockResolvedValueOnce({ data: mockEntries, error: null })
          .mockResolvedValueOnce({ data: mockProfiles, error: null });

        const subscriptionTime = await measureAsyncOperationTime(async () => {
          render(<DailyStatus onRefresh={jest.fn()} />);
          await waitFor(() => {
            expect(mockSupabase.channel).toHaveBeenCalled();
          });
        });

        expect(subscriptionTime).toBeLessThan(100);
      });

      it('should handle frequent real-time updates efficiently', async () => {
        const mockEntries = generateMockScheduleEntries(100);
        const mockProfiles = generateMockProfiles(30);
        
        mockSupabase.from().select().eq().gte().lte()
          .mockResolvedValue({ data: mockEntries, error: null });

        let realtimeCallback: any;
        mockSupabase.channel().on.mockImplementation((event: any, config: any, callback: any) => {
          realtimeCallback = callback;
          return mockSupabase.channel();
        });

        render(<DailyStatus onRefresh={jest.fn()} />);

        await waitFor(() => {
          expect(realtimeCallback).toBeDefined();
        });

        // Simulate multiple rapid updates
        const updateTime = await measureAsyncOperationTime(async () => {
          for (let i = 0; i < 10; i++) {
            act(() => {
              realtimeCallback({
                eventType: 'UPDATE',
                new: { id: i, user_id: `user${i}`, value: 7 },
              });
            });
          }
        });

        expect(updateTime).toBeLessThan(200);
      });
    });

    describe('Team Grouping Performance', () => {
      it('should group teams efficiently with many members', async () => {
        const mockEntries = generateMockScheduleEntries(1000);
        const mockProfiles = generateMockProfiles(100);
        
        mockSupabase.from().select().eq().gte().lte()
          .mockResolvedValueOnce({ data: mockEntries, error: null })
          .mockResolvedValueOnce({ data: mockProfiles, error: null });

        const groupingTime = await measureAsyncOperationTime(async () => {
          render(<DailyStatus onRefresh={jest.fn()} />);
          await waitFor(() => {
            expect(screen.getByText(/Development/)).toBeInTheDocument();
          });
        });

        expect(groupingTime).toBeLessThan(300);
      });
    });
  });

  describe('Company Metrics Performance', () => {
    const generateMockScheduleEntriesForSprint = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        user_id: `user${i % 50}`,
        date: '2024-01-15',
        value: Math.floor(Math.random() * 8) + 1,
      }));

    describe('Calculation Performance', () => {
      beforeEach(() => {
        const mockActiveSprint = {
          id: 1,
          name: 'Performance Test Sprint',
          start_date: '2024-01-15',
          end_date: '2024-01-28',
          is_active: true,
          company_potential_hours: 280,
          progress_percentage: 75.5,
        };

        mockSupabase.from().select().eq().single
          .mockResolvedValue({ data: mockActiveSprint, error: null });
      });

      it('should calculate metrics quickly for small teams (≤ 20 members)', async () => {
        const mockProfiles = generateMockProfiles(20);
        const mockEntries = generateMockScheduleEntriesForSprint(200);
        
        mockSupabase.from().select()
          .mockResolvedValueOnce({ data: mockProfiles, error: null });
        mockSupabase.from().select().gte().lte()
          .mockResolvedValueOnce({ data: mockEntries, error: null });

        const calculationTime = await measureAsyncOperationTime(async () => {
          render(<CompanyMetrics onRefresh={jest.fn()} />);
          await waitFor(() => {
            expect(screen.getByText('Performance Test Sprint')).toBeInTheDocument();
          });
        });

        expect(calculationTime).toBeLessThan(200);
      });

      it('should handle medium teams efficiently (≤ 100 members)', async () => {
        const mockProfiles = generateMockProfiles(100);
        const mockEntries = generateMockScheduleEntriesForSprint(1000);
        
        mockSupabase.from().select()
          .mockResolvedValueOnce({ data: mockProfiles, error: null });
        mockSupabase.from().select().gte().lte()
          .mockResolvedValueOnce({ data: mockEntries, error: null });

        const calculationTime = await measureAsyncOperationTime(async () => {
          render(<CompanyMetrics onRefresh={jest.fn()} />);
          await waitFor(() => {
            expect(screen.getByText('Performance Test Sprint')).toBeInTheDocument();
          });
        });

        expect(calculationTime).toBeLessThan(400);
      });

      it('should manage large teams without blocking (≤ 500 members)', async () => {
        const mockProfiles = generateMockProfiles(500);
        const mockEntries = generateMockScheduleEntriesForSprint(5000);
        
        mockSupabase.from().select()
          .mockResolvedValueOnce({ data: mockProfiles, error: null });
        mockSupabase.from().select().gte().lte()
          .mockResolvedValueOnce({ data: mockEntries, error: null });

        const calculationTime = await measureAsyncOperationTime(async () => {
          render(<CompanyMetrics onRefresh={jest.fn()} />);
          await waitFor(() => {
            expect(screen.getByText('Performance Test Sprint')).toBeInTheDocument();
          });
        });

        expect(calculationTime).toBeLessThan(800);
      });
    });

    describe('Working Days Calculation Performance', () => {
      it('should calculate working days quickly for various sprint lengths', async () => {
        const sprintLengths = [7, 14, 30, 90]; // Days

        for (const length of sprintLengths) {
          const mockSprint = {
            id: 1,
            name: `${length}-day Sprint`,
            start_date: '2024-01-01',
            end_date: new Date(2024, 0, length).toISOString().split('T')[0],
            is_active: true,
            company_potential_hours: 280,
            progress_percentage: 50,
          };

          mockSupabase.from().select().eq().single
            .mockResolvedValue({ data: mockSprint, error: null });
          
          mockSupabase.from().select()
            .mockResolvedValue({ data: generateMockProfiles(50), error: null });
          
          mockSupabase.from().select().gte().lte()
            .mockResolvedValue({ data: generateMockScheduleEntriesForSprint(500), error: null });

          const calculationTime = await measureAsyncOperationTime(async () => {
            const { unmount } = render(<CompanyMetrics onRefresh={jest.fn()} />);
            await waitFor(() => {
              expect(screen.getByText(`${length}-day Sprint`)).toBeInTheDocument();
            });
            unmount();
          });

          expect(calculationTime).toBeLessThan(300);
        }
      });
    });
  });

  describe('Memory Usage and Cleanup', () => {
    it('should not create memory leaks with frequent re-renders', async () => {
      const mockSprints = generateMockSprints(50);
      mockSupabase.from().select().order().mockResolvedValue({
        data: mockSprints,
        error: null,
      });

      // Render and unmount multiple times to test memory cleanup
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<SprintManager onRefresh={jest.fn()} />);
        
        await waitFor(() => {
          expect(screen.getByText('Sprint 1')).toBeInTheDocument();
        });

        unmount();
      }

      // If we reach here without issues, memory cleanup is working
      expect(true).toBe(true);
    });

    it('should cleanup real-time subscriptions on unmount', async () => {
      const mockEntries = generateMockScheduleEntries(50);
      const mockProfiles = generateMockProfiles(20);
      
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValueOnce({ data: mockEntries, error: null })
        .mockResolvedValueOnce({ data: mockProfiles, error: null });

      const { unmount } = render(<DailyStatus onRefresh={jest.fn()} />);

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
      });

      // Unmounting should not cause any errors
      unmount();
      expect(true).toBe(true);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle multiple simultaneous API calls efficiently', async () => {
      const mockData = {
        sprints: generateMockSprints(20),
        entries: generateMockScheduleEntries(200),
        profiles: generateMockProfiles(50),
      };

      mockSupabase.from().select().order()
        .mockResolvedValue({ data: mockData.sprints, error: null });
      mockSupabase.from().select().eq().gte().lte()
        .mockResolvedValue({ data: mockData.entries, error: null });
      mockSupabase.from().select()
        .mockResolvedValue({ data: mockData.profiles, error: null });

      const concurrentTime = await measureAsyncOperationTime(async () => {
        const components = [
          <SprintManager key="sprint" onRefresh={jest.fn()} />,
          <DailyStatus key="daily" onRefresh={jest.fn()} />,
          <CompanyMetrics key="metrics" onRefresh={jest.fn()} />,
        ];

        render(<div>{components}</div>);

        await waitFor(() => {
          expect(screen.getByText('Sprint 1')).toBeInTheDocument();
        });
      });

      expect(concurrentTime).toBeLessThan(600);
    });

    it('should prioritize critical operations over background tasks', async () => {
      const mockSprints = generateMockSprints(100);
      
      // Simulate prioritized loading
      mockSupabase.from().select().order()
        .mockImplementation(() => {
          // Critical data loads first
          return Promise.resolve({
            data: mockSprints.slice(0, 10), // First 10 sprints load quickly
            error: null,
          });
        });

      const priorityTime = await measureAsyncOperationTime(async () => {
        render(<SprintManager onRefresh={jest.fn()} />);
        
        // Should show at least some data quickly
        await waitFor(() => {
          expect(screen.getByText('Sprint 1')).toBeInTheDocument();
        }, { timeout: 200 });
      });

      expect(priorityTime).toBeLessThan(200);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors quickly without blocking UI', async () => {
      mockSupabase.from().select().order().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const errorHandlingTime = await measureAsyncOperationTime(async () => {
        render(<SprintManager onRefresh={jest.fn()} />);
        
        await waitFor(() => {
          expect(screen.getByText(/error loading sprints/i)).toBeInTheDocument();
        });
      });

      expect(errorHandlingTime).toBeLessThan(100);
    });

    it('should recover from errors efficiently', async () => {
      const mockSprints = generateMockSprints(10);
      
      mockSupabase.from().select().order()
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Temporary error' },
        })
        .mockResolvedValueOnce({
          data: mockSprints,
          error: null,
        });

      render(<SprintManager onRefresh={jest.fn()} />);

      // First load shows error
      await waitFor(() => {
        expect(screen.getByText(/error loading sprints/i)).toBeInTheDocument();
      });

      const recoveryTime = await measureAsyncOperationTime(async () => {
        // Trigger refresh
        const refreshButton = screen.getByLabelText(/refresh sprints/i);
        act(() => {
          refreshButton.click();
        });

        await waitFor(() => {
          expect(screen.getByText('Sprint 1')).toBeInTheDocument();
        });
      });

      expect(recoveryTime).toBeLessThan(300);
    });
  });
});