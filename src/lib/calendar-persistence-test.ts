/**
 * Calendar Persistence Test Module
 * 
 * This module provides testing functions to debug calendar persistence issues.
 * It can be imported into components or used from browser console for debugging.
 */

import { DatabaseService } from './database'
import logger from '@/utils/logger'

// Test configuration
const TEST_CONFIG = {
  testMemberId: 1, // Use member ID 1 for tests
  testDate: '2025-09-03', // Use today's date for tests
}

/**
 * Test function to verify calendar persistence with comprehensive logging
 */
export async function testCalendarPersistence(
  memberId: number = TEST_CONFIG.testMemberId,
  date: string = TEST_CONFIG.testDate
): Promise<{ success: boolean; results: any[] }> {
  logger.info(`🧪 Starting calendar persistence test for member ${memberId} on ${date}`, 'persistence-test')
  
  const results: any[] = []
  let allTestsSuccess = true
  
  const testCases = [
    { value: '1' as const, reason: undefined, description: 'Full day (1)' },
    { value: '0.5' as const, reason: 'Test half day', description: 'Half day (0.5) with reason' },
    { value: 'X' as const, reason: 'Test vacation', description: 'Vacation (X) with reason' },
    { value: null, reason: undefined, description: 'Delete entry (null)' },
    { value: '1' as const, reason: 'Final test', description: 'Full day (1) with reason - final test' }
  ]
  
  for (const [index, testCase] of testCases.entries()) {
    logger.info(`📝 Test ${index + 1}/5: ${testCase.description}`, 'persistence-test')
    
    try {
      // Test with regular method (async queue)
      const startTime = Date.now()
      await DatabaseService.updateScheduleEntry(memberId, date, testCase.value, testCase.reason)
      const regularDuration = Date.now() - startTime
      
      // Wait a bit to ensure async processing completes
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verify via direct database query
      const { data: verifyData, error: verifyError } = await DatabaseService.getSupabaseClient()
        ?.from('schedule_entries')
        .select('id, member_id, date, value, reason, updated_at')
        .eq('member_id', memberId)
        .eq('date', date)
        .maybeSingle()
      
      let testSuccess = true
      let errorMsg = ''
      
      if (verifyError) {
        testSuccess = false
        errorMsg = `Verification query failed: ${verifyError.message}`
      } else if (testCase.value === null) {
        // For delete operation, entry should not exist
        if (verifyData) {
          testSuccess = false
          errorMsg = `Delete failed: Entry still exists with id ${verifyData.id}`
        }
      } else {
        // For create/update operations, entry should exist with correct values
        if (!verifyData) {
          testSuccess = false
          errorMsg = 'Entry does not exist in database'
        } else if (verifyData.value !== testCase.value || verifyData.reason !== (testCase.reason || null)) {
          testSuccess = false
          errorMsg = `Data mismatch: Expected value=${testCase.value}, reason=${testCase.reason || null}, got value=${verifyData.value}, reason=${verifyData.reason}`
        }
      }
      
      const result = {
        testNumber: index + 1,
        description: testCase.description,
        input: testCase,
        success: testSuccess,
        duration: regularDuration,
        verification: verifyData,
        error: testSuccess ? null : errorMsg
      }
      
      results.push(result)
      
      if (testSuccess) {
        logger.success(`✅ Test ${index + 1} PASSED: ${testCase.description}`, 'persistence-test')
      } else {
        logger.error(`❌ Test ${index + 1} FAILED: ${testCase.description} - ${errorMsg}`, 'persistence-test')
        allTestsSuccess = false
      }
      
    } catch (error) {
      const result = {
        testNumber: index + 1,
        description: testCase.description,
        input: testCase,
        success: false,
        error: String(error),
        exception: true
      }
      
      results.push(result)
      allTestsSuccess = false
      
      logger.error(`💥 Test ${index + 1} EXCEPTION: ${testCase.description} - ${error}`, 'persistence-test')
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Summary
  const successCount = results.filter(r => r.success).length
  logger.info(`🏁 Calendar persistence test completed: ${successCount}/${results.length} tests passed`, 'persistence-test')
  
  if (allTestsSuccess) {
    logger.success('🎉 ALL TESTS PASSED - Calendar persistence is working correctly!', 'persistence-test')
  } else {
    logger.error('💥 SOME TESTS FAILED - Calendar persistence has issues that need to be fixed', 'persistence-test')
  }
  
  return { success: allTestsSuccess, results }
}

/**
 * Test function using direct database update (bypassing async queue)
 */
export async function testCalendarPersistenceDirect(
  memberId: number = TEST_CONFIG.testMemberId,
  date: string = TEST_CONFIG.testDate
): Promise<{ success: boolean; results: any[] }> {
  logger.info(`🚨 Starting DIRECT calendar persistence test for member ${memberId} on ${date}`, 'persistence-test')
  
  const results: any[] = []
  let allTestsSuccess = true
  
  const testCases = [
    { value: '1' as const, reason: undefined, description: 'Direct: Full day (1)' },
    { value: '0.5' as const, reason: 'Direct half day', description: 'Direct: Half day (0.5) with reason' },
    { value: 'X' as const, reason: 'Direct vacation', description: 'Direct: Vacation (X) with reason' },
    { value: null, reason: undefined, description: 'Direct: Delete entry (null)' },
  ]
  
  for (const [index, testCase] of testCases.entries()) {
    logger.info(`🚨 Direct Test ${index + 1}/4: ${testCase.description}`, 'persistence-test')
    
    try {
      // Test with direct method (no queue)
      const startTime = Date.now()
      await DatabaseService.updateScheduleEntryDirect(memberId, date, testCase.value, testCase.reason)
      const directDuration = Date.now() - startTime
      
      // Immediate verification (no additional delay needed for direct method)
      const { data: verifyData, error: verifyError } = await DatabaseService.getSupabaseClient()
        ?.from('schedule_entries')
        .select('id, member_id, date, value, reason, updated_at')
        .eq('member_id', memberId)
        .eq('date', date)
        .maybeSingle()
      
      let testSuccess = true
      let errorMsg = ''
      
      if (verifyError) {
        testSuccess = false
        errorMsg = `Verification query failed: ${verifyError.message}`
      } else if (testCase.value === null) {
        if (verifyData) {
          testSuccess = false
          errorMsg = `Delete failed: Entry still exists with id ${verifyData.id}`
        }
      } else {
        if (!verifyData) {
          testSuccess = false
          errorMsg = 'Entry does not exist in database'
        } else if (verifyData.value !== testCase.value || verifyData.reason !== (testCase.reason || null)) {
          testSuccess = false
          errorMsg = `Data mismatch: Expected value=${testCase.value}, reason=${testCase.reason || null}, got value=${verifyData.value}, reason=${verifyData.reason}`
        }
      }
      
      const result = {
        testNumber: index + 1,
        description: testCase.description,
        input: testCase,
        success: testSuccess,
        duration: directDuration,
        verification: verifyData,
        error: testSuccess ? null : errorMsg
      }
      
      results.push(result)
      
      if (testSuccess) {
        logger.success(`✅ Direct Test ${index + 1} PASSED: ${testCase.description}`, 'persistence-test')
      } else {
        logger.error(`❌ Direct Test ${index + 1} FAILED: ${testCase.description} - ${errorMsg}`, 'persistence-test')
        allTestsSuccess = false
      }
      
    } catch (error) {
      const result = {
        testNumber: index + 1,
        description: testCase.description,
        input: testCase,
        success: false,
        error: String(error),
        exception: true
      }
      
      results.push(result)
      allTestsSuccess = false
      
      logger.error(`💥 Direct Test ${index + 1} EXCEPTION: ${testCase.description} - ${error}`, 'persistence-test')
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Summary
  const successCount = results.filter(r => r.success).length
  logger.info(`🏁 DIRECT calendar persistence test completed: ${successCount}/${results.length} tests passed`, 'persistence-test')
  
  if (allTestsSuccess) {
    logger.success('🎉 ALL DIRECT TESTS PASSED - Direct calendar persistence is working correctly!', 'persistence-test')
  } else {
    logger.error('💥 SOME DIRECT TESTS FAILED - Direct calendar persistence has issues', 'persistence-test')
  }
  
  return { success: allTestsSuccess, results }
}

/**
 * Comprehensive test that runs both regular and direct methods for comparison
 */
export async function runComprehensiveCalendarTest(): Promise<void> {
  logger.info('🚀 Starting comprehensive calendar persistence test...', 'persistence-test')
  
  // Run regular tests
  logger.info('📋 Running regular (async queue) persistence tests...', 'persistence-test')
  const regularResults = await testCalendarPersistence()
  
  // Wait between test suites
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Run direct tests
  logger.info('🚨 Running direct (no queue) persistence tests...', 'persistence-test')
  const directResults = await testCalendarPersistenceDirect()
  
  // Compare results
  logger.info('📊 Test Results Comparison:', 'persistence-test')
  logger.info(`Regular method: ${regularResults.success ? 'PASSED' : 'FAILED'}`, 'persistence-test')
  logger.info(`Direct method: ${directResults.success ? 'PASSED' : 'FAILED'}`, 'persistence-test')
  
  if (regularResults.success && directResults.success) {
    logger.success('🎉 COMPREHENSIVE TEST PASSED - Both methods work correctly!', 'persistence-test')
  } else if (directResults.success && !regularResults.success) {
    logger.error('🔍 ISSUE IDENTIFIED: Direct method works but regular async queue method fails', 'persistence-test')
    logger.error('   This indicates the problem is in the async queue/Promise handling, not the database operations themselves', 'persistence-test')
  } else if (!directResults.success && regularResults.success) {
    logger.error('🔍 UNEXPECTED: Regular method works but direct method fails', 'persistence-test')
  } else {
    logger.error('💥 BOTH METHODS FAILED - There may be a fundamental database connectivity issue', 'persistence-test')
  }
}

// Global debugging functions disabled due to TypeScript inference issues
// Functions can still be imported and used directly in console or tests