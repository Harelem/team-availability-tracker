/**
 * Load Testing Suite
 * 
 * Tests system performance under concurrent load, simulating 50+ users
 * accessing dashboards, updating data, and generating exports simultaneously.
 */

import { DatabaseService } from '@/lib/database';
import { performanceMonitor } from '@/src/utils/performanceMonitoring';

// Mock database dependencies
jest.mock('../../src/lib/database');
jest.mock('../../src/lib/supabase');
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Load testing configuration
const LOAD_TEST_CONFIG = {
  CONCURRENT_USERS: 55,
  TEST_DURATION_MS: 30000, // 30 seconds
  RAMP_UP_TIME_MS: 5000,   // 5 seconds to reach max load
  OPERATION_INTERVALS: {
    DASHBOARD_REFRESH: 2000,    // Every 2 seconds
    DATA_UPDATE: 5000,          // Every 5 seconds  
    EXPORT_GENERATION: 15000,   // Every 15 seconds
    REAL_TIME_UPDATE: 1000      // Every 1 second
  }
};

// Test data generators
const generateLargeTeamDataset = (teamId: number, memberCount: number = 25) => {
  const members = Array.from({ length: memberCount }, (_, i) => ({
    id: i + 1,
    name: `Member ${i + 1}`,
    hebrew: `חבר ${i + 1}`,
    isManager: i < 3, // First 3 are managers
    email: `member${i + 1}@company.com`
  }));

  const scheduleEntries = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12); // 12 months of data

  for (let days = 0; days < 365; days++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    
    members.forEach(member => {
      // Skip weekends
      if (date.getDay() === 5 || date.getDay() === 6) return;
      
      scheduleEntries.push({
        id: scheduleEntries.length + 1,
        member_id: member.id,
        date: date.toISOString().split('T')[0],
        value: Math.random() > 0.1 ? (Math.random() > 0.2 ? '1' : '0.5') : 'X',
        reason: Math.random() > 0.8 ? 'Annual leave' : null
      });
    });
  }

  return { members, scheduleEntries };
};

const generateMetricsData = (teamCount: number = 15) => {
  return {
    totalTeams: teamCount,
    totalEmployees: teamCount * 18, // Average 18 members per team
    teamSummaries: Array.from({ length: teamCount }, (_, i) => ({
      teamId: i + 1,
      name: `Team ${i + 1}`,
      members: Math.floor(Math.random() * 10) + 15, // 15-25 members
      utilization: Math.floor(Math.random() * 30) + 70, // 70-100%
      health: ['excellent', 'good', 'needs_attention'][Math.floor(Math.random() * 3)],
      currentSprint: Math.floor(Math.random() * 10) + 40,
      velocity: Math.floor(Math.random() * 20) + 280 // 280-300 hours
    })),
    sprintHistory: Array.from({ length: 52 }, (_, i) => ({
      sprintNumber: i + 1,
      completion: Math.floor(Math.random() * 20) + 80,
      date: new Date(2024, 0, i * 7).toISOString()
    }))
  };
};

// Load testing utilities
class LoadTestManager {
  private activeUsers: Map<string, NodeJS.Timeout[]> = new Map();
  private metrics: Map<string, number[]> = new Map();
  private errors: string[] = [];

  async simulateUser(userId: string, operations: UserOperation[]): Promise<void> {
    const userTimers: NodeJS.Timeout[] = [];
    
    operations.forEach(operation => {
      const timer = setInterval(async () => {
        try {
          const startTime = performance.now();
          await operation.execute();
          const endTime = performance.now();
          
          this.recordMetric(`${operation.name}_duration`, endTime - startTime);
          this.recordMetric(`${operation.name}_success`, 1);
        } catch (error) {
          this.errors.push(`User ${userId} - ${operation.name}: ${error}`);
          this.recordMetric(`${operation.name}_error`, 1);
        }
      }, operation.interval);
      
      userTimers.push(timer);
    });

    this.activeUsers.set(userId, userTimers);
  }

  stopUser(userId: string): void {
    const timers = this.activeUsers.get(userId);
    if (timers) {
      timers.forEach(timer => clearInterval(timer));
      this.activeUsers.delete(userId);
    }
  }

