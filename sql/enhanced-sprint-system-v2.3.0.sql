-- ENHANCED SPRINT SYSTEM: Complete Overhaul for v2.3.0
-- This migration enhances the existing global sprint system with full sprint-based functionality
-- Addresses: Sprint logic, Manager hours, Weekend auto-exclusion, Mobile optimization

-- =========================================================================
-- STEP 1: ENHANCED SPRINT CONFIGURATION
-- =========================================================================

-- Drop existing global sprint settings and recreate with enhanced structure
DROP TABLE IF EXISTS enhanced_sprint_configs CASCADE;
DROP VIEW IF EXISTS current_global_sprint CASCADE;
DROP VIEW IF EXISTS team_sprint_stats CASCADE;

-- Create enhanced sprint configuration table
CREATE TABLE enhanced_sprint_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  length_weeks INTEGER NOT NULL DEFAULT 2 CHECK (length_weeks BETWEEN 1 AND 4),
  working_days_count INTEGER GENERATED ALWAYS AS (
    -- Calculate working days (Sun-Thu only) for the sprint
    CASE 
      WHEN length_weeks = 1 THEN 5
      WHEN length_weeks = 2 THEN 10
      WHEN length_weeks = 3 THEN 15
      WHEN length_weeks = 4 THEN 20
      ELSE length_weeks * 5
    END
  ) STORED,
  is_active BOOLEAN DEFAULT false,
  created_by TEXT DEFAULT 'system',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sprint_number),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create sprint working days mapping table
CREATE TABLE sprint_working_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID REFERENCES enhanced_sprint_configs(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  is_working_day BOOLEAN GENERATED ALWAYS AS (
    day_of_week BETWEEN 0 AND 4 -- Only Sun-Thu are working days
  ) STORED,
  is_holiday BOOLEAN DEFAULT false,
  holiday_name TEXT,
  UNIQUE(sprint_id, work_date)
);

-- =========================================================================
-- STEP 2: ENHANCE SCHEDULE ENTRIES FOR SPRINT SYSTEM
-- =========================================================================

-- Add sprint-related columns to schedule_entries
ALTER TABLE schedule_entries 
ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES enhanced_sprint_configs(id),
ADD COLUMN IF NOT EXISTS is_weekend BOOLEAN GENERATED ALWAYS AS (
  EXTRACT(DOW FROM date) IN (5, 6) -- Friday=5, Saturday=6
) STORED,
ADD COLUMN IF NOT EXISTS calculated_hours DECIMAL(3,1) GENERATED ALWAYS AS (
  CASE 
    WHEN value = '1' THEN 7.0
    WHEN value = '0.5' THEN 3.5
    WHEN value = 'X' THEN 0.0
    ELSE 0.0
  END
) STORED;

-- =========================================================================
-- STEP 3: ENHANCED TEAM STRUCTURE FOR MULTI-TEAM SUPPORT
-- =========================================================================

-- Ensure teams table exists with proper structure
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add team_id to team_members if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE team_members ADD COLUMN team_id INTEGER REFERENCES teams(id);
    END IF;
END $$;

-- =========================================================================
-- STEP 4: MANAGER ROLE ENHANCEMENT
-- =========================================================================

-- Add manager-specific columns if not exists
DO $$ 
BEGIN
    -- Add manager_max_hours field for custom manager hour limits
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'manager_max_hours'
    ) THEN
        ALTER TABLE team_members ADD COLUMN manager_max_hours DECIMAL(3,1) DEFAULT 3.5;
    END IF;
    
    -- Add role field for future role-based permissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'role'
    ) THEN
        ALTER TABLE team_members ADD COLUMN role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'manager', 'coo'));
    END IF;
END $$;

-- Update existing managers
UPDATE team_members 
SET role = 'manager', manager_max_hours = 3.5 
WHERE is_manager = true;

-- =========================================================================
-- STEP 5: SPRINT CALCULATION FUNCTIONS
-- =========================================================================

-- Function to calculate sprint capacity for a team member
CREATE OR REPLACE FUNCTION calculate_member_sprint_capacity(
  member_id INTEGER,
  sprint_id UUID
) RETURNS TABLE (
  max_possible_hours DECIMAL(5,1),
  actual_hours DECIMAL(5,1),
  utilization_percentage DECIMAL(5,2),
  working_days_filled INTEGER,
  total_working_days INTEGER
) AS $$
DECLARE
  member_record RECORD;
  sprint_record RECORD;
