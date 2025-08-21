#!/usr/bin/env node

/**
 * APPLICATION RECOVERY VALIDATION TEST
 * Tests critical functionality after schema fixes to ensure full recovery
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const TEST_URL = 'http://localhost:3005';
const EXECUTIVE_URL = 'http://localhost:3005/executive';
const HEALTH_URL = 'http://localhost:3005/api/health';

async function runValidationTests() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      passed: 0,
      failed: 0,
      errors: []
    }
  };

  let browser;
  
  try {
    console.log('🚀 Starting Application Recovery Validation Tests...\n');
    
    // Launch browser for testing
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console messages to check for errors
    const consoleMessages = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });

    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      });
    });

    // Test 1: Main Page Loading and Teams Display
    console.log('📋 TEST 1: Main Page Loading and Teams Display');
    try {
      const startTime = Date.now();
      await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      console.log(`   ✅ Page loaded in ${loadTime}ms`);
      
      // Wait for teams to potentially load
      await page.waitForTimeout(3000);
      
      // Check for team elements
      const teamElements = await page.$$('[data-testid="team-card"], [class*="team"], [class*="Team"]');
      const teamCount = teamElements.length;
      
      console.log(`   📊 Found ${teamCount} team elements on page`);
      
      // Check page title
      const pageTitle = await page.title();
      console.log(`   📄 Page title: ${pageTitle}`);
      
      results.tests.mainPageLoading = {
        passed: true,
        loadTime,
        teamCount,
        pageTitle,
        details: 'Main page loaded successfully'
      };
      results.summary.passed++;
      
    } catch (error) {
      console.log(`   ❌ Main page test failed: ${error.message}`);
      results.tests.mainPageLoading = {
        passed: false,
        error: error.message
      };
      results.summary.failed++;
      results.summary.errors.push(`Main page loading: ${error.message}`);
    }

    // Test 2: Executive Dashboard Access
    console.log('\n🏢 TEST 2: Executive Dashboard Access');
    try {
      const startTime = Date.now();
      await page.goto(EXECUTIVE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      console.log(`   ✅ Executive page loaded in ${loadTime}ms`);
      
      // Wait for dashboard to initialize
      await page.waitForTimeout(3000);
      
      // Check for COO dashboard elements
      const dashboardElements = await page.$$('[class*="executive"], [class*="coo"], [class*="dashboard"]');
      const dashboardCount = dashboardElements.length;
      
      console.log(`   🎛️ Found ${dashboardCount} dashboard elements`);
      
      // Check if login screen appears (expected behavior)
      const loginElements = await page.$$('[class*="login"], [data-testid="executive-login"]');
      const hasLogin = loginElements.length > 0;
      
      console.log(`   🔐 Login screen present: ${hasLogin ? 'Yes' : 'No'}`);
      
      results.tests.executiveDashboard = {
        passed: true,
        loadTime,
        dashboardCount,
        hasLogin,
        details: 'Executive dashboard loaded successfully'
      };
      results.summary.passed++;
      
    } catch (error) {
      console.log(`   ❌ Executive dashboard test failed: ${error.message}`);
      results.tests.executiveDashboard = {
        passed: false,
        error: error.message
      };
      results.summary.failed++;
      results.summary.errors.push(`Executive dashboard: ${error.message}`);
    }

    // Test 3: Console Error Analysis
    console.log('\n🔍 TEST 3: Console Error Analysis');
    const errorMessages = consoleMessages.filter(msg => 
      msg.type === 'error' || 
      (msg.type === 'warning' && msg.text.includes('schema'))
    );
    
    const schemaErrors = errorMessages.filter(msg => 
      msg.text.includes('schema') || 
      msg.text.includes('column') || 
      msg.text.includes('hours') ||
      msg.text.includes('value')
    );
    
    const criticalErrors = errorMessages.filter(msg => 
      msg.text.includes('Failed') || 
      msg.text.includes('Error:') ||
      msg.text.includes('undefined')
    );

    console.log(`   📊 Total console messages: ${consoleMessages.length}`);
    console.log(`   ⚠️ Error/Warning messages: ${errorMessages.length}`);
    console.log(`   🗂️ Schema-related errors: ${schemaErrors.length}`);
    console.log(`   🚨 Critical errors: ${criticalErrors.length}`);
    
    if (schemaErrors.length > 0) {
      console.log('   Schema errors found:');
      schemaErrors.forEach((error, i) => {
        console.log(`      ${i + 1}. ${error.text}`);
      });
    }
    
    if (criticalErrors.length > 0) {
      console.log('   Critical errors found:');
      criticalErrors.forEach((error, i) => {
        console.log(`      ${i + 1}. ${error.text}`);
      });
    }

    results.tests.consoleErrors = {
      passed: schemaErrors.length === 0 && criticalErrors.length === 0,
      totalMessages: consoleMessages.length,
      errorCount: errorMessages.length,
      schemaErrorCount: schemaErrors.length,
      criticalErrorCount: criticalErrors.length,
      schemaErrors: schemaErrors.map(e => e.text),
      criticalErrors: criticalErrors.map(e => e.text),
      allMessages: consoleMessages
    };

    if (results.tests.consoleErrors.passed) {
      console.log('   ✅ No critical schema or error issues found');
      results.summary.passed++;
    } else {
      console.log('   ❌ Console errors detected');
      results.summary.failed++;
      results.summary.errors.push('Console errors detected');
    }

    // Test 4: Network Request Analysis
    console.log('\n🌐 TEST 4: Network Request Analysis');
    console.log(`   📡 Network errors: ${networkErrors.length}`);
    
    if (networkErrors.length > 0) {
      console.log('   Network errors found:');
      networkErrors.forEach((error, i) => {
        console.log(`      ${i + 1}. ${error.url} - ${error.failure}`);
      });
    }

    results.tests.networkRequests = {
      passed: networkErrors.length === 0,
      errorCount: networkErrors.length,
      errors: networkErrors
    };

    if (results.tests.networkRequests.passed) {
      console.log('   ✅ No network request failures');
      results.summary.passed++;
    } else {
      console.log('   ❌ Network request failures detected');
      results.summary.failed++;
      results.summary.errors.push('Network request failures');
    }

  } catch (globalError) {
    console.error('🚨 Global test error:', globalError);
    results.summary.errors.push(`Global error: ${globalError.message}`);
    results.summary.failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('📋 APPLICATION RECOVERY VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`🕒 Test completed at: ${results.timestamp}`);
  console.log(`✅ Tests passed: ${results.summary.passed}`);
  console.log(`❌ Tests failed: ${results.summary.failed}`);
  console.log(`📊 Total tests: ${results.summary.passed + results.summary.failed}`);
  
  if (results.summary.errors.length > 0) {
    console.log(`\n🚨 Errors encountered:`);
    results.summary.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  const overallSuccess = results.summary.failed === 0;
  console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);
  
  if (overallSuccess) {
    console.log('🎉 Application appears to be fully recovered and functional!');
  } else {
    console.log('⚠️ Application has issues that need to be addressed.');
  }

  // Save detailed results
  const reportPath = './validation-test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  return results;
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runValidationTests()
    .then((results) => {
      const success = results.summary.failed === 0;
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error running validation tests:', error);
      process.exit(1);
    });
}

module.exports = { runValidationTests };