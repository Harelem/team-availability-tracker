-- PERFORMANCE VALIDATION QUERIES
-- Use these queries to verify the emergency performance fixes are working

-- =============================================================================
-- 1. VERIFY CRITICAL INDEXES WERE CREATED
-- =============================================================================

SELECT 
    'CRITICAL INDEXES STATUS' as check_category,
    indexname,
    tablename,
    'CREATED' as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname IN (
    'idx_team_members_team_id',
    'idx_schedule_entries_member_id',
    'idx_schedule_entries_date',
    'idx_schedule_entries_member_date',
    'idx_global_sprint_settings_is_active'
)
ORDER BY tablename, indexname;

-- =============================================================================
-- 2. VERIFY ROW LEVEL SECURITY STATUS
-- =============================================================================

SELECT 
    'RLS STATUS' as check_category,
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status,
    CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as result
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('teams', 'team_members', 'schedule_entries', 'global_sprint_settings')
ORDER BY tablename;

-- =============================================================================
-- 3. VERIFY POLICIES ARE CORRECTLY CONFIGURED
-- =============================================================================

SELECT 
    'POLICIES STATUS' as check_category,
    schemaname,
    tablename,
    policyname,
    cmd as command_type,
    CASE WHEN qual IS NOT NULL THEN 'WITH QUALIFIER' ELSE 'NO QUALIFIER' END as qualifier_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('teams', 'team_members', 'schedule_entries')
ORDER BY tablename, policyname;

-- =============================================================================
-- 4. CHECK QUERY PERFORMANCE FOR CRITICAL OPERATIONS
-- =============================================================================

-- Test team member joins (should be significantly faster now)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT t.name as team_name, tm.name as member_name 
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
ORDER BY t.name, tm.name
LIMIT 100;

-- Test schedule entries with member joins (should use new indexes)
EXPLAIN (ANALYZE, BUFFERS)
SELECT tm.name, se.date, se.value, se.reason
FROM team_members tm
LEFT JOIN schedule_entries se ON tm.id = se.member_id
WHERE se.date >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 100;

-- =============================================================================
-- 5. VERIFY SCHEMA INTEGRITY
-- =============================================================================

-- Check if teams.sprint_length_weeks column exists
SELECT 
    'SCHEMA INTEGRITY' as check_category,
    'teams.sprint_length_weeks' as component,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND column_name = 'sprint_length_weeks'
        AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if team_members.team_id column exists and has foreign key
SELECT 
    'SCHEMA INTEGRITY' as check_category,
    'team_members.team_id' as component,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' 
        AND column_name = 'team_id'
        AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- =============================================================================
-- 6. PERFORMANCE BASELINE METRICS
-- =============================================================================

-- Count records in each table for performance baseline
SELECT 
    'PERFORMANCE BASELINE' as check_category,
    'teams' as table_name,
    COUNT(*) as record_count,
    pg_size_pretty(pg_relation_size('teams')) as table_size
FROM teams

UNION ALL

SELECT 
    'PERFORMANCE BASELINE' as check_category,
    'team_members' as table_name,
    COUNT(*) as record_count,
    pg_size_pretty(pg_relation_size('team_members')) as table_size
FROM team_members

UNION ALL

SELECT 
    'PERFORMANCE BASELINE' as check_category,
    'schedule_entries' as table_name,
    COUNT(*) as record_count,
    pg_size_pretty(pg_relation_size('schedule_entries')) as table_size
FROM schedule_entries;

-- =============================================================================
-- 7. INDEX USAGE STATISTICS (Run after some app usage)
-- =============================================================================

-- Check if our new indexes are being used
SELECT 
    'INDEX USAGE' as check_category,
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_tup_read DESC;

-- =============================================================================
-- 8. DATABASE CONNECTION AND PERFORMANCE SETTINGS
-- =============================================================================

-- Check current connection settings that affect performance
SELECT 
    'DB SETTINGS' as check_category,
    name,
    setting,
    unit,
    context
FROM pg_settings 
WHERE name IN (
    'max_connections',
    'shared_buffers',
    'work_mem',
    'maintenance_work_mem',
    'effective_cache_size',
    'random_page_cost',
    'seq_page_cost'
);

-- =============================================================================
-- SUCCESS CRITERIA CHECKLIST
-- =============================================================================

/*
✅ EXPECTED RESULTS AFTER FIXES:

1. CRITICAL INDEXES STATUS - Should show all 5 indexes as 'CREATED'
2. RLS STATUS - teams table should show 'ENABLED'
3. POLICIES STATUS - Should show 'Allow read access to teams' policy
4. QUERY PERFORMANCE - EXPLAIN ANALYZE should show index usage and faster execution
5. SCHEMA INTEGRITY - Both sprint_length_weeks and team_id should show 'EXISTS'
6. PERFORMANCE BASELINE - Should complete quickly with reasonable table sizes

🚨 RED FLAGS (Contact support if you see these):
- Any critical indexes showing as missing
- teams table RLS showing as 'DISABLED'
- EXPLAIN ANALYZE showing sequential scans instead of index scans
- Query execution times > 100ms for simple operations
- Schema integrity checks showing 'MISSING'
*/