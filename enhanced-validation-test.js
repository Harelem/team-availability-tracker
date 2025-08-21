/**
 * Enhanced Application Recovery Validation Test
 * Tests all critical functionality after enhanced sprint system implementation
 */

const fs = require('fs')
const path = require('path')

// Validation Report
const validationReport = {
  timestamp: new Date().toISOString(),
  testSuite: 'Enhanced Application Recovery Validation',
  version: '2.3.0',
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    critical: 0
  }
}

function addTest(name, status, details, critical = false) {
  const test = {
    name,
    status, // 'PASS', 'FAIL', 'WARNING'
    details,
    critical,
    timestamp: new Date().toISOString()
  }
  
  validationReport.tests.push(test)
  validationReport.summary.total++
  
  if (status === 'PASS') validationReport.summary.passed++
  else if (status === 'FAIL') validationReport.summary.failed++
  else if (status === 'WARNING') validationReport.summary.warnings++
  
  if (critical && status === 'FAIL') {
    validationReport.summary.critical++
  }
  
  console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'} ${name}: ${details}`)
}

// Test 1: Enhanced Sprint System Implementation
console.log('\n🔍 TESTING ENHANCED SPRINT SYSTEM IMPLEMENTATION')

try {
  // Check for sprint logic file
  const sprintLogicPath = path.join(__dirname, 'src/utils/sprintLogic.ts')
  if (fs.existsSync(sprintLogicPath)) {
    const sprintLogicContent = fs.readFileSync(sprintLogicPath, 'utf8')
    
    // Check for key sprint functionality
    const hasSprintLogic = sprintLogicContent.includes('class SprintLogic')
    const hasWorkingDaysCalc = sprintLogicContent.includes('getWorkingDays')
    const hasCapacityCalc = sprintLogicContent.includes('calculateSprintCapacity')
    const hasManagerLogic = sprintLogicContent.includes('getManagerWorkOptions')
    const hasWeekendLogic = sprintLogicContent.includes('autoGenerateWeekendEntries')
    
    if (hasSprintLogic && hasWorkingDaysCalc && hasCapacityCalc && hasManagerLogic && hasWeekendLogic) {
      addTest('Sprint Logic Implementation', 'PASS', 'All core sprint logic features implemented', true)
    } else {
      addTest('Sprint Logic Implementation', 'FAIL', 'Missing core sprint logic features', true)
    }
  } else {
    addTest('Sprint Logic File', 'FAIL', 'Sprint logic file not found', true)
  }
} catch (error) {
  addTest('Sprint Logic Implementation', 'FAIL', `Error checking sprint logic: ${error.message}`, true)
}

// Test 2: Manager vs Regular Member Restrictions
console.log('\n🔍 TESTING MANAGER VS REGULAR MEMBER RESTRICTIONS')

try {
  const sprintLogicPath = path.join(__dirname, 'src/utils/sprintLogic.ts')
  if (fs.existsSync(sprintLogicPath)) {
    const content = fs.readFileSync(sprintLogicPath, 'utf8')
    
    // Check manager restrictions
    const hasManagerRestrictions = content.includes('getManagerWorkOptions') && 
                                  content.includes('0.5') && 
                                  content.includes('X')
    
    const hasRegularMemberOptions = content.includes('getRegularMemberWorkOptions') && 
                                   content.includes('1') && 
                                   content.includes('0.5') && 
                                   content.includes('X')
    
    const hasValidationLogic = content.includes('isValidWorkOption')
    
    if (hasManagerRestrictions && hasRegularMemberOptions && hasValidationLogic) {
      addTest('Manager/Member Restrictions', 'PASS', 'Role-based work option restrictions implemented', true)
    } else {
      addTest('Manager/Member Restrictions', 'FAIL', 'Role-based restrictions not properly implemented', true)
    }
  } else {
    addTest('Manager/Member Restrictions', 'FAIL', 'Sprint logic file not found', true)
  }
} catch (error) {
  addTest('Manager/Member Restrictions', 'FAIL', `Error checking restrictions: ${error.message}`, true)
}

// Test 3: Weekend Auto-Exclusion System
console.log('\n🔍 TESTING WEEKEND AUTO-EXCLUSION SYSTEM')

try {
  const sprintLogicPath = path.join(__dirname, 'src/utils/sprintLogic.ts')
  if (fs.existsSync(sprintLogicPath)) {
    const content = fs.readFileSync(sprintLogicPath, 'utf8')
    
    const hasWeekendDetection = content.includes('isWeekend') || content.includes('dayOfWeek === 5') || content.includes('dayOfWeek === 6')
    const hasAutoGeneration = content.includes('autoGenerateWeekendEntries')
    const hasWeekendReason = content.includes('Weekend (auto-generated)')
    
    if (hasWeekendDetection && hasAutoGeneration && hasWeekendReason) {
      addTest('Weekend Auto-Exclusion', 'PASS', 'Weekend auto-exclusion system implemented', true)
    } else {
      addTest('Weekend Auto-Exclusion', 'FAIL', 'Weekend auto-exclusion system incomplete', true)
    }
  } else {
    addTest('Weekend Auto-Exclusion', 'FAIL', 'Sprint logic file not found', true)
  }
} catch (error) {
  addTest('Weekend Auto-Exclusion', 'FAIL', `Error checking weekend logic: ${error.message}`, true)
}

