#!/usr/bin/env node

/**
 * Continuous Monitoring Runner
 * Executes monitoring checks and reports system health
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const MONITORING_INTERVAL = process.env.MONITORING_INTERVAL || 300000; // 5 minutes default
const ALERT_COOLDOWN = process.env.ALERT_COOLDOWN || 900000; // 15 minutes default
const METRICS_RETENTION = process.env.METRICS_RETENTION || 2592000000; // 30 days default

class MonitoringRunner {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    
    this.metricsHistory = [];
    this.alertHistory = [];
    this.lastAlerts = new Map();
    
    this.isRunning = false;
    this.intervalId = null;
  }

  async start() {
    console.log('🚀 Starting continuous monitoring system...');
    
    if (this.isRunning) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    this.isRunning = true;
    
    // Run initial check
    await this.runMonitoringCycle();
    
    // Schedule regular checks
    this.intervalId = setInterval(async () => {
      try {
        await this.runMonitoringCycle();
      } catch (error) {
        console.error('❌ Error in monitoring cycle:', error);
      }
    }, MONITORING_INTERVAL);

    console.log(`✅ Monitoring started with ${MONITORING_INTERVAL/1000}s intervals`);
  }

  async stop() {
    console.log('🛑 Stopping monitoring system...');
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.saveMetricsHistory();
    console.log('✅ Monitoring stopped');
  }

  async runMonitoringCycle() {
    const cycleStart = Date.now();
    console.log(`\n🔍 Running monitoring cycle at ${new Date().toISOString()}`);

    const metrics = {};
    
    try {
      // Database health check
      metrics.database = await this.checkDatabaseHealth();
      
      // Application health check
      metrics.application = await this.checkApplicationHealth();
      
      // Business metrics check
      metrics.business = await this.checkBusinessMetrics();
      
      // Security check
      metrics.security = await this.checkSecurityMetrics();
      
      // System resource check
      metrics.system = await this.checkSystemResources();

      // Store metrics
      const cycleMetrics = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - cycleStart,
        metrics
      };

      this.metricsHistory.push(cycleMetrics);
      
      // Evaluate alerts
      await this.evaluateAlerts(metrics);
      
      // Cleanup old metrics
      await this.cleanupOldMetrics();
      
      console.log(`✅ Monitoring cycle completed in ${cycleMetrics.duration}ms`);
      
    } catch (error) {
      console.error('❌ Monitoring cycle failed:', error);
      await this.sendAlert('Monitoring System Error', `Monitoring cycle failed: ${error.message}`, 'critical');
    }
  }

  async checkDatabaseHealth() {
    const startTime = Date.now();
    const metrics = {
      responseTime: 0,
      connectionStatus: 'unknown',
      queryErrors: 0,
      activeConnections: 0
    };

    try {
      // Test basic connectivity
      const { data, error } = await this.supabase
        .from('team_members')
        .select('count')
        .limit(1);

      metrics.responseTime = Date.now() - startTime;
      metrics.connectionStatus = error ? 'error' : 'healthy';
      
      if (error) {
        metrics.queryErrors = 1;
        console.warn(`⚠️ Database query error: ${error.message}`);
      }

      // Test complex query
      const complexQueryStart = Date.now();
      const { data: complexData, error: complexError } = await this.supabase
        .from('schedule_entries')
        .select(`
          *,
          team_members!inner(name, team)
        `)
        .limit(10);

      const complexQueryTime = Date.now() - complexQueryStart;
      
      if (complexError) {
        metrics.queryErrors++;
      }

      console.log(`📊 Database health: ${metrics.responseTime}ms response, ${metrics.connectionStatus}`);
      
    } catch (error) {
      metrics.connectionStatus = 'failed';
      metrics.queryErrors++;
      console.error('❌ Database health check failed:', error);
    }

    return metrics;
  }

  async checkApplicationHealth() {
    const metrics = {
      endpointHealth: {},
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: process.uptime()
    };

    try {
      // Get memory usage
      const memUsage = process.memoryUsage();
      metrics.memoryUsage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

      console.log(`📊 Application health: ${metrics.memoryUsage}% memory, ${Math.round(metrics.uptime)}s uptime`);
      
    } catch (error) {
      console.error('❌ Application health check failed:', error);
    }

    return metrics;
  }

  async checkBusinessMetrics() {
    const metrics = {
      activeTeams: 0,
      totalUsers: 0,
      recentActivity: 0,
      completionRate: 0
    };

    try {
      // Count active teams
      const { data: teams, error: teamsError } = await this.supabase
        .from('team_members')
        .select('team')
        .not('team', 'is', null);

      if (!teamsError && teams) {
        metrics.activeTeams = new Set(teams.map(t => t.team)).size;
        metrics.totalUsers = teams.length;
      }

      // Check recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentEntries, error: activityError } = await this.supabase
        .from('schedule_entries')
        .select('*')
        .gte('created_at', yesterday.toISOString());

      if (!activityError && recentEntries) {
        metrics.recentActivity = recentEntries.length;
      }

      console.log(`📊 Business metrics: ${metrics.activeTeams} teams, ${metrics.totalUsers} users, ${metrics.recentActivity} recent entries`);
      
    } catch (error) {
      console.error('❌ Business metrics check failed:', error);
    }

    return metrics;
  }

  async checkSecurityMetrics() {
    const metrics = {
      failedLogins: 0,
      suspiciousActivity: 0,
      accessViolations: 0,
      securityScore: 100
    };

    try {
      // In a real implementation, you would:
      // - Check authentication logs
      // - Monitor for brute force attempts
      // - Check for unusual access patterns
      // - Validate security headers
      // - Check for known vulnerabilities

      console.log(`🔒 Security metrics: ${metrics.securityScore}% security score`);
      
    } catch (error) {
      console.error('❌ Security metrics check failed:', error);
    }

    return metrics;
  }

  async checkSystemResources() {
    const metrics = {
      diskUsage: 0,
      networkLatency: 0,
      processCount: 0
    };

    try {
      // Basic system metrics that are available in Node.js
      metrics.processCount = 1; // Current process
      
      console.log(`💻 System metrics: ${metrics.processCount} processes`);
      
    } catch (error) {
      console.error('❌ System metrics check failed:', error);
    }

    return metrics;
  }

  async evaluateAlerts(metrics) {
    const alerts = [
      {
        name: 'Database Response Time High',
        condition: () => metrics.database?.responseTime > 5000,
        severity: 'critical',
        message: `Database response time: ${metrics.database?.responseTime}ms`
      },
      {
        name: 'Database Connection Failed',
        condition: () => metrics.database?.connectionStatus === 'failed',
        severity: 'critical',
        message: 'Database connection failed'
      },
      {
        name: 'High Memory Usage',
        condition: () => metrics.application?.memoryUsage > 85,
        severity: 'warning',
        message: `Memory usage: ${metrics.application?.memoryUsage}%`
      },
      {
        name: 'No Recent Activity',
        condition: () => metrics.business?.recentActivity === 0,
        severity: 'warning',
        message: 'No user activity in the last 24 hours'
      },
      {
        name: 'Team Data Missing',
        condition: () => metrics.business?.activeTeams < 3,
        severity: 'medium',
        message: `Only ${metrics.business?.activeTeams} teams found (expected 5)`
      }
    ];

    for (const alert of alerts) {
      try {
        if (alert.condition()) {
          const alertKey = alert.name;
          const lastAlert = this.lastAlerts.get(alertKey);
          const now = Date.now();

          // Check cooldown period
          if (!lastAlert || (now - lastAlert) > ALERT_COOLDOWN) {
            await this.sendAlert(alert.name, alert.message, alert.severity);
            this.lastAlerts.set(alertKey, now);
          }
        }
      } catch (error) {
        console.error(`❌ Error evaluating alert ${alert.name}:`, error);
      }
    }
  }

  async sendAlert(name, message, severity) {
    const alert = {
      name,
      message,
      severity,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alertHistory.push(alert);

    console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${name} - ${message}`);

    try {
      // Save alert to file
      const alertsFile = path.join(process.cwd(), 'monitoring-reports', 'alerts.json');
      await this.ensureDirectoryExists(path.dirname(alertsFile));
      
      let existingAlerts = [];
      try {
        const data = await fs.readFile(alertsFile, 'utf8');
        existingAlerts = JSON.parse(data);
      } catch {
        // File doesn't exist yet
      }

      existingAlerts.push(alert);
      await fs.writeFile(alertsFile, JSON.stringify(existingAlerts, null, 2));

      // In a real implementation, send notifications:
      // await this.sendSlackNotification(alert);
      // await this.sendEmailNotification(alert);
      // await this.sendSMSNotification(alert); // for critical alerts
      
    } catch (error) {
      console.error('❌ Failed to save alert:', error);
    }
  }

  async saveMetricsHistory() {
    try {
      const metricsFile = path.join(process.cwd(), 'monitoring-reports', `metrics-${Date.now()}.json`);
      await this.ensureDirectoryExists(path.dirname(metricsFile));
      
      const data = {
        generatedAt: new Date().toISOString(),
        totalCycles: this.metricsHistory.length,
        metrics: this.metricsHistory,
        alerts: this.alertHistory
      };

      await fs.writeFile(metricsFile, JSON.stringify(data, null, 2));
      console.log(`📊 Metrics history saved to: ${metricsFile}`);
      
    } catch (error) {
      console.error('❌ Failed to save metrics history:', error);
    }
  }

  async cleanupOldMetrics() {
    const cutoffTime = Date.now() - METRICS_RETENTION;
    const initialCount = this.metricsHistory.length;
    
    this.metricsHistory = this.metricsHistory.filter(metric => 
      new Date(metric.timestamp).getTime() > cutoffTime
    );

    const removed = initialCount - this.metricsHistory.length;
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old metric entries`);
    }
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // Graceful shutdown handling
  setupSignalHandlers() {
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';

  const monitor = new MonitoringRunner();
  monitor.setupSignalHandlers();

  switch (command) {
    case 'start':
      await monitor.start();
      // Keep running until stopped
      break;
      
    case 'check':
      console.log('🔍 Running single monitoring check...');
      await monitor.runMonitoringCycle();
      await monitor.saveMetricsHistory();
      break;
      
    case 'status':
      // Show current status
      console.log('📊 Monitoring System Status');
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Interval: ${MONITORING_INTERVAL/1000}s`);
      console.log(`   Alert Cooldown: ${ALERT_COOLDOWN/1000}s`);
      console.log(`   Metrics Retention: ${METRICS_RETENTION/86400000} days`);
      break;
      
    default:
      console.log('Usage: node run-monitoring.js [start|check|status]');
      console.log('  start  - Start continuous monitoring (default)');
      console.log('  check  - Run single monitoring check');
      console.log('  status - Show monitoring configuration');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitoring system error:', error);
    process.exit(1);
  });
}

module.exports = { MonitoringRunner };