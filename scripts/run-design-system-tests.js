#!/usr/bin/env node

/**
 * Design System Test Runner
 * 
 * Comprehensive test runner for the design system with support for
 * different test categories, reporting, and CI integration.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Color console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`${colors.cyan}${colors.bright}${msg}${colors.reset}`),
};

// Test categories and their configurations
const testCategories = {
  unit: {
    name: 'Unit Tests',
    pattern: '__tests__/components/**/*.test.{ts,tsx}',
    description: 'Individual component functionality tests',
    timeout: 5000,
  },
  integration: {
    name: 'Integration Tests',
    pattern: '__tests__/integration/**/*.test.{ts,tsx}',
    description: 'Component interaction and workflow tests',
    timeout: 10000,
  },
  visual: {
    name: 'Visual Regression Tests',
    pattern: '__tests__/visual/**/*.test.{ts,tsx}',
    description: 'Visual consistency and regression tests',
    timeout: 8000,
  },
  performance: {
    name: 'Performance Tests',
    pattern: '__tests__/performance/**/*.test.{ts,tsx}',
    description: 'Component performance and efficiency tests',
    timeout: 30000,
  },
};

// Command line argument parsing
const args = process.argv.slice(2);
const options = {
  category: null,
  watch: false,
  coverage: false,
  updateSnapshots: false,
  verbose: false,
  ci: false,
  bail: false,
  parallel: false,
  silent: false,
};

// Parse arguments
args.forEach((arg, index) => {
  switch (arg) {
    case '--watch':
    case '-w':
      options.watch = true;
      break;
    case '--coverage':
    case '-c':
      options.coverage = true;
      break;
    case '--update-snapshots':
    case '-u':
      options.updateSnapshots = true;
      break;
    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    case '--ci':
      options.ci = true;
      break;
    case '--bail':
    case '-b':
      options.bail = true;
      break;
    case '--parallel':
    case '-p':
      options.parallel = true;
      break;
    case '--silent':
    case '-s':
      options.silent = true;
      break;
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
    default:
      if (testCategories[arg]) {
        options.category = arg;
      } else if (!arg.startsWith('-')) {
        log.warning(`Unknown test category: ${arg}`);
      }
  }
});

function showHelp() {
  log.header('Design System Test Runner');
  console.log('\nUsage: node scripts/run-design-system-tests.js [category] [options]');
  
  console.log('\nCategories:');
  Object.entries(testCategories).forEach(([key, config]) => {
    console.log(`  ${colors.cyan}${key.padEnd(12)}${colors.reset} ${config.description}`);
  });
  
  console.log('\nOptions:');
  console.log('  --watch, -w           Run tests in watch mode');
  console.log('  --coverage, -c        Generate coverage report');
  console.log('  --update-snapshots    Update visual snapshots');
  console.log('  --verbose, -v         Verbose output');
  console.log('  --ci                  CI mode (optimized for CI environments)');
  console.log('  --bail, -b            Stop on first test failure');
  console.log('  --parallel, -p        Run tests in parallel');
  console.log('  --silent, -s          Minimal output');
  console.log('  --help, -h            Show this help message');
  
  console.log('\nExamples:');
  console.log('  node scripts/run-design-system-tests.js unit --watch');
  console.log('  node scripts/run-design-system-tests.js integration --coverage');
  console.log('  node scripts/run-design-system-tests.js visual --update-snapshots');
  console.log('  node scripts/run-design-system-tests.js --ci --bail');
}

function buildJestCommand() {
  const jestConfig = path.join(__dirname, '..', '__tests__', 'config', 'jest.design-system.config.js');
  const command = ['npx', 'jest', '--config', jestConfig];
  
  // Add test pattern based on category
  if (options.category) {
    const category = testCategories[options.category];
    command.push('--testPathPattern', category.pattern);
    command.push('--testTimeout', category.timeout.toString());
  }
  
  // Add options
  if (options.watch) command.push('--watch');
  if (options.coverage) command.push('--coverage');
  if (options.updateSnapshots) command.push('--updateSnapshot');
  if (options.verbose) command.push('--verbose');
  if (options.bail) command.push('--bail');
  if (options.silent) command.push('--silent');
  
  // CI optimizations
  if (options.ci) {
    command.push('--ci', '--watchman=false', '--passWithNoTests');
    if (!options.parallel) {
      command.push('--runInBand'); // Single thread for CI
    }
  } else if (options.parallel) {
    command.push('--maxWorkers=50%');
  }
  
  return command;
}

