import { supabase } from '@/lib/supabase';

export interface EnvironmentVerification {
  isProductionUrl: boolean;
  supabaseUrl: string;
  environment: string;
  isConfigValid: boolean;
  warnings: string[];
}

/**
 * Verify environment configuration to prevent data loss
 * CRITICAL: This ensures we're connected to the correct database
 */
export const verifyEnvironmentConfiguration = (): EnvironmentVerification => {
  console.log('🔍 Verifying environment configuration...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const environment = process.env.NODE_ENV || 'development';

  const warnings: string[] = [];

  // Check if environment variables are set
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
    warnings.push('Supabase URL not configured properly');
  }

  if (!supabaseKey || supabaseKey === 'your_supabase_anon_key_here') {
    warnings.push('Supabase anonymous key not configured properly');
  }

  // Check if URL looks like production Supabase
  const isProductionUrl = supabaseUrl.includes('.supabase.co') && 
                         !supabaseUrl.includes('localhost') &&
                         !supabaseUrl.includes('127.0.0.1');

  if (!isProductionUrl && environment === 'production') {
    warnings.push('Production environment but not using production Supabase URL');
  }

  if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    warnings.push('Using localhost database - ensure this is intentional');
  }

  const verification: EnvironmentVerification = {
    isProductionUrl,
    supabaseUrl: supabaseUrl.substring(0, 30) + '...',
    environment,
    isConfigValid: warnings.length === 0,
    warnings
  };

  // Log verification results
  console.log('🔧 Environment Verification:', {
    'Environment': environment,
    'Production URL': isProductionUrl ? '✅' : '❌',
    'Config Valid': verification.isConfigValid ? '✅' : '❌',
    'Warnings': warnings.length
  });

  if (warnings.length > 0) {
    console.warn('⚠️ Environment Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  return verification;
};

/**
 * Perform pre-deployment safety checks
 * CRITICAL: This prevents deployments that could lose data
 */
export const performPreDeploymentCheck = async (): Promise<{
  safe: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  console.log('🛡️ Performing pre-deployment safety check...');

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check environment configuration
  const envCheck = verifyEnvironmentConfiguration();
  if (!envCheck.isConfigValid) {
    issues.push('Environment configuration issues detected');
    recommendations.push('Fix environment configuration before deployment');
  }

  // Check for existing data
  try {
    const { count: scheduleCount } = await supabase
      .from('schedule_entries')
      .select('id', { count: 'exact' });

    if (scheduleCount && scheduleCount > 0) {
      console.log('🔒 CRITICAL: User schedule data exists!');
      recommendations.push(`Preserve ${scheduleCount} existing schedule entries`);
      recommendations.push('Use safe, additive migration patterns only');
      recommendations.push('Verify data persistence after deployment');
    }
  } catch {
    issues.push('Cannot verify existing schedule data');
    recommendations.push('Check database connectivity before deployment');
  }

  // Check for team members
  try {
    const { count: membersCount } = await supabase
      .from('team_members')
      .select('id', { count: 'exact' });

    if (membersCount && membersCount > 0) {
      recommendations.push(`Preserve ${membersCount} existing team members`);
    }
  } catch {
    issues.push('Cannot verify existing team member data');
  }

  const safe = issues.length === 0;

  console.log(safe ? 
    '✅ Pre-deployment check PASSED' : 
    '❌ Pre-deployment check FAILED'
  );

  if (issues.length > 0) {
    console.error('🚨 Deployment Issues:');
    issues.forEach(issue => console.error(`  - ${issue}`));
  }

  if (recommendations.length > 0) {
    console.log('💡 Deployment Recommendations:');
    recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  return { safe, issues, recommendations };
};

/**
 * Perform post-deployment verification
 * CRITICAL: This ensures data survived the deployment
 */
export const performPostDeploymentVerification = async (): Promise<{
  success: boolean;
  preservedData: boolean;
  issues: string[];
}> => {
  console.log('🔍 Performing post-deployment verification...');

  const issues: string[] = [];
  let preservedData = false;

  try {
    // Check if schedule data still exists
    const { count: scheduleCount } = await supabase
      .from('schedule_entries')
      .select('id', { count: 'exact' });

    if (scheduleCount && scheduleCount > 0) {
      preservedData = true;
      console.log(`✅ Schedule data preserved: ${scheduleCount} entries`);
    } else {
      console.log('⚠️ No schedule data found post-deployment');
    }

    // Check if team members still exist
    const { count: membersCount } = await supabase
      .from('team_members')
      .select('id', { count: 'exact' });

    if (membersCount && membersCount > 0) {
      console.log(`✅ Team members preserved: ${membersCount} members`);
    } else {
      issues.push('No team members found after deployment');
    }

    // Check if teams still exist
    const { count: teamsCount } = await supabase
      .from('teams')
      .select('id', { count: 'exact' });

    if (teamsCount && teamsCount > 0) {
      console.log(`✅ Teams preserved: ${teamsCount} teams`);
    } else {
      issues.push('No teams found after deployment');
    }

    // Check if app can connect to database
    const { data: testQuery } = await supabase
      .from('teams')
      .select('id')
      .limit(1);

    if (!testQuery) {
      issues.push('Database connectivity issues after deployment');
    } else {
      console.log('✅ Database connectivity verified');
    }

  } catch (error) {
    issues.push(`Post-deployment verification failed: ${(error as Error).message}`);
  }

  const success = issues.length === 0;

  console.log(success ? 
    '✅ Post-deployment verification PASSED' : 
    '❌ Post-deployment verification FAILED'
  );

  if (issues.length > 0) {
    console.error('🚨 Post-deployment Issues:');
    issues.forEach(issue => console.error(`  - ${issue}`));
  }

  return { success, preservedData, issues };
};

/**
 * Safe database initialization that preserves existing data
 * CRITICAL: This replaces destructive initialization patterns
 */
export const safeInitializeDatabase = async (): Promise<{
  success: boolean;
  message: string;
  preservedExisting: boolean;
}> => {
  console.log('🔧 Starting safe database initialization...');

  try {
    // First, check if data already exists
    const { count: existingScheduleCount } = await supabase
      .from('schedule_entries')
      .select('id', { count: 'exact' });

    const { count: existingMembersCount } = await supabase
      .from('team_members')
      .select('id', { count: 'exact' });

    const hasExistingData = (existingScheduleCount && existingScheduleCount > 0) || 
                           (existingMembersCount && existingMembersCount > 0);

    if (hasExistingData) {
      console.log('🔒 EXISTING DATA DETECTED - Preservation mode enabled');
      console.log(`📊 Found: ${existingScheduleCount || 0} schedule entries, ${existingMembersCount || 0} team members`);
      
      return {
        success: true,
        message: `Data preserved: ${existingScheduleCount || 0} schedule entries, ${existingMembersCount || 0} members`,
        preservedExisting: true
      };
    }

    console.log('🆕 No existing data found - safe to initialize base structure');
    
    // Only initialize if no data exists
    await initializeBaseDataSafely();

    return {
      success: true,
      message: 'Base data structure initialized safely',
      preservedExisting: false
    };

  } catch (error) {
    console.error('❌ Safe initialization failed:', error);
    return {
      success: false,
      message: `Initialization failed: ${(error as Error).message}`,
      preservedExisting: false
    };
  }
};

/**
 * Initialize base data structure only if missing
 * CRITICAL: This never overwrites existing data
 */
const initializeBaseDataSafely = async (): Promise<void> => {
  console.log('🔧 Initializing base data structure (preserving existing)...');

  try {
    // Only create teams if they don't exist
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('name');

    const existingTeamNames = existingTeams?.map(t => t.name) || [];

    const requiredTeams = [
      { name: 'Development Team - Tal', description: 'Development team led by Tal Azaria', color: '#3b82f6' },
      { name: 'Development Team - Itay', description: 'Development team led by Itay Mizrachi', color: '#8b5cf6' },
      { name: 'Infrastructure Team', description: 'Infrastructure and DevOps team', color: '#10b981' },
      { name: 'Data Team', description: 'Data science and analytics team', color: '#f59e0b' },
      { name: 'Product Team', description: 'Product management and strategy team', color: '#ef4444' }
    ];

    for (const team of requiredTeams) {
      if (!existingTeamNames.includes(team.name)) {
        const { error } = await supabase
          .from('teams')
          .insert([team]);

        if (error) {
          console.error(`❌ Error creating team ${team.name}:`, error);
        } else {
          console.log(`✅ Created team: ${team.name}`);
        }
      } else {
        console.log(`✅ Team already exists: ${team.name}`);
      }
    }

    // Initialize global sprint settings if missing
    const { data: existingSprint } = await supabase
      .from('global_sprint_settings')
      .select('id')
      .single();

    if (!existingSprint) {
      const { error } = await supabase
        .from('global_sprint_settings')
        .insert([{
          sprint_length_weeks: 1,
          current_sprint_number: 1,
          sprint_start_date: new Date().toISOString().split('T')[0],
          updated_by: 'system'
        }]);

      if (error) {
        console.error('❌ Error creating global sprint settings:', error);
      } else {
        console.log('✅ Created global sprint settings');
      }
    } else {
      console.log('✅ Global sprint settings already exist');
    }

    console.log('✅ Base data structure initialization completed safely');

  } catch (error) {
    console.error('❌ Error in safe base data initialization:', error);
    throw error;
  }
};