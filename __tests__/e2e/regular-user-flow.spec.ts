/**
 * E2E Tests - Regular User Flow
 * Complete user journey for regular team members
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Regular User Flow - Ido Keller', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication for test user
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        user: {
          id: '1',
          email: 'ido.keller@example.com',
          user_metadata: {
            full_name: 'Ido Keller',
            team: 'Development-Tal',
            role: 'member'
          }
        }
      }));
    });

    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Regular user can set availability for current week', async () => {
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Welcome, Ido Keller');
    
    // Should see own team (Development-Tal)
    await expect(page.locator('[data-testid="team-info"]')).toContainText('Development-Tal');
    
    // Find schedule table
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    
    // Set availability for today (full day)
    const todayCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
    await todayCell.click();
    await todayCell.fill('7');
    await todayCell.press('Tab');
    
    // Verify value is saved
    await expect(todayCell).toHaveValue('7');
    
    // Set half day with reason
    const halfDayCell = page.locator('[data-testid="schedule-cell-1-2024-01-18"]');
    await halfDayCell.click();
    await halfDayCell.fill('3.5');
    await halfDayCell.press('Tab');
    
    // Should show reason dialog
    await expect(page.locator('[data-testid="reason-dialog"]')).toBeVisible();
    
    // Enter reason
    await page.locator('[data-testid="reason-input"]').fill('Doctor appointment');
    await page.locator('[data-testid="save-reason"]').click();
    
    // Verify half day is saved with reason
    await expect(halfDayCell).toHaveValue('3.5');
    await expect(page.locator('[data-testid="reason-badge"]')).toContainText('Doctor appointment');
    
    // Set absence (X)
    const absenceCell = page.locator('[data-testid="schedule-cell-1-2024-01-19"]');
    await absenceCell.click();
    await absenceCell.fill('X');
    await absenceCell.press('Tab');
    
    // Should show absence reason dialog
    await expect(page.locator('[data-testid="absence-reason-dialog"]')).toBeVisible();
    
    // Select sick leave
    await page.locator('[data-testid="absence-reason-sick"]').click();
    await page.locator('[data-testid="save-absence-reason"]').click();
    
    // Verify absence is saved
    await expect(absenceCell).toHaveValue('0');
    await expect(page.locator('[data-testid="absence-indicator"]')).toContainText('Sick');
  });

  test('Regular user can navigate between weeks', async () => {
    // Wait for page load
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    
    // Check current week indicator
    await expect(page.locator('[data-testid="current-week-indicator"]')).toBeVisible();
    
    // Navigate to previous week
    await page.locator('[data-testid="prev-week-button"]').click();
    
    // Should show previous week dates
    await expect(page.locator('[data-testid="week-header"]')).toContainText('Jan 08 - Jan 12, 2024');
    
    // Navigate to next week (back to current)
    await page.locator('[data-testid="next-week-button"]').click();
    
    // Should return to current week
    await expect(page.locator('[data-testid="week-header"]')).toContainText('Jan 15 - Jan 19, 2024');
    
    // Jump to current week button
    await page.locator('[data-testid="current-week-button"]').click();
    await expect(page.locator('[data-testid="current-week-indicator"]')).toBeVisible();
  });

  test('Regular user data persists across sessions', async () => {
    // Set some schedule data
    const testCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
    await testCell.click();
    await testCell.fill('6');
    await testCell.press('Tab');
    
    // Wait for save indicator
    await expect(page.locator('[data-testid="save-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-indicator"]')).not.toBeVisible({ timeout: 5000 });
    
    // Reload page
    await page.reload();
    
    // Wait for page to load
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    
    // Verify data persisted
    await expect(testCell).toHaveValue('6');
  });

  test('Regular user cannot edit other users data', async () => {
    // Wait for page load
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    
    // Try to find cells for other team members
    const otherUserCell = page.locator('[data-testid="schedule-cell-2-2024-01-17"]');
    
    // If other user cell exists, it should be disabled
    if (await otherUserCell.count() > 0) {
      await expect(otherUserCell).toBeDisabled();
    }
    
    // Should not see team management controls
    await expect(page.locator('[data-testid="add-team-member"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="team-management-panel"]')).not.toBeVisible();
  });

  test('Regular user can view personal statistics', async () => {
    // Should see personal stats card
    await expect(page.locator('[data-testid="personal-stats-card"]')).toBeVisible();
    
    // Check for key metrics
    await expect(page.locator('[data-testid="hours-this-week"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-percentage"]')).toBeVisible();
    
    // Personal completion status
    await expect(page.locator('[data-testid="personal-completion"]')).toBeVisible();
  });

  test('Regular user receives real-time updates', async () => {
    // Wait for page load
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    
    // Should see real-time indicator
    await expect(page.locator('[data-testid="realtime-status"]')).toContainText('Connected');
    
    // Mock a real-time update (this would normally come from another user)
    await page.evaluate(() => {
      // Simulate receiving a real-time update
      window.dispatchEvent(new CustomEvent('schedule-update', {
        detail: {
          userId: 2,
          date: '2024-01-17',
          value: 7
        }
      }));
    });
    
    // Should see update indicator briefly
    await expect(page.locator('[data-testid="update-indicator"]')).toBeVisible();
  });

  test.describe('Mobile Experience', () => {
    test('Regular user can manage schedule on mobile', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Wait for page load
      await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
      
      // Should show mobile-optimized interface
      await expect(page.locator('[data-testid="mobile-schedule-view"]')).toBeVisible();
      
      // Test mobile schedule editing
      const mobileCell = page.locator('[data-testid="mobile-schedule-cell-1-2024-01-17"]');
      await mobileCell.tap();
      
      // Should open mobile input sheet
      await expect(page.locator('[data-testid="mobile-input-sheet"]')).toBeVisible();
      
      // Select hours option
      await page.locator('[data-testid="hours-option-7"]').tap();
      await page.locator('[data-testid="save-mobile-entry"]').tap();
      
      // Verify mobile save
      await expect(mobileCell).toContainText('7');
    });

    test('Mobile navigation works correctly', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should have mobile navigation
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      
      // Test hamburger menu
      await page.locator('[data-testid="mobile-menu-button"]').tap();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Test swipe navigation
      await page.locator('[data-testid="schedule-container"]').swipe('left');
      
      // Should navigate to next week
      await expect(page.locator('[data-testid="week-header"]')).toContainText('Jan 22 - Jan 26, 2024');
    });
  });

  test.describe('Error Handling', () => {
    test('Regular user sees appropriate error messages', async () => {
      // Mock network error
      await page.route('**/schedule_entries', route => route.abort());
      
      // Try to make a schedule update
      const testCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
      await testCell.click();
      await testCell.fill('7');
      await testCell.press('Tab');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to save');
      
      // Should show retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('Regular user handles validation errors gracefully', async () => {
      // Try to enter invalid hours value
      const testCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
      await testCell.click();
      await testCell.fill('10'); // Invalid - too high
      await testCell.press('Tab');
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('Invalid hours value');
      
      // Should revert to previous value or empty
      await expect(testCell).not.toHaveValue('10');
    });
  });

  test.describe('Accessibility', () => {
    test('Regular user interface is accessible', async () => {
      // Check for skip links
      await expect(page.locator('[data-testid="skip-to-content"]')).toBeVisible();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test ARIA labels
      const scheduleTable = page.locator('[data-testid="schedule-table"]');
      await expect(scheduleTable).toHaveAttribute('role', 'table');
      await expect(scheduleTable).toHaveAttribute('aria-label');
      
      // Test screen reader announcements
      const testCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
      await testCell.click();
      await testCell.fill('7');
      await testCell.press('Tab');
      
      // Should have ARIA live region for announcements
      await expect(page.locator('[data-testid="sr-announcements"]')).toHaveAttribute('aria-live', 'polite');
    });

    test('High contrast mode works correctly', async () => {
      // Enable high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      
      // Wait for page load
      await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
      
      // Check contrast compliance
      const scheduleCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
      
      // Verify high contrast styles applied
      const styles = await scheduleCell.evaluate(el => getComputedStyle(el));
      expect(styles.borderColor).not.toBe('rgb(0, 0, 0)'); // Should have visible border
    });
  });
});