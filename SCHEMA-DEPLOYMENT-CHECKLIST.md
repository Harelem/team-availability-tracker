# SCHEMA DEPLOYMENT CHECKLIST
**Team Availability Tracker - Emergency Schema Fix**

## PRE-DEPLOYMENT CHECKLIST

### Database Prerequisites
- [ ] **Database Backup Completed**
  - Full database backup created
  - Backup verified and downloadable
  - Recovery plan confirmed

- [ ] **Access Confirmed** 
  - Supabase admin access verified
  - SQL Editor access confirmed
  - Application deployment access ready

- [ ] **Maintenance Mode**
  - Application users notified of maintenance
  - Application temporarily offline (optional)
  - Database connections minimized

### Application Prerequisites  
- [ ] **Code Review Completed**
  - Schema audit report reviewed
  - Migration script validated
  - TypeScript interface updates prepared

## DEPLOYMENT SEQUENCE

### Phase 1: Execute Schema Migration (30 minutes)

1. **Open Supabase SQL Editor**
   - Navigate to your Supabase project
   - Open SQL Editor
   - Ensure you're in the correct database

2. **Execute Emergency Schema Deployment**
   ```sql
   -- Copy and paste the entire content of:
   -- /Users/harel/team-availability-tracker/sql/EMERGENCY-SCHEMA-DEPLOYMENT.sql
   -- Execute in Supabase SQL Editor
   ```

3. **Verify Deployment Success**
   - [ ] All validation checks return "PASS"
   - [ ] Teams table created with 6 teams
   - [ ] team_members enhanced with new columns
   - [ ] Functions and views created successfully

### Phase 2: Update Application Code (15 minutes)

4. **Update TypeScript Interfaces**
   - [ ] Replace interfaces in `/Users/harel/team-availability-tracker/src/lib/supabase.ts`
   - [ ] Use content from `UPDATED-TYPESCRIPT-INTERFACES.ts`
   - [ ] Verify TypeScript compilation succeeds

5. **Test Database Connections**
   ```bash
   # Test application compilation
   npm run build
   
   # Test database connectivity
   npm run dev
   ```

### Phase 3: Functionality Validation (15 minutes)

6. **Core Functionality Tests**
   - [ ] **Team Loading**: Main page displays teams correctly
   - [ ] **COO Dashboard**: Loads without errors
   - [ ] **Daily Status**: Shows current company status
   - [ ] **Critical Absences**: Tracks critical member absences
   - [ ] **Schedule Entries**: Members can update availability

7. **Performance Validation**  
   - [ ] Page load times acceptable (< 3 seconds)
   - [ ] No database timeout errors
   - [ ] Query performance satisfactory

## POST-DEPLOYMENT VERIFICATION

### Database Validation Queries
Run these in Supabase SQL Editor to confirm deployment:

```sql
-- 1. Verify all schema changes deployed
SELECT * FROM validate_schema_deployment();

-- 2. Check teams data
SELECT name, member_count, manager_count FROM team_stats;

-- 3. Test daily status function
SELECT * FROM get_daily_status_summary();

-- 4. Verify member data integrity  
SELECT 
  COUNT(*) as total_members,
  COUNT(team_id) as assigned_to_teams,
  COUNT(role) as with_roles,
  COUNT(CASE WHEN is_critical = true THEN 1 END) as critical_members
FROM team_members 
WHERE inactive_date IS NULL;

-- 5. Test value conversion function
SELECT 
  value_to_hours('1') as full_day,
  value_to_hours('0.5') as half_day, 
  value_to_hours('X') as absent;
```

Expected Results:
- All validation checks = "PASS"
- 6 teams created
- All members assigned to teams and have roles
- Functions return expected results

### Application Validation Tests

1. **Team Selection Screen**
   - [ ] Teams display correctly
   - [ ] Team colors and descriptions visible
   - [ ] Team selection works without errors

2. **Main Dashboard**  
   - [ ] Selected team loads successfully
   - [ ] Team members display with correct data
   - [ ] Schedule grid renders properly
   - [ ] No console errors

3. **COO Dashboard**
   - [ ] Daily company status loads
   - [ ] Team summaries display correctly
   - [ ] Critical absences section works
   - [ ] Reserve duty members tracked

4. **Schedule Management**
   - [ ] Members can update availability
   - [ ] Reason entry works for absences
   - [ ] Changes save to database correctly
   - [ ] Real-time updates function

## ROLLBACK PROCEDURES

### If Critical Issues Arise:

1. **Immediate Rollback** (Database schema issues)
   ```sql
   -- Uncomment and execute rollback section in 
   -- EMERGENCY-SCHEMA-DEPLOYMENT.sql
   ```

2. **Application Rollback** (Code issues)
   ```bash  
   git checkout feature/comprehensive-mobile-navigation
   npm run build && npm run deploy
   ```

3. **Data Recovery** (Data corruption)
   - Restore from pre-deployment backup
   - Contact Supabase support if needed

## SUCCESS CRITERIA

### ✅ Deployment Successful If:
- [ ] All schema validation checks pass
- [ ] Teams load on main application page
- [ ] COO Dashboard renders without errors
- [ ] Daily company status displays correctly
- [ ] No "column does not exist" errors in logs
- [ ] Application performance acceptable
- [ ] Users can update schedules normally

### ❌ Rollback Required If:
- Any validation check fails
- Critical application functionality broken
- Database performance severely degraded
- Data integrity compromised
- User-facing errors persist

## MONITORING CHECKLIST

### First 24 Hours After Deployment:
- [ ] Monitor application error logs
- [ ] Check database query performance
- [ ] Verify user reports/feedback
- [ ] Confirm data consistency
- [ ] Watch for any timeout issues

### First Week After Deployment:
- [ ] Validate data accuracy
- [ ] Monitor performance metrics  
- [ ] Collect user feedback
- [ ] Plan any needed optimizations

## CONTACT INFORMATION

**Database Issues:**
- Supabase Support: [Dashboard Support]
- Database Admin: [Internal Contact]

**Application Issues:**  
- Development Team: [Internal Contact]
- DevOps: [Internal Contact]

**Business Issues:**
- Product Owner: [Internal Contact]
- Executive Team: [Internal Contact]

## NOTES
- Keep this checklist until deployment is confirmed stable
- Document any issues encountered for future reference
- Save all validation query results for audit trail
- Update deployment procedures based on lessons learned

---

**Status:** Ready for deployment  
**Last Updated:** 2025-08-10  
**Review Required:** Database Admin + Lead Developer