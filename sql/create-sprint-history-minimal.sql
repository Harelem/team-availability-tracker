-- ===============================================
-- MINIMAL SPRINT HISTORY TABLE CREATION SCRIPT  
-- ===============================================
-- Simple version for troubleshooting
-- Execute this in Supabase SQL Editor
-- ===============================================

-- Create basic sprint_history table
CREATE TABLE IF NOT EXISTS public.sprint_history (
  id SERIAL PRIMARY KEY,
  sprint_number INTEGER NOT NULL UNIQUE,
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
  
  -- Basic constraints
  CONSTRAINT sprint_dates_valid CHECK (sprint_end_date > sprint_start_date),
  CONSTRAINT sprint_weeks_valid CHECK (sprint_length_weeks > 0 AND sprint_length_weeks <= 12),
  CONSTRAINT sprint_number_valid CHECK (sprint_number > 0)
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_sprint_dates ON public.sprint_history(sprint_start_date, sprint_end_date);
CREATE INDEX IF NOT EXISTS idx_sprint_status ON public.sprint_history(status);
CREATE INDEX IF NOT EXISTS idx_sprint_number ON public.sprint_history(sprint_number);

-- Grant permissions
GRANT ALL ON public.sprint_history TO authenticated;
GRANT ALL ON public.sprint_history TO anon;
GRANT USAGE, SELECT ON SEQUENCE sprint_history_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sprint_history_id_seq TO anon;

-- Insert sample data
INSERT INTO public.sprint_history (
  sprint_number, 
  sprint_name, 
  sprint_start_date, 
  sprint_end_date, 
  sprint_length_weeks,
  description,
  created_by
) VALUES 
  (1, 'Q3 Foundation Sprint', '2025-07-13', '2025-07-26', 2, 'Foundation work for Q3 objectives', 'System'),
  (2, 'Q3 Development Sprint', '2025-07-27', '2025-08-09', 2, 'Core development phase', 'System'),
  (3, 'Q3 Integration Sprint', '2025-08-10', '2025-08-23', 2, 'Integration and testing', 'System'),
  (4, 'Q3 Polish Sprint', '2025-08-24', '2025-09-06', 2, 'Polish and bug fixes', 'System'),
  (5, 'Q4 Planning Sprint', '2025-09-07', '2025-09-20', 2, 'Q4 planning and design', 'System')
ON CONFLICT (sprint_number) DO NOTHING;

-- Verification
SELECT 'SUCCESS: sprint_history table created' as result;
SELECT COUNT(*) as sprint_count FROM public.sprint_history;
SELECT sprint_number, sprint_name, sprint_start_date, sprint_end_date, status 
FROM public.sprint_history 
ORDER BY sprint_number;