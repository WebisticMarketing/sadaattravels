-- Migration: 003_rls_policies
-- Description: Row Level Security policies for Sadaat Travels Management System
-- Date: 2026
--
-- IMPORTANT: RLS ensures that all data access is controlled server-side.
-- The frontend uses the anon key; all security is enforced by PostgreSQL.
-- Fine-grained permission checks will be implemented via Supabase Edge Functions
-- and database functions in a later phase.
--
-- For now, we enable RLS on all tables and create baseline policies that
-- allow authenticated users to access data. Granular permission-based
-- policies will be added as the permission system is built out.

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tyre_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_stock_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adda_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adda_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BASELINE POLICIES: Authenticated users can read/write all business data
-- ============================================================================
-- NOTE: These are TEMPORARY baseline policies. They will be replaced with
-- fine-grained permission-based policies once the permission system is
-- fully implemented via database functions.

-- Helper function: check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
    SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: get current user's role names
CREATE OR REPLACE FUNCTION public.get_user_roles()
RETURNS TEXT[] AS $$
    SELECT ARRAY_AGG(r.name)
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() AND r.name = role_name
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.permissions p ON p.id = rp.permission_id
        JOIN public.user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = auth.uid() AND p.code = permission_code
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Users can read their own record; owners/managers can read all
CREATE POLICY "users_select" ON public.users
    FOR SELECT USING (
        id = auth.uid() OR public.has_role('OWNER') OR public.has_role('MANAGER')
    );

-- Users can update their own record; owners can update any
CREATE POLICY "users_update" ON public.users
    FOR UPDATE USING (
        id = auth.uid() OR public.has_role('OWNER')
    );

-- Only owners can insert/delete users
CREATE POLICY "users_insert" ON public.users
    FOR INSERT WITH CHECK (public.has_role('OWNER'));

CREATE POLICY "users_delete" ON public.users
    FOR DELETE USING (public.has_role('OWNER'));

-- ============================================================================
-- ROLES & PERMISSIONS (read-only for all authenticated users)
-- ============================================================================

CREATE POLICY "roles_select" ON public.roles
    FOR SELECT USING (public.is_authenticated());

CREATE POLICY "permissions_select" ON public.permissions
    FOR SELECT USING (public.is_authenticated());

CREATE POLICY "user_roles_select" ON public.user_roles
    FOR SELECT USING (
        user_id = auth.uid() OR public.has_role('OWNER') OR public.has_role('MANAGER')
    );

CREATE POLICY "role_permissions_select" ON public.role_permissions
    FOR SELECT USING (public.is_authenticated());

-- Only owners can manage role assignments and permissions
CREATE POLICY "user_roles_manage" ON public.user_roles
    FOR ALL USING (public.has_role('OWNER'));

CREATE POLICY "role_permissions_manage" ON public.role_permissions
    FOR ALL USING (public.has_role('OWNER'));

-- ============================================================================
-- BUSINESS DATA TABLES
-- ============================================================================
-- All authenticated users can read business data.
-- Write access will be controlled by permission checks in later phases.

-- Buses
CREATE POLICY "buses_select" ON public.buses
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "buses_insert" ON public.buses
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "buses_update" ON public.buses
    FOR UPDATE USING (public.is_authenticated());

-- Trips
CREATE POLICY "trips_select" ON public.trips
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "trips_insert" ON public.trips
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "trips_update" ON public.trips
    FOR UPDATE USING (public.is_authenticated());

-- Trip Revenue Entries
CREATE POLICY "trip_revenue_entries_select" ON public.trip_revenue_entries
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "trip_revenue_entries_insert" ON public.trip_revenue_entries
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "trip_revenue_entries_update" ON public.trip_revenue_entries
    FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "trip_revenue_entries_delete" ON public.trip_revenue_entries
    FOR DELETE USING (public.is_authenticated());

-- Trip Expenses
CREATE POLICY "trip_expenses_select" ON public.trip_expenses
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "trip_expenses_insert" ON public.trip_expenses
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "trip_expenses_update" ON public.trip_expenses
    FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "trip_expenses_delete" ON public.trip_expenses
    FOR DELETE USING (public.is_authenticated());

-- Maintenance Records
CREATE POLICY "maintenance_records_select" ON public.maintenance_records
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "maintenance_records_insert" ON public.maintenance_records
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "maintenance_records_update" ON public.maintenance_records
    FOR UPDATE USING (public.is_authenticated());

-- Tyre Records
CREATE POLICY "tyre_records_select" ON public.tyre_records
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "tyre_records_insert" ON public.tyre_records
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "tyre_records_update" ON public.tyre_records
    FOR UPDATE USING (public.is_authenticated());

-- Fuel Purchases
CREATE POLICY "fuel_purchases_select" ON public.fuel_purchases
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "fuel_purchases_insert" ON public.fuel_purchases
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "fuel_purchases_update" ON public.fuel_purchases
    FOR UPDATE USING (public.is_authenticated());

-- Fuel Sales
CREATE POLICY "fuel_sales_select" ON public.fuel_sales
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "fuel_sales_insert" ON public.fuel_sales
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "fuel_sales_update" ON public.fuel_sales
    FOR UPDATE USING (public.is_authenticated());

-- Fuel Stock Snapshots
CREATE POLICY "fuel_stock_snapshots_select" ON public.fuel_stock_snapshots
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "fuel_stock_snapshots_insert" ON public.fuel_stock_snapshots
    FOR INSERT WITH CHECK (public.is_authenticated());

-- Adda Income
CREATE POLICY "adda_income_select" ON public.adda_income
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "adda_income_insert" ON public.adda_income
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "adda_income_update" ON public.adda_income
    FOR UPDATE USING (public.is_authenticated());

-- Adda Expenses
CREATE POLICY "adda_expenses_select" ON public.adda_expenses
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "adda_expenses_insert" ON public.adda_expenses
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "adda_expenses_update" ON public.adda_expenses
    FOR UPDATE USING (public.is_authenticated());

-- Cargo Records
CREATE POLICY "cargo_records_select" ON public.cargo_records
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "cargo_records_insert" ON public.cargo_records
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "cargo_records_update" ON public.cargo_records
    FOR UPDATE USING (public.is_authenticated());

-- Installments
CREATE POLICY "installments_select" ON public.installments
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "installments_insert" ON public.installments
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "installments_update" ON public.installments
    FOR UPDATE USING (public.is_authenticated());

-- Installment Payments
CREATE POLICY "installment_payments_select" ON public.installment_payments
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "installment_payments_insert" ON public.installment_payments
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "installment_payments_update" ON public.installment_payments
    FOR UPDATE USING (public.is_authenticated());

-- Personal Expenses
CREATE POLICY "personal_expenses_select" ON public.personal_expenses
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "personal_expenses_insert" ON public.personal_expenses
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "personal_expenses_update" ON public.personal_expenses
    FOR UPDATE USING (public.is_authenticated());

-- Audit Logs (read-only for all authenticated users)
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT USING (public.is_authenticated());
