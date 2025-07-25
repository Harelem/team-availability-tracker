-- Fix Nir Shilo Data Issue
-- This script removes Nir Shilo from Data Team and creates Management Team for him

-- STEP 1: Create Management Team
INSERT INTO teams (name, description)
VALUES ('Management Team', 'Executive management and leadership team')
ON CONFLICT (name) DO NOTHING;

-- STEP 2: Get Management Team ID (for reference)
-- SELECT id FROM teams WHERE name = 'Management Team';

-- STEP 3: Remove Nir Shilo from Data Team (if he exists there)
DELETE FROM team_members 
WHERE name = 'Nir Shilo' 
AND team_id = (SELECT id FROM teams WHERE name = 'Data Team');

-- STEP 4: Remove any duplicate Nir Shilo entries (keep one)
WITH duplicate_nirs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) as row_num
  FROM team_members 
  WHERE name = 'Nir Shilo'
)
DELETE FROM team_members 
WHERE id IN (
  SELECT id FROM duplicate_nirs WHERE row_num > 1
);

-- STEP 5: Ensure COO Nir Shilo exists properly in Management Team
INSERT INTO team_members (name, hebrew, is_manager, team_id)
VALUES (
  'Nir Shilo', 
  'ניר שילה', 
  true, 
  (SELECT id FROM teams WHERE name = 'Management Team')
)
ON CONFLICT (name) DO UPDATE SET
  is_manager = true,
  team_id = (SELECT id FROM teams WHERE name = 'Management Team'),
  hebrew = 'ניר שילה';

-- STEP 6: Verify the fix
SELECT 
  tm.name, 
  tm.hebrew, 
  tm.is_manager,
  t.name as team_name
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
WHERE tm.name = 'Nir Shilo';

-- STEP 7: Verify Data Team now has 6 members (without Nir)
SELECT 
  t.name as team_name,
  COUNT(tm.id) as member_count,
  ARRAY_AGG(tm.name ORDER BY tm.name) as members
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.name = 'Data Team'
GROUP BY t.name;

-- STEP 8: Verify Management Team has 1 member (Nir)
SELECT 
  t.name as team_name,
  COUNT(tm.id) as member_count,
  ARRAY_AGG(tm.name ORDER BY tm.name) as members
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.name = 'Management Team'
GROUP BY t.name;