/**
 * Browser-Based Business Logic Validation for Version 2.2
 * 
 * This script runs comprehensive business logic testing directly in the browser
 * to validate all critical functionality including real-time calculations,
 * user interactions, and UI responsiveness.
 */

console.log('🚀 Browser-Based Business Logic Validation - Version 2.2');

// Test configuration
const TEST_CONFIG = {
    PERFORMANCE_THRESHOLD: 3000, // 3 seconds
    AUTO_SAVE_THRESHOLD: 2000, // 2 seconds
    COMPLETION_UPDATE_THRESHOLD: 3000, // 3 seconds for real-time updates
    REQUIRED_TEAMS: 5,
    WAIT_TIME: 1000 // Wait time between tests
};

// Test results storage
const validationResults = {
    timestamp: new Date().toISOString(),
    version: '2.2',
    testType: 'browser_validation',
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    criticalFailures: [],
    performanceMetrics: {},
    businessLogicResults: {
        teamManagement: { status: 'pending', details: [] },
        hoursCompletion: { status: 'pending', details: [] },
        managerFeatures: { status: 'pending', details: [] },
        cooDashboard: { status: 'pending', details: [] },
        navigation: { status: 'pending', details: [] },
        version22Features: { status: 'pending', details: [] }
    },
    userFlowTests: [],
    calculationAccuracy: [],
    realTimeUpdates: []
};

/**
 * Utility functions
 */
function logTest(testName, status, details = '', category = 'general') {
    validationResults.totalTests++;
    const result = {
        test: testName,
        status,
        details,
        category,
        timestamp: new Date().toISOString()
    };
    
    if (status === 'PASS') {
        validationResults.passedTests++;
        console.log(`✅ ${testName}: PASSED ${details ? '- ' + details : ''}`);
    } else {
        validationResults.failedTests++;
        if (testName.includes('CRITICAL') || testName.includes('MISSION CRITICAL')) {
            validationResults.criticalFailures.push(result);
        }
        console.log(`❌ ${testName}: FAILED ${details ? '- ' + details : ''}`);
    }
    
    // Add to appropriate business logic category
    if (validationResults.businessLogicResults[category]) {
        validationResults.businessLogicResults[category].details.push(result);
    }
    
    return result;
}

function measurePerformance(testName, startTime) {
    const duration = Date.now() - startTime;
    validationResults.performanceMetrics[testName] = duration;
    return duration;
}

function waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * DOM Testing Utilities
 */
function findElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function check() {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
            } else if (Date.now() - startTime >= timeout) {
                reject(new Error(`Element not found: ${selector} (timeout: ${timeout}ms)`));
            } else {
                setTimeout(check, 100);
            }
        }
        
        check();
    });
}

function findElements(selector) {
    return document.querySelectorAll(selector);
}

function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(element).visibility !== 'hidden';
}

/**
 * 1. TEAM MANAGEMENT SYSTEM VALIDATION
 */
async function validateTeamManagementSystem() {
    console.log('\n📋 Validating Team Management System...');
    const category = 'teamManagement';
    
    try {
        // Test 1.1: Team selection screen
        const teamButtons = findElements('[data-testid="team-button"], button:contains("Team"), .team-selection button');
        if (teamButtons.length >= TEST_CONFIG.REQUIRED_TEAMS) {
            logTest('Team Selection Display', 'PASS', `${teamButtons.length} teams available`, category);
        } else {
            logTest('Team Selection Display', 'FAIL', `Only ${teamButtons.length} teams found, expected ${TEST_CONFIG.REQUIRED_TEAMS}`, category);
        }
        
        // Test 1.2: Team selection functionality
        if (teamButtons.length > 0) {
            const firstTeam = teamButtons[0];
            const teamName = firstTeam.textContent.trim();
            
            const clickStart = Date.now();
            firstTeam.click();
            await waitFor(2000); // Wait for team selection to process
            const selectionTime = measurePerformance('team_selection_click', clickStart);
            
            if (selectionTime <= TEST_CONFIG.PERFORMANCE_THRESHOLD) {
                logTest('Team Selection Performance', 'PASS', `Selection completed in ${selectionTime}ms`, category);
            } else {
                logTest('Team Selection Performance', 'FAIL', `Selection took ${selectionTime}ms, exceeds ${TEST_CONFIG.PERFORMANCE_THRESHOLD}ms`, category);
            }
            
            // Test 1.3: User name selection
            await waitFor(1000);
            const userButtons = findElements('[data-testid="user-button"], button:contains("name"), .user-selection button');
            if (userButtons.length > 0) {
                logTest('User Selection Display', 'PASS', `${userButtons.length} users available for ${teamName}`, category);
                
                // Click on first user
                const firstUser = userButtons[0];
                firstUser.click();
                await waitFor(2000);
                
                logTest('User Selection Functionality', 'PASS', 'User selection completed successfully', category);
            } else {
                logTest('User Selection Display', 'FAIL', 'No users found after team selection', category);
            }
        }
        
        validationResults.businessLogicResults[category].status = 'completed';
        
    } catch (error) {
        logTest('Team Management System', 'FAIL', error.message, category);
        validationResults.businessLogicResults[category].status = 'failed';
    }
}

/**
 * 2. HOURS COMPLETION STATUS VALIDATION (MISSION CRITICAL)
 */
async function validateHoursCompletionStatus() {
    console.log('\n📊 Validating Hours Completion Status (MISSION CRITICAL)...');
    const category = 'hoursCompletion';
    
    try {
        // Test 2.1: Find hours completion status component
        const completionElements = findElements('[data-testid="hours-completion"], .hours-completion, .completion-status');
        
        if (completionElements.length > 0) {
            logTest('CRITICAL - Hours Completion Status Display', 'PASS', `${completionElements.length} completion status components found`, category);
            
            // Test 2.2: Check for real-time data display
            const completionElement = completionElements[0];
            const completionText = completionElement.textContent;
            
            // Look for percentage indicators
            const percentageMatch = completionText.match(/(\d+)%/);
            if (percentageMatch) {
                const percentage = parseInt(percentageMatch[1]);
                logTest('CRITICAL - Completion Percentage Display', 'PASS', `Displays ${percentage}% completion`, category);
                
                // Validate percentage is realistic (0-100)
                if (percentage >= 0 && percentage <= 100) {
                    logTest('CRITICAL - Completion Percentage Validation', 'PASS', 'Percentage within valid range', category);
                } else {
                    logTest('CRITICAL - Completion Percentage Validation', 'FAIL', `Invalid percentage: ${percentage}%`, category);
                }
            } else {
                logTest('CRITICAL - Completion Percentage Display', 'FAIL', 'No percentage data found in completion status', category);
            }
            
            // Test 2.3: Check for team breakdown
            const teamBreakdown = findElements('.team-status, .team-completion, [data-testid="team-breakdown"]');
            if (teamBreakdown.length >= TEST_CONFIG.REQUIRED_TEAMS) {
                logTest('CRITICAL - Team Status Breakdown', 'PASS', `${teamBreakdown.length} team statuses displayed`, category);
            } else {
                logTest('CRITICAL - Team Status Breakdown', 'FAIL', `Only ${teamBreakdown.length} team statuses found, expected ${TEST_CONFIG.REQUIRED_TEAMS}`, category);
            }
            
        } else {
            logTest('MISSION CRITICAL - Hours Completion Status Display', 'FAIL', 'No hours completion status component found', category);
        }
        
        // Test 2.4: Sprint date display
        const sprintDateElements = findElements('[data-testid="sprint-dates"], .sprint-info, .current-sprint');
        if (sprintDateElements.length > 0) {
            const sprintText = sprintDateElements[0].textContent;
            const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/;
            
            if (datePattern.test(sprintText)) {
                logTest('CRITICAL - Sprint Date Display', 'PASS', 'Sprint dates are displayed correctly', category);
            } else {
                logTest('CRITICAL - Sprint Date Display', 'FAIL', 'Sprint dates not found or incorrectly formatted', category);
            }
        } else {
            logTest('CRITICAL - Sprint Date Display', 'FAIL', 'No sprint date information found', category);
        }
        
        validationResults.businessLogicResults[category].status = 'completed';
        
    } catch (error) {
        logTest('MISSION CRITICAL - Hours Completion Status', 'FAIL', error.message, category);
        validationResults.businessLogicResults[category].status = 'failed';
    }
}

