import { performPreDeploymentCheck, performPostDeploymentVerification } from './deploymentSafety';
import { performDataPersistenceCheck, verifyDatabaseState, backupCriticalData } from './dataPreservation';

/**
 * Complete pre-deployment safety checklist
 * CRITICAL: Run this before any deployment to prevent data loss
 */
export const runPreDeploymentChecklist = async (): Promise<{
  safe: boolean;
  issues: string[];
  recommendations: string[];
  backupResult: { success: boolean; message: string };
}> => {
  console.log('🛡️ Running complete pre-deployment safety checklist...');

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Step 1: Backup critical data
  console.log('💾 Step 1: Backing up critical data...');
  const backupResult = await backupCriticalData();
  if (!backupResult.success) {
    issues.push('Critical data backup failed');
  }

  // Step 2: Environment and database checks
  console.log('🔍 Step 2: Environment and database verification...');
  const preDeploymentCheck = await performPreDeploymentCheck();
  if (!preDeploymentCheck.safe) {
    issues.push(...preDeploymentCheck.issues);
  }
  recommendations.push(...preDeploymentCheck.recommendations);

  // Step 3: Data persistence verification
  console.log('📊 Step 3: Data persistence verification...');
  const dataChecks = await performDataPersistenceCheck();
  const criticalDataIssues = dataChecks.filter(check => check.status === 'FAIL');
  
  if (criticalDataIssues.length > 0) {
    issues.push('Critical data verification failures detected');
    criticalDataIssues.forEach(issue => {
      issues.push(`${issue.check}: ${issue.data}`);
    });
  }

  // Step 4: Database state verification
  console.log('🗄️ Step 4: Database state verification...');
  const dbState = await verifyDatabaseState();
  if (dbState.totalScheduleEntries > 0) {
    recommendations.push(`CRITICAL: Preserve ${dbState.totalScheduleEntries} existing schedule entries`);
    recommendations.push('Use safe, additive migration patterns ONLY');
    recommendations.push('Verify data persistence after deployment');
  }

  if (dbState.totalTeamMembers > 0) {
    recommendations.push(`Preserve ${dbState.totalTeamMembers} existing team members`);
  }

  const safe = issues.length === 0;

  // Final summary
  console.log('📋 Pre-deployment checklist summary:');
  console.log(`Status: ${safe ? '✅ SAFE TO DEPLOY' : '❌ DEPLOYMENT BLOCKED'}`);
  console.log(`Issues: ${issues.length}`);
  console.log(`Recommendations: ${recommendations.length}`);

  if (issues.length > 0) {
    console.error('🚨 Deployment Issues:');
    issues.forEach(issue => console.error(`  - ${issue}`));
  }

  if (recommendations.length > 0) {
    console.log('💡 Deployment Recommendations:');
    recommendations.forEach(rec => console.log(`  - ${rec}`));
  }

  return { safe, issues, recommendations, backupResult };
};

/**
 * Complete post-deployment verification checklist
 * CRITICAL: Run this after deployment to ensure data survived
 */
export const runPostDeploymentChecklist = async (): Promise<{
  success: boolean;
  dataPreserved: boolean;
  issues: string[];
  summary: string;
}> => {
  console.log('🔍 Running complete post-deployment verification checklist...');

  const issues: string[] = [];

  // Step 1: Basic deployment verification
  console.log('✅ Step 1: Deployment verification...');
  const deploymentCheck = await performPostDeploymentVerification();
  if (!deploymentCheck.success) {
    issues.push(...deploymentCheck.issues);
  }

  // Step 2: Data persistence verification
  console.log('💾 Step 2: Data persistence verification...');
  const dataChecks = await performDataPersistenceCheck();
  const dataIssues = dataChecks.filter(check => check.status === 'FAIL');
  
  if (dataIssues.length > 0) {
    issues.push('Post-deployment data verification failures');
    dataIssues.forEach(issue => {
      issues.push(`${issue.check}: ${issue.data}`);
    });
  }

  // Step 3: Database state verification
  console.log('🗄️ Step 3: Database state verification...');
  const dbState = await verifyDatabaseState();
  
  const dataPreserved = dbState.totalScheduleEntries > 0 || dbState.totalTeamMembers > 0;
  
  // Step 4: Generate summary
  let summary = '';
  if (dataPreserved) {
    summary = `✅ Data preserved: ${dbState.totalScheduleEntries} schedule entries, ${dbState.totalTeamMembers} members, ${dbState.totalTeams} teams`;
  } else if (issues.length === 0) {
    summary = '✅ Fresh deployment - no existing data to preserve';
  } else {
    summary = '❌ Deployment verification failed - data may have been lost';
  }

  const success = issues.length === 0;

  // Final summary
  console.log('📋 Post-deployment checklist summary:');
  console.log(`Status: ${success ? '✅ DEPLOYMENT SUCCESSFUL' : '❌ DEPLOYMENT ISSUES DETECTED'}`);
  console.log(`Data Preserved: ${dataPreserved ? '✅ YES' : '⚠️ NO'}`);
  console.log(`Issues: ${issues.length}`);
  console.log(summary);

  if (issues.length > 0) {
    console.error('🚨 Post-deployment Issues:');
    issues.forEach(issue => console.error(`  - ${issue}`));
  }

  return { success, dataPreserved, issues, summary };
};

