-- Database Cleanup Script for Partial Deployments
-- This script safely removes incomplete or problematic database objects
-- Use this when recognition system deployments fail partway through

-- ============================================================================
-- ANALYZE CURRENT PROBLEMATIC STATE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Database Cleanup for Partial Deployments';
  RAISE NOTICE 'Analyzing current problematic state...';
  RAISE NOTICE '================================================================';
END
$$;

-- Check for problematic tables with bad RLS policies
DO $$
DECLARE
  table_record RECORD;
  policy_record RECORD;
  problem_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Scanning for tables with problematic UUID casting policies...';
  
  FOR table_record IN 
    SELECT DISTINCT tablename
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
  LOOP
    RAISE NOTICE 'Table "%" has problematic UUID casting policies', table_record.tablename;
    problem_count := problem_count + 1;
    
    -- List specific problematic policies
    FOR policy_record IN
      SELECT policyname, qual
      FROM pg_policies 
      WHERE schemaname = 'public'
        AND tablename = table_record.tablename
        AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
    LOOP
      RAISE NOTICE '  - Policy "%": %', policy_record.policyname, policy_record.qual;
    END LOOP;
  END LOOP;
  
  IF problem_count = 0 THEN
    RAISE NOTICE '✅ No problematic UUID casting policies found';
  ELSE
    RAISE NOTICE '⚠️  Found % tables with problematic policies', problem_count;
  END IF;
END
$$;

-- Check for incomplete recognition system tables
DO $$
DECLARE
  recognition_tables TEXT[] := ARRAY['user_achievements', 'recognition_metrics'];
  table_name TEXT;
  table_exists BOOLEAN;
  has_data BOOLEAN;
  row_count INTEGER;
BEGIN
  RAISE NOTICE 'Checking recognition system table states...';
  
  FOREACH table_name IN ARRAY recognition_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) INTO table_exists;
    
    IF table_exists THEN
      EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
      has_data := row_count > 0;
      
      RAISE NOTICE 'Table "%": EXISTS (% rows)', table_name, row_count;
      
      -- Check if table has problematic policies
      SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = table_name 
          AND schemaname = 'public'
          AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
      ) INTO has_data;
      
      IF has_data THEN
        RAISE NOTICE '  ⚠️  Table "%" has problematic UUID casting policies', table_name;
      ELSE
        RAISE NOTICE '  ✅ Table "%" policies appear safe', table_name;
      END IF;
    ELSE
      RAISE NOTICE 'Table "%": MISSING', table_name;
    END IF;
  END LOOP;
END
$$;

-- ============================================================================
-- SAFE CLEANUP OPERATIONS
-- ============================================================================

-- Function to safely drop table if it exists and has problems
CREATE OR REPLACE FUNCTION cleanup_problematic_table(table_name TEXT) 
RETURNS VOID AS $$
DECLARE
  has_bad_policies BOOLEAN;
  row_count INTEGER;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = cleanup_problematic_table.table_name
  ) THEN
    RAISE NOTICE 'Table "%" does not exist - skipping cleanup', table_name;
    RETURN;
  END IF;
  
  -- Check for problematic policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = cleanup_problematic_table.table_name 
      AND schemaname = 'public'
      AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
  ) INTO has_bad_policies;
  
  -- Get row count
  EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
  
  IF has_bad_policies THEN
    RAISE NOTICE 'Cleaning up problematic table "%"...', table_name;
    RAISE NOTICE '  - Row count: %', row_count;
    RAISE NOTICE '  - Has problematic UUID casting policies: YES';
    
    -- Drop the problematic table completely
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
    RAISE NOTICE '  ✅ Dropped table "%"', table_name;
  ELSE
    RAISE NOTICE 'Table "%" exists but has no problematic policies - keeping', table_name;
  END IF;
END
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP RECOGNITION SYSTEM TABLES (if problematic)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Starting recognition system table cleanup...';
  
  -- Clean up user_achievements if it has problems
  PERFORM cleanup_problematic_table('user_achievements');
  
  -- Clean up recognition_metrics if it has problems
  PERFORM cleanup_problematic_table('recognition_metrics');
  
  RAISE NOTICE 'Recognition system table cleanup complete';
