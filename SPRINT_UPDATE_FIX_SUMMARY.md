# 🚨 URGENT: Sprint Update Fix Required

## Problem Summary
The COO dashboard sprint update is failing with this error:
```
Error updating sprint: { code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" }
```

## Root Cause Analysis
1. **Missing Functions**: `updateSprint` and `deleteSprint` functions are missing from `DatabaseService`
2. **Missing RLS Policies**: The `sprint_history` table only has SELECT permission, missing UPDATE/INSERT/DELETE

## Immediate Fix Steps

### Step 1: Fix Database Permissions (CRITICAL)
Run this SQL in **Supabase SQL Editor**:

```sql
-- Add missing RLS policies for sprint operations
DROP POLICY IF EXISTS "Allow update access to sprint_history" ON sprint_history;
DROP POLICY IF EXISTS "Allow insert access to sprint_history" ON sprint_history;  
DROP POLICY IF EXISTS "Allow delete access to sprint_history" ON sprint_history;

CREATE POLICY "Allow update access to sprint_history" 
ON sprint_history FOR UPDATE USING (true);

CREATE POLICY "Allow insert access to sprint_history" 
ON sprint_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete access to sprint_history" 
ON sprint_history FOR DELETE USING (true);
```

### Step 2: Add Missing Functions to Database Service
Add these functions to `/src/lib/database.ts` in the `DatabaseService` object:

```typescript
async updateSprint(sprintId: number, sprintData: CreateSprintRequest): Promise<SprintHistoryEntry | null> {
  if (!isSupabaseConfigured()) return null
  
  try {
    const startDate = new Date(sprintData.sprint_start_date)
    const endDate = new Date(sprintData.sprint_end_date)
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const calculatedWeeks = Math.round(durationDays / 7)
    
    const { data, error } = await supabase
      .from('sprint_history')
      .update({
        sprint_name: sprintData.sprint_name || null,
        sprint_start_date: sprintData.sprint_start_date,
        sprint_end_date: sprintData.sprint_end_date,
        sprint_length_weeks: sprintData.sprint_length_weeks || calculatedWeeks,
        description: sprintData.description || null,
        updated_at: new Date().toISOString(),
        updated_by: sprintData.created_by || 'system'
      })
      .eq('id', sprintId)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error updating sprint:', error)
      return null
    }
    
    // Calculate status and progress
    const today = new Date()
    const start = new Date(data.sprint_start_date)
    const end = new Date(data.sprint_end_date)
    
    let status = 'upcoming'
    let progress_percentage = 0
    let days_remaining = 0
    
    if (start > today) {
      status = 'upcoming'
    } else if (end < today) {
      status = 'completed'
      progress_percentage = 100
    } else {
      status = 'active'
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const daysPassed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      progress_percentage = Math.round((daysPassed / totalDays) * 100)
      days_remaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    }
    
    const total_days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    return {
      ...data,
      status,
      progress_percentage,
      days_remaining,
      total_days
    }
    
  } catch (error) {
    console.error('Error in updateSprint:', error)
    return null
  }
},

async deleteSprint(sprintId: number): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  
  try {
    const { error } = await supabase
      .from('sprint_history')
      .delete()
      .eq('id', sprintId)
    
    if (error) {
      console.error('Error deleting sprint:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error in deleteSprint:', error)
    return false
  }
},
```

### Step 3: Locate Insertion Point
In `/src/lib/database.ts`, find the `DatabaseService` object and add these functions after the `createSprint` function. Make sure to add a comma after the `createSprint` closing brace.

## Quick Verification Steps

1. **Check RLS Policies**:
   ```sql
   SELECT policyname, cmd FROM pg_policies 
   WHERE tablename = 'sprint_history' AND schemaname = 'public';
   ```
   Should show 4 policies: SELECT, INSERT, UPDATE, DELETE

2. **Test Update**: Try updating a sprint date in the COO dashboard

3. **Check Console**: Look for success logs like "✅ Sprint updated successfully"

## Files Already Created
- `sql/emergency-sprint-rls-fix.sql` - SQL to fix permissions
- `missing-sprint-functions.ts` - Functions to add to database service
- `EMERGENCY_SPRINT_UPDATE_FIX.md` - Detailed fix instructions

## Priority: CRITICAL
This blocks all sprint date management functionality in the COO dashboard. The missing RLS policies need to be added first.

## 🚀 **AUTOMATED SOLUTION AVAILABLE**

**For fast resolution, use the Claude Code automation prompt:**
```
Copy the entire content of CLAUDE_CODE_SPRINT_FIX_PROMPT.md and paste it into Claude Code
```

The automation will:
- ✅ Verify current database state
- ✅ Apply missing RLS policies via Supabase MCP
- ✅ Test the fix to ensure it works
- ✅ Provide rollback if needed

**Estimated time: 5 minutes**

## Manual Fix (Alternative)
If you prefer manual implementation, follow the steps above. Note that the missing functions mentioned earlier actually **already exist** in the codebase - this is purely a database permissions issue.

## Post-Fix Testing
After implementing the fix:
1. Go to COO dashboard
2. Try to update sprint dates
3. Verify no errors in browser console  
4. Confirm sprint calendar reflects changes
