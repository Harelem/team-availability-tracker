-- =====================================================
-- DATABASE MONITORING FUNCTIONS FOR SUPABASE
-- =====================================================
-- These functions provide monitoring capabilities for index and query performance
-- They should be created in Supabase using the SQL editor

-- =====================================================
-- 1. INDEX STATISTICS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_index_stats()
RETURNS TABLE(
  schemaname text,
  tablename text,
  indexname text,
  idx_tup_read bigint,
  idx_tup_fetch bigint,
  idx_scan bigint,
  size text,
  is_used boolean
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    pgs.schemaname,
    pgs.tablename,
    pgs.indexname,
    pgs.idx_tup_read,
    pgs.idx_tup_fetch,
    pgs.idx_scan,
    pg_size_pretty(pg_relation_size(pgs.indexrelid)) as size,
    (pgs.idx_scan > 0) as is_used
  FROM pg_stat_user_indexes pgs
  WHERE pgs.schemaname = 'public'
    AND pgs.tablename IN ('schedule_entries', 'team_members', 'teams', 'global_sprint_settings', 'enhanced_sprint_configs', 'coo_users')
  ORDER BY pgs.idx_scan DESC;
$$;

-- =====================================================
-- 2. TABLE STATISTICS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
  schemaname text,
  tablename text,
  total_writes bigint,
  seq_scan bigint,
  seq_tup_read bigint,
  idx_scan bigint,
  idx_tup_fetch bigint,
  size text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    pgs.schemaname,
    pgs.tablename,
    (pgs.n_tup_ins + pgs.n_tup_upd + pgs.n_tup_del) as total_writes,
    pgs.seq_scan,
    pgs.seq_tup_read,
    pgs.idx_scan,
    pgs.idx_tup_fetch,
    pg_size_pretty(pg_total_relation_size(pgs.relid)) as size
  FROM pg_stat_user_tables pgs
  WHERE pgs.schemaname = 'public'
    AND pgs.tablename IN ('schedule_entries', 'team_members', 'teams', 'global_sprint_settings', 'enhanced_sprint_configs', 'coo_users')
  ORDER BY pgs.seq_tup_read DESC;
$$;

-- =====================================================
-- 3. ANALYZE TABLE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION analyze_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate table name to prevent SQL injection
  IF table_name NOT IN ('schedule_entries', 'team_members', 'teams', 'global_sprint_settings', 'enhanced_sprint_configs', 'coo_users') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;
  
  -- Execute ANALYZE on the specified table
  EXECUTE format('ANALYZE %I', table_name);
END;
$$;

-- =====================================================
-- 4. QUERY PERFORMANCE MONITORING FUNCTION
-- =====================================================
-- Note: This requires pg_stat_statements extension which may not be available in all Supabase tiers

CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
  query text,
  mean_time numeric,
  calls bigint,
  total_time numeric,
  rows_per_call numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- This is a placeholder implementation
  -- In production with pg_stat_statements available, use:
  /*
  SELECT 
    query,
    mean_exec_time as mean_time,
    calls,
    total_exec_time as total_time,
    CASE WHEN calls > 0 THEN rows::numeric / calls ELSE 0 END as rows_per_call
  FROM pg_stat_statements 
  WHERE query ILIKE '%schedule_entries%' 
    OR query ILIKE '%team_members%'
    OR query ILIKE '%teams%'
  ORDER BY mean_exec_time DESC 
  LIMIT 20;
  */
  
  -- Fallback implementation without pg_stat_statements
  SELECT 
    'Query monitoring requires pg_stat_statements extension' as query,
    0::numeric as mean_time,
    0::bigint as calls,
    0::numeric as total_time,
    0::numeric as rows_per_call
  WHERE false; -- Returns empty result set
$$;

-- =====================================================
-- 5. INDEX HEALTH CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_index_health()
RETURNS TABLE(
  health_status text,
  total_indexes integer,
  used_indexes integer,
  unused_indexes integer,
  recommendations text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count integer;
  used_count integer;
  unused_count integer;
  health_status text;
  recommendations text[] := ARRAY[]::text[];
BEGIN
  -- Get index counts
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE idx_scan > 0) as used,
    COUNT(*) FILTER (WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey' AND indexname NOT LIKE '%_fkey') as unused
  INTO total_count, used_count, unused_count
  FROM pg_stat_user_indexes 
  WHERE schemaname = 'public'
    AND tablename IN ('schedule_entries', 'team_members', 'teams', 'global_sprint_settings', 'enhanced_sprint_configs');

  -- Determine health status
  IF unused_count = 0 THEN
    health_status := 'excellent';
  ELSIF unused_count <= 2 THEN
    health_status := 'good';
  ELSIF unused_count <= 5 THEN
    health_status := 'warning';
  ELSE
    health_status := 'critical';
  END IF;

  -- Generate recommendations
  IF unused_count > 0 THEN
    recommendations := array_append(recommendations, 
      format('Consider dropping %s unused indexes to improve write performance', unused_count));
  END IF;

  IF used_count::float / total_count < 0.7 THEN
    recommendations := array_append(recommendations, 
      'Index usage ratio is low - review query patterns and index effectiveness');
  END IF;

  RETURN QUERY SELECT health_status, total_count, used_count, unused_count, recommendations;
END;
$$;

-- =====================================================
-- 6. TABLE SIZE MONITORING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name text,
  table_size text,
  index_size text,
  total_size text,
  row_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname||'.'||tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) + pg_indexes_size(schemaname||'.'||tablename)) as total_size,
    n_live_tup as row_count
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND tablename IN ('schedule_entries', 'team_members', 'teams', 'global_sprint_settings', 'enhanced_sprint_configs', 'coo_users')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
$$;

