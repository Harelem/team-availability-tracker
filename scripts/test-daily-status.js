// Test script for getDailyCompanyStatus function
// Run with: node scripts/test-daily-status.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Helper function to convert value to hours (matches the fixed function)
function valueToHours(value) {
  if (!value) return 1 // Default to full day
  switch (value) {
    case '1': return 1
    case '0.5': return 0.5
    case 'X': return 0
    default: return 1
  }
}

async function testDailyCompanyStatus() {
  console.log('🧪 Testing Daily Company Status Function...')
  
  try {
    const selectedDate = new Date()
    const dateStr = selectedDate.toISOString().split('T')[0]
    
    console.log('📅 Testing for date:', dateStr)
    
    // Test 1: Check if team_members table has new columns
    console.log('\n1️⃣ Checking team_members table structure...')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'team_members')
      .in('column_name', ['role', 'is_critical', 'inactive_date'])
    
    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError)
    } else {
      console.log('✅ Found columns:', columns.map(c => c.column_name))
    }
    
    // Test 2: Fetch team members with new fields
    console.log('\n2️⃣ Testing team_members query...')
    const { data: allMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        id,
        name,
        hebrew,
        team_id,
        role,
        is_manager,
        is_critical
      `)
      .is('inactive_date', null)
      .limit(5)
    
    if (membersError) {
      console.error('❌ Error fetching team members:', membersError)
    } else {
      console.log('✅ Team members sample:', allMembers.length, 'members')
      if (allMembers.length > 0) {
        console.log('   Sample member:', {
          name: allMembers[0].name,
          role: allMembers[0].role,
          is_critical: allMembers[0].is_critical
        })
      }
    }
    
    // Test 3: Fetch schedule entries with correct column names
    console.log('\n3️⃣ Testing schedule_entries query...')
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedule_entries')
      .select('member_id, value, reason')
      .eq('date', dateStr)
      .limit(5)
    
    if (scheduleError) {
      console.error('❌ Error fetching schedule data:', scheduleError)
    } else {
      console.log('✅ Schedule entries sample:', scheduleData.length, 'entries')
      if (scheduleData.length > 0) {
        const entry = scheduleData[0]
        console.log('   Sample entry:', {
          member_id: entry.member_id,
          value: entry.value,
          hours: valueToHours(entry.value),
          reason: entry.reason
        })
      }
    }
    
    // Test 4: Test value-to-hours conversion
    console.log('\n4️⃣ Testing value-to-hours conversion...')
    const testValues = ['1', '0.5', 'X', null, 'invalid']
    testValues.forEach(value => {
      const hours = valueToHours(value)
      console.log(`   '${value}' -> ${hours} hours`)
    })
    
    // Test 5: Try to fetch teams
    console.log('\n5️⃣ Testing teams query...')
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .limit(5)
    
    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError)
    } else {
      console.log('✅ Teams sample:', teams.length, 'teams')
      if (teams.length > 0) {
        console.log('   Sample team:', teams[0])
      }
    }
    
    console.log('\n🎉 Basic connectivity tests completed!')
    console.log('\n💡 Next steps:')
    console.log('   1. Apply the SQL enhancement script: sql/enhance-daily-company-status.sql')
    console.log('   2. Run populate_default_member_data() to set default roles')
    console.log('   3. Test the actual getDailyCompanyStatus function in your app')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testDailyCompanyStatus().catch(console.error)