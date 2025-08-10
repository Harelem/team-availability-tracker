-- POST-DEPLOYMENT VALIDATION TESTS
-- Execute these tests in Supabase SQL Editor AFTER deployment
-- All tests should return expected results for successful deployment

-- =====================================================
-- CRITICAL VALIDATION TESTS
-- =====================================================

-- Test 1: Schema Validation (All should be PASS)
SELECT 
  'CRITICAL_VALIDATION' as test_category,
  check_name,
  status,
  details
FROM validate_schema_deployment()
ORDER BY check_name;

-- Expected Result: All status = 'PASS'
-- If any status = 'FAIL', deployment failed

-- Test 2: Teams Table Validation
SELECT 
  'TEAMS_TABLE_TEST' as test_category,
  'teams_count' as test_name,
  COUNT(*) as result,
  CASE WHEN COUNT(*) >= 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM teams;

-- Expected Result: 6 teams, status = '✅ PASS'

-- Test 3: Teams Data Integrity
SELECT 
  'TEAMS_DATA_TEST' as test_category,
  'team_details' as test_name,
  name,
  description,
  color,
  CASE WHEN name IS NOT NULL AND color IS NOT NULL THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM teams
ORDER BY name;

-- Expected Result: 6 teams with names and colors, all status = '✅ PASS'

-- =====================================================
-- TEAM MEMBERS ENHANCEMENT TESTS
-- =====================================================

-- Test 4: Team Members Column Validation
SELECT 
  'TEAM_MEMBERS_COLUMNS' as test_category,
  column_name,
  data_type,
  is_nullable,
  CASE WHEN column_name IN ('team_id', 'role', 'is_critical', 'inactive_date') 
       THEN '✅ NEW COLUMN' ELSE 'EXISTING' END as column_status
FROM information_schema.columns 
WHERE table_name = 'team_members' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected Result: team_id, role, is_critical, inactive_date columns present

-- Test 5: Team Members Data Population
SELECT 
  'TEAM_MEMBERS_DATA' as test_category,
  COUNT(*) as total_members,
  COUNT(team_id) as members_with_team_id,
  COUNT(role) as members_with_role,
  COUNT(CASE WHEN is_critical = true THEN 1 END) as critical_members,
  CASE 
    WHEN COUNT(*) = COUNT(role) THEN '✅ ALL MEMBERS HAVE ROLES'
    ELSE '❌ SOME MEMBERS MISSING ROLES'
  END as role_status
FROM team_members 
WHERE inactive_date IS NULL;

-- Expected Result: All active members have roles assigned

-- =====================================================
-- FUNCTION AND VIEW TESTS
-- =====================================================

-- Test 6: value_to_hours Function Test
SELECT 
  'FUNCTION_TEST' as test_category,
  'value_to_hours' as function_name,
  value_to_hours('1') as full_day_result,
  value_to_hours('0.5') as half_day_result,
  value_to_hours('X') as absent_result,
  CASE 
    WHEN value_to_hours('1') = 1.0 
     AND value_to_hours('0.5') = 0.5 
     AND value_to_hours('X') = 0.0 
    THEN '✅ PASS' ELSE '❌ FAIL' 
  END as test_status;

-- Expected Result: 1.0, 0.5, 0.0, status = '✅ PASS'

-- Test 7: schedule_entries_with_hours View Test
SELECT 
  'VIEW_TEST' as test_category,
  'schedule_entries_with_hours' as view_name,
  COUNT(*) as total_entries,
  COUNT(hours) as entries_with_hours,
  CASE 
    WHEN COUNT(*) = COUNT(hours) THEN '✅ ALL ENTRIES HAVE HOURS'
    ELSE '❌ SOME ENTRIES MISSING HOURS'
  END as hours_status
FROM schedule_entries_with_hours
LIMIT 1;

-- Expected Result: All entries should have hours calculated

-- Test 8: Daily Status Function Test
SELECT 
  'DAILY_STATUS_FUNCTION' as test_category,
  total_members,
  available_members,
  half_day_members,
  unavailable_members,
  critical_absences,
  CASE 
    WHEN total_members > 0 THEN '✅ FUNCTION WORKING'
    ELSE '❌ FUNCTION FAILED'
  END as function_status
FROM get_daily_status_summary();

-- Expected Result: Member counts > 0, function_status = '✅ FUNCTION WORKING'

-- =====================================================
-- PERFORMANCE AND INDEX TESTS
-- =====================================================

-- Test 9: Index Creation Validation
SELECT 
  'INDEX_TEST' as test_category,
  schemaname,
  tablename,
  indexname,
  indexdef,
  CASE WHEN indexname LIKE '%team_id%' THEN '✅ NEW INDEX' ELSE 'EXISTING' END as index_status
FROM pg_indexes 
WHERE tablename IN ('teams', 'team_members')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected Result: New indexes for team_id and other new columns

-- Test 10: Query Performance Test (Simple)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT t.name, COUNT(tm.id) as member_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.inactive_date IS NULL
GROUP BY t.id, t.name
ORDER BY t.name;

-- Expected Result: Query should execute quickly with index usage

