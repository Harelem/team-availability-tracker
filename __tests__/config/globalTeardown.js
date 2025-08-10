/**
 * Global Test Teardown
 * 
 * Runs once after all tests to clean up the testing environment
 * and generate reports for design system tests.
 */

const fs = require('fs').promises;
const path = require('path');

module.exports = async () => {
  console.log('🧹 Tearing down Design System test environment...');
  
  try {
    // Record test completion time
    if (global.performance && global.performance.mark && global.performance.measure) {
      try {
        global.performance.mark('test-suite-end');
        global.performance.measure('test-suite-duration', 'test-suite-start', 'test-suite-end');
        
        const measurements = global.performance.getEntriesByType('measure');
        const duration = measurements.find(m => m.name === 'test-suite-duration');
        
        if (duration) {
          console.log(`⏱️  Total test suite duration: ${Math.round(duration.duration)}ms`);
        }
      } catch (perfError) {
        // Performance API might not be fully supported, continue silently
      }
    }
    
    // Update test run metadata
    const metadataPath = path.join(process.cwd(), '__tests__/artifacts/test-run-metadata.json');
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      metadata.endTime = new Date().toISOString();
      metadata.duration = new Date(metadata.endTime) - new Date(metadata.startTime);
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (metadataError) {
      console.warn('⚠️  Could not update test metadata:', metadataError.message);
    }
    
    // Generate test summary
    const summaryPath = path.join(process.cwd(), '__tests__/artifacts/test-summary.md');
    const summary = generateTestSummary();
    await fs.writeFile(summaryPath, summary);
    
    // Clean up temporary test files if any
    const tempDir = path.join(process.cwd(), '__tests__/temp');
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch {
      // Directory might not exist, which is fine
    }
    
    // Log final status
    console.log('✅ Design System test environment teardown complete');
    console.log('📊 Test artifacts saved to __tests__/artifacts/');
    
    // Check for test coverage and log summary
    const coveragePath = path.join(process.cwd(), 'coverage/design-system/coverage-summary.json');
    try {
      const coverageContent = await fs.readFile(coveragePath, 'utf8');
      const coverage = JSON.parse(coverageContent);
      
      if (coverage.total) {
        console.log('📈 Coverage Summary:');
        console.log(`   Lines: ${coverage.total.lines.pct}%`);
        console.log(`   Functions: ${coverage.total.functions.pct}%`);
        console.log(`   Branches: ${coverage.total.branches.pct}%`);
        console.log(`   Statements: ${coverage.total.statements.pct}%`);
      }
    } catch {
      // Coverage file might not exist if coverage wasn't run
    }
    
  } catch (error) {
    console.error('❌ Error during test teardown:', error);
    // Don't throw here as it would mask test failures
  }
};

function generateTestSummary() {
  const now = new Date();
  
  return `# Design System Test Summary

Generated: ${now.toISOString()}

## Test Categories

### Unit Tests
- **Location**: \`__tests__/components/\`
- **Purpose**: Test individual component functionality
- **Coverage**: Component behavior, props, state management

### Integration Tests  
- **Location**: \`__tests__/integration/\`
- **Purpose**: Test component interactions and workflows
- **Coverage**: Multi-component scenarios, user workflows

### Visual Regression Tests
- **Location**: \`__tests__/visual/\`
- **Purpose**: Prevent unintended visual changes
- **Coverage**: Component appearance across themes and states

### Performance Tests
- **Location**: \`__tests__/performance/\`
- **Purpose**: Ensure components perform efficiently
- **Coverage**: Render times, memory usage, large datasets

## Test Commands

### Run All Tests
\`\`\`bash
npm run test:design-system
\`\`\`

### Run Specific Test Categories
\`\`\`bash
npm run test:design-system:unit
npm run test:design-system:integration
npm run test:design-system:visual
npm run test:design-system:performance
\`\`\`

### Watch Mode
\`\`\`bash
npm run test:design-system:watch
\`\`\`

### Coverage Report
\`\`\`bash
npm run test:design-system:coverage
\`\`\`

## Reports

- **HTML Report**: \`coverage/design-system/html-report/design-system-test-report.html\`
- **Coverage Report**: \`coverage/design-system/lcov-report/index.html\`
- **JUnit XML**: \`coverage/design-system/junit.xml\`

## Troubleshooting

### Common Issues

1. **Snapshot Mismatches**: Run \`npm run test:design-system -- --updateSnapshot\`
2. **Performance Test Failures**: Check system load and available memory
3. **Integration Test Timeouts**: Increase timeout in Jest configuration

### Environment Variables

- \`NODE_ENV=test\`: Ensures test environment
- \`DISABLE_ANIMATIONS=true\`: Disables animations for consistent testing
- \`JEST_WORKER_ID\`: Worker process identifier

## Design System Health

The design system is considered healthy when:

- ✅ All unit tests pass
- ✅ Integration tests demonstrate proper component interaction  
- ✅ Visual regression tests show no unintended changes
- ✅ Performance tests meet defined benchmarks
- ✅ Code coverage meets or exceeds thresholds
- ✅ Accessibility tests pass without violations

Last Updated: ${now.toLocaleDateString()}
`;
}