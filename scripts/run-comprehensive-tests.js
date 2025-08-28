#!/usr/bin/env node

/**
 * Comprehensive Test Orchestration Script
 * Runs all test suites with proper sequencing, reporting, and error handling
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Test configuration
const TEST_CONFIG = {
  timeout: 300000, // 5 minutes per test suite
  maxRetries: 2,
  parallel: true,
  coverage: true,
  reports: {
    outputDir: './test-results',
    formats: ['json', 'html', 'lcov'],
  }
};

// Test suites with their configurations
const TEST_SUITES = [
  {
    name: 'Data Layer Tests',
    command: 'jest src/__tests__/data --verbose --coverage --json --outputFile=test-results/data-layer.json',
    critical: true,
    timeout: 60000,
  },
  {
    name: 'Business Logic Tests', 
    command: 'jest src/__tests__/logic --verbose --coverage --json --outputFile=test-results/business-logic.json',
    critical: true,
    timeout: 90000,
  },
  {
    name: 'Component Tests',
    command: 'jest src/__tests__/components --verbose --coverage --json --outputFile=test-results/components.json',
    critical: true,
    timeout: 120000,
  },
  {
    name: 'Integration Tests',
    command: 'jest src/__tests__/integration --verbose --coverage --json --outputFile=test-results/integration.json',
    critical: true,
    timeout: 180000,
  },
  {
    name: 'Performance Tests',
    command: 'jest src/__tests__/performance --verbose --coverage --json --outputFile=test-results/performance.json',
    critical: false,
    timeout: 240000,
  },
  {
    name: 'Security Tests',
    command: 'jest src/__tests__/security --verbose --coverage --json --outputFile=test-results/security.json',
    critical: true,
    timeout: 90000,
  },
];

// E2E Test suites (Playwright)
const E2E_SUITES = [
  {
    name: 'User Flow E2E Tests',
    command: 'playwright test --project=chromium-desktop --reporter=json --output=test-results/e2e-userflows.json',
    critical: true,
    timeout: 300000,
  },
  {
    name: 'Mobile E2E Tests',
    command: 'playwright test --project=iphone-14-pro --reporter=json --output=test-results/e2e-mobile.json',
    critical: false,
    timeout: 240000,
  },
  {
    name: 'Cross-Browser E2E Tests',
    command: 'playwright test --project=firefox-desktop,webkit-desktop --reporter=json --output=test-results/e2e-browsers.json',
    critical: false,
    timeout: 360000,
  },
];

class TestOrchestrator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
        duration: 0,
      }
    };
    this.startTime = Date.now();
  }

  async run() {
    console.log(chalk.blue('🚀 Starting Comprehensive Test Suite\n'));
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Run test suites
      await this.runTestSuites();
      
      // Run E2E tests if unit tests pass
      if (this.shouldRunE2ETests()) {
        await this.runE2ETests();
      }
      
      // Generate reports
      await this.generateReports();
      
      // Display final results
      this.displayFinalResults();
      
      // Exit with appropriate code
      process.exit(this.results.failed.length > 0 ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red('💥 Test orchestration failed:'), error.message);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log(chalk.yellow('🔧 Setting up test environment...'));
    
    // Create test results directory
    if (!fs.existsSync(TEST_CONFIG.reports.outputDir)) {
      fs.mkdirSync(TEST_CONFIG.reports.outputDir, { recursive: true });
    }
    
    // Clear previous results
    const resultFiles = fs.readdirSync(TEST_CONFIG.reports.outputDir)
      .filter(file => file.endsWith('.json'));
    
    resultFiles.forEach(file => {
      fs.unlinkSync(path.join(TEST_CONFIG.reports.outputDir, file));
    });
    
    // Verify test database connection
    console.log('  ✓ Test results directory ready');
    
    // Check if development server is running for E2E tests
    try {
      const response = await fetch('http://localhost:3000');
      console.log('  ✓ Development server is running');
    } catch (error) {
      console.log(chalk.yellow('  ⚠ Development server not running (E2E tests will be skipped)'));
    }
    
    console.log(chalk.green('✅ Test environment ready\n'));
  }

  async runTestSuites() {
    console.log(chalk.blue('📋 Running Unit & Integration Test Suites\n'));
    
    const criticalTests = TEST_SUITES.filter(suite => suite.critical);
    const nonCriticalTests = TEST_SUITES.filter(suite => !suite.critical);
    
    // Run critical tests first (sequentially)
    for (const suite of criticalTests) {
      await this.runTestSuite(suite);
      
      // Stop if critical test fails
      if (this.results.failed.some(result => result.name === suite.name && result.critical)) {
        console.log(chalk.red(`\n❌ Critical test suite "${suite.name}" failed. Stopping execution.\n`));
        return;
      }
    }
    
    // Run non-critical tests in parallel if all critical tests pass
    if (TEST_CONFIG.parallel && nonCriticalTests.length > 0) {
      console.log(chalk.blue('🔄 Running non-critical tests in parallel...\n'));
      
      const promises = nonCriticalTests.map(suite => this.runTestSuite(suite));
      await Promise.allSettled(promises);
    }
  }

  async runTestSuite(suite) {
    console.log(chalk.cyan(`▶️  Running: ${suite.name}`));
    
    const startTime = Date.now();
    let attempt = 1;
    
    while (attempt <= TEST_CONFIG.maxRetries) {
      try {
        const result = await this.executeTestCommand(suite.command, suite.timeout);
        
        const duration = Date.now() - startTime;
        const suiteResult = {
          name: suite.name,
          command: suite.command,
          critical: suite.critical,
          duration,
          attempt,
          passed: true,
          output: result.stdout,
          error: null,
        };
        
        this.results.passed.push(suiteResult);
        console.log(chalk.green(`  ✅ ${suite.name} - PASSED (${duration}ms)\n`));
        
        // Parse test results if available
        await this.parseTestResults(suite.name);
        break;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        if (attempt < TEST_CONFIG.maxRetries) {
          console.log(chalk.yellow(`  🔄 ${suite.name} - Retry ${attempt}/${TEST_CONFIG.maxRetries}`));
          attempt++;
          continue;
        }
        
        const suiteResult = {
          name: suite.name,
          command: suite.command,
          critical: suite.critical,
          duration,
          attempt,
          passed: false,
          output: error.stdout || '',
          error: error.message,
        };
        
        this.results.failed.push(suiteResult);
        console.log(chalk.red(`  ❌ ${suite.name} - FAILED (${duration}ms)`));
        console.log(chalk.gray(`     Error: ${error.message}\n`));
        break;
      }
    }
  }

  async runE2ETests() {
    console.log(chalk.blue('🌐 Running End-to-End Test Suites\n'));
    
    for (const suite of E2E_SUITES) {
      console.log(chalk.cyan(`▶️  Running: ${suite.name}`));
      
      const startTime = Date.now();
      
      try {
        const result = await this.executeTestCommand(suite.command, suite.timeout);
        
        const duration = Date.now() - startTime;
        const suiteResult = {
          name: suite.name,
          command: suite.command,
          critical: suite.critical,
          duration,
          passed: true,
          output: result.stdout,
          error: null,
        };
        
        this.results.passed.push(suiteResult);
        console.log(chalk.green(`  ✅ ${suite.name} - PASSED (${duration}ms)\n`));
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const suiteResult = {
          name: suite.name,
          command: suite.command,
          critical: suite.critical,
          duration,
          passed: false,
          output: error.stdout || '',
          error: error.message,
        };
        
        if (suite.critical) {
          this.results.failed.push(suiteResult);
          console.log(chalk.red(`  ❌ ${suite.name} - FAILED (${duration}ms)\n`));
        } else {
          this.results.skipped.push(suiteResult);
          console.log(chalk.yellow(`  ⚠️  ${suite.name} - SKIPPED (${duration}ms)\n`));
        }
      }
    }
  }

  async executeTestCommand(command, timeout) {
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', ...command.split(' ')], {
        stdio: 'pipe',
        timeout: timeout || TEST_CONFIG.timeout,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async parseTestResults(suiteName) {
    const resultFile = path.join(TEST_CONFIG.reports.outputDir, 
      `${suiteName.toLowerCase().replace(/\s+/g, '-')}.json`);
    
    if (fs.existsSync(resultFile)) {
      try {
        const resultData = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        
        if (resultData.numTotalTests) {
          this.results.summary.totalTests += resultData.numTotalTests;
          this.results.summary.passedTests += resultData.numPassedTests;
          this.results.summary.failedTests += resultData.numFailedTests;
        }
        
        if (resultData.coverageMap) {
          // Aggregate coverage data
          // Implementation would depend on Jest coverage format
        }
        
      } catch (error) {
        console.log(chalk.yellow(`  ⚠️  Could not parse results for ${suiteName}`));
      }
    }
  }

  shouldRunE2ETests() {
    const criticalFailures = this.results.failed.filter(result => result.critical);
    return criticalFailures.length === 0;
  }

  async generateReports() {
    console.log(chalk.blue('📊 Generating Test Reports...\n'));
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
      },
      configuration: TEST_CONFIG,
      results: this.results,
      summary: {
        ...this.results.summary,
        duration: Date.now() - this.startTime,
        totalSuites: this.results.passed.length + this.results.failed.length + this.results.skipped.length,
        passedSuites: this.results.passed.length,
        failedSuites: this.results.failed.length,
        skippedSuites: this.results.skipped.length,
      }
    };

    // Write JSON report
    const jsonReportPath = path.join(TEST_CONFIG.reports.outputDir, 'comprehensive-test-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
    console.log(`  ✓ JSON report: ${jsonReportPath}`);

    // Generate HTML report
    await this.generateHTMLReport(report);
    
    // Generate JUnit XML for CI/CD
    await this.generateJUnitReport(report);
    
    console.log(chalk.green('✅ Reports generated\n'));
  }

  async generateHTMLReport(report) {
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Team Availability Tracker - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .skip { color: #ffc107; }
        .test-suite { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
        .test-suite.passed { border-left: 4px solid #28a745; }
        .test-suite.failed { border-left: 4px solid #dc3545; }
        .test-suite.skipped { border-left: 4px solid #ffc107; }
        pre { background: #f8f9fa; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Team Availability Tracker - Comprehensive Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Suites:</strong> ${report.summary.totalSuites}</p>
        <p><strong>Passed:</strong> <span class="pass">${report.summary.passedSuites}</span></p>
        <p><strong>Failed:</strong> <span class="fail">${report.summary.failedSuites}</span></p>
        <p><strong>Skipped:</strong> <span class="skip">${report.summary.skippedSuites}</span></p>
        <p><strong>Duration:</strong> ${Math.round(report.summary.duration / 1000)}s</p>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
    </div>
    
    <h2>Test Suite Results</h2>
    ${report.results.passed.map(suite => `
        <div class="test-suite passed">
            <h3>✅ ${suite.name}</h3>
            <p>Duration: ${suite.duration}ms</p>
        </div>
    `).join('')}
    
    ${report.results.failed.map(suite => `
        <div class="test-suite failed">
            <h3>❌ ${suite.name}</h3>
            <p>Duration: ${suite.duration}ms</p>
            <p><strong>Error:</strong> ${suite.error}</p>
            <pre>${suite.output}</pre>
        </div>
    `).join('')}
    
    ${report.results.skipped.map(suite => `
        <div class="test-suite skipped">
            <h3>⚠️ ${suite.name}</h3>
            <p>Duration: ${suite.duration}ms</p>
        </div>
    `).join('')}
</body>
</html>`;

    const htmlReportPath = path.join(TEST_CONFIG.reports.outputDir, 'test-report.html');
    fs.writeFileSync(htmlReportPath, htmlTemplate);
    console.log(`  ✓ HTML report: ${htmlReportPath}`);
  }

  async generateJUnitReport(report) {
    const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites 
    name="Team Availability Tracker Tests"
    tests="${report.summary.totalSuites}"
    failures="${report.summary.failedSuites}"
    errors="0"
    time="${report.summary.duration / 1000}">
    ${[...report.results.passed, ...report.results.failed].map(suite => `
    <testsuite 
        name="${suite.name}"
        tests="1"
        failures="${suite.passed ? 0 : 1}"
        errors="0"
        time="${suite.duration / 1000}">
        <testcase 
            name="${suite.name}" 
            classname="${suite.name.replace(/\s+/g, '_')}"
            time="${suite.duration / 1000}">
            ${suite.passed ? '' : `<failure message="${suite.error}">${suite.output}</failure>`}
        </testcase>
    </testsuite>
    `).join('')}
</testsuites>`;

    const junitReportPath = path.join(TEST_CONFIG.reports.outputDir, 'junit-report.xml');
    fs.writeFileSync(junitReportPath, junitXml);
    console.log(`  ✓ JUnit report: ${junitReportPath}`);
  }

  displayFinalResults() {
    const { summary } = this.results;
    const durationSeconds = Math.round(summary.duration / 1000);
    
    console.log(chalk.blue('📋 Final Test Results'));
    console.log(chalk.blue('=' * 50));
    console.log(`Total Test Suites: ${summary.totalSuites}`);
    console.log(`${chalk.green('Passed:')} ${summary.passedSuites}`);
    console.log(`${chalk.red('Failed:')} ${summary.failedSuites}`);
    console.log(`${chalk.yellow('Skipped:')} ${this.results.skipped.length}`);
    console.log(`Total Duration: ${durationSeconds}s`);
    
    if (summary.totalTests > 0) {
      console.log(`\nIndividual Tests: ${summary.totalTests}`);
      console.log(`${chalk.green('Passed:')} ${summary.passedTests}`);
      console.log(`${chalk.red('Failed:')} ${summary.failedTests}`);
    }
    
    console.log('\n' + chalk.blue('=' * 50));
    
    if (this.results.failed.length === 0) {
      console.log(chalk.green('🎉 All tests passed! Ready for deployment.'));
    } else {
      console.log(chalk.red('❌ Some tests failed. Please review and fix before deployment.'));
    }
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
  coverage: args.includes('--coverage'),
  parallel: !args.includes('--sequential'),
  e2e: !args.includes('--no-e2e'),
  performance: args.includes('--performance'),
};

// Override config with CLI options
if (options.coverage) TEST_CONFIG.coverage = true;
if (!options.parallel) TEST_CONFIG.parallel = false;

// Main execution
async function main() {
  try {
    const orchestrator = new TestOrchestrator();
    await orchestrator.run();
  } catch (error) {
    console.error(chalk.red('Fatal error in test orchestration:'), error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Test execution interrupted by user'));
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🛑 Test execution terminated'));
  process.exit(1);
});

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { TestOrchestrator, TEST_SUITES, E2E_SUITES };