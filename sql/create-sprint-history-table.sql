-- Create sprint_history table for comprehensive sprint tracking
-- This table will store all historical, current, and future sprints for calendar visualization

-- Drop table if exists (for development)
DROP TABLE IF EXISTS sprint_history;

-- Create sprint_history table
CREATE TABLE sprint_history (
  id SERIAL PRIMARY KEY,
  sprint_number INTEGER NOT NULL,
  sprint_name VARCHAR(255), -- Optional sprint name/title
  sprint_start_date DATE NOT NULL,
  sprint_end_date DATE NOT NULL,
  sprint_length_weeks INTEGER NOT NULL,
  description TEXT, -- Optional sprint description/goals
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255), -- User who created the sprint
  updated_by VARCHAR(255), -- User who last updated the sprint
  
  -- Constraints
  CONSTRAINT sprint_history_dates_check CHECK (sprint_end_date > sprint_start_date),
  CONSTRAINT sprint_history_weeks_check CHECK (sprint_length_weeks > 0 AND sprint_length_weeks <= 8),
  CONSTRAINT sprint_history_number_check CHECK (sprint_number > 0)
);

-- Create indexes for efficient querying
CREATE INDEX idx_sprint_history_dates ON sprint_history(sprint_start_date, sprint_end_date);
CREATE INDEX idx_sprint_history_status ON sprint_history(status);
CREATE INDEX idx_sprint_history_number ON sprint_history(sprint_number);
CREATE INDEX idx_sprint_history_created_at ON sprint_history(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sprint_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_sprint_history_updated_at
  BEFORE UPDATE ON sprint_history
  FOR EACH ROW
  EXECUTE FUNCTION update_sprint_history_updated_at();

-- Create function to automatically update sprint status based on dates
CREATE OR REPLACE FUNCTION update_sprint_status()
RETURNS TRIGGER AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Automatically set status based on dates
  IF NEW.sprint_start_date > today_date THEN
    NEW.status = 'upcoming';
  ELSIF NEW.sprint_end_date < today_date THEN
    NEW.status = 'completed';
  ELSE
    NEW.status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status
CREATE TRIGGER trigger_sprint_status_update
  BEFORE INSERT OR UPDATE ON sprint_history
  FOR EACH ROW
  EXECUTE FUNCTION update_sprint_status();

-- Migrate existing sprint data from global_sprint_settings (if exists)
INSERT INTO sprint_history (
  sprint_number,
  sprint_start_date,
  sprint_end_date,
  sprint_length_weeks,
  created_at,
  updated_at,
  created_by
)
SELECT 
  current_sprint_number,
  sprint_start_date::DATE,
  (sprint_start_date::DATE + (sprint_length_weeks * 7) - 1) as sprint_end_date,
  sprint_length_weeks,
  created_at,
  updated_at,
  updated_by
FROM global_sprint_settings
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'global_sprint_settings')
ON CONFLICT DO NOTHING;

-- Add some sample historical sprints for demonstration (optional)
-- These can be removed in production
INSERT INTO sprint_history (
  sprint_number,
  sprint_name,
  sprint_start_date,
  sprint_end_date,
  sprint_length_weeks,
  description,
  created_by
) VALUES 
  (1, 'Q3 Foundation Sprint', '2024-07-07', '2024-07-20', 2, 'Foundation setup and initial features', 'System'),
  (2, 'Q3 Development Sprint', '2024-07-21', '2024-08-03', 2, 'Core functionality development', 'System'),
  (3, 'Q3 Enhancement Sprint', '2024-08-04', '2024-08-17', 2, 'Feature enhancements and improvements', 'System')
ON CONFLICT DO NOTHING;

-- Create view for easy sprint calendar queries
CREATE OR REPLACE VIEW sprint_calendar_view AS
SELECT 
  id,
  sprint_number,
  sprint_name,
  sprint_start_date,
  sprint_end_date,
  sprint_length_weeks,
  description,
  status,
  CASE 
    WHEN status = 'active' THEN
      ROUND(
        (EXTRACT(DAY FROM (CURRENT_DATE - sprint_start_date)) + 1) * 100.0 / 
        (EXTRACT(DAY FROM (sprint_end_date - sprint_start_date)) + 1)
      )
    WHEN status = 'completed' THEN 100
    ELSE 0
  END as progress_percentage,
  CASE 
    WHEN status = 'active' THEN
      GREATEST(0, EXTRACT(DAY FROM (sprint_end_date - CURRENT_DATE)))
    ELSE 0
  END as days_remaining,
  (sprint_end_date - sprint_start_date + 1) as total_days,
  created_at,
  updated_at,
  created_by,
  updated_by
FROM sprint_history
ORDER BY sprint_start_date DESC, sprint_number DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sprint_history TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE sprint_history_id_seq TO your_app_user;
-- GRANT SELECT ON sprint_calendar_view TO your_app_user;

-- Verification queries
SELECT 'sprint_history table created successfully' as status;
SELECT COUNT(*) as total_sprints FROM sprint_history;
SELECT * FROM sprint_calendar_view LIMIT 5;