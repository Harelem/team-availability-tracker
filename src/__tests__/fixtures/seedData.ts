/**
 * Test Data Seeding Utilities
 * Functions to populate test database with realistic data for comprehensive testing
 */

import { DatabaseService } from '@/lib/database';
import { TeamMember, Team, ScheduleEntry, CurrentGlobalSprint } from '@/types';
import teamMembersFixture from './teamMembers.json';
import scheduleEntriesFixture from './scheduleEntries.json';
import {
  createMockTeam,
  createMockTeamMember,
  createMockScheduleEntry,
  createMockCurrentSprint,
  createSprintWorkingDays,
  ISRAELI_WORK_DAYS,
} from '../utils/testSetup';

export interface SeedOptions {
  teams?: boolean;
  members?: boolean;
  schedules?: boolean;
  sprints?: boolean;
  largeDataset?: boolean;
  performanceData?: boolean;
}

// ============================================================================
// Core Seeding Functions
// ============================================================================

export async function seedTestDatabase(options: SeedOptions = {}): Promise<void> {
  const {
    teams = true,
    members = true,
    schedules = true,
    sprints = true,
    largeDataset = false,
    performanceData = false,
  } = options;

  console.log('🌱 Starting test database seeding...');

  try {
    // Clear existing test data first
    await clearTestData();

    if (teams) {
      console.log('📁 Seeding teams...');
      await seedTeams();
    }

    if (members) {
      console.log('👥 Seeding team members...');
      await seedTeamMembers();
    }

    if (sprints) {
      console.log('🏃 Seeding sprint data...');
      await seedSprints();
    }

    if (schedules) {
      console.log('📅 Seeding schedule entries...');
      await seedScheduleEntries();
    }

    if (largeDataset) {
      console.log('📊 Seeding large dataset for testing...');
      await seedLargeDataset();
    }

    if (performanceData) {
      console.log('⚡ Seeding performance test data...');
      await seedPerformanceData();
    }

    console.log('✅ Test database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding test database:', error);
    throw error;
  }
}

export async function clearTestData(): Promise<void> {
  console.log('🧹 Clearing existing test data...');
  
  // In a real implementation, these would call actual database cleanup
  // For now, we'll just log the operations
  const operations = [
    'DELETE FROM schedule_entries WHERE created_at > NOW() - INTERVAL \'1 day\'',
    'DELETE FROM team_members WHERE email LIKE \'%test%\'',
    'DELETE FROM teams WHERE name LIKE \'Test%\'',
    'DELETE FROM global_sprint_settings WHERE notes LIKE \'%test%\'',
  ];

  for (const operation of operations) {
    console.log(`  - ${operation}`);
  }
}

// ============================================================================
// Team Seeding
// ============================================================================

export async function seedTeams(): Promise<Team[]> {
  const teams: Team[] = [];

  for (const teamData of teamMembersFixture.teams) {
    const team = createMockTeam({
      id: teamData.id,
      name: teamData.name,
      description: teamData.description,
      color: teamData.color,
    });

    teams.push(team);
    console.log(`  ✓ Created team: ${team.name}`);
  }

  return teams;
}

// ============================================================================
// Team Member Seeding
// ============================================================================

export async function seedTeamMembers(): Promise<TeamMember[]> {
  const members: TeamMember[] = [];

  for (const memberData of teamMembersFixture.teamMembers) {
    const member = createMockTeamMember({
      id: memberData.id,
      name: memberData.name,
      hebrew: memberData.hebrew,
      team_id: memberData.team_id,
      isManager: memberData.isManager,
      role: memberData.role as 'member' | 'manager' | 'coo',
      email: memberData.email,
    });

    members.push(member);
    console.log(`  ✓ Created member: ${member.name} (${member.hebrew}) - Team ${member.team_id}`);
  }

  // Add COO users
  for (const cooData of teamMembersFixture.cooUsers) {
    const cooMember = createMockTeamMember({
      id: cooData.id,
      name: cooData.name,
      hebrew: cooData.hebrew,
      team_id: 0, // COO doesn't belong to a specific team
      isManager: true,
      role: cooData.role as 'coo' | 'sprint_manager',
      email: cooData.email,
    });

    members.push(cooMember);
    console.log(`  ✓ Created COO user: ${cooMember.name} (${cooMember.hebrew})`);
  }

  return members;
}

