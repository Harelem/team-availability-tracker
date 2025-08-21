-- V2.2 Data Flow Optimization and Synchronization Enhancement
-- Fixes critical data flow inconsistencies and optimizes calculation performance
-- Ensures synchronized data between COO dashboard and team views

-- ================================================
-- SPRINT DATE SYNCHRONIZATION ENHANCEMENT
-- ================================================

-- Create the missing current_enhanced_sprint view for consistent sprint data access
CREATE OR REPLACE VIEW current_enhanced_sprint AS
WITH sprint_consistency_check AS (
  -- Cross-validate sprint data from multiple sources
  SELECT 
    gs.id,
    gs.current_sprint_number,
    gs.sprint_start_date,
    gs.sprint_length_weeks,
    -- Calculate consistent end date
    (gs.sprint_start_date + INTERVAL '1 day' * (gs.sprint_length_weeks * 7 - 1))::date AS sprint_end_date,
    -- Validate against sprint_history for consistency
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM sprint_history sh 
        WHERE sh.sprint_number = gs.current_sprint_number 
          AND sh.sprint_start_date = gs.sprint_start_date
          AND sh.status = 'active'
      ) THEN 'validated'
      ELSE 'needs_validation'
    END AS validation_status,
    gs.created_at,
    gs.updated_at,
    gs.updated_by
  FROM global_sprint_settings gs
  ORDER BY gs.id DESC
  LIMIT 1
)
SELECT 
  scc.id,
  scc.current_sprint_number,
  scc.sprint_start_date,
  scc.sprint_end_date,
  scc.sprint_length_weeks,
  -- Enhanced progress calculation with validation
  CASE
    WHEN CURRENT_DATE < scc.sprint_start_date THEN 0::numeric
    WHEN CURRENT_DATE > scc.sprint_end_date THEN 100::numeric
    ELSE LEAST(100::numeric, GREATEST(0::numeric, 
      ROUND((CURRENT_DATE - scc.sprint_start_date)::numeric * 100.0 / 
            (scc.sprint_end_date - scc.sprint_start_date + 1)::numeric, 2)
    ))
  END AS progress_percentage,
  -- Enhanced days remaining calculation
  GREATEST(0, scc.sprint_end_date - CURRENT_DATE) AS days_remaining,
  (scc.sprint_end_date - scc.sprint_start_date + 1) AS total_days,
  -- Enhanced active status with validation
  CASE
    WHEN CURRENT_DATE >= scc.sprint_start_date 
     AND CURRENT_DATE <= scc.sprint_end_date 
     AND scc.validation_status = 'validated' THEN true
    ELSE false
  END AS is_active,
  scc.validation_status,
  scc.created_at,
  scc.updated_at,
  scc.updated_by,
  -- Add sync timestamp for real-time validation
  NOW() AS sync_timestamp
FROM sprint_consistency_check scc;

