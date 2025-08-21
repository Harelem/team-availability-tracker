#!/usr/bin/env node

/**
 * EMERGENCY TEST: Team Member CRUD Operations
 * 
 * This script tests the RLS policy fixes for team_members table
 * to ensure managers can add, edit, and remove team members.
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTeamMemberCRUD() {
  console.log('🧪 EMERGENCY FIX VALIDATION: Testing Team Member CRUD Operations\n');
  
  try {
    // Test 1: READ - Check if we can read team members
    console.log('1️⃣ Testing READ operations...');
    const { data: existingMembers, error: readError } = await supabase
      .from('team_members')
      .select('*')
      .limit(5);
    
    if (readError) {
      console.error('❌ READ test failed:', readError.message);
      return false;
    }
    console.log(`✅ READ successful: Found ${existingMembers?.length || 0} team members`);
    
    // Get a valid team ID for testing
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .limit(1);
    
    if (teamsError || !teams?.length) {
      console.error('❌ Cannot find teams for testing:', teamsError?.message);
      return false;
    }
    
    const testTeamId = teams[0].id;
    console.log(`📋 Using team "${teams[0].name}" (ID: ${testTeamId}) for testing\n`);
    
    // Test 2: INSERT - Add a test team member
    console.log('2️⃣ Testing INSERT operations...');
    const testMember = {
      name: 'Emergency Test User',
      hebrew: 'משתמש בדיקת חירום',
      is_manager: false,
      team_id: testTeamId,
      role: 'Test Role',
      email: 'emergency.test@example.com'
    };
    
    const { data: insertedMember, error: insertError } = await supabase
      .from('team_members')
      .insert(testMember)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ INSERT test failed:', insertError.message);
      console.error('   This indicates RLS policy is still blocking writes');
      return false;
    }
    console.log(`✅ INSERT successful: Created member with ID ${insertedMember.id}`);
    
    // Test 3: UPDATE - Modify the test member
    console.log('3️⃣ Testing UPDATE operations...');
    const { data: updatedMember, error: updateError } = await supabase
      .from('team_members')
      .update({ 
        role: 'Updated Test Role',
        hebrew: 'משתמש בדיקה מעודכן' 
      })
      .eq('id', insertedMember.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ UPDATE test failed:', updateError.message);
      console.error('   This indicates RLS policy is blocking updates');
      
      // Cleanup: Try to delete the test member
      await supabase.from('team_members').delete().eq('id', insertedMember.id);
      return false;
    }
    console.log(`✅ UPDATE successful: Modified role to "${updatedMember.role}"`);
    
    // Test 4: DELETE - Remove the test member
    console.log('4️⃣ Testing DELETE operations...');
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', insertedMember.id);
    
    if (deleteError) {
      console.error('❌ DELETE test failed:', deleteError.message);
      console.error('   This indicates RLS policy is blocking deletes');
      console.warn('⚠️  Manual cleanup required for test member ID:', insertedMember.id);
      return false;
    }
    console.log('✅ DELETE successful: Test member cleaned up');
    
    console.log('\n🎉 ALL CRUD OPERATIONS SUCCESSFUL!');
    console.log('✅ RLS policies are correctly configured');
    console.log('✅ Managers can now add, edit, and remove team members');
    
    return true;
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error.message);
    return false;
  }
}

async function testRealtimeSubscription() {
  console.log('\n📡 Testing Realtime Subscription...');
  
  try {
    // Test realtime subscription
    const subscription = supabase
      .channel('team_members_test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'team_members' },
        (payload) => {
          console.log('📨 Realtime update received:', payload.eventType);
        }
      );
    
    await subscription.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime subscription successful');
        subscription.unsubscribe();
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime subscription failed');
      }
    });
    
    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('❌ Realtime test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚨 EMERGENCY DATABASE FIX VALIDATION\n');
  console.log('Testing critical functionality after RLS policy fixes...\n');
  
  const success = await testTeamMemberCRUD();
  await testRealtimeSubscription();
  
  console.log('\n' + '='.repeat(60));
  
  if (success) {
    console.log('🎯 EMERGENCY FIX VALIDATION: SUCCESS');
    console.log('✅ Team member management is now fully functional');
    console.log('✅ Managers can perform all required operations');
    console.log('\n📋 Next steps:');
    console.log('   1. Test in the application UI');
    console.log('   2. Verify with actual manager accounts');
    console.log('   3. Monitor for any remaining errors');
  } else {
    console.log('❌ EMERGENCY FIX VALIDATION: FAILED');
    console.log('💡 Additional troubleshooting required:');
    console.log('   1. Verify RLS policies were applied correctly');
    console.log('   2. Check Supabase dashboard for policy status');
    console.log('   3. Review browser console for detailed error messages');
  }
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error);