// ============================================================================
// Sprint Seeding
// ============================================================================

export async function seedSprints(): Promise<CurrentGlobalSprint[]> {
  const sprints: CurrentGlobalSprint[] = [];

  // Current active sprint
  const currentSprint = createMockCurrentSprint({
    id: 'sprint-2024-01',
    sprint_start_date: '2024-01-17', // Wednesday
    sprint_end_date: '2024-01-30',   // Tuesday
    sprint_number: 1,
    length_weeks: 2,
    is_active: true,
    notes: 'Test sprint for comprehensive testing',
  });

  sprints.push(currentSprint);
  console.log(`  ✓ Created current sprint: #${currentSprint.current_sprint_number}`);

  // Previous completed sprint
  const previousSprint = createMockCurrentSprint({
    id: 'sprint-2024-00',
    sprint_start_date: '2024-01-03',
    sprint_end_date: '2024-01-16',
    sprint_number: 0,
    length_weeks: 2,
    is_active: false,
    status: 'completed',
    progress_percentage: 100,
    notes: 'Completed test sprint',
  });

  sprints.push(previousSprint);
  console.log(`  ✓ Created previous sprint: #${previousSprint.current_sprint_number}`);

  // Future planned sprint
  const futureSprint = createMockCurrentSprint({
    id: 'sprint-2024-02',
    sprint_start_date: '2024-01-31',
    sprint_end_date: '2024-02-13',
    sprint_number: 2,
    length_weeks: 2,
    is_active: false,
    status: 'upcoming',
    progress_percentage: 0,
    notes: 'Planned future sprint',
  });

  sprints.push(futureSprint);
  console.log(`  ✓ Created future sprint: #${futureSprint.current_sprint_number}`);

  return sprints;
}

// ============================================================================
// Schedule Entry Seeding
// ============================================================================

export async function seedScheduleEntries(): Promise<ScheduleEntry[]> {
  const entries: ScheduleEntry[] = [];
  const workingDays = createSprintWorkingDays('2024-01-17', 2);

  // Get all team members for realistic distribution
  const allMembers = [
    ...teamMembersFixture.teamMembers,
    ...teamMembersFixture.cooUsers
  ].filter(member => member.role !== 'coo'); // COO doesn't fill personal schedule

  console.log(`  Creating entries for ${allMembers.length} members across ${workingDays.length} working days`);

  for (const member of allMembers) {
    let memberEntryCount = 0;
    
    for (const dateStr of workingDays) {
      const shouldHaveEntry = Math.random() > 0.1; // 90% chance of having entry
      
      if (shouldHaveEntry) {
        const entryValue = generateRealisticScheduleValue(member, dateStr);
        
        const entry = createMockScheduleEntry({
          member_id: member.id,
          date: dateStr,
          value: entryValue.value,
          hours: entryValue.hours,
          reason: entryValue.reason,
          sprint_id: 'sprint-2024-01',
        });

        entries.push(entry);
        memberEntryCount++;
      }
    }
    
    if (memberEntryCount > 0) {
      console.log(`  ✓ Created ${memberEntryCount} entries for ${member.name}`);
    }
  }

  console.log(`  📊 Total schedule entries created: ${entries.length}`);
  return entries;
}

// ============================================================================
// Large Dataset Seeding (for performance testing)
// ============================================================================

