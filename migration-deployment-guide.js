const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🚀 ENHANCED SPRINT SYSTEM MIGRATION DEPLOYMENT GUIDE v2.3.0');
console.log('=' .repeat(80));
console.log('📋 This guide provides step-by-step instructions for deploying the migration');
console.log('⚠️  IMPORTANT: DDL operations must be executed through Supabase Dashboard SQL Editor');
console.log('=' .repeat(80));

async function generateDeploymentInstructions() {
  console.log('\n📖 DEPLOYMENT INSTRUCTIONS');
  console.log('-' .repeat(50));
  
  console.log('\n🎯 PHASE 1: PRE-MIGRATION VERIFICATION');
  console.log('1. ✅ Verify database connection');
  console.log('2. ✅ Confirm existing tables structure');  
  console.log('3. ✅ Create backup (already exists: backup-pre-sprint-20250811-202333.sql)');
  
  console.log('\n🎯 PHASE 2: EXECUTE MIGRATION THROUGH SUPABASE DASHBOARD');
  console.log('1. 🌐 Go to https://supabase.com/dashboard/project/jdkdgcfwuizbeeeftove');
  console.log('2. 📊 Navigate to SQL Editor');
  console.log('3. 📄 Copy and execute the migration script: sql/enhanced-sprint-system-v2.3.0.sql');
  console.log('4. ⏱️  Execute in sections to monitor progress');
  
  console.log('\n🎯 PHASE 3: POST-MIGRATION VERIFICATION (Use this script)');
  console.log('1. 🔍 Verify new tables created');
  console.log('2. 🔍 Verify new views accessible');
  console.log('3. 🔍 Verify new functions working');
  console.log('4. 🔍 Test data integrity');
  
  console.log('\n📝 SUGGESTED EXECUTION SECTIONS:');
  console.log('   Section 1: Tables (Lines 1-97)');
  console.log('   Section 2: Functions (Lines 98-232)');
  console.log('   Section 3: Views (Lines 233-358)');
  console.log('   Section 4: Triggers & Indexes (Lines 359-428)');
  console.log('   Section 5: Security & Data (Lines 429-554)');
}

async function verifyCurrentState() {
  console.log('\n🔍 CURRENT DATABASE STATE VERIFICATION');
  console.log('-' .repeat(50));
  
  const verifications = [
    {
      name: 'Team Members Table',
      query: async () => {
        const { data, error } = await supabase.from('team_members').select('*').limit(1);
        return { data: data?.length || 0, error };
      }
    },
    {
      name: 'Schedule Entries Table', 
      query: async () => {
        const { data, error } = await supabase.from('schedule_entries').select('*').limit(1);
        return { data: data?.length || 0, error };
      }
    },
    {
      name: 'Teams Table',
      query: async () => {
        const { data, error } = await supabase.from('teams').select('*').limit(1);
        return { data: data?.length || 0, error };
      }
    },
    {
      name: 'Enhanced Sprint Configs (Migration Target)',
      query: async () => {
        const { data, error } = await supabase.from('enhanced_sprint_configs').select('*').limit(1);
        return { data: data?.length || 0, error: error ? 'Table not found' : null };
      }
    },
    {
      name: 'Sprint Working Days (Migration Target)',
      query: async () => {
        const { data, error } = await supabase.from('sprint_working_days').select('*').limit(1);
        return { data: data?.length || 0, error: error ? 'Table not found' : null };
      }
    }
  ];
  
  for (const verification of verifications) {
    try {
      const result = await verification.query();
      if (result.error) {
        console.log(`❌ ${verification.name}: ${result.error}`);
      } else {
        console.log(`✅ ${verification.name}: Accessible (${result.data} records sampled)`);
      }
    } catch (err) {
      console.log(`❌ ${verification.name}: Exception - ${err.message}`);
    }
  }
}

