-- Set user as manager to access sprint features
-- Run this script in Supabase SQL editor

-- Option 1: Set a specific user as manager by name
-- Replace 'Your Name Here' with the actual user name you're testing with
UPDATE team_members 
SET is_manager = true 
WHERE name = 'Your Name Here';

-- Option 2: Set user as manager by ID
-- Replace 123 with the actual user ID from the debug panel
-- UPDATE team_members 
-- SET is_manager = true 
-- WHERE id = 123;

-- Option 3: Set the first user in each team as manager
-- This is useful if you want at least one manager per team
UPDATE team_members 
SET is_manager = true 
WHERE id IN (
    SELECT DISTINCT ON (team_id) id 
    FROM team_members 
    ORDER BY team_id, id
);

-- Option 4: Set all users as managers (for testing purposes)
-- Uncomment this line if you want all users to have manager access
-- UPDATE team_members SET is_manager = true;

-- Verify the changes
SELECT 
    id,
    name,
    is_manager,
    team_id,
    (SELECT name FROM teams WHERE id = team_members.team_id) as team_name
FROM team_members 
ORDER BY team_id, name;