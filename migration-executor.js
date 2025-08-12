const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql, description = '') {
  try {
    console.log(`🔄 Executing: ${description}`);
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error in ${description}:`, error);
      return { success: false, error };
    }
    
    console.log(`✅ Success: ${description}`);
    if (data) {
      console.log('Data:', data);
    }
    return { success: true, data };
  } catch (err) {
    console.error(`❌ Exception in ${description}:`, err);
    return { success: false, error: err };
  }
}

async function executeMigration() {
  console.log('🚀 Starting Enhanced Sprint System Migration v2.3.0');
  console.log('=' .repeat(60));
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'sql', 'enhanced-sprint-system-v2.3.0.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Migration file loaded successfully');
    console.log(`📊 Migration file size: ${migrationSQL.length} characters`);
    
    // Split the migration into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        const result = await executeSQL(statement, `Statement ${i + 1}/${statements.length}`);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          // Don't stop on errors - continue with next statement
        }
        
        // Small delay between statements
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    
    // Verify migration success
    await verifyMigration();
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('\n🔍 VERIFYING MIGRATION RESULTS');
  console.log('=' .repeat(60));
  
  const verificationQueries = [
    {
      name: 'Enhanced Sprint Configs Table',
      query: "SELECT COUNT(*) as count FROM enhanced_sprint_configs"
    },
    {
      name: 'Sprint Working Days Table',
      query: "SELECT COUNT(*) as count FROM sprint_working_days"
    },
    {
      name: 'Teams Table',
      query: "SELECT COUNT(*) as count FROM teams"
    },
    {
      name: 'Team Members with Team Assignment',
      query: "SELECT COUNT(*) as count FROM team_members WHERE team_id IS NOT NULL"
    },
    {
      name: 'Schedule Entries with Sprint ID',
      query: "SELECT COUNT(*) as count FROM schedule_entries WHERE sprint_id IS NOT NULL"
    },
    {
      name: 'Active Sprint Check',
      query: "SELECT COUNT(*) as count FROM enhanced_sprint_configs WHERE is_active = true"
    },
    {
      name: 'Current Enhanced Sprint View',
      query: "SELECT * FROM current_enhanced_sprint LIMIT 1"
    },
    {
      name: 'Team Sprint Analytics View',
      query: "SELECT team_name, total_members, max_capacity_hours FROM team_sprint_analytics LIMIT 5"
    }
  ];
  
  for (const verification of verificationQueries) {
    const result = await executeSQL(verification.query, `Verifying ${verification.name}`);
    if (result.success && result.data) {
      console.log(`✅ ${verification.name}: Verified`);
      if (Array.isArray(result.data) && result.data.length > 0) {
        console.log(`   Data sample:`, JSON.stringify(result.data[0], null, 2));
      }
    } else {
      console.log(`❌ ${verification.name}: Failed verification`);
    }
  }
  
  console.log('\n🎉 Migration verification complete!');
}

// Execute the migration
executeMigration().then(() => {
  console.log('🏁 Migration process completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Migration process failed:', error);
  process.exit(1);
});