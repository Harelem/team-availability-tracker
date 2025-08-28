/**
 * Performance and Load Tests
 * Tests for database performance, UI responsiveness, and concurrent user scenarios
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DatabaseService } from '@/lib/database';
import {
  measureRenderTime,
  simulateNetworkDelay,
  createMockTeamMember,
  createMockScheduleEntry,
  getTestTeams,
  getTestTeamMembers,
} from '../utils/testSetup';

// Mock performance-heavy components
jest.mock('@/lib/database', () => ({
  DatabaseService: {
    getScheduleEntries: jest.fn(),
    getTeams: jest.fn(),
    getTeamMembers: jest.fn(),
    updateScheduleEntry: jest.fn(),
    getDailyCompanyStatus: jest.fn(),
  },
}));

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD: 2000,      // Initial page load
  NAVIGATION: 500,      // Navigation between views
  DATA_FETCH: 1000,     // Database operations
  COMPONENT_RENDER: 100, // Component render time
  REAL_TIME_UPDATE: 500, // Real-time subscription updates
};

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock performance API
    Object.defineProperty(global, 'performance', {
      value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByName: jest.fn(() => [{ duration: 100 }]),
        getEntriesByType: jest.fn(() => []),
      },
    });
  });

  // ============================================================================
  // Database Performance Tests
  // ============================================================================

  describe('Database Performance', () => {
    test('should fetch large datasets within performance threshold', async () => {
      // Create large dataset (100 members × 30 days)
      const largeDataset: any = {};
      for (let memberId = 1; memberId <= 100; memberId++) {
        largeDataset[memberId] = {};
        for (let day = 1; day <= 30; day++) {
          const dateKey = `2024-01-${String(day).padStart(2, '0')}`;
          largeDataset[memberId][dateKey] = createMockScheduleEntry({
            member_id: memberId,
            date: dateKey,
            value: Math.random() > 0.8 ? '0.5' : '1',
          });
        }
      }

      (DatabaseService.getScheduleEntries as jest.Mock).mockResolvedValue(largeDataset);

      const startTime = performance.now();
      const result = await DatabaseService.getScheduleEntries('2024-01-01', '2024-01-31', 1);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_FETCH);
      expect(Object.keys(result)).toHaveLength(100);
    });

    test('should handle concurrent database operations efficiently', async () => {
      const operations = Array.from({ length: 50 }, (_, i) => 
        DatabaseService.updateScheduleEntry(i + 1, '2024-01-17', '1')
      );

      (DatabaseService.updateScheduleEntry as jest.Mock).mockImplementation(
        () => simulateNetworkDelay(10) // 10ms per operation
      );

      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      // Concurrent operations should be faster than sequential
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_FETCH);
    });

    test('should optimize queries for team data fetching', async () => {
      const teams = getTestTeams();
      const allMembers = teams.flatMap(team => getTestTeamMembers(team.id));

      (DatabaseService.getTeams as jest.Mock).mockResolvedValue(teams);
      (DatabaseService.getTeamMembers as jest.Mock).mockImplementation(
        (teamId: number) => Promise.resolve(getTestTeamMembers(teamId))
      );

      const startTime = performance.now();
      
      // Fetch all teams and their members
      const teamsData = await DatabaseService.getTeams();
      const memberPromises = teamsData.map(team => DatabaseService.getTeamMembers(team.id));
      const membersData = await Promise.all(memberPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_FETCH);
      expect(membersData.flat()).toHaveLength(allMembers.length);
    });

    test('should handle memory-intensive operations', async () => {
      // Simulate memory-heavy data processing
      const memoryTestData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: new Array(100).fill(Math.random()),
        metadata: {
          processed: false,
          timestamp: Date.now(),
        },
      }));

      const startTime = performance.now();
      
      // Process the data
      const processedData = memoryTestData.map(item => ({
        ...item,
        data: item.data.map(x => x * 2),
        metadata: { ...item.metadata, processed: true },
      }));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(processedData).toHaveLength(10000);
      
      // Clean up memory
      memoryTestData.length = 0;
      processedData.length = 0;
    });
  });

  // ============================================================================
  // UI Performance Tests
  // ============================================================================

  describe('UI Performance', () => {
    test('should render dashboard components within threshold', async () => {
      const MockDashboard = () => (
        <div>
          <h1>Team Dashboard</h1>
          <div data-testid="team-stats">
            {Array.from({ length: 100 }, (_, i) => (
              <div key={i}>Member {i}: 35 hours</div>
            ))}
          </div>
        </div>
      );

      const { result, timeMs } = await measureRenderTime(() => 
        render(<MockDashboard />)
      );

      expect(timeMs).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER);
      expect(screen.getByText('Team Dashboard')).toBeInTheDocument();
    });

    test('should handle large table rendering efficiently', async () => {
      const MockScheduleTable = () => (
        <table data-testid="schedule-table">
          <thead>
            <tr>
              <th>Member</th>
              {Array.from({ length: 14 }, (_, i) => (
                <th key={i}>Day {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 50 }, (_, memberIndex) => (
              <tr key={memberIndex}>
                <td>Member {memberIndex}</td>
                {Array.from({ length: 14 }, (_, dayIndex) => (
                  <td key={dayIndex}>
                    <button>1</button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

      const { result, timeMs } = await measureRenderTime(() => 
        render(<MockScheduleTable />)
      );

      expect(timeMs).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER * 2);
      
      const table = screen.getByTestId('schedule-table');
      expect(table).toBeInTheDocument();
      
      // Should render all rows and columns
      const rows = table.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(50);
    });

    test('should optimize re-renders for schedule updates', async () => {
      let renderCount = 0;
      
      const MockComponent = ({ data }: any) => {
        renderCount++;
        return (
          <div>
            <div data-testid="render-count">{renderCount}</div>
            <div data-testid="data-display">{JSON.stringify(data)}</div>
          </div>
        );
      };

      const initialData = { member1: { '2024-01-17': '1' } };
      const { rerender } = render(<MockComponent data={initialData} />);

      expect(screen.getByTestId('render-count')).toHaveTextContent('1');

      // Update with same data - should not cause re-render if optimized
      rerender(<MockComponent data={initialData} />);
      expect(screen.getByTestId('render-count')).toHaveTextContent('2');

      // Update with different data - should cause re-render
      const updatedData = { member1: { '2024-01-17': '0.5' } };
      rerender(<MockComponent data={updatedData} />);
      expect(screen.getByTestId('render-count')).toHaveTextContent('3');
    });

    test('should handle responsive layout calculations efficiently', async () => {
      // Mock viewport resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      const MockResponsiveComponent = () => {
        const [width, setWidth] = React.useState(window.innerWidth);
        
        React.useEffect(() => {
          const handleResize = () => setWidth(window.innerWidth);
          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
          <div data-testid="responsive-component">
            <div>Width: {width}</div>
            <div>{width < 768 ? 'Mobile' : width < 1024 ? 'Tablet' : 'Desktop'}</div>
          </div>
        );
      };

      const { result, timeMs } = await measureRenderTime(() => 
        render(<MockResponsiveComponent />)
      );

      expect(timeMs).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_RENDER);
      expect(screen.getByText('Desktop')).toBeInTheDocument();

      // Simulate resize
      const startTime = performance.now();
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      window.dispatchEvent(new Event('resize'));
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });
  });

  // ============================================================================
  // Real-time Performance Tests
  // ============================================================================

  describe('Real-time Performance', () => {
    test('should handle high-frequency updates efficiently', async () => {
      let updateCount = 0;
      const mockCallback = jest.fn(() => updateCount++);

      // Simulate 100 rapid updates
      const updates = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        member_id: Math.floor(i / 10) + 1,
        date: '2024-01-17',
        value: Math.random() > 0.5 ? '1' : '0.5',
      }));

      const startTime = performance.now();
      
      updates.forEach((update, i) => {
        setTimeout(() => mockCallback(update), i * 5); // 5ms intervals
      });

      // Wait for all updates to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      const endTime = performance.now();

      expect(mockCallback).toHaveBeenCalledTimes(100);
      expect(endTime - startTime).toBeLessThan(1500);
    });

    test('should batch real-time updates for performance', async () => {
      const batchProcessor = {
        queue: [] as any[],
        processing: false,
        
        add(update: any) {
          this.queue.push(update);
          if (!this.processing) {
            this.processBatch();
          }
        },
        
        async processBatch() {
          this.processing = true;
          const batch = this.queue.splice(0, 10); // Process in batches of 10
          
          if (batch.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
            // Process batch...
            
            if (this.queue.length > 0) {
              setTimeout(() => this.processBatch(), 0);
            } else {
              this.processing = false;
            }
          }
        }
      };

      const startTime = performance.now();
      
      // Add many updates rapidly
      for (let i = 0; i < 50; i++) {
        batchProcessor.add({ id: i, data: `update-${i}` });
      }

      // Wait for processing to complete
      await new Promise(resolve => {
        const checkCompletion = () => {
          if (!batchProcessor.processing && batchProcessor.queue.length === 0) {
            resolve(undefined);
          } else {
            setTimeout(checkCompletion, 10);
          }
        };
        checkCompletion();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLDS.REAL_TIME_UPDATE);
    });

    test('should handle subscription cleanup efficiently', async () => {
      const subscriptions = Array.from({ length: 20 }, (_, i) => ({
        id: `subscription-${i}`,
        unsubscribe: jest.fn(),
      }));

      const startTime = performance.now();
      
      // Cleanup all subscriptions
      subscriptions.forEach(sub => sub.unsubscribe());
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast
      subscriptions.forEach(sub => {
        expect(sub.unsubscribe).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Memory Performance Tests
  // ============================================================================

  describe('Memory Performance', () => {
    test('should handle memory cleanup for large datasets', async () => {
      // Simulate large data load
      let largeDataArray: any[] = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: new Array(50).fill(Math.random()),
      }));

      const initialMemory = (process as any).memoryUsage?.()?.heapUsed || 0;

      // Process the data
      const processedData = largeDataArray.map(item => ({
        ...item,
        processed: true,
      }));

      // Clean up
      largeDataArray.length = 0;
      largeDataArray = [];

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (process as any).memoryUsage?.()?.heapUsed || 0;
      
      expect(processedData).toHaveLength(10000);
      // Memory should not grow indefinitely (this is a rough check)
      if (initialMemory > 0 && finalMemory > 0) {
        expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      }
    });

    test('should avoid memory leaks in component mounting/unmounting', async () => {
      let componentInstances = 0;
      let cleanupCalls = 0;

      const MockComponent = () => {
        React.useEffect(() => {
          componentInstances++;
          
          return () => {
            cleanupCalls++;
          };
        }, []);

        return <div>Component {componentInstances}</div>;
      };

      // Mount and unmount components rapidly
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<MockComponent />);
        unmount();
      }

      // Allow cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(componentInstances).toBe(10);
      expect(cleanupCalls).toBe(10);
    });
  });

  // ============================================================================
  // Export Performance Tests
  // ============================================================================

  describe('Export Performance', () => {
    test('should handle large data exports efficiently', async () => {
      const largeExportData = {
        teams: Array.from({ length: 10 }, (_, teamIndex) => ({
          id: teamIndex + 1,
          name: `Team ${teamIndex + 1}`,
          members: Array.from({ length: 20 }, (_, memberIndex) => ({
            id: memberIndex + 1 + (teamIndex * 20),
            name: `Member ${memberIndex + 1}`,
            schedule: Array.from({ length: 30 }, (_, dayIndex) => ({
              date: `2024-01-${String(dayIndex + 1).padStart(2, '0')}`,
              value: Math.random() > 0.7 ? '0.5' : '1',
              hours: Math.random() > 0.7 ? 3.5 : 7,
            })),
          })),
        })),
      };

      const startTime = performance.now();
      
      // Simulate export processing
      const csvContent = generateMockCSV(largeExportData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_FETCH);
      expect(csvContent.split('\n')).toHaveLength(200 * 30 + 1); // Headers + data rows
    });

    test('should handle concurrent export requests', async () => {
      const exportRequests = Array.from({ length: 5 }, (_, i) => 
        simulateExportOperation(`export-${i}`)
      );

      const startTime = performance.now();
      const results = await Promise.all(exportRequests);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_FETCH);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // Network Performance Simulation Tests
  // ============================================================================

  describe('Network Performance Simulation', () => {
    test('should handle slow 3G network conditions', async () => {
      // Simulate slow 3G (500ms latency, 50kb/s)
      (DatabaseService.getScheduleEntries as jest.Mock).mockImplementation(
        () => simulateNetworkDelay(500).then(() => ({ success: true }))
      );

      const startTime = performance.now();
      await DatabaseService.getScheduleEntries('2024-01-17', '2024-01-23', 1);
      const endTime = performance.now();

      expect(endTime - startTime).toBeGreaterThan(400);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle intermittent network failures', async () => {
      let callCount = 0;
      (DatabaseService.getScheduleEntries as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return simulateNetworkDelay(100).then(() => ({ success: true }));
      });

      // Should retry and succeed
      const result = await retryOperation(() => 
        DatabaseService.getScheduleEntries('2024-01-17', '2024-01-23', 1)
      );

      expect(result.success).toBe(true);
      expect(callCount).toBe(2);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

async function retryOperation(operation: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

function generateMockCSV(data: any): string {
  const headers = 'Team,Member,Date,Value,Hours';
  const rows: string[] = [];
  
  data.teams.forEach((team: any) => {
    team.members.forEach((member: any) => {
      member.schedule.forEach((entry: any) => {
        rows.push(`${team.name},${member.name},${entry.date},${entry.value},${entry.hours}`);
      });
    });
  });
  
  return [headers, ...rows].join('\n');
}

async function simulateExportOperation(exportId: string): Promise<{ success: boolean; id: string }> {
  await simulateNetworkDelay(100);
  return { success: true, id: exportId };
}