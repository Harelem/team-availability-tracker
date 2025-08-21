#!/usr/bin/env node

/**
 * Pre-Production Audit Orchestration Script
 * 
 * Comprehensive automated audit system that validates all aspects of the application
 * before production deployment, ensuring quality, security, and operational readiness.
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

// Audit configuration
const auditConfig = {
  phases: [
    {
      name: 'Data Accuracy & Calculation Audit',
      script: 'npm run audit:data-accuracy',
      description: 'Validates sprint calculations, Israeli work week compliance, and data consistency',
      critical: true,
      timeout: 60000
    },
    {
      name: 'UI/UX Pattern Consistency',
      script: 'npm run audit:ui-patterns',
      description: 'Ensures design system compliance and consistent user experience',
      critical: true,
      timeout: 45000
    },
    {
      name: 'Accessibility Compliance Audit',
      script: 'npm run test:accessibility-full',
      description: 'Comprehensive WCAG 2.1 AA compliance validation',
      critical: true,
      timeout: 60000
    },
    {
      name: 'Feature Integration Testing',
      script: 'npm run test:integration',  
      description: 'End-to-end feature functionality and cross-component integration',
      critical: true,
      timeout: 120000
    },
    {
      name: 'Performance Audit',
      script: 'npm run audit:performance',
      description: 'Performance benchmarks, memory usage, and optimization validation',
      critical: false,
      timeout: 90000
    },
    {
      name: 'Security Vulnerability Scan',
      script: 'npm run audit:security-enhanced',
      description: 'Security tests, static analysis, and vulnerability assessment with Semgrep',
      critical: true,
      timeout: 120000
    },
    {
      name: 'Static Code Security Analysis',
      script: 'npm run semgrep:ci',
      description: 'Semgrep static analysis for security vulnerabilities and code quality',
      critical: true,
      timeout: 90000
    },
    {
      name: 'Cross-Browser Compatibility',
      script: 'jest __tests__/audit/browserCompatibility.test.ts --verbose',
      description: 'Browser compatibility and responsive design validation',
      critical: false,
      timeout: 60000
    },
    {
      name: 'Production Readiness Validation',
      script: 'jest __tests__/audit/productionReadiness.test.ts --verbose',
      description: 'Deployment readiness, configuration, and operational preparedness',
      critical: true,
      timeout: 45000
    }
  ],
  reporting: {
    outputDir: './audit-reports',
    generateHTML: true,
    generateJSON: true,
    includeDetailedLogs: true
  },
  thresholds: {
    testCoverage: 85, // Minimum 85% test coverage
    performanceScore: 80, // Minimum performance score
    accessibilityScore: 95, // Minimum accessibility compliance
    securityScore: 90, // Minimum security score
    maxSemgrepErrors: 0, // No critical security errors allowed
    maxSemgrepWarnings: 5 // Maximum 5 security warnings allowed
  }
};

class PreProductionAuditor {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      phases: [],
      summary: {
        totalPhases: auditConfig.phases.length,
        passedPhases: 0,
        failedPhases: 0,
        criticalFailures: 0,
        overallStatus: 'PENDING',
        executionTime: 0
      },
      metadata: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        auditVersion: '1.0.0'
      }
    };
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
    
    console.log(`${colorMap[level]}[${timestamp}] ${message}${colors.reset}`);
  }

  // Validate and sanitize command execution
  validateCommand(command) {
    // Allowlist of safe commands for audit phases
    const allowedCommands = [
      'npm run audit:data-accuracy',
      'npm run audit:ui-patterns', 
      'npm run test:accessibility-full',
      'npm run test:integration',
      'npm run audit:performance',
      'npm run audit:security-enhanced',
      'npm run semgrep:ci',
      'jest __tests__/audit/browserCompatibility.test.ts --verbose',
      'jest __tests__/audit/productionReadiness.test.ts --verbose'
    ];

    // Check if command is in allowlist
    if (!allowedCommands.includes(command.trim())) {
      throw new Error(`Command not in allowlist: ${command}`);
    }

    // Additional validation - no dangerous characters
    const dangerousPatterns = [
      /[;&|`$(){}[\]]/,  // Shell metacharacters
      /\.\./,            // Directory traversal
      /rm\s+-rf/i,       // Dangerous delete commands
      /sudo/i,           // Privilege escalation
      /curl|wget/i,      // Network commands
      /eval|exec/i       // Code execution
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Command contains dangerous pattern: ${command}`);
      }
    }

    return command.trim();
  }

  async runPhase(phase, index) {
    const phaseNumber = index + 1;
    const totalPhases = auditConfig.phases.length;
    
    this.log(`\n${'='.repeat(80)}`, 'header');
    this.log(`Phase ${phaseNumber}/${totalPhases}: ${phase.name}`, 'header');
    this.log(`Description: ${phase.description}`, 'info');
    this.log(`Critical: ${phase.critical ? 'YES' : 'NO'}`, phase.critical ? 'warn' : 'info');
    this.log(`${'='.repeat(80)}`, 'header');

    const phaseStartTime = Date.now();
    let phaseResult = {
      name: phase.name,
      description: phase.description,
      critical: phase.critical,
      status: 'PENDING',
      executionTime: 0,
      output: '',
      error: null,
      metrics: {}
    };

    try {
      // Validate command before execution
      const safeCommand = this.validateCommand(phase.script);
      this.log(`Executing: ${safeCommand}`, 'info');
      
      const output = execSync(safeCommand, {
        encoding: 'utf8',
        timeout: phase.timeout,
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'test' // Ensure test environment
        }
      });

      phaseResult.output = output;
      phaseResult.status = 'PASS';
      phaseResult.executionTime = Date.now() - phaseStartTime;
      
      // Extract metrics from output if available
      phaseResult.metrics = this.extractMetrics(output, phase.name);
      
      this.results.summary.passedPhases++;
      this.log(`✅ Phase ${phaseNumber} PASSED (${phaseResult.executionTime}ms)`, 'success');
      
    } catch (error) {
      phaseResult.status = 'FAIL';
      phaseResult.error = error.message;
      phaseResult.output = error.stdout || '';
      phaseResult.executionTime = Date.now() - phaseStartTime;
      
      this.results.summary.failedPhases++;
      
      if (phase.critical) {
        this.results.summary.criticalFailures++;
        this.log(`❌ Phase ${phaseNumber} FAILED (CRITICAL): ${error.message}`, 'error');
      } else {
        this.log(`⚠️  Phase ${phaseNumber} FAILED (NON-CRITICAL): ${error.message}`, 'warn');
      }
    }

    this.results.phases.push(phaseResult);
    return phaseResult;
  }

  extractMetrics(output, phaseName) {
    const metrics = {};
    
    try {
      // Extract test metrics
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?/);
      if (testMatch) {
        metrics.testsTotal = parseInt(testMatch[1]) + (parseInt(testMatch[2]) || 0);
        metrics.testsPassed = parseInt(testMatch[1]);
        metrics.testsFailed = parseInt(testMatch[2]) || 0;
        metrics.testPassRate = ((metrics.testsPassed / metrics.testsTotal) * 100).toFixed(2);
      }

      // Extract coverage metrics
      const coverageMatch = output.match(/All files[^|]*\|\s*([\d.]+)/);
      if (coverageMatch) {
        metrics.coverage = parseFloat(coverageMatch[1]);
      }

      // Extract performance metrics
      if (phaseName.toLowerCase().includes('performance')) {
        const performanceMatch = output.match(/render.*time.*(\d+(?:\.\d+)?)\s*ms/i);
        if (performanceMatch) {
          metrics.renderTime = parseFloat(performanceMatch[1]);
        }
      }

      // Extract accessibility metrics
      if (phaseName.toLowerCase().includes('accessibility')) {
        const violationsMatch = output.match(/(\d+)\s+violations?/i);
        if (violationsMatch) {
          metrics.accessibilityViolations = parseInt(violationsMatch[1]);
        }
      }

      // Extract Semgrep metrics
      if (phaseName.toLowerCase().includes('static') || phaseName.toLowerCase().includes('semgrep')) {
        const semgrepFindingsMatch = output.match(/(\d+)\s+finding/i);
        if (semgrepFindingsMatch) {
          metrics.semgrepFindings = parseInt(semgrepFindingsMatch[1]);
        }

        const semgrepErrorsMatch = output.match(/(\d+)\s+error/i);
        if (semgrepErrorsMatch) {
          metrics.semgrepErrors = parseInt(semgrepErrorsMatch[1]);
        }

        const semgrepWarningsMatch = output.match(/(\d+)\s+warning/i);
        if (semgrepWarningsMatch) {
          metrics.semgrepWarnings = parseInt(semgrepWarningsMatch[1]);
        }
      }

    } catch (error) {
      // Metrics extraction is non-critical
      this.log(`Warning: Could not extract metrics from ${phaseName}: ${error.message}`, 'warn');
    }

    return metrics;
  }

  generateReport() {
    const executionTime = Date.now() - this.startTime;
    this.results.summary.executionTime = executionTime;
    
    // Determine overall status
    if (this.results.summary.criticalFailures > 0) {
      this.results.summary.overallStatus = 'CRITICAL_FAILURE';
    } else if (this.results.summary.failedPhases > 0) {
      this.results.summary.overallStatus = 'PARTIAL_FAILURE';
    } else if (this.results.summary.passedPhases === this.results.summary.totalPhases) {
      this.results.summary.overallStatus = 'SUCCESS';
    } else {
      this.results.summary.overallStatus = 'INCOMPLETE';
    }

    // Ensure output directory exists
    if (!fs.existsSync(auditConfig.reporting.outputDir)) {
      fs.mkdirSync(auditConfig.reporting.outputDir, { recursive: true });
    }

    // Generate JSON report
    if (auditConfig.reporting.generateJSON) {
      const jsonReport = path.join(auditConfig.reporting.outputDir, 'audit-report.json');
      fs.writeFileSync(jsonReport, JSON.stringify(this.results, null, 2));
      this.log(`JSON report generated: ${jsonReport}`, 'info');
    }

    // Generate HTML report
    if (auditConfig.reporting.generateHTML) {
      this.generateHTMLReport();
    }

    return this.results;
  }

  generateHTMLReport() {
    const htmlReport = path.join(auditConfig.reporting.outputDir, 'audit-report.html');
    const { summary, phases, metadata } = this.results;
    
    const statusColor = {
      'SUCCESS': '#28a745',
      'PARTIAL_FAILURE': '#ffc107', 
      'CRITICAL_FAILURE': '#dc3545',
      'INCOMPLETE': '#6c757d'
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pre-Production Audit Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .summary { padding: 30px; border-bottom: 1px solid #e9ecef; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #495057; }
        .summary-card .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .overall-status { text-align: center; margin: 20px 0; }
        .status-badge { display: inline-block; padding: 10px 20px; border-radius: 20px; color: white; font-weight: bold; font-size: 1.2em; }
        .phases { padding: 30px; }
        .phase { margin-bottom: 30px; border: 1px solid #e9ecef; border-radius: 6px; overflow: hidden; }
        .phase-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
        .phase-title { font-weight: bold; color: #495057; }
        .phase-status { padding: 4px 12px; border-radius: 12px; color: white; font-size: 0.85em; font-weight: bold; }
        .status-pass { background: #28a745; }
        .status-fail { background: #dc3545; }
        .phase-content { padding: 20px; }
        .phase-description { color: #6c757d; margin-bottom: 15px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 15px; }
        .metric { background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: center; }
        .metric-label { font-size: 0.85em; color: #6c757d; }
        .metric-value { font-weight: bold; color: #495057; }
        .footer { padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; }
        .critical-badge { background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75em; margin-left: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Pre-Production Audit Report</h1>
            <p>Team Availability Tracker - Comprehensive Quality & Security Validation</p>
        </div>
        
        <div class="summary">
            <div class="overall-status">
                <span class="status-badge" style="background-color: ${statusColor[summary.overallStatus]}">
                    ${summary.overallStatus.replace(/_/g, ' ')}
                </span>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Phases</h3>
                    <div class="value">${summary.totalPhases}</div>
                </div>
                <div class="summary-card">
                    <h3>Passed</h3>
                    <div class="value" style="color: #28a745">${summary.passedPhases}</div>
                </div>
                <div class="summary-card">
                    <h3>Failed</h3>
                    <div class="value" style="color: #dc3545">${summary.failedPhases}</div>
                </div>
                <div class="summary-card">
                    <h3>Critical Failures</h3>
                    <div class="value" style="color: #dc3545">${summary.criticalFailures}</div>
                </div>
                <div class="summary-card">
                    <h3>Execution Time</h3>
                    <div class="value" style="color: #6f42c1">${Math.round(summary.executionTime / 1000)}s</div>
                </div>
            </div>
        </div>
        
        <div class="phases">
            <h2>📋 Detailed Phase Results</h2>
            ${phases.map((phase, index) => `
                <div class="phase">
                    <div class="phase-header">
                        <div class="phase-title">
                            Phase ${index + 1}: ${phase.name}
                            ${phase.critical ? '<span class="critical-badge">CRITICAL</span>' : ''}
                        </div>
                        <div class="phase-status ${phase.status === 'PASS' ? 'status-pass' : 'status-fail'}">
                            ${phase.status}
                        </div>
                    </div>
                    <div class="phase-content">
                        <div class="phase-description">${phase.description}</div>
                        <p><strong>Execution Time:</strong> ${phase.executionTime}ms</p>
                        ${phase.error ? `<p style="color: #dc3545;"><strong>Error:</strong> ${phase.error}</p>` : ''}
                        ${Object.keys(phase.metrics).length > 0 ? `
                            <div class="metrics">
                                ${Object.entries(phase.metrics).map(([key, value]) => `
                                    <div class="metric">
                                        <div class="metric-label">${key.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
                                        <div class="metric-value">${value}${key.includes('Rate') || key.includes('coverage') ? '%' : ''}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>Generated on ${new Date(metadata.timestamp).toLocaleString()}</p>
            <p>Node.js ${metadata.nodeVersion} • ${metadata.platform} • Audit Version ${metadata.auditVersion}</p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(htmlReport, html);
    this.log(`HTML report generated: ${htmlReport}`, 'info');
  }

  printSummary() {
    const { summary } = this.results;
    
    this.log('\n' + '='.repeat(80), 'header');
    this.log('🏁 PRE-PRODUCTION AUDIT COMPLETE', 'header');
    this.log('='.repeat(80), 'header');
    
    this.log(`Overall Status: ${summary.overallStatus}`, 
             summary.overallStatus === 'SUCCESS' ? 'success' : 
             summary.criticalFailures > 0 ? 'error' : 'warn');
    
    this.log(`Total Phases: ${summary.totalPhases}`, 'info');
    this.log(`Passed: ${summary.passedPhases}`, 'success');
    this.log(`Failed: ${summary.failedPhases}`, summary.failedPhases > 0 ? 'error' : 'info');
    this.log(`Critical Failures: ${summary.criticalFailures}`, 
             summary.criticalFailures > 0 ? 'error' : 'success');
    this.log(`Execution Time: ${Math.round(summary.executionTime / 1000)} seconds`, 'info');
    
    // Deployment recommendation
    if (summary.overallStatus === 'SUCCESS') {
      this.log('\n✅ RECOMMENDATION: APPROVED FOR PRODUCTION DEPLOYMENT', 'success');
      this.log('All critical validations passed. The application is ready for production.', 'success');
    } else if (summary.criticalFailures > 0) {
      this.log('\n❌ RECOMMENDATION: DEPLOYMENT BLOCKED', 'error'); 
      this.log('Critical failures detected. Must resolve before production deployment.', 'error');
    } else {
      this.log('\n⚠️  RECOMMENDATION: DEPLOYMENT WITH CAUTION', 'warn');
      this.log('Non-critical issues detected. Consider resolving before deployment.', 'warn');
    }
    
    this.log('\n📊 Detailed reports available in: ./audit-reports/', 'info');
    this.log('='.repeat(80), 'header');
  }

  async run() {
    this.log('🚀 Starting Pre-Production Audit...', 'header');
    this.log(`Audit Configuration: ${auditConfig.phases.length} phases configured`, 'info');
    this.log(`Critical phases: ${auditConfig.phases.filter(p => p.critical).length}`, 'info');
    this.log(`Non-critical phases: ${auditConfig.phases.filter(p => !p.critical).length}`, 'info');

    // Run all audit phases
    for (let i = 0; i < auditConfig.phases.length; i++) {
      const phase = auditConfig.phases[i];
      await this.runPhase(phase, i);
      
      // Short delay between phases for readability
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate reports and summary
    this.generateReport();
    this.printSummary();

    // Exit with appropriate code
    const exitCode = this.results.summary.criticalFailures > 0 ? 1 : 0;
    process.exit(exitCode);
  }
}

// Main execution
if (require.main === module) {
  const auditor = new PreProductionAuditor();
  
  // Handle process termination gracefully
  process.on('SIGINT', () => {
    auditor.log('\n⚠️  Audit interrupted by user', 'warn');
    auditor.generateReport();
    process.exit(130);
  });

  process.on('uncaughtException', (error) => {
    auditor.log(`💥 Uncaught exception: ${error.message}`, 'error');
    auditor.generateReport();
    process.exit(1);
  });

  // Start the audit
  auditor.run().catch(error => {
    auditor.log(`💥 Audit failed with error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = PreProductionAuditor;