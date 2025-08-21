-- Sprint Settings Enhancement Migration
-- Adds notes column to global_sprint_settings and standardizes terminology

-- =========================================================================
-- STEP 1: ADD NOTES COLUMN TO GLOBAL_SPRINT_SETTINGS
-- =========================================================================

-- Add notes column to global_sprint_settings table (safe addition)
DO $$ 
BEGIN
    -- Check if notes column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'global_sprint_settings' AND column_name = 'notes'
    ) THEN
        ALTER TABLE global_sprint_settings 
        ADD COLUMN notes TEXT;
        
        RAISE NOTICE 'Added notes column to global_sprint_settings table';
    ELSE
        RAISE NOTICE 'Notes column already exists in global_sprint_settings table';
    END IF;
END $$;

-- Update existing records to have empty notes if NULL
UPDATE global_sprint_settings 
SET notes = COALESCE(notes, '') 
WHERE notes IS NULL;

-- =========================================================================
-- STEP 2: STANDARDIZE TERMINOLOGY IN VIEWS
-- =========================================================================

-- Update team_sprint_stats view to use consistent "potential_hours" terminology
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
    -- UPDATED: Calculate team potential hours for sprint (standardized terminology)
    COUNT(DISTINCT tm.id) * gs.sprint_length_weeks * 5 * 7 as potential_hours,
    -- UPDATED: Calculate utilization based on potential hours
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

-- Create a compatibility view with the old column name for backward compatibility
CREATE OR REPLACE VIEW team_sprint_stats_legacy AS
SELECT 
    team_id,
    team_name,
    description,
    color,
    team_size,
    manager_count,
    current_sprint_number,
    sprint_start_date,
    sprint_end_date,
    progress_percentage,
    days_remaining,
    is_active,
    sprint_hours,
    current_week_hours,
    potential_hours as total_capacity_hours, -- Legacy alias
    capacity_utilization
FROM team_sprint_stats;

-- =========================================================================
-- STEP 3: CREATE HELPER FUNCTIONS FOR CONSISTENCY
-- =========================================================================

-- Function to calculate team potential hours (standardized calculation)
CREATE OR REPLACE FUNCTION calculate_team_potential_hours(
    team_member_count INTEGER,
    sprint_length_weeks INTEGER
) RETURNS INTEGER AS $$
BEGIN
    -- Standard calculation: team_size × sprint_weeks × 5_working_days × 7_hours_per_day
    RETURN team_member_count * sprint_length_weeks * 5 * 7;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate sprint maximum hours (theoretical maximum)
CREATE OR REPLACE FUNCTION calculate_sprint_max_hours(
    team_member_count INTEGER,
    sprint_length_weeks INTEGER
) RETURNS INTEGER AS $$
BEGIN
    -- Maximum possible hours (same as potential in this context)
    RETURN calculate_team_potential_hours(team_member_count, sprint_length_weeks);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =========================================================================
-- STEP 4: VERIFICATION AND COMMENTS
-- =========================================================================

-- Add helpful comments to clarify terminology
COMMENT ON COLUMN global_sprint_settings.notes IS 'Sprint notes - stores additional information about the sprint';
COMMENT ON VIEW team_sprint_stats IS 'Team sprint statistics with standardized potential_hours terminology';
COMMENT ON FUNCTION calculate_team_potential_hours IS 'Calculates team potential hours: team_size × sprint_weeks × 5_days × 7_hours';
COMMENT ON FUNCTION calculate_sprint_max_hours IS 'Calculates maximum possible sprint hours (alias for potential hours)';

-- =========================================================================
-- STEP 5: VERIFICATION
-- =========================================================================

-- Verify the migration
SELECT 'Sprint Settings Enhancement Migration Completed!' as status;

-- Verify notes column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'global_sprint_settings' AND column_name = 'notes'
        ) THEN '✅ Notes column added to global_sprint_settings'
        ELSE '❌ Notes column missing from global_sprint_settings'
    END as notes_column_status;

-- Verify standardized view
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_sprint_stats' AND column_name = 'potential_hours'
        ) THEN '✅ team_sprint_stats view updated with potential_hours'
        ELSE '❌ team_sprint_stats view missing potential_hours column'
    END as view_update_status;

-- Show sample data from updated view
SELECT 
    team_name,
    team_size,
    potential_hours,
    sprint_hours,
    capacity_utilization
FROM team_sprint_stats 
WHERE team_size > 0
LIMIT 3;

RAISE NOTICE '🎉 SPRINT SETTINGS ENHANCEMENT COMPLETED!';
RAISE NOTICE 'Notes column added to global_sprint_settings table';
RAISE NOTICE 'Terminology standardized to use "potential_hours" consistently';
RAISE NOTICE 'Backward compatibility maintained with legacy view';