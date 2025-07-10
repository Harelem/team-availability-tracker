-- Debug script to verify sprint tables and data
-- Run this in Supabase SQL editor to check sprint implementation

-- 1. Check if all sprint tables exist
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE tablename IN ('teams', 'team_sprints', 'team_members');

-- 2. Check if sprint views exist
SELECT 
    schemaname,
    viewname 
FROM pg_views 
WHERE viewname IN ('current_sprints', 'sprint_stats', 'team_stats');

-- 3. Check teams table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'teams'
ORDER BY ordinal_position;

-- 4. Check team_sprints table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'team_sprints'
ORDER BY ordinal_position;

-- 5. Check current teams data
SELECT id, name, description, color, sprint_length_weeks, created_at
FROM teams
ORDER BY name;

-- 6. Check team_sprints data
SELECT * FROM team_sprints
ORDER BY team_id, sprint_number;

-- 7. Check current_sprints view data
SELECT * FROM current_sprints;

-- 8. Check team members with manager status
SELECT 
    tm.id,
    tm.name,
    tm.is_manager,
    tm.team_id,
    t.name as team_name
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
ORDER BY t.name, tm.name;

-- 9. Check if any users are managers
SELECT 
    COUNT(*) as total_members,
    COUNT(CASE WHEN is_manager = true THEN 1 END) as manager_count
FROM team_members;

-- 10. Test getCurrentSprint equivalent query
SELECT 
    ts.*,
    t.name as team_name,
    t.sprint_length_weeks
FROM team_sprints ts
JOIN teams t ON ts.team_id = t.id
WHERE ts.sprint_number = (
    SELECT MAX(sprint_number) 
    FROM team_sprints ts2 
    WHERE ts2.team_id = ts.team_id
)
ORDER BY ts.team_id;