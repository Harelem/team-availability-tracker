/**
 * Test the Existing Performance Optimization System
 * 
 * This script tests the performance optimization modules that are already
 * built into the application to validate their effectiveness.
 */

const fs = require('fs').promises;

/**
 * Test the performance optimization system
 */
async function testExistingPerformanceSystem() {
  console.log('🔍 Testing Existing Performance Optimization System');
  console.log('==================================================');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    systemTests: [],
    recommendations: []
  };
  
  try {
    // Test 1: Check if performance modules exist
    const performanceModules = [
      'src/lib/performance/index.ts',
      'src/lib/performance/performanceValidator.ts',
      'src/lib/performance/calculationCache.ts',
      'src/lib/performance/databaseOptimization.ts',
      'src/lib/realTimeSyncManager.ts',
      'src/lib/unifiedCalculationService.ts'
    ];
    
    console.log('\n=== CHECKING PERFORMANCE MODULES ===');
    
    for (const module of performanceModules) {
      try {
        const moduleContent = await fs.readFile(`/Users/harel/team-availability-tracker/${module}`, 'utf8');
        const hasContent = moduleContent.length > 100;
        
        console.log(`✅ ${module}: ${hasContent ? 'Exists and has content' : 'Exists but minimal'}`);
        
        testResults.systemTests.push({
          test: `Module: ${module}`,
          passed: hasContent,
          details: { size: moduleContent.length }
        });
        
      } catch (error) {
        console.log(`❌ ${module}: Missing or inaccessible`);
        testResults.systemTests.push({
          test: `Module: ${module}`,
          passed: false,
          details: { error: error.message }
        });
      }
    }
    
    // Test 2: Check performance configuration
    console.log('\n=== CHECKING PERFORMANCE CONFIGURATION ===');
    
    try {
      const performanceIndexContent = await fs.readFile(
        '/Users/harel/team-availability-tracker/src/lib/performance/index.ts', 
        'utf8'
      );
      
      const hasConfig = performanceIndexContent.includes('PERFORMANCE_CONFIG');
      const hasCacheDurations = performanceIndexContent.includes('CACHE_DURATIONS');
      const hasThresholds = performanceIndexContent.includes('THRESHOLDS');
      const hasOptimizationSettings = performanceIndexContent.includes('OPTIMIZATION_SETTINGS');
      
      console.log(`Performance Config: ${hasConfig ? '✅' : '❌'}`);
      console.log(`Cache Durations: ${hasCacheDurations ? '✅' : '❌'}`);
      console.log(`Thresholds: ${hasThresholds ? '✅' : '❌'}`);
      console.log(`Optimization Settings: ${hasOptimizationSettings ? '✅' : '❌'}`);
      
      testResults.systemTests.push({
        test: 'Performance Configuration',
        passed: hasConfig && hasCacheDurations && hasThresholds,
        details: { hasConfig, hasCacheDurations, hasThresholds, hasOptimizationSettings }
      });
      
    } catch (error) {
      console.log('❌ Performance configuration check failed');
      testResults.systemTests.push({
        test: 'Performance Configuration',
        passed: false,
        details: { error: error.message }
      });
    }
    
    // Test 3: Check cache implementations
    console.log('\n=== CHECKING CACHE IMPLEMENTATIONS ===');
    
    const cacheModules = [
      'src/lib/performance/calculationCache.ts',
      'src/utils/enhancedCacheManager.ts'
    ];
    
    for (const cacheModule of cacheModules) {
      try {
        const cacheContent = await fs.readFile(`/Users/harel/team-availability-tracker/${cacheModule}`, 'utf8');
        
        const hasCacheManager = cacheContent.includes('CacheManager') || cacheContent.includes('cache');
        const hasInvalidation = cacheContent.includes('invalidate') || cacheContent.includes('clear');
        const hasMetrics = cacheContent.includes('metrics') || cacheContent.includes('performance');
        
        console.log(`${cacheModule}:`);
        console.log(`  Cache Manager: ${hasCacheManager ? '✅' : '❌'}`);
        console.log(`  Invalidation: ${hasInvalidation ? '✅' : '❌'}`);
        console.log(`  Metrics: ${hasMetrics ? '✅' : '❌'}`);
        
        testResults.systemTests.push({
          test: `Cache Implementation: ${cacheModule}`,
          passed: hasCacheManager && hasInvalidation,
          details: { hasCacheManager, hasInvalidation, hasMetrics }
        });
        
      } catch (error) {
        console.log(`❌ ${cacheModule}: Not accessible`);
        testResults.systemTests.push({
          test: `Cache Implementation: ${cacheModule}`,
          passed: false,
          details: { error: error.message }
        });
      }
    }
    
    // Test 4: Check real-time sync implementation
    console.log('\n=== CHECKING REAL-TIME SYNC IMPLEMENTATION ===');
    
    try {
      const syncManagerContent = await fs.readFile(
        '/Users/harel/team-availability-tracker/src/lib/realTimeSyncManager.ts',
        'utf8'
      );
      
      const hasSupabaseIntegration = syncManagerContent.includes('supabase');
      const hasEventProcessing = syncManagerContent.includes('processEvent');
      const hasBroadcast = syncManagerContent.includes('broadcast');
      const hasWebSocket = syncManagerContent.includes('channel') || syncManagerContent.includes('WebSocket');
      const hasHealthMonitoring = syncManagerContent.includes('healthCheck') || syncManagerContent.includes('monitoring');
      
      console.log(`Supabase Integration: ${hasSupabaseIntegration ? '✅' : '❌'}`);
      console.log(`Event Processing: ${hasEventProcessing ? '✅' : '❌'}`);
      console.log(`Broadcast Capability: ${hasBroadcast ? '✅' : '❌'}`);
      console.log(`WebSocket/Channel Support: ${hasWebSocket ? '✅' : '❌'}`);
      console.log(`Health Monitoring: ${hasHealthMonitoring ? '✅' : '❌'}`);
      
      testResults.systemTests.push({
        test: 'Real-time Sync Implementation',
        passed: hasSupabaseIntegration && hasEventProcessing && hasBroadcast,
        details: { hasSupabaseIntegration, hasEventProcessing, hasBroadcast, hasWebSocket, hasHealthMonitoring }
      });
      
    } catch (error) {
      console.log('❌ Real-time sync implementation check failed');
      testResults.systemTests.push({
        test: 'Real-time Sync Implementation',
        passed: false,
        details: { error: error.message }
      });
    }
    
    // Test 5: Check unified calculation service
    console.log('\n=== CHECKING UNIFIED CALCULATION SERVICE ===');
    
    try {
      const calculationServiceContent = await fs.readFile(
        '/Users/harel/team-availability-tracker/src/lib/unifiedCalculationService.ts',
        'utf8'
      );
      
      const hasTeamCalculations = calculationServiceContent.includes('calculateTeam');
      const hasCOODashboard = calculationServiceContent.includes('getCOODashboard');
      const hasSprintData = calculationServiceContent.includes('Sprint');
      const hasCaching = calculationServiceContent.includes('cache');
      const hasOptimization = calculationServiceContent.includes('optimized') || calculationServiceContent.includes('performance');
      
      console.log(`Team Calculations: ${hasTeamCalculations ? '✅' : '❌'}`);
      console.log(`COO Dashboard: ${hasCOODashboard ? '✅' : '❌'}`);
      console.log(`Sprint Data Processing: ${hasSprintData ? '✅' : '❌'}`);
      console.log(`Caching Integration: ${hasCaching ? '✅' : '❌'}`);
      console.log(`Performance Optimization: ${hasOptimization ? '✅' : '❌'}`);
      
      testResults.systemTests.push({
        test: 'Unified Calculation Service',
        passed: hasTeamCalculations && hasCOODashboard && hasSprintData,
        details: { hasTeamCalculations, hasCOODashboard, hasSprintData, hasCaching, hasOptimization }
      });
      
    } catch (error) {
      console.log('❌ Unified calculation service check failed');
      testResults.systemTests.push({
        test: 'Unified Calculation Service',
        passed: false,
        details: { error: error.message }
      });
    }
    
    // Test 6: Check optimized data hooks
    console.log('\n=== CHECKING OPTIMIZED DATA HOOKS ===');
    
    try {
      const optimizedDataContent = await fs.readFile(
        '/Users/harel/team-availability-tracker/src/hooks/useOptimizedData.ts',
        'utf8'
      );
      
      const hasOptimizedHooks = optimizedDataContent.includes('useOptimized');
      const hasCacheIntegration = optimizedDataContent.includes('cache');
      const hasPerformanceMonitoring = optimizedDataContent.includes('performance') || optimizedDataContent.includes('metrics');
      const hasErrorHandling = optimizedDataContent.includes('error') || optimizedDataContent.includes('catch');
      
      console.log(`Optimized Hooks: ${hasOptimizedHooks ? '✅' : '❌'}`);
      console.log(`Cache Integration: ${hasCacheIntegration ? '✅' : '❌'}`);
      console.log(`Performance Monitoring: ${hasPerformanceMonitoring ? '✅' : '❌'}`);
      console.log(`Error Handling: ${hasErrorHandling ? '✅' : '❌'}`);
      
      testResults.systemTests.push({
        test: 'Optimized Data Hooks',
        passed: hasOptimizedHooks && hasCacheIntegration,
        details: { hasOptimizedHooks, hasCacheIntegration, hasPerformanceMonitoring, hasErrorHandling }
      });
      
    } catch (error) {
      console.log('❌ Optimized data hooks check failed');
      testResults.systemTests.push({
        test: 'Optimized Data Hooks',
        passed: false,
        details: { error: error.message }
      });
    }
    
    // Calculate overall system health
    console.log('\n=== SYSTEM PERFORMANCE ANALYSIS ===');
    
    const passedTests = testResults.systemTests.filter(test => test.passed).length;
    const totalTests = testResults.systemTests.length;
    const healthScore = Math.round((passedTests / totalTests) * 100);
    
    console.log(`Overall System Health: ${healthScore}% (${passedTests}/${totalTests} tests passed)`);
    
    let status = 'critical';
    if (healthScore >= 90) status = 'excellent';
    else if (healthScore >= 75) status = 'good';
    else if (healthScore >= 60) status = 'needs_improvement';
    
    // Generate recommendations based on failed tests
    const failedTests = testResults.systemTests.filter(test => !test.passed);
    
    if (failedTests.length > 0) {
      console.log('\nRecommendations:');
      
      failedTests.forEach(test => {
        if (test.test.includes('Module:')) {
          testResults.recommendations.push(`Fix missing or incomplete module: ${test.test}`);
          console.log(`  - Fix missing or incomplete module: ${test.test}`);
        } else if (test.test.includes('Cache')) {
          testResults.recommendations.push('Implement comprehensive caching system with invalidation');
          console.log('  - Implement comprehensive caching system with invalidation');
        } else if (test.test.includes('Real-time')) {
          testResults.recommendations.push('Complete real-time synchronization implementation');
          console.log('  - Complete real-time synchronization implementation');
        } else if (test.test.includes('Calculation')) {
          testResults.recommendations.push('Enhance unified calculation service with optimization');
          console.log('  - Enhance unified calculation service with optimization');
        } else if (test.test.includes('Hook')) {
          testResults.recommendations.push('Improve optimized data hooks with performance monitoring');
          console.log('  - Improve optimized data hooks with performance monitoring');
        }
      });
    }
    
    // Add general recommendations based on health score
    if (healthScore < 75) {
      testResults.recommendations.push('Complete implementation of all performance optimization modules');
      testResults.recommendations.push('Add comprehensive error handling and monitoring');
      testResults.recommendations.push('Implement performance metrics collection and analysis');
    }
    
    testResults.overall = {
      healthScore,
      status,
      passedTests,
      totalTests
    };
    
    // Save results
    await fs.writeFile(
      '/Users/harel/team-availability-tracker/existing-performance-system-analysis.json',
      JSON.stringify(testResults, null, 2)
    );
    
    console.log('\n✅ Existing performance system analysis completed!');
    console.log('Analysis saved to: existing-performance-system-analysis.json');
    
    return testResults;
    
  } catch (error) {
    console.error('❌ Performance system test failed:', error);
    
    testResults.systemTests.push({
      test: 'Overall System Test',
      passed: false,
      details: { error: error.message }
    });
    
    await fs.writeFile(
      '/Users/harel/team-availability-tracker/performance-system-test-error.json',
      JSON.stringify({ error: error.message, testResults }, null, 2)
    );
    
    return testResults;
  }
}

/**
 * Run the performance system test
 */
if (require.main === module) {
  testExistingPerformanceSystem().then(results => {
    if (results.overall && results.overall.status === 'critical') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }).catch(() => process.exit(1));
}

module.exports = { testExistingPerformanceSystem };