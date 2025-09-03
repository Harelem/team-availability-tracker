#!/usr/bin/env node

/**
 * Verify that console error fixes have been applied
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying console error fixes...\n');

const checks = [
  {
    name: 'Hydration fix in page.tsx',
    file: 'src/app/page.tsx',
    check: (content) => !content.includes('<div suppressHydrationWarning><LoadingState'),
    success: '✅ Hydration wrapper removed from LoadingState',
    failure: '❌ Hydration issue still present'
  },
  {
    name: 'COO auth endpoint exists',
    file: 'src/app/api/auth/check-coo/route.ts',
    check: (content) => content.includes('export async function GET()'),
    success: '✅ COO auth endpoint created',
    failure: '❌ COO auth endpoint missing'
  },
  {
    name: 'PWA icons exist',
    file: 'public/icons/icon-144x144.png',
    check: () => true, // Just check existence
    success: '✅ PWA icons created',
    failure: '❌ PWA icons missing'
  },
  {
    name: 'Logger utility exists',
    file: 'src/lib/logger.ts',
    check: (content) => content.includes('class Logger'),
    success: '✅ Logger utility created',
    failure: '❌ Logger utility missing'
  },
  {
    name: 'Performance monitor optimized',
    file: 'public/scripts/performance-monitor.js',
    check: (content) => content.includes('if (clsValue > 0.1)'),
    success: '✅ Performance monitor optimized',
    failure: '❌ Performance monitor not optimized'
  }
];

let allPassed = true;

checks.forEach(({ name, file, check, success, failure }) => {
  const filePath = path.join(__dirname, '..', file);
  
  try {
    const exists = fs.existsSync(filePath);
    if (!exists) {
      console.log(`${failure} - File not found: ${file}`);
      allPassed = false;
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    if (check(content)) {
      console.log(success);
    } else {
      console.log(failure);
      allPassed = false;
    }
  } catch (error) {
    console.log(`${failure} - Error checking ${file}: ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ All fixes verified successfully!');
  console.log('\nNext steps:');
  console.log('1. Run "npm run dev" to test the application');
  console.log('2. Check browser console for reduced errors');
  console.log('3. Verify COO dashboard loads without 404 errors');
  console.log('4. Check that PWA icons load correctly');
} else {
  console.log('⚠️ Some fixes need attention');
  console.log('\nPlease review the failures above and apply the necessary fixes.');
}

console.log('\n📝 Environment variables for logging control:');
console.log('- NEXT_PUBLIC_LOG_LEVEL: Set to ERROR, WARN, INFO, DEBUG, or VERBOSE');
console.log('- NEXT_PUBLIC_LOG_MODULES: Comma-separated list of modules to log');
console.log('Example: NEXT_PUBLIC_LOG_LEVEL=ERROR npm run dev');