-- REMOVE UNUSED INDEXES: Improve Write Performance
-- These indexes were identified as unused and slowing down INSERT/UPDATE operations
-- IMPACT: Faster writes and reduced storage overhead

-- ==============================================
-- IDENTIFY AND DROP UNUSED INDEXES
-- ==============================================

-- Drop unused indexes on sprint_history table (identified in analysis)
DROP INDEX IF EXISTS idx_sprint_history_status;
DROP INDEX IF EXISTS idx_sprint_history_number; 
DROP INDEX IF EXISTS idx_sprint_history_created_at;

-- Keep only the essential date range index:
-- idx_sprint_history_dates (sprint_start_date, sprint_end_date)

-- Drop duplicate indexes on team_members if they exist
DROP INDEX IF EXISTS idx_team_members_team_name; -- Duplicate of team_id functionality

-- Drop overly specific indexes that aren't used
DROP INDEX IF EXISTS idx_availability_templates_usage_count; -- Rarely queried by usage
DROP INDEX IF EXISTS idx_user_achievements_week_start; -- Too specific
DROP INDEX IF EXISTS idx_recognition_metrics_updated; -- Redundant with period indexes

-- ==============================================
-- VERIFY INDEX CLEANUP
-- ==============================================

-- Show remaining indexes for verification
DO $$
DECLARE
    rec RECORD;
    index_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 REMAINING INDEXES AFTER CLEANUP:';
    
    FOR rec IN 
        SELECT 
            schemaname, 
            tablename, 
            indexname,
            indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('teams', 'team_members', 'schedule_entries', 'sprint_history', 'global_sprint_settings')
        ORDER BY tablename, indexname
    LOOP
        index_count := index_count + 1;
        RAISE NOTICE '✅ %.%: %', rec.tablename, rec.indexname, 
                     CASE WHEN length(rec.indexdef) > 80 THEN substring(rec.indexdef from 1 for 77) || '...' ELSE rec.indexdef END;
    END LOOP;
    
    RAISE NOTICE '📊 Total remaining indexes: %', index_count;
    RAISE NOTICE '🚀 INDEX CLEANUP COMPLETE - Write performance should improve';
END $$;

-- ==============================================
-- PERFORMANCE MONITORING SETUP
-- ==============================================

-- Create table for tracking query performance (if not exists)
CREATE TABLE IF NOT EXISTS query_performance_log (
    id SERIAL PRIMARY KEY,
    query_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    rows_affected INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cache_hit BOOLEAN DEFAULT FALSE,
    egress_bytes BIGINT
);

-- Index for performance queries
CREATE INDEX IF NOT EXISTS idx_query_performance_timestamp 
ON query_performance_log(timestamp DESC);

-- Create view for performance monitoring
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    query_type,
    table_name,
    COUNT(*) as query_count,
    AVG(execution_time_ms) as avg_time_ms,
    MAX(execution_time_ms) as max_time_ms,
    SUM(COALESCE(egress_bytes, 0)) as total_egress_bytes,
    COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
    ROUND(COUNT(*) FILTER (WHERE cache_hit = true) * 100.0 / COUNT(*), 2) as cache_hit_rate
FROM query_performance_log 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY query_type, table_name
ORDER BY total_egress_bytes DESC;

RAISE NOTICE '📈 PERFORMANCE MONITORING SETUP COMPLETE';
RAISE NOTICE '🔍 Use SELECT * FROM performance_summary; to monitor performance';
RAISE NOTICE '🔥 Monitor egress_bytes column to track bandwidth usage';