import { supabase } from './supabase'
import { TeamMember, Team, TeamStats, TeamSprint, TeamAnalytics } from '@/types'

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
  },

  // Sprint Management
  async getCurrentSprint(teamId: number): Promise<TeamSprint | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    const { data, error } = await supabase
      .from('current_sprints')
      .select('*')
      .eq('team_id', teamId)
      .single()
    
    if (error) {
      console.error('Error fetching current sprint:', error)
      // Try fallback query to team_sprints table directly
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('team_sprints')
        .select('*')
        .eq('team_id', teamId)
        .order('sprint_number', { ascending: false })
        .limit(1)
        .single()
      
      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        return null
      }
      
      return fallbackData
    }
    
    return data
  },

  async getTeamSprints(teamId: number): Promise<TeamSprint[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    const { data, error } = await supabase
      .from('team_sprints')
      .select('*')
      .eq('team_id', teamId)
      .order('sprint_number', { ascending: false })
    
    if (error) {
      console.error('Error fetching team sprints:', error)
      return []
    }
    
    return data
  },

  async createSprint(teamId: number, sprintNumber: number, startDate: string, endDate: string): Promise<TeamSprint | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    const { data, error } = await supabase
      .from('team_sprints')
      .insert({
        team_id: teamId,
        sprint_number: sprintNumber,
        start_date: startDate,
        end_date: endDate
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating sprint:', error)
      return null
    }
    
    return data
  },

  async updateTeamSprintLength(teamId: number, sprintLengthWeeks: number): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false
    }
    
    const { error } = await supabase
      .from('teams')
      .update({ sprint_length_weeks: sprintLengthWeeks })
      .eq('id', teamId)
    
    if (error) {
      console.error('Error updating sprint length:', error)
      return false
    }
    
    return true
  },

  async getSprintStats(teamId: number, sprintId?: number): Promise<{
    sprint_id: number;
    team_id: number;
    sprint_number: number;
    start_date: string;
    end_date: string;
    team_name: string;
    sprint_length_weeks: number;
    team_size: number;
    total_capacity_hours: number;
    actual_hours: number;
    capacity_utilization: number;
  } | null> {
    if (!isSupabaseConfigured()) {
      return null
    }
    
    let query = supabase
      .from('sprint_stats')
      .select('*')
      .eq('team_id', teamId)
    
    if (sprintId) {
      query = query.eq('sprint_id', sprintId)
    }
    
    const { data, error } = await query.single()
    
    if (error) {
      console.error('Error fetching sprint stats:', error)
      return null
    }
    
    return data
  },

  async calculateTeamAnalytics(teamId: number): Promise<TeamAnalytics> {
    if (!isSupabaseConfigured()) {
      return {
        currentWeekHours: 0,
        sprintHours: 0,
        averageHoursPerMember: 0,
        capacityUtilization: 0,
        teamCapacity: 0
      }
    }
    
    try {
      // Get current sprint
      const currentSprint = await this.getCurrentSprint(teamId)
      if (!currentSprint) {
        throw new Error('No current sprint found')
      }
      
      // Get team members
      const members = await this.getTeamMembers(teamId)
      const teamSize = members.length
      
      // Get current week dates
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 4) // Friday
      
      // Calculate current week hours
      const currentWeekSchedule = await this.getScheduleEntries(
        startOfWeek.toISOString().split('T')[0],
        endOfWeek.toISOString().split('T')[0],
        teamId
      )
      
      let currentWeekHours = 0
      Object.values(currentWeekSchedule).forEach(memberSchedule => {
        Object.values(memberSchedule).forEach(entry => {
          if (entry.value === '1') currentWeekHours += 7
          else if (entry.value === '0.5') currentWeekHours += 3.5
        })
      })
      
      // Calculate sprint hours
      const sprintSchedule = await this.getScheduleEntries(
        currentSprint.start_date,
        currentSprint.end_date,
        teamId
      )
      
      let sprintHours = 0
      Object.values(sprintSchedule).forEach(memberSchedule => {
        Object.values(memberSchedule).forEach(entry => {
          if (entry.value === '1') sprintHours += 7
          else if (entry.value === '0.5') sprintHours += 3.5
        })
      })
      
      // Calculate capacity
      const sprintDays = Math.ceil((new Date(currentSprint.end_date).getTime() - new Date(currentSprint.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
      const workingDays = Math.floor(sprintDays / 7) * 5 + Math.min(sprintDays % 7, 5)
      const teamCapacity = teamSize * workingDays * 7
      
      return {
        currentWeekHours,
        sprintHours,
        averageHoursPerMember: teamSize > 0 ? sprintHours / teamSize : 0,
        capacityUtilization: teamCapacity > 0 ? (sprintHours / teamCapacity) * 100 : 0,
        teamCapacity
      }
    } catch (error) {
      console.error('Error calculating team analytics:', error)
      return {
        currentWeekHours: 0,
        sprintHours: 0,
        averageHoursPerMember: 0,
        capacityUtilization: 0,
        teamCapacity: 0
      }
    }
  }
}