END
$$;

-- ============================================================================
-- CLEANUP AVAILABILITY TEMPLATES (if problematic)
-- ============================================================================

DO $$
DECLARE
  has_bad_policies BOOLEAN;
  row_count INTEGER;
BEGIN
  RAISE NOTICE 'Checking availability_templates for cleanup...';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'availability_templates'
  ) THEN
    -- Check for problematic policies
    SELECT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'availability_templates' 
        AND schemaname = 'public'
        AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
    ) INTO has_bad_policies;
    
    -- Get row count
    SELECT COUNT(*) INTO row_count FROM availability_templates;
    
    IF has_bad_policies THEN
      RAISE NOTICE 'availability_templates has problematic policies';
      RAISE NOTICE '  - Row count: %', row_count;
      
      IF row_count = 0 THEN
        RAISE NOTICE '  - Table is empty, safe to drop and recreate';
        DROP TABLE IF EXISTS availability_templates CASCADE;
        RAISE NOTICE '  ✅ Dropped empty availability_templates table';
      ELSE
        RAISE NOTICE '  - Table has data (% rows), fixing policies only', row_count;
        PERFORM cleanup_problematic_table('availability_templates');
      END IF;
    ELSE
      RAISE NOTICE '✅ availability_templates has no problematic policies';
    END IF;
  ELSE
    RAISE NOTICE 'availability_templates does not exist - no cleanup needed';
  END IF;
END
$$;

-- ============================================================================
-- CLEANUP ORPHANED FUNCTIONS AND TYPES
-- ============================================================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE 'Cleaning up orphaned recognition system functions...';
  
  -- Drop recognition system functions if they exist
  DROP FUNCTION IF EXISTS calculate_weekly_completion_rate(INTEGER, DATE, DATE) CASCADE;
  DROP FUNCTION IF EXISTS calculate_user_recognition_metrics(INTEGER) CASCADE;
  DROP FUNCTION IF EXISTS check_user_achievements(INTEGER) CASCADE;
  DROP FUNCTION IF EXISTS get_team_recognition_leaderboard(INTEGER, VARCHAR, INTEGER) CASCADE;
  
  -- Drop recognition system types if they exist
  DROP TYPE IF EXISTS achievement_type CASCADE;
  DROP TYPE IF EXISTS recognition_metric_type CASCADE;
  
  RAISE NOTICE '✅ Cleaned up orphaned functions and types';
END
$$;

-- Clean up the cleanup function
DROP FUNCTION IF EXISTS cleanup_problematic_table(TEXT);

-- ============================================================================
-- POST-CLEANUP VERIFICATION
-- ============================================================================

DO $$
DECLARE
  remaining_problems INTEGER;
  total_policies INTEGER;
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Post-Cleanup Verification';
  RAISE NOTICE '================================================================';
  
  -- Count remaining problematic policies
  SELECT COUNT(*) INTO remaining_problems
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%');
    
  -- Count total policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Total RLS policies: %', total_policies;
  RAISE NOTICE 'Problematic UUID casting policies: %', remaining_problems;
  
  IF remaining_problems = 0 THEN
    RAISE NOTICE '🎉 SUCCESS: All problematic tables and policies cleaned up!';
    RAISE NOTICE '✅ Database is now ready for fresh recognition system deployment';
    RAISE NOTICE '📋 Next step: Execute sql/004_recognition_system_fixed.sql';
  ELSE
    RAISE NOTICE '⚠️  WARNING: % problematic policies still remain', remaining_problems;
    RAISE NOTICE '🔧 Manual review may be required';
  END IF;
  
  RAISE NOTICE '================================================================';
END
$$;

-- Show final state of recognition system tables
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t.table_name
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM (
  VALUES 
    ('user_achievements'),
    ('recognition_metrics'), 
    ('availability_templates')
) AS t(table_name)
ORDER BY table_name;

-- Show any remaining problematic policies
SELECT 
  schemaname,
  tablename, 
  policyname,
  '❌ STILL PROBLEMATIC' as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
ORDER BY tablename, policyname;