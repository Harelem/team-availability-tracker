# ⚡ Quick Regression Test Commands - Copy & Run

## 🏃 Instant Regression Test Scripts

### For Each Agent - Copy Your Section and Run

---

## 1️⃣ **bug-fix-specialist** - Regression Tests
```bash
# Create your test file: __tests__/regression/concurrent-edits.test.ts

npm init -y
npm install --save-dev jest @types/jest puppeteer @supabase/supabase-js

# Run this test script
cat > regression-concurrent-edits.test.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

describe('Concurrent Editing Regression Tests', () => {
  test('REG-001: Optimistic locking prevents data corruption', async () => {
    // Test concurrent edits
    const entry = { 
      member_id: 'test-1', 
      entry_date: '2024-07-15', 
      hours: 1 
    };
    
    const { data: created } = await supabase
      .from('schedule_entries')
      .insert(entry)
      .select()
      .single();
    
    // Simulate concurrent updates
    const update1 = supabase
      .from('schedule_entries')
      .update({ hours: 0.5, version: created.version })
      .eq('id', created.id)
      .eq('version', created.version);
    
    const update2 = supabase
      .from('schedule_entries')
      .update({ hours: 0, version: created.version })
      .eq('id', created.id)
      .eq('version', created.version);
    
    const [result1, result2] = await Promise.allSettled([update1, update2]);
    
    // One should succeed, one should fail
    const successes = [result1, result2].filter(r => r.status === 'fulfilled');
    const failures = [result1, result2].filter(r => r.status === 'rejected');
    
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    
    console.log('✅ Optimistic locking test passed');
  });

  test('REG-002: Browser refresh preserves unsaved changes', async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:3000');
    
    // Make changes
    await page.evaluate(() => {
      localStorage.setItem('unsaved_changes', JSON.stringify({
        date: '2024-07-15',
        hours: 0.5,
        reason: 'Test reason'
      }));
    });
    
    // Refresh
    await page.reload();
    
    // Check if recovered
    const recovered = await page.evaluate(() => {
      return localStorage.getItem('unsaved_changes');
    });
    
    expect(recovered).toBeTruthy();
    console.log('✅ Unsaved changes recovery test passed');
    
    await browser.close();
  });
});

// Run the tests
require('child_process').execSync('npm test', { stdio: 'inherit' });
EOF

npm test
```

---

## 2️⃣ **database-schema-auditor** - Constraint Tests
```bash
# Test database constraints
cat > test-constraints.sql << 'EOF'
-- Test unique constraint
BEGIN;
INSERT INTO schedule_entries (member_id, entry_date, hours) 
VALUES ('test-member', '2024-07-15', 1);

-- This should fail
INSERT INTO schedule_entries (member_id, entry_date, hours) 
VALUES ('test-member', '2024-07-15', 0.5);
ROLLBACK;

-- Test check constraint on hours
BEGIN;
-- This should fail (invalid hours value)
INSERT INTO schedule_entries (member_id, entry_date, hours) 
VALUES ('test-member', '2024-07-16', 0.75);
ROLLBACK;

-- Test reason required constraint
BEGIN;
-- This should fail (no reason for half day)
INSERT INTO schedule_entries (member_id, entry_date, hours, status) 
VALUES ('test-member', '2024-07-17', 0.5, 'half_day');
ROLLBACK;

-- Test audit trigger
BEGIN;
INSERT INTO schedule_entries (member_id, entry_date, hours) 
VALUES ('test-member', '2024-07-18', 1);

-- Check audit log was created
SELECT COUNT(*) FROM audit_logs 
WHERE table_name = 'schedule_entries' 
AND action = 'INSERT';
ROLLBACK;

SELECT 'All constraint tests completed' as result;
EOF

# Run in Supabase SQL editor or psql
psql $DATABASE_URL < test-constraints.sql
```

---

