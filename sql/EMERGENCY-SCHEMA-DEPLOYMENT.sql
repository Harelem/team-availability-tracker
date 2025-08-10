-- EMERGENCY SCHEMA DEPLOYMENT SCRIPT
-- Team Availability Tracker - Critical Schema Alignment
-- 
-- DEPLOYMENT ORDER: Execute these scripts in EXACT sequence
-- Time Estimate: 30 minutes total deployment time
-- 
-- PRE-REQUISITES:
-- 1. Database backup completed
-- 2. Application temporarily offline
-- 3. Database admin access confirmed

-- =====================================================
-- PHASE 1: CRITICAL TEAMS TABLE AND RELATIONSHIPS
-- Time: ~5 minutes
-- Impact: Fixes team loading issues
-- =====================================================

-- Create teams table (CRITICAL - Application expects this)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add team_id to team_members (CRITICAL - Required for relationships)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS team_id INTEGER;

-- Create critical indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_team_name ON team_members(team_id, name);

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create teams policies
CREATE POLICY "Allow read access to teams" ON teams
    FOR SELECT USING (true);

-- Create teams trigger
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert required teams data
INSERT INTO teams (name, description, color) VALUES
    ('Development Team - Tal', 'Development team led by Tal Azaria', '#10b981'),
    ('Development Team - Itay', 'Development team led by Itay Mizrachi', '#3b82f6'),
    ('Infrastructure Team', 'Infrastructure team led by Aviram Sparsky', '#f59e0b'),
    ('Data Team', 'Data team led by Matan Blaich', '#ef4444'),
    ('Original Team', 'Original team with Harel and Amit', '#8b5cf6'),
    ('Management Team', 'Executive and management team', '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- PHASE 2: CRITICAL MISSING COLUMNS
-- Time: ~3 minutes  
-- Impact: Fixes daily status and critical absences
-- =====================================================

-- Add missing columns to team_members (CRITICAL for getDailyCompanyStatus)
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inactive_date DATE;

-- Create indexes for new columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_is_critical ON team_members(is_critical);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_inactive_date ON team_members(inactive_date);

-- =====================================================
-- PHASE 3: ENHANCED SCHEMA FUNCTIONS AND VIEWS
-- Time: ~5 minutes
-- Impact: Fixes hours calculations and data consistency  
-- =====================================================

-- Create value_to_hours function (CRITICAL for schedule calculations)
CREATE OR REPLACE FUNCTION value_to_hours(value_str VARCHAR(3))
RETURNS DECIMAL(2,1)
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN value_str = '1' THEN 1.0
    WHEN value_str = '0.5' THEN 0.5
    WHEN value_str = 'X' THEN 0.0
    ELSE 0.0
  END;
$$;

-- Create enhanced schedule view (Provides compatibility layer)
CREATE OR REPLACE VIEW schedule_entries_with_hours AS
SELECT 
  id,
  member_id as team_member_id,
  member_id,
  date,
  value,
  value_to_hours(value) as hours,
  reason,
  created_at,
  updated_at
FROM schedule_entries;

-- Create enhanced daily status function
CREATE OR REPLACE FUNCTION get_daily_company_status_data(target_date DATE)
RETURNS TABLE (
  member_id INTEGER,
  member_name VARCHAR(255),
  member_hebrew VARCHAR(255),
  team_id INTEGER,
  member_role VARCHAR(100),
  is_manager BOOLEAN,
  is_critical BOOLEAN,
  hours DECIMAL(2,1),
  reason TEXT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    tm.id as member_id,
    tm.name as member_name,
    tm.hebrew as member_hebrew,
    tm.team_id,
    tm.role as member_role,
    tm.is_manager,
    COALESCE(tm.is_critical, false) as is_critical,
    COALESCE(value_to_hours(se.value), 1.0) as hours,
    se.reason
  FROM team_members tm
  LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = target_date
  WHERE tm.inactive_date IS NULL
  ORDER BY tm.team_id, tm.name;
$$;

-- =====================================================
-- PHASE 4: DATA POPULATION AND VALIDATION
-- Time: ~2 minutes
-- Impact: Ensures data consistency
-- =====================================================

-- Populate default member roles
CREATE OR REPLACE FUNCTION populate_default_member_data()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Set default role for members without role
  UPDATE team_members 
  SET role = CASE 
    WHEN is_manager = true THEN 'Team Manager'
    ELSE 'Team Member'
  END
  WHERE role IS NULL AND inactive_date IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN format('Updated %s members with default roles', updated_count);
END;
$$;

-- Execute data population
SELECT populate_default_member_data();

-- Create validation function
CREATE OR REPLACE FUNCTION validate_schema_deployment()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE SQL
STABLE
AS $$
  -- Check teams table exists
  SELECT 
    'teams_table_exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') 
         THEN 'PASS' ELSE 'FAIL' END as status,
    'Teams table creation' as details
  
  UNION ALL
  
  -- Check team_members.team_id column exists
  SELECT 
    'team_id_column_exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'team_id') 
         THEN 'PASS' ELSE 'FAIL' END as status,
    'team_members.team_id column' as details
  
  UNION ALL
  
  -- Check team_members.role column exists
  SELECT 
    'role_column_exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'role') 
         THEN 'PASS' ELSE 'FAIL' END as status,
    'team_members.role column' as details
  
  UNION ALL
  
  -- Check team_members.is_critical column exists
  SELECT 
    'is_critical_column_exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'is_critical') 
         THEN 'PASS' ELSE 'FAIL' END as status,
    'team_members.is_critical column' as details
  
  UNION ALL
  
  -- Check value_to_hours function exists
  SELECT 
    'value_to_hours_function_exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'value_to_hours') 
         THEN 'PASS' ELSE 'FAIL' END as status,
    'value_to_hours function' as details
  
  UNION ALL
  
  -- Check teams count
  SELECT 
    'teams_data_populated' as check_name,
    CASE WHEN (SELECT COUNT(*) FROM teams) >= 5 
         THEN 'PASS' ELSE 'FAIL' END as status,
    'Teams data populated (expected: 5+)' as details;
$$;

-- =====================================================
-- PHASE 5: PERFORMANCE OPTIMIZATIONS
-- Time: ~5 minutes
-- Impact: Prevents performance issues post-deployment
-- =====================================================

-- Remove duplicate/conflicting policies for performance
DROP POLICY IF EXISTS "Allow insert/update/delete on team_members" ON team_members;
DROP POLICY IF EXISTS "Allow insert/update/delete on schedule_entries" ON schedule_entries;

-- Create team stats view for better performance
CREATE OR REPLACE VIEW team_stats AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.color,
    COUNT(tm.id) as member_count,
    COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as manager_count,
    t.created_at,
    t.updated_at
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.inactive_date IS NULL
GROUP BY t.id, t.name, t.description, t.color, t.created_at, t.updated_at
ORDER BY t.name;

-- Create summary function for quick status checks
CREATE OR REPLACE FUNCTION get_daily_status_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_members INTEGER,
  available_members INTEGER,
  half_day_members INTEGER,
  unavailable_members INTEGER,
  reserve_duty_members INTEGER,
  critical_absences INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  WITH status_data AS (
    SELECT 
      value_to_hours(COALESCE(se.value, '1')) as hours,
      COALESCE(tm.is_critical, false) as is_critical,
      se.reason
    FROM team_members tm
    LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = target_date
    WHERE tm.inactive_date IS NULL
  )
  SELECT 
    COUNT(*)::INTEGER as total_members,
    COUNT(CASE WHEN hours = 1.0 THEN 1 END)::INTEGER as available_members,
    COUNT(CASE WHEN hours = 0.5 THEN 1 END)::INTEGER as half_day_members,
    COUNT(CASE WHEN hours = 0.0 AND COALESCE(reason, '') != 'שמירה' THEN 1 END)::INTEGER as unavailable_members,
    COUNT(CASE WHEN reason = 'שמירה' THEN 1 END)::INTEGER as reserve_duty_members,
    COUNT(CASE WHEN hours = 0.0 AND is_critical = true THEN 1 END)::INTEGER as critical_absences
  FROM status_data;
$$;

-- =====================================================
-- DEPLOYMENT VALIDATION
-- Run this to verify deployment success
-- =====================================================

-- Execute validation check
SELECT * FROM validate_schema_deployment();

-- Test core functions
SELECT 'value_to_hours test' as test_name, value_to_hours('1') as result_1, value_to_hours('0.5') as result_half, value_to_hours('X') as result_zero;

-- Test daily status summary
SELECT 'Daily status summary test' as test_name, * FROM get_daily_status_summary();

-- Display teams
SELECT 'Teams created' as test_name, COUNT(*) as team_count FROM teams;

-- Display members with team assignments
SELECT 
  'Member assignments' as test_name,
  COUNT(*) as total_members,
  COUNT(team_id) as assigned_members,
  COUNT(role) as members_with_role
FROM team_members 
WHERE inactive_date IS NULL;

-- =====================================================
-- SUCCESS CONFIRMATION
-- If all checks PASS, schema deployment is successful
-- =====================================================

-- Final confirmation query
SELECT 
  'DEPLOYMENT STATUS' as status,
  CASE 
    WHEN (SELECT COUNT(*) FROM validate_schema_deployment() WHERE status = 'FAIL') = 0 
    THEN '✅ SUCCESS - All schema updates deployed correctly'
    ELSE '❌ FAILURE - Check validation results above'
  END as result;

-- =====================================================
-- ROLLBACK SCRIPT (IF NEEDED)
-- Keep this commented out unless rollback is required
-- =====================================================

/*
-- EMERGENCY ROLLBACK (ONLY IF DEPLOYMENT FAILS)
-- Uncomment and run ONLY if deployment causes issues

-- Drop new functions and views
DROP FUNCTION IF EXISTS get_daily_status_summary(DATE);
DROP FUNCTION IF EXISTS get_daily_company_status_data(DATE);
DROP VIEW IF EXISTS schedule_entries_with_hours;
DROP VIEW IF EXISTS team_stats;
DROP FUNCTION IF EXISTS value_to_hours(VARCHAR);
DROP FUNCTION IF EXISTS populate_default_member_data();
DROP FUNCTION IF EXISTS validate_schema_deployment();

-- Remove new columns (WARNING: DATA LOSS)
-- ALTER TABLE team_members DROP COLUMN IF EXISTS role;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS is_critical;  
-- ALTER TABLE team_members DROP COLUMN IF EXISTS inactive_date;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS team_id;

-- Drop teams table (WARNING: DATA LOSS)  
-- DROP TABLE IF EXISTS teams CASCADE;
*/

-- =====================================================
-- POST-DEPLOYMENT TASKS
-- Execute AFTER schema deployment success:
--
-- 1. Update TypeScript interfaces in src/lib/supabase.ts
-- 2. Test application team loading functionality
-- 3. Verify COO Dashboard works correctly
-- 4. Test daily company status functionality
-- 5. Monitor application logs for any remaining errors
-- =====================================================