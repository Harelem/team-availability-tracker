#!/usr/bin/env node

/**
 * Comprehensive Database Functions Verification Script
 * 
 * This script checks all required database functions and schema components
 * for the Team Availability Tracker application.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Color utilities
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// List of required database functions
const REQUIRED_FUNCTIONS = [
  {
    name: 'get_daily_company_status_data',
    signature: 'get_daily_company_status_data(target_date DATE)',
    description: 'Returns daily company status data for COO dashboard',
    testParams: { target_date: new Date().toISOString().split('T')[0] },
    critical: true
  },
  {
    name: 'value_to_hours',
    signature: 'value_to_hours(value_str VARCHAR)',
    description: 'Converts schedule entry values to numeric hours',
    testParams: { value_str: '0.5' },
    critical: true
  },
  {
    name: 'validate_daily_status_data',
    signature: 'validate_daily_status_data()',
    description: 'Validates data integrity for daily status',
    testParams: {},
    critical: false
  },
  {
    name: 'get_daily_status_summary',
    signature: 'get_daily_status_summary(target_date DATE)',
    description: 'Returns quick summary of daily status',
    testParams: { target_date: new Date().toISOString().split('T')[0] },
    critical: false
  }
];

// Required schema components
const REQUIRED_SCHEMA = {
  tables: [
    'team_members',
    'schedule_entries',
    'teams'
  ],
  columns: {
    team_members: ['id', 'name', 'hebrew', 'is_manager', 'team_id', 'role', 'is_critical', 'inactive_date'],
    schedule_entries: ['id', 'member_id', 'date', 'value', 'reason'],
    teams: ['id', 'name']
  },
  views: [
    'schedule_entries_with_hours'
  ]
};

async function verifyDatabaseFunctions() {
  log('blue', '🔍 Comprehensive Database Functions Verification');
  log('blue', '================================================\n');

  // Check environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('red', '❌ Missing Supabase environment variables');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  let allTestsPassed = true;

  try {
    // 1. Test Database Connectivity
    log('cyan', '📡 Testing database connectivity...');
    
    const { data: connTest, error: connError } = await supabase
      .from('team_members')
      .select('count')
      .limit(1);
    
    if (connError) {
      log('red', `❌ Database connection failed: ${connError.message}`);
      return false;
    }
    
    log('green', '✅ Database connectivity confirmed');

    // 2. Verify Required Functions
    log('cyan', '\n🔧 Verifying required database functions...');
    
    for (const func of REQUIRED_FUNCTIONS) {
      log('blue', `  Testing ${func.name}...`);
      
      try {
        const { data, error } = await supabase.rpc(func.name, func.testParams);
        
        if (error) {
          const status = func.critical ? '🚨 CRITICAL' : '⚠️  WARNING';
          log('red', `  ${status} ${func.name}: ${error.message}`);
          
          if (error.message.includes('could not find function')) {
            log('yellow', `    💡 Solution: Apply SQL migration containing ${func.name}`);
          }
          
          if (func.critical) {
            allTestsPassed = false;
          }
        } else {
          const resultInfo = Array.isArray(data) 
            ? `${data.length} records` 
            : typeof data === 'object' ? 'object result' : String(data);
          
          log('green', `  ✅ ${func.name} working (returned ${resultInfo})`);
        }
      } catch (exception) {
        log('red', `  🚨 ${func.name} exception: ${exception.message}`);
        if (func.critical) {
          allTestsPassed = false;
        }
      }
    }

    // 3. Verify Schema Components
    log('cyan', '\n📋 Verifying database schema...');
    
    // Check tables
    for (const tableName of REQUIRED_SCHEMA.tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          log('red', `  ❌ Table ${tableName}: ${error.message}`);
          allTestsPassed = false;
        } else {
          log('green', `  ✅ Table ${tableName} exists`);
          
          // Check required columns
          const requiredCols = REQUIRED_SCHEMA.columns[tableName];
          if (requiredCols && data && data.length > 0) {
            const actualCols = Object.keys(data[0]);
            const missingCols = requiredCols.filter(col => !actualCols.includes(col));
            
            if (missingCols.length > 0) {
              log('yellow', `    ⚠️  Missing columns in ${tableName}: ${missingCols.join(', ')}`);
              if (missingCols.some(col => ['role', 'is_critical', 'team_id'].includes(col))) {
                log('yellow', `    💡 Solution: Apply SQL migration to add missing columns`);
                allTestsPassed = false;
              }
            } else {
              log('green', `    ✅ All required columns present in ${tableName}`);
            }
          }
        }
      } catch (exception) {
        log('red', `  🚨 Table ${tableName} exception: ${exception.message}`);
        allTestsPassed = false;
      }
    }

    // Check views
    for (const viewName of REQUIRED_SCHEMA.views) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('*')
          .limit(1);
        
        if (error) {
          log('yellow', `  ⚠️  View ${viewName}: ${error.message}`);
          log('yellow', `    💡 Solution: Apply SQL migration to create view`);
        } else {
          log('green', `  ✅ View ${viewName} exists`);
        }
      } catch (exception) {
        log('red', `  🚨 View ${viewName} exception: ${exception.message}`);
      }
    }

    // 4. Test Application Integration
    log('cyan', '\n🔗 Testing application integration...');
    
    try {
      // Test the actual DatabaseService if available
      const { DatabaseService } = require('../src/lib/database.ts');
      
      const testDate = new Date();
      console.log('  Testing DatabaseService.getDailyCompanyStatus...');
      
      const result = await DatabaseService.getDailyCompanyStatus(testDate);
      
      if (result) {
        log('green', `  ✅ Application integration working`);
        log('green', `    - Teams: ${result.teams?.length || 0}`);
        log('green', `    - Members: ${result.members?.length || 0}`);
        log('green', `    - Used fallback: ${result.usedFallback ? 'Yes' : 'No'}`);
        
        if (result.usedFallback) {
          log('yellow', `    ⚠️  Using fallback method (function may be missing)`);
        }
      } else {
        log('yellow', `  ⚠️  Application returned null (may be expected)`);
      }
    } catch (appError) {
      log('yellow', `  ⚠️  Application integration test skipped: ${appError.message}`);
    }

    // 5. Performance Check
    log('cyan', '\n⚡ Performance validation...');
    
    const startTime = Date.now();
    try {
      const { error: perfError } = await supabase
        .rpc('get_daily_company_status_data', { 
          target_date: new Date().toISOString().split('T')[0] 
        });
      
      const duration = Date.now() - startTime;
      
      if (perfError) {
        log('red', `  ❌ Performance test failed: ${perfError.message}`);
      } else if (duration < 500) {
        log('green', `  ✅ Function performance excellent: ${duration}ms`);
      } else if (duration < 2000) {
        log('yellow', `  ⚠️  Function performance acceptable: ${duration}ms`);
      } else {
        log('red', `  ❌ Function performance poor: ${duration}ms`);
        log('yellow', `    💡 Consider adding database indexes for better performance`);
      }
    } catch (perfError) {
      log('yellow', `  ⚠️  Performance test skipped: ${perfError.message}`);
    }

    // Final Summary
    log('blue', '\n📊 Verification Summary:');
    log('blue', '======================');
    
    if (allTestsPassed) {
      log('green', '🎉 All critical database functions are working correctly!');
      log('green', '✅ Your Team Availability Tracker is ready to use');
      log('green', '✅ COO Dashboard should load without errors');
    } else {
      log('red', '🚨 Critical database issues found!');
      log('yellow', '💡 Required fixes:');
      log('yellow', '  1. Apply SQL migration: sql/enhance-daily-company-status.sql');
      log('yellow', '  2. Run data population queries (see CRITICAL-DATABASE-FIX.md)');
      log('yellow', '  3. Verify RLS policies allow function access');
    }

    return allTestsPassed;

  } catch (error) {
    log('red', `🚨 Verification failed: ${error.message}`);
    return false;
  }
}

// Export for use in other scripts
module.exports = { verifyDatabaseFunctions };

// Run if called directly
if (require.main === module) {
  verifyDatabaseFunctions()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log('red', `💥 Script failed: ${error.message}`);
      process.exit(1);
    });
}