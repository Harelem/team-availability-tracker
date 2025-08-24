# Test Suite Documentation

This comprehensive test suite was created to ensure all previously fixed bugs remain resolved and to catch regressions early. It's based on the debug knowledge base and covers critical issues identified in Bug Reports #1-28.

## Quick Start

### Run All Tests
```bash
# Run comprehensive test suite
./tests/run-comprehensive-tests.js

# Run only critical tests
./tests/run-comprehensive-tests.js --critical-only

# Run mobile-specific tests only  
./tests/run-comprehensive-tests.js --mobile-only

# Run with verbose output
./tests/run-comprehensive-tests.js --verbose
```

### Manual Testing
```bash
# Follow manual testing checklist
open tests/manual-test-checklist.md
```

### Deployment Verification
```bash
# Verify deployment after changes
./scripts/verify-deployment.sh https://your-deployment-url.com
```

## Test Categories

### 🔴 Critical Tests (Must Pass)
- **Data Persistence Tests** - Ensures Bug Report #28 regression doesn't occur
- **Mobile Navigation Tests** - Prevents Bug Reports #10-15 issues
- **Authentication Tests** - Catches Bug Report #27 authentication failures

### 🟡 High Priority Tests  
- **Regression Suite** - Prevents previously fixed bugs from returning
- **Performance Tests** - Maintains mobile performance standards

### 🟢 Integration Tests
- **End-to-end Workflows** - Validates complete user journeys
- **Cross-browser Compatibility** - Ensures consistent experience

## Key Bug Patterns Tested

### Data Persistence (Bug Report #28)
❌ **Issue**: Data disappeared when switching between week/sprint views  
✅ **Test**: `/tests/schedule.test.ts` - Verifies single source of truth pattern

### Mobile Navigation (Bug Reports #10-15)  
❌ **Issue**: Hamburger menu conflicts, hydration errors, white screens  
✅ **Test**: Mobile test utilities + responsive tests

### Authentication (Bug Report #27)
❌ **Issue**: 401 errors, WebSocket failures, malformed connection strings  
✅ **Test**: Permission tests + real-time connection validation

### Touch Interactions (Bug Report #41)
❌ **Issue**: Navigation buttons not responding to touch on mobile  
✅ **Test**: Touch target validation + haptic feedback testing

### PWA Cache (Bug Report #40)  
❌ **Issue**: Mobile browsers stuck on old cached versions  
✅ **Test**: Service worker versioning + cache invalidation

## File Structure

```
tests/
├── README.md                    # This file
├── manual-test-checklist.md     # Step-by-step manual testing
├── schedule.test.ts             # Data persistence tests (Bug #28)
├── mobile-test-utils.ts         # Mobile testing utilities  
└── run-comprehensive-tests.js   # Test orchestration

scripts/
└── verify-deployment.sh         # Post-deployment validation

__tests__/
├── mobile/                      # Mobile-specific tests
├── regression/                  # Regression prevention  
├── performance/                 # Performance validation
└── integration/                 # End-to-end tests
```

## Testing Strategy

### 1. Automated Tests First
Run the automated suite to catch obvious regressions:
```bash
./tests/run-comprehensive-tests.js --critical-only
```

### 2. Mobile Device Testing  
Test on actual devices (not just browser DevTools):
- iPhone Safari (iOS 15+)
- Android Chrome
- Test hamburger menu, touch interactions, data persistence

### 3. Manual Workflow Testing
Follow the manual checklist for critical user workflows:
- Team selection and authentication
- Hour reporting and data persistence  
- View switching (week ↔ sprint)
- Manager functionality

### 4. Deployment Verification
After deployment, run automated checks:
```bash
./scripts/verify-deployment.sh https://your-app.com
```

## Debug Knowledge Base Integration

This test suite directly addresses issues from the debug knowledge base:

| Bug Report | Issue | Test Coverage |
|------------|-------|---------------|
| #28 | Data disappears between views | ✅ schedule.test.ts |
| #27 | Authentication 401 errors | ✅ permissions.test.ts |
| #25 | Navigation infinite loops | ✅ schedule.test.ts |
| #15 | Mobile navigation emergency | ✅ mobile-test-utils.ts |
| #14 | Hydration mismatch errors | ✅ mobile-test-utils.ts |
| #13 | Hamburger menu conflicts | ✅ mobile-test-utils.ts |
| #41 | Touch events not firing | ✅ mobile-test-utils.ts |
| #40 | PWA cache stuck on mobile | ✅ verify-deployment.sh |

## Common Issues and Solutions

### Test Failures

**Data Persistence Test Fails**
```bash
# Check for multiple data fetches in components
grep -r "useEffect.*navigationMode" src/components/
# Should find minimal results - view switching shouldn't trigger data refetch
```

**Mobile Tests Fail**
```bash
# Check touch target sizes
# All buttons should be minimum 44x44px
```

**Authentication Test Fails**  
```bash
# Check for 401 errors in browser console
# Verify WebSocket connection strings don't contain %0A
```

### Test Environment Issues

**Tests Won't Run**
```bash
# Install dependencies
npm install

# Clear Jest cache
npm test -- --clearCache
```

**Puppeteer Issues (deployment verification)**
```bash
# Install Puppeteer
npm install puppeteer

# For Linux systems, install Chrome dependencies
sudo apt-get install -y chromium-browser
```

## Continuous Integration

Add to your CI pipeline:

```yaml
# .github/workflows/testing-validation.yml
name: Comprehensive Testing
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: ./tests/run-comprehensive-tests.js --critical-only
      - run: npm test -- --coverage
```

## Contributing

When adding new features:

1. **Add corresponding tests** for new functionality
2. **Update manual checklist** if user workflows change  
3. **Review debug knowledge base** for similar past issues
4. **Test on mobile devices** before marking complete
5. **Run full test suite** before submitting PR

## Maintenance

### Monthly Tasks
- Review and update manual test checklist
- Verify mobile device compatibility matrix
- Update debug knowledge base with new patterns
- Check test execution times and optimize slow tests

### After Major Changes
- Run full test suite including integration tests
- Perform deployment verification on staging
- Test on actual mobile devices
- Update test documentation as needed

## Support

For test-related issues:
1. Check the debug knowledge base for similar patterns
2. Review test output for specific error messages
3. Run individual test suites to isolate issues
4. Test manually on actual devices to confirm automated test results

Remember: These tests are based on real production issues that affected users. Each test prevents a specific category of bugs from reoccurring.