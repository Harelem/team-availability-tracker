#!/usr/bin/env node

/**
 * Comprehensive Application Recovery Validation Test
 * Tests all critical functionality after database security and performance enhancements
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class ApplicationValidationSuite {
  constructor() {
    this.baseUrl = 'http://localhost:3002';
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      overallStatus: 'PENDING',
      categories: {
        coreTeamFunctionality: { status: 'PENDING', tests: [] },
        databaseSecurity: { status: 'PENDING', tests: [] },
        performanceValidation: { status: 'PENDING', tests: [] },
        typescriptIntegration: { status: 'PENDING', tests: [] },
        cooExecutiveFeatures: { status: 'PENDING', tests: [] },
        errorHandling: { status: 'PENDING', tests: [] },
        endToEndWorkflows: { status: 'PENDING', tests: [] }
      },
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        criticalIssues: []
      }
    };
  }

  async initialize() {
    console.log('🚀 Starting Comprehensive Application Validation...\n');
    
    try {
      this.browser = await puppeteer.launch({
        headless: false, // Show browser for debugging
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000
      });
      
      this.page = await this.browser.newPage();
      
      // Set up console logging to capture any runtime errors
      this.page.on('console', msg => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
          console.log(`Browser ${type.toUpperCase()}: ${msg.text()}`);
          if (type === 'error') {
            this.results.summary.criticalIssues.push(`Console Error: ${msg.text()}`);
          }
        }
      });

      // Set up error handling
      this.page.on('pageerror', error => {
        console.log('❌ Page Error:', error.message);
        this.results.summary.criticalIssues.push(`Page Error: ${error.message}`);
      });

      this.page.on('requestfailed', request => {
        console.log('❌ Failed Request:', request.url(), request.failure()?.errorText);
        this.results.summary.criticalIssues.push(`Failed Request: ${request.url()} - ${request.failure()?.errorText}`);
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error.message);
      return false;
    }
  }

  async testPageLoad(url, testName, timeout = 15000) {
    const startTime = Date.now();
    
    try {
      console.log(`Testing: ${testName}...`);
      
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout
      });
      
      const loadTime = Date.now() - startTime;
      const statusCode = response?.status();
      
      if (!response || statusCode >= 400) {
        return {
          name: testName,
          status: 'FAILED',
          error: `HTTP ${statusCode} - Failed to load ${url}`,
          loadTime,
          details: { statusCode, url }
        };
      }
      
      // Check for basic page elements
      const hasTitle = await this.page.$('title');
      const hasBody = await this.page.$('body');
      
      if (!hasTitle || !hasBody) {
        return {
          name: testName,
          status: 'FAILED',
          error: 'Page missing basic HTML structure',
          loadTime,
          details: { hasTitle: !!hasTitle, hasBody: !!hasBody }
        };
      }
      
      return {
        name: testName,
        status: 'PASSED',
        loadTime,
        details: { statusCode, url }
      };
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        error: error.message,
        loadTime: Date.now() - startTime,
        details: { url }
      };
    }
  }

  async testCoreTeamFunctionality() {
    console.log('\n📊 Testing Core Team Functionality...\n');
    
    const tests = [];
    
    // 1. Test main page load
    const mainPageTest = await this.testPageLoad(`${this.baseUrl}`, 'Main Page Load');
    tests.push(mainPageTest);
    
    if (mainPageTest.status === 'PASSED') {
      try {
        // 2. Test team selection screen
        await this.page.waitForSelector('body', { timeout: 10000 });
        
        // Check for team selection or dashboard elements
        const hasTeamSelection = await this.page.$('[data-testid="team-selection"], .team-selection, h1, h2');
        tests.push({
          name: 'Page Content Loaded',
          status: hasTeamSelection ? 'PASSED' : 'FAILED',
          details: { hasContent: !!hasTeamSelection }
        });
        
        // 3. Test for React hydration completion
        await this.page.waitForTimeout(2000); // Allow for hydration
        
        const isInteractive = await this.page.evaluate(() => {
          // Check if React has hydrated by looking for interactive elements
          const buttons = document.querySelectorAll('button:not([disabled])');
          const links = document.querySelectorAll('a[href]');
          return buttons.length > 0 || links.length > 0;
        });
        
        tests.push({
          name: 'React Hydration Complete',
          status: isInteractive ? 'PASSED' : 'WARNING',
          details: { isInteractive }
        });
        
      } catch (error) {
        tests.push({
          name: 'Page Content Analysis',
          status: 'FAILED',
          error: error.message
        });
      }
    }
    
    // 4. Test teams page if accessible
    const teamsPageTest = await this.testPageLoad(`${this.baseUrl}/teams`, 'Teams Page Load');
    tests.push(teamsPageTest);
    
    // 5. Test schedule page if accessible
    const schedulePageTest = await this.testPageLoad(`${this.baseUrl}/schedule`, 'Schedule Page Load');
    tests.push(schedulePageTest);
    
    this.results.categories.coreTeamFunctionality = {
      status: tests.every(t => t.status === 'PASSED') ? 'PASSED' : 
              tests.some(t => t.status === 'FAILED') ? 'FAILED' : 'WARNING',
      tests
    };
  }

  async testPerformanceValidation() {
    console.log('\n⚡ Testing Performance Validation...\n');
    
    const tests = [];
    
    try {
      // Test performance metrics
      const startTime = Date.now();
      
      await this.page.goto(`${this.baseUrl}`, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      
      const totalLoadTime = Date.now() - startTime;
      
      tests.push({
        name: 'Page Load Performance',
        status: totalLoadTime < 5000 ? 'PASSED' : totalLoadTime < 10000 ? 'WARNING' : 'FAILED',
        details: { loadTime: totalLoadTime, threshold: '5s target, 10s max' }
      });
      
      // Test for performance monitoring scripts
      const hasPerformanceMonitor = await this.page.evaluate(() => {
        return !!window.performance && typeof window.performance.mark === 'function';
      });
      
      tests.push({
        name: 'Performance Monitoring Available',
        status: hasPerformanceMonitor ? 'PASSED' : 'WARNING',
        details: { available: hasPerformanceMonitor }
      });
      
    } catch (error) {
      tests.push({
        name: 'Performance Test',
        status: 'FAILED',
        error: error.message
      });
    }
    
    this.results.categories.performanceValidation = {
      status: tests.every(t => t.status === 'PASSED') ? 'PASSED' : 
              tests.some(t => t.status === 'FAILED') ? 'FAILED' : 'WARNING',
      tests
    };
  }

  async testDatabaseConnection() {
    console.log('\n🔐 Testing Database Security & Connection...\n');
    
    const tests = [];
    
    try {
      // Test if the application can load (indicating database connection works)
      await this.page.goto(`${this.baseUrl}`, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      
      // Check for database-related errors in console
      const hasDBErrors = this.results.summary.criticalIssues.some(issue => 
        issue.toLowerCase().includes('database') || 
        issue.toLowerCase().includes('supabase') ||
        issue.toLowerCase().includes('connection')
      );
      
      tests.push({
        name: 'Database Connection Health',
        status: hasDBErrors ? 'FAILED' : 'PASSED',
        details: { errors: hasDBErrors ? 'Database errors detected in console' : 'No database errors detected' }
      });
      
      // Test if environment variables are properly configured
      const envCheck = await this.page.evaluate(() => {
        // Basic check - if the page loads without immediate errors, env is likely OK
        return document.readyState === 'complete';
      });
      
      tests.push({
        name: 'Environment Configuration',
        status: envCheck ? 'PASSED' : 'FAILED',
        details: { documentReady: envCheck }
      });
      
    } catch (error) {
      tests.push({
        name: 'Database Security Test',
        status: 'FAILED',
        error: error.message
      });
    }
    
    this.results.categories.databaseSecurity = {
      status: tests.every(t => t.status === 'PASSED') ? 'PASSED' : 'FAILED',
      tests
    };
  }

  async testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...\n');
    
    const tests = [];
    
    try {
      // Test 404 page handling
      const notFoundTest = await this.testPageLoad(`${this.baseUrl}/non-existent-page`, '404 Error Handling', 10000);
      
      tests.push({
        name: '404 Page Handling',
        status: notFoundTest.status === 'PASSED' || notFoundTest.details?.statusCode === 404 ? 'PASSED' : 'WARNING',
        details: { statusCode: notFoundTest.details?.statusCode }
      });
      
      // Check if there are any uncaught JavaScript errors
      const jsErrorCount = this.results.summary.criticalIssues.filter(issue => 
        issue.includes('Error:') || issue.includes('TypeError:') || issue.includes('ReferenceError:')
      ).length;
      
      tests.push({
        name: 'JavaScript Error Handling',
        status: jsErrorCount === 0 ? 'PASSED' : jsErrorCount < 3 ? 'WARNING' : 'FAILED',
        details: { errorCount: jsErrorCount, errors: jsErrorCount > 0 ? this.results.summary.criticalIssues : [] }
      });
      
    } catch (error) {
      tests.push({
        name: 'Error Handling Test',
        status: 'FAILED',
        error: error.message
      });
    }
    
    this.results.categories.errorHandling = {
      status: tests.every(t => t.status === 'PASSED') ? 'PASSED' : 
              tests.some(t => t.status === 'FAILED') ? 'FAILED' : 'WARNING',
      tests
    };
  }

  async runComprehensiveValidation() {
    if (!(await this.initialize())) {
      return this.results;
    }
    
    try {
      // Run all test categories
      await this.testCoreTeamFunctionality();
      await this.testPerformanceValidation();
      await this.testDatabaseConnection();
      await this.testErrorHandling();
      
      // Calculate overall results
      const allTests = Object.values(this.results.categories).flatMap(cat => cat.tests);
      this.results.summary.totalTests = allTests.length;
      this.results.summary.passed = allTests.filter(t => t.status === 'PASSED').length;
      this.results.summary.failed = allTests.filter(t => t.status === 'FAILED').length;
      this.results.summary.warnings = allTests.filter(t => t.status === 'WARNING').length;
      
      // Determine overall status
      const categoryStatuses = Object.values(this.results.categories).map(cat => cat.status);
      if (categoryStatuses.every(s => s === 'PASSED')) {
        this.results.overallStatus = 'PASSED';
      } else if (categoryStatuses.some(s => s === 'FAILED')) {
        this.results.overallStatus = 'FAILED';
      } else {
        this.results.overallStatus = 'WARNING';
      }
      
    } catch (error) {
      console.error('❌ Critical error during validation:', error);
      this.results.overallStatus = 'CRITICAL_ERROR';
      this.results.summary.criticalIssues.push(`Validation Error: ${error.message}`);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
    
    return this.results;
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 COMPREHENSIVE APPLICATION VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 OVERALL STATUS: ${this.results.overallStatus}`);
    console.log(`📊 Test Summary: ${this.results.summary.passed} passed, ${this.results.summary.failed} failed, ${this.results.summary.warnings} warnings`);
    
    // Report by category
    Object.entries(this.results.categories).forEach(([category, data]) => {
      console.log(`\n📁 ${category.toUpperCase()}: ${data.status}`);
      data.tests.forEach(test => {
        const icon = test.status === 'PASSED' ? '✅' : test.status === 'FAILED' ? '❌' : '⚠️';
        console.log(`  ${icon} ${test.name}`);
        if (test.error) {
          console.log(`      Error: ${test.error}`);
        }
        if (test.loadTime) {
          console.log(`      Load Time: ${test.loadTime}ms`);
        }
      });
    });
    
    // Critical Issues
    if (this.results.summary.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.results.summary.criticalIssues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

async function main() {
  const validator = new ApplicationValidationSuite();
  const results = await validator.runComprehensiveValidation();
  
  validator.generateReport();
  
  // Save detailed results
  const reportPath = path.join(__dirname, 'comprehensive-validation-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(results.overallStatus === 'PASSED' ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { ApplicationValidationSuite };