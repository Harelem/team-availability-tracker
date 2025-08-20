/**
 * Data Integrity Testing Suite Runner
 * 
 * Main test runner for executing comprehensive data integrity testing
 * and generating detailed reports with calculation verification
 */

import { dataIntegrityReporter } from './integrity/dataIntegrityReport';

// Main test execution function
export async function runDataIntegrityTests(): Promise<void> {
  console.log('🚀 Starting Data Integrity Testing Suite...');
  console.log('This comprehensive test validates:');
  console.log('  • Database persistence and validation');
  console.log('  • Sprint calculation accuracy (35-hour standard)');
  console.log('  • Field validation and security measures');
  console.log('  • Edge case handling and error recovery');
  console.log('  • Mock data elimination verification');
  console.log('  • Performance benchmarks and optimization');
  console.log('');

  try {
    // Generate comprehensive integrity report
    const report = await dataIntegrityReporter.generateComprehensiveReport();

    // Save JSON report
    await dataIntegrityReporter.saveReport(report, 'data-integrity-report.json');

    // Generate and save markdown report
    const markdownReport = await dataIntegrityReporter.generateMarkdownReport(report);
    const fs = require('fs');
    fs.writeFileSync('DATA_INTEGRITY_REPORT.md', markdownReport);

    console.log('\n📄 Reports generated:');
    console.log('  • data-integrity-report.json (detailed JSON)');
    console.log('  • DATA_INTEGRITY_REPORT.md (human-readable)');

    // Exit with appropriate code
    if (report.summary.overallStatus === 'FAIL') {
      console.log('\n❌ Data integrity tests FAILED. Review the report for details.');
      process.exit(1);
    } else if (report.summary.overallStatus === 'WARNING') {
      console.log('\n⚠️ Data integrity tests completed with WARNINGS. Review recommendations.');
      process.exit(0);
    } else {
      console.log('\n✅ All data integrity tests PASSED successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 Data integrity testing failed with error:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runDataIntegrityTests();
}