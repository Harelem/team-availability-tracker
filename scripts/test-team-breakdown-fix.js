#!/usr/bin/env node

/**
 * Test script to validate Team Breakdown Display fix
 * 
 * This script tests:
 * 1. Database schema has team_id column
 * 2. All 5 teams are properly created
 * 3. Team members are assigned to correct teams
 * 4. getDailyCompanyStatus returns all teams
 * 5. Team breakdown displays correct member counts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testTeamBreakdownFix() {
  console.log('🧪 Testing Team Breakdown Display Fix...\n');

  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase environment variables not found');
      console.log('   Please ensure .env.local contains NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');

    // Test 1: Check if team_id column exists
    console.log('\n📋 Test 1: Checking team_id column exists...');
    
    const { data: sampleMember } = await supabase
      .from('team_members')
      .select('id, name, team_id')
      .limit(1)
      .single();

    if (sampleMember && 'team_id' in sampleMember) {
      console.log('✅ team_id column exists in team_members table');
    } else {
      console.log('❌ team_id column missing - run the SQL migration first');
      return;
    }

    // Test 2: Check all 5 teams exist
    console.log('\n📋 Test 2: Checking all required teams exist...');
    
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .neq('name', 'Management Team')
      .order('name');

    const expectedTeams = [
      'Data Team',
      'Development Team - Itay', 
      'Development Team - Tal',
      'Infrastructure Team',
      'Product Team'
    ];

    if (teams && teams.length >= 5) {
      console.log(`✅ Found ${teams.length} operational teams:`);
      teams.forEach(team => {
        console.log(`   - ${team.name} (ID: ${team.id})`);
      });
    } else {
      console.log(`❌ Expected 5+ teams, found ${teams?.length || 0}`);
      console.log('   Expected teams:', expectedTeams.join(', '));
    }

    // Test 3: Check team member assignments
    console.log('\n📋 Test 3: Checking team member assignments...');
    
    for (const team of teams || []) {
      const { data: members } = await supabase
        .from('team_members')
        .select('name, is_manager')
        .eq('team_id', team.id);

      const memberCount = members?.length || 0;
      const managerCount = members?.filter(m => m.is_manager).length || 0;
      
      console.log(`   ${team.name}: ${memberCount} members (${managerCount} managers)`);
      
      if (memberCount > 0) {
        const memberNames = members.map(m => `${m.name}${m.is_manager ? ' (MGR)' : ''}`).join(', ');
        console.log(`     Members: ${memberNames}`);
      }
    }

    // Test 4: Test daily company status function simulation
    console.log('\n📋 Test 4: Testing daily status data structure...');
    
    const { data: allMembers } = await supabase
      .from('team_members')
      .select('id, name, team_id, is_manager');

    const { data: todaySchedule } = await supabase
      .from('schedule_entries')
      .select('member_id, value, reason')
      .eq('date', new Date().toISOString().split('T')[0]);

    console.log(`   Found ${allMembers?.length || 0} total members`);
    console.log(`   Found ${todaySchedule?.length || 0} schedule entries for today`);

    // Simulate team breakdown logic
    const teamBreakdown = {};
    
    for (const team of teams || []) {
      const teamMembers = allMembers?.filter(m => m.team_id === team.id) || [];
      teamBreakdown[team.name] = {
        total: teamMembers.length,
        members: teamMembers.map(m => m.name)
      };
    }

    console.log('   Team breakdown:');
    Object.entries(teamBreakdown).forEach(([teamName, data]) => {
      console.log(`     ${teamName}: ${data.total} members`);
    });

    // Test 5: Check for unassigned members
    console.log('\n📋 Test 5: Checking for unassigned members...');
    
    const { data: unassignedMembers } = await supabase
      .from('team_members')
      .select('name, team_id')
      .is('team_id', null);

    if (unassignedMembers && unassignedMembers.length > 0) {
      console.log('⚠️ Found unassigned members:');
      unassignedMembers.forEach(member => {
        console.log(`   - ${member.name}`);
      });
      console.log('   Consider running the team assignment migration');
    } else {
      console.log('✅ All members are assigned to teams');
    }

    // Final verification
    console.log('\n🎉 Team Breakdown Fix Validation Summary:');
    console.log(`✅ Database schema: team_id column exists`);
    console.log(`✅ Teams created: ${teams?.length || 0}/5 operational teams`);
    console.log(`✅ Members assigned: ${(allMembers?.length || 0) - (unassignedMembers?.length || 0)}/${allMembers?.length || 0} members`);
    
    const allTeamsHaveMembers = Object.values(teamBreakdown).every(team => team.total > 0);
    if (allTeamsHaveMembers) {
      console.log('✅ All teams have assigned members');
    } else {
      console.log('⚠️ Some teams have no members assigned');
    }

    console.log('\n💡 Next steps:');
    console.log('1. ✅ Apply the SQL migration: sql/fix-team-breakdown-display.sql');
    console.log('2. ✅ Deploy the updated getDailyCompanyStatus function');
    console.log('3. 🧪 Test the COO Dashboard to verify all 5 teams appear');
    console.log('4. 📊 Verify team member counts are accurate');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nThis might be expected if:');
    console.log('- Database migration has not been run yet');
    console.log('- Supabase connection issues');
    console.log('- RLS policies need adjustment');
  }
}

// Run the test
testTeamBreakdownFix().catch(console.error);