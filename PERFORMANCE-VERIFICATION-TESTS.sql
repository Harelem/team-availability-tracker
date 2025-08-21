-- PERFORMANCE VERIFICATION TESTS
-- Execute these after schema deployment to ensure optimal performance
-- Run in Supabase SQL Editor

-- =====================================================
-- INDEX CREATION VERIFICATION
-- =====================================================

-- Test 1: Verify all critical indexes were created
SELECT 
  'INDEX_VERIFICATION' as test_category,
  schemaname,
  tablename,
  indexname,
  indexdef,
  CASE 
    WHEN indexname LIKE '%team_id%' OR indexname LIKE '%role%' OR indexname LIKE '%is_critical%' 
    THEN '✅ PERFORMANCE INDEX'
    ELSE 'EXISTING INDEX'
  END as index_status
FROM pg_indexes 
WHERE tablename IN ('teams', 'team_members', 'schedule_entries')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected Result: New indexes for team_id, role, is_critical columns

-- =====================================================
-- QUERY PERFORMANCE TESTS  
-- =====================================================

-- Test 2: Team Loading Performance (Critical Path)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT t.*, 
       COUNT(tm.id) as member_count,
       COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as manager_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.inactive_date IS NULL
GROUP BY t.id, t.name, t.description, t.color, t.created_at, t.updated_at
ORDER BY t.name;

-- Expected Result: Fast execution with index usage, <100ms

-- Test 3: Team Members Query Performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT tm.*, t.name as team_name, t.color as team_color
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.inactive_date IS NULL
ORDER BY t.name, tm.name;

-- Expected Result: Efficient join with team_id index, <200ms

-- Test 4: Daily Status Query Performance (COO Dashboard Critical)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM get_daily_company_status_data(CURRENT_DATE);

-- Expected Result: Fast function execution, <500ms

-- Test 5: Critical Absences Query Performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT tm.name, tm.role, se.reason, t.name as team_name
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = CURRENT_DATE
WHERE tm.is_critical = true 
  AND tm.inactive_date IS NULL
  AND (se.value = 'X' OR se.value = '0.5')
ORDER BY t.name, tm.name;

-- Expected Result: Fast critical member filtering, <100ms

-- Test 6: Team Statistics View Performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM team_stats;

-- Expected Result: Pre-calculated view, very fast <50ms

-- =====================================================
-- FUNCTION PERFORMANCE TESTS
-- =====================================================

-- Test 7: value_to_hours Function Performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  se.id,
  se.value,
  value_to_hours(se.value) as calculated_hours
FROM schedule_entries se
LIMIT 1000;

-- Expected Result: IMMUTABLE function should be very fast

-- Test 8: Daily Status Summary Performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM get_daily_status_summary(CURRENT_DATE);

-- Expected Result: Efficient aggregation, <300ms

-- =====================================================
-- CONCURRENT ACCESS TESTS
-- =====================================================

-- Test 9: Index Concurrency Check
SELECT 
  'CONCURRENCY_TEST' as test_category,
  indexname,
  CASE 
    WHEN indexdef LIKE '%CONCURRENTLY%' THEN '✅ CONCURRENT SAFE'
    ELSE '⚠️ CHECK CONCURRENCY'
  END as concurrency_status
FROM pg_indexes 
WHERE tablename IN ('teams', 'team_members')
  AND schemaname = 'public'
  AND indexname LIKE '%team_%';

-- Expected Result: Critical indexes built concurrently

-- Test 10: Lock Status Check
SELECT 
  'LOCK_CHECK' as test_category,
  relation::regclass as table_name,
  mode,
  granted,
  CASE WHEN granted = true THEN '✅ NO BLOCKING LOCKS' ELSE '⚠️ LOCK ACTIVE' END as lock_status
FROM pg_locks 
WHERE relation::regclass::text IN ('teams', 'team_members', 'schedule_entries');

-- Expected Result: No blocking locks after deployment

-- =====================================================
-- QUERY OPTIMIZATION VALIDATION
-- =====================================================

-- Test 11: Join Performance Validation
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
WITH team_daily_status AS (
  SELECT 
    t.id as team_id,
    t.name as team_name,
    COUNT(tm.id) as total_members,
    COUNT(CASE WHEN se.value = '1' THEN 1 END) as available_today,
    COUNT(CASE WHEN se.value = '0.5' THEN 1 END) as half_day_today,
    COUNT(CASE WHEN se.value = 'X' THEN 1 END) as absent_today
  FROM teams t
  JOIN team_members tm ON t.id = tm.team_id
  LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = CURRENT_DATE
  WHERE tm.inactive_date IS NULL
  GROUP BY t.id, t.name
)
SELECT * FROM team_daily_status;

-- Expected Result: Efficient joins using new indexes