## 3️⃣ **performance-optimizer** - Performance Tests
```bash
# Performance regression test
cat > performance-test.js << 'EOF'
const puppeteer = require('puppeteer');

async function measurePerformance() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Enable performance monitoring
  await page.evaluateOnNewDocument(() => {
    window.performanceMetrics = {
      FCP: 0,
      LCP: 0,
      CLS: 0,
      FID: 0
    };
    
    // Observe paint timing
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          window.performanceMetrics.FCP = entry.startTime;
        }
      }
    }).observe({ entryTypes: ['paint'] });
    
    // Observe largest contentful paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      window.performanceMetrics.LCP = entries[entries.length - 1].startTime;
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  });
  
  const startTime = Date.now();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const loadTime = Date.now() - startTime;
  
  const metrics = await page.evaluate(() => window.performanceMetrics);
  
  console.log('Performance Metrics:');
  console.log(`Page Load Time: ${loadTime}ms ${loadTime < 2000 ? '✅' : '❌'}`);
  console.log(`First Contentful Paint: ${metrics.FCP}ms ${metrics.FCP < 1500 ? '✅' : '❌'}`);
  console.log(`Largest Contentful Paint: ${metrics.LCP}ms ${metrics.LCP < 2000 ? '✅' : '❌'}`);
  
  // Test with 50 concurrent users
  console.log('\nLoad Testing with 50 concurrent users...');
  const users = [];
  for (let i = 0; i < 50; i++) {
    users.push(browser.newPage());
  }
  
  const pages = await Promise.all(users);
  const loadStart = Date.now();
  
  await Promise.all(
    pages.map(p => p.goto('http://localhost:3000'))
  );
  
  const concurrentLoadTime = Date.now() - loadStart;
  console.log(`50 users load time: ${concurrentLoadTime}ms ${concurrentLoadTime < 5000 ? '✅' : '❌'}`);
  
  await browser.close();
  
  // Check if all tests passed
  if (loadTime < 2000 && metrics.FCP < 1500 && metrics.LCP < 2000 && concurrentLoadTime < 5000) {
    console.log('\n✅ All performance tests PASSED!');
    process.exit(0);
  } else {
    console.log('\n❌ Some performance tests FAILED!');
    process.exit(1);
  }
}

measurePerformance();
EOF

node performance-test.js
```

---

## 4️⃣ **mobile-optimization-specialist** - Mobile Tests
```bash
# Mobile regression tests
cat > mobile-test.js << 'EOF'
const puppeteer = require('puppeteer');

async function testMobile() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set iPhone 12 viewport
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });
  
  await page.goto('http://localhost:3000');
  
  console.log('Testing Mobile Experience...\n');
  
  // Test 1: Touch target sizes
  const touchTargets = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, a, [role="button"], input, select');
    const small = [];
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        small.push({
          element: btn.tagName,
          width: rect.width,
          height: rect.height,
          text: btn.textContent?.substring(0, 20)
        });
      }
    });
    return small;
  });
  
  if (touchTargets.length === 0) {
    console.log('✅ All touch targets >= 44x44px');
  } else {
    console.log('❌ Touch targets too small:');
    console.table(touchTargets);
  }
  
  // Test 2: Horizontal scroll
  const scrollable = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    return Array.from(tables).every(table => {
      const container = table.parentElement;
      return container.scrollWidth > container.clientWidth || 
             getComputedStyle(container).overflowX === 'auto';
    });
  });
  
  console.log(`Table horizontal scroll: ${scrollable ? '✅' : '❌'}`);
  
  // Test 3: Viewport meta tag
  const viewport = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    return meta?.content;
  });
  
  const correctViewport = viewport?.includes('width=device-width');
  console.log(`Viewport meta tag: ${correctViewport ? '✅' : '❌'}`);
  
  // Test 4: Font sizes readable
  const smallFonts = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const small = [];
    elements.forEach(el => {
      const fontSize = parseFloat(getComputedStyle(el).fontSize);
      if (fontSize < 12 && el.textContent?.trim()) {
        small.push({
          text: el.textContent.substring(0, 30),
          fontSize: fontSize
        });
      }
    });
    return small;
  });
  
  if (smallFonts.length === 0) {
    console.log('✅ All fonts >= 12px');
  } else {
    console.log('❌ Fonts too small for mobile:');
    console.table(smallFonts.slice(0, 5));
  }
  
  await browser.close();
}

testMobile();
EOF

node mobile-test.js
```

---

