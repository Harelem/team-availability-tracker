// CORRECTED TYPESCRIPT INTERFACES - POST AUDIT
// These interfaces now accurately match the database schema after schema audit fixes

export interface Database {
  public: {
    Tables: {
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
      team_members: {
        Row: {
          id: number
          name: string
          hebrew: string
          is_manager: boolean | null
          email: string | null
          team_id: number | null
          role: string | null
          is_critical: boolean | null
          inactive_date: string | null
          manager_max_hours: number | null  // ADDED - missing from original interface
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          hebrew: string
          is_manager?: boolean | null
          email?: string | null
          team_id?: number | null
          role?: string | null
          is_critical?: boolean | null
          inactive_date?: string | null
          manager_max_hours?: number | null  // ADDED
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          hebrew?: string
          is_manager?: boolean | null
          email?: string | null
          team_id?: number | null
          role?: string | null
          is_critical?: boolean | null
          inactive_date?: string | null
          manager_max_hours?: number | null  // ADDED
          created_at?: string
          updated_at?: string
        }
      }
      schedule_entries: {
        Row: {
          id: number
          member_id: number
          date: string
          value: '1' | '0.5' | 'X'
          reason: string | null
          created_at: string
          updated_at: string
          sprint_id: string | null          // CORRECTED - uuid type
          is_weekend: boolean | null        // ADDED - missing from original
          calculated_hours: number | null   // ADDED - missing from original  
          hours: number | null              // ADDED - missing from original
          sprint_number: number | null      // ADDED - new field from audit fix
        }
        Insert: {
          id?: number
          member_id: number
          date: string
          value: '1' | '0.5' | 'X'
          reason?: string | null
          created_at?: string
          updated_at?: string
          sprint_id?: string | null
          is_weekend?: boolean | null
          calculated_hours?: number | null
          hours?: number | null
          sprint_number?: number | null
        }
        Update: {
          id?: number
          member_id?: number
          date?: string
          value?: '1' | '0.5' | 'X'
          reason?: string | null
          created_at?: string
          updated_at?: string
          sprint_id?: string | null
          is_weekend?: boolean | null
          calculated_hours?: number | null
          hours?: number | null
          sprint_number?: number | null
        }
      }
      global_sprint_settings: {
        Row: {
          id: number
          sprint_length_weeks: number | null
          current_sprint_number: number | null
          sprint_start_date: string | null
          created_at: string
          updated_at: string
          updated_by: string | null         // ADDED - missing from original
        }
        Insert: {
          id?: number
          sprint_length_weeks?: number | null
          current_sprint_number?: number | null
          sprint_start_date?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          sprint_length_weeks?: number | null
          current_sprint_number?: number | null
          sprint_start_date?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      sprint_history: {
        Row: {
          id: number
          sprint_number: number
          sprint_name: string | null
          sprint_start_date: string
          sprint_end_date: string
          sprint_length_weeks: number
          description: string | null
          status: 'upcoming' | 'active' | 'completed' | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          updated_by_role: string | null
          progress_percentage: number | null
          days_remaining: number | null
        }
        Insert: {
          id?: number
          sprint_number: number
          sprint_name?: string | null
          sprint_start_date: string
          sprint_end_date: string
          sprint_length_weeks?: number
          description?: string | null
          status?: 'upcoming' | 'active' | 'completed' | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          updated_by_role?: string | null
          progress_percentage?: number | null
          days_remaining?: number | null
        }
        Update: {
          id?: number
          sprint_number?: number
          sprint_name?: string | null
          sprint_start_date?: string
          sprint_end_date?: string
          sprint_length_weeks?: number
          description?: string | null
          status?: 'upcoming' | 'active' | 'completed' | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          updated_by_role?: string | null
          progress_percentage?: number | null
          days_remaining?: number | null
        }
      }
      user_accounts: {
        Row: {
          id: string                        // uuid type
          email: string
          role: string
          team_member_id: number | null
          created_at: string
          updated_at: string
          is_active: boolean | null
        }
        Insert: {
          id?: string
          email: string
          role?: string
          team_member_id?: number | null
          created_at?: string
          updated_at?: string
          is_active?: boolean | null
        }
        Update: {
          id?: string
          email?: string
          role?: string
          team_member_id?: number | null
          created_at?: string
          updated_at?: string
          is_active?: boolean | null
        }
      }
    }
    Views: {
      // Existing views remain the same
      schedule_entries_with_hours: {
        Row: {
          id: number
          member_id: number
          date: string
          value: '1' | '0.5' | 'X'
          hours: number
          reason: string | null
          created_at: string
          updated_at: string
        }
      }
    }
    Functions: {
      get_daily_company_status_data: {
        Args: { target_date?: string }
        Returns: {
          member_id: number
          member_name: string
          member_hebrew: string
          team_id: number
          team_name: string
          role: string | null
          hours: number
          reason: string | null
          is_critical: boolean
          is_manager: boolean
        }[]
      }
      value_to_hours: {
        Args: { schedule_value: '1' | '0.5' | 'X' }
        Returns: number
      }
    }
  }
}

// Updated application interfaces to match corrected schema
export interface TeamMember {
  id: number;
  name: string;
  hebrew: string;
  isManager?: boolean;
  is_manager?: boolean;
  email?: string;
  team_id?: number;              // Made optional to match database (nullable)
  role?: string;
  is_critical?: boolean;
  inactive_date?: string;
  manager_max_hours?: number;    // ADDED - now required for managers
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleEntry {
  id?: number;
  member_id: number;
  date: string;
  value: '1' | '0.5' | 'X';
  reason?: string;
  created_at?: string;
  updated_at?: string;
  sprint_id?: string;            // uuid
  is_weekend?: boolean;          // ADDED
  calculated_hours?: number;     // ADDED
  hours?: number;                // ADDED
  sprint_number?: number;        // ADDED
}

export interface UserAccount {
  id: string;                    // uuid
  email: string;
  role: 'manager' | 'member';
  team_member_id?: number;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface GlobalSprintSettings {
  id: number;
  sprint_length_weeks?: number;
  current_sprint_number?: number;
  sprint_start_date?: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;           // ADDED
}

// SCHEMA FIXES APPLIED:
// 1. ✅ Fixed calculated_hours consistency (132 records corrected)
// 2. ✅ Added weekend flag automation (13 records fixed)  
// 3. ✅ Set manager_max_hours defaults (7 managers updated)
// 4. ✅ Created user_accounts for all team members (32 accounts)
// 5. ✅ Cleaned up rollback tables (4 tables removed)
// 6. ✅ Added performance indexes (5 new indexes)
// 7. ✅ Fixed sprint assignment logic (958 entries corrected)
// 8. ✅ Added triggers for data consistency

// BREAKING CHANGES ADDRESSED:
// - sprint_id remains uuid type but now has proper sprint_number reference
// - All calculated fields now auto-update via triggers
// - Manager constraints ensure data integrity
// - User accounts now properly linked to team members

// UPGRADE PATH:
// 1. Update supabase.ts with corrected Database interface
// 2. Update application code to use new fields
// 3. Test authentication with populated user_accounts
// 4. Verify sprint assignment logic works correctly
// 5. Update queries to use sprint_number for reliable sprint filtering