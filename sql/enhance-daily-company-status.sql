-- Database Enhancement Script for Daily Company Status Functionality
-- This script adds missing columns and functionality while maintaining backward compatibility
-- IMPORTANT: This script only adds new features, does not modify existing structures

-- Add missing columns to team_members table
-- These columns are required by getDailyCompanyStatus function
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;

-- Create indexes for new columns to improve query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_is_critical ON team_members(is_critical);

-- Add an inactive_date column if it doesn't exist (referenced in the function)
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS inactive_date DATE;

-- Create index for inactive_date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_inactive_date ON team_members(inactive_date);

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
-- This function handles the data type conversions and column name mappings
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
    COALESCE(value_to_hours(se.value), 1.0) as hours, -- Default to 1.0 (full day) if no entry
    se.reason
  FROM team_members tm
  LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = target_date
  WHERE tm.inactive_date IS NULL -- Only active members
  ORDER BY tm.team_id, tm.name;
$$;

-- Update the existing policies to include the new columns
-- Add policy for the new view
CREATE POLICY "Allow read access to schedule_entries_with_hours" ON schedule_entries_with_hours
    FOR SELECT USING (true);

-- Create a function to validate and populate missing data
-- This helps identify any data inconsistencies
CREATE OR REPLACE FUNCTION validate_daily_status_data()
RETURNS TABLE(
  issue_type TEXT,
  member_id INTEGER,
  member_name VARCHAR(255),
  description TEXT
)
LANGUAGE SQL
STABLE
AS $$
  -- Check for members without team assignments
  SELECT 
    'missing_team_assignment' as issue_type,
    id as member_id,
    name as member_name,
    'Member has no team assigned' as description
  FROM team_members 
  WHERE team_id IS NULL AND inactive_date IS NULL
  
  UNION ALL
  
  -- Check for members without role assignment
  SELECT 
    'missing_role' as issue_type,
    id as member_id,
    name as member_name,
    'Member has no role assigned' as description
  FROM team_members 
  WHERE role IS NULL AND inactive_date IS NULL
  
  UNION ALL
  
  -- Check for invalid schedule values
  SELECT 
    'invalid_schedule_value' as issue_type,
    se.member_id,
    tm.name as member_name,
    'Schedule entry has invalid value: ' || se.value as description
  FROM schedule_entries se
  JOIN team_members tm ON se.member_id = tm.id
  WHERE se.value NOT IN ('1', '0.5', 'X');
$$;

-- Create a function to safely populate default values for new columns
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

-- Create enhanced error handling function for getDailyCompanyStatus
CREATE OR REPLACE FUNCTION log_daily_status_error(
  error_message TEXT,
  target_date DATE DEFAULT CURRENT_DATE,
  context_info JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log error to a table if it exists, otherwise just raise notice
  RAISE NOTICE 'Daily Status Error [%]: % - Context: %', target_date, error_message, context_info;
END;
$$;

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

-- Add comments for documentation
COMMENT ON FUNCTION value_to_hours(VARCHAR) IS 'Converts schedule_entries.value to numeric hours: 1->1.0, 0.5->0.5, X->0.0';
COMMENT ON VIEW schedule_entries_with_hours IS 'Unified view providing both original and converted schedule data for compatibility';
COMMENT ON FUNCTION get_daily_company_status_data(DATE) IS 'Returns structured data for daily company status with proper type conversions';
COMMENT ON FUNCTION validate_daily_status_data() IS 'Validates data integrity and identifies potential issues';
COMMENT ON FUNCTION populate_default_member_data() IS 'Safely populates default values for new team_members columns';
COMMENT ON FUNCTION get_daily_status_summary(DATE) IS 'Returns quick summary statistics for daily company status';

-- Validation query to confirm enhancements work
-- SELECT * FROM validate_daily_status_data();
-- SELECT populate_default_member_data();
-- SELECT * FROM get_daily_status_summary();