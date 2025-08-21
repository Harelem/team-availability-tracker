-- =====================================================
-- CRITICAL PERFORMANCE INDEXES FOR TEAM AVAILABILITY TRACKER
-- =====================================================
-- These indexes are designed to optimize the most frequent and expensive queries
-- based on analysis of the application's database access patterns.

-- =====================================================
-- 1. SCHEDULE_ENTRIES TABLE INDEXES (HIGHEST PRIORITY)
-- =====================================================

-- Primary composite index for date range queries with team filtering
-- Optimizes: getScheduleEntries, getPaginatedScheduleEntries, COO dashboard queries
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date_member_team 
ON schedule_entries (date, member_id) 
INCLUDE (value, reason, created_at, updated_at);

-- Composite index for member-specific queries with date sorting
-- Optimizes: Personal dashboard, member schedule views
CREATE INDEX IF NOT EXISTS idx_schedule_entries_member_date 
ON schedule_entries (member_id, date DESC) 
INCLUDE (value, reason);

-- Index for real-time subscription filters and date range queries
-- Optimizes: Real-time updates, dashboard refreshes
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date_range 
ON schedule_entries (date) 
INCLUDE (member_id, value, reason)
WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- Partial index for active (non-null) schedule entries
-- Optimizes queries that filter out deleted/null entries
CREATE INDEX IF NOT EXISTS idx_schedule_entries_active 
ON schedule_entries (date, member_id) 
INCLUDE (value, reason)
WHERE value IS NOT NULL;

-- Index for recent entries (last 30 days) - frequently accessed
-- Optimizes: Dashboard loads, recent activity queries
CREATE INDEX IF NOT EXISTS idx_schedule_entries_recent 
ON schedule_entries (created_at DESC, member_id) 
INCLUDE (date, value, reason)
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- 2. TEAM_MEMBERS TABLE INDEXES
-- =====================================================

-- Composite index for team-based queries with active status
-- Optimizes: Team member lists, active member filtering
CREATE INDEX IF NOT EXISTS idx_team_members_team_active 
ON team_members (team_id, inactive_date) 
INCLUDE (name, hebrew, is_manager, is_critical, role)
WHERE inactive_date IS NULL;

-- Index for manager queries
-- Optimizes: Manager dashboard, permission checks
CREATE INDEX IF NOT EXISTS idx_team_members_managers 
ON team_members (is_manager, team_id) 
INCLUDE (name, hebrew, id)
WHERE is_manager = true AND inactive_date IS NULL;

-- Index for name-based searches and duplicate detection
-- Optimizes: Team member creation, duplicate checks
CREATE INDEX IF NOT EXISTS idx_team_members_names 
ON team_members (LOWER(name), team_id) 
INCLUDE (id, hebrew)
WHERE inactive_date IS NULL;

-- GIN index for full-text search on names (Hebrew + English)
-- Optimizes: Search functionality, autocomplete
CREATE INDEX IF NOT EXISTS idx_team_members_fulltext 
ON team_members 
USING GIN ((to_tsvector('simple', name || ' ' || hebrew)))
WHERE inactive_date IS NULL;

-- =====================================================
-- 3. TEAMS TABLE INDEXES
-- =====================================================

