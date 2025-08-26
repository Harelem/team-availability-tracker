-- SCHEMA ALIGNMENT FIX - PART 4: TypeScript Interface Alignment
-- Addresses mismatches between database schema and application code
-- Migration Date: August 26, 2025
-- Author: Database Security Audit

-- Create rollback procedures table for this migration
CREATE TABLE IF NOT EXISTS schema_alignment_rollback_part4 (
  id SERIAL PRIMARY KEY,
  operation_type TEXT NOT NULL,
  table_name TEXT,
  column_name TEXT,
  rollback_sql TEXT NOT NULL,
  migration_timestamp TIMESTAMPTZ DEFAULT NOW()
);

BEGIN;

-- 1. FIX MISSING COLUMNS IN team_members TABLE
-- The TypeScript interface expects manager_max_hours but this column exists
-- Check if any other columns are missing from the schema

INSERT INTO schema_alignment_rollback_part4 (operation_type, table_name, rollback_sql)
VALUES ('COLUMN_CHECK', 'team_members', 'SELECT ''No rollback needed for column verification''');

-- Verify team_members schema alignment
DO $$
DECLARE
    missing_columns TEXT[];
    expected_columns TEXT[] := ARRAY['id', 'name', 'hebrew', 'is_manager', 'email', 'created_at', 'updated_at', 'team_id', 'role', 'is_critical', 'inactive_date', 'manager_max_hours'];
    col TEXT;
    col_exists BOOLEAN;
BEGIN
    FOREACH col IN ARRAY expected_columns
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'team_members' 
              AND column_name = col
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Missing columns in team_members: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All expected columns exist in team_members table';
    END IF;
END $$;

-- 2. FIX MISSING COLUMNS IN schedule_entries TABLE
-- The TypeScript code expects sprint_id, is_weekend, calculated_hours, hours columns

-- Verify schedule_entries schema alignment
DO $$
DECLARE
    missing_columns TEXT[];
    expected_columns TEXT[] := ARRAY['id', 'member_id', 'date', 'value', 'reason', 'created_at', 'updated_at', 'sprint_id', 'is_weekend', 'calculated_hours', 'hours'];
    col TEXT;
    col_exists BOOLEAN;
BEGIN
    FOREACH col IN ARRAY expected_columns
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'schedule_entries' 
              AND column_name = col
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Missing columns in schedule_entries: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All expected columns exist in schedule_entries table';
    END IF;
END $$;

-- 3. FIX MISSING TABLES REFERENCED IN TYPESCRIPT
-- The TypeScript interfaces reference coo_users table that doesn't exist in database

