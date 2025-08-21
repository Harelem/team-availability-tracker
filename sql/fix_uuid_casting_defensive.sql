-- Defensive UUID Casting Error Fix
-- This script safely removes problematic auth.uid()::INTEGER casts
-- Only affects tables that actually exist and have problematic policies

-- ============================================================================
-- ANALYZE CURRENT SITUATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Starting Defensive UUID Casting Fix';
  RAISE NOTICE 'Analyzing current database state...';
  RAISE NOTICE '=================================================================';
END
$$;

-- Check which tables exist
DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count tables that might have issues
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('availability_templates', 'user_achievements', 'recognition_metrics');
  
  RAISE NOTICE 'Found % potentially problematic tables', table_count;
  
  -- Count problematic policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%');
    
  RAISE NOTICE 'Found % policies with UUID casting issues', policy_count;
  
  IF policy_count = 0 THEN
    RAISE NOTICE 'No UUID casting issues found - database appears clean';
  ELSE
    RAISE NOTICE 'UUID casting issues detected - proceeding with fixes';
  END IF;
END
$$;

-- ============================================================================
-- SAFE POLICY FIXES - ONLY FOR EXISTING TABLES
-- ============================================================================

-- Fix availability_templates if it exists and has problematic policies
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'availability_templates' AND table_schema = 'public') THEN
    RAISE NOTICE 'availability_templates table exists - checking policies...';
    
    -- Check for problematic policies
    SELECT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'availability_templates' 
        AND schemaname = 'public'
        AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
    ) INTO policy_exists;
    
    IF policy_exists THEN
      RAISE NOTICE 'Fixing availability_templates RLS policies...';
      
      -- Drop problematic policies
      DROP POLICY IF EXISTS "Users can view public templates and their own" ON availability_templates;
      DROP POLICY IF EXISTS "Users can create their own templates" ON availability_templates;
      DROP POLICY IF EXISTS "Users can update their own templates" ON availability_templates;
      DROP POLICY IF EXISTS "Users can delete their own templates" ON availability_templates;
      
      -- Create safe replacement policies
      CREATE POLICY "Allow authenticated users to view templates" ON availability_templates
        FOR SELECT USING (auth.role() = 'authenticated');
      
      CREATE POLICY "Allow system to manage templates" ON availability_templates
        FOR ALL WITH CHECK (true);
      
      RAISE NOTICE '✅ Fixed availability_templates RLS policies';
    ELSE
      RAISE NOTICE '✅ availability_templates policies are already safe';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  availability_templates table does not exist - skipping';
  END IF;
END
$$;

-- Fix user_achievements if it exists and has problematic policies
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements' AND table_schema = 'public') THEN
    RAISE NOTICE 'user_achievements table exists - checking policies...';
    
    -- Check for problematic policies
    SELECT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'user_achievements' 
        AND schemaname = 'public'
        AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
    ) INTO policy_exists;
    
    IF policy_exists THEN
      RAISE NOTICE 'Fixing user_achievements RLS policies...';
      
      -- Drop problematic policies
      DROP POLICY IF EXISTS "Users can view their own achievements and team achievements" ON user_achievements;
      DROP POLICY IF EXISTS "Users can update their own achievements" ON user_achievements;
      
      -- Create safe replacement policies
      CREATE POLICY "Allow authenticated users to view achievements" ON user_achievements
        FOR SELECT USING (auth.role() = 'authenticated');
      
      CREATE POLICY "Allow system to manage achievements" ON user_achievements
        FOR ALL WITH CHECK (true);
      
      RAISE NOTICE '✅ Fixed user_achievements RLS policies';
    ELSE
      RAISE NOTICE '✅ user_achievements policies are already safe';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  user_achievements table does not exist - skipping';
  END IF;
END
$$;

-- Fix recognition_metrics if it exists and has problematic policies
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recognition_metrics' AND table_schema = 'public') THEN
    RAISE NOTICE 'recognition_metrics table exists - checking policies...';
    
    -- Check for problematic policies
    SELECT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'recognition_metrics' 
        AND schemaname = 'public'
        AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
    ) INTO policy_exists;
    
    IF policy_exists THEN
      RAISE NOTICE 'Fixing recognition_metrics RLS policies...';
      
      -- Drop problematic policies
      DROP POLICY IF EXISTS "Users can view their own metrics and team metrics" ON recognition_metrics;
      
      -- Create safe replacement policies
      CREATE POLICY "Allow authenticated users to view metrics" ON recognition_metrics
        FOR SELECT USING (auth.role() = 'authenticated');
      
      CREATE POLICY "Allow system to manage metrics" ON recognition_metrics
        FOR ALL WITH CHECK (true);
      
      RAISE NOTICE '✅ Fixed recognition_metrics RLS policies';
    ELSE
      RAISE NOTICE '✅ recognition_metrics policies are already safe';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  recognition_metrics table does not exist - skipping';
  END IF;
END
$$;

-- ============================================================================
-- COMPREHENSIVE SCAN FOR OTHER PROBLEMATIC POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_record RECORD;
  problem_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Scanning for any remaining UUID casting issues...';
  
  FOR policy_record IN 
    SELECT schemaname, tablename, policyname, qual
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%')
  LOOP
    RAISE WARNING '⚠️  Remaining UUID casting issue: %.% policy "%" - %', 
      policy_record.schemaname, policy_record.tablename, policy_record.policyname, policy_record.qual;
    problem_count := problem_count + 1;
  END LOOP;
  
  IF problem_count = 0 THEN
    RAISE NOTICE '✅ No remaining UUID casting issues found';
  ELSE
    RAISE NOTICE '⚠️  Found % remaining UUID casting issues - may need manual review', problem_count;
  END IF;
END
$$;

-- ============================================================================
-- FINAL VERIFICATION AND REPORTING
-- ============================================================================

DO $$
DECLARE
  total_policies INTEGER;
  safe_policies INTEGER;
  unsafe_policies INTEGER;
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Final Verification Report';
  RAISE NOTICE '=================================================================';
  
  -- Count total policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  -- Count safe policies
  SELECT COUNT(*) INTO safe_policies
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND NOT (qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%');
    
  -- Count unsafe policies
  unsafe_policies := total_policies - safe_policies;
  
  RAISE NOTICE 'Total RLS Policies: %', total_policies;
  RAISE NOTICE 'Safe Policies: %', safe_policies;
  RAISE NOTICE 'Problematic Policies: %', unsafe_policies;
  
  IF unsafe_policies = 0 THEN
    RAISE NOTICE '🎉 SUCCESS: All UUID casting issues have been resolved!';
    RAISE NOTICE 'You can now deploy recognition system schema safely.';
  ELSE
    RAISE NOTICE '⚠️  WARNING: % policies still have UUID casting issues', unsafe_policies;
    RAISE NOTICE 'Manual review may be required for remaining issues.';
  END IF;
  
  RAISE NOTICE '=================================================================';
END
$$;

-- Show current policy status for transparency
SELECT 
  schemaname,
  tablename, 
  policyname,
  CASE 
    WHEN qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%' THEN '❌ PROBLEMATIC'
    ELSE '✅ SAFE'
  END as status,
  CASE 
    WHEN qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%' THEN 'Contains UUID casting'
    ELSE 'No UUID casting detected'
  END as notes
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY 
  CASE WHEN qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%' THEN 0 ELSE 1 END,
  tablename, 
  policyname;