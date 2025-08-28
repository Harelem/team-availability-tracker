#!/usr/bin/env node

/**
 * Comprehensive Test Report Generator
 * Aggregates all test results and generates unified reports
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const ARTIFACTS_PATH = process.env.ARTIFACTS_PATH || 'artifacts/';
const OUTPUT_PATH = process.env.OUTPUT_PATH || 'final-test-report/';

class TestReportGenerator {
  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      environment: {
        ci: !!process.env.CI,
        branch: process.env.GITHUB_REF_NAME || 'unknown',
        commit: process.env.GITHUB_SHA || 'unknown',
        workflow: process.env.GITHUB_WORKFLOW || 'local',
      },
      summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        totalDuration: 0,
        overallStatus: 'UNKNOWN',
      },
      suites: {},
      coverage: {
        overall: {
          lines: { covered: 0, total: 0, percentage: 0 },
          functions: { covered: 0, total: 0, percentage: 0 },
          branches: { covered: 0, total: 0, percentage: 0 },
          statements: { covered: 0, total: 0, percentage: 0 },
        },
        bySuite: {},
      },
      performance: {
        loadTimes: {},
        memoryUsage: {},
        renderTimes: {},
      },
      security: {
        vulnerabilities: [],
        recommendations: [],
      },
      accessibility: {
        violations: [],
        score: 0,
      },
    };
  }

  async generate() {
    console.log(chalk.blue('📊 Generating Comprehensive Test Report\n'));

    try {
      // Ensure output directory exists
      if (!fs.existsSync(OUTPUT_PATH)) {
        fs.mkdirSync(OUTPUT_PATH, { recursive: true });
      }

      // Process all test artifacts
      await this.processArtifacts();

      // Calculate summary statistics
      this.calculateSummary();

      // Generate reports in different formats
      await this.generateJSONReport();
      await this.generateHTMLReport();
      await this.generateMarkdownReport();
      await this.generateSummaryReport();

      console.log(chalk.green('✅ Test report generation completed successfully!'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating test report:'), error.message);
      process.exit(1);
    }
  }

  async processArtifacts() {
    console.log(chalk.yellow('🔍 Processing test artifacts...'));

    if (!fs.existsSync(ARTIFACTS_PATH)) {
      console.log(chalk.yellow('⚠️  No artifacts directory found'));
      return;
    }

    const artifactDirs = fs.readdirSync(ARTIFACTS_PATH, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const artifactDir of artifactDirs) {
      await this.processArtifactDirectory(path.join(ARTIFACTS_PATH, artifactDir));
    }

    console.log(chalk.green(`  ✓ Processed ${artifactDirs.length} artifact directories`));
  }

  async processArtifactDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      
      if (file.endsWith('-results.json')) {
        await this.processJestResults(filePath);
      } else if (file.endsWith('.json') && file.includes('e2e')) {
        await this.processPlaywrightResults(filePath);
      } else if (file.includes('coverage')) {
        await this.processCoverageResults(filePath);
      } else if (file.includes('security')) {
        await this.processSecurityResults(filePath);
      } else if (file.includes('accessibility')) {
        await this.processAccessibilityResults(filePath);
      }
    }
  }

  async processJestResults(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const suiteName = path.basename(filePath, '-results.json');
      
      this.report.suites[suiteName] = {
        type: 'jest',
        name: suiteName,
        status: data.success ? 'PASSED' : 'FAILED',
        numTotalTests: data.numTotalTests || 0,
        numPassedTests: data.numPassedTests || 0,
        numFailedTests: data.numFailedTests || 0,
        numPendingTests: data.numPendingTests || 0,
        duration: this.parseDuration(data.testResults),
        testResults: data.testResults || [],
        coverage: this.extractCoverage(data),
      };

      console.log(`    ✓ Processed Jest results: ${suiteName}`);
    } catch (error) {
      console.log(`    ⚠️  Failed to process Jest results: ${filePath}`);
    }
  }

  async processPlaywrightResults(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const suiteName = path.basename(filePath, '.json');
      
      this.report.suites[suiteName] = {
        type: 'playwright',
        name: suiteName,
        status: data.stats?.failed === 0 ? 'PASSED' : 'FAILED',
        numTotalTests: data.stats?.total || 0,
        numPassedTests: data.stats?.passed || 0,
        numFailedTests: data.stats?.failed || 0,
        duration: data.stats?.duration || 0,
        testResults: data.suites || [],
      };

      console.log(`    ✓ Processed Playwright results: ${suiteName}`);
    } catch (error) {
      console.log(`    ⚠️  Failed to process Playwright results: ${filePath}`);
    }
  }

  async processCoverageResults(filePath) {
    try {
      if (filePath.endsWith('lcov.info')) {
        const lcovData = fs.readFileSync(filePath, 'utf8');
        const coverage = this.parseLcovData(lcovData);
        
        const suiteName = path.basename(path.dirname(filePath));
        this.report.coverage.bySuite[suiteName] = coverage;
      }

      console.log(`    ✓ Processed coverage data: ${path.basename(filePath)}`);
    } catch (error) {
      console.log(`    ⚠️  Failed to process coverage: ${filePath}`);
    }
  }

  async processSecurityResults(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.results) {
        this.report.security.vulnerabilities.push(...data.results);
      }

      console.log(`    ✓ Processed security results: ${path.basename(filePath)}`);
    } catch (error) {
      console.log(`    ⚠️  Failed to process security results: ${filePath}`);
    }
  }

  async processAccessibilityResults(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.violations) {
        this.report.accessibility.violations.push(...data.violations);
      }
      
      if (data.score) {
        this.report.accessibility.score = data.score;
      }

      console.log(`    ✓ Processed accessibility results: ${path.basename(filePath)}`);
    } catch (error) {
      console.log(`    ⚠️  Failed to process accessibility results: ${filePath}`);
    }
  }

  calculateSummary() {
    console.log(chalk.yellow('📊 Calculating summary statistics...'));

    const suites = Object.values(this.report.suites);
    
    this.report.summary.totalSuites = suites.length;
    this.report.summary.passedSuites = suites.filter(s => s.status === 'PASSED').length;
    this.report.summary.failedSuites = suites.filter(s => s.status === 'FAILED').length;

    this.report.summary.totalTests = suites.reduce((sum, s) => sum + (s.numTotalTests || 0), 0);
    this.report.summary.passedTests = suites.reduce((sum, s) => sum + (s.numPassedTests || 0), 0);
    this.report.summary.failedTests = suites.reduce((sum, s) => sum + (s.numFailedTests || 0), 0);
    this.report.summary.skippedTests = suites.reduce((sum, s) => sum + (s.numPendingTests || 0), 0);

    this.report.summary.totalDuration = suites.reduce((sum, s) => sum + (s.duration || 0), 0);

    // Calculate overall coverage
    this.calculateOverallCoverage();

    // Determine overall status
    const criticalSuites = ['Data Layer', 'Business Logic', 'Components', 'Integration', 'Security'];
    const criticalFailures = suites.filter(s => 
      criticalSuites.some(cs => s.name.includes(cs.replace(/\s+/g, '-'))) && s.status === 'FAILED'
    );

    this.report.summary.overallStatus = criticalFailures.length === 0 ? 'PASSED' : 'FAILED';

    console.log(`  ✓ Total suites: ${this.report.summary.totalSuites}`);
    console.log(`  ✓ Total tests: ${this.report.summary.totalTests}`);
    console.log(`  ✓ Overall status: ${this.report.summary.overallStatus}`);
  }

  calculateOverallCoverage() {
    const coverageData = Object.values(this.report.coverage.bySuite);
    
    if (coverageData.length === 0) return;

    const totals = coverageData.reduce((acc, coverage) => {
      acc.lines.covered += coverage.lines?.covered || 0;
      acc.lines.total += coverage.lines?.total || 0;
      acc.functions.covered += coverage.functions?.covered || 0;
      acc.functions.total += coverage.functions?.total || 0;
      acc.branches.covered += coverage.branches?.covered || 0;
      acc.branches.total += coverage.branches?.total || 0;
      acc.statements.covered += coverage.statements?.covered || 0;
      acc.statements.total += coverage.statements?.total || 0;
      return acc;
    }, {
      lines: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 },
      branches: { covered: 0, total: 0 },
      statements: { covered: 0, total: 0 },
    });

    // Calculate percentages
    Object.keys(totals).forEach(key => {
      const { covered, total } = totals[key];
      totals[key].percentage = total > 0 ? Math.round((covered / total) * 100) : 0;
    });

    this.report.coverage.overall = totals;
  }

  async generateJSONReport() {
    const jsonPath = path.join(OUTPUT_PATH, 'comprehensive-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));
    console.log(`  ✓ JSON report: ${jsonPath}`);
  }

  async generateHTMLReport() {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Availability Tracker - Comprehensive Test Report</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px; background: #f8f9fa; color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { margin: 0 0 10px 0; color: #2563eb; }
        .header .meta { color: #6b7280; font-size: 14px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; }
        .summary-card .value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .summary-card .description { font-size: 14px; color: #6b7280; }
        .status-passed { color: #059669; }
        .status-failed { color: #dc2626; }
        .status-pending { color: #d97706; }
        .suites { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
        .suites h2 { margin: 0; padding: 20px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; }
        .suite { padding: 20px; border-bottom: 1px solid #e5e7eb; }
        .suite:last-child { border-bottom: none; }
        .suite-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .suite-name { font-weight: bold; font-size: 16px; }
        .suite-status { padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .suite-status.passed { background: #dcfce7; color: #166534; }
        .suite-status.failed { background: #fee2e2; color: #991b1b; }
        .suite-stats { display: flex; gap: 20px; font-size: 14px; color: #6b7280; }
        .coverage-bar { margin-top: 15px; }
        .coverage-bar-inner { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .coverage-bar-fill { height: 100%; background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 80%); }
        .coverage-text { margin-top: 5px; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Comprehensive Test Report</h1>
            <div class="meta">
                Generated: ${this.report.timestamp} | 
                Branch: ${this.report.environment.branch} |
                Commit: ${this.report.environment.commit.substring(0, 8)}
            </div>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Overall Status</h3>
                <div class="value ${this.report.summary.overallStatus === 'PASSED' ? 'status-passed' : 'status-failed'}">
                    ${this.report.summary.overallStatus}
                </div>
                <div class="description">${this.report.summary.failedSuites === 0 ? 'All critical tests passed' : `${this.report.summary.failedSuites} suites failed`}</div>
            </div>
            
            <div class="summary-card">
                <h3>Test Suites</h3>
                <div class="value">${this.report.summary.totalSuites}</div>
                <div class="description">
                    <span class="status-passed">${this.report.summary.passedSuites} passed</span>, 
                    <span class="status-failed">${this.report.summary.failedSuites} failed</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h3>Individual Tests</h3>
                <div class="value">${this.report.summary.totalTests}</div>
                <div class="description">
                    <span class="status-passed">${this.report.summary.passedTests} passed</span>, 
                    <span class="status-failed">${this.report.summary.failedTests} failed</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h3>Code Coverage</h3>
                <div class="value">${this.report.coverage.overall.lines.percentage}%</div>
                <div class="description">Lines covered</div>
            </div>
        </div>

        <div class="suites">
            <h2>📋 Test Suite Details</h2>
            ${Object.values(this.report.suites).map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <div class="suite-name">${suite.name}</div>
                        <div class="suite-status ${suite.status.toLowerCase()}">${suite.status}</div>
                    </div>
                    <div class="suite-stats">
                        <div>Tests: ${suite.numTotalTests || 0}</div>
                        <div>Passed: ${suite.numPassedTests || 0}</div>
                        <div>Failed: ${suite.numFailedTests || 0}</div>
                        <div>Duration: ${Math.round((suite.duration || 0) / 1000)}s</div>
                    </div>
                    ${suite.coverage ? `
                        <div class="coverage-bar">
                            <div class="coverage-bar-inner">
                                <div class="coverage-bar-fill" style="width: ${suite.coverage.lines?.percentage || 0}%"></div>
                            </div>
                            <div class="coverage-text">Coverage: ${suite.coverage.lines?.percentage || 0}%</div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(OUTPUT_PATH, 'comprehensive-report.html');
    fs.writeFileSync(htmlPath, htmlTemplate);
    console.log(`  ✓ HTML report: ${htmlPath}`);
  }

  async generateMarkdownReport() {
    const markdown = `# Team Availability Tracker - Test Report

## Summary

- **Overall Status**: ${this.report.summary.overallStatus === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}
- **Generated**: ${this.report.timestamp}
- **Branch**: ${this.report.environment.branch}
- **Commit**: ${this.report.environment.commit.substring(0, 8)}

## Results

| Metric | Value |
|--------|-------|
| Total Suites | ${this.report.summary.totalSuites} |
| Passed Suites | ✅ ${this.report.summary.passedSuites} |
| Failed Suites | ❌ ${this.report.summary.failedSuites} |
| Total Tests | ${this.report.summary.totalTests} |
| Passed Tests | ✅ ${this.report.summary.passedTests} |
| Failed Tests | ❌ ${this.report.summary.failedTests} |
| Code Coverage | ${this.report.coverage.overall.lines.percentage}% |

## Test Suite Details

${Object.values(this.report.suites).map(suite => `
### ${suite.status === 'PASSED' ? '✅' : '❌'} ${suite.name}

- **Status**: ${suite.status}
- **Tests**: ${suite.numTotalTests} (${suite.numPassedTests} passed, ${suite.numFailedTests} failed)
- **Duration**: ${Math.round((suite.duration || 0) / 1000)}s
${suite.coverage ? `- **Coverage**: ${suite.coverage.lines?.percentage || 0}%` : ''}
`).join('\n')}

${this.report.security.vulnerabilities.length > 0 ? `
## Security Issues

Found ${this.report.security.vulnerabilities.length} security issues that need attention.
` : ''}

${this.report.accessibility.violations.length > 0 ? `
## Accessibility Issues

Found ${this.report.accessibility.violations.length} accessibility violations.
` : ''}

---
*Report generated by Team Availability Tracker CI/CD Pipeline*
`;

    const markdownPath = path.join(OUTPUT_PATH, 'test-report.md');
    fs.writeFileSync(markdownPath, markdown);
    console.log(`  ✓ Markdown report: ${markdownPath}`);
  }

  async generateSummaryReport() {
    const summary = {
      overall: {
        passed: this.report.summary.overallStatus === 'PASSED',
        status: this.report.summary.overallStatus,
      },
      unit: {
        passed: this.getSuiteStatus('Data Layer') && this.getSuiteStatus('Business Logic'),
        total: this.getSuiteTestCount('Data Layer') + this.getSuiteTestCount('Business Logic'),
        coverage: this.getSuiteCoverage('Data Layer'),
      },
      integration: {
        passed: this.getSuiteStatus('Integration'),
        total: this.getSuiteTestCount('Integration'),
        coverage: this.getSuiteCoverage('Integration'),
      },
      components: {
        passed: this.getSuiteStatus('Components'),
        total: this.getSuiteTestCount('Components'),
        coverage: this.getSuiteCoverage('Components'),
      },
      e2e: {
        passed: this.getSuiteStatus('e2e'),
        total: this.getSuiteTestCount('e2e'),
      },
      performance: {
        passed: this.getSuiteStatus('Performance'),
        total: this.getSuiteTestCount('Performance'),
      },
      security: {
        passed: this.getSuiteStatus('Security'),
        total: this.getSuiteTestCount('Security'),
      },
      accessibility: {
        passed: this.report.accessibility.violations.length === 0,
        score: this.report.accessibility.score,
      },
    };

    const summaryPath = path.join(OUTPUT_PATH, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`  ✓ Summary report: ${summaryPath}`);
  }

  getSuiteStatus(suiteName) {
    const suite = Object.values(this.report.suites).find(s => 
      s.name.toLowerCase().includes(suiteName.toLowerCase())
    );
    return suite?.status === 'PASSED' || false;
  }

  getSuiteTestCount(suiteName) {
    const suite = Object.values(this.report.suites).find(s => 
      s.name.toLowerCase().includes(suiteName.toLowerCase())
    );
    return suite?.numTotalTests || 0;
  }

  getSuiteCoverage(suiteName) {
    const coverage = this.report.coverage.bySuite[suiteName.toLowerCase()];
    return coverage?.lines?.percentage || 0;
  }

  parseDuration(testResults) {
    if (!testResults) return 0;
    return testResults.reduce((sum, result) => sum + (result.perfStats?.runtime || 0), 0);
  }

  extractCoverage(jestData) {
    if (!jestData.coverageMap) return null;

    // This is a simplified coverage extraction
    // Real implementation would parse the coverage map properly
    return {
      lines: { covered: 0, total: 0, percentage: 0 },
      functions: { covered: 0, total: 0, percentage: 0 },
      branches: { covered: 0, total: 0, percentage: 0 },
      statements: { covered: 0, total: 0, percentage: 0 },
    };
  }

  parseLcovData(lcovData) {
    // Simplified LCOV parsing
    const lines = lcovData.split('\n');
    let covered = 0, total = 0;

    for (const line of lines) {
      if (line.startsWith('LF:')) total += parseInt(line.split(':')[1]);
      if (line.startsWith('LH:')) covered += parseInt(line.split(':')[1]);
    }

    return {
      lines: {
        covered,
        total,
        percentage: total > 0 ? Math.round((covered / total) * 100) : 0
      }
    };
  }
}

// Main execution
async function main() {
  try {
    const generator = new TestReportGenerator();
    await generator.generate();
  } catch (error) {
    console.error(chalk.red('Fatal error in report generation:'), error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { TestReportGenerator };