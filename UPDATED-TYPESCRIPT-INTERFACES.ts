// UPDATED TYPESCRIPT INTERFACES
// These interfaces match the enhanced database schema after emergency deployment

// Enhanced Team interface (matches teams table)
export interface Team {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

// Enhanced TeamMember interface (matches enhanced team_members table)
export interface TeamMember {
  id: number;
  name: string;
  hebrew: string;
  isManager?: boolean;
  is_manager?: boolean; // Database column name
  email?: string;
  team_id: number; // REQUIRED - now matches database
  role?: string; // NEW - member role (e.g., 'Team Manager', 'Team Member')
  is_critical?: boolean; // NEW - critical member flag for absence tracking
  inactive_date?: string; // NEW - for member lifecycle management
  created_at?: string;
  updated_at?: string;
}

// Enhanced DailyMemberStatus (already correct - matches database function output)
export interface DailyMemberStatus {
  id: number;
  name: string;
  teamId: number;
  teamName: string;
  role?: string; // Matches enhanced schema
  hours: number; // 0, 0.5, or 1 (calculated by value_to_hours function)
  reason?: string;
  isCritical: boolean; // Matches enhanced schema
}

// New TeamStats interface (matches team_stats view)
export interface TeamStats {
  id: number;
  name: string;
  description?: string;
  color?: string;
  sprint_length_weeks?: number;
  member_count: number; // Calculated from enhanced team relationships
  manager_count: number; // Calculated from enhanced team relationships
  current_sprint_number?: number;
  current_sprint_start?: string;
  current_sprint_end?: string;
  current_sprint_progress?: number;
}

// Enhanced ScheduleEntry with hours calculation
export interface ScheduleEntry {
  value: '1' | '0.5' | 'X';
  hours?: number; // NEW - calculated by value_to_hours function
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

// Database function return types (new from enhanced schema)
export interface DailyStatusSummary {
  total_members: number;
  available_members: number;
  half_day_members: number;
  unavailable_members: number;
  reserve_duty_members: number;
  critical_absences: number;
}

export interface DailyCompanyStatusData {
  member_id: number;
  member_name: string;
  member_hebrew: string;
  team_id: number;
  member_role: string;
  is_manager: boolean;
  is_critical: boolean;
  hours: number;
  reason?: string;
}

// IMPLEMENTATION NOTES:
// 
// 1. TeamMember Interface Changes:
//    - team_id is now REQUIRED (not optional) - matches database constraint
//    - Added role field for member roles
//    - Added is_critical field for absence tracking
//    - Added inactive_date field for member lifecycle
//    - Both isManager and is_manager supported for compatibility
//
// 2. Database Functions Available:
//    - value_to_hours(value_str) - converts '1'/'0.5'/'X' to decimal hours
//    - get_daily_status_summary(target_date) - returns daily summary stats
//    - get_daily_company_status_data(target_date) - returns detailed member data
//
// 3. Views Available:
//    - team_stats - enhanced team statistics with member counts
//    - schedule_entries_with_hours - schedule entries with calculated hours
//
// 4. Migration Impact:
//    - All existing TypeScript code should work with these enhanced interfaces
//    - team_id is now properly populated for all team members
//    - role and is_critical fields provide enhanced functionality
//    - Database queries now have proper team relationships
//
// 5. Usage Examples:
//
//    // Teams now load properly
//    const teams = await supabase.from('teams').select('*');
//    
//    // Team members with enhanced data
//    const members = await supabase
//      .from('team_members')
//      .select('*, teams(name, color)')
//      .eq('team_id', teamId);
//    
//    // Daily status with enhanced functionality
//    const { data } = await supabase
//      .rpc('get_daily_company_status_data', { target_date: date });
//    
//    // Team statistics
//    const stats = await supabase.from('team_stats').select('*');

// IMPORTANT: Update src/types/index.ts with the enhanced TeamMember interface
// The existing interfaces are mostly correct, but TeamMember needs the new fields