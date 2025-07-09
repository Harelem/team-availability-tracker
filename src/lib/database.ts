import { supabase } from './supabase'
import { TeamMember } from '@/types'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_url_here' && key !== 'your_supabase_anon_key_here'
}

export const DatabaseService = {
  // Team Members
  async getTeamMembers(): Promise<TeamMember[]> {
    if (!isSupabaseConfigured()) {
      return []
    }
    
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('name')
    
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
      created_at: member.created_at,
      updated_at: member.updated_at
    }))
  },

  async initializeTeamMembers(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return
    }
    const teamMembers = [
      { name: 'Natan Shemesh', hebrew: 'נתן שמש', is_manager: false },
      { name: 'Ido Keller', hebrew: 'עידו קלר', is_manager: false },
      { name: 'Amit Zriker', hebrew: 'עמית צריקר', is_manager: true },
      { name: 'Alon Mesika', hebrew: 'אלון מסיקה', is_manager: false },
      { name: 'Nadav Aharon', hebrew: 'נדב אהרון', is_manager: false },
      { name: 'Yarom Kloss', hebrew: 'ירום קלוס', is_manager: false },
      { name: 'Ziv Edelstein', hebrew: 'זיב אדלשטיין', is_manager: false },
      { name: 'Harel Mazan', hebrew: 'הראל מזן', is_manager: true },
    ]

    for (const member of teamMembers) {
      const { error } = await supabase
        .from('team_members')
        .upsert(member, { onConflict: 'name' })
      
      if (error) {
        console.error('Error inserting team member:', error)
      }
    }
  },

  // Schedule Entries
  async getScheduleEntries(startDate: string, endDate: string): Promise<Record<number, Record<string, { value: '1' | '0.5' | 'X'; reason?: string; created_at?: string; updated_at?: string }>>> {
    if (!isSupabaseConfigured()) {
      return {}
    }
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
    
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

  // Real-time subscription
  subscribeToScheduleChanges(
    startDate: string,
    endDate: string,
    onUpdate: (payload: unknown) => void
  ) {
    if (!isSupabaseConfigured()) {
      return { unsubscribe: () => {} }
    }
    return supabase
      .channel('schedule_changes')
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