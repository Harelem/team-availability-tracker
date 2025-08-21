-- Database Enhancement Script for Daily Company Status Functionality (Supabase Compatible)
-- This script adds missing columns and functionality while maintaining backward compatibility
-- IMPORTANT: This script only adds new features, does not modify existing structures
-- NOTE: This version removes CONCURRENTLY to work with Supabase's transaction environment

-- Add missing columns to team_members table
-- These columns are required by getDailyCompanyStatus function
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;

-- Add an inactive_date column if it doesn't exist (referenced in the function)
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS inactive_date DATE;

-- Create indexes for new columns to improve query performance
-- Note: Without CONCURRENTLY to work in Supabase's transaction environment
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_is_critical ON team_members(is_critical);
CREATE INDEX IF NOT EXISTS idx_team_members_inactive_date ON team_members(inactive_date);

-- Create a helper function to convert schedule_entries.value to numeric hours
-- This function maps: '1' -> 1.0, '0.5' -> 0.5, 'X' -> 0.0
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

-- Create a view that provides a unified interface for schedule data
-- This view translates between the database schema and function expectations
CREATE OR REPLACE VIEW schedule_entries_with_hours AS
SELECT 
  id,
  member_id as team_member_id, -- Map member_id to team_member_id for compatibility
  member_id, -- Keep original column name too
  date,
  value,
  value_to_hours(value) as hours, -- Convert value to numeric hours
  reason,
  created_at,
  updated_at
FROM schedule_entries;

-- Create enhanced function for getting daily company status data
-- This function provides comprehensive company-wide availability data for a specific date
CREATE OR REPLACE FUNCTION get_daily_company_status_data(target_date DATE)
RETURNS TABLE(
  team_id INTEGER,
  team_name VARCHAR(255),
  member_id INTEGER,
  member_name VARCHAR(255),
  member_hebrew VARCHAR(255),
  is_manager BOOLEAN,
  role VARCHAR(100),
  is_critical BOOLEAN,
  availability_value VARCHAR(3),
  availability_hours DECIMAL(2,1),
  reason TEXT,
  total_members BIGINT,
  available_members BIGINT,
  half_day_members BIGINT,
  unavailable_members BIGINT,
  team_capacity DECIMAL(4,1),
  team_utilization DECIMAL(5,2)
)
LANGUAGE SQL
STABLE
AS $$
  WITH team_summary AS (
    -- Calculate team-level statistics
    SELECT 
      t.id as team_id,
      t.name as team_name,
      COUNT(tm.id) as total_members,
      COUNT(CASE WHEN COALESCE(se.value, '1') = '1' THEN 1 END) as available_members,
      COUNT(CASE WHEN COALESCE(se.value, '1') = '0.5' THEN 1 END) as half_day_members,
      COUNT(CASE WHEN COALESCE(se.value, '1') = 'X' THEN 1 END) as unavailable_members,
      SUM(value_to_hours(COALESCE(se.value, '1'))) as team_capacity
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id 
      AND (tm.inactive_date IS NULL OR tm.inactive_date > target_date)
    LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = target_date
    GROUP BY t.id, t.name
  )
  SELECT 
    ts.team_id,
    ts.team_name,
    tm.id as member_id,
    tm.name as member_name,
    tm.hebrew as member_hebrew,
    COALESCE(tm.is_manager, false) as is_manager,
    tm.role,
    COALESCE(tm.is_critical, false) as is_critical,
    COALESCE(se.value, '1') as availability_value,
    value_to_hours(COALESCE(se.value, '1')) as availability_hours,
    se.reason,
    ts.total_members,
    ts.available_members,
    ts.half_day_members,
    ts.unavailable_members,
    ts.team_capacity,
    CASE 
      WHEN ts.total_members > 0 
      THEN ROUND((ts.team_capacity / ts.total_members * 100.0)::DECIMAL, 2)
      ELSE 0.00
    END as team_utilization
  FROM team_summary ts
  LEFT JOIN team_members tm ON ts.team_id = tm.team_id 
    AND (tm.inactive_date IS NULL OR tm.inactive_date > target_date)
  LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = target_date
  ORDER BY ts.team_name, tm.name;
$$;

-- Create helper functions for data validation and maintenance