BEGIN
  -- Get member information
  SELECT tm.is_manager, tm.manager_max_hours 
  INTO member_record
  FROM team_members tm 
  WHERE tm.id = member_id;
  
  -- Get sprint information
  SELECT sc.working_days_count, sc.start_date, sc.end_date
  INTO sprint_record
  FROM enhanced_sprint_configs sc 
  WHERE sc.id = sprint_id;
  
  -- Return calculated values
  RETURN QUERY
  SELECT 
    -- Max possible hours (managers get 3.5/day, regular members get 7/day)
    CASE 
      WHEN member_record.is_manager THEN sprint_record.working_days_count * member_record.manager_max_hours
      ELSE sprint_record.working_days_count * 7.0
    END as max_possible_hours,
    
    -- Actual hours from schedule entries
    COALESCE(SUM(se.calculated_hours), 0.0) as actual_hours,
    
    -- Utilization percentage
    CASE 
      WHEN member_record.is_manager AND sprint_record.working_days_count > 0 THEN
        ROUND(COALESCE(SUM(se.calculated_hours), 0.0) * 100.0 / (sprint_record.working_days_count * member_record.manager_max_hours), 2)
      WHEN NOT member_record.is_manager AND sprint_record.working_days_count > 0 THEN
        ROUND(COALESCE(SUM(se.calculated_hours), 0.0) * 100.0 / (sprint_record.working_days_count * 7.0), 2)
      ELSE 0.0
    END as utilization_percentage,
    
    -- Working days filled
    COUNT(CASE WHEN se.value IS NOT NULL AND NOT se.is_weekend THEN 1 END)::INTEGER as working_days_filled,
    
    -- Total working days in sprint
    sprint_record.working_days_count::INTEGER as total_working_days
    
  FROM schedule_entries se
  WHERE se.member_id = member_id 
    AND se.sprint_id = sprint_id
    AND se.date BETWEEN sprint_record.start_date AND sprint_record.end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate weekend entries for all team members in a sprint
CREATE OR REPLACE FUNCTION auto_generate_weekend_entries(sprint_id UUID)
RETURNS INTEGER AS $$
DECLARE
  sprint_record RECORD;
  member_record RECORD;
  current_date DATE;
  inserted_count INTEGER := 0;
BEGIN
  -- Get sprint information
  SELECT start_date, end_date INTO sprint_record
  FROM enhanced_sprint_configs WHERE id = sprint_id;
  
  -- Loop through all team members
  FOR member_record IN SELECT id FROM team_members LOOP
    -- Loop through all dates in sprint
    current_date := sprint_record.start_date;
    WHILE current_date <= sprint_record.end_date LOOP
      -- Check if it's a weekend (Friday=5, Saturday=6)
      IF EXTRACT(DOW FROM current_date) IN (5, 6) THEN
        -- Insert weekend entry if it doesn't exist
        INSERT INTO schedule_entries (member_id, date, value, reason, sprint_id)
        VALUES (
          member_record.id, 
          current_date, 
          'X', 
          'Weekend (auto-generated)', 
          sprint_id
        )
        ON CONFLICT (member_id, date) DO NOTHING;
        
        inserted_count := inserted_count + 1;
      END IF;
      
      current_date := current_date + 1;
    END LOOP;
  END LOOP;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- STEP 6: ENHANCED VIEWS FOR DASHBOARD DATA
-- =========================================================================

-- Create comprehensive current sprint view
CREATE OR REPLACE VIEW current_enhanced_sprint AS
SELECT 
  id,
  sprint_number,
  start_date,
  end_date,
  length_weeks,
  working_days_count,
  is_active,
  notes,
  -- Calculate time-based metrics
  CURRENT_DATE - start_date as days_elapsed,
  GREATEST(0, end_date - CURRENT_DATE) as days_remaining,
  end_date - start_date + 1 as total_days,
  
  -- Calculate progress percentage
  CASE 
    WHEN CURRENT_DATE < start_date THEN 0.0
    WHEN CURRENT_DATE > end_date THEN 100.0
    ELSE ROUND((CURRENT_DATE - start_date) * 100.0 / NULLIF(end_date - start_date, 0), 2)
  END as progress_percentage,
  
  -- Calculate working days remaining
  CASE 
    WHEN CURRENT_DATE > end_date THEN 0
    ELSE (
      SELECT COUNT(*)
      FROM generate_series(
        GREATEST(CURRENT_DATE, start_date), 
        end_date, 
        '1 day'::interval
      ) AS date_series(date)
      WHERE EXTRACT(DOW FROM date_series.date) BETWEEN 0 AND 4 -- Sun-Thu only
    )
  END as working_days_remaining,
  
  -- Status indicators
  CASE 
    WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN true 
    ELSE false 
  END as is_current,
  
  created_at,
  updated_at,
  created_by
