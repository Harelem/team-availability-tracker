import { supabase } from './supabase'
import { TeamMember, Team, TeamStats } from '@/types'

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
      console.warn('team_stats view not found, calculating stats manually:', error)
      // Fallback: calculate stats manually
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

  async initializeTeams(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return
    }
    
    // This will be handled by the migration script
    // Just check if teams exist
    const teams = await this.getTeams()
    if (teams.length === 0) {
      console.warn('No teams found. Please run the migration script.')
    }
  },

  async initializeTeamMembers(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return
    }
    
    // This will be handled by the migration script
    // Just check if team members exist
    const members = await this.getTeamMembers()
    if (members.length === 0) {
      console.warn('No team members found. Please run the migration script.')
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
  }
}