-- Simple index for team name ordering (already exists but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_teams_name 
ON teams (name) 
INCLUDE (id, description, color);

-- =====================================================
-- 4. GLOBAL_SPRINT_SETTINGS TABLE INDEXES
-- =====================================================

-- Index for current sprint queries
-- Optimizes: Sprint calculations, current sprint detection
CREATE INDEX IF NOT EXISTS idx_global_sprint_current 
ON global_sprint_settings (current_sprint_number DESC) 
INCLUDE (sprint_length_weeks, sprint_start_date, notes);

-- Index for sprint date range queries
-- Optimizes: Sprint date calculations, timeline queries
CREATE INDEX IF NOT EXISTS idx_global_sprint_dates 
ON global_sprint_settings (sprint_start_date, sprint_length_weeks) 
INCLUDE (current_sprint_number, notes);

-- =====================================================
-- 5. ENHANCED_SPRINT_CONFIGS TABLE INDEXES
-- =====================================================

-- Index for active sprint queries
-- Optimizes: Enhanced sprint system queries
CREATE INDEX IF NOT EXISTS idx_enhanced_sprint_active 
ON enhanced_sprint_configs (is_active, sprint_number DESC) 
INCLUDE (start_date, end_date, length_weeks, working_days_count)
WHERE is_active = true;

-- Index for sprint date overlap queries
-- Optimizes: Sprint conflict detection, date range queries
CREATE INDEX IF NOT EXISTS idx_enhanced_sprint_dates 
ON enhanced_sprint_configs (start_date, end_date) 
INCLUDE (sprint_number, is_active, working_days_count);

-- =====================================================
-- 6. COO_USERS TABLE INDEXES
-- =====================================================

-- Simple index for COO user queries (small table, but frequently accessed)
CREATE INDEX IF NOT EXISTS idx_coo_users_active 
ON coo_users (id) 
INCLUDE (name, hebrew, title, description);

-- =====================================================
-- 7. COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- Cross-table index simulation using materialized views or computed columns
-- Note: These would be implemented as views or functions rather than direct indexes

-- Index to optimize COO dashboard aggregate queries
-- This supports the expensive multi-team, multi-date aggregations
CREATE INDEX IF NOT EXISTS idx_schedule_entries_coo_dashboard 
ON schedule_entries (date, member_id) 
INCLUDE (value)
WHERE date >= CURRENT_DATE - INTERVAL '30 days' 
  AND date <= CURRENT_DATE + INTERVAL '30 days';

-- =====================================================
-- 8. FOREIGN KEY INDEXES (ENSURE THEY EXIST)
-- =====================================================

-- These should already exist, but ensure they're optimized
CREATE INDEX IF NOT EXISTS idx_schedule_entries_member_id 
ON schedule_entries (member_id);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id 
ON team_members (team_id);

-- =====================================================
-- 9. PARTIAL INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for "hot" data - recent schedule entries that are frequently accessed
CREATE INDEX IF NOT EXISTS idx_schedule_entries_hot_data 
ON schedule_entries (member_id, date DESC) 
INCLUDE (value, reason, updated_at)
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Index for audit/history queries - older data that's occasionally accessed
CREATE INDEX IF NOT EXISTS idx_schedule_entries_historical 
ON schedule_entries (created_at DESC) 
INCLUDE (member_id, date, value)
WHERE created_at < CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- 10. STATISTICS AND MAINTENANCE
-- =====================================================

-- Update table statistics to help query planner
ANALYZE schedule_entries;
ANALYZE team_members;
ANALYZE teams;
ANALYZE global_sprint_settings;
ANALYZE enhanced_sprint_configs;

-- =====================================================
-- 11. INDEX MONITORING QUERIES
-- =====================================================

/*
-- Use these queries to monitor index usage and effectiveness:

-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE tablename IN ('schedule_entries', 'team_members', 'teams')
ORDER BY idx_scan DESC;

-- Check table statistics
SELECT 
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_writes,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables 
WHERE tablename IN ('schedule_entries', 'team_members', 'teams');

-- Find unused indexes (run after some time in production)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
  AND tablename IN ('schedule_entries', 'team_members', 'teams')
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check slow queries that might benefit from additional indexes
SELECT 
    query,
    mean_time,
    calls,
    total_time
FROM pg_stat_statements 
WHERE query ILIKE '%schedule_entries%' 
  OR query ILIKE '%team_members%'
ORDER BY mean_time DESC 
LIMIT 10;
*/

-- =====================================================
-- 12. INDEX CREATION NOTES
-- =====================================================

/*
PERFORMANCE NOTES:
1. These indexes prioritize read performance for the most common query patterns
2. Write performance may be slightly impacted due to index maintenance
3. Monitor index usage with pg_stat_user_indexes after deployment
4. Consider dropping unused indexes after monitoring period
5. Update statistics regularly with ANALYZE for optimal query planning

MAINTENANCE:
1. Run REINDEX periodically on heavily updated tables
2. Monitor table bloat and consider VACUUM FULL if needed
3. Update PostgreSQL configuration for optimal index usage:
   - effective_cache_size
   - random_page_cost
   - seq_page_cost

DEPLOYMENT:
1. Create indexes during low-traffic periods
2. Use CONCURRENTLY option for large tables in production
3. Monitor system resources during index creation
4. Test query performance before and after index creation
*/