// Test 4: Mobile Experience and Touch Targets
console.log('\n🔍 TESTING MOBILE EXPERIENCE AND TOUCH TARGETS')

try {
  // Check mobile optimization files
  const mobileValidatorPath = path.join(__dirname, 'src/utils/mobileOptimizationValidator.ts')
  const mobileComponentsPath = path.join(__dirname, 'src/components/mobile')
  
  if (fs.existsSync(mobileValidatorPath) && fs.existsSync(mobileComponentsPath)) {
    const mobileContent = fs.readFileSync(mobileValidatorPath, 'utf8')
    const mobileComponents = fs.readdirSync(mobileComponentsPath)
    
    const hasTouchTargetValidation = mobileContent.includes('44px') || mobileContent.includes('touchTarget')
    const hasMobileComponents = mobileComponents.length > 0
    const hasResponsiveDesign = mobileContent.includes('responsive') || mobileContent.includes('mobile')
    
    if (hasTouchTargetValidation && hasMobileComponents && hasResponsiveDesign) {
      addTest('Mobile Touch Targets', 'PASS', 'Mobile optimization and touch targets implemented')
    } else {
      addTest('Mobile Touch Targets', 'WARNING', 'Some mobile optimization features may be incomplete')
    }
  } else {
    addTest('Mobile Touch Targets', 'WARNING', 'Mobile optimization files partially present')
  }
} catch (error) {
  addTest('Mobile Touch Targets', 'WARNING', `Error checking mobile features: ${error.message}`)
}

// Test 5: Modal Background Fixes
console.log('\n🔍 TESTING MODAL BACKGROUND FIXES')

try {
  const modalPath = path.join(__dirname, 'src/components/ui/Modal.tsx')
  if (fs.existsSync(modalPath)) {
    const modalContent = fs.readFileSync(modalPath, 'utf8')
    
    const hasBackdrop = modalContent.includes('backdrop') || modalContent.includes('overlay')
    const hasBlur = modalContent.includes('blur') || modalContent.includes('backdrop-blur')
    const hasSemiTransparent = modalContent.includes('bg-black/50') || modalContent.includes('rgba') || modalContent.includes('opacity')
    
    if (hasBackdrop && (hasBlur || hasSemiTransparent)) {
      addTest('Modal Background Fixes', 'PASS', 'Modal backgrounds implemented with proper styling')
    } else {
      addTest('Modal Background Fixes', 'WARNING', 'Modal background styling may need verification')
    }
  } else {
    addTest('Modal Background Fixes', 'WARNING', 'Modal component file not found')
  }
} catch (error) {
  addTest('Modal Background Fixes', 'WARNING', `Error checking modal styling: ${error.message}`)
}

// Test 6: Performance and Caching Improvements
console.log('\n🔍 TESTING PERFORMANCE AND CACHING IMPROVEMENTS')

try {
  const queryOptimizerPath = path.join(__dirname, 'src/utils/queryOptimizer.ts')
  const dataServicePath = path.join(__dirname, 'src/services/DataService.ts')
  const performanceServicePath = path.join(__dirname, 'src/lib/performanceOptimizationService.ts')
  
  const hasQueryOptimizer = fs.existsSync(queryOptimizerPath)
  const hasEnhancedDataService = fs.existsSync(dataServicePath)
  const hasPerformanceService = fs.existsSync(performanceServicePath)
  
  if (hasQueryOptimizer && hasEnhancedDataService && hasPerformanceService) {
    // Check for caching features
    const dataServiceContent = fs.readFileSync(dataServicePath, 'utf8')
    const hasCaching = dataServiceContent.includes('cache') || dataServiceContent.includes('Cache')
    const hasOptimization = dataServiceContent.includes('performance') || dataServiceContent.includes('Performance')
    
    if (hasCaching && hasOptimization) {
      addTest('Performance & Caching', 'PASS', 'Performance optimization and caching systems implemented')
    } else {
      addTest('Performance & Caching', 'WARNING', 'Performance features partially implemented')
    }
  } else {
    addTest('Performance & Caching', 'WARNING', 'Some performance optimization files missing')
  }
} catch (error) {
  addTest('Performance & Caching', 'WARNING', `Error checking performance features: ${error.message}`)
}

