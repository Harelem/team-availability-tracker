# PostgreSQL Upgrade Guide - Team Availability Tracker

**Current Version**: supabase-postgres-17.4.1.052
**Target Version**: Latest PostgreSQL 17.x stable
**Priority**: HIGH (Security patches available)
**Date**: October 14, 2025

---

## Why Upgrade?

The 2025-10-14 security audit identified that the current PostgreSQL version has **outstanding security patches available**. Upgrading ensures:

- 🔒 Latest security fixes applied
- 🚀 Performance improvements
- 🐛 Bug fixes and stability enhancements
- ✅ Compliance with security best practices

---

## Pre-Upgrade Checklist

### 1. Review Current System Status
```bash
# Check current Postgres version in Supabase dashboard
# Navigate to: Project Settings > Database > Configuration
```

### 2. Backup Database
```bash
# Supabase automatically creates backups, but verify:
# Dashboard > Database > Backups
# Ensure daily backups are enabled
# Consider creating a manual backup before upgrade
```

### 3. Review Breaking Changes
- Check [PostgreSQL Release Notes](https://www.postgresql.org/docs/17/release.html)
- Review [Supabase Upgrade Documentation](https://supabase.com/docs/guides/platform/upgrading)

### 4. Schedule Maintenance Window
- **Recommended**: Off-peak hours (weekends, late evenings)
- **Duration**: Typically 15-30 minutes for small databases
- **Notify**: Team members and stakeholders

---

## Upgrade Process

### Option 1: Supabase Dashboard Upgrade (Recommended)

1. **Access Supabase Dashboard**
   - Navigate to your project
   - Go to Settings > Database

2. **Initiate Upgrade**
   - Click "Upgrade" button next to PostgreSQL version
   - Review the upgrade plan
   - Confirm the maintenance window

3. **Monitor Progress**
   - Dashboard will show upgrade status
   - Typically completes in 15-30 minutes
   - No action required during upgrade

4. **Verify Upgrade**
   ```sql
   SELECT version();
   -- Should show PostgreSQL 17.x (latest)
   ```

### Option 2: Supabase CLI Upgrade

```bash
# Login to Supabase CLI
supabase login

# Check for available upgrades
supabase db upgrade --project-ref YOUR_PROJECT_REF --dry-run

# Perform upgrade
supabase db upgrade --project-ref YOUR_PROJECT_REF

# Verify
supabase db remote --project-ref YOUR_PROJECT_REF
```

---

## Post-Upgrade Verification

### 1. Database Health Check
```sql
-- Verify version
SELECT version();

-- Check table access
SELECT COUNT(*) FROM teams;
SELECT COUNT(*) FROM team_members;
SELECT COUNT(*) FROM schedule_entries;

-- Verify RLS policies
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check function integrity
SELECT COUNT(*) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
```

### 2. Application Health Check
- [ ] Test user authentication
- [ ] Verify team selection works
- [ ] Test schedule entry creation/editing
- [ ] Verify export functionality
- [ ] Test COO dashboard access
- [ ] Check real-time updates

### 3. Performance Verification
```sql
-- Check query performance
SELECT query_type, AVG(execution_time_ms) as avg_ms
FROM query_performance_log
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY query_type
ORDER BY avg_ms DESC;

-- Verify index usage
SELECT * FROM v_index_usage_analysis
WHERE usage_category = 'UNUSED'
LIMIT 10;
```

---

## Rollback Plan (If Needed)

### Automatic Rollback
Supabase maintains point-in-time recovery (PITR) for 7 days:

```bash
# If upgrade causes issues, contact Supabase support for rollback
# Provide:
# - Project reference ID
# - Timestamp before upgrade
# - Description of issues
```

### Manual Restore from Backup
1. Navigate to Database > Backups in Supabase dashboard
2. Select backup from before upgrade
3. Click "Restore" and confirm
4. Wait for restoration (15-45 minutes)
5. Verify application functionality

---

## Known Considerations

### PostgreSQL 17.x Changes
- Improved query parallelism
- Enhanced security features
- Better JSON performance
- Improved indexing

### Team Availability Tracker Specific
- ✅ All migrations are forward-compatible
- ✅ RLS policies will work unchanged
- ✅ Functions are compatible with PostgreSQL 17
- ✅ No application code changes required

---

## Communication Template

### Pre-Upgrade Notification

**Subject**: Scheduled Maintenance - Team Availability Tracker Database Upgrade

Dear Team,

We will be upgrading the Team Availability Tracker database to apply important security patches.

**Date**: [INSERT DATE]
**Time**: [INSERT TIME] - [INSERT TIME]
**Duration**: Approximately 30 minutes
**Impact**: Application will be unavailable during upgrade

**What you need to do**: Nothing. The system will be automatically upgraded.

**After upgrade**: If you experience any issues, please report them immediately.

Thank you for your patience.

---

### Post-Upgrade Notification

**Subject**: ✅ Database Upgrade Complete - Team Availability Tracker

The database upgrade has been completed successfully.

**New Version**: PostgreSQL 17.x
**Status**: ✅ All systems operational
**Performance**: ✅ Verified
**Data Integrity**: ✅ Verified

You can now continue using the application normally. If you experience any issues, please contact support.

---

## Support & Resources

### Supabase Support
- **Documentation**: https://supabase.com/docs/guides/platform/upgrading
- **Support Email**: support@supabase.com
- **Community**: https://github.com/supabase/supabase/discussions

### PostgreSQL Resources
- **Release Notes**: https://www.postgresql.org/docs/17/release.html
- **Documentation**: https://www.postgresql.org/docs/17/

### Project-Specific
- **Security Audit Report**: See `SECURITY_AUDIT_2025_10_14.md`
- **Migration Logs**: Check `migration_log` table in database

---

## Upgrade Timeline

### Recommended Schedule

**Week 1 (Current)**:
- ✅ Security audit completed
- ✅ Critical fixes applied
- ✅ Upgrade guide created

**Week 2**:
- [ ] Schedule maintenance window
- [ ] Notify stakeholders
- [ ] Create manual backup

**Week 3**:
- [ ] Perform upgrade during maintenance window
- [ ] Run post-upgrade verification
- [ ] Monitor for 48 hours

**Week 4**:
- [ ] Confirm stability
- [ ] Document lessons learned
- [ ] Close upgrade ticket

---

## Troubleshooting

### Issue: Upgrade Fails
**Solution**:
1. Check Supabase status page
2. Contact Supabase support with project ref
3. Wait for guidance before retrying

### Issue: Application Errors Post-Upgrade
**Solution**:
1. Check browser console for specific errors
2. Verify database connectivity
3. Review application logs
4. Check RLS policies and function permissions

### Issue: Performance Degradation
**Solution**:
```sql
-- Run ANALYZE to update statistics
ANALYZE;

-- Check for bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Reindex if needed
REINDEX DATABASE postgres;
```

---

## Approval & Sign-off

**Prepared by**: Security Audit Team
**Date**: October 14, 2025
**Reviewed by**: _________________
**Approved by**: _________________
**Scheduled for**: _________________

---

*This guide is based on the 2025-10-14 security audit findings. For the latest information, always refer to Supabase official documentation.*
