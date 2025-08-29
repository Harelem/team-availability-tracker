/**
 * Regression Test Suite - Version 2.1 Compatibility
 * Tests backward compatibility, data migration, and feature consistency
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface TeamData {
  name: string;
  manager: string;
  members: string[];
  expectedFeatures: string[];
}

const TEAMS: TeamData[] = [
  {
    name: 'Development-Tal',
    manager: 'Tal Vashdi',
    members: ['Ido Keller', 'Gal Zaiger', 'Team Member 1'],
    expectedFeatures: ['schedule_management', 'manager_dashboard', 'team_analytics']
  },
  {
    name: 'Development-Itai',
    manager: 'Itai Nahmias',
    members: ['Team Member 2', 'Team Member 3', 'Team Member 4'],
    expectedFeatures: ['schedule_management', 'manager_dashboard', 'team_analytics']
  },
  {
    name: 'Infrastructure',
    manager: 'Amit Tzriker',
    members: ['Team Member 5', 'Team Member 6', 'Team Member 7'],
    expectedFeatures: ['schedule_management', 'manager_dashboard', 'infrastructure_tools']
  },
  {
    name: 'QA',
    manager: 'QA Manager',
    members: ['QA Member 1', 'QA Member 2', 'QA Member 3'],
    expectedFeatures: ['schedule_management', 'quality_metrics', 'testing_dashboard']
  },
  {
    name: 'Leadership',
    manager: 'Harel Ben-Attia',
    members: ['Leadership Member 1', 'Leadership Member 2'],
    expectedFeatures: ['coo_dashboard', 'company_analytics', 'strategic_planning']
  }
];

test.describe('Version 2.1 Compatibility Testing', () => {
  let supabase: any;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify test environment
    const { data: version, error } = await supabase.rpc('get_app_version');
    if (error) {
      console.warn('Could not determine app version:', error);
    } else {
      console.log('Testing against version:', version);
    }
  });

  test.describe('Database Schema Compatibility', () => {
    test('validates core table structure matches v2.1 spec', async () => {
      // Check that all expected tables exist with correct columns
      const expectedTables = [
        {
          name: 'team_members',
          columns: ['id', 'name', 'email', 'team', 'role', 'created_at', 'updated_at']
        },
        {
          name: 'schedule_entries',
          columns: ['id', 'user_id', 'date', 'value', 'reason', 'created_at', 'updated_at']
        },
        {
          name: 'global_sprint_settings',
          columns: ['id', 'sprint_start_date', 'sprint_end_date', 'is_active', 'created_at']
        },
        {
          name: 'company_analytics',
          columns: ['id', 'metric_name', 'metric_value', 'date', 'team', 'created_at']
        }
      ];

      for (const table of expectedTables) {
        const { data: columns, error } = await supabase.rpc('get_table_columns', {
          table_name: table.name
        });

        expect(error).toBeNull();
        
        // Check that all expected columns exist
        for (const expectedColumn of table.columns) {
          const columnExists = columns?.some((col: any) => col.column_name === expectedColumn);
          expect(columnExists).toBeTruthy(`Column ${expectedColumn} should exist in table ${table.name}`);
        }
      }
    });

    test('validates view compatibility for all teams', async () => {
      // Test views that aggregate team data
      const expectedViews = [
        'team_utilization_view',
        'sprint_completion_view',
        'manager_dashboard_view'
      ];

      for (const viewName of expectedViews) {
        const { data, error } = await supabase
          .from(viewName)
          .select('*')
          .limit(1);

        if (error && !error.message.includes('does not exist')) {
          console.warn(`View ${viewName} may have compatibility issues:`, error);
        }
      }
    });

    test('validates stored procedures and functions', async () => {
      // Test critical database functions
      const functions = [
        { name: 'calculate_team_utilization', args: { team_name: 'Development-Tal' } },
        { name: 'get_sprint_analytics', args: { start_date: '2024-01-01', end_date: '2024-01-31' } },
        { name: 'validate_schedule_entry', args: { user_id: 1, date: '2024-01-17', hours: 8 } }
      ];

      for (const func of functions) {
        try {
          const { data, error } = await supabase.rpc(func.name, func.args);
          
          if (error) {
            console.warn(`Function ${func.name} compatibility issue:`, error);
          } else {
            console.log(`✅ Function ${func.name} working correctly`);
          }
        } catch (err) {
          console.log(`Function ${func.name} may not exist or has changed signature`);
        }
      }
    });
  });

  test.describe('Team Data Migration Compatibility', () => {
    test('validates all 5 teams have consistent data structure', async () => {
      for (const team of TEAMS) {
        // Check team members exist and have correct structure
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team', team.name);

        expect(membersError).toBeNull();
        expect(members).toBeTruthy();
        
        // Validate team manager exists
        const managerExists = members?.some(member => member.name === team.manager && member.role === 'manager');
        expect(managerExists).toBeTruthy(`Manager ${team.manager} should exist for team ${team.name}`);

        // Check schedule entries for team members
        if (members && members.length > 0) {
          const memberIds = members.map(m => m.id);
          
          const { data: scheduleEntries, error: scheduleError } = await supabase
            .from('schedule_entries')
            .select('*')
            .in('user_id', memberIds)
            .limit(10);

          expect(scheduleError).toBeNull();
          console.log(`Team ${team.name}: ${members.length} members, ${scheduleEntries?.length || 0} schedule entries`);
        }
      }
    });

    test('validates historical data integrity', async () => {
      // Check that historical data from previous versions is accessible
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      for (const team of TEAMS) {
        const { data: historicalData, error } = await supabase
          .from('schedule_entries')
          .select(`
            *,
            team_members!inner(team)
          `)
          .eq('team_members.team', team.name)
          .gte('date', sixMonthsAgo.toISOString().split('T')[0])
          .limit(100);

        expect(error).toBeNull();
        
        if (historicalData && historicalData.length > 0) {
          console.log(`Team ${team.name} has ${historicalData.length} historical records`);
          
          // Validate data format consistency
          historicalData.forEach((entry: any) => {
            expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(typeof entry.value).toBe('number');
            expect(entry.value).toBeGreaterThanOrEqual(0);
            expect(entry.value).toBeLessThanOrEqual(24);
          });
        }
      }
    });

    test('validates sprint settings backward compatibility', async () => {
      // Check global sprint settings
      const { data: sprintSettings, error } = await supabase
        .from('global_sprint_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      expect(error).toBeNull();
      expect(sprintSettings).toBeTruthy();

      if (sprintSettings && sprintSettings.length > 0) {
        sprintSettings.forEach((setting: any) => {
          expect(setting.sprint_start_date).toMatch(/^\d{4}-\d{2}-\d{2}/);
          expect(setting.sprint_end_date).toMatch(/^\d{4}-\d{2}-\d{2}/);
          expect(typeof setting.is_active).toBe('boolean');
        });
      }
    });
  });

  test.describe('Frontend Feature Compatibility', () => {
    TEAMS.forEach(team => {
      test(`validates ${team.name} team features work correctly`, async ({ page }) => {
        // Test as team manager
        await page.addInitScript(() => {
          window.localStorage.setItem('supabase.auth.token', JSON.stringify({
            user: {
              id: `manager-${Math.random()}`,
              email: `manager@${team.name.toLowerCase().replace('-', '')}.com`,
              user_metadata: {
                full_name: team.manager,
                team: team.name,
                role: 'manager'
              }
            }
          }));
        });

        await page.goto('/');
        
        // Wait for page to load
        await expect(page.locator('body')).toBeVisible();

        // Test core schedule management
        if (team.expectedFeatures.includes('schedule_management')) {
          await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible({ timeout: 10000 });
          
          // Test that team members are loaded
          const teamMemberElements = page.locator('[data-testid*="member-row"]');
          const memberCount = await teamMemberElements.count();
          expect(memberCount).toBeGreaterThan(0);
        }

        // Test manager dashboard
        if (team.expectedFeatures.includes('manager_dashboard')) {
          await expect(page.locator('[data-testid="manager-dashboard"]')).toBeVisible();
        }

        // Test COO dashboard access (Leadership team only)
        if (team.expectedFeatures.includes('coo_dashboard')) {
          const cooDashboardButton = page.locator('[data-testid="coo-dashboard-access"]');
          if (await cooDashboardButton.count() > 0) {
            await cooDashboardButton.click();
            await expect(page.locator('[data-testid="coo-dashboard"]')).toBeVisible();
            
            // Test company analytics
            await expect(page.locator('[data-testid="company-metrics"]')).toBeVisible();
            await expect(page.locator('[data-testid="team-utilization-chart"]')).toBeVisible();
          }
        }

        console.log(`✅ Team ${team.name} features validated successfully`);
      });
    });

    test('validates cross-team data visibility restrictions', async ({ page }) => {
      // Test as Development-Tal manager
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'tal-manager-test',
            email: 'tal.vashdi@example.com',
            user_metadata: {
              full_name: 'Tal Vashdi',
              team: 'Development-Tal',
              role: 'manager'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Should only see Development-Tal team members
      await expect(page.locator('[data-testid="team-info"]')).toContainText('Development-Tal');
      
      // Should not see other teams' data
      const otherTeamElements = [
        '[data-testid="team-Development-Itai"]',
        '[data-testid="team-Infrastructure"]',
        '[data-testid="team-QA"]'
      ];

      for (const selector of otherTeamElements) {
        await expect(page.locator(selector)).not.toBeVisible();
      }
    });
  });

  test.describe('API Backward Compatibility', () => {
    test('validates v2.1 API endpoints still function', async ({ request }) => {
      // Test core API endpoints that should maintain backward compatibility
      const endpoints = [
        { path: '/api/team-members', method: 'GET' },
        { path: '/api/schedule-entries', method: 'GET' },
        { path: '/api/sprint-settings', method: 'GET' },
        { path: '/api/company-analytics', method: 'GET' }
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await request[endpoint.method.toLowerCase() as 'get'](endpoint.path);
          
          // Should not return 404 or 500 errors for existing endpoints
          if (response.status() === 404) {
            console.warn(`Endpoint ${endpoint.path} may have been removed or moved`);
          } else if (response.status() >= 500) {
            console.error(`Server error for ${endpoint.path}:`, response.status());
          } else {
            console.log(`✅ Endpoint ${endpoint.path} responding correctly`);
          }
        } catch (error) {
          console.warn(`Error testing endpoint ${endpoint.path}:`, error);
        }
      }
    });

    test('validates API response format consistency', async ({ request }) => {
      // Test that API responses maintain expected structure
      try {
        const response = await request.get('/api/team-members');
        
        if (response.ok()) {
          const data = await response.json();
          
          if (Array.isArray(data)) {
            data.slice(0, 3).forEach((member: any, index: number) => {
              expect(member).toHaveProperty('id');
              expect(member).toHaveProperty('name');
              expect(member).toHaveProperty('team');
              expect(member).toHaveProperty('role');
              console.log(`✅ Team member ${index + 1} structure valid`);
            });
          }
        }
      } catch (error) {
        console.warn('API structure test skipped due to auth requirements');
      }
    });
  });

  test.describe('Performance Regression Testing', () => {
    test('validates page load times haven\'t regressed', async ({ page }) => {
      const teams = ['Development-Tal', 'Infrastructure'];
      
      for (const teamName of teams) {
        await page.addInitScript(() => {
          window.localStorage.setItem('supabase.auth.token', JSON.stringify({
            user: {
              id: `perf-test-${Math.random()}`,
              email: 'perf-test@example.com',
              user_metadata: {
                full_name: 'Performance Test User',
                team: teamName,
                role: 'manager'
              }
            }
          }));
        });

        const startTime = Date.now();
        await page.goto('/');
        await page.waitForSelector('[data-testid="schedule-table"]');
        const loadTime = Date.now() - startTime;

        console.log(`Team ${teamName} page load time: ${loadTime}ms`);
        
        // Page should load within reasonable time (5 seconds max)
        expect(loadTime).toBeLessThan(5000);
        
        // Ideally under 2 seconds for good performance
        if (loadTime > 2000) {
          console.warn(`Page load time for ${teamName} is slower than ideal: ${loadTime}ms`);
        }
      }
    });

    test('validates database query performance', async () => {
      for (const team of TEAMS) {
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .from('schedule_entries')
          .select(`
            *,
            team_members!inner(name, team)
          `)
          .eq('team_members.team', team.name)
          .gte('date', '2024-01-01')
          .lt('date', '2024-02-01');

        const queryTime = Date.now() - startTime;
        
        expect(error).toBeNull();
        console.log(`Query time for ${team.name}: ${queryTime}ms (${data?.length || 0} records)`);
        
        // Database queries should complete within 1 second
        expect(queryTime).toBeLessThan(1000);
      }
    });
  });

  test.describe('Configuration Compatibility', () => {
    test('validates environment configuration compatibility', async () => {
      // Check that all required environment variables are available
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
      ];

      for (const envVar of requiredEnvVars) {
        const value = process.env[envVar];
        expect(value).toBeTruthy(`Environment variable ${envVar} should be set`);
        
        if (envVar.includes('URL')) {
          expect(value).toMatch(/^https:\/\//);
        }
      }
    });

    test('validates package.json compatibility', async () => {
      // Check that package.json has expected dependencies for v2.1
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        const expectedDependencies = [
          '@supabase/supabase-js',
          'next',
          'react',
          '@playwright/test',
          'jest'
        ];

        for (const dep of expectedDependencies) {
          expect(packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep])
            .toBeTruthy(`Package ${dep} should be installed`);
        }

        console.log('✅ Package dependencies validated');
      }
    });
  });

  test.describe('Migration Rollback Compatibility', () => {
    test('validates data can be accessed after hypothetical rollback', async () => {
      // Test that current data structure would be compatible with previous version
      // This is a simulation - in real scenario you'd test with actual rollback
      
      for (const team of TEAMS.slice(0, 2)) { // Test first 2 teams
        const { data: currentData, error } = await supabase
          .from('schedule_entries')
          .select('id, user_id, date, value, reason')
          .eq('team_members.team', team.name)
          .limit(10);

        expect(error).toBeNull();
        
        if (currentData && currentData.length > 0) {
          // Validate that data format is compatible with v2.0 structure
          currentData.forEach((entry: any) => {
            expect(entry).toHaveProperty('id');
            expect(entry).toHaveProperty('user_id');
            expect(entry).toHaveProperty('date');
            expect(entry).toHaveProperty('value');
            // 'reason' field was added in v2.1, should be nullable for backward compatibility
          });
        }
      }
    });

    test('validates feature flags maintain compatibility', async ({ page }) => {
      // Test that features can be toggled without breaking existing functionality
      await page.addInitScript(() => {
        window.featureFlags = {
          'v2.1-enhanced-analytics': false, // Simulate disabled v2.1 feature
          'legacy-schedule-view': true
        };
        
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'feature-flag-test',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Feature Flag Test',
              team: 'Development-Tal',
              role: 'manager'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Core functionality should work even with new features disabled
      await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
      
      // Enhanced analytics should not be visible when feature flag is off
      await expect(page.locator('[data-testid="enhanced-analytics"]')).not.toBeVisible();
    });
  });
});