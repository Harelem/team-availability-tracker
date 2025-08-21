/**
 * Simplified JavaScript Health Check for Node.js Scripts
 * 
 * This module provides basic health checking capabilities that can be used
 * by Node.js scripts without requiring TypeScript compilation.
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Performs a basic database health check
 */
async function performBasicHealthCheck() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return {
      isHealthy: false,
      errors: ['Missing Supabase environment variables'],
      warnings: [],
      details: {
        connectivity: false,
        requiredFunctions: {},
        requiredColumns: {},
        performanceMetrics: {}
      }
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const result = {
    isHealthy: true,
    errors: [],
    warnings: [],
    details: {
      connectivity: false,
      requiredFunctions: {},
      requiredColumns: {},
      performanceMetrics: {}
    }
  };

  try {
    // Test basic connectivity
    const connectivityStart = Date.now();
    const { error: connectError } = await supabase
      .from('team_members')
      .select('count')
      .limit(1);
    
    const connectivityTime = Date.now() - connectivityStart;
    result.details.performanceMetrics.connectivity = connectivityTime;

    if (connectError) {
      result.errors.push(`Database connectivity failed: ${connectError.message}`);
      result.isHealthy = false;
      return result;
    }

    result.details.connectivity = true;

    // Test critical functions
    const criticalFunctions = [
      {
        name: 'get_daily_company_status_data',
        testParams: { target_date: new Date().toISOString().split('T')[0] },
        critical: true
      },
      {
        name: 'value_to_hours',
        testParams: { value_str: '0.5' },
        critical: true
      }
    ];

    for (const func of criticalFunctions) {
      const funcStart = Date.now();
      
      try {
        const { error: funcError } = await supabase.rpc(func.name, func.testParams);
        
        const funcTime = Date.now() - funcStart;
        result.details.performanceMetrics[func.name] = funcTime;

        if (funcError) {
          result.details.requiredFunctions[func.name] = false;
          
          if (funcError.message.includes('could not find function')) {
            const message = `Critical function '${func.name}' is missing. Apply SQL migration from sql/enhance-daily-company-status.sql`;
            
            if (func.critical) {
              result.errors.push(message);
              result.isHealthy = false;
            } else {
              result.warnings.push(message);
            }
          } else {
            const message = `Function '${func.name}' error: ${funcError.message}`;
            
            if (func.critical) {
              result.errors.push(message);
              result.isHealthy = false;
            } else {
              result.warnings.push(message);
            }
          }
        } else {
          result.details.requiredFunctions[func.name] = true;
        }
      } catch (exception) {
        result.details.requiredFunctions[func.name] = false;
        const message = `Function '${func.name}' exception: ${exception.message}`;
        
        if (func.critical) {
          result.errors.push(message);
          result.isHealthy = false;
        } else {
          result.warnings.push(message);
        }
      }
    }

    // Test basic schema
    const requiredTables = ['team_members', 'schedule_entries', 'teams'];
    
    for (const tableName of requiredTables) {
      try {
        const { data, error: schemaError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (schemaError) {
          result.errors.push(`Table '${tableName}' error: ${schemaError.message}`);
          result.isHealthy = false;
          result.details.requiredColumns[tableName] = false;
        } else {
          result.details.requiredColumns[tableName] = true;
        }
      } catch (exception) {
        result.errors.push(`Schema check for '${tableName}' failed: ${exception.message}`);
        result.isHealthy = false;
        result.details.requiredColumns[tableName] = false;
      }
    }

  } catch (error) {
    result.errors.push(`Health check failed: ${error.message}`);
    result.isHealthy = false;
  }

  return result;
}

/**
 * Quick connectivity check
 */
async function quickHealthCheck() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase
      .from('team_members')
      .select('count')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Logs health check results with formatting
 */
function logHealthCheckResults(result) {
  console.log('🏥 Database Health Check Results:');
  console.log('================================');

  if (result.isHealthy) {
    console.log('✅ Database is healthy and ready');
  } else {
    console.log('❌ Database health issues detected');
  }

  if (result.errors.length > 0) {
    console.log('\n🚨 ERRORS (require immediate attention):');
    result.errors.forEach(error => console.log(`  ❌ ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    result.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
  }

  // Performance summary
  console.log('\n📊 Performance Metrics:');
  for (const [metric, time] of Object.entries(result.details.performanceMetrics)) {
    const status = time < 500 ? '🟢' : time < 1000 ? '🟡' : '🔴';
    console.log(`  ${status} ${metric}: ${time}ms`);
  }

  if (!result.isHealthy) {
    console.log('\n💡 Quick Fix:');
    console.log('  1. Apply SQL migration: sql/enhance-daily-company-status.sql');
    console.log('  2. Run validation: node scripts/validate-database-fix.js');
    console.log('  3. Check documentation: CRITICAL-DATABASE-FIX.md');
  }

  console.log('================================\n');
}

/**
 * Performs startup validation
 */
async function performStartupValidation() {
  console.log('🚀 Performing startup database validation...\n');
  
  const result = await performBasicHealthCheck();
  logHealthCheckResults(result);

  if (!result.isHealthy) {
    console.error('💥 STARTUP FAILED: Critical database issues detected');
    console.error('🛠️  Application cannot start until these issues are resolved');
    console.error('📖 See CRITICAL-DATABASE-FIX.md for solutions\n');
  }

  return result.isHealthy;
}

module.exports = {
  performBasicHealthCheck,
  quickHealthCheck,
  logHealthCheckResults,
  performStartupValidation
};