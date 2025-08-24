#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * 
 * This script orchestrates all test suites based on the debug knowledge base
 * and ensures coverage of all critical issues that were previously fixed.
 * 
 * Based on Bug Reports #1-28 and their fixes, this runner:
 * 1. Runs automated tests for data persistence (Bug Report #28)
 * 2. Executes mobile-specific tests (Bug Reports #10-15, #40-41)  
 * 3. Validates authentication and real-time features (Bug Report #27)
 * 4. Checks for regression of previously fixed issues
 * 5. Provides comprehensive reporting and recommendations
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  projectRoot: '/Users/harel/team-availability-tracker',
  testTimeout: 60000, // 1 minute per test suite
  retryAttempts: 2,
  parallel: true,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipSlow: process.argv.includes('--fast'),
  mobileOnly: process.argv.includes('--mobile-only'),
  criticalOnly: process.argv.includes('--critical-only')
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

// Logging utilities
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.cyan}\n🧪 ${msg}${colors.reset}\n${'='.repeat(60)}`),
  critical: (msg) => console.log(`${colors.bgRed} CRITICAL ${colors.reset} ${colors.red}${msg}${colors.reset}`),
  mobile: (msg) => console.log(`${colors.magenta}📱 ${msg}${colors.reset}`)
};

// Test suites configuration based on debug knowledge base priorities
const testSuites = {
  // CRITICAL - Bug Report #28: Data persistence between views
  dataPeresistence: {
    name: 'Data Persistence Tests',
    command: 'npm test -- tests/schedule.test.ts',
    timeout: 30000,
    priority: 'critical',
    description: 'Tests data consistency when switching between week and sprint views'
  },
  
  // HIGH - Bug Reports #10-15: Mobile navigation and hydration
  mobileNavigation: {
    name: 'Mobile Navigation Tests', 
    command: 'npm test -- __tests__/mobile/responsive.test.tsx',
    timeout: 25000,
    priority: 'high',
    description: 'Tests hamburger menu, touch interactions, and hydration safety'
  },
  
  // HIGH - Bug Report #27: Authentication and WebSocket
  authentication: {
    name: 'Authentication & Real-time Tests',
    command: 'npm test -- __tests__/regression/permissions.test.ts',
    timeout: 20000,
    priority: 'high', 
    description: 'Tests authentication flows and WebSocket connections'
  },
  
  // MEDIUM - Bug Reports #1-8: General regression prevention
  regression: {
    name: 'Regression Test Suite',
    command: 'npm test -- __tests__/regression/',
    timeout: 45000,
    priority: 'medium',
    description: 'Prevents regression of previously fixed bugs'
  },
  
  // MEDIUM - Performance and accessibility
  performance: {
    name: 'Performance & Accessibility Tests',
    command: 'npm test -- __tests__/performance/DesignSystem.performance.test.tsx',
    timeout: 30000,
    priority: 'medium',
    description: 'Performance metrics and accessibility compliance'
  },
  
  // LOW - Integration tests
  integration: {
    name: 'Integration Test Suite',
    command: 'npm test -- __tests__/integration/',
    timeout: 60000,
    priority: 'low',
    description: 'End-to-end workflow validation'
  }
};

// Results tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  critical_failures: [],
  suite_results: {},
  start_time: Date.now(),
  mobile_issues: [],
  auth_issues: [],
  data_issues: []
};

// Helper functions
function runCommand(command, options = {}) {
  const defaultOptions = {
    cwd: config.projectRoot,
    stdio: config.verbose ? 'inherit' : 'pipe',
    timeout: options.timeout || config.testTimeout,
    encoding: 'utf8'
  };
  
  try {
    const result = execSync(command, { ...defaultOptions, ...options });
    return { success: true, output: result ? result.toString() : '' };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout ? error.stdout.toString() : '',
      error: error.stderr ? error.stderr.toString() : error.message 
    };
  }
}

function checkPrerequisites() {
  log.title('Checking Prerequisites');
  
  // Check if we're in the right directory
  if (!fs.existsSync(path.join(config.projectRoot, 'package.json'))) {
    log.error('package.json not found. Are you in the correct directory?');
    return false;
  }
  
  // Check if test files exist
  const criticalTests = [
    'tests/schedule.test.ts',
    'tests/mobile-test-utils.ts',
    '__tests__/mobile/responsive.test.tsx'
  ];
  
  for (const testFile of criticalTests) {
    const fullPath = path.join(config.projectRoot, testFile);
    if (!fs.existsSync(fullPath)) {
      log.error(`Critical test file missing: ${testFile}`);
      return false;
    }
  }
  
  // Check Node modules
  if (!fs.existsSync(path.join(config.projectRoot, 'node_modules'))) {
    log.warning('node_modules not found, running npm install...');
    const installResult = runCommand('npm install');
    if (!installResult.success) {
      log.error('Failed to install dependencies');
      return false;
    }
  }
  
  log.success('Prerequisites check passed');
  return true;
}

async function runTestSuite(suiteName, suite) {
  log.info(`Starting ${suite.name}...`);
  
  const startTime = Date.now();
  let attempts = 0;
  let result = null;
  
  // Retry logic for flaky tests
  while (attempts < config.retryAttempts && !result?.success) {
    attempts++;
    if (attempts > 1) {
      log.warning(`Retrying ${suite.name} (attempt ${attempts}/${config.retryAttempts})`);
    }
    
    result = runCommand(suite.command, { timeout: suite.timeout });
    
    if (!result.success && attempts < config.retryAttempts) {
      // Brief pause before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const duration = Date.now() - startTime;
  
  // Record results
  testResults.suite_results[suiteName] = {
    success: result.success,
    duration,
    attempts,
    output: result.output,
    error: result.error,
    priority: suite.priority
  };
  
  if (result.success) {
    testResults.passed++;
    log.success(`${suite.name} passed (${duration}ms, ${attempts} attempts)`);
  } else {
    testResults.failed++;
    log.error(`${suite.name} failed after ${attempts} attempts`);
    
    if (suite.priority === 'critical') {
      testResults.critical_failures.push({
        suite: suiteName,
        name: suite.name,
        error: result.error,
        description: suite.description
      });
      log.critical(`Critical test failure: ${suite.name}`);
    }
    
    // Categorize failures based on debug knowledge base patterns
    if (suiteName === 'dataPeresistence') {
      testResults.data_issues.push('Data persistence between views failed');
    } else if (suiteName === 'mobileNavigation') {
      testResults.mobile_issues.push('Mobile navigation tests failed');
    } else if (suiteName === 'authentication') {
      testResults.auth_issues.push('Authentication tests failed');
    }
    
    if (config.verbose && result.error) {
      console.log(`\n${colors.red}Error Details:${colors.reset}\n${result.error}`);
    }
  }
  
  return result.success;
}

async function runMobileSpecificTests() {
  log.mobile('Running mobile-specific validation...');
  
  // Create a quick mobile test script
  const mobileTestScript = `
    const { mobileTestHelpers } = require('./tests/mobile-test-utils');
    
    async function runMobileValidation() {
      console.log('📱 Running mobile test suite...');
      
      // Set up mobile environment
      mobileTestHelpers.simulateMobileViewport('iPhone13');
      
      const results = {
        touchTargets: true,
        horizontalScroll: true,
        hydration: true,
        errors: []
      };
      
      try {
        // Test horizontal scrolling
        const scrollTest = mobileTestHelpers.checkHorizontalScrolling();
        if (scrollTest.hasHorizontalScroll) {
          results.horizontalScroll = false;
          results.errors.push('Unwanted horizontal scrolling detected');
        }
        
        // Test hydration safety
        const hydrationTest = mobileTestHelpers.testHydrationSafety();
        if (hydrationTest.hasHydrationErrors) {
          results.hydration = false;
          results.errors.push('Hydration errors detected');
        }
        
        console.log('✅ Mobile validation completed');
        console.log(JSON.stringify(results, null, 2));
        
        if (results.errors.length > 0) {
          process.exit(1);
        }
        
      } catch (error) {
        console.error('❌ Mobile validation failed:', error.message);
        process.exit(1);
      }
    }
    
    runMobileValidation();
  `;
  
  // Write and run mobile test
  const tempFile = path.join(config.projectRoot, 'temp-mobile-test.js');
  fs.writeFileSync(tempFile, mobileTestScript);
  
  try {
    const result = runCommand(`node ${tempFile}`);
    fs.unlinkSync(tempFile);
    
    if (result.success) {
      log.mobile('Mobile validation passed');
      return true;
    } else {
      log.mobile('Mobile validation failed');
      testResults.mobile_issues.push('Mobile validation script failed');
      return false;
    }
  } catch (error) {
    fs.unlinkSync(tempFile);
    log.mobile('Mobile validation error: ' + error.message);
    return false;
  }
}

function filterTestSuites() {
  let suitesToRun = { ...testSuites };
  
  if (config.criticalOnly) {
    suitesToRun = Object.fromEntries(
      Object.entries(suitesToRun).filter(([_, suite]) => suite.priority === 'critical')
    );
    log.info('Running critical tests only');
  }
  
  if (config.mobileOnly) {
    suitesToRun = Object.fromEntries(
      Object.entries(suitesToRun).filter(([key]) => 
        key === 'mobileNavigation' || key === 'performance'
      )
    );
    log.mobile('Running mobile tests only');
  }
  
  if (config.skipSlow) {
    suitesToRun = Object.fromEntries(
      Object.entries(suitesToRun).filter(([_, suite]) => suite.timeout < 45000)
    );
    log.info('Skipping slow tests');
  }
  
  return suitesToRun;
}

async function generateReport() {
  const duration = Date.now() - testResults.start_time;
  const total = testResults.passed + testResults.failed;
  
  console.log('\n' + '='.repeat(80));
  log.title('Test Results Summary');
  
  // Overall stats
  console.log(`📊 Overall Results:`);
  console.log(`   Total Suites: ${total}`);
  console.log(`   Passed: ${colors.green}${testResults.passed}${colors.reset}`);
  console.log(`   Failed: ${colors.red}${testResults.failed}${colors.reset}`);
  console.log(`   Duration: ${Math.round(duration / 1000)}s`);
  console.log('');
  
  // Critical failures
  if (testResults.critical_failures.length > 0) {
    log.critical('Critical Test Failures:');
    testResults.critical_failures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure.name}`);
      console.log(`      ${failure.description}`);
    });
    console.log('');
  }
  
  // Issue categories based on debug knowledge base
  if (testResults.data_issues.length > 0) {
    log.error('Data Persistence Issues (Bug Report #28):');
    testResults.data_issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('   🔧 Fix: Review single source of truth pattern in ScheduleTable');
    console.log('');
  }
  
  if (testResults.mobile_issues.length > 0) {
    log.mobile('Mobile Issues (Bug Reports #10-15):');
    testResults.mobile_issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('   🔧 Fix: Check hamburger menu, touch targets, and hydration safety');
    console.log('');
  }
  
  if (testResults.auth_issues.length > 0) {
    log.error('Authentication Issues (Bug Report #27):');
    testResults.auth_issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('   🔧 Fix: Check connection strings and WebSocket configuration');
    console.log('');
  }
  
  // Recommendations
  console.log('📋 Next Steps:');
  
  if (testResults.failed === 0) {
    log.success('All tests passed! Ready for deployment.');
    console.log('   1. Run manual testing checklist: tests/manual-test-checklist.md');
    console.log('   2. Execute deployment verification: scripts/verify-deployment.sh');
    console.log('   3. Test on actual mobile devices');
  } else {
    log.error('Some tests failed. Address issues before deployment:');
    
    if (testResults.critical_failures.length > 0) {
      console.log('   1. 🚨 Fix critical failures first');
    }
    if (testResults.data_issues.length > 0) {
      console.log('   2. 📊 Check data persistence logic in ScheduleTable components');
    }
    if (testResults.mobile_issues.length > 0) {
      console.log('   3. 📱 Test mobile navigation on actual devices');
    }
    if (testResults.auth_issues.length > 0) {
      console.log('   4. 🔐 Verify authentication and real-time connections');
    }
    
    console.log('   5. 📖 Consult debug-knowledge-base.md for specific fix patterns');
  }
  
  // Write detailed report to file
  const reportPath = path.join(config.projectRoot, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log.info(`Detailed results written to: ${reportPath}`);
  
  return testResults.failed === 0 && testResults.critical_failures.length === 0;
}

