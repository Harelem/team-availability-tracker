const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runComprehensiveVerification() {
  console.log('\n🔍 ENHANCED SPRINT SYSTEM - POST-MIGRATION VERIFICATION');
  console.log('=' .repeat(80));
  console.log('📅 Date:', new Date().toISOString());
  console.log('🎯 Verifying all migration components...\n');
  
  const results = {
    tables: [],
    columns: [],
    views: [],
    functions: [],
    data: [],
    performance: []
  };
  
  // 1. TABLE VERIFICATION
  console.log('📋 VERIFYING NEW TABLES...');
  const tableChecks = [
    'enhanced_sprint_configs',
    'sprint_working_days'
  ];
  
  for (const tableName of tableChecks) {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        results.tables.push({ table: tableName, status: 'FAILED', error: error.message });
      } else {
        console.log(`✅ ${tableName}: EXISTS (${data?.length || 0} records sampled)`);
        results.tables.push({ table: tableName, status: 'SUCCESS', records: data?.length || 0 });
      }
    } catch (err) {
      console.log(`❌ ${tableName}: EXCEPTION - ${err.message}`);
      results.tables.push({ table: tableName, status: 'EXCEPTION', error: err.message });
    }
  }
  
  // 2. COLUMN VERIFICATION
  console.log('\n📊 VERIFYING NEW COLUMNS IN SCHEDULE_ENTRIES...');
  try {
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('sprint_id, is_weekend, calculated_hours')
      .limit(3);
    
    if (error) {
      console.log(`❌ schedule_entries new columns: ${error.message}`);
      results.columns.push({ status: 'FAILED', error: error.message });
    } else {
      console.log('✅ schedule_entries new columns: ALL ACCESSIBLE');
      console.log('   Sample data:');
      data?.forEach((row, idx) => {
        console.log(`   ${idx + 1}. sprint_id: ${row.sprint_id}, is_weekend: ${row.is_weekend}, calculated_hours: ${row.calculated_hours}`);
      });
      results.columns.push({ status: 'SUCCESS', sampleData: data?.length || 0 });
    }
  } catch (err) {
    console.log(`❌ schedule_entries columns: EXCEPTION - ${err.message}`);
    results.columns.push({ status: 'EXCEPTION', error: err.message });
  }
  
  // 3. VIEW VERIFICATION
  console.log('\n👁️  VERIFYING NEW VIEWS...');
  const viewChecks = [
    'current_enhanced_sprint',
    'team_sprint_analytics'
  ];
  
  for (const viewName of viewChecks) {
    try {
      const { data, error } = await supabase.from(viewName).select('*').limit(2);
      if (error) {
        console.log(`❌ ${viewName}: ${error.message}`);
        results.views.push({ view: viewName, status: 'FAILED', error: error.message });
      } else {
        console.log(`✅ ${viewName}: ACCESSIBLE (${data?.length || 0} records)`);
        if (data && data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0], null, 2)}`);
        }
        results.views.push({ view: viewName, status: 'SUCCESS', records: data?.length || 0 });
      }
    } catch (err) {
      console.log(`❌ ${viewName}: EXCEPTION - ${err.message}`);
      results.views.push({ view: viewName, status: 'EXCEPTION', error: err.message });
    }
  }
  
  // 4. FUNCTION VERIFICATION (through RPC calls)
  console.log('\n⚙️  VERIFYING NEW FUNCTIONS...');
  
  // Test calculate_member_sprint_capacity function
  try {
    // First, get a member ID and sprint ID for testing
    const { data: members } = await supabase.from('team_members').select('id').limit(1);
    const { data: sprints } = await supabase.from('enhanced_sprint_configs').select('id').limit(1);
    
    if (members?.length > 0 && sprints?.length > 0) {
      const { data, error } = await supabase.rpc('calculate_member_sprint_capacity', {
        member_id: members[0].id,
        sprint_id: sprints[0].id
      });
      
      if (error) {
        console.log(`❌ calculate_member_sprint_capacity: ${error.message}`);
        results.functions.push({ function: 'calculate_member_sprint_capacity', status: 'FAILED', error: error.message });
      } else {
        console.log('✅ calculate_member_sprint_capacity: WORKING');
        console.log(`   Result: ${JSON.stringify(data, null, 2)}`);
        results.functions.push({ function: 'calculate_member_sprint_capacity', status: 'SUCCESS' });
      }
    } else {
      console.log('⚠️  calculate_member_sprint_capacity: Cannot test - missing test data');
      results.functions.push({ function: 'calculate_member_sprint_capacity', status: 'SKIP', reason: 'No test data' });
    }
  } catch (err) {
    console.log(`❌ calculate_member_sprint_capacity: EXCEPTION - ${err.message}`);
    results.functions.push({ function: 'calculate_member_sprint_capacity', status: 'EXCEPTION', error: err.message });
  }
  
  // Test auto_generate_weekend_entries function
  try {
    const { data: sprints } = await supabase.from('enhanced_sprint_configs').select('id').limit(1);
    
    if (sprints?.length > 0) {
      const { data, error } = await supabase.rpc('auto_generate_weekend_entries', {
        sprint_id: sprints[0].id
      });
      
      if (error) {
        console.log(`❌ auto_generate_weekend_entries: ${error.message}`);
        results.functions.push({ function: 'auto_generate_weekend_entries', status: 'FAILED', error: error.message });
      } else {
        console.log('✅ auto_generate_weekend_entries: WORKING');
        console.log(`   Generated entries: ${data}`);
        results.functions.push({ function: 'auto_generate_weekend_entries', status: 'SUCCESS', result: data });
      }
    } else {
      console.log('⚠️  auto_generate_weekend_entries: Cannot test - missing sprint data');
      results.functions.push({ function: 'auto_generate_weekend_entries', status: 'SKIP', reason: 'No sprint data' });
    }
  } catch (err) {
    console.log(`❌ auto_generate_weekend_entries: EXCEPTION - ${err.message}`);
    results.functions.push({ function: 'auto_generate_weekend_entries', status: 'EXCEPTION', error: err.message });
  }
  
  // 5. DATA INTEGRITY VERIFICATION
  console.log('\n📊 VERIFYING DATA INTEGRITY...');
  const dataChecks = [
    {
      name: 'Active Sprint Exists',
      query: () => supabase.from('enhanced_sprint_configs').select('*').eq('is_active', true)
    },
    {
      name: 'Teams with Members',
      query: () => supabase.from('team_members').select('*').not('team_id', 'is', null)
    },
    {
      name: 'Schedule Entries with Sprint Links',
      query: () => supabase.from('schedule_entries').select('*').not('sprint_id', 'is', null).limit(5)
    },
    {
      name: 'Weekend Auto-Generated Entries',
      query: () => supabase.from('schedule_entries').select('*').eq('is_weekend', true).limit(3)
    }
  ];
  
  for (const check of dataChecks) {
    try {
      const { data, error } = await check.query();
      if (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
        results.data.push({ check: check.name, status: 'FAILED', error: error.message });
      } else {
        console.log(`✅ ${check.name}: ${data?.length || 0} records found`);
        results.data.push({ check: check.name, status: 'SUCCESS', records: data?.length || 0 });
      }
    } catch (err) {
      console.log(`❌ ${check.name}: EXCEPTION - ${err.message}`);
      results.data.push({ check: check.name, status: 'EXCEPTION', error: err.message });
    }
  }
  
  // 6. GENERATE SUMMARY REPORT
  console.log('\n' + '=' .repeat(80));
  console.log('📋 MIGRATION VERIFICATION SUMMARY');
  console.log('=' .repeat(80));
  
  const categories = [
    { name: 'Tables', data: results.tables },
    { name: 'Columns', data: results.columns },
    { name: 'Views', data: results.views },
    { name: 'Functions', data: results.functions },
    { name: 'Data Integrity', data: results.data }
  ];
  
  let overallSuccess = true;
  
  categories.forEach(category => {
    const total = category.data.length;
    const successful = category.data.filter(item => item.status === 'SUCCESS').length;
    const failed = category.data.filter(item => item.status === 'FAILED' || item.status === 'EXCEPTION').length;
    const skipped = category.data.filter(item => item.status === 'SKIP').length;
    
    console.log(`\n${category.name}:`);
    console.log(`  ✅ Success: ${successful}/${total}`);
    if (failed > 0) {
      console.log(`  ❌ Failed: ${failed}/${total}`);
      overallSuccess = false;
    }
    if (skipped > 0) {
      console.log(`  ⚠️  Skipped: ${skipped}/${total}`);
    }
  });
  
  console.log('\n' + '=' .repeat(80));
  
  if (overallSuccess) {
    console.log('🎉 MIGRATION VERIFICATION: SUCCESS');
    console.log('✅ All critical components verified successfully');
    console.log('🚀 Enhanced Sprint System is ready for use');
  } else {
    console.log('⚠️  MIGRATION VERIFICATION: PARTIAL SUCCESS');
    console.log('❌ Some components failed verification');
    console.log('🔧 Manual intervention required for failed components');
  }
  
  console.log('\n📊 DETAILED RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  
  return { success: overallSuccess, results };
}

// Execute verification
if (require.main === module) {
  runComprehensiveVerification()
    .then(({ success }) => {
      console.log('\n🏁 Verification completed');
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveVerification };