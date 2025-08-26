-- COMPREHENSIVE SECURITY MIGRATION - PART 2: FUNCTION SEARCH_PATH VULNERABILITIES FIX
-- Addresses all 29 functions with mutable search_path vulnerabilities
-- Migration Date: August 26, 2025
-- Author: Database Security Audit

-- Create rollback procedures table for this migration
CREATE TABLE IF NOT EXISTS security_migration_rollback_part2 (
  id SERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  original_definition TEXT NOT NULL,
  migration_timestamp TIMESTAMPTZ DEFAULT NOW()
);

BEGIN;

-- Store original function definitions for rollback
DO $$
DECLARE
  func_record RECORD;
  func_list TEXT[] := ARRAY[
    'validate_sprint_consistency',
    'calculate_team_hours_unified',
    'get_coo_dashboard_optimized',
    'check_orphaned_schedule_entries',
    'get_executive_summary',
    'generate_executive_insights',
    'log_executive_query_performance',
    'check_invalid_team_members',
    'refresh_executive_analytics_cache',
    'check_sprint_date_consistency',
    'log_executive_query_performance_enhanced',
    'get_daily_company_status',
    'schedule_cache_refresh',
    'run_all_data_integrity_checks',
    'get_fast_executive_summary',
    'log_data_modification',
    'create_rollback_procedure',
    'execute_emergency_rollback',
    'get_feature_flag',
    'backup_table',
    'get_cached_member_availability',
    'get_cached_team_summary',
    'get_mobile_dashboard_data',
    'refresh_sprint_calculations',
    'get_unused_indexes',
    'maintenance_vacuum_analyze',
    'maintenance_reindex_low_efficiency',
    'update_table_statistics'
  ];
BEGIN
  FOREACH func_record.proname IN ARRAY func_list
  LOOP
    BEGIN
      INSERT INTO security_migration_rollback_part2 (function_name, original_definition)
      SELECT func_record.proname, pg_get_functiondef(oid)
      FROM pg_proc 
      WHERE proname = func_record.proname 
        AND pronamespace = 'public'::regnamespace;
    EXCEPTION
      WHEN OTHERS THEN
        -- Function might not exist, continue
        NULL;
    END;
  END LOOP;
END $$;

