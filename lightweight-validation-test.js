#!/usr/bin/env node

/**
 * Lightweight Application Validation Test
 * 
 * Tests core functionality without requiring browser automation:
 * 1. Database connectivity and authentication
 * 2. Core service functionality
 * 3. Mobile navigation component structure
 * 4. Data integrity and calculations
 */

console.log('🔍 Starting Lightweight Application Validation...\n');

const validationResults = {
  timestamp: new Date().toISOString(),
  testResults: {
    databaseConnectivity: { passed: false, details: {} },
    teamDataLoading: { passed: false, details: {} },
    authenticationService: { passed: false, details: {} },
    mobileComponents: { passed: false, details: {} },
    calculationServices: { passed: false, details: {} },
    environmentConfiguration: { passed: false, details: {} }
  },
  overallScore: 0,
  deploymentReady: false,
  criticalIssues: [],
  recommendations: []
};

// Helper functions
function addCriticalIssue(issue) {
  validationResults.criticalIssues.push(issue);
  console.log(`🚨 CRITICAL: ${issue}`);
}

function addRecommendation(recommendation) {
  validationResults.recommendations.push(recommendation);
  console.log(`💡 RECOMMENDATION: ${recommendation}`);
}

async function validateDatabaseConnectivity() {
  console.log('📋 Phase 1: Database Connectivity Validation');
  console.log('='.repeat(50));
  
  try {
    // Test database service import and initialization
    const { DatabaseService } = await import('./src/lib/database.ts');
    console.log('✅ Database service imported successfully');
    
    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const hasEnvVars = !!supabaseUrl && !!supabaseKey;
    console.log(`✅ Environment variables: ${hasEnvVars ? 'Present' : 'Missing'}`);
    
    if (!hasEnvVars) {
      addCriticalIssue('Missing Supabase environment variables');
      validationResults.testResults.databaseConnectivity.details = { 
        envVarsPresent: false,
        error: 'Missing environment variables'
      };
      return false;
    }
    
    // Check for authentication issues in connection strings
    const hasWhitespace = supabaseUrl.includes('\n') || supabaseUrl.includes(' ') ||
                         supabaseKey.includes('\n') || supabaseKey.includes(' ');
    
    console.log(`✅ Connection string format: ${hasWhitespace ? 'Issues Found' : 'Clean'}`);
    
    if (hasWhitespace) {
      addCriticalIssue('Environment variables contain whitespace characters that may cause connection issues');
    }
    
    validationResults.testResults.databaseConnectivity.passed = hasEnvVars && !hasWhitespace;
    validationResults.testResults.databaseConnectivity.details = {
      envVarsPresent: hasEnvVars,
      connectionStringClean: !hasWhitespace,
      supabaseUrlLength: supabaseUrl?.length || 0,
      supabaseKeyLength: supabaseKey?.length || 0
    };
    
    return hasEnvVars && !hasWhitespace;
    
  } catch (error) {
    addCriticalIssue(`Database service validation failed: ${error.message}`);
    validationResults.testResults.databaseConnectivity.details = { error: error.message };
    return false;
  }
}

async function validateTeamDataLoading() {
  console.log('\n📋 Phase 2: Team Data Loading Validation');
  console.log('='.repeat(50));
  
  try {
    const { DatabaseService } = await import('./src/lib/database.ts');
    
    // Test team loading with timeout
    console.log('✅ Testing team data loading...');
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Team loading timeout after 5 seconds')), 5000);
    });
    
    const teamsPromise = DatabaseService.getTeams();
    
    try {
      const teams = await Promise.race([teamsPromise, timeoutPromise]);
      
      console.log(`✅ Teams loaded: ${teams.length} teams found`);
      
      if (teams.length > 0) {
        console.log(`✅ First team: ${teams[0].name} (ID: ${teams[0].id})`);
        
        // Test loading members for first team
        const membersPromise = DatabaseService.getTeamMembers(teams[0].id);
        const membersTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Member loading timeout after 3 seconds')), 3000);
        });
        
        try {
          const members = await Promise.race([membersPromise, membersTimeoutPromise]);
          console.log(`✅ Team members loaded: ${members.length} members found`);
          
          validationResults.testResults.teamDataLoading.passed = true;
          validationResults.testResults.teamDataLoading.details = {
            teamsCount: teams.length,
            firstTeamMembersCount: members.length,
            loadingSuccessful: true
          };
          
        } catch (memberError) {
          console.log(`❌ Team member loading failed: ${memberError.message}`);
          addCriticalIssue(`Team member loading failed: ${memberError.message}`);
          
          validationResults.testResults.teamDataLoading.passed = false;
          validationResults.testResults.teamDataLoading.details = {
            teamsCount: teams.length,
            memberLoadingError: memberError.message
          };
        }
      } else {
        addCriticalIssue('No teams found in database - application will not function');
        validationResults.testResults.teamDataLoading.details = {
          teamsCount: 0,
          error: 'No teams available'
        };
      }
      
    } catch (loadError) {
      addCriticalIssue(`Team loading failed: ${loadError.message}`);
      validationResults.testResults.teamDataLoading.details = { error: loadError.message };
    }
    
  } catch (error) {
    addCriticalIssue(`Team data validation failed: ${error.message}`);
    validationResults.testResults.teamDataLoading.details = { error: error.message };
  }
}

