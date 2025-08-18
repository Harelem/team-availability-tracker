# 🚀 Claude Code Agent: Sprint Dashboard Fix Automation

**Copy and paste this prompt into Claude Code to automatically fix the sprint dashboard update issue.**

---

## 📋 **Agent Mission**

You are a database troubleshooting specialist. I need you to fix a critical bug in my Team Availability Tracker where sprint updates are failing with the error:

```
Error updating sprint: { code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" }
```

## 🔍 **Problem Analysis**

The issue has been diagnosed as missing RLS (Row Level Security) policies on the `sprint_history` table. The table currently only allows SELECT operations but blocks UPDATE, INSERT, and DELETE operations needed for sprint management.

**Current State:**
- ✅ `updateSprint` and `deleteSprint` functions exist in `/src/lib/database.ts`  
- ❌ `sprint_history` table missing UPDATE/INSERT/DELETE RLS policies
- 🎯 Result: Database operations fail with permission errors

## 🛠️ **Your Task**

**Step 1: Verify Current State**
Use the Supabase MCP server to check the current RLS policies:

```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd
FROM pg_policies 
WHERE tablename = 'sprint_history' AND schemaname = 'public'
ORDER BY cmd;
```

You should see only one policy: "Allow read access to sprint_history" with cmd = "SELECT".

**Step 2: Apply the Fix**
Create a migration to add the missing RLS policies:

```sql
-- Add missing RLS policies for sprint_history table operations
CREATE POLICY "Allow update access to sprint_history" 
ON sprint_history 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow insert access to sprint_history" 
ON sprint_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow delete access to sprint_history" 
ON sprint_history 
FOR DELETE 
USING (true);
```

**Step 3: Verify the Fix**
Check that all 4 policies now exist:

```sql
SELECT 
    policyname, 
    cmd 
FROM pg_policies 
WHERE tablename = 'sprint_history' AND schemaname = 'public'
ORDER BY cmd;
```

Expected result:
- DELETE: "Allow delete access to sprint_history"  
- INSERT: "Allow insert access to sprint_history"
- SELECT: "Allow read access to sprint_history"
- UPDATE: "Allow update access to sprint_history"

**Step 4: Test the Fix**
Run a test update to verify permissions work:

```sql
-- This should succeed after the fix
UPDATE sprint_history 
SET updated_at = NOW() 
WHERE id = (SELECT id FROM sprint_history LIMIT 1);
```

## ✅ **Success Criteria**

After completion, you should confirm:

1. **Database Level**: All 4 RLS policies (SELECT, INSERT, UPDATE, DELETE) exist on `sprint_history`
2. **Operation Level**: Test UPDATE queries execute without permission errors  
3. **Application Level**: The COO dashboard sprint date updates should work without PGRST116 errors

## 🚨 **Critical Notes**

- **Database Functions**: Do NOT modify `/src/lib/database.ts` - the functions already exist and are correct
- **RLS Only**: This is purely a database permissions issue, not a code issue
- **Safety**: The fix uses `USING (true)` which allows all operations - this matches the existing SELECT policy pattern
- **Testing**: After the fix, the sprint calendar should update successfully without console errors

## 🔄 **Rollback Plan**

If something goes wrong, you can remove the policies:

```sql
DROP POLICY "Allow update access to sprint_history" ON sprint_history;
DROP POLICY "Allow insert access to sprint_history" ON sprint_history;  
DROP POLICY "Allow delete access to sprint_history" ON sprint_history;
```

## 🎯 **Expected Outcome**

After successful completion:
- ✅ Sprint date updates work in COO dashboard
- ✅ No more PGRST116 errors in browser console
- ✅ Sprint calendar reflects updated dates correctly
- ✅ All CRUD operations available for sprint management

---

**Priority: CRITICAL** - This blocks all sprint management functionality in the COO dashboard.

**Estimated Time: 5 minutes**

**Dependencies: Supabase MCP server access**

---

Copy this entire prompt and paste it into Claude Code to automatically resolve the sprint dashboard issue.
