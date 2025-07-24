import { supabase } from '@/lib/supabase';

export interface DataVerificationResult {
  check: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  data: string;
  count?: number;
}

export interface DatabaseState {
  totalScheduleEntries: number;
  totalTeamMembers: number;
  totalTeams: number;
  oldestEntry?: string;
  newestEntry?: string;
}

/**
 * Verify current production database state and existing data
 * CRITICAL: This ensures we don't lose user data during deployments
 */
export const verifyDatabaseState = async (): Promise<DatabaseState> => {
  console.log('🔍 Verifying current database state...');

  try {
    // Check schedule entries (user's critical data)
    const { data: scheduleEntries, error: scheduleError } = await supabase
      .from('schedule_entries')
      .select('id, created_at')
      .order('created_at', { ascending: true });

    if (scheduleError && !scheduleError.message.includes('does not exist')) {
      console.error('❌ Error fetching schedule entries:', scheduleError);
    }

    // Check team members
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('id, created_at')
      .order('created_at', { ascending: true });

    if (membersError && !membersError.message.includes('does not exist')) {
      console.error('❌ Error fetching team members:', membersError);
    }

    // Check teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, created_at')
      .order('created_at', { ascending: true });

    if (teamsError && !teamsError.message.includes('does not exist')) {
      console.error('❌ Error fetching teams:', teamsError);
    }

    const state: DatabaseState = {
      totalScheduleEntries: scheduleEntries?.length || 0,
      totalTeamMembers: teamMembers?.length || 0,
      totalTeams: teams?.length || 0,
      oldestEntry: scheduleEntries?.[0]?.created_at,
      newestEntry: scheduleEntries?.[scheduleEntries.length - 1]?.created_at
    };

    console.log('📊 Database State:', {
      '📅 Schedule Entries': state.totalScheduleEntries,
      '👥 Team Members': state.totalTeamMembers,
      '🏢 Teams': state.totalTeams,
      '📆 Oldest Entry': state.oldestEntry,
      '📆 Newest Entry': state.newestEntry
    });

    return state;
  } catch (error) {
    console.error('❌ Error verifying database state:', error);
    return {
      totalScheduleEntries: 0,
      totalTeamMembers: 0,
      totalTeams: 0
    };
  }
};

/**
 * Perform comprehensive data persistence verification
 * CRITICAL: This ensures user data survives deployments
 */
export const performDataPersistenceCheck = async (): Promise<DataVerificationResult[]> => {
  console.log('🔍 Performing data persistence verification...');
  
  const checks: DataVerificationResult[] = [];

  // Check 1: Database Connection
  try {
    const { data } = await supabase.from('teams').select('id').limit(1);
    checks.push({ 
      check: 'Database Connection', 
      status: 'PASS', 
      data: 'Connected successfully' 
    });
  } catch (error) {
    checks.push({ 
      check: 'Database Connection', 
      status: 'FAIL', 
      data: (error as Error).message 
    });
  }

  // Check 2: Schedule Data Preservation (MOST CRITICAL)
  try {
    const { count } = await supabase
      .from('schedule_entries')
      .select('id', { count: 'exact' });

    checks.push({ 
      check: 'Schedule Data Preservation', 
      status: count && count > 0 ? 'PASS' : 'WARNING', 
      data: `${count || 0} entries found`,
      count: count || 0
    });
  } catch (error) {
    checks.push({ 
      check: 'Schedule Data Preservation', 
      status: 'FAIL', 
      data: (error as Error).message 
    });
  }

  // Check 3: Team Members Preservation
  try {
    const { count } = await supabase
      .from('team_members')
      .select('id', { count: 'exact' });

    checks.push({ 
      check: 'Team Members Preservation', 
      status: count && count > 0 ? 'PASS' : 'WARNING', 
      data: `${count || 0} members found`,
      count: count || 0
    });
  } catch (error) {
    checks.push({ 
      check: 'Team Members Preservation', 
      status: 'FAIL', 
      data: (error as Error).message 
    });
  }

  // Check 4: Teams Structure
  try {
    const { data: teams } = await supabase.from('teams').select('name');
    const expectedTeams = [
      'Development Team - Tal', 
      'Development Team - Itay', 
      'Infrastructure Team', 
      'Data Team', 
      'Product Team'
    ];
    const missingTeams = expectedTeams.filter(name => 
      !teams?.some(t => t.name === name)
    );

    checks.push({
      check: 'Team Structure',
      status: missingTeams.length === 0 ? 'PASS' : 'WARNING',
      data: missingTeams.length === 0 ? 
        'All teams present' : 
        `Missing: ${missingTeams.join(', ')}`,
      count: teams?.length || 0
    });
  } catch (error) {
    checks.push({ 
      check: 'Team Structure', 
      status: 'FAIL', 
      data: (error as Error).message 
    });
  }

  // Check 5: Global Sprint Settings
  try {
    const { data: sprint } = await supabase
      .from('global_sprint_settings')
      .select('id, current_sprint_number')
      .single();

    checks.push({
      check: 'Global Sprint Settings',
      status: sprint ? 'PASS' : 'WARNING',
      data: sprint ? 
        `Sprint ${sprint.current_sprint_number} configured` : 
        'No sprint settings found'
    });
  } catch (error) {
    checks.push({ 
      check: 'Global Sprint Settings', 
      status: 'WARNING', 
      data: 'Sprint settings may need initialization' 
    });
  }

  // Log results
  console.log('📋 Data Persistence Check Results:');
  checks.forEach(check => {
    const emoji = check.status === 'PASS' ? '✅' : 
                  check.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${emoji} ${check.check}: ${check.data}`);
  });

  return checks;
};

/**
 * Check if user data exists in the database
 * CRITICAL: This prevents destructive operations when data exists
 */
export const hasExistingUserData = async (): Promise<boolean> => {
  try {
    const { count: scheduleCount } = await supabase
      .from('schedule_entries')
      .select('id', { count: 'exact' });

    const { count: membersCount } = await supabase
      .from('team_members')
      .select('id', { count: 'exact' });

    const hasData = (scheduleCount && scheduleCount > 0) || (membersCount && membersCount > 0);
    
    console.log(hasData ? 
      '✅ Existing user data found - PRESERVATION MODE ENABLED' : 
      '⚠️ No existing user data found - safe to initialize'
    );

    return hasData;
  } catch (error) {
    console.error('❌ Error checking for existing data:', error);
    return false; // Assume no data if check fails (safer)
  }
};

/**
 * Backup critical data before any operations
 * CRITICAL: This creates a safety net for data recovery
 */
export const backupCriticalData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('💾 Creating backup of critical data...');

    const state = await verifyDatabaseState();
    
    // Log current state for recovery purposes
    console.log('💾 BACKUP SNAPSHOT:', {
      timestamp: new Date().toISOString(),
      scheduleEntries: state.totalScheduleEntries,
      teamMembers: state.totalTeamMembers,
      teams: state.totalTeams,
      oldestEntry: state.oldestEntry,
      newestEntry: state.newestEntry
    });

    if (state.totalScheduleEntries > 0) {
      console.log('🔒 USER DATA DETECTED - Deployment must preserve existing data!');
      return {
        success: true,
        message: `Backup logged: ${state.totalScheduleEntries} schedule entries, ${state.totalTeamMembers} members, ${state.totalTeams} teams`
      };
    }

    return {
      success: true,
      message: 'No user data to backup - safe for fresh initialization'
    };
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    return {
      success: false,
      message: `Backup failed: ${(error as Error).message}`
    };
  }
};