-- Migration: 001_initial_schema
-- Description: Create all core tables for Sadaat Travels Management System
-- Date: 2026
--
-- DESIGN PRINCIPLES:
-- 1. Single source of truth for every financial value
-- 2. No summary fields that could conflict with line-item totals
-- 3. All money stored as NUMERIC — never floating point
-- 4. Financial records use record_status for reversals — never hard-delete
-- 5. Internal fuel transfers do not create consolidated revenue/expense

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TYPE record_status AS ENUM ('active', 'reversed', 'cancelled');

CREATE TYPE fuel_sale_type AS ENUM ('EXTERNAL_CUSTOMER', 'INTERNAL_BUS');

CREATE TYPE installment_type AS ENUM ('given', 'taken');

CREATE TYPE installment_asset_type AS ENUM ('bus', 'car', 'property', 'other');

CREATE TYPE audit_action AS ENUM (
    'login', 'logout',
    'create', 'update', 'delete',
    'reverse', 'cancel',
    'permission_change', 'user_change',
    'financial_change'
);

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, role_id)
);

CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES public.users(id),
    UNIQUE(role_id, permission_id)
);

-- ============================================================================
-- BUSES
-- ============================================================================

CREATE TABLE public.buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number TEXT UNIQUE NOT NULL,
    bus_name TEXT,
    bus_type TEXT,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    purchase_date DATE,
    purchase_cost NUMERIC(12, 2) CHECK (purchase_cost IS NULL OR purchase_cost >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold', 'maintenance')),
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TRIPS
-- ============================================================================
--
-- SOURCE OF TRUTH DECISION:
-- The trips table stores ONLY trip metadata (date, route, bus, times).
-- ALL revenue is stored in trip_revenue_entries.
-- ALL expenses are stored in trip_expenses.
-- Trip totals are ALWAYS calculated by summing the line items.
-- There are NO summary revenue/expense columns on the trips table.
-- This eliminates any possibility of conflicting totals.

CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
    trip_date DATE NOT NULL,
    route TEXT NOT NULL,
    departure_time TIME,
    arrival_time TIME,
    status record_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

-- Trip revenue entries — THE SOLE SOURCE OF TRUTH for trip revenue.
--
-- Each entry represents one revenue line item.
-- For seat bookings: entry_type='seat_booking', quantity=N, unit_price=P, amount=N*P
-- For individual payments: entry_type='individual_payment', amount=X
-- For other revenue: entry_type='other', amount=X
--
-- Trip Total Revenue = SUM(amount) WHERE trip_id=X AND status != 'reversed'

CREATE TABLE public.trip_revenue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('seat_booking', 'individual_payment', 'other')),
    description TEXT,
    quantity INTEGER CHECK (quantity IS NULL OR quantity > 0),
    unit_price NUMERIC(10, 2) CHECK (unit_price IS NULL OR unit_price >= 0),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    -- For seat_booking entries, amount should equal quantity * unit_price
    -- This is enforced at the application level, not as a CHECK constraint,
    -- to allow flexibility for discounts/adjustments with audit trail.
    CONSTRAINT chk_seat_booking_has_quantity CHECK (
        entry_type != 'seat_booking' OR (quantity IS NOT NULL AND unit_price IS NOT NULL)
    )
);

-- Trip expenses — THE SOLE SOURCE OF TRUTH for trip expenses.
--
-- Trip Total Expenses = SUM(amount) WHERE trip_id=X AND status != 'reversed'

CREATE TABLE public.trip_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    expense_type TEXT NOT NULL CHECK (expense_type IN (
        'diesel', 'ta', 'tea', 'cleaning', 'police', 'toll_tax',
        'number_money', 'mechanic', 'extra', 'other'
    )),
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    paid_to TEXT,
    receipt_number TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

-- ============================================================================
-- MAINTENANCE & TYRES
-- ============================================================================

