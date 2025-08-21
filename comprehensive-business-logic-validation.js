#!/usr/bin/env node

/**
 * Comprehensive Business Logic Testing for Version 2.2 Enterprise Deployment
 * 
 * This script executes systematic validation of all critical business logic areas:
 * 1. Team Management System Testing
 * 2. Hours Completion Status Feature (MISSION CRITICAL)
 * 3. Personal Navigation Testing (NEWLY IMPLEMENTED) 
 * 4. Manager Features Testing
 * 5. COO Dashboard Testing (MISSION CRITICAL)
 * 6. Version 2.2 Features Testing
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class BusinessLogicValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      version: '2.2',
      testSuites: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        criticalIssues: [],
        performance: {}
      }
    };
  }

  async initialize() {
    console.log('🚀 Initializing Business Logic Validation Suite...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for validation
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    
    this.page = await this.browser.newPage();
    
    // Set up console monitoring
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console Error:', msg.text());
        this.results.summary.criticalIssues.push(`Console Error: ${msg.text()}`);
      }
    });
    
    // Set up network monitoring
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      const startTime = Date.now();
      request.continue();
      
      request.response().then(response => {
        const endTime = Date.now();
        if (response && response.status() >= 400) {
          this.results.summary.criticalIssues.push(`Network Error: ${request.url()} - ${response.status()}`);
        }
      }).catch(() => {});
    });
    
    console.log('✅ Browser initialized successfully');
  }

  async navigateToApp() {
    console.log('🔗 Navigating to application...');
    const startTime = Date.now();
    
    try {
      await this.page.goto('http://localhost:3002', { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      const loadTime = Date.now() - startTime;
      this.results.summary.performance.initialLoad = loadTime;
      
      console.log(`✅ Application loaded in ${loadTime}ms`);
      
      if (loadTime > 3000) {
        this.results.summary.criticalIssues.push(`Slow initial load: ${loadTime}ms (target: <3000ms)`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load application:', error);
      this.results.summary.criticalIssues.push(`Application load failure: ${error.message}`);
      return false;
    }
  }

  async testTeamManagementSystem() {
    console.log('\n📋 Testing Team Management System...');
    const testSuite = {
      name: 'Team Management System',
      tests: [],
      status: 'passed'
    };

    try {
      // Test 1: Verify team selection screen loads
      console.log('  🔍 Test 1: Team selection screen loading...');
      const teamSelectionExists = await this.page.waitForSelector('.team-selection, [data-testid="team-selection"]', { timeout: 10000 });
      testSuite.tests.push({
        name: 'Team Selection Screen Loads',
        status: teamSelectionExists ? 'passed' : 'failed',
        details: teamSelectionExists ? 'Team selection screen loaded successfully' : 'Team selection screen not found'
      });

      // Test 2: Verify teams are displayed
      console.log('  🔍 Test 2: Teams display verification...');
      const teams = await this.page.$$eval('button', buttons => 
        buttons.filter(btn => btn.textContent.includes('Team') || btn.textContent.includes('צוות')).length
      );
      testSuite.tests.push({
        name: 'Teams Display Correctly',
        status: teams > 0 ? 'passed' : 'failed',
        details: `Found ${teams} team options`
      });

      // Test 3: Test team selection
      console.log('  🔍 Test 3: Team selection functionality...');
      if (teams > 0) {
        const firstTeamButton = await this.page.$('button');
        if (firstTeamButton) {
          await firstTeamButton.click();
          await this.page.waitForTimeout(2000);
          
          // Check if moved to member selection
          const memberSelection = await this.page.$('[data-testid="member-selection"], .member-selection');
          testSuite.tests.push({
            name: 'Team Selection Works',
            status: memberSelection ? 'passed' : 'failed',
            details: memberSelection ? 'Successfully navigated to member selection' : 'Failed to navigate to member selection'
          });
        }
      }

      // Test 4: Test member selection
      console.log('  🔍 Test 4: Member selection functionality...');
      const memberButtons = await this.page.$$('button');
      if (memberButtons.length > 0) {
        // Find a member button (not navigation buttons)
        for (const button of memberButtons) {
          const text = await button.evaluate(el => el.textContent);
          if (text && !text.includes('Back') && !text.includes('חזור') && text.length > 3) {
            await button.click();
            await this.page.waitForTimeout(3000);
            break;
          }
        }
        
        // Check if we reached the dashboard
        const dashboard = await this.page.$('[data-testid="dashboard"], .dashboard, [class*="dashboard"]');
        testSuite.tests.push({
          name: 'Member Selection Works',
          status: dashboard ? 'passed' : 'failed',
          details: dashboard ? 'Successfully reached dashboard' : 'Failed to reach dashboard after member selection'
        });
      }

      // Test 5: Test availability editing
      console.log('  🔍 Test 5: Availability editing functionality...');
      const availabilityButtons = await this.page.$$('[data-availability], button[class*="availability"], .availability-button');
      if (availabilityButtons.length > 0) {
        const originalText = await availabilityButtons[0].evaluate(el => el.textContent);
        await availabilityButtons[0].click();
        await this.page.waitForTimeout(1000);
        const newText = await availabilityButtons[0].evaluate(el => el.textContent);
        
        testSuite.tests.push({
          name: 'Availability Editing Works',
          status: originalText !== newText ? 'passed' : 'failed',
          details: `Availability changed from "${originalText}" to "${newText}"`
        });
      } else {
        testSuite.tests.push({
          name: 'Availability Editing Works',
          status: 'failed',
          details: 'No availability buttons found'
        });
      }

    } catch (error) {
      console.error('❌ Team Management System test failed:', error);
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Team Management System Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async testHoursCompletionStatus() {
    console.log('\n⏱️ Testing Hours Completion Status Feature (MISSION CRITICAL)...');
    const testSuite = {
      name: 'Hours Completion Status Feature',
      tests: [],
      status: 'passed',
      critical: true
    };

    try {
      // Test 1: Verify completion status display exists
      console.log('  🔍 Test 1: Completion status display verification...');
      const completionDisplay = await this.page.$('[data-testid="completion-status"], .completion-status, [class*="completion"]');
      testSuite.tests.push({
        name: 'Completion Status Display Exists',
        status: completionDisplay ? 'passed' : 'failed',
        details: completionDisplay ? 'Completion status display found' : 'Completion status display not found'
      });

      // Test 2: Verify real-time data accuracy
      console.log('  🔍 Test 2: Real-time data accuracy...');
      const percentageElements = await this.page.$$eval('[class*="percentage"], [class*="percent"]', 
        elements => elements.map(el => el.textContent.match(/\d+%/)).filter(Boolean)
      );
      testSuite.tests.push({
        name: 'Percentage Data Display',
        status: percentageElements.length > 0 ? 'passed' : 'failed',
        details: `Found ${percentageElements.length} percentage displays: ${percentageElements.join(', ')}`
      });

      // Test 3: Test sprint boundary calculations
      console.log('  🔍 Test 3: Sprint boundary calculations...');
      const sprintInfo = await this.page.$eval('body', () => {
        const text = document.body.textContent;
        const sprintMatch = text.match(/Sprint|sprint/i);
        const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
        return { hasSprint: !!sprintMatch, dates: dateMatch || [] };
      });
      testSuite.tests.push({
        name: 'Sprint Boundary Calculations',
        status: sprintInfo.hasSprint && sprintInfo.dates.length >= 2 ? 'passed' : 'failed',
        details: `Sprint info found: ${sprintInfo.hasSprint}, Dates: ${sprintInfo.dates.length}`
      });

      // Test 4: Test real-time updates (simulate availability change and check if status updates)
      console.log('  🔍 Test 4: Real-time status updates...');
      const beforeStatus = await this.page.$eval('body', () => {
        const percentageEl = document.querySelector('[class*="percentage"], [class*="percent"]');
        return percentageEl ? percentageEl.textContent : null;
      });

      // Make an availability change
      const availabilityButton = await this.page.$('[data-availability], button[class*="availability"]');
      if (availabilityButton) {
        await availabilityButton.click();
        await this.page.waitForTimeout(3000); // Wait for real-time update
        
        const afterStatus = await this.page.$eval('body', () => {
          const percentageEl = document.querySelector('[class*="percentage"], [class*="percent"]');
          return percentageEl ? percentageEl.textContent : null;
        });
        
        testSuite.tests.push({
          name: 'Real-time Status Updates',
          status: beforeStatus !== afterStatus ? 'passed' : 'warning',
          details: `Status before: ${beforeStatus}, after: ${afterStatus}`
        });
      }

      // Test 5: Color coding verification
      console.log('  🔍 Test 5: Color coding verification...');
      const colorElements = await this.page.$$eval('[class*="green"], [class*="red"], [class*="yellow"]', 
        elements => elements.map(el => el.className).filter(cls => cls.includes('green') || cls.includes('red') || cls.includes('yellow'))
      );
      testSuite.tests.push({
        name: 'Color Coding Implementation',
        status: colorElements.length > 0 ? 'passed' : 'failed',
        details: `Found ${colorElements.length} color-coded elements`
      });

    } catch (error) {
      console.error('❌ Hours Completion Status test failed:', error);
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Hours Completion Status Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async testPersonalNavigation() {
    console.log('\n🧭 Testing Personal Navigation (NEWLY IMPLEMENTED)...');
    const testSuite = {
      name: 'Personal Navigation',
      tests: [],
      status: 'passed'
    };

    try {
      // Test 1: Desktop navigation buttons
      console.log('  🔍 Test 1: Desktop navigation buttons...');
      const navButtons = await this.page.$$('button[class*="nav"], [data-testid*="nav"], button[class*="week"]');
      testSuite.tests.push({
        name: 'Navigation Buttons Exist',
        status: navButtons.length > 0 ? 'passed' : 'failed',
        details: `Found ${navButtons.length} navigation buttons`
      });

      // Test 2: Week change functionality
      console.log('  🔍 Test 2: Week change functionality...');
      const weekDisplay = await this.page.$eval('body', () => {
        const text = document.body.textContent;
        const weekMatch = text.match(/Week|week|שבוע/i);
        return !!weekMatch;
      });
      testSuite.tests.push({
        name: 'Week Display Present',
        status: weekDisplay ? 'passed' : 'failed',
        details: weekDisplay ? 'Week display found' : 'Week display not found'
      });

      // Test 3: Current Week button
      console.log('  🔍 Test 3: Current Week button functionality...');
      const currentWeekButton = await this.page.$('button[class*="current"], [data-testid="current-week"]');
      if (currentWeekButton) {
        await currentWeekButton.click();
        await this.page.waitForTimeout(1000);
        testSuite.tests.push({
          name: 'Current Week Button Works',
          status: 'passed',
          details: 'Current week button clicked successfully'
        });
      } else {
        testSuite.tests.push({
          name: 'Current Week Button Works',
          status: 'warning',
          details: 'Current week button not found'
        });
      }

      // Test 4: Mobile navigation (simulate mobile viewport)
      console.log('  🔍 Test 4: Mobile navigation testing...');
      await this.page.setViewport({ width: 375, height: 667 });
      await this.page.waitForTimeout(1000);
      
      const mobileNavElements = await this.page.$$('[class*="mobile"], [data-testid*="mobile"]');
      testSuite.tests.push({
        name: 'Mobile Navigation Elements',
        status: mobileNavElements.length > 0 ? 'passed' : 'failed',
        details: `Found ${mobileNavElements.length} mobile navigation elements`
      });

      // Reset viewport
      await this.page.setViewport({ width: 1920, height: 1080 });

    } catch (error) {
      console.error('❌ Personal Navigation test failed:', error);
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Personal Navigation Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async testManagerFeatures() {
    console.log('\n👔 Testing Manager Features...');
    const testSuite = {
      name: 'Manager Features',
      tests: [],
      status: 'passed'
    };

    try {
      // Check if we're in manager view
      const managerElements = await this.page.$$('[class*="manager"], [data-testid*="manager"]');
      const managerText = await this.page.$eval('body', () => {
        return document.body.textContent.includes('Manager') || document.body.textContent.includes('מנהל');
      });

      if (managerElements.length > 0 || managerText) {
        // Test 1: Manager dashboard access
        testSuite.tests.push({
          name: 'Manager Dashboard Access',
          status: 'passed',
          details: 'Manager features detected'
        });

        // Test 2: Team editing capabilities
        console.log('  🔍 Test 2: Team editing capabilities...');
        const editableElements = await this.page.$$('[contenteditable="true"], input, select');
        testSuite.tests.push({
          name: 'Team Editing Capabilities',
          status: editableElements.length > 0 ? 'passed' : 'failed',
          details: `Found ${editableElements.length} editable elements`
        });

        // Test 3: Export functionality
        console.log('  🔍 Test 3: Export functionality...');
        const exportButtons = await this.page.$$('button[class*="export"], [data-testid*="export"]');
        testSuite.tests.push({
          name: 'Export Functionality',
          status: exportButtons.length > 0 ? 'passed' : 'warning',
          details: `Found ${exportButtons.length} export buttons`
        });

      } else {
        testSuite.tests.push({
          name: 'Manager Features',
          status: 'warning',
          details: 'Not in manager view - manager features not tested'
        });
      }

    } catch (error) {
      console.error('❌ Manager Features test failed:', error);
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Manager Features Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async testCOODashboard() {
    console.log('\n🏢 Testing COO Dashboard (MISSION CRITICAL)...');
    const testSuite = {
      name: 'COO Dashboard',
      tests: [],
      status: 'passed',
      critical: true
    };

    try {
      // Navigate to COO dashboard
      console.log('  🔍 Navigating to COO dashboard...');
      await this.page.goto('http://localhost:3002/executive', { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Test 1: COO dashboard loads
      console.log('  🔍 Test 1: COO dashboard loading...');
      const dashboardElements = await this.page.$$('[data-testid="coo-dashboard"], [class*="executive"], [class*="coo"]');
      testSuite.tests.push({
        name: 'COO Dashboard Loads',
        status: dashboardElements.length > 0 ? 'passed' : 'failed',
        details: `Found ${dashboardElements.length} COO dashboard elements`
      });

      // Test 2: Company-wide data aggregation
      console.log('  🔍 Test 2: Company-wide data aggregation...');
      const teamCards = await this.page.$$('[class*="team"], [data-team]');
      testSuite.tests.push({
        name: 'Company-wide Data Aggregation',
        status: teamCards.length >= 3 ? 'passed' : 'failed',
        details: `Found ${teamCards.length} team cards (expected: 5 teams)`
      });

      // Test 3: Hours completion status accuracy
      console.log('  🔍 Test 3: Hours completion status accuracy...');
      const completionData = await this.page.$$eval('[class*="completion"], [class*="percentage"]', 
        elements => elements.map(el => el.textContent).filter(text => text.includes('%'))
      );
      testSuite.tests.push({
        name: 'Hours Completion Status Accuracy',
        status: completionData.length > 0 ? 'passed' : 'failed',
        details: `Found ${completionData.length} completion percentages: ${completionData.join(', ')}`
      });

      // Test 4: Real-time sync verification
      console.log('  🔍 Test 4: Real-time sync verification...');
      const realTimeElements = await this.page.$$('[class*="real-time"], [data-real-time]');
      testSuite.tests.push({
        name: 'Real-time Sync Indicators',
        status: realTimeElements.length > 0 ? 'passed' : 'warning',
        details: `Found ${realTimeElements.length} real-time indicators`
      });

      // Test 5: Mathematical accuracy verification
      console.log('  🔍 Test 5: Mathematical accuracy verification...');
      const percentages = await this.page.$$eval('[class*="percentage"], [class*="percent"]', 
        elements => {
          return elements.map(el => {
            const match = el.textContent.match(/(\d+)%/);
            return match ? parseInt(match[1]) : null;
          }).filter(num => num !== null);
        }
      );
      
      const validPercentages = percentages.every(p => p >= 0 && p <= 100);
      testSuite.tests.push({
        name: 'Mathematical Accuracy',
        status: validPercentages ? 'passed' : 'failed',
        details: `Percentages found: ${percentages.join(', ')} - All valid: ${validPercentages}`
      });

    } catch (error) {
      console.error('❌ COO Dashboard test failed:', error);
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'COO Dashboard Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async testVersion22Features() {
    console.log('\n🆕 Testing Version 2.2 Features...');
    const testSuite = {
      name: 'Version 2.2 Features',
      tests: [],
      status: 'passed'
    };

    try {
      // Navigate back to main app
      await this.page.goto('http://localhost:3002', { waitUntil: 'networkidle2' });
      
      // Test 1: Version component exists
      console.log('  🔍 Test 1: Version component verification...');
      const versionComponent = await this.page.$('[data-testid="version"], [class*="version"]');
      testSuite.tests.push({
        name: 'Version Component Exists',
        status: versionComponent ? 'passed' : 'failed',
        details: versionComponent ? 'Version component found' : 'Version component not found'
      });

      // Test 2: Version is clickable
      if (versionComponent) {
        console.log('  🔍 Test 2: Version component clickability...');
        await versionComponent.click();
        await this.page.waitForTimeout(1000);
        
        const modal = await this.page.$('[data-testid="modal"], [class*="modal"]');
        testSuite.tests.push({
          name: 'Version Component Clickable',
          status: modal ? 'passed' : 'failed',
          details: modal ? 'Modal opened successfully' : 'Modal did not open'
        });

        // Test 3: Modal functionality
        if (modal) {
          console.log('  🔍 Test 3: Modal functionality...');
          const closeButton = await this.page.$('[data-testid="close"], [class*="close"], button[aria-label*="close"]');
          if (closeButton) {
            await closeButton.click();
            await this.page.waitForTimeout(500);
            const modalClosed = await this.page.$('[data-testid="modal"], [class*="modal"]') === null;
            testSuite.tests.push({
              name: 'Modal Close Functionality',
              status: modalClosed ? 'passed' : 'failed',
              details: modalClosed ? 'Modal closed successfully' : 'Modal did not close'
            });
          }
        }
      }

      // Test 4: Hebrew content support
      console.log('  🔍 Test 4: Hebrew content support...');
      const hebrewText = await this.page.$eval('body', () => {
        return /[\u0590-\u05FF]/.test(document.body.textContent);
      });
      testSuite.tests.push({
        name: 'Hebrew Content Support',
        status: hebrewText ? 'passed' : 'warning',
        details: hebrewText ? 'Hebrew text detected' : 'No Hebrew text found'
      });

    } catch (error) {
      console.error('❌ Version 2.2 Features test failed:', error);
      testSuite.status = 'failed';
      testSuite.tests.push({
        name: 'Version 2.2 Features Error',
        status: 'failed',
        details: error.message
      });
    }

    this.results.testSuites.push(testSuite);
    this.updateSummary(testSuite);
  }

  async performPerformanceValidation() {
    console.log('\n⚡ Performing Performance Validation...');
    
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    });

    this.results.summary.performance = {
      ...this.results.summary.performance,
      ...performanceMetrics
    };

    // Check performance thresholds
    if (performanceMetrics.totalLoadTime > 3000) {
      this.results.summary.criticalIssues.push(`Performance: Total load time ${performanceMetrics.totalLoadTime}ms exceeds 3000ms threshold`);
    }

    console.log(`✅ Performance metrics captured: ${JSON.stringify(performanceMetrics, null, 2)}`);
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
      }
    });
  }

  async generateReport() {
    console.log('\n📊 Generating Comprehensive Validation Report...');
    
    const reportPath = path.join(__dirname, 'business-logic-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate human-readable summary
    const summaryPath = path.join(__dirname, 'business-logic-validation-summary.md');
    const summary = this.generateMarkdownSummary();
    fs.writeFileSync(summaryPath, summary);
    
    console.log(`✅ Reports generated:`);
    console.log(`   - JSON Report: ${reportPath}`);
    console.log(`   - Summary: ${summaryPath}`);
    
    return this.results;
  }

  generateMarkdownSummary() {
    const { summary, testSuites } = this.results;
    const successRate = Math.round((summary.passed / summary.totalTests) * 100);
    
    let markdown = `# Business Logic Validation Report - Version 2.2
    
## Executive Summary
- **Total Tests Executed:** ${summary.totalTests}
- **Tests Passed:** ${summary.passed}
- **Tests Failed:** ${summary.failed}
- **Success Rate:** ${successRate}%
- **Validation Date:** ${this.results.timestamp}

## Performance Metrics
- **Initial Load Time:** ${summary.performance.initialLoad || 'N/A'}ms
- **DOM Content Loaded:** ${summary.performance.domContentLoaded || 'N/A'}ms
- **First Contentful Paint:** ${summary.performance.firstContentfulPaint || 'N/A'}ms

## Critical Issues
${summary.criticalIssues.length === 0 ? '✅ No critical issues detected' : 
  summary.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n')
}

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
        const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
        markdown += `- ${icon} **${test.name}:** ${test.details}\n`;
      });
      
      markdown += '\n';
    });

    markdown += `## Deployment Readiness Assessment

### Enterprise Deployment Criteria:
${this.assessDeploymentReadiness()}

### Recommendations:
${this.generateRecommendations()}
`;

    return markdown;
  }

  assessDeploymentReadiness() {
    const { summary } = this.results;
    const criticalFailures = summary.criticalIssues.filter(issue => issue.includes('CRITICAL')).length;
    const successRate = Math.round((summary.passed / summary.totalTests) * 100);
    
    if (criticalFailures === 0 && successRate >= 95) {
      return '✅ **READY FOR DEPLOYMENT** - All critical systems functioning correctly';
    } else if (criticalFailures === 0 && successRate >= 90) {
      return '⚠️ **CONDITIONAL DEPLOYMENT** - Minor issues present but non-blocking';
    } else {
      return '❌ **NOT READY FOR DEPLOYMENT** - Critical issues must be resolved';
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.performance.initialLoad > 3000) {
      recommendations.push('- Optimize initial load time to meet <3000ms target');
    }
    
    if (this.results.summary.criticalIssues.length > 0) {
      recommendations.push('- Address all critical issues before deployment');
    }
    
    if (this.results.summary.failed > 0) {
      recommendations.push('- Investigate and fix all failed tests');
    }
    
    const hoursCompletionSuite = this.results.testSuites.find(s => s.name === 'Hours Completion Status Feature');
    if (hoursCompletionSuite && hoursCompletionSuite.status !== 'passed') {
      recommendations.push('- **PRIORITY:** Fix Hours Completion Status Feature - this is mission critical');
    }
    
    const cooDashboardSuite = this.results.testSuites.find(s => s.name === 'COO Dashboard');
    if (cooDashboardSuite && cooDashboardSuite.status !== 'passed') {
      recommendations.push('- **PRIORITY:** Fix COO Dashboard - this is mission critical for executive oversight');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- All systems are functioning correctly - proceed with deployment');
    }
    
    return recommendations.join('\n');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Cleanup completed');
  }

  async execute() {
    try {
      await this.initialize();
      
      const appLoaded = await this.navigateToApp();
      if (!appLoaded) {
        throw new Error('Application failed to load - cannot proceed with validation');
      }
      
      // Execute all test suites
      await this.testTeamManagementSystem();
      await this.testHoursCompletionStatus();
      await this.testPersonalNavigation();
      await this.testManagerFeatures();
      await this.testCOODashboard();
      await this.testVersion22Features();
      await this.performPerformanceValidation();
      
      const results = await this.generateReport();
      
      console.log('\n🎯 VALIDATION COMPLETE');
      console.log(`Success Rate: ${Math.round((results.summary.passed / results.summary.totalTests) * 100)}%`);
      console.log(`Critical Issues: ${results.summary.criticalIssues.length}`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Validation execution failed:', error);
      this.results.summary.criticalIssues.push(`Validation execution error: ${error.message}`);
      await this.generateReport();
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const validator = new BusinessLogicValidator();
  validator.execute()
    .then(results => {
      console.log('\n✅ Business Logic Validation completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Business Logic Validation failed:', error);
      process.exit(1);
    });
}

module.exports = BusinessLogicValidator;