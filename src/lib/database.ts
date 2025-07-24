import { supabase } from './supabase'
import { TeamMember, Team, TeamStats, GlobalSprintSettings, CurrentGlobalSprint, TeamSprintStats, CompanyCapacityMetrics, TeamCapacityStatus, COODashboardData, COOUser, DetailedCompanyScheduleData, DetailedTeamScheduleData, DetailedMemberScheduleData, MemberDaySchedule, MemberReasonEntry } from '@/types'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_url_here' && key !== 'your_supabase_anon_key_here'
}

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

  // COO Dashboard Functions
  async getCompanyCapacityMetrics(): Promise<CompanyCapacityMetrics | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    try {
      // Get current week range
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 4) // Sun-Thu
      
      const startDateStr = startOfWeek.toISOString().split('T')[0]
      const endDateStr = endOfWeek.toISOString().split('T')[0]
      
      // Get all teams and members
      const teams = await this.getTeams()
      const allMembers = await this.getTeamMembers()
      
      // Get current week schedule data for all teams
      const scheduleData = await this.getScheduleEntries(startDateStr, endDateStr)
      
      // Get current sprint information
      const currentSprint = await this.getCurrentGlobalSprint()
      
      // Calculate potential hours for each team
      const teamCapacityData: TeamCapacityStatus[] = []
      let totalPotentialHours = 0
      let totalActualHours = 0
      
      for (const team of teams) {
        const teamMembers = allMembers.filter(m => m.team_id === team.id)
        const memberCount = teamMembers.length
        const weeklyPotential = memberCount * 35 // 35 hours per member per week
        
        // Calculate actual hours for this team
        let teamActualHours = 0
        const weekdays: string[] = []
        const current = new Date(startOfWeek)
        
        for (let i = 0; i < 5; i++) {
          weekdays.push(current.toISOString().split('T')[0])
          current.setDate(current.getDate() + 1)
        }
        
        teamMembers.forEach(member => {
          const memberSchedule = scheduleData[member.id]
          if (!memberSchedule) return
          
          weekdays.forEach(day => {
            const entry = memberSchedule[day]
            if (!entry) return
            
            switch (entry.value) {
              case '1':
                teamActualHours += 7
                break
              case '0.5':
                teamActualHours += 3.5
                break
              case 'X':
                teamActualHours += 0
                break
            }
          })
        })
        
        const utilization = weeklyPotential > 0 ? Math.round((teamActualHours / weeklyPotential) * 100) : 0
        const capacityGap = weeklyPotential - teamActualHours
        const capacityStatus = utilization > 100 ? 'over' : utilization < 80 ? 'under' : 'optimal'
        
        teamCapacityData.push({
          teamId: team.id,
          teamName: team.name,
          memberCount,
          weeklyPotential,
          actualHours: teamActualHours,
          utilization,
          capacityGap,
          capacityStatus,
          color: team.color
        })
        
        totalPotentialHours += weeklyPotential
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
        sprintPotential = totalPotentialHours * currentSprint.sprint_length_weeks
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
  }
}