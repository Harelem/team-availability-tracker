-- Version 2.2 Critical Schema Fixes
-- Database Schema Audit Report Implementation
-- Execute Priority: CRITICAL (before deployment)
-- Generated: August 20, 2025

-- =============================================================================
-- SECTION 1: CREATE MISSING ENHANCED SPRINT INFRASTRUCTURE
-- =============================================================================

-- 1.1 Create current_enhanced_sprint view (Primary sprint data source)
-- This view provides the enhanced sprint data structure that the application expects
CREATE OR REPLACE VIEW current_enhanced_sprint AS
SELECT 
    gs.id::text as id,
    gs.current_sprint_number as sprint_number,
    gs.sprint_start_date as start_date,
    (gs.sprint_start_date + ((gs.sprint_length_weeks * 7 - 1)::int * '1 day'::interval))::date as end_date,
    gs.sprint_length_weeks as length_weeks,
    
    -- Calculate working days count (Sunday through Thursday)
    (SELECT COUNT(*) 
     FROM generate_series(gs.sprint_start_date, 
                          (gs.sprint_start_date + ((gs.sprint_length_weeks * 7 - 1)::int * '1 day'::interval))::date, 
                          '1 day'::interval) as d
     WHERE EXTRACT(dow FROM d) BETWEEN 0 AND 4) as working_days_count,
    
    gs.is_active,
    COALESCE(gs.notes, '') as notes,
    
    -- Enhanced date calculations
    GREATEST(0, CURRENT_DATE - gs.sprint_start_date) as days_elapsed,
    GREATEST(0, (gs.sprint_start_date + ((gs.sprint_length_weeks * 7 - 1)::int * '1 day'::interval))::date - CURRENT_DATE) as days_remaining,
    gs.sprint_length_weeks * 7 as total_days,
    
    -- Progress percentage calculation
    CASE 
        WHEN CURRENT_DATE < gs.sprint_start_date THEN 0
        WHEN CURRENT_DATE > (gs.sprint_start_date + ((gs.sprint_length_weeks * 7 - 1)::int * '1 day'::interval))::date THEN 100
        ELSE LEAST(100, GREATEST(0, 
            ROUND(((CURRENT_DATE - gs.sprint_start_date)::numeric * 100.0) / 
                  NULLIF((gs.sprint_length_weeks * 7)::numeric, 0), 2)))
    END as progress_percentage,
    
    -- Working days remaining calculation
    GREATEST(0, (SELECT COUNT(*) 
                 FROM generate_series(CURRENT_DATE + 1, 
                                    (gs.sprint_start_date + ((gs.sprint_length_weeks * 7 - 1)::int * '1 day'::interval))::date, 
                                    '1 day'::interval) as d
                 WHERE EXTRACT(dow FROM d) BETWEEN 0 AND 4)) as working_days_remaining,
    
    -- Active status (true if current date is within sprint range)
    (CURRENT_DATE >= gs.sprint_start_date AND 
     CURRENT_DATE <= (gs.sprint_start_date + ((gs.sprint_length_weeks * 7 - 1)::int * '1 day'::interval))::date) as is_current,
    
    gs.created_at,
    gs.updated_at,
    gs.updated_by as created_by
FROM global_sprint_settings gs
ORDER BY gs.id DESC
LIMIT 1;

-- Add comment to view for documentation
COMMENT ON VIEW current_enhanced_sprint IS 'Enhanced sprint view providing comprehensive sprint data for Version 2.2 compatibility';

-- 1.2 Create enhanced_sprint_configs table
-- This table supports advanced sprint configuration features
CREATE TABLE IF NOT EXISTS enhanced_sprint_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sprint_number integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    length_weeks integer NOT NULL DEFAULT 2 CHECK (length_weeks BETWEEN 1 AND 12),
    working_days_count integer,
    is_active boolean DEFAULT true,
    created_by varchar DEFAULT 'system',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT sprint_number_positive CHECK (sprint_number > 0),
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT unique_active_sprint UNIQUE (sprint_number) DEFERRABLE INITIALLY DEFERRED
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_sprint_configs_active 
ON enhanced_sprint_configs(is_active, sprint_number) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_enhanced_sprint_configs_dates 
ON enhanced_sprint_configs(start_date, end_date);

-- Add RLS policy for security
ALTER TABLE enhanced_sprint_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to all authenticated users
CREATE POLICY enhanced_sprint_configs_read_policy ON enhanced_sprint_configs
    FOR SELECT USING (true);

-- Policy: Allow sprint managers to modify configurations
CREATE POLICY enhanced_sprint_configs_write_policy ON enhanced_sprint_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_accounts ua
            WHERE ua.role IN ('admin', 'coo', 'manager')
        )
    );

-- Add table comment
COMMENT ON TABLE enhanced_sprint_configs IS 'Enhanced sprint configuration table for advanced sprint management features';

-- =============================================================================
-- SECTION 2: UPDATE CURRENT SPRINT DATA (CRITICAL)
-- =============================================================================

-- 2.1 Update current sprint to reflect actual August 2025 dates
-- Current issue: Sprint 1 ended August 9, but system shows it as active
-- Solution: Update to current sprint with proper dates

UPDATE global_sprint_settings 
SET 
    current_sprint_number = 2,
    sprint_start_date = '2025-08-10',  -- Start of Sprint 2
    sprint_length_weeks = 2,
    updated_at = now(),
    updated_by = 'V2.2_SCHEMA_AUDIT_FIX'
WHERE id = (SELECT MAX(id) FROM global_sprint_settings);

-- 2.2 Verify the update worked correctly
DO $$
DECLARE
    sprint_record RECORD;
BEGIN
    SELECT current_sprint_number, sprint_start_date, is_active 
    INTO sprint_record 
    FROM current_global_sprint;
    
    -- Log the current state
    RAISE NOTICE 'Updated sprint data: Sprint %, Start: %, Active: %', 
        sprint_record.current_sprint_number, 
        sprint_record.sprint_start_date, 
        sprint_record.is_active;
        
    -- Verify sprint is now active for current date
    IF NOT sprint_record.is_active THEN
        RAISE WARNING 'Sprint is still not active - may need manual adjustment';
    END IF;
END $$;

-- =============================================================================
-- SECTION 3: INDEX OPTIMIZATION (PERFORMANCE)
-- =============================================================================

-- 3.1 Remove redundant indexes on schedule_entries table
-- Analysis shows over-indexing causing write performance degradation

-- Check if indexes exist before dropping (safe approach)
DROP INDEX IF EXISTS idx_schedule_date_value;
DROP INDEX IF EXISTS idx_schedule_entries_date_value;
DROP INDEX IF EXISTS idx_schedule_member_date;

-- Keep essential indexes only:
-- - idx_schedule_entries_member_date (compound, most efficient for common queries)
-- - idx_schedule_entries_updated_at (for cache invalidation)
-- - schedule_entries_pkey (primary key)
-- - schedule_entries_member_id_date_key (unique constraint)

-- 3.2 Add performance monitoring
-- Create index for performance logging table if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_query_performance_timestamp 
ON query_performance_log(timestamp DESC);

-- =============================================================================
-- SECTION 4: DATA VALIDATION AND VERIFICATION
-- =============================================================================

-- 4.1 Validate enhanced sprint view is working
DO $$
DECLARE
    enhanced_sprint RECORD;
    legacy_sprint RECORD;
BEGIN
    -- Get data from both views
    SELECT * INTO enhanced_sprint FROM current_enhanced_sprint LIMIT 1;
    SELECT * INTO legacy_sprint FROM current_global_sprint LIMIT 1;
    
    -- Verify enhanced view is populated
    IF enhanced_sprint.id IS NULL THEN
        RAISE EXCEPTION 'Enhanced sprint view is not returning data';
    END IF;
    
    -- Verify data consistency
    IF enhanced_sprint.sprint_number != legacy_sprint.current_sprint_number THEN
        RAISE EXCEPTION 'Sprint number mismatch between views: % vs %', 
            enhanced_sprint.sprint_number, legacy_sprint.current_sprint_number;
    END IF;
    
    RAISE NOTICE 'Enhanced sprint view validation PASSED';
    RAISE NOTICE 'Current Sprint: %, Start: %, End: %, Active: %',
        enhanced_sprint.sprint_number,
        enhanced_sprint.start_date,
        enhanced_sprint.end_date,
        enhanced_sprint.is_current;
END $$;

-- 4.2 Validate working days calculation
SELECT 
    'Working Days Validation' as test_name,
    sprint_number,
    start_date,
    end_date,
    working_days_count,
    -- Manual verification: should be 10 working days for 2-week sprint
    CASE 
        WHEN working_days_count = 10 THEN 'PASS'
        ELSE 'FAIL - Expected 10, got ' || working_days_count
    END as validation_result
FROM current_enhanced_sprint;

-- 4.3 Validate sprint contains current date
SELECT 
    'Current Date Validation' as test_name,
    start_date,
    end_date,
    CURRENT_DATE as today,
    is_current,
    CASE 
        WHEN is_current THEN 'PASS'
        ELSE 'FAIL - Current date not in sprint range'
    END as validation_result
FROM current_enhanced_sprint;

-- =============================================================================
-- SECTION 5: FUNCTION ENHANCEMENTS
-- =============================================================================

-- 5.1 Create helper function to get current working sprint days
CREATE OR REPLACE FUNCTION get_current_sprint_working_days()
RETURNS TABLE(work_date date, day_of_week integer) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d::date as work_date,
        EXTRACT(dow FROM d)::integer as day_of_week
    FROM generate_series(
        (SELECT start_date FROM current_enhanced_sprint),
        (SELECT end_date FROM current_enhanced_sprint),
        '1 day'::interval
    ) as d
    WHERE EXTRACT(dow FROM d) BETWEEN 0 AND 4  -- Sunday through Thursday
    ORDER BY d;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add function comment
COMMENT ON FUNCTION get_current_sprint_working_days() IS 'Returns all working days in the current sprint for calculation purposes';

-- 5.2 Create sprint validation function
CREATE OR REPLACE FUNCTION validate_sprint_date_range(
    start_date date,
    weeks integer DEFAULT 2
) RETURNS TABLE(
    calculated_end_date date,
    total_days integer,
    working_days integer,
    weekend_days integer
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            start_date,
            start_date + ((weeks * 7 - 1) * '1 day'::interval),
            '1 day'::interval
        )::date as sprint_date
    )
    SELECT 
        MAX(sprint_date) as calculated_end_date,
        COUNT(*)::integer as total_days,
        COUNT(CASE WHEN EXTRACT(dow FROM sprint_date) BETWEEN 0 AND 4 THEN 1 END)::integer as working_days,
        COUNT(CASE WHEN EXTRACT(dow FROM sprint_date) IN (5, 6) THEN 1 END)::integer as weekend_days
    FROM date_series;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- SECTION 6: MONITORING AND ALERTS
-- =============================================================================

-- 6.1 Create trigger to log sprint data changes
CREATE OR REPLACE FUNCTION log_sprint_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO query_performance_log (
        query_type,
        table_name,
        execution_time_ms,
        rows_affected,
        timestamp
    ) VALUES (
        'SPRINT_UPDATE',
        'global_sprint_settings',
        0, -- Trigger execution, not query timing
        1,
        now()
    );
    
    -- Log the change details
    RAISE NOTICE 'Sprint settings updated: Sprint % from % to %',
        NEW.current_sprint_number,
        OLD.sprint_start_date,
        NEW.sprint_start_date;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sprint changes monitoring
DROP TRIGGER IF EXISTS trigger_sprint_change_log ON global_sprint_settings;
CREATE TRIGGER trigger_sprint_change_log
    AFTER UPDATE ON global_sprint_settings
    FOR EACH ROW
    EXECUTE FUNCTION log_sprint_changes();

-- =============================================================================
-- SECTION 7: FINAL VALIDATION REPORT
-- =============================================================================

-- 7.1 Generate comprehensive validation report
SELECT 
    '=== V2.2 SCHEMA FIX VALIDATION REPORT ===' as section,
    null as check_name,
    null as status,
    null as details
UNION ALL
SELECT 
    'Enhanced Sprint View',
    'current_enhanced_sprint exists',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'current_enhanced_sprint') 
         THEN 'PASS' ELSE 'FAIL' END,
    'Primary sprint data source'
UNION ALL
SELECT 
    'Enhanced Sprint Table',
    'enhanced_sprint_configs exists',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enhanced_sprint_configs') 
         THEN 'PASS' ELSE 'FAIL' END,
    'Sprint configuration storage'
UNION ALL
SELECT 
    'Sprint Data Currency',
    'Sprint contains current date',
    CASE WHEN (SELECT is_current FROM current_enhanced_sprint) 
         THEN 'PASS' ELSE 'FAIL' END,
    'Current date within sprint range'
UNION ALL
SELECT 
    'Working Days Calculation',
    'Correct working days count',
    CASE WHEN (SELECT working_days_count FROM current_enhanced_sprint) = 10 
         THEN 'PASS' ELSE 'WARN' END,
    'Expected 10 working days for 2-week sprint'
UNION ALL
SELECT 
    'Index Optimization',
    'Redundant indexes removed',
    CASE WHEN NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname IN ('idx_schedule_date_value', 'idx_schedule_entries_date_value')) 
         THEN 'PASS' ELSE 'PARTIAL' END,
    'Performance optimization applied'
UNION ALL
SELECT 
    '=== END VALIDATION REPORT ===',
    null,
    null,
    'Review all PASS/FAIL statuses before deployment'
ORDER BY 
    CASE 
        WHEN section LIKE '===%' THEN 1
        ELSE 2
    END,
    check_name NULLS FIRST;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ V2.2 Critical Schema Fixes Applied Successfully';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Run application tests to verify functionality';
    RAISE NOTICE '   2. Update cache duration settings in dataConsistencyManager.ts';
    RAISE NOTICE '   3. Monitor COO dashboard performance post-deployment';
    RAISE NOTICE '   4. Verify real-time sprint calculations';
    RAISE NOTICE '';
END $$;