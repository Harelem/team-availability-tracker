#!/usr/bin/env node

/**
 * Production Monitoring Script
 * 
 * Continuous monitoring for production deployment health,
 * performance metrics, and automatic alerting.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Monitoring configuration
const monitoringConfig = {
  // Application URLs to monitor
  urls: {
    main: process.env.PRODUCTION_URL || 'http://localhost:3000',
    executive: process.env.PRODUCTION_URL ? `${process.env.PRODUCTION_URL}/executive` : 'http://localhost:3000/executive',
    health: process.env.PRODUCTION_URL ? `${process.env.PRODUCTION_URL}/api/health` : 'http://localhost:3000/api/health'
  },
  
  // Performance thresholds
  thresholds: {
    responseTime: 2000, // 2 seconds
    errorRate: 5, // 5% max error rate
    memoryUsage: 200, // 200MB max
    cpuUsage: 80, // 80% max CPU
    uptime: 99.5 // 99.5% uptime target
  },
  
  // Monitoring intervals
  intervals: {
    health: 30000,    // 30 seconds
    performance: 60000, // 1 minute
    metrics: 300000,   // 5 minutes
    report: 3600000    // 1 hour
  },
  
  // Alert configuration
  alerts: {
    webhook: process.env.MONITORING_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
    slack: process.env.SLACK_WEBHOOK_URL
  },
  
  // Data retention
  retention: {
    metrics: 7 * 24 * 60 * 60 * 1000, // 7 days
    logs: 30 * 24 * 60 * 60 * 1000    // 30 days
  }
};

class ProductionMonitor {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      uptime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      peakResponseTime: 0,
      memoryUsage: [],
      cpuUsage: [],
      errors: []
    };
    
    this.alertHistory = [];
    this.lastHealthCheck = null;
    this.isRunning = false;
    
    // Create monitoring directory
    this.monitoringDir = './monitoring-data';
    if (!fs.existsSync(this.monitoringDir)) {
      fs.mkdirSync(this.monitoringDir, { recursive: true });
    }
    
    // Bind methods
    this.checkHealth = this.checkHealth.bind(this);
    this.checkPerformance = this.checkPerformance.bind(this);
    this.generateReport = this.generateReport.bind(this);
    this.sendAlert = this.sendAlert.bind(this);
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      info: colors.blue,
      success: colors.green,
      warn: colors.yellow,
      error: colors.red,
      header: colors.cyan + colors.bold
    };
    
    const logMessage = `${colorMap[level]}[${timestamp}] ${message}${colors.reset}`;
    console.log(logMessage);
    
    // Write to log file
    const logFile = path.join(this.monitoringDir, 'production.log');
    fs.appendFileSync(logFile, `[${timestamp}] [${level.toUpperCase()}] ${message}\\n`);
  }

  async makeRequest(url, timeout = 5000) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        timeout,
        headers: {
          'User-Agent': 'Production-Monitor/1.0'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const success = response.ok;
      
      this.metrics.totalRequests++;
      if (success) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }
      
      // Update response time metrics
      this.metrics.averageResponseTime = 
        ((this.metrics.averageResponseTime * (this.metrics.totalRequests - 1)) + responseTime) / 
        this.metrics.totalRequests;
      
      this.metrics.peakResponseTime = Math.max(this.metrics.peakResponseTime, responseTime);
      
      return {
        success,
        responseTime,
        status: response.status,
        statusText: response.statusText
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metrics.totalRequests++;
      this.metrics.failedRequests++;
      
      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        url,
        error: error.message,
        responseTime
      });
      
      return {
        success: false,
        responseTime,
        error: error.message
      };
    }
  }

  async checkHealth() {
    this.log('Performing health check...', 'info');
    
    const results = {};
    
    // Check all monitored endpoints
    for (const [name, url] of Object.entries(monitoringConfig.urls)) {
      const result = await this.makeRequest(url);
      results[name] = result;
      
      if (!result.success) {
        this.log(`❌ ${name} health check failed: ${result.error || result.statusText}`, 'error');
        await this.sendAlert('health', `Health check failed for ${name}: ${result.error || result.statusText}`);
      } else {
        this.log(`✅ ${name} health check passed (${result.responseTime}ms)`, 'success');
      }
      
      // Check response time threshold
      if (result.responseTime > monitoringConfig.thresholds.responseTime) {
        this.log(`⚠️ ${name} response time exceeded threshold: ${result.responseTime}ms`, 'warn');
        await this.sendAlert('performance', `Slow response time for ${name}: ${result.responseTime}ms`);
      }
    }
    
    this.lastHealthCheck = {
      timestamp: new Date().toISOString(),
      results
    };
    
    // Calculate error rate
    const errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
    if (errorRate > monitoringConfig.thresholds.errorRate) {
      this.log(`🚨 Error rate exceeded threshold: ${errorRate.toFixed(2)}%`, 'error');
      await this.sendAlert('critical', `High error rate detected: ${errorRate.toFixed(2)}%`);
    }
    
    return results;
  }

  async checkPerformance() {
    this.log('Checking performance metrics...', 'info');
    
    try {
      // Get system metrics (simplified for demonstration)
      const memoryInfo = process.memoryUsage();
      const memoryUsageMB = Math.round(memoryInfo.heapUsed / 1024 / 1024);
      
      this.metrics.memoryUsage.push({
        timestamp: new Date().toISOString(),
        usage: memoryUsageMB
      });
      
      // Keep only recent memory data
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
      }
      
      // Check memory threshold
      if (memoryUsageMB > monitoringConfig.thresholds.memoryUsage) {
        this.log(`⚠️ Memory usage high: ${memoryUsageMB}MB`, 'warn');
        await this.sendAlert('performance', `High memory usage: ${memoryUsageMB}MB`);
      }
      
      // Calculate uptime
      this.metrics.uptime = Date.now() - this.startTime;
      
      this.log(`📊 Memory: ${memoryUsageMB}MB | Uptime: ${Math.round(this.metrics.uptime / 1000)}s | Requests: ${this.metrics.totalRequests}`, 'info');
      
    } catch (error) {
      this.log(`Error checking performance: ${error.message}`, 'error');
    }
  }

  async sendAlert(type, message) {
    const alert = {
      timestamp: new Date().toISOString(),
      type,
      message,
      metrics: {
        totalRequests: this.metrics.totalRequests,
        errorRate: ((this.metrics.failedRequests / this.metrics.totalRequests) * 100).toFixed(2),
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        uptime: Math.round(this.metrics.uptime / 1000)
      }
    };
    
    this.alertHistory.push(alert);
    
    // Console alert
    this.log(`🚨 ALERT [${type.toUpperCase()}]: ${message}`, 'error');
    
    // Save alert to file
    const alertsFile = path.join(this.monitoringDir, 'alerts.json');
    try {
      let alerts = [];
      if (fs.existsSync(alertsFile)) {
        alerts = JSON.parse(fs.readFileSync(alertsFile, 'utf8'));
      }
      alerts.push(alert);
      fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      this.log(`Error saving alert: ${error.message}`, 'error');
    }
    
    // Send webhook alert if configured
    if (monitoringConfig.alerts.webhook) {
      try {
        await fetch(monitoringConfig.alerts.webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: `🚨 Production Alert: ${message}`,
            alert,
            service: 'Team Availability Tracker'
          })
        });
        this.log('Alert sent to webhook', 'info');
      } catch (error) {
        this.log(`Failed to send webhook alert: ${error.message}`, 'error');
      }
    }
  }

  generateReport() {
    const runtime = Date.now() - this.startTime;
    const errorRate = this.metrics.totalRequests > 0 ? 
      ((this.metrics.failedRequests / this.metrics.totalRequests) * 100).toFixed(2) : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      runtime: runtime,
      summary: {
        uptime: Math.round(runtime / 1000),
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        errorRate: parseFloat(errorRate),
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        peakResponseTime: this.metrics.peakResponseTime
      },
      thresholds: monitoringConfig.thresholds,
      alerts: this.alertHistory.length,
      lastHealthCheck: this.lastHealthCheck,
      performance: {
        memoryUsage: this.metrics.memoryUsage.slice(-10), // Last 10 readings
        recentErrors: this.metrics.errors.slice(-5) // Last 5 errors
      }
    };
    
    // Save report
    const reportsDir = path.join(this.monitoringDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportFile = path.join(reportsDir, `report-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Console summary
    this.log('\\n' + '='.repeat(80), 'header');
    this.log('📊 PRODUCTION MONITORING REPORT', 'header');
    this.log('='.repeat(80), 'header');
    this.log(`Uptime: ${Math.round(runtime / 1000)}s | Total Requests: ${this.metrics.totalRequests}`, 'info');
    this.log(`Success Rate: ${(100 - errorRate).toFixed(2)}% | Error Rate: ${errorRate}%`, 
             errorRate > monitoringConfig.thresholds.errorRate ? 'error' : 'success');
    this.log(`Avg Response: ${Math.round(this.metrics.averageResponseTime)}ms | Peak: ${this.metrics.peakResponseTime}ms`, 
             this.metrics.averageResponseTime > monitoringConfig.thresholds.responseTime ? 'warn' : 'success');
    this.log(`Alerts Generated: ${this.alertHistory.length}`, 
             this.alertHistory.length > 0 ? 'warn' : 'success');
    this.log('='.repeat(80), 'header');
    
    return report;
  }

  async start() {
    if (this.isRunning) {
      this.log('Monitor is already running', 'warn');
      return;
    }
    
    this.isRunning = true;
    this.log('🚀 Starting production monitoring...', 'header');
    this.log(`Monitoring URLs: ${Object.values(monitoringConfig.urls).join(', ')}`, 'info');
    this.log(`Health check interval: ${monitoringConfig.intervals.health / 1000}s`, 'info');
    this.log(`Performance check interval: ${monitoringConfig.intervals.performance / 1000}s`, 'info');
    this.log(`Report generation interval: ${monitoringConfig.intervals.report / 1000 / 60}min`, 'info');
    
    // Initial checks
    await this.checkHealth();
    await this.checkPerformance();
    
    // Set up intervals
    const healthInterval = setInterval(this.checkHealth, monitoringConfig.intervals.health);
    const performanceInterval = setInterval(this.checkPerformance, monitoringConfig.intervals.performance);
    const reportInterval = setInterval(this.generateReport, monitoringConfig.intervals.report);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('\\n⚠️ Shutting down monitoring...', 'warn');
      clearInterval(healthInterval);
      clearInterval(performanceInterval);
      clearInterval(reportInterval);
      
      this.generateReport();
      this.log('📊 Final report generated', 'info');
      this.log('✅ Production monitoring stopped', 'success');
      process.exit(0);
    });
    
    this.log('✅ Production monitoring started successfully', 'success');
  }

  stop() {
    this.isRunning = false;
    this.generateReport();
    this.log('📊 Monitoring stopped, final report generated', 'info');
  }
}

// Command line interface
if (require.main === module) {
  const monitor = new ProductionMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      monitor.start().catch(error => {
        console.error('Failed to start monitoring:', error.message);
        process.exit(1);
      });
      break;
      
    case 'check':
      monitor.checkHealth().then(() => {
        monitor.checkPerformance().then(() => {
          console.log('Health and performance check completed');
          process.exit(0);
        });
      }).catch(error => {
        console.error('Health check failed:', error.message);
        process.exit(1);
      });
      break;
      
    case 'report':
      const report = monitor.generateReport();
      console.log('Report generated:', report);
      break;
      
    default:
      console.log(`
Usage: node production-monitoring.js [command]

Commands:
  start   - Start continuous monitoring (default)
  check   - Run single health and performance check
  report  - Generate current status report

Environment Variables:
  PRODUCTION_URL          - Base URL for production application
  MONITORING_WEBHOOK_URL  - Webhook URL for alerts
  ALERT_EMAIL            - Email address for alerts
  SLACK_WEBHOOK_URL      - Slack webhook for notifications

Examples:
  node production-monitoring.js start
  PRODUCTION_URL=https://your-domain.com node production-monitoring.js start
  node production-monitoring.js check
      `);
      process.exit(command ? 1 : 0);
  }
}

module.exports = ProductionMonitor;