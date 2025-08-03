# Data Integrity Testing Agent

## Overview

The Data Integrity Testing Agent is a comprehensive testing framework designed to verify all data flows, calculations, and system integrity for the Team Availability Tracker application. This system ensures accurate sprint calculations, robust data validation, and secure data handling across all components.

## 🎯 Key Features

### ✅ Database Testing
- **Data Persistence**: Schedule entries, sprint notes, user permissions
- **Real-time Updates**: Cross-browser synchronization and conflict resolution
- **Constraint Validation**: Required fields, foreign keys, unique constraints
- **Transaction Integrity**: Rollback handling and data consistency

### ✅ Calculation Verification
- **35-Hour Work Week Standard**: Verified across all team configurations
- **Israeli Calendar Compliance**: Sunday-Thursday working days (5 days/week)
- **Sprint Potential Accuracy**: Manual verification with known expected values
- **Cross-Component Consistency**: Identical calculations across COO Dashboard and Team Modals

### ✅ Field Validation & Security
- **Input Sanitization**: XSS prevention, SQL injection protection
- **Hebrew Text Validation**: Proper Unicode support and validation patterns
- **Required Field Enforcement**: Comprehensive validation for all user inputs
- **Data Length Limits**: Maximum field length validation and enforcement

### ✅ Edge Case Testing
- **Empty Sprint Scenarios**: Zero entries, no team members, weekend-only periods
- **All Absences Handling**: Complete team sick leave, mixed availability patterns
- **Boundary Conditions**: Maximum team sizes, cross-year date ranges, leap years
- **Performance Edge Cases**: Large datasets, concurrent operations, memory efficiency

### ✅ Mock Data Elimination
- **Production Data Validation**: Verification of real team configurations
- **Pattern Detection**: Automatic identification of test/mock data patterns
- **COO User Verification**: Validation of Nir Shilo as legitimate COO user
- **Team Configuration Audit**: Expected team sizes and sprint configurations

## 📊 Verified Calculations

### Sprint Potential (35-hour work week standard)
| Team | Members | Sprint Length | Expected Hours | Status |
|------|---------|---------------|----------------|--------|
| Product Team | 8 | 2 weeks | 560 hours | ✅ |
| Dev Team - Tal | 4 | 2 weeks | 280 hours | ✅ |
| Dev Team - Itay | 5 | 2 weeks | 350 hours | ✅ |
| Infrastructure Team | 3 | 3 weeks | 315 hours | ✅ |
| Data Team | 6 | 2 weeks | 420 hours | ✅ |
| Management Team | 1 | 2 weeks | 70 hours | ✅ |

### Working Days Calculation (Israeli Calendar)
| Period | Expected Days | Verified |
|--------|---------------|----------|
| Single Week (Sun-Thu) | 5 days | ✅ |
| Two Weeks | 10 days | ✅ |
| Three Weeks | 15 days | ✅ |
| Weekend Only (Fri-Sat) | 0 days | ✅ |
| Cross-Month Sprint | 10 days | ✅ |

### Hours Per Day Standards
| Schedule Value | Expected Hours | Verified |
|----------------|----------------|----------|
| Full Day ('1') | 7 hours | ✅ |
| Half Day ('0.5') | 3.5 hours | ✅ |
| Sick Day ('X') | 0 hours | ✅ |

## 🚀 Usage

### Running Individual Test Categories

```bash
# Run all data integrity tests
npm run test:data-integrity

# Generate comprehensive report
npm run test:data-integrity-full

# Run specific test categories
npm run test:persistence      # Database persistence tests
npm run test:validation      # Field validation tests
npm run test:calculations    # Calculation verification tests
npm run test:edge-cases      # Edge case testing
```

### Test Files Structure

```
__tests__/
├── fixtures/
│   └── testData.ts                 # Test data and expected values
├── utils/
│   └── databaseTestUtils.ts        # Database testing utilities
├── integrity/
│   ├── dataPersistence.test.ts     # Database persistence tests
│   ├── fieldValidation.test.ts     # Input validation tests
│   ├── calculationVerification.test.ts # Calculation accuracy tests
│   ├── edgeCaseTesting.test.ts     # Edge case scenarios
│   └── dataIntegrityReport.ts      # Report generation
└── runDataIntegrityTests.ts        # Main test runner
```

## 📋 Test Categories

### 1. Database Persistence Tests
- Schedule entry persistence across all value types ('1', '0.5', 'X')
- Sprint notes persistence between sessions and navigation
- User permission maintenance and RLS policy enforcement
- Real-time updates and cross-browser synchronization
- Data validation constraints and error handling

### 2. Field Validation & Security Tests
- Required field enforcement (team name, member names, dates)
- Hebrew text validation with proper Unicode patterns
- XSS attack prevention in reason fields
- SQL injection protection across all inputs
- Email format validation and data length limits

