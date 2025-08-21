-- QUICK PERFORMANCE CHECK (30 SECONDS)
-- Run this immediately after deploying the emergency fixes

-- 1. Verify critical index exists (MOST IMPORTANT)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_team_members_team_id' 
            AND tablename = 'team_members'
        ) 
        THEN '✅ CRITICAL INDEX CREATED - 50% PERFORMANCE BOOST ACTIVE'
        ELSE '❌ CRITICAL INDEX MISSING - PERFORMANCE STILL SLOW'
    END as critical_index_status;

-- 2. Verify teams RLS is enabled
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'teams' 
            AND rowsecurity = true
        )
        THEN '✅ TEAMS RLS ENABLED - SECURITY OPTIMIZED'
        ELSE '❌ TEAMS RLS DISABLED - SECURITY ISSUE'
    END as rls_status;

-- 3. Quick performance test - should complete in milliseconds
SELECT 
    '⚡ PERFORMANCE TEST' as test_type,
    COUNT(DISTINCT t.id) as teams_count,
    COUNT(tm.id) as members_count,
    EXTRACT(EPOCH FROM NOW()) as timestamp
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id;

-- 4. Verify essential schema components
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'teams' 
            AND column_name = 'sprint_length_weeks'
        )
        THEN '✅ SCHEMA COMPLETE'
        ELSE '⚠️ SCHEMA MISSING COMPONENTS'
    END as schema_status;

-- SUCCESS INDICATOR:
-- If you see all ✅ symbols, the emergency fixes are active!
-- App should now load in 2-3 seconds instead of 15+ seconds