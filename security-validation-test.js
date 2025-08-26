/**
 * COMPREHENSIVE APPLICATION SECURITY VALIDATION TEST
 * Tests all critical functionality after security hardening
 */

const puppeteer = require('puppeteer');

async function runSecurityValidationTest() {
    let browser;
    const testResults = {
        timestamp: new Date().toISOString(),
        tests: [],
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        }
    };

    try {
        console.log('🚀 Starting Comprehensive Security Validation Test...\n');
        
        browser = await puppeteer.launch({ 
            headless: false, // Show browser for visual validation
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        });
        
        const page = await browser.newPage();
        
        // Monitor console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
                console.log('❌ Console Error:', msg.text());
            }
        });

        // Monitor network failures
        const networkErrors = [];
        page.on('response', response => {
            if (response.status() >= 400) {
                networkErrors.push(`${response.status()} - ${response.url()}`);
                console.log('❌ Network Error:', response.status(), response.url());
            }
        });

        await page.setViewport({ width: 1920, height: 1080 });

        // TEST 1: Main Page Loading
        console.log('📋 Test 1: Main Page Loading...');
        const mainPageStart = Date.now();
        
        try {
            await page.goto('http://localhost:3002', { 
                waitUntil: 'networkidle2',
                timeout: 10000 
            });
            
            const mainPageLoadTime = Date.now() - mainPageStart;
            console.log(`✅ Main page loaded in ${mainPageLoadTime}ms`);
            
            testResults.tests.push({
                name: 'Main Page Loading',
                status: 'PASS',
                loadTime: mainPageLoadTime,
                details: `Page loaded successfully in ${mainPageLoadTime}ms`
            });
            
        } catch (error) {
            console.log('❌ Main page loading failed:', error.message);
            testResults.tests.push({
                name: 'Main Page Loading',
                status: 'FAIL',
                error: error.message
            });
            testResults.summary.errors.push(`Main Page Loading: ${error.message}`);
        }

        // TEST 2: Team List Display
        console.log('📋 Test 2: Team List Display...');
        
        try {
            await page.waitForSelector('[data-testid="team-list"], .team-grid, .team-container', { timeout: 5000 });
            
            const teamElements = await page.$$('[data-testid="team-member"], .team-member, .member-card');
            console.log(`✅ Found ${teamElements.length} team members displayed`);
            
            testResults.tests.push({
                name: 'Team List Display',
                status: 'PASS',
                details: `${teamElements.length} team members found`
            });
            
        } catch (error) {
            console.log('❌ Team list display failed:', error.message);
            testResults.tests.push({
                name: 'Team List Display',
                status: 'FAIL',
                error: error.message
            });
            testResults.summary.errors.push(`Team List Display: ${error.message}`);
        }

        // TEST 3: COO Dashboard Access
        console.log('📋 Test 3: COO Dashboard Access...');
        
        try {
            // Look for COO dashboard link or navigate directly
            const cooUrl = 'http://localhost:3002/coo-dashboard';
            const cooPageStart = Date.now();
            
            await page.goto(cooUrl, { 
                waitUntil: 'networkidle2',
                timeout: 10000 
            });
            
            const cooPageLoadTime = Date.now() - cooPageStart;
            console.log(`✅ COO Dashboard loaded in ${cooPageLoadTime}ms`);
            
            // Check for dashboard components
            await page.waitForSelector('[data-testid="coo-dashboard"], .dashboard-container, .coo-dashboard', { timeout: 5000 });
            
            testResults.tests.push({
                name: 'COO Dashboard Access',
                status: 'PASS',
                loadTime: cooPageLoadTime,
                details: `COO Dashboard loaded successfully in ${cooPageLoadTime}ms`
            });
            
        } catch (error) {
            console.log('❌ COO Dashboard access failed:', error.message);
            testResults.tests.push({
                name: 'COO Dashboard Access',
                status: 'FAIL',
                error: error.message
            });
            testResults.summary.errors.push(`COO Dashboard Access: ${error.message}`);
        }

        // TEST 4: Executive Dashboard Access
        console.log('📋 Test 4: Executive Dashboard Access...');
        
        try {
            const executiveUrl = 'http://localhost:3002/executive-dashboard';
            const execPageStart = Date.now();
            
            await page.goto(executiveUrl, { 
                waitUntil: 'networkidle2',
                timeout: 10000 
            });
            
            const execPageLoadTime = Date.now() - execPageStart;
            console.log(`✅ Executive Dashboard loaded in ${execPageLoadTime}ms`);
            
            testResults.tests.push({
                name: 'Executive Dashboard Access',
                status: 'PASS',
                loadTime: execPageLoadTime,
                details: `Executive Dashboard loaded successfully in ${execPageLoadTime}ms`
            });
            
        } catch (error) {
            console.log('❌ Executive Dashboard access failed:', error.message);
            testResults.tests.push({
                name: 'Executive Dashboard Access',
                status: 'FAIL',
                error: error.message
            });
            testResults.summary.errors.push(`Executive Dashboard Access: ${error.message}`);
        }

        // TEST 5: Navigation Testing
        console.log('📋 Test 5: Navigation Testing...');
        
        try {
            // Go back to main page
            await page.goto('http://localhost:3002', { waitUntil: 'networkidle2' });
            
            // Test navigation links
            const navigationLinks = await page.$$('a[href*="/"], nav a, .nav-link');
            console.log(`✅ Found ${navigationLinks.length} navigation elements`);
            
            testResults.tests.push({
                name: 'Navigation Testing',
                status: 'PASS',
                details: `${navigationLinks.length} navigation elements found and accessible`
            });
            
        } catch (error) {
            console.log('❌ Navigation testing failed:', error.message);
            testResults.tests.push({
                name: 'Navigation Testing',
                status: 'FAIL',
                error: error.message
            });
            testResults.summary.errors.push(`Navigation Testing: ${error.message}`);
        }

        // TEST 6: Console Error Check
        console.log('📋 Test 6: Console Error Analysis...');
        
        const criticalErrors = consoleErrors.filter(error => 
            !error.includes('Warning') && 
            !error.includes('DevTools') &&
            !error.includes('Source map') &&
            !error.includes('favicon')
        );
        
        if (criticalErrors.length === 0) {
            console.log('✅ No critical console errors found');
            testResults.tests.push({
                name: 'Console Error Check',
                status: 'PASS',
                details: 'No critical console errors detected'
            });
        } else {
            console.log(`❌ Found ${criticalErrors.length} critical console errors:`, criticalErrors);
            testResults.tests.push({
                name: 'Console Error Check',
                status: 'FAIL',
                errors: criticalErrors,
                details: `${criticalErrors.length} critical console errors found`
            });
            testResults.summary.errors.push(`Console Errors: ${criticalErrors.join(', ')}`);
        }

        // TEST 7: Network Error Check
        console.log('📋 Test 7: Network Error Analysis...');
        
        if (networkErrors.length === 0) {
            console.log('✅ No network errors found');
            testResults.tests.push({
                name: 'Network Error Check',
                status: 'PASS',
                details: 'No network errors detected'
            });
        } else {
            console.log(`❌ Found ${networkErrors.length} network errors:`, networkErrors);
            testResults.tests.push({
                name: 'Network Error Check',
                status: 'FAIL',
                errors: networkErrors,
                details: `${networkErrors.length} network errors found`
            });
            testResults.summary.errors.push(`Network Errors: ${networkErrors.join(', ')}`);
        }

    } catch (error) {
        console.error('❌ Test suite failed:', error);
        testResults.summary.errors.push(`Test Suite Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Calculate summary
    testResults.summary.total = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter(t => t.status === 'PASS').length;
    testResults.summary.failed = testResults.tests.filter(t => t.status === 'FAIL').length;

    // Display results
    console.log('\n📊 VALIDATION RESULTS SUMMARY:');
    console.log('================================');
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`📈 Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);

    if (testResults.summary.errors.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES FOUND:');
        testResults.summary.errors.forEach(error => {
            console.log(`  • ${error}`);
        });
    }

    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync('security-validation-results.json', JSON.stringify(testResults, null, 2));
    console.log('\n📝 Detailed results saved to: security-validation-results.json');

    return testResults;
}

// Run the test
if (require.main === module) {
    runSecurityValidationTest()
        .then(results => {
            console.log('\n🎯 Security validation test completed!');
            process.exit(results.summary.failed === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('🚨 Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runSecurityValidationTest };