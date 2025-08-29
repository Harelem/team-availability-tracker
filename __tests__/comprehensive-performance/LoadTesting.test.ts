/**
 * Comprehensive Performance Tests - Load Testing
 * Tests concurrent users, database performance, and system scalability
 */

import { test, expect, Browser, Page } from '@playwright/test';
import { DatabaseService } from '@/lib/database';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Performance benchmarks
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 2000,           // 2 seconds
  apiResponse: 500,         // 500ms
  databaseQuery: 200,       // 200ms
  realTimeUpdate: 100,      // 100ms
  largeDatasetRender: 1000, // 1 second
  concurrentUsers: 50       // 50 concurrent users
};

interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: number;
  networkRequests?: number;
}

test.describe('Load Testing Suite', () => {
  let supabase: any;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  });

  test.describe('Concurrent User Load Testing', () => {
    test('handles 50+ concurrent users updating schedules', async ({ browser }) => {
      const concurrentUsers = PERFORMANCE_THRESHOLDS.concurrentUsers;
      const browsers: Browser[] = [];
      const pages: Page[] = [];
      const results: PerformanceMetrics[] = [];

      try {
        // Create multiple browser contexts to simulate different users
        for (let i = 0; i < concurrentUsers; i++) {
          const context = await browser.newContext({
            userAgent: `TestUser-${i}`,
          });
          
          const page = await context.newPage();
          
          // Mock different users
          await page.addInitScript((userId) => {
            window.localStorage.setItem('supabase.auth.token', JSON.stringify({
              user: {
                id: `user-${userId}`,
                email: `user${userId}@example.com`,
                user_metadata: {
                  full_name: `Test User ${userId}`,
                  team: `Team-${Math.floor(userId / 10)}`,
                  role: 'member'
                }
              }
            }));
          }, i);

          pages.push(page);
        }

        console.log(`Starting load test with ${concurrentUsers} concurrent users...`);
        const loadTestStart = performance.now();

        // Simulate concurrent schedule updates
        const updatePromises = pages.map(async (page, index) => {
          const startTime = performance.now();
          
          try {
            await page.goto('/');
            await page.waitForSelector('[data-testid="schedule-table"]', { timeout: 10000 });
            
            // Perform schedule update
            const scheduleCell = page.locator(`[data-testid="schedule-cell-${index + 1}-2024-01-17"]`);
            await scheduleCell.click();
            await scheduleCell.fill('7');
            await scheduleCell.press('Tab');
            
            // Wait for save confirmation
            await page.waitForSelector('[data-testid="save-indicator"]', { timeout: 5000 });
            await page.waitForSelector('[data-testid="save-indicator"]', { state: 'hidden', timeout: 10000 });
            
            const endTime = performance.now();
            
            return {
              startTime,
              endTime,
              duration: endTime - startTime,
              userId: index + 1,
              success: true
            };
          } catch (error) {
            return {
              startTime,
              endTime: performance.now(),
              duration: performance.now() - startTime,
              userId: index + 1,
              success: false,
              error: error.message
            };
          }
        });

        const updateResults = await Promise.allSettled(updatePromises);
        const loadTestEnd = performance.now();
        const totalLoadTime = loadTestEnd - loadTestStart;

        console.log(`Load test completed in ${totalLoadTime}ms`);

        // Analyze results
        const successful = updateResults.filter(r => r.status === 'fulfilled' && r.value.success);
        const failed = updateResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

        console.log(`Successful operations: ${successful.length}/${concurrentUsers}`);
        console.log(`Failed operations: ${failed.length}/${concurrentUsers}`);

        // Performance assertions
        expect(successful.length).toBeGreaterThan(concurrentUsers * 0.9); // 90% success rate
        expect(totalLoadTime).toBeLessThan(30000); // Complete within 30 seconds

        // Check average response time
        const avgResponseTime = successful.reduce((sum, result) => 
          sum + (result.status === 'fulfilled' ? result.value.duration : 0), 0
        ) / successful.length;

        console.log(`Average response time: ${avgResponseTime}ms`);
        expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse * 5); // Allow 5x normal threshold under load

      } finally {
        // Cleanup
        for (const page of pages) {
          await page.close();
        }
      }
    });

    test('maintains real-time sync under concurrent load', async ({ browser }) => {
      const userCount = 10;
      const pages: Page[] = [];
      let realTimeUpdatesReceived = 0;

      try {
        // Create multiple users
        for (let i = 0; i < userCount; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          
          await page.addInitScript((userId) => {
            window.localStorage.setItem('supabase.auth.token', JSON.stringify({
              user: {
                id: `realtime-user-${userId}`,
                email: `rt${userId}@example.com`,
                user_metadata: {
                  full_name: `RT User ${userId}`,
                  team: 'Development-Tal',
                  role: 'member'
                }
              }
            }));
          }, i);

          // Set up real-time update listener
          await page.addInitScript(() => {
            window.realTimeUpdates = 0;
            window.addEventListener('schedule-update', () => {
              window.realTimeUpdates++;
            });
          });

          await page.goto('/');
          await page.waitForSelector('[data-testid="schedule-table"]');
          pages.push(page);
        }

        // Generate concurrent real-time updates
        const updatePromises = pages.map(async (page, index) => {
          const scheduleCell = page.locator(`[data-testid="schedule-cell-${index + 1}-2024-01-17"]`);
          await scheduleCell.click();
          await scheduleCell.fill(`${6 + (index % 2)}`);
          await scheduleCell.press('Tab');
          
          // Wait for real-time propagation
          await page.waitForTimeout(2000);
          
          // Check if other users received the update
          const updatesReceived = await page.evaluate(() => window.realTimeUpdates);
          return updatesReceived;
        });

        const results = await Promise.all(updatePromises);
        const totalUpdatesReceived = results.reduce((sum, count) => sum + count, 0);

        // Should receive real-time updates efficiently
        expect(totalUpdatesReceived).toBeGreaterThan(userCount * 0.8); // At least 80% update delivery

      } finally {
        for (const page of pages) {
          await page.close();
        }
      }
    });
  });

  test.describe('Database Performance Testing', () => {
    test('handles large dataset queries efficiently', async () => {
      const queryStartTime = performance.now();

      // Test large schedule entry query
      const { data: largeDataset, error } = await supabase
        .from('schedule_entries')
        .select(`
          *,
          profiles (
            full_name,
            team
          )
        `)
        .order('date', { ascending: false })
        .limit(1000);

      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;

      console.log(`Large dataset query took ${queryDuration}ms`);

      expect(error).toBeNull();
      expect(queryDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery * 10); // Allow 10x for large queries
      expect(largeDataset).toBeDefined();
    });

    test('maintains performance under concurrent database operations', async () => {
      const concurrentQueries = 20;
      const queryPromises = [];

      const testStartTime = performance.now();

      // Create multiple concurrent database operations
      for (let i = 0; i < concurrentQueries; i++) {
        queryPromises.push(
          supabase
            .from('team_members')
            .select('*')
            .eq('team', 'Development-Tal')
            .then((result) => ({
              duration: performance.now() - testStartTime,
              success: !result.error,
              rowCount: result.data?.length || 0
            }))
        );
      }

      const results = await Promise.all(queryPromises);
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const successfulQueries = results.filter(r => r.success).length;

      console.log(`Concurrent queries - Average duration: ${avgDuration}ms, Success rate: ${successfulQueries}/${concurrentQueries}`);

      expect(successfulQueries).toBe(concurrentQueries); // All should succeed
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery * 3); // Allow 3x normal threshold
    });

    test('optimizes complex join queries', async () => {
      const complexQueryStart = performance.now();

      // Test complex join query similar to real application usage
      const { data: complexData, error } = await supabase
        .from('schedule_entries')
        .select(`
          *,
          profiles!inner (
            full_name,
            team
          ),
          team_members!inner (
            role
          )
        `)
        .gte('date', '2024-01-01')
        .lte('date', '2024-01-31')
        .order('date', { ascending: true });

      const complexQueryEnd = performance.now();
      const complexQueryDuration = complexQueryEnd - complexQueryStart;

      console.log(`Complex join query took ${complexQueryDuration}ms`);

      expect(error).toBeNull();
      expect(complexQueryDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.databaseQuery * 5);
      expect(complexData).toBeDefined();
    });
  });

  test.describe('Frontend Performance Testing', () => {
    test('renders large schedule tables efficiently', async ({ page }) => {
      // Mock large dataset
      await page.addInitScript(() => {
        const largeDataset = [];
        for (let i = 0; i < 100; i++) {
          largeDataset.push({
            id: i + 1,
            name: `Team Member ${i + 1}`,
            team: 'Development-Tal',
            role: 'member'
          });
        }
        window.mockLargeTeam = largeDataset;
      });

      const renderStart = performance.now();
      await page.goto('/');
      
      // Wait for large table to render
      await page.waitForSelector('[data-testid="schedule-table"]');
      await page.waitForFunction(() => {
        const rows = document.querySelectorAll('[data-testid^="member-row-"]');
        return rows.length > 50; // Wait for significant number of rows
      });

      const renderEnd = performance.now();
      const renderDuration = renderEnd - renderStart;

      console.log(`Large table render took ${renderDuration}ms`);

      expect(renderDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.largeDatasetRender * 3);

      // Check for virtualization if dataset is very large
      const virtualizedTable = page.locator('[data-testid="virtualized-table"]');
      if (await virtualizedTable.count() > 0) {
        console.log('Virtualization detected for large dataset');
      }
    });

    test('handles rapid user interactions without degradation', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      const interactions = 20;
      const interactionTimes: number[] = [];

      // Perform rapid interactions
      for (let i = 0; i < interactions; i++) {
        const interactionStart = performance.now();
        
        const cell = page.locator(`[data-testid="schedule-cell-1-2024-01-${String(17 + (i % 5)).padStart(2, '0')}"]`);
        await cell.click();
        await cell.fill(`${6 + (i % 3)}`);
        await cell.press('Tab');
        
        // Wait for UI to update
        await page.waitForTimeout(50);
        
        const interactionEnd = performance.now();
        interactionTimes.push(interactionEnd - interactionStart);
      }

      const avgInteractionTime = interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
      const maxInteractionTime = Math.max(...interactionTimes);

      console.log(`Average interaction time: ${avgInteractionTime}ms, Max: ${maxInteractionTime}ms`);

      // Performance should not degrade significantly
      expect(avgInteractionTime).toBeLessThan(300); // 300ms average
      expect(maxInteractionTime).toBeLessThan(1000); // 1s max
      
      // Last interactions should not be significantly slower than first
      const firstThird = interactionTimes.slice(0, Math.floor(interactions / 3));
      const lastThird = interactionTimes.slice(-Math.floor(interactions / 3));
      
      const firstAvg = firstThird.reduce((sum, time) => sum + time, 0) / firstThird.length;
      const lastAvg = lastThird.reduce((sum, time) => sum + time, 0) / lastThird.length;
      
      expect(lastAvg).toBeLessThan(firstAvg * 2); // No more than 2x degradation
    });

    test('maintains performance across different viewport sizes', async ({ browser }) => {
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];

      const performanceResults: { [key: string]: number } = {};

      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: viewport
        });
        const page = await context.newPage();

        const loadStart = performance.now();
        await page.goto('/');
        await page.waitForSelector('[data-testid="schedule-table"]');
        
        // Perform typical interactions
        const cell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
        if (viewport.width < 768) {
          // Mobile interaction
          await cell.tap();
        } else {
          // Desktop interaction
          await cell.click();
        }
        await cell.fill('7');
        await cell.press('Tab');

        const loadEnd = performance.now();
        performanceResults[viewport.name] = loadEnd - loadStart;

        console.log(`${viewport.name} (${viewport.width}x${viewport.height}) load time: ${performanceResults[viewport.name]}ms`);

        await context.close();
      }

      // All viewports should perform reasonably
      Object.values(performanceResults).forEach(duration => {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad * 2);
      });

      // Mobile shouldn't be significantly slower than desktop
      expect(performanceResults.mobile).toBeLessThan(performanceResults.desktop * 3);
    });
  });

  test.describe('Memory and Resource Management', () => {
    test('manages memory efficiently during long sessions', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : null;
      });

      // Simulate long session activity
      for (let i = 0; i < 50; i++) {
        // Navigate between weeks
        await page.locator('[data-testid="next-week-button"]').click();
        await page.waitForTimeout(100);
        await page.locator('[data-testid="prev-week-button"]').click();
        await page.waitForTimeout(100);

        // Make schedule changes
        const cell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
        await cell.click();
        await cell.fill(`${6 + (i % 3)}`);
        await cell.press('Tab');
        await page.waitForTimeout(50);
      }

      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : null;
      });

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;

        console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);

        // Memory increase should be reasonable (less than 50% for extended session)
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });

    test('cleans up event listeners and subscriptions', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Check initial listener count
      const initialListeners = await page.evaluate(() => {
        const listeners = (window as any).eventListenerCount || 0;
        return listeners;
      });

      // Add components that create listeners
      await page.locator('[data-testid="open-export-modal"]').click();
      await page.waitForSelector('[data-testid="export-modal"]');
      await page.locator('[data-testid="close-export-modal"]').click();

      // Open and close multiple modals
      for (let i = 0; i < 5; i++) {
        await page.locator('[data-testid="open-team-detail"]').click();
        await page.waitForSelector('[data-testid="team-detail-modal"]');
        await page.locator('[data-testid="close-team-detail"]').click();
        await page.waitForTimeout(100);
      }

      // Check final listener count
      const finalListeners = await page.evaluate(() => {
        const listeners = (window as any).eventListenerCount || 0;
        return listeners;
      });

      // Listener count shouldn't grow significantly
      if (typeof initialListeners === 'number' && typeof finalListeners === 'number') {
        expect(finalListeners).toBeLessThan(initialListeners * 2);
      }
    });
  });

  test.describe('Network Performance', () => {
    test('optimizes API calls and reduces redundant requests', async ({ page }) => {
      let apiCallCount = 0;
      const apiCalls: string[] = [];

      // Monitor network requests
      page.on('request', (request) => {
        if (request.url().includes('/api/') || request.url().includes('supabase.co')) {
          apiCallCount++;
          apiCalls.push(`${request.method()} ${request.url()}`);
        }
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Perform typical user actions
      await page.locator('[data-testid="next-week-button"]').click();
      await page.waitForTimeout(1000);
      await page.locator('[data-testid="prev-week-button"]').click();
      await page.waitForTimeout(1000);

      // Make schedule updates
      const cell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
      await cell.click();
      await cell.fill('7');
      await cell.press('Tab');
      await page.waitForTimeout(2000);

      console.log(`Total API calls: ${apiCallCount}`);
      console.log('API calls made:', apiCalls);

      // Should make reasonable number of API calls
      expect(apiCallCount).toBeLessThan(20); // Adjust based on your app's needs

      // Check for redundant calls
      const uniqueCalls = new Set(apiCalls);
      const redundantCallsPercent = ((apiCalls.length - uniqueCalls.size) / apiCalls.length) * 100;
      console.log(`Redundant calls: ${redundantCallsPercent.toFixed(2)}%`);
      
      expect(redundantCallsPercent).toBeLessThan(30); // Less than 30% redundant calls
    });

    test('handles network failures gracefully', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Simulate network failure
      await page.route('**/*', route => route.abort());

      // Try to make updates during network failure
      const cell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
      await cell.click();
      await cell.fill('6');
      await cell.press('Tab');

      // Should show appropriate error handling
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Restore network
      await page.unroute('**/*');

      // Retry should work
      await page.locator('[data-testid="retry-button"]').click();
      await expect(page.locator('[data-testid="save-indicator"]')).toBeVisible({ timeout: 5000 });
    });
  });
});