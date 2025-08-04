-- Fix Team Breakdown Display Issue
-- This script adds the missing team_id column and assigns team members to correct teams

-- Step 1: Add team_id column to team_members table
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

-- Step 2: Ensure teams table has unique constraint on name
ALTER TABLE teams ADD CONSTRAINT teams_name_unique UNIQUE (name);

-- Step 3: Ensure we have the required teams (using INSERT with error handling)
DO $$
BEGIN
    -- Insert teams one by one with error handling
    INSERT INTO teams (name, description, color) VALUES
        ('Development Team - Tal', 'Development team led by Tal Azaria', '#3b82f6')
    ON CONFLICT (name) DO NOTHING;
    
    INSERT INTO teams (name, description, color) VALUES
        ('Development Team - Itay', 'Development team led by Itay Mizrachi', '#8b5cf6')
    ON CONFLICT (name) DO NOTHING;
    
    INSERT INTO teams (name, description, color) VALUES
        ('Infrastructure Team', 'Infrastructure and DevOps team', '#10b981')
    ON CONFLICT (name) DO NOTHING;
    
    INSERT INTO teams (name, description, color) VALUES
        ('Data Team', 'Data science and analytics team', '#f59e0b')
    ON CONFLICT (name) DO NOTHING;
    
    INSERT INTO teams (name, description, color) VALUES
        ('Product Team', 'Product management and strategy team', '#ef4444')
    ON CONFLICT (name) DO NOTHING;
    
    RAISE NOTICE 'Teams created/verified successfully';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Teams table unique constraint already exists';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in team creation: %', SQLERRM;
END $$;

-- Step 4: Create a temporary function to assign team members to correct teams
CREATE OR REPLACE FUNCTION assign_team_members_to_teams()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    tal_team_id INTEGER;
    itay_team_id INTEGER;
    infra_team_id INTEGER;
    data_team_id INTEGER;
    product_team_id INTEGER;
    assigned_count INTEGER := 0;
BEGIN
    -- Get team IDs
    SELECT id INTO tal_team_id FROM teams WHERE name = 'Development Team - Tal';
    SELECT id INTO itay_team_id FROM teams WHERE name = 'Development Team - Itay';
    SELECT id INTO infra_team_id FROM teams WHERE name = 'Infrastructure Team';
    SELECT id INTO data_team_id FROM teams WHERE name = 'Data Team';
    SELECT id INTO product_team_id FROM teams WHERE name = 'Product Team';

    -- Development Team - Tal
    UPDATE team_members SET team_id = tal_team_id 
    WHERE name IN ('Tal Azaria', 'Yotam Sever', 'Roy Ferder', 'Ido Azran')
    AND team_id IS NULL;
    
    GET DIAGNOSTICS assigned_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % members to Development Team - Tal', assigned_count;

    -- Development Team - Itay  
    UPDATE team_members SET team_id = itay_team_id 
    WHERE name IN ('Itay Mizrachi', 'Roy Musafi', 'Shachar Max', 'Yahli Oleinik', 'Yotam Halevi')
    AND team_id IS NULL;
    
    GET DIAGNOSTICS assigned_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % members to Development Team - Itay', assigned_count;

    -- Infrastructure Team
    UPDATE team_members SET team_id = infra_team_id 
    WHERE name IN ('Aviram Sparsky', 'Peleg Yona', 'Itay Zuberi')
    AND team_id IS NULL;
    
    GET DIAGNOSTICS assigned_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % members to Infrastructure Team', assigned_count;

    -- Data Team
    UPDATE team_members SET team_id = data_team_id 
    WHERE name IN ('Matan Blaich', 'Efrat Taichman', 'Sahar Cohen', 'Itamar Weingarten', 'Noam Hadad', 'David Dan')
    AND team_id IS NULL;
    
    GET DIAGNOSTICS assigned_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % members to Data Team', assigned_count;

    -- Product Team
    UPDATE team_members SET team_id = product_team_id 
    WHERE name IN ('Natan Shemesh', 'Ido Keller', 'Amit Zriker', 'Alon Mesika', 'Nadav Aharon', 'Yarom Kloss', 'Ziv Edelstein', 'Harel Mazan')
    AND team_id IS NULL;
    
    GET DIAGNOSTICS assigned_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % members to Product Team', assigned_count;

    -- Set correct manager flags
    UPDATE team_members SET is_manager = true 
    WHERE name IN ('Tal Azaria', 'Itay Mizrachi', 'Aviram Sparsky', 'Matan Blaich', 'Amit Zriker', 'Harel Mazan');

    RETURN 'Team member assignment completed successfully';
END;
$$;

-- Execute the assignment function
SELECT assign_team_members_to_teams();

-- Step 5: Verify the assignments
DO $$
DECLARE
    team_record RECORD;
    member_count INTEGER;
BEGIN
    RAISE NOTICE 'Team assignment verification:';
    
    FOR team_record IN 
        SELECT t.id, t.name 
        FROM teams t 
        WHERE t.name != 'Management Team'
        ORDER BY t.name
    LOOP
        SELECT COUNT(*) INTO member_count 
        FROM team_members tm 
        WHERE tm.team_id = team_record.id;
        
        RAISE NOTICE 'Team: % (ID: %) - Members: %', team_record.name, team_record.id, member_count;
    END LOOP;
END;
$$;

-- Step 6: Clean up the temporary function
DROP FUNCTION IF EXISTS assign_team_members_to_teams();

-- Step 7: Add NOT NULL constraint after assignment (optional, for data integrity)
-- ALTER TABLE team_members ALTER COLUMN team_id SET NOT NULL;
-- Note: Commented out to allow for COO (Nir Shilo) who might not belong to a team

-- Final verification query
SELECT 
    t.name as team_name,
    COUNT(tm.id) as member_count,
    STRING_AGG(tm.name, ', ' ORDER BY tm.name) as members
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.name != 'Management Team'
GROUP BY t.id, t.name
ORDER BY t.name;