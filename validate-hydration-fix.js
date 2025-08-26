/**
 * Hydration Mismatch Fix Validation Script
 * 
 * This script validates that the hydration mismatch fixes are properly implemented
 * by checking for consistency between Suspense fallbacks and component loading states.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Hydration Mismatch Fixes...\n');

const issues = [];
const fixed = [];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function readFileContent(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error.message);
    return null;
  }
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    fixed.push(`✅ ${description} exists`);
    return true;
  } else {
    issues.push(`❌ ${description} not found at ${filePath}`);
    return false;
  }
}

// =============================================================================
// VALIDATION CHECKS
// =============================================================================

console.log('📋 Running Hydration Fix Validation Checks...\n');

// Check 1: LoadingState component exists and is properly implemented
const loadingStatePath = path.join(process.cwd(), 'src/components/LoadingState.tsx');
if (checkFileExists(loadingStatePath, 'LoadingState component')) {
  const loadingStateContent = readFileContent(loadingStatePath);
  
  if (loadingStateContent) {
    // Check for animate-pulse
    if (loadingStateContent.includes('animate-pulse')) {
      fixed.push('✅ LoadingState component uses animate-pulse');
    } else {
      issues.push('❌ LoadingState component missing animate-pulse animation');
    }
    
    // Check for consistent structure
    if (loadingStateContent.includes('min-h-screen bg-gray-50') && 
        loadingStateContent.includes('bg-white rounded-lg p-8 shadow-md')) {
      fixed.push('✅ LoadingState has consistent full-page structure');
    } else {
      issues.push('❌ LoadingState missing consistent full-page structure');
    }
    
    // Check for proper TypeScript props
    if (loadingStateContent.includes('interface LoadingStateProps') && 
        loadingStateContent.includes('testId?:')) {
      fixed.push('✅ LoadingState has proper TypeScript interface with testId');
    } else {
      issues.push('❌ LoadingState missing proper TypeScript interface');
    }
  }
}

// Check 2: page.tsx imports LoadingState
const pagePath = path.join(process.cwd(), 'src/app/page.tsx');
if (checkFileExists(pagePath, 'Main page component')) {
  const pageContent = readFileContent(pagePath);
  
  if (pageContent) {
    // Check for LoadingState import
    if (pageContent.includes("import LoadingState from '@/components/LoadingState'")) {
      fixed.push('✅ page.tsx correctly imports LoadingState');
    } else {
      issues.push('❌ page.tsx missing LoadingState import');
    }
    
    // Check Suspense fallback uses LoadingState
    const suspensePattern = /<Suspense\s+fallback=\{<LoadingState[^>]*\/?>?\}/;
    if (suspensePattern.test(pageContent)) {
      fixed.push('✅ Suspense fallback uses LoadingState component');
    } else {
      // Check for old problematic pattern
      if (pageContent.includes('<Suspense fallback={') && 
          pageContent.includes('min-h-screen bg-gray-50')) {
        issues.push('❌ Suspense fallback still uses inline HTML instead of LoadingState');
      } else {
        issues.push('❌ Could not verify Suspense fallback implementation');
      }
    }
    
    // Check component loading state uses LoadingState
    if (pageContent.includes('return <LoadingState') && 
        pageContent.includes('testId="team-members-loading"')) {
      fixed.push('✅ Component loading state uses LoadingState with testId');
    } else {
      if (pageContent.includes('animate-pulse') && 
          pageContent.includes('h-8 bg-gray-200 rounded mb-4')) {
        issues.push('❌ Component still uses inline loading HTML instead of LoadingState');
      } else {
        issues.push('❌ Could not verify component loading state implementation');
      }
    }
    
    // Check for removal of duplicate/inconsistent loading HTML
    const inlineLoadingPattern = /<div[^>]*className="[^"]*animate-pulse[^"]*"[^>]*>\s*<div[^>]*className="h-8 bg-gray-200 rounded mb-4"/;
    if (!inlineLoadingPattern.test(pageContent)) {
      fixed.push('✅ No duplicate inline loading HTML found');
    } else {
      issues.push('❌ Found duplicate inline loading HTML that should use LoadingState');
    }
  }
}

// Check 3: Layout.tsx skip links (should already be properly implemented)
const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
if (checkFileExists(layoutPath, 'Root layout component')) {
  const layoutContent = readFileContent(layoutPath);
  
  if (layoutContent) {
    // Check skip links use CSS classes instead of inline styles
    const skipLinkPattern = /<a[^>]*className="skip-link"[^>]*>/g;
    const skipLinks = layoutContent.match(skipLinkPattern);
    
    if (skipLinks) {
      const hasInlineStyles = skipLinks.some(link => link.includes('style='));
      if (!hasInlineStyles) {
        fixed.push('✅ Skip links use CSS classes without inline styles');
      } else {
        issues.push('❌ Skip links still contain inline styles');
      }
    }
    
    // Check for suppressHydrationWarning on skip links container
    if (layoutContent.includes('skip-links-container') && 
        layoutContent.includes('suppressHydrationWarning')) {
      fixed.push('✅ Skip links container has suppressHydrationWarning');
    } else {
      issues.push('❌ Skip links container missing suppressHydrationWarning');
    }
  }
}

// Check 4: globals.css has skip-link styles with CSS custom properties
const globalsPath = path.join(process.cwd(), 'src/app/globals.css');
if (checkFileExists(globalsPath, 'Global CSS file')) {
  const globalsContent = readFileContent(globalsPath);
  
  if (globalsContent) {
    if (globalsContent.includes('.skip-link') && 
        globalsContent.includes('var(--skip-link-')) {
      fixed.push('✅ globals.css has skip-link styles with CSS custom properties');
    } else {
      issues.push('❌ globals.css missing skip-link styles or CSS custom properties');
    }
    
    // Check for CSS custom property definitions
    if (globalsContent.includes('--skip-link-hide-offset:') && 
        globalsContent.includes('--skip-link-show-offset:')) {
      fixed.push('✅ CSS custom properties for skip-link positioning are defined');
    } else {
      issues.push('❌ Missing CSS custom properties for skip-link positioning');
    }
  }
}

// =============================================================================
// ADVANCED VALIDATION CHECKS
// =============================================================================

console.log('🔬 Running Advanced Validation Checks...\n');

// Check for potential hydration issues in other files
const potentialIssues = [];

const checkFiles = [
  'src/components/TeamSelectionScreen.tsx',
  'src/components/PersonalDashboard.tsx', 
  'src/components/ManagerDashboard.tsx'
];

checkFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const content = readFileContent(filePath);
  
  if (content) {
    // Check for Date.now(), Math.random(), or other non-deterministic functions
    const nonDeterministicPattern = /(Date\.now\(\)|Math\.random\(\)|new Date\(\)\.getTime\(\))/g;
    const matches = content.match(nonDeterministicPattern);
    
    if (matches) {
      potentialIssues.push(`⚠️  ${file} uses non-deterministic functions: ${matches.join(', ')}`);
    }
    
    // Check for typeof window checks without proper hydration safety
    if (content.includes('typeof window') && 
        !content.includes('suppressHydrationWarning') &&
        !content.includes('useHydration') &&
        !content.includes('ClientOnly')) {
      potentialIssues.push(`⚠️  ${file} has typeof window check without hydration safety`);
    }
  }
});

// =============================================================================
// RESULTS REPORTING
// =============================================================================

console.log('📊 Validation Results:\n');

console.log('✅ Fixed Items:');
fixed.forEach(item => console.log(`  ${item}`));

if (issues.length > 0) {
  console.log('\n❌ Issues Found:');
  issues.forEach(issue => console.log(`  ${issue}`));
}

if (potentialIssues.length > 0) {
  console.log('\n⚠️  Potential Issues (Review Required):');
  potentialIssues.forEach(issue => console.log(`  ${issue}`));
}

// =============================================================================
// SUMMARY AND NEXT STEPS
// =============================================================================

console.log('\n📋 Summary:');
console.log(`  ✅ Fixed: ${fixed.length} items`);
console.log(`  ❌ Issues: ${issues.length} items`);
console.log(`  ⚠️  Potential: ${potentialIssues.length} items`);

if (issues.length === 0) {
  console.log('\n🎉 All critical hydration fixes appear to be in place!');
  console.log('\n📋 Final Steps:');
  console.log('1. Clear Next.js cache: rm -rf .next');
  console.log('2. Rebuild application: npm run build');
  console.log('3. Start development server: npm run dev');
  console.log('4. Check browser console for hydration warnings');
  console.log('5. Test skip-link functionality (Tab key)');
  
  if (potentialIssues.length > 0) {
    console.log('\n⚠️  Please review potential issues listed above for additional optimizations.');
  }
} else {
  console.log('\n🔧 Issues need to be fixed:');
  console.log('1. Address the issues listed above');
  console.log('2. Re-run this validation script');
  console.log('3. Once all issues are resolved, clear cache and rebuild');
}

// =============================================================================
// TESTING RECOMMENDATIONS
// =============================================================================

console.log('\n🧪 Testing Recommendations:');
console.log('1. Open browser DevTools Console');
console.log('2. Navigate to the application');
console.log('3. Look for "Hydration failed" or "Text content does not match" errors');
console.log('4. Test skip-links with Tab key navigation');
console.log('5. Test loading states by simulating slow network in DevTools');
console.log('6. Verify loading animations are consistent');

// Save detailed results to file
const detailedResults = {
  timestamp: new Date().toISOString(),
  summary: {
    fixed: fixed.length,
    issues: issues.length,
    potential: potentialIssues.length
  },
  fixed,
  issues,
  potentialIssues,
  recommendations: [
    'Clear Next.js cache with: rm -rf .next',
    'Rebuild with: npm run build', 
    'Test in browser DevTools Console',
    'Verify skip-link accessibility',
    'Check loading state consistency'
  ]
};

try {
  fs.writeFileSync(
    path.join(process.cwd(), 'hydration-fix-validation-report.json'),
    JSON.stringify(detailedResults, null, 2)
  );
  console.log('\n📄 Detailed report saved to: hydration-fix-validation-report.json');
} catch (error) {
  console.warn('Warning: Could not save detailed report:', error.message);
}

console.log('\n✨ Validation complete!');

// Exit with appropriate code
process.exit(issues.length > 0 ? 1 : 0);