# Sprint Features Debug Guide

## Current Debug Setup

The application now includes comprehensive debugging features to help diagnose why sprint features aren't visible.

### 🔍 Debug Features Added

1. **Sprint Debug Panel** - Red panel at the top of the main page showing:
   - User permissions and manager status
   - Database configuration status
   - Sprint data loading states
   - Feature visibility tests
   - Current sprint data (if available)

2. **Console Logging** - Detailed logging in browser console:
   - `🏃‍♂️` SprintProgressIndicator events
   - `🗄️` DatabaseService queries and responses
   - `🟣` Sprint Settings button clicks

3. **Temporary Test Mode** - Sprint features now visible to ALL users:
   - Sprint Analytics dashboard (desktop)
   - Sprint Settings button (with 🧪 test indicator)
   - Sprint Progress Indicator (all screens)

### 📋 How to Use Debug Features

1. **Open the Application**
   ```bash
   npm run dev
   ```
   
2. **Navigate to Team Dashboard**
   - Select a team
   - Select a user (any user, not just managers)

3. **Check the Debug Panel**
   - Red panel at top shows all diagnostic information
   - Green ✅ indicators show what's working
   - Red ❌ indicators show what's failing

4. **Open Browser Console**
   - Press F12 or right-click → Inspect
   - Go to Console tab
   - Look for emoji-prefixed debug messages

5. **Test Sprint Features**
   - Purple "Sprints 🧪" button should be visible to all users
   - Sprint Analytics should show below debug panel on desktop
   - Sprint Progress Indicator should show in header/below navigation

### 🔧 Common Issues and Solutions

#### Issue 1: "Supabase not configured"
- **Symptom**: Debug panel shows "❌ NO" for Supabase configuration
- **Solution**: Check your `.env.local` file has valid Supabase credentials

#### Issue 2: "No current sprint found"
- **Symptom**: Debug panel shows "⚠️ No current sprint data"
- **Solution**: Run the database migration script `sql/migrate-sprints.sql`

#### Issue 3: Database query errors in console
- **Symptom**: Console shows database errors with 🗄️ prefix
- **Solutions**: 
  1. Verify `current_sprints` view exists in database
  2. Run the debug SQL script: `sql/debug-sprint-tables.sql`
  3. Check if `team_sprints` table has data

#### Issue 4: User not manager
- **Symptom**: Debug panel shows "❌ FALSE" for "Is Manager"
- **Solution**: In test mode, features are visible to all users. In production, update user's `is_manager` field in database.

### 📊 Database Verification

Run this script in Supabase SQL editor to verify setup:
```sql
-- Check if sprint tables exist
SELECT * FROM team_sprints LIMIT 5;

-- Check teams have sprint data
SELECT id, name, sprint_length_weeks FROM teams;

-- Check current sprints view
SELECT * FROM current_sprints;

-- Check user manager status
SELECT name, is_manager FROM team_members;
```

### 🧹 Removing Debug Features

When debugging is complete, remove these temporary features:

1. **Remove Debug Panel**: Delete `SprintDebugPanel` import and usage from `src/app/page.tsx`

2. **Restore Manager-Only Access**: 
   - Uncomment manager conditions in `src/app/page.tsx`
   - Remove test mode Sprint Settings button in `src/components/ScheduleTable.tsx`

3. **Remove Console Logging**: Remove `console.log` statements from:
   - `src/lib/database.ts`
   - `src/components/SprintProgressIndicator.tsx`
   - `src/components/ScheduleTable.tsx`

### 📝 Expected Behavior After Fix

Once working correctly:
- **Managers** see: Sprint Settings button, Sprint Analytics dashboard, Sprint Progress indicator
- **Regular users** see: Sprint Progress indicator only
- **All users** see: No console errors, sprint data loads properly

---

**Debug files created:**
- `src/components/SprintDebugPanel.tsx` - Comprehensive debug interface
- `sql/debug-sprint-tables.sql` - Database verification queries
- This documentation file

**Modified files with debug code:**
- `src/app/page.tsx` - Added debug panel and test mode
- `src/components/ScheduleTable.tsx` - Added test mode sprint button
- `src/components/SprintProgressIndicator.tsx` - Added debug logging
- `src/lib/database.ts` - Added debug logging and fallback queries