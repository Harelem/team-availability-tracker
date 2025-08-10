import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here' && supabaseAnonKey !== 'your_supabase_anon_key_here'
  ? createClient(supabaseUrl, supabaseAnonKey, {
      // Performance optimizations for emergency fix
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      // Reduce default timeout from 15 seconds to 3 seconds with progressive loading
      global: {
        fetch: (url: RequestInfo | URL, init?: RequestInit) => {
          return fetch(url, {
            ...init,
            // Set aggressive timeout to prevent long waits
            signal: AbortSignal.timeout(3000) // 3 seconds instead of default 15
          });
        }
      },
      // Enable connection pooling
      db: {
        schema: 'public'
      },
      // Optimize auth settings
      auth: {
        persistSession: true,
        detectSessionInUrl: false,
        autoRefreshToken: true
      }
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

// Database types - Updated for enhanced schema
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
          is_manager: boolean
          email: string | null
          team_id: number
          role: string | null
          is_critical: boolean | null
          inactive_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          hebrew: string
          is_manager?: boolean
          email?: string | null
          team_id: number
          role?: string | null
          is_critical?: boolean | null
          inactive_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          hebrew?: string
          is_manager?: boolean
          email?: string | null
          team_id?: number
          role?: string | null
          is_critical?: boolean | null
          inactive_date?: string | null
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
      coo_users: {
        Row: {
          id: number
          name: string
          hebrew: string
          title: string
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          hebrew: string
          title: string
          description: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          hebrew?: string
          title?: string
          description?: string
          created_at?: string
          updated_at?: string
        }
      }
      global_sprint_settings: {
        Row: {
          id: number
          sprint_length_weeks: number
          current_sprint_number: number
          sprint_start_date: string
          notes: string | null
          created_at: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          id?: number
          sprint_length_weeks: number
          current_sprint_number: number
          sprint_start_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          id?: number
          sprint_length_weeks?: number
          current_sprint_number?: number
          sprint_start_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string
        }
      }
    }
    Views: {
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