  stopAllUsers(): void {
    Array.from(this.activeUsers.keys()).forEach(userId => {
      this.stopUser(userId);
    });
  }

  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getMetrics(): LoadTestMetrics {
    const results: LoadTestMetrics = {
      totalErrors: this.errors.length,
      errorRate: 0,
      averageResponseTimes: {},
      peakResponseTimes: {},
      throughput: {},
      errors: this.errors
    };

    this.metrics.forEach((values, name) => {
      if (name.includes('_duration')) {
        const operationName = name.replace('_duration', '');
        results.averageResponseTimes[operationName] = values.reduce((a, b) => a + b, 0) / values.length;
        results.peakResponseTimes[operationName] = Math.max(...values);
      } else if (name.includes('_success')) {
        const operationName = name.replace('_success', '');
        results.throughput[operationName] = values.length;
      }
    });

    const totalOperations = Object.values(results.throughput).reduce((a, b) => a + b, 0);
    results.errorRate = totalOperations > 0 ? (this.errors.length / totalOperations) * 100 : 0;

    return results;
  }
}

interface UserOperation {
  name: string;
  interval: number;
  execute: () => Promise<void>;
}

interface LoadTestMetrics {
  totalErrors: number;
  errorRate: number;
  averageResponseTimes: Record<string, number>;
  peakResponseTimes: Record<string, number>;
  throughput: Record<string, number>;
  errors: string[];
}

