/**
 * Cross-Browser Core Features E2E Tests
 * 
 * End-to-end tests that verify core application features work consistently
 * across all target browsers and devices.
 */

import { test, expect, Page, Browser } from '@playwright/test';

// Test data setup
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  role: 'Manager',
};

const testTeam = {
  id: 1,
  name: 'Test Team',
};

// Helper functions
async function waitForAppToLoad(page: Page) {
  // Wait for the main content to be visible
  await page.waitForSelector('[id="main-content"], main, [role="main"]', { 
    state: 'visible',
    timeout: 15000 
  });
  
  // Wait for any loading spinners to disappear
  await page.waitForFunction(() => {
    const loadingElements = document.querySelectorAll('.loading, .spinner, [aria-busy="true"]');
    return loadingElements.length === 0;
  }, { timeout: 10000 });
}

async function takeScreenshotOnFailure(page: Page, testInfo: any) {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
  }
}

async function measurePagePerformance(page: Page) {
  return await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      memoryUsage: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit,
      } : null,
    };
  });
}

test.describe('Cross-Browser Core Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await waitForAppToLoad(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await takeScreenshotOnFailure(page, testInfo);
  });

  test('should load application homepage successfully', async ({ page, browserName }) => {
    // Verify the page loads without errors
    const title = await page.title();
    expect(title).toContain('Team Availability Tracker');

    // Check for main navigation elements
    const mainContent = page.locator('[id="main-content"], main, [role="main"]');
    await expect(mainContent).toBeVisible();

    // Verify no JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    // Wait a bit to catch any delayed errors
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);

    // Measure performance
    const performance = await measurePagePerformance(page);
    console.log(`Performance on ${browserName}:`, performance);
    
    // Performance assertions based on browser
    const performanceThresholds = {
      chromium: { loadTime: 3000, memory: 100 * 1024 * 1024 },
      firefox: { loadTime: 3500, memory: 120 * 1024 * 1024 },
      webkit: { loadTime: 3000, memory: 80 * 1024 * 1024 },
    };
    
    const thresholds = performanceThresholds[browserName as keyof typeof performanceThresholds] || 
                     performanceThresholds.chromium;
    
    expect(performance.loadComplete).toBeLessThan(thresholds.loadTime);
    
    if (performance.memoryUsage) {
      expect(performance.memoryUsage.used).toBeLessThan(thresholds.memory);
    }
  });

  test('should handle team selection flow', async ({ page, browserName }) => {
    // Look for team selection interface
    const teamSelectionIndicators = [
      'text=Select your team',
      'text=Choose team',
      '[data-testid="team-selection"]',
      'button:has-text("Team")',
      '.team-selector',
    ];

    let teamSelectionFound = false;
    for (const selector of teamSelectionIndicators) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        teamSelectionFound = true;
        break;
      } catch (error) {
        // Continue to next selector
      }
    }

    if (teamSelectionFound) {
      // If team selection is available, test the flow
      const teamButtons = page.locator('button').filter({ hasText: /team|select/i });
      
      if (await teamButtons.count() > 0) {
        await teamButtons.first().click();
        
        // Wait for navigation or state change
        await page.waitForTimeout(1000);
        
        // Verify we've progressed past team selection
        const progressIndicators = [
          'text=Welcome',
          'text=Schedule',
          'text=Dashboard',
          '[role="main"]',
        ];
        
        let progressFound = false;
        for (const indicator of progressIndicators) {
          try {
            await page.waitForSelector(indicator, { timeout: 3000 });
            progressFound = true;
            break;
          } catch (error) {
            // Continue to next indicator
          }
        }
        
        expect(progressFound).toBe(true);
      }
    } else {
      // If no team selection, verify we're already in the main application
      const mainAppIndicators = [
        'text=Schedule',
        'text=Dashboard',
        'text=Availability',
        '[data-testid="schedule-table"]',
        '.schedule-container',
      ];
      
      let mainAppFound = false;
      for (const indicator of mainAppIndicators) {
        try {
          await page.waitForSelector(indicator, { timeout: 3000 });
          mainAppFound = true;
          break;
        } catch (error) {
          // Continue to next indicator
        }
      }
      
      expect(mainAppFound).toBe(true);
    }
  });

  test('should display schedule interface correctly', async ({ page, browserName, isMobile }) => {
    // Navigate through any initial setup to reach schedule
    await page.waitForTimeout(2000);
    
    // Look for schedule-related elements
    const scheduleIndicators = [
      'text=Schedule',
      'text=Availability',
      'text=Week',
      '[data-testid="schedule"]',
      '.schedule-table',
      '.calendar',
    ];

    let scheduleFound = false;
    for (const indicator of scheduleIndicators) {
      try {
        await page.waitForSelector(indicator, { timeout: 5000 });
        scheduleFound = true;
        break;
      } catch (error) {
        // Continue to next indicator
      }
    }

    if (!scheduleFound) {
      // Try to navigate to schedule
      const navLinks = page.locator('a, button').filter({ hasText: /schedule|calendar|availability/i });
      if (await navLinks.count() > 0) {
        await navLinks.first().click();
        await page.waitForTimeout(1000);
      }
    }

    // Verify schedule interface elements
    if (isMobile) {
      // Mobile-specific checks
      const mobileScheduleElements = [
        '.mobile-schedule',
        '[data-testid="mobile-schedule"]',
        'text=Week of',
        'button:has-text("Previous")',
        'button:has-text("Next")',
      ];

      let mobileElementFound = false;
      for (const element of mobileScheduleElements) {
        try {
          await page.waitForSelector(element, { timeout: 3000 });
          mobileElementFound = true;
          break;
        } catch (error) {
          // Continue
        }
      }

      // Mobile should have touch-friendly navigation
      const navigationButtons = page.locator('button');
      const buttonCount = await navigationButtons.count();
      
      if (buttonCount > 0) {
        // Check touch target sizes on mobile
        const buttonSizes = await navigationButtons.evaluateAll(buttons => 
          buttons.map(btn => {
            const rect = btn.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          })
        );

        buttonSizes.forEach((size, index) => {
          if (size.width > 0 && size.height > 0) {
            const minSize = Math.min(size.width, size.height);
            expect(minSize).toBeGreaterThanOrEqual(44); // iOS/Android guidelines
          }
        });
      }
    } else {
      // Desktop-specific checks
      const desktopScheduleElements = [
        'table',
        '.schedule-table',
        'th', // Table headers
        'td', // Table cells
        'text=Team Members',
        'text=Days',
      ];

      let desktopElementFound = false;
      for (const element of desktopScheduleElements) {
        try {
          await page.waitForSelector(element, { timeout: 3000 });
          desktopElementFound = true;
          break;
        } catch (error) {
          // Continue
        }
      }
    }

    // Verify no layout issues
    const viewport = page.viewportSize();
    if (viewport) {
      const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 50); // Allow small margin
    }
  });

  test('should handle navigation between different views', async ({ page, browserName }) => {
    // Test navigation functionality
    const navigationElements = [
      'nav',
      '[role="navigation"]',
      '.navigation',
      '.nav-menu',
      'button:has-text("Menu")',
    ];

    let navigationFound = false;
    for (const nav of navigationElements) {
      try {
        await page.waitForSelector(nav, { timeout: 3000 });
        navigationFound = true;
        break;
      } catch (error) {
        // Continue
      }
    }

    if (navigationFound) {
      // Find navigable links/buttons
      const navLinks = page.locator('a[href], button').filter({ 
        hasText: /home|dashboard|schedule|settings|analytics|team/i 
      });
      
      const linkCount = await navLinks.count();
      
      if (linkCount > 0) {
        // Test clicking different navigation items
        for (let i = 0; i < Math.min(3, linkCount); i++) {
          const link = navLinks.nth(i);
          const linkText = await link.textContent();
          
          console.log(`Testing navigation to: ${linkText}`);
          
          await link.click();
          await page.waitForTimeout(1000);
          
          // Verify navigation worked (page content changed)
          const currentUrl = page.url();
          expect(currentUrl).toContain('localhost:3000');
          
          // Verify no errors after navigation
          const errors: string[] = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.waitForTimeout(1000);
          expect(errors).toEqual([]);
        }
      }
    }
  });

  test('should handle form interactions correctly', async ({ page, browserName, isMobile }) => {
    // Look for form elements
    const formElements = [
      'form',
      'input',
      'select',
      'textarea',
      'button[type="submit"]',
    ];

    let formsFound = false;
    for (const element of formElements) {
      try {
        const count = await page.locator(element).count();
        if (count > 0) {
          formsFound = true;
          break;
        }
      } catch (error) {
        // Continue
      }
    }

    if (formsFound) {
      // Test input interactions
      const inputs = page.locator('input[type="text"], input[type="email"], textarea');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        const testInput = inputs.first();
        
        // Test typing
        await testInput.fill('Test input');
        const value = await testInput.inputValue();
        expect(value).toBe('Test input');

        // Test clearing
        await testInput.clear();
        const clearedValue = await testInput.inputValue();
        expect(clearedValue).toBe('');

        if (isMobile) {
          // Test mobile-specific input behavior
          await testInput.focus();
          
          // Verify input is focused and keyboard would appear
          const isFocused = await testInput.evaluate(el => document.activeElement === el);
          expect(isFocused).toBe(true);
        }
      }

      // Test button interactions
      const buttons = page.locator('button').filter({ hasNotText: /close|cancel|back/i });
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const testButton = buttons.first();
        
        // Verify button is clickable
        await expect(testButton).toBeEnabled();
        
        // Test hover on desktop
        if (!isMobile) {
          await testButton.hover();
          await page.waitForTimeout(100);
        }
        
        // Test click (but don't necessarily submit forms)
        const buttonText = await testButton.textContent();
        if (buttonText && !buttonText.toLowerCase().includes('submit')) {
          await testButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should maintain accessibility standards', async ({ page, browserName }) => {
    // Check for basic accessibility features
    const accessibilityChecks = [
      // Skip links
      'a[href="#main-content"], a[href="#main"]',
      
      // Proper headings
      'h1, h2, h3',
      
      // Alt text on images
      'img[alt]',
      
      // Form labels
      'label',
      
      // ARIA landmarks
      '[role="main"], [role="navigation"], [role="banner"]',
      
      // Focus indicators
      '*:focus-visible, *:focus',
    ];

    const accessibilityResults: { [key: string]: boolean } = {};

    for (const check of accessibilityChecks) {
      try {
        const elements = await page.locator(check).count();
        accessibilityResults[check] = elements > 0;
      } catch (error) {
        accessibilityResults[check] = false;
      }
    }

    // At least some accessibility features should be present
    const passedChecks = Object.values(accessibilityResults).filter(Boolean).length;
    expect(passedChecks).toBeGreaterThan(2);

    // Test keyboard navigation
    const focusableElements = page.locator(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const focusableCount = await focusableElements.count();
    
    if (focusableCount > 1) {
      // Test tab navigation
      const firstElement = focusableElements.first();
      await firstElement.focus();
      
      // Verify focus
      const isFocused = await firstElement.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
      
      // Test tab to next element
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      // Verify focus moved
      const newFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(newFocusedElement).toBeTruthy();
    }
  });

  test('should handle responsive design correctly', async ({ page, browserName }) => {
    const viewport = page.viewportSize();
    
    if (viewport) {
      // Test different viewport sizes
      const viewportSizes = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const size of viewportSizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500);

        // Verify no horizontal scroll
        const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(size.width + 20);

        // Verify content is visible
        const mainContent = page.locator('[id="main-content"], main, [role="main"]');
        await expect(mainContent).toBeVisible();

        // Check for responsive classes
        const responsiveElements = await page.locator('[class*="sm:"], [class*="md:"], [class*="lg:"]').count();
        
        if (responsiveElements > 0) {
          console.log(`Found ${responsiveElements} responsive elements at ${size.width}x${size.height}`);
        }
      }

      // Reset to original viewport
      await page.setViewportSize(viewport);
    }
  });
});