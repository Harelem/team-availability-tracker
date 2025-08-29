#!/usr/bin/env node
/**
 * Comprehensive Test Data Seeding Script
 * Seeds the test database with realistic data for all testing scenarios
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

// Supabase client for test database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test data configuration
const TEAMS = [
  { name: 'Development-Tal', manager: 'Tal Vashdi' },
  { name: 'Development-Itai', manager: 'Itai Nahmias' },
  { name: 'Infrastructure', manager: 'Amit Tzriker' },
  { name: 'Data', manager: 'Harel Mazan' },
  { name: 'Product', manager: 'Dana Livne' }
];

const TEAM_MEMBERS = {
  'Development-Tal': [
    'Tal Vashdi', 'Ido Keller', 'Noam Rathaus', 'Yair Lev', 
    'Shachar Menashe', 'Omri Aloni', 'Maya Cohen', 'David Stern'
  ],
  'Development-Itai': [
    'Itai Nahmias', 'Lior Avitan', 'Rotem Levy', 'Gal Biton',
    'Noa Schwartz', 'Eyal Goldstein', 'Tamir Ronen', 'Shira Kaplan'
  ],
  'Infrastructure': [
    'Amit Tzriker', 'Oren Dahan', 'Michal Aharoni', 'Chen Barak',
    'Yuval Golan', 'Roni Shapira', 'Alon Mizrahi', 'Yael Friedman'
  ],
  'Data': [
    'Harel Mazan', 'Tomer Ashkenazi', 'Liora Ben-David', 'Matan Katz',
    'Shay Rosenberg', 'Keren Yitzhak', 'Asaf Rubin', 'Noga Stein'
  ],
  'Product': [
    'Dana Livne', 'Roy Agmon', 'Michal Dror', 'Lavi Peretz',
    'Nir Carmi', 'Sapir Fadida', 'Doron Mula', 'Yarden Levy'
  ]
};

// Executive users
const EXECUTIVES = [
  { email: 'nir.shilo@example.com', full_name: 'Nir Shilo', role: 'coo' },
  { email: 'ran.avraham@example.com', full_name: 'Ran Avraham', role: 'executive' }
];

console.log('🌱 Seeding test database with comprehensive data...\n');

async function seedTestData() {
  try {
    // Step 1: Clean existing data
    console.log('1️⃣ Cleaning existing test data...');
    await cleanExistingData();
    console.log('✅ Existing data cleaned');

    // Step 2: Seed profiles (users)
    console.log('\n2️⃣ Seeding user profiles...');
    await seedProfiles();
    console.log('✅ User profiles seeded');

    // Step 3: Seed teams
    console.log('\n3️⃣ Seeding teams...');
    await seedTeams();
    console.log('✅ Teams seeded');

    // Step 4: Seed team members
    console.log('\n4️⃣ Seeding team members...');
    await seedTeamMembers();
    console.log('✅ Team members seeded');

    // Step 5: Seed sprint history
    console.log('\n5️⃣ Seeding sprint history...');
    await seedSprintHistory();
    console.log('✅ Sprint history seeded');

    // Step 6: Seed schedule entries
    console.log('\n6️⃣ Seeding schedule entries...');
    await seedScheduleEntries();
    console.log('✅ Schedule entries seeded');

    // Step 7: Seed global sprint settings
    console.log('\n7️⃣ Seeding global sprint settings...');
    await seedGlobalSprintSettings();
    console.log('✅ Global sprint settings seeded');

    // Step 8: Verification
    console.log('\n8️⃣ Verifying seeded data...');
    await verifySeededData();
    console.log('✅ Data verification completed');

    console.log('\n🎉 Test data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${TEAMS.length} teams created`);
    console.log(`   • ${Object.values(TEAM_MEMBERS).flat().length} team members`);
    console.log(`   • ${EXECUTIVES.length} executive users`);
    console.log('   • 6 months of historical sprint data');
    console.log('   • Full schedule entries for testing');

  } catch (error) {
    console.error('\n❌ Test data seeding failed:', error);
    throw error;
  }
}

async function cleanExistingData() {
  const tables = [
    'schedule_entries',
    'team_members', 
    'teams',
    'sprint_history',
    'global_sprint_settings',
    'profiles'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', 'impossible-id');
      if (error && !error.message.includes('does not exist')) {
        console.warn(`   ⚠️  Warning cleaning ${table}:`, error.message);
      }
    } catch (e) {
      console.warn(`   ⚠️  Warning cleaning ${table}:`, e.message);
    }
  }
}

async function seedProfiles() {
  // Create profiles for all team members
  const allMembers = Object.values(TEAM_MEMBERS).flat();
  const profiles = [];

  // Add team members
  allMembers.forEach((name, index) => {
    const team = Object.keys(TEAM_MEMBERS).find(team => 
      TEAM_MEMBERS[team].includes(name)
    );
    
    profiles.push({
      id: `user-${index + 1}`,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      full_name: name,
      team: team,
      role: TEAMS.find(t => t.name === team)?.manager === name ? 'manager' : 'member',
      created_at: new Date().toISOString()
    });
  });

  // Add executives
  EXECUTIVES.forEach((exec, index) => {
    profiles.push({
      id: `exec-${index + 1}`,
      email: exec.email,
      full_name: exec.full_name,
      team: 'Executive',
      role: exec.role,
      created_at: new Date().toISOString()
    });
  });

  const { data, error } = await supabase
    .from('profiles')
    .insert(profiles);

  if (error) throw error;
  return data;
}

async function seedTeams() {
  const teams = TEAMS.map(team => ({
    name: team.name,
    description: `${team.name} team`,
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('teams')
    .insert(teams);

  if (error) throw error;
  return data;
}

async function seedTeamMembers() {
  const teamMembers = [];
  let memberId = 1;

  for (const [teamName, members] of Object.entries(TEAM_MEMBERS)) {
    for (const memberName of members) {
      const isManager = TEAMS.find(t => t.name === teamName)?.manager === memberName;
      
      teamMembers.push({
        id: memberId++,
        name: memberName,
        team: teamName,
        role: isManager ? 'manager' : 'member',
        email: `${memberName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        created_at: new Date().toISOString()
      });
    }
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert(teamMembers);

  if (error) throw error;
  return data;
}

async function seedSprintHistory() {
  const sprints = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // 6 months ago

  for (let i = 0; i < 12; i++) { // 12 sprints (6 months, 2-week sprints)
    const sprintStart = new Date(startDate);
    sprintStart.setDate(startDate.getDate() + (i * 14));
    
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintStart.getDate() + 13);

    const isActive = i === 11; // Last sprint is active
    const status = i < 10 ? 'completed' : (i === 10 ? 'active' : 'upcoming');

    sprints.push({
      id: i + 1,
      sprint_number: i + 1,
      sprint_name: `Sprint ${i + 1}`,
      sprint_start_date: sprintStart.toISOString().split('T')[0],
      sprint_end_date: sprintEnd.toISOString().split('T')[0],
      sprint_length_weeks: 2,
      description: `Test Sprint ${i + 1} for comprehensive testing`,
      status: status,
      progress_percentage: status === 'completed' ? 100 : (status === 'active' ? 75 : 0),
      days_remaining: status === 'active' ? 5 : 0,
      total_days: 10,
      created_at: sprintStart.toISOString(),
      updated_at: sprintStart.toISOString(),
      created_by: 'Test System'
    });
  }

  const { data, error } = await supabase
    .from('sprint_history')
    .insert(sprints);

  if (error) throw error;
  return data;
}

async function seedScheduleEntries() {
  // Get all team members
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('id, name, team');

  if (!teamMembers) return;

  const scheduleEntries = [];
  const today = new Date();
  
  // Seed entries for last 3 months and next 1 month
  for (let dayOffset = -90; dayOffset <= 30; dayOffset++) {
    const entryDate = new Date(today);
    entryDate.setDate(today.getDate() + dayOffset);
    
    // Skip weekends (Friday = 5, Saturday = 6 in Israeli calendar)
    const dayOfWeek = entryDate.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) continue;

    for (const member of teamMembers) {
      // Skip executives from schedule entries
      if (member.name === 'Nir Shilo' || member.name === 'Ran Avraham') continue;

      let value = 7; // Default full day
      let absenceReason = null;

      // Add some variety to test different scenarios
      const random = Math.random();
      if (random < 0.1) {
        value = 0; // Sick day
        absenceReason = 'Sick';
      } else if (random < 0.15) {
        value = 3.5; // Half day
        absenceReason = 'Personal';
      } else if (random < 0.18) {
        value = 0; // Vacation
        absenceReason = 'Vacation';
      }

      scheduleEntries.push({
        user_id: member.id,
        date: entryDate.toISOString().split('T')[0],
        value: value,
        absence_reason: absenceReason,
        created_at: entryDate.toISOString(),
        updated_at: entryDate.toISOString()
      });
    }
  }

  // Insert in batches to handle large dataset
  const batchSize = 1000;
  for (let i = 0; i < scheduleEntries.length; i += batchSize) {
    const batch = scheduleEntries.slice(i, i + batchSize);
    const { error } = await supabase
      .from('schedule_entries')
      .insert(batch);

    if (error) throw error;
    
    console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scheduleEntries.length / batchSize)}`);
  }

  return scheduleEntries.length;
}

async function seedGlobalSprintSettings() {
  const settings = {
    id: 1,
    current_sprint_number: 12,
    current_sprint_start: new Date().toISOString().split('T')[0],
    current_sprint_end: (() => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      return endDate.toISOString().split('T')[0];
    })(),
    sprint_length_weeks: 2,
    company_target_capacity: 0.8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('global_sprint_settings')
    .insert([settings]);

  if (error) throw error;
  return data;
}

async function verifySeededData() {
  const verifications = [
    { table: 'profiles', expected: Object.values(TEAM_MEMBERS).flat().length + EXECUTIVES.length },
    { table: 'teams', expected: TEAMS.length },
    { table: 'team_members', expected: Object.values(TEAM_MEMBERS).flat().length },
    { table: 'sprint_history', expected: 12 },
    { table: 'global_sprint_settings', expected: 1 }
  ];

  for (const verification of verifications) {
    const { count, error } = await supabase
      .from(verification.table)
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    console.log(`   • ${verification.table}: ${count}/${verification.expected} rows`);
    
    if (count !== verification.expected) {
      console.warn(`   ⚠️  Warning: Expected ${verification.expected} rows in ${verification.table}, got ${count}`);
    }
  }

  // Verify schedule entries exist
  const { count: scheduleCount } = await supabase
    .from('schedule_entries')
    .select('*', { count: 'exact', head: true });

  console.log(`   • schedule_entries: ${scheduleCount} rows`);
  
  if (scheduleCount === 0) {
    throw new Error('No schedule entries were created');
  }
}

// Run the seeding
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedTestData };