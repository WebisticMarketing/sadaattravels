-- Migration: 008_role_gated_rls
-- Description: Update RLS policies to require OWNER or MANAGER role for business data access
-- Date: 2026-01-15
--
-- PURPOSE:
-- Replace authentication-only RLS policies with role-based policies.
-- An authenticated Supabase user without an OWNER/MANAGER role will have NO business data access.
--
-- SECURITY MODEL:
-- - OWNER = full access to all business tables
-- - MANAGER = full access to all business tables
-- - Authenticated user without OWNER/MANAGER role = NO business data access
-- - Bootstrap function (Migration 007) uses SECURITY DEFINER and is unaffected

-- ============================================================================
-- UPDATE BUSINESS TABLE POLICIES
-- ============================================================================

-- Buses
DROP POLICY IF EXISTS "buses_select" ON public.buses;
DROP POLICY IF EXISTS "buses_insert" ON public.buses;
DROP POLICY IF EXISTS "buses_update" ON public.buses;

CREATE POLICY "buses_select" ON public.buses
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "buses_insert" ON public.buses
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "buses_update" ON public.buses
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Trips
DROP POLICY IF EXISTS "trips_select" ON public.trips;
DROP POLICY IF EXISTS "trips_insert" ON public.trips;
DROP POLICY IF EXISTS "trips_update" ON public.trips;

CREATE POLICY "trips_select" ON public.trips
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "trips_insert" ON public.trips
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "trips_update" ON public.trips
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Trip Revenue Entries
DROP POLICY IF EXISTS "trip_revenue_entries_select" ON public.trip_revenue_entries;
DROP POLICY IF EXISTS "trip_revenue_entries_insert" ON public.trip_revenue_entries;
DROP POLICY IF EXISTS "trip_revenue_entries_update" ON public.trip_revenue_entries;

CREATE POLICY "trip_revenue_entries_select" ON public.trip_revenue_entries
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "trip_revenue_entries_insert" ON public.trip_revenue_entries
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "trip_revenue_entries_update" ON public.trip_revenue_entries
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Trip Expenses
DROP POLICY IF EXISTS "trip_expenses_select" ON public.trip_expenses;
DROP POLICY IF EXISTS "trip_expenses_insert" ON public.trip_expenses;
DROP POLICY IF EXISTS "trip_expenses_update" ON public.trip_expenses;

CREATE POLICY "trip_expenses_select" ON public.trip_expenses
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "trip_expenses_insert" ON public.trip_expenses
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "trip_expenses_update" ON public.trip_expenses
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Maintenance Records
DROP POLICY IF EXISTS "maintenance_records_select" ON public.maintenance_records;
DROP POLICY IF EXISTS "maintenance_records_insert" ON public.maintenance_records;
DROP POLICY IF EXISTS "maintenance_records_update" ON public.maintenance_records;

CREATE POLICY "maintenance_records_select" ON public.maintenance_records
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "maintenance_records_insert" ON public.maintenance_records
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "maintenance_records_update" ON public.maintenance_records
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Tyre Records
DROP POLICY IF EXISTS "tyre_records_select" ON public.tyre_records;
DROP POLICY IF EXISTS "tyre_records_insert" ON public.tyre_records;
DROP POLICY IF EXISTS "tyre_records_update" ON public.tyre_records;

CREATE POLICY "tyre_records_select" ON public.tyre_records
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "tyre_records_insert" ON public.tyre_records
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "tyre_records_update" ON public.tyre_records
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Fuel Purchases
DROP POLICY IF EXISTS "fuel_purchases_select" ON public.fuel_purchases;
DROP POLICY IF EXISTS "fuel_purchases_insert" ON public.fuel_purchases;
DROP POLICY IF EXISTS "fuel_purchases_update" ON public.fuel_purchases;

CREATE POLICY "fuel_purchases_select" ON public.fuel_purchases
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_purchases_insert" ON public.fuel_purchases
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_purchases_update" ON public.fuel_purchases
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Fuel Sales
DROP POLICY IF EXISTS "fuel_sales_select" ON public.fuel_sales;
DROP POLICY IF EXISTS "fuel_sales_insert" ON public.fuel_sales;
DROP POLICY IF EXISTS "fuel_sales_update" ON public.fuel_sales;

CREATE POLICY "fuel_sales_select" ON public.fuel_sales
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_sales_insert" ON public.fuel_sales
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_sales_update" ON public.fuel_sales
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Fuel Stock Snapshots
DROP POLICY IF EXISTS "fuel_stock_snapshots_select" ON public.fuel_stock_snapshots;
DROP POLICY IF EXISTS "fuel_stock_snapshots_insert" ON public.fuel_stock_snapshots;

