# Design System Testing Suite

Comprehensive testing infrastructure for the Team Availability Tracker design system, ensuring component reliability, visual consistency, and performance across all use cases.

## 🏗️ Architecture Overview

```
__tests__/
├── components/ui/          # Unit tests for individual components
├── integration/            # Integration tests for component interactions
├── visual/                # Visual regression tests
├── performance/           # Performance and benchmark tests
├── setup/                 # Test configuration and utilities
├── config/                # Jest configuration files
└── artifacts/             # Test reports and metadata
```

## 🧪 Test Categories

### 1. Unit Tests (`components/ui/`)
**Purpose**: Test individual component functionality in isolation
- Component rendering with different props
- Event handling and user interactions
- State management and lifecycle methods
- Accessibility compliance
- Error boundary handling

**Example**:
```bash
npm run test:design-system unit
```

### 2. Integration Tests (`integration/`)
**Purpose**: Test component interactions and real-world workflows
- Multi-component scenarios (Modal + Form + Button)
- Theme integration across components
- Data table with sorting and filtering
- Mobile action sheet interactions
- Loading state transitions

**Example**:
```bash
npm run test:design-system integration
```

### 3. Visual Regression Tests (`visual/`)
**Purpose**: Prevent unintended visual changes to components
- Component snapshots in different states
- Theme variations (light/dark)
- Responsive breakpoint testing
- Error state appearances
- Animation and transition states

**Example**:
```bash
npm run test:design-system visual --update-snapshots
```

### 4. Performance Tests (`performance/`)
**Purpose**: Ensure components meet performance benchmarks
- Component render time benchmarking
- Memory usage monitoring
- Large dataset handling
- Animation performance
- Bundle size impact analysis

**Example**:
```bash
npm run test:design-system performance
```

## 🚀 Quick Start

### Running All Tests
```bash
# Run complete test suite
npm run test:design-system

# Run with coverage report
npm run test:design-system --coverage

# Run in watch mode
npm run test:design-system --watch
```

### Running Specific Categories
```bash
# Unit tests only
npm run test:design-system unit

# Integration tests with verbose output
npm run test:design-system integration --verbose

# Update visual snapshots
npm run test:design-system visual --update-snapshots

# Performance tests with parallel execution
npm run test:design-system performance --parallel
```

### CI/CD Integration
```bash
# Optimized for CI environments
npm run test:design-system --ci --bail --coverage
```

## 📋 Test Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:design-system": "node scripts/run-design-system-tests.js",
    "test:design-system:unit": "node scripts/run-design-system-tests.js unit",
    "test:design-system:integration": "node scripts/run-design-system-tests.js integration",
    "test:design-system:visual": "node scripts/run-design-system-tests.js visual",
    "test:design-system:performance": "node scripts/run-design-system-tests.js performance",
    "test:design-system:watch": "node scripts/run-design-system-tests.js --watch",
    "test:design-system:coverage": "node scripts/run-design-system-tests.js --coverage",
    "test:design-system:ci": "node scripts/run-design-system-tests.js --ci --bail --coverage"
  }
}
```

## 🔧 Configuration

### Jest Configuration
- **Location**: `__tests__/config/jest.design-system.config.js`
- **Features**: Multi-project setup, custom matchers, coverage thresholds
- **Environment**: jsdom with custom setup for design system testing

### Test Setup
- **Location**: `__tests__/setup/designSystemTestSetup.ts`
- **Features**: Custom test utilities, mocks, accessibility matchers
- **Utilities**: Viewport mocking, performance benchmarking, A11y helpers

### Global Setup/Teardown
- **Setup**: `__tests__/config/globalSetup.js` - Creates test directories, sets environment
- **Teardown**: `__tests__/config/globalTeardown.js` - Generates reports, cleanup

## 📊 Test Utilities

### Viewport Testing
```typescript
import { testUtils } from '../setup/designSystemTestSetup';

// Mock mobile viewport
testUtils.mockViewport(375, 667);

// Mock desktop viewport  
testUtils.mockViewport(1200, 800);
```

### Performance Benchmarking
```typescript
// Benchmark component rendering
const benchmark = testUtils.benchmarkRender(() => {
  render(<MyComponent />);
}, 100); // 100 iterations

expect(benchmark.average).toBeLessThan(10); // Less than 10ms
```

### Accessibility Testing
```typescript
// Check ARIA attributes
const ariaCheck = testUtils.a11y.hasProperAria(element);
expect(ariaCheck.hasLabel).toBe(true);

// Test focus management
const focusCheck = testUtils.a11y.checkFocusManagement(container);
expect(focusCheck.count).toBeGreaterThan(0);
```

### Animation Testing
```typescript
// Wait for animations to complete
await testUtils.waitForAnimation(300);

