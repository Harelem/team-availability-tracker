# 🚨 EMERGENCY RLS FIX GUIDE

## **IMMEDIATE ACTION REQUIRED**

Your Supabase database is blocking all schedule updates due to missing RLS policies. Follow this guide **RIGHT NOW** to fix the issue.

---

## 🔥 **STEP 1: IMMEDIATE FIX (2 minutes)**

### **Go to Supabase Dashboard → SQL Editor**

1. **Open Supabase Dashboard**
2. **Navigate to SQL Editor** 
3. **Paste and run this emergency fix:**

```sql
-- EMERGENCY: Immediately unblock schedule updates
CREATE POLICY "emergency_schedule_access" ON schedule_entries
    FOR ALL USING (true) WITH CHECK (true);
```

4. **Click "Run"**
5. **Test in your app** - schedule updates should work immediately

---

## ✅ **STEP 2: PROPER FIX (5 minutes)**

Once the emergency fix works, replace it with the proper policy:

### **In Supabase SQL Editor, run:**

```sql
-- Remove emergency policy
DROP POLICY "emergency_schedule_access" ON schedule_entries;

-- Restore the proper policy that was accidentally dropped
CREATE POLICY "Allow insert/update/delete on schedule_entries" ON schedule_entries
    FOR ALL USING (true) WITH CHECK (true);
```

---

## 🔍 **STEP 3: VERIFICATION**

### **Check that policies are correctly set:**

```sql
-- Verify policies exist
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'schedule_entries';
```

**Expected Output:**
```
policyname                               | cmd | permissive
"Allow read access to schedule_entries"  | r   | PERMISSIVE
"Allow insert/update/delete on schedule_entries" | a | PERMISSIVE
```

### **Test schedule update in your app:**
- Try updating a schedule entry
- Should work without RLS errors
- All user roles should be able to update schedules

---

## 📋 **COMPLETE FIX SCRIPT**

**Alternatively, run the complete fix script we created:**

1. **Go to** `/sql/emergency-rls-fix.sql` 
2. **Copy entire contents**
3. **Paste in Supabase SQL Editor**
4. **Run the complete script**

---

## 🔍 **ROOT CAUSE**

The performance optimization migrations accidentally dropped the INSERT/UPDATE policy:

```sql
-- This was run in recent migrations:
DROP POLICY IF EXISTS "Allow insert/update/delete on schedule_entries" ON public.schedule_entries;

-- But no corresponding CREATE POLICY was added to restore it!
```

---

## ✅ **SUCCESS INDICATORS**

You'll know it's fixed when:

- ✅ No more "violates row-level security policy" errors
- ✅ Users can create/edit schedule entries
- ✅ Manager quick reasons work
- ✅ Full sprint setting works
- ✅ COO dashboard updates work

---

## 🆘 **IF PROBLEMS PERSIST**

### **Check current user identification:**
```sql
SELECT current_user, session_user;
```

### **Temporarily disable RLS (EMERGENCY ONLY):**
```sql
-- ONLY if all else fails - NOT recommended for production
ALTER TABLE schedule_entries DISABLE ROW LEVEL SECURITY;
```

**Remember to re-enable RLS once fixed!**

---

## 📞 **SUPPORT**

If you need help:
1. Check the verification queries output
2. Look for any error messages in Supabase logs
3. Verify your app is connecting to the correct Supabase project

**This fix should resolve the issue immediately and restore full schedule functionality.**