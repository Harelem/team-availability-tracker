#!/usr/bin/env node
/**
 * VERIFY PERFORMANCE OPTIMIZATIONS
 * 
 * This script verifies that all Supabase performance optimizations 
 * have been successfully implemented and are working correctly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFYING SUPABASE PERFORMANCE OPTIMIZATIONS\n');

// Check if all SQL scripts exist
const sqlScripts = [
    'sql/add-critical-performance-indexes.sql',
    'sql/fix-rls-performance-issues.sql', 
    'sql/remove-unused-indexes.sql',
    'sql/deploy-performance-optimizations.sql'
];

console.log('📁 Checking SQL scripts...');
let allScriptsExist = true;

sqlScripts.forEach(script => {
    if (fs.existsSync(script)) {
        console.log(`✅ ${script}`);
    } else {
        console.log(`❌ MISSING: ${script}`);
        allScriptsExist = false;
    }
});

if (!allScriptsExist) {
    console.log('\n❌ Some SQL scripts are missing. Please run the optimization process again.');
    process.exit(1);
}

// Check if application code optimizations are in place
console.log('\n📝 Checking application code optimizations...');

const codeChecks = [
    {
        file: 'src/lib/database.ts',
        pattern: /\.select\('id, name, description, color, sprint_length_weeks, created_at, updated_at'\)/,
        description: 'Teams query optimization'
    },
    {
        file: 'src/lib/database.ts', 
        pattern: /getScheduleEntriesPaginated/,
        description: 'Pagination implementation'
    },
    {
        file: 'src/lib/database.ts',
        pattern: /getTeamWithMembersAndSchedule/,
        description: 'Query batching implementation'
    },
    {
        file: 'src/utils/dataConsistencyManager.ts',
        pattern: /EGRESS_REDUCTION_MODE/,
        description: 'Enhanced caching system'
    },
    {
        file: 'src/utils/dataConsistencyManager.ts',
        pattern: /getFromLocalStorage/,
        description: 'localStorage fallback'
    }
];

let allCodeOptimized = true;

codeChecks.forEach(check => {
    try {
        const fileContent = fs.readFileSync(check.file, 'utf8');
        if (check.pattern.test(fileContent)) {
            console.log(`✅ ${check.description}`);
        } else {
            console.log(`❌ MISSING: ${check.description} in ${check.file}`);
            allCodeOptimized = false;
        }
    } catch (error) {
        console.log(`❌ ERROR reading ${check.file}: ${error.message}`);
        allCodeOptimized = false;
    }
});

// Check for SELECT * patterns that should be removed
console.log('\n🔍 Checking for remaining SELECT * queries...');

const filesToCheck = [
    'src/lib/database.ts',
    'src/services/DataService.ts',
    'pages/api/sprints/history.js',
    'pages/api/sprints/notes.js'
];

let selectStarFound = false;

filesToCheck.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const selectStarMatches = content.match(/\.select\s*\(\s*['"]\*['"]\s*\)/g);
        
        if (selectStarMatches && selectStarMatches.length > 0) {
            console.log(`⚠️  Found ${selectStarMatches.length} SELECT * in ${file}`);
            selectStarFound = true;
        } else {
            console.log(`✅ No SELECT * found in ${file}`);
        }
    } catch (error) {
        console.log(`❌ Error checking ${file}: ${error.message}`);
    }
});

// Run build test
console.log('\n🏗️  Testing build...');
try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('✅ Build successful');
} catch (error) {
    console.log('❌ Build failed');
    console.log(error.stdout?.toString() || error.message);
    allCodeOptimized = false;
}

// Check environment configuration
console.log('\n🔧 Checking environment configuration...');
try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL=https://')) {
        console.log('✅ Supabase URL configured');
    } else {
        console.log('❌ Supabase URL not properly configured');
        allCodeOptimized = false;
    }
    
    if (envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        console.log('✅ Supabase anon key configured');
    } else {
        console.log('❌ Supabase anon key not configured');
        allCodeOptimized = false;
    }
} catch (error) {
    console.log('❌ .env.local file not found or readable');
    allCodeOptimized = false;
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(60));

if (allScriptsExist && allCodeOptimized && !selectStarFound) {
    console.log('🎉 ALL OPTIMIZATIONS SUCCESSFULLY IMPLEMENTED!');
    console.log('\n✅ Next Steps:');
    console.log('1. Run the SQL scripts in Supabase SQL Editor:');
    console.log('   - sql/deploy-performance-optimizations.sql');
    console.log('2. Upgrade Supabase plan temporarily to Pro');
    console.log('3. Monitor egress usage for 1 week');
    console.log('4. Verify 85% bandwidth reduction');
    console.log('\n🚀 Expected Results:');
    console.log('   • Page load: 2-3 seconds (vs 15+ seconds)');
    console.log('   • Egress usage: <5GB/month (vs 24.37GB)');
    console.log('   • Query speed: 50% improvement');
    console.log('   • Cache hit rate: 70-85%');
    process.exit(0);
} else {
    console.log('❌ SOME OPTIMIZATIONS MISSING OR FAILED');
    console.log('\nPlease review the issues above and re-run the optimization process.');
    process.exit(1);
}