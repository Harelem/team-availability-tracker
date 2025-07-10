import { supabase } from './supabase'
import { TeamMember, Team, TeamStats, GlobalSprintSettings, CurrentGlobalSprint, TeamSprintStats, CompanyCapacityMetrics, TeamCapacityStatus, COODashboardData } from '@/types'

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
          underUtilizedTeams
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
      const teams = await this.getTeams()
      const allMembers = await this.getTeamMembers()
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
        teamComparison: [
          ...companyMetrics.currentWeek.overCapacityTeams,
          ...companyMetrics.currentWeek.underUtilizedTeams
        ],
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
  }
}