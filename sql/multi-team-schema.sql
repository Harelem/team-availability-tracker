-- Multi-Team Database Schema for Team Availability Tracker
-- This script creates the enhanced schema with multi-team support

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color code for team branding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add team_id column to existing team_members table
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS team_id INTEGER;

-- Create foreign key constraint (after migration)
-- ALTER TABLE team_members ADD CONSTRAINT fk_team_members_team_id 
-- FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Create updated schedule_entries table with team-aware indexes
CREATE INDEX IF NOT EXISTS idx_schedule_entries_team_member ON schedule_entries(member_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date_range ON schedule_entries(date);

-- Create team-specific indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_name ON team_members(team_id, name);

-- Update Row Level Security policies for team isolation
DROP POLICY IF EXISTS "Allow read access to team_members" ON team_members;
DROP POLICY IF EXISTS "Allow read access to schedule_entries" ON schedule_entries;
DROP POLICY IF EXISTS "Allow insert/update/delete on schedule_entries" ON schedule_entries;

-- Team-specific RLS policies (simplified for now - can be enhanced with user authentication)
CREATE POLICY "Allow read access to team_members" ON team_members
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to schedule_entries" ON schedule_entries
    FOR SELECT USING (true);

CREATE POLICY "Allow insert/update/delete on schedule_entries" ON schedule_entries
    FOR ALL USING (true);

-- Create teams table RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to teams" ON teams
    FOR SELECT USING (true);

-- Insert the 5 teams
INSERT INTO teams (name, description, color) VALUES
    ('Development Team - Tal', 'Development team led by Tal Azaria', '#10b981'),
    ('Development Team - Itay', 'Development team led by Itay Mizrachi', '#3b82f6'),
    ('Infrastructure Team', 'Infrastructure team led by Aviram Sparsky', '#f59e0b'),
    ('Data Team', 'Data team led by Matan Blaich', '#ef4444'),
    ('Original Team', 'Original team with Harel and Amit', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at timestamp for teams
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for team statistics
CREATE OR REPLACE VIEW team_stats AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.color,
    COUNT(tm.id) as member_count,
    COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as manager_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY t.id, t.name, t.description, t.color
ORDER BY t.name;