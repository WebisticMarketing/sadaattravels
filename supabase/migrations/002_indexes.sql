-- Migration: 002_indexes
-- Description: Performance indexes for Sadaat Travels Management System
-- Date: 2026

-- ============================================================================
-- USERS & AUTH
-- ============================================================================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX idx_permissions_module ON public.permissions(module);

-- ============================================================================
-- BUSES
-- ============================================================================

CREATE INDEX idx_buses_registration ON public.buses(registration_number);
CREATE INDEX idx_buses_status ON public.buses(status);

-- ============================================================================
-- TRIPS
-- ============================================================================

CREATE INDEX idx_trips_bus_id ON public.trips(bus_id);
CREATE INDEX idx_trips_date ON public.trips(trip_date);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_bus_date ON public.trips(bus_id, trip_date);
CREATE INDEX idx_trip_revenue_entries_trip_id ON public.trip_revenue_entries(trip_id);
CREATE INDEX idx_trip_expenses_trip_id ON public.trip_expenses(trip_id);
CREATE INDEX idx_trip_expenses_type ON public.trip_expenses(expense_type);

-- ============================================================================
-- MAINTENANCE & TYRES
-- ============================================================================

CREATE INDEX idx_maintenance_records_bus_id ON public.maintenance_records(bus_id);
CREATE INDEX idx_maintenance_records_date ON public.maintenance_records(maintenance_date);
CREATE INDEX idx_tyre_records_bus_id ON public.tyre_records(bus_id);
CREATE INDEX idx_tyre_records_date ON public.tyre_records(purchase_date);

-- ============================================================================
-- FUEL / PETROL PUMP
-- ============================================================================

CREATE INDEX idx_fuel_purchases_date ON public.fuel_purchases(purchase_date);
CREATE INDEX idx_fuel_sales_date ON public.fuel_sales(sale_date);
CREATE INDEX idx_fuel_sales_type ON public.fuel_sales(sale_type);
CREATE INDEX idx_fuel_sales_bus_id ON public.fuel_sales(bus_id);
CREATE INDEX idx_fuel_sales_trip_id ON public.fuel_sales(trip_id);
CREATE INDEX idx_fuel_sales_status ON public.fuel_sales(status);
CREATE INDEX idx_fuel_stock_snapshots_date ON public.fuel_stock_snapshots(snapshot_date);

-- ============================================================================
-- ADDA
-- ============================================================================

CREATE INDEX idx_adda_income_date ON public.adda_income(income_date);
CREATE INDEX idx_adda_income_type ON public.adda_income(income_type);
CREATE INDEX idx_adda_income_status ON public.adda_income(status);
CREATE INDEX idx_adda_expenses_date ON public.adda_expenses(expense_date);
CREATE INDEX idx_adda_expenses_type ON public.adda_expenses(expense_type);
CREATE INDEX idx_adda_expenses_status ON public.adda_expenses(status);

-- ============================================================================
-- CARGO
-- ============================================================================

CREATE INDEX idx_cargo_records_date ON public.cargo_records(shipment_date);
CREATE INDEX idx_cargo_records_bus_id ON public.cargo_records(bus_id);
CREATE INDEX idx_cargo_records_status ON public.cargo_records(status);

-- ============================================================================
-- INSTALLMENTS
-- ============================================================================

CREATE INDEX idx_installments_type ON public.installments(installment_type);
CREATE INDEX idx_installments_status ON public.installments(status);
CREATE INDEX idx_installment_payments_installment_id ON public.installment_payments(installment_id);
CREATE INDEX idx_installment_payments_date ON public.installment_payments(payment_date);
CREATE INDEX idx_installment_payments_status ON public.installment_payments(status);

-- ============================================================================
-- PERSONAL EXPENSES
-- ============================================================================

CREATE INDEX idx_personal_expenses_date ON public.personal_expenses(expense_date);
CREATE INDEX idx_personal_expenses_category ON public.personal_expenses(category);
CREATE INDEX idx_personal_expenses_status ON public.personal_expenses(status);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_created ON public.audit_logs(user_id, created_at);
