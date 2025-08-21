# EMERGENCY SCHEMA DEPLOYMENT EXECUTION GUIDE
**CRITICAL PRIORITY - Execute Immediately**

## DEPLOYMENT STATUS
- **Migration Branch:** emergency/schema-migration ✅
- **Backup Plan:** Created and documented ✅
- **SQL Scripts:** Validated and ready ✅
- **Rollback Procedures:** Documented ✅

## IMMEDIATE ACTION REQUIRED

### Step 1: Access Supabase SQL Editor
1. Log into your Supabase dashboard
2. Navigate to SQL Editor
3. Ensure you're connected to the correct database

### Step 2: Execute Pre-Deployment Diagnostic
**Copy and paste this diagnostic script into Supabase SQL Editor:**

```sql
-- PRE-DEPLOYMENT DIAGNOSTIC
-- Execute this first to confirm current schema issues

-- Check 1: Does teams table exist?
SELECT 
  'teams_table_check' as diagnostic,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams' AND table_schema = 'public')
    THEN 'EXISTS - Teams table is present' 
    ELSE '❌ MISSING - Teams table does not exist (CRITICAL ISSUE)'
  END as result;

-- Check 2: Critical columns check
SELECT 
  'critical_columns_check' as diagnostic,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'team_id')
    THEN '❌ MISSING - team_id column missing (CRITICAL)'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'role')
    THEN '❌ MISSING - role column missing (CRITICAL)'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'is_critical')
    THEN '❌ MISSING - is_critical column missing (CRITICAL)'
    ELSE '✅ Some columns exist - proceed with deployment'
  END as result;

-- Summary recommendation
SELECT 
  'DEPLOYMENT_RECOMMENDATION' as status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams')
    THEN '🚨 CRITICAL DEPLOYMENT REQUIRED - Application is completely broken'
    ELSE '⚠️ DEPLOYMENT NEEDED - Schema enhancements required'
  END as recommendation;
```

**Expected Result:** You should see missing teams table and missing columns confirmed.

### Step 3: Execute Emergency Schema Deployment

**⚠️ CRITICAL: Copy the ENTIRE content of the file below into Supabase SQL Editor:**

**File Location:** `/Users/harel/team-availability-tracker/sql/EMERGENCY-SCHEMA-DEPLOYMENT.sql`

**IMPORTANT:** 
- Execute the ENTIRE script as one operation
- Do NOT execute sections individually
- The script includes built-in validation and rollback procedures

### Step 4: Validate Deployment Success

After executing the deployment script, you should see validation results at the end. Look for:

**✅ SUCCESS INDICATORS:**
- All validation checks show "PASS"
- Teams table created with 6 teams
- value_to_hours function test results: 1.0, 0.5, 0.0
- Daily status summary test shows member counts
- Final confirmation: "✅ SUCCESS - All schema updates deployed correctly"

**❌ FAILURE INDICATORS:**
- Any validation check shows "FAIL"
- Error messages during script execution
- Final confirmation: "❌ FAILURE - Check validation results above"

### Step 5: Post-Deployment Verification

**Execute these validation queries in Supabase SQL Editor:**

```sql
-- 1. Comprehensive validation
SELECT * FROM validate_schema_deployment();

-- 2. Team data verification
SELECT name, member_count, manager_count FROM team_stats;

-- 3. Member data integrity check
SELECT 
  COUNT(*) as total_members,
  COUNT(team_id) as assigned_to_teams,
  COUNT(role) as with_roles,
  COUNT(CASE WHEN is_critical = true THEN 1 END) as critical_members
FROM team_members 
WHERE inactive_date IS NULL;

-- 4. Function testing
SELECT 
  value_to_hours('1') as full_day,
  value_to_hours('0.5') as half_day, 
  value_to_hours('X') as absent;

-- 5. Daily status function test
SELECT * FROM get_daily_status_summary();
```

**Expected Results:**
- All validation checks = "PASS"
- 6 teams in team_stats
- All members have team_id and role assigned
- Function tests return 1.0, 0.5, 0.0
- Daily status shows member counts

## DEPLOYMENT PHASES BREAKDOWN

### Phase 1: Core Schema Creation (5 minutes)
✅ Creates missing `teams` table  
✅ Adds `team_id` column to `team_members`  
✅ Creates performance indexes  
✅ Inserts required teams data  

### Phase 2: Critical Missing Columns (3 minutes)
✅ Adds `role`, `is_critical`, `inactive_date` columns  
✅ Creates indexes for new columns  

### Phase 3: Enhanced Functions and Views (5 minutes)
✅ Creates `value_to_hours` function  
✅ Creates `schedule_entries_with_hours` view  
✅ Creates enhanced daily status functions  

### Phase 4: Data Population (2 minutes)
✅ Populates default member roles  
✅ Validates data consistency  

### Phase 5: Performance Optimization (5 minutes)
✅ Creates performance views  
✅ Optimizes database policies  
✅ Adds summary functions  

## SUCCESS CRITERIA CHECKLIST

**✅ Deployment Successful When:**
- [ ] All validation queries return "PASS"
- [ ] Teams table exists with 6 teams
- [ ] All team_members have team_id and role
- [ ] Functions execute without errors
- [ ] No database errors in deployment log

**❌ Rollback Required When:**
- Any validation check fails
- Critical errors during deployment
- Database becomes unresponsive

## IMMEDIATE POST-DEPLOYMENT ACTIONS

1. **Test Application Loading:**
   - Navigate to application homepage
   - Verify teams display correctly
   - Check for console errors

2. **Test COO Dashboard:**
   - Access COO dashboard
   - Verify daily status loads
   - Check critical absences section

3. **Verify Core Functionality:**
   - Team selection works
   - Member schedules display
   - Status updates save correctly

## ROLLBACK PROCEDURE (IF NEEDED)

If deployment fails or causes critical issues:

```sql
-- EMERGENCY ROLLBACK (execute in Supabase SQL Editor)
-- Drop new functions and views
DROP FUNCTION IF EXISTS get_daily_status_summary(DATE);
DROP FUNCTION IF EXISTS get_daily_company_status_data(DATE);
DROP VIEW IF EXISTS schedule_entries_with_hours;
DROP VIEW IF EXISTS team_stats;
DROP FUNCTION IF EXISTS value_to_hours(VARCHAR);
DROP FUNCTION IF EXISTS populate_default_member_data();
DROP FUNCTION IF EXISTS validate_schema_deployment();

-- Restore from backup if necessary
-- Contact support if critical issues persist
```

## MONITORING REQUIREMENTS

**First 30 Minutes:**
- Monitor application for loading errors
- Check database query performance
- Verify user can access core features

**First 24 Hours:**
- Monitor error logs
- Track user reports
- Validate data consistency

## SUPPORT CONTACTS

**Critical Issues:**
- Database Admin: [Your database administrator]
- Development Team: [Lead developer contact]
- Supabase Support: [Support dashboard]

---

**DEPLOYMENT PRIORITY:** 🚨 CRITICAL  
**ESTIMATED TIME:** 30 minutes total  
**RISK LEVEL:** LOW (All operations are additive)  
**DATA SAFETY:** HIGH (No destructive operations)

**STATUS:** ⚠️ READY FOR IMMEDIATE EXECUTION