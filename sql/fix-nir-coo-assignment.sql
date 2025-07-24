-- Fix Nir Shilo's Team Assignment - COO Data Correction
-- This script removes Nir Shilo from the Data Team and properly configures him as COO
-- COO users should have team_id = NULL since they don't belong to any specific team

-- Step 1: Show current state
SELECT 
    'BEFORE UPDATE' as status,
    tm.id,
    tm.name,
    tm.hebrew,
    tm.team_id,
    t.name as team_name,
    tm.is_manager
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
WHERE tm.name = 'Nir Shilo';

-- Step 2: Update Nir Shilo to have no team assignment (COO doesn't belong to specific team)
UPDATE team_members 
SET team_id = NULL, 
    updated_at = NOW()
WHERE name = 'Nir Shilo';

-- Step 3: Verify the update
SELECT 
    'AFTER UPDATE' as status,
    tm.id,
    tm.name,
    tm.hebrew,
    tm.team_id,
    t.name as team_name,
    tm.is_manager
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
WHERE tm.name = 'Nir Shilo';

-- Step 4: Verify Data Team no longer includes Nir Shilo
SELECT 
    'DATA TEAM MEMBERS AFTER FIX' as status,
    tm.name,
    tm.hebrew,
    tm.is_manager
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE t.name = 'Data Team'
ORDER BY tm.name;

-- Step 5: Show all team members without team assignment (should include Nir Shilo)
SELECT 
    'MEMBERS WITHOUT TEAM (COO LEVEL)' as status,
    tm.name,
    tm.hebrew,
    tm.is_manager
FROM team_members tm
WHERE tm.team_id IS NULL
ORDER BY tm.name;

-- Success message
SELECT '✅ Nir Shilo has been properly configured as COO (no team assignment)' as result;