FROM enhanced_sprint_configs
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- Create team sprint analytics view
CREATE OR REPLACE VIEW team_sprint_analytics AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.description,
  t.color,
  s.id as sprint_id,
  s.sprint_number,
  s.start_date,
  s.end_date,
  s.working_days_count,
  s.progress_percentage,
  s.days_remaining,
  
  -- Team composition
  COUNT(DISTINCT tm.id) as total_members,
  COUNT(DISTINCT CASE WHEN tm.is_manager THEN tm.id END) as manager_count,
  COUNT(DISTINCT CASE WHEN NOT tm.is_manager THEN tm.id END) as regular_member_count,
  
  -- Capacity calculations
  SUM(
    CASE 
      WHEN tm.is_manager THEN s.working_days_count * tm.manager_max_hours
      ELSE s.working_days_count * 7.0
    END
  ) as max_capacity_hours,
  
  -- Actual hours from schedule entries
  COALESCE(SUM(se.calculated_hours), 0.0) as actual_hours,
  
  -- Current week hours (Sunday to Thursday)
  COALESCE(SUM(
    CASE 
      WHEN se.date BETWEEN date_trunc('week', CURRENT_DATE) AND date_trunc('week', CURRENT_DATE) + INTERVAL '4 days' 
      THEN se.calculated_hours 
      ELSE 0 
    END
  ), 0.0) as current_week_hours,
  
  -- Utilization metrics
  ROUND(
    COALESCE(SUM(se.calculated_hours), 0.0) * 100.0 / 
    NULLIF(SUM(
      CASE 
        WHEN tm.is_manager THEN s.working_days_count * tm.manager_max_hours
        ELSE s.working_days_count * 7.0
      END
    ), 0),
    2
  ) as utilization_percentage,
  
  -- Completion metrics
  ROUND(
    COUNT(CASE WHEN se.value IS NOT NULL AND NOT se.is_weekend THEN 1 END) * 100.0 /
    NULLIF(COUNT(DISTINCT tm.id) * s.working_days_count, 0),
    2
  ) as completion_percentage
  
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
CROSS JOIN current_enhanced_sprint s
LEFT JOIN schedule_entries se ON (
  tm.id = se.member_id 
  AND se.sprint_id = s.id
  AND se.date BETWEEN s.start_date AND s.end_date
)
GROUP BY t.id, t.name, t.description, t.color, s.id, s.sprint_number, 
         s.start_date, s.end_date, s.working_days_count, s.progress_percentage, s.days_remaining
ORDER BY t.name;

-- =========================================================================
-- STEP 7: TRIGGERS AND AUTOMATION
-- =========================================================================