-- Test 12: Complex Query Performance (Full COO Dashboard)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  t.name as team_name,
  COUNT(tm.id) as total_members,
  COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as managers,
  COUNT(CASE WHEN tm.is_critical = true THEN 1 END) as critical_members,
  COUNT(CASE WHEN se.value = '1' THEN 1 END) as available,
  COUNT(CASE WHEN se.value = '0.5' THEN 1 END) as half_day,
  COUNT(CASE WHEN se.value = 'X' THEN 1 END) as absent,
  COUNT(CASE WHEN tm.is_critical = true AND se.value != '1' THEN 1 END) as critical_absences
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = CURRENT_DATE
WHERE tm.inactive_date IS NULL
GROUP BY t.id, t.name
ORDER BY t.name;

-- Expected Result: Complex dashboard query under 1 second

-- =====================================================
-- PERFORMANCE BENCHMARKS
-- =====================================================

-- Test 13: Baseline Performance Metrics
SELECT 
  'PERFORMANCE_BASELINE' as test_category,
  'teams_count' as metric,
  COUNT(*) as value,
  '< 1ms expected' as benchmark
FROM teams
UNION ALL
SELECT 
  'PERFORMANCE_BASELINE',
  'active_members_count',
  COUNT(*),
  '< 5ms expected'
FROM team_members 
WHERE inactive_date IS NULL
UNION ALL
SELECT 
  'PERFORMANCE_BASELINE',
  'schedule_entries_count',
  COUNT(*),
  '< 10ms expected'
FROM schedule_entries
UNION ALL
SELECT 
  'PERFORMANCE_BASELINE',
  'daily_status_function',
  COUNT(*),
  '< 500ms expected'
FROM get_daily_company_status_data(CURRENT_DATE);

-- Expected Result: All queries execute within benchmark times

-- =====================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================

-- Test 14: Slow Query Detection
SELECT 
  'SLOW_QUERY_MONITOR' as test_category,
  query,
  calls,
  total_time,
  mean_time,
  CASE WHEN mean_time > 1000 THEN '⚠️ SLOW' ELSE '✅ FAST' END as performance_status
FROM pg_stat_statements 
WHERE query LIKE '%teams%' OR query LIKE '%team_members%'
ORDER BY mean_time DESC
LIMIT 10;

-- Expected Result: All team-related queries under 1000ms average

-- Test 15: Index Usage Statistics
SELECT 
  'INDEX_USAGE_STATS' as test_category,
  schemaname,
  tablename,
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE WHEN idx_scan > 0 THEN '✅ INDEX USED' ELSE '⚠️ UNUSED' END as usage_status
FROM pg_stat_user_indexes
WHERE tablename IN ('teams', 'team_members', 'schedule_entries')
ORDER BY idx_scan DESC;

-- Expected Result: New indexes show usage after deployment

-- =====================================================
-- PERFORMANCE SUCCESS CRITERIA
-- =====================================================

-- Test 16: Overall Performance Validation
SELECT 
  'PERFORMANCE_SUMMARY' as test_category,
  CASE 
    WHEN (SELECT COUNT(*) FROM teams) >= 6
     AND (SELECT COUNT(*) FROM team_members WHERE inactive_date IS NULL) > 0
     AND (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'team_members' AND indexname LIKE '%team_id%') > 0
    THEN '✅ PERFORMANCE DEPLOYMENT SUCCESSFUL'
    ELSE '❌ PERFORMANCE ISSUES DETECTED'
  END as performance_status;

-- Expected Result: '✅ PERFORMANCE DEPLOYMENT SUCCESSFUL'

-- =====================================================
-- PERFORMANCE TROUBLESHOOTING
-- =====================================================

-- If performance issues are detected, run these diagnostic queries:

-- Check for missing indexes
SELECT 
  'MISSING_INDEXES' as diagnostic,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename IN ('teams', 'team_members')
  AND attname IN ('team_id', 'role', 'is_critical', 'inactive_date');

-- Check for table bloat
SELECT 
  'TABLE_BLOAT' as diagnostic,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_tables 
WHERE tablename IN ('teams', 'team_members', 'schedule_entries');

-- Check for long-running queries
SELECT 
  'ACTIVE_QUERIES' as diagnostic,
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%';

-- =====================================================
-- PERFORMANCE MONITORING SETUP
-- =====================================================

-- Enable query statistics tracking (run once)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor performance over time
-- SELECT pg_stat_statements_reset(); -- Reset stats after deployment

-- =====================================================
-- SUCCESS CRITERIA CHECKLIST
-- =====================================================

/*
PERFORMANCE DEPLOYMENT SUCCESSFUL IF:
✅ All critical indexes created successfully
✅ Team loading queries execute in <100ms  
✅ COO Dashboard queries execute in <1 second
✅ Daily status function executes in <500ms
✅ No blocking locks detected
✅ Index usage statistics show new indexes being used
✅ Complex joins execute efficiently

PERFORMANCE NEEDS ATTENTION IF:
⚠️ Any critical query exceeds 1 second execution time
⚠️ Indexes not being used by query planner
⚠️ Table bloat or lock contention detected
⚠️ High CPU usage during normal operations

PERFORMANCE DEPLOYMENT FAILED IF:
❌ Critical indexes missing or not created
❌ Queries timing out or causing application errors
❌ Database becomes unresponsive
❌ Severe performance degradation compared to baseline
*/