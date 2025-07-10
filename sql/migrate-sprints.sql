-- Migration script to add sprint functionality to existing database
-- Run this script in your Supabase SQL editor to enable sprint features

-- First, add the sprint_length_weeks column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS sprint_length_weeks INTEGER DEFAULT 1;

-- Set default sprint length for existing teams
UPDATE teams SET sprint_length_weeks = 1 WHERE sprint_length_weeks IS NULL;

-- Create team_sprints table
CREATE TABLE IF NOT EXISTS team_sprints (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    sprint_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(team_id, sprint_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_sprints_team_id ON team_sprints(team_id);
CREATE INDEX IF NOT EXISTS idx_team_sprints_dates ON team_sprints(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_team_sprints_team_sprint ON team_sprints(team_id, sprint_number);

-- Create trigger function for updating timestamps (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for team_sprints
CREATE TRIGGER update_team_sprints_updated_at 
    BEFORE UPDATE ON team_sprints
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create initial sprint records for all teams (current sprint starting this week)
INSERT INTO team_sprints (team_id, sprint_number, start_date, end_date)
SELECT 
    id,
    1,
    DATE_TRUNC('week', CURRENT_DATE),
    DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week' - INTERVAL '1 day'
FROM teams
WHERE NOT EXISTS (
    SELECT 1 FROM team_sprints WHERE team_sprints.team_id = teams.id
);

-- Create view for current sprint information
CREATE OR REPLACE VIEW current_sprints AS
SELECT 
    ts.*,
    t.name as team_name,
    t.sprint_length_weeks,
    CASE 
        WHEN CURRENT_DATE BETWEEN ts.start_date AND ts.end_date THEN true
        ELSE false
    END as is_current,
    (ts.end_date - CURRENT_DATE) as days_remaining,
    (ts.end_date - ts.start_date) + 1 as total_days,
    ROUND(
        (CURRENT_DATE - ts.start_date) * 100.0 / 
        NULLIF((ts.end_date - ts.start_date) + 1, 0), 2
    ) as progress_percentage
FROM team_sprints ts
JOIN teams t ON ts.team_id = t.id
WHERE ts.sprint_number = (
    SELECT MAX(sprint_number) 
    FROM team_sprints ts2 
    WHERE ts2.team_id = ts.team_id
);

-- Create view for sprint statistics
CREATE OR REPLACE VIEW sprint_stats AS
SELECT 
    ts.id as sprint_id,
    ts.team_id,
    ts.sprint_number,
    ts.start_date,
    ts.end_date,
    t.name as team_name,
    t.sprint_length_weeks,
    COUNT(DISTINCT tm.id) as team_size,
    COUNT(DISTINCT tm.id) * COALESCE(t.sprint_length_weeks, 1) * 5 * 7 as total_capacity_hours,
    COALESCE(SUM(
        CASE 
            WHEN se.value = '1' THEN 7
            WHEN se.value = '0.5' THEN 3.5
            ELSE 0
        END
    ), 0) as actual_hours,
    ROUND(
        COALESCE(SUM(
            CASE 
                WHEN se.value = '1' THEN 7
                WHEN se.value = '0.5' THEN 3.5
                ELSE 0
            END
        ), 0) * 100.0 / 
        NULLIF(COUNT(DISTINCT tm.id) * COALESCE(t.sprint_length_weeks, 1) * 5 * 7, 0), 2
    ) as capacity_utilization
FROM team_sprints ts
JOIN teams t ON ts.team_id = t.id
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN schedule_entries se ON tm.id = se.member_id 
    AND se.date BETWEEN ts.start_date AND ts.end_date
GROUP BY ts.id, ts.team_id, ts.sprint_number, ts.start_date, ts.end_date, 
         t.name, t.sprint_length_weeks;

-- Update team_stats view to include sprint information
CREATE OR REPLACE VIEW team_stats AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.color,
    t.sprint_length_weeks,
    COUNT(DISTINCT tm.id) as member_count,
    COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as manager_count,
    cs.sprint_number as current_sprint_number,
    cs.start_date as current_sprint_start,
    cs.end_date as current_sprint_end,
    cs.progress_percentage as current_sprint_progress
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN current_sprints cs ON t.id = cs.team_id
GROUP BY t.id, t.name, t.description, t.color, t.sprint_length_weeks,
         cs.sprint_number, cs.start_date, cs.end_date, cs.progress_percentage
ORDER BY t.name;

-- Enable RLS for team_sprints table
ALTER TABLE team_sprints ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for team_sprints
CREATE POLICY "Allow read access to team_sprints" ON team_sprints
    FOR SELECT USING (true);

CREATE POLICY "Allow insert/update/delete on team_sprints" ON team_sprints
    FOR ALL USING (true);

-- Success message
SELECT 'Sprint features successfully added to database!' as status;