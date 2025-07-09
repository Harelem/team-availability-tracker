-- Migration Script for Multi-Team Support
-- This script safely migrates existing single-team data to multi-team structure

-- Step 1: Run the multi-team schema first
-- (Execute multi-team-schema.sql before running this migration)

-- Step 2: Insert all team members with their respective teams
-- First, let's migrate existing team members to "Original Team" (team_id = 5)
UPDATE team_members 
SET team_id = (SELECT id FROM teams WHERE name = 'Original Team')
WHERE team_id IS NULL;

-- Step 3: Insert all new team members
-- Development Team - Tal (team_id = 1)
INSERT INTO team_members (name, hebrew, is_manager, team_id) VALUES
    ('Tal Azaria', 'טל עזריה', true, (SELECT id FROM teams WHERE name = 'Development Team - Tal')),
    ('Yotam Sever', 'יותם סבר', false, (SELECT id FROM teams WHERE name = 'Development Team - Tal')),
    ('Roy Ferder', 'רועי פרדר', false, (SELECT id FROM teams WHERE name = 'Development Team - Tal')),
    ('Ido Azran', 'עידו עזרן', false, (SELECT id FROM teams WHERE name = 'Development Team - Tal'))
ON CONFLICT (name) DO UPDATE SET
    team_id = EXCLUDED.team_id,
    is_manager = EXCLUDED.is_manager;

-- Development Team - Itay (team_id = 2)
INSERT INTO team_members (name, hebrew, is_manager, team_id) VALUES
    ('Itay Mizrachi', 'איתי מזרחי', true, (SELECT id FROM teams WHERE name = 'Development Team - Itay')),
    ('Roy Musafi', 'רועי מוספי', false, (SELECT id FROM teams WHERE name = 'Development Team - Itay')),
    ('Shachar Max', 'שחר מקס', false, (SELECT id FROM teams WHERE name = 'Development Team - Itay')),
    ('Yahli Oleinik', 'יהלי אוליניק', false, (SELECT id FROM teams WHERE name = 'Development Team - Itay')),
    ('Yotam Halevi', 'יותם הלוי', false, (SELECT id FROM teams WHERE name = 'Development Team - Itay'))
ON CONFLICT (name) DO UPDATE SET
    team_id = EXCLUDED.team_id,
    is_manager = EXCLUDED.is_manager;

-- Infrastructure Team (team_id = 3)
INSERT INTO team_members (name, hebrew, is_manager, team_id) VALUES
    ('Aviram Sparsky', 'אבירם ספרסקי', true, (SELECT id FROM teams WHERE name = 'Infrastructure Team')),
    ('Peleg Yona', 'פלג יונה', false, (SELECT id FROM teams WHERE name = 'Infrastructure Team')),
    ('Itay Zuberi', 'איתי צוברי', false, (SELECT id FROM teams WHERE name = 'Infrastructure Team'))
ON CONFLICT (name) DO UPDATE SET
    team_id = EXCLUDED.team_id,
    is_manager = EXCLUDED.is_manager;

-- Data Team (team_id = 4)
INSERT INTO team_members (name, hebrew, is_manager, team_id) VALUES
    ('Matan Blaich', 'מתן בלייך', true, (SELECT id FROM teams WHERE name = 'Data Team')),
    ('Efrat Taichman', 'אפרת טייכמן', false, (SELECT id FROM teams WHERE name = 'Data Team')),
    ('Sahar Cohen', 'סהר כהן', false, (SELECT id FROM teams WHERE name = 'Data Team')),
    ('Itamar Weingarten', 'איתמר וינגרטן', false, (SELECT id FROM teams WHERE name = 'Data Team')),
    ('Noam Hadad', 'נועם הדד', false, (SELECT id FROM teams WHERE name = 'Data Team')),
    ('David Dan', 'דוד דן', false, (SELECT id FROM teams WHERE name = 'Data Team'))
ON CONFLICT (name) DO UPDATE SET
    team_id = EXCLUDED.team_id,
    is_manager = EXCLUDED.is_manager;

-- Step 4: Now add the foreign key constraint (after all data is migrated)
ALTER TABLE team_members 
ADD CONSTRAINT fk_team_members_team_id 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Step 5: Make team_id NOT NULL (after all records have team_id)
ALTER TABLE team_members ALTER COLUMN team_id SET NOT NULL;

-- Step 6: Verify migration results
-- Check that all team members have team_id
SELECT 
    t.name as team_name,
    COUNT(tm.id) as member_count,
    COUNT(CASE WHEN tm.is_manager = true THEN 1 END) as manager_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY t.id, t.name
ORDER BY t.name;

-- Check that no team members are missing team_id
SELECT COUNT(*) as members_without_team 
FROM team_members 
WHERE team_id IS NULL;

-- Final verification: Show all teams and their members
SELECT 
    t.name as team_name,
    tm.name as member_name,
    tm.hebrew,
    tm.is_manager
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
ORDER BY t.name, tm.name;