-- Create sprint validation function for data consistency
CREATE OR REPLACE FUNCTION validate_sprint_consistency()
RETURNS TABLE (
  source TEXT,
  sprint_number INTEGER,
  start_date DATE,
  end_date DATE,
  is_consistent BOOLEAN,
  discrepancy TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH enhanced_sprint AS (
    SELECT 
      'enhanced_view' AS source,
      current_sprint_number,
      sprint_start_date,
      sprint_end_date,
      true AS exists_in_source
    FROM current_enhanced_sprint
  ),
  global_sprint AS (
    SELECT 
      'global_view' AS source,
      current_sprint_number,
      sprint_start_date,
      sprint_end_date,
      true AS exists_in_source
    FROM current_global_sprint
  ),
  history_sprint AS (
    SELECT 
      'sprint_history' AS source,
      sprint_number AS current_sprint_number,
      sprint_start_date,
      sprint_end_date,
      true AS exists_in_source
    FROM sprint_history 
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
$$ LANGUAGE plpgsql;

-- ================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ================================================

-- Create optimized indexes for COO dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_entries_member_date_value
ON schedule_entries(member_id, date, value)
WHERE value IN ('1', '0.5', 'X');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_entries_date_range_optimized
ON schedule_entries(date, member_id, value)
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_team_active
ON team_members(team_id, id)
WHERE inactive_date IS NULL;

-- Partial index for active teams with members
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_active_with_members
ON teams(id, name) 
WHERE EXISTS (
  SELECT 1 FROM team_members tm 
  WHERE tm.team_id = teams.id 
    AND tm.inactive_date IS NULL
);

-- ================================================
-- COO DASHBOARD OPTIMIZATION VIEW
-- ================================================

-- Create optimized materialized view for COO dashboard
CREATE OR REPLACE VIEW coo_dashboard_optimized AS
WITH team_metrics AS (
  SELECT 
    t.id AS team_id,
    t.name AS team_name,
    t.color,
    COUNT(DISTINCT tm.id) AS team_size,
    COUNT(DISTINCT CASE WHEN tm.is_manager THEN tm.id END) AS manager_count,
    -- Current sprint hours calculation
    COALESCE(SUM(
      CASE 
        WHEN se.value = '1' AND se.date BETWEEN ces.sprint_start_date AND ces.sprint_end_date 
        THEN 7
        WHEN se.value = '0.5' AND se.date BETWEEN ces.sprint_start_date AND ces.sprint_end_date 
        THEN 3.5
        ELSE 0
      END
    ), 0) AS sprint_hours,
    -- Current week hours calculation
    COALESCE(SUM(
      CASE 
        WHEN se.value = '1' AND se.date BETWEEN date_trunc('week', CURRENT_DATE)::date 
                                           AND (date_trunc('week', CURRENT_DATE) + INTERVAL '4 days')::date
        THEN 7
        WHEN se.value = '0.5' AND se.date BETWEEN date_trunc('week', CURRENT_DATE)::date 
                                              AND (date_trunc('week', CURRENT_DATE) + INTERVAL '4 days')::date
        THEN 3.5
        ELSE 0
      END
    ), 0) AS current_week_hours,
    -- Sprint capacity calculation
    (COUNT(DISTINCT tm.id) * ces.sprint_length_weeks * 5 * 7) AS total_capacity_hours,
    ces.current_sprint_number,
    ces.sprint_start_date,
    ces.sprint_end_date,
    ces.progress_percentage,
    ces.days_remaining
  FROM teams t
  LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.inactive_date IS NULL
  LEFT JOIN schedule_entries se ON tm.id = se.member_id
  CROSS JOIN current_enhanced_sprint ces
  GROUP BY t.id, t.name, t.color, ces.current_sprint_number, ces.sprint_start_date, 
           ces.sprint_end_date, ces.progress_percentage, ces.days_remaining, ces.sprint_length_weeks
),
company_totals AS (
  SELECT 
    SUM(team_size) AS total_team_members,
    SUM(manager_count) AS total_managers,
    SUM(sprint_hours) AS total_sprint_hours,
    SUM(current_week_hours) AS total_current_week_hours,
    SUM(total_capacity_hours) AS total_capacity_hours
  FROM team_metrics
)
SELECT 
  tm.*,
  -- Calculate utilization percentage
  CASE 
    WHEN tm.total_capacity_hours > 0 
    THEN ROUND((tm.sprint_hours * 100.0) / tm.total_capacity_hours, 2)
    ELSE 0
  END AS capacity_utilization,
  -- Add company totals for context
  ct.total_team_members,
  ct.total_managers,
  ct.total_sprint_hours,
  ct.total_current_week_hours,
  ct.total_capacity_hours,
  -- Performance metrics
  NOW() AS calculated_at
FROM team_metrics tm
CROSS JOIN company_totals ct
ORDER BY tm.team_name;

-- ================================================
-- CALCULATION CONSISTENCY FUNCTIONS
-- ================================================

-- Create unified hours calculation function
CREATE OR REPLACE FUNCTION calculate_team_hours_unified(
  p_team_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  total_hours NUMERIC,
  working_days INTEGER,
  full_days INTEGER,
  half_days INTEGER,
  absent_days INTEGER,
  daily_breakdown JSONB
) AS $$
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
      FROM schedule_entries se
      JOIN team_members tm ON se.member_id = tm.id
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
      FROM schedule_entries se
      JOIN team_members tm ON se.member_id = tm.id
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
$$ LANGUAGE plpgsql;

-- Create sprint capacity calculation function
CREATE OR REPLACE FUNCTION calculate_sprint_capacity_unified(
  p_team_id INTEGER DEFAULT NULL
) RETURNS TABLE (
  team_id INTEGER,
  team_name TEXT,
  team_size INTEGER,
  sprint_potential_hours NUMERIC,
  actual_hours NUMERIC,
  capacity_utilization NUMERIC,
  sprint_start_date DATE,
  sprint_end_date DATE,
  calculation_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH sprint_data AS (
    SELECT 
      sprint_start_date,
      sprint_end_date,
      sprint_length_weeks,
      current_sprint_number
    FROM current_enhanced_sprint
  ),
  team_capacity AS (
    SELECT 
      t.id AS team_id,
      t.name AS team_name,
      COUNT(DISTINCT tm.id) AS team_size,
      -- Calculate potential hours (team_size * working_days * hours_per_day)
      (COUNT(DISTINCT tm.id) * sd.sprint_length_weeks * 5 * 7) AS sprint_potential_hours,
      -- Calculate actual scheduled hours
      COALESCE(SUM(
        CASE 
          WHEN se.value = '1' AND se.date BETWEEN sd.sprint_start_date AND sd.sprint_end_date THEN 7
          WHEN se.value = '0.5' AND se.date BETWEEN sd.sprint_start_date AND sd.sprint_end_date THEN 3.5
          ELSE 0
        END
      ), 0) AS actual_hours,
      sd.sprint_start_date,
      sd.sprint_end_date
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.inactive_date IS NULL
    LEFT JOIN schedule_entries se ON tm.id = se.member_id
    CROSS JOIN sprint_data sd
    WHERE (p_team_id IS NULL OR t.id = p_team_id)
    GROUP BY t.id, t.name, sd.sprint_length_weeks, sd.sprint_start_date, sd.sprint_end_date
  )
  SELECT 
    tc.team_id,
    tc.team_name,
    tc.team_size,
    tc.sprint_potential_hours,
    tc.actual_hours,
    CASE 
      WHEN tc.sprint_potential_hours > 0 
      THEN ROUND((tc.actual_hours * 100.0) / tc.sprint_potential_hours, 2)
      ELSE 0
    END AS capacity_utilization,
    tc.sprint_start_date,
    tc.sprint_end_date,
    NOW() AS calculation_timestamp
  FROM team_capacity tc
  ORDER BY tc.team_name;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- CACHE INVALIDATION TRIGGERS
-- ================================================

-- Create cache invalidation function
CREATE OR REPLACE FUNCTION invalidate_cache_on_data_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert cache invalidation event for application to handle
  INSERT INTO cache_invalidation_events (table_name, operation_type, affected_id, created_at)
  VALUES (TG_TABLE_NAME, TG_OP, 
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create cache invalidation events table
CREATE TABLE IF NOT EXISTS cache_invalidation_events (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  operation_type VARCHAR(10) NOT NULL,
  affected_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for cache invalidation events
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_events_table_created
ON cache_invalidation_events(table_name, created_at);

-- Create triggers for cache invalidation
DROP TRIGGER IF EXISTS cache_invalidation_schedule_entries ON schedule_entries;
CREATE TRIGGER cache_invalidation_schedule_entries
  AFTER INSERT OR UPDATE OR DELETE ON schedule_entries
  FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_data_change();

DROP TRIGGER IF EXISTS cache_invalidation_team_members ON team_members;
CREATE TRIGGER cache_invalidation_team_members
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_data_change();

DROP TRIGGER IF EXISTS cache_invalidation_global_sprint_settings ON global_sprint_settings;
CREATE TRIGGER cache_invalidation_global_sprint_settings
  AFTER INSERT OR UPDATE OR DELETE ON global_sprint_settings
  FOR EACH ROW EXECUTE FUNCTION invalidate_cache_on_data_change();

-- ================================================
-- DATA INTEGRITY VALIDATION FUNCTIONS
-- ================================================

-- Create comprehensive data integrity validation function
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT,
  recommendations TEXT
) AS $$
BEGIN
  -- Check 1: Sprint data consistency
  RETURN QUERY
  SELECT 
    'Sprint Data Consistency' AS check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'FAIL'
      WHEN bool_and(is_consistent) THEN 'PASS'
      ELSE 'WARNING'
    END AS status,
    string_agg(source || ': ' || discrepancy, '; ') AS details,
    CASE 
      WHEN bool_and(is_consistent) THEN 'No action needed'
      ELSE 'Run sprint synchronization procedure'
    END AS recommendations
  FROM validate_sprint_consistency();
  
  -- Check 2: Team member data integrity
  RETURN QUERY
  WITH orphaned_schedule_entries AS (
    SELECT COUNT(*) AS count
    FROM schedule_entries se
    LEFT JOIN team_members tm ON se.member_id = tm.id
    WHERE tm.id IS NULL
  )
  SELECT 
    'Team Member Data Integrity' AS check_name,
    CASE WHEN count = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE 
      WHEN count = 0 THEN 'All schedule entries have valid team members'
      ELSE count::TEXT || ' orphaned schedule entries found'
    END AS details,
    CASE 
      WHEN count = 0 THEN 'No action needed'
      ELSE 'Clean up orphaned schedule entries'
    END AS recommendations
  FROM orphaned_schedule_entries;
  
  -- Check 3: Team hierarchy integrity
  RETURN QUERY
  WITH orphaned_team_members AS (
    SELECT COUNT(*) AS count
    FROM team_members tm
    LEFT JOIN teams t ON tm.team_id = t.id
    WHERE t.id IS NULL
  )
  SELECT 
    'Team Hierarchy Integrity' AS check_name,
    CASE WHEN count = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE 
      WHEN count = 0 THEN 'All team members belong to valid teams'
      ELSE count::TEXT || ' orphaned team members found'
    END AS details,
    CASE 
      WHEN count = 0 THEN 'No action needed'
      ELSE 'Assign orphaned members to teams or remove them'
    END AS recommendations
  FROM orphaned_team_members;
  
  -- Check 4: Schedule entry value validation
  RETURN QUERY
  WITH invalid_schedule_values AS (
    SELECT COUNT(*) AS count
    FROM schedule_entries
    WHERE value NOT IN ('1', '0.5', 'X')
  )
  SELECT 
    'Schedule Entry Values' AS check_name,
    CASE WHEN count = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE 
      WHEN count = 0 THEN 'All schedule entries have valid values'
      ELSE count::TEXT || ' invalid schedule values found'
    END AS details,
    CASE 
      WHEN count = 0 THEN 'No action needed'
      ELSE 'Fix invalid schedule entry values'
    END AS recommendations
  FROM invalid_schedule_values;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ================================================

-- Create query performance monitoring function
CREATE OR REPLACE FUNCTION monitor_query_performance(
  p_query_type TEXT,
  p_execution_time_ms INTEGER,
  p_table_name TEXT DEFAULT 'unknown',
  p_rows_affected INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO query_performance_log (
    query_type,
    table_name,
    execution_time_ms,
    rows_affected,
    timestamp
  ) VALUES (
    p_query_type,
    p_table_name,
    p_execution_time_ms,
    p_rows_affected,
    NOW()
  );
  
  -- Alert if query is unusually slow
  IF p_execution_time_ms > 5000 THEN
    -- Log warning for monitoring systems
    RAISE WARNING 'Slow query detected: % on % took %ms', 
      p_query_type, p_table_name, p_execution_time_ms;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create database health check function
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
  metric_name TEXT,
  metric_value TEXT,
  status TEXT,
  threshold TEXT
) AS $$
BEGIN
  -- Check table sizes
  RETURN QUERY
  SELECT 
    'Table Size: ' || schemaname || '.' || tablename AS metric_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS metric_value,
    CASE 
      WHEN pg_total_relation_size(schemaname||'.'||tablename) > 100 * 1024 * 1024 
      THEN 'WARNING'
      ELSE 'OK'
    END AS status,
    '100MB' AS threshold
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  
  -- Check recent query performance
  RETURN QUERY
  WITH perf_stats AS (
    SELECT 
      AVG(execution_time_ms) AS avg_time,
      MAX(execution_time_ms) AS max_time,
      COUNT(*) AS query_count
    FROM query_performance_log 
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
  )
  SELECT 
    'Average Query Performance (1h)' AS metric_name,
    ROUND(avg_time, 2)::TEXT || 'ms' AS metric_value,
    CASE 
      WHEN avg_time > 1000 THEN 'WARNING'
      WHEN avg_time > 2000 THEN 'CRITICAL'
      ELSE 'OK'
    END AS status,
    '1000ms' AS threshold
  FROM perf_stats
  WHERE query_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- DEPLOYMENT SAFETY CHECKS
-- ================================================

-- Create deployment readiness validation
CREATE OR REPLACE FUNCTION validate_deployment_readiness()
RETURNS TABLE (
  validation_category TEXT,
  check_result TEXT,
  is_ready BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Validate all required views exist
  RETURN QUERY
  SELECT 
    'Database Views' AS validation_category,
    CASE 
      WHEN COUNT(*) >= 3 THEN 'PASS'
      ELSE 'FAIL'
    END AS check_result,
    COUNT(*) >= 3 AS is_ready,
    'Required views: ' || COUNT(*)::TEXT || '/3' AS message
  FROM information_schema.views 
  WHERE table_schema = 'public' 
    AND table_name IN ('current_enhanced_sprint', 'current_global_sprint', 'coo_dashboard_optimized');
  
  -- Validate indexes exist
  RETURN QUERY
  SELECT 
    'Performance Indexes' AS validation_category,
    CASE 
      WHEN COUNT(*) >= 4 THEN 'PASS'
      ELSE 'FAIL'
    END AS check_result,
    COUNT(*) >= 4 AS is_ready,
    'Performance indexes: ' || COUNT(*)::TEXT || '/4+' AS message
  FROM pg_indexes 
  WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%optimized%' 
     OR indexname LIKE 'idx_%member_date%'
     OR indexname LIKE 'idx_%team_active%';
  
  -- Validate functions exist
  RETURN QUERY
  SELECT 
    'Database Functions' AS validation_category,
    CASE 
      WHEN COUNT(*) >= 5 THEN 'PASS'
      ELSE 'FAIL'
    END AS check_result,
    COUNT(*) >= 5 AS is_ready,
    'Required functions: ' || COUNT(*)::TEXT || '/5+' AS message
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
    AND routine_name IN (
      'validate_sprint_consistency',
      'calculate_team_hours_unified',
      'calculate_sprint_capacity_unified',
      'validate_data_integrity',
      'check_database_health'
    );
  
  -- Run data integrity check
  RETURN QUERY
  SELECT 
    'Data Integrity' AS validation_category,
    CASE 
      WHEN bool_and(status IN ('PASS', 'WARNING')) THEN 'PASS'
      ELSE 'FAIL'
    END AS check_result,
    bool_and(status IN ('PASS', 'WARNING')) AS is_ready,
    'Integrity checks: ' || string_agg(check_name || ':' || status, ', ') AS message
  FROM validate_data_integrity();
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- CLEANUP PROCEDURES
-- ================================================

-- Clean up old cache invalidation events (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_cache_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cache_invalidation_events 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up old query performance logs (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM query_performance_log 
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- ROLLBACK PROCEDURES
-- ================================================

-- Create rollback function for emergency situations
CREATE OR REPLACE FUNCTION rollback_v2_2_enhancements()
RETURNS TEXT AS $$
BEGIN
  -- Drop new views
  DROP VIEW IF EXISTS current_enhanced_sprint CASCADE;
  DROP VIEW IF EXISTS coo_dashboard_optimized CASCADE;
  
  -- Drop new functions
  DROP FUNCTION IF EXISTS validate_sprint_consistency() CASCADE;
  DROP FUNCTION IF EXISTS calculate_team_hours_unified(INTEGER, DATE, DATE) CASCADE;
  DROP FUNCTION IF EXISTS calculate_sprint_capacity_unified(INTEGER) CASCADE;
  DROP FUNCTION IF EXISTS validate_data_integrity() CASCADE;
  DROP FUNCTION IF EXISTS monitor_query_performance(TEXT, INTEGER, TEXT, INTEGER) CASCADE;
  DROP FUNCTION IF EXISTS check_database_health() CASCADE;
  DROP FUNCTION IF EXISTS validate_deployment_readiness() CASCADE;
  DROP FUNCTION IF EXISTS cleanup_old_cache_events() CASCADE;
  DROP FUNCTION IF EXISTS cleanup_old_performance_logs() CASCADE;
  DROP FUNCTION IF EXISTS invalidate_cache_on_data_change() CASCADE;
  
  -- Drop triggers
  DROP TRIGGER IF EXISTS cache_invalidation_schedule_entries ON schedule_entries;
  DROP TRIGGER IF EXISTS cache_invalidation_team_members ON team_members;
  DROP TRIGGER IF EXISTS cache_invalidation_global_sprint_settings ON global_sprint_settings;
  
  -- Drop new table
  DROP TABLE IF EXISTS cache_invalidation_events CASCADE;
  
  -- Drop new indexes (they will be removed with CONCURRENTLY to avoid locks)
  -- Note: These should be run manually in production:
  -- DROP INDEX CONCURRENTLY IF EXISTS idx_schedule_entries_member_date_value;
  -- DROP INDEX CONCURRENTLY IF EXISTS idx_schedule_entries_date_range_optimized;
  -- DROP INDEX CONCURRENTLY IF EXISTS idx_team_members_team_active;
  -- DROP INDEX CONCURRENTLY IF EXISTS idx_teams_active_with_members;
  
  RETURN 'V2.2 enhancements rolled back successfully. Run index cleanup manually.';
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FINAL VALIDATION AND SETUP
-- ================================================

-- Run initial data integrity validation
DO $$
DECLARE
  validation_results RECORD;
  has_issues BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE 'Running initial data integrity validation...';
  
  FOR validation_results IN 
    SELECT * FROM validate_data_integrity()
  LOOP
    RAISE NOTICE 'Check: % - Status: % - Details: %', 
      validation_results.check_name, 
      validation_results.status, 
      validation_results.details;
    
    IF validation_results.status = 'FAIL' THEN
      has_issues := TRUE;
    END IF;
  END LOOP;
  
  IF has_issues THEN
    RAISE WARNING 'Data integrity issues found. Review and fix before production deployment.';
  ELSE
    RAISE NOTICE 'All data integrity checks passed successfully.';
  END IF;
END $$;

-- Create initial sprint history entry if missing
DO $$
DECLARE
  current_sprint_record RECORD;
BEGIN
  SELECT * INTO current_sprint_record FROM current_enhanced_sprint;
  
  IF current_sprint_record.validation_status = 'needs_validation' THEN
    -- Create corresponding sprint_history entry
    INSERT INTO sprint_history (
      sprint_number,
      sprint_name,
      sprint_start_date,
      sprint_end_date,
      sprint_length_weeks,
      description,
      status,
      created_by
    ) VALUES (
      current_sprint_record.current_sprint_number,
      'Sprint ' || current_sprint_record.current_sprint_number,
      current_sprint_record.sprint_start_date,
      current_sprint_record.sprint_end_date,
      current_sprint_record.sprint_length_weeks,
      'Auto-created for data consistency',
      'active',
      'system_migration'
    )
    ON CONFLICT (sprint_number) DO UPDATE SET
      status = 'active',
      updated_at = NOW(),
      updated_by = 'system_migration';
    
    RAISE NOTICE 'Sprint history entry created/updated for sprint %', 
      current_sprint_record.current_sprint_number;
  END IF;
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'V2.2 Data Flow Optimization Migration Complete!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Enhanced Features Deployed:';
  RAISE NOTICE '✓ Sprint date synchronization system';
  RAISE NOTICE '✓ Unified calculation functions';
  RAISE NOTICE '✓ Performance optimization indexes';
  RAISE NOTICE '✓ COO dashboard optimization view';
  RAISE NOTICE '✓ Cache invalidation triggers';
  RAISE NOTICE '✓ Data integrity validation system';
  RAISE NOTICE '✓ Performance monitoring functions';
  RAISE NOTICE '✓ Deployment safety validation';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Update application code to use new functions';
  RAISE NOTICE '2. Implement enhanced caching strategy';
  RAISE NOTICE '3. Deploy real-time sync manager';
  RAISE NOTICE '4. Monitor performance improvements';
  RAISE NOTICE '=================================================';
END $$;