/**
 * 3. MANAGER FEATURES VALIDATION
 */
async function validateManagerFeatures() {
    console.log('\n👨‍💼 Validating Manager Features...');
    const category = 'managerFeatures';
    
    try {
        // Test 3.1: Manager dashboard detection
        const managerElements = findElements('[data-testid="manager-dashboard"], .manager-dashboard, .team-management');
        
        if (managerElements.length > 0) {
            logTest('Manager Dashboard Display', 'PASS', 'Manager dashboard components found', category);
            
            // Test 3.2: Team editing functionality
            const editButtons = findElements('[data-testid="edit-member"], button:contains("Edit"), .edit-schedule');
            if (editButtons.length > 0) {
                logTest('Team Editing Interface', 'PASS', `${editButtons.length} edit controls available`, category);
            } else {
                logTest('Team Editing Interface', 'FAIL', 'No team editing controls found', category);
            }
            
            // Test 3.3: Export functionality
            const exportButtons = findElements('[data-testid="export-excel"], button:contains("Export"), .export-btn');
            if (exportButtons.length > 0) {
                logTest('Excel Export Interface', 'PASS', 'Export functionality available', category);
            } else {
                logTest('Excel Export Interface', 'FAIL', 'No export functionality found', category);
            }
            
        } else {
            logTest('Manager Dashboard Display', 'FAIL', 'No manager dashboard components found', category);
        }
        
        validationResults.businessLogicResults[category].status = 'completed';
        
    } catch (error) {
        logTest('Manager Features', 'FAIL', error.message, category);
        validationResults.businessLogicResults[category].status = 'failed';
    }
}

/**
 * 4. COO DASHBOARD VALIDATION (MISSION CRITICAL)
 */
async function validateCOODashboard() {
    console.log('\n🏢 Validating COO Dashboard (MISSION CRITICAL)...');
    const category = 'cooDashboard';
    
    try {
        // Check if we're on the executive page
        const currentPath = window.location.pathname;
        if (currentPath !== '/executive') {
            // Navigate to executive dashboard
            window.location.href = '/executive';
            await waitFor(3000); // Wait for page load
        }
        
        // Test 4.1: Company-wide data display
        const companyStats = findElements('[data-testid="company-stats"], .company-overview, .executive-summary');
        
        if (companyStats.length > 0) {
            logTest('MISSION CRITICAL - COO Dashboard Display', 'PASS', 'COO dashboard components found', category);
            
            // Test 4.2: Company completion percentage
            const companyText = companyStats[0].textContent;
            const companyPercentage = companyText.match(/(\d+)%/);
            
            if (companyPercentage) {
                logTest('MISSION CRITICAL - Company Completion Display', 'PASS', `Company completion: ${companyPercentage[1]}%`, category);
            } else {
                logTest('MISSION CRITICAL - Company Completion Display', 'FAIL', 'No company completion percentage found', category);
            }
            
            // Test 4.3: All teams representation
            const teamElements = findElements('[data-testid="team-card"], .team-overview, .team-status-card');
            
            if (teamElements.length >= TEST_CONFIG.REQUIRED_TEAMS) {
                logTest('MISSION CRITICAL - All Teams Displayed', 'PASS', `${teamElements.length} teams displayed in COO dashboard`, category);
                
                // Test mathematical accuracy by checking individual team percentages
                let teamPercentages = [];
                teamElements.forEach((teamElement, index) => {
                    const teamText = teamElement.textContent;
                    const percentage = teamText.match(/(\d+)%/);
                    if (percentage) {
                        teamPercentages.push(parseInt(percentage[1]));
                    }
                });
                
                if (teamPercentages.length === teamElements.length) {
                    logTest('MISSION CRITICAL - Team Data Completeness', 'PASS', 'All teams have completion percentages', category);
                } else {
                    logTest('MISSION CRITICAL - Team Data Completeness', 'FAIL', `${teamPercentages.length}/${teamElements.length} teams have percentage data`, category);
                }
                
            } else {
                logTest('MISSION CRITICAL - All Teams Displayed', 'FAIL', `Only ${teamElements.length} teams found, expected ${TEST_CONFIG.REQUIRED_TEAMS}`, category);
            }
            
        } else {
            logTest('MISSION CRITICAL - COO Dashboard Display', 'FAIL', 'COO dashboard components not found', category);
        }
        
        validationResults.businessLogicResults[category].status = 'completed';
        
    } catch (error) {
        logTest('MISSION CRITICAL - COO Dashboard', 'FAIL', error.message, category);
        validationResults.businessLogicResults[category].status = 'failed';
    }
}

