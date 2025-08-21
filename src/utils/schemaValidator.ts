/**
 * Schema Validator
 * 
 * Validates database schema to ensure critical columns exist before app initialization
 */

import { supabase } from '@/lib/supabase';

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validTables: string[];
  invalidTables: string[];
}

export interface TableColumnCheck {
  table: string;
  requiredColumns: string[];
  optionalColumns?: string[];
}

// Critical schema requirements
const REQUIRED_SCHEMA: TableColumnCheck[] = [
  {
    table: 'teams',
    requiredColumns: ['id', 'name', 'description', 'color', 'created_at', 'updated_at'],
    optionalColumns: []
  },
  {
    table: 'team_members',
    requiredColumns: ['id', 'name', 'hebrew', 'is_manager', 'email', 'team_id', 'created_at', 'updated_at'],
    optionalColumns: ['phone', 'role']
  },
  {
    table: 'schedule_entries',
    requiredColumns: ['id', 'member_id', 'date', 'value', 'reason', 'created_at', 'updated_at'],
    optionalColumns: ['notes', 'hours']
  },
  {
    table: 'global_sprint_settings',
    requiredColumns: ['id', 'current_sprint_number', 'sprint_start_date', 'sprint_length_weeks'],
    optionalColumns: ['description', 'sprint_name', 'sprint_end_date', 'notes', 'updated_by', 'created_at', 'updated_at']
  }
];

/**
 * Validate database schema by attempting to query required columns
 */
export async function validateDatabaseSchema(): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    validTables: [],
    invalidTables: []
  };

  console.log('🔍 Starting database schema validation...');

  for (const tableCheck of REQUIRED_SCHEMA) {
    try {
      const { table, requiredColumns } = tableCheck;
      
      // Test basic table access
      const { data, error } = await supabase
        .from(table)
        .select(requiredColumns.join(','))
        .limit(1);

      if (error) {
        result.isValid = false;
        result.invalidTables.push(table);
        
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          result.errors.push(`❌ Missing column in table '${table}': ${error.message}`);
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          result.errors.push(`❌ Table '${table}' does not exist: ${error.message}`);
        } else {
          result.errors.push(`❌ Schema error in table '${table}': ${error.message}`);
        }
        
        console.error(`❌ Schema validation failed for table '${table}':`, error.message);
      } else {
        result.validTables.push(table);
        console.log(`✅ Schema validation passed for table '${table}'`);
      }
    } catch (error) {
      result.isValid = false;
      result.invalidTables.push(tableCheck.table);
      result.errors.push(`❌ Unexpected error validating table '${tableCheck.table}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`❌ Unexpected error validating table '${tableCheck.table}':`, error);
    }
  }

  // Log summary
  if (result.isValid) {
    console.log(`✅ Database schema validation completed successfully - ${result.validTables.length} tables validated`);
  } else {
    console.error(`❌ Database schema validation failed - ${result.errors.length} errors found`);
    result.errors.forEach(error => console.error(error));
  }

  return result;
}

/**
 * Validate specific table columns exist
 */
export async function validateTableColumns(table: string, columns: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(table)
      .select(columns.join(','))
      .limit(1);

    if (error) {
      console.error(`Column validation failed for table '${table}':`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error validating table '${table}':`, error);
    return false;
  }
}

/**
 * Check if database is accessible and responsive
 */
export async function checkDatabaseConnectivity(): Promise<{
  isConnected: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const { error } = await supabase
      .from('teams')
      .select('id')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        isConnected: false,
        responseTime,
        error: error.message
      };
    }

    return {
      isConnected: true,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      isConnected: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
}

/**
 * Safe initialization with schema validation
 */
export async function safeInitializeWithValidation<T>(
  operation: () => Promise<T>,
  operationName: string,
  requiredTables?: string[]
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
  schemaValid: boolean;
}> {
  try {
    console.log(`🚀 Starting safe initialization: ${operationName}`);

    // First, validate schema if required tables specified
    if (requiredTables && requiredTables.length > 0) {
      console.log(`🔍 Validating required tables: ${requiredTables.join(', ')}`);
      
      for (const table of requiredTables) {
        const tableCheck = REQUIRED_SCHEMA.find(check => check.table === table);
        if (tableCheck) {
          const isValid = await validateTableColumns(table, tableCheck.requiredColumns);
          if (!isValid) {
            return {
              success: false,
              error: `Schema validation failed for table: ${table}`,
              schemaValid: false
            };
          }
        }
      }
    }

    // Execute the operation
    const data = await operation();
    console.log(`✅ Safe initialization completed: ${operationName}`);

    return {
      success: true,
      data,
      schemaValid: true
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Safe initialization failed: ${operationName}`, errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      schemaValid: false
    };
  }
}

export default {
  validateDatabaseSchema,
  validateTableColumns,
  checkDatabaseConnectivity,
  safeInitializeWithValidation
};