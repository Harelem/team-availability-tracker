-- ===============================================
-- SPRINT HISTORY TABLE CREATION SCRIPT
-- ===============================================
-- This script creates the complete sprint_history table
-- for the Team Availability Tracker application
-- 
-- Execute this in Supabase SQL Editor to fix:
-- Error: relation "public.sprint_history" does not exist
-- ===============================================

-- Drop existing table if recreating (development only)
-- DROP TABLE IF EXISTS public.sprint_history CASCADE;

-- Create sprint_history table with complete schema
CREATE TABLE IF NOT EXISTS public.sprint_history (
  id SERIAL PRIMARY KEY,
  sprint_number INTEGER NOT NULL,
  sprint_name VARCHAR(255),
  sprint_start_date DATE NOT NULL,
  sprint_end_date DATE NOT NULL,
  sprint_length_weeks INTEGER NOT NULL DEFAULT 2,
  description TEXT,
  status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  updated_by_role VARCHAR(50),
  
  -- Table constraints
  CONSTRAINT sprint_history_dates_check CHECK (sprint_end_date > sprint_start_date),
  CONSTRAINT sprint_history_weeks_check CHECK (sprint_length_weeks > 0 AND sprint_length_weeks <= 12),
  CONSTRAINT sprint_history_number_check CHECK (sprint_number > 0)
);

-- Create unique constraint on sprint_number to prevent duplicates
ALTER TABLE public.sprint_history 
DROP CONSTRAINT IF EXISTS unique_sprint_number;

ALTER TABLE public.sprint_history 
ADD CONSTRAINT unique_sprint_number UNIQUE (sprint_number);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sprint_history_dates 
ON public.sprint_history(sprint_start_date, sprint_end_date);

CREATE INDEX IF NOT EXISTS idx_sprint_history_status 
ON public.sprint_history(status);

CREATE INDEX IF NOT EXISTS idx_sprint_history_number 
ON public.sprint_history(sprint_number);

