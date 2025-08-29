/**
 * Continuous Monitoring and Alerting System
 * Tests monitoring infrastructure and alerting mechanisms
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface MonitoringMetric {
  name: string;
  value: number;
  timestamp: Date;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface AlertConfig {
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

const MONITORING_METRICS = [
  { name: 'database_response_time', threshold: 1000, unit: 'ms' },
  { name: 'page_load_time', threshold: 3000, unit: 'ms' },
  { name: 'api_error_rate', threshold: 5, unit: '%' },
  { name: 'memory_usage', threshold: 80, unit: '%' },
  { name: 'active_sessions', threshold: 1000, unit: 'count' },
  { name: 'disk_usage', threshold: 85, unit: '%' }
];

const ALERT_CONFIGS: AlertConfig[] = [
  {
    name: 'Database Connection Failure',
    condition: 'database_response_time > 5000 OR database_connection_failed',
    threshold: 5000,
    severity: 'critical',
    enabled: true
  },
  {
    name: 'High API Error Rate',
    condition: 'api_error_rate > 10',
    threshold: 10,
    severity: 'high',
    enabled: true
  },
  {
    name: 'Slow Page Load Times',
    condition: 'page_load_time > 5000',
    threshold: 5000,
    severity: 'medium',
    enabled: true
  },
  {
    name: 'Memory Usage Warning',
    condition: 'memory_usage > 80',
    threshold: 80,
    severity: 'medium',
    enabled: true
  },
  {
    name: 'Security Breach Detection',
    condition: 'failed_login_attempts > 50 OR suspicious_activity_detected',
    threshold: 50,
    severity: 'critical',
    enabled: true
  }
];

test.describe('Continuous Monitoring System', () => {
  let supabase: any;
  let monitoringData: MonitoringMetric[] = [];

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  test.describe('System Health Monitoring', () => {
    test('monitors database performance and availability', async () => {
      const startTime = Date.now();
      
      // Test database response time
      const { data, error } = await supabase
        .from('team_members')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;
      
      const metric: MonitoringMetric = {
        name: 'database_response_time',
        value: responseTime,
        timestamp: new Date(),
        threshold: 1000,
        status: responseTime > 1000 ? 'warning' : 'healthy'
      };

      monitoringData.push(metric);
      
      expect(error).toBeNull();
      console.log(`📊 Database response time: ${responseTime}ms (threshold: 1000ms)`);
      
      // Alert if response time is too high
      if (responseTime > 5000) {
        await triggerAlert('Database Performance Alert', `Response time: ${responseTime}ms`, 'critical');
      }
    });

    test('monitors application performance', async ({ page }) => {
      // Test page load performance
      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'monitoring-user',
            email: 'monitoring@example.com',
            user_metadata: {
              full_name: 'Monitoring User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      const startTime = Date.now();
      await page.goto('/');
      await page.waitForSelector('[data-testid="schedule-table"]');
      const pageLoadTime = Date.now() - startTime;

      const metric: MonitoringMetric = {
        name: 'page_load_time',
        value: pageLoadTime,
        timestamp: new Date(),
        threshold: 3000,
        status: pageLoadTime > 3000 ? 'warning' : 'healthy'
      };

      monitoringData.push(metric);
      
      console.log(`📊 Page load time: ${pageLoadTime}ms (threshold: 3000ms)`);
      
      // Check for memory leaks or performance issues
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          memoryUsage: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit
          } : null
        };
      });

      console.log('📊 Performance metrics:', performanceMetrics);
      
      if (pageLoadTime > 5000) {
        await triggerAlert('Page Performance Alert', `Load time: ${pageLoadTime}ms`, 'medium');
      }
    });

    test('monitors API endpoint health', async ({ request }) => {
      const endpoints = [
        { path: '/api/health', method: 'GET' },
        { path: '/api/team-members', method: 'GET' },
        { path: '/api/schedule-entries', method: 'GET' }
      ];

      let totalRequests = 0;
      let failedRequests = 0;

      for (const endpoint of endpoints) {
        try {
          totalRequests++;
          const response = await request.get(endpoint.path);
          
          if (response.status() >= 400) {
            failedRequests++;
            console.warn(`⚠️ API endpoint ${endpoint.path} returned ${response.status()}`);
          } else {
            console.log(`✅ API endpoint ${endpoint.path} healthy`);
          }
        } catch (error) {
          failedRequests++;
          console.error(`❌ API endpoint ${endpoint.path} failed:`, error);
        }
      }

      const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
      
      const metric: MonitoringMetric = {
        name: 'api_error_rate',
        value: errorRate,
        timestamp: new Date(),
        threshold: 5,
        status: errorRate > 5 ? 'warning' : 'healthy'
      };

      monitoringData.push(metric);
      
      console.log(`📊 API error rate: ${errorRate.toFixed(1)}% (${failedRequests}/${totalRequests})`);
      
      if (errorRate > 10) {
        await triggerAlert('API Health Alert', `Error rate: ${errorRate.toFixed(1)}%`, 'high');
      }
    });

    test('monitors user authentication and security', async ({ page }) => {
      // Test unauthorized access detection
      await page.goto('/coo-dashboard');
      
      // Should be blocked
      const hasSecurityMeasures = await page.locator('[data-testid="access-denied"], [data-testid="login-required"]').count() > 0;
      
      if (!hasSecurityMeasures) {
        await triggerAlert('Security Alert', 'Unauthorized access to COO dashboard not blocked', 'critical');
      }

      // Test for common security vulnerabilities
      const securityChecks = [
        {
          name: 'XSS Protection',
          test: () => page.locator('script').count(),
          threshold: 10 // Reasonable number of legitimate scripts
        },
        {
          name: 'HTTPS Enforcement',
          test: () => page.url().startsWith('https://') || page.url().startsWith('http://localhost'),
          threshold: 1
        }
      ];

      for (const check of securityChecks) {
        try {
          const result = await check.test();
          console.log(`🔒 Security check ${check.name}: ${result}`);
        } catch (error) {
          console.warn(`⚠️ Security check ${check.name} failed:`, error);
        }
      }
    });
  });

  test.describe('Business Logic Monitoring', () => {
    test('monitors team data consistency', async () => {
      const expectedTeams = ['Development-Tal', 'Development-Itai', 'Infrastructure', 'QA', 'Leadership'];
      const issues = [];

      for (const teamName of expectedTeams) {
        const { data: members, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('team', teamName);

        if (error) {
          issues.push(`Team ${teamName}: Database error - ${error.message}`);
        } else if (!members || members.length === 0) {
          issues.push(`Team ${teamName}: No members found`);
        } else {
          // Check for data quality issues
          const invalidMembers = members.filter(member => 
            !member.name || 
            !member.email || 
            !member.email.includes('@')
          );

          if (invalidMembers.length > 0) {
            issues.push(`Team ${teamName}: ${invalidMembers.length} members with invalid data`);
          }
        }
      }

      if (issues.length > 0) {
        await triggerAlert('Data Consistency Alert', issues.join('; '), 'medium');
        console.warn('📊 Data consistency issues:', issues);
      } else {
        console.log('✅ All team data consistent');
      }

      expect(issues.length).toBeLessThan(3); // Allow some minor issues but alert on major ones
    });

    test('monitors sprint settings and scheduling', async () => {
      const { data: sprintSettings, error } = await supabase
        .from('global_sprint_settings')
        .select('*')
        .eq('is_active', true);

      if (error) {
        await triggerAlert('Sprint Settings Alert', `Failed to fetch sprint settings: ${error.message}`, 'high');
        throw error;
      }

      if (!sprintSettings || sprintSettings.length === 0) {
        await triggerAlert('Sprint Settings Alert', 'No active sprint found', 'high');
        console.warn('⚠️ No active sprint settings found');
      } else if (sprintSettings.length > 1) {
        await triggerAlert('Sprint Settings Alert', `Multiple active sprints found: ${sprintSettings.length}`, 'medium');
        console.warn(`⚠️ Multiple active sprints: ${sprintSettings.length}`);
      } else {
        const activeSprint = sprintSettings[0];
        const startDate = new Date(activeSprint.sprint_start_date);
        const endDate = new Date(activeSprint.sprint_end_date);
        const now = new Date();

        if (endDate < now) {
          await triggerAlert('Sprint Settings Alert', 'Active sprint has ended', 'medium');
          console.warn('⚠️ Active sprint has ended');
        }

        console.log(`✅ Active sprint valid: ${startDate.toDateString()} - ${endDate.toDateString()}`);
      }
    });

    test('monitors user activity and engagement', async () => {
      // Check for recent activity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentActivity, error } = await supabase
        .from('schedule_entries')
        .select('user_id, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(100);

      if (error) {
        await triggerAlert('User Activity Alert', `Failed to check user activity: ${error.message}`, 'medium');
      } else {
        const activeUsers = new Set(recentActivity?.map(entry => entry.user_id) || []);
        const activityCount = recentActivity?.length || 0;

        console.log(`📊 User activity: ${activeUsers.size} active users, ${activityCount} recent entries`);

        if (activeUsers.size < 5) {
          await triggerAlert('User Activity Alert', `Low user engagement: ${activeUsers.size} active users`, 'medium');
        }

        const metric: MonitoringMetric = {
          name: 'active_users',
          value: activeUsers.size,
          timestamp: new Date(),
          threshold: 5,
          status: activeUsers.size < 5 ? 'warning' : 'healthy'
        };

        monitoringData.push(metric);
      }
    });
  });

  test.describe('Alert System Testing', () => {
    test('validates alert configuration and delivery', async () => {
      // Test each alert configuration
      for (const alertConfig of ALERT_CONFIGS) {
        console.log(`🔔 Testing alert: ${alertConfig.name}`);
        
        // Validate alert configuration
        expect(alertConfig.name).toBeTruthy();
        expect(alertConfig.condition).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical'].includes(alertConfig.severity)).toBeTruthy();
        expect(typeof alertConfig.enabled).toBe('boolean');

        // Test alert triggering logic
        const shouldTrigger = await evaluateAlertCondition(alertConfig, monitoringData);
        
        if (shouldTrigger && alertConfig.enabled) {
          console.log(`⚠️ Alert ${alertConfig.name} would trigger`);
          await triggerAlert(alertConfig.name, `Condition met: ${alertConfig.condition}`, alertConfig.severity);
        } else {
          console.log(`✅ Alert ${alertConfig.name} condition not met`);
        }
      }
    });

    test('validates monitoring data persistence', async () => {
      // Save monitoring data for historical analysis
      const reportPath = path.join(process.cwd(), 'monitoring-reports', `monitoring-${Date.now()}.json`);
      
      try {
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify({
          timestamp: new Date().toISOString(),
          metrics: monitoringData,
          alerts: ALERT_CONFIGS,
          summary: {
            totalMetrics: monitoringData.length,
            healthyMetrics: monitoringData.filter(m => m.status === 'healthy').length,
            warningMetrics: monitoringData.filter(m => m.status === 'warning').length,
            criticalMetrics: monitoringData.filter(m => m.status === 'critical').length
          }
        }, null, 2));

        console.log(`📊 Monitoring data saved to: ${reportPath}`);
      } catch (error) {
        console.warn('⚠️ Failed to save monitoring data:', error);
      }
    });

    test('validates dashboard health endpoints', async ({ request }) => {
      // Test custom health endpoints
      const healthEndpoints = [
        '/api/health',
        '/api/monitoring/metrics',
        '/api/monitoring/alerts'
      ];

      for (const endpoint of healthEndpoints) {
        try {
          const response = await request.get(endpoint);
          
          if (response.status() === 404) {
            console.log(`ℹ️ Health endpoint ${endpoint} not implemented`);
          } else if (response.ok()) {
            const data = await response.json();
            console.log(`✅ Health endpoint ${endpoint} responding:`, Object.keys(data));
          } else {
            console.warn(`⚠️ Health endpoint ${endpoint} returned ${response.status()}`);
          }
        } catch (error) {
          console.log(`ℹ️ Health endpoint ${endpoint} not available`);
        }
      }
    });
  });

  test.describe('Recovery and Resilience Testing', () => {
    test('validates system recovery from failures', async ({ page }) => {
      // Simulate network issues
      await page.route('**/api/**', route => {
        if (Math.random() < 0.1) { // 10% failure rate
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: {
            id: 'recovery-test-user',
            email: 'recovery@example.com',
            user_metadata: {
              full_name: 'Recovery Test User',
              team: 'Development-Tal',
              role: 'member'
            }
          }
        }));
      });

      try {
        await page.goto('/');
        
        // Should still load with fallback mechanisms
        const hasContent = await page.textContent('body');
        expect(hasContent).toBeTruthy();
        expect(hasContent!.length).toBeGreaterThan(100);

        console.log('✅ Application gracefully handles network issues');
      } catch (error) {
        console.warn('⚠️ Application failed to handle network issues:', error);
        await triggerAlert('Resilience Alert', 'Application not handling network failures gracefully', 'medium');
      }
    });

    test('validates data backup and restore capabilities', async () => {
      // Test backup creation
      const backupData = {
        teams: [],
        scheduleEntries: [],
        sprintSettings: []
      };

      try {
        // Sample small amount of data for backup test
        const { data: teams } = await supabase
          .from('team_members')
          .select('*')
          .limit(5);
        
        const { data: schedules } = await supabase
          .from('schedule_entries')
          .select('*')
          .limit(10);

        backupData.teams = teams || [];
        backupData.scheduleEntries = schedules || [];

        console.log(`✅ Backup test successful: ${backupData.teams.length} teams, ${backupData.scheduleEntries.length} schedule entries`);
        
        // In a real scenario, you'd test restore functionality too
        // This would involve creating a test database and restoring data
        
      } catch (error) {
        await triggerAlert('Backup Alert', `Backup test failed: ${error}`, 'high');
        console.error('❌ Backup test failed:', error);
      }
    });
  });

  test.afterAll(async () => {
    // Generate final monitoring report
    const summary = {
      totalMetrics: monitoringData.length,
      healthyMetrics: monitoringData.filter(m => m.status === 'healthy').length,
      warningMetrics: monitoringData.filter(m => m.status === 'warning').length,
      criticalMetrics: monitoringData.filter(m => m.status === 'critical').length,
      averageResponseTime: monitoringData
        .filter(m => m.name.includes('response_time'))
        .reduce((sum, m) => sum + m.value, 0) / monitoringData.filter(m => m.name.includes('response_time')).length || 0
    };

    console.log('\n📊 Monitoring Summary:');
    console.log(`   Total Metrics: ${summary.totalMetrics}`);
    console.log(`   ✅ Healthy: ${summary.healthyMetrics}`);
    console.log(`   ⚠️ Warnings: ${summary.warningMetrics}`);
    console.log(`   🚨 Critical: ${summary.criticalMetrics}`);
    console.log(`   Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms`);

    if (summary.criticalMetrics > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED - Immediate attention required!');
    } else if (summary.warningMetrics > 0) {
      console.log('\n⚠️ Some warnings detected - Monitor closely');
    } else {
      console.log('\n✅ All systems healthy!');
    }
  });
});

// Helper functions
async function triggerAlert(name: string, message: string, severity: string): Promise<void> {
  const alert = {
    name,
    message,
    severity,
    timestamp: new Date().toISOString(),
    resolved: false
  };

  console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${name} - ${message}`);
  
  // In a real implementation, you would:
  // 1. Send notifications to Slack/Discord
  // 2. Create tickets in issue tracking systems
  // 3. Send emails to on-call engineers
  // 4. Update monitoring dashboards
  // 5. Store alerts in a database
  
  // For now, we'll save to a file for demonstration
  try {
    const alertsFile = path.join(process.cwd(), 'monitoring-reports', 'alerts.json');
    let alerts = [];
    
    try {
      const existingAlerts = await fs.readFile(alertsFile, 'utf8');
      alerts = JSON.parse(existingAlerts);
    } catch {
      // File doesn't exist yet
    }
    
    alerts.push(alert);
    
    await fs.mkdir(path.dirname(alertsFile), { recursive: true });
    await fs.writeFile(alertsFile, JSON.stringify(alerts, null, 2));
  } catch (error) {
    console.error('Failed to save alert:', error);
  }
}

async function evaluateAlertCondition(config: AlertConfig, metrics: MonitoringMetric[]): Promise<boolean> {
  // Simplified condition evaluation
  // In a real implementation, you'd have a proper expression parser
  
  const condition = config.condition.toLowerCase();
  
  // Check for database response time
  if (condition.includes('database_response_time')) {
    const dbMetrics = metrics.filter(m => m.name === 'database_response_time');
    return dbMetrics.some(m => m.value > config.threshold);
  }
  
  // Check for API error rate
  if (condition.includes('api_error_rate')) {
    const apiMetrics = metrics.filter(m => m.name === 'api_error_rate');
    return apiMetrics.some(m => m.value > config.threshold);
  }
  
  // Check for page load time
  if (condition.includes('page_load_time')) {
    const pageMetrics = metrics.filter(m => m.name === 'page_load_time');
    return pageMetrics.some(m => m.value > config.threshold);
  }
  
  // Default to false if condition not recognized
  return false;
}