// Mock reduced motion preference
testUtils.mockReducedMotion(true);
```

## 📈 Coverage Reports

### Coverage Thresholds
- **Global**: 80% (branches, functions, lines, statements)
- **UI Components**: 85% (higher standard for core components)

### Report Locations
- **HTML Report**: `coverage/design-system/lcov-report/index.html`
- **JSON Summary**: `coverage/design-system/coverage-summary.json`
- **LCOV Format**: `coverage/design-system/lcov.info`
- **JUnit XML**: `coverage/design-system/junit.xml`

## 🔍 Debugging Tests

### Common Commands
```bash
# Run single test file
npm run test:design-system -- Button.test.tsx

# Run tests matching pattern
npm run test:design-system -- --testNamePattern="Button component"

# Debug mode with Node inspector
node --inspect-brk scripts/run-design-system-tests.js unit

# Update specific snapshots
npm run test:design-system visual -- --testNamePattern="Button" --updateSnapshot
```

### Troubleshooting

#### Visual Test Failures
```bash
# Update all snapshots
npm run test:design-system visual --update-snapshots

# Update specific component snapshots
npm run test:design-system -- --testPathPattern="Button" --updateSnapshot
```

#### Performance Test Failures
- Check system load and available memory
- Increase timeouts in Jest configuration
- Run tests in isolation: `--runInBand`

#### Integration Test Timeouts
- Increase timeout in specific test files
- Use `waitFor` with higher timeout values
- Check for unresolved promises

## 🎯 Best Practices

### Writing Unit Tests
```typescript
describe('Button Component', () => {
  it('renders with correct variant styles', () => {
    render(<Button variant="primary">Test</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Writing Integration Tests
```typescript
describe('Modal with Form Integration', () => {
  it('submits form and closes modal', async () => {
    const onSubmit = jest.fn();
    
    render(<ModalFormExample onSubmit={onSubmit} />);
    
    // Open modal
    await userEvent.click(screen.getByText('Open Form'));
    
    // Fill form
    await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
    
    // Submit
    await userEvent.click(screen.getByText('Submit'));
    
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

### Writing Performance Tests
```typescript
describe('Component Performance', () => {
  it('renders large dataset efficiently', () => {
    const largeData = generateLargeDataset(1000);
    
    const benchmark = testUtils.benchmarkRender(() => {
      render(<DataTable data={largeData} />);
    }, 10);
    
    expect(benchmark.average).toBeLessThan(100);
  });
});
```

## 🚨 Error Handling

### Test Failures
- **Unit Tests**: Check component implementation and props
- **Integration Tests**: Verify component interactions and timing
- **Visual Tests**: Update snapshots or check for unintended changes
- **Performance Tests**: Check system resources and benchmark expectations

### Common Issues
1. **Snapshot Mismatches**: Run `--updateSnapshot` after intentional changes
2. **Timeout Errors**: Increase timeouts or check for hanging promises
3. **Memory Issues**: Use `--runInBand` to run tests in single process
4. **CI Failures**: Use `--ci` flag for CI-optimized settings

## 📚 Component Test Examples

### Button Component
- ✅ All variants render correctly
- ✅ Loading state displays spinner
- ✅ Disabled state prevents interaction
- ✅ Click events work properly
- ✅ Keyboard navigation (Enter, Space)
- ✅ ARIA attributes are correct

### Modal Component
- ✅ Opens and closes correctly
- ✅ Focus management (trap, restore)
- ✅ Escape key closes modal
- ✅ Backdrop click closes modal
- ✅ Portal rendering works
- ✅ Accessibility attributes

### DataTable Component
- ✅ Displays data correctly
- ✅ Sorting functionality
- ✅ Search/filter functionality
- ✅ Pagination works
- ✅ Large dataset performance
- ✅ Responsive behavior

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Design System Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run design system tests
        run: npm run test:design-system:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/design-system/lcov.info
```

## 📝 Maintenance

### Regular Tasks
- **Weekly**: Review test coverage and add missing tests
- **Monthly**: Update snapshots after design changes
- **Quarterly**: Review performance benchmarks and adjust thresholds
- **As needed**: Update test utilities and configurations

### Monitoring
- Track test execution times
- Monitor coverage trends  
- Review failed test patterns
- Update documentation as system evolves

---

## 🏆 Quality Gates

Before deploying design system changes:

- [ ] All unit tests pass
- [ ] Integration tests demonstrate proper workflows
- [ ] Visual tests show no unintended regressions
- [ ] Performance tests meet benchmarks
- [ ] Coverage thresholds are maintained
- [ ] Accessibility tests pass
- [ ] No console errors or warnings

**The design system is production-ready when all quality gates pass.** ✨