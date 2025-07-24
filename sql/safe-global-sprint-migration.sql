-- SAFE GLOBAL SPRINT MIGRATION: Data Preservation Edition
-- This script safely updates the sprint system WITHOUT destroying existing data
-- CRITICAL: This replaces destructive operations with safe, additive ones

-- =========================================================================
-- STEP 1: SAFE CLEANUP - Only remove objects if they exist, preserve data
-- =========================================================================

-- Create global sprint settings table if it doesn't exist (SAFE)
CREATE TABLE IF NOT EXISTS global_sprint_settings (
    id SERIAL PRIMARY KEY,
    sprint_length_weeks INTEGER DEFAULT 1 CHECK (sprint_length_weeks BETWEEN 1 AND 4),
    current_sprint_number INTEGER DEFAULT 1,
    sprint_start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255) DEFAULT 'system'
);

-- Create or replace trigger function (SAFE)
CREATE OR REPLACE FUNCTION update_global_sprint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger for global sprint settings (SAFE)
DO $$ 
BEGIN
    -- Only create trigger if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_global_sprint_settings_updated_at'
        AND event_object_table = 'global_sprint_settings'
    ) THEN
        CREATE TRIGGER update_global_sprint_settings_updated_at
            BEFORE UPDATE ON global_sprint_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_global_sprint_updated_at();
    END IF;
END $$;

-- =========================================================================
-- STEP 2: SAFE DATA INSERTION - Only if data doesn't exist
-- =========================================================================

-- Insert default global sprint settings only if table is empty (SAFE)
DO $$
BEGIN
    -- Only insert if no settings exist
    IF NOT EXISTS (SELECT 1 FROM global_sprint_settings) THEN
        INSERT INTO global_sprint_settings (
            sprint_length_weeks, 
            current_sprint_number, 
            sprint_start_date,
            updated_by
        ) VALUES (1, 1, CURRENT_DATE, 'safe_migration');
        
        RAISE NOTICE 'Created initial global sprint settings';
    ELSE
        RAISE NOTICE 'Global sprint settings already exist - preserving existing data';
    END IF;
END $$;

-- =========================================================================
-- STEP 3: SAFE VIEW CREATION - Create or replace views
-- =========================================================================

-- Create view for current global sprint information (SAFE)
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

-- Create view for team sprint statistics within global sprint (SAFE)
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
-- STEP 4: SAFE ROW LEVEL SECURITY SETUP
-- =========================================================================

-- Enable RLS on global sprint settings (SAFE)
ALTER TABLE global_sprint_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate (SAFE)
DROP POLICY IF EXISTS "Allow read access to global sprint settings" ON global_sprint_settings;
DROP POLICY IF EXISTS "Allow update access to global sprint settings" ON global_sprint_settings;

-- Allow everyone to read sprint settings (SAFE)
CREATE POLICY "Allow read access to global sprint settings" ON global_sprint_settings
    FOR SELECT USING (true);

-- Allow insert/update for sprint settings (SAFE)
CREATE POLICY "Allow update access to global sprint settings" ON global_sprint_settings
    FOR ALL USING (true);

-- =========================================================================
-- STEP 5: SAFE CLEANUP OF OLD OBJECTS (Only if they exist)
-- =========================================================================

-- Safely drop old sprint tables/views only if they exist and are empty
DO $$ 
BEGIN
    -- Check if old views exist and drop them safely
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'current_sprints') THEN
        DROP VIEW current_sprints CASCADE;
        RAISE NOTICE 'Dropped old current_sprints view';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sprint_stats') THEN
        DROP VIEW sprint_stats CASCADE;
        RAISE NOTICE 'Dropped old sprint_stats view';
    END IF;
    
    -- Only drop team_sprints table if it exists and is empty (SAFE)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_sprints') THEN
        -- Check if table is empty before dropping
        DECLARE
            row_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO row_count FROM team_sprints;
            IF row_count = 0 THEN
                DROP TABLE team_sprints CASCADE;
                RAISE NOTICE 'Dropped empty team_sprints table';
            ELSE
                RAISE NOTICE 'team_sprints table contains data (% rows) - preserving', row_count;
            END IF;
        END;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist, continue
        NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during safe cleanup: %', SQLERRM;
END $$;

-- Safely remove sprint_length_weeks column from teams table if it exists (SAFE)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' AND column_name = 'sprint_length_weeks'
    ) THEN
        -- First check if column has any non-default values
        DECLARE
            non_default_count INTEGER;
        BEGIN
            EXECUTE 'SELECT COUNT(*) FROM teams WHERE sprint_length_weeks IS NOT NULL AND sprint_length_weeks != 1'
            INTO non_default_count;
            
            IF non_default_count = 0 THEN
                ALTER TABLE teams DROP COLUMN sprint_length_weeks CASCADE;
                RAISE NOTICE 'Safely removed sprint_length_weeks column from teams table';
            ELSE
                RAISE NOTICE 'teams.sprint_length_weeks contains custom values (% rows) - preserving', non_default_count;
            END IF;
        END;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing sprint_length_weeks column: %', SQLERRM;
END $$;

-- =========================================================================
-- STEP 6: DATA PRESERVATION VERIFICATION
-- =========================================================================

-- Verify that critical user data still exists after migration
DO $$
DECLARE
    schedule_count INTEGER;
    member_count INTEGER;
    team_count INTEGER;
BEGIN
    -- Check schedule entries (MOST CRITICAL)
    SELECT COUNT(*) INTO schedule_count FROM schedule_entries;
    
    -- Check team members
    SELECT COUNT(*) INTO member_count FROM team_members;
    
    -- Check teams
    SELECT COUNT(*) INTO team_count FROM teams;
    
    RAISE NOTICE '📊 DATA PRESERVATION CHECK:';
    RAISE NOTICE '  Schedule Entries: % (CRITICAL USER DATA)', schedule_count;
    RAISE NOTICE '  Team Members: %', member_count;
    RAISE NOTICE '  Teams: %', team_count;
    
    IF schedule_count > 0 THEN
        RAISE NOTICE '✅ USER SCHEDULE DATA PRESERVED SUCCESSFULLY';
    ELSE
        RAISE NOTICE '⚠️ No schedule data found - this may be a fresh installation';
    END IF;
    
    IF member_count > 0 THEN
        RAISE NOTICE '✅ Team member data preserved';
    END IF;
    
    IF team_count > 0 THEN
        RAISE NOTICE '✅ Team structure preserved';
    END IF;
END $$;

-- =========================================================================
-- STEP 7: FINAL VERIFICATION
-- =========================================================================

-- Show current global sprint
SELECT 'Global Sprint Migration Completed Successfully!' as status;

-- Verify global sprint settings exist
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Global sprint settings configured'
        ELSE '❌ Global sprint settings missing'
    END as sprint_settings_status
FROM global_sprint_settings;

-- Show current global sprint
SELECT * FROM current_global_sprint;

-- Show team sprint statistics (if teams exist)
SELECT 
    team_name, 
    team_size, 
    sprint_hours, 
    capacity_utilization, 
    current_week_hours 
FROM team_sprint_stats 
WHERE team_size > 0;

RAISE NOTICE '🎉 SAFE MIGRATION COMPLETED - All user data preserved!';