async function validateAuthenticationService() {
  console.log('\n📋 Phase 3: Authentication Service Validation');
  console.log('='.repeat(50));
  
  try {
    // Test Supabase client initialization
    const { supabase } = await import('./src/lib/supabase.ts');
    console.log('✅ Supabase client imported successfully');
    
    // Test basic connection
    const { error } = await supabase.from('teams').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.message.includes('401')) {
        addCriticalIssue(`Authentication error: ${error.message}`);
      } else {
        console.log(`⚠️ Database query error: ${error.message}`);
      }
      
      validationResults.testResults.authenticationService.passed = false;
      validationResults.testResults.authenticationService.details = { 
        error: error.message,
        errorCode: error.code 
      };
    } else {
      console.log('✅ Authentication service working correctly');
      validationResults.testResults.authenticationService.passed = true;
      validationResults.testResults.authenticationService.details = { 
        connectionSuccessful: true 
      };
    }
    
  } catch (error) {
    addCriticalIssue(`Authentication service validation failed: ${error.message}`);
    validationResults.testResults.authenticationService.details = { error: error.message };
  }
}

async function validateMobileComponents() {
  console.log('\n📋 Phase 4: Mobile Components Validation');  
  console.log('='.repeat(50));
  
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Check for key mobile components mentioned in debug knowledge base
    const mobileComponents = [
      'src/components/EmergencyMobileMenu.tsx',
      'src/components/MobileHeader.tsx',
      'src/components/MobileTableNavigation.tsx',
      'src/components/NavigationDrawer.tsx'
    ];
    
    let componentsFound = 0;
    const componentDetails = {};
    
    for (const component of mobileComponents) {
      try {
        const fullPath = path.join(process.cwd(), component);
        await fs.access(fullPath);
        componentsFound++;
        componentDetails[component] = 'Found';
        console.log(`✅ ${component.split('/').pop()}: Present`);
      } catch (error) {
        componentDetails[component] = 'Missing';
        console.log(`❌ ${component.split('/').pop()}: Missing`);
      }
    }
    
    // Check mobile styles
    try {
      const mobileCssPath = path.join(process.cwd(), 'src/styles/mobile-fixes.css');
      await fs.access(mobileCssPath);
      console.log('✅ Mobile styles: Present');
      componentDetails['mobile-styles'] = 'Found';
    } catch (error) {
      console.log('❌ Mobile styles: Missing');
      componentDetails['mobile-styles'] = 'Missing';
    }
    
    const mobileComponentsWorking = componentsFound >= 3; // At least 3 out of 4 components should exist
    
    validationResults.testResults.mobileComponents.passed = mobileComponentsWorking;
    validationResults.testResults.mobileComponents.details = {
      componentsFound,
      totalComponents: mobileComponents.length,
      componentDetails
    };
    
    if (!mobileComponentsWorking) {
      addCriticalIssue(`Missing critical mobile components: ${componentsFound}/${mobileComponents.length} found`);
    }
    
  } catch (error) {
    addCriticalIssue(`Mobile components validation failed: ${error.message}`);
    validationResults.testResults.mobileComponents.details = { error: error.message };
  }
}

