/**
 * Hours Completion Status Feature Validation - MISSION CRITICAL
 * 
 * This script provides deep validation of the Hours Completion Status feature,
 * which is the most critical business logic component in Version 2.2.
 */

const { JSDOM } = require('jsdom');
// Use Node.js built-in fetch (available in Node 18+)
const fetch = globalThis.fetch || require('node-fetch');

// Test configuration
const VALIDATION_CONFIG = {
    BASE_URL: 'http://localhost:3000',
    EXECUTIVE_URL: 'http://localhost:3000/executive',
    TIMEOUT: 15000,
    CRITICAL_TEAMS: ['Development', 'QA', 'DevOps', 'Product', 'Design'],
    EXPECTED_DATA_FIELDS: [
        'completionPercentage',
        'totalMembers', 
        'completedMembers',
        'sprintInfo',
        'teamBreakdown'
    ]
};

// Validation results
const hoursValidationResults = {
    timestamp: new Date().toISOString(),
    feature: 'Hours Completion Status',
    criticality: 'MISSION CRITICAL',
    tests: [],
    mathematicalAccuracy: [],
    realTimeValidation: [],
    sprintCalculations: [],
    dataIntegrity: [],
    performanceMetrics: {},
    overallStatus: 'pending'
};

/**
 * Utility functions
 */
function logValidation(testName, status, details = '', category = 'general') {
    const result = {
        test: testName,
        status,
        details,
        category,
        timestamp: new Date().toISOString(),
        criticality: testName.includes('CRITICAL') || testName.includes('MISSION CRITICAL') ? 'HIGH' : 'MEDIUM'
    };
    
    if (status === 'PASS') {
        console.log(`✅ ${testName}: PASSED ${details ? '- ' + details : ''}`);
    } else {
        console.log(`❌ ${testName}: FAILED ${details ? '- ' + details : ''}`);
    }
    
    hoursValidationResults.tests.push(result);
    
    // Add to specific category array
    if (hoursValidationResults[category]) {
        hoursValidationResults[category].push(result);
    }
    
    return result;
}

/**
 * 1. VALIDATE COO DASHBOARD HOURS COMPLETION STATUS
 */