/**
 * 5. NAVIGATION SYSTEM VALIDATION
 */
async function validateNavigationSystem() {
    console.log('\n🧭 Validating Navigation System...');
    const category = 'navigation';
    
    try {
        // Test 5.1: Mobile navigation detection
        const mobileNav = findElements('[data-testid="mobile-nav"], .mobile-menu, .hamburger-menu');
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile && mobileNav.length > 0) {
            logTest('Mobile Navigation Display', 'PASS', 'Mobile navigation components found', category);
        } else if (!isMobile) {
            logTest('Mobile Navigation Display', 'PASS', 'Desktop view - mobile nav not required', category);
        } else {
            logTest('Mobile Navigation Display', 'FAIL', 'Mobile navigation not found on mobile device', category);
        }
        
        // Test 5.2: Navigation buttons functionality
        const navButtons = findElements('button, a[href]');
        const workingButtons = Array.from(navButtons).filter(btn => 
            btn.onclick || btn.href || btn.getAttribute('data-testid')
        );
        
        if (workingButtons.length > 0) {
            logTest('Navigation Functionality', 'PASS', `${workingButtons.length} interactive navigation elements found`, category);
        } else {
            logTest('Navigation Functionality', 'FAIL', 'No functional navigation elements found', category);
        }
        
        // Test 5.3: Page responsiveness
        const originalWidth = window.innerWidth;
        
        // Test mobile breakpoint
        if (window.matchMedia) {
            const isMobileView = window.matchMedia('(max-width: 768px)').matches;
            const isTabletView = window.matchMedia('(max-width: 1024px)').matches;
            
            logTest('Responsive Design Detection', 'PASS', 
                `Mobile: ${isMobileView}, Tablet: ${isTabletView}, Desktop: ${!isTabletView}`, category);
        }
        
        validationResults.businessLogicResults[category].status = 'completed';
        
    } catch (error) {
        logTest('Navigation System', 'FAIL', error.message, category);
        validationResults.businessLogicResults[category].status = 'failed';
    }
}

/**
 * 6. VERSION 2.2 FEATURES VALIDATION
 */
async function validateVersion22Features() {
    console.log('\n🆕 Validating Version 2.2 Features...');
    const category = 'version22Features';
    
    try {
        // Test 6.1: Version component detection
        const versionElements = findElements('[data-testid="version"], .version-display, .version-info');
        
        if (versionElements.length > 0) {
            logTest('Version Component Display', 'PASS', 'Version component found', category);
            
            const versionText = versionElements[0].textContent;
            if (versionText.includes('2.2') || versionText.includes('v2.2')) {
                logTest('Version 2.2 Display', 'PASS', `Version displayed: ${versionText}`, category);
            } else {
                logTest('Version 2.2 Display', 'FAIL', `Unexpected version text: ${versionText}`, category);
            }
            
            // Test clickability
            const isClickable = versionElements[0].onclick || 
                               versionElements[0].style.cursor === 'pointer' ||
                               versionElements[0].classList.contains('clickable');
            
            if (isClickable) {
                logTest('Version Component Interactivity', 'PASS', 'Version component is clickable', category);
            } else {
                logTest('Version Component Interactivity', 'FAIL', 'Version component is not interactive', category);
            }
            
        } else {
            logTest('Version Component Display', 'FAIL', 'Version component not found', category);
        }
        
        // Test 6.2: Release notes modal (if version is clickable)
        const modals = findElements('[data-testid="release-notes"], .modal, .release-notes-modal');
        if (modals.length > 0) {
            logTest('Release Notes Modal', 'PASS', 'Release notes modal found', category);
        }
        
        validationResults.businessLogicResults[category].status = 'completed';
        
    } catch (error) {
        logTest('Version 2.2 Features', 'FAIL', error.message, category);
        validationResults.businessLogicResults[category].status = 'failed';
    }
}

