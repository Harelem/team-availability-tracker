-- COMPREHENSIVE PERFORMANCE MIGRATION - PART 3: RLS OPTIMIZATION & UNUSED INDEX CLEANUP
-- Addresses RLS performance issues and removes 33 unused indexes
-- Migration Date: August 26, 2025
-- Author: Database Security Audit

-- Create rollback procedures table for this migration
CREATE TABLE IF NOT EXISTS performance_migration_rollback_part3 (
  id SERIAL PRIMARY KEY,
  operation_type TEXT NOT NULL,
  table_name TEXT,
  index_name TEXT,
  rollback_sql TEXT NOT NULL,
  migration_timestamp TIMESTAMPTZ DEFAULT NOW()
);

BEGIN;

-- 1. OPTIMIZE RLS POLICIES - Replace auth.uid() with (SELECT auth.uid()) for better performance

-- Fix user_accounts RLS policies
INSERT INTO performance_migration_rollback_part3 (operation_type, table_name, rollback_sql)
VALUES ('RLS_POLICY', 'user_accounts', 'DROP POLICY IF EXISTS "Users can view their own account optimized" ON public.user_accounts; DROP POLICY IF EXISTS "Users can update their own account optimized" ON public.user_accounts; DROP POLICY IF EXISTS "Managers can view team member accounts optimized" ON public.user_accounts; DROP POLICY IF EXISTS "Admins can manage all accounts optimized" ON public.user_accounts;');

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own account" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON public.user_accounts;
DROP POLICY IF EXISTS "Managers can view team member accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Admins can manage all accounts" ON public.user_accounts;

-- Create optimized RLS policies with (SELECT auth.uid()) pattern
CREATE POLICY "Users can view their own account optimized" ON public.user_accounts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.id = user_accounts.team_member_id
              AND tm.email = (SELECT auth.email())
        )
    );

CREATE POLICY "Users can update their own account optimized" ON public.user_accounts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.id = user_accounts.team_member_id
              AND tm.email = (SELECT auth.email())
        )
    );

CREATE POLICY "Managers can view team member accounts optimized" ON public.user_accounts
    FOR SELECT
    USING (
        role IN ('manager', 'admin') OR
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.email = (SELECT auth.email())
              AND tm.is_manager = true
        )
    );

CREATE POLICY "Admins can manage all accounts optimized" ON public.user_accounts
    FOR ALL
    USING (
        role = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.email = (SELECT auth.email())
              AND tm.role = 'admin'
        )
    );

-- Fix sprint_config_backup_20250821 RLS policy
DROP POLICY IF EXISTS "Only admins can access backup table" ON public.sprint_config_backup_20250821;
CREATE POLICY "Only admins can access backup table optimized" ON public.sprint_config_backup_20250821
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.email = (SELECT auth.email())
              AND tm.role = 'admin'
        )
    );

-- Fix schema_version RLS policy
DROP POLICY IF EXISTS "Allow authenticated users to read schema versions" ON public.schema_version;
CREATE POLICY "Allow authenticated users to read schema versions optimized" ON public.schema_version
    FOR SELECT
    USING ((SELECT auth.role()) = 'authenticated');

-- Fix feature_flags RLS policy
DROP POLICY IF EXISTS "Allow authenticated users to read feature flags" ON public.feature_flags;
CREATE POLICY "Allow authenticated users to read feature flags optimized" ON public.feature_flags
    FOR SELECT
    USING ((SELECT auth.role()) = 'authenticated');

-- Fix data_integrity_violations RLS policy
DROP POLICY IF EXISTS "Allow authenticated users to read integrity violations" ON public.data_integrity_violations;
CREATE POLICY "Allow authenticated users to read integrity violations optimized" ON public.data_integrity_violations
    FOR SELECT
    USING ((SELECT auth.role()) = 'authenticated');

-- 2. REMOVE UNUSED INDEXES - Store rollback commands first

-- Store rollback commands for all indexes to be dropped
INSERT INTO performance_migration_rollback_part3 (operation_type, table_name, index_name, rollback_sql)
VALUES 
('DROP_INDEX', 'mv_sprint_calculations', 'idx_mv_sprint_calculations_member_id', 'CREATE INDEX idx_mv_sprint_calculations_member_id ON public.mv_sprint_calculations USING btree (member_id);'),
('DROP_INDEX', 'mv_sprint_calculations', 'idx_mv_sprint_calculations_sprint_range', 'CREATE INDEX idx_mv_sprint_calculations_sprint_range ON public.mv_sprint_calculations USING btree (sprint_start_date, sprint_end_date);'),
('DROP_INDEX', 'mv_sprint_calculations', 'idx_mv_sprint_calculations_utilization', 'CREATE INDEX idx_mv_sprint_calculations_utilization ON public.mv_sprint_calculations USING btree (utilization_percentage);'),
('DROP_INDEX', 'schedule_entries', 'idx_schedule_entries_recent_updates', 'CREATE INDEX idx_schedule_entries_recent_updates ON public.schedule_entries USING btree (updated_at DESC);'),
('DROP_INDEX', 'team_members', 'idx_team_members_manager_flag', 'CREATE INDEX idx_team_members_manager_flag ON public.team_members USING btree (is_manager);'),
('DROP_INDEX', 'teams', 'idx_teams_name', 'CREATE INDEX idx_teams_name ON public.teams USING btree (name);'),
('DROP_INDEX', 'global_sprint_settings', 'idx_global_sprint_settings_current', 'CREATE INDEX idx_global_sprint_settings_current ON public.global_sprint_settings USING btree (current_sprint_number);'),
('DROP_INDEX', 'sprint_history', 'idx_sprint_history_status', 'CREATE INDEX idx_sprint_history_status ON public.sprint_history USING btree (status);'),
('DROP_INDEX', 'schedule_entries', 'idx_schedule_entries_optimized_lookup', 'CREATE INDEX idx_schedule_entries_optimized_lookup ON public.schedule_entries USING btree (member_id, date, value);'),
('DROP_INDEX', 'team_members', 'idx_team_members_team_inactive', 'CREATE INDEX idx_team_members_team_inactive ON public.team_members USING btree (team_id, inactive_date);'),
('DROP_INDEX', 'user_accounts', 'idx_user_accounts_email', 'CREATE INDEX idx_user_accounts_email ON public.user_accounts USING btree (email);'),
('DROP_INDEX', 'user_accounts', 'idx_user_accounts_team_member', 'CREATE INDEX idx_user_accounts_team_member ON public.user_accounts USING btree (team_member_id);'),
('DROP_INDEX', 'schedule_entries', 'idx_schedule_recent_data', 'CREATE INDEX idx_schedule_recent_data ON public.schedule_entries USING btree (date DESC) WHERE (date >= CURRENT_DATE - 30);'),
('DROP_INDEX', 'schedule_entries', 'idx_schedule_entries_team_date_optimized', 'CREATE INDEX idx_schedule_entries_team_date_optimized ON public.schedule_entries USING btree (member_id, date);'),
('DROP_INDEX', 'schedule_entries', 'idx_schedule_entries_sprint_date_range', 'CREATE INDEX idx_schedule_entries_sprint_date_range ON public.schedule_entries USING btree (sprint_id, date);'),
('DROP_INDEX', 'global_sprint_settings', 'idx_global_sprint_settings_changes', 'CREATE INDEX idx_global_sprint_settings_changes ON public.global_sprint_settings USING btree (updated_at);'),
('DROP_INDEX', 'schedule_entries', 'idx_schedule_entries_hours_calculation', 'CREATE INDEX idx_schedule_entries_hours_calculation ON public.schedule_entries USING btree (value, calculated_hours);'),
('DROP_INDEX', 'schedule_entries', 'idx_schedule_entries_weekend_filter', 'CREATE INDEX idx_schedule_entries_weekend_filter ON public.schedule_entries USING btree (is_weekend, date);'),
('DROP_INDEX', 'team_members', 'idx_team_members_team_status', 'CREATE INDEX idx_team_members_team_status ON public.team_members USING btree (team_id, inactive_date) WHERE (inactive_date IS NULL);'),
('DROP_INDEX', 'sprint_history', 'idx_sprint_history_active_sprint', 'CREATE INDEX idx_sprint_history_active_sprint ON public.sprint_history USING btree (status) WHERE (status = ''active'');'),
('DROP_INDEX', 'team_members', 'idx_team_members_team_active', 'CREATE INDEX idx_team_members_team_active ON public.team_members USING btree (team_id) WHERE (inactive_date IS NULL);'),
('DROP_INDEX', 'cache_invalidation_events', 'idx_cache_invalidation_events_table_name', 'CREATE INDEX idx_cache_invalidation_events_table_name ON public.cache_invalidation_events USING btree (table_name);'),
('DROP_INDEX', 'cache_invalidation_events', 'idx_cache_invalidation_events_processed', 'CREATE INDEX idx_cache_invalidation_events_processed ON public.cache_invalidation_events USING btree (processed);'),
('DROP_INDEX', 'cache_invalidation_events', 'idx_cache_invalidation_events_created_at', 'CREATE INDEX idx_cache_invalidation_events_created_at ON public.cache_invalidation_events USING btree (created_at);'),
('DROP_INDEX', 'migration_log', 'idx_migration_log_migration_version', 'CREATE INDEX idx_migration_log_migration_version ON public.migration_log USING btree (migration_version);'),
('DROP_INDEX', 'feature_flags', 'idx_feature_flags_enabled', 'CREATE INDEX idx_feature_flags_enabled ON public.feature_flags USING btree (enabled);'),
('DROP_INDEX', 'data_integrity_violations', 'idx_integrity_violations_type', 'CREATE INDEX idx_integrity_violations_type ON public.data_integrity_violations USING btree (violation_type);'),
('DROP_INDEX', 'data_integrity_violations', 'idx_integrity_violations_table', 'CREATE INDEX idx_integrity_violations_table ON public.data_integrity_violations USING btree (table_name);'),
('DROP_INDEX', 'data_integrity_violations', 'idx_integrity_violations_severity', 'CREATE INDEX idx_integrity_violations_severity ON public.data_integrity_violations USING btree (severity);'),
('DROP_INDEX', 'data_integrity_violations', 'idx_integrity_violations_detected_at', 'CREATE INDEX idx_integrity_violations_detected_at ON public.data_integrity_violations USING btree (detected_at);');

