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

// Database types
export interface Database {
  public: {
    Tables: {
      team_members: {
        Row: {
          id: number
          name: string
          hebrew: string
          is_manager: boolean
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          hebrew: string
          is_manager?: boolean
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          hebrew?: string
          is_manager?: boolean
          email?: string | null
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
    }
  }
}