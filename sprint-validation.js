#!/usr/bin/env node

/**
 * Sprint Recognition Validation Test
 * Tests the current date (2025-08-20) should be Sprint 3
 */

console.log('🔍 Sprint Recognition Validation for 2025-08-20\n');

// Test configuration
const CURRENT_DATE = new Date('2025-08-20T10:00:00Z');
const EXPECTED_SPRINT = 3;

console.log(`📅 Current Date: ${CURRENT_DATE.toDateString()}`);
console.log(`🎯 Expected Sprint: ${EXPECTED_SPRINT}\n`);

// Sprint calculation logic (extracted from smartSprintDetection.ts)
const DEFAULT_CONFIG = {
  firstSprintStartDate: new Date('2025-08-10'), // Sprint 1 starts Aug 10
  sprintLengthWeeks: 2,
  workingDaysPerWeek: 5
};

function calculateSprintForDate(targetDate, config = DEFAULT_CONFIG) {
  const { firstSprintStartDate, sprintLengthWeeks, workingDaysPerWeek } = config;
  const workingDaysPerSprint = sprintLengthWeeks * workingDaysPerWeek; // 10 working days
  
  // Calculate which sprint the target date falls into
  let currentSprintNumber = 1;
  let sprintStart = new Date(firstSprintStartDate);
  let sprintEnd = calculateSprintEndFromStart(sprintStart, workingDaysPerSprint);
  
  // Find the correct sprint by iterating through sprint boundaries
  while (targetDate > sprintEnd && currentSprintNumber < 20) {
    currentSprintNumber++;
    sprintStart = getNextSprintStart(sprintEnd);
    sprintEnd = calculateSprintEndFromStart(sprintStart, workingDaysPerSprint);
  }
  
  // Calculate progress and status
  const today = new Date();
  let status;
  if (today < sprintStart) {
    status = 'upcoming';
  } else if (today > sprintEnd) {
    status = 'completed';
  } else {
    status = 'active';
  }
  
  const isCurrentForDate = targetDate >= sprintStart && targetDate <= sprintEnd;
  const workingDaysElapsed = getWorkingDaysBetween(sprintStart, targetDate);
  const progressPercentage = Math.min(100, (workingDaysElapsed / workingDaysPerSprint) * 100);
  
  return {
    sprintNumber: currentSprintNumber,
    sprintName: `Sprint ${currentSprintNumber}`,
    startDate: sprintStart,
    endDate: sprintEnd,
    status,
    isCurrentForDate,
    progressPercentage: Math.round(progressPercentage)
  };
}

function calculateSprintEndFromStart(sprintStart, workingDaysInSprint) {
  const current = new Date(sprintStart);
  let workingDaysAdded = 0;
  
  // Count the start date if it's a working day
  if (current.getDay() >= 0 && current.getDay() <= 4) {
    workingDaysAdded = 1;
  }
  
  // Add working days until we reach the target count
  while (workingDaysAdded < workingDaysInSprint) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      workingDaysAdded++;
    }
  }
  
  return current;
}

function getNextSprintStart(previousSprintEnd) {
  const nextStart = new Date(previousSprintEnd);
  nextStart.setDate(previousSprintEnd.getDate() + 1);
  
  // Skip to next working day
  while (nextStart.getDay() === 5 || nextStart.getDay() === 6) {
    nextStart.setDate(nextStart.getDate() + 1);
  }
  
  return nextStart;
}

function getWorkingDaysBetween(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// Run the validation
try {
  console.log('📋 SPRINT CALCULATION VALIDATION');
  console.log('=' .repeat(50));
  
  const detectedSprint = calculateSprintForDate(CURRENT_DATE);
  
  console.log(`✓ Detected Sprint: ${detectedSprint.sprintName}`);
  console.log(`✓ Sprint Start: ${detectedSprint.startDate.toDateString()}`);
  console.log(`✓ Sprint End: ${detectedSprint.endDate.toDateString()}`);
  console.log(`✓ Sprint Status: ${detectedSprint.status}`);
  console.log(`✓ Progress: ${detectedSprint.progressPercentage}%`);
  console.log(`✓ Date Contained: ${detectedSprint.isCurrentForDate}`);
  
  // Validation checks
  const sprintMatches = detectedSprint.sprintNumber === EXPECTED_SPRINT;
  const dateContained = detectedSprint.isCurrentForDate;
  const statusCorrect = detectedSprint.status === 'active';
  
  console.log('\n📊 VALIDATION RESULTS');
  console.log('=' .repeat(50));
  console.log(`Sprint Number Correct: ${sprintMatches ? '✅' : '❌'} (Expected: ${EXPECTED_SPRINT}, Got: ${detectedSprint.sprintNumber})`);
  console.log(`Date Contained in Sprint: ${dateContained ? '✅' : '❌'}`);
  console.log(`Status Correct: ${statusCorrect ? '✅' : '❌'} (Expected: active, Got: ${detectedSprint.status})`);
  
  const overallPassed = sprintMatches && dateContained && statusCorrect;
  console.log(`\nOverall Validation: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Test all sprints for verification
  console.log('\n📅 SPRINT SCHEDULE VERIFICATION');
  console.log('=' .repeat(50));
  
  for (let i = 1; i <= 5; i++) {
    const sprintMidDate = new Date(DEFAULT_CONFIG.firstSprintStartDate);
    sprintMidDate.setDate(sprintMidDate.getDate() + (i - 1) * 14 + 7); // Mid-sprint date
    
    const sprint = calculateSprintForDate(sprintMidDate);
    const marker = sprint.sprintNumber === EXPECTED_SPRINT && 
                   CURRENT_DATE >= sprint.startDate && 
                   CURRENT_DATE <= sprint.endDate ? ' ← CURRENT' : '';
    
    console.log(`Sprint ${sprint.sprintNumber}: ${sprint.startDate.toDateString()} - ${sprint.endDate.toDateString()} (${sprint.status})${marker}`);
  }
  
  // Save results
  const results = {
    testDate: CURRENT_DATE.toISOString(),
    expectedSprint: EXPECTED_SPRINT,
    detectedSprint: detectedSprint.sprintNumber,
    validation: {
      sprintMatches,
      dateContained,
      statusCorrect,
      overallPassed
    },
    sprintDetails: detectedSprint,
    timestamp: new Date().toISOString()
  };
  
  require('fs').writeFileSync('sprint-validation-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Results saved to sprint-validation-results.json');
  
  // Test database calculation alignment
  console.log('\n🗄️  DATABASE SPRINT COMPARISON');
  console.log('=' .repeat(50));
  
  // Expected Sprint 3 dates based on calculation
  const sprint3Start = new Date('2025-08-10');
  const sprint3End = calculateSprintEndFromStart(sprint3Start, 10);
  
  console.log(`Expected Sprint 3 Start: ${sprint3Start.toDateString()}`);
  console.log(`Expected Sprint 3 End: ${sprint3End.toDateString()}`);
  console.log(`Current Date (${CURRENT_DATE.toDateString()}) in Sprint 3: ${CURRENT_DATE >= sprint3Start && CURRENT_DATE <= sprint3End ? '✅' : '❌'}`);
  
  console.log(`\n🏁 Sprint Recognition Validation: ${overallPassed ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  
  process.exit(overallPassed ? 0 : 1);
  
} catch (error) {
  console.error('❌ Validation error:', error.message);
  process.exit(1);
}