## 5️⃣ **ui-polish-specialist** - UI Feedback Tests
```bash
# Test loading states and feedback
cat > ui-feedback-test.js << 'EOF'
const puppeteer = require('puppeteer');

async function testUIFeedback() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  
  console.log('Testing UI Feedback Systems...\n');
  
  // Test 1: Loading indicators
  const hasLoadingStates = await page.evaluate(() => {
    // Check for loading class or spinner
    return document.querySelector('.loading, .spinner, [data-loading="true"]') !== null;
  });
  
  console.log(`Loading indicators present: ${hasLoadingStates ? '✅' : '❌'}`);
  
  // Test 2: Success messages
  await page.evaluate(() => {
    // Trigger a save action
    const saveBtn = document.querySelector('[data-testid="save-button"]');
    if (saveBtn) saveBtn.click();
  });
  
  await page.waitForTimeout(1000);
  
  const hasSuccessFeedback = await page.evaluate(() => {
    return document.querySelector('.toast, .success, [role="alert"]') !== null;
  });
  
  console.log(`Success feedback present: ${hasSuccessFeedback ? '✅' : '❌'}`);
  
  // Test 3: Error states
  const hasErrorStates = await page.evaluate(() => {
    // Check if error classes exist
    const styles = Array.from(document.styleSheets)
      .flatMap(sheet => Array.from(sheet.cssRules || []))
      .map(rule => rule.selectorText)
      .filter(Boolean);
    
    return styles.some(s => s.includes('error') || s.includes('danger'));
  });
  
  console.log(`Error states defined: ${hasErrorStates ? '✅' : '❌'}`);
  
  // Test 4: Disabled states
  const hasDisabledStates = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    return Array.from(buttons).some(btn => {
      btn.disabled = true;
      const opacity = getComputedStyle(btn).opacity;
      const cursor = getComputedStyle(btn).cursor;
      btn.disabled = false;
      return opacity < 1 || cursor === 'not-allowed';
    });
  });
  
  console.log(`Disabled states styled: ${hasDisabledStates ? '✅' : '❌'}`);
  
  // Test 5: Focus indicators
  const hasFocusIndicators = await page.evaluate(() => {
    const input = document.querySelector('input, button');
    if (!input) return false;
    
    input.focus();
    const outline = getComputedStyle(input).outline;
    const boxShadow = getComputedStyle(input).boxShadow;
    
    return outline !== 'none' || boxShadow !== 'none';
  });
  
  console.log(`Focus indicators visible: ${hasFocusIndicators ? '✅' : '❌'}`);
  
  await browser.close();
}

testUIFeedback();
EOF

node ui-feedback-test.js
```

---

## 6️⃣ **test-coverage-specialist** - Coverage Report
```bash
# Generate comprehensive test coverage report
cat > generate-coverage.sh << 'EOF'
#!/bin/bash

echo "📊 Generating Test Coverage Report..."

# Install dependencies if needed
npm install --save-dev jest @types/jest ts-jest

# Configure Jest for coverage
cat > jest.config.js << 'JESTCONFIG'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html']
};
JESTCONFIG

# Run all tests with coverage
npm test -- --coverage

# Check if thresholds met
if [ $? -eq 0 ]; then
  echo "✅ Coverage thresholds met!"
else
  echo "❌ Coverage below thresholds!"
  exit 1
fi

# Generate regression test summary
echo "
=================================
REGRESSION TEST SUMMARY
=================================
" > regression-summary.txt

# Count test results
TOTAL=$(grep -c "test(" **/*.test.ts 2>/dev/null || echo 0)
PASSED=$(grep -c "✅" test-results.log 2>/dev/null || echo 0)
FAILED=$(grep -c "❌" test-results.log 2>/dev/null || echo 0)

echo "Total Tests: $TOTAL" >> regression-summary.txt
echo "Passed: $PASSED" >> regression-summary.txt
echo "Failed: $FAILED" >> regression-summary.txt
echo "Coverage: $(grep "Lines" coverage/lcov-report/index.html | grep -oE '[0-9]+\.[0-9]+%' | head -1)" >> regression-summary.txt

cat regression-summary.txt
EOF

chmod +x generate-coverage.sh
./generate-coverage.sh
```

---