-- =====================================================
-- APPLICATION INTEGRATION TESTS
-- =====================================================

-- Test 11: Team Stats View Test
SELECT 
  'TEAM_STATS_VIEW' as test_category,
  name as team_name,
  member_count,
  manager_count,
  CASE 
    WHEN member_count >= 0 AND manager_count >= 0 THEN '✅ VALID COUNTS'
    ELSE '❌ INVALID COUNTS'
  END as count_status
FROM team_stats
ORDER BY name;

-- Expected Result: All teams have valid member and manager counts

-- Test 12: Enhanced Daily Status Data Test
SELECT 
  'ENHANCED_DAILY_STATUS' as test_category,
  member_name,
  member_role,
  is_critical,
  hours,
  CASE 
    WHEN member_name IS NOT NULL AND member_role IS NOT NULL THEN '✅ COMPLETE DATA'
    ELSE '❌ INCOMPLETE DATA'
  END as data_status
FROM get_daily_company_status_data(CURRENT_DATE)
LIMIT 5;

-- Expected Result: All members have complete role and status data

-- =====================================================
-- DATA INTEGRITY VERIFICATION
-- =====================================================

-- Test 13: Foreign Key Relationships (Logical)
SELECT 
  'DATA_INTEGRITY' as test_category,
  'team_member_relationships' as test_name,
  COUNT(*) as total_members,
  COUNT(tm.team_id) as members_with_teams,
  COUNT(DISTINCT tm.team_id) as unique_teams_referenced,
  (SELECT COUNT(*) FROM teams) as total_teams,
  CASE 
    WHEN COUNT(tm.team_id) > 0 AND COUNT(DISTINCT tm.team_id) <= (SELECT COUNT(*) FROM teams)
    THEN '✅ RELATIONSHIPS VALID'
    ELSE '❌ RELATIONSHIP ISSUES'
  END as relationship_status
FROM team_members tm
WHERE tm.inactive_date IS NULL;

-- Expected Result: Valid team relationships established

-- Test 14: Data Consistency Check
SELECT 
  'DATA_CONSISTENCY' as test_category,
  'member_role_consistency' as test_name,
  COUNT(*) as total_active_members,
  COUNT(CASE WHEN role IS NOT NULL THEN 1 END) as members_with_roles,
  COUNT(CASE WHEN team_id IS NOT NULL THEN 1 END) as members_with_teams,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN role IS NOT NULL THEN 1 END)
     AND COUNT(*) = COUNT(CASE WHEN team_id IS NOT NULL THEN 1 END)
    THEN '✅ FULLY CONSISTENT'
    ELSE '⚠️ NEEDS POPULATION'
  END as consistency_status
FROM team_members
WHERE inactive_date IS NULL;

-- Expected Result: All active members have roles and team assignments

-- =====================================================
-- FINAL DEPLOYMENT VALIDATION SUMMARY
-- =====================================================

-- Test 15: Overall Deployment Success Check
SELECT 
  'DEPLOYMENT_SUMMARY' as test_category,
  CASE 
    WHEN (SELECT COUNT(*) FROM validate_schema_deployment() WHERE status = 'FAIL') = 0
     AND (SELECT COUNT(*) FROM teams) >= 6
     AND (SELECT COUNT(role) FROM team_members WHERE inactive_date IS NULL) > 0
     AND value_to_hours('1') = 1.0
    THEN '✅ DEPLOYMENT SUCCESSFUL - Schema migration completed successfully'
    ELSE '❌ DEPLOYMENT ISSUES - Check individual test results above'
  END as overall_status;

-- Expected Result: '✅ DEPLOYMENT SUCCESSFUL'

-- =====================================================
-- TROUBLESHOOTING QUERIES (IF ISSUES FOUND)
-- =====================================================

-- If any tests fail, run these diagnostic queries:

-- Check for missing functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('value_to_hours', 'get_daily_status_summary', 'get_daily_company_status_data');

-- Check for missing columns
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_members'
  AND column_name IN ('team_id', 'role', 'is_critical', 'inactive_date');

-- Check teams data
SELECT name, COUNT(*) as count FROM teams GROUP BY name;

-- =====================================================
-- SUCCESS CRITERIA SUMMARY
-- =====================================================

/*
DEPLOYMENT IS SUCCESSFUL IF:
✅ All validate_schema_deployment() checks return 'PASS'
✅ 6 teams exist in teams table
✅ All team_members have role and team_id populated
✅ value_to_hours function returns correct values (1.0, 0.5, 0.0)
✅ Daily status functions execute without errors
✅ Views and functions are created and accessible
✅ No critical errors in any test results

DEPLOYMENT REQUIRES ATTENTION IF:
⚠️ Some members missing role or team_id (may need manual assignment)
⚠️ Performance queries slower than expected (may need additional optimization)
⚠️ Minor data inconsistencies that don't break core functionality

DEPLOYMENT FAILED IF:
❌ Any validate_schema_deployment() check returns 'FAIL'
❌ Teams table missing or empty
❌ Critical functions not created
❌ Major data corruption or integrity issues
❌ Application cannot load or function
*/