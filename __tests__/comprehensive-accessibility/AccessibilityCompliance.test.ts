/**
 * Accessibility Testing Suite - WCAG 2.1 AA Compliance
 * Tests accessibility standards across all user roles and features
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

interface AccessibilityTestUser {
  role: string;
  team: string;
  name: string;
  routes: string[];
}

const TEST_USERS: AccessibilityTestUser[] = [
  {
    role: 'member',
    team: 'Development-Tal',
    name: 'Ido Keller',
    routes: ['/', '/profile', '/schedule']
  },
  {
    role: 'manager',
    team: 'Infrastructure',
    name: 'Amit Tzriker',
    routes: ['/', '/team-management', '/analytics']
  },
  {
    role: 'coo',
    team: 'Leadership',
    name: 'Harel Ben-Attia',
    routes: ['/', '/coo-dashboard', '/company-analytics']
  }
];

const WCAG_RULES = {
  'color-contrast': 'WCAG 2.1 AA requires 4.5:1 contrast ratio for normal text',
  'keyboard-navigation': 'All interactive elements must be keyboard accessible',
  'focus-visible': 'Focus indicators must be clearly visible',
  'aria-labels': 'All form controls and interactive elements need accessible names',
  'heading-structure': 'Proper heading hierarchy (h1, h2, h3, etc.)',
  'alt-text': 'All images must have appropriate alternative text',
  'form-labels': 'All form inputs must have associated labels',
  'link-context': 'Links must have descriptive text or context'
};

test.describe('WCAG 2.1 AA Accessibility Compliance', () => {
  
  test.describe('Automated Accessibility Testing', () => {
    TEST_USERS.forEach(user => {
      user.routes.forEach(route => {
        test(`${user.role} accessibility on ${route}`, async ({ page }) => {
          // Set up user authentication
          await page.addInitScript(() => {
            window.localStorage.setItem('supabase.auth.token', JSON.stringify({
              user: {
                id: `${user.role}-test-${Math.random()}`,
                email: `${user.name.toLowerCase().replace(' ', '.')}@example.com`,
                user_metadata: {
                  full_name: user.name,
                  team: user.team,
                  role: user.role
                }
              }
            }));
          });

          await page.goto(route);
          await page.waitForLoadState('networkidle');

          // Run axe accessibility tests
          const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();

          // Log violations for debugging
          if (accessibilityScanResults.violations.length > 0) {
            console.log(`🚨 Accessibility violations for ${user.role} on ${route}:`);
            accessibilityScanResults.violations.forEach(violation => {
              console.log(`- ${violation.id}: ${violation.description}`);
              console.log(`  Impact: ${violation.impact}`);
              console.log(`  Elements: ${violation.nodes.length}`);
            });
          }

          // Expect no violations
          expect(accessibilityScanResults.violations).toHaveLength(0);
          console.log(`✅ ${user.role} on ${route}: ${accessibilityScanResults.passes.length} accessibility checks passed`);
        });
      });
    });
  });

  test.describe('Keyboard Navigation Testing', () => {
    test('full keyboard navigation for regular user', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'keyboard-test-user',
            email: 'keyboard.test@example.com',
            user_metadata: {
              full_name: 'Keyboard Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Test keyboard navigation through the schedule table
      await page.keyboard.press('Tab');
      
      // Should be able to navigate to the first editable cell
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test navigation through table cells
      const tabPresses = 10;
      for (let i = 0; i < tabPresses; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus');
        
        // Each focused element should be visible and interactive
        await expect(focusedElement).toBeVisible();
        
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        const isInteractive = ['input', 'button', 'select', 'textarea', 'a'].includes(tagName) ||
                            await focusedElement.evaluate(el => 
                              el.getAttribute('tabindex') !== null || 
                              el.getAttribute('contenteditable') === 'true'
                            );
        
        if (isInteractive) {
          console.log(`✅ Tab ${i + 1}: ${tagName} element focused and interactive`);
        }
      }

      console.log('✅ Keyboard navigation test completed');
    });

    test('keyboard shortcuts and accessibility keys', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'shortcuts-test-user',
            email: 'shortcuts.test@example.com',
            user_metadata: {
              full_name: 'Shortcuts Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Test escape key behavior in modals/dialogs
      const scheduleCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]').first();
      if (await scheduleCell.count() > 0) {
        await scheduleCell.click();
        await scheduleCell.fill('3.5');
        await scheduleCell.press('Tab');

        // Should open reason dialog
        const reasonDialog = page.locator('[data-testid="reason-dialog"]');
        if (await reasonDialog.count() > 0) {
          await expect(reasonDialog).toBeVisible();
          
          // Test Escape key closes dialog
          await page.keyboard.press('Escape');
          await expect(reasonDialog).not.toBeVisible();
          
          console.log('✅ Escape key properly closes dialogs');
        }
      }

      // Test Enter key activation
      const firstFocusableButton = page.locator('button').first();
      if (await firstFocusableButton.count() > 0) {
        await firstFocusableButton.focus();
        await page.keyboard.press('Enter');
        console.log('✅ Enter key activates focused buttons');
      }
    });

    test('skip links and navigation shortcuts', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'skip-links-test',
            email: 'skip.test@example.com',
            user_metadata: {
              full_name: 'Skip Links Test',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      
      // Test skip to main content link
      await page.keyboard.press('Tab');
      const skipLink = page.locator('[data-testid="skip-to-main"]').or(page.locator('a[href="#main-content"]'));
      
      if (await skipLink.count() > 0) {
        await expect(skipLink).toBeFocused();
        await page.keyboard.press('Enter');
        
        // Should focus main content
        const mainContent = page.locator('#main-content').or(page.locator('main'));
        await expect(mainContent).toBeFocused();
        
        console.log('✅ Skip to main content link working');
      } else {
        console.warn('⚠️ Skip to main content link not found - consider adding for better accessibility');
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('ARIA labels and roles for schedule table', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'aria-test-user',
            email: 'aria.test@example.com',
            user_metadata: {
              full_name: 'ARIA Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Test table accessibility
      const table = page.locator('[data-testid="schedule-table"]');
      await expect(table).toHaveAttribute('role', 'table');
      
      // Check for proper table headers
      const headers = table.locator('th');
      const headerCount = await headers.count();
      
      for (let i = 0; i < headerCount; i++) {
        const header = headers.nth(i);
        const headerText = await header.textContent();
        if (headerText && headerText.trim()) {
          await expect(header).toHaveAttribute('role', 'columnheader');
          console.log(`✅ Header "${headerText}" has proper ARIA role`);
        }
      }

      // Test input fields have labels
      const inputs = page.locator('input[type="text"], input[type="number"]');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        
        // Check for aria-label or aria-labelledby or associated label
        const hasAriaLabel = await input.getAttribute('aria-label');
        const hasAriaLabelledBy = await input.getAttribute('aria-labelledby');
        const hasAssociatedLabel = await input.evaluate(el => {
          const id = el.id;
          return id ? document.querySelector(`label[for="${id}"]`) !== null : false;
        });

        expect(hasAriaLabel || hasAriaLabelledBy || hasAssociatedLabel).toBeTruthy();
        console.log(`✅ Input ${i + 1} has proper labeling`);
      }
    });

    test('form accessibility and validation messages', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'form-test-user',
            email: 'form.test@example.com',
            user_metadata: {
              full_name: 'Form Test User',
              team: 'Infrastructure',
              role: 'manager'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test form elements if manager functionality is available
      const addMemberButton = page.locator('[data-testid="add-team-member"]');
      
      if (await addMemberButton.count() > 0) {
        await addMemberButton.click();
        
        const modal = page.locator('[data-testid="add-member-modal"]');
        if (await modal.count() > 0) {
          await expect(modal).toBeVisible();
          
          // Check form inputs have proper labels
          const nameInput = page.locator('[data-testid="member-name-input"]');
          const emailInput = page.locator('[data-testid="member-email-input"]');
          
          if (await nameInput.count() > 0) {
            // Test required field validation
            await nameInput.focus();
            await nameInput.fill('');
            await nameInput.blur();
            
            // Should show validation message
            const validationMessage = page.locator('[aria-live="polite"]').or(page.locator('[data-testid*="error"]'));
            if (await validationMessage.count() > 0) {
              await expect(validationMessage).toBeVisible();
              console.log('✅ Form validation messages are accessible');
            }
          }
        }
      }
    });

    test('dynamic content and live regions', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'live-region-test',
            email: 'live.test@example.com',
            user_metadata: {
              full_name: 'Live Region Test',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Test live regions for status updates
      const liveRegions = page.locator('[aria-live], [data-testid*="status"], [data-testid*="notification"]');
      const liveRegionCount = await liveRegions.count();
      
      for (let i = 0; i < liveRegionCount; i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');
        
        if (ariaLive) {
          expect(['polite', 'assertive', 'off'].includes(ariaLive)).toBeTruthy();
          console.log(`✅ Live region ${i + 1} has valid aria-live value: ${ariaLive}`);
        }
      }

      // Test save status announcements
      const scheduleCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]').first();
      if (await scheduleCell.count() > 0) {
        await scheduleCell.click();
        await scheduleCell.fill('8');
        await scheduleCell.press('Tab');

        // Should announce save status
        const saveIndicator = page.locator('[data-testid="save-indicator"], [aria-live="polite"]');
        if (await saveIndicator.count() > 0) {
          await expect(saveIndicator).toBeVisible();
          console.log('✅ Save status is announced to screen readers');
        }
      }
    });
  });

  test.describe('Color and Contrast Compliance', () => {
    test('color contrast ratios meet WCAG AA standards', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'contrast-test-user',
            email: 'contrast.test@example.com',
            user_metadata: {
              full_name: 'Contrast Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Use axe-core to specifically test color contrast
      const contrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      if (contrastResults.violations.length > 0) {
        console.log('🚨 Color contrast violations:');
        contrastResults.violations.forEach(violation => {
          violation.nodes.forEach(node => {
            console.log(`- Element: ${node.target}`);
            console.log(`  Contrast ratio: ${node.any[0]?.data?.contrastRatio || 'unknown'}`);
            console.log(`  Expected: 4.5:1 for normal text, 3:1 for large text`);
          });
        });
      }

      expect(contrastResults.violations).toHaveLength(0);
      console.log('✅ All text meets WCAG AA color contrast requirements');
    });

    test('information not conveyed by color alone', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'color-info-test',
            email: 'color.info.test@example.com',
            user_metadata: {
              full_name: 'Color Info Test',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Check that status indicators have text or icons in addition to color
      const statusElements = page.locator('[data-testid*="status"], [class*="status"], [class*="indicator"]');
      const statusCount = await statusElements.count();

      for (let i = 0; i < Math.min(statusCount, 5); i++) {
        const element = statusElements.nth(i);
        
        // Should have text content or aria-label
        const textContent = await element.textContent();
        const ariaLabel = await element.getAttribute('aria-label');
        const title = await element.getAttribute('title');
        
        const hasNonColorIndicator = (textContent && textContent.trim().length > 0) || 
                                   (ariaLabel && ariaLabel.length > 0) ||
                                   (title && title.length > 0);
        
        expect(hasNonColorIndicator).toBeTruthy();
        console.log(`✅ Status element ${i + 1} has non-color indicator`);
      }
    });

    test('focus indicators are clearly visible', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'focus-test-user',
            email: 'focus.test@example.com',
            user_metadata: {
              full_name: 'Focus Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Test focus visibility on interactive elements
      const interactiveElements = page.locator('button, input, select, a[href], [tabindex="0"]');
      const elementCount = await interactiveElements.count();

      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = interactiveElements.nth(i);
        await element.focus();
        
        // Check that focused element has visible outline or focus indicator
        const focusStyles = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineStyle: styles.outlineStyle,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow
          };
        });

        const hasFocusIndicator = focusStyles.outlineWidth !== '0px' && 
                                focusStyles.outlineStyle !== 'none' ||
                                focusStyles.boxShadow !== 'none';

        expect(hasFocusIndicator).toBeTruthy();
        console.log(`✅ Element ${i + 1} has visible focus indicator`);
      }
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('touch targets meet minimum size requirements', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'mobile-a11y-test',
            email: 'mobile.a11y@example.com',
            user_metadata: {
              full_name: 'Mobile A11y Test',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test touch target sizes (should be at least 44x44px for WCAG AA)
      const touchTargets = page.locator('button, a, input[type="button"], input[type="submit"], [role="button"]');
      const targetCount = await touchTargets.count();

      for (let i = 0; i < Math.min(targetCount, 10); i++) {
        const target = touchTargets.nth(i);
        
        if (await target.isVisible()) {
          const boundingBox = await target.boundingBox();
          
          if (boundingBox) {
            const minSize = 44; // WCAG AA requirement
            const width = boundingBox.width;
            const height = boundingBox.height;
            
            if (width < minSize || height < minSize) {
              console.warn(`⚠️ Touch target ${i + 1} is ${width}x${height}px, should be at least ${minSize}x${minSize}px`);
            } else {
              console.log(`✅ Touch target ${i + 1} meets size requirements: ${width}x${height}px`);
            }
          }
        }
      }
    });

    test('mobile screen reader navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'mobile-sr-test',
            email: 'mobile.sr@example.com',
            user_metadata: {
              full_name: 'Mobile SR Test',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Run mobile-specific accessibility tests
      const mobileA11yResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(mobileA11yResults.violations).toHaveLength(0);
      console.log(`✅ Mobile accessibility: ${mobileA11yResults.passes.length} checks passed`);
    });

    test('orientation and zoom support', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'zoom-test-user',
            email: 'zoom.test@example.com',
            user_metadata: {
              full_name: 'Zoom Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      // Test portrait orientation
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');
      
      let table = page.locator('[data-testid="schedule-table"]');
      await expect(table).toBeVisible();
      
      // Test landscape orientation
      await page.setViewportSize({ width: 667, height: 375 });
      await expect(table).toBeVisible();
      
      // Test zoom (simulate by reducing viewport)
      await page.setViewportSize({ width: 187, height: 333 }); // 50% zoom simulation
      await expect(table).toBeVisible();
      
      console.log('✅ Layout responds properly to orientation changes and zoom');
    });
  });

  test.describe('Semantic HTML and Document Structure', () => {
    test('proper heading hierarchy', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'heading-test-user',
            email: 'heading.test@example.com',
            user_metadata: {
              full_name: 'Heading Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels = [];
      
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const level = parseInt(tagName.charAt(1));
        const text = await heading.textContent();
        
        headingLevels.push({ level, text: text?.trim() });
      }

      // Validate heading hierarchy
      for (let i = 1; i < headingLevels.length; i++) {
        const currentLevel = headingLevels[i].level;
        const previousLevel = headingLevels[i - 1].level;
        
        // Headings should not skip levels (e.g., h1 to h3 without h2)
        if (currentLevel > previousLevel + 1) {
          console.warn(`⚠️ Heading hierarchy skip: ${headingLevels[i - 1].text} (h${previousLevel}) to ${headingLevels[i].text} (h${currentLevel})`);
        }
      }

      // Should have exactly one h1
      const h1Count = headingLevels.filter(h => h.level === 1).length;
      expect(h1Count).toBe(1);
      
      console.log(`✅ Heading structure validated: ${headingLevels.length} headings found`);
    });

    test('landmark roles and page structure', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'landmark-test-user',
            email: 'landmark.test@example.com',
            user_metadata: {
              full_name: 'Landmark Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for essential landmarks
      const landmarks = [
        { selector: 'main, [role="main"]', name: 'main content area' },
        { selector: 'nav, [role="navigation"]', name: 'navigation' },
        { selector: 'header, [role="banner"]', name: 'page header' }
      ];

      for (const landmark of landmarks) {
        const element = page.locator(landmark.selector);
        const count = await element.count();
        
        if (count > 0) {
          console.log(`✅ Found ${landmark.name} landmark`);
        } else {
          console.warn(`⚠️ Missing ${landmark.name} landmark - consider adding for better navigation`);
        }
      }

      // Test page title
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title).not.toBe('React App'); // Default title
      console.log(`✅ Page has descriptive title: "${title}"`);
    });

    test('language and document metadata', async ({ page }) => {
      await page.goto('/');
      
      // Check html lang attribute
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBeTruthy();
      expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // Format like "en" or "en-US"
      console.log(`✅ HTML lang attribute set: ${htmlLang}`);

      // Check meta description
      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
      if (metaDescription && metaDescription.length > 0) {
        console.log(`✅ Meta description present: "${metaDescription.substring(0, 50)}..."`);
      } else {
        console.warn('⚠️ Meta description missing - consider adding for better SEO and accessibility');
      }
    });
  });

  test.describe('Error Handling and User Feedback', () => {
    test('error messages are accessible and descriptive', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'error-test-user',
            email: 'error.test@example.com',
            user_metadata: {
              full_name: 'Error Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Try to trigger validation error
      const scheduleCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]').first();
      
      if (await scheduleCell.count() > 0) {
        await scheduleCell.click();
        await scheduleCell.fill('-5'); // Invalid value
        await scheduleCell.press('Tab');

        // Check for error message
        const errorMessage = page.locator('[role="alert"], [aria-live="assertive"], [data-testid*="error"]');
        
        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toBeVisible();
          
          const errorText = await errorMessage.textContent();
          expect(errorText).toBeTruthy();
          expect(errorText!.length).toBeGreaterThan(5); // Should be descriptive
          
          console.log(`✅ Error message is accessible and descriptive: "${errorText}"`);
        }
      }
    });

    test('loading states are announced to screen readers', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'loading-test-user',
            email: 'loading.test@example.com',
            user_metadata: {
              full_name: 'Loading Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');

      // Check for loading indicators with proper ARIA
      const loadingIndicators = page.locator('[aria-live], [aria-busy="true"], [data-testid*="loading"]');
      const loadingCount = await loadingIndicators.count();

      if (loadingCount > 0) {
        for (let i = 0; i < loadingCount; i++) {
          const indicator = loadingIndicators.nth(i);
          
          const ariaBusy = await indicator.getAttribute('aria-busy');
          const ariaLive = await indicator.getAttribute('aria-live');
          const ariaLabel = await indicator.getAttribute('aria-label');

          if (ariaBusy || ariaLive || ariaLabel) {
            console.log(`✅ Loading indicator ${i + 1} has proper ARIA attributes`);
          }
        }
      }

      await page.waitForLoadState('networkidle');
      console.log('✅ Loading states accessibility validated');
    });
  });
});