CREATE TABLE public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
    maintenance_date DATE NOT NULL,
    maintenance_type TEXT NOT NULL,
    description TEXT NOT NULL,
    cost NUMERIC(12, 2) NOT NULL CHECK (cost >= 0),
    performed_by TEXT,
    next_maintenance_date DATE,
    notes TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

CREATE TABLE public.tyre_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
    purchase_date DATE NOT NULL,
    tyre_brand TEXT,
    tyre_size TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cost_per_tyre NUMERIC(10, 2) NOT NULL CHECK (cost_per_tyre >= 0),
    total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost >= 0),
    supplier TEXT,
    expected_life_km INTEGER,
    notes TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

-- ============================================================================
-- FUEL / PETROL PUMP
-- ============================================================================
--
-- PETROL PUMP MODEL:
--
-- fuel_purchases: Fuel bought INTO the pump. Increases stock.
-- fuel_sales: Fuel sold/issued FROM the pump. Decreases stock.
--
-- Sale types:
--   EXTERNAL_CUSTOMER: Sold to outside customers.
--     → Decreases stock
--     → Counts as Petrol Pump revenue (at sale price)
--     → Counts as consolidated company revenue
--     → COGS contributes to consolidated expenses
--
--   INTERNAL_BUS: Supplied to Sadaat Travels buses.
--     → Decreases stock
--     → Does NOT count as Petrol Pump revenue
--     → Does NOT count as consolidated revenue
--     → The fuel cost is recorded ONCE as the bus's diesel expense
--       via trip_expenses (expense_type='diesel')
--     → This prevents double-counting
--
-- Stock calculation:
--   Current Stock = Latest system_stock from fuel_stock_snapshots
--                   + SUM(fuel_purchases.litres) after that snapshot
--                   - SUM(fuel_sales.litres WHERE status='active') after that snapshot
--
-- Or without snapshots:
--   Current Stock = SUM(fuel_purchases.litres) - SUM(fuel_sales.litres WHERE status='active')

CREATE TABLE public.fuel_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_date DATE NOT NULL,
    supplier TEXT NOT NULL,
    litres NUMERIC(10, 3) NOT NULL CHECK (litres > 0),
    cost_per_litre NUMERIC(10, 3) NOT NULL CHECK (cost_per_litre >= 0),
    total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost >= 0),
    receipt_number TEXT,
    notes TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

CREATE TABLE public.fuel_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_date DATE NOT NULL,
    sale_type fuel_sale_type NOT NULL,
    litres NUMERIC(10, 3) NOT NULL CHECK (litres > 0),
    sale_price_per_litre NUMERIC(10, 3) NOT NULL CHECK (sale_price_per_litre >= 0),
    cost_price_per_litre NUMERIC(10, 3) NOT NULL CHECK (cost_price_per_litre >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    -- For INTERNAL_BUS: bus_id is required
    bus_id UUID REFERENCES public.buses(id) ON DELETE RESTRICT,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    -- For EXTERNAL_CUSTOMER: customer info
    customer_name TEXT,
    customer_phone TEXT,
    receipt_number TEXT,
    notes TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    -- Constraint: INTERNAL_BUS must have bus_id, EXTERNAL_CUSTOMER must not
    CONSTRAINT chk_fuel_sale_bus CHECK (
        (sale_type = 'INTERNAL_BUS' AND bus_id IS NOT NULL) OR
        (sale_type = 'EXTERNAL_CUSTOMER' AND bus_id IS NULL)
    )
);

-- Fuel stock reconciliation snapshots.
--
-- Records periodic physical stock counts and reconciles with system stock.
-- system_stock: What the system calculates (purchases - sales since last snapshot)
-- physical_stock: What was actually measured in the tank
-- variance: physical_stock - system_stock (negative means loss/leakage)
-- adjustment_quantity: Amount added/removed to align system with physical
-- adjustment_reason: Why the adjustment was made
--
-- After reconciliation:
--   New system baseline = physical_stock (or physical_stock + adjustment)