async function runTests() {
  try {
    // Pre-flight checks
    await performPreflightChecks();
    
    // Display test configuration
    displayTestInfo();
    
    // Build and run Jest command
    const command = buildJestCommand();
    
    if (!options.silent) {
      log.info(`Running command: ${command.join(' ')}`);
      console.log('');
    }
    
    const startTime = Date.now();
    
    // Run Jest
    const jest = spawn(command[0], command.slice(1), {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    
    jest.on('close', (code) => {
      const duration = Date.now() - startTime;
      const durationStr = `${Math.round(duration / 1000 * 100) / 100}s`;
      
      console.log(''); // Add spacing
      
      if (code === 0) {
        log.success(`Tests completed successfully in ${durationStr}`);
        
        // Show additional information based on options
        if (options.coverage && !options.silent) {
          showCoverageInfo();
        }
        
        if (options.updateSnapshots && !options.silent) {
          log.info('Visual snapshots have been updated');
        }
        
      } else {
        log.error(`Tests failed with exit code ${code} after ${durationStr}`);
        
        if (!options.silent) {
          console.log('\nTroubleshooting tips:');
          console.log('• Run with --verbose for detailed output');
          console.log('• Check __tests__/artifacts/ for detailed logs');
          console.log('• Use --update-snapshots if visual tests are failing');
        }
      }
      
      process.exit(code);
    });
    
    jest.on('error', (error) => {
      log.error(`Failed to start tests: ${error.message}`);
      process.exit(1);
    });
    
  } catch (error) {
    log.error(`Error running tests: ${error.message}`);
    process.exit(1);
  }
}

async function performPreflightChecks() {
  // Check if Jest config exists
  const jestConfig = path.join(__dirname, '..', '__tests__', 'config', 'jest.design-system.config.js');
  if (!fs.existsSync(jestConfig)) {
    throw new Error(`Jest configuration not found: ${jestConfig}`);
  }
  
  // Check if test setup exists
  const testSetup = path.join(__dirname, '..', '__tests__', 'setup', 'designSystemTestSetup.ts');
  if (!fs.existsSync(testSetup)) {
    throw new Error(`Test setup file not found: ${testSetup}`);
  }
  
  // Ensure test directories exist
  const testDirs = ['__tests__/components', '__tests__/integration', '__tests__/visual', '__tests__/performance'];
  for (const dir of testDirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      log.warning(`Test directory not found: ${dir}`);
    }
  }
  
  // Check Node.js version
  const nodeVersion = parseInt(process.version.slice(1));
  if (nodeVersion < 16) {
    log.warning(`Node.js ${nodeVersion} detected. Node.js 16+ is recommended for optimal testing.`);
  }
}

function displayTestInfo() {
  if (options.silent) return;
  
  log.header('🧪 Design System Test Runner');
  
  if (options.category) {
    const category = testCategories[options.category];
    console.log(`Category: ${colors.cyan}${category.name}${colors.reset}`);
    console.log(`Description: ${category.description}`);
    console.log(`Timeout: ${category.timeout}ms`);
  } else {
    console.log('Category: All tests');
    console.log('Description: Complete design system test suite');
  }
  
  // Show active options
  const activeOptions = [];
  if (options.watch) activeOptions.push('watch');
  if (options.coverage) activeOptions.push('coverage');
  if (options.updateSnapshots) activeOptions.push('update-snapshots');
  if (options.verbose) activeOptions.push('verbose');
  if (options.ci) activeOptions.push('ci');
  if (options.bail) activeOptions.push('bail');
  if (options.parallel) activeOptions.push('parallel');
  
  if (activeOptions.length > 0) {
    console.log(`Options: ${activeOptions.join(', ')}`);
  }
  
  console.log(''); // Add spacing
}

function showCoverageInfo() {
  const coverageDir = path.join(__dirname, '..', 'coverage', 'design-system');
  
  console.log('\n📊 Coverage Reports:');
  console.log(`• HTML Report: ${path.join(coverageDir, 'lcov-report', 'index.html')}`);
  console.log(`• LCOV Report: ${path.join(coverageDir, 'lcov.info')}`);
  console.log(`• JSON Report: ${path.join(coverageDir, 'coverage-final.json')}`);
}

// Error handling
process.on('unhandledRejection', (error) => {
  log.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log.info('Test runner interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.info('Test runner terminated');
  process.exit(0);
});

// Run the tests
runTests();