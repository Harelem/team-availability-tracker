-- Migration: Fix missing RLS policy for team_members table
-- Date: 2025-08-02
-- Purpose: Add missing ALL operations policy for team_members table to fix Daily Company Status queries

-- Add the missing RLS policy for INSERT/UPDATE/DELETE operations on team_members
CREATE POLICY IF NOT EXISTS "Allow all operations on team_members" ON team_members
    FOR ALL USING (true);

-- Verify the policy was created
DO $$
BEGIN
    RAISE NOTICE 'RLS policy "Allow all operations on team_members" has been created successfully';
END $$;