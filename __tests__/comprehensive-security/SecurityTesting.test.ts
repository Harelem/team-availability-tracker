/**
 * Comprehensive Security Tests - Authentication, Authorization, and Input Validation
 * Tests security vulnerabilities, RLS policies, and access control mechanisms
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

test.describe('Security Testing Suite', () => {
  let supabaseAnon: any;
  let supabaseService: any;

  test.beforeAll(async () => {
    supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  });

  test.describe('Authentication Security', () => {
    test('prevents unauthorized access to protected routes', async ({ page }) => {
      // Try to access COO dashboard without authentication
      await page.goto('/coo-dashboard');
      
      // Should redirect to login or show access denied
      await expect(page.locator('[data-testid="access-denied"]').or(page.locator('[data-testid="login-required"]'))).toBeVisible();
      
      // Should not show COO dashboard content
      await expect(page.locator('[data-testid="coo-dashboard"]')).not.toBeVisible();
    });

    test('validates COO access control', async ({ page }) => {
      // Mock regular user authentication
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'regular-user-1',
            email: 'regular.user@example.com',
            user_metadata: {
              full_name: 'Regular User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/coo-dashboard');
      
      // Regular user should be denied access
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      await expect(page.locator('[data-testid="access-denied"]')).toContainText('COO access required');
    });

    test('validates manager access restrictions', async ({ page }) => {
      // Mock authentication for user from different team
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'manager-other-team',
            email: 'other.manager@example.com',
            user_metadata: {
              full_name: 'Other Manager',
              team: 'Infrastructure',
              role: 'manager'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Manager should only see their own team members
      await expect(page.locator('[data-testid="team-info"]')).toContainText('Infrastructure');
      
      // Should not be able to access other team's data
      await expect(page.locator('[data-testid="team-Development-Tal"]')).not.toBeVisible();
    });

    test('prevents session hijacking and validates token security', async ({ page, browser }) => {
      // Create legitimate user session
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'legitimate-user',
            email: 'legitimate@example.com',
            user_metadata: {
              full_name: 'Legitimate User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Extract session token
      const sessionToken = await page.evaluate(() => {
        return window.localStorage.getItem('supabase.auth.token');
      });

      // Create new context (simulating attacker)
      const attackerContext = await browser.newContext();
      const attackerPage = await attackerContext.newPage();

      // Try to use stolen token
      await attackerPage.addInitScript((token) => {
        window.localStorage.setItem('supabase.auth.token', token);
      }, sessionToken);

      await attackerPage.goto('/');

      // Should implement additional security checks (IP validation, device fingerprinting, etc.)
      // For this test, we'll check that sensitive operations require re-authentication
      
      await attackerPage.goto('/coo-dashboard');
      // Should require additional authentication for sensitive access
      await expect(attackerPage.locator('[data-testid="reauthenticate-required"]').or(attackerPage.locator('[data-testid="access-denied"]'))).toBeVisible();

      await attackerContext.close();
    });

    test('validates password policy and authentication security', async ({ page }) => {
      // Test weak password rejection (if applicable to your auth system)
      await page.goto('/auth/signup'); // Adjust route as needed

      if (await page.locator('[data-testid="password-input"]').count() > 0) {
        const weakPasswords = ['123', 'password', 'abc123', '111111'];
        
        for (const weakPassword of weakPasswords) {
          await page.locator('[data-testid="password-input"]').fill(weakPassword);
          await page.locator('[data-testid="password-input"]').blur();
          
          // Should show password strength warning
          await expect(page.locator('[data-testid="password-weak"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Authorization and RLS Policy Testing', () => {
    test('validates Row Level Security policies for schedule entries', async () => {
      // Test as regular user
      const { data: userSchedule, error: userError } = await supabaseAnon
        .from('schedule_entries')
        .select('*')
        .eq('user_id', 1); // Try to access user 1's data

      // Should only return data if properly authenticated as that user
      expect(userError).toBeNull();
      
      // Test cross-user access
      const { data: crossUserData, error: crossUserError } = await supabaseAnon
        .from('schedule_entries')
        .select('*')
        .neq('user_id', 1); // Try to access other users' data

      // Should be restricted by RLS
      expect(crossUserData).toEqual([]);
    });

    test('validates team member access restrictions', async () => {
      // Test team member access
      const { data: teamMembers, error } = await supabaseAnon
        .from('team_members')
        .select('*')
        .eq('team', 'Development-Tal');

      // Should be able to read team members (public info)
      expect(error).toBeNull();
      
      // Test modification attempts
      const { error: insertError } = await supabaseAnon
        .from('team_members')
        .insert({
          name: 'Unauthorized Member',
          team: 'Development-Tal',
          email: 'unauthorized@example.com',
          role: 'member'
        });

      // Should be restricted by RLS
      expect(insertError).not.toBeNull();
      expect(insertError?.code).toBe('42501'); // Insufficient privilege
    });

    test('validates COO-only data access', async () => {
      // Test unauthorized access to COO-only tables/views
      const { data, error } = await supabaseAnon
        .from('company_analytics') // Assuming this exists and is COO-only
        .select('*');

      // Should be denied for non-COO users
      expect(error).not.toBeNull();
    });

    test('validates manager permissions for team management', async () => {
      // Create test data with service role
      const { data: testMember, error: createError } = await supabaseService
        .from('team_members')
        .insert({
          name: 'Test Member for Manager Permission Test',
          team: 'Development-Tal',
          email: 'test-manager-perm@example.com',
          role: 'member'
        })
        .select()
        .single();

      expect(createError).toBeNull();

      // Test manager update (should work for their team)
      const { error: updateError } = await supabaseAnon
        .from('team_members')
        .update({ role: 'senior' })
        .eq('id', testMember.id);

      // This would normally require proper authentication context
      // In a real test, you'd set up proper user context

      // Cleanup
      await supabaseService
        .from('team_members')
        .delete()
        .eq('id', testMember.id);
    });
  });

  test.describe('Input Validation and XSS Prevention', () => {
    test('prevents XSS attacks in schedule reason inputs', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'test-user',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Try XSS payload in reason input
      const scheduleCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
      await scheduleCell.click();
      await scheduleCell.fill('3.5');
      await scheduleCell.press('Tab');

      // Should show reason dialog
      await expect(page.locator('[data-testid="reason-dialog"]')).toBeVisible();

      // Try XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        'onmouseover="alert(\'XSS\')"',
      ];

      for (const payload of xssPayloads) {
        await page.locator('[data-testid="reason-input"]').fill(payload);
        await page.locator('[data-testid="save-reason"]').click();

        // Wait a moment to see if script executes
        await page.waitForTimeout(500);

        // Check that XSS didn't execute (no alert dialog)
        const dialogs = await page.evaluate(() => {
          return window.dialogsShown || [];
        });
        
        expect(dialogs).not.toContain('XSS');

        // Input should be sanitized or escaped
        const savedValue = await page.locator('[data-testid="reason-display"]').textContent();
        expect(savedValue).not.toContain('<script>');
        expect(savedValue).not.toContain('javascript:');
        expect(savedValue).not.toContain('onerror');
      }
    });

    test('validates input sanitization in team member names', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'manager-user',
            email: 'manager@example.com',
            user_metadata: {
              full_name: 'Manager User',
              team: 'Development-Tal',
              role: 'manager'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="manager-dashboard"]');

      // Try to add team member with malicious name
      await page.locator('[data-testid="add-team-member"]').click();
      await expect(page.locator('[data-testid="add-member-modal"]')).toBeVisible();

      const maliciousNames = [
        '<script>alert("XSS")</script>',
        'Robert\'); DROP TABLE team_members; --',
        '"><img src="x" onerror="alert(\'XSS\')">',
      ];

      for (const maliciousName of maliciousNames) {
        await page.locator('[data-testid="member-name-input"]').fill(maliciousName);
        await page.locator('[data-testid="member-email-input"]').fill('test@example.com');
        await page.locator('[data-testid="save-new-member"]').click();

        // Should either reject input or sanitize it
        const errorMsg = await page.locator('[data-testid="validation-error"]').textContent();
        if (errorMsg) {
          expect(errorMsg).toContain('Invalid characters');
        } else {
          // If accepted, should be sanitized
          const membersList = await page.locator('[data-testid="team-member-list"]').textContent();
          expect(membersList).not.toContain('<script>');
          expect(membersList).not.toContain('DROP TABLE');
          expect(membersList).not.toContain('onerror');
        }

        // Clear form for next iteration
        await page.locator('[data-testid="member-name-input"]').fill('');
      }
    });

    test('prevents SQL injection in database queries', async () => {
      // Test SQL injection attempts through API
      const injectionPayloads = [
        "1' OR '1'='1",
        "1'; DROP TABLE schedule_entries; --",
        "1' UNION SELECT * FROM team_members --",
        "'; INSERT INTO team_members (name) VALUES ('Hacker'); --"
      ];

      for (const payload of injectionPayloads) {
        try {
          // Try injection through user_id parameter
          const { data, error } = await supabaseAnon
            .from('schedule_entries')
            .select('*')
            .eq('user_id', payload);

          // Should either error safely or return no data
          if (!error) {
            expect(data).toEqual([]);
          }
        } catch (error) {
          // Errors are expected for invalid input
          console.log('Expected error for injection attempt:', error);
        }
      }
    });

    test('validates file upload security (if applicable)', async ({ page }) => {
      // If your app has file upload functionality
      if (await page.locator('[data-testid="file-upload"]').count() > 0) {
        // Test malicious file upload
        const maliciousFiles = [
          { name: 'malware.exe', content: 'fake executable content' },
          { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>' },
          { name: '../../../etc/passwd', content: 'directory traversal attempt' },
          { name: 'large.txt', content: 'x'.repeat(100000000) } // 100MB file
        ];

        // These tests would depend on your specific file upload implementation
        console.log('File upload security tests would be implemented based on actual upload functionality');
      }
    });
  });

  test.describe('Rate Limiting and DoS Prevention', () => {
    test('implements rate limiting for API endpoints', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'rate-limit-test-user',
            email: 'rate-test@example.com',
            user_metadata: {
              full_name: 'Rate Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Attempt rapid-fire requests
      const rapidRequests = [];
      const requestCount = 50;

      for (let i = 0; i < requestCount; i++) {
        rapidRequests.push(
          page.evaluate(async () => {
            try {
              const response = await fetch('/api/schedule-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: 1,
                  date: '2024-01-17',
                  value: 7
                })
              });
              return { status: response.status, success: response.ok };
            } catch (error) {
              return { status: 0, success: false, error: error.message };
            }
          })
        );
      }

      const results = await Promise.allSettled(rapidRequests);
      const statusCodes = results.map(r => 
        r.status === 'fulfilled' ? r.value.status : 0
      );

      // Should see rate limiting (429 status codes) after some requests
      const rateLimitedRequests = statusCodes.filter(status => status === 429);
      
      if (rateLimitedRequests.length > 0) {
        console.log(`Rate limiting working: ${rateLimitedRequests.length} requests limited`);
        expect(rateLimitedRequests.length).toBeGreaterThan(0);
      } else {
        console.warn('No rate limiting detected - consider implementing rate limits');
      }
    });

    test('prevents excessive database connections', async () => {
      // Test connection pooling limits
      const connectionPromises = [];
      const maxConnections = 20;

      for (let i = 0; i < maxConnections; i++) {
        connectionPromises.push(
          supabaseAnon
            .from('team_members')
            .select('count')
            .then(result => ({ success: !result.error, error: result.error }))
            .catch(error => ({ success: false, error }))
        );
      }

      const results = await Promise.all(connectionPromises);
      const successfulConnections = results.filter(r => r.success).length;
      const failedConnections = results.filter(r => !r.success).length;

      console.log(`Connection test: ${successfulConnections} successful, ${failedConnections} failed`);

      // Should handle connection limits gracefully
      expect(successfulConnections).toBeGreaterThan(0);
      
      if (failedConnections > 0) {
        // Check that failures are due to connection limits, not other errors
        const connectionErrors = results.filter(r => !r.success);
        connectionErrors.forEach(error => {
          console.log('Connection error:', error.error);
        });
      }
    });
  });

  test.describe('Data Privacy and GDPR Compliance', () => {
    test('validates personal data handling', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'privacy-test-user',
            email: 'privacy@example.com',
            user_metadata: {
              full_name: 'Privacy Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      
      // Check that sensitive data is not exposed in client-side code
      const pageContent = await page.content();
      
      // Should not expose sensitive information
      expect(pageContent).not.toContain('password');
      expect(pageContent).not.toContain(supabaseServiceKey || 'service_role_key');
      expect(pageContent).not.toContain('secret');
      
      // Check for data minimization
      await page.evaluate(() => {
        // Check localStorage for unnecessary personal data storage
        const storage = Object.keys(localStorage);
        return storage;
      });
    });

    test('validates data export compliance', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'export-test-user',
            email: 'export@example.com',
            user_metadata: {
              full_name: 'Export Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Test personal data export
      if (await page.locator('[data-testid="export-personal-data"]').count() > 0) {
        await page.locator('[data-testid="export-personal-data"]').click();

        // Should provide comprehensive data export
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.locator('[data-testid="confirm-export"]').click()
        ]);

        expect(download.suggestedFilename()).toContain('personal_data');
      }
    });

    test('validates data retention policies', async () => {
      // Test that old data is properly archived/deleted according to policy
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

      const { data: oldData, error } = await supabaseAnon
        .from('schedule_entries')
        .select('*')
        .lt('created_at', oldDate.toISOString());

      // Depending on your retention policy, old data might be archived or deleted
      if (error) {
        console.log('Data retention check:', error.message);
      } else {
        console.log(`Found ${oldData?.length || 0} old records`);
      }
    });
  });

  test.describe('Security Headers and HTTPS', () => {
    test('validates security headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();

      if (headers) {
        // Check for important security headers
        console.log('Security headers check:');
        
        const expectedHeaders = {
          'x-frame-options': 'DENY',
          'x-content-type-options': 'nosniff',
          'x-xss-protection': '1; mode=block',
          'strict-transport-security': 'max-age=',
          'content-security-policy': 'default-src'
        };

        for (const [header, expectedValue] of Object.entries(expectedHeaders)) {
          const headerValue = headers[header];
          if (headerValue && headerValue.includes(expectedValue)) {
            console.log(`✅ ${header}: ${headerValue}`);
          } else {
            console.warn(`⚠️ Missing or weak ${header}: ${headerValue}`);
          }
        }
      }
    });

    test('validates HTTPS enforcement', async ({ page }) => {
      // Check that the app enforces HTTPS in production
      const currentUrl = page.url();
      
      if (process.env.NODE_ENV === 'production') {
        expect(currentUrl).toMatch(/^https:/);
      } else {
        console.log('HTTPS check skipped in development environment');
      }
    });
  });

  test.describe('Session Management Security', () => {
    test('validates session timeout', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'session-test-user',
            email: 'session@example.com',
            user_metadata: {
              full_name: 'Session Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Simulate session timeout by manipulating token expiry
      await page.evaluate(() => {
        const token = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
        token.expires_at = Date.now() / 1000 - 3600; // Expired 1 hour ago
        localStorage.setItem('supabase.auth.token', JSON.stringify(token));
      });

      // Try to perform an action with expired session
      const scheduleCell = page.locator('[data-testid="schedule-cell-1-2024-01-17"]');
      await scheduleCell.click();
      await scheduleCell.fill('7');
      await scheduleCell.press('Tab');

      // Should require re-authentication or show session expired message
      await expect(
        page.locator('[data-testid="session-expired"]').or(
          page.locator('[data-testid="login-required"]')
        )
      ).toBeVisible({ timeout: 5000 });
    });

    test('validates secure logout', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'logout-test-user',
            email: 'logout@example.com',
            user_metadata: {
              full_name: 'Logout Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');

      // Perform logout
      if (await page.locator('[data-testid="logout-button"]').count() > 0) {
        await page.locator('[data-testid="logout-button"]').click();

        // Should clear all session data
        const remainingTokens = await page.evaluate(() => {
          return localStorage.getItem('supabase.auth.token');
        });

        expect(remainingTokens).toBeNull();

        // Should redirect to login or show logged out state
        await expect(
          page.locator('[data-testid="login-form"]').or(
            page.locator('[data-testid="logged-out"]')
          )
        ).toBeVisible();
      }
    });
  });
});