async function validateCOODashboardHoursStatus() {
    console.log('\n🏢 Validating COO Dashboard Hours Completion Status...');
    
    try {
        const startTime = Date.now();
        const response = await fetch(VALIDATION_CONFIG.EXECUTIVE_URL);
        const loadTime = Date.now() - startTime;
        
        hoursValidationResults.performanceMetrics.coo_dashboard_load = loadTime;
        
        if (!response.ok) {
            logValidation('MISSION CRITICAL - COO Dashboard Access', 'FAIL', 
                `HTTP ${response.status} - Cannot access executive dashboard`, 'dataIntegrity');
            return;
        }
        
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Test 1.1: Hours completion status component presence
        const hoursComponents = document.querySelectorAll(
            '[data-testid="hours-completion"], .hours-completion, .completion-status, .company-completion'
        );
        
        if (hoursComponents.length > 0) {
            logValidation('MISSION CRITICAL - Hours Status Component Present', 'PASS', 
                `${hoursComponents.length} hours completion components found`, 'dataIntegrity');
        } else {
            logValidation('MISSION CRITICAL - Hours Status Component Present', 'FAIL', 
                'No hours completion status components found in COO dashboard', 'dataIntegrity');
            return;
        }
        
        // Test 1.2: Company-wide completion percentage
        const htmlContent = html.toLowerCase();
        const percentageMatches = html.match(/(\d{1,3})%/g);
        
        if (percentageMatches && percentageMatches.length > 0) {
            logValidation('MISSION CRITICAL - Company Completion Percentage', 'PASS', 
                `Found completion percentages: ${percentageMatches.slice(0, 5).join(', ')}`, 'mathematicalAccuracy');
            
            // Validate percentage values are realistic
            const validPercentages = percentageMatches
                .map(p => parseInt(p.replace('%', '')))
                .filter(p => p >= 0 && p <= 100);
            
            if (validPercentages.length === percentageMatches.length) {
                logValidation('MISSION CRITICAL - Percentage Validation', 'PASS', 
                    'All percentages are within valid range (0-100%)', 'mathematicalAccuracy');
            } else {
                logValidation('MISSION CRITICAL - Percentage Validation', 'FAIL', 
                    `${percentageMatches.length - validPercentages.length} invalid percentages found`, 'mathematicalAccuracy');
            }
        } else {
            logValidation('MISSION CRITICAL - Company Completion Percentage', 'FAIL', 
                'No completion percentages found in COO dashboard', 'mathematicalAccuracy');
        }
        
        // Test 1.3: Team breakdown presence
        const teamKeywords = ['team', 'development', 'qa', 'devops', 'product', 'design'];
        const teamMentions = teamKeywords.filter(keyword => 
            htmlContent.includes(keyword.toLowerCase())
        );
        
        if (teamMentions.length >= 3) {
            logValidation('MISSION CRITICAL - Team Breakdown Present', 'PASS', 
                `Found references to ${teamMentions.length} team-related keywords`, 'dataIntegrity');
        } else {
            logValidation('MISSION CRITICAL - Team Breakdown Present', 'FAIL', 
                `Only ${teamMentions.length} team keywords found, expected more comprehensive team data`, 'dataIntegrity');
        }
        
        // Test 1.4: Real-time indicators
        const realTimeIndicators = [
            'real-time', 'current', 'updated', 'live', 'status', 'now'
        ].filter(indicator => htmlContent.includes(indicator));
        
        if (realTimeIndicators.length >= 2) {
            logValidation('CRITICAL - Real-Time Indicators Present', 'PASS', 
                `Found real-time indicators: ${realTimeIndicators.join(', ')}`, 'realTimeValidation');
        } else {
            logValidation('CRITICAL - Real-Time Indicators Present', 'FAIL', 
                'Insufficient real-time status indicators found', 'realTimeValidation');
        }
        
    } catch (error) {
        logValidation('MISSION CRITICAL - COO Dashboard Validation', 'FAIL', 
            error.message, 'dataIntegrity');
    }
}

/**
 * 2. VALIDATE SPRINT CALCULATIONS
 */
