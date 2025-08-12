import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here' && supabaseAnonKey !== 'your_supabase_anon_key_here'
  ? createClient(supabaseUrl, supabaseAnonKey, {
      // Performance optimizations for emergency fix
      realtime: {
        params: {
          eventsPerSecond: 10
        },
        // Enhanced WebSocket connection settings
        heartbeatIntervalMs: 30000, // 30 seconds
        reconnectAfterMs: function(tries: number) {
          // Exponential backoff with jitter
          const backoff = Math.min(1000 * Math.pow(2, tries), 30000);
          const jitter = Math.random() * 1000;
          return backoff + jitter;
        },
        // Connection timeout settings
        timeout: 10000, // 10 seconds connection timeout
        // Logger for debugging connection issues
        logger: process.env.NODE_ENV === 'development' ? console.log : undefined
      },
      // Increased timeout from 3 seconds to 20 seconds for COO dashboard compatibility
      global: {
        headers: {
          // Reduce referrer policy warnings
          'Referrer-Policy': 'same-origin',
          // Cache control for better performance
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        fetch: (url: RequestInfo | URL, init?: RequestInit) => {
          return fetch(url, {
            ...init,
            // Extended timeout to support COO dashboard complex queries
            signal: AbortSignal.timeout(20000), // 20 seconds for complex COO queries
            // Enhanced credentials handling to reduce cookie domain issues
            credentials: 'same-origin',
            mode: 'cors'
          });
        }
      },
      // Enable connection pooling
      db: {
        schema: 'public'
      },
      // Optimize auth settings to reduce cookie issues
      auth: {
        persistSession: true,
        detectSessionInUrl: false,
        autoRefreshToken: true,
        // Use secure storage settings
        storageKey: 'sb-auth-token'
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
      enhanced_sprint_configs: {
        Row: {
          id: string
          sprint_number: number
          start_date: string
          end_date: string
          length_weeks: number
          working_days_count: number
          is_active: boolean
          created_by: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sprint_number: number
          start_date: string
          end_date: string
          length_weeks: number
          is_active?: boolean
          created_by?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sprint_number?: number
          start_date?: string
          end_date?: string
          length_weeks?: number
          is_active?: boolean
          created_by?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
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
      current_enhanced_sprint: {
        Row: {
          id: string
          sprint_number: number
          start_date: string
          end_date: string
          length_weeks: number
          working_days_count: number
          is_active: boolean
          notes: string | null
          days_elapsed: number
          days_remaining: number
          total_days: number
          progress_percentage: number
          working_days_remaining: number
          is_current: boolean
          created_at: string
          updated_at: string
          created_by: string
        }
      }
      current_global_sprint: {
        Row: {
          id: number
          current_sprint_number: number
          sprint_length_weeks: number
          sprint_start_date: string
          sprint_end_date: string
          progress_percentage: number
          days_remaining: number
          working_days_remaining: number
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
          updated_by: string
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