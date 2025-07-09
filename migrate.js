const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Step 1: Check if teams table exists
    console.log('📋 Checking existing schema...');
    const { data: existingTeams } = await supabase.from('teams').select('*').limit(1);
    
    if (existingTeams) {
      console.log('✅ Teams table already exists, skipping schema creation');
    } else {
      console.log('❌ Teams table does not exist - you need to run the schema manually in Supabase dashboard');
      console.log('Please run the SQL from sql/multi-team-schema.sql in your Supabase dashboard');
      return;
    }
    
    // Step 2: Insert teams
    console.log('📋 Inserting teams...');
    const teams = [
      { id: 1, name: 'Development Team - Tal', description: 'Tal\'s development team', color: '#3b82f6' },
      { id: 2, name: 'Development Team - Itay', description: 'Itay\'s development team', color: '#10b981' },
      { id: 3, name: 'Infrastructure Team', description: 'Infrastructure and DevOps team', color: '#f59e0b' },
      { id: 4, name: 'Data Team', description: 'Data engineering and analytics team', color: '#8b5cf6' },
      { id: 5, name: 'Original Team', description: 'Original single team (for backward compatibility)', color: '#6b7280' }
    ];
    
    for (const team of teams) {
      const { error } = await supabase.from('teams').upsert(team);
      if (error) {
        console.error(`❌ Error inserting team ${team.name}:`, error);
      } else {
        console.log(`✅ Team ${team.name} inserted/updated`);
      }
    }
    
    // Step 3: Update existing team members to Original Team
    console.log('📋 Updating existing team members...');
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ team_id: 5 })
      .is('team_id', null);
    
    if (updateError) {
      console.error('❌ Error updating existing team members:', updateError);
    } else {
      console.log('✅ Existing team members updated to Original Team');
    }
    
    // Step 4: Insert new team members
    console.log('📋 Inserting new team members...');
    const newMembers = [
      // Development Team - Tal
      { name: 'Tal Azaria', hebrew: 'טל עזריה', is_manager: true, team_id: 1 },
      { name: 'Yotam Sever', hebrew: 'יותם סבר', is_manager: false, team_id: 1 },
      { name: 'Roy Ferder', hebrew: 'רועי פרדר', is_manager: false, team_id: 1 },
      { name: 'Ido Azran', hebrew: 'עידו עזרן', is_manager: false, team_id: 1 },
      
      // Development Team - Itay
      { name: 'Itay Mizrachi', hebrew: 'איתי מזרחי', is_manager: true, team_id: 2 },
      { name: 'Roy Musafi', hebrew: 'רועי מוספי', is_manager: false, team_id: 2 },
      { name: 'Shachar Max', hebrew: 'שחר מקס', is_manager: false, team_id: 2 },
      { name: 'Yahli Oleinik', hebrew: 'יהלי אוליניק', is_manager: false, team_id: 2 },
      { name: 'Yotam Halevi', hebrew: 'יותם הלוי', is_manager: false, team_id: 2 },
      
      // Infrastructure Team
      { name: 'Aviram Sparsky', hebrew: 'אבירם ספרסקי', is_manager: true, team_id: 3 },
      { name: 'Peleg Yona', hebrew: 'פלג יונה', is_manager: false, team_id: 3 },
      { name: 'Itay Zuberi', hebrew: 'איתי צוברי', is_manager: false, team_id: 3 },
      
      // Data Team
      { name: 'Matan Blaich', hebrew: 'מתן בלייך', is_manager: true, team_id: 4 },
      { name: 'Efrat Taichman', hebrew: 'אפרת טייכמן', is_manager: false, team_id: 4 },
      { name: 'Sahar Cohen', hebrew: 'סהר כהן', is_manager: false, team_id: 4 },
      { name: 'Itamar Weingarten', hebrew: 'איתמר וינגרטן', is_manager: false, team_id: 4 },
      { name: 'Noam Hadad', hebrew: 'נועם הדד', is_manager: false, team_id: 4 },
      { name: 'David Dan', hebrew: 'דוד דן', is_manager: false, team_id: 4 }
    ];
    
    for (const member of newMembers) {
      const { error } = await supabase.from('team_members').upsert(member);
      if (error) {
        console.error(`❌ Error inserting member ${member.name}:`, error);
      } else {
        console.log(`✅ Member ${member.name} inserted/updated`);
      }
    }
    
    // Step 5: Verify results
    console.log('📋 Verifying migration results...');
    const { data: finalTeams } = await supabase.from('teams').select('*').order('name');
    const { data: finalMembers } = await supabase.from('team_members').select('*').order('name');
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ ${finalTeams?.length || 0} teams created`);
    console.log(`✅ ${finalMembers?.length || 0} team members migrated`);
    
    for (const team of finalTeams || []) {
      const teamMemberCount = finalMembers?.filter(m => m.team_id === team.id).length || 0;
      console.log(`  - ${team.name}: ${teamMemberCount} members`);
    }
    
    console.log('\n🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();