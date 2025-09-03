/**
 * Debug test file to isolate and test database persistence issues
 * This bypasses the complex async queue system to test direct database operations
 */

import { supabase } from './supabase'
import logger from '@/utils/logger'

// Simple direct database test function
export async function testDirectDatabaseWrite(
  memberId: number,
  date: string,
  value: '1' | '0.5' | 'X' | null,
  reason?: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    logger.info(`🧪 Testing direct database write for member ${memberId} on ${date} with value ${value}`, 'database-test')
    
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }
    
    if (value === null) {
      // Delete operation
      const { error, count } = await supabase
        .from('schedule_entries')
        .delete()
        .eq('member_id', memberId)
        .eq('date', date)
      
      if (error) {
        logger.error(`❌ Delete failed: ${error.message}`, 'database-test')
        return { success: false, error: error.message }
      }
      
      // Verify deletion
      const { data: verifyData, error: verifyError } = await supabase
        .from('schedule_entries')
        .select('id')
        .eq('member_id', memberId)
        .eq('date', date)
        .maybeSingle()
      
      if (verifyError) {
        logger.warn(`⚠️ Verification failed: ${verifyError.message}`, 'database-test')
      }
      
      const deletionSuccess = !verifyData
      logger.info(`🔍 Deletion verification: ${deletionSuccess ? 'SUCCESS - entry deleted' : 'FAILED - entry still exists'}`, 'database-test')
      
      return { 
        success: deletionSuccess, 
        data: { 
          operation: 'delete', 
          affectedRows: count,
          verificationPassed: deletionSuccess 
        } 
      }
    } else {
      // Upsert operation
      const { error, data, count } = await supabase
        .from('schedule_entries')
        .upsert({
          member_id: memberId,
          date,
          value,
          reason: reason || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'member_id,date' })
      
      if (error) {
        logger.error(`❌ Upsert failed: ${error.message}`, 'database-test')
        return { success: false, error: error.message }
      }
      
      // Verify the write
      const { data: verifyData, error: verifyError } = await supabase
        .from('schedule_entries')
        .select('id, member_id, date, value, reason, updated_at')
        .eq('member_id', memberId)
        .eq('date', date)
        .single()
      
      if (verifyError) {
        logger.error(`❌ Verification failed: ${verifyError.message}`, 'database-test')
        return { success: false, error: `Write succeeded but verification failed: ${verifyError.message}` }
      }
      
      const dataMatches = verifyData.value === value && verifyData.reason === (reason || null)
      logger.info(`🔍 Write verification: ${dataMatches ? 'SUCCESS' : 'FAILED'} - DB has value=${verifyData.value}, reason=${verifyData.reason}`, 'database-test')
      
      return { 
        success: dataMatches, 
        data: { 
          operation: 'upsert', 
          affectedRows: count,
          verificationData: verifyData,
          dataMatches 
        } 
      }
    }
  } catch (error) {
    logger.error(`💥 Direct database test failed: ${error}`, 'database-test')
    return { success: false, error: String(error) }
  }
}

// Test function that can be called from console for debugging
export async function runDatabaseConnectivityTest(): Promise<void> {
  logger.info('🚀 Starting database connectivity test...', 'database-test')
  
  const testCases = [
    { memberId: 1, date: '2025-09-03', value: '1' as const, reason: undefined },
    { memberId: 1, date: '2025-09-03', value: '0.5' as const, reason: 'Test reason' },
    { memberId: 1, date: '2025-09-03', value: 'X' as const, reason: 'Test vacation' },
    { memberId: 1, date: '2025-09-03', value: null, reason: undefined },
  ]
  
  for (const testCase of testCases) {
    logger.info(`Testing: ${JSON.stringify(testCase)}`, 'database-test')
    const result = await testDirectDatabaseWrite(
      testCase.memberId,
      testCase.date,
      testCase.value,
      testCase.reason
    )
    
    if (result.success) {
      logger.success(`✅ Test passed: ${JSON.stringify(result.data)}`, 'database-test')
    } else {
      logger.error(`❌ Test failed: ${result.error}`, 'database-test')
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  logger.success('🏁 Database connectivity test completed', 'database-test')
}

// Make available in global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).testDirectDatabaseWrite = testDirectDatabaseWrite
  (window as any).runDatabaseConnectivityTest = runDatabaseConnectivityTest
}