-- =====================================================
-- 7. PERFORMANCE SUMMARY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_performance_summary()
RETURNS TABLE(
  metric text,
  value text,
  status text,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_indexes integer;
  unused_indexes integer;
  large_tables integer;
  seq_scan_ratio numeric;
BEGIN
  -- Index metrics
  SELECT COUNT(*) INTO total_indexes 
  FROM pg_stat_user_indexes 
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO unused_indexes 
  FROM pg_stat_user_indexes 
  WHERE schemaname = 'public' 
    AND idx_scan = 0 
    AND indexname NOT LIKE '%_pkey' 
    AND indexname NOT LIKE '%_fkey';

  -- Table metrics
  SELECT COUNT(*) INTO large_tables
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public' 
    AND pg_total_relation_size(schemaname||'.'||tablename) > 100 * 1024 * 1024; -- > 100MB

  -- Sequential scan ratio
  SELECT 
    CASE 
      WHEN SUM(seq_scan + idx_scan) > 0 
      THEN SUM(seq_scan)::numeric / SUM(seq_scan + idx_scan) 
      ELSE 0 
    END
  INTO seq_scan_ratio
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public';

  -- Return metrics
  RETURN QUERY VALUES
    ('Total Indexes', total_indexes::text, 
     CASE WHEN total_indexes > 20 THEN 'warning' ELSE 'good' END,
     CASE WHEN total_indexes > 20 THEN 'Monitor index maintenance overhead' ELSE 'Index count is reasonable' END),
    
    ('Unused Indexes', unused_indexes::text,
     CASE WHEN unused_indexes = 0 THEN 'excellent' WHEN unused_indexes <= 2 THEN 'good' ELSE 'warning' END,
     CASE WHEN unused_indexes > 0 THEN 'Consider dropping unused indexes' ELSE 'All indexes are being used' END),
    
    ('Large Tables', large_tables::text,
     CASE WHEN large_tables = 0 THEN 'good' WHEN large_tables <= 2 THEN 'warning' ELSE 'critical' END,
     CASE WHEN large_tables > 0 THEN 'Monitor large table performance and consider partitioning' ELSE 'Table sizes are manageable' END),
    
    ('Sequential Scan Ratio', ROUND(seq_scan_ratio * 100, 2)::text || '%',
     CASE WHEN seq_scan_ratio < 0.1 THEN 'excellent' WHEN seq_scan_ratio < 0.3 THEN 'good' ELSE 'warning' END,
     CASE WHEN seq_scan_ratio > 0.3 THEN 'High sequential scan ratio - consider additional indexes' ELSE 'Good index utilization' END);
END;
$$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users (adjust as needed for your security model)
GRANT EXECUTE ON FUNCTION get_index_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_table(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries() TO authenticated;
GRANT EXECUTE ON FUNCTION check_index_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_summary() TO authenticated;

-- =====================================================
-- 9. USAGE EXAMPLES
-- =====================================================

/*
-- Check index statistics
SELECT * FROM get_index_stats();

-- Check table statistics  
SELECT * FROM get_table_stats();

-- Update table statistics
SELECT analyze_table('schedule_entries');
SELECT analyze_table('team_members');

-- Check overall index health
SELECT * FROM check_index_health();

-- Get table sizes
SELECT * FROM get_table_sizes();

-- Get performance summary
SELECT * FROM get_performance_summary();

-- Find unused indexes
SELECT indexname, tablename, size 
FROM get_index_stats() 
WHERE NOT is_used 
ORDER BY size DESC;

-- Find tables with high sequential scan ratios
SELECT 
  tablename,
  seq_scan,
  idx_scan,
  CASE 
    WHEN (seq_scan + idx_scan) > 0 
    THEN ROUND((seq_scan::numeric / (seq_scan + idx_scan)) * 100, 2) 
    ELSE 0 
  END as seq_scan_percentage
FROM get_table_stats()
WHERE seq_scan + idx_scan > 100
ORDER BY seq_scan_percentage DESC;
*/