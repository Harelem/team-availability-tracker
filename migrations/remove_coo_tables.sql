-- Migration to remove COO-specific tables and cleanup database
-- Generated on 2024-08-24 to resolve 404 errors from non-existent COO tables

-- Remove COO-specific tables that are causing 404 errors
BEGIN;

-- Drop COO-specific tables if they exist (these were causing 404s)
DROP TABLE IF EXISTS team_stats CASCADE;
DROP TABLE IF EXISTS company_metrics CASCADE;
DROP TABLE IF EXISTS sprint_analytics CASCADE;
DROP TABLE IF EXISTS workforce_daily_status CASCADE;
DROP TABLE IF EXISTS global_sprint_data CASCADE;
DROP TABLE IF EXISTS daily_company_status CASCADE;

-- Drop any COO-specific views if they exist
DROP VIEW IF EXISTS coo_dashboard_view CASCADE;
DROP VIEW IF EXISTS company_capacity_view CASCADE;
DROP VIEW IF EXISTS team_performance_view CASCADE;

-- Drop any COO-specific functions if they exist
DROP FUNCTION IF EXISTS get_daily_company_status(text) CASCADE;
DROP FUNCTION IF EXISTS get_coo_dashboard_optimized(text) CASCADE;
DROP FUNCTION IF EXISTS calculate_company_metrics(text) CASCADE;
DROP FUNCTION IF EXISTS get_team_capacity_status(integer, text) CASCADE;

-- Remove any COO-specific stored procedures
DROP PROCEDURE IF EXISTS refresh_coo_analytics() CASCADE;
DROP PROCEDURE IF EXISTS update_team_stats() CASCADE;

-- Clean up any COO-specific indexes
DROP INDEX IF EXISTS idx_team_stats_date;
DROP INDEX IF EXISTS idx_company_metrics_date;
DROP INDEX IF EXISTS idx_workforce_daily_status_date;

-- Remove COO-specific RLS policies if they exist
DROP POLICY IF EXISTS "COO users can view all team stats" ON team_stats;
DROP POLICY IF EXISTS "COO users can view company metrics" ON company_metrics;

-- Keep essential tables that are still needed:
-- - teams (still needed for team selection)
-- - team_members (still needed for user management)
-- - schedule_entries (still needed for availability tracking)
-- - sprint_settings (still needed if sprint functionality is preserved)

COMMIT;

-- Verification queries to confirm cleanup
-- These should return 0 rows after successful migration
SELECT COUNT(*) as team_stats_count FROM information_schema.tables WHERE table_name = 'team_stats';
SELECT COUNT(*) as company_metrics_count FROM information_schema.tables WHERE table_name = 'company_metrics';
SELECT COUNT(*) as sprint_analytics_count FROM information_schema.tables WHERE table_name = 'sprint_analytics';