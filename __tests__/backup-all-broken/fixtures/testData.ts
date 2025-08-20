/**
 * Test Data Fixtures for Data Integrity Testing
 * 
 * Comprehensive test data representing real production scenarios
 * with known expected values for calculation verification
 */

import { Team, TeamMember, GlobalSprintSettings, ScheduleEntry } from '@/types';

// Test Teams with verified member counts and sprint configurations
export const TEST_TEAMS: Team[] = [
  {
    id: 1,
    name: 'Product Team',
    description: 'Product development team',
    color: '#3b82f6',
    sprint_length_weeks: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Development Team - Tal',
    description: 'Development team led by Tal',
    color: '#10b981',
    sprint_length_weeks: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Development Team - Itay',
    description: 'Development team led by Itay',
    color: '#f59e0b',
    sprint_length_weeks: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    name: 'Infrastructure Team',
    description: 'Infrastructure and DevOps team',
    color: '#8b5cf6',
    sprint_length_weeks: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 5,
    name: 'Data Team',
    description: 'Data science and analytics team',
    color: '#ef4444',
    sprint_length_weeks: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 6,
    name: 'Management Team',
    description: 'Management and executive team',
    color: '#6b7280',
    sprint_length_weeks: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Test Team Members with verified team assignments
export const TEST_TEAM_MEMBERS: TeamMember[] = [
  // Product Team (8 members) - Expected sprint potential: 560 hours (8 × 10 days × 7 hours)
  { id: 1, name: 'Product Manager A', hebrew: 'מנהל מוצר א', isManager: true, team_id: 1 },
  { id: 2, name: 'Product Designer A', hebrew: 'מעצב מוצר א', isManager: false, team_id: 1 },
  { id: 3, name: 'Product Designer B', hebrew: 'מעצב מוצר ב', isManager: false, team_id: 1 },
  { id: 4, name: 'UX Researcher A', hebrew: 'חוקר חוויית משתמש א', isManager: false, team_id: 1 },
  { id: 5, name: 'Product Analyst A', hebrew: 'אנליסט מוצר א', isManager: false, team_id: 1 },
  { id: 6, name: 'Product Owner A', hebrew: 'בעל מוצר א', isManager: false, team_id: 1 },
  { id: 7, name: 'Product Owner B', hebrew: 'בעל מוצר ב', isManager: false, team_id: 1 },
  { id: 8, name: 'Product Specialist A', hebrew: 'מומחה מוצר א', isManager: false, team_id: 1 },

  // Development Team - Tal (4 members) - Expected sprint potential: 280 hours (4 × 10 days × 7 hours)
  { id: 9, name: 'Tal Developer Lead', hebrew: 'טל ראש מפתחים', isManager: true, team_id: 2 },
  { id: 10, name: 'Senior Developer A', hebrew: 'מפתח בכיר א', isManager: false, team_id: 2 },
  { id: 11, name: 'Senior Developer B', hebrew: 'מפתח בכיר ב', isManager: false, team_id: 2 },
  { id: 12, name: 'Junior Developer A', hebrew: 'מפתח זוטר א', isManager: false, team_id: 2 },

  // Development Team - Itay (5 members) - Expected sprint potential: 350 hours (5 × 10 days × 7 hours)
  { id: 13, name: 'Itay Developer Lead', hebrew: 'איתי ראש מפתחים', isManager: true, team_id: 3 },
  { id: 14, name: 'Senior Developer C', hebrew: 'מפתח בכיר ג', isManager: false, team_id: 3 },
  { id: 15, name: 'Senior Developer D', hebrew: 'מפתח בכיר ד', isManager: false, team_id: 3 },
  { id: 16, name: 'Mid Developer A', hebrew: 'מפתח בינוני א', isManager: false, team_id: 3 },
  { id: 17, name: 'Junior Developer B', hebrew: 'מפתח זוטר ב', isManager: false, team_id: 3 },

  // Infrastructure Team (3 members) - Expected sprint potential: 315 hours (3 × 15 days × 7 hours)
  { id: 18, name: 'DevOps Lead', hebrew: 'ראש דבאופס', isManager: true, team_id: 4 },
  { id: 19, name: 'Infrastructure Engineer A', hebrew: 'מהנדס תשתיות א', isManager: false, team_id: 4 },
  { id: 20, name: 'Infrastructure Engineer B', hebrew: 'מהנדס תשתיות ב', isManager: false, team_id: 4 },

  // Data Team (6 members) - Expected sprint potential: 420 hours (6 × 10 days × 7 hours)
  { id: 21, name: 'Data Team Lead', hebrew: 'ראש צוות נתונים', isManager: true, team_id: 5 },
  { id: 22, name: 'Data Scientist A', hebrew: 'מדען נתונים א', isManager: false, team_id: 5 },
  { id: 23, name: 'Data Scientist B', hebrew: 'מדען נתונים ב', isManager: false, team_id: 5 },
  { id: 24, name: 'Data Engineer A', hebrew: 'מהנדס נתונים א', isManager: false, team_id: 5 },
  { id: 25, name: 'Data Analyst A', hebrew: 'אנליסט נתונים א', isManager: false, team_id: 5 },
  { id: 26, name: 'Data Analyst B', hebrew: 'אנליסט נתונים ב', isManager: false, team_id: 5 },

  // Management Team (1 member) - Expected sprint potential: 70 hours (1 × 10 days × 7 hours)
  { id: 27, name: 'Nir Shilo', hebrew: 'ניר שילה', isManager: true, team_id: 6 }
];

// Test Sprint Settings for verification
export const TEST_SPRINT_SETTINGS: GlobalSprintSettings = {
  id: 1,
  sprint_length_weeks: 2,
  current_sprint_number: 45,
  sprint_start_date: '2024-01-07', // Sunday - start of Israeli work week
  notes: 'Test sprint for data integrity verification',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  updated_by: 'data-integrity-test'
};

// Expected Calculation Results for Verification
export const EXPECTED_CALCULATIONS = {
  // Working days calculations (Israeli calendar: Sunday-Thursday)
  workingDays: {
    oneWeek: 5, // Sunday-Thursday
    twoWeeks: 10, // 2 × 5 working days
    threeWeeks: 15, // 3 × 5 working days
    singleDay: 1, // One working day
    weekend: 0 // Friday-Saturday
  },
  
  // Sprint potential calculations (members × working days × 7 hours)
  sprintPotential: {
    productTeam: 560, // 8 × 10 × 7
    devTeamTal: 280, // 4 × 10 × 7
    devTeamItay: 350, // 5 × 10 × 7
    infrastructureTeam: 315, // 3 × 15 × 7 (3-week sprint)
    dataTeam: 420, // 6 × 10 × 7
    managementTeam: 70 // 1 × 10 × 7
  },
  
  // Hours per day calculations
  hoursPerDay: {
    fullDay: 7, // '1' value
    halfDay: 3.5, // '0.5' value
    sickDay: 0, // 'X' value
    noEntry: 7 // Default full day if no entry
  }
};

// Test Schedule Entries for different scenarios
export const TEST_SCHEDULE_SCENARIOS = {
  // Scenario 1: Perfect attendance (all full days)
  perfectAttendance: (memberId: number, startDate: string, days: number): ScheduleEntry[] => {
    const entries: ScheduleEntry[] = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      // Only add entries for working days (Sunday-Thursday)
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        entries.push({
          value: '1',
          reason: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    
    return entries;
  },
  
  // Scenario 2: Mixed availability (some half days, some sick days)
  mixedAvailability: (memberId: number): ScheduleEntry[] => [
    { value: '1', reason: undefined }, // Monday - full day
    { value: '0.5', reason: 'Doctor appointment' }, // Tuesday - half day
    { value: '1', reason: undefined }, // Wednesday - full day
    { value: 'X', reason: 'Sick leave' }, // Thursday - sick day
    { value: '0.5', reason: 'Personal matter' } // Friday - half day
  ],
  
  // Scenario 3: All absences (complete sprint absence)
  allAbsences: (memberId: number, days: number): ScheduleEntry[] => {
    return Array(days).fill(null).map(() => ({
      value: 'X' as const,
      reason: 'Extended sick leave',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  },
  
  // Scenario 4: Empty sprint (no entries)
  emptySprint: (): ScheduleEntry[] => []
};

// Test Date Ranges for verification
export const TEST_DATE_RANGES = {
  // Standard 2-week sprint (Sunday to Thursday)
  twoWeekSprint: {
    start: '2024-01-07', // Sunday
    end: '2024-01-18', // Thursday (end of 2nd week)
    expectedWorkingDays: 10,
    description: 'Standard 2-week sprint'
  },
  
  // 3-week sprint for Infrastructure team
  threeWeekSprint: {
    start: '2024-01-07', // Sunday
    end: '2024-01-25', // Thursday (end of 3rd week)
    expectedWorkingDays: 15,
    description: '3-week sprint for Infrastructure team'
  },
  
  // Single week
  singleWeek: {
    start: '2024-01-07', // Sunday
    end: '2024-01-11', // Thursday
    expectedWorkingDays: 5,
    description: 'Single work week'
  },
  
  // Weekend period (should have 0 working days)
  weekendPeriod: {
    start: '2024-01-12', // Friday
    end: '2024-01-13', // Saturday
    expectedWorkingDays: 0,
    description: 'Weekend period'
  },
  
  // Cross-month sprint
  crossMonthSprint: {
    start: '2024-01-28', // Sunday
    end: '2024-02-08', // Thursday
    expectedWorkingDays: 10,
    description: 'Cross-month 2-week sprint'
  }
};

// Database Validation Patterns
export const VALIDATION_PATTERNS = {
  // Patterns that should NOT exist in production data
  mockDataPatterns: [
    /mock/i,
    /sample/i,
    /dummy/i,
    /test data/i,
    /lorem ipsum/i,
    /placeholder/i,
    /fake/i,
    /example/i
  ],
  
  // Required field patterns
  requiredFields: {
    teamName: /^.{1,255}$/,
    memberName: /^.{1,255}$/,
    hebrewName: /^[\u0590-\u05FF\s\u0027\u0022\u002D\u002E]{1,255}$/,
    scheduleValue: /^(1|0\.5|X)$/,
    dateFormat: /^\d{4}-\d{2}-\d{2}$/
  },
  
  // Security validation patterns
  securityChecks: {
    xssAttempt: /<script|javascript:|on\w+=/i,
    sqlInjection: /('|(\\');|;\\s*(DROP|DELETE|INSERT|UPDATE|SELECT))/i,
    pathTraversal: /\.\./
  }
};

// Expected Team Configurations
export const PRODUCTION_TEAM_CONFIG = {
  expectedTeams: [
    { name: 'Product Team', expectedMemberCount: 8, sprintWeeks: 2 },
    { name: 'Development Team - Tal', expectedMemberCount: 4, sprintWeeks: 2 },
    { name: 'Development Team - Itay', expectedMemberCount: 5, sprintWeeks: 2 },
    { name: 'Infrastructure Team', expectedMemberCount: 3, sprintWeeks: 3 },
    { name: 'Data Team', expectedMemberCount: 6, sprintWeeks: 2 },
    { name: 'Management Team', expectedMemberCount: 1, sprintWeeks: 2 }
  ],
  
  totalExpectedMembers: 27,
  totalExpectedTeams: 6,
  
  // COO Configuration
  cooUser: {
    name: 'Nir Shilo',
    hebrew: 'ניר שילה',
    role: 'coo',
    teamId: null // COO should not be assigned to specific team
  }
};

// Performance Benchmarks
export const PERFORMANCE_BENCHMARKS = {
  maxQueryTime: 1000, // 1 second
  maxCalculationTime: 100, // 100ms
  maxPageLoadTime: 3000, // 3 seconds
  maxConcurrentUsers: 50
};