CREATE TABLE public.fuel_stock_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    system_stock NUMERIC(12, 3) NOT NULL CHECK (system_stock >= 0),
    physical_stock NUMERIC(12, 3) NOT NULL CHECK (physical_stock >= 0),
    variance NUMERIC(12, 3) NOT NULL,
    adjustment_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
    adjustment_reason TEXT,
    notes TEXT,
    performed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Only one snapshot per date
    UNIQUE(snapshot_date)
);

-- ============================================================================
-- ADDA
-- ============================================================================

CREATE TABLE public.adda_income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    income_date DATE NOT NULL,
    income_type TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    received_from TEXT,
    receipt_number TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

CREATE TABLE public.adda_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL,
    expense_type TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    paid_to TEXT,
    receipt_number TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

-- ============================================================================
-- CARGO
-- ============================================================================
--
-- SOURCE OF TRUTH:
-- Revenue and expenses are stored separately.
-- Cargo Profit is ALWAYS calculated as: revenue - expenses
-- There is NO separate "profit" column — profit is never manually entered.

CREATE TABLE public.cargo_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_date DATE NOT NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_phone TEXT,
    receiver_name TEXT NOT NULL,
    receiver_phone TEXT,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    description TEXT NOT NULL,
    weight_kg NUMERIC(8, 2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
    quantity INTEGER CHECK (quantity IS NULL OR quantity > 0),
    revenue NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    expenses NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (expenses >= 0),
    status record_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

-- ============================================================================
-- INSTALLMENTS / LOANS
-- ============================================================================
--
-- Supports: bus loans, car loans, property financing, other loans.
-- Can track both money GIVEN (we lent) and money TAKEN (we borrowed).
--
-- Scheduled amount: The expected periodic (usually monthly) payment.
-- Total amount: The original loan amount including any interest/charges.
-- Paid amount: SUM of active installment_payments.
-- Remaining: total_amount - paid_amount.
--
-- linked_bus_id: For bus loans, links to the specific bus being financed.

CREATE TABLE public.installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installment_type installment_type NOT NULL,
    title TEXT NOT NULL, -- e.g., 'Bus ABC Loan', 'Personal Loan from X'
    person_name TEXT NOT NULL, -- lender/borrower name
    person_phone TEXT,
    asset_type installment_asset_type NOT NULL DEFAULT 'other',
    linked_bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    scheduled_amount NUMERIC(12, 2) CHECK (scheduled_amount IS NULL OR scheduled_amount > 0),
    interest_rate NUMERIC(5, 2) CHECK (interest_rate IS NULL OR interest_rate >= 0),
    start_date DATE NOT NULL,
    end_date DATE,
    payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly', 'once')),
    description TEXT,
    status record_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

CREATE TABLE public.installment_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installment_id UUID NOT NULL REFERENCES public.installments(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'other')),
    receipt_number TEXT,
    notes TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

-- ============================================================================
-- PERSONAL EXPENSES
-- ============================================================================
--
-- STRICTLY SEPARATE from business operating expenses.
-- These must NEVER be included in any business expense calculation.

CREATE TABLE public.personal_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid_by TEXT,
    notes TEXT,
    status record_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversed_by UUID REFERENCES public.users(id),
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT
);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON public.buses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trip_revenue_entries_updated_at BEFORE UPDATE ON public.trip_revenue_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trip_expenses_updated_at BEFORE UPDATE ON public.trip_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON public.maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tyre_records_updated_at BEFORE UPDATE ON public.tyre_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_purchases_updated_at BEFORE UPDATE ON public.fuel_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fuel_sales_updated_at BEFORE UPDATE ON public.fuel_sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_adda_income_updated_at BEFORE UPDATE ON public.adda_income
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_adda_expenses_updated_at BEFORE UPDATE ON public.adda_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cargo_records_updated_at BEFORE UPDATE ON public.cargo_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON public.installments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_installment_payments_updated_at BEFORE UPDATE ON public.installment_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personal_expenses_updated_at BEFORE UPDATE ON public.personal_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
