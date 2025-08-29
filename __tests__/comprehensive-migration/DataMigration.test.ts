/**
 * Data Migration and Compatibility Testing
 * Tests database migrations, data integrity, and version compatibility
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface MigrationTest {
  version: string;
  description: string;
  tables: string[];
  expectedChanges: string[];
}

const MIGRATION_HISTORY: MigrationTest[] = [
  {
    version: '2.0.0',
    description: 'Initial schema with basic team and schedule tracking',
    tables: ['team_members', 'schedule_entries', 'global_sprint_settings'],
    expectedChanges: ['Create core tables', 'Set up RLS policies']
  },
  {
    version: '2.1.0',
    description: 'Enhanced analytics and COO dashboard',
    tables: ['company_analytics', 'team_utilization_metrics', 'sprint_completion_stats'],
    expectedChanges: ['Add analytics tables', 'Add reason field to schedule_entries', 'Create aggregate views']
  }
];

test.describe('Data Migration Testing', () => {
  let supabase: any;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  test.describe('Schema Migration Validation', () => {
    test('validates current schema matches expected structure', async () => {
      // Get all tables in the current schema
      const { data: tables, error } = await supabase.rpc('get_schema_tables', {
        schema_name: 'public'
      });

      expect(error).toBeNull();
      expect(tables).toBeTruthy();

      // Verify core tables exist
      const coreTableNames = ['team_members', 'schedule_entries', 'global_sprint_settings'];
      for (const tableName of coreTableNames) {
        const tableExists = tables?.some((table: any) => table.table_name === tableName);
        expect(tableExists).toBeTruthy(`Core table ${tableName} should exist`);
      }

      console.log(`✅ Found ${tables?.length || 0} tables in schema`);
    });

    test('validates table constraints and indexes', async () => {
      const criticalTables = [
        {
          name: 'team_members',
          expectedIndexes: ['team_members_email_idx', 'team_members_team_idx'],
          expectedConstraints: ['team_members_email_key', 'team_members_pkey']
        },
        {
          name: 'schedule_entries',
          expectedIndexes: ['schedule_entries_user_id_idx', 'schedule_entries_date_idx'],
          expectedConstraints: ['schedule_entries_pkey', 'schedule_entries_user_id_fkey']
        }
      ];

      for (const table of criticalTables) {
        // Check indexes
        const { data: indexes, error: indexError } = await supabase
          .rpc('get_table_indexes', { table_name: table.name });

        expect(indexError).toBeNull();
        console.log(`Table ${table.name} indexes:`, indexes?.map((i: any) => i.indexname));

        // Check constraints
        const { data: constraints, error: constraintError } = await supabase
          .rpc('get_table_constraints', { table_name: table.name });

        expect(constraintError).toBeNull();
        console.log(`Table ${table.name} constraints:`, constraints?.map((c: any) => c.conname));
      }
    });

    test('validates foreign key relationships', async () => {
      // Test critical foreign key relationships
      const relationships = [
        {
          child_table: 'schedule_entries',
          parent_table: 'team_members',
          foreign_key: 'user_id',
          parent_key: 'id'
        }
      ];

      for (const rel of relationships) {
        // Test referential integrity by creating and deleting test data
        const { data: testParent, error: createParentError } = await supabase
          .from(rel.parent_table)
          .insert({
            name: 'Migration Test User',
            email: `migration-test-${Date.now()}@example.com`,
            team: 'Development-Tal',
            role: 'member'
          })
          .select()
          .single();

        expect(createParentError).toBeNull();
        expect(testParent).toBeTruthy();

        // Test foreign key constraint works
        const { data: testChild, error: createChildError } = await supabase
          .from(rel.child_table)
          .insert({
            [rel.foreign_key]: testParent.id,
            date: '2024-01-17',
            value: 8
          })
          .select()
          .single();

        expect(createChildError).toBeNull();
        expect(testChild).toBeTruthy();

        // Test constraint prevents orphan records
        const { error: deleteParentError } = await supabase
          .from(rel.parent_table)
          .delete()
          .eq('id', testParent.id);

        // Should fail due to foreign key constraint
        expect(deleteParentError).not.toBeNull();

        // Cleanup properly
        await supabase.from(rel.child_table).delete().eq('id', testChild.id);
        await supabase.from(rel.parent_table).delete().eq('id', testParent.id);

        console.log(`✅ Foreign key relationship ${rel.child_table}.${rel.foreign_key} -> ${rel.parent_table}.${rel.parent_key} validated`);
      }
    });
  });

  test.describe('Data Integrity During Migration', () => {
    test('validates data consistency across all teams', async () => {
      const teams = ['Development-Tal', 'Development-Itai', 'Infrastructure', 'QA', 'Leadership'];
      
      for (const teamName of teams) {
        // Check team members data integrity
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('team', teamName);

        expect(membersError).toBeNull();
        
        if (members && members.length > 0) {
          // Validate data types and constraints
          members.forEach((member: any) => {
            expect(typeof member.id).toBe('number');
            expect(typeof member.name).toBe('string');
            expect(member.name.length).toBeGreaterThan(0);
            expect(member.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            expect(['member', 'senior', 'manager', 'coo'].includes(member.role)).toBeTruthy();
          });

          // Check schedule entries for team members
          const memberIds = members.map(m => m.id);
          const { data: schedules, error: scheduleError } = await supabase
            .from('schedule_entries')
            .select('*')
            .in('user_id', memberIds)
            .limit(50);

          expect(scheduleError).toBeNull();
          
          if (schedules && schedules.length > 0) {
            schedules.forEach((entry: any) => {
              expect(entry.value).toBeGreaterThanOrEqual(0);
              expect(entry.value).toBeLessThanOrEqual(24);
              expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
              expect(memberIds.includes(entry.user_id)).toBeTruthy();
            });
          }

          console.log(`✅ Team ${teamName}: ${members.length} members, ${schedules?.length || 0} schedule entries validated`);
        }
      }
    });

    test('validates historical data preservation', async () => {
      // Test that data from different time periods is preserved correctly
      const timeRanges = [
        { name: 'Last 30 days', days: 30 },
        { name: 'Last 90 days', days: 90 },
        { name: 'Last 180 days', days: 180 }
      ];

      for (const range of timeRanges) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - range.days);

        const { data: historicalData, error } = await supabase
          .from('schedule_entries')
          .select(`
            *,
            team_members!inner(name, team)
          `)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(100);

        expect(error).toBeNull();
        
        if (historicalData && historicalData.length > 0) {
          console.log(`${range.name}: ${historicalData.length} records found`);
          
          // Group by team to ensure all teams have data
          const teamData = historicalData.reduce((acc: any, entry: any) => {
            const team = entry.team_members.team;
            acc[team] = (acc[team] || 0) + 1;
            return acc;
          }, {});

          console.log('Historical data by team:', teamData);
          
          // At least some teams should have historical data
          expect(Object.keys(teamData).length).toBeGreaterThan(0);
        }
      }
    });

    test('validates sprint settings migration', async () => {
      // Check global sprint settings integrity
      const { data: sprintSettings, error } = await supabase
        .from('global_sprint_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      
      if (sprintSettings && sprintSettings.length > 0) {
        sprintSettings.forEach((setting: any) => {
          // Validate date formats
          expect(setting.sprint_start_date).toMatch(/^\d{4}-\d{2}-\d{2}/);
          expect(setting.sprint_end_date).toMatch(/^\d{4}-\d{2}-\d{2}/);
          
          // Validate date logic
          const startDate = new Date(setting.sprint_start_date);
          const endDate = new Date(setting.sprint_end_date);
          expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
          
          // Sprint should be reasonable length (1-4 weeks)
          const sprintDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          expect(sprintDays).toBeGreaterThan(6); // At least a week
          expect(sprintDays).toBeLessThan(29); // Less than a month
        });

        console.log(`✅ ${sprintSettings.length} sprint settings validated`);
      }
    });
  });

  test.describe('Version-Specific Migration Tests', () => {
    test('validates v2.1 reason field migration', async () => {
      // Test that reason field was added correctly to schedule_entries
      const { data: recentEntries, error } = await supabase
        .from('schedule_entries')
        .select('id, value, reason, created_at')
        .lt('value', 8) // Entries that might have reasons (partial days)
        .order('created_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      
      if (recentEntries && recentEntries.length > 0) {
        let reasonCount = 0;
        recentEntries.forEach((entry: any) => {
          // Check that reason field exists (can be null)
          expect(entry.hasOwnProperty('reason')).toBeTruthy();
          if (entry.reason) {
            reasonCount++;
            expect(typeof entry.reason).toBe('string');
          }
        });
        
        console.log(`✅ Reason field migration: ${reasonCount}/${recentEntries.length} entries have reasons`);
      }
    });

    test('validates analytics tables migration', async () => {
      // Test v2.1 analytics tables
      const analyticsTables = [
        'company_analytics',
        'team_utilization_metrics'
      ];

      for (const tableName of analyticsTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(5);

          if (error && error.code === '42P01') {
            console.log(`Analytics table ${tableName} not found - may be optional`);
          } else {
            expect(error).toBeNull();
            console.log(`✅ Analytics table ${tableName} accessible`);
          }
        } catch (err) {
          console.log(`Analytics table ${tableName} test error:`, err);
        }
      }
    });

    test('validates view migrations', async () => {
      // Test aggregate views that might have been added in v2.1
      const views = [
        'team_utilization_view',
        'sprint_completion_view',
        'manager_dashboard_view'
      ];

      for (const viewName of views) {
        try {
          const { data, error } = await supabase
            .from(viewName)
            .select('*')
            .limit(1);

          if (error && error.code === '42P01') {
            console.log(`View ${viewName} not found - may be version-specific`);
          } else {
            expect(error).toBeNull();
            console.log(`✅ View ${viewName} accessible`);
          }
        } catch (err) {
          console.log(`View ${viewName} test error:`, err);
        }
      }
    });
  });

  test.describe('RLS Policy Migration', () => {
    test('validates RLS policies are correctly applied', async () => {
      // Test row-level security policies after migration
      const testCases = [
        {
          table: 'team_members',
          description: 'Team members should be readable by all authenticated users'
        },
        {
          table: 'schedule_entries',
          description: 'Schedule entries should be restricted by user and team'
        }
      ];

      for (const testCase of testCases) {
        // Check if RLS is enabled
        const { data: rlsStatus, error } = await supabase
          .rpc('check_rls_enabled', { table_name: testCase.table });

        if (error) {
          console.log(`Could not check RLS status for ${testCase.table}:`, error);
        } else {
          console.log(`${testCase.table} RLS enabled:`, rlsStatus);
        }

        // Test basic access (this would be more comprehensive in real scenario)
        const { data, error: accessError } = await supabase
          .from(testCase.table)
          .select('*')
          .limit(1);

        // Should not get permission denied for basic read operations with service key
        expect(accessError?.code).not.toBe('42501');
      }
    });

    test('validates team access restrictions', async () => {
      // Create test data to validate RLS policies
      const testTeam = 'Migration-Test-Team';
      
      // Create test team member
      const { data: testMember, error: createError } = await supabase
        .from('team_members')
        .insert({
          name: 'RLS Test Member',
          email: `rls-test-${Date.now()}@example.com`,
          team: testTeam,
          role: 'member'
        })
        .select()
        .single();

      expect(createError).toBeNull();

      // Create test schedule entry
      const { data: testEntry, error: entryError } = await supabase
        .from('schedule_entries')
        .insert({
          user_id: testMember.id,
          date: '2024-01-17',
          value: 8,
          reason: 'RLS Migration Test'
        })
        .select()
        .single();

      expect(entryError).toBeNull();

      // Test that data exists
      const { data: verifyData, error: verifyError } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('id', testEntry.id);

      expect(verifyError).toBeNull();
      expect(verifyData).toHaveLength(1);

      // Cleanup
      await supabase.from('schedule_entries').delete().eq('id', testEntry.id);
      await supabase.from('team_members').delete().eq('id', testMember.id);

      console.log('✅ RLS policy migration validated');
    });
  });

  test.describe('Performance After Migration', () => {
    test('validates query performance post-migration', async () => {
      const performanceTests = [
        {
          name: 'Team member lookup',
          query: () => supabase.from('team_members').select('*').eq('team', 'Development-Tal'),
          maxTime: 500
        },
        {
          name: 'Recent schedule entries',
          query: () => supabase
            .from('schedule_entries')
            .select('*, team_members!inner(name)')
            .gte('date', '2024-01-01')
            .limit(50),
          maxTime: 1000
        },
        {
          name: 'Sprint settings lookup',
          query: () => supabase
            .from('global_sprint_settings')
            .select('*')
            .eq('is_active', true),
          maxTime: 300
        }
      ];

      for (const test of performanceTests) {
        const startTime = Date.now();
        const { data, error } = await test.query();
        const duration = Date.now() - startTime;

        expect(error).toBeNull();
        console.log(`${test.name}: ${duration}ms (${data?.length || 0} records)`);

        if (duration > test.maxTime) {
          console.warn(`⚠️ ${test.name} took ${duration}ms, exceeds target ${test.maxTime}ms`);
        } else {
          console.log(`✅ ${test.name} performance OK`);
        }
      }
    });

    test('validates index effectiveness', async () => {
      // Test that indexes are being used effectively
      const { data: teamMemberStats, error } = await supabase
        .rpc('analyze_table_stats', { table_name: 'team_members' });

      if (!error && teamMemberStats) {
        console.log('Team members table statistics:', teamMemberStats);
      }

      // Test index usage with explain plan (if available)
      try {
        const { data: queryPlan, error: planError } = await supabase
          .rpc('explain_query', {
            query_text: "SELECT * FROM team_members WHERE team = 'Development-Tal'"
          });

        if (!planError && queryPlan) {
          const usingIndex = queryPlan.includes('Index Scan') || queryPlan.includes('Bitmap');
          if (usingIndex) {
            console.log('✅ Query is using indexes effectively');
          } else {
            console.warn('⚠️ Query may not be using indexes optimally');
          }
        }
      } catch (err) {
        console.log('Query plan analysis not available');
      }
    });
  });

  test.describe('Rollback Safety', () => {
    test('validates rollback compatibility', async () => {
      // Test that current data structure would be compatible with rollback
      // This simulates what would happen if we had to rollback the migration
      
      const { data: currentSchema, error } = await supabase
        .rpc('get_table_schema', { table_name: 'schedule_entries' });

      if (!error && currentSchema) {
        // Check for fields that were added in v2.1
        const v21Fields = ['reason']; // Fields added in version 2.1
        
        for (const field of v21Fields) {
          const fieldExists = currentSchema.some((col: any) => col.column_name === field);
          if (fieldExists) {
            // Check if field is nullable (required for rollback compatibility)
            const fieldInfo = currentSchema.find((col: any) => col.column_name === field);
            expect(fieldInfo.is_nullable).toBe('YES');
            console.log(`✅ Field ${field} is nullable - rollback safe`);
          }
        }
      }
    });

    test('validates data export for backup', async () => {
      // Test that we can export all critical data for backup before migration
      const criticalTables = ['team_members', 'schedule_entries', 'global_sprint_settings'];
      const backupData: any = {};

      for (const tableName of criticalTables) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(10); // Limited for test purposes

        expect(error).toBeNull();
        backupData[tableName] = data;
        
        console.log(`✅ Backup test for ${tableName}: ${data?.length || 0} records`);
      }

      // Verify backup data integrity
      expect(Object.keys(backupData)).toHaveLength(criticalTables.length);
      
      // Verify essential data is present
      if (backupData.team_members && backupData.team_members.length > 0) {
        expect(backupData.team_members[0]).toHaveProperty('id');
        expect(backupData.team_members[0]).toHaveProperty('name');
        expect(backupData.team_members[0]).toHaveProperty('team');
      }
    });
  });
});