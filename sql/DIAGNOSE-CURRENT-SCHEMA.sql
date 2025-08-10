-- CURRENT SCHEMA DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to diagnose current schema state
-- This will help confirm which issues exist before deployment

-- =====================================================
-- DIAGNOSTIC QUERIES - CURRENT SCHEMA STATE  
-- =====================================================

-- Check 1: Does teams table exist?
SELECT 
  'teams_table_check' as diagnostic,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams' AND table_schema = 'public')
    THEN 'EXISTS - Teams table is present' 
    ELSE '❌ MISSING - Teams table does not exist (CRITICAL ISSUE)'
  END as result;

-- Check 2: Does team_members have team_id column?
SELECT 
  'team_id_column_check' as diagnostic,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'team_id' AND table_schema = 'public')
    THEN 'EXISTS - team_id column present'
    ELSE '❌ MISSING - team_id column missing (CRITICAL ISSUE)'
  END as result;

-- Check 3: Does team_members have role column?  
SELECT 
  'role_column_check' as diagnostic,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'role' AND table_schema = 'public')
    THEN 'EXISTS - role column present'
    ELSE '❌ MISSING - role column missing (CRITICAL ISSUE)'
  END as result;

-- Check 4: Does team_members have is_critical column?
SELECT 
  'is_critical_column_check' as diagnostic, 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'is_critical' AND table_schema = 'public')
    THEN 'EXISTS - is_critical column present'
    ELSE '❌ MISSING - is_critical column missing (CRITICAL ISSUE)'
  END as result;

-- Check 5: Does team_members have inactive_date column?
SELECT 
  'inactive_date_column_check' as diagnostic,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'inactive_date' AND table_schema = 'public')
    THEN 'EXISTS - inactive_date column present' 
    ELSE '❌ MISSING - inactive_date column missing (HIGH ISSUE)'
  END as result;

-- Check 6: Does value_to_hours function exist?
SELECT 
  'value_to_hours_function_check' as diagnostic,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'value_to_hours' AND routine_schema = 'public')
    THEN 'EXISTS - value_to_hours function present'
    ELSE '⚠️ MISSING - value_to_hours function missing (MEDIUM ISSUE)'
  END as result;

-- Check 7: Does schedule_entries_with_hours view exist?
SELECT 
  'schedule_entries_view_check' as diagnostic,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'schedule_entries_with_hours' AND table_schema = 'public')
    THEN 'EXISTS - schedule_entries_with_hours view present'
    ELSE '⚠️ MISSING - schedule_entries_with_hours view missing (MEDIUM ISSUE)'
  END as result;

-- Check 8: Basic table structure
SELECT 
  'basic_tables_check' as diagnostic,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule_entries' AND table_schema = 'public')
    THEN 'EXISTS - Basic tables (team_members, schedule_entries) present'
    ELSE '❌ CRITICAL - Basic tables missing'
  END as result;

-- =====================================================
-- DETAILED SCHEMA INSPECTION
-- =====================================================

-- Show current team_members table structure
SELECT 
  'team_members_structure' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'team_members' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show current schedule_entries table structure  
SELECT 
  'schedule_entries_structure' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedule_entries'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- List all current tables
SELECT 
  'current_tables' as info_type,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- List all current views
SELECT 
  'current_views' as info_type, 
  table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- List all current functions
SELECT 
  'current_functions' as info_type,
  routine_name as function_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- =====================================================
-- DATA SAMPLING (if tables exist)
-- =====================================================

-- Sample team_members data (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    RAISE NOTICE 'team_members sample data:';
    PERFORM * FROM team_members LIMIT 3;
  END IF;
END $$;

-- Count records in main tables (if they exist)
DO $$
DECLARE
  member_count INTEGER;
  schedule_count INTEGER;
  team_count INTEGER;
BEGIN
  -- Count team_members
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    SELECT COUNT(*) INTO member_count FROM team_members;
    RAISE NOTICE 'team_members record count: %', member_count;
  END IF;
  
  -- Count schedule_entries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule_entries') THEN
    SELECT COUNT(*) INTO schedule_count FROM schedule_entries;  
    RAISE NOTICE 'schedule_entries record count: %', schedule_count;
  END IF;
  
  -- Count teams (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    SELECT COUNT(*) INTO team_count FROM teams;
    RAISE NOTICE 'teams record count: %', team_count;
  END IF;
END $$;

-- =====================================================
-- SUMMARY DIAGNOSIS
-- =====================================================

-- Final diagnosis summary
SELECT 
  'DIAGNOSIS_SUMMARY' as summary_type,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams' AND table_schema = 'public')
    THEN '🚨 CRITICAL: Missing teams table - Application will fail to load teams'
    
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'team_id' AND table_schema = 'public')
    THEN '🚨 CRITICAL: Missing team_id column - Team relationships broken'
    
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'role' AND table_schema = 'public')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'is_critical' AND table_schema = 'public')
    THEN '⚠️ HIGH: Missing role/is_critical columns - Daily status will fail'
    
    ELSE '✅ GOOD: Core schema appears complete'
  END as diagnosis;

-- =====================================================
-- NEXT STEPS RECOMMENDATION
-- =====================================================

SELECT 
  'NEXT_STEPS' as recommendation_type,
  CASE 
    -- If teams table missing - critical deployment needed
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams' AND table_schema = 'public')
    THEN 'IMMEDIATE ACTION: Deploy EMERGENCY-SCHEMA-DEPLOYMENT.sql - Core functionality broken'
    
    -- If columns missing - high priority deployment needed  
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'team_id' AND table_schema = 'public')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'role' AND table_schema = 'public')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'is_critical' AND table_schema = 'public')
    THEN 'HIGH PRIORITY: Deploy schema enhancements - Key features will fail'
    
    -- If functions missing - medium priority
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'value_to_hours' AND routine_schema = 'public')
    THEN 'MEDIUM PRIORITY: Deploy helper functions for enhanced functionality'
    
    -- All good
    ELSE 'MONITORING: Schema appears complete - Monitor application for any remaining issues'
  END as recommendation;