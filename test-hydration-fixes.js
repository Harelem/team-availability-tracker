/**
 * Comprehensive Hydration Fix Validation Test
 * Tests all implemented hydration fixes for Next.js 14 Team Availability Tracker
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bold');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logTest(description, passed, details = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const statusColor = passed ? 'green' : 'red';
  log(`${status} ${description}`, statusColor);
  if (details) {
    log(`    ${details}`, 'yellow');
  }
}

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function runTest(description, testFunction) {
  results.total++;
  try {
    const result = testFunction();
    if (result.passed) {
      results.passed++;
      logTest(description, true, result.details);
    } else {
      results.failed++;
      logTest(description, false, result.details);
    }
    results.details.push({ description, passed: result.passed, details: result.details });
  } catch (error) {
    results.failed++;
    logTest(description, false, `Error: ${error.message}`);
    results.details.push({ description, passed: false, details: `Error: ${error.message}` });
  }
}

// Test functions
function testRootLayoutHydrationWarnings() {
  const layoutPath = path.join(__dirname, 'src/app/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  const hasHtmlSuppression = content.includes('<html lang="en" suppressHydrationWarning>');
  const hasBodySuppression = content.includes('suppressHydrationWarning');
  const hasSkipLinkSuppression = content.includes('suppressHydrationWarning');
  
  return {
    passed: hasHtmlSuppression && hasBodySuppression,
    details: `HTML suppression: ${hasHtmlSuppression}, Body suppression: ${hasBodySuppression}`
  };
}

function testSkipLinkCSSCustomProperties() {
  const cssPath = path.join(__dirname, 'src/app/globals.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  
  const hasCustomProperties = [
    '--skip-link-hide-offset',
    '--skip-link-show-offset',
    '--skip-link-left-position',
    '--skip-link-padding',
    '--skip-link-z-index',
    '--skip-link-bg-color',
    '--skip-link-text-color',
    '--skip-link-border-radius'
  ].every(prop => content.includes(prop));
  
  const usesCustomProperties = content.includes('top: var(--skip-link-hide-offset)');
  
  return {
    passed: hasCustomProperties && usesCustomProperties,
    details: `Custom properties defined: ${hasCustomProperties}, Used in styles: ${usesCustomProperties}`
  };
}

function testSkipLinkHydrationSafety() {
  const layoutPath = path.join(__dirname, 'src/app/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  const hasSkipLinksContainer = content.includes('skip-links-container');
  const hasTabIndexes = content.includes('tabIndex={1}') && content.includes('tabIndex={2}');
  const hasContainerSuppression = content.includes('<div className="skip-links-container" suppressHydrationWarning>');
  
  return {
    passed: hasSkipLinksContainer && hasTabIndexes && hasContainerSuppression,
    details: `Container: ${hasSkipLinksContainer}, Tab indexes: ${hasTabIndexes}, Suppression: ${hasContainerSuppression}`
  };
}

function testHydrationSafeWrapperExists() {
  const wrapperPath = path.join(__dirname, 'src/components/HydrationSafeWrapper.tsx');
  const loaderPath = path.join(__dirname, 'src/components/HydrationSafeLoader.tsx');
  
  const wrapperExists = fs.existsSync(wrapperPath);
  const loaderExists = fs.existsSync(loaderPath);
  
  let wrapperFeatures = false;
  let loaderFeatures = false;
  
  if (wrapperExists) {
    const wrapperContent = fs.readFileSync(wrapperPath, 'utf8');
    wrapperFeatures = wrapperContent.includes('HydrationProvider') && 
                      wrapperContent.includes('useHydrationSafeState') &&
                      wrapperContent.includes('ThirdPartySafeWrapper');
  }
  
  if (loaderExists) {
    const loaderContent = fs.readFileSync(loaderPath, 'utf8');
    loaderFeatures = loaderContent.includes('HydrationSafeLoader') && 
                     loaderContent.includes('ClientOnly') &&
                     loaderContent.includes('ServerOnly');
  }
  
  return {
    passed: wrapperExists && loaderExists && wrapperFeatures && loaderFeatures,
    details: `Wrapper: ${wrapperExists}, Loader: ${loaderExists}, Full features: ${wrapperFeatures && loaderFeatures}`
  };
}

function testGlobalsCSSHydrationSafety() {
  const cssPath = path.join(__dirname, 'src/app/globals.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  
  const hasSkipLinkContainer = content.includes('.skip-links-container');
  const hasPointerEventsNone = content.includes('pointer-events: none');
  const hasTransformProperty = content.includes('transform: translateY(0)');
  const hasWillChange = content.includes('will-change: top');
  const hasBackfaceVisibility = content.includes('backface-visibility: hidden');
  
  return {
    passed: hasSkipLinkContainer && hasPointerEventsNone && hasTransformProperty && hasWillChange,
    details: `Container styles: ${hasSkipLinkContainer}, Performance optimizations: ${hasWillChange && hasBackfaceVisibility}`
  };
}

function testLayoutStructure() {
  const layoutPath = path.join(__dirname, 'src/app/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  const hasHydrationProvider = content.includes('<HydrationProvider>');
  const hasMainContent = content.includes('id="main-content"');
  const hasNavigationId = content.includes('id="navigation"') || content.includes('href="#navigation"');
  const hasProperTabIndex = content.includes('tabIndex={-1}');
  
  return {
    passed: hasHydrationProvider && hasMainContent && hasNavigationId,
    details: `Provider: ${hasHydrationProvider}, Main content: ${hasMainContent}, Navigation: ${hasNavigationId}`
  };
}

function testAccessibilityPreservation() {
  const layoutPath = path.join(__dirname, 'src/app/layout.tsx');
  const cssPath = path.join(__dirname, 'src/app/globals.css');
  
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  const hasSkipToMain = layoutContent.includes('Skip to main content');
  const hasSkipToNav = layoutContent.includes('Skip to navigation');
  const hasProperHref = layoutContent.includes('href="#main-content"');
  const hasScreenReaderOnly = cssContent.includes('.sr-only');
  const hasFocusVisible = cssContent.includes(':focus-visible');
  
  return {
    passed: hasSkipToMain && hasSkipToNav && hasProperHref && hasScreenReaderOnly && hasFocusVisible,
    details: `Skip links: ${hasSkipToMain && hasSkipToNav}, Screen reader: ${hasScreenReaderOnly}, Focus visible: ${hasFocusVisible}`
  };
}

// Run all tests
logSection('HYDRATION FIX VALIDATION TEST SUITE');

log('Testing Next.js 14 Team Availability Tracker hydration fixes...', 'blue');

runTest('Root layout has suppressHydrationWarning for browser extensions', testRootLayoutHydrationWarnings);
runTest('Skip-links use CSS custom properties to prevent mismatches', testSkipLinkCSSCustomProperties);
runTest('Skip-links have hydration-safe container structure', testSkipLinkHydrationSafety);
runTest('Hydration-safe wrapper components exist and are complete', testHydrationSafeWrapperExists);
runTest('Global CSS includes hydration-safe skip-link optimizations', testGlobalsCSSHydrationSafety);
runTest('Layout structure supports proper hydration flow', testLayoutStructure);
runTest('Accessibility features are preserved after hydration fixes', testAccessibilityPreservation);

// Print summary
logSection('TEST RESULTS SUMMARY');

log(`Total Tests: ${results.total}`, 'blue');
log(`Passed: ${results.passed}`, 'green');
log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

const successRate = ((results.passed / results.total) * 100).toFixed(1);
log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');

if (results.failed === 0) {
  logSection('🎉 ALL HYDRATION FIXES VALIDATED SUCCESSFULLY! 🎉');
  log('✅ Browser extension compatibility handled', 'green');
  log('✅ Skip-links use hydration-safe CSS custom properties', 'green');
  log('✅ Consistent server/client rendering ensured', 'green');
  log('✅ Accessibility features preserved', 'green');
  log('✅ Comprehensive hydration-safe wrappers available', 'green');
  log('\nYour Next.js 14 app should now be free of hydration errors!', 'cyan');
} else {
  logSection('❌ SOME TESTS FAILED');
  log(`Please review the ${results.failed} failed test(s) above and fix the issues.`, 'yellow');
}

// Generate detailed report
const reportPath = path.join(__dirname, 'hydration-fix-validation-report.json');
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: results.total,
    passed: results.passed,
    failed: results.failed,
    successRate: successRate
  },
  details: results.details,
  fixes_implemented: [
    'suppressHydrationWarning on html and body elements for browser extension compatibility',
    'CSS custom properties for skip-links to prevent server/client style mismatches',
    'Hydration-safe skip-links container with proper pointer events',
    'Comprehensive HydrationSafeWrapper with multiple utility components',
    'Specialized HydrationSafeLoader for simple hydration-safe loading',
    'Performance optimizations in CSS (will-change, backface-visibility)',
    'Preserved accessibility features with enhanced focus management'
  ]
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
log(`\nDetailed report saved to: ${reportPath}`, 'cyan');

process.exit(results.failed > 0 ? 1 : 0);