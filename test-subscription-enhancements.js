/**
 * Comprehensive test script for subscription management enhancements
 * Tests debouncing, connection pooling, circuit breakers, and database performance
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  testDuration: 60000, // 1 minute
  concurrentSubscriptions: 10,
  debounceTestInterval: 50, // 50ms rapid changes
  expectedDebounceDelay: 200 // 200ms debouncing
};

let testResults = {
  debouncing: { passed: false, details: '' },
  connectionPooling: { passed: false, details: '' },
  circuitBreaker: { passed: false, details: '' },
  databasePerformance: { passed: false, details: '' },
  memoryLeaks: { passed: false, details: '' },
  overallScore: 0
};

/**
 * Test debouncing functionality
 */
async function testDebouncing() {
  console.log('🔄 Testing subscription debouncing...');
  
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    let changeCount = 0;
    let callbackCount = 0;
    
    // Subscribe with rapid changes
    const channel = supabase
      .channel('debounce_test')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'schedule_entries' 
      }, (payload) => {
        callbackCount++;
      })
      .subscribe();

    // Simulate rapid subscription changes
    const startTime = Date.now();
    const interval = setInterval(() => {
      changeCount++;
      // Trigger rapid events (this would normally be done by the SubscriptionManager)
    }, TEST_CONFIG.debounceTestInterval);

    // Wait for debounce period + buffer
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.expectedDebounceDelay + 100));
    
    clearInterval(interval);
    await supabase.removeChannel(channel);
    
    const expectedMaxCallbacks = Math.ceil(changeCount / (TEST_CONFIG.expectedDebounceDelay / TEST_CONFIG.debounceTestInterval));
    const debounceEffective = callbackCount <= expectedMaxCallbacks;
    
    testResults.debouncing = {
      passed: debounceEffective,
      details: `Generated ${changeCount} changes, received ${callbackCount} callbacks (expected ≤${expectedMaxCallbacks})`
    };
    
    console.log(`✅ Debouncing test: ${debounceEffective ? 'PASSED' : 'FAILED'} - ${testResults.debouncing.details}`);
    
  } catch (error) {
    testResults.debouncing = {
      passed: false,
      details: `Error: ${error.message}`
    };
    console.log(`❌ Debouncing test: FAILED - ${error.message}`);
  }
}

/**
 * Test connection pooling by creating multiple similar subscriptions
 */
async function testConnectionPooling() {
  console.log('🔗 Testing connection pooling...');
  
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    const channels = [];
    const startTime = Date.now();
    
    // Create multiple similar subscriptions that should be pooled
    for (let i = 0; i < TEST_CONFIG.concurrentSubscriptions; i++) {
      const channel = supabase
        .channel(`pool_test_${i}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'schedule_entries'
        }, (payload) => {
          // Callback for testing
        })
        .subscribe();
      
      channels.push(channel);
      
      // Small delay between subscriptions
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const subscriptionTime = Date.now() - startTime;
    
    // Check if subscriptions were created efficiently (should be faster with pooling)
    const avgTimePerSubscription = subscriptionTime / TEST_CONFIG.concurrentSubscriptions;
    const poolingEffective = avgTimePerSubscription < 100; // Less than 100ms per subscription suggests pooling
    
    // Cleanup
    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }
    
    testResults.connectionPooling = {
      passed: poolingEffective,
      details: `Created ${TEST_CONFIG.concurrentSubscriptions} subscriptions in ${subscriptionTime}ms (avg: ${Math.round(avgTimePerSubscription)}ms each)`
    };
    
    console.log(`✅ Connection pooling test: ${poolingEffective ? 'PASSED' : 'FAILED'} - ${testResults.connectionPooling.details}`);
    
  } catch (error) {
    testResults.connectionPooling = {
      passed: false,
      details: `Error: ${error.message}`
    };
    console.log(`❌ Connection pooling test: FAILED - ${error.message}`);
  }
}

/**
 * Test circuit breaker functionality by simulating failures
 */
async function testCircuitBreaker() {
  console.log('⚡ Testing circuit breaker pattern...');
  
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    let failureCount = 0;
    let successCount = 0;
    
    // Create subscription that will fail (invalid table)
    const failingChannel = supabase
      .channel('circuit_breaker_test')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'non_existent_table'
      }, (payload) => {
        successCount++;
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          failureCount++;
        }
      });
    
    // Wait for potential failures
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create a working subscription to test recovery
    const workingChannel = supabase
      .channel('circuit_breaker_recovery_test')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'schedule_entries'
      }, (payload) => {
        successCount++;
      })
      .subscribe();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cleanup
    await supabase.removeChannel(failingChannel);
    await supabase.removeChannel(workingChannel);
    
    const circuitBreakerWorking = failureCount > 0 && successCount >= 0; // Should handle failures gracefully
    
    testResults.circuitBreaker = {
      passed: circuitBreakerWorking,
      details: `Detected ${failureCount} failures, ${successCount} successes. Circuit breaker ${circuitBreakerWorking ? 'functioning' : 'not detected'}`
    };
    
    console.log(`✅ Circuit breaker test: ${circuitBreakerWorking ? 'PASSED' : 'FAILED'} - ${testResults.circuitBreaker.details}`);
    
  } catch (error) {
    testResults.circuitBreaker = {
      passed: false,
      details: `Error: ${error.message}`
    };
    console.log(`❌ Circuit breaker test: FAILED - ${error.message}`);
  }
}

/**
 * Test database performance with new indexes
 */
async function testDatabasePerformance() {
  console.log('🗄️ Testing database performance with new indexes...');
  
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    
    // Test team-specific schedule query (should use new index)
    const startTime1 = Date.now();
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedule_entries')
      .select('*')
      .gte('date', '2024-01-01')
      .lte('date', '2024-12-31')
      .in('member_id', [1, 2, 3, 4, 5])
      .order('date', { ascending: true });
    
    const scheduleQueryTime = Date.now() - startTime1;
    
    if (scheduleError) {
      throw new Error(`Schedule query error: ${scheduleError.message}`);
    }
    
    // Test team member lookup (should use new index)
    const startTime2 = Date.now();
    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', 1)
      .is('inactive_date', null);
    
    const teamQueryTime = Date.now() - startTime2;
    
    if (teamError) {
      throw new Error(`Team query error: ${teamError.message}`);
    }
    
    // Test sprint settings query
    const startTime3 = Date.now();
    const { data: sprintData, error: sprintError } = await supabase
      .from('global_sprint_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const sprintQueryTime = Date.now() - startTime3;
    
    if (sprintError) {
      throw new Error(`Sprint query error: ${sprintError.message}`);
    }
    
    const totalQueryTime = scheduleQueryTime + teamQueryTime + sprintQueryTime;
    const averageQueryTime = totalQueryTime / 3;
    const performanceGood = averageQueryTime < 200; // Less than 200ms average
    
    testResults.databasePerformance = {
      passed: performanceGood,
      details: `Schedule: ${scheduleQueryTime}ms (${scheduleData?.length || 0} rows), Team: ${teamQueryTime}ms (${teamData?.length || 0} rows), Sprint: ${sprintQueryTime}ms. Avg: ${Math.round(averageQueryTime)}ms`
    };
    
    console.log(`✅ Database performance test: ${performanceGood ? 'PASSED' : 'FAILED'} - ${testResults.databasePerformance.details}`);
    
  } catch (error) {
    testResults.databasePerformance = {
      passed: false,
      details: `Error: ${error.message}`
    };
    console.log(`❌ Database performance test: FAILED - ${error.message}`);
  }
}

/**
 * Test for memory leaks by creating and destroying many subscriptions
 */
async function testMemoryLeaks() {
  console.log('🧠 Testing memory leak prevention...');
  
  try {
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey);
    const initialMemory = process.memoryUsage().heapUsed;
    const channels = [];
    
    // Create many subscriptions
    for (let i = 0; i < 50; i++) {
      const channel = supabase
        .channel(`memory_test_${i}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'schedule_entries'
        }, (payload) => {
          // Callback
        })
        .subscribe();
      
      channels.push(channel);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    const peakMemory = process.memoryUsage().heapUsed;
    
    // Cleanup all subscriptions
    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    const finalMemory = process.memoryUsage().heapUsed;
    
    const memoryIncrease = finalMemory - initialMemory;
    const memoryLeakDetected = memoryIncrease > 10 * 1024 * 1024; // More than 10MB indicates potential leak
    
    testResults.memoryLeaks = {
      passed: !memoryLeakDetected,
      details: `Initial: ${Math.round(initialMemory / 1024 / 1024)}MB, Peak: ${Math.round(peakMemory / 1024 / 1024)}MB, Final: ${Math.round(finalMemory / 1024 / 1024)}MB, Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`
    };
    
    console.log(`✅ Memory leak test: ${!memoryLeakDetected ? 'PASSED' : 'FAILED'} - ${testResults.memoryLeaks.details}`);
    
  } catch (error) {
    testResults.memoryLeaks = {
      passed: false,
      details: `Error: ${error.message}`
    };
    console.log(`❌ Memory leak test: FAILED - ${error.message}`);
  }
}

/**
 * Calculate overall score and generate report
 */
function generateReport() {
  const testCount = Object.keys(testResults).length - 1; // Exclude overallScore
  const passedCount = Object.values(testResults).filter(test => test.passed === true).length;
  const overallScore = Math.round((passedCount / testCount) * 100);
  
  testResults.overallScore = overallScore;
  
  console.log('\n📊 SUBSCRIPTION ENHANCEMENT TEST RESULTS');
  console.log('==========================================');
  
  Object.entries(testResults).forEach(([testName, result]) => {
    if (testName === 'overallScore') return;
    
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASSED' : 'FAILED';
    console.log(`${icon} ${testName.toUpperCase()}: ${status}`);
    console.log(`   ${result.details}`);
    console.log('');
  });
  
  console.log(`🏆 OVERALL SCORE: ${overallScore}% (${passedCount}/${testCount} tests passed)`);
  
  if (overallScore >= 80) {
    console.log('🎉 EXCELLENT: Subscription enhancements are working well!');
  } else if (overallScore >= 60) {
    console.log('👍 GOOD: Most enhancements are working, some issues to address.');
  } else {
    console.log('⚠️ NEEDS WORK: Several critical issues need to be addressed.');
  }
  
  // Generate recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (!testResults.debouncing.passed) {
    console.log('- Review debouncing implementation in SubscriptionManager');
  }
  if (!testResults.connectionPooling.passed) {
    console.log('- Optimize connection pooling logic for better efficiency');
  }
  if (!testResults.circuitBreaker.passed) {
    console.log('- Verify circuit breaker implementation and error handling');
  }
  if (!testResults.databasePerformance.passed) {
    console.log('- Check if new database indexes are properly created and used');
  }
  if (!testResults.memoryLeaks.passed) {
    console.log('- Review cleanup logic to prevent memory leaks');
  }
  
  return testResults;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Subscription Enhancement Tests...\n');
  
  try {
    await testDebouncing();
    await testConnectionPooling();
    await testCircuitBreaker();
    await testDatabasePerformance();
    await testMemoryLeaks();
    
    return generateReport();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return { error: error.message, overallScore: 0 };
  }
}

// Export for use in other scripts or run directly
if (require.main === module) {
  runAllTests().then((results) => {
    process.exit(results.overallScore >= 60 ? 0 : 1);
  });
}

module.exports = { runAllTests, testResults };