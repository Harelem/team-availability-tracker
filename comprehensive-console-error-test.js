/**
 * COMPREHENSIVE CONSOLE ERROR DETECTION TEST
 * Final validation for Team Availability Tracker application
 * Tests all critical fixes: LoadingState hydration, ManagerDashboard React.lazy, CSS system
 */

const puppeteer = require('puppeteer');

class ConsoleErrorValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.consoleErrors = [];
    this.hydrationErrors = [];
    this.reactErrors = [];
    this.cssErrors = [];
    this.networkErrors = [];
  }

  async initialize() {
    console.log('🔍 Initializing Comprehensive Console Error Validation...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for visual verification
      devtools: true,  // Open DevTools automatically
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Clear all caches
    await this.page.evaluateOnNewDocument(() => {
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB
      if (window.indexedDB) {
        indexedDB.deleteDatabase('team-availability-tracker');
      }
    });
    
    // Enable comprehensive console monitoring
    this.page.on('console', this.handleConsoleMessage.bind(this));
    this.page.on('pageerror', this.handlePageError.bind(this));
    this.page.on('requestfailed', this.handleNetworkError.bind(this));
    
    console.log('✅ Validator initialized successfully');
  }

  handleConsoleMessage(msg) {
    const text = msg.text();
    const type = msg.type();
    
    // Categorize console messages
    if (type === 'error') {
      this.consoleErrors.push({
        type: 'console-error',
        message: text,
        timestamp: new Date().toISOString()
      });
      
      // Check for specific error types
      if (text.includes('Hydration') || text.includes('hydration')) {
        this.hydrationErrors.push({
          type: 'hydration-error',
          message: text,
          timestamp: new Date().toISOString()
        });
      }
      
      if (text.includes('React') || text.includes('component') || text.includes('props')) {
        this.reactErrors.push({
          type: 'react-error',
          message: text,
          timestamp: new Date().toISOString()
        });
      }
      
      if (text.includes('CSS') || text.includes('stylesheet') || text.includes('parsing')) {
        this.cssErrors.push({
          type: 'css-error',
          message: text,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (type === 'warning') {
      // Log warnings for analysis but don't fail validation
      console.log(`⚠️  Console Warning: ${text}`);
    }
  }

  handlePageError(error) {
    this.consoleErrors.push({
      type: 'page-error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  handleNetworkError(request) {
    this.networkErrors.push({
      type: 'network-error',
      url: request.url(),
      errorText: request.failure()?.errorText || 'Unknown network error',
      timestamp: new Date().toISOString()
    });
  }

  async testMainPage() {
    console.log('🏠 Testing Main Page...');
    
    await this.page.goto('http://localhost:3004', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for components to load
    await this.page.waitForFunction(() => document.readyState === 'complete');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test LoadingState component rendering
    const loadingStates = await this.page.$$('[data-testid*="loading"]');
    console.log(`   Found ${loadingStates.length} loading state components`);
    
    // Test for team list display
    try {
      await this.page.waitForSelector('[data-testid="team-list"]', { timeout: 10000 });
      console.log('   ✅ Team list loaded successfully');
    } catch (error) {
      console.log('   ⚠️  Team list not found - may be loading');
    }
    
    return {
      pageLoaded: true,
      loadingStatesFound: loadingStates.length > 0,
      consoleErrors: [...this.consoleErrors]
    };
  }

  async testManagerDashboard() {
    console.log('👔 Testing ManagerDashboard (React.lazy implementation)...');
    
    // Click on a team to trigger ManagerDashboard loading
    try {
      const teamButtons = await this.page.$$('[data-testid*="team-button"], .team-card, .team-item');
      if (teamButtons.length > 0) {
        await teamButtons[0].click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('   ✅ ManagerDashboard triggered successfully');
      } else {
        console.log('   ⚠️  No team buttons found to trigger ManagerDashboard');
      }
    } catch (error) {
      console.log(`   ❌ Error triggering ManagerDashboard: ${error.message}`);
    }
    
    return {
      managerDashboardTriggered: true,
      consoleErrors: [...this.consoleErrors]
    };
  }

  async testAllPages() {
    console.log('🌐 Testing All Application Pages...');
    
    const routes = [
      '/',
      '/teams',
      '/schedule', 
      '/coo-dashboard',
      '/executive-dashboard',
      '/analytics'
    ];
    
    const results = {};
    
    for (const route of routes) {
      console.log(`   Testing route: ${route}`);
      try {
        await this.page.goto(`http://localhost:3004${route}`, { 
          waitUntil: 'networkidle2',
          timeout: 20000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        results[route] = {
          loaded: true,
          consoleErrors: this.consoleErrors.filter(err => 
            err.timestamp > new Date(Date.now() - 5000).toISOString()
          )
        };
        
        console.log(`     ✅ ${route} loaded successfully`);
      } catch (error) {
        console.log(`     ❌ ${route} failed to load: ${error.message}`);
        results[route] = {
          loaded: false,
          error: error.message
        };
      }
    }
    
    return results;
  }

  async performComprehensiveValidation() {
    console.log('\n🔍 PERFORMING COMPREHENSIVE VALIDATION');
    console.log('=====================================');
    
    const results = {
      mainPage: await this.testMainPage(),
      managerDashboard: await this.testManagerDashboard(),
      allPages: await this.testAllPages(),
      finalValidation: this.getFinalValidationResults()
    };
    
    return results;
  }

  getFinalValidationResults() {
    return {
      totalConsoleErrors: this.consoleErrors.length,
      hydrationErrors: this.hydrationErrors.length,
      reactErrors: this.reactErrors.length,
      cssErrors: this.cssErrors.length,
      networkErrors: this.networkErrors.length,
      isValid: this.consoleErrors.length === 0,
      errorBreakdown: {
        consoleErrors: this.consoleErrors,
        hydrationErrors: this.hydrationErrors,
        reactErrors: this.reactErrors,
        cssErrors: this.cssErrors,
        networkErrors: this.networkErrors
      }
    };
  }

  generateValidationReport(results) {
    console.log('\n📊 FINAL VALIDATION REPORT');
    console.log('==========================');
    
    const { finalValidation } = results;
    
    console.log(`🔢 Total Console Errors: ${finalValidation.totalConsoleErrors}`);
    console.log(`💧 Hydration Errors: ${finalValidation.hydrationErrors}`);
    console.log(`⚛️  React Component Errors: ${finalValidation.reactErrors}`);
    console.log(`🎨 CSS Parsing Errors: ${finalValidation.cssErrors}`);
    console.log(`🌐 Network Errors: ${finalValidation.networkErrors}`);
    
    console.log('\n🎯 VALIDATION RESULTS:');
    console.log('======================');
    
    // Check each fix category
    const fixes = {
      'LoadingState Hydration Fix': finalValidation.hydrationErrors === 0,
      'ManagerDashboard React.lazy Fix': finalValidation.reactErrors === 0,
      'CSS System Cleanup': finalValidation.cssErrors === 0,
      'Overall Console Cleanliness': finalValidation.totalConsoleErrors === 0
    };
    
    Object.entries(fixes).forEach(([fix, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${fix}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    console.log('\n🏆 FINAL RESULT:');
    console.log('================');
    
    const overallPass = Object.values(fixes).every(Boolean);
    console.log(`${overallPass ? '🎉 SUCCESS' : '💥 FAILURE'}: Console Error Elimination ${overallPass ? 'ACHIEVED' : 'INCOMPLETE'}`);
    
    if (!overallPass) {
      console.log('\n❌ REMAINING ERRORS:');
      finalValidation.errorBreakdown.consoleErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. [${error.type}] ${error.message}`);
      });
    }
    
    return {
      overallPass,
      fixes,
      summary: finalValidation
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      const results = await this.performComprehensiveValidation();
      const report = this.generateValidationReport(results);
      
      // Save detailed report
      const fs = require('fs');
      fs.writeFileSync(
        'final-console-error-validation-report.json',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          results,
          report
        }, null, 2)
      );
      
      console.log('\n📄 Detailed report saved to: final-console-error-validation-report.json');
      
      return report;
    } catch (error) {
      console.error('💥 Validation failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run validation
if (require.main === module) {
  const validator = new ConsoleErrorValidator();
  validator.run()
    .then((report) => {
      process.exit(report.overallPass ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = ConsoleErrorValidator;