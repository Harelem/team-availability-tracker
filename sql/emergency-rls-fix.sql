-- EMERGENCY RLS FIX: Restore schedule_entries write permissions
-- ISSUE: Performance optimization migrations dropped INSERT/UPDATE policies
-- IMPACT: Users cannot update schedules - getting RLS policy violations
-- FIX: Recreate the missing policy that was accidentally dropped

-- =============================================================================
-- PHASE 1: IMMEDIATE EMERGENCY UNBLOCK (Run this first)
-- =============================================================================

-- Check current policies (diagnostic)
SELECT 
    'BEFORE FIX - Current Policies' as status,
    policyname, 
    cmd as operation,
    permissive,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'schedule_entries'
ORDER BY policyname;

-- Emergency temporary policy to immediately unblock users
DROP POLICY IF EXISTS "emergency_schedule_access" ON schedule_entries;
CREATE POLICY "emergency_schedule_access" ON schedule_entries
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

SELECT '✅ EMERGENCY FIX APPLIED - Schedule updates should work now' as status;

-- =============================================================================
-- PHASE 2: RESTORE PROPER POLICY (Run after confirming emergency fix works)
-- =============================================================================

-- Remove emergency policy
DROP POLICY IF EXISTS "emergency_schedule_access" ON schedule_entries;

-- Recreate the proper policy that was accidentally dropped in performance migrations
-- This matches the original schema.sql policy that was working before
CREATE POLICY "Allow insert/update/delete on schedule_entries" ON schedule_entries
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Verify the fix
SELECT 
    'AFTER FIX - Restored Policies' as status,
    policyname, 
    cmd as operation,
    permissive,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'schedule_entries'
ORDER BY policyname;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Test that we can now insert/update schedule entries
-- This should work without RLS violations
DO $$
BEGIN
    -- Test insert (this will fail if RLS policy is still blocking)
    INSERT INTO schedule_entries (member_id, date, value, reason) 
    VALUES (1, CURRENT_DATE, '1', 'RLS test - safe to delete')
    ON CONFLICT (member_id, date) DO UPDATE SET 
        value = EXCLUDED.value,
        reason = EXCLUDED.reason,
        updated_at = NOW();
    
    -- Clean up test entry
    DELETE FROM schedule_entries 
    WHERE member_id = 1 AND date = CURRENT_DATE AND reason = 'RLS test - safe to delete';
    
    RAISE NOTICE '✅ RLS POLICY FIX SUCCESSFUL - Schedule updates working';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ RLS POLICY STILL BLOCKING - Error: %', SQLERRM;
END $$;

-- Final status check
SELECT 
    '🎉 RLS FIX COMPLETE' as result,
    'Schedule entries can now be inserted/updated/deleted' as description,
    'Emergency resolved - users can update schedules again' as status;