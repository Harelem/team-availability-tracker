# SCHEMA MIGRATION BACKUP PLAN
**Emergency Schema Migration - Team Availability Tracker**  
**Date:** 2025-08-10  
**Migration Branch:** emergency/schema-migration  

## PRE-DEPLOYMENT BACKUP STATUS

### Current Schema State (Before Migration)
This migration addresses critical schema mismatches identified by the Database Schema Auditor:

**CRITICAL ISSUES IDENTIFIED:**
- Missing `teams` table (causing 58+ query failures)
- Missing columns in `team_members` table:
  - `team_id` (breaking team relationships)
  - `role` (required for getDailyCompanyStatus)
  - `is_critical` (needed for critical absence tracking)
  - `inactive_date` (for member lifecycle management)
- Missing `value_to_hours` function (schedule calculations)
- Missing enhanced views for compatibility

### Backup Strategy

**1. Current Working State:**
- Branch: `feature/comprehensive-mobile-navigation`
- Last working commit: `4caa6e9 feat: Comprehensive Mobile Navigation System Implementation`
- Application status: BROKEN due to schema mismatches

**2. Database Backup Requirements:**
- **MANUAL ACTION REQUIRED**: Create full database backup in Supabase before deployment
- Backup location: Supabase Dashboard > Settings > Database > Backup
- Backup name: `pre-emergency-schema-migration-2025-08-10`

**3. Code Rollback Points:**
- Current branch can be restored with: `git checkout feature/comprehensive-mobile-navigation`
- Emergency branch: `emergency/schema-migration` (current working branch)

## ROLLBACK PROCEDURES

### If Schema Deployment Fails:

**1. Immediate Database Rollback (Critical Issues Only)**
Execute in Supabase SQL Editor:
```sql
-- EMERGENCY ROLLBACK (ONLY IF DEPLOYMENT FAILS)
-- Drop new functions and views
DROP FUNCTION IF EXISTS get_daily_status_summary(DATE);
DROP FUNCTION IF EXISTS get_daily_company_status_data(DATE);
DROP VIEW IF EXISTS schedule_entries_with_hours;
DROP VIEW IF EXISTS team_stats;
DROP FUNCTION IF EXISTS value_to_hours(VARCHAR);
DROP FUNCTION IF EXISTS populate_default_member_data();
DROP FUNCTION IF EXISTS validate_schema_deployment();

-- NOTE: Column removal commented out to prevent data loss
-- Only uncomment if absolutely necessary and data loss is acceptable:
-- ALTER TABLE team_members DROP COLUMN IF EXISTS role;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS is_critical;  
-- ALTER TABLE team_members DROP COLUMN IF EXISTS inactive_date;
-- ALTER TABLE team_members DROP COLUMN IF EXISTS team_id;

-- Drop teams table (WARNING: DATA LOSS)  
-- DROP TABLE IF EXISTS teams CASCADE;
```

**2. Full Database Restore (If Needed)**
- Restore from `pre-emergency-schema-migration-2025-08-10` backup
- Contact Supabase support if automated restore fails

**3. Code Rollback**
```bash
git checkout feature/comprehensive-mobile-navigation
npm run build
# Test application functionality
```

## MIGRATION PHASES AND SAFETY CHECKS

### Phase 1: Core Schema Creation
**Changes:**
- Create `teams` table with RLS policies
- Add `team_id` column to `team_members`
- Add performance indexes

**Safety Measures:**
- Uses `IF NOT EXISTS` clauses
- Creates indexes `CONCURRENTLY` to prevent locks
- All operations are additive (no data loss)

**Rollback Impact:** LOW - New table and column, no existing data affected

### Phase 2: Critical Missing Columns  
**Changes:**
- Add `role`, `is_critical`, `inactive_date` columns
- Create indexes for new columns

**Safety Measures:**
- Uses `ADD COLUMN IF NOT EXISTS`
- Default values prevent null issues
- All operations are additive

**Rollback Impact:** LOW - New columns with defaults, no data loss

### Phase 3: Enhanced Functions and Views
**Changes:**
- Create `value_to_hours` function
- Create `schedule_entries_with_hours` view
- Create enhanced status functions

**Safety Measures:**
- Uses `CREATE OR REPLACE` for functions
- Views are non-destructive
- Functions are marked IMMUTABLE/STABLE appropriately

**Rollback Impact:** MINIMAL - Functions and views can be dropped safely

### Phase 4: Data Population and Validation
**Changes:**
- Populate default roles for existing members
- Insert required teams data
- Create validation functions

**Safety Measures:**
- Uses `ON CONFLICT DO NOTHING` for data inserts
- Updates only null values
- Includes transaction-safe operations

**Rollback Impact:** LOW - Default data population can be reversed

### Phase 5: Performance Optimizations
**Changes:**
- Create performance views
- Add additional functions
- Optimize policies

**Safety Measures:**
- Non-destructive operations
- Performance enhancements only
- Can be reverted without data loss

**Rollback Impact:** MINIMAL - Performance changes only

## SUCCESS VALIDATION

**Deployment Successful When:**
- All validation checks return "PASS" 
- Teams table contains 6+ teams
- All team_members have assigned roles
- Functions execute without errors
- Application loads teams successfully
- COO Dashboard renders correctly

**Immediate Rollback Required When:**
- Any validation check returns "FAIL"
- Critical data corruption detected
- Application completely non-functional
- Database performance severely degraded

## DATA SAFETY GUARANTEES

**Protected Data:**
- All existing `team_members` records preserved
- All existing `schedule_entries` preserved  
- No deletion operations in migration
- All changes are additive or enhancement-only

**New Data Added:**
- Teams table with 6 default teams
- Default roles for existing members
- Enhanced functions and views
- Performance indexes

**No Risk of Data Loss:**
- Migration uses only additive operations
- No DROP TABLE or DROP COLUMN operations
- All existing relationships preserved
- Rollback preserves all original data

## MONITORING AND VALIDATION

**Post-Deployment Monitoring:**
- Monitor application error logs
- Check database query performance
- Validate user functionality
- Confirm data integrity

**Validation Queries:**
```sql
-- Verify deployment success
SELECT * FROM validate_schema_deployment();

-- Check data integrity
SELECT COUNT(*) as total_members FROM team_members WHERE inactive_date IS NULL;
SELECT COUNT(*) as total_teams FROM teams;
SELECT COUNT(*) as total_entries FROM schedule_entries;
```

## EMERGENCY CONTACTS

**Critical Issues:**
1. Restore from backup immediately
2. Contact database administrator
3. Notify development team
4. Document all issues for analysis

**Status Updates:**
- Development team lead
- Database administrator  
- Product owner (for business impact)

---

**BACKUP PLAN STATUS:** ✅ Ready for deployment  
**SAFETY LEVEL:** HIGH (All operations additive, data protected)  
**ROLLBACK READINESS:** ✅ Complete rollback procedures documented