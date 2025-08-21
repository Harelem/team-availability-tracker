/**
 * Debug script to verify capacity calculations
 */

// Simulated team of 8 members for 2-week sprint
const teamSize = 8;
const sprintWeeks = 2;
const workingDaysPerWeek = 5;
const hoursPerDay = 7;

console.log('=== CAPACITY CALCULATION DEBUG ===');
console.log('Team Size:', teamSize);
console.log('Sprint Duration:', sprintWeeks, 'weeks');
console.log('Working Days per Week:', workingDaysPerWeek);
console.log('Hours per Day:', hoursPerDay);

// Correct sprint calculation
const sprintCapacity = teamSize * sprintWeeks * workingDaysPerWeek * hoursPerDay;
console.log('\n✅ CORRECT Sprint Capacity:', sprintCapacity, 'hours');

// Wrong weekly calculation (what might be causing 280h)
const weeklyCapacity = teamSize * workingDaysPerWeek * hoursPerDay;
console.log('❌ WRONG Weekly Capacity:', weeklyCapacity, 'hours');

// Another possible wrong calculation
const wrongCalculation1 = teamSize * (sprintWeeks * workingDaysPerWeek) * (hoursPerDay / 2);
console.log('❌ WRONG Half-hours calc:', wrongCalculation1, 'hours');

// Check if 280 could come from 8 * 35
const memberWeeklyHours = workingDaysPerWeek * hoursPerDay; // 35 hours per member per week
const totalWeeklyFor8 = teamSize * memberWeeklyHours;
console.log('❌ 8 members * 35h/week =', totalWeeklyFor8, 'hours (weekly, not sprint)');

console.log('\n=== EXPECTED vs ACTUAL ===');
console.log('Expected for 2-week sprint:', sprintCapacity, 'hours');
console.log('If seeing 280h, that\'s weekly capacity:', totalWeeklyFor8, 'hours');
console.log('Missing factor:', sprintCapacity / totalWeeklyFor8, '(should multiply by 2 for 2-week sprint)');

console.log('\n=== INDIVIDUAL MEMBER BREAKDOWN ===');
console.log('Member weekly capacity:', memberWeeklyHours, 'hours');
console.log('Member sprint capacity:', memberWeeklyHours * sprintWeeks, 'hours');
console.log('Team sprint capacity:', memberWeeklyHours * sprintWeeks * teamSize, 'hours');