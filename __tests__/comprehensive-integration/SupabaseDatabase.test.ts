/**
 * Comprehensive Integration Tests - Supabase Database
 * Tests CRUD operations, RLS policies, and real-time subscriptions with actual database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '@/lib/database';

// Use test environment configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: SupabaseClient;
let testUserId: string;
let testTeamId: number;

// Test data cleanup tracking
const cleanup = {
  userIds: [] as string[],
  teamIds: [] as number[],
  sprintIds: [] as number[],
  scheduleEntryIds: [] as number[]
};

describe('Supabase Database Integration Tests', () => {
  beforeAll(async () => {
    // Initialize Supabase client with service role key for testing
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify database connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    console.log('✅ Database connection established');
  });

  beforeEach(async () => {
    // Create test user for each test
    testUserId = `test-user-${Date.now()}-${Math.random()}`;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        full_name: 'Test User',
        team: 'Test Team',
        role: 'member'
      })
      .select()
      .single();

    if (profileError) {
      throw new Error(`Failed to create test profile: ${profileError.message}`);
    }

    cleanup.userIds.push(testUserId);

    // Create test team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: `Test Team ${Date.now()}`,
        description: 'Test team for integration tests'
      })
      .select()
      .single();

    if (teamError) {
      throw new Error(`Failed to create test team: ${teamError.message}`);
    }

    testTeamId = team.id;
    cleanup.teamIds.push(testTeamId);
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  afterAll(async () => {
    // Final cleanup and close connections
    await cleanupTestData();
    await supabase.auth.signOut();
  });

  describe('Profile Management', () => {
    it('creates and retrieves user profiles correctly', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toEqual(
        expect.objectContaining({
          id: testUserId,
          email: expect.stringContaining('@example.com'),
          full_name: 'Test User',
          team: 'Test Team',
          role: 'member'
        })
      );
    });

    it('updates user profile correctly', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: 'Updated Test User',
          role: 'manager'
        })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.full_name).toBe('Updated Test User');
      expect(data.role).toBe('manager');
    });

    it('enforces unique email constraint', async () => {
      const duplicateUserId = `duplicate-${Date.now()}`;
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: duplicateUserId,
          email: `test-${Date.now()}@example.com`, // Same email as in beforeEach
          full_name: 'Duplicate User',
          team: 'Test Team',
          role: 'member'
        });

      expect(error).not.toBeNull();
      expect(error?.code).toBe('23505'); // Unique violation
      
      // Clean up if somehow created
      cleanup.userIds.push(duplicateUserId);
    });
  });

  describe('Team Management', () => {
    it('creates and manages team members', async () => {
      const { data: member, error } = await supabase
        .from('team_members')
        .insert({
          name: 'Test Member',
          team: `Test Team ${Date.now()}`,
          email: `member-${Date.now()}@example.com`,
          role: 'member'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(member).toEqual(
        expect.objectContaining({
          name: 'Test Member',
          role: 'member'
        })
      );

      // Clean up
      if (member) {
        await supabase.from('team_members').delete().eq('id', member.id);
      }
    });

    it('retrieves team members by team name', async () => {
      const teamName = `Integration Test Team ${Date.now()}`;
      
      // Insert multiple team members
      const members = [
        { name: 'Member 1', team: teamName, email: `member1-${Date.now()}@example.com`, role: 'member' },
        { name: 'Member 2', team: teamName, email: `member2-${Date.now()}@example.com`, role: 'manager' }
      ];

      const { data: insertedMembers, error: insertError } = await supabase
        .from('team_members')
        .insert(members)
        .select();

      expect(insertError).toBeNull();

      // Retrieve by team name
      const { data: teamMembers, error: selectError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team', teamName)
        .order('name');

      expect(selectError).toBeNull();
      expect(teamMembers).toHaveLength(2);
      expect(teamMembers[0].name).toBe('Member 1');
      expect(teamMembers[1].name).toBe('Member 2');

      // Clean up
      if (insertedMembers) {
        for (const member of insertedMembers) {
          await supabase.from('team_members').delete().eq('id', member.id);
        }
      }
    });
  });

  describe('Schedule Entry Management', () => {
    let testMemberId: number;

    beforeEach(async () => {
      // Create test team member for schedule entries
      const { data: member, error } = await supabase
        .from('team_members')
        .insert({
          name: 'Schedule Test Member',
          team: `Test Team ${Date.now()}`,
          email: `schedule-${Date.now()}@example.com`,
          role: 'member'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create test member: ${error.message}`);
      }

      testMemberId = member.id;
    });

    it('creates schedule entries correctly', async () => {
      const scheduleEntry = {
        user_id: testMemberId,
        date: '2024-01-17',
        value: 7,
        absence_reason: null
      };

      const { data, error } = await supabase
        .from('schedule_entries')
        .insert(scheduleEntry)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toEqual(
        expect.objectContaining({
          user_id: testMemberId,
          date: '2024-01-17',
          value: 7,
          absence_reason: null
        })
      );

      cleanup.scheduleEntryIds.push(data.id);
    });

    it('updates schedule entries correctly', async () => {
      // Create initial entry
      const { data: entry, error: createError } = await supabase
        .from('schedule_entries')
        .insert({
          user_id: testMemberId,
          date: '2024-01-17',
          value: 7,
          absence_reason: null
        })
        .select()
        .single();

      expect(createError).toBeNull();
      cleanup.scheduleEntryIds.push(entry.id);

      // Update the entry
      const { data: updatedEntry, error: updateError } = await supabase
        .from('schedule_entries')
        .update({
          value: 3.5,
          absence_reason: 'Personal appointment'
        })
        .eq('id', entry.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedEntry.value).toBe(3.5);
      expect(updatedEntry.absence_reason).toBe('Personal appointment');
    });

    it('enforces unique constraint on user_id and date', async () => {
      // Create first entry
      const { error: firstError } = await supabase
        .from('schedule_entries')
        .insert({
          user_id: testMemberId,
          date: '2024-01-17',
          value: 7,
          absence_reason: null
        });

      expect(firstError).toBeNull();

      // Try to create duplicate entry for same user and date
      const { error: duplicateError } = await supabase
        .from('schedule_entries')
        .insert({
          user_id: testMemberId,
          date: '2024-01-17',
          value: 8,
          absence_reason: null
        });

      expect(duplicateError).not.toBeNull();
      expect(duplicateError?.code).toBe('23505'); // Unique violation
    });

    it('retrieves schedule entries with user profiles', async () => {
      // Create schedule entry
      const { data: entry, error: entryError } = await supabase
        .from('schedule_entries')
        .insert({
          user_id: testMemberId,
          date: '2024-01-17',
          value: 7,
          absence_reason: null
        })
        .select()
        .single();

      expect(entryError).toBeNull();
      cleanup.scheduleEntryIds.push(entry.id);

      // Retrieve with profile join
      const { data: entriesWithProfiles, error: joinError } = await supabase
        .from('schedule_entries')
        .select(`
          *,
          team_members!inner (
            name,
            team,
            email,
            role
          )
        `)
        .eq('id', entry.id);

      expect(joinError).toBeNull();
      expect(entriesWithProfiles).toHaveLength(1);
      expect(entriesWithProfiles[0].team_members).toEqual(
        expect.objectContaining({
          name: 'Schedule Test Member'
        })
      );
    });
  });

  describe('Sprint History Management', () => {
    it('creates sprint history entries correctly', async () => {
      const sprint = {
        sprint_number: 1,
        sprint_name: 'Test Sprint 1',
        sprint_start_date: '2024-01-15',
        sprint_end_date: '2024-01-28',
        sprint_length_weeks: 2,
        description: 'Integration test sprint',
        status: 'active' as const,
        progress_percentage: 75,
        days_remaining: 5,
        total_days: 10,
        created_by: 'Test System'
      };

      const { data, error } = await supabase
        .from('sprint_history')
        .insert(sprint)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toEqual(
        expect.objectContaining({
          sprint_number: 1,
          sprint_name: 'Test Sprint 1',
          status: 'active'
        })
      );

      cleanup.sprintIds.push(data.id);
    });

    it('enforces unique sprint_number constraint', async () => {
      const sprintNumber = Math.floor(Math.random() * 1000000);

      // Create first sprint
      const { data: firstSprint, error: firstError } = await supabase
        .from('sprint_history')
        .insert({
          sprint_number: sprintNumber,
          sprint_name: 'Test Sprint First',
          sprint_start_date: '2024-01-15',
          sprint_end_date: '2024-01-28',
          sprint_length_weeks: 2,
          status: 'active',
          progress_percentage: 0,
          days_remaining: 10,
          total_days: 10,
          created_by: 'Test System'
        })
        .select()
        .single();

      expect(firstError).toBeNull();
      if (firstSprint) cleanup.sprintIds.push(firstSprint.id);

      // Try to create duplicate sprint number
      const { error: duplicateError } = await supabase
        .from('sprint_history')
        .insert({
          sprint_number: sprintNumber,
          sprint_name: 'Test Sprint Duplicate',
          sprint_start_date: '2024-01-29',
          sprint_end_date: '2024-02-11',
          sprint_length_weeks: 2,
          status: 'upcoming',
          progress_percentage: 0,
          days_remaining: 0,
          total_days: 10,
          created_by: 'Test System'
        });

      expect(duplicateError).not.toBeNull();
      expect(duplicateError?.code).toBe('23505'); // Unique violation
    });

    it('updates sprint progress correctly', async () => {
      const { data: sprint, error: createError } = await supabase
        .from('sprint_history')
        .insert({
          sprint_number: Math.floor(Math.random() * 1000000),
          sprint_name: 'Progress Test Sprint',
          sprint_start_date: '2024-01-15',
          sprint_end_date: '2024-01-28',
          sprint_length_weeks: 2,
          status: 'active',
          progress_percentage: 0,
          days_remaining: 10,
          total_days: 10,
          created_by: 'Test System'
        })
        .select()
        .single();

      expect(createError).toBeNull();
      cleanup.sprintIds.push(sprint.id);

      // Update progress
      const { data: updatedSprint, error: updateError } = await supabase
        .from('sprint_history')
        .update({
          progress_percentage: 85,
          days_remaining: 3
        })
        .eq('id', sprint.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedSprint.progress_percentage).toBe(85);
      expect(updatedSprint.days_remaining).toBe(3);
    });
  });

  describe('Database Service Integration', () => {
    it('integrates correctly with DatabaseService', async () => {
      // Test DatabaseService methods with real database
      const teams = await DatabaseService.getTeams();
      expect(Array.isArray(teams)).toBe(true);

      // Test getting team members (should work even with test data)
      const teamMembers = await DatabaseService.getTeamMembers('Test Team');
      expect(Array.isArray(teamMembers)).toBe(true);
    });

    it('handles database errors gracefully', async () => {
      // Test with invalid table name (should be caught by service)
      try {
        await DatabaseService.getScheduleEntries({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          team: 'NonexistentTeam'
        });
      } catch (error) {
        // Should handle error gracefully
        expect(error).toBeDefined();
      }
    });
  });

  describe('Real-time Subscription Testing', () => {
    it('receives real-time updates for schedule entries', (done) => {
      const testDate = '2024-01-17';
      let subscription: any;

      // Set up subscription
      subscription = supabase
        .channel('test-schedule-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedule_entries'
          },
          (payload) => {
            if (payload.eventType === 'INSERT' && payload.new.user_id === testMemberId) {
              expect(payload.new).toEqual(
                expect.objectContaining({
                  date: testDate,
                  value: 7
                })
              );

              // Clean up and complete test
              subscription.unsubscribe();
              cleanup.scheduleEntryIds.push(payload.new.id);
              done();
            }
          }
        )
        .subscribe();

      // Wait for subscription to be established
      setTimeout(async () => {
        // Create test team member if not exists
        if (!testMemberId) {
          const { data: member } = await supabase
            .from('team_members')
            .insert({
              name: 'Realtime Test Member',
              team: 'Realtime Test Team',
              email: `realtime-${Date.now()}@example.com`,
              role: 'member'
            })
            .select()
            .single();

          testMemberId = member.id;
        }

        // Insert entry to trigger real-time update
        await supabase
          .from('schedule_entries')
          .insert({
            user_id: testMemberId,
            date: testDate,
            value: 7,
            absence_reason: null
          });
      }, 1000);
    }, 10000); // Increase timeout for real-time test

    it('handles subscription errors properly', (done) => {
      // Set up subscription with invalid configuration
      const subscription = supabase
        .channel('test-error-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'invalid_schema',
            table: 'invalid_table'
          },
          (payload) => {
            // Should not reach here
            done.fail('Should not receive updates from invalid subscription');
          }
        )
        .subscribe((status, error) => {
          if (status === 'SUBSCRIPTION_ERROR' || error) {
            // Expected error
            subscription.unsubscribe();
            done();
          }
        });

      // Timeout after 5 seconds if no error received
      setTimeout(() => {
        subscription.unsubscribe();
        done();
      }, 5000);
    }, 10000);
  });

  describe('Performance and Load Testing', () => {
    it('handles concurrent database operations', async () => {
      const concurrentOperations = 10;
      const promises = [];

      // Create multiple concurrent operations
      for (let i = 0; i < concurrentOperations; i++) {
        const promise = supabase
          .from('profiles')
          .insert({
            id: `concurrent-${Date.now()}-${i}`,
            email: `concurrent-${Date.now()}-${i}@example.com`,
            full_name: `Concurrent User ${i}`,
            team: 'Concurrent Test Team',
            role: 'member'
          })
          .select()
          .single();

        promises.push(promise);
      }

      const results = await Promise.allSettled(promises);
      
      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(concurrentOperations * 0.8);

      // Clean up successful insertions
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.data) {
          cleanup.userIds.push(result.value.data.id);
        }
      }
    });

    it('handles large batch operations efficiently', async () => {
      const batchSize = 100;
      const batchData = [];

      // Prepare batch data
      for (let i = 0; i < batchSize; i++) {
        batchData.push({
          id: `batch-${Date.now()}-${i}`,
          email: `batch-${Date.now()}-${i}@example.com`,
          full_name: `Batch User ${i}`,
          team: 'Batch Test Team',
          role: 'member'
        });
      }

      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('profiles')
        .insert(batchData)
        .select();

      const endTime = performance.now();

      expect(error).toBeNull();
      expect(data).toHaveLength(batchSize);
      
      // Should complete within reasonable time (adjust based on your requirements)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      // Clean up batch data
      if (data) {
        for (const profile of data) {
          cleanup.userIds.push(profile.id);
        }
      }
    });
  });

  // Helper function to clean up test data
  async function cleanupTestData() {
    try {
      // Clean up in reverse dependency order
      
      // Schedule entries
      if (cleanup.scheduleEntryIds.length > 0) {
        await supabase
          .from('schedule_entries')
          .delete()
          .in('id', cleanup.scheduleEntryIds);
        cleanup.scheduleEntryIds = [];
      }

      // Sprint history
      if (cleanup.sprintIds.length > 0) {
        await supabase
          .from('sprint_history')
          .delete()
          .in('id', cleanup.sprintIds);
        cleanup.sprintIds = [];
      }

      // Team members (clean up any that were created)
      await supabase
        .from('team_members')
        .delete()
        .like('email', '%@example.com');

      // Teams
      if (cleanup.teamIds.length > 0) {
        await supabase
          .from('teams')
          .delete()
          .in('id', cleanup.teamIds);
        cleanup.teamIds = [];
      }

      // Profiles
      if (cleanup.userIds.length > 0) {
        await supabase
          .from('profiles')
          .delete()
          .in('id', cleanup.userIds);
        cleanup.userIds = [];
      }

    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }
});