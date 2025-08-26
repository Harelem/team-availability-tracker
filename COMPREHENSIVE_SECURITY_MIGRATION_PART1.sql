-- COMPREHENSIVE SECURITY MIGRATION - PART 1: SECURITY DEFINER VIEWS FIX
-- Addresses all 14 Security Definer Views that bypass RLS policies
-- Migration Date: August 26, 2025
-- Author: Database Security Audit

-- Create rollback procedures table for this migration
CREATE TABLE IF NOT EXISTS security_migration_rollback_part1 (
  id SERIAL PRIMARY KEY,
  view_name TEXT NOT NULL,
  original_definition TEXT NOT NULL,
  migration_timestamp TIMESTAMPTZ DEFAULT NOW()
);

BEGIN;

-- Store original definitions for rollback
INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'index_usage_stats', pg_get_viewdef('public.index_usage_stats'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'coo_dashboard_optimized', pg_get_viewdef('public.coo_dashboard_optimized'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'executive_daily_intelligence', pg_get_viewdef('public.executive_daily_intelligence'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'current_global_sprint', pg_get_viewdef('public.current_global_sprint'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'team_performance_analytics', pg_get_viewdef('public.team_performance_analytics'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'sprint_calendar_view', pg_get_viewdef('public.sprint_calendar_view'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'v_performance_metrics', pg_get_viewdef('public.v_performance_metrics'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'executive_alert_system', pg_get_viewdef('public.executive_alert_system'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'table_bloat_stats', pg_get_viewdef('public.table_bloat_stats'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'current_enhanced_sprint', pg_get_viewdef('public.current_enhanced_sprint'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'capacity_forecast_analytics', pg_get_viewdef('public.capacity_forecast_analytics'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'schedule_entries_with_hours', pg_get_viewdef('public.schedule_entries_with_hours'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'team_sprint_stats', pg_get_viewdef('public.team_sprint_stats'::regclass, true);

INSERT INTO security_migration_rollback_part1 (view_name, original_definition)
SELECT 'performance_summary', pg_get_viewdef('public.performance_summary'::regclass, true);

-- 1. Fix index_usage_stats view - Remove SECURITY DEFINER
DROP VIEW IF EXISTS public.index_usage_stats CASCADE;
CREATE VIEW public.index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Grant permissions to authenticated users only
GRANT SELECT ON public.index_usage_stats TO authenticated;
REVOKE SELECT ON public.index_usage_stats FROM anon;

-- 2. Fix coo_dashboard_optimized view - Remove SECURITY DEFINER
DROP VIEW IF EXISTS public.coo_dashboard_optimized CASCADE;
CREATE VIEW public.coo_dashboard_optimized AS
WITH team_stats AS (
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.color as team_color,
    COUNT(DISTINCT tm.id) as total_members,
    COUNT(DISTINCT CASE WHEN se.value = '1' THEN tm.id END) as available,
    COUNT(DISTINCT CASE WHEN se.value = '0.5' THEN tm.id END) as halfday,
    COUNT(DISTINCT CASE WHEN se.value = 'X' THEN tm.id END) as absent,
    SUM(CASE 
      WHEN se.value = '1' THEN 7
      WHEN se.value = '0.5' THEN 3.5
      ELSE 0
    END) as total_hours
  FROM teams t
  LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.inactive_date IS NULL
  LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = CURRENT_DATE
  WHERE t.name != 'Management Team'
  GROUP BY t.id, t.name, t.color
)
SELECT 
  ts.team_id,
  ts.team_name,
  ts.total_members,
  ts.available,
  ts.halfday,
  ts.absent,
  ts.total_hours,
  CASE 
    WHEN ts.total_members > 0 
    THEN ROUND((ts.total_hours / (ts.total_members * 7)) * 100, 1)
    ELSE 0
  END as utilization_percent,
  ts.team_color
FROM team_stats ts
ORDER BY ts.team_name;

-- Enable RLS and grant proper permissions
ALTER VIEW public.coo_dashboard_optimized OWNER TO postgres;
GRANT SELECT ON public.coo_dashboard_optimized TO authenticated;
REVOKE SELECT ON public.coo_dashboard_optimized FROM anon;

-- 3. Fix executive_daily_intelligence view - Remove SECURITY DEFINER
DROP VIEW IF EXISTS public.executive_daily_intelligence CASCADE;
CREATE VIEW public.executive_daily_intelligence AS
SELECT 
    'daily_intelligence'::TEXT as report_type,
    CURRENT_DATE as report_date,
    COUNT(DISTINCT tm.team_id) as teams_analyzed,
    COUNT(DISTINCT tm.id) as total_members,
    SUM(CASE WHEN se.value = '1' THEN 1 ELSE 0 END) as available_count,
    SUM(CASE WHEN se.value = '0.5' THEN 1 ELSE 0 END) as halfday_count,
    SUM(CASE WHEN se.value = 'X' THEN 1 ELSE 0 END) as absent_count,
    ROUND(
        (SUM(CASE WHEN se.value = '1' THEN 1 ELSE 0 END)::NUMERIC / 
         NULLIF(COUNT(DISTINCT tm.id), 0)) * 100, 1
    ) as availability_percentage
FROM team_members tm
LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = CURRENT_DATE
WHERE tm.inactive_date IS NULL;

-- Enable proper permissions
GRANT SELECT ON public.executive_daily_intelligence TO authenticated;
REVOKE SELECT ON public.executive_daily_intelligence FROM anon;

-- 4. Fix current_global_sprint view - Remove SECURITY DEFINER
DROP VIEW IF EXISTS public.current_global_sprint CASCADE;
CREATE VIEW public.current_global_sprint AS
SELECT 
    gss.id,
    gss.current_sprint_number,
    gss.sprint_length_weeks,
    gss.sprint_start_date,
    gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL as sprint_end_date,
    CASE 
        WHEN CURRENT_DATE < gss.sprint_start_date THEN 0
        WHEN CURRENT_DATE > gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL THEN 100
        ELSE ROUND(
            (EXTRACT(EPOCH FROM CURRENT_DATE - gss.sprint_start_date) / 
             EXTRACT(EPOCH FROM (gss.sprint_length_weeks * 7 || ' days')::INTERVAL)) * 100, 1
        )
    END as progress_percentage,
    GREATEST(0, 
        EXTRACT(DAYS FROM 
            (gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL) - CURRENT_DATE
        )::INTEGER
    ) as days_remaining,
    CASE 
        WHEN CURRENT_DATE BETWEEN gss.sprint_start_date AND 
             gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL
        THEN TRUE
        ELSE FALSE
    END as is_active,
    gss.created_at,
    gss.updated_at,
    gss.updated_by
FROM global_sprint_settings gss
ORDER BY gss.id DESC
LIMIT 1;

-- Enable proper permissions
GRANT SELECT ON public.current_global_sprint TO authenticated;
REVOKE SELECT ON public.current_global_sprint FROM anon;

COMMIT;

-- Validation queries to verify the fix worked
SELECT 'SECURITY_DEFINER_VIEWS_PART1_FIXED' as status,
       COUNT(*) as views_fixed
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('index_usage_stats', 'coo_dashboard_optimized', 'executive_daily_intelligence', 'current_global_sprint');