async function verifyMigrationSuccess() {
  console.log('\n🔍 POST-MIGRATION VERIFICATION');
  console.log('-' .repeat(50));
  
  const postMigrationChecks = [
    {
      name: 'Enhanced Sprint Configs Table',
      query: async () => {
        const { data, error } = await supabase.from('enhanced_sprint_configs').select('*');
        return { success: !error, data: data?.length || 0, error };
      }
    },
    {
      name: 'Sprint Working Days Table',
      query: async () => {
        const { data, error } = await supabase.from('sprint_working_days').select('*');
        return { success: !error, data: data?.length || 0, error };
      }
    },
    {
      name: 'Current Enhanced Sprint View',
      query: async () => {
        const { data, error } = await supabase.from('current_enhanced_sprint').select('*');
        return { success: !error, data: data?.length || 0, error };
      }
    },
    {
      name: 'Team Sprint Analytics View',
      query: async () => {
        const { data, error } = await supabase.from('team_sprint_analytics').select('*');
        return { success: !error, data: data?.length || 0, error };
      }
    },
    {
      name: 'Schedule Entries Sprint Integration',
      query: async () => {
        const { data, error } = await supabase
          .from('schedule_entries')
          .select('sprint_id, is_weekend, calculated_hours')
          .not('sprint_id', 'is', null)
          .limit(5);
        return { success: !error, data: data?.length || 0, error };
      }
    },
    {
      name: 'Teams with Members Assignment',
      query: async () => {
        const { data, error } = await supabase
          .from('team_members')
          .select('team_id, role, manager_max_hours')
          .not('team_id', 'is', null)
          .limit(5);
        return { success: !error, data: data?.length || 0, error };
      }
    }
  ];
  
  let successCount = 0;
  const totalChecks = postMigrationChecks.length;
  
  for (const check of postMigrationChecks) {
    try {
      const result = await check.query();
      if (result.success) {
        console.log(`✅ ${check.name}: SUCCESS (${result.data} records)`);
        successCount++;
      } else {
        console.log(`❌ ${check.name}: FAILED`);
        console.log(`   Error: ${result.error?.message || result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.log(`❌ ${check.name}: EXCEPTION - ${err.message}`);
    }
  }
  
  console.log('\n📊 MIGRATION VERIFICATION SUMMARY');
  console.log(`✅ Successful checks: ${successCount}/${totalChecks}`);
  console.log(`📈 Success rate: ${((successCount / totalChecks) * 100).toFixed(1)}%`);
  
  if (successCount === totalChecks) {
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    return true;
  } else {
    console.log('⚠️  MIGRATION INCOMPLETE - Please execute remaining steps');
    return false;
  }
}

async function runDiagnostics() {
  await generateDeploymentInstructions();
  await verifyCurrentState();
  
  console.log('\n🤔 NEXT STEPS:');
  console.log('1. If migration tables are missing, execute through Supabase Dashboard');
  console.log('2. If migration tables exist, run post-migration verification');
  console.log('3. Test application functionality after migration');
  
  // Check if migration appears to be complete
  try {
    const { data } = await supabase.from('enhanced_sprint_configs').select('*').limit(1);
    if (data) {
      console.log('\n🎯 MIGRATION APPEARS COMPLETE - Running verification...');
      await verifyMigrationSuccess();
    }
  } catch (err) {
    console.log('\n🎯 MIGRATION NOT YET APPLIED - Follow deployment instructions above');
  }
}

async function generateSQLSections() {
  console.log('\n📝 MIGRATION SQL BREAKDOWN FOR MANUAL EXECUTION');
  console.log('-' .repeat(50));
  
  const migrationPath = './sql/enhanced-sprint-system-v2.3.0.sql';
  if (!fs.existsSync(migrationPath)) {
    console.log('❌ Migration file not found at:', migrationPath);
    return;
  }
  
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  const lines = sqlContent.split('\n');
  
  const sections = [
    { name: 'Tables Creation', start: 1, end: 97 },
    { name: 'Functions Creation', start: 98, end: 232 },
    { name: 'Views Creation', start: 233, end: 358 },
    { name: 'Triggers & Indexes', start: 359, end: 428 },
    { name: 'Security & Seed Data', start: 429, end: 554 }
  ];
  
  sections.forEach(section => {
    console.log(`\n📋 ${section.name} (Lines ${section.start}-${section.end})`);
    console.log(`   Copy lines ${section.start}-${section.end} from the migration file`);
    console.log(`   Execute in Supabase SQL Editor`);
    console.log(`   Verify no errors before proceeding to next section`);
  });
}

// Main execution
if (require.main === module) {
  runDiagnostics()
    .then(() => {
      console.log('\n🏁 Migration deployment guide completed');
      console.log('📧 Report results to the development team');
    })
    .catch(error => {
      console.error('💥 Error running diagnostics:', error);
    });
}

module.exports = { verifyCurrentState, verifyMigrationSuccess, generateDeploymentInstructions };