CREATE POLICY "fuel_stock_snapshots_select" ON public.fuel_stock_snapshots
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_stock_snapshots_insert" ON public.fuel_stock_snapshots
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Fuel Stock Adjustments
DROP POLICY IF EXISTS "fuel_stock_adjustments_select" ON public.fuel_stock_adjustments;
DROP POLICY IF EXISTS "fuel_stock_adjustments_insert" ON public.fuel_stock_adjustments;
DROP POLICY IF EXISTS "fuel_stock_adjustments_update" ON public.fuel_stock_adjustments;

CREATE POLICY "fuel_stock_adjustments_select" ON public.fuel_stock_adjustments
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_stock_adjustments_insert" ON public.fuel_stock_adjustments
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_stock_adjustments_update" ON public.fuel_stock_adjustments
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Fuel Sale Expense Links
DROP POLICY IF EXISTS "fuel_sale_expense_links_select" ON public.fuel_sale_expense_links;
DROP POLICY IF EXISTS "fuel_sale_expense_links_insert" ON public.fuel_sale_expense_links;
DROP POLICY IF EXISTS "fuel_sale_expense_links_update" ON public.fuel_sale_expense_links;

CREATE POLICY "fuel_sale_expense_links_select" ON public.fuel_sale_expense_links
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_sale_expense_links_insert" ON public.fuel_sale_expense_links
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "fuel_sale_expense_links_update" ON public.fuel_sale_expense_links
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Adda Income
DROP POLICY IF EXISTS "adda_income_select" ON public.adda_income;
DROP POLICY IF EXISTS "adda_income_insert" ON public.adda_income;
DROP POLICY IF EXISTS "adda_income_update" ON public.adda_income;

CREATE POLICY "adda_income_select" ON public.adda_income
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "adda_income_insert" ON public.adda_income
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "adda_income_update" ON public.adda_income
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Adda Expenses
DROP POLICY IF EXISTS "adda_expenses_select" ON public.adda_expenses;
DROP POLICY IF EXISTS "adda_expenses_insert" ON public.adda_expenses;
DROP POLICY IF EXISTS "adda_expenses_update" ON public.adda_expenses;

CREATE POLICY "adda_expenses_select" ON public.adda_expenses
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "adda_expenses_insert" ON public.adda_expenses
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "adda_expenses_update" ON public.adda_expenses
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Cargo Records
DROP POLICY IF EXISTS "cargo_records_select" ON public.cargo_records;
DROP POLICY IF EXISTS "cargo_records_insert" ON public.cargo_records;
DROP POLICY IF EXISTS "cargo_records_update" ON public.cargo_records;

CREATE POLICY "cargo_records_select" ON public.cargo_records
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "cargo_records_insert" ON public.cargo_records
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "cargo_records_update" ON public.cargo_records
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Installments
DROP POLICY IF EXISTS "installments_select" ON public.installments;
DROP POLICY IF EXISTS "installments_insert" ON public.installments;
DROP POLICY IF EXISTS "installments_update" ON public.installments;

CREATE POLICY "installments_select" ON public.installments
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "installments_insert" ON public.installments
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "installments_update" ON public.installments
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- Installment Payments
DROP POLICY IF EXISTS "installment_payments_select" ON public.installment_payments;
DROP POLICY IF EXISTS "installment_payments_insert" ON public.installment_payments;
DROP POLICY IF EXISTS "installment_payments_update" ON public.installment_payments;

CREATE POLICY "installment_payments_select" ON public.installment_payments
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "installment_payments_insert" ON public.installment_payments
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "installment_payments_update" ON public.installment_payments
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- ============================================================================
-- AUDIT LOGS - Restrict to OWNER/MANAGER
-- ============================================================================

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- ============================================================================
-- ROLES/PERMISSIONS METADATA - Keep accessible for role resolution
-- ============================================================================

-- Keep roles and permissions readable by authenticated users
-- This is necessary for the application to resolve user roles
-- However, reading metadata alone does NOT grant business data access

-- roles_select and permissions_select remain unchanged (is_authenticated)
-- user_roles_select remains unchanged (allows users to see their own roles)
-- role_permissions_select remains unchanged (allows reading permission metadata)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After applying this migration, verify:

-- 1. Test with authenticated user WITHOUT OWNER/MANAGER role:
--    SELECT * FROM public.buses; -- Should return 0 rows or error

-- 2. Test with OWNER role:
--    SELECT * FROM public.buses; -- Should return data

-- 3. Test with MANAGER role:
--    SELECT * FROM public.buses; -- Should return data

-- 4. Verify bootstrap function still works:
--    The bootstrap_first_owner function uses SECURITY DEFINER and is unaffected
--    by these RLS changes.
