-- Migration: 012_grant_authenticated_insert_update_delete
-- Description: Grant INSERT, UPDATE, DELETE privileges to authenticated role for application tables
-- Date: 2026-01-15
--
-- PURPOSE:
-- The application requires INSERT, UPDATE, and DELETE privileges on business tables for authenticated users.
-- Migration 011 only granted SELECT privileges.
-- RLS policies control which rows can be modified, but table-level privileges are required first.
--
-- IMPORTANT:
-- - This does NOT weaken RLS policies (they remain enforced)
-- - This does NOT affect auth.* tables (managed by Supabase)
-- - RLS policies ensure only OWNER/MANAGER can modify business data
-- - This grants the base table privileges needed for the application to function

-- ============================================================================
-- GRANT INSERT, UPDATE, DELETE ON BUSINESS TABLES
-- ============================================================================

-- Fleet Management
GRANT INSERT, UPDATE, DELETE ON public.buses TO authenticated;

-- Trip Management
GRANT INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trip_revenue_entries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trip_expenses TO authenticated;

-- Maintenance & Tyres
GRANT INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tyre_records TO authenticated;

-- Fuel Management
GRANT INSERT, UPDATE, DELETE ON public.fuel_purchases TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fuel_sales TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fuel_stock_adjustments TO authenticated;

-- Adda Operations
GRANT INSERT, UPDATE, DELETE ON public.adda_income TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.adda_expenses TO authenticated;

-- Cargo Operations
GRANT INSERT, UPDATE, DELETE ON public.cargo_records TO authenticated;

-- Installments
GRANT INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.installment_payments TO authenticated;

-- Personal Expenses
GRANT INSERT, UPDATE, DELETE ON public.personal_expenses TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After applying this migration, verify with:
-- SELECT table_name, 
--        has_table_privilege('authenticated', table_name, 'INSERT') as has_insert,
--        has_table_privilege('authenticated', table_name, 'UPDATE') as has_update,
--        has_table_privilege('authenticated', table_name, 'DELETE') as has_delete
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_type = 'BASE TABLE'
-- AND table_name NOT LIKE 'fuel_stock_snapshots'
-- AND table_name NOT LIKE 'fuel_sale_expense_links'
-- ORDER BY table_name;
--
-- Expected: All application tables should show has_insert, has_update, has_delete = true
