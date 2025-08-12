# 🚨 CRITICAL DATABASE FIX REQUIRED

## Problem
The Team Availability Tracker is failing with this error:
```
Could not find the function public.get_daily_company_status_data(target_date) in the schema cache
```

This is causing the COO Dashboard to fail completely.

## Immediate Solution

### Step 1: Apply SQL Migration
Run the following SQL script in your Supabase SQL Editor:

**File to execute**: `/sql/enhance-daily-company-status.sql`

**What it does**:
- Creates the missing `get_daily_company_status_data(target_date)` function
- Adds required columns: `role`, `is_critical`, `inactive_date` to `team_members` table
- Creates helper functions for data conversion
- Adds performance indexes

### Step 2: Populate Default Data
After applying the migration, run this in SQL Editor:
```sql
-- Set default roles for existing members
UPDATE team_members 
SET role = CASE 
  WHEN is_manager = true THEN 'Manager'
  ELSE 'Team Member'
END 
WHERE role IS NULL;

-- Verify the function works
SELECT * FROM get_daily_company_status_data(CURRENT_DATE);
```

### Step 3: Test the Fix
1. Restart your application
2. Navigate to COO Dashboard
3. Check Daily Status tab - it should now load without errors

## Quick Deploy Commands

### For Supabase CLI Users:
```bash
# Apply the migration
supabase db push

# Or apply the specific file
cat sql/enhance-daily-company-status.sql | supabase db reset --db-url "$DATABASE_URL"
```

### For Manual Deployment:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste contents of `sql/enhance-daily-company-status.sql`
4. Execute the script
5. Run the data population queries above

## Verification
After deployment, the following should work:
- COO Dashboard loads without errors
- Daily Status shows company-wide availability
- Team breakdown displays correctly
- No "function not found" errors in console

## Prevention
This fix includes enhanced error handling to prevent similar failures in the future. The application will now gracefully fallback to direct table queries if database functions are missing.

---

**⚠️ IMPORTANT**: This is a critical production issue. Apply this fix immediately to restore COO Dashboard functionality.