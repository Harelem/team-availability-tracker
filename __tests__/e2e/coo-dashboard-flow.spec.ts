/**
 * E2E Tests - COO Dashboard Flow
 * Complete executive user journey for company-wide management
 */

import { test, expect, Page } from '@playwright/test';

test.describe('COO Dashboard Flow - Nir Shilo', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication for COO
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        user: {
          id: 'coo-1',
          email: 'nir.shilo@example.com',
          user_metadata: {
            full_name: 'Nir Shilo',
            team: 'Executive',
            role: 'coo'
          }
        }
      }));
    });

    await page.goto('/coo-dashboard');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('COO can access and navigate dashboard', async () => {
    // Wait for COO dashboard to load
    await expect(page.locator('h1')).toContainText('COO Dashboard');
    
    // Should see COO-specific header
    await expect(page.locator('[data-testid="coo-header"]')).toContainText('Chief Operating Officer');
    
    // Should see main navigation tabs
    await expect(page.locator('[data-testid="tab-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-sprints"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-daily"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-teams"]')).toBeVisible();
    
    // Test navigation between tabs
    await page.locator('[data-testid="tab-sprints"]').click();
    await expect(page.locator('[data-testid="sprint-management-panel"]')).toBeVisible();
    
    await page.locator('[data-testid="tab-daily"]').click();
    await expect(page.locator('[data-testid="daily-status-panel"]')).toBeVisible();
  });

  test('COO can view company-wide metrics', async () => {
    // Should start on metrics tab
    await expect(page.locator('[data-testid="company-metrics-dashboard"]')).toBeVisible();
    
    // Check for key company metrics
    await expect(page.locator('[data-testid="total-company-hours"]')).toBeVisible();
    await expect(page.locator('[data-testid="overall-utilization"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-count-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-employees-count"]')).toBeVisible();
    
    // Should see team breakdown
    await expect(page.locator('[data-testid="team-utilization-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-comparison-table"]')).toBeVisible();
    
    // Check for all teams
    const teams = ['Development-Tal', 'Development-Itai', 'Infrastructure', 'Data', 'Product'];
    for (const team of teams) {
      await expect(page.locator(`[data-testid="team-metric-${team}"]`)).toBeVisible();
    }
    
    // Test metric drill-down
    await page.locator('[data-testid="team-metric-Development-Tal"]').click();
    await expect(page.locator('[data-testid="team-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-detail-modal"]')).toContainText('Development-Tal');
  });

  test('COO can manage sprints company-wide', async () => {
    // Navigate to sprint management
    await page.locator('[data-testid="tab-sprints"]').click();
    await expect(page.locator('[data-testid="sprint-management-panel"]')).toBeVisible();
    
    // Should see current sprint information
    await expect(page.locator('[data-testid="current-sprint-info"]')).toBeVisible();
    
    // Should see sprint creation form
    await expect(page.locator('[data-testid="create-sprint-form"]')).toBeVisible();
    
    // Create new sprint
    await page.locator('[data-testid="sprint-name-input"]').fill('Sprint Q1-2024-1');
    await page.locator('[data-testid="sprint-start-date"]').fill('2024-02-01');
    await page.locator('[data-testid="sprint-end-date"]').fill('2024-02-14');
    await page.locator('[data-testid="sprint-length-weeks"]').fill('2');
    await page.locator('[data-testid="sprint-description"]').fill('Q1 2024 Sprint 1 - Company-wide focus');
    
    // Save sprint
    await page.locator('[data-testid="save-sprint"]').click();
    
    // Should see success confirmation
    await expect(page.locator('[data-testid="sprint-created-success"]')).toBeVisible();
    
    // New sprint should appear in sprint history
    await expect(page.locator('[data-testid="sprint-history"]')).toContainText('Sprint Q1-2024-1');
    
    // Test sprint editing
    await page.locator('[data-testid="edit-sprint-Sprint Q1-2024-1"]').click();
    await expect(page.locator('[data-testid="edit-sprint-modal"]')).toBeVisible();
    
    // Update description
    await page.locator('[data-testid="edit-sprint-description"]').fill('Updated: Q1 2024 Sprint 1 - Enhanced focus');
    await page.locator('[data-testid="save-sprint-changes"]').click();
    
    // Should see updated sprint
    await expect(page.locator('[data-testid="sprint-history"]')).toContainText('Enhanced focus');
  });

  test('COO can view daily company status', async () => {
    // Navigate to daily status
    await page.locator('[data-testid="tab-daily"]').click();
    await expect(page.locator('[data-testid="daily-status-panel"]')).toBeVisible();
    
    // Should see today's date
    await expect(page.locator('[data-testid="status-date"]')).toContainText('Today');
    
    // Should see company-wide attendance summary
    await expect(page.locator('[data-testid="company-attendance-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-present-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-absent-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="attendance-percentage"]')).toBeVisible();
    
    // Should see team-by-team breakdown
    await expect(page.locator('[data-testid="team-daily-breakdown"]')).toBeVisible();
    
    // Test expanding team details
    await page.locator('[data-testid="expand-team-Development-Tal"]').click();
    await expect(page.locator('[data-testid="team-members-Development-Tal"]')).toBeVisible();
    
    // Should see individual member status
    await expect(page.locator('[data-testid="member-status-list"]')).toBeVisible();
    
    // Test date navigation
    await page.locator('[data-testid="prev-day-button"]').click();
    await expect(page.locator('[data-testid="status-date"]')).toContainText('Yesterday');
    
    await page.locator('[data-testid="next-day-button"]').click();
    await expect(page.locator('[data-testid="status-date"]')).toContainText('Today');
  });

  test('COO can export company-wide reports', async () => {
    // From metrics tab, access export
    await expect(page.locator('[data-testid="company-metrics-dashboard"]')).toBeVisible();
    
    // Click main export button
    await page.locator('[data-testid="export-company-data"]').click();
    
    // Should show comprehensive export modal
    await expect(page.locator('[data-testid="coo-export-modal"]')).toBeVisible();
    
    // Should see COO-specific export options
    await expect(page.locator('[data-testid="export-all-teams"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-executive-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-cross-team-analytics"]')).toBeVisible();
    
    // Configure comprehensive export
    await page.locator('[data-testid="export-all-teams"]').check();
    await page.locator('[data-testid="export-executive-summary"]').check();
    await page.locator('[data-testid="date-range-quarter"]').check();
    await page.locator('[data-testid="format-excel-advanced"]').check();
    
    // Start export
    const [executiveDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="start-coo-export"]').click()
    ]);
    
    // Verify executive-level export
    expect(executiveDownload.suggestedFilename()).toContain('Executive_Report_');
    expect(executiveDownload.suggestedFilename()).toContain('.xlsx');
    
    // Should show export progress for large dataset
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
  });

  test('COO can view cross-team analytics and comparisons', async () => {
    // Navigate to advanced analytics
    await page.locator('[data-testid="advanced-analytics"]').click();
    
    // Should show cross-team comparison dashboard
    await expect(page.locator('[data-testid="cross-team-analytics"]')).toBeVisible();
    
    // Check for key comparison metrics
    await expect(page.locator('[data-testid="team-performance-ranking"]')).toBeVisible();
    await expect(page.locator('[data-testid="utilization-comparison-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="capacity-planning-insights"]')).toBeVisible();
    
    // Test team comparison filters
    await page.locator('[data-testid="compare-teams-selector"]').click();
    await page.locator('[data-testid="select-Development-Tal"]').check();
    await page.locator('[data-testid="select-Infrastructure"]').check();
    await page.locator('[data-testid="apply-comparison"]').click();
    
    // Should show focused comparison
    await expect(page.locator('[data-testid="comparison-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="comparison-results"]')).toContainText('Development-Tal');
    await expect(page.locator('[data-testid="comparison-results"]')).toContainText('Infrastructure');
    
    // Test time period analysis
    await page.locator('[data-testid="time-period-selector"]').click();
    await page.locator('[data-testid="period-last-quarter"]').click();
    
    // Should update analytics
    await expect(page.locator('[data-testid="analytics-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-loading"]')).not.toBeVisible({ timeout: 10000 });
  });

  test('COO can manage global settings and policies', async () => {
    // Access global settings
    await page.locator('[data-testid="global-settings"]').click();
    
    // Should show company-wide settings panel
    await expect(page.locator('[data-testid="global-settings-panel"]')).toBeVisible();
    
    // Test sprint settings
    await page.locator('[data-testid="global-sprint-settings"]').click();
    await expect(page.locator('[data-testid="sprint-config-panel"]')).toBeVisible();
    
    // Update global sprint length
    await page.locator('[data-testid="default-sprint-length"]').fill('3');
    await page.locator('[data-testid="company-target-capacity"]').fill('0.85');
    
    // Save global sprint settings
    await page.locator('[data-testid="save-sprint-settings"]').click();
    await expect(page.locator('[data-testid="sprint-settings-saved"]')).toBeVisible();
    
    // Test notification policies
    await page.locator('[data-testid="notification-policies"]').click();
    await page.locator('[data-testid="enable-executive-alerts"]').check();
    await page.locator('[data-testid="alert-threshold"]').fill('75'); // Alert below 75% utilization
    
    // Save notification settings
    await page.locator('[data-testid="save-notification-policies"]').click();
    await expect(page.locator('[data-testid="policies-updated"]')).toBeVisible();
  });

  test('COO receives executive-level alerts and notifications', async () => {
    // Should see executive notification center
    await expect(page.locator('[data-testid="executive-notifications"]')).toBeVisible();
    
    // Click notification center
    await page.locator('[data-testid="executive-notification-bell"]').click();
    
    // Should show executive notifications panel
    await expect(page.locator('[data-testid="executive-notifications-panel"]')).toBeVisible();
    
    // Should see different types of executive alerts
    await expect(page.locator('[data-testid="capacity-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-performance-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="sprint-completion-alert"]')).toBeVisible();
    
    // Test alert detail view
    await page.locator('[data-testid="capacity-alert"]').click();
    await expect(page.locator('[data-testid="alert-detail-modal"]')).toBeVisible();
    
    // Should show detailed alert information
    await expect(page.locator('[data-testid="alert-details"]')).toContainText('Capacity');
    await expect(page.locator('[data-testid="recommended-actions"]')).toBeVisible();
    
    // Test alert action
    await page.locator('[data-testid="take-action"]').click();
    await expect(page.locator('[data-testid="action-options"]')).toBeVisible();
  });

  test('COO can perform emergency interventions', async () => {
    // Mock emergency scenario
    await page.addInitScript(() => {
      window.mockEmergency = {
        type: 'low_capacity',
        team: 'Development-Tal',
        severity: 'high',
        details: 'Team capacity below 60% for current sprint'
      };
    });
    
    // Should see emergency alert
    await expect(page.locator('[data-testid="emergency-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-alert"]')).toHaveClass(/severity-high/);
    
    // Click emergency alert
    await page.locator('[data-testid="emergency-alert"]').click();
    
    // Should show emergency intervention panel
    await expect(page.locator('[data-testid="emergency-intervention"]')).toBeVisible();
    
    // Should see intervention options
    await expect(page.locator('[data-testid="intervention-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="reassign-resources"]')).toBeVisible();
    await expect(page.locator('[data-testid="extend-sprint"]')).toBeVisible();
    await expect(page.locator('[data-testid="escalate-issue"]')).toBeVisible();
    
    // Test resource reassignment
    await page.locator('[data-testid="reassign-resources"]').click();
    await expect(page.locator('[data-testid="resource-reassignment-modal"]')).toBeVisible();
    
    // Select source and target teams
    await page.locator('[data-testid="source-team"]').selectOption('Infrastructure');
    await page.locator('[data-testid="target-team"]').selectOption('Development-Tal');
    await page.locator('[data-testid="resource-count"]').fill('2');
    
    // Execute reassignment
    await page.locator('[data-testid="execute-reassignment"]').click();
    await expect(page.locator('[data-testid="intervention-success"]')).toBeVisible();
  });

  test.describe('Advanced COO Features', () => {
    test('COO can create custom dashboards', async () => {
      // Access dashboard customization
      await page.locator('[data-testid="customize-dashboard"]').click();
      
      // Should show dashboard builder
      await expect(page.locator('[data-testid="dashboard-builder"]')).toBeVisible();
      
      // Add custom widgets
      await page.locator('[data-testid="add-widget"]').click();
      await page.locator('[data-testid="widget-capacity-trend"]').click();
      
      await page.locator('[data-testid="add-widget"]').click();
      await page.locator('[data-testid="widget-team-comparison"]').click();
      
      // Configure widget settings
      const capacityWidget = page.locator('[data-testid="widget-capacity-trend"]');
      await capacityWidget.locator('[data-testid="widget-settings"]').click();
      await page.locator('[data-testid="time-range-6-months"]').check();
      await page.locator('[data-testid="apply-widget-settings"]').click();
      
      // Save custom dashboard
      await page.locator('[data-testid="save-custom-dashboard"]').click();
      await page.locator('[data-testid="dashboard-name"]').fill('Executive Overview Q1');
      await page.locator('[data-testid="confirm-save-dashboard"]').click();
      
      // Should see success message
      await expect(page.locator('[data-testid="dashboard-saved"]')).toBeVisible();
    });

    test('COO can set up automated reports', async () => {
      // Navigate to automated reports
      await page.locator('[data-testid="automated-reports"]').click();
      
      // Should show report automation panel
      await expect(page.locator('[data-testid="report-automation"]')).toBeVisible();
      
      // Create new automated report
      await page.locator('[data-testid="create-automated-report"]').click();
      
      // Configure report
      await page.locator('[data-testid="report-name"]').fill('Weekly Executive Summary');
      await page.locator('[data-testid="report-frequency"]').selectOption('weekly');
      await page.locator('[data-testid="report-recipients"]').fill('exec-team@example.com');
      
      // Select report content
      await page.locator('[data-testid="include-team-metrics"]').check();
      await page.locator('[data-testid="include-capacity-analysis"]').check();
      await page.locator('[data-testid="include-trend-analysis"]').check();
      
      // Schedule report
      await page.locator('[data-testid="schedule-day"]').selectOption('monday');
      await page.locator('[data-testid="schedule-time"]').fill('09:00');
      
      // Save automation
      await page.locator('[data-testid="save-report-automation"]').click();
      await expect(page.locator('[data-testid="automation-created"]')).toBeVisible();
      
      // Should see in automated reports list
      await expect(page.locator('[data-testid="automated-reports-list"]')).toContainText('Weekly Executive Summary');
    });
  });

  test.describe('COO Mobile Experience', () => {
    test('COO can access dashboard on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should see mobile COO dashboard
      await expect(page.locator('[data-testid="mobile-coo-dashboard"]')).toBeVisible();
      
      // Test mobile navigation
      await page.locator('[data-testid="mobile-menu"]').tap();
      await expect(page.locator('[data-testid="mobile-nav-panel"]')).toBeVisible();
      
      // Navigate to mobile metrics
      await page.locator('[data-testid="mobile-nav-metrics"]').tap();
      await expect(page.locator('[data-testid="mobile-metrics-view"]')).toBeVisible();
      
      // Test mobile metric cards
      await expect(page.locator('[data-testid="mobile-metric-card"]')).toBeVisible();
      
      // Test swipe between metric cards
      await page.locator('[data-testid="metrics-carousel"]').swipe('left');
      // Should show next metric card
    });

    test('COO can handle emergencies on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Mock mobile emergency notification
      await page.addInitScript(() => {
        window.mockMobileEmergency = true;
      });
      
      // Should see mobile emergency notification
      await expect(page.locator('[data-testid="mobile-emergency-alert"]')).toBeVisible();
      
      // Tap emergency alert
      await page.locator('[data-testid="mobile-emergency-alert"]').tap();
      
      // Should open mobile emergency panel
      await expect(page.locator('[data-testid="mobile-emergency-panel"]')).toBeVisible();
      
      // Test quick action buttons
      await expect(page.locator('[data-testid="mobile-quick-actions"]')).toBeVisible();
      
      // Test emergency call functionality
      await page.locator('[data-testid="emergency-call-manager"]').tap();
      // Should trigger call interface (mocked)
    });
  });

  test.describe('COO Performance and Reliability', () => {
    test('COO dashboard handles large datasets efficiently', async () => {
      // Mock large company dataset
      await page.addInitScript(() => {
        window.mockLargeDataset = {
          teams: 20,
          members: 500,
          scheduleEntries: 50000
        };
      });
      
      const startTime = Date.now();
      
      // Navigate to comprehensive view
      await page.locator('[data-testid="view-all-data"]').click();
      
      // Should handle large dataset within reasonable time
      await expect(page.locator('[data-testid="large-dataset-view"]')).toBeVisible({ timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
      
      // Should show pagination or virtualization
      await expect(page.locator('[data-testid="data-pagination"]').or(page.locator('[data-testid="virtualized-list"]'))).toBeVisible();
    });

    test('COO dashboard maintains performance under concurrent usage', async () => {
      // Simulate concurrent operations
      const operations = [
        page.locator('[data-testid="refresh-metrics"]').click(),
        page.locator('[data-testid="load-analytics"]').click(),
        page.locator('[data-testid="fetch-daily-status"]').click()
      ];
      
      const startTime = Date.now();
      
      // Execute concurrent operations
      await Promise.all(operations);
      
      const completionTime = Date.now() - startTime;
      
      // Should handle concurrent operations efficiently
      expect(completionTime).toBeLessThan(5000);
      
      // All data should be loaded
      await expect(page.locator('[data-testid="metrics-loaded"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-loaded"]')).toBeVisible();
      await expect(page.locator('[data-testid="daily-status-loaded"]')).toBeVisible();
    });
  });
});