-- Function to validate daily status data integrity
CREATE OR REPLACE FUNCTION validate_daily_status_data()
RETURNS TABLE(
  validation_type VARCHAR(50),
  status VARCHAR(20),
  message TEXT,
  count_affected INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  -- Check for team members without roles
  SELECT 
    'missing_roles' as validation_type,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END as status,
    'Team members without assigned roles: ' || COUNT(*) as message,
    COUNT(*)::INTEGER as count_affected
  FROM team_members 
  WHERE role IS NULL OR role = ''
  
  UNION ALL
  
  -- Check for orphaned schedule entries
  SELECT 
    'orphaned_schedule_entries' as validation_type,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'ERROR' END as status,
    'Schedule entries with invalid member references: ' || COUNT(*) as message,
    COUNT(*)::INTEGER as count_affected
  FROM schedule_entries se
  LEFT JOIN team_members tm ON se.member_id = tm.id
  WHERE tm.id IS NULL
  
  UNION ALL
  
  -- Check for team members without teams
  SELECT 
    'members_without_teams' as validation_type,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARNING' END as status,
    'Team members not assigned to teams: ' || COUNT(*) as message,
    COUNT(*)::INTEGER as count_affected
  FROM team_members tm
  LEFT JOIN teams t ON tm.team_id = t.id
  WHERE tm.team_id IS NULL OR t.id IS NULL;
$$;

-- Function to get a quick summary of daily status
CREATE OR REPLACE FUNCTION get_daily_status_summary(target_date DATE)
RETURNS TABLE(
  total_members INTEGER,
  available_members INTEGER,
  half_day_members INTEGER,
  unavailable_members INTEGER,
  total_capacity DECIMAL(5,1),
  utilization_percentage DECIMAL(5,2)
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    COUNT(*)::INTEGER as total_members,
    COUNT(CASE WHEN COALESCE(se.value, '1') = '1' THEN 1 END)::INTEGER as available_members,
    COUNT(CASE WHEN COALESCE(se.value, '1') = '0.5' THEN 1 END)::INTEGER as half_day_members,
    COUNT(CASE WHEN COALESCE(se.value, '1') = 'X' THEN 1 END)::INTEGER as unavailable_members,
    SUM(value_to_hours(COALESCE(se.value, '1'))) as total_capacity,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((SUM(value_to_hours(COALESCE(se.value, '1'))) / COUNT(*) * 100.0)::DECIMAL, 2)
      ELSE 0.00
    END as utilization_percentage
  FROM team_members tm
  LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = target_date
  WHERE (tm.inactive_date IS NULL OR tm.inactive_date > target_date);
$$;

-- Create additional indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date_value ON schedule_entries(date, value);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id_active ON team_members(team_id) WHERE inactive_date IS NULL;

-- Populate default role data for existing members
-- This ensures compatibility with the new functions
UPDATE team_members 
SET role = CASE 
  WHEN is_manager = true THEN 'Manager'
  ELSE 'Team Member'
END 
WHERE role IS NULL OR role = '';

-- Grant necessary permissions for the functions
-- Note: Supabase handles RLS policies, but we ensure functions are accessible
GRANT EXECUTE ON FUNCTION value_to_hours(VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_daily_company_status_data(DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_daily_status_data() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_daily_status_summary(DATE) TO authenticated, anon;

-- Grant SELECT permissions on the new view
GRANT SELECT ON schedule_entries_with_hours TO authenticated, anon;

-- Create a simple test query to verify the installation
-- This will help confirm everything is working
DO $verification$
DECLARE
  test_result INTEGER;
BEGIN
  -- Test the main function with today's date
  SELECT COUNT(*) INTO test_result
  FROM get_daily_company_status_data(CURRENT_DATE);
  
  RAISE NOTICE 'Database enhancement completed successfully!';
  RAISE NOTICE 'Test query returned % records for today', test_result;
  RAISE NOTICE 'Functions created: value_to_hours, get_daily_company_status_data, validate_daily_status_data, get_daily_status_summary';
  RAISE NOTICE 'View created: schedule_entries_with_hours';
  RAISE NOTICE 'New columns added: role, is_critical, inactive_date';
  RAISE NOTICE 'Ready for application use!';
END;
$verification$;