-- Check if coo_users table exists (referenced in supabase.ts but not in actual schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coo_users') THEN
        RAISE NOTICE 'WARNING: coo_users table referenced in TypeScript but does not exist in database';
        
        -- Store rollback for this table creation
        INSERT INTO schema_alignment_rollback_part4 (operation_type, table_name, rollback_sql)
        VALUES ('CREATE_MISSING_TABLE', 'coo_users', 'DROP TABLE IF EXISTS public.coo_users;');
        
        -- Create the missing table to match TypeScript interface
        CREATE TABLE public.coo_users (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            hebrew VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            description VARCHAR NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.coo_users ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for authenticated users only
        CREATE POLICY "Allow authenticated users to read COO users" ON public.coo_users
            FOR SELECT
            USING (auth.role() = 'authenticated');
            
        RAISE NOTICE 'Created missing coo_users table';
    ELSE
        RAISE NOTICE 'coo_users table already exists';
    END IF;
END $$;

-- Check if enhanced_sprint_configs table exists (referenced in TypeScript but not in actual schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'enhanced_sprint_configs') THEN
        RAISE NOTICE 'WARNING: enhanced_sprint_configs table referenced in TypeScript but does not exist in database';
        
        -- Store rollback for this table creation
        INSERT INTO schema_alignment_rollback_part4 (operation_type, table_name, rollback_sql)
        VALUES ('CREATE_MISSING_TABLE', 'enhanced_sprint_configs', 'DROP TABLE IF EXISTS public.enhanced_sprint_configs;');
        
        -- Create the missing table to match TypeScript interface
        CREATE TABLE public.enhanced_sprint_configs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sprint_number INTEGER NOT NULL UNIQUE,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            length_weeks INTEGER NOT NULL,
            working_days_count INTEGER,
            is_active BOOLEAN DEFAULT false,
            created_by VARCHAR DEFAULT 'system',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            CONSTRAINT check_sprint_length CHECK (length_weeks > 0 AND length_weeks <= 12),
            CONSTRAINT check_date_order CHECK (end_date > start_date)
        );
        
        -- Enable RLS
        ALTER TABLE public.enhanced_sprint_configs ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for authenticated users
        CREATE POLICY "Allow authenticated users to read enhanced sprint configs" ON public.enhanced_sprint_configs
            FOR SELECT
            USING (auth.role() = 'authenticated');
            
        CREATE POLICY "Allow admins to manage enhanced sprint configs" ON public.enhanced_sprint_configs
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.team_members tm
                    WHERE tm.email = (SELECT auth.email())
                      AND tm.role = 'admin'
                )
            );
            
        RAISE NOTICE 'Created missing enhanced_sprint_configs table';
    ELSE
        RAISE NOTICE 'enhanced_sprint_configs table already exists';
    END IF;
END $$;

-- 4. CREATE MISSING FUNCTIONS REFERENCED IN TYPESCRIPT

-- Check if get_daily_company_status_data function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_daily_company_status_data'
    ) THEN
        -- Store rollback
        INSERT INTO schema_alignment_rollback_part4 (operation_type, table_name, rollback_sql)
        VALUES ('CREATE_MISSING_FUNCTION', 'get_daily_company_status_data', 'DROP FUNCTION IF EXISTS public.get_daily_company_status_data(date);');
        
        -- Create missing function
        CREATE OR REPLACE FUNCTION public.get_daily_company_status_data(target_date date DEFAULT CURRENT_DATE)
        RETURNS TABLE(
            member_id integer,
            member_name text,
            member_hebrew text,
            team_id integer,
            team_name text,
            role text,
            hours numeric,
            reason text,
            is_critical boolean,
            is_manager boolean
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $function$
        BEGIN
            RETURN QUERY
            SELECT 
                tm.id as member_id,
                tm.name as member_name,
                tm.hebrew as member_hebrew,
                tm.team_id,
                t.name as team_name,
                COALESCE(tm.role, 'member') as role,
                CASE 
                    WHEN se.value = '1' THEN 7
                    WHEN se.value = '0.5' THEN 3.5
                    ELSE 0
                END as hours,
                se.reason,
                COALESCE(tm.is_critical, false) as is_critical,
                COALESCE(tm.is_manager, false) as is_manager
            FROM public.team_members tm
            LEFT JOIN public.teams t ON tm.team_id = t.id
            LEFT JOIN public.schedule_entries se ON tm.id = se.member_id AND se.date = target_date
            WHERE tm.inactive_date IS NULL
            ORDER BY t.name, tm.name;
        END;
        $function$;
        
        RAISE NOTICE 'Created missing get_daily_company_status_data function';
    ELSE
        RAISE NOTICE 'get_daily_company_status_data function already exists';
    END IF;
END $$;

-- Check if value_to_hours function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'value_to_hours'
    ) THEN
        -- Store rollback
        INSERT INTO schema_alignment_rollback_part4 (operation_type, table_name, rollback_sql)
        VALUES ('CREATE_MISSING_FUNCTION', 'value_to_hours', 'DROP FUNCTION IF EXISTS public.value_to_hours(text);');
        
        -- Create missing function
        CREATE OR REPLACE FUNCTION public.value_to_hours(schedule_value text)
        RETURNS numeric
        LANGUAGE plpgsql
        IMMUTABLE
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $function$
        BEGIN
            RETURN CASE 
                WHEN schedule_value = '1' THEN 7
                WHEN schedule_value = '0.5' THEN 3.5
                ELSE 0
            END;
        END;
        $function$;
        
        RAISE NOTICE 'Created missing value_to_hours function';
    ELSE
        RAISE NOTICE 'value_to_hours function already exists';
    END IF;
