// UPDATED TYPESCRIPT INTERFACES
// These interfaces match the enhanced database schema
// Replace the existing interfaces in src/lib/supabase.ts with these

export interface Database {
  public: {
    Tables: {
      // TEAMS TABLE - CRITICAL ADDITION
      teams: {
        Row: {
          id: number
          name: string
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      
      // ENHANCED TEAM_MEMBERS TABLE - WITH MISSING COLUMNS
      team_members: {
        Row: {
          id: number
          name: string
          hebrew: string
          is_manager: boolean
          email: string | null
          team_id: number | null        // ADDED - Critical for team relationships
          role: string | null           // ADDED - Required by daily status
          is_critical: boolean | null   // ADDED - Required by critical absences  
          inactive_date: string | null  // ADDED - Required by active member filtering
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          hebrew: string
          is_manager?: boolean
          email?: string | null
          team_id?: number | null       // ADDED
          role?: string | null          // ADDED  
          is_critical?: boolean | null  // ADDED
          inactive_date?: string | null // ADDED
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          hebrew?: string
          is_manager?: boolean
          email?: string | null
          team_id?: number | null       // ADDED
          role?: string | null          // ADDED
          is_critical?: boolean | null  // ADDED
          inactive_date?: string | null // ADDED
          created_at?: string
          updated_at?: string
        }
      }
      
      // SCHEDULE_ENTRIES TABLE - UNCHANGED BUT ENHANCED WITH VIEW
      schedule_entries: {
        Row: {
          id: number
          member_id: number
          date: string
          value: '1' | '0.5' | 'X'
          reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          member_id: number
          date: string
          value: '1' | '0.5' | 'X'
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          member_id?: number
          date?: string
          value?: '1' | '0.5' | 'X'
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    
    // ENHANCED VIEWS - NEW ADDITIONS
    Views: {
      // SCHEDULE ENTRIES WITH HOURS - Compatibility view
      schedule_entries_with_hours: {
        Row: {
          id: number
          team_member_id: number  // Alias for member_id
          member_id: number
          date: string
          value: '1' | '0.5' | 'X'
          hours: number           // Calculated from value
          reason: string | null
          created_at: string
          updated_at: string
        }
      }
      
      // TEAM STATS - Performance optimized view
      team_stats: {
        Row: {
          id: number
          name: string
          description: string | null
          color: string | null
          member_count: number
          manager_count: number
          created_at: string
          updated_at: string
        }
      }
    }
    
    // ENHANCED FUNCTIONS - NEW ADDITIONS
    Functions: {
      // VALUE TO HOURS CONVERSION
      value_to_hours: {
        Args: {
          value_str: string
        }
        Returns: number
      }
      
      // DAILY COMPANY STATUS DATA  
      get_daily_company_status_data: {
        Args: {
          target_date: string
        }
        Returns: {
          member_id: number
          member_name: string
          member_hebrew: string
          team_id: number
          member_role: string
          is_manager: boolean
          is_critical: boolean
          hours: number
          reason: string | null
        }[]
      }
      
      // DAILY STATUS SUMMARY
      get_daily_status_summary: {
        Args: {
          target_date?: string
        }
        Returns: {
          total_members: number
          available_members: number
          half_day_members: number
          unavailable_members: number
          reserve_duty_members: number
          critical_absences: number
        }[]
      }
      
      // DATA POPULATION UTILITY
      populate_default_member_data: {
        Args: {}
        Returns: string
      }
      
      // VALIDATION UTILITY
      validate_schema_deployment: {
        Args: {}
        Returns: {
          check_name: string
          status: string
          details: string
        }[]
      }
    }
  }
}

// HELPER TYPES FOR ENHANCED FUNCTIONALITY
export type TeamWithStats = Database['public']['Views']['team_stats']['Row'];
export type MemberWithTeam = Database['public']['Tables']['team_members']['Row'] & {
  teams?: Database['public']['Tables']['teams']['Row']
};
export type ScheduleWithHours = Database['public']['Views']['schedule_entries_with_hours']['Row'];
export type DailyStatusData = Database['public']['Functions']['get_daily_company_status_data']['Returns'][0];
export type DailySummary = Database['public']['Functions']['get_daily_status_summary']['Returns'][0];

// USAGE EXAMPLES FOR DEVELOPERS
/*
// Example 1: Query teams with stats
const { data: teams } = await supabase
  .from('team_stats')
  .select('*');

// Example 2: Query team members with enhanced fields  
const { data: members } = await supabase
  .from('team_members')  
  .select('id, name, hebrew, team_id, role, is_critical, inactive_date')
  .is('inactive_date', null);

// Example 3: Get daily company status using function
const { data: dailyStatus } = await supabase
  .rpc('get_daily_company_status_data', { 
    target_date: '2025-08-10' 
  });

// Example 4: Get daily summary using function
const { data: summary } = await supabase
  .rpc('get_daily_status_summary', {
    target_date: '2025-08-10'  
  });

// Example 5: Convert schedule values to hours using function
const { data: hours } = await supabase
  .rpc('value_to_hours', { 
    value_str: '0.5' 
  });

// Example 6: Query schedule entries with calculated hours
const { data: schedules } = await supabase
  .from('schedule_entries_with_hours')
  .select('member_id, date, value, hours, reason')
  .eq('date', '2025-08-10');

// Example 7: Critical absences with proper joins
const { data: criticalAbsences } = await supabase
  .from('schedule_entries')
  .select(`
    member_id,
    value,
    reason,
    team_members!inner (
      name,
      hebrew,  
      team_id,
      is_critical,
      teams (name)
    )
  `)
  .eq('date', '2025-08-10')
  .eq('value', 'X') 
  .eq('team_members.is_critical', true);
*/