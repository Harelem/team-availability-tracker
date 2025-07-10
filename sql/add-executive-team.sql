-- Add Executive Team and COO User to Production Database
-- This script creates a dedicated Executive team for COO and other executives

-- Step 1: Create Executive Team
INSERT INTO teams (name, description, color, sprint_length_weeks) VALUES
    ('Executive Team', 'Company executives and leadership', '#6B46C1', 2)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    sprint_length_weeks = EXCLUDED.sprint_length_weeks;

-- Step 2: Add COO and other executives to Executive Team
INSERT INTO team_members (name, hebrew, is_manager, team_id) VALUES
    ('Nir Shilo', 'ניר שילה', true, (SELECT id FROM teams WHERE name = 'Executive Team'))
ON CONFLICT (name) DO UPDATE SET
    team_id = (SELECT id FROM teams WHERE name = 'Executive Team'),
    is_manager = EXCLUDED.is_manager;

-- Optional: Add other executives (uncomment if needed)
-- INSERT INTO team_members (name, hebrew, is_manager, team_id) VALUES
--     ('CEO Name', 'שם מנכל', true, (SELECT id FROM teams WHERE name = 'Executive Team')),
--     ('CTO Name', 'שם סמנכל טכנולוגיות', true, (SELECT id FROM teams WHERE name = 'Executive Team'))
-- ON CONFLICT (name) DO UPDATE SET
--     team_id = (SELECT id FROM teams WHERE name = 'Executive Team'),
--     is_manager = EXCLUDED.is_manager;

-- Step 3: Verify Executive Team was created
SELECT 
    id,
    name,
    description,
    color,
    sprint_length_weeks
FROM teams 
WHERE name = 'Executive Team';

-- Step 4: Verify COO user was added
SELECT 
    t.name as team_name,
    tm.name as member_name,
    tm.hebrew,
    tm.is_manager
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
WHERE tm.name = 'Nir Shilo';

-- Step 5: Show all teams and member counts
SELECT 
    t.name as team_name,
    t.description,
    COUNT(tm.id) as member_count,
    COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as manager_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY t.id, t.name, t.description
ORDER BY t.name;