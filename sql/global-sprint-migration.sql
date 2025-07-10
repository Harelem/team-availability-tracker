-- GLOBAL SPRINT MIGRATION: Complete Sprint System Redesign
-- This script removes the complex team-specific sprint system and replaces it with a simple global system

-- =========================================================================
-- STEP 1: CLEANUP - Remove existing complex sprint infrastructure
-- =========================================================================

-- Drop existing sprint tables and views (safe cleanup)
DROP VIEW IF EXISTS current_sprints CASCADE;
DROP VIEW IF EXISTS sprint_stats CASCADE;
DROP TABLE IF EXISTS team_sprints CASCADE;

-- Remove sprint_length_weeks column from teams table if it exists (safe)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' AND column_name = 'sprint_length_weeks'
    ) THEN
        ALTER TABLE teams DROP COLUMN sprint_length_weeks CASCADE;
    END IF;
END $$;

-- Drop any sprint-related triggers safely
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_team_sprints_updated_at'
    ) THEN
        DROP TRIGGER update_team_sprints_updated_at ON team_sprints;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist, continue
        NULL;
END $$;

-- =========================================================================
-- STEP 2: CREATE GLOBAL SPRINT SYSTEM
-- =========================================================================

-- Create global sprint settings table (single source of truth)
CREATE TABLE IF NOT EXISTS global_sprint_settings (
    id SERIAL PRIMARY KEY,
    sprint_length_weeks INTEGER DEFAULT 1 CHECK (sprint_length_weeks BETWEEN 1 AND 4),
    current_sprint_number INTEGER DEFAULT 1,
    sprint_start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255) DEFAULT 'system'
);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_global_sprint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger for global sprint settings
DROP TRIGGER IF EXISTS update_global_sprint_settings_updated_at ON global_sprint_settings;
CREATE TRIGGER update_global_sprint_settings_updated_at
    BEFORE UPDATE ON global_sprint_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_global_sprint_updated_at();

-- =========================================================================
-- STEP 3: INSERT DEFAULT GLOBAL SPRINT
-- =========================================================================

-- Insert default global sprint settings (only if table is empty)
INSERT INTO global_sprint_settings (
    sprint_length_weeks, 
    current_sprint_number, 
    sprint_start_date,
    updated_by
)
SELECT 1, 1, CURRENT_DATE, 'migration'
WHERE NOT EXISTS (SELECT 1 FROM global_sprint_settings);

-- =========================================================================
-- STEP 4: CREATE HELPFUL VIEWS
-- =========================================================================

-- Create view for current global sprint information
CREATE OR REPLACE VIEW current_global_sprint AS
SELECT 
    id,
    sprint_length_weeks,
    current_sprint_number,
    sprint_start_date,
    -- Calculate sprint end date
    (sprint_start_date + (sprint_length_weeks * 7 - 1) * INTERVAL '1 day')::DATE as sprint_end_date,
    -- Calculate days remaining
    GREATEST(0, (sprint_start_date + (sprint_length_weeks * 7 - 1) * INTERVAL '1 day')::DATE - CURRENT_DATE) as days_remaining,
    -- Calculate progress percentage
    CASE 
        WHEN CURRENT_DATE < sprint_start_date THEN 0
        WHEN CURRENT_DATE > (sprint_start_date + (sprint_length_weeks * 7 - 1) * INTERVAL '1 day')::DATE THEN 100
        ELSE ROUND(
            (CURRENT_DATE - sprint_start_date) * 100.0 / 
            NULLIF((sprint_start_date + (sprint_length_weeks * 7 - 1) * INTERVAL '1 day')::DATE - sprint_start_date, 0),
            2
        )
    END as progress_percentage,
    -- Check if sprint is active
    CASE 
        WHEN CURRENT_DATE BETWEEN sprint_start_date AND (sprint_start_date + (sprint_length_weeks * 7 - 1) * INTERVAL '1 day')::DATE 
        THEN true 
        ELSE false 
    END as is_active,
    created_at,
    updated_at,
    updated_by
FROM global_sprint_settings
ORDER BY id DESC
LIMIT 1;

-- Create view for team sprint statistics within global sprint
CREATE OR REPLACE VIEW team_sprint_stats AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.description,
    t.color,
    COUNT(DISTINCT tm.id) as team_size,
    COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as manager_count,
    -- Get current global sprint info
    gs.current_sprint_number,
    gs.sprint_start_date,
    gs.sprint_end_date,
    gs.progress_percentage,
    gs.days_remaining,
    gs.is_active,
    -- Calculate team-specific statistics for current sprint
    COALESCE(SUM(
        CASE 
            WHEN se.value = '1' AND se.date BETWEEN gs.sprint_start_date AND gs.sprint_end_date THEN 7
            WHEN se.value = '0.5' AND se.date BETWEEN gs.sprint_start_date AND gs.sprint_end_date THEN 3.5
            ELSE 0
        END
    ), 0) as sprint_hours,
    -- Calculate current week hours (Sunday to Thursday)
    COALESCE(SUM(
        CASE 
            WHEN se.value = '1' AND se.date BETWEEN date_trunc('week', CURRENT_DATE) AND date_trunc('week', CURRENT_DATE) + INTERVAL '4 days' THEN 7
            WHEN se.value = '0.5' AND se.date BETWEEN date_trunc('week', CURRENT_DATE) AND date_trunc('week', CURRENT_DATE) + INTERVAL '4 days' THEN 3.5
            ELSE 0
        END
    ), 0) as current_week_hours,
    -- Calculate team capacity for sprint
    COUNT(DISTINCT tm.id) * gs.sprint_length_weeks * 5 * 7 as total_capacity_hours,
    -- Calculate capacity utilization
    ROUND(
        COALESCE(SUM(
            CASE 
                WHEN se.value = '1' AND se.date BETWEEN gs.sprint_start_date AND gs.sprint_end_date THEN 7
                WHEN se.value = '0.5' AND se.date BETWEEN gs.sprint_start_date AND gs.sprint_end_date THEN 3.5
                ELSE 0
            END
        ), 0) * 100.0 / 
        NULLIF(COUNT(DISTINCT tm.id) * gs.sprint_length_weeks * 5 * 7, 0),
        2
    ) as capacity_utilization
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN schedule_entries se ON tm.id = se.member_id
CROSS JOIN current_global_sprint gs
GROUP BY t.id, t.name, t.description, t.color, 
         gs.current_sprint_number, gs.sprint_start_date, gs.sprint_end_date, 
         gs.progress_percentage, gs.days_remaining, gs.is_active, gs.sprint_length_weeks
ORDER BY t.name;

-- =========================================================================
-- STEP 5: SET UP ROW LEVEL SECURITY
-- =========================================================================

-- Enable RLS on global sprint settings
ALTER TABLE global_sprint_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read sprint settings
CREATE POLICY "Allow read access to global sprint settings" ON global_sprint_settings
    FOR SELECT USING (true);

-- Allow insert/update for sprint settings (will be controlled by application logic)
CREATE POLICY "Allow update access to global sprint settings" ON global_sprint_settings
    FOR ALL USING (true);

-- =========================================================================
-- STEP 6: VERIFICATION
-- =========================================================================

-- Verify the migration worked
SELECT 'Global Sprint Migration Completed Successfully!' as status;

-- Show current global sprint
SELECT * FROM current_global_sprint;

-- Show team sprint statistics
SELECT team_name, team_size, sprint_hours, capacity_utilization, current_week_hours 
FROM team_sprint_stats;

-- Show global sprint settings
SELECT * FROM global_sprint_settings;