# Recognition System Database Deployment Guide

## 🔍 Problem Identified
You're encountering `ERROR: 42846: cannot cast type uuid to integer` which means there are problematic RLS (Row Level Security) policies trying to cast `auth.uid()` (UUID) to INTEGER.

## 📊 Root Issues
- RLS policies using `auth.uid()::INTEGER` casting
- Missing recognition system tables
- Type mismatch between UUID authentication and INTEGER foreign keys

## 🚀 Solution: Fix All UUID Casting + Deploy Recognition System

### Step 1: Open Your Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **"New Query"**

### Step 2: Choose Your Fix Strategy

#### Option A: Defensive Fix (Recommended)
**Use this if you're unsure about your database state or getting "relation does not exist" errors:**

Copy and paste the **entire contents** of `sql/fix_uuid_casting_defensive.sql` into the SQL editor and execute it.

**File location**: `/sql/fix_uuid_casting_defensive.sql`

✅ **Safe for any database state** - checks table existence before fixing
✅ **Handles missing tables gracefully** - no errors if tables don't exist  
✅ **Comprehensive reporting** - shows exactly what was found and fixed

#### Option B: Full Database Cleanup (For Problematic States)
**Use this if you have partially deployed schemas with bad policies:**

Copy and paste the **entire contents** of `sql/cleanup_partial_deployments.sql` into the SQL editor and execute it.

**File location**: `/sql/cleanup_partial_deployments.sql`

⚠️ **Removes problematic tables** - only removes tables with bad UUID casting policies
✅ **Preserves good data** - keeps tables with safe policies
✅ **Clean slate approach** - prepares database for fresh deployment

#### Option C: Original Fix (For Known Issues)
**Use this only if you know you have existing problematic policies:**

Copy and paste the **entire contents** of `sql/fix_all_uuid_casting_errors.sql` into the SQL editor and execute it.

**File location**: `/sql/fix_all_uuid_casting_errors.sql`

⚠️ **May fail if tables don't exist** - use Option A instead if unsure

**⚠️ CRITICAL**: One of these fixes must be run FIRST before deploying the recognition system.

### Step 3: Deploy Recognition System Schema
Copy and paste the **entire contents** of `sql/004_recognition_system_fixed.sql` into the SQL editor and execute it.

**File location**: `/sql/004_recognition_system_fixed.sql`

**⚠️ Important**: This is the INTEGER-compatible version with fixed RLS policies that works with your database structure.

This will create:
- ✅ `user_achievements` table with proper structure and indexes
- ✅ `recognition_metrics` table with proper structure and indexes  
- ✅ Row Level Security (RLS) policies for data access control
- ✅ Database functions for metric calculations
- ✅ Trigger functions for automatic timestamp updates
- ✅ Sample data for testing

### Step 3: Verify Deployment
After running the SQL script, you should see success messages for:
- Table creation
- Index creation  
- Policy creation
- Function creation
- Sample data insertion

### Step 4: Verify the Fix
After running both SQL scripts, you should see output like:
```
NOTICE: Fixed availability_templates RLS policies
NOTICE: Fixed user_achievements RLS policies  
NOTICE: Fixed recognition_metrics RLS policies
NOTICE: UUID Casting Fix Complete
```

### Step 5: Test the Application
1. Restart your Next.js development server
2. Check the browser console - you should no longer see UUID casting errors
3. User profile sections should now load without errors

## 🔧 Enhanced Error Handling
The database functions now provide detailed error messages:

### Before (unclear errors):
```
Error in getUserAchievements: {}
Error in getUserMetrics: {}
```

### After (detailed diagnostic info):
```
🔥 MISSING TABLE: user_achievements table does not exist in database!
📋 To fix: Execute sql/004_recognition_system_fixed.sql in your Supabase SQL editor
🔗 Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql
```

## ✅ INTEGER Compatibility Fixed with Proper RLS
The new schema is compatible with INTEGER-based `team_members.id` columns:
- ✅ All foreign key references use INTEGER type
- ✅ RLS policies fixed to avoid auth.uid() casting errors
- ✅ Database functions accept INTEGER parameters
- ✅ TypeScript interfaces use number IDs
- ✅ No more UUID casting errors

## 📋 What the Schema Includes

### Tables Created:
1. **user_achievements**
   - Stores achievement badges (consistent_updater, perfect_week, reliability_streak)
   - Links to team_members via foreign key
   - Includes achievement metadata in JSONB format

2. **recognition_metrics** 
   - Stores calculated metrics (weekly_completion_rate, consistency_streak)
   - Time-period based metrics with start/end dates
   - Automatic metric calculations via database functions

### Functions Created:
- `calculate_weekly_completion_rate()` - Calculates user completion percentages
- `calculate_user_recognition_metrics()` - Updates all user metrics
- `check_user_achievements()` - Awards achievements based on performance
- `get_team_recognition_leaderboard()` - Provides team ranking data

### Security:
- Row Level Security (RLS) enabled on all tables
- Users can only see their own data and team data
- Proper access controls for data privacy

## 🎯 Next Steps
After deployment, the recognition system will be fully functional:
- User achievements will be tracked automatically
- Recognition metrics will be calculated weekly  
- Team leaderboards will display current standings
- Error messages will be clear and actionable

## 🐛 Troubleshooting
If you still see errors after deployment:
1. Check the browser console for detailed error messages
2. Verify all SQL statements executed successfully
3. Ensure your Supabase environment variables are correct
4. Restart your development server to clear any cached connections

---
**Generated by Claude Code Database Enhancement Specialist** 🤖