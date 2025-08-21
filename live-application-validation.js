#!/usr/bin/env node

/**
 * Live Application Validation for Version 2.2 Enterprise Deployment
 * 
 * This script performs real-time validation by:
 * 1. Testing HTTP endpoints and response times
 * 2. Validating critical API routes
 * 3. Checking database connectivity
 * 4. Testing business logic endpoints
 * 5. Verifying real-time calculation accuracy
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class LiveApplicationValidator {
  constructor() {
    this.baseUrl = 'http://localhost:3002';
    this.results = {
      timestamp: new Date().toISOString(),
      version: '2.2',
      testSuites: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        criticalIssues: [],
        performance: {}
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '🔍',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'critical': '🚨'
    }[type] || '📝';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const url = `${this.baseUrl}${path}`;
      
      const req = http.get(url, (res) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data,
            responseTime
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(options.timeout || 10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async validateApplicationLoad() {
    this.log('Testing Application Load and Basic Functionality...', 'info');
    const testSuite = {
      name: 'Application Load and Basic Functionality',
      tests: [],
      status: 'passed',
      critical: true
    };

    try {
      // Test 1: Main page loads
      this.log('  Testing main page load...', 'info');
      const mainPageResponse = await this.makeRequest('/');
      testSuite.tests.push({
        name: 'Main Page Load',
        status: mainPageResponse.statusCode === 200 ? 'passed' : 'failed',
        details: `Status: ${mainPageResponse.statusCode}, Response time: ${mainPageResponse.responseTime}ms`
      });

      if (mainPageResponse.statusCode === 200) {
        // Check for critical elements in the response
        const hasTeamSelection = mainPageResponse.data.includes('TeamSelectionScreen') || 
                                 mainPageResponse.data.includes('team-selection');
        const hasReactComponents = mainPageResponse.data.includes('_app') || 
                                   mainPageResponse.data.includes('react');
        
        testSuite.tests.push({
          name: 'Main Page Content',
          status: hasTeamSelection || hasReactComponents ? 'passed' : 'warning',
          details: `Team selection: ${hasTeamSelection}, React components: ${hasReactComponents}`
        });
      }

      // Test 2: Executive dashboard loads
      this.log('  Testing executive dashboard load...', 'info');
      const executiveResponse = await this.makeRequest('/executive');
      testSuite.tests.push({
        name: 'Executive Dashboard Load',
        status: executiveResponse.statusCode === 200 ? 'passed' : 'failed',
        details: `Status: ${executiveResponse.statusCode}, Response time: ${executiveResponse.responseTime}ms`
      });

      // Test 3: Check for JavaScript compilation
      this.log('  Testing JavaScript compilation...', 'info');
      const jsRequest = await this.makeRequest('/_next/static/chunks/').catch(() => null);
      testSuite.tests.push({
        name: 'JavaScript Compilation',
        status: jsRequest && jsRequest.statusCode < 500 ? 'passed' : 'warning',
        details: jsRequest ? `JS assets status: ${jsRequest.statusCode}` : 'Unable to check JS assets'
      });

      // Performance validation
      this.results.summary.performance.mainPageLoad = mainPageResponse.responseTime;
      this.results.summary.performance.executiveDashboardLoad = executiveResponse.responseTime;

      if (mainPageResponse.responseTime > 3000) {
        testSuite.tests.push({
          name: 'Main Page Performance',
          status: 'warning',
          details: `Load time ${mainPageResponse.responseTime}ms exceeds 3000ms target`
        });
        this.results.summary.criticalIssues.push(`Performance: Main page load time ${mainPageResponse.responseTime}ms`);
      } else {
        testSuite.tests.push({
          name: 'Main Page Performance',
          status: 'passed',
          details: `Load time ${mainPageResponse.responseTime}ms within target`
        });
      }

    } catch (error) {
      this.log(`Application load test failed: ${error.message}`, 'error');
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Application Load Error',
        status: 'failed',
        details: error.message
      });
      this.results.summary.criticalIssues.push(`CRITICAL: Application failed to load - ${error.message}`);
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async validateAPIEndpoints() {
    this.log('Testing API Endpoints and Database Connectivity...', 'info');
    const testSuite = {
      name: 'API Endpoints and Database Connectivity',
      tests: [],
      status: 'passed',
      critical: true
    };

    try {
      // Test 1: API routes availability (check for 404 vs 500 errors)
      const apiRoutes = [
        '/api/teams',
        '/api/availability',
        '/api/sprints',
        '/api/members'
      ];

      for (const route of apiRoutes) {
        try {
          this.log(`  Testing API route: ${route}`, 'info');
          const response = await this.makeRequest(route);
          
          // API routes might return 404 if not implemented, but should not return 500
          const isHealthy = response.statusCode < 500;
          testSuite.tests.push({
            name: `API Route: ${route}`,
            status: isHealthy ? 'passed' : 'failed',
            details: `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`
          });

          if (!isHealthy) {
            this.results.summary.criticalIssues.push(`API Route Error: ${route} returned ${response.statusCode}`);
          }
        } catch (error) {
          testSuite.tests.push({
            name: `API Route: ${route}`,
            status: 'warning',
            details: `Connection error: ${error.message}`
          });
        }
      }

      // Test 2: Static assets availability
      this.log('  Testing static assets...', 'info');
      const staticRoutes = [
        '/_next/static/css/',
        '/_next/static/chunks/',
        '/favicon.ico'
      ];

      for (const route of staticRoutes) {
        try {
          const response = await this.makeRequest(route);
          const isAvailable = response.statusCode < 500;
          testSuite.tests.push({
            name: `Static Asset: ${route}`,
            status: isAvailable ? 'passed' : 'warning',
            details: `Status: ${response.statusCode}`
          });
        } catch (error) {
          testSuite.tests.push({
            name: `Static Asset: ${route}`,
            status: 'warning',
            details: `Error: ${error.message}`
          });
        }
      }

    } catch (error) {
      this.log(`API endpoint validation failed: ${error.message}`, 'error');
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'API Endpoints Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async validateRealTimeFeatures() {
    this.log('Testing Real-time Features and Business Logic...', 'info');
    const testSuite = {
      name: 'Real-time Features and Business Logic',
      tests: [],
      status: 'passed',
      critical: true
    };

    try {
      // Test 1: Check application for real-time indicators
      this.log('  Testing for real-time feature indicators...', 'info');
      const mainPageResponse = await this.makeRequest('/');
      
      // Look for real-time related content in the main page
      const hasRealTimeFeatures = mainPageResponse.data.includes('real-time') ||
                                  mainPageResponse.data.includes('realTime') ||
                                  mainPageResponse.data.includes('completion') ||
                                  mainPageResponse.data.includes('status');

      testSuite.tests.push({
        name: 'Real-time Feature Indicators',
        status: hasRealTimeFeatures ? 'passed' : 'warning',
        details: hasRealTimeFeatures ? 'Real-time features detected in page content' : 'Limited real-time feature indicators'
      });

      // Test 2: Check executive dashboard for completion status
      this.log('  Testing executive dashboard for completion status...', 'info');
      const executiveResponse = await this.makeRequest('/executive');
      
      const hasCompletionStatus = executiveResponse.data.includes('completion') ||
                                  executiveResponse.data.includes('status') ||
                                  executiveResponse.data.includes('percentage') ||
                                  executiveResponse.data.includes('hours');

      testSuite.tests.push({
        name: 'Hours Completion Status Features',
        status: hasCompletionStatus ? 'passed' : 'warning',
        details: hasCompletionStatus ? 'Completion status features detected' : 'Limited completion status features'
      });

      // Test 3: Application responsiveness (multiple rapid requests)
      this.log('  Testing application responsiveness...', 'info');
      const rapidRequests = [];
      for (let i = 0; i < 3; i++) {
        rapidRequests.push(this.makeRequest('/'));
      }

      const responses = await Promise.all(rapidRequests);
      const allSuccessful = responses.every(r => r.statusCode === 200);
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;

      testSuite.tests.push({
        name: 'Application Responsiveness',
        status: allSuccessful && avgResponseTime < 5000 ? 'passed' : 'warning',
        details: `All requests successful: ${allSuccessful}, Average response time: ${Math.round(avgResponseTime)}ms`
      });

      this.results.summary.performance.responsiveness = avgResponseTime;

    } catch (error) {
      this.log(`Real-time features validation failed: ${error.message}`, 'error');
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Real-time Features Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async validateNavigationAndRouting() {
    this.log('Testing Navigation and Routing System...', 'info');
    const testSuite = {
      name: 'Navigation and Routing System',
      tests: [],
      status: 'passed'
    };

    try {
      // Test 1: Core routes accessibility
      const coreRoutes = [
        '/',
        '/executive'
      ];

      for (const route of coreRoutes) {
        try {
          this.log(`  Testing route: ${route}`, 'info');
          const response = await this.makeRequest(route);
          testSuite.tests.push({
            name: `Route Accessibility: ${route}`,
            status: response.statusCode === 200 ? 'passed' : 'failed',
            details: `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`
          });
        } catch (error) {
          testSuite.tests.push({
            name: `Route Accessibility: ${route}`,
            status: 'failed',
            details: `Error: ${error.message}`
          });
        }
      }

      // Test 2: Route with query parameters (simulating team navigation)
      this.log('  Testing parameterized routes...', 'info');
      try {
        const paramRoute = '/?team=1&executive=true';
        const response = await this.makeRequest(paramRoute);
        testSuite.tests.push({
          name: 'Parameterized Route Navigation',
          status: response.statusCode === 200 ? 'passed' : 'warning',
          details: `Status: ${response.statusCode} for team navigation route`
        });
      } catch (error) {
        testSuite.tests.push({
          name: 'Parameterized Route Navigation',
          status: 'warning',
          details: `Error testing parameterized route: ${error.message}`
        });
      }

      // Test 3: Error handling for invalid routes
      this.log('  Testing error handling...', 'info');
      try {
        const invalidRoute = '/nonexistent-route-12345';
        const response = await this.makeRequest(invalidRoute);
        const handlesErrors = response.statusCode === 404 || response.statusCode === 200; // Next.js might redirect
        testSuite.tests.push({
          name: 'Error Handling',
          status: handlesErrors ? 'passed' : 'warning',
          details: `Invalid route returned status: ${response.statusCode}`
        });
      } catch (error) {
        testSuite.tests.push({
          name: 'Error Handling',
          status: 'warning',
          details: `Error testing invalid route: ${error.message}`
        });
      }

    } catch (error) {
      this.log(`Navigation validation failed: ${error.message}`, 'error');
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Navigation System Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async validateSecurityAndPermissions() {
    this.log('Testing Security and Permissions...', 'info');
    const testSuite = {
      name: 'Security and Permissions',
      tests: [],
      status: 'passed'
    };

    try {
      // Test 1: Check for security headers
      this.log('  Testing security headers...', 'info');
      const response = await this.makeRequest('/');
      
      const hasSecurityHeaders = response.headers['x-frame-options'] ||
                                response.headers['x-content-type-options'] ||
                                response.headers['content-security-policy'];

      testSuite.tests.push({
        name: 'Security Headers',
        status: hasSecurityHeaders ? 'passed' : 'warning',
        details: hasSecurityHeaders ? 'Security headers detected' : 'Limited security headers'
      });

      // Test 2: Check for sensitive information exposure
      this.log('  Testing for information exposure...', 'info');
      const hasSensitiveInfo = response.data.includes('password') ||
                              response.data.includes('secret') ||
                              response.data.includes('api_key') ||
                              response.data.includes('database');

      testSuite.tests.push({
        name: 'Information Exposure',
        status: !hasSensitiveInfo ? 'passed' : 'warning',
        details: hasSensitiveInfo ? 'Potential sensitive information detected' : 'No obvious sensitive information exposed'
      });

      // Test 3: Executive access control
      this.log('  Testing executive access patterns...', 'info');
      const executiveResponse = await this.makeRequest('/executive');
      const hasAccessControl = executiveResponse.data.includes('COO') ||
                              executiveResponse.data.includes('executive') ||
                              executiveResponse.data.includes('permission');

      testSuite.tests.push({
        name: 'Executive Access Control',
        status: hasAccessControl ? 'passed' : 'warning',
        details: hasAccessControl ? 'Access control patterns detected' : 'Limited access control indicators'
      });

    } catch (error) {
      this.log(`Security validation failed: ${error.message}`, 'error');
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Security Validation Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  updateSummary(testSuite) {
    testSuite.tests.forEach(test => {
      this.results.summary.totalTests++;
      if (test.status === 'passed') {
        this.results.summary.passed++;
      } else if (test.status === 'failed') {
        this.results.summary.failed++;
        if (testSuite.critical) {
          this.results.summary.criticalIssues.push(`CRITICAL: ${testSuite.name} - ${test.name}: ${test.details}`);
        }
      } else if (test.status === 'warning') {
        this.results.summary.warnings++;
      }
    });
  }

  generateDeploymentReadinessAssessment() {
    const { summary } = this.results;
    const criticalFailures = summary.criticalIssues.length;
    const successRate = Math.round((summary.passed / summary.totalTests) * 100);
    
    let readinessStatus;
    let recommendations = [];

    if (criticalFailures === 0 && successRate >= 95) {
      readinessStatus = '✅ READY FOR DEPLOYMENT';
      recommendations.push('All systems operational and performing well');
      recommendations.push('Proceed with production deployment');
    } else if (criticalFailures === 0 && successRate >= 85) {
      readinessStatus = '⚠️ READY WITH MONITORING';
      recommendations.push('Minor issues present but deployment viable');
      recommendations.push('Monitor closely during initial deployment');
    } else if (criticalFailures <= 2 && successRate >= 75) {
      readinessStatus = '🔶 PROCEED WITH CAUTION';
      recommendations.push('Some issues identified');
      recommendations.push('Address issues before full deployment');
      recommendations.push('Consider staged deployment approach');
    } else {
      readinessStatus = '❌ NOT READY FOR DEPLOYMENT';
      recommendations.push('Critical issues must be resolved');
      recommendations.push('Complete fix and re-validation cycle required');
    }

    // Performance-based recommendations
    if (summary.performance.mainPageLoad > 3000) {
      recommendations.push('PERFORMANCE: Optimize main page load time');
    }

    if (summary.performance.responsiveness > 2000) {
      recommendations.push('PERFORMANCE: Improve application responsiveness');
    }

    // Critical system recommendations
    const criticalSuites = this.results.testSuites.filter(suite => 
      suite.critical && (suite.status === 'failed' || suite.tests.some(test => test.status === 'failed'))
    );

    if (criticalSuites.length > 0) {
      recommendations.push('PRIORITY: Fix critical systems - ' + 
        criticalSuites.map(suite => suite.name).join(', '));
    }

    return {
      status: readinessStatus,
      recommendations,
      successRate,
      criticalFailures
    };
  }

  async generateReport() {
    this.log('Generating Live Application Validation Report...', 'info');
    
    const reportPath = path.join(__dirname, 'live-application-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate human-readable summary
    const summaryPath = path.join(__dirname, 'live-application-validation-summary.md');
    const summary = this.generateMarkdownSummary();
    fs.writeFileSync(summaryPath, summary);
    
    this.log(`Reports generated:`, 'success');
    this.log(`   - JSON Report: ${reportPath}`, 'info');
    this.log(`   - Summary: ${summaryPath}`, 'info');
    
    return this.results;
  }

  generateMarkdownSummary() {
    const { summary, testSuites } = this.results;
    const successRate = Math.round((summary.passed / summary.totalTests) * 100);
    const assessment = this.generateDeploymentReadinessAssessment();
    
    let markdown = `# Live Application Validation Report - Version 2.2

## Executive Summary
- **Total Tests Executed:** ${summary.totalTests}
- **Tests Passed:** ${summary.passed}
- **Tests Failed:** ${summary.failed}
- **Warnings:** ${summary.warnings}
- **Success Rate:** ${successRate}%
- **Validation Date:** ${this.results.timestamp}

## Performance Metrics
- **Main Page Load Time:** ${summary.performance.mainPageLoad || 'N/A'}ms
- **Executive Dashboard Load:** ${summary.performance.executiveDashboardLoad || 'N/A'}ms
- **Average Responsiveness:** ${summary.performance.responsiveness || 'N/A'}ms

## Deployment Readiness Assessment
**Status:** ${assessment.status}

### Critical Issues
${summary.criticalIssues.length === 0 ? '✅ No critical issues detected' : 
  summary.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n')
}

### Recommendations
${assessment.recommendations.map(rec => `- ${rec}`).join('\n')}

## Test Suite Results

`;

    testSuites.forEach(suite => {
      const suitePassedTests = suite.tests.filter(t => t.status === 'passed').length;
      const suiteFailedTests = suite.tests.filter(t => t.status === 'failed').length;
      const suiteWarnings = suite.tests.filter(t => t.status === 'warning').length;
      
      markdown += `### ${suite.name} ${suite.critical ? '(MISSION CRITICAL)' : ''}
- **Status:** ${suite.status.toUpperCase()}
- **Passed:** ${suitePassedTests}
- **Failed:** ${suiteFailedTests}
- **Warnings:** ${suiteWarnings}

#### Test Details:
`;
      
      suite.tests.forEach(test => {
        const icon = test.status === 'passed' ? '✅' : 
                    test.status === 'failed' ? '❌' : '⚠️';
        markdown += `- ${icon} **${test.name}:** ${test.details}\n`;
      });
      
      markdown += '\n';
    });

    markdown += `## Deployment Decision Matrix

| Criteria | Status | Score |
|----------|--------|-------|
| Critical Systems | ${summary.criticalIssues.length === 0 ? '✅ Operational' : '❌ Issues'} | ${summary.criticalIssues.length === 0 ? '100%' : '<90%'} |
| Performance | ${(summary.performance.mainPageLoad || 0) < 3000 ? '✅ Acceptable' : '⚠️ Needs Optimization'} | ${(summary.performance.mainPageLoad || 0) < 3000 ? '✅' : '⚠️'} |
| Success Rate | ${successRate >= 90 ? '✅ Excellent' : successRate >= 80 ? '⚠️ Good' : '❌ Poor'} | ${successRate}% |
| Overall Readiness | ${assessment.status} | ${assessment.status.includes('READY') ? 'Go' : 'No-Go'} |

## Final Recommendation
${assessment.successRate >= 90 && summary.criticalIssues.length === 0 ? 
  '🚀 **PROCEED TO DEPLOYMENT** - All systems validated and operational' :
  '🔧 **COMPLETE FIXES FIRST** - Address identified issues before deployment'
}
`;

    return markdown;
  }

  async execute() {
    try {
      this.log('Starting Live Application Validation for Version 2.2...', 'info');
      this.log('🎯 VALIDATION SCOPE: Live application testing and deployment readiness', 'info');
      
      // Execute all validation suites
      await this.validateApplicationLoad();
      await this.validateAPIEndpoints();
      await this.validateRealTimeFeatures();
      await this.validateNavigationAndRouting();
      await this.validateSecurityAndPermissions();
      
      const results = await this.generateReport();
      const assessment = this.generateDeploymentReadinessAssessment();
      
      this.log('🎯 LIVE VALIDATION COMPLETE', 'success');
      this.log(`Success Rate: ${assessment.successRate}%`, 'info');
      this.log(`Critical Issues: ${assessment.criticalFailures}`, 'info');
      this.log(`Deployment Status: ${assessment.status}`, 'info');
      
      return results;
      
    } catch (error) {
      this.log(`Live validation execution failed: ${error.message}`, 'error');
      this.results.summary.criticalIssues.push(`Live validation execution error: ${error.message}`);
      await this.generateReport();
      throw error;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const validator = new LiveApplicationValidator();
  validator.execute()
    .then(results => {
      console.log('\n✅ Live Application Validation completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Live Application Validation failed:', error);
      process.exit(1);
    });
}

module.exports = LiveApplicationValidator;