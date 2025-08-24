#!/usr/bin/env node

/**
 * Final Application Recovery Validation Test
 * 
 * Comprehensive validation focusing on:
 * 1. COO Dashboard removal validation (no 404 errors)
 * 2. Authentication fixes (no 401 errors)
 * 3. Mobile navigation functionality
 * 4. Data persistence and consistency
 * 5. Real-time updates and WebSocket connectivity
 * 6. Touch responsiveness and mobile UX
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

console.log('🔍 Starting Final Application Recovery Validation...\n');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000;
const CURRENT_DATE = new Date();

// Validation Results Object
const validationResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  testResults: {
    coreUserFlow: { passed: false, details: {} },
    authentication: { passed: false, details: {} },
    mobileNavigation: { passed: false, details: {} },
    dataPersistence: { passed: false, details: {} },
    consoleErrors: { passed: false, details: {} },
    performance: { passed: false, details: {} },
    touchResponsiveness: { passed: false, details: {} }
  },
  overallScore: 0,
  deploymentReady: false,
  criticalIssues: [],
  recommendations: []
};

// Helper function to add critical issue
function addCriticalIssue(issue) {
  validationResults.criticalIssues.push(issue);
  console.log(`🚨 CRITICAL: ${issue}`);
}

// Helper function to add recommendation
function addRecommendation(recommendation) {
  validationResults.recommendations.push(recommendation);
  console.log(`💡 RECOMMENDATION: ${recommendation}`);
}

async function runValidation() {
  console.log('📋 Phase 1: Core User Flow Validation');
  console.log('='.repeat(50));

  let browser, page;
  
  try {
    // Launch browser with mobile emulation capabilities
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    page = await browser.newPage();
    
    // Set up mobile viewport for testing
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    
    // Monitor console messages for errors
    const consoleMessages = [];
    const networkFailures = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      if (msg.type() === 'error') {
        console.log(`🔍 Console Error: ${text}`);
      }
    });
    
    page.on('requestfailed', request => {
      networkFailures.push({
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
      console.log(`🔍 Network Failure: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Test 1: Initial Page Load and Team Selection
    console.log('✅ Testing initial page load...');
    const startTime = Date.now();
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
      const loadTime = Date.now() - startTime;
      
      console.log(`✅ Page loaded successfully in ${loadTime}ms`);
      
      // Check for presence of team selection
      const teamSelectionExists = await page.$('.team-selection, [data-testid="team-selection"]') !== null;
      const teamGridExists = await page.$('.grid, .team-grid, [data-testid="team-grid"]') !== null;
      
      console.log(`✅ Team selection interface: ${teamSelectionExists || teamGridExists ? 'Present' : 'Missing'}`);
      
      // Look for any team buttons to click
      const teamButtons = await page.$$('button');
      let teamFound = false;
      
      if (teamButtons.length > 0) {
        console.log(`✅ Found ${teamButtons.length} clickable buttons`);
        
        // Try to click the first available team button
        for (let i = 0; i < Math.min(teamButtons.length, 5); i++) {
          try {
            const buttonText = await teamButtons[i].evaluate(el => el.textContent || el.innerText);
            if (buttonText && buttonText.trim() && !buttonText.toLowerCase().includes('menu')) {
              await teamButtons[i].click();
              await page.waitForTimeout(2000); // Wait for navigation
              console.log(`✅ Clicked team button: "${buttonText.trim()}"`);
              teamFound = true;
              break;
            }
          } catch (e) {
            // Continue to next button
          }
        }
      }
      
      validationResults.testResults.coreUserFlow.passed = teamFound && loadTime < 5000;
      validationResults.testResults.coreUserFlow.details = {
        loadTime,
        teamSelectionExists: teamSelectionExists || teamGridExists,
        teamFound,
        buttonsAvailable: teamButtons.length
      };

      if (loadTime > 5000) {
        addCriticalIssue(`Page load time too slow: ${loadTime}ms (should be < 5000ms)`);
      }
      
    } catch (error) {
      addCriticalIssue(`Failed to load application: ${error.message}`);
      validationResults.testResults.coreUserFlow.details = { error: error.message };
    }

    // Test 2: Authentication and Database Access Validation
    console.log('\n📋 Phase 2: Authentication & Database Access Validation');
    console.log('='.repeat(50));
    
    // Check for specific authentication errors mentioned in debug knowledge
    const authErrors = consoleMessages.filter(msg => 
      msg.type === 'error' && 
      (msg.text.includes('401') || 
       msg.text.includes('authentication') || 
       msg.text.includes('WebSocket') ||
       msg.text.includes('schedule_entries'))
    );
    
    const hasAuthErrors = authErrors.length > 0;
    console.log(`✅ Authentication errors: ${hasAuthErrors ? 'FOUND ❌' : 'None ✅'}`);
    
    if (hasAuthErrors) {
      authErrors.forEach(error => {
        addCriticalIssue(`Authentication Error: ${error.text}`);
      });
    }
    
    // Check for WebSocket connection issues
    const webSocketErrors = consoleMessages.filter(msg => 
      msg.text.includes('WebSocket') || 
      msg.text.includes('%0A') ||
      msg.text.includes('connection')
    );
    
    const hasWebSocketIssues = webSocketErrors.length > 0;
    console.log(`✅ WebSocket connectivity: ${hasWebSocketIssues ? 'Issues Found ❌' : 'Working ✅'}`);
    
    validationResults.testResults.authentication.passed = !hasAuthErrors && !hasWebSocketIssues;
    validationResults.testResults.authentication.details = {
      authErrors: authErrors.length,
      webSocketErrors: webSocketErrors.length,
      authErrorMessages: authErrors.map(e => e.text),
      webSocketErrorMessages: webSocketErrors.map(e => e.text)
    };

    // Test 3: Mobile Navigation Functionality
    console.log('\n📋 Phase 3: Mobile Navigation Validation');
    console.log('='.repeat(50));
    
    try {
      // Look for mobile navigation elements mentioned in debug knowledge
      const hamburgerMenu = await page.$('.hamburger-menu, [data-testid="mobile-menu"], .mobile-menu-button');
      const mobileNavigation = await page.$('.mobile-navigation, .emergency-mobile-menu, [data-testid="mobile-nav"]');
      
      console.log(`✅ Hamburger menu: ${hamburgerMenu ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`✅ Mobile navigation: ${mobileNavigation ? 'Present ✅' : 'Missing ❌'}`);
      
      // Test mobile navigation functionality
      let mobileNavWorking = false;
      if (hamburgerMenu) {
        try {
          await hamburgerMenu.click();
          await page.waitForTimeout(500);
          
          // Check if navigation opened
          const navOpened = await page.$('.mobile-nav-open, .nav-open, .menu-open') !== null;
          console.log(`✅ Mobile menu opens: ${navOpened ? 'Yes ✅' : 'No ❌'}`);
          mobileNavWorking = navOpened;
          
        } catch (error) {
          console.log(`❌ Mobile navigation click failed: ${error.message}`);
        }
      }
      
      // Check for sprint navigation buttons mentioned in debug knowledge
      const sprintNavButtons = await page.$$('button');
      let sprintNavFound = false;
      
      for (const button of sprintNavButtons) {
        try {
          const buttonText = await button.evaluate(el => el.textContent?.toLowerCase() || '');
          if (buttonText.includes('previous') || buttonText.includes('next') || 
              buttonText.includes('week') || buttonText.includes('sprint')) {
            sprintNavFound = true;
            console.log(`✅ Sprint navigation button found: "${buttonText}"`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      console.log(`✅ Sprint navigation: ${sprintNavFound ? 'Available ✅' : 'Missing ❌'}`);
      
      validationResults.testResults.mobileNavigation.passed = mobileNavWorking || sprintNavFound;
      validationResults.testResults.mobileNavigation.details = {
        hamburgerMenuPresent: !!hamburgerMenu,
        mobileNavigationPresent: !!mobileNavigation,
        mobileNavWorking,
        sprintNavFound
      };
      
    } catch (error) {
      addCriticalIssue(`Mobile navigation test failed: ${error.message}`);
      validationResults.testResults.mobileNavigation.details = { error: error.message };
    }

    // Test 4: Data Persistence and Consistency
    console.log('\n📋 Phase 4: Data Persistence Validation');
    console.log('='.repeat(50));
    
    try {
      // Look for schedule/table elements
      const scheduleTable = await page.$('table, .schedule-table, [data-testid="schedule-table"]');
      const availabilityTable = await page.$('.availability-table, [data-testid="availability-table"]');
      
      console.log(`✅ Schedule table: ${scheduleTable ? 'Present ✅' : 'Missing ❌'}`);
      console.log(`✅ Availability table: ${availabilityTable ? 'Present ✅' : 'Missing ❌'}`);
      
      // Check for data loading indicators or actual data
      const loadingStates = await page.$$('.loading, .spinner, [data-testid="loading"]');
      const dataElements = await page.$$('td, .data-cell, .schedule-entry');
      
      console.log(`✅ Loading states: ${loadingStates.length}`);
      console.log(`✅ Data elements: ${dataElements.length}`);
      
      const hasData = dataElements.length > 0;
      const dataPresent = scheduleTable || availabilityTable || hasData;
      
      validationResults.testResults.dataPersistence.passed = dataPresent;
      validationResults.testResults.dataPersistence.details = {
        scheduleTablePresent: !!scheduleTable,
        availabilityTablePresent: !!availabilityTable,
        dataElementsCount: dataElements.length,
        loadingStatesCount: loadingStates.length,
        hasData
      };
      
      if (!dataPresent) {
        addCriticalIssue('No data tables or schedule elements found on page');
      }
      
    } catch (error) {
      addCriticalIssue(`Data persistence test failed: ${error.message}`);
      validationResults.testResults.dataPersistence.details = { error: error.message };
    }

    // Test 5: Console Error Analysis
    console.log('\n📋 Phase 5: Console Error Analysis');
    console.log('='.repeat(50));
    
    const criticalErrors = consoleMessages.filter(msg => 
      msg.type === 'error' && 
      (msg.text.includes('404') || 
       msg.text.includes('500') ||
       msg.text.includes('Uncaught') ||
       msg.text.includes('ReferenceError') ||
       msg.text.includes('TypeError'))
    );
    
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');
    
    console.log(`✅ Total console messages: ${consoleMessages.length}`);
    console.log(`✅ Critical errors: ${criticalErrors.length}`);
    console.log(`✅ Warnings: ${warnings.length}`);
    
    criticalErrors.forEach(error => {
      console.log(`🔍 Critical Error: ${error.text}`);
      addCriticalIssue(`Console Error: ${error.text}`);
    });
    
    validationResults.testResults.consoleErrors.passed = criticalErrors.length === 0;
    validationResults.testResults.consoleErrors.details = {
      totalMessages: consoleMessages.length,
      criticalErrors: criticalErrors.length,
      warnings: warnings.length,
      allMessages: consoleMessages,
      criticalErrorTexts: criticalErrors.map(e => e.text)
    };

    // Test 6: Performance Validation
    console.log('\n📋 Phase 6: Performance Validation');
    console.log('='.repeat(50));
    
    const performanceMetrics = await page.evaluate(() => {
      const performance = window.performance;
      const timing = performance.timing;
      
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType ? performance.getEntriesByType('paint')[0]?.startTime : null,
        memoryUsed: performance.memory ? performance.memory.usedJSHeapSize : null
      };
    });
    
    console.log(`✅ DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`✅ Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`✅ First Paint: ${performanceMetrics.firstPaint || 'N/A'}ms`);
    console.log(`✅ Memory Used: ${performanceMetrics.memoryUsed ? Math.round(performanceMetrics.memoryUsed / 1024 / 1024) + 'MB' : 'N/A'}`);
    
    const performanceGood = performanceMetrics.loadComplete < 3000; // 3 second target
    
    validationResults.testResults.performance.passed = performanceGood;
    validationResults.testResults.performance.details = performanceMetrics;
    
    if (!performanceGood) {
      addCriticalIssue(`Performance below target: ${performanceMetrics.loadComplete}ms (target: <3000ms)`);
    }

    // Test 7: Touch Responsiveness (Mobile UX)
    console.log('\n📋 Phase 7: Touch Responsiveness Validation');
    console.log('='.repeat(50));
    
    try {
      const buttons = await page.$$('button, .clickable, [role="button"]');
      let touchResponsiveButtons = 0;
      
      console.log(`✅ Found ${buttons.length} interactive elements`);
      
      // Test a sample of buttons for touch responsiveness
      const sampleSize = Math.min(buttons.length, 5);
      
      for (let i = 0; i < sampleSize; i++) {
        try {
          const button = buttons[i];
          const boundingBox = await button.boundingBox();
          
          if (boundingBox) {
            // Check if touch target is large enough (44px minimum)
            const touchTargetSize = Math.min(boundingBox.width, boundingBox.height);
            if (touchTargetSize >= 44) {
              touchResponsiveButtons++;
            }
            
            console.log(`✅ Button ${i + 1}: ${touchTargetSize.toFixed(0)}px (${touchTargetSize >= 44 ? 'Good' : 'Too small'})`);
          }
        } catch (e) {
          // Continue to next button
        }
      }
      
      const touchResponsivenessGood = touchResponsiveButtons >= sampleSize * 0.8; // 80% of buttons should be good
      
      validationResults.testResults.touchResponsiveness.passed = touchResponsivenessGood;
      validationResults.testResults.touchResponsiveness.details = {
        totalButtons: buttons.length,
        sampleSize,
        touchResponsiveButtons,
        passRate: (touchResponsiveButtons / sampleSize * 100).toFixed(1) + '%'
      };
      
      console.log(`✅ Touch responsive elements: ${touchResponsiveButtons}/${sampleSize} (${(touchResponsiveButtons / sampleSize * 100).toFixed(1)}%)`);
      
      if (!touchResponsivenessGood) {
        addRecommendation('Increase touch target sizes to minimum 44px for better mobile accessibility');
      }
      
    } catch (error) {
      addCriticalIssue(`Touch responsiveness test failed: ${error.message}`);
      validationResults.testResults.touchResponsiveness.details = { error: error.message };
    }

  } catch (error) {
    console.error('❌ Critical validation error:', error);
    addCriticalIssue(`Validation framework error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Calculate Overall Score and Deployment Readiness
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  
  const testResults = Object.values(validationResults.testResults);
  const passedTests = testResults.filter(test => test.passed).length;
  const totalTests = testResults.length;
  const overallScore = Math.round((passedTests / totalTests) * 100);
  
  validationResults.overallScore = overallScore;
  validationResults.deploymentReady = overallScore >= 80 && validationResults.criticalIssues.length === 0;
  
  console.log(`Overall Score: ${overallScore}% (${passedTests}/${totalTests} tests passed)`);
  console.log(`Critical Issues: ${validationResults.criticalIssues.length}`);
  console.log(`Deployment Ready: ${validationResults.deploymentReady ? 'YES ✅' : 'NO ❌'}`);
  
  // Test-by-test breakdown
  Object.entries(validationResults.testResults).forEach(([testName, result]) => {
    const status = result.passed ? '✅' : '❌';
    const formattedName = testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${formattedName}: ${result.passed ? 'PASSED' : 'FAILED'}`);
  });
  
  if (validationResults.criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:');
    validationResults.criticalIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  if (validationResults.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    validationResults.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  // Save detailed results
  const resultsFile = 'final-application-recovery-validation-results.json';
  await fs.writeFile(resultsFile, JSON.stringify(validationResults, null, 2));
  console.log(`\n💾 Detailed results saved to ${resultsFile}`);
  
  return validationResults;
}

// Run the validation
if (require.main === module) {
  runValidation().then(results => {
    const exitCode = results.deploymentReady ? 0 : 1;
    console.log(`\n🏁 Validation completed with exit code: ${exitCode}`);
    console.log(`🎯 Production Readiness: ${results.deploymentReady ? 'APPROVED ✅' : 'REQUIRES FIXES ❌'}`);
    process.exit(exitCode);
  }).catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { runValidation };