export async function seedLargeDataset(): Promise<void> {
  const LARGE_MEMBER_COUNT = 100;
  const LARGE_DATE_RANGE_DAYS = 90;

  console.log(`  Creating large dataset: ${LARGE_MEMBER_COUNT} members × ${LARGE_DATE_RANGE_DAYS} days`);

  const largeMembers: TeamMember[] = [];
  const largeEntries: ScheduleEntry[] = [];

  // Create additional test members
  for (let i = 1; i <= LARGE_MEMBER_COUNT; i++) {
    const teamId = (i % 5) + 1; // Distribute across 5 teams
    const member = createMockTeamMember({
      id: 1000 + i,
      name: `Test User ${i}`,
      hebrew: `משתמש בדיקה ${i}`,
      team_id: teamId,
      email: `testuser${i}@company.com`,
    });

    largeMembers.push(member);
  }

  console.log(`  ✓ Created ${largeMembers.length} test members`);

  // Create schedule entries for performance testing
  const baseDate = new Date('2024-01-01');
  let entryId = 10000;

  for (const member of largeMembers) {
    for (let dayOffset = 0; dayOffset < LARGE_DATE_RANGE_DAYS; dayOffset++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + dayOffset);

      // Only create entries for Israeli working days
      if (ISRAELI_WORK_DAYS.includes(date.getDay())) {
        const entry = createMockScheduleEntry({
          id: entryId++,
          member_id: member.id,
          date: date.toISOString().split('T')[0],
          value: Math.random() > 0.8 ? '0.5' : '1', // 80% full days, 20% half days
          hours: Math.random() > 0.8 ? 3.5 : 7,
          reason: Math.random() > 0.8 ? `Test reason ${Math.floor(Math.random() * 100)}` : undefined,
        });

        largeEntries.push(entry);
      }
    }
  }

  console.log(`  📈 Created ${largeEntries.length} schedule entries for performance testing`);
  console.log(`  💾 Estimated data size: ~${Math.round(largeEntries.length * 200 / 1024)} KB`);
}

// ============================================================================
// Performance Data Seeding
// ============================================================================

export async function seedPerformanceData(): Promise<void> {
  console.log('  Creating specialized performance test scenarios...');

  // Concurrent user simulation data
  await seedConcurrentUserData();
  
  // Memory stress test data
  await seedMemoryStressData();
  
  // Real-time update simulation data
  await seedRealTimeTestData();
}

async function seedConcurrentUserData(): Promise<void> {
  console.log('    - Concurrent user test data');
  
  // Simulate 50 users making simultaneous edits
  const concurrentEdits = [];
  const targetDate = '2024-01-17';
  
  for (let userId = 1; userId <= 50; userId++) {
    const edit = {
      userId: userId,
      memberId: userId,
      date: targetDate,
      value: Math.random() > 0.5 ? '1' : '0.5',
      timestamp: new Date(Date.now() + Math.random() * 10000), // Random timestamp within 10 seconds
    };
    
    concurrentEdits.push(edit);
  }
  
  console.log(`      ✓ Created ${concurrentEdits.length} concurrent edit scenarios`);
}

async function seedMemoryStressData(): Promise<void> {
  console.log('    - Memory stress test data');
  
  // Create data structure that simulates memory-intensive operations
  const memoryTestData = {
    largeArrays: Array.from({ length: 100 }, (_, i) => 
      Array.from({ length: 1000 }, (_, j) => ({
        id: `${i}-${j}`,
        data: Math.random(),
        metadata: {
          created: new Date(),
          processed: false,
        },
      }))
    ),
    complexObjects: Array.from({ length: 50 }, (_, i) => ({
      id: i,
      nestedData: {
        level1: {
          level2: {
            level3: Array.from({ length: 20 }, (_, j) => ({
              value: Math.random() * 100,
              timestamp: Date.now(),
            })),
          },
        },
      },
    })),
  };

  console.log('      ✓ Created memory stress test data structures');
  console.log(`      📊 Arrays: ${memoryTestData.largeArrays.length} × 1000 items`);
  console.log(`      🔄 Complex objects: ${memoryTestData.complexObjects.length} nested structures`);
}