CREATE INDEX IF NOT EXISTS idx_sprint_history_created_at 
ON public.sprint_history(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sprint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at on record updates
DROP TRIGGER IF EXISTS trigger_sprint_updated_at ON public.sprint_history;

CREATE TRIGGER trigger_sprint_updated_at
  BEFORE UPDATE ON public.sprint_history
  FOR EACH ROW
  EXECUTE FUNCTION update_sprint_updated_at();

-- Create function to automatically calculate sprint status based on dates
CREATE OR REPLACE FUNCTION calculate_sprint_status(
  start_date DATE, 
  end_date DATE
) RETURNS VARCHAR(50) AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
BEGIN
  IF start_date > today_date THEN
    RETURN 'upcoming';
  ELSIF end_date < today_date THEN
    RETURN 'completed';
  ELSE
    RETURN 'active';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-update status based on dates
CREATE OR REPLACE FUNCTION update_sprint_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status = calculate_sprint_status(NEW.sprint_start_date, NEW.sprint_end_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status on insert/update
DROP TRIGGER IF EXISTS trigger_sprint_status_update ON public.sprint_history;

CREATE TRIGGER trigger_sprint_status_update
  BEFORE INSERT OR UPDATE ON public.sprint_history
  FOR EACH ROW
  EXECUTE FUNCTION update_sprint_status();

-- Grant proper permissions for authenticated users
GRANT ALL ON public.sprint_history TO authenticated;
GRANT ALL ON public.sprint_history TO anon;
GRANT USAGE, SELECT ON SEQUENCE sprint_history_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sprint_history_id_seq TO anon;

-- Insert sample sprint data for testing and demonstration
INSERT INTO public.sprint_history (
  sprint_number, 
  sprint_name, 
  sprint_start_date, 
  sprint_end_date, 
  sprint_length_weeks,
  description,
  created_by,
  created_at
) VALUES 
  (1, 'Q3 Foundation Sprint', '2025-07-13', '2025-07-26', 2, 'Initial foundation work and team setup for Q3 objectives', 'System', '2025-07-13 09:00:00+00'),
  (2, 'Q3 Development Sprint', '2025-07-27', '2025-08-09', 2, 'Core development phase focusing on primary features', 'System', '2025-07-20 09:00:00+00'),
  (3, 'Q3 Integration Sprint', '2025-08-10', '2025-08-23', 2, 'Integration testing and system optimization', 'System', '2025-07-22 09:00:00+00'),
  (4, 'Q3 Polish Sprint', '2025-08-24', '2025-09-06', 2, 'Final polishing, bug fixes, and deployment preparation', 'System', '2025-07-24 09:00:00+00'),
  (5, 'Q4 Planning Sprint', '2025-09-07', '2025-09-20', 2, 'Q4 planning and architecture design', 'System', '2025-07-24 10:00:00+00')
ON CONFLICT (sprint_number) DO UPDATE SET
  sprint_name = EXCLUDED.sprint_name,
  sprint_start_date = EXCLUDED.sprint_start_date,
  sprint_end_date = EXCLUDED.sprint_end_date,
  sprint_length_weeks = EXCLUDED.sprint_length_weeks,
  description = EXCLUDED.description,
  updated_at = NOW(),
  updated_by = 'System Setup';

-- Create view for enhanced sprint data with calculated fields
CREATE OR REPLACE VIEW public.sprint_calendar_view AS
SELECT 
  id,
  sprint_number,
  sprint_name,
  sprint_start_date,
  sprint_end_date,
  sprint_length_weeks,
  description,
  status,
  
  -- Calculate progress percentage for active sprints
  CASE 
    WHEN status = 'active' THEN
      ROUND(
        GREATEST(0, LEAST(100, 
          ((CURRENT_DATE - sprint_start_date) * 100.0) / 
          GREATEST(1, (sprint_end_date - sprint_start_date))
        ))
      )
    WHEN status = 'completed' THEN 100
    ELSE 0
  END as progress_percentage,
  
  -- Calculate days remaining for active sprints
  CASE 
    WHEN status = 'active' THEN
      GREATEST(0, (sprint_end_date - CURRENT_DATE))
    ELSE 0
  END as days_remaining,
  
  -- Calculate total sprint days
  (sprint_end_date - sprint_start_date + 1) as total_days,
  
  -- Calculate elapsed days for active sprints
  CASE 
    WHEN status = 'active' THEN
      GREATEST(0, (CURRENT_DATE - sprint_start_date + 1))
    WHEN status = 'completed' THEN
      (sprint_end_date - sprint_start_date + 1)
    ELSE 0
  END as elapsed_days,
  
  created_at,
  updated_at,
  created_by,
  updated_by,
  updated_by_role
FROM public.sprint_history
ORDER BY sprint_start_date DESC, sprint_number DESC;

-- Grant permissions on the view
GRANT SELECT ON public.sprint_calendar_view TO authenticated;
GRANT SELECT ON public.sprint_calendar_view TO anon;

-- Verification queries to confirm successful setup
DO $$
DECLARE
  table_count INTEGER;
  sprint_count INTEGER;
  view_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'sprint_history';
  
  -- Count sprint records
  SELECT COUNT(*) INTO sprint_count FROM public.sprint_history;
  
  -- Check if view exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'sprint_calendar_view'
  ) INTO view_exists;
  
  -- Output verification results
  RAISE NOTICE '✅ SPRINT DATABASE SETUP VERIFICATION:';
  RAISE NOTICE '  - sprint_history table: %', CASE WHEN table_count > 0 THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  - Sample sprint records: % inserted', sprint_count;
  RAISE NOTICE '  - sprint_calendar_view: %', CASE WHEN view_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  - Status: %', CASE WHEN table_count > 0 AND view_exists THEN 'SUCCESS ✅' ELSE 'FAILED ❌' END;
END $$;

-- Final verification - show sample data
SELECT 
  'SAMPLE SPRINT DATA' as info,
  sprint_number,
  sprint_name,
  sprint_start_date,
  sprint_end_date,
  status,
  progress_percentage,
  days_remaining
FROM public.sprint_calendar_view 
ORDER BY sprint_number
LIMIT 5;

-- Show table structure for verification
SELECT 
  'TABLE STRUCTURE' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'sprint_history'
ORDER BY ordinal_position;

COMMIT;