-- Ensure teams table has proper unique constraint on name column
-- This should already exist from multi-team-schema.sql but adding as safety measure

-- Add unique constraint if it doesn't exist (will be ignored if already exists)
DO $$
BEGIN
    -- Check if the unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'UNIQUE' 
        AND table_name = 'teams' 
        AND constraint_name LIKE '%name%'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE teams ADD CONSTRAINT teams_name_unique UNIQUE (name);
        RAISE NOTICE 'Added unique constraint on teams.name column';
    ELSE
        RAISE NOTICE 'Unique constraint on teams.name already exists';
    END IF;
END
$$;

-- Verify the constraint exists
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'teams' 
    AND tc.constraint_type = 'UNIQUE'
    AND kcu.column_name = 'name';