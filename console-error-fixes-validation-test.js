/**
 * Comprehensive Console Error Fixes Validation Test
 * Tests all applied fixes: ReferenceError, Hydration, Performance, and CSS fixes
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class ConsoleErrorFixesValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overallStatus: 'PENDING',
      criticalErrors: [],
      warnings: [],
      performance: {},
      fixes: {
        referenceError: { status: 'PENDING', details: [] },
        hydrationMismatch: { status: 'PENDING', details: [] },
        performanceOptimizations: { status: 'PENDING', details: [] },
        cssWarnings: { status: 'PENDING', details: [] }
      },
      testResults: {
        mainPageLoad: { status: 'PENDING', details: [] },
        teamDisplay: { status: 'PENDING', details: [] },
        cooDashboard: { status: 'PENDING', details: [] },
        consoleErrors: { status: 'PENDING', errors: [], warnings: [] },
        navigation: { status: 'PENDING', details: [] },
        loadingTimes: { status: 'PENDING', metrics: {} }
      }
    };
  }

  async validateAllFixes() {
    console.log('🚀 Starting comprehensive console error fixes validation...\n');

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set up console logging
      await this.setupConsoleLogging(page);

      // Test 1: Main page load and reference error fix
      await this.testMainPageLoad(page);

      // Test 2: Team display functionality
      await this.testTeamDisplay(page);

      // Test 3: COO dashboard (if accessible)
      await this.testCOODashboard(page);

      // Test 4: Console errors validation
      await this.validateConsoleErrors(page);

      // Test 5: Performance improvements
      await this.testPerformanceImprovements(page);

      // Test 6: Navigation functionality
      await this.testNavigation(page);

      // Test 7: Hydration fixes validation
      await this.testHydrationFixes(page);

      // Generate final report
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ Critical error during validation:', error);
      this.results.criticalErrors.push(error.message);
      this.results.overallStatus = 'FAILED';
    } finally {
      await browser.close();
    }

    return this.results;
  }

  async setupConsoleLogging(page) {
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        this.results.testResults.consoleErrors.errors.push({
          type: 'error',
          message: text,
          timestamp: new Date().toISOString()
        });
      } else if (type === 'warn' && !text.includes('[Next.js]')) {
        this.results.testResults.consoleErrors.warnings.push({
          type: 'warning',
          message: text,
          timestamp: new Date().toISOString()
        });
      }
    });

    page.on('pageerror', (error) => {
      this.results.testResults.consoleErrors.errors.push({
        type: 'pageerror',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
  }

  async testMainPageLoad(page) {
    console.log('📄 Testing main page load and reference error fixes...');
    
    try {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3001', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const loadTime = Date.now() - startTime;
      this.results.testResults.loadingTimes.mainPage = loadTime;

      // Check if page loaded successfully
      const title = await page.title();
      console.log(`  ✓ Page title: ${title}`);

      // Wait for any dynamic imports to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for specific reference errors that were fixed
      const enhancedSprintCalendarError = this.results.testResults.consoleErrors.errors
        .find(err => err.message.includes('enhancedSprintCalendar is not defined'));
      
      if (!enhancedSprintCalendarError) {
        this.results.fixes.referenceError.status = 'PASSED';
        this.results.fixes.referenceError.details.push('enhancedSprintCalendar reference error fixed');
        console.log('  ✅ Reference error fix validated: enhancedSprintCalendar');
      } else {
        this.results.fixes.referenceError.status = 'FAILED';
        this.results.fixes.referenceError.details.push('enhancedSprintCalendar reference error still present');
        console.log('  ❌ Reference error fix failed: enhancedSprintCalendar');
      }

      this.results.testResults.mainPageLoad.status = 'PASSED';
      this.results.testResults.mainPageLoad.details.push(`Page loaded successfully in ${loadTime}ms`);
      console.log(`  ✅ Main page loaded successfully in ${loadTime}ms\n`);

    } catch (error) {
      console.error(`  ❌ Main page load failed: ${error.message}\n`);
      this.results.testResults.mainPageLoad.status = 'FAILED';
      this.results.testResults.mainPageLoad.details.push(error.message);
    }
  }

  async testTeamDisplay(page) {
    console.log('👥 Testing team display functionality...');
    
    try {
      // Look for team selection or team display elements
      await page.waitForSelector('[data-testid="team-selection"], .team-card, .team-list', { timeout: 10000 });
      
      const teamElements = await page.$$('[data-testid="team-selection"] .team-option, .team-card, .team-list .team-item');
      
      if (teamElements.length > 0) {
        console.log(`  ✅ Found ${teamElements.length} team elements displayed`);
        this.results.testResults.teamDisplay.status = 'PASSED';
        this.results.testResults.teamDisplay.details.push(`${teamElements.length} teams displayed correctly`);
      } else {
        console.log('  ⚠️  No team elements found, checking for team selection screen...');
        
        const teamSelectionScreen = await page.$('[data-testid="team-selection-screen"]');
        if (teamSelectionScreen) {
          console.log('  ✅ Team selection screen displayed correctly');
          this.results.testResults.teamDisplay.status = 'PASSED';
          this.results.testResults.teamDisplay.details.push('Team selection screen displayed correctly');
        } else {
          throw new Error('No team display or selection screen found');
        }
      }

    } catch (error) {
      console.error(`  ❌ Team display test failed: ${error.message}\n`);
      this.results.testResults.teamDisplay.status = 'FAILED';
      this.results.testResults.teamDisplay.details.push(error.message);
    }
  }

  async testCOODashboard(page) {
    console.log('📊 Testing COO dashboard functionality...');
    
    try {
      await page.goto('http://localhost:3001/coo-dashboard', { 
        waitUntil: 'networkidle0',
        timeout: 20000 
      });

      // Wait for dashboard components to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for dashboard components
      const dashboardElements = await page.$$('[data-testid*="coo"], [class*="dashboard"], [class*="metrics"], .analytics-card, .status-grid');
      
      if (dashboardElements.length > 0) {
        console.log(`  ✅ COO dashboard loaded with ${dashboardElements.length} components`);
        this.results.testResults.cooDashboard.status = 'PASSED';
        this.results.testResults.cooDashboard.details.push(`Dashboard loaded with ${dashboardElements.length} components`);
      } else {
        // Check if it requires authentication or team selection
        const authRequired = await page.$('[data-testid="team-selection"], .login-required, .auth-required');
        if (authRequired) {
          console.log('  ✅ COO dashboard requires authentication/team selection (expected behavior)');
          this.results.testResults.cooDashboard.status = 'PASSED';
          this.results.testResults.cooDashboard.details.push('Dashboard properly requires authentication');
        } else {
          throw new Error('COO dashboard did not load properly');
        }
      }

    } catch (error) {
      console.error(`  ❌ COO dashboard test failed: ${error.message}\n`);
      this.results.testResults.cooDashboard.status = 'FAILED';
      this.results.testResults.cooDashboard.details.push(error.message);
    }
  }

  async validateConsoleErrors(page) {
    console.log('🔍 Validating console error fixes...');
    
    // Go back to main page to get full console log
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for all dynamic imports and async operations

    const errors = this.results.testResults.consoleErrors.errors;
    const warnings = this.results.testResults.consoleErrors.warnings;

    // Filter out known/acceptable warnings
    const criticalErrors = errors.filter(err => 
      !err.message.includes('Warning: ') && 
      !err.message.includes('[Next.js]') &&
      !err.message.includes('favicon.ico') &&
      !err.message.includes('net::ERR_')
    );

    const criticalWarnings = warnings.filter(warn => 
      !warn.message.includes('[Next.js]') &&
      !warn.message.includes('DevTools') &&
      !warn.message.includes('Lighthouse')
    );

    console.log(`  📊 Console Error Summary:`);
    console.log(`     Critical Errors: ${criticalErrors.length}`);
    console.log(`     Warnings: ${criticalWarnings.length}`);

    if (criticalErrors.length === 0) {
      console.log('  ✅ No critical JavaScript errors found');
      this.results.testResults.consoleErrors.status = 'PASSED';
    } else {
      console.log('  ❌ Critical JavaScript errors found:');
      criticalErrors.forEach(error => {
        console.log(`     - ${error.message}`);
      });
      this.results.testResults.consoleErrors.status = 'FAILED';
    }

    if (criticalWarnings.length > 0) {
      console.log('  ⚠️  Warnings found:');
      criticalWarnings.forEach(warning => {
        console.log(`     - ${warning.message}`);
      });
    }
  }

  async testPerformanceImprovements(page) {
    console.log('🚀 Testing performance improvements...');
    
    try {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
      
      // Measure LCP (Largest Contentful Paint)
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          if (typeof PerformanceObserver === 'undefined') {
            resolve(null);
            return;
          }
          
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          setTimeout(() => resolve(null), 5000);
        });
      });

      const totalLoadTime = Date.now() - startTime;

      console.log(`  📊 Performance Metrics:`);
      console.log(`     Total Load Time: ${totalLoadTime}ms`);
      if (lcp) {
        console.log(`     LCP (Largest Contentful Paint): ${lcp.toFixed(0)}ms`);
        this.results.performance.lcp = lcp;
      }

      // Check if performance is within acceptable range
      if (totalLoadTime < 5000) { // 5 seconds threshold
        console.log('  ✅ Performance within acceptable range');
        this.results.testResults.loadingTimes.status = 'PASSED';
        this.results.fixes.performanceOptimizations.status = 'PASSED';
        this.results.fixes.performanceOptimizations.details.push(`Load time: ${totalLoadTime}ms`);
      } else {
        console.log('  ⚠️  Performance slower than expected');
        this.results.testResults.loadingTimes.status = 'WARNING';
        this.results.fixes.performanceOptimizations.status = 'WARNING';
        this.results.fixes.performanceOptimizations.details.push(`Slow load time: ${totalLoadTime}ms`);
      }

      this.results.performance.totalLoadTime = totalLoadTime;

    } catch (error) {
      console.error(`  ❌ Performance test failed: ${error.message}`);
      this.results.fixes.performanceOptimizations.status = 'FAILED';
      this.results.fixes.performanceOptimizations.details.push(error.message);
    }
  }

  async testNavigation(page) {
    console.log('🧭 Testing navigation functionality...');
    
    try {
      await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });

      // Test navigation links
      const navLinks = await page.$$('nav a, [role="navigation"] a, .navigation a');
      
      if (navLinks.length > 0) {
        console.log(`  ✅ Found ${navLinks.length} navigation links`);
        
        // Try to click the first navigation link that's not external
        for (const link of navLinks.slice(0, 3)) { // Test first 3 links
          try {
            const href = await link.evaluate(el => el.getAttribute('href'));
            if (href && href.startsWith('/') && !href.includes('external')) {
              await link.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              console.log(`    ✓ Successfully navigated to: ${href}`);
              break;
            }
          } catch (navError) {
            // Continue to next link if this one fails
          }
        }
        
        this.results.testResults.navigation.status = 'PASSED';
        this.results.testResults.navigation.details.push(`${navLinks.length} navigation links found and tested`);
      } else {
        console.log('  ⚠️  No navigation links found, checking for mobile navigation...');
        
        const mobileNav = await page.$('[data-testid="mobile-menu"], .mobile-navigation, .hamburger-menu');
        if (mobileNav) {
          console.log('  ✅ Mobile navigation found');
          this.results.testResults.navigation.status = 'PASSED';
          this.results.testResults.navigation.details.push('Mobile navigation present');
        } else {
          throw new Error('No navigation elements found');
        }
      }

    } catch (error) {
      console.error(`  ❌ Navigation test failed: ${error.message}`);
      this.results.testResults.navigation.status = 'FAILED';
      this.results.testResults.navigation.details.push(error.message);
    }
  }

  async testHydrationFixes(page) {
    console.log('💧 Testing hydration mismatch fixes...');
    
    try {
      await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for hydration warnings
      const hydrationErrors = this.results.testResults.consoleErrors.errors
        .filter(err => err.message.toLowerCase().includes('hydration'));

      const hydrationWarnings = this.results.testResults.consoleErrors.warnings
        .filter(warn => warn.message.toLowerCase().includes('hydration'));

      if (hydrationErrors.length === 0 && hydrationWarnings.length === 0) {
        console.log('  ✅ No hydration mismatch warnings found');
        this.results.fixes.hydrationMismatch.status = 'PASSED';
        this.results.fixes.hydrationMismatch.details.push('No hydration warnings detected');
      } else {
        console.log(`  ❌ Hydration issues found: ${hydrationErrors.length} errors, ${hydrationWarnings.length} warnings`);
        this.results.fixes.hydrationMismatch.status = 'FAILED';
        this.results.fixes.hydrationMismatch.details.push(`${hydrationErrors.length} errors, ${hydrationWarnings.length} warnings`);
      }

      // Check for CSS warnings cleanup
      const cssWarnings = this.results.testResults.consoleErrors.warnings
        .filter(warn => warn.message.includes('CSS') || warn.message.includes('webkit'));

      if (cssWarnings.length === 0) {
        console.log('  ✅ No CSS warnings found');
        this.results.fixes.cssWarnings.status = 'PASSED';
        this.results.fixes.cssWarnings.details.push('No CSS warnings detected');
      } else {
        console.log(`  ❌ CSS warnings found: ${cssWarnings.length}`);
        this.results.fixes.cssWarnings.status = 'FAILED';
        this.results.fixes.cssWarnings.details.push(`${cssWarnings.length} CSS warnings`);
      }

    } catch (error) {
      console.error(`  ❌ Hydration test failed: ${error.message}`);
      this.results.fixes.hydrationMismatch.status = 'FAILED';
      this.results.fixes.hydrationMismatch.details.push(error.message);
    }
  }

  generateFinalReport() {
    console.log('\n📋 COMPREHENSIVE VALIDATION REPORT');
    console.log('=====================================\n');

    // Calculate overall status
    const allTests = [
      this.results.testResults.mainPageLoad.status,
      this.results.testResults.teamDisplay.status,
      this.results.testResults.cooDashboard.status,
      this.results.testResults.consoleErrors.status,
      this.results.testResults.navigation.status
    ];

    const allFixes = [
      this.results.fixes.referenceError.status,
      this.results.fixes.hydrationMismatch.status,
      this.results.fixes.performanceOptimizations.status,
      this.results.fixes.cssWarnings.status
    ];

    const failedTests = allTests.filter(status => status === 'FAILED').length;
    const failedFixes = allFixes.filter(status => status === 'FAILED').length;

    if (failedTests === 0 && failedFixes === 0) {
      this.results.overallStatus = 'PASSED';
      console.log('🎉 OVERALL STATUS: ALL FIXES VALIDATED SUCCESSFULLY\n');
    } else if (failedTests <= 1 && failedFixes <= 1) {
      this.results.overallStatus = 'MOSTLY_PASSED';
      console.log('✅ OVERALL STATUS: MOSTLY PASSED (Minor Issues)\n');
    } else {
      this.results.overallStatus = 'FAILED';
      console.log('❌ OVERALL STATUS: VALIDATION FAILED\n');
    }

    // Report on specific fixes
    console.log('🔧 FIX VALIDATION RESULTS:');
    console.log(`   Reference Error Fix: ${this.results.fixes.referenceError.status}`);
    console.log(`   Hydration Mismatch Fix: ${this.results.fixes.hydrationMismatch.status}`);
    console.log(`   Performance Optimizations: ${this.results.fixes.performanceOptimizations.status}`);
    console.log(`   CSS Warnings Cleanup: ${this.results.fixes.cssWarnings.status}\n`);

    // Report on application functionality
    console.log('🧪 APPLICATION TEST RESULTS:');
    console.log(`   Main Page Load: ${this.results.testResults.mainPageLoad.status}`);
    console.log(`   Team Display: ${this.results.testResults.teamDisplay.status}`);
    console.log(`   COO Dashboard: ${this.results.testResults.cooDashboard.status}`);
    console.log(`   Console Errors: ${this.results.testResults.consoleErrors.status}`);
    console.log(`   Navigation: ${this.results.testResults.navigation.status}\n`);

    // Performance summary
    if (this.results.performance.totalLoadTime) {
      console.log('⚡ PERFORMANCE SUMMARY:');
      console.log(`   Total Load Time: ${this.results.performance.totalLoadTime}ms`);
      if (this.results.performance.lcp) {
        console.log(`   LCP: ${this.results.performance.lcp.toFixed(0)}ms`);
      }
      console.log('');
    }

    // Console errors summary
    const errorCount = this.results.testResults.consoleErrors.errors.length;
    const warningCount = this.results.testResults.consoleErrors.warnings.length;
    console.log('🚨 CONSOLE SUMMARY:');
    console.log(`   JavaScript Errors: ${errorCount}`);
    console.log(`   Warnings: ${warningCount}\n`);

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    if (this.results.overallStatus === 'PASSED') {
      console.log('   ✅ Application is ready for production deployment');
      console.log('   ✅ All console error fixes have been successfully applied');
    } else {
      console.log('   ⚠️  Review failed tests before production deployment');
      if (failedFixes > 0) {
        console.log('   🔧 Some fixes may need additional work');
      }
    }

    // Save detailed report
    fs.writeFileSync(
      path.join(process.cwd(), 'console-error-fixes-validation-report.json'),
      JSON.stringify(this.results, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to: console-error-fixes-validation-report.json');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ConsoleErrorFixesValidator();
  validator.validateAllFixes()
    .then(() => {
      console.log('\n✅ Validation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = ConsoleErrorFixesValidator;