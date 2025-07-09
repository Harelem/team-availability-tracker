import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here' && supabaseAnonKey !== 'your_supabase_anon_key_here'
  ? createClient(supabaseUrl, supabaseAnonKey)
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