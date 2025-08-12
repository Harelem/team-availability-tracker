-- Quick Database Fix for COO Dashboard
-- This minimal script adds only the essential missing components

-- Add missing columns to team_members table
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inactive_date DATE;

-- Create the critical helper function
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

-- Create the main function that was missing
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
  unavailable_members BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  WITH team_summary AS (
    SELECT 
      t.id as team_id,
      t.name as team_name,
      COUNT(tm.id) as total_members,
      COUNT(CASE WHEN COALESCE(se.value, '1') = '1' THEN 1 END) as available_members,
      COUNT(CASE WHEN COALESCE(se.value, '1') = '0.5' THEN 1 END) as half_day_members,
      COUNT(CASE WHEN COALESCE(se.value, '1') = 'X' THEN 1 END) as unavailable_members
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id 
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
    ts.unavailable_members
  FROM team_summary ts
  LEFT JOIN team_members tm ON ts.team_id = tm.team_id 
  LEFT JOIN schedule_entries se ON tm.id = se.member_id AND se.date = target_date
  ORDER BY ts.team_name, tm.name;
$$;

-- Set default roles for existing members
UPDATE team_members 
SET role = CASE 
  WHEN is_manager = true THEN 'Manager'
  ELSE 'Team Member'
END 
WHERE role IS NULL;

-- Test that it works
SELECT 'Database fix completed successfully!' as status;