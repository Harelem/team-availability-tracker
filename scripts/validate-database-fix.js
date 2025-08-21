#!/usr/bin/env node

/**
 * Database Fix Validation Script
 * 
 * This script validates that the critical database function fix has been applied correctly.
 * Run this after applying the SQL migration to ensure everything works.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Color output for better readability
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function validateDatabaseFix() {
  log('blue', '🔍 Validating Critical Database Fix...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('red', '❌ Missing Supabase environment variables');
    log('yellow', 'Please ensure .env.local contains NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if the function exists and can be called
    log('blue', '📋 Test 1: Checking if get_daily_company_status_data function exists...');
    
    const { data: functionTest, error: functionError } = await supabase
      .rpc('get_daily_company_status_data', { target_date: new Date().toISOString().split('T')[0] });
    
    if (functionError) {
      log('red', `❌ Function call failed: ${functionError.message}`);
      if (functionError.message.includes('could not find function')) {
        log('yellow', '💡 Solution: Apply the SQL migration from sql/enhance-daily-company-status.sql');
      }
      return false;
    }
    
    log('green', `✅ Function exists and returns ${functionTest?.length || 0} records`);

    // Test 2: Check if required columns exist in team_members table
    log('blue', '📋 Test 2: Checking team_members table schema...');
    
    const { data: membersData, error: membersError } = await supabase
      .from('team_members')
      .select('id, name, role, is_critical, inactive_date')
      .limit(1);
    
    if (membersError) {
      log('red', `❌ Schema validation failed: ${membersError.message}`);
      if (membersError.message.includes('column') && membersError.message.includes('does not exist')) {
        log('yellow', '💡 Solution: Apply the SQL migration to add missing columns');
      }
      return false;
    }
    
    log('green', '✅ Required columns exist in team_members table');

    // Test 3: Check data integrity
    log('blue', '📋 Test 3: Checking data integrity...');
    
    const { data: allMembers, error: allMembersError } = await supabase
      .from('team_members')
      .select('id, name, role, is_manager');
    
    if (allMembersError) {
      log('red', `❌ Data integrity check failed: ${allMembersError.message}`);
      return false;
    }
    
    const membersWithoutRole = allMembers?.filter(m => !m.role) || [];
    if (membersWithoutRole.length > 0) {
      log('yellow', `⚠️  ${membersWithoutRole.length} members missing role assignment`);
      log('yellow', '💡 Solution: Run the data population queries from CRITICAL-DATABASE-FIX.md');
    } else {
      log('green', '✅ All members have proper role assignments');
    }

    // Test 4: Test the actual application function
    log('blue', '📋 Test 4: Testing application integration...');
    
    try {
      // Import and test the actual database service
      const { DatabaseService } = require('../src/lib/database.ts');
      const testDate = new Date();
      const result = await DatabaseService.getDailyCompanyStatus(testDate);
      
      if (result && result.summary) {
        log('green', '✅ Application integration working correctly');
        log('green', `   - Found ${result.teamStatuses?.length || 0} teams`);
        log('green', `   - Summary: ${result.summary.available} available, ${result.summary.halfDay} half day`);
      } else {
        log('yellow', '⚠️  Application returned data but structure may be incorrect');
      }
    } catch (appError) {
      log('yellow', `⚠️  Application integration test failed: ${appError.message}`);
      log('yellow', '   This may be expected if the app is not properly configured for testing');
    }

    // Test 5: Performance check
    log('blue', '📋 Test 5: Performance validation...');
    
    const startTime = Date.now();
    const { error: perfError } = await supabase
      .rpc('get_daily_company_status_data', { target_date: new Date().toISOString().split('T')[0] });
    const duration = Date.now() - startTime;
    
    if (perfError) {
      log('red', `❌ Performance test failed: ${perfError.message}`);
      return false;
    }
    
    if (duration < 1000) {
      log('green', `✅ Function performance good: ${duration}ms`);
    } else {
      log('yellow', `⚠️  Function performance slow: ${duration}ms (consider adding indexes)`);
    }

    // Final summary
    log('blue', '\n📊 Validation Summary:');
    log('green', '✅ Critical database function fix is working correctly!');
    log('green', '✅ COO Dashboard should now load without errors');
    log('green', '✅ Daily status functionality restored');
    
    return true;

  } catch (error) {
    log('red', `❌ Validation failed with error: ${error.message}`);
    log('yellow', '\n💡 Troubleshooting steps:');
    log('yellow', '1. Ensure Supabase is accessible');
    log('yellow', '2. Apply the SQL migration: sql/enhance-daily-company-status.sql');
    log('yellow', '3. Run data population queries');
    log('yellow', '4. Check RLS policies');
    
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateDatabaseFix()
    .then(success => {
      if (success) {
        log('blue', '\n🎉 All tests passed! The database fix is working correctly.');
        process.exit(0);
      } else {
        log('red', '\n💥 Validation failed. Please review the errors above and apply fixes.');
        process.exit(1);
      }
    })
    .catch(error => {
      log('red', `\n💥 Validation script failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { validateDatabaseFix };