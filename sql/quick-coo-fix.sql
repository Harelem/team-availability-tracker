-- QUICK COO FIX - Add Nir Shilo to existing Data Team
-- This is the fastest way to enable COO dashboard access

-- Add Nir Shilo to the Data Team
INSERT INTO team_members (name, hebrew, is_manager, team_id) VALUES
    ('Nir Shilo', 'ניר שילה', true, (SELECT id FROM teams WHERE name = 'Data Team'))
ON CONFLICT (name) DO UPDATE SET
    team_id = (SELECT id FROM teams WHERE name = 'Data Team'),
    is_manager = true;

-- Verify the COO user was added successfully
SELECT 
    t.name as team_name,
    tm.name as member_name,
    tm.hebrew,
    tm.is_manager
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
WHERE tm.name = 'Nir Shilo';

-- Show Data Team members (should now include Nir Shilo)
SELECT 
    tm.name as member_name,
    tm.hebrew,
    tm.is_manager
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
WHERE t.name = 'Data Team'
ORDER BY tm.is_manager DESC, tm.name;