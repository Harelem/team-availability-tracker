/**
 * E2E Tests - Manager Flow
 * Complete user journey for team managers
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Manager Flow - Amit Tzriker', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication for manager
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        user: {
          id: '2',
          email: 'amit.tzriker@example.com',
          user_metadata: {
            full_name: 'Amit Tzriker',
            team: 'Infrastructure',
            role: 'manager'
          }
        }
      }));
    });

    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Manager can edit multiple team members schedules', async () => {
    // Wait for manager dashboard to load
    await expect(page.locator('h1')).toContainText('Welcome, Amit Tzriker');
    
    // Should see team management interface
    await expect(page.locator('[data-testid="manager-dashboard"]')).toBeVisible();
    
    // Should see all Infrastructure team members
    await expect(page.locator('[data-testid="team-member-list"]')).toBeVisible();
    
    // Edit first team member's schedule
    const member1Cell = page.locator('[data-testid="schedule-cell-3-2024-01-17"]');
    await member1Cell.click();
    await member1Cell.fill('7');
    await member1Cell.press('Tab');
    
    // Should save successfully
    await expect(page.locator('[data-testid="save-indicator"]')).toBeVisible();
    
    // Edit second team member's schedule
    const member2Cell = page.locator('[data-testid="schedule-cell-4-2024-01-17"]');
    await member2Cell.click();
    await member2Cell.fill('3.5');
    await member2Cell.press('Tab');
    
    // Should show reason dialog for half day
    await expect(page.locator('[data-testid="reason-dialog"]')).toBeVisible();
    await page.locator('[data-testid="reason-input"]').fill('Client meeting');
    await page.locator('[data-testid="save-reason"]').click();
    
    // Verify both changes saved
    await expect(member1Cell).toHaveValue('7');
    await expect(member2Cell).toHaveValue('3.5');
  });

  test('Manager can add and manage team members', async () => {
    // Wait for page load
    await expect(page.locator('[data-testid="manager-dashboard"]')).toBeVisible();
    
    // Click add team member button
    await page.locator('[data-testid="add-team-member"]').click();
    
    // Should show add member modal
    await expect(page.locator('[data-testid="add-member-modal"]')).toBeVisible();
    
    // Fill in new member details
    await page.locator('[data-testid="member-name-input"]').fill('New Team Member');
    await page.locator('[data-testid="member-email-input"]').fill('new.member@example.com');
    await page.locator('[data-testid="member-role-select"]').selectOption('member');
    
    // Save new member
    await page.locator('[data-testid="save-new-member"]').click();
    
    // Should see success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Team member added successfully');
    
    // New member should appear in team list
    await expect(page.locator('[data-testid="team-member-list"]')).toContainText('New Team Member');
    
    // Test editing existing member
    const memberRow = page.locator('[data-testid="member-row-new-team-member"]');
    await memberRow.locator('[data-testid="edit-member"]').click();
    
    // Should show edit modal
    await expect(page.locator('[data-testid="edit-member-modal"]')).toBeVisible();
    
    // Update member role
    await page.locator('[data-testid="member-role-select"]').selectOption('senior');
    await page.locator('[data-testid="save-member-changes"]').click();
    
    // Should see updated role
    await expect(memberRow).toContainText('Senior');
  });

  test('Manager can export team data', async () => {
    // Wait for manager dashboard
    await expect(page.locator('[data-testid="manager-dashboard"]')).toBeVisible();
    
    // Click export button
    await page.locator('[data-testid="export-team-data"]').click();
    
    // Should show export modal
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
    
    // Select export options
    await page.locator('[data-testid="date-range-current-sprint"]').check();
    await page.locator('[data-testid="format-excel"]').check();
    await page.locator('[data-testid="include-analytics"]').check();
    
    // Start export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="export-button"]').click()
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('Infrastructure_Team_');
    expect(download.suggestedFilename()).toContain('.xlsx');
    
    // Should show export success
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
  });

  test('Manager can view team completion status', async () => {
    // Wait for dashboard load
    await expect(page.locator('[data-testid="manager-dashboard"]')).toBeVisible();
    
    // Should see team completion overview
    await expect(page.locator('[data-testid="team-completion-overview"]')).toBeVisible();
    
    // Check for completion metrics
    await expect(page.locator('[data-testid="team-completion-percentage"]')).toBeVisible();
    await expect(page.locator('[data-testid="hours-submitted"]')).toBeVisible();
    await expect(page.locator('[data-testid="hours-remaining"]')).toBeVisible();
    
    // Click on detailed view
    await page.locator('[data-testid="view-team-details"]').click();
    
    // Should show team detail modal
    await expect(page.locator('[data-testid="team-detail-modal"]')).toBeVisible();
    
    // Should see individual member completion status
    await expect(page.locator('[data-testid="member-completion-list"]')).toBeVisible();
    
    // Check for member-specific metrics
    const memberRows = page.locator('[data-testid="member-completion-row"]');
    await expect(memberRows.first()).toBeVisible();
    await expect(memberRows.first()).toContainText('%'); // Completion percentage
  });

  test('Manager can set team-wide policies', async () => {
    // Navigate to team settings
    await page.locator('[data-testid="team-settings"]').click();
    
    // Should show team settings panel
    await expect(page.locator('[data-testid="team-settings-panel"]')).toBeVisible();
    
    // Set working hours policy
    await page.locator('[data-testid="default-hours-setting"]').fill('8');
    
    // Set absence approval requirement
    await page.locator('[data-testid="require-absence-approval"]').check();
    
    // Set notification preferences
    await page.locator('[data-testid="notify-late-submissions"]').check();
    await page.locator('[data-testid="notification-threshold"]').fill('2'); // 2 days
    
    // Save settings
    await page.locator('[data-testid="save-team-settings"]').click();
    
    // Should see success message
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
  });

  test('Manager can approve absence requests', async () => {
    // Mock pending absence requests
    await page.addInitScript(() => {
      window.mockData = {
        pendingAbsences: [
          {
            id: 1,
            memberName: 'Team Member 1',
            date: '2024-01-20',
            reason: 'Vacation',
            status: 'pending'
          }
        ]
      };
    });
    
    // Navigate to absence management
    await page.locator('[data-testid="manage-absences"]').click();
    
    // Should show pending requests
    await expect(page.locator('[data-testid="pending-absences"]')).toBeVisible();
    
    // Should see the pending request
    const absenceRow = page.locator('[data-testid="absence-request-1"]');
    await expect(absenceRow).toContainText('Team Member 1');
    await expect(absenceRow).toContainText('Vacation');
    
    // Approve the request
    await absenceRow.locator('[data-testid="approve-absence"]').click();
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="approve-confirmation"]')).toBeVisible();
    await page.locator('[data-testid="confirm-approval"]').click();
    
    // Should see success message
    await expect(page.locator('[data-testid="absence-approved"]')).toBeVisible();
    
    // Request should move to approved list
    await expect(page.locator('[data-testid="approved-absences"]')).toContainText('Team Member 1');
  });

  test('Manager can view team analytics and insights', async () => {
    // Navigate to team analytics
    await page.locator('[data-testid="team-analytics"]').click();
    
    // Should show analytics dashboard
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
    
    // Check for key analytics widgets
    await expect(page.locator('[data-testid="utilization-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="trends-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="member-performance-table"]')).toBeVisible();
    
    // Test date range selection
    await page.locator('[data-testid="analytics-date-range"]').click();
    await page.locator('[data-testid="last-month"]').click();
    
    // Charts should update
    await expect(page.locator('[data-testid="analytics-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-loading"]')).not.toBeVisible({ timeout: 5000 });
    
    // Test export analytics
    await page.locator('[data-testid="export-analytics"]').click();
    
    const [analyticsDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="export-analytics-confirm"]').click()
    ]);
    
    expect(analyticsDownload.suggestedFilename()).toContain('Analytics_');
  });

  test('Manager receives notifications for team activities', async () => {
    // Should see notification center
    await expect(page.locator('[data-testid="notification-center"]')).toBeVisible();
    
    // Click notification bell
    await page.locator('[data-testid="notification-bell"]').click();
    
    // Should show notifications panel
    await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    
    // Should see various notification types
    await expect(page.locator('[data-testid="late-submission-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="absence-request-notification"]')).toBeVisible();
    
    // Test marking notification as read
    const notification = page.locator('[data-testid="notification-item"]').first();
    await notification.locator('[data-testid="mark-read"]').click();
    
    // Notification should be marked as read
    await expect(notification).toHaveClass(/read/);
  });

  test.describe('Bulk Operations', () => {
    test('Manager can perform bulk schedule updates', async () => {
      // Wait for dashboard
      await expect(page.locator('[data-testid="manager-dashboard"]')).toBeVisible();
      
      // Select multiple team members
      await page.locator('[data-testid="select-member-3"]').check();
      await page.locator('[data-testid="select-member-4"]').check();
      await page.locator('[data-testid="select-member-5"]').check();
      
      // Should see bulk actions toolbar
      await expect(page.locator('[data-testid="bulk-actions-toolbar"]')).toBeVisible();
      
      // Click bulk update
      await page.locator('[data-testid="bulk-update-schedule"]').click();
      
      // Should show bulk update modal
      await expect(page.locator('[data-testid="bulk-update-modal"]')).toBeVisible();
      
      // Set bulk values for date range
      await page.locator('[data-testid="bulk-start-date"]').fill('2024-01-17');
      await page.locator('[data-testid="bulk-end-date"]').fill('2024-01-19');
      await page.locator('[data-testid="bulk-hours-value"]').fill('7');
      
      // Apply bulk update
      await page.locator('[data-testid="apply-bulk-update"]').click();
      
      // Should see confirmation
      await expect(page.locator('[data-testid="bulk-update-success"]')).toBeVisible();
      
      // Verify updates applied
      await expect(page.locator('[data-testid="schedule-cell-3-2024-01-17"]')).toHaveValue('7');
      await expect(page.locator('[data-testid="schedule-cell-4-2024-01-17"]')).toHaveValue('7');
    });

    test('Manager can bulk export team member data', async () => {
      // Select multiple members
      await page.locator('[data-testid="select-all-members"]').check();
      
      // Should see bulk export option
      await page.locator('[data-testid="bulk-export"]').click();
      
      // Should show bulk export modal
      await expect(page.locator('[data-testid="bulk-export-modal"]')).toBeVisible();
      
      // Configure export
      await page.locator('[data-testid="export-format-csv"]').check();
      await page.locator('[data-testid="include-member-details"]').check();
      
      // Start bulk export
      const [bulkDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('[data-testid="start-bulk-export"]').click()
      ]);
      
      expect(bulkDownload.suggestedFilename()).toContain('Bulk_Export_');
    });
  });

  test.describe('Manager Mobile Experience', () => {
    test('Manager can manage team on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should see mobile manager interface
      await expect(page.locator('[data-testid="mobile-manager-dashboard"]')).toBeVisible();
      
      // Test mobile team member list
      await expect(page.locator('[data-testid="mobile-team-list"]')).toBeVisible();
      
      // Test mobile team member editing
      const mobileEditButton = page.locator('[data-testid="mobile-edit-member-3"]');
      await mobileEditButton.tap();
      
      // Should open mobile edit sheet
      await expect(page.locator('[data-testid="mobile-edit-sheet"]')).toBeVisible();
      
      // Edit schedule on mobile
      await page.locator('[data-testid="mobile-hours-input"]').fill('6');
      await page.locator('[data-testid="mobile-save-edit"]').tap();
      
      // Should see success indication
      await expect(page.locator('[data-testid="mobile-edit-success"]')).toBeVisible();
    });

    test('Mobile manager notifications work correctly', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test mobile notifications
      await page.locator('[data-testid="mobile-notification-icon"]').tap();
      
      // Should show mobile notifications panel
      await expect(page.locator('[data-testid="mobile-notifications-panel"]')).toBeVisible();
      
      // Test notification interaction on mobile
      const mobileNotification = page.locator('[data-testid="mobile-notification-item"]').first();
      await mobileNotification.swipe('left');
      
      // Should show notification actions
      await expect(page.locator('[data-testid="notification-actions"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Manager handles permission errors gracefully', async () => {
      // Mock permission denied error
      await page.route('**/team_members', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Permission denied' })
        });
      });
      
      // Try to add team member
      await page.locator('[data-testid="add-team-member"]').click();
      
      // Should show permission error
      await expect(page.locator('[data-testid="permission-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="permission-error"]')).toContainText('Permission denied');
    });

    test('Manager handles bulk operation failures', async () => {
      // Select multiple members
      await page.locator('[data-testid="select-member-3"]').check();
      await page.locator('[data-testid="select-member-4"]').check();
      
      // Mock bulk operation failure
      await page.route('**/bulk-update', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Bulk operation failed' })
        });
      });
      
      // Try bulk update
      await page.locator('[data-testid="bulk-update-schedule"]').click();
      await page.locator('[data-testid="bulk-hours-value"]').fill('7');
      await page.locator('[data-testid="apply-bulk-update"]').click();
      
      // Should show appropriate error handling
      await expect(page.locator('[data-testid="bulk-operation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-bulk-operation"]')).toBeVisible();
    });
  });
});