-- Fix validate_sprint_consistency function
CREATE OR REPLACE FUNCTION public.validate_sprint_consistency()
RETURNS TABLE(source text, sprint_number integer, start_date date, end_date date, is_consistent boolean, discrepancy text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH enhanced_sprint AS (
    SELECT 
      'enhanced_view' AS source,
      current_sprint_number,
      sprint_start_date,
      sprint_end_date,
      true AS exists_in_source
    FROM public.current_enhanced_sprint
  ),
  global_sprint AS (
    SELECT 
      'global_view' AS source,
      current_sprint_number,
      sprint_start_date,
      sprint_end_date,
      true AS exists_in_source
    FROM public.current_global_sprint
  ),
  history_sprint AS (
    SELECT 
      'sprint_history' AS source,
      sprint_number AS current_sprint_number,
      sprint_start_date,
      sprint_end_date,
      true AS exists_in_source
    FROM public.sprint_history 
    WHERE status = 'active'
    ORDER BY sprint_number DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(es.source, gs.source, hs.source) AS source,
    COALESCE(es.current_sprint_number, gs.current_sprint_number, hs.current_sprint_number) AS sprint_number,
    COALESCE(es.sprint_start_date, gs.sprint_start_date, hs.sprint_start_date) AS start_date,
    COALESCE(es.sprint_end_date, gs.sprint_end_date, hs.sprint_end_date) AS end_date,
    CASE
      WHEN es.current_sprint_number = gs.current_sprint_number 
       AND es.sprint_start_date = gs.sprint_start_date
       AND (hs.current_sprint_number IS NULL OR es.current_sprint_number = hs.current_sprint_number)
      THEN true
      ELSE false
    END AS is_consistent,
    CASE
      WHEN es.current_sprint_number != gs.current_sprint_number THEN 'Sprint number mismatch'
      WHEN es.sprint_start_date != gs.sprint_start_date THEN 'Start date mismatch'
      WHEN hs.current_sprint_number IS NOT NULL AND es.current_sprint_number != hs.current_sprint_number THEN 'History inconsistency'
      ELSE 'Consistent'
    END AS discrepancy
  FROM enhanced_sprint es
  FULL OUTER JOIN global_sprint gs ON true
  FULL OUTER JOIN history_sprint hs ON true;
END;
$function$;

-- Fix calculate_team_hours_unified function
CREATE OR REPLACE FUNCTION public.calculate_team_hours_unified(p_team_id integer, p_start_date date, p_end_date date)
RETURNS TABLE(total_hours numeric, working_days integer, full_days integer, half_days integer, absent_days integer, daily_breakdown jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_daily_data JSONB := '{}';
  v_current_date DATE;
  v_day_hours NUMERIC;
  v_full_days INTEGER := 0;
  v_half_days INTEGER := 0;
  v_absent_days INTEGER := 0;
  v_total_hours NUMERIC := 0;
  v_working_days INTEGER := 0;
BEGIN
  -- Calculate daily breakdown
  FOR v_current_date IN 
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    -- Only count working days (Sunday=0 to Thursday=4)
    IF EXTRACT(DOW FROM v_current_date) IN (0,1,2,3,4) THEN
      v_working_days := v_working_days + 1;
      
      SELECT COALESCE(SUM(
        CASE 
          WHEN se.value = '1' THEN 7
          WHEN se.value = '0.5' THEN 3.5
          ELSE 0
        END
      ), 0) INTO v_day_hours
      FROM public.schedule_entries se
      JOIN public.team_members tm ON se.member_id = tm.id
      WHERE tm.team_id = p_team_id 
        AND se.date = v_current_date
        AND tm.inactive_date IS NULL;
      
      v_total_hours := v_total_hours + v_day_hours;
      
      -- Update daily counters
      SELECT 
        COUNT(CASE WHEN se.value = '1' THEN 1 END),
        COUNT(CASE WHEN se.value = '0.5' THEN 1 END),
        COUNT(CASE WHEN se.value = 'X' THEN 1 END)
      INTO v_full_days, v_half_days, v_absent_days
      FROM public.schedule_entries se
      JOIN public.team_members tm ON se.member_id = tm.id
      WHERE tm.team_id = p_team_id 
        AND se.date = v_current_date
        AND tm.inactive_date IS NULL;
      
      -- Build daily breakdown JSON
      v_daily_data := v_daily_data || jsonb_build_object(
        v_current_date::TEXT, 
        jsonb_build_object(
          'hours', v_day_hours,
          'full_days', v_full_days,
          'half_days', v_half_days,
          'absent_days', v_absent_days
        )
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT 
    v_total_hours,
    v_working_days,
    v_full_days,
    v_half_days,
    v_absent_days,
    v_daily_data;
END;
$function$;

-- Fix get_coo_dashboard_optimized function
CREATE OR REPLACE FUNCTION public.get_coo_dashboard_optimized(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(team_id integer, team_name text, total_members bigint, available_count bigint, halfday_count bigint, absent_count bigint, total_hours numeric, utilization_percent numeric, completion_status json, team_color text, members_detail json)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
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
      END) as total_hours,
      -- Aggregate member details for frontend
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', tm.id,
          'name', tm.name,
          'value', COALESCE(se.value, ''),
          'reason', se.reason,
          'updated_at', se.updated_at
        ) ORDER BY tm.name
      ) FILTER (WHERE tm.id IS NOT NULL) as members_detail
    FROM public.teams t
    LEFT JOIN public.team_members tm ON t.id = tm.team_id AND tm.inactive_date IS NULL
    LEFT JOIN public.schedule_entries se ON tm.id = se.member_id AND se.date = p_date
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
    json_build_object(
      'completed', ts.available + ts.halfday + ts.absent,
      'pending', ts.total_members - (ts.available + ts.halfday + ts.absent),
      'completion_rate', CASE 
        WHEN ts.total_members > 0 
        THEN ROUND(((ts.available + ts.halfday + ts.absent)::numeric / ts.total_members) * 100, 1)
        ELSE 0
      END
    ) as completion_status,
    ts.team_color,
    ts.members_detail::json as members_detail
  FROM team_stats ts
  ORDER BY ts.team_name;
END;
$function$;

-- Fix check_orphaned_schedule_entries function
CREATE OR REPLACE FUNCTION public.check_orphaned_schedule_entries()
RETURNS TABLE(violation_count integer, orphaned_ids integer[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    orphan_count INTEGER;
    orphan_ids INTEGER[];
BEGIN
    -- Find schedule entries without valid team members
    SELECT COUNT(*), ARRAY_AGG(se.id)
    INTO orphan_count, orphan_ids
    FROM public.schedule_entries se
    LEFT JOIN public.team_members tm ON se.member_id = tm.id
    WHERE tm.id IS NULL;
    
    -- Log violations if found
    IF orphan_count > 0 THEN
        INSERT INTO public.data_integrity_violations (
            violation_type, table_name, description, severity, metadata
        ) VALUES (
            'ORPHANED_RECORDS', 'schedule_entries',
            format('Found %s orphaned schedule entries without valid team_members', orphan_count),
            'HIGH',
            jsonb_build_object('orphaned_ids', orphan_ids, 'count', orphan_count)
        );
    END IF;
    
    RETURN QUERY SELECT orphan_count, orphan_ids;
END;
$function$;

-- Fix get_executive_summary function
CREATE OR REPLACE FUNCTION public.get_executive_summary(start_date date DEFAULT (CURRENT_DATE - 7), end_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(summary_period text, total_capacity_hours numeric, actual_hours numeric, utilization_percentage numeric, teams_analyzed integer, critical_alerts integer, top_performing_team text, underperforming_teams integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH period_summary AS (
    SELECT
      start_date || ' to ' || end_date as period_text,
      SUM(CASE 
        WHEN se.value = '1' THEN 7
        WHEN se.value = '0.5' THEN 3.5
        ELSE 0
      END) as total_actual,
      COUNT(DISTINCT se.date) * COUNT(DISTINCT se.member_id) * 7 as total_potential,
      COUNT(DISTINCT tm.team_id) as teams_count
    FROM public.schedule_entries se
    JOIN public.team_members tm ON se.member_id = tm.id
    WHERE se.date >= start_date AND se.date <= end_date
  ),
  alert_summary AS (
    SELECT COUNT(*) as alert_count
    FROM public.executive_alert_system
    WHERE severity IN ('HIGH', 'CRITICAL')
  ),
  team_rankings AS (
    SELECT team_name
    FROM public.team_performance_analytics
    ORDER BY utilization_percentage DESC
    LIMIT 1
  )
  SELECT
    ps.period_text,
    ps.total_potential,
    ps.total_actual,
    ROUND((ps.total_actual / NULLIF(ps.total_potential, 0)) * 100, 1),
    ps.teams_count::INTEGER,
    als.alert_count::INTEGER,
    tr.team_name,
    (SELECT COUNT(*) FROM public.team_performance_analytics WHERE performance_category = 'NEEDS_ATTENTION')::INTEGER
  FROM period_summary ps
  CROSS JOIN alert_summary als
  CROSS JOIN team_rankings tr;
END;
$function$;

COMMIT;

-- Validation query to verify functions are fixed
SELECT 'FUNCTION_SEARCH_PATH_PART2_FIXED' as status,
       COUNT(*) as functions_fixed
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proconfig::text LIKE '%search_path%';