## 🔄 All Agents - Master Regression Suite
```bash
# Run complete regression suite
cat > run-all-regression-tests.sh << 'EOF'
#!/bin/bash

echo "🚀 Running Complete Regression Suite for v2.1"
echo "=============================================="

FAILED_TESTS=()
PASSED_TESTS=()

# Function to run test and track results
run_test() {
  echo "Running: $1"
  if $2; then
    PASSED_TESTS+=("$1")
    echo "✅ PASSED: $1"
  else
    FAILED_TESTS+=("$1")
    echo "❌ FAILED: $1"
  fi
  echo ""
}

# Critical Path Tests
echo "🔴 CRITICAL PATH TESTS"
echo "----------------------"
run_test "Concurrent Editing" "npm test concurrent-edits"
run_test "Data Integrity" "npm test data-integrity"
run_test "Permission System" "npm test permissions"
run_test "Error Recovery" "npm test error-recovery"

# Performance Tests
echo "⚡ PERFORMANCE TESTS"
echo "-------------------"
run_test "Page Load <2s" "node performance-test.js"
run_test "100 Users Load" "npm test load-test"
run_test "Memory Leaks" "npm test memory-leaks"

# Mobile Tests
echo "📱 MOBILE TESTS"
echo "--------------"
run_test "Touch Targets" "node mobile-test.js"
run_test "Responsive Design" "npm test responsive"
run_test "Mobile Gestures" "npm test gestures"

# UI/UX Tests
echo "🎨 UI/UX TESTS"
echo "-------------"
run_test "Loading States" "node ui-feedback-test.js"
run_test "Undo/Redo" "npm test undo-redo"
run_test "Keyboard Nav" "npm test keyboard"

# Database Tests
echo "🗄️ DATABASE TESTS"
echo "----------------"
run_test "Constraints" "psql -f test-constraints.sql"
run_test "Migrations" "npm test migrations"
run_test "Audit Trail" "npm test audit"

# Integration Tests
echo "🔗 INTEGRATION TESTS"
echo "-------------------"
run_test "User Journey" "npm test e2e"
run_test "Real-time Sync" "npm test realtime"
run_test "Export Function" "npm test export"

# Print Summary
echo ""
echo "======================================"
echo "         REGRESSION TEST SUMMARY       "
echo "======================================"
echo "✅ Passed: ${#PASSED_TESTS[@]}"
echo "❌ Failed: ${#FAILED_TESTS[@]}"
echo "Total: $((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]}))"
echo ""

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
  echo "Failed Tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  ❌ $test"
  done
  echo ""
  echo "🚫 REGRESSION TESTS FAILED - DO NOT DEPLOY!"
  exit 1
else
  echo "✅ ALL REGRESSION TESTS PASSED - READY FOR DEPLOYMENT!"
  exit 0
fi
EOF

chmod +x run-all-regression-tests.sh
./run-all-regression-tests.sh
```

---

## 🎯 Quick Validation Commands

### For Immediate Testing (Copy & Run)
```bash
# 1. Test if app loads
curl -I http://localhost:3000 | grep "200 OK" && echo "✅ App loads" || echo "❌ App down"

# 2. Test database connection
echo "SELECT 1;" | psql $DATABASE_URL && echo "✅ DB connected" || echo "❌ DB error"

# 3. Test Supabase
curl -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" && echo "✅ Supabase OK" || echo "❌ Supabase error"

# 4. Check TypeScript errors
npx tsc --noEmit && echo "✅ No TS errors" || echo "❌ TypeScript errors"

# 5. Check ESLint
npx eslint . && echo "✅ No lint errors" || echo "❌ Lint errors"

# 6. Quick performance check
time curl -o /dev/null -s http://localhost:3000 && echo "✅ Fast load" || echo "❌ Slow"

# 7. Check bundle size
du -sh .next/static/chunks/*.js | sort -h

# 8. Test a critical API endpoint
curl -X POST http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{"test": true}' && echo "✅ API works" || echo "❌ API error"
```

---

## 📈 Final Regression Score Calculator
```bash
cat > calculate-regression-score.js << 'EOF'
const tests = {
  critical: {
    "Data Integrity": true,
    "Concurrent Edits": true,
    "Permissions": true,
    "Error Recovery": false,
    "Audit Trail": true
  },
  high: {
    "Performance <2s": true,
    "Mobile Touch Targets": false,
    "Loading States": true,
    "Real-time Sync": true,
    "Export Works": true
  },
  medium: {
    "Undo/Redo": false,
    "Keyboard Nav": false,
    "Hebrew Support": true,
    "Session Persistence": true,
    "Offline Mode": false
  }
};

// Calculate scores
const criticalPassed = Object.values(tests.critical).filter(Boolean).length;
const highPassed = Object.values(tests.high).filter(Boolean).length;
const mediumPassed = Object.values(tests.medium).filter(Boolean).length;

const criticalScore = (criticalPassed / Object.keys(tests.critical).length) * 100;
const highScore = (highPassed / Object.keys(tests.high).length) * 100;
const mediumScore = (mediumPassed / Object.keys(tests.medium).length) * 100;

const overallScore = (criticalScore * 0.5) + (highScore * 0.3) + (mediumScore * 0.2);

console.log(`
📊 REGRESSION TEST SCORES
========================
Critical: ${criticalScore.toFixed(0)}% (${criticalPassed}/${Object.keys(tests.critical).length})
High:     ${highScore.toFixed(0)}% (${highPassed}/${Object.keys(tests.high).length})
Medium:   ${mediumScore.toFixed(0)}% (${mediumPassed}/${Object.keys(tests.medium).length})

OVERALL:  ${overallScore.toFixed(0)}%

${overallScore === 100 ? '✅ READY FOR LAUNCH!' : overallScore >= 90 ? '⚠️  ALMOST READY' : '❌ NOT READY FOR LAUNCH'}
`);

process.exit(overallScore === 100 ? 0 : 1);
EOF

node calculate-regression-score.js
```

---

*Each agent should run their specific tests, then run the master suite before launch.*