-- Trigger function to auto-generate weekend entries when a sprint is created
CREATE OR REPLACE FUNCTION trigger_auto_generate_weekends()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-generate for new active sprints
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Generate sprint working days
    INSERT INTO sprint_working_days (sprint_id, work_date, day_of_week)
    SELECT 
      NEW.id,
      date_series.date,
      EXTRACT(DOW FROM date_series.date)::INTEGER
    FROM generate_series(NEW.start_date, NEW.end_date, '1 day'::interval) AS date_series(date)
    ON CONFLICT (sprint_id, work_date) DO NOTHING;
    
    -- Auto-generate weekend entries
    PERFORM auto_generate_weekend_entries(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating weekend entries
DROP TRIGGER IF EXISTS auto_generate_weekend_entries_trigger ON enhanced_sprint_configs;
CREATE TRIGGER auto_generate_weekend_entries_trigger
  AFTER INSERT OR UPDATE ON enhanced_sprint_configs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_generate_weekends();

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_enhanced_sprint_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create timestamp trigger
CREATE TRIGGER update_enhanced_sprint_configs_updated_at
  BEFORE UPDATE ON enhanced_sprint_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_enhanced_sprint_timestamp();

-- =========================================================================
-- STEP 8: INDEXES FOR PERFORMANCE
-- =========================================================================

-- Core performance indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_sprint_configs_active ON enhanced_sprint_configs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_enhanced_sprint_configs_dates ON enhanced_sprint_configs(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_enhanced_sprint_configs_sprint_number ON enhanced_sprint_configs(sprint_number);

CREATE INDEX IF NOT EXISTS idx_sprint_working_days_sprint_id ON sprint_working_days(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_working_days_date ON sprint_working_days(work_date);
CREATE INDEX IF NOT EXISTS idx_sprint_working_days_working ON sprint_working_days(is_working_day) WHERE is_working_day = true;

CREATE INDEX IF NOT EXISTS idx_schedule_entries_sprint_id ON schedule_entries(sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_entries_weekend ON schedule_entries(is_weekend) WHERE is_weekend = true;
CREATE INDEX IF NOT EXISTS idx_schedule_entries_sprint_member_date ON schedule_entries(sprint_id, member_id, date) WHERE sprint_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_manager ON team_members(is_manager) WHERE is_manager = true;
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- =========================================================================
-- STEP 9: ROW LEVEL SECURITY
-- =========================================================================

-- Enable RLS on new tables
ALTER TABLE enhanced_sprint_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_working_days ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified for initial implementation)
CREATE POLICY "Allow read access to enhanced sprint configs" ON enhanced_sprint_configs
  FOR SELECT USING (true);

CREATE POLICY "Allow all operations on enhanced sprint configs" ON enhanced_sprint_configs
  FOR ALL USING (true);

CREATE POLICY "Allow read access to sprint working days" ON sprint_working_days
  FOR SELECT USING (true);

CREATE POLICY "Allow all operations on sprint working days" ON sprint_working_days
  FOR ALL USING (true);

-- =========================================================================
-- STEP 10: SEED DATA AND MIGRATION
-- =========================================================================

-- Insert default teams if they don't exist
INSERT INTO teams (name, description, color) VALUES
('Product Team', 'Product development and design', '#3B82F6'),
('Development Team - Tal', 'Development team led by Tal', '#10B981'),
('Development Team - Itai', 'Development team led by Itai', '#8B5CF6'),
('Infrastructure Team', 'System infrastructure and DevOps', '#F59E0B'),
('Data Team', 'Data analysis and engineering', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- Update team_members to assign to teams (based on existing data)
-- This is a best-effort assignment based on names - adjust as needed
UPDATE team_members SET team_id = (SELECT id FROM teams WHERE name = 'Product Team' LIMIT 1)
WHERE name IN ('Natan Shemesh', 'Ido Keller', 'Amit Zriker', 'Alon Mesika', 'Nadav Aharon', 'Yarom Kloss', 'Ziv Edelstein', 'Harel Mazan')
AND team_id IS NULL;

-- Insert default sprint if none exists
INSERT INTO enhanced_sprint_configs (
  sprint_number, 
  start_date, 
  end_date, 
  length_weeks, 
  is_active, 
  created_by, 
  notes
)
SELECT 
  1,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '13 days', -- 2 weeks = 14 days, minus 1 for inclusive range
  2,
  true,
  'migration',
  'Initial sprint created during v2.3.0 migration'
WHERE NOT EXISTS (SELECT 1 FROM enhanced_sprint_configs WHERE is_active = true);

-- Update existing schedule entries to link to current sprint
UPDATE schedule_entries 
SET sprint_id = (SELECT id FROM enhanced_sprint_configs WHERE is_active = true LIMIT 1)
WHERE sprint_id IS NULL 
  AND date >= (SELECT start_date FROM enhanced_sprint_configs WHERE is_active = true LIMIT 1)
  AND date <= (SELECT end_date FROM enhanced_sprint_configs WHERE is_active = true LIMIT 1);

-- =========================================================================
-- STEP 11: VERIFICATION AND CLEANUP
-- =========================================================================

-- Verify migration success
DO $$
DECLARE
  sprint_count INTEGER;
  team_count INTEGER;
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sprint_count FROM enhanced_sprint_configs WHERE is_active = true;
  SELECT COUNT(*) INTO team_count FROM teams;
  SELECT COUNT(*) INTO member_count FROM team_members WHERE team_id IS NOT NULL;
  
  RAISE NOTICE 'Enhanced Sprint System Migration Completed!';
  RAISE NOTICE 'Active sprints: %', sprint_count;
  RAISE NOTICE 'Teams configured: %', team_count;
  RAISE NOTICE 'Team members assigned: %', member_count;
  
  IF sprint_count = 0 THEN
    RAISE WARNING 'No active sprint found - please check sprint configuration';
  END IF;
  
  IF team_count = 0 THEN
    RAISE WARNING 'No teams configured - please set up teams';
  END IF;
END $$;

-- Show current sprint status
SELECT 
  'Current Sprint Status' as status,
  sprint_number,
  start_date,
  end_date,
  working_days_count,
  progress_percentage,
  days_remaining,
  is_current
FROM current_enhanced_sprint;

-- Show team analytics summary
SELECT 
  team_name,
  total_members,
  manager_count,
  max_capacity_hours,
  actual_hours,
  utilization_percentage,
  completion_percentage
FROM team_sprint_analytics
ORDER BY team_name;

-- Clean up old global sprint system if it exists
DROP TABLE IF EXISTS global_sprint_settings CASCADE;

COMMIT;
