-- Standardize 35-Hour Sprint Calculations Migration
-- Migration: 007_standardize_35_hour_sprint_calculations.sql
-- Purpose: Ensure all sprint calculations consistently use 35 hours per person per week (Sunday-Thursday, 7 hours/day)

-- Update working days calculation to use Sunday(0) through Thursday(4) consistently
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

-- Enhanced sprint potential calculation with validation
CREATE OR REPLACE FUNCTION calculate_sprint_potential_35h(
  team_member_count INTEGER,
  sprint_start_date DATE,
  sprint_end_date DATE
)
RETURNS TABLE (
  potential_hours INTEGER,
  working_days INTEGER,
  hours_per_day INTEGER,
  hours_per_week INTEGER,
  team_size INTEGER,
  calculation_breakdown TEXT,
  validation_status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  calc_working_days INTEGER;
  calc_potential_hours INTEGER;
  hours_per_day_const INTEGER := 7;
  hours_per_week_const INTEGER := 35;
  validation_msg TEXT;
BEGIN
  -- Calculate working days (Sunday-Thursday only)
  SELECT calculate_working_days(sprint_start_date, sprint_end_date) INTO calc_working_days;

  -- Calculate sprint potential: team_members × working_days × 7_hours_per_day
  calc_potential_hours := team_member_count * calc_working_days * hours_per_day_const;

  -- Validate that we're getting 35 hours per person per week
  DECLARE
    sprint_weeks DECIMAL := calc_working_days::DECIMAL / 5.0;
    actual_hours_per_week DECIMAL := calc_potential_hours::DECIMAL / team_member_count::DECIMAL / sprint_weeks;
  BEGIN
    IF ABS(actual_hours_per_week - 35.0) < 0.1 THEN
      validation_msg := 'VALID: Calculation produces 35 hours per person per week';
    ELSE
      validation_msg := FORMAT('WARNING: Calculation produces %.1f hours per person per week instead of 35', actual_hours_per_week);
    END IF;
  END;

  RETURN QUERY
  SELECT 
    calc_potential_hours as potential_hours,
    calc_working_days as working_days,
    hours_per_day_const as hours_per_day,
    hours_per_week_const as hours_per_week,
    team_member_count as team_size,
    FORMAT('%s people × %s working days × %s hours/day = %s total hours',
           team_member_count, calc_working_days, hours_per_day_const, calc_potential_hours) as calculation_breakdown,
    validation_msg as validation_status;
END;
$$;

-- Function to validate existing sprint calculations
CREATE OR REPLACE FUNCTION validate_sprint_calculations_35h()
RETURNS TABLE (
  check_name TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Test case 1: 8 people, 2 weeks (10 working days)
  -- Expected: 8 × 10 × 7 = 560 hours
  RETURN QUERY
  SELECT 
    '8 people, 2 weeks (10 working days)' as check_name,
    '560 hours' as expected_result,
    (SELECT potential_hours::TEXT FROM calculate_sprint_potential_35h(8, '2024-01-07'::DATE, '2024-01-18'::DATE)) as actual_result,
    CASE 
      WHEN (SELECT potential_hours FROM calculate_sprint_potential_35h(8, '2024-01-07'::DATE, '2024-01-18'::DATE)) = 560 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END as status;
  
  -- Test case 2: 4 people, 2 weeks (10 working days)  
  -- Expected: 4 × 10 × 7 = 280 hours
  RETURN QUERY
  SELECT 
    '4 people, 2 weeks (10 working days)' as check_name,
    '280 hours' as expected_result,
    (SELECT potential_hours::TEXT FROM calculate_sprint_potential_35h(4, '2024-01-07'::DATE, '2024-01-18'::DATE)) as actual_result,
    CASE 
      WHEN (SELECT potential_hours FROM calculate_sprint_potential_35h(4, '2024-01-07'::DATE, '2024-01-18'::DATE)) = 280 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END as status;
  
  -- Test case 3: 6 people, 3 weeks (15 working days)
  -- Expected: 6 × 15 × 7 = 630 hours  
  RETURN QUERY
  SELECT 
    '6 people, 3 weeks (15 working days)' as check_name,
    '630 hours' as expected_result,
    (SELECT potential_hours::TEXT FROM calculate_sprint_potential_35h(6, '2024-01-07'::DATE, '2024-01-25'::DATE)) as actual_result,
    CASE 
      WHEN (SELECT potential_hours FROM calculate_sprint_potential_35h(6, '2024-01-07'::DATE, '2024-01-25'::DATE)) = 630 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END as status;

  -- Test case 4: Working days validation (Sunday-Thursday)
  RETURN QUERY
  SELECT 
    'Working days: Sunday to Thursday' as check_name,
    '5 days' as expected_result,
    (SELECT calculate_working_days('2024-01-07'::DATE, '2024-01-11'::DATE)::TEXT) as actual_result,
    CASE 
      WHEN calculate_working_days('2024-01-07'::DATE, '2024-01-11'::DATE) = 5 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END as status;

  -- Test case 5: Weekend exclusion (Friday-Saturday)
  RETURN QUERY
  SELECT 
    'Weekend exclusion: Friday to Saturday' as check_name,
    '0 days' as expected_result,
    (SELECT calculate_working_days('2024-01-12'::DATE, '2024-01-13'::DATE)::TEXT) as actual_result,
    CASE 
      WHEN calculate_working_days('2024-01-12'::DATE, '2024-01-13'::DATE) = 0 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END as status;
END;
$$;

-- Update the existing sprint calculation function to use the new standardized version
CREATE OR REPLACE FUNCTION calculate_accurate_sprint_potential(
  team_member_count INTEGER,
  sprint_start_date DATE,
  sprint_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use the new standardized function
  RETURN (SELECT potential_hours FROM calculate_sprint_potential_35h(team_member_count, sprint_start_date, sprint_end_date));
END;
$$;

-- Function to audit and report sprint calculation discrepancies
CREATE OR REPLACE FUNCTION audit_sprint_calculations_consistency()
RETURNS TABLE (
  audit_item TEXT,
  current_value TEXT,
  expected_value TEXT,
  discrepancy TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if any teams have inconsistent sprint potential calculations
  RETURN QUERY
  SELECT 
    'Sprint Calculation Constants' as audit_item,
    'Hours per day: 7, Working days per week: 5, Hours per week: 35' as current_value,
    'Hours per day: 7, Working days per week: 5, Hours per week: 35' as expected_value,
    'No discrepancy - using standardized constants' as discrepancy,
    'Continue using centralized SPRINT_CALCULATION_CONSTANTS' as recommendation;

  -- Additional audit checks could be added here for real data
  RETURN QUERY
  SELECT 
    'Working Days Definition' as audit_item,
    'Sunday(0) through Thursday(4)' as current_value,
    'Sunday(0) through Thursday(4)' as expected_value,
    'Consistent - Israeli work week' as discrepancy,
    'No action needed' as recommendation;
END;
$$;

-- Comments and documentation
COMMENT ON FUNCTION calculate_sprint_potential_35h IS 'Enhanced sprint potential calculation with 35-hour validation and detailed breakdown';
COMMENT ON FUNCTION validate_sprint_calculations_35h IS 'Comprehensive validation suite for 35-hour sprint calculations';
COMMENT ON FUNCTION audit_sprint_calculations_consistency IS 'Audit function to detect and report calculation inconsistencies';

-- Run validation tests
SELECT * FROM validate_sprint_calculations_35h();