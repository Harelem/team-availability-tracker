#!/usr/bin/env node

/**
 * EMERGENCY TEST: Real-time Functionality
 * 
 * This script tests real-time subscriptions to ensure 
 * data sync works across multiple connections.
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create two separate clients to simulate different users/devices
const client1 = createClient(supabaseUrl, supabaseKey);
const client2 = createClient(supabaseUrl, supabaseKey);

let realtimeEventsReceived = 0;
let testResults = {
  teamMembersSubscription: false,
  scheduleEntriesSubscription: false,
  dataSync: false
};

async function testRealtimeSubscriptions() {
  console.log('📡 EMERGENCY FIX VALIDATION: Testing Real-time Subscriptions\n');
  
  return new Promise(async (resolve) => {
    // Test 1: Team Members Realtime
    console.log('1️⃣ Testing team_members realtime subscription...');
    
    const teamMembersSubscription = client1
      .channel('team_members_emergency_test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'team_members' },
        (payload) => {
          console.log('📨 Team members realtime event:', payload.eventType);
          realtimeEventsReceived++;
          testResults.teamMembersSubscription = true;
        }
      );
    
    await teamMembersSubscription.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Team members subscription successful');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Team members subscription failed');
      }
    });
    
    // Test 2: Schedule Entries Realtime
    console.log('2️⃣ Testing schedule_entries realtime subscription...');
    
    const scheduleSubscription = client2
      .channel('schedule_entries_emergency_test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'schedule_entries' },
        (payload) => {
          console.log('📨 Schedule entries realtime event:', payload.eventType);
          realtimeEventsReceived++;
          testResults.scheduleEntriesSubscription = true;
        }
      );
    
    await scheduleSubscription.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Schedule entries subscription successful');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Schedule entries subscription failed');
      }
    });
    
    // Wait for subscriptions to establish
    await new Promise(r => setTimeout(r, 3000));
    
    // Test 3: Data Sync Test
    console.log('3️⃣ Testing real-time data synchronization...');
    
    try {
      // Get a valid team ID
      const { data: teams } = await client1
        .from('teams')
        .select('id')
        .limit(1);
      
      if (!teams?.length) {
        console.error('❌ No teams found for sync testing');
        resolve(false);
        return;
      }
      
      const testTeamId = teams[0].id;
      
      // Create test data that should trigger realtime events
      const testMember = {
        name: 'Realtime Test User',
        hebrew: 'משתמש בדיקת זמן אמת',
        is_manager: false,
        team_id: testTeamId,
        role: 'Sync Test'
      };
      
      console.log('   Creating test member to trigger realtime event...');
      const { data: insertedMember, error: insertError } = await client1
        .from('team_members')
        .insert(testMember)
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Failed to create test member:', insertError.message);
        resolve(false);
        return;
      }
      
      // Wait for realtime event
      await new Promise(r => setTimeout(r, 2000));
      
      // Update the member to trigger another event
      console.log('   Updating test member to trigger another realtime event...');
      await client1
        .from('team_members')
        .update({ role: 'Updated Sync Test' })
        .eq('id', insertedMember.id);
      
      // Wait for realtime event
      await new Promise(r => setTimeout(r, 2000));
      
      // Clean up test data
      console.log('   Cleaning up test data...');
      await client1
        .from('team_members')
        .delete()
        .eq('id', insertedMember.id);
      
      // Wait for final realtime event
      await new Promise(r => setTimeout(r, 2000));
      
      testResults.dataSync = realtimeEventsReceived > 0;
      
    } catch (error) {
      console.error('❌ Data sync test failed:', error.message);
    }
    
    // Cleanup subscriptions
    await teamMembersSubscription.unsubscribe();
    await scheduleSubscription.unsubscribe();
    
    resolve(true);
  });
}

async function testConnectionHealth() {
  console.log('\n🔗 Testing Connection Health...');
  
  try {
    // Test basic connectivity
    const { data, error } = await client1
      .from('teams')
      .select('count(*)')
      .single();
    
    if (error) {
      console.error('❌ Connection health check failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection healthy');
    return true;
    
  } catch (error) {
    console.error('❌ Connection health check error:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚨 EMERGENCY REALTIME FIX VALIDATION\n');
  console.log('Testing real-time functionality after configuration fixes...\n');
  
  // Test connection health first
  const connectionHealthy = await testConnectionHealth();
  if (!connectionHealthy) {
    console.log('❌ Connection issues detected - aborting realtime tests');
    process.exit(1);
  }
  
  // Test realtime subscriptions
  await testRealtimeSubscriptions();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 REALTIME TEST RESULTS:');
  console.log(`   📊 Events received: ${realtimeEventsReceived}`);
  console.log(`   🔄 Team members subscription: ${testResults.teamMembersSubscription ? '✅' : '❌'}`);
  console.log(`   📅 Schedule entries subscription: ${testResults.scheduleEntriesSubscription ? '✅' : '❌'}`);
  console.log(`   🔄 Data synchronization: ${testResults.dataSync ? '✅' : '❌'}`);
  
  const allTestsPassed = Object.values(testResults).every(result => result === true);
  
  if (allTestsPassed && realtimeEventsReceived > 0) {
    console.log('\n🎯 REALTIME FIX VALIDATION: SUCCESS');
    console.log('✅ Real-time subscriptions are working correctly');
    console.log('✅ Data synchronization is functional');
    console.log('\n📋 Verification steps completed:');
    console.log('   ✅ Subscription establishment');
    console.log('   ✅ Event delivery');
    console.log('   ✅ Cross-client synchronization');
  } else {
    console.log('\n❌ REALTIME FIX VALIDATION: ISSUES DETECTED');
    console.log('💡 Troubleshooting needed:');
    
    if (!testResults.teamMembersSubscription) {
      console.log('   ❌ team_members table not configured for realtime');
    }
    if (!testResults.scheduleEntriesSubscription) {
      console.log('   ❌ schedule_entries table not configured for realtime');
    }
    if (!testResults.dataSync) {
      console.log('   ❌ Real-time event delivery not working');
    }
    if (realtimeEventsReceived === 0) {
      console.log('   ❌ No realtime events received - check Supabase realtime settings');
    }
    
    console.log('\n🔧 Manual checks required:');
    console.log('   1. Verify realtime is enabled in Supabase Dashboard');
    console.log('   2. Check Database → Replication settings');
    console.log('   3. Ensure tables are added to supabase_realtime publication');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

main().catch(console.error);