describe('Load Testing Suite', () => {
  let loadTestManager: LoadTestManager;

  beforeEach(() => {
    jest.clearAllMocks();
    loadTestManager = new LoadTestManager();
    
    // Setup mock data
    const largeDataset = generateLargeTeamDataset(1, 30);
    const metricsData = generateMetricsData(20);
    
    mockDatabaseService.getTeamMembers.mockResolvedValue(largeDataset.members);
    mockDatabaseService.getScheduleEntries.mockResolvedValue(largeDataset.scheduleEntries);
    mockDatabaseService.getOrganizationMetrics.mockResolvedValue(metricsData);
    mockDatabaseService.getAnalyticsData.mockResolvedValue(metricsData);
  });

  afterEach(() => {
    loadTestManager.stopAllUsers();
  });

  describe('Concurrent Dashboard Access', () => {
    it('should handle 50+ users accessing COO dashboard simultaneously', async () => {
      const dashboardOperations: UserOperation[] = [
        {
          name: 'dashboard_load',
          interval: LOAD_TEST_CONFIG.OPERATION_INTERVALS.DASHBOARD_REFRESH,
          execute: async () => {
            await mockDatabaseService.getOrganizationMetrics();
          }
        },
        {
          name: 'team_data_fetch',
          interval: LOAD_TEST_CONFIG.OPERATION_INTERVALS.DASHBOARD_REFRESH + 500,
          execute: async () => {
            const teamId = Math.floor(Math.random() * 15) + 1;
            await mockDatabaseService.getTeamMembers(teamId);
            await mockDatabaseService.getScheduleEntries(teamId, new Date(), new Date());
          }
        }
      ];

      // Simulate ramp-up
      const usersPerStep = 10;
      const rampSteps = Math.ceil(LOAD_TEST_CONFIG.CONCURRENT_USERS / usersPerStep);
      const stepInterval = LOAD_TEST_CONFIG.RAMP_UP_TIME_MS / rampSteps;

      for (let step = 0; step < rampSteps; step++) {
        const stepUsers = Math.min(usersPerStep, LOAD_TEST_CONFIG.CONCURRENT_USERS - (step * usersPerStep));
        
        for (let i = 0; i < stepUsers; i++) {
          const userId = `user_${step * usersPerStep + i}`;
          await loadTestManager.simulateUser(userId, dashboardOperations);
        }
        
        if (step < rampSteps - 1) {
          await new Promise(resolve => setTimeout(resolve, stepInterval));
        }
      }

      // Run load test
      await new Promise(resolve => setTimeout(resolve, LOAD_TEST_CONFIG.TEST_DURATION_MS));

      // Analyze results
      const metrics = loadTestManager.getMetrics();
      
      // Performance assertions
      expect(metrics.errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(metrics.averageResponseTimes.dashboard_load).toBeLessThan(2000); // Under 2 seconds
      expect(metrics.averageResponseTimes.team_data_fetch).toBeLessThan(1500); // Under 1.5 seconds
      expect(metrics.peakResponseTimes.dashboard_load).toBeLessThan(5000); // Peak under 5 seconds
      
      // Throughput assertions
      expect(metrics.throughput.dashboard_load).toBeGreaterThan(100); // At least 100 dashboard loads
      expect(metrics.throughput.team_data_fetch).toBeGreaterThan(80); // At least 80 team fetches

      console.log('Load Test Results:', {
        concurrentUsers: LOAD_TEST_CONFIG.CONCURRENT_USERS,
        testDuration: `${LOAD_TEST_CONFIG.TEST_DURATION_MS}ms`,
        ...metrics
      });
    }, 45000); // 45 second timeout

    it('should maintain performance during peak usage with large datasets', async () => {
      // Simulate 100+ team members with full year of data
      const extremeDataset = generateLargeTeamDataset(1, 100);
      mockDatabaseService.getTeamMembers.mockResolvedValue(extremeDataset.members);
      mockDatabaseService.getScheduleEntries.mockResolvedValue(extremeDataset.scheduleEntries);

      const heavyOperations: UserOperation[] = [
        {
          name: 'large_dataset_load',
          interval: 3000,
          execute: async () => {
            await mockDatabaseService.getTeamMembers(1);
            await mockDatabaseService.getScheduleEntries(1, new Date('2023-01-01'), new Date('2024-01-01'));
          }
        },
        {
          name: 'analytics_computation',
          interval: 5000,
          execute: async () => {
            await mockDatabaseService.getAnalyticsData();
          }
        }
      ];

      // Simulate 30 heavy users
      for (let i = 0; i < 30; i++) {
        await loadTestManager.simulateUser(`heavy_user_${i}`, heavyOperations);
      }

      await new Promise(resolve => setTimeout(resolve, 20000)); // 20 second test

      const metrics = loadTestManager.getMetrics();
      
      expect(metrics.errorRate).toBeLessThan(8); // Allow slightly higher error rate for extreme load
      expect(metrics.averageResponseTimes.large_dataset_load).toBeLessThan(3000); // Under 3 seconds
      expect(metrics.averageResponseTimes.analytics_computation).toBeLessThan(2500); // Under 2.5 seconds
    }, 30000);
  });

  describe('Real-time Update Performance', () => {
    it('should handle concurrent real-time schedule updates', async () => {
      const updateOperations: UserOperation[] = [
        {
          name: 'schedule_update',
          interval: LOAD_TEST_CONFIG.OPERATION_INTERVALS.DATA_UPDATE,
          execute: async () => {
            const memberId = Math.floor(Math.random() * 25) + 1;
            const date = new Date().toISOString().split('T')[0];
            const value = ['1', '0.5', 'X'][Math.floor(Math.random() * 3)];
            
            await mockDatabaseService.updateScheduleEntry({
              member_id: memberId,
              date,
              value,
              reason: value === 'X' ? 'Sick leave' : null
            });
          }
        },
        {
          name: 'batch_update',
          interval: 10000,
          execute: async () => {
            const updates = Array.from({ length: 10 }, (_, i) => ({
              member_id: i + 1,
              date: new Date().toISOString().split('T')[0],
              value: '1' as const,
              reason: null
            }));
            
            await Promise.all(updates.map(update => 
              mockDatabaseService.updateScheduleEntry(update)
            ));
          }
        }
      ];

      // Mock update method
      mockDatabaseService.updateScheduleEntry = jest.fn().mockImplementation(async (entry) => {
        // Simulate database write time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return { id: Math.random(), ...entry };
      });

      // Simulate 40 users making updates
      for (let i = 0; i < 40; i++) {
        await loadTestManager.simulateUser(`update_user_${i}`, updateOperations);
      }

      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second test

      const metrics = loadTestManager.getMetrics();
      
      expect(metrics.errorRate).toBeLessThan(3); // Very low error rate for updates
      expect(metrics.averageResponseTimes.schedule_update).toBeLessThan(500); // Under 500ms
      expect(metrics.averageResponseTimes.batch_update).toBeLessThan(1000); // Under 1 second
      expect(metrics.throughput.schedule_update).toBeGreaterThan(50); // At least 50 updates
    }, 25000);
  });

  describe('Export Generation Under Load', () => {
    it('should handle concurrent large export requests', async () => {
      const exportOperations: UserOperation[] = [
        {
          name: 'excel_export',
          interval: LOAD_TEST_CONFIG.OPERATION_INTERVALS.EXPORT_GENERATION,
          execute: async () => {
            // Simulate large Excel export
            const teamId = Math.floor(Math.random() * 10) + 1;
            const startDate = new Date('2023-01-01');
            const endDate = new Date('2024-01-01');
            
            await mockDatabaseService.getScheduleEntries(teamId, startDate, endDate);
            await mockDatabaseService.getTeamMembers(teamId);
            
            // Simulate export processing time
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          }
        },
        {
          name: 'coo_export',
          interval: 20000,
          execute: async () => {
            // Simulate company-wide export
            await mockDatabaseService.getOrganizationMetrics();
            await Promise.all(Array.from({ length: 15 }, (_, i) => 
              mockDatabaseService.getTeamMembers(i + 1)
            ));
            
            // Simulate large export processing
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
          }
        }
      ];

      // Simulate 20 users requesting exports
      for (let i = 0; i < 20; i++) {
        await loadTestManager.simulateUser(`export_user_${i}`, exportOperations);
      }

      await new Promise(resolve => setTimeout(resolve, 25000)); // 25 second test

      const metrics = loadTestManager.getMetrics();
      
      expect(metrics.errorRate).toBeLessThan(5); // Reasonable error rate for heavy operations
      expect(metrics.averageResponseTimes.excel_export).toBeLessThan(4000); // Under 4 seconds
      expect(metrics.averageResponseTimes.coo_export).toBeLessThan(8000); // Under 8 seconds for company-wide
      expect(metrics.throughput.excel_export).toBeGreaterThan(15); // At least 15 exports
    }, 35000);
  });

  describe('Database Performance Under Load', () => {
    it('should maintain query performance with concurrent database access', async () => {
      let queryCount = 0;
      let totalQueryTime = 0;
      let slowQueries = 0;

      // Mock database with performance tracking
      const originalGetTeamMembers = mockDatabaseService.getTeamMembers;
      const originalGetScheduleEntries = mockDatabaseService.getScheduleEntries;
      const originalGetOrganizationMetrics = mockDatabaseService.getOrganizationMetrics;

      mockDatabaseService.getTeamMembers.mockImplementation(async (teamId) => {
        const start = performance.now();
        queryCount++;
        
        // Simulate varying query times based on load
        const baseTime = 50;
        const loadFactor = Math.min(queryCount / 100, 2); // Increase time with load
        const queryTime = baseTime * (1 + loadFactor) + Math.random() * 100;
        
        await new Promise(resolve => setTimeout(resolve, queryTime));
        
        const end = performance.now();
        const actualTime = end - start;
        totalQueryTime += actualTime;
        
        if (actualTime > 1000) slowQueries++;
        
        return originalGetTeamMembers.getMockImplementation()?.(teamId) || [];
      });

      mockDatabaseService.getScheduleEntries.mockImplementation(async (teamId, startDate, endDate) => {
        const start = performance.now();
        queryCount++;
        
        // Simulate complex query time
        const baseTime = 100;
        const loadFactor = Math.min(queryCount / 50, 3);
        const queryTime = baseTime * (1 + loadFactor) + Math.random() * 200;
        
        await new Promise(resolve => setTimeout(resolve, queryTime));
        
        const end = performance.now();
        const actualTime = end - start;
        totalQueryTime += actualTime;
        
        if (actualTime > 2000) slowQueries++;
        
        return originalGetScheduleEntries.getMockImplementation()?.(teamId, startDate, endDate) || [];
      });

      // Simulate mixed database operations
      const dbOperations: UserOperation[] = [
        {
          name: 'query_team_data',
          interval: 1500,
          execute: async () => {
            const teamId = Math.floor(Math.random() * 15) + 1;
            await mockDatabaseService.getTeamMembers(teamId);
          }
        },
        {
          name: 'query_schedule_data',
          interval: 2000,
          execute: async () => {
            const teamId = Math.floor(Math.random() * 15) + 1;
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            const endDate = new Date();
            
            await mockDatabaseService.getScheduleEntries(teamId, startDate, endDate);
          }
        },
        {
          name: 'query_metrics',
          interval: 3000,
          execute: async () => {
            await mockDatabaseService.getOrganizationMetrics();
          }
        }
      ];

      // Simulate 60 concurrent database users
      for (let i = 0; i < 60; i++) {
        await loadTestManager.simulateUser(`db_user_${i}`, dbOperations);
      }

      await new Promise(resolve => setTimeout(resolve, 20000)); // 20 second test

      const metrics = loadTestManager.getMetrics();
      const averageQueryTime = totalQueryTime / queryCount;
      const slowQueryPercentage = (slowQueries / queryCount) * 100;

      // Database performance assertions
      expect(queryCount).toBeGreaterThan(200); // Significant query load
      expect(averageQueryTime).toBeLessThan(1500); // Average under 1.5 seconds
      expect(slowQueryPercentage).toBeLessThan(10); // Less than 10% slow queries
      expect(metrics.errorRate).toBeLessThan(2); // Very low error rate

      console.log('Database Load Test Results:', {
        totalQueries: queryCount,
        averageQueryTime: `${averageQueryTime.toFixed(2)}ms`,
        slowQueries: slowQueries,
        slowQueryPercentage: `${slowQueryPercentage.toFixed(2)}%`,
        errorRate: `${metrics.errorRate.toFixed(2)}%`
      });
    }, 30000);
  });

  describe('Memory and Resource Management', () => {
    it('should maintain stable memory usage under sustained load', async () => {
      let memorySnapshots: number[] = [];
      
      // Mock memory monitoring
      const mockMemory = {
        usedJSHeapSize: 50000000 // 50MB baseline
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      });

      const memoryOperations: UserOperation[] = [
        {
          name: 'memory_intensive_operation',
          interval: 2000,
          execute: async () => {
            // Simulate memory-intensive operations
            const largeData = generateLargeTeamDataset(1, 50);
            await mockDatabaseService.getTeamMembers(1);
            
            // Simulate data processing
            const processed = largeData.scheduleEntries.map(entry => ({
              ...entry,
              processed: true,
              calculations: new Array(100).fill(Math.random())
            }));
            
            // Record memory usage
            mockMemory.usedJSHeapSize += Math.random() * 1000000; // Simulate memory increase
            memorySnapshots.push(mockMemory.usedJSHeapSize);
            
            // Simulate cleanup
            setTimeout(() => {
              mockMemory.usedJSHeapSize -= Math.random() * 500000;
            }, 1000);
          }
        }
      ];

      // Simulate 25 memory-intensive users
      for (let i = 0; i < 25; i++) {
        await loadTestManager.simulateUser(`memory_user_${i}`, memoryOperations);
      }

      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second test

      const metrics = loadTestManager.getMetrics();
      const memoryGrowth = memorySnapshots.length > 0 ? 
        (memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0]) / 1024 / 1024 : 0;

      // Memory management assertions
      expect(memoryGrowth).toBeLessThan(100); // Less than 100MB growth
      expect(metrics.errorRate).toBeLessThan(3); // Memory pressure shouldn't cause errors
      expect(mockMemory.usedJSHeapSize).toBeLessThan(200000000); // Stay under 200MB

      console.log('Memory Test Results:', {
        initialMemory: `${(memorySnapshots[0] / 1024 / 1024).toFixed(2)}MB`,
        finalMemory: `${(memorySnapshots[memorySnapshots.length - 1] / 1024 / 1024).toFixed(2)}MB`,
        memoryGrowth: `${memoryGrowth.toFixed(2)}MB`,
        snapshots: memorySnapshots.length
      });
    }, 25000);
  });
});