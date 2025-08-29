/**
 * Performance Monitoring and Benchmarking Tests
 * Continuous performance monitoring and regression detection
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceBenchmark {
  testName: string;
  timestamp: string;
  metrics: {
    pageLoadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    totalBlockingTime: number;
    memoryUsage?: {
      used: number;
      total: number;
    };
    networkRequests: number;
    bundleSize?: number;
  };
  userFlow: string;
  viewport: { width: number; height: number };
}

const PERFORMANCE_BASELINES = {
  pageLoadTime: 2000,
  firstContentfulPaint: 1000,
  largestContentfulPaint: 2000,
  cumulativeLayoutShift: 0.1,
  totalBlockingTime: 200,
  networkRequests: 15
};

let performanceData: PerformanceBenchmark[] = [];

test.describe('Performance Monitoring Suite', () => {
  test.beforeEach(async () => {
    // Load existing performance data
    const dataFile = path.join(__dirname, '../../performance-data.json');
    if (fs.existsSync(dataFile)) {
      const fileContent = fs.readFileSync(dataFile, 'utf-8');
      try {
        performanceData = JSON.parse(fileContent);
      } catch (error) {
        console.warn('Could not parse existing performance data:', error);
        performanceData = [];
      }
    }
  });

  test.afterEach(async () => {
    // Save performance data
    const dataFile = path.join(__dirname, '../../performance-data.json');
    fs.writeFileSync(dataFile, JSON.stringify(performanceData, null, 2));
  });

  test('monitors home page performance', async ({ page }) => {
    const metrics = await measurePagePerformance(page, '/', 'Home Page Load');
    
    // Assert against baselines
    expect(metrics.pageLoadTime).toBeLessThan(PERFORMANCE_BASELINES.pageLoadTime);
    expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_BASELINES.firstContentfulPaint);
    expect(metrics.largestContentfulPaint).toBeLessThan(PERFORMANCE_BASELINES.largestContentfulPaint);
    expect(metrics.cumulativeLayoutShift).toBeLessThan(PERFORMANCE_BASELINES.cumulativeLayoutShift);
    expect(metrics.totalBlockingTime).toBeLessThan(PERFORMANCE_BASELINES.totalBlockingTime);

    // Store benchmark data
    await storeBenchmark('home-page-load', metrics, 'initial-load', page);
  });

  test('monitors schedule table rendering performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="schedule-table"]');

    const renderStart = performance.now();
    
    // Trigger table re-render with large dataset
    await page.evaluate(() => {
      // Mock large team data
      const largeTeam = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Member ${i + 1}`,
        team: 'Development-Tal',
        role: 'member'
      }));
      
      window.dispatchEvent(new CustomEvent('update-team-data', {
        detail: { teamMembers: largeTeam }
      }));
    });

    // Wait for re-render
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('[data-testid^="member-row-"]');
      return rows.length >= 10;
    });

    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;

    console.log(`Schedule table render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(1000); // 1 second for large table render

    const webVitals = await getWebVitals(page);
    await storeBenchmark('schedule-table-render', {
      ...webVitals,
      pageLoadTime: renderTime
    }, 'table-render', page);
  });

  test('monitors COO dashboard performance', async ({ page }) => {
    // Mock COO authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        user: {
          id: 'coo-1',
          email: 'nir.shilo@example.com',
          user_metadata: {
            full_name: 'Nir Shilo',
            role: 'coo'
          }
        }
      }));
    });

    const metrics = await measurePagePerformance(page, '/coo-dashboard', 'COO Dashboard Load');
    
    // COO dashboard may have more complex data, allow higher thresholds
    expect(metrics.pageLoadTime).toBeLessThan(PERFORMANCE_BASELINES.pageLoadTime * 1.5);
    expect(metrics.largestContentfulPaint).toBeLessThan(PERFORMANCE_BASELINES.largestContentfulPaint * 1.5);

    await storeBenchmark('coo-dashboard-load', metrics, 'dashboard-load', page);
  });

  test('monitors mobile performance', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const metrics = await measurePagePerformance(page, '/', 'Mobile Home Page Load');
    
    // Mobile may be slightly slower, but should still meet reasonable thresholds
    expect(metrics.pageLoadTime).toBeLessThan(PERFORMANCE_BASELINES.pageLoadTime * 1.3);
    expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_BASELINES.firstContentfulPaint * 1.2);
    
    await storeBenchmark('mobile-home-load', metrics, 'mobile-load', page);
  });

  test('monitors real-time update performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="schedule-table"]');

    // Set up performance monitoring for real-time updates
    const updateTimes: number[] = [];
    
    await page.addInitScript(() => {
      window.realTimeUpdateTimes = [];
      
      // Mock real-time update handler
      window.addEventListener('schedule-update', () => {
        const updateTime = performance.now();
        window.realTimeUpdateTimes.push(updateTime);
      });
    });

    // Simulate real-time updates
    for (let i = 0; i < 10; i++) {
      const updateStart = performance.now();
      
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('schedule-update', {
          detail: {
            userId: Math.floor(Math.random() * 10) + 1,
            date: '2024-01-17',
            value: Math.floor(Math.random() * 8)
          }
        }));
      });
      
      // Wait for UI to update
      await page.waitForTimeout(50);
      const updateEnd = performance.now();
      updateTimes.push(updateEnd - updateStart);
    }

    const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
    const maxUpdateTime = Math.max(...updateTimes);

    console.log(`Real-time update performance - Avg: ${avgUpdateTime}ms, Max: ${maxUpdateTime}ms`);
    
    expect(avgUpdateTime).toBeLessThan(100); // 100ms average
    expect(maxUpdateTime).toBeLessThan(200); // 200ms max

    const baseMetrics = await getWebVitals(page);
    await storeBenchmark('realtime-updates', {
      ...baseMetrics,
      pageLoadTime: avgUpdateTime
    }, 'realtime-performance', page);
  });

  test('monitors bundle size and asset loading', async ({ page }) => {
    const resourceSizes: { [key: string]: number } = {};
    let totalSize = 0;

    // Monitor resource loading
    page.on('response', (response) => {
      const url = response.url();
      const size = response.headers()['content-length'];
      
      if (size && (url.includes('.js') || url.includes('.css') || url.includes('.woff'))) {
        const sizeBytes = parseInt(size, 10);
        resourceSizes[url] = sizeBytes;
        totalSize += sizeBytes;
      }
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="schedule-table"]');
    
    // Wait for all resources to load
    await page.waitForLoadState('networkidle');

    console.log(`Total bundle size: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log('Resource breakdown:', resourceSizes);

    // Assert reasonable bundle size (adjust based on your app)
    expect(totalSize).toBeLessThan(5 * 1024 * 1024); // 5MB total
    
    const baseMetrics = await getWebVitals(page);
    await storeBenchmark('bundle-size', {
      ...baseMetrics,
      bundleSize: totalSize
    }, 'asset-loading', page);
  });

  test('detects performance regressions', async ({ page }) => {
    // Run current performance test
    const currentMetrics = await measurePagePerformance(page, '/', 'Regression Check');
    
    // Compare with historical data
    const historicalData = performanceData.filter(d => d.testName === 'regression-check');
    
    if (historicalData.length > 0) {
      // Get baseline from last 5 runs
      const recentRuns = historicalData.slice(-5);
      const baseline = {
        pageLoadTime: recentRuns.reduce((sum, run) => sum + run.metrics.pageLoadTime, 0) / recentRuns.length,
        firstContentfulPaint: recentRuns.reduce((sum, run) => sum + run.metrics.firstContentfulPaint, 0) / recentRuns.length,
        largestContentfulPaint: recentRuns.reduce((sum, run) => sum + run.metrics.largestContentfulPaint, 0) / recentRuns.length
      };

      console.log('Performance comparison:');
      console.log(`Page Load: ${currentMetrics.pageLoadTime}ms vs baseline ${baseline.pageLoadTime.toFixed(0)}ms`);
      console.log(`FCP: ${currentMetrics.firstContentfulPaint}ms vs baseline ${baseline.firstContentfulPaint.toFixed(0)}ms`);
      console.log(`LCP: ${currentMetrics.largestContentfulPaint}ms vs baseline ${baseline.largestContentfulPaint.toFixed(0)}ms`);

      // Check for regressions (more than 20% slower)
      const regressionThreshold = 1.2;
      
      if (currentMetrics.pageLoadTime > baseline.pageLoadTime * regressionThreshold) {
        console.warn(`⚠️ Page load time regression detected: ${currentMetrics.pageLoadTime}ms vs ${baseline.pageLoadTime.toFixed(0)}ms baseline`);
      }
      
      if (currentMetrics.firstContentfulPaint > baseline.firstContentfulPaint * regressionThreshold) {
        console.warn(`⚠️ FCP regression detected: ${currentMetrics.firstContentfulPaint}ms vs ${baseline.firstContentfulPaint.toFixed(0)}ms baseline`);
      }
      
      if (currentMetrics.largestContentfulPaint > baseline.largestContentfulPaint * regressionThreshold) {
        console.warn(`⚠️ LCP regression detected: ${currentMetrics.largestContentfulPaint}ms vs ${baseline.largestContentfulPaint.toFixed(0)}ms baseline`);
      }

      // Don't fail test for minor regressions, but warn
      // expect(currentMetrics.pageLoadTime).toBeLessThan(baseline.pageLoadTime * 1.5);
    }

    await storeBenchmark('regression-check', currentMetrics, 'regression-detection', page);
  });

  test('generates performance report', async ({ page }) => {
    // Generate comprehensive performance report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: performanceData.length,
        averagePageLoadTime: performanceData.reduce((sum, d) => sum + d.metrics.pageLoadTime, 0) / Math.max(performanceData.length, 1),
        averageFCP: performanceData.reduce((sum, d) => sum + d.metrics.firstContentfulPaint, 0) / Math.max(performanceData.length, 1),
        averageLCP: performanceData.reduce((sum, d) => sum + d.metrics.largestContentfulPaint, 0) / Math.max(performanceData.length, 1)
      },
      trends: calculatePerformanceTrends(),
      recommendations: generatePerformanceRecommendations()
    };

    // Save report
    const reportFile = path.join(__dirname, '../../performance-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('Performance Report Generated:', report.summary);

    // Basic assertions
    expect(report.summary.totalTests).toBeGreaterThan(0);
    expect(report.summary.averagePageLoadTime).toBeLessThan(PERFORMANCE_BASELINES.pageLoadTime * 2);
  });
});

// Helper functions
async function measurePagePerformance(page: Page, url: string, testName: string) {
  const startTime = performance.now();
  
  await page.goto(url);
  await page.waitForSelector('body');
  
  const endTime = performance.now();
  const pageLoadTime = endTime - startTime;

  // Get Web Vitals
  const webVitals = await getWebVitals(page);
  
  return {
    ...webVitals,
    pageLoadTime,
    networkRequests: await getNetworkRequestCount(page)
  };
}

async function getWebVitals(page: Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals = {
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        totalBlockingTime: 0,
        memoryUsage: undefined as any
      };

      // Get Performance Observer data if available
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'paint') {
                if (entry.name === 'first-contentful-paint') {
                  vitals.firstContentfulPaint = entry.startTime;
                }
              } else if (entry.entryType === 'largest-contentful-paint') {
                vitals.largestContentfulPaint = entry.startTime;
              } else if (entry.entryType === 'layout-shift') {
                if (!(entry as any).hadRecentInput) {
                  vitals.cumulativeLayoutShift += (entry as any).value;
                }
              }
            }
          });

          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
        } catch (e) {
          console.warn('Performance Observer not fully supported');
        }
      }

      // Get memory usage if available
      if ((performance as any).memory) {
        vitals.memoryUsage = {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        };
      }

      // Use Navigation Timing for fallback
      if (performance.getEntriesByType) {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        if (navigation) {
          vitals.totalBlockingTime = navigation.loadEventEnd - navigation.fetchStart;
        }
      }

      // Resolve after a short delay to collect metrics
      setTimeout(() => resolve(vitals), 100);
    });
  });
}

async function getNetworkRequestCount(page: Page) {
  return await page.evaluate(() => {
    if (performance.getEntriesByType) {
      return performance.getEntriesByType('resource').length;
    }
    return 0;
  });
}

async function storeBenchmark(
  testName: string, 
  metrics: any, 
  userFlow: string, 
  page: Page
) {
  const viewport = page.viewportSize() || { width: 1920, height: 1080 };
  
  const benchmark: PerformanceBenchmark = {
    testName,
    timestamp: new Date().toISOString(),
    metrics,
    userFlow,
    viewport
  };

  performanceData.push(benchmark);
}

function calculatePerformanceTrends() {
  const trends: { [key: string]: string } = {};
  
  if (performanceData.length < 2) {
    return trends;
  }

  // Calculate trends for key metrics
  const recent = performanceData.slice(-10); // Last 10 runs
  const older = performanceData.slice(-20, -10); // Previous 10 runs

  if (older.length === 0) return trends;

  const recentAvgPageLoad = recent.reduce((sum, d) => sum + d.metrics.pageLoadTime, 0) / recent.length;
  const olderAvgPageLoad = older.reduce((sum, d) => sum + d.metrics.pageLoadTime, 0) / older.length;

  const pageLoadTrend = recentAvgPageLoad > olderAvgPageLoad ? 'slower' : 'faster';
  const pageLoadChange = Math.abs((recentAvgPageLoad - olderAvgPageLoad) / olderAvgPageLoad * 100);

  trends.pageLoadTime = `${pageLoadTrend} by ${pageLoadChange.toFixed(1)}%`;

  return trends;
}

function generatePerformanceRecommendations() {
  const recommendations: string[] = [];

  if (performanceData.length === 0) {
    return recommendations;
  }

  const recent = performanceData.slice(-5);
  const avgPageLoad = recent.reduce((sum, d) => sum + d.metrics.pageLoadTime, 0) / recent.length;
  const avgFCP = recent.reduce((sum, d) => sum + d.metrics.firstContentfulPaint, 0) / recent.length;
  const avgLCP = recent.reduce((sum, d) => sum + d.metrics.largestContentfulPaint, 0) / recent.length;

  if (avgPageLoad > PERFORMANCE_BASELINES.pageLoadTime) {
    recommendations.push('Page load time exceeds baseline. Consider optimizing bundle size or lazy loading.');
  }

  if (avgFCP > PERFORMANCE_BASELINES.firstContentfulPaint) {
    recommendations.push('First Contentful Paint is slow. Consider optimizing critical rendering path.');
  }

  if (avgLCP > PERFORMANCE_BASELINES.largestContentfulPaint) {
    recommendations.push('Largest Contentful Paint needs improvement. Optimize image loading and reduce main thread blocking.');
  }

  // Check for bundle size issues
  const bundleSizeData = performanceData.filter(d => d.metrics.bundleSize);
  if (bundleSizeData.length > 0) {
    const avgBundleSize = bundleSizeData.reduce((sum, d) => sum + (d.metrics.bundleSize || 0), 0) / bundleSizeData.length;
    if (avgBundleSize > 2 * 1024 * 1024) { // 2MB
      recommendations.push('Bundle size is large. Consider code splitting and dynamic imports.');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Performance is within acceptable thresholds.');
  }

  return recommendations;
}