async function validateCalculationServices() {
  console.log('\n📋 Phase 5: Calculation Services Validation');
  console.log('='.repeat(50));
  
  try {
    // Test simple executive analytics service
    const analyticsModule = await import('./src/lib/simpleExecutiveAnalytics.ts');
    console.log('✅ Executive analytics service imported successfully');
    
    // Test calculation service functionality
    const calculationService = analyticsModule.default || analyticsModule;
    
    if (calculationService && typeof calculationService.calculateDailyStatus === 'function') {
      console.log('✅ Daily status calculation: Available');
      
      // Test with sample data
      const testDate = new Date();
      try {
        const result = await calculationService.calculateDailyStatus(testDate);
        console.log('✅ Daily status calculation: Working');
        
        validationResults.testResults.calculationServices.passed = true;
        validationResults.testResults.calculationServices.details = {
          serviceAvailable: true,
          calculationWorking: true
        };
      } catch (calcError) {
        console.log(`⚠️ Daily status calculation error: ${calcError.message}`);
        validationResults.testResults.calculationServices.passed = false;
        validationResults.testResults.calculationServices.details = {
          serviceAvailable: true,
          calculationError: calcError.message
        };
      }
    } else {
      addCriticalIssue('Calculation service methods not available');
      validationResults.testResults.calculationServices.details = {
        serviceAvailable: false
      };
    }
    
  } catch (error) {
    addCriticalIssue(`Calculation services validation failed: ${error.message}`);
    validationResults.testResults.calculationServices.details = { error: error.message };
  }
}

async function validateEnvironmentConfiguration() {
  console.log('\n📋 Phase 6: Environment Configuration Validation');
  console.log('='.repeat(50));
  
  try {
    // Check critical environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    const envStatus = {};
    let envVarsPresent = 0;
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      const isPresent = !!value;
      const hasWhitespace = value ? (value.includes('\n') || value.includes(' ')) : false;
      
      envStatus[envVar] = {
        present: isPresent,
        hasWhitespace,
        length: value?.length || 0
      };
      
      if (isPresent) envVarsPresent++;
      
      console.log(`✅ ${envVar}: ${isPresent ? 'Present' : 'Missing'}${hasWhitespace ? ' (Has Whitespace)' : ''}`);
      
      if (hasWhitespace) {
        addCriticalIssue(`Environment variable ${envVar} contains whitespace that may cause connection issues`);
      }
    }
    
    const allEnvVarsPresent = envVarsPresent === requiredEnvVars.length;
    
    validationResults.testResults.environmentConfiguration.passed = allEnvVarsPresent;
    validationResults.testResults.environmentConfiguration.details = {
      requiredVars: requiredEnvVars.length,
      presentVars: envVarsPresent,
      envStatus
    };
    
    if (!allEnvVarsPresent) {
      addCriticalIssue(`Missing environment variables: ${envVarsPresent}/${requiredEnvVars.length} present`);
    }
    
  } catch (error) {
    addCriticalIssue(`Environment configuration validation failed: ${error.message}`);
    validationResults.testResults.environmentConfiguration.details = { error: error.message };
  }
}

async function runValidation() {
  try {
    // Run all validation phases
    await validateDatabaseConnectivity();
    await validateTeamDataLoading(); 
    await validateAuthenticationService();
    await validateMobileComponents();
    await validateCalculationServices();
    await validateEnvironmentConfiguration();
    
    // Calculate overall score
    const testResults = Object.values(validationResults.testResults);
    const passedTests = testResults.filter(test => test.passed).length;
    const totalTests = testResults.length;
    const overallScore = Math.round((passedTests / totalTests) * 100);
    
    validationResults.overallScore = overallScore;
    validationResults.deploymentReady = overallScore >= 80 && validationResults.criticalIssues.length === 0;
    
    // Summary Report
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Overall Score: ${overallScore}% (${passedTests}/${totalTests} tests passed)`);
    console.log(`Critical Issues: ${validationResults.criticalIssues.length}`);
    console.log(`Deployment Ready: ${validationResults.deploymentReady ? 'YES ✅' : 'NO ❌'}`);
    
    // Test-by-test breakdown
    Object.entries(validationResults.testResults).forEach(([testName, result]) => {
      const status = result.passed ? '✅' : '❌';
      const formattedName = testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} ${formattedName}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    });
    
    if (validationResults.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      validationResults.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (validationResults.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      validationResults.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    // Save results
    const fs = require('fs').promises;
    const resultsFile = 'lightweight-validation-results.json';
    await fs.writeFile(resultsFile, JSON.stringify(validationResults, null, 2));
    console.log(`\n💾 Detailed results saved to ${resultsFile}`);
    
    return validationResults;
    
  } catch (error) {
    console.error('❌ Critical validation error:', error);
    addCriticalIssue(`Validation framework error: ${error.message}`);
    return validationResults;
  }
}

// Run validation
if (require.main === module) {
  runValidation().then(results => {
    const exitCode = results.deploymentReady ? 0 : 1;
    console.log(`\n🏁 Validation completed with exit code: ${exitCode}`);
    console.log(`🎯 Production Readiness: ${results.deploymentReady ? 'APPROVED ✅' : 'REQUIRES FIXES ❌'}`);
    process.exit(exitCode);
  }).catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { runValidation };