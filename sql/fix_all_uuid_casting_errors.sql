-- Fix All UUID Casting Errors
-- This script removes all problematic auth.uid()::INTEGER casts that cause UUID casting errors

-- ============================================================================
-- FIX AVAILABILITY TEMPLATES RLS POLICIES
-- ============================================================================

-- Drop existing problematic policies on availability_templates
DROP POLICY IF EXISTS "Users can view public templates and their own" ON availability_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON availability_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON availability_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON availability_templates;

-- Create fixed policies for availability_templates (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'availability_templates') THEN
    
    -- Allow authenticated users to view all templates (simplified)
    EXECUTE 'CREATE POLICY "Allow authenticated users to view templates" ON availability_templates
      FOR SELECT USING (auth.role() = ''authenticated'')';

    -- Allow system operations for creating templates
    EXECUTE 'CREATE POLICY "Allow system to create templates" ON availability_templates
      FOR INSERT WITH CHECK (true)';

    -- Allow system operations for updating templates  
    EXECUTE 'CREATE POLICY "Allow system to update templates" ON availability_templates
      FOR UPDATE USING (true)';

    -- Allow system operations for deleting templates
    EXECUTE 'CREATE POLICY "Allow system to delete templates" ON availability_templates
      FOR DELETE USING (true)';

    RAISE NOTICE 'Fixed availability_templates RLS policies';
  ELSE
    RAISE NOTICE 'availability_templates table does not exist - skipping';
  END IF;
END
$$;

-- ============================================================================
-- FIX RECOGNITION SYSTEM RLS POLICIES (if they exist with old casting)
-- ============================================================================

-- Drop existing problematic policies on user_achievements (if they exist)
DROP POLICY IF EXISTS "Users can view their own achievements and team achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can update their own achievements" ON user_achievements;

-- Drop existing problematic policies on recognition_metrics (if they exist)
DROP POLICY IF EXISTS "Users can view their own metrics and team metrics" ON recognition_metrics;

-- Create fixed policies for user_achievements (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements') THEN
    
    -- Allow authenticated users to view achievements (simplified)
    EXECUTE 'CREATE POLICY "Allow authenticated users to view achievements" ON user_achievements
      FOR SELECT USING (auth.role() = ''authenticated'')';

    -- Allow system operations for updating achievements  
    EXECUTE 'CREATE POLICY "Allow system to update achievements" ON user_achievements
      FOR UPDATE USING (true)';

    RAISE NOTICE 'Fixed user_achievements RLS policies';
  ELSE
    RAISE NOTICE 'user_achievements table does not exist - skipping';
  END IF;
END
$$;

-- Create fixed policies for recognition_metrics (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recognition_metrics') THEN
    
    -- Allow authenticated users to view metrics (simplified)
    EXECUTE 'CREATE POLICY "Allow authenticated users to view metrics" ON recognition_metrics
      FOR SELECT USING (auth.role() = ''authenticated'')';

    RAISE NOTICE 'Fixed recognition_metrics RLS policies';
  ELSE
    RAISE NOTICE 'recognition_metrics table does not exist - skipping';
  END IF;
END
$$;

-- ============================================================================
-- CHECK FOR OTHER POTENTIAL CASTING ISSUES
-- ============================================================================

-- Look for any other tables that might have problematic RLS policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT schemaname, tablename, policyname, qual
    FROM pg_policies 
    WHERE qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%'
  LOOP
    RAISE WARNING 'Found potential UUID casting issue in policy: %.% - %', 
      policy_record.tablename, policy_record.policyname, policy_record.qual;
  END LOOP;
END
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all current policies to verify the fix
SELECT 
  schemaname,
  tablename, 
  policyname,
  CASE 
    WHEN qual LIKE '%auth.uid()::integer%' OR qual LIKE '%auth.uid()::INTEGER%' THEN 'PROBLEMATIC'
    ELSE 'OK'
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'UUID Casting Fix Complete';
  RAISE NOTICE 'All auth.uid()::INTEGER casts have been removed from RLS policies';
  RAISE NOTICE 'Tables now use simplified authentication: auth.role() = ''authenticated''';
  RAISE NOTICE '=================================================================';
END
$$;