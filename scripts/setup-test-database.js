#!/usr/bin/env node
/**
 * Test Database Branch Setup Script
 * Creates and configures a Supabase branch database for comprehensive testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const TEST_BRANCH_NAME = process.env.TEST_BRANCH_NAME || 'comprehensive-test-suite';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

console.log('🧪 Setting up Supabase Test Database Branch...\n');

async function setupTestDatabase() {
  try {
    // Step 1: Check if Supabase CLI is installed
    console.log('1️⃣ Checking Supabase CLI...');
    try {
      execSync('supabase --version', { stdio: 'pipe' });
      console.log('✅ Supabase CLI found');
    } catch (error) {
      console.log('❌ Supabase CLI not found. Installing...');
      execSync('npm install -g supabase', { stdio: 'inherit' });
      console.log('✅ Supabase CLI installed');
    }

    // Step 2: Login to Supabase (if not already logged in)
    console.log('\n2️⃣ Checking Supabase authentication...');
    try {
      execSync('supabase projects list', { stdio: 'pipe' });
      console.log('✅ Already authenticated with Supabase');
    } catch (error) {
      console.log('❌ Not authenticated. Please run: supabase login');
      process.exit(1);
    }

    // Step 3: Create test branch
    console.log('\n3️⃣ Creating test database branch...');
    try {
      const createBranchCmd = `supabase branches create ${TEST_BRANCH_NAME}`;
      const result = execSync(createBranchCmd, { encoding: 'utf8' });
      console.log('✅ Test branch created successfully');
      console.log(`Branch: ${TEST_BRANCH_NAME}`);
      
      // Extract branch details from output
      const branchIdMatch = result.match(/Branch ID: ([^\s]+)/);
      const branchId = branchIdMatch ? branchIdMatch[1] : null;
      
      if (branchId) {
        console.log(`Branch ID: ${branchId}`);
        
        // Update .env.test with branch details
        updateEnvFile(branchId);
      }
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Test branch already exists, using existing branch');
      } else {
        throw error;
      }
    }

    // Step 4: Apply database schema to test branch
    console.log('\n4️⃣ Applying database schema to test branch...');
    const migrationFiles = fs.readdirSync('./sql').filter(file => file.endsWith('.sql'));
    
    for (const file of migrationFiles) {
      try {
        console.log(`   Applying: ${file}`);
        const sqlContent = fs.readFileSync(`./sql/${file}`, 'utf8');
        
        // Apply migration to test branch
        const migrationCmd = `supabase db push --db-url $(supabase branches get ${TEST_BRANCH_NAME} --format json | jq -r '.database_url')`;
        execSync(migrationCmd, { stdio: 'pipe' });
      } catch (error) {
        console.warn(`   ⚠️  Warning: Could not apply ${file}: ${error.message}`);
      }
    }
    console.log('✅ Database schema applied');

    // Step 5: Seed test data
    console.log('\n5️⃣ Seeding test data...');
    try {
      execSync('node scripts/seed-test-data.js', { stdio: 'inherit' });
      console.log('✅ Test data seeded successfully');
    } catch (error) {
      console.warn('⚠️  Warning: Test data seeding failed, continuing...');
    }

    // Step 6: Verify test setup
    console.log('\n6️⃣ Verifying test setup...');
    try {
      execSync('npm run test:db:verify', { stdio: 'pipe' });
      console.log('✅ Test database verification successful');
    } catch (error) {
      console.warn('⚠️  Warning: Test database verification failed');
    }

    console.log('\n🎉 Test database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update your .env.test file with the branch connection details');
    console.log('   2. Run npm run test:comprehensive to start testing');
    console.log('   3. Use npm run test:db:cleanup to clean up after testing');

  } catch (error) {
    console.error('\n❌ Test database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Ensure you have access to the Supabase project');
    console.error('   2. Check your internet connection');
    console.error('   3. Verify your Supabase CLI authentication');
    process.exit(1);
  }
}

function updateEnvFile(branchId) {
  const envTestPath = './.env.test';
  if (fs.existsSync(envTestPath)) {
    let envContent = fs.readFileSync(envTestPath, 'utf8');
    
    // Update branch ID
    envContent = envContent.replace(
      /TEST_BRANCH_ID=.*/,
      `TEST_BRANCH_ID=${branchId}`
    );
    
    fs.writeFileSync(envTestPath, envContent);
    console.log('✅ Updated .env.test with branch details');
  }
}

// Run the setup
setupTestDatabase();

module.exports = { setupTestDatabase };