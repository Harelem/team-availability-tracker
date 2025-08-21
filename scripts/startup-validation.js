#!/usr/bin/env node

/**
 * Next.js Startup Validation Script
 * 
 * This script performs database health checks during application startup
 * and can be integrated into build pipelines, deployment processes, or
 * container health checks.
 */

const { performStartupValidation } = require('./healthCheck.js');
require('dotenv').config({ path: '.env.local' });

// Color utilities
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Performs pre-deployment validation
 */
async function preDeploymentValidation() {
  log('cyan', '🚀 Pre-Deployment Database Validation');
  log('cyan', '====================================\n');

  try {
    // Check environment
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      log('red', '❌ Missing required environment variables:');
      missingEnvVars.forEach(envVar => log('red', `   - ${envVar}`));
      log('yellow', '\n💡 Create .env.local file with required Supabase credentials');
      return false;
    }

    log('green', '✅ Environment variables configured');

    // Perform database validation
    const isHealthy = await performStartupValidation();

    if (isHealthy) {
      log('green', '\n🎉 Pre-deployment validation successful!');
      log('green', '✅ Application is ready for deployment');
      return true;
    } else {
      log('red', '\n💥 Pre-deployment validation failed!');
      log('yellow', '🛠️  Fix database issues before deploying to production');
      return false;
    }

  } catch (error) {
    log('red', `💥 Validation script error: ${error.message}`);
    return false;
  }
}

/**
 * Container health check for Docker deployments
 */
async function containerHealthCheck() {
  try {
    const { quickHealthCheck } = require('./healthCheck.js');
    const isHealthy = await quickHealthCheck();
    
    if (isHealthy) {
      console.log('Container health: OK');
      return true;
    } else {
      console.error('Container health: FAIL - Database connectivity issues');
      return false;
    }
  } catch (error) {
    console.error(`Container health: FAIL - ${error.message}`);
    return false;
  }
}

/**
 * CI/CD pipeline validation
 */
async function cicdValidation() {
  log('blue', '🔧 CI/CD Pipeline Validation');
  log('blue', '===========================\n');

  // Check if running in CI environment
  const isCI = process.env.CI === 'true' || 
               process.env.GITHUB_ACTIONS === 'true' ||
               process.env.GITLAB_CI === 'true' ||
               process.env.JENKINS_URL;

  if (isCI) {
    log('cyan', '🤖 Detected CI/CD environment');
    
    // In CI, we might have test database credentials
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      log('yellow', '⚠️  No database URL in CI - skipping database validation');
      log('green', '✅ CI build validation passed (database checks skipped)');
      return true;
    }
  }

  return await preDeploymentValidation();
}

/**
 * Main execution logic
 */
async function main() {
  const command = process.argv[2] || 'startup';

  switch (command) {
    case 'startup':
    case 'pre-deploy':
      return await preDeploymentValidation();
      
    case 'health':
    case 'healthcheck':
      return await containerHealthCheck();
      
    case 'ci':
    case 'cicd':
      return await cicdValidation();
      
    default:
      log('red', `Unknown command: ${command}`);
      log('yellow', 'Usage: node startup-validation.js [startup|health|ci]');
      log('yellow', '  startup    - Full startup validation (default)');
      log('yellow', '  health     - Quick health check for containers');
      log('yellow', '  ci         - CI/CD pipeline validation');
      return false;
  }
}

// Handle different execution contexts
if (require.main === module) {
  // Direct execution
  main()
    .then(success => {
      if (success) {
        log('green', '\n✅ Validation completed successfully');
        process.exit(0);
      } else {
        log('red', '\n❌ Validation failed');
        process.exit(1);
      }
    })
    .catch(error => {
      log('red', `\n💥 Validation script crashed: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
} else {
  // Module import
  module.exports = {
    preDeploymentValidation,
    containerHealthCheck,
    cicdValidation
  };
}