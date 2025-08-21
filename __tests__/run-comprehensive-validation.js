#!/usr/bin/env node

/**
 * Comprehensive Navigation & Table Visibility Testing Script
 * 
 * Executes all test suites for production readiness validation
 * Tests navigation fixes, table visibility, UI polish, and regression coverage
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_SUITES = [
  {
    name: 'Navigation Cycling Bug Tests',
    file: 'comprehensive-navigation-validation.test.tsx',
    description: 'Critical navigation cycling fixes (September → August bug)',
    priority: 'CRITICAL'
  },
  {
    name: 'Table Visibility & Layout Tests',
    file: 'table-visibility-layout.test.tsx',
    description: 'Header overlap, spacing, z-index, and responsive design',
    priority: 'HIGH'
  },
  {
    name: 'UI Polish & Accessibility Tests',
    file: 'ui-polish-accessibility.test.tsx',
    description: 'Manager controls, visual hierarchy, WCAG compliance',
    priority: 'HIGH'
  },
  {
    name: 'Core Functionality Regression Tests',
    file: 'core-functionality-regression.test.tsx',
    description: 'Existing feature preservation and data integrity',
    priority: 'CRITICAL'
  },
  {
    name: 'Performance & Stability Tests',
    file: 'performance-stability.test.tsx',
    description: 'System stability, memory usage, and build verification',
    priority: 'HIGH'
  }
];

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const levelSymbols = {
      INFO: 'ℹ️',
      SUCCESS: '✅',
      WARNING: '⚠️',
      ERROR: '❌',
      CRITICAL: '🔥'
    };
    
    console.log(`${timestamp} ${levelSymbols[level] || '📝'} ${message}`);
  }

  async runTestSuite(suite) {
    this.log('INFO', `Starting test suite: ${suite.name}`);
    this.log('INFO', `Description: ${suite.description}`);
    this.log('INFO', `Priority: ${suite.priority}`);
    
    const testStart = Date.now();
    
    try {
      // Check if test file exists
      const testPath = path.join(__dirname, suite.file);
      if (!fs.existsSync(testPath)) {
        throw new Error(`Test file not found: ${suite.file}`);
      }

      // Run Jest for this specific test file
      const command = `npx jest ${suite.file} --verbose --no-cache --detectOpenHandles --forceExit`;
      
      this.log('INFO', `Executing: ${command}`);
      
      const output = execSync(command, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        timeout: 120000, // 2 minute timeout per suite
        stdio: 'pipe'
      });
      
      const duration = Date.now() - testStart;
      
      const result = {
        suite: suite.name,
        file: suite.file,
        status: 'PASSED',
        duration,
        output: output.toString(),
        priority: suite.priority,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      this.log('SUCCESS', `Test suite PASSED: ${suite.name} (${duration}ms)`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - testStart;
      
      const result = {
        suite: suite.name,
        file: suite.file,
        status: 'FAILED',
        duration,
        error: error.message,
        output: error.stdout ? error.stdout.toString() : '',
        stderr: error.stderr ? error.stderr.toString() : '',
        priority: suite.priority,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      this.log('ERROR', `Test suite FAILED: ${suite.name} (${duration}ms)`);
      this.log('ERROR', `Error: ${error.message}`);
      
      if (suite.priority === 'CRITICAL') {
        this.log('CRITICAL', `CRITICAL test failure in ${suite.name} - may block production deployment`);
      }
      
      return result;
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passedSuites = this.results.filter(r => r.status === 'PASSED');
    const failedSuites = this.results.filter(r => r.status === 'FAILED');
    const criticalFailures = failedSuites.filter(r => r.priority === 'CRITICAL');
    
    const report = {
      summary: {
        totalSuites: this.results.length,
        passed: passedSuites.length,
        failed: failedSuites.length,
        criticalFailures: criticalFailures.length,
        totalDuration,
        timestamp: new Date().toISOString(),
        productionReady: criticalFailures.length === 0
      },
      testSuites: this.results,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedSuites = this.results.filter(r => r.status === 'FAILED');
    const criticalFailures = failedSuites.filter(r => r.priority === 'CRITICAL');

    if (criticalFailures.length > 0) {
      recommendations.push({
        level: 'CRITICAL',
        message: `${criticalFailures.length} CRITICAL test failures must be resolved before production deployment`,
        suites: criticalFailures.map(f => f.suite)
      });
    }

    if (failedSuites.length > 0) {
      recommendations.push({
        level: 'HIGH',
        message: `${failedSuites.length} test suites failed - review and fix issues`,
        suites: failedSuites.map(f => f.suite)
      });
    }

    const navigationSuite = this.results.find(r => r.file.includes('navigation-validation'));
    if (navigationSuite && navigationSuite.status === 'PASSED') {
      recommendations.push({
        level: 'SUCCESS',
        message: 'Navigation cycling bug fixes have been validated',
        details: 'September 1st → August 10th cycling issue resolved'
      });
    }

    const tableSuite = this.results.find(r => r.file.includes('table-visibility'));
    if (tableSuite && tableSuite.status === 'PASSED') {
      recommendations.push({
        level: 'SUCCESS',
        message: 'Table visibility and layout fixes validated',
        details: 'Header overlap, spacing, and responsive design issues resolved'
      });
    }

    const regressionSuite = this.results.find(r => r.file.includes('regression'));
    if (regressionSuite && regressionSuite.status === 'PASSED') {
      recommendations.push({
        level: 'SUCCESS',
        message: 'No regression detected in existing functionality',
        details: 'Core features preserved after fixes'
      });
    }

    if (this.results.every(r => r.status === 'PASSED')) {
      recommendations.push({
        level: 'SUCCESS',
        message: '🎉 ALL TESTS PASSED - Application ready for production deployment',
        details: 'Navigation fixes, table visibility improvements, and regression testing complete'
      });
    }

    return recommendations;
  }

  saveReport(report) {
    const reportPath = path.join(__dirname, '..', 'test-results', 'comprehensive-validation-report.json');
    
    // Ensure directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log('SUCCESS', `Test report saved to: ${reportPath}`);

    // Also create a human-readable summary
    const summaryPath = path.join(__dirname, '..', 'test-results', 'validation-summary.md');
    const summaryContent = this.createMarkdownSummary(report);
    fs.writeFileSync(summaryPath, summaryContent);
    this.log('SUCCESS', `Test summary saved to: ${summaryPath}`);
  }

  createMarkdownSummary(report) {
    const { summary, recommendations } = report;
    
    let content = `# Comprehensive Navigation & Table Visibility Test Report\n\n`;
    content += `**Generated:** ${summary.timestamp}\n`;
    content += `**Duration:** ${(summary.totalDuration / 1000).toFixed(2)} seconds\n\n`;

    // Summary section
    content += `## Test Summary\n\n`;
    content += `- **Total Test Suites:** ${summary.totalSuites}\n`;
    content += `- **Passed:** ${summary.passed} ✅\n`;
    content += `- **Failed:** ${summary.failed} ❌\n`;
    content += `- **Critical Failures:** ${summary.criticalFailures} 🔥\n`;
    content += `- **Production Ready:** ${summary.productionReady ? 'YES ✅' : 'NO ❌'}\n\n`;

    // Test suites details
    content += `## Test Suite Results\n\n`;
    
    this.results.forEach(result => {
      const status = result.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED';
      const priority = result.priority === 'CRITICAL' ? '🔥 CRITICAL' : result.priority === 'HIGH' ? '⚠️ HIGH' : 'ℹ️ MEDIUM';
      
      content += `### ${result.suite}\n`;
      content += `- **Status:** ${status}\n`;
      content += `- **Priority:** ${priority}\n`;
      content += `- **Duration:** ${result.duration}ms\n`;
      content += `- **File:** \`${result.file}\`\n\n`;
      
      if (result.status === 'FAILED') {
        content += `**Error:** ${result.error}\n\n`;
      }
    });

    // Recommendations
    content += `## Recommendations\n\n`;
    
    recommendations.forEach(rec => {
      const level = rec.level === 'CRITICAL' ? '🔥' : rec.level === 'SUCCESS' ? '✅' : '⚠️';
      content += `${level} **${rec.level}:** ${rec.message}\n`;
      if (rec.details) {
        content += `   - ${rec.details}\n`;
      }
      if (rec.suites) {
        content += `   - Affected suites: ${rec.suites.join(', ')}\n`;
      }
      content += `\n`;
    });

    return content;
  }

  async run() {
    this.log('INFO', '🚀 Starting Comprehensive Navigation & Table Visibility Testing');
    this.log('INFO', `Testing ${TEST_SUITES.length} suites for production readiness`);
    
    for (const suite of TEST_SUITES) {
      await this.runTestSuite(suite);
      
      // Brief pause between suites
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.log('INFO', '📊 Generating test report...');
    const report = this.generateReport();
    
    this.log('INFO', '💾 Saving test results...');
    this.saveReport(report);
    
    // Print summary
    this.log('INFO', '📋 TEST EXECUTION SUMMARY:');
    this.log('INFO', `Total Suites: ${report.summary.totalSuites}`);
    this.log('SUCCESS', `Passed: ${report.summary.passed}`);
    this.log('ERROR', `Failed: ${report.summary.failed}`);
    this.log('CRITICAL', `Critical Failures: ${report.summary.criticalFailures}`);
    this.log('INFO', `Production Ready: ${report.summary.productionReady ? 'YES' : 'NO'}`);
    
    // Print recommendations
    this.log('INFO', '💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      const level = rec.level === 'CRITICAL' ? 'CRITICAL' : 
                   rec.level === 'ERROR' ? 'ERROR' : 
                   rec.level === 'SUCCESS' ? 'SUCCESS' : 'INFO';
      this.log(level, rec.message);
    });

    if (report.summary.productionReady) {
      this.log('SUCCESS', '🎉 ALL CRITICAL TESTS PASSED - APPLICATION IS PRODUCTION READY!');
      process.exit(0);
    } else {
      this.log('CRITICAL', '🚫 CRITICAL FAILURES DETECTED - RESOLVE BEFORE PRODUCTION DEPLOYMENT');
      process.exit(1);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { TestRunner, TEST_SUITES };