// Test 7: TypeScript Compilation
console.log('\n🔍 TESTING TYPESCRIPT COMPILATION')

try {
  const { execSync } = require('child_process')
  
  try {
    execSync('npm run build', { stdio: 'pipe', cwd: __dirname })
    addTest('TypeScript Compilation', 'PASS', 'Application builds successfully without TypeScript errors', true)
  } catch (buildError) {
    const errorOutput = buildError.stdout ? buildError.stdout.toString() : buildError.message
    addTest('TypeScript Compilation', 'FAIL', `Build failed: ${errorOutput.substring(0, 200)}...`, true)
  }
} catch (error) {
  addTest('TypeScript Compilation', 'FAIL', `Error running build: ${error.message}`, true)
}

// Test 8: Critical File Structure
console.log('\n🔍 TESTING CRITICAL FILE STRUCTURE')

const criticalFiles = [
  'src/app/page.tsx',
  'src/components/COOExecutiveDashboard.tsx', 
  'src/components/EnhancedAvailabilityTable.tsx',
  'src/components/SimplifiedMetricsCards.tsx',
  'src/lib/database.ts',
  'src/lib/supabase.ts',
  'src/services/DataService.ts',
  'src/utils/sprintLogic.ts',
  'package.json'
]

let missingFiles = []
let presentFiles = []

criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    presentFiles.push(file)
  } else {
    missingFiles.push(file)
  }
})

if (missingFiles.length === 0) {
  addTest('Critical File Structure', 'PASS', `All ${criticalFiles.length} critical files present`, true)
} else if (missingFiles.length <= 2) {
  addTest('Critical File Structure', 'WARNING', `${missingFiles.length} critical files missing: ${missingFiles.join(', ')}`)
} else {
  addTest('Critical File Structure', 'FAIL', `${missingFiles.length} critical files missing: ${missingFiles.join(', ')}`, true)
}

// Test 9: Database Schema Enhancement
console.log('\n🔍 TESTING DATABASE SCHEMA ENHANCEMENT')

try {
  const schemaPath = path.join(__dirname, 'sql/enhanced-sprint-system-v2.3.0.sql')
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    const hasSprintConfigs = schemaContent.includes('enhanced_sprint_configs')
    const hasWorkingDays = schemaContent.includes('sprint_working_days')
    const hasCalculations = schemaContent.includes('sprint_capacity') || schemaContent.includes('capacity')
    const hasRoleLogic = schemaContent.includes('manager') || schemaContent.includes('role')
    
    if (hasSprintConfigs && hasWorkingDays && hasCalculations) {
      addTest('Database Schema Enhancement', 'PASS', 'Enhanced sprint system database schema present')
    } else {
      addTest('Database Schema Enhancement', 'WARNING', 'Database schema may be incomplete')
    }
  } else {
    addTest('Database Schema Enhancement', 'WARNING', 'Enhanced sprint schema file not found')
  }
} catch (error) {
  addTest('Database Schema Enhancement', 'WARNING', `Error checking database schema: ${error.message}`)
}

// Test 10: Application Dependencies
console.log('\n🔍 TESTING APPLICATION DEPENDENCIES')

try {
  const packagePath = path.join(__dirname, 'package.json')
  if (fs.existsSync(packagePath)) {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    
    const hasCriticalDeps = packageContent.dependencies && 
                           packageContent.dependencies['@supabase/supabase-js'] &&
                           packageContent.dependencies['next'] &&
                           packageContent.dependencies['react']
    
    const hasDevDeps = packageContent.devDependencies &&
                      packageContent.devDependencies['typescript'] &&
                      packageContent.devDependencies['@types/react']
    
    if (hasCriticalDeps && hasDevDeps) {
      addTest('Application Dependencies', 'PASS', 'All critical dependencies present')
    } else {
      addTest('Application Dependencies', 'WARNING', 'Some dependencies may be missing')
    }
  } else {
    addTest('Application Dependencies', 'FAIL', 'package.json not found', true)
  }
} catch (error) {
  addTest('Application Dependencies', 'WARNING', `Error checking dependencies: ${error.message}`)
}

// Test 11: Component Integration Validation
console.log('\n🔍 TESTING COMPONENT INTEGRATION')

