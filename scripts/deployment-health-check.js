#!/usr/bin/env node

/**
 * Deployment Health Check Script
 * 
 * Comprehensive health validation for deployed applications
 * Used by CI/CD pipeline to ensure deployments are fully functional
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class DeploymentHealthChecker {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 5000,
      verbose: options.verbose || false,
      ...options
    };
    this.results = {
      overall: false,
      checks: [],
      errors: [],
      warnings: [],
      startTime: Date.now(),
      endTime: null,
      duration: null
    };
  }

  log(message, type = 'info') {
    if (!this.options.verbose && type === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    };
    
    console.log(`${emoji[type]} [${timestamp}] ${message}`);
  }

  async makeRequest(path, options = {}) {
    const url = new URL(path, this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'DeploymentHealthChecker/1.0',
        ...options.headers
      },
      timeout: this.options.timeout
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            url: url.toString()
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.options.timeout}ms`));
      });

      if (options.data) {
        req.write(options.data);
      }
      
      req.end();
    });
  }

  async retryRequest(path, options = {}) {
    let lastError;
    
    for (let i = 0; i < this.options.retries; i++) {
      try {
        return await this.makeRequest(path, options);
      } catch (error) {
        lastError = error;
        if (i < this.options.retries - 1) {
          this.log(`Request failed (attempt ${i + 1}/${this.options.retries}): ${error.message}`, 'warning');
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        }
      }
    }
    
    throw lastError;
  }

  async checkBasicConnectivity() {
    this.log('🔍 Checking basic connectivity...', 'info');
    
    try {
      const response = await this.retryRequest('/');
      const success = response.statusCode >= 200 && response.statusCode < 400;
      
      this.results.checks.push({
        name: 'Basic Connectivity',
        status: success,
        statusCode: response.statusCode,
        url: response.url,
        details: success ? 'Application is accessible' : `HTTP ${response.statusCode}`
      });
      
      this.log(`Basic connectivity: ${success ? 'PASSED' : 'FAILED'} (${response.statusCode})`, success ? 'success' : 'error');
      return success;
    } catch (error) {
      this.results.checks.push({
        name: 'Basic Connectivity',
        status: false,
        error: error.message,
        details: 'Failed to connect to application'
      });
      
      this.log(`Basic connectivity: FAILED - ${error.message}`, 'error');
      return false;
    }
  }

  async checkHealthEndpoint() {
    this.log('🏥 Checking health endpoint...', 'info');
    
    try {
      const response = await this.retryRequest('/api/health');
      const success = response.statusCode === 200;
      
      let healthData = {};
      try {
        healthData = JSON.parse(response.data);
      } catch (e) {
        this.log('Health endpoint returned non-JSON response', 'warning');
      }
      
      const dbHealthy = healthData.checks?.database === 'healthy';
      const overallHealthy = healthData.status === 'healthy';
      
      this.results.checks.push({
        name: 'Health Endpoint',
        status: success && overallHealthy,
        statusCode: response.statusCode,
        databaseHealth: dbHealthy,
        responseTime: healthData.checks?.uptime || 'unknown',
        details: success ? healthData.message : 'Health endpoint failed'
      });
      
      this.log(`Health endpoint: ${success && overallHealthy ? 'PASSED' : 'FAILED'}`, success && overallHealthy ? 'success' : 'error');
      if (!dbHealthy && success) {
        this.log('⚠️ Database health check failed', 'warning');
        this.results.warnings.push('Database connectivity issues detected');
      }
      
      return success && overallHealthy;
    } catch (error) {
      this.results.checks.push({
        name: 'Health Endpoint',
        status: false,
        error: error.message,
        details: 'Failed to reach health endpoint'
      });
      
      this.log(`Health endpoint: FAILED - ${error.message}`, 'error');
      return false;
    }
  }

  async checkCriticalPages() {
    this.log('📄 Checking critical pages...', 'info');
    
    const criticalPages = [
      { path: '/', name: 'Home Page' },
      { path: '/schedule', name: 'Schedule Page' },
      { path: '/teams', name: 'Teams Page' },
      { path: '/coo-dashboard', name: 'COO Dashboard' }
    ];
    
    let allPassed = true;
    
    for (const page of criticalPages) {
      try {
        const response = await this.retryRequest(page.path);
        const success = response.statusCode >= 200 && response.statusCode < 400;
        
        // Check for common error indicators in HTML
        const hasErrors = response.data && (
          response.data.includes('Application error') ||
          response.data.includes('500 Internal Server Error') ||
          response.data.includes('404 Not Found')
        );
        
        const pageHealthy = success && !hasErrors;
        allPassed = allPassed && pageHealthy;
        
        this.results.checks.push({
          name: `Page: ${page.name}`,
          status: pageHealthy,
          statusCode: response.statusCode,
          path: page.path,
          hasErrors,
          details: pageHealthy ? 'Page loads successfully' : 'Page has errors or failed to load'
        });
        
        this.log(`${page.name}: ${pageHealthy ? 'PASSED' : 'FAILED'} (${response.statusCode})`, pageHealthy ? 'success' : 'error');
        
      } catch (error) {
        allPassed = false;
        
        this.results.checks.push({
          name: `Page: ${page.name}`,
          status: false,
          path: page.path,
          error: error.message,
          details: 'Failed to load page'
        });
        
        this.log(`${page.name}: FAILED - ${error.message}`, 'error');
      }
    }
    
    return allPassed;
  }

  async checkAPIEndpoints() {
    this.log('🔌 Checking API endpoints...', 'info');
    
    const apiEndpoints = [
      { path: '/api/health', name: 'Health API', expectedStatus: 200 }
    ];
    
    let allPassed = true;
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await this.retryRequest(endpoint.path);
        const success = response.statusCode === endpoint.expectedStatus;
        allPassed = allPassed && success;
        
        this.results.checks.push({
          name: `API: ${endpoint.name}`,
          status: success,
          statusCode: response.statusCode,
          expectedStatus: endpoint.expectedStatus,
          path: endpoint.path,
          details: success ? 'API responds correctly' : `Expected ${endpoint.expectedStatus}, got ${response.statusCode}`
        });
        
        this.log(`API ${endpoint.name}: ${success ? 'PASSED' : 'FAILED'} (${response.statusCode})`, success ? 'success' : 'error');
        
      } catch (error) {
        allPassed = false;
        
        this.results.checks.push({
          name: `API: ${endpoint.name}`,
          status: false,
          path: endpoint.path,
          error: error.message,
          details: 'Failed to reach API endpoint'
        });
        
        this.log(`API ${endpoint.name}: FAILED - ${error.message}`, 'error');
      }
    }
    
    return allPassed;
  }

  async checkPerformance() {
    this.log('⚡ Checking performance metrics...', 'info');
    
    try {
      const startTime = Date.now();
      const response = await this.retryRequest('/');
      const responseTime = Date.now() - startTime;
      
      // Performance thresholds
      const RESPONSE_TIME_WARNING = 3000; // 3 seconds
      const RESPONSE_TIME_CRITICAL = 10000; // 10 seconds
      
      const performanceGood = responseTime < RESPONSE_TIME_WARNING;
      const performanceCritical = responseTime > RESPONSE_TIME_CRITICAL;
      
      this.results.checks.push({
        name: 'Performance Check',
        status: !performanceCritical,
        responseTime,
        threshold: {
          warning: RESPONSE_TIME_WARNING,
          critical: RESPONSE_TIME_CRITICAL
        },
        details: `Response time: ${responseTime}ms`
      });
      
      if (performanceCritical) {
        this.log(`Performance: CRITICAL - Response time ${responseTime}ms exceeds threshold`, 'error');
        this.results.errors.push(`Critical response time: ${responseTime}ms`);
        return false;
      } else if (!performanceGood) {
        this.log(`Performance: WARNING - Response time ${responseTime}ms is slow`, 'warning');
        this.results.warnings.push(`Slow response time: ${responseTime}ms`);
      } else {
        this.log(`Performance: PASSED - Response time ${responseTime}ms`, 'success');
      }
      
      return !performanceCritical;
    } catch (error) {
      this.results.checks.push({
        name: 'Performance Check',
        status: false,
        error: error.message,
        details: 'Failed to measure performance'
      });
      
      this.log(`Performance check: FAILED - ${error.message}`, 'error');
      return false;
    }
  }

  async checkSecurityHeaders() {
    this.log('🛡️ Checking security headers...', 'info');
    
    try {
      const response = await this.retryRequest('/');
      const headers = response.headers;
      
      const securityHeaders = {
        'x-frame-options': 'X-Frame-Options',
        'x-content-type-options': 'X-Content-Type-Options', 
        'referrer-policy': 'Referrer-Policy',
        'content-security-policy': 'Content-Security-Policy',
        'strict-transport-security': 'Strict-Transport-Security'
      };
      
      const presentHeaders = [];
      const missingHeaders = [];
      
      for (const [header, displayName] of Object.entries(securityHeaders)) {
        if (headers[header]) {
          presentHeaders.push(displayName);
        } else {
          missingHeaders.push(displayName);
        }
      }
      
      const securityScore = (presentHeaders.length / Object.keys(securityHeaders).length) * 100;
      const securityGood = securityScore >= 60; // At least 60% of headers present
      
      this.results.checks.push({
        name: 'Security Headers',
        status: securityGood,
        securityScore: Math.round(securityScore),
        presentHeaders,
        missingHeaders,
        details: `Security score: ${Math.round(securityScore)}%`
      });
      
      if (missingHeaders.length > 0) {
        this.log(`Security headers: ${securityGood ? 'PASSED' : 'FAILED'} - Missing: ${missingHeaders.join(', ')}`, securityGood ? 'warning' : 'error');
        if (!securityGood) {
          this.results.errors.push(`Missing critical security headers: ${missingHeaders.join(', ')}`);
        } else {
          this.results.warnings.push(`Missing some security headers: ${missingHeaders.join(', ')}`);
        }
      } else {
        this.log('Security headers: PASSED - All headers present', 'success');
      }
      
      return securityGood;
    } catch (error) {
      this.results.checks.push({
        name: 'Security Headers',
        status: false,
        error: error.message,
        details: 'Failed to check security headers'
      });
      
      this.log(`Security headers check: FAILED - ${error.message}`, 'error');
      return false;
    }
  }

  async runAllChecks() {
    this.log(`🚀 Starting deployment health check for: ${this.baseUrl}`, 'info');
    this.results.startTime = Date.now();
    
    const checks = [
      this.checkBasicConnectivity(),
      this.checkHealthEndpoint(),
      this.checkCriticalPages(),
      this.checkAPIEndpoints(),
      this.checkPerformance(),
      this.checkSecurityHeaders()
    ];
    
    const results = await Promise.all(checks);
    const allPassed = results.every(result => result === true);
    
    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;
    this.results.overall = allPassed;
    
    // Generate summary
    const passedChecks = this.results.checks.filter(check => check.status).length;
    const totalChecks = this.results.checks.length;
    const successRate = Math.round((passedChecks / totalChecks) * 100);
    
    this.log('\n📊 Health Check Summary:', 'info');
    this.log(`Overall Status: ${allPassed ? '✅ HEALTHY' : '❌ UNHEALTHY'}`, allPassed ? 'success' : 'error');
    this.log(`Success Rate: ${successRate}% (${passedChecks}/${totalChecks} checks passed)`, 'info');
    this.log(`Duration: ${this.results.duration}ms`, 'info');
    
    if (this.results.warnings.length > 0) {
      this.log(`Warnings: ${this.results.warnings.length}`, 'warning');
      this.results.warnings.forEach(warning => this.log(`  - ${warning}`, 'warning'));
    }
    
    if (this.results.errors.length > 0) {
      this.log(`Errors: ${this.results.errors.length}`, 'error');
      this.results.errors.forEach(error => this.log(`  - ${error}`, 'error'));
    }
    
    return this.results;
  }

  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      overall: this.results.overall,
      duration: this.results.duration,
      summary: {
        total: this.results.checks.length,
        passed: this.results.checks.filter(c => c.status).length,
        failed: this.results.checks.filter(c => !c.status).length,
        successRate: Math.round((this.results.checks.filter(c => c.status).length / this.results.checks.length) * 100)
      },
      checks: this.results.checks,
      warnings: this.results.warnings,
      errors: this.results.errors
    };
  }
}

// CLI Usage
async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || process.env.DEPLOYMENT_URL || 'http://localhost:3000';
  const verbose = args.includes('--verbose') || process.env.VERBOSE === 'true';
  const timeout = parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1]) || 30000;
  const retries = parseInt(args.find(arg => arg.startsWith('--retries='))?.split('=')[1]) || 3;
  
  if (!baseUrl) {
    console.error('❌ Usage: node deployment-health-check.js <url> [--verbose] [--timeout=30000] [--retries=3]');
    process.exit(1);
  }
  
  const healthChecker = new DeploymentHealthChecker(baseUrl, {
    verbose,
    timeout,
    retries
  });
  
  try {
    const results = await healthChecker.runAllChecks();
    const report = healthChecker.generateReport();
    
    // Output JSON report if requested
    if (args.includes('--json') || process.env.OUTPUT_JSON === 'true') {
      console.log(JSON.stringify(report, null, 2));
    }
    
    // Exit with appropriate code
    process.exit(results.overall ? 0 : 1);
    
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = DeploymentHealthChecker;

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
  });
}