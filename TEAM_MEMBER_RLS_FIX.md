# 🚨 Team Member Management Fix - RLS Policy Issue

## Problem Identified
Team member add/edit functionality is blocked by **Row-Level Security (RLS) policy** missing INSERT/UPDATE permissions on the `team_members` table.

**Error:** `new row violates row-level security policy for table "team_members"` (Code: 42501)

## Root Cause
- ✅ RLS is enabled on `team_members` table  
- ✅ SELECT policy exists (reading works)
- ❌ **MISSING:** INSERT/UPDATE/DELETE policy (writing blocked)

## 🔧 IMMEDIATE FIX (Required)

### Option A: Manual SQL Fix (Fastest)
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Execute this SQL command:

```sql
CREATE POLICY "Allow insert/update/delete on team_members" ON team_members
    FOR ALL USING (true);
```

3. Test the fix by trying to add a team member in the app

### Option B: Run Complete Fix Script
Execute the comprehensive fix script in Supabase SQL Editor:

**File:** `sql/fix-team-members-rls-policies.sql`

This script includes:
- Current policy analysis
- Policy creation
- Test verification
- Success confirmation

## 🧪 Testing the Fix

After applying the SQL fix, verify it works:

```bash
node scripts/test-team-member-crud.js
```

**Expected Result:**
```
✅ SELECT works: X records found
✅ INSERT successful
✅ UPDATE successful  
✅ DELETE successful - test data cleaned up
🎉 All CRUD operations working - RLS policies are correctly configured!
```

## 📋 Verification Checklist

- [ ] SQL policy executed in Supabase
- [ ] CRUD test script passes
- [ ] Can add new team members in app
- [ ] Can edit existing team member details
- [ ] No more RLS violation errors in browser console

## 🔍 Technical Details

**Current Policies:**
```sql
-- ✅ Exists
CREATE POLICY "Allow read access to team_members" ON team_members
    FOR SELECT USING (true);

-- ❌ Missing (this is what we're adding)
CREATE POLICY "Allow insert/update/delete on team_members" ON team_members
    FOR ALL USING (true);
```

**Security Note:** The policy uses `USING (true)` which allows all operations. In a production environment with user authentication, you might want more restrictive policies based on user roles.

## 🎯 Expected Outcome

After applying this fix:
- ✅ Managers can add new team members
- ✅ Managers can edit team member details  
- ✅ Team member management UI works fully
- ✅ No more RLS policy violation errors