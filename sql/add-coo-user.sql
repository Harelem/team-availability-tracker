-- Add COO User to Production Database
-- This script adds Nir Shilo (COO) to the Data Team so he can access the COO dashboard

-- Add Nir Shilo to the Data Team
INSERT INTO team_members (name, hebrew, is_manager, team_id) VALUES
    ('Nir Shilo', 'ניר שילה', true, (SELECT id FROM teams WHERE name = 'Data Team'))
ON CONFLICT (name) DO UPDATE SET
    team_id = EXCLUDED.team_id,
    is_manager = EXCLUDED.is_manager;

-- Verify the COO user was added
SELECT 
    t.name as team_name,
    tm.name as member_name,
    tm.hebrew,
    tm.is_manager
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
WHERE tm.name = 'Nir Shilo';

-- Verify team member count for Data Team
SELECT 
    t.name as team_name,
    COUNT(tm.id) as member_count,
    COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as manager_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.name = 'Data Team'
GROUP BY t.id, t.name;