# Comprehensive Navigation & Table Visibility Test Report

**Generated:** 2025-08-20T20:57:40.254Z
**Duration:** 9.74 seconds

## Test Summary

- **Total Test Suites:** 5
- **Passed:** 0 ✅
- **Failed:** 5 ❌
- **Critical Failures:** 2 🔥
- **Production Ready:** NO ❌

## Test Suite Results

### Navigation Cycling Bug Tests
- **Status:** ❌ FAILED
- **Priority:** 🔥 CRITICAL
- **Duration:** 1431ms
- **File:** `comprehensive-navigation-validation.test.tsx`

**Error:** Command failed: npx jest comprehensive-navigation-validation.test.tsx --verbose --no-cache --detectOpenHandles --forceExit
FAIL __tests__/comprehensive-navigation-validation.test.tsx
  ● Test suite failed to run

    Cannot find module './__tests__/utils/testHelpers' from 'jest.setup.enhanced.js'

      186 |     const pass = received >= floor && received <= ceiling;
      187 |     if (pass) {
    > 188 |       return {
          |               ^
      189 |         message: () =>
      190 |           `expected ${received} not to be within range ${floor} - ${ceiling}`,
      191 |         pass: true,

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/index.js:863:11)
      at Object.<anonymous> (jest.setup.enhanced.js:188:22)

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        0.386 s
Ran all test suites matching comprehensive-navigation-validation.test.tsx.


### Table Visibility & Layout Tests
- **Status:** ❌ FAILED
- **Priority:** ⚠️ HIGH
- **Duration:** 844ms
- **File:** `table-visibility-layout.test.tsx`

**Error:** Command failed: npx jest table-visibility-layout.test.tsx --verbose --no-cache --detectOpenHandles --forceExit
FAIL __tests__/table-visibility-layout.test.tsx
  ● Test suite failed to run

    Cannot find module './__tests__/utils/testHelpers' from 'jest.setup.enhanced.js'

      186 |     const pass = received >= floor && received <= ceiling;
      187 |     if (pass) {
    > 188 |       return {
          |               ^
      189 |         message: () =>
      190 |           `expected ${received} not to be within range ${floor} - ${ceiling}`,
      191 |         pass: true,

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/index.js:863:11)
      at Object.<anonymous> (jest.setup.enhanced.js:188:22)

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        0.218 s
Ran all test suites matching table-visibility-layout.test.tsx.


### UI Polish & Accessibility Tests
- **Status:** ❌ FAILED
- **Priority:** ⚠️ HIGH
- **Duration:** 803ms
- **File:** `ui-polish-accessibility.test.tsx`

**Error:** Command failed: npx jest ui-polish-accessibility.test.tsx --verbose --no-cache --detectOpenHandles --forceExit
FAIL __tests__/ui-polish-accessibility.test.tsx
  ● Test suite failed to run

    Cannot find module './__tests__/utils/testHelpers' from 'jest.setup.enhanced.js'

      186 |     const pass = received >= floor && received <= ceiling;
      187 |     if (pass) {
    > 188 |       return {
          |               ^
      189 |         message: () =>
      190 |           `expected ${received} not to be within range ${floor} - ${ceiling}`,
      191 |         pass: true,

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/index.js:863:11)
      at Object.<anonymous> (jest.setup.enhanced.js:188:22)

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        0.214 s
Ran all test suites matching ui-polish-accessibility.test.tsx.


### Core Functionality Regression Tests
- **Status:** ❌ FAILED
- **Priority:** 🔥 CRITICAL
- **Duration:** 841ms
- **File:** `core-functionality-regression.test.tsx`

**Error:** Command failed: npx jest core-functionality-regression.test.tsx --verbose --no-cache --detectOpenHandles --forceExit
FAIL __tests__/core-functionality-regression.test.tsx
  ● Test suite failed to run

    Cannot find module './__tests__/utils/testHelpers' from 'jest.setup.enhanced.js'

      186 |     const pass = received >= floor && received <= ceiling;
      187 |     if (pass) {
    > 188 |       return {
          |               ^
      189 |         message: () =>
      190 |           `expected ${received} not to be within range ${floor} - ${ceiling}`,
      191 |         pass: true,

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/index.js:863:11)
      at Object.<anonymous> (jest.setup.enhanced.js:188:22)

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        0.229 s
Ran all test suites matching core-functionality-regression.test.tsx.


### Performance & Stability Tests
- **Status:** ❌ FAILED
- **Priority:** ⚠️ HIGH
- **Duration:** 807ms
- **File:** `performance-stability.test.tsx`

**Error:** Command failed: npx jest performance-stability.test.tsx --verbose --no-cache --detectOpenHandles --forceExit
FAIL __tests__/performance-stability.test.tsx
  ● Test suite failed to run

    Cannot find module './__tests__/utils/testHelpers' from 'jest.setup.enhanced.js'

      186 |     const pass = received >= floor && received <= ceiling;
      187 |     if (pass) {
    > 188 |       return {
          |               ^
      189 |         message: () =>
      190 |           `expected ${received} not to be within range ${floor} - ${ceiling}`,
      191 |         pass: true,

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/index.js:863:11)
      at Object.<anonymous> (jest.setup.enhanced.js:188:22)

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        0.217 s
Ran all test suites matching performance-stability.test.tsx.


## Recommendations

🔥 **CRITICAL:** 2 CRITICAL test failures must be resolved before production deployment
   - Affected suites: Navigation Cycling Bug Tests, Core Functionality Regression Tests

⚠️ **HIGH:** 5 test suites failed - review and fix issues
   - Affected suites: Navigation Cycling Bug Tests, Table Visibility & Layout Tests, UI Polish & Accessibility Tests, Core Functionality Regression Tests, Performance & Stability Tests