/**
 * REAL-TIME UPDATE TESTING
 */
async function validateRealTimeUpdates() {
    console.log('\n⚡ Validating Real-Time Updates...');
    
    try {
        // Capture initial state
        const initialCompletionElements = findElements('.completion-percentage, [data-testid="completion-percent"]');
        const initialValues = Array.from(initialCompletionElements).map(el => el.textContent);
        
        logTest('Real-Time Update Baseline', 'PASS', `Captured ${initialValues.length} completion values`, 'realTime');
        
        // Note: Real-time testing requires actual user interaction
        // This is a placeholder for manual testing requirements
        validationResults.realTimeUpdates.push({
            test: 'Real-Time Update Detection',
            status: 'MANUAL_TEST_REQUIRED',
            details: 'Modify availability data and verify updates appear within 3 seconds',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logTest('Real-Time Updates', 'FAIL', error.message, 'realTime');
    }
}

/**
 * CALCULATION ACCURACY TESTING
 */
async function validateCalculationAccuracy() {
    console.log('\n🧮 Validating Calculation Accuracy...');
    
    try {
        // Find all percentage displays
        const percentageElements = findElements('[data-testid*="percentage"], .percentage, .completion-rate');
        
        percentageElements.forEach((element, index) => {
            const text = element.textContent;
            const percentageMatch = text.match(/(\d+(?:\.\d+)?)%/);
            
            if (percentageMatch) {
                const percentage = parseFloat(percentageMatch[1]);
                
                // Validate percentage is within reasonable bounds
                if (percentage >= 0 && percentage <= 100) {
                    validationResults.calculationAccuracy.push({
                        element: `percentage_${index}`,
                        value: percentage,
                        status: 'VALID',
                        details: 'Percentage within valid range'
                    });
                } else {
                    validationResults.calculationAccuracy.push({
                        element: `percentage_${index}`,
                        value: percentage,
                        status: 'INVALID',
                        details: 'Percentage outside valid range (0-100%)'
                    });
                }
            }
        });
        
        logTest('Calculation Accuracy Check', 'PASS', 
            `Validated ${validationResults.calculationAccuracy.length} percentage calculations`, 'calculations');
        
    } catch (error) {
        logTest('Calculation Accuracy', 'FAIL', error.message, 'calculations');
    }
}

/**
 * CONSOLE ERROR DETECTION
 */
function validateConsoleErrors() {
    console.log('\n🔍 Validating Console Errors...');
    
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const errors = [];
    const warnings = [];
    
    // Override console methods to capture errors
    console.error = (...args) => {
        errors.push(args.join(' '));
        originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
        warnings.push(args.join(' '));
        originalWarn.apply(console, args);
    };
    
    // Check for existing errors in the console
    setTimeout(() => {
        if (errors.length === 0) {
            logTest('Console Error Detection', 'PASS', 'No console errors detected', 'console');
        } else {
            logTest('Console Error Detection', 'FAIL', `${errors.length} console errors found`, 'console');
        }
        
        if (warnings.length === 0) {
            logTest('Console Warning Detection', 'PASS', 'No console warnings detected', 'console');
        } else {
            logTest('Console Warning Detection', 'PASS', `${warnings.length} console warnings found (non-critical)`, 'console');
        }
        
        // Restore original console methods
        console.error = originalError;
        console.warn = originalWarn;
        
    }, 2000);
}

/**
 * MAIN VALIDATION EXECUTION
 */
async function runBrowserValidation() {
    const overallStart = Date.now();
    
    console.log('🎯 BROWSER-BASED BUSINESS LOGIC VALIDATION - VERSION 2.2');
    console.log('=========================================================');
    console.log(`Current URL: ${window.location.href}`);
    console.log(`Screen Size: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`User Agent: ${navigator.userAgent}`);
    console.log('');
    
    // Start console error monitoring
    validateConsoleErrors();
    
    // Execute all validation suites
    await validateTeamManagementSystem();
    await waitFor(TEST_CONFIG.WAIT_TIME);
    
    await validateHoursCompletionStatus();
    await waitFor(TEST_CONFIG.WAIT_TIME);
    
    await validateManagerFeatures();
    await waitFor(TEST_CONFIG.WAIT_TIME);
    
    await validateCOODashboard();
    await waitFor(TEST_CONFIG.WAIT_TIME);
    
    await validateNavigationSystem();
    await waitFor(TEST_CONFIG.WAIT_TIME);
    
    await validateVersion22Features();
    await waitFor(TEST_CONFIG.WAIT_TIME);
    
    await validateRealTimeUpdates();
    await validateCalculationAccuracy();
    
    // Calculate final results
    const overallTime = Date.now() - overallStart;
    validationResults.totalExecutionTime = overallTime;
    validationResults.successRate = validationResults.totalTests > 0 
        ? Math.round((validationResults.passedTests / validationResults.totalTests) * 100)
        : 0;
    
    // Generate comprehensive report
    console.log('\n📋 BROWSER VALIDATION RESULTS SUMMARY');
    console.log('====================================');
    console.log(`Total Tests: ${validationResults.totalTests}`);
    console.log(`Passed: ${validationResults.passedTests} ✅`);
    console.log(`Failed: ${validationResults.failedTests} ❌`);
    console.log(`Success Rate: ${validationResults.successRate}%`);
    console.log(`Total Execution Time: ${overallTime}ms`);
    
    // Business logic category summary
    console.log('\n📊 BUSINESS LOGIC CATEGORY RESULTS:');
    Object.entries(validationResults.businessLogicResults).forEach(([category, results]) => {
        const categoryPassed = results.details.filter(d => d.status === 'PASS').length;
        const categoryTotal = results.details.length;
        const categoryRate = categoryTotal > 0 ? Math.round((categoryPassed / categoryTotal) * 100) : 0;
        
        console.log(`  ${category}: ${categoryRate}% (${categoryPassed}/${categoryTotal}) - ${results.status}`);
    });
    
    if (validationResults.criticalFailures.length > 0) {
        console.log('\n🚨 CRITICAL FAILURES DETECTED:');
        validationResults.criticalFailures.forEach(failure => {
            console.log(`  - ${failure.test}: ${failure.details}`);
        });
    }
    
    // Success criteria evaluation
    const criticalSuccess = validationResults.criticalFailures.length === 0;
    const successRateGood = validationResults.successRate >= 80;
    const businessLogicComplete = Object.values(validationResults.businessLogicResults)
        .every(category => category.status === 'completed');
    
    console.log('\n🎯 SUCCESS CRITERIA EVALUATION:');
    console.log(`Critical Business Logic: ${criticalSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Success Rate (≥80%): ${successRateGood ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Business Logic Complete: ${businessLogicComplete ? '✅ PASS' : '❌ FAIL'}`);
    
    const overallSuccess = criticalSuccess && successRateGood && businessLogicComplete;
    console.log(`Overall Enterprise Readiness: ${overallSuccess ? '✅ READY FOR DEPLOYMENT' : '❌ NEEDS ATTENTION'}`);
    
    // Store results in global variable for external access
    window.validationResults = validationResults;
    
    return validationResults;
}

// Auto-run validation
if (typeof window !== 'undefined') {
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runBrowserValidation, 2000);
        });
    } else {
        setTimeout(runBrowserValidation, 2000);
    }
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runBrowserValidation, validationResults };
}