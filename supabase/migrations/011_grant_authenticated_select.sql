-- Migration: 011_grant_authenticated_select
-- Description: Grant SELECT privileges to authenticated role for application tables
-- Date: 2026-01-15
--
-- PURPOSE:
-- The application requires SELECT privileges on business tables for authenticated users.
-- RLS policies control which rows are visible, but table-level SELECT is required first.
-- This migration grants SELECT on all tables the application actually queries.
--
-- IMPORTANT:
-- - This does NOT weaken RLS policies (they remain enforced)
-- - This does NOT grant INSERT/UPDATE/DELETE (those are controlled by RLS)
-- - This does NOT affect auth.* tables (managed by Supabase)
-- - Tables not used by the application are intentionally excluded

-- ============================================================================
-- GRANT SELECT ON AUTHENTICATION/AUTHORIZATION TABLES
-- ============================================================================

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;

-- ============================================================================
-- GRANT SELECT ON BUSINESS TABLES
-- ============================================================================

-- Fleet Management
GRANT SELECT ON public.buses TO authenticated;

-- Trip Management
GRANT SELECT ON public.trips TO authenticated;
GRANT SELECT ON public.trip_revenue_entries TO authenticated;
GRANT SELECT ON public.trip_expenses TO authenticated;

-- Maintenance & Tyres
GRANT SELECT ON public.maintenance_records TO authenticated;
GRANT SELECT ON public.tyre_records TO authenticated;

-- Fuel Management
GRANT SELECT ON public.fuel_purchases TO authenticated;
GRANT SELECT ON public.fuel_sales TO authenticated;
GRANT SELECT ON public.fuel_stock_adjustments TO authenticated;

-- Adda Operations
GRANT SELECT ON public.adda_income TO authenticated;
GRANT SELECT ON public.adda_expenses TO authenticated;

-- Cargo Operations
GRANT SELECT ON public.cargo_records TO authenticated;

-- Installments
GRANT SELECT ON public.installments TO authenticated;
GRANT SELECT ON public.installment_payments TO authenticated;

-- Personal Expenses
GRANT SELECT ON public.personal_expenses TO authenticated;

-- Audit Logs
GRANT SELECT ON public.audit_logs TO authenticated;

-- ============================================================================
-- TABLES INTENTIONALLY EXCLUDED
-- ============================================================================
-- The following tables exist but are NOT queried by the application:
-- - public.fuel_stock_snapshots (not used by any application code)
-- - public.fuel_sale_expense_links (not used by any application code)
--
-- If these tables are needed in the future, add GRANT SELECT statements here.

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After applying this migration, verify with:
-- SELECT table_name, has_table_privilege('authenticated', table_name, 'SELECT') as has_select
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_type = 'BASE TABLE'
-- ORDER BY table_name;
--
-- Expected: All application tables should show has_select = true
