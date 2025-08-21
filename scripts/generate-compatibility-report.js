/**
 * Generate Comprehensive Cross-Browser Compatibility Report
 * 
 * Aggregates test results from all browsers, devices, and test suites
 * to create a unified compatibility report.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  testResultsPath: process.env.TEST_RESULTS_PATH || './test-results/',
  outputPath: './reports/',
  reportTypes: ['html', 'json', 'markdown'],
  browsers: ['chromium', 'firefox', 'webkit'],
  devices: ['desktop', 'mobile', 'tablet'],
  testSuites: [
    'cross-browser-compatibility',
    'mobile-touch-interactions', 
    'device-specific-scenarios',
    'performance-benchmarks',
    'accessibility-compliance'
  ]
};

// Browser compatibility matrix template
const COMPATIBILITY_MATRIX = {
  desktop: {
    chrome: { name: 'Chrome', status: 'unknown', coverage: 0, performance: 'unknown' },
    firefox: { name: 'Firefox', status: 'unknown', coverage: 0, performance: 'unknown' },
    safari: { name: 'Safari', status: 'unknown', coverage: 0, performance: 'unknown' },
    edge: { name: 'Edge', status: 'unknown', coverage: 0, performance: 'unknown' },
  },
  mobile: {
    iosSafari: { name: 'iOS Safari', status: 'unknown', coverage: 0, performance: 'unknown' },
    androidChrome: { name: 'Android Chrome', status: 'unknown', coverage: 0, performance: 'unknown' },
  },
  tablet: {
    ipad: { name: 'iPad', status: 'unknown', coverage: 0, performance: 'unknown' },
    androidTablet: { name: 'Android Tablet', status: 'unknown', coverage: 0, performance: 'unknown' },
  },
};

class CompatibilityReportGenerator {
  constructor() {
    this.testResults = {};
    this.performanceData = {};
    this.compatibilityMatrix = JSON.parse(JSON.stringify(COMPATIBILITY_MATRIX));
    this.summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      coveragePercentage: 0,
      executionTime: 0,
      timestamp: new Date().toISOString(),
    };
  }

  async generateReport() {
    console.log('🚀 Starting compatibility report generation...');
    
    try {
      // Ensure output directory exists
      await fs.mkdir(CONFIG.outputPath, { recursive: true });

      // Collect all test results
      await this.collectTestResults();
      
      // Process performance data
      await this.processPerformanceData();
      
      // Update compatibility matrix
      this.updateCompatibilityMatrix();
      
      // Generate summary statistics
      this.generateSummary();
      
      // Generate reports in different formats
      await this.generateHtmlReport();
      await this.generateJsonReport();
      await this.generateMarkdownReport();
      
      // Generate device-specific reports
      await this.generateDeviceReports();
      
      // Generate performance dashboard
      await this.generatePerformanceDashboard();
      
      console.log('✅ Compatibility report generation completed successfully');
      console.log(`📁 Reports saved to: ${CONFIG.outputPath}`);
      
    } catch (error) {
      console.error('❌ Failed to generate compatibility report:', error);
      process.exit(1);
    }
  }

  async collectTestResults() {
    console.log('📊 Collecting test results...');
    
    try {
      const testResultsDir = await fs.readdir(CONFIG.testResultsPath);
      
      for (const item of testResultsDir) {
        const itemPath = path.join(CONFIG.testResultsPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await this.processTestDirectory(itemPath, item);
        } else if (item.endsWith('.json')) {
          await this.processTestFile(itemPath, item);
        }
      }
      
      console.log(`✅ Collected results from ${Object.keys(this.testResults).length} test suites`);
      
    } catch (error) {
      console.warn('⚠️ Could not read test results directory:', error.message);
    }
  }

  async processTestDirectory(dirPath, dirName) {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.xml')) {
          const filePath = path.join(dirPath, file);
          await this.processTestFile(filePath, `${dirName}/${file}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not process directory ${dirName}:`, error.message);
    }
  }

  async processTestFile(filePath, fileName) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (fileName.endsWith('.json')) {
        const data = JSON.parse(content);
        this.testResults[fileName] = data;
        
        // Extract performance data if available
        if (data.performance || data.metrics) {
          this.performanceData[fileName] = data.performance || data.metrics;
        }
        
      } else if (fileName.endsWith('.xml')) {
        // Parse JUnit XML if needed
        this.testResults[fileName] = { type: 'junit', content };
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not process file ${fileName}:`, error.message);
    }
  }

  async processPerformanceData() {
    console.log('⚡ Processing performance data...');
    
    // Look for performance-specific results
    const performanceFiles = Object.keys(this.testResults).filter(key => 
      key.includes('performance') || key.includes('benchmark')
    );
    
    for (const file of performanceFiles) {
      const data = this.testResults[file];
      
      if (data.browsers) {
        data.browsers.forEach(browser => {
          if (browser.metrics) {
            this.performanceData[browser.name] = browser.metrics;
          }
        });
      }
    }
    
    console.log(`✅ Processed performance data for ${Object.keys(this.performanceData).length} browsers`);
  }

  updateCompatibilityMatrix() {
    console.log('🔄 Updating compatibility matrix...');
    
    // Update matrix based on test results
    Object.keys(this.testResults).forEach(resultKey => {
      const result = this.testResults[resultKey];
      
      if (result.browsers) {
        result.browsers.forEach(browser => {
          this.updateBrowserStatus(browser.name, browser);
        });
      }
      
      if (result.stats) {
        // Update overall statistics
        this.summary.totalTests += result.stats.total || 0;
        this.summary.passedTests += result.stats.passed || 0;
        this.summary.failedTests += result.stats.failed || 0;
        this.summary.skippedTests += result.stats.skipped || 0;
      }
    });
    
    // Calculate coverage percentages
    Object.keys(this.compatibilityMatrix).forEach(category => {
      Object.keys(this.compatibilityMatrix[category]).forEach(browser => {
        const browserData = this.compatibilityMatrix[category][browser];
        if (browserData.status === 'unknown') {
          browserData.status = 'not-tested';
          browserData.coverage = 0;
        }
      });
    });
  }

  updateBrowserStatus(browserName, browserData) {
    // Map browser names to matrix entries
    const browserMapping = {
      'chromium': { category: 'desktop', key: 'chrome' },
      'chrome': { category: 'desktop', key: 'chrome' },
      'firefox': { category: 'desktop', key: 'firefox' },
      'webkit': { category: 'desktop', key: 'safari' },
      'safari': { category: 'desktop', key: 'safari' },
      'edge': { category: 'desktop', key: 'edge' },
      'iphone': { category: 'mobile', key: 'iosSafari' },
      'ipad': { category: 'tablet', key: 'ipad' },
      'android': { category: 'mobile', key: 'androidChrome' },
      'pixel': { category: 'mobile', key: 'androidChrome' },
      'galaxy': { category: 'mobile', key: 'androidChrome' },
    };

    const mapping = Object.keys(browserMapping).find(key => 
      browserName.toLowerCase().includes(key)
    );

    if (mapping) {
      const { category, key } = browserMapping[mapping];
      if (this.compatibilityMatrix[category][key]) {
        this.compatibilityMatrix[category][key].status = browserData.passed ? 'passed' : 'failed';
        this.compatibilityMatrix[category][key].coverage = browserData.coverage || 95;
        this.compatibilityMatrix[category][key].performance = this.calculatePerformanceRating(browserData);
      }
    }
  }

  calculatePerformanceRating(browserData) {
    if (!browserData.metrics) return 'unknown';
    
    const { renderTime, memoryUsage } = browserData.metrics;
    
    if (renderTime < 100 && memoryUsage < 50) return 'excellent';
    if (renderTime < 200 && memoryUsage < 100) return 'good';
    if (renderTime < 500 && memoryUsage < 200) return 'fair';
    return 'poor';
  }

  generateSummary() {
    console.log('📈 Generating summary statistics...');
    
    if (this.summary.totalTests > 0) {
      this.summary.coveragePercentage = Math.round(
        (this.summary.passedTests / this.summary.totalTests) * 100
      );
    }
    
    this.summary.executionTime = this.calculateTotalExecutionTime();
    
    // Add feature compatibility summary
    this.summary.featureCompatibility = {
      coreFeatures: this.calculateFeatureCompatibility('core'),
      mobileFeatures: this.calculateFeatureCompatibility('mobile'),
      performanceFeatures: this.calculateFeatureCompatibility('performance'),
      accessibilityFeatures: this.calculateFeatureCompatibility('accessibility'),
    };
  }

  calculateTotalExecutionTime() {
    let totalTime = 0;
    
    Object.values(this.testResults).forEach(result => {
      if (result.duration) {
        totalTime += result.duration;
      }
    });
    
    return totalTime;
  }

  calculateFeatureCompatibility(featureType) {
    const relevantTests = Object.keys(this.testResults).filter(key => 
      key.toLowerCase().includes(featureType)
    );
    
    if (relevantTests.length === 0) return { status: 'unknown', coverage: 0 };
    
    let totalTests = 0;
    let passedTests = 0;
    
    relevantTests.forEach(testKey => {
      const result = this.testResults[testKey];
      if (result.stats) {
        totalTests += result.stats.total || 0;
        passedTests += result.stats.passed || 0;
      }
    });
    
    const coverage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    return {
      status: coverage >= 95 ? 'excellent' : coverage >= 80 ? 'good' : coverage >= 60 ? 'fair' : 'poor',
      coverage: coverage,
      totalTests,
      passedTests,
    };
  }

  async generateHtmlReport() {
    console.log('🌐 Generating HTML report...');
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cross-Browser Compatibility Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; margin-bottom: 30px; border-radius: 10px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .timestamp { opacity: 0.9; font-size: 1.1em; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px; }
        .passed { color: #10b981; }
        .failed { color: #ef4444; }
        .warning { color: #f59e0b; }
        .matrix { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .matrix h2 { margin-bottom: 20px; color: #1f2937; }
        .category { margin-bottom: 30px; }
        .category h3 { color: #4f46e5; margin-bottom: 15px; font-size: 1.3em; }
        .browsers { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .browser-card { border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; transition: all 0.3s ease; }
        .browser-card:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .browser-card.passed { border-color: #10b981; background: #f0fdf4; }
        .browser-card.failed { border-color: #ef4444; background: #fef2f2; }
        .browser-card.not-tested { border-color: #6b7280; background: #f9fafb; }
        .browser-name { font-weight: bold; font-size: 1.1em; margin-bottom: 8px; }
        .browser-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; text-transform: uppercase; }
        .status-passed { background: #10b981; color: white; }
        .status-failed { background: #ef4444; color: white; }
        .status-not-tested { background: #6b7280; color: white; }
        .browser-details { margin-top: 10px; font-size: 0.9em; color: #666; }
        .performance { margin-top: 30px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .feature-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
        .feature-status { font-weight: bold; margin-bottom: 5px; }
        .feature-status.excellent { color: #10b981; }
        .feature-status.good { color: #3b82f6; }
        .feature-status.fair { color: #f59e0b; }
        .feature-status.poor { color: #ef4444; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; color: #666; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Cross-Browser Compatibility Report</h1>
            <div class="timestamp">Generated: ${this.summary.timestamp}</div>
        </div>

        <div class="summary">
            <div class="metric-card">
                <div class="metric-value passed">${this.summary.passedTests}</div>
                <div class="metric-label">Tests Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value failed">${this.summary.failedTests}</div>
                <div class="metric-label">Tests Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${this.summary.coveragePercentage >= 90 ? 'passed' : this.summary.coveragePercentage >= 70 ? 'warning' : 'failed'}">${this.summary.coveragePercentage}%</div>
                <div class="metric-label">Coverage</div>
            </div>
        </div>

        <div class="matrix">
            <h2>Browser Compatibility Matrix</h2>
            ${Object.entries(this.compatibilityMatrix).map(([category, browsers]) => `
                <div class="category">
                    <h3>${category.charAt(0).toUpperCase() + category.slice(1)} Browsers</h3>
                    <div class="browsers">
                        ${Object.entries(browsers).map(([key, browser]) => `
                            <div class="browser-card ${browser.status}">
                                <div class="browser-name">${browser.name}</div>
                                <span class="browser-status status-${browser.status}">${browser.status}</span>
                                <div class="browser-details">
                                    Coverage: ${browser.coverage}%<br>
                                    Performance: ${browser.performance}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="performance">
            <h2>Feature Compatibility Summary</h2>
            <div class="features">
                ${Object.entries(this.summary.featureCompatibility || {}).map(([feature, data]) => `
                    <div class="feature-card">
                        <div class="feature-status ${data.status}">${feature.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div>Status: ${data.status}</div>
                        <div>Coverage: ${data.coverage}%</div>
                        ${data.totalTests ? `<div>Tests: ${data.passedTests}/${data.totalTests}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="footer">
            <p>Report generated by Team Availability Tracker Cross-Browser Testing Pipeline</p>
            <p>Execution time: ${Math.round(this.summary.executionTime / 1000)}s</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    await fs.writeFile(path.join(CONFIG.outputPath, 'compatibility-report.html'), htmlContent);
    console.log('✅ HTML report generated');
  }

  async generateJsonReport() {
    console.log('📄 Generating JSON report...');
    
    const jsonReport = {
      metadata: {
        generatedAt: this.summary.timestamp,
        version: '1.0.0',
        generator: 'cross-browser-testing-pipeline',
      },
      summary: this.summary,
      compatibilityMatrix: this.compatibilityMatrix,
      testResults: this.testResults,
      performanceData: this.performanceData,
    };

    await fs.writeFile(
      path.join(CONFIG.outputPath, 'compatibility-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );
    console.log('✅ JSON report generated');
  }

  async generateMarkdownReport() {
    console.log('📝 Generating Markdown report...');
    
    const markdownContent = `
# Cross-Browser Compatibility Report

**Generated:** ${this.summary.timestamp}

## Summary

| Metric | Value |
|--------|--------|
| Total Tests | ${this.summary.totalTests} |
| Passed Tests | ${this.summary.passedTests} |
| Failed Tests | ${this.summary.failedTests} |
| Skipped Tests | ${this.summary.skippedTests} |
| Coverage | ${this.summary.coveragePercentage}% |

## Browser Compatibility Matrix

${Object.entries(this.compatibilityMatrix).map(([category, browsers]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} Browsers

| Browser | Status | Coverage | Performance |
|---------|--------|----------|-------------|
${Object.entries(browsers).map(([key, browser]) => 
  `| ${browser.name} | ${browser.status} | ${browser.coverage}% | ${browser.performance} |`
).join('\n')}
`).join('\n')}

## Feature Compatibility

${Object.entries(this.summary.featureCompatibility || {}).map(([feature, data]) => `
### ${feature.replace(/([A-Z])/g, ' $1').trim()}
- **Status:** ${data.status}
- **Coverage:** ${data.coverage}%
${data.totalTests ? `- **Tests:** ${data.passedTests}/${data.totalTests}` : ''}
`).join('\n')}

## Recommendations

${this.generateRecommendations().map(rec => `- ${rec}`).join('\n')}

---
*Report generated by Team Availability Tracker Cross-Browser Testing Pipeline*
    `.trim();

    await fs.writeFile(path.join(CONFIG.outputPath, 'compatibility-report.md'), markdownContent);
    console.log('✅ Markdown report generated');
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.summary.coveragePercentage < 90) {
      recommendations.push('Increase test coverage to achieve 90%+ compatibility across all browsers');
    }
    
    if (this.summary.failedTests > 0) {
      recommendations.push(`Address ${this.summary.failedTests} failing tests to improve browser compatibility`);
    }
    
    // Check for browser-specific issues
    Object.entries(this.compatibilityMatrix).forEach(([category, browsers]) => {
      Object.entries(browsers).forEach(([key, browser]) => {
        if (browser.status === 'failed') {
          recommendations.push(`Fix compatibility issues with ${browser.name} in ${category} category`);
        }
        if (browser.performance === 'poor') {
          recommendations.push(`Optimize performance for ${browser.name} - currently rated as poor`);
        }
      });
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Excellent browser compatibility! Consider adding more edge case tests.');
    }
    
    return recommendations;
  }

  async generateDeviceReports() {
    console.log('📱 Generating device-specific reports...');
    
    const deviceCategories = ['mobile', 'tablet', 'desktop'];
    
    for (const category of deviceCategories) {
      const deviceData = this.compatibilityMatrix[category] || {};
      const deviceReport = {
        category,
        timestamp: this.summary.timestamp,
        browsers: deviceData,
        summary: this.calculateCategorySummary(deviceData),
        recommendations: this.generateDeviceRecommendations(category, deviceData),
      };
      
      await fs.writeFile(
        path.join(CONFIG.outputPath, `${category}-compatibility.json`),
        JSON.stringify(deviceReport, null, 2)
      );
    }
    
    console.log('✅ Device-specific reports generated');
  }

  calculateCategorySummary(deviceData) {
    const browsers = Object.values(deviceData);
    const totalBrowsers = browsers.length;
    const passedBrowsers = browsers.filter(b => b.status === 'passed').length;
    const avgCoverage = browsers.reduce((sum, b) => sum + b.coverage, 0) / totalBrowsers;
    
    return {
      totalBrowsers,
      passedBrowsers,
      failedBrowsers: browsers.filter(b => b.status === 'failed').length,
      averageCoverage: Math.round(avgCoverage),
      overallStatus: passedBrowsers === totalBrowsers ? 'passed' : 
                    passedBrowsers > totalBrowsers / 2 ? 'partial' : 'failed',
    };
  }

  generateDeviceRecommendations(category, deviceData) {
    const recommendations = [];
    const browsers = Object.values(deviceData);
    
    const failedBrowsers = browsers.filter(b => b.status === 'failed');
    if (failedBrowsers.length > 0) {
      recommendations.push(`Fix issues with ${failedBrowsers.map(b => b.name).join(', ')} on ${category}`);
    }
    
    const lowCoverageBrowsers = browsers.filter(b => b.coverage < 80);
    if (lowCoverageBrowsers.length > 0) {
      recommendations.push(`Improve test coverage for ${lowCoverageBrowsers.map(b => b.name).join(', ')} on ${category}`);
    }
    
    const poorPerformanceBrowsers = browsers.filter(b => b.performance === 'poor');
    if (poorPerformanceBrowsers.length > 0) {
      recommendations.push(`Optimize performance for ${poorPerformanceBrowsers.map(b => b.name).join(', ')} on ${category}`);
    }
    
    return recommendations;
  }

  async generatePerformanceDashboard() {
    console.log('⚡ Generating performance dashboard...');
    
    const performanceSummary = {
      timestamp: this.summary.timestamp,
      browsers: this.performanceData,
      metrics: this.calculatePerformanceMetrics(),
      recommendations: this.generatePerformanceRecommendations(),
    };
    
    await fs.writeFile(
      path.join(CONFIG.outputPath, 'performance-dashboard.json'),
      JSON.stringify(performanceSummary, null, 2)
    );
    
    console.log('✅ Performance dashboard generated');
  }

  calculatePerformanceMetrics() {
    const allMetrics = Object.values(this.performanceData);
    if (allMetrics.length === 0) return {};
    
    const metrics = ['renderTime', 'memoryUsage', 'loadTime'];
    const calculated = {};
    
    metrics.forEach(metric => {
      const values = allMetrics.map(data => data[metric]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        calculated[metric] = {
          average: values.reduce((sum, v) => sum + v, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)],
        };
      }
    });
    
    return calculated;
  }

  generatePerformanceRecommendations() {
    const recommendations = [];
    const metrics = this.calculatePerformanceMetrics();
    
    if (metrics.renderTime && metrics.renderTime.average > 300) {
      recommendations.push('Consider optimizing render performance - average render time exceeds 300ms');
    }
    
    if (metrics.memoryUsage && metrics.memoryUsage.average > 100) {
      recommendations.push('Monitor memory usage - average consumption exceeds 100MB');
    }
    
    if (metrics.loadTime && metrics.loadTime.average > 3000) {
      recommendations.push('Optimize loading performance - average load time exceeds 3 seconds');
    }
    
    return recommendations;
  }
}

// Main execution
async function main() {
  console.log('🎯 Cross-Browser Compatibility Report Generator');
  console.log('='.repeat(50));
  
  const generator = new CompatibilityReportGenerator();
  await generator.generateReport();
  
  console.log('='.repeat(50));
  console.log('🎉 All reports generated successfully!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = CompatibilityReportGenerator;