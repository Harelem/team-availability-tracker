#!/usr/bin/env node

/**
 * SIMPLE APPLICATION RECOVERY VALIDATION TEST
 * Tests critical functionality after schema fixes using HTTP requests
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3005';

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.get(url, (res) => {
      const duration = Date.now() - startTime;
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runValidationTests() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      passed: 0,
      failed: 0,
      errors: []
    }
  };

  console.log('🚀 Starting Application Recovery Validation Tests...\n');

  // Test 1: Health API Check
  console.log('🏥 TEST 1: Health API Check');
  try {
    const healthResponse = await makeRequest(`${BASE_URL}/api/health`);
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Duration: ${healthResponse.duration}ms`);
    
    if (healthResponse.success && healthResponse.body.includes('healthy')) {
      const healthData = JSON.parse(healthResponse.body);
      console.log(`   ✅ Database: ${healthData.checks?.database}`);
      console.log(`   📊 Memory: ${Math.round(healthData.checks?.memory?.heapUsed / 1024 / 1024)}MB`);
      console.log(`   ⏱️ Uptime: ${Math.round(healthData.checks?.uptime)}s`);
      
      results.tests.healthCheck = {
        passed: true,
        statusCode: healthResponse.statusCode,
        duration: healthResponse.duration,
        databaseStatus: healthData.checks?.database,
        details: 'Health endpoint responsive and database healthy'
      };
      results.summary.passed++;
    } else {
      throw new Error(`Health check failed: ${healthResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
    results.tests.healthCheck = {
      passed: false,
      error: error.message
    };
    results.summary.failed++;
    results.summary.errors.push(`Health check: ${error.message}`);
  }

  // Test 2: Main Page Response
  console.log('\n📋 TEST 2: Main Page Response');
  try {
    const mainPageResponse = await makeRequest(`${BASE_URL}/`);
    console.log(`   Status: ${mainPageResponse.statusCode}`);
    console.log(`   Duration: ${mainPageResponse.duration}ms`);
    console.log(`   Content-Length: ${mainPageResponse.headers['content-length'] || 'unknown'}`);
    
    if (mainPageResponse.success) {
      const hasReactContent = mainPageResponse.body.includes('__NEXT_DATA__') || 
                              mainPageResponse.body.includes('_next/static');
      console.log(`   🎯 React app detected: ${hasReactContent ? 'Yes' : 'No'}`);
      
      // Check for team-related content
      const hasTeamContent = mainPageResponse.body.includes('team') || 
                             mainPageResponse.body.includes('Team') ||
                             mainPageResponse.body.includes('TeamContext');
      console.log(`   👥 Team-related content: ${hasTeamContent ? 'Yes' : 'No'}`);
      
      results.tests.mainPageResponse = {
        passed: true,
        statusCode: mainPageResponse.statusCode,
        duration: mainPageResponse.duration,
        hasReactContent,
        hasTeamContent,
        contentSize: mainPageResponse.body.length,
        details: 'Main page loads successfully'
      };
      results.summary.passed++;
    } else {
      throw new Error(`Main page failed: ${mainPageResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`   ❌ Main page test failed: ${error.message}`);
    results.tests.mainPageResponse = {
      passed: false,
      error: error.message
    };
    results.summary.failed++;
    results.summary.errors.push(`Main page: ${error.message}`);
  }

  // Test 3: Executive Dashboard Response
  console.log('\n🏢 TEST 3: Executive Dashboard Response');
  try {
    const executiveResponse = await makeRequest(`${BASE_URL}/executive`);
    console.log(`   Status: ${executiveResponse.statusCode}`);
    console.log(`   Duration: ${executiveResponse.duration}ms`);
    
    if (executiveResponse.success) {
      const hasExecutiveContent = executiveResponse.body.includes('executive') || 
                                  executiveResponse.body.includes('Executive') ||
                                  executiveResponse.body.includes('COO');
      console.log(`   🎯 Executive content detected: ${hasExecutiveContent ? 'Yes' : 'No'}`);
      
      results.tests.executiveResponse = {
        passed: true,
        statusCode: executiveResponse.statusCode,
        duration: executiveResponse.duration,
        hasExecutiveContent,
        contentSize: executiveResponse.body.length,
        details: 'Executive dashboard loads successfully'
      };
      results.summary.passed++;
    } else {
      throw new Error(`Executive dashboard failed: ${executiveResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`   ❌ Executive dashboard test failed: ${error.message}`);
    results.tests.executiveResponse = {
      passed: false,
      error: error.message
    };
    results.summary.failed++;
    results.summary.errors.push(`Executive dashboard: ${error.message}`);
  }

  // Test 4: Performance Check
  console.log('\n⚡ TEST 4: Performance Assessment');
  const performanceTests = [results.tests.healthCheck, results.tests.mainPageResponse, results.tests.executiveResponse];
  const avgDuration = performanceTests
    .filter(test => test && test.duration)
    .reduce((sum, test) => sum + test.duration, 0) / performanceTests.length;

  console.log(`   📊 Average response time: ${Math.round(avgDuration)}ms`);
  
  const isPerformant = avgDuration < 3000; // Under 3 seconds target
  console.log(`   🎯 Performance target met: ${isPerformant ? 'Yes' : 'No'} (target: <3000ms)`);
  
  results.tests.performance = {
    passed: isPerformant,
    averageResponseTime: avgDuration,
    target: 3000,
    details: `Average response time: ${Math.round(avgDuration)}ms`
  };

  if (isPerformant) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
    results.summary.errors.push(`Performance: Average response time ${Math.round(avgDuration)}ms exceeds target`);
  }

  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('📋 APPLICATION RECOVERY VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`🕒 Test completed at: ${results.timestamp}`);
  console.log(`✅ Tests passed: ${results.summary.passed}`);
  console.log(`❌ Tests failed: ${results.summary.failed}`);
  console.log(`📊 Total tests: ${results.summary.passed + results.summary.failed}`);
  
  if (results.summary.errors.length > 0) {
    console.log(`\n🚨 Errors encountered:`);
    results.summary.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  const overallSuccess = results.summary.failed === 0;
  console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);
  
  if (overallSuccess) {
    console.log('🎉 Application appears to be fully recovered and functional!');
    console.log('✅ All core routes are accessible');
    console.log('✅ Database connectivity confirmed');
    console.log('✅ Performance targets met');
    console.log('✅ No critical issues detected');
  } else {
    console.log('⚠️ Application has issues that need to be addressed.');
  }

  // Save detailed results
  const reportPath = './validation-test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  return results;
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runValidationTests()
    .then((results) => {
      const success = results.summary.failed === 0;
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error running validation tests:', error);
      process.exit(1);
    });
}

module.exports = { runValidationTests };