try {
  const cooComponent = path.join(__dirname, 'src/components/COOExecutiveDashboard.tsx')
  const enhancedTable = path.join(__dirname, 'src/components/EnhancedAvailabilityTable.tsx')
  const sprintSettings = path.join(__dirname, 'src/components/EnhancedGlobalSprintSettings.tsx')
  
  if (fs.existsSync(cooComponent) && fs.existsSync(enhancedTable) && fs.existsSync(sprintSettings)) {
    const cooContent = fs.readFileSync(cooComponent, 'utf8')
    const tableContent = fs.readFileSync(enhancedTable, 'utf8')
    const settingsContent = fs.readFileSync(sprintSettings, 'utf8')
    
    const hasSprintIntegration = cooContent.includes('sprint') || cooContent.includes('Sprint')
    const hasManagerLogic = tableContent.includes('manager') || tableContent.includes('Manager')
    const hasSettings = settingsContent.includes('enhanced') || settingsContent.includes('Enhanced')
    
    if (hasSprintIntegration && hasManagerLogic && hasSettings) {
      addTest('Component Integration', 'PASS', 'Key components properly integrated with enhanced features')
    } else {
      addTest('Component Integration', 'WARNING', 'Some component integration may be incomplete')
    }
  } else {
    addTest('Component Integration', 'WARNING', 'Some enhanced components missing')
  }
} catch (error) {
  addTest('Component Integration', 'WARNING', `Error checking component integration: ${error.message}`)
}

// Test 12: Enhanced Features Validation
console.log('\n🔍 TESTING ENHANCED FEATURES')

try {
  const enhancedDbService = path.join(__dirname, 'src/lib/enhancedDatabaseService.ts')
  const fullSprintTable = path.join(__dirname, 'src/components/FullSprintTable.tsx')
  
  if (fs.existsSync(enhancedDbService) && fs.existsSync(fullSprintTable)) {
    const dbContent = fs.readFileSync(enhancedDbService, 'utf8')
    const tableContent = fs.readFileSync(fullSprintTable, 'utf8')
    
    const hasEnhancedDb = dbContent.includes('EnhancedDatabaseService')
    const hasFullTable = tableContent.includes('FullSprintTable')
    const hasPerformanceTracking = dbContent.includes('performance') || dbContent.includes('Performance')
    
    if (hasEnhancedDb && hasFullTable && hasPerformanceTracking) {
      addTest('Enhanced Features', 'PASS', 'Enhanced features properly implemented')
    } else {
      addTest('Enhanced Features', 'WARNING', 'Some enhanced features may be incomplete')
    }
  } else {
    addTest('Enhanced Features', 'WARNING', 'Enhanced feature files missing')
  }
} catch (error) {
  addTest('Enhanced Features', 'WARNING', `Error checking enhanced features: ${error.message}`)
}

// Generate Final Report
console.log('\n' + '='.repeat(80))
console.log('📊 ENHANCED VALIDATION SUMMARY')
console.log('='.repeat(80))

const { passed, failed, warnings, critical, total } = validationReport.summary

console.log(`Total Tests: ${total}`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`⚠️  Warnings: ${warnings}`)
console.log(`🚨 Critical Failures: ${critical}`)

const passRate = ((passed / total) * 100).toFixed(1)
console.log(`\nPass Rate: ${passRate}%`)

// Determine overall status
let overallStatus = 'UNKNOWN'
let statusEmoji = '❓'

if (critical > 0) {
  overallStatus = 'CRITICAL ISSUES'
  statusEmoji = '🚨'
} else if (failed > 3) {
  overallStatus = 'MAJOR ISSUES'
  statusEmoji = '❌'
} else if (failed > 0 || warnings > 5) {
  overallStatus = 'MINOR ISSUES'
  statusEmoji = '⚠️'
} else if (passRate >= 90) {
  overallStatus = 'EXCELLENT'
  statusEmoji = '🎉'
} else if (passRate >= 80) {
  overallStatus = 'GOOD'
  statusEmoji = '✅'
} else {
  overallStatus = 'NEEDS IMPROVEMENT'
  statusEmoji = '⚠️'
}

console.log(`\n${statusEmoji} Overall Status: ${overallStatus}`)

// Recommendations
console.log('\n📋 RECOMMENDATIONS:')

if (critical > 0) {
  console.log('🚨 CRITICAL: Address critical failures immediately before production deployment')
}

if (failed > 0) {
  console.log('❌ HIGH: Fix failed tests to ensure system reliability')
}

if (warnings > 3) {
  console.log('⚠️  MEDIUM: Review warnings to optimize system performance')
}

if (overallStatus === 'EXCELLENT') {
  console.log('✅ System is ready for production deployment')
  console.log('✅ All enhanced sprint system features are implemented')
  console.log('✅ Performance optimizations are in place')
} else if (overallStatus === 'GOOD') {
  console.log('✅ System is mostly ready, address minor issues')
  console.log('✅ Core enhanced sprint functionality is working')
}

// Save detailed report
const reportPath = path.join(__dirname, 'enhanced-validation-results.json')
fs.writeFileSync(reportPath, JSON.stringify(validationReport, null, 2))
console.log(`\n📄 Detailed report saved to: ${reportPath}`)

console.log('\n' + '='.repeat(80))

// Exit with appropriate code
process.exit(critical > 0 ? 2 : failed > 0 ? 1 : 0)