END $$;

-- 5. UPDATE EXISTING VIEWS TO MATCH TYPESCRIPT EXPECTATIONS

-- Ensure current_enhanced_sprint view matches TypeScript interface
DROP VIEW IF EXISTS public.current_enhanced_sprint CASCADE;
CREATE VIEW public.current_enhanced_sprint AS
SELECT 
    gen_random_uuid() as id,
    gss.current_sprint_number as sprint_number,
    gss.sprint_start_date as start_date,
    gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL::date as end_date,
    gss.sprint_length_weeks as length_weeks,
    -- Calculate working days (Sunday to Thursday)
    (gss.sprint_length_weeks * 5) as working_days_count,
    CASE 
        WHEN CURRENT_DATE BETWEEN gss.sprint_start_date AND 
             gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL
        THEN TRUE
        ELSE FALSE
    END as is_active,
    'Enhanced Sprint ' || gss.current_sprint_number as notes,
    -- Progress calculations
    CASE 
        WHEN CURRENT_DATE < gss.sprint_start_date THEN 0
        WHEN CURRENT_DATE >= gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL THEN 
            (gss.sprint_length_weeks * 7)
        ELSE EXTRACT(DAYS FROM CURRENT_DATE - gss.sprint_start_date)::INTEGER
    END as days_elapsed,
    GREATEST(0, 
        EXTRACT(DAYS FROM 
            (gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL) - CURRENT_DATE
        )::INTEGER
    ) as days_remaining,
    (gss.sprint_length_weeks * 7) as total_days,
    CASE 
        WHEN CURRENT_DATE < gss.sprint_start_date THEN 0
        WHEN CURRENT_DATE >= gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL THEN 100
        ELSE ROUND(
            (EXTRACT(EPOCH FROM CURRENT_DATE - gss.sprint_start_date) / 
             EXTRACT(EPOCH FROM (gss.sprint_length_weeks * 7 || ' days')::INTERVAL)) * 100, 1
        )
    END as progress_percentage,
    -- Working days remaining calculation
    GREATEST(0,
        CASE 
            WHEN CURRENT_DATE >= gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL THEN 0
            ELSE (
                SELECT COUNT(*)
                FROM generate_series(
                    GREATEST(CURRENT_DATE + 1, gss.sprint_start_date), 
                    gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL, 
                    '1 day'::interval
                ) as gs(date)
                WHERE EXTRACT(DOW FROM gs.date) IN (0,1,2,3,4) -- Sun-Thu
            )
        END
    ) as working_days_remaining,
    CASE 
        WHEN CURRENT_DATE BETWEEN gss.sprint_start_date AND 
             gss.sprint_start_date + (gss.sprint_length_weeks * 7 || ' days')::INTERVAL
        THEN TRUE
        ELSE FALSE
    END as is_current,
    gss.created_at,
    gss.updated_at,
    gss.updated_by as created_by
FROM public.global_sprint_settings gss
ORDER BY gss.id DESC
LIMIT 1;

-- Grant permissions
GRANT SELECT ON public.current_enhanced_sprint TO authenticated;
REVOKE SELECT ON public.current_enhanced_sprint FROM anon;

COMMIT;

-- Final validation
SELECT 'SCHEMA_ALIGNMENT_PART4_COMPLETE' as status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('coo_users', 'enhanced_sprint_configs')) as missing_tables_created,
       (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname IN ('get_daily_company_status_data', 'value_to_hours')) as missing_functions_created;