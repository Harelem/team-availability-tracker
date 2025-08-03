#!/usr/bin/env node

/**
 * Test Script for Sprint Settings Enhancement Migration
 * Validates that the migration (008_sprint_settings_enhancement.sql) works correctly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMigration() {
  console.log('🧪 Testing Sprint Settings Enhancement Migration...\n');

  try {
    // Test 1: Check if notes column exists in global_sprint_settings
    console.log('1. Testing notes column in global_sprint_settings...');
    const { data: columnCheck, error: columnError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'global_sprint_settings' AND column_name = 'notes'
        `
      });

    if (columnError) {
      console.error('❌ Error checking notes column:', columnError);
      return false;
    }

    if (!columnCheck || columnCheck.length === 0) {
      console.error('❌ Notes column not found in global_sprint_settings');
      return false;
    }

    console.log('✅ Notes column exists in global_sprint_settings');
    console.log(`   Type: ${columnCheck[0].data_type}, Nullable: ${columnCheck[0].is_nullable}\n`);

    // Test 2: Check if team_sprint_stats view has potential_hours column
    console.log('2. Testing potential_hours column in team_sprint_stats view...');
    const { data: viewCheck, error: viewError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'team_sprint_stats' AND column_name = 'potential_hours'
        `
      });

    if (viewError) {
      console.error('❌ Error checking view columns:', viewError);
      return false;
    }

    if (!viewCheck || viewCheck.length === 0) {
      console.error('❌ potential_hours column not found in team_sprint_stats view');
      return false;
    }

    console.log('✅ potential_hours column exists in team_sprint_stats view\n');

    // Test 3: Check if legacy compatibility view exists
    console.log('3. Testing legacy compatibility view...');
    const { data: legacyCheck, error: legacyError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'team_sprint_stats_legacy' AND column_name = 'total_capacity_hours'
        `
      });

    if (legacyError) {
      console.error('❌ Error checking legacy view:', legacyError);
      return false;
    }

    if (!legacyCheck || legacyCheck.length === 0) {
      console.error('❌ total_capacity_hours column not found in legacy view');
      return false;
    }

    console.log('✅ Legacy compatibility view exists with total_capacity_hours\n');

    // Test 4: Check if helper functions exist
    console.log('4. Testing helper functions...');
    const { data: functionCheck, error: functionError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT routine_name 
          FROM information_schema.routines 
          WHERE routine_name IN ('calculate_team_potential_hours', 'calculate_sprint_max_hours')
            AND routine_type = 'FUNCTION'
        `
      });

    if (functionError) {
      console.error('❌ Error checking functions:', functionError);
      return false;
    }

    if (!functionCheck || functionCheck.length < 2) {
      console.error('❌ Helper functions not found');
      return false;
    }

    console.log('✅ Helper functions exist\n');

    // Test 5: Test actual functionality - try to insert and query notes
    console.log('5. Testing notes functionality...');
    
    // Get current sprint settings
    const { data: sprintData, error: sprintError } = await supabase
      .from('global_sprint_settings')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);

    if (sprintError) {
      console.error('❌ Error fetching sprint settings:', sprintError);
      return false;
    }

    if (!sprintData || sprintData.length === 0) {
      console.error('❌ No sprint settings found');
      return false;
    }

    // Test updating notes
    const testNotes = `Test notes added at ${new Date().toISOString()}`;
    const { error: updateError } = await supabase
      .from('global_sprint_settings')
      .update({ notes: testNotes })
      .eq('id', sprintData[0].id);

    if (updateError) {
      console.error('❌ Error updating notes:', updateError);
      return false;
    }

    // Verify notes were saved
    const { data: updatedData, error: verifyError } = await supabase
      .from('global_sprint_settings')
      .select('notes')
      .eq('id', sprintData[0].id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying notes:', verifyError);
      return false;
    }

    if (updatedData.notes !== testNotes) {
      console.error('❌ Notes not saved correctly');
      return false;
    }

    console.log('✅ Notes functionality working correctly\n');

    // Test 6: Test team_sprint_stats view with real data
    console.log('6. Testing team_sprint_stats view data...');
    const { data: teamStats, error: teamStatsError } = await supabase
      .from('team_sprint_stats')
      .select('team_name, potential_hours, sprint_hours, capacity_utilization')
      .limit(3);

    if (teamStatsError) {
      console.error('❌ Error fetching team stats:', teamStatsError);
      return false;
    }

    console.log('✅ team_sprint_stats view returns data:');
    teamStats.forEach(team => {
      console.log(`   ${team.team_name}: ${team.potential_hours} potential hours, ${team.sprint_hours} sprint hours (${team.capacity_utilization}% utilization)`);
    });

    console.log('\n🎉 All tests passed! Migration is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
    return false;
  }
}

// Run the test
testMigration().then(success => {
  process.exit(success ? 0 : 1);
});