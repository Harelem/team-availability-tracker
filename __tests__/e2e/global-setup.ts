/**
 * Global Setup for E2E Tests
 * 
 * Setup configurations, test data, and utilities needed for cross-browser testing.
 */

import { chromium, FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for cross-browser testing...');

  // Create test results directories
  const testResultsDir = path.join(process.cwd(), 'test-results');
  const screenshotsDir = path.join(testResultsDir, 'screenshots');
  const videosDir = path.join(testResultsDir, 'videos');
  const tracesDir = path.join(testResultsDir, 'traces');
  const reportsDir = path.join(testResultsDir, 'reports');

  await fs.mkdir(testResultsDir, { recursive: true });
  await fs.mkdir(screenshotsDir, { recursive: true });
  await fs.mkdir(videosDir, { recursive: true });
  await fs.mkdir(tracesDir, { recursive: true });
  await fs.mkdir(reportsDir, { recursive: true });

  // Initialize browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    console.log('📡 Waiting for application to be available...');
    
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      try {
        const response = await page.goto('http://localhost:3000', { 
          waitUntil: 'networkidle',
          timeout: 5000 
        });
        
        if (response?.ok()) {
          console.log('✅ Application is ready');
          break;
        }
      } catch (error) {
        retries++;
        console.log(`⏳ Waiting for application... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (retries >= maxRetries) {
      throw new Error('Application failed to start within timeout period');
    }

    // Setup test data
    console.log('📋 Setting up test data...');
    
    // Create compatibility test report structure
    const compatibilityReport = {
      timestamp: new Date().toISOString(),
      browsers: config.projects.map(project => ({
        name: project.name,
        device: project.use?.userAgent || 'Unknown',
        viewport: project.use?.viewport,
        features: {
          touch: project.name.includes('mobile') || project.name.includes('tablet'),
          retina: (project.use?.deviceScaleFactor || 1) > 1,
          darkMode: project.use?.colorScheme === 'dark',
          reducedMotion: project.use?.reducedMotion === 'reduce',
        }
      })),
      testSuites: [
        'Browser Compatibility',
        'Mobile Touch Interactions',
        'Device-Specific Scenarios',
        'Performance Benchmarks',
        'Accessibility Compliance',
      ],
      results: {
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      },
    };

    await fs.writeFile(
      path.join(reportsDir, 'compatibility-report-init.json'),
      JSON.stringify(compatibilityReport, null, 2)
    );

    // Create device matrix documentation
    const deviceMatrix = {
      mobile: {
        devices: ['iPhone SE', 'iPhone 12', 'iPhone 14 Pro', 'Pixel 5', 'Galaxy S21'],
        testTypes: ['Touch interactions', 'Responsive design', 'Performance', 'Accessibility'],
        constraints: {
          maxRenderTime: 300,
          minTouchTargetSize: 44,
          maxMemoryUsage: 100,
        },
      },
      tablet: {
        devices: ['iPad', 'iPad Pro', 'Galaxy Tab'],
        testTypes: ['Hybrid interactions', 'Split screen', 'Multi-tasking', 'Orientation'],
        constraints: {
          maxRenderTime: 200,
          minTouchTargetSize: 44,
          maxMemoryUsage: 200,
        },
      },
      desktop: {
        devices: ['Chrome', 'Firefox', 'Safari', 'Edge'],
        testTypes: ['Keyboard navigation', 'Multiple monitors', 'High DPI', 'Performance'],
        constraints: {
          maxRenderTime: 100,
          minTouchTargetSize: 0,
          maxMemoryUsage: 500,
        },
      },
    };

    await fs.writeFile(
      path.join(reportsDir, 'device-matrix.json'),
      JSON.stringify(deviceMatrix, null, 2)
    );

    // Verify critical application features are working
    console.log('🔍 Verifying application features...');
    
    // Check if main components load
    const mainContent = await page.locator('[id="main-content"], main, [role="main"]').first();
    await mainContent.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('✅ Main application components verified');

    // Create performance baseline
    console.log('📊 Creating performance baseline...');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        largestContentfulPaint: 0, // Would need to be measured differently
        memoryUsage: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        } : null,
      };
    });

    await fs.writeFile(
      path.join(reportsDir, 'performance-baseline.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics: performanceMetrics,
        browser: 'chromium-setup',
        viewport: { width: 1920, height: 1080 },
      }, null, 2)
    );

    console.log('✅ Performance baseline created');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('🎉 Global setup completed successfully');
}

export default globalSetup;