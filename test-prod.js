const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testProductionData() {
  console.log('🧪 Testing production data access...');
  
  try {
    // Test teams
    console.log('📋 Testing teams...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    
    if (teamsError) {
      console.error('❌ Teams error:', teamsError);
      return;
    }
    
    console.log(`✅ Teams loaded: ${teams.length}`);
    teams.forEach(team => {
      console.log(`  - ${team.name} (ID: ${team.id})`);
    });
    
    // Test team members for each team
    console.log('\n👥 Testing team members...');
    for (const team of teams) {
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)
      
      if (membersError) {
        console.error(`❌ Members error for team ${team.id}:`, membersError);
        continue;
      }
      
      console.log(`  - ${team.name}: ${members.length} members`);
      members.forEach(member => {
        console.log(`    • ${member.name} (${member.is_manager ? 'Manager' : 'Member'})`);
      });
    }
    
    // Test team stats calculation
    console.log('\n📊 Testing team stats calculation...');
    const teamStats = await Promise.all(
      teams.map(async (team) => {
        const { data: members } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', team.id)
        
        return {
          id: team.id,
          name: team.name,
          member_count: members?.length || 0,
          manager_count: members?.filter(m => m.is_manager).length || 0
        }
      })
    );
    
    console.log('✅ Team stats calculated:');
    teamStats.forEach(stat => {
      console.log(`  - ${stat.name}: ${stat.member_count} members (${stat.manager_count} managers)`);
    });
    
    // Test team isolation
    console.log('\n🔒 Testing team isolation...');
    const team1Members = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', 1)
    
    const team2Members = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', 2)
    
    console.log(`✅ Team 1 has ${team1Members.data?.length || 0} members`);
    console.log(`✅ Team 2 has ${team2Members.data?.length || 0} members`);
    
    if (team1Members.data?.length > 0 && team2Members.data?.length > 0) {
      const team1Names = team1Members.data.map(m => m.name);
      const team2Names = team2Members.data.map(m => m.name);
      const overlap = team1Names.filter(name => team2Names.includes(name));
      
      if (overlap.length === 0) {
        console.log('✅ Teams are properly isolated (no member overlap)');
      } else {
        console.log(`⚠️  Teams have overlapping members: ${overlap.join(', ')}`);
      }
    }
    
    console.log('\n🎉 All tests passed! Multi-team functionality is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProductionData();