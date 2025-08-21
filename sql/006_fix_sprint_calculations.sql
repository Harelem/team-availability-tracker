-- Fix sprint potential calculation functions
-- Migration: 006_fix_sprint_calculations.sql

-- Function to calculate working days (excludes weekends)
CREATE OR REPLACE FUNCTION calculate_working_days(
  start_date DATE,
  end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  working_days INTEGER := 0;
  current_date DATE := start_date;
BEGIN
  WHILE current_date <= end_date LOOP
    -- Only count Sunday(0) through Thursday(4) - Israeli work week
    IF EXTRACT(DOW FROM current_date) BETWEEN 0 AND 4 THEN
      working_days := working_days + 1;
    END IF;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN working_days;
END;
$$;

-- Fix sprint potential calculation function
CREATE OR REPLACE FUNCTION calculate_accurate_sprint_potential(
  team_member_count INTEGER,
  sprint_start_date DATE,
  sprint_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  working_days INTEGER;
  sprint_potential INTEGER;
  hours_per_day INTEGER := 7;
BEGIN
  -- Calculate working days (Sunday-Thursday only - Israeli work week)
  SELECT calculate_working_days(sprint_start_date, sprint_end_date) INTO working_days;

  -- Calculate sprint potential: team_members × working_days × 7_hours_per_day
  sprint_potential := team_member_count * working_days * hours_per_day;

  RETURN sprint_potential;
END;
$$;

-- Function to get accurate team statistics
CREATE OR REPLACE FUNCTION get_accurate_team_stats(team_id_param INTEGER)
RETURNS TABLE (
  team_id INTEGER,
  team_name VARCHAR,
  team_member_count INTEGER,
  sprint_potential_hours INTEGER,
  sprint_planned_hours INTEGER,
  sprint_completion_percentage INTEGER,
  working_days_in_sprint INTEGER,
  days_remaining INTEGER,
  members_with_complete_planning INTEGER,
  current_week_hours INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_sprint_start DATE;
  current_sprint_end DATE;
  sprint_weeks INTEGER;
BEGIN
  -- Get current sprint dates
  SELECT 
    sprint_start_date, 
    sprint_end_date,
    sprint_length_weeks 
  INTO 
    current_sprint_start, 
    current_sprint_end,
    sprint_weeks
  FROM sprint_settings
  WHERE is_current = true
  LIMIT 1;

  -- If no current sprint, use default 2-week period
  IF current_sprint_start IS NULL THEN
    current_sprint_start := DATE_TRUNC('week', CURRENT_DATE);
    current_sprint_end := current_sprint_start + INTERVAL '13 days';
    sprint_weeks := 2;
  END IF;

  RETURN QUERY
  SELECT 
    team_id_param as team_id,
    t.name::VARCHAR as team_name,
    (SELECT COUNT(*)::INTEGER FROM team_members WHERE team_id = team_id_param)::INTEGER as team_member_count,
    calculate_accurate_sprint_potential(
      (SELECT COUNT(*) FROM team_members WHERE team_id = team_id_param)::INTEGER,
      current_sprint_start,
      current_sprint_end
    )::INTEGER as sprint_potential_hours,
    COALESCE(
      (SELECT SUM(
        CASE 
          WHEN se.hours = '1' THEN 7
          WHEN se.hours = '0.5' THEN 3.5
          ELSE 0
        END
      )::INTEGER 
       FROM schedule_entries se
       JOIN team_members tm ON se.team_member_id = tm.id
       WHERE tm.team_id = team_id_param
         AND se.date >= current_sprint_start
         AND se.date <= current_sprint_end
         AND se.hours IS NOT NULL), 0
    )::INTEGER as sprint_planned_hours,
    CASE 
      WHEN calculate_accurate_sprint_potential(
        (SELECT COUNT(*) FROM team_members WHERE team_id = team_id_param)::INTEGER,
        current_sprint_start,
        current_sprint_end
      ) > 0 THEN
        ROUND(
          (COALESCE(
            (SELECT SUM(
              CASE 
                WHEN se.hours = '1' THEN 7
                WHEN se.hours = '0.5' THEN 3.5
                ELSE 0
              END
            ) 
             FROM schedule_entries se
             JOIN team_members tm ON se.team_member_id = tm.id
             WHERE tm.team_id = team_id_param
               AND se.date >= current_sprint_start
               AND se.date <= current_sprint_end
               AND se.hours IS NOT NULL), 0
          ) * 100.0 / calculate_accurate_sprint_potential(
            (SELECT COUNT(*) FROM team_members WHERE team_id = team_id_param)::INTEGER,
            current_sprint_start,
            current_sprint_end
          ))
        )::INTEGER
      ELSE 0
    END as sprint_completion_percentage,
    calculate_working_days(current_sprint_start, current_sprint_end)::INTEGER as working_days_in_sprint,
    GREATEST(0, calculate_working_days(CURRENT_DATE, current_sprint_end))::INTEGER as days_remaining,
    (SELECT COUNT(DISTINCT tm.id)::INTEGER
     FROM team_members tm
     WHERE tm.team_id = team_id_param
       AND EXISTS (
         SELECT 1 FROM schedule_entries se 
         WHERE se.team_member_id = tm.id 
           AND se.date >= current_sprint_start 
           AND se.date <= current_sprint_end
           AND se.hours IS NOT NULL
         )
    )::INTEGER as members_with_complete_planning,
    COALESCE(
      (SELECT SUM(
        CASE 
          WHEN se.hours = '1' THEN 7
          WHEN se.hours = '0.5' THEN 3.5
          ELSE 0
        END
      )::INTEGER 
       FROM schedule_entries se
       JOIN team_members tm ON se.team_member_id = tm.id
       WHERE tm.team_id = team_id_param
         AND se.date >= DATE_TRUNC('week', CURRENT_DATE)
         AND se.date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
         AND se.hours IS NOT NULL), 0
    )::INTEGER as current_week_hours
  FROM teams t
  WHERE t.id = team_id_param;
END;
$$;

-- Function to get team member schedule details for current sprint
CREATE OR REPLACE FUNCTION get_team_member_sprint_details(team_id_param INTEGER)
RETURNS TABLE (
  member_id INTEGER,
  member_name VARCHAR,
  member_hebrew VARCHAR,
  is_manager BOOLEAN,
  sprint_planned_hours INTEGER,
  sprint_potential_hours INTEGER,
  completion_percentage INTEGER,
  current_week_hours INTEGER,
  last_activity_date DATE,
  has_completed_planning BOOLEAN,
  availability_status VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_sprint_start DATE;
  current_sprint_end DATE;
  individual_potential INTEGER;
BEGIN
  -- Get current sprint dates
  SELECT 
    sprint_start_date, 
    sprint_end_date
  INTO 
    current_sprint_start, 
    current_sprint_end
  FROM sprint_settings
  WHERE is_current = true
  LIMIT 1;

  -- If no current sprint, use default 2-week period
  IF current_sprint_start IS NULL THEN
    current_sprint_start := DATE_TRUNC('week', CURRENT_DATE);
    current_sprint_end := current_sprint_start + INTERVAL '13 days';
  END IF;

  -- Calculate individual potential (working days * 7 hours)
  individual_potential := calculate_working_days(current_sprint_start, current_sprint_end) * 7;

  RETURN QUERY
  SELECT 
    tm.id::INTEGER as member_id,
    tm.name::VARCHAR as member_name,
    tm.hebrew::VARCHAR as member_hebrew,
    tm.is_manager::BOOLEAN as is_manager,
    COALESCE(
      (SELECT SUM(
        CASE 
          WHEN se.hours = '1' THEN 7
          WHEN se.hours = '0.5' THEN 3.5
          ELSE 0
        END
      )::INTEGER 
       FROM schedule_entries se
       WHERE se.team_member_id = tm.id
         AND se.date >= current_sprint_start
         AND se.date <= current_sprint_end
         AND se.hours IS NOT NULL), 0
    )::INTEGER as sprint_planned_hours,
    individual_potential::INTEGER as sprint_potential_hours,
    CASE 
      WHEN individual_potential > 0 THEN
        ROUND(
          (COALESCE(
            (SELECT SUM(
              CASE 
                WHEN se.hours = '1' THEN 7
                WHEN se.hours = '0.5' THEN 3.5
                ELSE 0
              END
            ) 
             FROM schedule_entries se
             WHERE se.team_member_id = tm.id
               AND se.date >= current_sprint_start
               AND se.date <= current_sprint_end
               AND se.hours IS NOT NULL), 0
          ) * 100.0 / individual_potential)
        )::INTEGER
      ELSE 0
    END as completion_percentage,
    COALESCE(
      (SELECT SUM(
        CASE 
          WHEN se.hours = '1' THEN 7
          WHEN se.hours = '0.5' THEN 3.5
          ELSE 0
        END
      )::INTEGER 
       FROM schedule_entries se
       WHERE se.team_member_id = tm.id
         AND se.date >= DATE_TRUNC('week', CURRENT_DATE)
         AND se.date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
         AND se.hours IS NOT NULL), 0
    )::INTEGER as current_week_hours,
    (SELECT MAX(se.date)
     FROM schedule_entries se
     WHERE se.team_member_id = tm.id
       AND se.hours IS NOT NULL
    )::DATE as last_activity_date,
    (SELECT COUNT(*) >= calculate_working_days(current_sprint_start, current_sprint_end)
     FROM schedule_entries se
     WHERE se.team_member_id = tm.id
       AND se.date >= current_sprint_start
       AND se.date <= current_sprint_end
       AND se.hours IS NOT NULL
    )::BOOLEAN as has_completed_planning,
    CASE 
      WHEN COALESCE(
        (SELECT SUM(
          CASE 
            WHEN se.hours = '1' THEN 7
            WHEN se.hours = '0.5' THEN 3.5
            ELSE 0
          END
        ) 
         FROM schedule_entries se
         WHERE se.team_member_id = tm.id
           AND se.date >= DATE_TRUNC('week', CURRENT_DATE)
           AND se.date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
           AND se.hours IS NOT NULL), 0
      ) >= 30 THEN 'available'
      WHEN COALESCE(
        (SELECT SUM(
          CASE 
            WHEN se.hours = '1' THEN 7
            WHEN se.hours = '0.5' THEN 3.5
            ELSE 0
          END
        ) 
         FROM schedule_entries se
         WHERE se.team_member_id = tm.id
           AND se.date >= DATE_TRUNC('week', CURRENT_DATE)
           AND se.date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
           AND se.hours IS NOT NULL), 0
      ) >= 15 THEN 'partial'
      ELSE 'unavailable'
    END::VARCHAR as availability_status
  FROM team_members tm
  WHERE tm.team_id = team_id_param
  ORDER BY tm.is_manager DESC, tm.name ASC;
END;
$$;

-- Function to get recent team activity
CREATE OR REPLACE FUNCTION get_team_recent_activity(team_id_param INTEGER, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  activity_id VARCHAR,
  activity_timestamp TIMESTAMP WITH TIME ZONE,
  activity_type VARCHAR,
  member_name VARCHAR,
  activity_description VARCHAR,
  activity_details VARCHAR,
  activity_date DATE,
  activity_hours DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CONCAT('activity_', se.id::VARCHAR) as activity_id,
    se.updated_at as activity_timestamp,
    'schedule_update'::VARCHAR as activity_type,
    tm.name::VARCHAR as member_name,
    'Updated availability'::VARCHAR as activity_description,
    CONCAT('Changed availability for ', TO_CHAR(se.date, 'Day, Mon DD')) as activity_details,
    se.date as activity_date,
    CASE 
      WHEN se.hours = '1' THEN 7.0
      WHEN se.hours = '0.5' THEN 3.5
      ELSE 0.0
    END as activity_hours
  FROM schedule_entries se
  JOIN team_members tm ON se.team_member_id = tm.id
  WHERE tm.team_id = team_id_param
    AND se.updated_at IS NOT NULL
    AND se.updated_at >= NOW() - INTERVAL '7 days'
  ORDER BY se.updated_at DESC
  LIMIT limit_count;
END;
$$;

-- Add comment to indicate this migration fixes sprint calculations
COMMENT ON FUNCTION calculate_accurate_sprint_potential IS 'Fixes sprint potential calculation to use working days × 7 hours per day instead of hardcoded 35 hours per week';
COMMENT ON FUNCTION get_accurate_team_stats IS 'Provides accurate team statistics with real data from schedule entries';
COMMENT ON FUNCTION get_team_member_sprint_details IS 'Returns detailed member information with real sprint completion data';
COMMENT ON FUNCTION get_team_recent_activity IS 'Returns real team activity from schedule entry updates';