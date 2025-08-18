-- EMERGENCY FIX: Sprint Update Permissions
-- Run this in Supabase SQL Editor to fix sprint update issues

-- 1. Add missing RLS policies for sprint_history table
-- This will enable UPDATE, INSERT, and DELETE operations

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow update access to sprint_history" ON sprint_history;
DROP POLICY IF EXISTS "Allow insert access to sprint_history" ON sprint_history;  
DROP POLICY IF EXISTS "Allow delete access to sprint_history" ON sprint_history;

-- Create comprehensive RLS policies
CREATE POLICY "Allow update access to sprint_history" 
ON sprint_history 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow insert access to sprint_history" 
ON sprint_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow delete access to sprint_history" 
ON sprint_history 
FOR DELETE 
USING (true);

-- 2. Verify all policies are in place
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sprint_history' AND schemaname = 'public'
ORDER BY cmd;

-- 3. Expected result should show 4 policies:
-- - Allow read access to sprint_history (SELECT)
-- - Allow insert access to sprint_history (INSERT) 
-- - Allow update access to sprint_history (UPDATE)
-- - Allow delete access to sprint_history (DELETE)

-- 4. Test the permissions
-- This should succeed after the policies are applied
-- UPDATE sprint_history SET updated_at = NOW() WHERE id = 1;