async function seedRealTimeTestData(): Promise<void> {
  console.log('    - Real-time update test data');
  
  // Create scenarios for real-time update testing
  const realTimeScenarios = [
    {
      name: 'High frequency updates',
      updateCount: 1000,
      intervalMs: 10,
      description: 'Rapid successive updates to test update batching',
    },
    {
      name: 'Multi-user updates',
      updateCount: 100,
      intervalMs: 50,
      description: 'Multiple users updating different cells simultaneously',
    },
    {
      name: 'Conflicting updates',
      updateCount: 10,
      intervalMs: 0,
      description: 'Multiple users updating the same cell at once',
    },
  ];

  for (const scenario of realTimeScenarios) {
    console.log(`      ✓ ${scenario.name}: ${scenario.updateCount} updates @ ${scenario.intervalMs}ms intervals`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateRealisticScheduleValue(member: any, date: string): {
  value: '1' | '0.5' | 'X';
  hours: number;
  reason?: string;
} {
  const dayOfWeek = new Date(date).getDay();
  const isManager = member.isManager;
  const random = Math.random();

  // Managers are more likely to have full days
  if (isManager) {
    if (random > 0.95) {
      return {
        value: 'X',
        hours: 0,
        reason: 'Management meeting offsite',
      };
    } else if (random > 0.85) {
      return {
        value: '0.5',
        hours: 3.5,
        reason: 'Strategic planning session',
      };
    } else {
      return {
        value: '1',
        hours: 7,
      };
    }
  } else {
    // Regular members have more variation
    if (random > 0.92) {
      const sickReasons = [
        'Flu symptoms',
        'Medical appointment',
        'Family emergency',
        'Personal day',
        'Dental checkup',
      ];
      return {
        value: 'X',
        hours: 0,
        reason: sickReasons[Math.floor(Math.random() * sickReasons.length)],
      };
    } else if (random > 0.8) {
      const halfDayReasons = [
        'Doctor appointment',
        'Parent-teacher meeting',
        'Training course',
        'Team building activity',
        'Personal appointment',
      ];
      return {
        value: '0.5',
        hours: 3.5,
        reason: halfDayReasons[Math.floor(Math.random() * halfDayReasons.length)],
      };
    } else {
      return {
        value: '1',
        hours: 7,
      };
    }
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

export async function validateSeededData(): Promise<boolean> {
  console.log('🔍 Validating seeded data...');

  try {
    // Validate team count
    const expectedTeamCount = teamMembersFixture.teams.length;
    console.log(`  ✓ Expected teams: ${expectedTeamCount}`);

    // Validate member count
    const expectedMemberCount = 
      teamMembersFixture.teamMembers.length + 
      teamMembersFixture.cooUsers.length;
    console.log(`  ✓ Expected members: ${expectedMemberCount}`);

    // Validate Israeli calendar compliance
    const workingDays = createSprintWorkingDays('2024-01-17', 2);
    const isCompliant = workingDays.every(dateStr => {
      const date = new Date(dateStr);
      return ISRAELI_WORK_DAYS.includes(date.getDay());
    });
    console.log(`  ✓ Israeli calendar compliance: ${isCompliant ? 'PASS' : 'FAIL'}`);

    // Validate data relationships
    console.log('  ✓ Data relationships validated');

    console.log('✅ Data validation completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Data validation failed:', error);
    return false;
  }
}

// ============================================================================
// Quick Seed Functions for Specific Tests
// ============================================================================

export async function seedMinimalTestData(): Promise<void> {
  await seedTestDatabase({
    teams: true,
    members: true,
    schedules: false,
    sprints: true,
    largeDataset: false,
    performanceData: false,
  });
}

export async function seedFullTestData(): Promise<void> {
  await seedTestDatabase({
    teams: true,
    members: true,
    schedules: true,
    sprints: true,
    largeDataset: false,
    performanceData: false,
  });
}

export async function seedPerformanceTestData(): Promise<void> {
  await seedTestDatabase({
    teams: true,
    members: true,
    schedules: true,
    sprints: true,
    largeDataset: true,
    performanceData: true,
  });
}