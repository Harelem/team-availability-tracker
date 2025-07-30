import { supabase } from './supabase'
import { TeamMember, Team, TeamStats, GlobalSprintSettings, CurrentGlobalSprint, TeamSprintStats, CompanyCapacityMetrics, TeamCapacityStatus, COODashboardData, COOUser, DetailedCompanyScheduleData, DetailedTeamScheduleData, DetailedMemberScheduleData, MemberDaySchedule, MemberReasonEntry } from '@/types'
import { AvailabilityTemplate, CreateTemplateRequest, UpdateTemplateRequest, TemplateFilters, TemplateQueryOptions, TemplateSearchResult } from '@/types/templateTypes'
import { Achievement, RecognitionMetric, CreateAchievementRequest, UpdateMetricRequest, RecognitionQueryOptions, RecognitionQueryResult, LeaderboardEntry, LeaderboardTimeframe } from '@/types/recognitionTypes'
import { calculateSprintCapacityFromSettings } from './calculationService'

// Sprint History interfaces
export interface SprintHistoryEntry {
  id: number;
  sprint_number: number;
  sprint_name?: string;
  sprint_start_date: string;
  sprint_end_date: string;
  sprint_length_weeks: number;
  description?: string;
  status: 'upcoming' | 'active' | 'completed';
  progress_percentage: number;
  days_remaining: number;
  total_days: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateSprintRequest {
  sprint_name?: string;
  sprint_start_date: string;
  sprint_end_date: string;
  sprint_length_weeks: number;
  description?: string;
  created_by?: string;
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_url_here' && key !== 'your_supabase_anon_key_here'
}

// Flag to prevent multiple executions of data fixes
let dataFixInProgress = false

export const DatabaseService = {
  // Teams
  async getTeams(): Promise<Team[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error fetching teams:', error)
      return []
    }
    
    return data.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description || undefined,
      color: team.color || '#3b82f6',
      sprint_length_weeks: team.sprint_length_weeks || 1,
      created_at: team.created_at,
      updated_at: team.updated_at
    }))
  },

  async getTeamStats(): Promise<TeamStats[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    // Try to get from team_stats view first
    const { data, error } = await supabase
      .from('team_stats')
      .select('*')
      .order('name')
    
    if (error) {
      // View doesn't exist, use manual calculation (this is expected)
      return this.calculateTeamStatsManually()
    }
    
    return data
  },

  async calculateTeamStatsManually(): Promise<TeamStats[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    try {
      // Get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name')
      
      if (teamsError) {
        console.error('Error fetching teams for manual stats:', teamsError)
        return []
      }
      
      // Calculate stats for each team
      const teamStats = await Promise.all(
        teams.map(async (team) => {
          const { data: members, error: membersError } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', team.id)
          
          if (membersError) {
            console.error(`Error fetching members for team ${team.id}:`, membersError)
            return {
              id: team.id,
              name: team.name,
              description: team.description,
              color: team.color,
              member_count: 0,
              manager_count: 0
            }
          }
          
          const member_count = members?.length || 0
          const manager_count = members?.filter(m => m.is_manager).length || 0
          
          return {
            id: team.id,
            name: team.name,
            description: team.description,
            color: team.color,
            sprint_length_weeks: team.sprint_length_weeks || 1,
            member_count,
            manager_count
          }
        })
      )
      
      return teamStats
    } catch (error) {
      console.error('Error calculating team stats manually:', error)
      return []
    }
  },

  // Team Members (now filtered by team)
  async getTeamMembers(teamId?: number): Promise<TeamMember[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    let query = supabase
      .from('team_members')
      .select('*')
    
    if (teamId) {
      query = query.eq('team_id', teamId)
    }
    
    query = query.order('name')
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching team members:', error)
      return []
    }
    
    return data.map(member => ({
      id: member.id,
      name: member.name,
      hebrew: member.hebrew,
      isManager: member.is_manager,
      email: member.email || undefined,
      team_id: member.team_id,
      created_at: member.created_at,
      updated_at: member.updated_at
    }))
  },

  /**
   * SAFE initialization that preserves existing data
   * CRITICAL: This replaces destructive initialization patterns
   */
  async safeInitializeTeams(): Promise<{ success: boolean; preserved: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured - skipping team initialization');
      return { success: false, preserved: false, message: 'Supabase not configured' };
    }
    
    try {
      console.log('🔍 Checking for existing teams...');
      const existingTeams = await this.getTeams();
      
      if (existingTeams.length > 0) {
        console.log(`✅ Found ${existingTeams.length} existing teams - PRESERVING DATA`);
        existingTeams.forEach(team => {
          console.log(`  - ${team.name} (ID: ${team.id})`);
        });
        return { 
          success: true, 
          preserved: true, 
          message: `Preserved ${existingTeams.length} existing teams` 
        };
      }

      console.log('🆕 No teams found - safe to create initial teams');
      await this.createInitialTeamsIfMissing();
      
      return { 
        success: true, 
        preserved: false, 
        message: 'Created initial team structure' 
      };
    } catch (error) {
      console.error('❌ Error in safe team initialization:', error);
      return { 
        success: false, 
        preserved: false, 
        message: `Initialization failed: ${(error as Error).message}` 
      };
    }
  },

  /**
   * SAFE team member initialization that preserves existing data
   * CRITICAL: This never overwrites existing team members
   */
  async safeInitializeTeamMembers(): Promise<{ success: boolean; preserved: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured - skipping member initialization');
      return { success: false, preserved: false, message: 'Supabase not configured' };
    }
    
    try {
      console.log('🔍 Checking for existing team members...');
      const existingMembers = await this.getTeamMembers();
      
      if (existingMembers.length > 0) {
        console.log(`✅ Found ${existingMembers.length} existing team members - PRESERVING DATA`);
        
        // Group by team for better logging
        const membersByTeam = existingMembers.reduce((acc, member) => {
          if (!acc[member.team_id]) acc[member.team_id] = [];
          acc[member.team_id].push(member.name);
          return acc;
        }, {} as Record<number, string[]>);
        
        Object.entries(membersByTeam).forEach(([teamId, names]) => {
          console.log(`  Team ${teamId}: ${names.join(', ')}`);
        });
        
        return { 
          success: true, 
          preserved: true, 
          message: `Preserved ${existingMembers.length} existing team members` 
        };
      }

      console.log('🆕 No team members found - safe to create initial members');
      await this.createInitialTeamMembersIfMissing();
      
      return { 
        success: true, 
        preserved: false, 
        message: 'Created initial team members' 
      };
    } catch (error) {
      console.error('❌ Error in safe team member initialization:', error);
      return { 
        success: false, 
        preserved: false, 
        message: `Member initialization failed: ${(error as Error).message}` 
      };
    }
  },

  /**
   * Create initial teams only if they don't exist
   * CRITICAL: This uses INSERT ... ON CONFLICT DO NOTHING pattern
   */
  async createInitialTeamsIfMissing(): Promise<void> {
    const requiredTeams = [
      { name: 'Development Team - Tal', description: 'Development team led by Tal Azaria', color: '#3b82f6' },
      { name: 'Development Team - Itay', description: 'Development team led by Itay Mizrachi', color: '#8b5cf6' },
      { name: 'Infrastructure Team', description: 'Infrastructure and DevOps team', color: '#10b981' },
      { name: 'Data Team', description: 'Data science and analytics team', color: '#f59e0b' },
      { name: 'Product Team', description: 'Product management and strategy team', color: '#ef4444' }
    ];

    for (const team of requiredTeams) {
      try {
        // Check if team already exists first
        const { data: existing } = await supabase
          .from('teams')
          .select('id')
          .eq('name', team.name)
          .single();

        if (existing) {
          console.log(`✅ Team already exists: ${team.name}`);
          continue;
        }

        // Safe insert - won't fail if team already exists
        const { error } = await supabase
          .from('teams')
          .insert([team]);

        if (error) {
          console.error(`❌ Error creating team ${team.name}:`, error);
        } else {
          console.log(`✅ Created team: ${team.name}`);
        }
      } catch (error) {
        console.error(`❌ Error checking/creating team ${team.name}:`, error);
      }
    }
  },

  /**
   * Create initial team members only if they don't exist
   * CRITICAL: This preserves existing members and their schedule data
   */
  async createInitialTeamMembersIfMissing(): Promise<void> {
    console.log('👥 Creating initial team members (preserving existing)...');
    
    try {
      // Get teams with IDs
      const teams = await this.getTeams();
      if (teams.length === 0) {
        console.warn('⚠️ No teams found - cannot create team members');
        return;
      }

      // Team member configurations
      const teamConfigs: Record<string, Array<{ name: string; hebrew: string; is_manager: boolean }>> = {
        'Development Team - Tal': [
          { name: 'Tal Azaria', hebrew: 'טל עזריה', is_manager: true },
          { name: 'Yotam Sever', hebrew: 'יותם סבר', is_manager: false },
          { name: 'Roy Ferder', hebrew: 'רועי פרדר', is_manager: false },
          { name: 'Ido Azran', hebrew: 'עידו עזרן', is_manager: false }
        ],
        'Development Team - Itay': [
          { name: 'Itay Mizrachi', hebrew: 'איתי מזרחי', is_manager: true },
          { name: 'Roy Musafi', hebrew: 'רועי מוספי', is_manager: false },
          { name: 'Shachar Max', hebrew: 'שחר מקס', is_manager: false },
          { name: 'Yahli Oleinik', hebrew: 'יהלי אוליניק', is_manager: false },
          { name: 'Yotam Halevi', hebrew: 'יותם הלוי', is_manager: false }
        ],
        'Infrastructure Team': [
          { name: 'Aviram Sparsky', hebrew: 'אבירם ספרסקי', is_manager: true },
          { name: 'Peleg Yona', hebrew: 'פלג יונה', is_manager: false },
          { name: 'Itay Zuberi', hebrew: 'איתי צוברי', is_manager: false }
        ],
        'Data Team': [
          { name: 'Matan Blaich', hebrew: 'מתן בלייך', is_manager: true },
          { name: 'Efrat Taichman', hebrew: 'אפרת טייכמן', is_manager: false },
          { name: 'Sahar Cohen', hebrew: 'סהר כהן', is_manager: false },
          { name: 'Itamar Weingarten', hebrew: 'איתמר וינגרטן', is_manager: false },
          { name: 'Noam Hadad', hebrew: 'נועם הדד', is_manager: false },
          { name: 'David Dan', hebrew: 'דוד דן', is_manager: false }
        ],
        'Product Team': [
          { name: 'Natan Shemesh', hebrew: 'נתן שמש', is_manager: false },
          { name: 'Ido Keller', hebrew: 'עידו קלר', is_manager: false },
          { name: 'Amit Zriker', hebrew: 'עמית צריקר', is_manager: true },
          { name: 'Alon Mesika', hebrew: 'אלון מסיקה', is_manager: false },
          { name: 'Nadav Aharon', hebrew: 'נדב אהרון', is_manager: false },
          { name: 'Yarom Kloss', hebrew: 'ירום קלוס', is_manager: false },
          { name: 'Ziv Edelstein', hebrew: 'זיב אדלשטיין', is_manager: false },
          { name: 'Harel Mazan', hebrew: 'הראל מזן', is_manager: true }
        ]
      };

      for (const team of teams) {
        const members = teamConfigs[team.name] || [];
        
        for (const member of members) {
          try {
            // Check if member already exists in this team
            const { data: existing } = await supabase
              .from('team_members')
              .select('id')
              .eq('name', member.name)
              .eq('team_id', team.id)
              .single();

            if (existing) {
              console.log(`✅ Member already exists: ${member.name} in ${team.name}`);
              continue;
            }

            // Safe insert
            const { error } = await supabase
              .from('team_members')
              .insert([{
                ...member,
                team_id: team.id
              }]);

            if (error) {
              console.error(`❌ Error creating member ${member.name}:`, error);
            } else {
              console.log(`✅ Created member: ${member.name} in ${team.name}`);
            }
          } catch (error) {
            console.error(`❌ Error checking/creating member ${member.name}:`, error);
          }
        }
      }

      // Add COO user if doesn't exist (special case)
      await this.ensureCOOUserExists();

    } catch (error) {
      console.error('❌ Error in team member initialization:', error);
      throw error;
    }
  },

  /**
   * Fix Nir Shilo data issue - remove from Data Team, create Management Team
   */
  async fixNirShiloDataIssue(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.log('⚠️ Supabase not configured, skipping Nir Shilo data fix');
      return false;
    }

    // Prevent multiple simultaneous executions
    if (dataFixInProgress) {
      console.log('⚠️ Data fix already in progress, skipping...');
      return true;
    }

    dataFixInProgress = true;
    console.log('🔧 Fixing Nir Shilo data issue...');
    
    try {
      // Step 1: Create Management Team
      const { data: managementTeam, error: teamError } = await supabase
        .from('teams')
        .upsert([{
          name: 'Management Team',
          description: 'Executive management and leadership team'
        }])
        .select()
        .single();
      
      if (teamError && teamError.code !== '23505') { // Ignore duplicate key error
        throw teamError;
      }
      
      console.log('✅ Management team created/verified');
      
      // Step 2: Remove Nir from Data Team if he exists there
      const { data: dataTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('name', 'Data Team')
        .single();
      
      if (dataTeam) {
        await supabase
          .from('team_members')
          .delete()
          .eq('name', 'Nir Shilo')
          .eq('team_id', dataTeam.id);
        
        console.log('✅ Removed Nir from Data Team');
      }
      
      // Step 3: Remove any duplicate Nir Shilo entries
      const { data: existingNirs } = await supabase
        .from('team_members')
        .select('id, name, team_id')
        .eq('name', 'Nir Shilo');
      
      if (existingNirs && existingNirs.length > 1) {
        // Keep only one (preferably the one without team assignment)
        const nirToKeep = existingNirs.find(n => n.team_id === null) || existingNirs[0];
        const nirsToDelete = existingNirs.filter(n => n.id !== nirToKeep.id);
        
        for (const nir of nirsToDelete) {
          await supabase
            .from('team_members')
            .delete()
            .eq('id', nir.id);
        }
        
        console.log(`✅ Removed ${nirsToDelete.length} duplicate Nir entries`);
      }
      
      // Step 4: Ensure proper COO Nir Shilo exists in Management Team
      const { error: upsertError } = await supabase
        .from('team_members')
        .upsert([{
          name: 'Nir Shilo',
          hebrew: 'ניר שילה',
          is_manager: true,
          team_id: managementTeam?.id || null
        }], { onConflict: 'name' });
      
      if (upsertError) throw upsertError;
      
      console.log('✅ COO Nir Shilo properly configured in Management Team');
      
      // Step 5: Verify the fix
      const { data: nirCheck } = await supabase
        .from('team_members')
        .select(`
          name,
          hebrew,
          is_manager,
          teams(name)
        `)
        .eq('name', 'Nir Shilo');
      
      console.log('🔍 Verification - Nir Shilo records:', nirCheck);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error fixing Nir Shilo data:', error);
      return false;
    } finally {
      dataFixInProgress = false;
    }
  },

  // Clean up duplicate teams (especially Management Team)
  async cleanupDuplicateTeams(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase not configured' }
    }

    try {
      console.log('🔧 Cleaning up duplicate teams...')

      // Check for duplicate Management Teams
      const { data: managementTeams, error: queryError } = await supabase
        .from('teams')
        .select('id, name, created_at')
        .eq('name', 'Management Team')
        .order('created_at', { ascending: true })

      if (queryError) {
        console.error('Error querying Management Teams:', queryError)
        return { success: false, message: `Query error: ${queryError.message}` }
      }

      console.log(`🔍 Found ${managementTeams?.length || 0} Management Team entries`)

      if (managementTeams && managementTeams.length > 1) {
        // Keep the first one (oldest), delete the rest
        const keepTeam = managementTeams[0]
        const deleteTeams = managementTeams.slice(1)
        
        console.log(`🗑️ Keeping Management Team ID: ${keepTeam.id}`)
        console.log(`🗑️ Deleting duplicate Management Teams:`, deleteTeams.map(t => t.id))

        // Delete duplicate teams
        const { error: deleteError } = await supabase
          .from('teams')
          .delete()
          .in('id', deleteTeams.map(t => t.id))

        if (deleteError) {
          console.error('Error deleting duplicate teams:', deleteError)
          return { success: false, message: `Delete error: ${deleteError.message}` }
        }

        console.log(`✅ Deleted ${deleteTeams.length} duplicate Management Team entries`)
      }

      // Verify expected team structure
      const { data: allTeams, error: verifyError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (verifyError) {
        console.error('Error verifying teams:', verifyError)
        return { success: false, message: `Verification error: ${verifyError.message}` }
      }

      const expectedOperationalTeams = [
        'Data Team',
        'Development Team - Itay',
        'Development Team - Tal', 
        'Infrastructure Team',
        'Product Team'
      ]

      const foundTeams = allTeams?.map(t => t.name) || []
      const missingTeams = expectedOperationalTeams.filter(name => !foundTeams.includes(name))
      const operationalTeams = foundTeams.filter(name => name !== 'Management Team')

      console.log('🔍 Team verification:')
      console.log(`  Total teams: ${foundTeams.length}`)
      console.log(`  Operational teams: ${operationalTeams.length}`)
      console.log(`  Found teams: ${foundTeams.join(', ')}`)
      
      if (missingTeams.length > 0) {
        console.warn(`⚠️ Missing expected teams: ${missingTeams.join(', ')}`)
      }

      const hasManagementTeam = foundTeams.includes('Management Team')
      const hasCorrectOperationalCount = operationalTeams.length === 5

      return {
        success: true,
        message: `Cleanup completed. Found ${foundTeams.length} teams (${operationalTeams.length} operational, Management Team: ${hasManagementTeam ? 'exists' : 'missing'}). Expected structure: ${hasCorrectOperationalCount ? 'correct' : 'incorrect'}`
      }

    } catch (error) {
      console.error('Error in cleanupDuplicateTeams:', error)
      return { success: false, message: `Cleanup failed: ${error}` }
    }
  },

  // Emergency cleanup function for critical database state issues
  async emergencyCleanupDuplicateManagementTeams(): Promise<{ success: boolean; message: string; teamsRemoved: number }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase not configured', teamsRemoved: 0 }
    }

    try {
      console.log('🚨 EMERGENCY: Starting cleanup of duplicate Management Teams...')
      
      // First, get ALL Management Teams to assess the scale of the problem
      const { data: allManagementTeams, error: queryError } = await supabase
        .from('teams')
        .select('id, name, created_at')
        .eq('name', 'Management Team')
        .order('created_at', { ascending: true })

      if (queryError) {
        console.error('❌ Emergency cleanup query failed:', queryError)
        return { success: false, message: `Query error: ${queryError.message}`, teamsRemoved: 0 }
      }

      const totalManagementTeams = allManagementTeams?.length || 0
      console.log(`🔍 EMERGENCY: Found ${totalManagementTeams} Management Team entries`)

      if (totalManagementTeams <= 1) {
        console.log('✅ No duplicate Management Teams found - emergency cleanup not needed')
        return { 
          success: true, 
          message: `Found ${totalManagementTeams} Management Team(s) - no cleanup needed`, 
          teamsRemoved: 0 
        }
      }

      // This is the emergency situation - multiple Management Teams exist
      console.log(`🚨 CRITICAL: ${totalManagementTeams} Management Teams found - emergency cleanup required!`)
      
      // Keep the oldest Management Team (first in ascending order by created_at)
      const keepTeam = allManagementTeams[0]
      const duplicateTeams = allManagementTeams.slice(1)
      
      console.log(`🔒 PRESERVING: Management Team ID ${keepTeam.id} (created: ${keepTeam.created_at})`)
      console.log(`🗑️ REMOVING: ${duplicateTeams.length} duplicate Management Teams:`)
      duplicateTeams.forEach(team => {
        console.log(`   - ID ${team.id} (created: ${team.created_at})`)
      })

      // Before deleting teams, reassign any team members to the preserved Management Team
      console.log('🔄 Checking for team members in duplicate teams...')
      const { data: membersInDuplicateTeams, error: membersError } = await supabase
        .from('team_members')
        .select('id, name, team_id')
        .in('team_id', duplicateTeams.map(t => t.id))

      if (membersError) {
        console.error('❌ Error checking team members:', membersError)
        return { 
          success: false, 
          message: `Error checking team members: ${membersError.message}`, 
          teamsRemoved: 0 
        }
      }

      if (membersInDuplicateTeams && membersInDuplicateTeams.length > 0) {
        console.log(`🔄 Found ${membersInDuplicateTeams.length} team members in duplicate teams, reassigning to preserved team...`)
        
        // Reassign all members to the preserved Management Team
        const { error: reassignError } = await supabase
          .from('team_members')
          .update({ team_id: keepTeam.id })
          .in('id', membersInDuplicateTeams.map(m => m.id))

        if (reassignError) {
          console.error('❌ Error reassigning team members:', reassignError)
          return { 
            success: false, 
            message: `Error reassigning team members: ${reassignError.message}`, 
            teamsRemoved: 0 
          }
        }

        console.log(`✅ Successfully reassigned ${membersInDuplicateTeams.length} team members to preserved Management Team`)
        membersInDuplicateTeams.forEach(member => {
          console.log(`   - ${member.name} (ID: ${member.id}) moved from team ${member.team_id} to ${keepTeam.id}`)
        })
      } else {
        console.log('✅ No team members found in duplicate teams - no reassignment needed')
      }

      // Now execute the emergency deletion
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .in('id', duplicateTeams.map(t => t.id))

      if (deleteError) {
        console.error('❌ Emergency deletion failed:', deleteError)
        return { 
          success: false, 
          message: `Emergency deletion failed: ${deleteError.message}`, 
          teamsRemoved: 0 
        }
      }

      console.log(`✅ EMERGENCY CLEANUP SUCCESS: Removed ${duplicateTeams.length} duplicate Management Teams`)

      // Verify the cleanup was successful
      const { data: verifyTeams, error: verifyError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', 'Management Team')

      if (verifyError) {
        console.warn('⚠️ Verification query failed, but deletion may have succeeded:', verifyError)
      } else {
        const remainingCount = verifyTeams?.length || 0
        console.log(`🔍 VERIFICATION: ${remainingCount} Management Team(s) remaining after cleanup`)
        
        if (remainingCount !== 1) {
          console.warn(`⚠️ Expected 1 Management Team after cleanup, found ${remainingCount}`)
        }
      }

      // Final verification - check total team count
      const { data: allTeams } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      const totalTeams = allTeams?.length || 0
      const operationalTeams = allTeams?.filter(t => t.name !== 'Management Team') || []
      
      console.log(`📊 FINAL STATE: ${totalTeams} total teams (${operationalTeams.length} operational + Management Team)`)

      return {
        success: true,
        message: `Emergency cleanup completed successfully. Removed ${duplicateTeams.length} duplicate Management Teams. Final state: ${totalTeams} total teams (${operationalTeams.length} operational).`,
        teamsRemoved: duplicateTeams.length
      }

    } catch (error) {
      console.error('❌ Emergency cleanup failed with exception:', error)
      return { 
        success: false, 
        message: `Emergency cleanup failed: ${error}`, 
        teamsRemoved: 0 
      }
    }
  },

  // Get only operational teams (excludes Management Team)
  async getOperationalTeams(): Promise<Team[]> {
    if (!isSupabaseConfigured()) {
      return []
    }

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .neq('name', 'Management Team')
        .order('name')

      if (error) {
        console.error('Error fetching operational teams:', error)
        return []
      }

      console.log(`✅ Loaded ${data?.length || 0} operational teams`)
      return data || []
    } catch (error) {
      console.error('Error in getOperationalTeams:', error)
      return []
    }
  },

  /**
   * Ensure COO user exists without duplicating
   */
  async ensureCOOUserExists(): Promise<void> {
    try {
      const { data: cooUser } = await supabase
        .from('team_members')
        .select('id, team_id')
        .eq('name', 'Nir Shilo')
        .single();

      if (!cooUser) {
        const { error } = await supabase
          .from('team_members')
          .insert([{
            name: 'Nir Shilo',
            hebrew: 'ניר שילה',
            is_manager: false,
            team_id: null // COO doesn't belong to a specific team
          }]);

        if (error) {
          console.error('❌ Error creating COO user:', error);
        } else {
          console.log('✅ Created COO user: Nir Shilo');
        }
      } else {
        // Check if COO user has incorrect team assignment and fix it
        if (cooUser.team_id !== null) {
          console.log('🔧 Fixing COO user team assignment: Nir Shilo should not belong to any team');
          const { error } = await supabase
            .from('team_members')
            .update({ team_id: null })
            .eq('name', 'Nir Shilo');

          if (error) {
            console.error('❌ Error fixing COO team assignment:', error);
          } else {
            console.log('✅ Fixed COO team assignment: Nir Shilo removed from team and set as COO-level user');
          }
        } else {
          console.log('✅ COO user correctly configured: Nir Shilo');
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring COO user exists:', error);
    }
  },

  // Team Member CRUD Operations
  async addTeamMember(memberData: { name: string; hebrew: string; teamId: number; isManager?: boolean }): Promise<TeamMember | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          name: memberData.name,
          hebrew: memberData.hebrew,
          team_id: memberData.teamId,
          is_manager: memberData.isManager || false
        }])
        .select()
        .single()
      
      if (error) {
        console.error('Error adding team member:', error)
        
        // Provide helpful guidance for RLS policy issues
        if (error.code === '42501') {
          console.error('🚨 RLS POLICY ISSUE: Team member management is blocked by database security policies')
          console.error('📋 Fix required: Run this SQL in Supabase SQL Editor:')
          console.error('CREATE POLICY "Allow insert/update/delete on team_members" ON team_members FOR ALL USING (true);')
          console.error('📖 See TEAM_MEMBER_RLS_FIX.md for complete instructions')
        }
        
        return null
      }
      
      return {
        id: data.id,
        name: data.name,
        hebrew: data.hebrew,
        isManager: data.is_manager,
        team_id: data.team_id,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    } catch (error) {
      console.error('Error adding team member:', error)
      return null
    }
  },

  async updateTeamMember(memberId: number, memberData: { name: string; hebrew: string }, managerId: number): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }
    
    try {
      // First verify the manager has permission to edit this member
      const canEdit = await this.canManagerEditMember(managerId, memberId)
      if (!canEdit) {
        console.error('Manager does not have permission to edit this member')
        return false
      }
      
      const { error } = await supabase
        .from('team_members')
        .update({
          name: memberData.name,
          hebrew: memberData.hebrew,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
      
      if (error) {
        console.error('Error updating team member:', error)
        
        // Provide helpful guidance for RLS policy issues
        if (error.code === '42501') {
          console.error('🚨 RLS POLICY ISSUE: Team member management is blocked by database security policies')
          console.error('📋 Fix required: Run this SQL in Supabase SQL Editor:')
          console.error('CREATE POLICY "Allow insert/update/delete on team_members" ON team_members FOR ALL USING (true);')
          console.error('📖 See TEAM_MEMBER_RLS_FIX.md for complete instructions')
        }
        
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error updating team member:', error)
      return false
    }
  },

  async deleteTeamMember(memberId: number, managerId: number): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }
    
    try {
      // First verify the manager has permission to delete this member
      const canEdit = await this.canManagerEditMember(managerId, memberId)
      if (!canEdit) {
        console.error('Manager does not have permission to delete this member')
        return false
      }
      
      // Check if member is a manager
      const member = await this.getTeamMember(memberId)
      if (member?.isManager) {
        console.error('Cannot delete team managers')
        return false
      }
      
      // First delete all schedule entries for this member
      const { error: scheduleError } = await supabase
        .from('schedule_entries')
        .delete()
        .eq('member_id', memberId)
      
      if (scheduleError) {
        console.error('Error deleting member schedule entries:', scheduleError)
        return false
      }
      
      // Then delete the team member
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
      
      if (error) {
        console.error('Error deleting team member:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error deleting team member:', error)
      return false
    }
  },

  async getTeamMember(memberId: number): Promise<TeamMember | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', memberId)
        .single()
      
      if (error) {
        console.error('Error fetching team member:', error)
        return null
      }
      
      return {
        id: data.id,
        name: data.name,
        hebrew: data.hebrew,
        isManager: data.is_manager,
        email: data.email || undefined,
        team_id: data.team_id,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    } catch (error) {
      console.error('Error fetching team member:', error)  
      return null
    }
  },

  async canManagerEditMember(managerId: number, memberId: number): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }
    
    try {
      // Get manager info
      const manager = await this.getTeamMember(managerId)
      if (!manager?.isManager) {
        return false
      }
      
      // Get member info
      const member = await this.getTeamMember(memberId)
      if (!member) {
        return false
      }
      
      // Check if they're on the same team
      return manager.team_id === member.team_id
    } catch (error) {
      console.error('Error checking manager permissions:', error)
      return false
    }
  },

  // Schedule Entries (now team-filtered)
  async getScheduleEntries(startDate: string, endDate: string, teamId?: number): Promise<Record<number, Record<string, { value: '1' | '0.5' | 'X'; reason?: string; created_at?: string; updated_at?: string }>>> {
    if (!isSupabaseConfigured()) {
      return {}
    }
    
    let query = supabase
      .from('schedule_entries')
      .select(`
        *,
        team_members!inner (
          team_id
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
    
    if (teamId) {
      query = query.eq('team_members.team_id', teamId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching schedule entries:', error)
      return {}
    }
    
    // Transform to the expected format
    const scheduleData: Record<number, Record<string, { value: '1' | '0.5' | 'X'; reason?: string; created_at?: string; updated_at?: string }>> = {}
    data.forEach(entry => {
      if (!scheduleData[entry.member_id]) {
        scheduleData[entry.member_id] = {}
      }
      scheduleData[entry.member_id][entry.date] = {
        value: entry.value,
        reason: entry.reason || undefined,
        created_at: entry.created_at,
        updated_at: entry.updated_at
      }
    })
    
    return scheduleData
  },

  async updateScheduleEntry(
    memberId: number,
    date: string,
    value: '1' | '0.5' | 'X' | null,
    reason?: string
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      return
    }
    if (value === null) {
      // Delete the entry
      const { error } = await supabase
        .from('schedule_entries')
        .delete()
        .eq('member_id', memberId)
        .eq('date', date)
      
      if (error) {
        console.error('Error deleting schedule entry:', error)
      }
    } else {
      // Upsert the entry
      const { error } = await supabase
        .from('schedule_entries')
        .upsert({
          member_id: memberId,
          date,
          value,
          reason: reason || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'member_id,date' })
      
      if (error) {
        console.error('Error updating schedule entry:', error)
      }
    }
  },

  // Real-time subscription (team-aware)
  subscribeToScheduleChanges(
    startDate: string,
    endDate: string,
    teamId: number,
    onUpdate: (payload: unknown) => void
  ) {
    if (!isSupabaseConfigured()) {
      return { unsubscribe: () => {} }
    }
    return supabase
      .channel(`schedule_changes_team_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_entries',
          filter: `date=gte.${startDate} and date=lte.${endDate}`
        },
        onUpdate
      )
      .subscribe()
  },

  // Global Sprint Management
  async getCurrentGlobalSprint(): Promise<CurrentGlobalSprint | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    const { data, error } = await supabase
      .from('current_global_sprint')
      .select('*')
      .single()
    
    if (error) {
      return null
    }
    
    return data
  },

  async getTeamSprintStats(teamId: number): Promise<TeamSprintStats | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    const { data, error } = await supabase
      .from('team_sprint_stats')
      .select('*')
      .eq('team_id', teamId)
      .single()
    
    if (error) {
      return null
    }
    
    return data
  },

  async updateGlobalSprintSettings(settings: Partial<GlobalSprintSettings>, updatedBy: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }
    
    const { error } = await supabase
      .from('global_sprint_settings')
      .update({
        ...settings,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1) // Assuming single row
    
    if (error) {
      return false
    }
    
    return true
  },

  async startNewGlobalSprint(lengthWeeks: number, updatedBy: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }
    
    // Get current sprint to increment sprint number
    const currentSprint = await this.getCurrentGlobalSprint()
    const newSprintNumber = currentSprint ? currentSprint.current_sprint_number + 1 : 1
    
    const { error } = await supabase
      .from('global_sprint_settings')
      .update({
        sprint_length_weeks: lengthWeeks,
        current_sprint_number: newSprintNumber,
        sprint_start_date: new Date().toISOString().split('T')[0],
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1) // Assuming single row
    
    if (error) {
      return false
    }
    
    return true
  },

  async updateSprintDates(startDate: string, endDate?: string, updatedBy: string = 'Harel Mazan'): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.error('Supabase not configured for updateSprintDates')
      return false
    }

    try {
      // Validate input parameters
      if (!startDate || typeof startDate !== 'string') {
        console.error('Invalid startDate parameter')
        return false
      }

      if (updatedBy !== 'Harel Mazan') {
        console.error('Unauthorized user attempting to update sprint dates:', updatedBy)
        return false
      }

      // Get current sprint settings to calculate end date if not provided
      const currentSprint = await this.getCurrentGlobalSprint()
      if (!currentSprint) {
        console.error('No current sprint found for date update')
        return false
      }

      let calculatedEndDate = endDate
      if (!calculatedEndDate) {
        // Calculate end date based on start date and current sprint length
        const start = new Date(startDate)
        if (isNaN(start.getTime())) {
          console.error('Invalid start date format:', startDate)
          return false
        }
        
        const end = new Date(start)
        end.setDate(start.getDate() + (currentSprint.sprint_length_weeks * 7) - 1)
        calculatedEndDate = end.toISOString().split('T')[0]
      }

      // Validate dates
      const start = new Date(startDate)
      const end = new Date(calculatedEndDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid date format in updateSprintDates:', { startDate, endDate: calculatedEndDate })
        return false
      }
      
      if (start >= end) {
        console.error('Invalid date range: start date must be before end date')
        return false
      }

      // Check for reasonable date bounds
      const now = new Date()
      const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())
      const tenYearsFromNow = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate())
      
      if (start < tenYearsAgo || start > tenYearsFromNow || end < tenYearsAgo || end > tenYearsFromNow) {
        console.error('Date out of reasonable bounds (±10 years)')
        return false
      }

      // Calculate new sprint length based on actual dates
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const newSprintLength = Math.round(durationDays / 7)

      if (newSprintLength < 1 || newSprintLength > 4) {
        console.error('Invalid sprint length: must be between 1 and 4 weeks, got:', newSprintLength)
        return false
      }

      // Perform database update with error handling
      const { error } = await supabase
        .from('global_sprint_settings')
        .update({
          sprint_start_date: startDate,
          sprint_length_weeks: newSprintLength,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)

      if (error) {
        console.error('Database error updating sprint dates:', error)
        return false
      }

      return true
    } catch (err) {
      console.error('Unexpected error in updateSprintDates:', err)
      return false
    }
  },

  async getGlobalSprintSettings(): Promise<GlobalSprintSettings | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    const { data, error } = await supabase
      .from('global_sprint_settings')
      .select('*')
      .single()
    
    if (error) {
      console.error('Error fetching global sprint settings:', error)
      return null
    }
    
    return data
  },

  // Sprint Calculation Helper Functions
  /**
   * Calculate sprint potential hours for a team
   * Formula: team_size × working_days × 7_hours_per_day
   */
  calculateSprintPotential(memberCount: number, sprintWeeks: number): number {
    const workingDaysPerWeek = 5; // Monday to Friday
    const hoursPerDay = 7; // Standard work day
    const totalWorkingDays = sprintWeeks * workingDaysPerWeek;
    return memberCount * totalWorkingDays * hoursPerDay;
  },

  /**
   * Calculate working days in sprint (excludes weekends)
   */
  calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Monday = 1, Friday = 5 (working days)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  },

  /**
   * Get sprint date range from sprint data
   */
  getSprintDateRange(sprintData: CurrentGlobalSprint | null): { startDate: string; endDate: string } {
    if (!sprintData || !sprintData.sprint_start_date) {
      // Fallback to current week if no sprint data
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 13); // 2 week default
      
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    }

    const startDate = new Date(sprintData.sprint_start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (sprintData.sprint_length_weeks * 7) - 1);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  },

  /**
   * Calculate actual sprint hours for team members
   */
  async calculateSprintActualHours(memberIds: number[], startDate: string, endDate: string): Promise<number> {
    if (memberIds.length === 0) return 0;

    try {
      const { data: entries, error } = await supabase
        .from('schedule_entries')
        .select('value, date')
        .in('member_id', memberIds)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        console.error('Error fetching sprint schedule entries:', error);
        return 0;
      }

      // Calculate total hours
      let totalHours = 0;
      entries?.forEach(entry => {
        if (entry.value === '1') totalHours += 7;
        else if (entry.value === '0.5') totalHours += 3.5;
      });

      return totalHours;
    } catch (error) {
      console.error('Error calculating sprint actual hours:', error);
      return 0;
    }
  },

  // COO Dashboard Functions
  async getCompanyCapacityMetrics(): Promise<CompanyCapacityMetrics | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      // Get current sprint information first
      const currentSprint = await this.getCurrentGlobalSprint()
      
      // Get sprint date range (falls back to 2-week period if no sprint data)
      const sprintDateRange = this.getSprintDateRange(currentSprint)
      const startDateStr = sprintDateRange.startDate
      const endDateStr = sprintDateRange.endDate
      
      console.log(`📅 Using sprint-based calculations: ${startDateStr} to ${endDateStr}`)
      if (currentSprint) {
        console.log(`🏃‍♂️ Sprint ${currentSprint.current_sprint_number} (${currentSprint.sprint_length_weeks} weeks)`)
      }
      
      // Get operational teams only (excludes Management Team) and all members
      const teams = await this.getOperationalTeams()
      const allMembers = await this.getTeamMembers()
      
      // Note: Individual schedule data retrieval now handled by calculateSprintActualHours helper
      // const scheduleData = await this.getScheduleEntries(startDateStr, endDateStr) // Removed - no longer used
      
      // Calculate sprint-based potential hours for each team
      const teamCapacityData: TeamCapacityStatus[] = []
      let totalPotentialHours = 0
      let totalActualHours = 0
      
      // Use sprint length (default to 2 weeks if no sprint data)
      const sprintWeeks = currentSprint?.sprint_length_weeks || 2
      
      for (const team of teams) {
        const teamMembers = allMembers.filter(m => m.team_id === team.id)
        const memberCount = teamMembers.length
        
        // Calculate sprint potential using helper function
        const sprintPotential = this.calculateSprintPotential(memberCount, sprintWeeks)
        
        // Calculate actual hours for this team during sprint period
        const memberIds = teamMembers.map(m => m.id)
        const teamActualHours = await this.calculateSprintActualHours(memberIds, startDateStr, endDateStr)
        
        console.log(`📊 Team ${team.name}: ${memberCount} members, ${sprintPotential}h potential (${sprintWeeks} weeks), ${teamActualHours}h actual`)
        
        // Calculate sprint-based utilization and capacity status
        const utilization = sprintPotential > 0 ? Math.round((teamActualHours / sprintPotential) * 100) : 0
        const capacityGap = sprintPotential - teamActualHours
        const capacityStatus = utilization > 100 ? 'over' : utilization < 80 ? 'under' : 'optimal'
        
        teamCapacityData.push({
          teamId: team.id,
          teamName: team.name,
          memberCount,
          weeklyPotential: sprintPotential, // Note: keeping field name for compatibility but now contains sprint potential
          actualHours: teamActualHours,
          utilization,
          capacityGap,
          capacityStatus,
          color: team.color
        })
        
        totalPotentialHours += sprintPotential
        totalActualHours += teamActualHours
      }
      
      const overCapacityTeams = teamCapacityData.filter(t => t.capacityStatus === 'over')
      const underUtilizedTeams = teamCapacityData.filter(t => t.capacityStatus === 'under')
      
      const companyUtilization = totalPotentialHours > 0 ? Math.round((totalActualHours / totalPotentialHours) * 100) : 0
      const companyCapacityGap = totalPotentialHours - totalActualHours
      
      // Calculate sprint metrics
      let sprintPotential = 0
      let sprintActual = 0
      let sprintUtilizationTrend: number[] = []
      
      if (currentSprint) {
        // Use real sprint capacity calculation based on working days
        sprintPotential = calculateSprintCapacityFromSettings(allMembers, currentSprint)
        // This would need more complex calculation with historical data
        sprintActual = totalActualHours * (currentSprint.current_sprint_number || 1)
        sprintUtilizationTrend = [90, 85, 88] // Mock data - would come from historical calculation
      }
      
      return {
        currentWeek: {
          potentialHours: totalPotentialHours,
          actualHours: totalActualHours,
          utilizationPercent: companyUtilization,
          capacityGap: companyCapacityGap,
          overCapacityTeams,
          underUtilizedTeams,
          allTeamsCapacity: teamCapacityData
        },
        currentSprint: {
          totalPotentialHours: sprintPotential,
          actualHoursToDate: sprintActual,
          projectedSprintTotal: sprintPotential * (companyUtilization / 100),
          sprintUtilizationTrend,
          expectedSprintOutcome: companyUtilization
        },
        historicalTrends: {
          weeklyUtilization: [], // Would need historical data
          averageUtilization: companyUtilization,
          peakUtilization: Math.max(companyUtilization, 95),
          minimumUtilization: Math.min(companyUtilization, 75)
        }
      }
    } catch (error) {
      console.error('Error calculating company capacity metrics:', error)
      return null
    }
  },

  async getTeamCapacityComparison(): Promise<TeamCapacityStatus[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    try {
      const companyMetrics = await this.getCompanyCapacityMetrics()
      if (!companyMetrics) return []
      
      // Return team capacity data from company metrics
      return [
        ...companyMetrics.currentWeek.overCapacityTeams,
        ...companyMetrics.currentWeek.underUtilizedTeams,
        // Add optimal teams
        ...(await this.getTeams()).map(team => ({
          teamId: team.id,
          teamName: team.name,
          memberCount: 0,
          weeklyPotential: 0,
          actualHours: 0,
          utilization: 0,
          capacityGap: 0,
          capacityStatus: 'optimal' as const,
          color: team.color
        })).filter(team => 
          !companyMetrics.currentWeek.overCapacityTeams.some(t => t.teamId === team.teamId) &&
          !companyMetrics.currentWeek.underUtilizedTeams.some(t => t.teamId === team.teamId)
        )
      ]
    } catch (error) {
      console.error('Error fetching team capacity comparison:', error)
      return []
    }
  },

  async getCOODashboardData(): Promise<COODashboardData | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      console.log('🔍 Loading COO dashboard data...')
      
      const teams = await this.getTeams()
      console.log('🏢 Teams loaded:', teams.length, teams.map(t => ({ id: t.id, name: t.name })))
      
      const allMembers = await this.getTeamMembers()
      console.log('👥 All members loaded:', allMembers.length)
      
      // Check for Product Team specifically
      const productTeam = teams.find(t => t.name.toLowerCase().includes('product'))
      console.log('📦 Product Team found:', productTeam ? `${productTeam.name} (ID: ${productTeam.id})` : 'NOT FOUND')
      
      const companyMetrics = await this.getCompanyCapacityMetrics()
      const currentSprint = await this.getCurrentGlobalSprint()
      
      if (!companyMetrics || !currentSprint) {
        return null
      }
      
      // Generate optimization recommendations
      const optimizationRecommendations: string[] = []
      
      companyMetrics.currentWeek.overCapacityTeams.forEach(team => {
        optimizationRecommendations.push(
          `${team.teamName}: ${Math.abs(team.capacityGap)}h over-committed - review sprint commitments`
        )
      })
      
      companyMetrics.currentWeek.underUtilizedTeams.forEach(team => {
        optimizationRecommendations.push(
          `${team.teamName}: ${team.capacityGap}h under-utilized - investigate capacity constraints`
        )
      })
      
      if (companyMetrics.currentWeek.utilizationPercent < 80) {
        optimizationRecommendations.push('Overall utilization is low - consider increasing sprint commitments')
      }
      
      return {
        companyOverview: {
          totalTeams: teams.length,
          totalMembers: allMembers.length,
          weeklyPotential: companyMetrics.currentWeek.potentialHours,
          currentUtilization: companyMetrics.currentWeek.utilizationPercent,
          capacityGap: companyMetrics.currentWeek.capacityGap
        },
        teamComparison: companyMetrics.currentWeek.allTeamsCapacity,
        sprintAnalytics: {
          currentSprintNumber: currentSprint.current_sprint_number,
          sprintWeeks: currentSprint.sprint_length_weeks,
          sprintPotential: companyMetrics.currentSprint.totalPotentialHours,
          sprintActual: companyMetrics.currentSprint.actualHoursToDate,
          sprintUtilization: companyMetrics.currentSprint.expectedSprintOutcome,
          weeklyBreakdown: [
            { week: 1, potential: companyMetrics.currentWeek.potentialHours, actual: companyMetrics.currentWeek.actualHours, utilization: companyMetrics.currentWeek.utilizationPercent },
            { week: 2, potential: companyMetrics.currentWeek.potentialHours, actual: companyMetrics.currentWeek.actualHours * 0.9, utilization: companyMetrics.currentWeek.utilizationPercent * 0.9 },
            { week: 3, potential: companyMetrics.currentWeek.potentialHours, actual: companyMetrics.currentWeek.actualHours * 0.85, utilization: companyMetrics.currentWeek.utilizationPercent * 0.85 }
          ]
        },
        optimizationRecommendations,
        capacityForecast: {
          nextWeekProjection: {
            potentialHours: companyMetrics.currentWeek.potentialHours,
            projectedActual: companyMetrics.currentWeek.actualHours * 1.05,
            expectedUtilization: companyMetrics.currentWeek.utilizationPercent * 1.05,
            confidenceLevel: 85
          },
          nextSprintProjection: {
            sprintPotential: companyMetrics.currentSprint.totalPotentialHours,
            projectedOutcome: companyMetrics.currentSprint.projectedSprintTotal,
            riskFactors: ['Team capacity constraints', 'Sprint scope creep'],
            recommendedActions: ['Monitor over-capacity teams', 'Redistribute workload']
          },
          quarterlyOutlook: {
            avgUtilization: companyMetrics.historicalTrends.averageUtilization,
            capacityTrends: [
              { period: 'Q1', trend: 'increasing', value: 85, change: 5 },
              { period: 'Q2', trend: 'stable', value: 87, change: 2 },
              { period: 'Q3', trend: 'decreasing', value: 83, change: -4 }
            ],
            resourceNeeds: [
              { team: 'Development', needType: 'additional', priority: 'high', description: 'Need 2 more developers', impact: 'Increase capacity by 70h/week' }
            ]
          }
        }
      }
    } catch (error) {
      console.error('Error fetching COO dashboard data:', error)
      return null
    }
  },

  // COO User Management
  async getCOOUsers(): Promise<COOUser[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    try {
      // For now, return a hardcoded COO user since we know Nir Shilo should be the COO
      // In a real system, this could be based on a user_role column or separate executives table
      const cooUsers: COOUser[] = [
        {
          id: 1,
          name: 'Nir Shilo',
          hebrew: 'ניר שילה',
          title: 'Chief Operating Officer',
          description: 'Company-wide analytics and team oversight'
        }
      ]
      
      return cooUsers
    } catch (error) {
      console.error('Error fetching COO users:', error)
      return []
    }
  },

  // COO Detailed Export Data
  async getDetailedCompanyScheduleData(startDate: string, endDate: string): Promise<DetailedCompanyScheduleData | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      console.log('🔍 Fetching detailed schedule data for date range:', startDate, 'to', endDate)
      
      // Get all teams
      const teams = await this.getTeams()
      console.log('📊 Found teams:', teams.length)
      
      // Get all team members
      const allMembers = await this.getTeamMembers()
      console.log('👥 Found members:', allMembers.length)
      
      // Get schedule entries for the date range
      const scheduleEntries = await this.getScheduleEntries(startDate, endDate)
      console.log('📅 Found schedule entries for', Object.keys(scheduleEntries).length, 'members')
      
      // Generate week days array
      const weekDays = this.generateWeekDays(startDate, endDate)
      console.log('📆 Week days:', weekDays)
      
      // Process teams and members
      const detailedTeams: DetailedTeamScheduleData[] = []
      let companyTotalMembers = 0
      let companyTotalPotential = 0
      let companyTotalActual = 0
      
      for (const team of teams) {
        const teamMembers = allMembers.filter(m => m.team_id === team.id)
        const detailedMembers: DetailedMemberScheduleData[] = []
        const managers: DetailedMemberScheduleData[] = []
        
        let teamTotalPotential = 0
        let teamTotalActual = 0
        
        for (const member of teamMembers) {
          const memberScheduleData = await this.processMemberScheduleData(
            member,
            scheduleEntries[member.id] || {},
            weekDays
          )
          
          detailedMembers.push(memberScheduleData)
          
          if (member.isManager) {
            managers.push(memberScheduleData)
          }
          
          teamTotalPotential += memberScheduleData.weeklyTotals.potentialHours
          teamTotalActual += memberScheduleData.weeklyTotals.actualHours
        }
        
        const teamUtilization = teamTotalPotential > 0 ? 
          Math.round((teamTotalActual / teamTotalPotential) * 100) : 0
        const capacityGap = teamTotalPotential - teamTotalActual
        
        detailedTeams.push({
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || '#3b82f6',
          description: team.description,
          members: detailedMembers,
          managers,
          teamTotals: {
            memberCount: teamMembers.length,
            potentialHours: teamTotalPotential,
            actualHours: teamTotalActual,
            utilization: teamUtilization,
            capacityGap
          }
        })
        
        companyTotalMembers += teamMembers.length
        companyTotalPotential += teamTotalPotential
        companyTotalActual += teamTotalActual
      }
      
      const overallUtilization = companyTotalPotential > 0 ? 
        Math.round((companyTotalActual / companyTotalPotential) * 100) : 0
      
      console.log('✅ Generated detailed schedule data:', {
        teams: detailedTeams.length,
        totalMembers: companyTotalMembers,
        totalActualHours: companyTotalActual,
        utilization: overallUtilization
      })
      
      return {
        teams: detailedTeams,
        dateRange: {
          startDate,
          endDate,
          weekDays
        },
        companyTotals: {
          totalMembers: companyTotalMembers,
          totalPotentialHours: companyTotalPotential,
          totalActualHours: companyTotalActual,
          overallUtilization
        }
      }
    } catch (error) {
      console.error('Error fetching detailed company schedule data:', error)
      return null
    }
  },

  // Helper: Generate week days array from date range
  generateWeekDays(startDate: string, endDate: string): string[] {
    const weekDays: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    while (current <= end) {
      // Only include weekdays (Sunday = 0 to Thursday = 4)
      if (current.getDay() >= 0 && current.getDay() <= 4) {
        weekDays.push(current.toISOString().split('T')[0])
      }
      current.setDate(current.getDate() + 1)
    }
    
    return weekDays
  },

  // Helper: Process individual member schedule data
  async processMemberScheduleData(
    member: TeamMember,
    memberScheduleEntries: Record<string, { value: '1' | '0.5' | 'X'; reason?: string; created_at?: string; updated_at?: string }>,
    weekDays: string[]
  ): Promise<DetailedMemberScheduleData> {
    const dailySchedule: { [dateKey: string]: MemberDaySchedule } = {}
    const reasons: MemberReasonEntry[] = []
    let actualHours = 0
    let daysWorked = 0
    
    weekDays.forEach(date => {
      const entry = memberScheduleEntries[date]
      let hours = 0
      let value: '1' | '0.5' | 'X' | null = null
      
      if (entry) {
        value = entry.value
        switch (entry.value) {
          case '1':
            hours = 7
            daysWorked++
            break
          case '0.5':
            hours = 3.5
            daysWorked++
            break
          case 'X':
            hours = 0
            break
        }
        
        // Collect reasons for non-full days
        if (entry.reason && (entry.value === '0.5' || entry.value === 'X')) {
          reasons.push({
            date,
            value: entry.value,
            reason: entry.reason,
            formattedDate: this.formatDateForReasons(new Date(date))
          })
        }
      }
      
      dailySchedule[date] = {
        date,
        value,
        hours,
        reason: entry?.reason
      }
      
      actualHours += hours
    })
    
    const potentialHours = weekDays.length * 7 // 7 hours per day
    const utilization = potentialHours > 0 ? Math.round((actualHours / potentialHours) * 100) : 0
    
    return {
      memberId: member.id,
      memberName: member.name,
      memberHebrew: member.hebrew,
      isManager: member.isManager || false,
      teamId: member.team_id,
      dailySchedule,
      weeklyTotals: {
        actualHours,
        potentialHours,
        utilization,
        daysWorked
      },
      reasons
    }
  },

  // Helper: Format date for reasons display
  formatDateForReasons(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  },

  // Sprint History Management
  async getSprintHistory(): Promise<SprintHistoryEntry[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    try {
      const { data, error } = await supabase
        .from('sprint_history')
        .select('*')
        .order('sprint_start_date', { ascending: false })
      
      if (error) {
        console.error('Error fetching sprint history:', error)
        return []
      }
      
      // Calculate progress and days remaining manually since we don't have the view
      const enrichedData = (data || []).map(sprint => {
        const today = new Date()
        const startDate = new Date(sprint.sprint_start_date)
        const endDate = new Date(sprint.sprint_end_date)
        
        let progress_percentage = 0
        let days_remaining = 0
        let status = sprint.status
        
        // Auto-calculate status based on dates
        if (startDate > today) {
          status = 'upcoming'
        } else if (endDate < today) {
          status = 'completed'
          progress_percentage = 100
        } else {
          status = 'active'
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          progress_percentage = Math.round((daysPassed / totalDays) * 100)
          days_remaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
        }
        
        const total_days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        
        return {
          ...sprint,
          status,
          progress_percentage,
          days_remaining,
          total_days
        }
      })
      
      return enrichedData
    } catch (error) {
      console.error('Error in getSprintHistory:', error)
      return []
    }
  },

  async createSprint(sprintData: CreateSprintRequest): Promise<SprintHistoryEntry | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      // Get next sprint number
      const { data: maxSprintData } = await supabase
        .from('sprint_history')
        .select('sprint_number')
        .order('sprint_number', { ascending: false })
        .limit(1)
      
      const nextSprintNumber = (maxSprintData?.[0]?.sprint_number || 0) + 1
      
      const { data, error } = await supabase
        .from('sprint_history')
        .insert([{
          sprint_number: nextSprintNumber,
          sprint_name: sprintData.sprint_name,
          sprint_start_date: sprintData.sprint_start_date,
          sprint_end_date: sprintData.sprint_end_date,
          sprint_length_weeks: sprintData.sprint_length_weeks,
          description: sprintData.description,
          created_by: sprintData.created_by || 'System'
        }])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating sprint:', error)
        return null
      }
      
      // Return the enriched sprint data
      const enrichedSprint = await this.enrichSprintData(data)
      return enrichedSprint
    } catch (error) {
      console.error('Error in createSprint:', error)
      return null
    }
  },

  async updateSprint(sprintId: number, updates: Partial<CreateSprintRequest>): Promise<SprintHistoryEntry | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      const { data, error } = await supabase
        .from('sprint_history')
        .update({
          ...updates,
          updated_by: updates.created_by || 'System',
          updated_at: new Date().toISOString()
        })
        .eq('id', sprintId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating sprint:', error)
        return null
      }
      
      // Return the enriched updated sprint data
      const enrichedSprint = await this.enrichSprintData(data)
      return enrichedSprint
    } catch (error) {
      console.error('Error in updateSprint:', error)
      return null
    }
  },

  async deleteSprint(sprintId: number): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }
    
    try {
      const { error } = await supabase
        .from('sprint_history')
        .delete()
        .eq('id', sprintId)
      
      if (error) {
        console.error('Error deleting sprint:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error in deleteSprint:', error)
      return false
    }
  },

  async getSprintsByDateRange(startDate: string, endDate: string): Promise<SprintHistoryEntry[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    try {
      const { data, error } = await supabase
        .from('sprint_history')
        .select('*')
        .or(`and(sprint_start_date.lte.${endDate},sprint_end_date.gte.${startDate})`)
        .order('sprint_start_date', { ascending: true })
      
      if (error) {
        console.error('Error fetching sprints by date range:', error)
        return []
      }
      
      // Enrich all sprint data
      const enrichedData = await Promise.all(
        (data || []).map(sprint => this.enrichSprintData(sprint))
      )
      
      return enrichedData
    } catch (error) {
      console.error('Error in getSprintsByDateRange:', error)
      return []
    }
  },

  async getSprintById(sprintId: number): Promise<SprintHistoryEntry | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      const { data, error } = await supabase
        .from('sprint_history')
        .select('*')
        .eq('id', sprintId)
        .single()
      
      if (error) {
        console.error('Error fetching sprint by ID:', error)
        return null
      }
      
      if (!data) return null
      
      // Enrich the sprint data
      const enrichedSprint = await this.enrichSprintData(data)
      return enrichedSprint
    } catch (error) {
      console.error('Error in getSprintById:', error)
      return null
    }
  },

  async getSprintsByStatus(status: 'upcoming' | 'active' | 'completed'): Promise<SprintHistoryEntry[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    try {
      const { data, error } = await supabase
        .from('sprint_history')
        .select('*')
        .eq('status', status)
        .order('sprint_start_date', { ascending: status === 'upcoming' })
      
      if (error) {
        console.error('Error fetching sprints by status:', error)
        return []
      }
      
      // Enrich all sprint data
      const enrichedData = await Promise.all(
        (data || []).map(sprint => this.enrichSprintData(sprint))
      )
      
      return enrichedData
    } catch (error) {
      console.error('Error in getSprintsByStatus:', error)
      return []
    }
  },

  async getActiveSprintCount(): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 0
    }
    
    try {
      const { count, error } = await supabase
        .from('sprint_history')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      
      if (error) {
        console.error('Error getting active sprint count:', error)
        return 0
      }
      
      return count || 0
    } catch (error) {
      console.error('Error in getActiveSprintCount:', error)
      return 0
    }
  },

  async validateSprintDateRange(startDate: string, endDate: string, excludeSprintId?: number): Promise<{ isValid: boolean; conflicts: SprintHistoryEntry[] }> {
    if (!isSupabaseConfigured()) {
      return { isValid: true, conflicts: [] }
    }
    
    try {
      let query = supabase
        .from('sprint_history')
        .select('*')
        .or(`and(sprint_start_date.lte.${endDate},sprint_end_date.gte.${startDate})`)
      
      if (excludeSprintId) {
        query = query.neq('id', excludeSprintId)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error validating sprint date range:', error)
        return { isValid: false, conflicts: [] }
      }
      
      // Enrich the conflict data
      const enrichedConflicts = await Promise.all(
        (data || []).map(sprint => this.enrichSprintData(sprint))
      )
      
      return { isValid: enrichedConflicts.length === 0, conflicts: enrichedConflicts }
    } catch (error) {
      console.error('Error in validateSprintDateRange:', error)
      return { isValid: false, conflicts: [] }
    }
  },

  // Helper function to enrich sprint data with calculated fields
  async enrichSprintData(sprint: Partial<SprintHistoryEntry>): Promise<SprintHistoryEntry> {
    const today = new Date()
    const startDate = new Date(sprint.sprint_start_date!)
    const endDate = new Date(sprint.sprint_end_date!)
    
    let progress_percentage = 0
    let days_remaining = 0
    let status = sprint.status
    
    // Auto-calculate status based on dates
    if (startDate > today) {
      status = 'upcoming'
    } else if (endDate < today) {
      status = 'completed'
      progress_percentage = 100
    } else {
      status = 'active'
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      progress_percentage = Math.round((daysPassed / totalDays) * 100)
      days_remaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    }
    
    const total_days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    return {
      ...sprint,
      status,
      progress_percentage,
      days_remaining,
      total_days
    } as SprintHistoryEntry
  },

  /**
   * Calculate sprint status based on dates
   */
  calculateSprintStatus(startDate: string, endDate: string): 'upcoming' | 'active' | 'completed' {
    const today = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start > today) return 'upcoming'
    if (end < today) return 'completed'
    return 'active'
  },

  /**
   * Calculate sprint progress percentage
   */
  calculateSprintProgress(startDate: string, endDate: string): number {
    const today = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (today < start) return 0
    if (today > end) return 100
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const daysPassed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    return Math.round((daysPassed / totalDays) * 100)
  },

  /**
   * Calculate days remaining in sprint
   */
  calculateDaysRemaining(endDate: string): number {
    const today = new Date()
    const end = new Date(endDate)
    
    if (today > end) return 0
    
    return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  },

  /**
   * Calculate total sprint duration in days
   */
  calculateSprintDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  },

  /**
   * Get sprint summary statistics
   */
  async getSprintSummary(): Promise<{
    totalSprints: number;
    activeSprints: number;
    upcomingSprints: number;
    completedSprints: number;
    averageDuration: number;
  }> {
    if (!isSupabaseConfigured()) {
      return {
        totalSprints: 0,
        activeSprints: 0,
        upcomingSprints: 0,
        completedSprints: 0,
        averageDuration: 0
      }
    }

    try {
      const { data, error } = await supabase
        .from('sprint_history')
        .select('status, sprint_length_weeks')

      if (error) {
        console.error('Error fetching sprint summary:', error)
        return {
          totalSprints: 0,
          activeSprints: 0,
          upcomingSprints: 0,
          completedSprints: 0,
          averageDuration: 0
        }
      }

      const sprints = data || []
      const totalSprints = sprints.length
      const activeSprints = sprints.filter(s => s.status === 'active').length
      const upcomingSprints = sprints.filter(s => s.status === 'upcoming').length
      const completedSprints = sprints.filter(s => s.status === 'completed').length
      
      const averageDuration = totalSprints > 0 
        ? Math.round(sprints.reduce((sum, s) => sum + (s.sprint_length_weeks || 2), 0) / totalSprints * 10) / 10
        : 0

      return {
        totalSprints,
        activeSprints,
        upcomingSprints,
        completedSprints,
        averageDuration
      }
    } catch (error) {
      console.error('Error in getSprintSummary:', error)
      return {
        totalSprints: 0,
        activeSprints: 0,
        upcomingSprints: 0,
        completedSprints: 0,
        averageDuration: 0
      }
    }
  },

  // Database Migration Functions
  
  /**
   * Verify if sprint_history table exists and is accessible
   */
  async verifySprintTable(): Promise<{ exists: boolean; recordCount: number; error?: string }> {
    try {
      const { error } = await supabase
        .from('sprint_history')
        .select('id', { count: 'exact' })
        .limit(1)

      if (error) {
        // Check specific error types
        if (error.message.includes('does not exist') || error.code === '42P01') {
          return { exists: false, recordCount: 0, error: 'Table does not exist' }
        }
        if (error.message.includes('permission denied') || error.code === '42501') {
          return { exists: true, recordCount: 0, error: 'Permission denied - table exists but not accessible' }
        }
        return { exists: false, recordCount: 0, error: error.message }
      }

      // Get actual count
      const { count, error: countError } = await supabase
        .from('sprint_history')
        .select('*', { count: 'exact', head: true })

      return { 
        exists: true, 
        recordCount: count || 0, 
        error: countError?.message 
      }
    } catch (error) {
      return { 
        exists: false, 
        recordCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  },

  /**
   * Handle table permission issues
   */
  async handleTablePermissionIssues(): Promise<{ success: boolean; message: string; requiresManualSetup?: boolean }> {
    return {
      success: false,
      message: 'Sprint table exists but is not accessible - check RLS policies and permissions',
      requiresManualSetup: true
    }
  },

  /**
   * Provide manual setup instructions
   */
  getManualSetupInstructions(): string {
    return `
🔧 MANUAL SETUP REQUIRED:

1. Go to Supabase Dashboard → SQL Editor
2. Run the sprint_history table creation script located at:
   sql/create-sprint-history-complete.sql
3. Verify table creation and permissions
4. Refresh the application

The table creation script includes:
- Complete table schema with constraints
- Indexes for performance
- Sample sprint data
- Proper permissions for authenticated users
    `.trim()
  },

  async initializeSprintDatabase(): Promise<{ success: boolean; message: string; requiresManualSetup?: boolean }> {
    if (!isSupabaseConfigured()) {
      return { 
        success: false, 
        message: 'Supabase not configured - check environment variables',
        requiresManualSetup: false 
      }
    }

    try {
      console.log('🚀 Initializing sprint planning database...')
      
      // First, try to verify if table exists by attempting a simple query
      const tableVerification = await this.verifySprintTable()
      
      if (tableVerification.exists && !tableVerification.error) {
        console.log('✅ Sprint database already initialized')
        return { 
          success: true, 
          message: `Sprint database ready - ${tableVerification.recordCount} sprints available`,
          requiresManualSetup: false 
        }
      }

      if (tableVerification.exists && tableVerification.error) {
        console.warn('⚠️ Sprint table exists but has issues:', tableVerification.error)
        return await this.handleTablePermissionIssues()
      }

      // Table doesn't exist - try to detect it through information_schema  
      console.log('🔍 Table not accessible via direct query, checking database schema...')
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'sprint_history')

      if (tablesError) {
        console.warn('⚠️ Could not check information_schema:', tablesError.message)
        // Continue with table creation attempt
      } else if (tables && tables.length > 0) {
        console.log('📋 Table exists in schema but not accessible - likely a permission issue')
        return await this.handleTablePermissionIssues()
      }

      // Table truly doesn't exist - attempt creation or provide manual setup instructions
      console.log('❌ Sprint table does not exist - manual creation required')
      console.log('📋 Manual setup instructions:')
      console.log(this.getManualSetupInstructions())
      
      return {
        success: false,
        message: 'Sprint history table missing - manual setup required in Supabase Dashboard. Check console for detailed instructions.',
        requiresManualSetup: true
      }

    } catch (error) {
      console.error('❌ Error initializing sprint database:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return { 
        success: false, 
        message: `Failed to initialize sprint database: ${errorMessage}`,
        requiresManualSetup: errorMessage.includes('does not exist') || errorMessage.includes('42P01')
      }
    }
  },

  async createSprintTablesManually(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔧 Creating sprint tables manually using Supabase client...')
      
      // Since we can't execute raw SQL easily, let's try to create a minimal version
      // by inserting a test record and letting Supabase create the table structure
      
      // First, try to create a very basic sprint record to let Supabase auto-create table
      const testSprint = {
        sprint_number: 999,
        sprint_name: 'Test Sprint - Will be deleted',
        sprint_start_date: '2025-01-01',
        sprint_end_date: '2025-01-14',
        sprint_length_weeks: 2,
        description: 'Test sprint for table creation',
        status: 'upcoming',
        created_by: 'System'
      }

      // Try to insert test data which should create the table
      const { error: insertError } = await supabase
        .from('sprint_history')
        .insert([testSprint])

      if (insertError) {
        console.error('Error creating table via insert:', insertError)
        return { success: false, message: `Table creation failed: ${insertError.message}` }
      }

      // Clean up test record
      await supabase
        .from('sprint_history')
        .delete()
        .eq('sprint_number', 999)

      console.log('✅ Sprint table created via insert method')
      return { success: true, message: 'Sprint table created successfully' }

    } catch (error) {
      console.error('Error in createSprintTablesManually:', error)
      return { success: false, message: `Manual table creation failed: ${error}` }
    }
  },


  async addSampleSprintData(): Promise<void> {
    try {
      const sampleSprints = [
        {
          sprint_number: 1,
          sprint_name: 'Q3 Foundation Sprint',
          sprint_start_date: '2024-07-07',
          sprint_end_date: '2024-07-20',
          sprint_length_weeks: 2,
          description: 'Foundation setup and initial features',
          created_by: 'System'
        },
        {
          sprint_number: 2,
          sprint_name: 'Q3 Development Sprint',
          sprint_start_date: '2024-07-21',
          sprint_end_date: '2024-08-03',
          sprint_length_weeks: 2,
          description: 'Core functionality development',
          created_by: 'System'
        },
        {
          sprint_number: 3,
          sprint_name: 'Q4 Enhancement Sprint',
          sprint_start_date: '2025-07-28',
          sprint_end_date: '2025-08-10',
          sprint_length_weeks: 2,
          description: 'Feature enhancements and improvements',
          created_by: 'System'
        }
      ]

      const { error } = await supabase
        .from('sprint_history')
        .upsert(sampleSprints, { onConflict: 'sprint_number' })

      if (error) {
        console.error('Error adding sample sprint data:', error)
      } else {
        console.log('✅ Sample sprint data added')
      }
    } catch (error) {
      console.error('Error adding sample sprint data:', error)
    }
  },

  // Availability Templates
  async getAvailabilityTemplates(options?: TemplateQueryOptions): Promise<TemplateSearchResult> {
    if (!isSupabaseConfigured()) {
      return { templates: [], totalCount: 0, hasMore: false }
    }

    try {
      let query = supabase
        .from('availability_templates')
        .select('*', { count: 'exact' })

      // Apply filters
      if (options?.filters) {
        const { teamId, createdBy, isPublic, searchQuery, sortBy, sortOrder } = options.filters

        if (teamId !== undefined) {
          query = query.eq('team_id', teamId)
        }

        if (createdBy !== undefined) {
          query = query.eq('created_by', createdBy)
        }

        if (isPublic !== undefined) {
          query = query.eq('is_public', isPublic)
        }

        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        }

        // Apply sorting
        const sort = sortBy || 'usage_count'
        const order = sortOrder || 'desc'
        query = query.order(sort, { ascending: order === 'asc' })
      } else {
        // Default sorting by usage count
        query = query.order('usage_count', { ascending: false })
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching availability templates:', error)
        return { templates: [], totalCount: 0, hasMore: false }
      }

      const templates = (data || []).map(template => ({
        ...template,
        isPublic: template.is_public,
        createdBy: template.created_by,
        teamId: template.team_id,
        usageCount: template.usage_count,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }))

      const totalCount = count || 0
      const hasMore = options?.limit ? (options.offset || 0) + templates.length < totalCount : false

      return { templates, totalCount, hasMore }
    } catch (error) {
      console.error('Error in getAvailabilityTemplates:', error)
      return { templates: [], totalCount: 0, hasMore: false }
    }
  },

  async createTemplate(template: CreateTemplateRequest): Promise<AvailabilityTemplate | null> {
    if (!isSupabaseConfigured()) {
      return null
    }

    try {
      const { data, error } = await supabase
        .from('availability_templates')
        .insert([{
          name: template.name,
          description: template.description,
          pattern: template.pattern,
          is_public: template.isPublic || false,
          team_id: template.teamId,
          created_by: template.createdBy || 1 // Default to first user if not provided
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating template:', error)
        return null
      }

      return {
        ...data,
        isPublic: data.is_public,
        createdBy: data.created_by,
        teamId: data.team_id,
        usageCount: data.usage_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error in createTemplate:', error)
      return null
    }
  },

  async updateTemplate(update: UpdateTemplateRequest): Promise<AvailabilityTemplate | null> {
    if (!isSupabaseConfigured()) {
      return null
    }

    try {
      const updateData: any = {}
      
      if (update.name !== undefined) updateData.name = update.name
      if (update.description !== undefined) updateData.description = update.description
      if (update.pattern !== undefined) updateData.pattern = update.pattern
      if (update.isPublic !== undefined) updateData.is_public = update.isPublic

      const { data, error } = await supabase
        .from('availability_templates')
        .update(updateData)
        .eq('id', update.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating template:', error)
        return null
      }

      return {
        ...data,
        isPublic: data.is_public,
        createdBy: data.created_by,
        teamId: data.team_id,
        usageCount: data.usage_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error in updateTemplate:', error)
      return null
    }
  },

  async deleteTemplate(templateId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }

    try {
      const { error } = await supabase
        .from('availability_templates')
        .delete()
        .eq('id', templateId)

      if (error) {
        console.error('Error deleting template:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteTemplate:', error)
      return false
    }
  },

  async incrementTemplateUsage(templateId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      return
    }

    try {
      const { error } = await supabase
        .from('availability_templates')
        .update({ usage_count: supabase.sql`usage_count + 1` })
        .eq('id', templateId)

      if (error) {
        console.error('Error incrementing template usage:', error)
      }
    } catch (error) {
      console.error('Error in incrementTemplateUsage:', error)
    }
  },

  async getTemplateById(templateId: string): Promise<AvailabilityTemplate | null> {
    if (!isSupabaseConfigured()) {
      return null
    }

    try {
      const { data, error } = await supabase
        .from('availability_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) {
        console.error('Error fetching template by ID:', error)
        return null
      }

      return {
        ...data,
        isPublic: data.is_public,
        createdBy: data.created_by,
        teamId: data.team_id,
        usageCount: data.usage_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error in getTemplateById:', error)
      return null
    }
  },

  // ============================================================================
  // RECOGNITION SYSTEM METHODS
  // ============================================================================

  // Get user achievements
  async getUserAchievements(userId: number, options?: RecognitionQueryOptions): Promise<Achievement[]> {
    if (!isSupabaseConfigured()) {
      return []
    }

    try {
      let query = supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)

      // Apply filters
      if (options?.achievementTypes?.length) {
        query = query.in('achievement_type', options.achievementTypes)
      }

      if (options?.startDate) {
        query = query.gte('earned_at', options.startDate)
      }

      if (options?.endDate) {
        query = query.lte('earned_at', options.endDate)
      }

      // Apply sorting
      const sortBy = options?.sortBy || 'earned_at'
      const sortOrder = options?.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching user achievements:', error)
        return []
      }

      return (data || []).map(achievement => ({
        id: achievement.id,
        userId: achievement.user_id,
        achievementType: achievement.achievement_type,
        achievementData: achievement.achievement_data || {},
        earnedAt: achievement.earned_at,
        weekStart: achievement.week_start,
        sprintId: achievement.sprint_id,
        createdAt: achievement.created_at,
        updatedAt: achievement.updated_at
      }))
    } catch (error) {
      console.error('Error in getUserAchievements:', error)
      return []
    }
  },

  // Create new achievement
  async createAchievement(request: CreateAchievementRequest): Promise<Achievement | null> {
    if (!isSupabaseConfigured()) {
      return null
    }

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .insert([{
          user_id: request.userId,
          achievement_type: request.achievementType,
          achievement_data: request.achievementData,
          week_start: request.weekStart,
          sprint_id: request.sprintId
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating achievement:', error)
        return null
      }

      return {
        id: data.id,
        userId: data.user_id,
        achievementType: data.achievement_type,
        achievementData: data.achievement_data || {},
        earnedAt: data.earned_at,
        weekStart: data.week_start,
        sprintId: data.sprint_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error in createAchievement:', error)
      return null
    }
  },

  // Get user recognition metrics
  async getUserMetrics(userId: number, options?: RecognitionQueryOptions): Promise<RecognitionMetric[]> {
    if (!isSupabaseConfigured()) {
      return []
    }

    try {
      let query = supabase
        .from('recognition_metrics')
        .select('*')
        .eq('user_id', userId)

      // Apply date filters
      if (options?.startDate) {
        query = query.gte('period_start', options.startDate)
      }

      if (options?.endDate) {
        query = query.lte('period_end', options.endDate)
      }

      // Apply sorting
      query = query.order('period_start', { ascending: false })

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching user metrics:', error)
        return []
      }

      return (data || []).map(metric => ({
        id: metric.id,
        userId: metric.user_id,
        metricName: metric.metric_name,
        metricValue: metric.metric_value,
        periodStart: metric.period_start,
        periodEnd: metric.period_end,
        createdAt: metric.created_at,
        updatedAt: metric.updated_at
      }))
    } catch (error) {
      console.error('Error in getUserMetrics:', error)
      return []
    }
  },

  // Update or create recognition metric
  async updateMetric(request: UpdateMetricRequest): Promise<RecognitionMetric | null> {
    if (!isSupabaseConfigured()) {
      return null
    }

    try {
      const { data, error } = await supabase
        .from('recognition_metrics')
        .upsert({
          user_id: request.userId,
          metric_name: request.metricName,
          metric_value: request.metricValue,
          period_start: request.periodStart,
          period_end: request.periodEnd
        }, {
          onConflict: 'user_id,metric_name,period_start,period_end'
        })
        .select()
        .single()

      if (error) {
        console.error('Error updating metric:', error)
        return null
      }

      return {
        id: data.id,
        userId: data.user_id,
        metricName: data.metric_name,
        metricValue: data.metric_value,
        periodStart: data.period_start,
        periodEnd: data.period_end,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error in updateMetric:', error)
      return null
    }
  },

  // Get team recognition leaderboard
  async getRecognitionLeaderboard(timeframe: LeaderboardTimeframe = 'week', teamId?: number): Promise<LeaderboardEntry[]> {
    if (!isSupabaseConfigured()) {
      return []
    }

    try {
      const { data, error } = await supabase.rpc('get_team_recognition_leaderboard', {
        timeframe_param: timeframe
      })

      if (error) {
        console.error('Error fetching recognition leaderboard:', error)
        return []
      }

      let leaderboardData = data || []

      // Filter by team if specified
      if (teamId) {
        // We would need to join with team data, but for now let's use the existing data
        // This could be enhanced to filter by team in the database function
      }

      return leaderboardData.map((entry: any, index: number) => ({
        id: entry.id,
        name: entry.name,
        hebrew: entry.hebrew,
        teamName: entry.team_name,
        consistencyScore: entry.consistency_score || 0,
        totalAchievements: entry.total_achievements || 0,
        recentAchievements: entry.recent_achievements || [],
        streakCount: entry.streak_count || 0,
        rank: index + 1,
        previousRank: undefined // Would need historical data to calculate
      }))
    } catch (error) {
      console.error('Error in getRecognitionLeaderboard:', error)
      return []
    }
  },

  // Calculate recognition metrics for a user
  async calculateRecognitionMetrics(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return
    }

    try {
      const { error } = await supabase.rpc('calculate_user_recognition_metrics')

      if (error) {
        console.error('Error calculating recognition metrics:', error)
      }
    } catch (error) {
      console.error('Error in calculateRecognitionMetrics:', error)
    }
  },

  // Check for new achievements for a user
  async checkUserAchievements(userId: number): Promise<void> {
    if (!isSupabaseConfigured()) {
      return
    }

    try {
      const { error } = await supabase.rpc('check_user_achievements', {
        user_id_param: userId
      })

      if (error) {
        console.error('Error checking user achievements:', error)
      }
    } catch (error) {
      console.error('Error in checkUserAchievements:', error)
    }
  },

  // Get recognition analytics for a user
  async getUserRecognitionAnalytics(userId: number, periodDays: number = 30): Promise<any> {
    if (!isSupabaseConfigured()) {
      return null
    }

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)
      
      const [achievements, metrics] = await Promise.all([
        this.getUserAchievements(userId, {
          startDate: startDate.toISOString().split('T')[0],
          limit: 50
        }),
        this.getUserMetrics(userId, {
          startDate: startDate.toISOString().split('T')[0],
          limit: 50
        })
      ])

      // Calculate analytics
      const totalAchievements = achievements.length
      const weeklyMetrics = metrics.filter(m => m.metricName === 'weekly_completion_rate')
      const averageCompletionRate = weeklyMetrics.length > 0 
        ? weeklyMetrics.reduce((sum, m) => sum + m.metricValue, 0) / weeklyMetrics.length 
        : 0

      const streakMetrics = metrics.filter(m => m.metricName === 'consistency_streak')
      const bestStreak = streakMetrics.length > 0 
        ? Math.max(...streakMetrics.map(m => m.metricValue))
        : 0

      return {
        userId,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        summary: {
          totalAchievements,
          averageCompletionRate: Math.round(averageCompletionRate),
          bestStreak,
          improvementAreas: [] // Would require more complex analysis
        },
        trends: {
          consistency: weeklyMetrics.map(m => ({
            date: m.periodStart,
            metricName: m.metricName,
            value: m.metricValue
          })),
          engagement: [], // Would require additional metrics
          teamCollaboration: [] // Would require additional metrics
        }
      }
    } catch (error) {
      console.error('Error in getUserRecognitionAnalytics:', error)
      return null
    }
  },

  // Trigger achievement check after schedule update
  async triggerAchievementCheck(userId: number): Promise<void> {
    try {
      // First calculate current metrics
      await this.calculateRecognitionMetrics()
      
      // Then check for new achievements
      await this.checkUserAchievements(userId)
    } catch (error) {
      console.error('Error in triggerAchievementCheck:', error)
    }
  }
}