/**
 * Emergency data recovery check
 * CRITICAL: Use this if data loss is suspected after deployment
 */
export const emergencyDataRecoveryCheck = async (): Promise<{
  dataLossDetected: boolean;
  recoveryOptions: string[];
  immediateActions: string[];
}> => {
  console.log('🚨 Running emergency data recovery check...');

  const recoveryOptions: string[] = [];
  const immediateActions: string[] = [];

  try {
    // Check for any remaining data
    const dbState = await verifyDatabaseState();
    
    const dataLossDetected = dbState.totalScheduleEntries === 0 && 
                            dbState.totalTeamMembers === 0 && 
                            dbState.totalTeams === 0;

    if (dataLossDetected) {
      console.error('🚨 CRITICAL: Complete data loss detected!');
      
      immediateActions.push('STOP all deployments immediately');
      immediateActions.push('Do not run any more migrations');
      immediateActions.push('Check database backups immediately');
      immediateActions.push('Contact database administrator');
      
      recoveryOptions.push('Restore from latest database backup');
      recoveryOptions.push('Check if data exists in a different environment');
      recoveryOptions.push('Review deployment logs for errors');
      recoveryOptions.push('Check if using correct database URL');
      
    } else if (dbState.totalScheduleEntries === 0 && dbState.totalTeamMembers > 0) {
      console.warn('⚠️ WARNING: Schedule data missing but team structure exists');
      
      recoveryOptions.push('Check if schedule_entries table was accidentally dropped');
      recoveryOptions.push('Restore schedule_entries from backup');
      recoveryOptions.push('Verify migration scripts did not truncate schedule data');
      
    } else {
      console.log('✅ No critical data loss detected');
    }

    return { dataLossDetected, recoveryOptions, immediateActions };

  } catch (error) {
    console.error('❌ Emergency check failed:', error);
    return {
      dataLossDetected: true,
      recoveryOptions: ['Database connection failed - check connectivity'],
      immediateActions: ['Verify database URL and credentials', 'Check network connectivity']
    };
  }
};

/**
 * Complete deployment safety workflow
 * CRITICAL: Use this for all deployments
 */
export const runCompleteDeploymentSafetyWorkflow = async (): Promise<{
  preDeploymentSafe: boolean;
  deploymentRecommendations: string[];
  postDeploymentSummary?: string;
}> => {
  console.log('🚀 Running complete deployment safety workflow...');

  // Pre-deployment checks
  const preCheck = await runPreDeploymentChecklist();
  
  if (!preCheck.safe) {
    console.error('🚨 Pre-deployment check failed - deployment blocked');
    return {
      preDeploymentSafe: false,
      deploymentRecommendations: [
        'Fix all pre-deployment issues before proceeding',
        ...preCheck.recommendations
      ]
    };
  }

  console.log('✅ Pre-deployment checks passed');
  console.log('🚀 Deployment is safe to proceed');

  return {
    preDeploymentSafe: true,
    deploymentRecommendations: [
      'Deployment approved - proceed with caution',
      'Monitor logs during deployment',
      'Run post-deployment verification immediately after',
      ...preCheck.recommendations
    ]
  };
};