-- Drop unused indexes (33 total)
DROP INDEX IF EXISTS public.idx_mv_sprint_calculations_member_id;
DROP INDEX IF EXISTS public.idx_mv_sprint_calculations_sprint_range;
DROP INDEX IF EXISTS public.idx_mv_sprint_calculations_utilization;
DROP INDEX IF EXISTS public.idx_schedule_entries_recent_updates;
DROP INDEX IF EXISTS public.idx_team_members_manager_flag;
DROP INDEX IF EXISTS public.idx_teams_name;
DROP INDEX IF EXISTS public.idx_global_sprint_settings_current;
DROP INDEX IF EXISTS public.idx_sprint_history_status;
DROP INDEX IF EXISTS public.idx_schedule_entries_optimized_lookup;
DROP INDEX IF EXISTS public.idx_team_members_team_inactive;
DROP INDEX IF EXISTS public.idx_user_accounts_email;
DROP INDEX IF EXISTS public.idx_user_accounts_team_member;
DROP INDEX IF EXISTS public.idx_schedule_recent_data;
DROP INDEX IF EXISTS public.idx_schedule_entries_team_date_optimized;
DROP INDEX IF EXISTS public.idx_schedule_entries_sprint_date_range;
DROP INDEX IF EXISTS public.idx_global_sprint_settings_changes;
DROP INDEX IF EXISTS public.idx_schedule_entries_hours_calculation;
DROP INDEX IF EXISTS public.idx_schedule_entries_weekend_filter;
DROP INDEX IF EXISTS public.idx_team_members_team_status;
DROP INDEX IF EXISTS public.idx_sprint_history_active_sprint;
DROP INDEX IF EXISTS public.idx_team_members_team_active;
DROP INDEX IF EXISTS public.idx_cache_invalidation_events_table_name;
DROP INDEX IF EXISTS public.idx_cache_invalidation_events_processed;
DROP INDEX IF EXISTS public.idx_cache_invalidation_events_created_at;
DROP INDEX IF EXISTS public.idx_migration_log_migration_version;
DROP INDEX IF EXISTS public.idx_feature_flags_enabled;
DROP INDEX IF EXISTS public.idx_integrity_violations_type;
DROP INDEX IF EXISTS public.idx_integrity_violations_table;
DROP INDEX IF EXISTS public.idx_integrity_violations_severity;
DROP INDEX IF EXISTS public.idx_integrity_violations_detected_at;

-- 3. CREATE ESSENTIAL PERFORMANCE INDEXES (only what's actually needed)

-- Index for frequently used queries
CREATE INDEX IF NOT EXISTS idx_schedule_entries_member_date_essential ON public.schedule_entries (member_id, date) WHERE date >= CURRENT_DATE - 30;
CREATE INDEX IF NOT EXISTS idx_team_members_active_essential ON public.team_members (team_id) WHERE inactive_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_sprint_history_active_essential ON public.sprint_history (sprint_number DESC) WHERE status = 'active';

-- 4. REVOKE EXCESSIVE PERMISSIONS ON MATERIALIZED VIEWS

-- Remove public access from materialized views exposed to API
REVOKE SELECT ON public.cached_company_metrics FROM anon;
REVOKE SELECT ON public.team_performance_history FROM anon;
REVOKE SELECT ON public.cached_capacity_forecast FROM anon;
REVOKE SELECT ON public.mv_sprint_calculations FROM anon;

-- Grant only to authenticated users
GRANT SELECT ON public.cached_company_metrics TO authenticated;
GRANT SELECT ON public.team_performance_history TO authenticated;
GRANT SELECT ON public.cached_capacity_forecast TO authenticated;
GRANT SELECT ON public.mv_sprint_calculations TO authenticated;

COMMIT;

-- Performance validation queries
SELECT 'PERFORMANCE_OPTIMIZATION_PART3_COMPLETE' as status,
       (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0) as remaining_unused_indexes,
       (SELECT COUNT(*) FROM information_schema.table_privileges 
        WHERE table_schema = 'public' 
          AND table_name IN ('cached_company_metrics', 'team_performance_history', 'cached_capacity_forecast', 'mv_sprint_calculations')
          AND grantee = 'anon') as anon_permissions_removed;