// Main execution
async function main() {
  console.log(`${colors.bgGreen} COMPREHENSIVE TEST RUNNER ${colors.reset}`);
  console.log('Based on Team Availability Tracker Debug Knowledge Base');
  console.log('Covers critical fixes from Bug Reports #1-28\n');
  
  if (!checkPrerequisites()) {
    process.exit(1);
  }
  
  const suitesToRun = filterTestSuites();
  const suiteNames = Object.keys(suitesToRun);
  
  log.info(`Running ${suiteNames.length} test suites...`);
  if (config.verbose) {
    console.log('Suites:', suiteNames.join(', '));
  }
  
  // Run test suites
  if (config.parallel && suiteNames.length > 1) {
    log.info('Running tests in parallel...');
    const promises = suiteNames.map(name => runTestSuite(name, suitesToRun[name]));
    await Promise.all(promises);
  } else {
    for (const suiteName of suiteNames) {
      await runTestSuite(suiteName, suitesToRun[suiteName]);
    }
  }
  
  // Run mobile-specific tests
  if (!config.criticalOnly && (config.mobileOnly || suiteNames.includes('mobileNavigation'))) {
    await runMobileSpecificTests();
  }
  
  // Generate final report
  const success = await generateReport();
  
  process.exit(success ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', () => {
  log.warning('Test run interrupted');
  console.log('\nPartial results:');
  generateReport();
  process.exit(130);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  if (config.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Test runner failed: ${error.message}`);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = { main, runTestSuite, testSuites, config };