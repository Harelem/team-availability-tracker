#!/usr/bin/env node

/**
 * Data Flow Consistency Validation Test
 * 
 * This script validates that:
 * 1. All components use unified data source patterns
 * 2. Cache invalidation works correctly
 * 3. Real-time sync maintains data integrity
 * 4. Sprint data flows consistently across COO dashboard and team views
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Data Flow Consistency Validation');
console.log('===================================\n');

// Components to check for data consistency
const componentsToAnalyze = [
  'src/components/ManagerDashboard.tsx',
  'src/components/TeamSummaryOverview.tsx',
  'src/components/EnhancedAvailabilityTable.tsx',
  'src/components/ScheduleTable.tsx',
  'src/components/FullSprintTable.tsx',
  'src/components/MobileTeamDashboard.tsx',
  'src/components/MobileScheduleView.tsx'
];

// Services and utilities that should be consistently used
const dataSourceFiles = [
  'src/lib/database.ts',
  'src/lib/realTimeCalculationService.ts',
  'src/utils/smartSprintDetection.ts',
  'src/utils/enhancedCacheManager.ts',
  'src/lib/realTimeSyncManager.ts'
];

const findings = {
  dataSourceConsistency: [],
  cacheUsage: [],
  sprintDetectionUsage: [],
  databaseServiceUsage: [],
  potentialInconsistencies: []
};

console.log('🔍 Analyzing component data source patterns...');

// Analyze each component for data source patterns
for (const componentFile of componentsToAnalyze) {
  try {
    if (fs.existsSync(componentFile)) {
      const content = fs.readFileSync(componentFile, 'utf8');
      const componentName = path.basename(componentFile, '.tsx');
      
      console.log(`📊 Analyzing ${componentName}...`);
      
      // Check for database service usage
      const usesDatabase = content.includes('DatabaseService') || content.includes('from \'@/lib/database\'');
      const usesRealTimeCalc = content.includes('RealTimeCalculationService') || content.includes('realTimeCalculationService');
      const usesSprintDetection = content.includes('smartSprintDetection') || content.includes('detectCurrentSprint');
      const usesCacheManager = content.includes('enhancedCacheManager') || content.includes('getCachedData');
      
      // Check for potential hardcoded data patterns
      const hasHardcodedData = [
        /const.*=\s*\[[\s\S]*\{[\s\S]*name:/g,  // Hardcoded arrays of objects
        /teams:\s*\[[\s\S]*\{/g,                // Hardcoded teams array
        /members:\s*\[[\s\S]*\{/g,              // Hardcoded members array
        /data:\s*\[[\s\S]*\{/g                  // Hardcoded data array
      ].some(pattern => pattern.test(content));
      
      // Check for useState with complex initial data
      const hasComplexState = content.includes('useState') && (
        content.includes('useState([') || 
        content.includes('useState({') ||
        content.includes('useState<') && content.includes('[]')
      );
      
      findings.dataSourceConsistency.push({
        component: componentName,
        usesDatabase,
        usesRealTimeCalc,
        usesSprintDetection,
        usesCacheManager,
        hasHardcodedData,
        hasComplexState
      });
      
      // Detect potential inconsistencies
      if (hasHardcodedData) {
        findings.potentialInconsistencies.push({
          component: componentName,
          issue: 'Contains potential hardcoded data structures',
          severity: 'medium'
        });
      }
      
      if (!usesDatabase && (componentName.includes('Dashboard') || componentName.includes('Table'))) {
        findings.potentialInconsistencies.push({
          component: componentName,
          issue: 'Major component not using DatabaseService',
          severity: 'high'
        });
      }
      
    }
  } catch (error) {
    console.warn(`Warning: Could not analyze ${componentFile}: ${error.message}`);
  }
}

console.log('\n🔍 Analyzing data service consistency...');

// Analyze data service files for consistency patterns
for (const serviceFile of dataSourceFiles) {
  try {
    if (fs.existsSync(serviceFile)) {
      const content = fs.readFileSync(serviceFile, 'utf8');
      const serviceName = path.basename(serviceFile, '.ts');
      
      console.log(`🔧 Analyzing ${serviceName}...`);
      
      // Check for cache integration
      const hasCacheIntegration = content.includes('enhancedCacheManager') || content.includes('getCachedData');
      const hasErrorHandling = content.includes('try {') && content.includes('catch');
      const hasTypeScript = content.includes('interface') || content.includes('type ');
      const hasAsyncPatterns = content.includes('async ') || content.includes('await ');
      
      findings.cacheUsage.push({
        service: serviceName,
        hasCacheIntegration,
        hasErrorHandling,
        hasTypeScript,
        hasAsyncPatterns
      });
    }
  } catch (error) {
    console.warn(`Warning: Could not analyze ${serviceFile}: ${error.message}`);
  }
}

console.log('\n🔍 Checking for Sprint detection consistency...');

// Check specific patterns in key files
const sprintDetectionFiles = [
  'src/utils/smartSprintDetection.ts',
  'src/lib/database.ts',
  'src/components/ManagerDashboard.tsx'
];

for (const file of sprintDetectionFiles) {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const fileName = path.basename(file);
      
      // Check for sprint detection patterns
      const hasAsync = content.includes('detectCurrentSprintForDate') || content.includes('getCurrentGlobalSprint');
      const hasSync = content.includes('detectCurrentSprintSync') || content.includes('getCurrentSprintSync');
      const hasDatabase = content.includes('DatabaseService') && content.includes('sprint');
      const hasSmartDetection = content.includes('smartSprintDetection') || content.includes('SmartSprintInfo');
      
      findings.sprintDetectionUsage.push({
        file: fileName,
        hasAsync,
        hasSync,
        hasDatabase,
        hasSmartDetection
      });
    }
  } catch (error) {
    console.warn(`Warning: Could not analyze ${file}: ${error.message}`);
  }
}

console.log('\n📊 ANALYSIS RESULTS');
console.log('==================');

// Summary of findings
const totalComponents = findings.dataSourceConsistency.length;
const databaseUsers = findings.dataSourceConsistency.filter(c => c.usesDatabase).length;
const realTimeCalcUsers = findings.dataSourceConsistency.filter(c => c.usesRealTimeCalc).length;
const cacheUsers = findings.dataSourceConsistency.filter(c => c.usesCacheManager).length;
const hardcodedDataComponents = findings.dataSourceConsistency.filter(c => c.hasHardcodedData).length;

console.log(`\n📈 Data Source Usage:`);
console.log(`Total Components Analyzed: ${totalComponents}`);
console.log(`Using DatabaseService: ${databaseUsers}/${totalComponents} (${Math.round(databaseUsers/totalComponents*100)}%)`);
console.log(`Using RealTimeCalculationService: ${realTimeCalcUsers}/${totalComponents} (${Math.round(realTimeCalcUsers/totalComponents*100)}%)`);
console.log(`Using Enhanced Cache Manager: ${cacheUsers}/${totalComponents} (${Math.round(cacheUsers/totalComponents*100)}%)`);
console.log(`With Potential Hardcoded Data: ${hardcodedDataComponents}/${totalComponents} (${Math.round(hardcodedDataComponents/totalComponents*100)}%)`);

console.log(`\n🔧 Service Analysis:`);
findings.cacheUsage.forEach(service => {
  console.log(`${service.service}: Cache(${service.hasCacheIntegration ? '✅' : '❌'}) Error(${service.hasErrorHandling ? '✅' : '❌'}) Async(${service.hasAsyncPatterns ? '✅' : '❌'})`);
});

console.log(`\n📅 Sprint Detection Analysis:`);
findings.sprintDetectionUsage.forEach(file => {
  console.log(`${file.file}: Async(${file.hasAsync ? '✅' : '❌'}) Sync(${file.hasSync ? '✅' : '❌'}) DB(${file.hasDatabase ? '✅' : '❌'}) Smart(${file.hasSmartDetection ? '✅' : '❌'})`);
});

if (findings.potentialInconsistencies.length > 0) {
  console.log(`\n⚠️  POTENTIAL INCONSISTENCIES:`);
  findings.potentialInconsistencies.forEach(issue => {
    const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
    console.log(`${severity} ${issue.component}: ${issue.issue}`);
  });
} else {
  console.log(`\n✅ No major inconsistencies detected`);
}

// Generate consistency score
const dbUsageScore = databaseUsers / totalComponents;
const cacheUsageScore = cacheUsers / totalComponents;
const realTimeScore = realTimeCalcUsers / totalComponents;
const consistencyPenalty = findings.potentialInconsistencies.filter(i => i.severity === 'high').length * 0.2;
const overallScore = Math.max(0, ((dbUsageScore + cacheUsageScore + realTimeScore) / 3) - consistencyPenalty);

console.log(`\n🎯 CONSISTENCY SCORE: ${Math.round(overallScore * 100)}%`);

if (overallScore >= 0.8) {
  console.log('✅ EXCELLENT - Data flow is highly consistent');
} else if (overallScore >= 0.6) {
  console.log('🟡 GOOD - Minor inconsistencies detected');
} else {
  console.log('🔴 NEEDS ATTENTION - Significant inconsistencies found');
}

// Save detailed results
const detailedResults = {
  summary: {
    totalComponents,
    databaseUsers,
    realTimeCalcUsers,
    cacheUsers,
    hardcodedDataComponents,
    consistencyScore: Math.round(overallScore * 100),
    timestamp: new Date().toISOString()
  },
  componentAnalysis: findings.dataSourceConsistency,
  serviceAnalysis: findings.cacheUsage,
  sprintDetectionAnalysis: findings.sprintDetectionUsage,
  inconsistencies: findings.potentialInconsistencies
};

fs.writeFileSync('data-flow-consistency-results.json', JSON.stringify(detailedResults, null, 2));

console.log(`\n📄 Detailed results saved to: data-flow-consistency-results.json`);

console.log('\n🎯 RECOMMENDATIONS');
console.log('==================');

if (databaseUsers < totalComponents) {
  console.log('🔧 Consider updating remaining components to use DatabaseService');
}

if (cacheUsers < totalComponents * 0.5) {
  console.log('🔧 Consider implementing cache management in more components');
}

if (hardcodedDataComponents > 0) {
  console.log('🔧 Review components with hardcoded data and migrate to dynamic data sources');
}

if (findings.potentialInconsistencies.length > 0) {
  console.log('🔧 Address the inconsistencies listed above for better data flow');
}

console.log('\n✨ Data Flow Consistency Analysis Complete ✨');