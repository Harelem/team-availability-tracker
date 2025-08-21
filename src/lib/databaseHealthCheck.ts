/**
 * Database Health Check and Startup Validation
 * 
 * This module provides early validation of database health and required functions
 * to prevent runtime failures and provide clear error messages for missing components.
 */

import { supabase } from './supabase';

export interface HealthCheckResult {
  isHealthy: boolean;
  errors: string[];
  warnings: string[];
  details: {
    connectivity: boolean;
    requiredFunctions: { [key: string]: boolean };
    requiredColumns: { [key: string]: boolean };
    performanceMetrics: { [key: string]: number };
  };
}

// Critical database functions required for the application
const REQUIRED_FUNCTIONS = [
  {
    name: 'get_daily_company_status_data',
    testParams: { target_date: new Date().toISOString().split('T')[0] },
    critical: true,
    description: 'Core function for COO Dashboard daily status'
  },
  {
    name: 'value_to_hours',
    testParams: { value_str: '0.5' },
    critical: true,
    description: 'Converts schedule entry values to hours'
  }
];

// Required database columns
const REQUIRED_SCHEMA = {
  team_members: ['id', 'name', 'hebrew', 'role', 'is_manager', 'is_critical', 'inactive_date'],
  schedule_entries: ['id', 'member_id', 'date', 'value', 'reason'],
  teams: ['id', 'name']
};

/**
 * Performs comprehensive database health check
 */
export async function performDatabaseHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
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
    // Test 1: Basic connectivity
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

    // Test 2: Required functions
    for (const func of REQUIRED_FUNCTIONS) {
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
      } catch (exception: any) {
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

    // Test 3: Required schema
    for (const [tableName, requiredCols] of Object.entries(REQUIRED_SCHEMA)) {
      try {
        const { data, error: schemaError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (schemaError) {
          result.errors.push(`Table '${tableName}' error: ${schemaError.message}`);
          result.isHealthy = false;
          continue;
        }

        if (data && data.length > 0) {
          const actualCols = Object.keys(data[0]);
          const missingCols = requiredCols.filter(col => !actualCols.includes(col));
          
          if (missingCols.length > 0) {
            // Mark critical columns as errors, others as warnings
            const criticalCols = missingCols.filter(col => 
              ['id', 'name', 'role', 'member_id', 'date', 'value'].includes(col)
            );
            
            if (criticalCols.length > 0) {
              result.errors.push(`Table '${tableName}' missing critical columns: ${criticalCols.join(', ')}`);
              result.isHealthy = false;
            }
            
            const nonCriticalCols = missingCols.filter(col => !criticalCols.includes(col));
            if (nonCriticalCols.length > 0) {
              result.warnings.push(`Table '${tableName}' missing optional columns: ${nonCriticalCols.join(', ')}`);
            }
            
            result.details.requiredColumns[tableName] = false;
          } else {
            result.details.requiredColumns[tableName] = true;
          }
        } else {
          result.warnings.push(`Table '${tableName}' is empty - this may be expected for new installations`);
          result.details.requiredColumns[tableName] = true; // Structure exists
        }
      } catch (exception: any) {
        result.errors.push(`Schema check for '${tableName}' failed: ${exception.message}`);
        result.isHealthy = false;
        result.details.requiredColumns[tableName] = false;
      }
    }

    // Add performance warnings
    if (result.details.performanceMetrics.connectivity > 1000) {
      result.warnings.push(`Slow database connectivity: ${result.details.performanceMetrics.connectivity}ms`);
    }

    for (const [funcName, time] of Object.entries(result.details.performanceMetrics)) {
      if (funcName !== 'connectivity' && time > 2000) {
        result.warnings.push(`Slow function performance '${funcName}': ${time}ms`);
      }
    }

  } catch (error: any) {
    result.errors.push(`Health check failed: ${error.message}`);
    result.isHealthy = false;
  }

  return result;
}

/**
 * Logs health check results with appropriate formatting
 */
export function logHealthCheckResults(result: HealthCheckResult): void {
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
 * Performs startup validation - should be called when the application starts
 */
export async function performStartupValidation(): Promise<boolean> {
  console.log('🚀 Performing startup database validation...\n');
  
  const result = await performDatabaseHealthCheck();
  logHealthCheckResults(result);

  if (!result.isHealthy) {
    console.error('💥 STARTUP FAILED: Critical database issues detected');
    console.error('🛠️  Application cannot start until these issues are resolved');
    console.error('📖 See CRITICAL-DATABASE-FIX.md for solutions\n');
  }

  return result.isHealthy;
}

/**
 * Quick health check for runtime monitoring
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .select('count')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}