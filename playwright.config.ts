/**
 * Playwright Configuration for Cross-Browser Testing
 * 
 * Comprehensive configuration for automated browser testing across
 * multiple browsers, devices, and network conditions.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/compatibility-report.json' }],
    ['junit', { outputFile: 'test-results/compatibility-junit.xml' }],
  ],
  
  // Global test timeout
  timeout: 30000,
  
  // Global expect timeout
  expect: {
    timeout: 5000,
  },
  
  // Shared settings for all the projects below
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Global test timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 15000,
  },

  // Configure projects for major browsers and devices
  projects: [
    // Desktop Browsers - Latest Versions
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
      testIgnore: [
        '**/*mobile*',
        '**/*touch*',
      ],
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
      testIgnore: [
        '**/*mobile*',
        '**/*touch*',
      ],
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      },
      testIgnore: [
        '**/*mobile*',
        '**/*touch*',
      ],
    },
    {
      name: 'edge-desktop',
      use: {
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
      testIgnore: [
        '**/*mobile*',
        '**/*touch*',
      ],
    },

    // Desktop Browsers - Previous Versions (for compatibility testing)
    {
      name: 'chromium-desktop-prev',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        channel: 'chrome-beta', // Previous version
      },
      testIgnore: [
        '**/*mobile*',
        '**/*touch*',
      ],
    },

    // Mobile Devices - iOS
    {
      name: 'iphone-se',
      use: {
        ...devices['iPhone SE'],
      },
      testMatch: [
        '**/*mobile*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },
    {
      name: 'iphone-12',
      use: {
        ...devices['iPhone 12'],
      },
      testMatch: [
        '**/*mobile*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },
    {
      name: 'iphone-14-pro',
      use: {
        ...devices['iPhone 14 Pro'],
      },
      testMatch: [
        '**/*mobile*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },
    {
      name: 'iphone-14-pro-max',
      use: {
        ...devices['iPhone 14 Pro Max'],
      },
      testMatch: [
        '**/*mobile*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },

    // Mobile Devices - Android
    {
      name: 'pixel-5',
      use: {
        ...devices['Pixel 5'],
      },
      testMatch: [
        '**/*mobile*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },
    {
      name: 'galaxy-s21',
      use: {
        ...devices['Galaxy S21'],
      },
      testMatch: [
        '**/*mobile*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },
    {
      name: 'galaxy-s22-ultra',
      use: {
        ...devices['Galaxy S22 Ultra'],
      },
      testMatch: [
        '**/*mobile*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },

    // Tablet Devices
    {
      name: 'ipad',
      use: {
        ...devices['iPad'],
      },
      testMatch: [
        '**/*tablet*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },
    {
      name: 'ipad-pro',
      use: {
        ...devices['iPad Pro'],
      },
      testMatch: [
        '**/*tablet*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },
    {
      name: 'galaxy-tab',
      use: {
        ...devices['Galaxy Tab S4'],
      },
      testMatch: [
        '**/*tablet*',
        '**/*touch*',
        '**/*responsive*',
      ],
    },

    // Network Conditions Testing
    {
      name: 'slow-3g',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        extraHTTPHeaders: {
          'Connection': 'slow-3g',
        },
        offline: false,
        connectionType: 'slow-3g',
      },
      testMatch: [
        '**/*performance*',
        '**/*network*',
      ],
    },
    {
      name: 'fast-3g',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        connectionType: 'fast-3g',
      },
      testMatch: [
        '**/*performance*',
        '**/*network*',
      ],
    },

    // Accessibility Testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        forcedColors: 'active',
      },
      testMatch: [
        '**/*accessibility*',
        '**/*a11y*',
      ],
    },

    // High DPI Testing
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 3,
      },
      testMatch: [
        '**/*retina*',
        '**/*high-dpi*',
      ],
    },

    // Performance Testing
    {
      name: 'performance-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--enable-gpu-benchmarking',
            '--enable-threaded-compositing',
            '--no-sandbox',
          ],
        },
      },
      testMatch: [
        '**/*performance*',
      ],
    },
    {
      name: 'performance-mobile',
      use: {
        ...devices['iPhone 12'],
        launchOptions: {
          args: [
            '--enable-gpu-benchmarking',
            '--enable-threaded-compositing',
          ],
        },
      },
      testMatch: [
        '**/*performance*',
        '**/*mobile*',
      ],
    },

    // Memory Constrained Testing
    {
      name: 'low-memory',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
        launchOptions: {
          args: [
            '--memory-pressure-off',
            '--max_old_space_size=512', // Limit memory
          ],
        },
      },
      testMatch: [
        '**/*memory*',
        '**/*performance*',
      ],
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Global setup and teardown
  globalSetup: require.resolve('./__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./__tests__/e2e/global-teardown.ts'),
});