### 3. Calculation Verification Tests
- Sprint potential calculations for all team configurations
- Working days calculation for Israeli calendar (Sunday-Thursday)
- Hours per day calculations (7h/3.5h/0h standards)
- Utilization percentage and completion calculations
- Cross-component calculation consistency verification

### 4. Edge Case Testing
- Empty sprint scenarios (no entries, no members, zero working days)
- All absences handling (complete team sick leave)
- Mixed availability patterns and complex scheduling
- Boundary conditions (max team sizes, date ranges, leap years)
- Performance edge cases (large datasets, concurrent operations)

### 5. Mock Data Elimination
- Detection of mock/sample/dummy data patterns
- Production team configuration validation
- COO user verification (Nir Shilo authentication)
- Real vs. hardcoded value identification

## 📈 Performance Benchmarks

| Operation | Benchmark | Status |
|-----------|-----------|--------|
| Single Calculation | < 100ms | ✅ |
| 100 Calculations | < 100ms total | ✅ |
| Large Dataset (10K entries) | < 1000ms | ✅ |
| Memory Usage | < 100MB | ✅ |

## 🔍 Report Generation

The testing framework generates comprehensive reports in multiple formats:

### JSON Report (`data-integrity-report.json`)
- Detailed test results with timestamps
- Performance metrics and benchmarks
- Error messages and debugging information
- Structured data for automated processing

### Markdown Report (`DATA_INTEGRITY_REPORT.md`)
- Human-readable executive summary
- Category-wise test results
- Performance metrics and recommendations
- Key verification results table

### Console Output
- Real-time test progress
- Summary statistics
- Pass/fail status with color coding
- Performance timing information

## 🎯 Integration with CI/CD

### Pre-commit Hooks
```bash
# Add to .husky/pre-commit
npm run test:data-integrity
```

### GitHub Actions
```yaml
- name: Run Data Integrity Tests
  run: |
    npm run test:data-integrity-full
    # Upload reports as artifacts
```

### Production Deployment
```bash
# Run before production deployment
npm run test:data-integrity-full
if [ $? -eq 0 ]; then
  echo "✅ Data integrity verified - proceeding with deployment"
else
  echo "❌ Data integrity failed - blocking deployment"
  exit 1
fi
```

## 🛠️ Configuration

### Test Data Configuration
Modify `__tests__/fixtures/testData.ts` to update:
- Expected team configurations
- Sprint calculation constants
- Performance benchmarks
- Validation patterns

### Database Test Configuration
Update `__tests__/utils/databaseTestUtils.ts` for:
- Mock database responses
- Error simulation scenarios
- Performance testing parameters
- Validation rule enforcement

## 🔧 Troubleshooting

### Common Issues

**Calculation Mismatches**
- Verify SPRINT_CALCULATION_CONSTANTS in test fixtures
- Check Israeli calendar working days (Sunday-Thursday)
- Ensure 35-hour work week standard is maintained

**Database Test Failures**
- Clear mock state between tests
- Verify Supabase client mocking
- Check RLS policy simulation

**Performance Test Timeouts**
- Adjust PERFORMANCE_BENCHMARKS values
- Check system resources during testing
- Verify test isolation and cleanup

### Debug Mode
```bash
# Run with verbose logging
npm run test:data-integrity -- --verbose

# Run specific failing test
npm run test:calculations -- --testNamePattern="Product Team"
```

## 📚 Documentation

### Key Files
- `DATA_INTEGRITY_TESTING.md` - This comprehensive guide
- `__tests__/fixtures/testData.ts` - Test data and expected values
- `__tests__/integrity/dataIntegrityReport.ts` - Report generation logic

### Related Documentation
- Sprint calculation methodology in `src/lib/sprintCalculations.ts`
- Database schema in `sql/schema.sql`
- Team configuration in production data

## 🤝 Contributing

### Adding New Tests
1. Create test in appropriate category file
2. Add expected values to `testData.ts`
3. Update report generator if needed
4. Verify integration with existing tests

### Modifying Calculations
1. Update calculation functions
2. Update expected values in test fixtures
3. Run full integrity test suite
4. Update documentation

### Performance Optimization
1. Add performance test case
2. Set benchmark thresholds
3. Monitor performance metrics
4. Update recommendations

## ✅ Verification Checklist

Before production deployment, ensure:

- [ ] All calculation verification tests pass
- [ ] Database persistence tests validate correctly
- [ ] Field validation prevents all injection attempts
- [ ] Edge cases handle gracefully without errors
- [ ] No mock data patterns detected in production
- [ ] Performance benchmarks meet requirements
- [ ] Real-time sync operates correctly
- [ ] Israeli calendar compliance verified
- [ ] 35-hour work week standard maintained
- [ ] COO user configuration validated

---

*This data integrity testing framework ensures the reliability, accuracy, and security of the Team Availability Tracker system across all operational scenarios.*