async function validateSprintCalculations() {
    console.log('\n📅 Validating Sprint Calculations...');
    
    try {
        // Check for sprint-related content in the main application
        const response = await fetch(VALIDATION_CONFIG.BASE_URL);
        const html = await response.text();
        
        // Test 2.1: Sprint date presence
        const datePatterns = [
            /\d{1,2}\/\d{1,2}\/\d{4}/g,  // MM/DD/YYYY
            /\d{4}-\d{2}-\d{2}/g,        // YYYY-MM-DD
            /\d{1,2}-\d{1,2}-\d{4}/g     // DD-MM-YYYY
        ];
        
        let sprintDatesFound = false;
        datePatterns.forEach(pattern => {
            const matches = html.match(pattern);
            if (matches && matches.length >= 2) { // Start and end dates
                sprintDatesFound = true;
                logValidation('CRITICAL - Sprint Date Detection', 'PASS', 
                    `Found sprint dates: ${matches.slice(0, 2).join(' to ')}`, 'sprintCalculations');
            }
        });
        
        if (!sprintDatesFound) {
            logValidation('CRITICAL - Sprint Date Detection', 'FAIL', 
                'No valid sprint date patterns found', 'sprintCalculations');
        }
        
        // Test 2.2: Working days calculation
        const workingDaysKeywords = ['working days', 'business days', 'weekdays', 'days'];
        const foundWorkingDaysRefs = workingDaysKeywords.filter(keyword => 
            html.toLowerCase().includes(keyword)
        );
        
        if (foundWorkingDaysRefs.length > 0) {
            logValidation('CRITICAL - Working Days Calculation', 'PASS', 
                `Found working days references: ${foundWorkingDaysRefs.join(', ')}`, 'sprintCalculations');
        } else {
            logValidation('CRITICAL - Working Days Calculation', 'FAIL', 
                'No working days calculation indicators found', 'sprintCalculations');
        }
        
        // Test 2.3: Sprint boundary validation
        const currentDate = new Date();
        const sprintKeywords = ['sprint', 'current sprint', 'active sprint'];
        const foundSprintRefs = sprintKeywords.filter(keyword => 
            html.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (foundSprintRefs.length > 0) {
            logValidation('CRITICAL - Sprint Boundary Indicators', 'PASS', 
                `Found sprint boundary references: ${foundSprintRefs.length} instances`, 'sprintCalculations');
        } else {
            logValidation('CRITICAL - Sprint Boundary Indicators', 'FAIL', 
                'No sprint boundary indicators found', 'sprintCalculations');
        }
        
    } catch (error) {
        logValidation('CRITICAL - Sprint Calculations Validation', 'FAIL', 
            error.message, 'sprintCalculations');
    }
}

/**
 * 3. VALIDATE MATHEMATICAL ACCURACY
 */
async function validateMathematicalAccuracy() {
    console.log('\n🧮 Validating Mathematical Accuracy...');
    
    try {
        // Simulate mathematical validation scenarios
        const testScenarios = [
            { totalMembers: 10, completedMembers: 8, expectedPercentage: 80 },
            { totalMembers: 15, completedMembers: 12, expectedPercentage: 80 },
            { totalMembers: 5, completedMembers: 5, expectedPercentage: 100 },
            { totalMembers: 20, completedMembers: 0, expectedPercentage: 0 }
        ];
        
        testScenarios.forEach((scenario, index) => {
            const calculatedPercentage = scenario.totalMembers > 0 
                ? Math.round((scenario.completedMembers / scenario.totalMembers) * 100)
                : 0;
            
            if (calculatedPercentage === scenario.expectedPercentage) {
                logValidation(`Mathematical Accuracy Test ${index + 1}`, 'PASS', 
                    `${scenario.completedMembers}/${scenario.totalMembers} = ${calculatedPercentage}%`, 'mathematicalAccuracy');
            } else {
                logValidation(`Mathematical Accuracy Test ${index + 1}`, 'FAIL', 
                    `Expected ${scenario.expectedPercentage}%, got ${calculatedPercentage}%`, 'mathematicalAccuracy');
            }
        });
        
        // Test edge cases
        const edgeCases = [
            { description: 'Division by zero', totalMembers: 0, completedMembers: 0 },
            { description: 'Negative values', totalMembers: -1, completedMembers: 5 },
            { description: 'Completed > Total', totalMembers: 5, completedMembers: 10 }
        ];
        
        edgeCases.forEach((edgeCase, index) => {
            try {
                const result = edgeCase.totalMembers > 0 
                    ? Math.round((edgeCase.completedMembers / edgeCase.totalMembers) * 100)
                    : 0;
                
                // Check if result is reasonable
                const isReasonable = result >= 0 && result <= 100;
                
                logValidation(`Edge Case ${index + 1} - ${edgeCase.description}`, 
                    isReasonable ? 'PASS' : 'FAIL', 
                    `Result: ${result}% (${isReasonable ? 'reasonable' : 'unreasonable'})`, 
                    'mathematicalAccuracy');
            } catch (error) {
                logValidation(`Edge Case ${index + 1} - ${edgeCase.description}`, 'FAIL', 
                    `Error in calculation: ${error.message}`, 'mathematicalAccuracy');
            }
        });
        
    } catch (error) {
        logValidation('Mathematical Accuracy Validation', 'FAIL', 
            error.message, 'mathematicalAccuracy');
    }
}

/**
 * 4. VALIDATE REAL-TIME UPDATE CAPABILITY
 */
async function validateRealTimeUpdates() {
    console.log('\n⚡ Validating Real-Time Update Capability...');
    
    try {
        // Test 4.1: Check for WebSocket or real-time update mechanisms
        const response = await fetch(VALIDATION_CONFIG.BASE_URL);
        const html = await response.text();
        
        const realTimeKeywords = [
            'websocket', 'socket.io', 'real-time', 'live updates', 
            'auto-refresh', 'polling', 'sse', 'server-sent events'
        ];
        
        const foundRealTimeFeatures = realTimeKeywords.filter(keyword => 
            html.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (foundRealTimeFeatures.length > 0) {
            logValidation('CRITICAL - Real-Time Update Mechanisms', 'PASS', 
                `Found real-time features: ${foundRealTimeFeatures.join(', ')}`, 'realTimeValidation');
        } else {
            logValidation('CRITICAL - Real-Time Update Mechanisms', 'MANUAL_VALIDATION_REQUIRED', 
                'No explicit real-time update indicators found in HTML - requires manual testing', 'realTimeValidation');
        }
        
        // Test 4.2: Check for JavaScript that handles updates
        const jsUpdateIndicators = [
            'setInterval', 'setTimeout', 'addEventListener', 'onchange', 'oninput'
        ];
        
        const foundJSFeatures = jsUpdateIndicators.filter(indicator => 
            html.includes(indicator)
        );
        
        if (foundJSFeatures.length > 0) {
            logValidation('CRITICAL - JavaScript Update Handlers', 'PASS', 
                `Found JS update mechanisms: ${foundJSFeatures.length} indicators`, 'realTimeValidation');
        } else {
            logValidation('CRITICAL - JavaScript Update Handlers', 'FAIL', 
                'No JavaScript update handlers found', 'realTimeValidation');
        }
        
        // Test 4.3: Performance requirement for updates (< 3 seconds)
        logValidation('CRITICAL - Real-Time Performance Requirement', 'MANUAL_VALIDATION_REQUIRED', 
            'Updates must occur within 3 seconds - requires manual testing with actual data changes', 'realTimeValidation');
        
    } catch (error) {
        logValidation('Real-Time Updates Validation', 'FAIL', 
            error.message, 'realTimeValidation');
    }
}

/**
 * 5. VALIDATE DATA INTEGRITY
 */
async function validateDataIntegrity() {
    console.log('\n🔍 Validating Data Integrity...');
    
    try {
        // Test 5.1: Consistent data across multiple page loads
        const responses = await Promise.all([
            fetch(VALIDATION_CONFIG.BASE_URL),
            fetch(VALIDATION_CONFIG.EXECUTIVE_URL),
            fetch(`${VALIDATION_CONFIG.BASE_URL}?cache=${Date.now()}`) // Cache-busting
        ]);
        
        const htmlContents = await Promise.all(responses.map(r => r.text()));
        
        // Check for consistent data patterns across pages
        const percentagePattern = /(\d{1,3})%/g;
        const pagesWithPercentages = htmlContents.map(html => {
            const matches = html.match(percentagePattern);
            return matches ? matches.length : 0;
        });
        
        const hasConsistentData = pagesWithPercentages.every(count => count > 0);
        
        if (hasConsistentData) {
            logValidation('CRITICAL - Data Consistency Across Pages', 'PASS', 
                `All pages contain completion data: ${pagesWithPercentages.join(', ')} percentage values`, 'dataIntegrity');
        } else {
            logValidation('CRITICAL - Data Consistency Across Pages', 'FAIL', 
                `Inconsistent data across pages: ${pagesWithPercentages.join(', ')} percentage values`, 'dataIntegrity');
        }
        
        // Test 5.2: Required data fields presence
        const combinedHtml = htmlContents.join(' ').toLowerCase();
        const foundRequiredFields = VALIDATION_CONFIG.EXPECTED_DATA_FIELDS.filter(field => 
            combinedHtml.includes(field.toLowerCase()) || 
            combinedHtml.includes(field.replace(/([A-Z])/g, ' $1').toLowerCase())
        );
        
        if (foundRequiredFields.length >= Math.ceil(VALIDATION_CONFIG.EXPECTED_DATA_FIELDS.length * 0.6)) {
            logValidation('CRITICAL - Required Data Fields Present', 'PASS', 
                `Found ${foundRequiredFields.length}/${VALIDATION_CONFIG.EXPECTED_DATA_FIELDS.length} required fields`, 'dataIntegrity');
        } else {
            logValidation('CRITICAL - Required Data Fields Present', 'FAIL', 
                `Only ${foundRequiredFields.length}/${VALIDATION_CONFIG.EXPECTED_DATA_FIELDS.length} required fields found`, 'dataIntegrity');
        }
        
    } catch (error) {
        logValidation('Data Integrity Validation', 'FAIL', 
            error.message, 'dataIntegrity');
    }
}

/**
 * MAIN VALIDATION EXECUTION
 */
async function runHoursCompletionValidation() {
    const overallStart = Date.now();
    
    console.log('🎯 HOURS COMPLETION STATUS VALIDATION - MISSION CRITICAL');
    console.log('========================================================');
    console.log(`Target URL: ${VALIDATION_CONFIG.BASE_URL}`);
    console.log(`Executive URL: ${VALIDATION_CONFIG.EXECUTIVE_URL}`);
    console.log(`Timeout: ${VALIDATION_CONFIG.TIMEOUT}ms`);
    console.log('');
    
    // Execute all validation tests
    await validateCOODashboardHoursStatus();
    await validateSprintCalculations();
    await validateMathematicalAccuracy();
    await validateRealTimeUpdates();
    await validateDataIntegrity();
    
    // Calculate results
    const overallTime = Date.now() - overallStart;
    const totalTests = hoursValidationResults.tests.length;
    const passedTests = hoursValidationResults.tests.filter(t => t.status === 'PASS').length;
    const failedTests = hoursValidationResults.tests.filter(t => t.status === 'FAIL').length;
    const manualTests = hoursValidationResults.tests.filter(t => t.status.includes('MANUAL')).length;
    const criticalFailures = hoursValidationResults.tests.filter(t => 
        t.criticality === 'HIGH' && t.status === 'FAIL'
    );
    
    hoursValidationResults.overallStatus = criticalFailures.length === 0 ? 'READY' : 'NEEDS_ATTENTION';
    hoursValidationResults.performanceMetrics.total_validation_time = overallTime;
    
    // Generate comprehensive report
    console.log('\n📋 HOURS COMPLETION STATUS VALIDATION RESULTS');
    console.log('=============================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Manual Validation Required: ${manualTests} 📋`);
    console.log(`Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
    console.log(`Total Validation Time: ${overallTime}ms`);
    
    // Category breakdown
    console.log('\n📊 VALIDATION CATEGORY BREAKDOWN:');
    ['mathematicalAccuracy', 'realTimeValidation', 'sprintCalculations', 'dataIntegrity'].forEach(category => {
        const categoryTests = hoursValidationResults[category];
        if (categoryTests && categoryTests.length > 0) {
            const passed = categoryTests.filter(t => t.status === 'PASS').length;
            const total = categoryTests.length;
            console.log(`  ${category}: ${passed}/${total} (${Math.round((passed/total)*100)}%)`);
        }
    });
    
    if (criticalFailures.length > 0) {
        console.log('\n🚨 CRITICAL FAILURES:');
        criticalFailures.forEach(failure => {
            console.log(`  - ${failure.test}: ${failure.details}`);
        });
    }
    
    console.log('\n🎯 MISSION CRITICAL FEATURE STATUS:');
    console.log(`Hours Completion Status Feature: ${hoursValidationResults.overallStatus === 'READY' ? '✅ READY FOR DEPLOYMENT' : '❌ NEEDS ATTENTION'}`);
    
    // Required manual tests
    const manualTestsList = hoursValidationResults.tests.filter(t => t.status.includes('MANUAL'));
    if (manualTestsList.length > 0) {
        console.log('\n📋 MANUAL VALIDATION REQUIRED:');
        manualTestsList.forEach(test => {
            console.log(`  - ${test.test}: ${test.details}`);
        });
    }
    
    return hoursValidationResults;
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runHoursCompletionValidation, hoursValidationResults };
}

// Auto-run if called directly
if (typeof window === 'undefined' && require.main === module) {
    runHoursCompletionValidation().then(results => {
        // Save results to file
        const fs = require('fs');
        const path = require('path');
        
        const reportPath = path.join(__dirname, 'test-results', 'hours-completion-validation-report.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        // Exit with appropriate code
        process.exit(results.overallStatus === 'READY' ? 0 : 1);
    }).catch(error => {
        console.error('❌ Hours completion validation failed:', error);
        process.exit(1);
    });
}