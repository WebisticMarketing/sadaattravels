-- Migration: 001_initial_schema
-- Description: Create all core tables for Sadaat Travels Management System
-- Date: 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE record_status AS ENUM ('active', 'reversed', 'cancelled');
CREATE TYPE fuel_sale_type AS ENUM ('EXTERNAL_CUSTOMER', 'INTERNAL_BUS');
CREATE TYPE installment_type AS ENUM ('given', 'taken');
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

-- Users table (extends Supabase auth.users)
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

-- Roles table
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL, -- e.g., 'buses', 'trips', 'fuel', 'reports'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-Role mapping (many-to-many)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    UNIQUE(user_id, role_id)
);

-- Role-Permission mapping (many-to-many)
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
    bus_type TEXT, -- e.g., 'AC', 'Non-AC', 'Sleeper'
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    purchase_date DATE,
    purchase_cost NUMERIC(12, 2),
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

CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
    trip_date DATE NOT NULL,
    route TEXT NOT NULL, -- e.g., 'Lahore to Karachi'
    departure_time TIME,
    arrival_time TIME,
    seats_booked INTEGER NOT NULL DEFAULT 0 CHECK (seats_booked >= 0),
    price_per_seat NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price_per_seat >= 0),
    individual_payments NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (individual_payments >= 0),
    other_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (other_revenue >= 0),
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

-- Trip revenue line items (detailed breakdown)
CREATE TABLE public.trip_revenue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('seat_booking', 'individual_payment', 'other')),
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    quantity INTEGER CHECK (quantity > 0), -- for seat bookings
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trip expense line items
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
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MAINTENANCE & TYRES
-- ============================================================================

CREATE TABLE public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
    maintenance_date DATE NOT NULL,
    maintenance_type TEXT NOT NULL, -- e.g., 'engine', 'brakes', 'electrical', 'body'
    description TEXT NOT NULL,
    cost NUMERIC(12, 2) NOT NULL CHECK (cost >= 0),
    performed_by TEXT, -- mechanic/shop name
    next_maintenance_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FUEL / PETROL PUMP
-- ============================================================================

-- Fuel purchases (fuel bought INTO the pump)
CREATE TABLE public.fuel_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_date DATE NOT NULL,
    supplier TEXT NOT NULL,
    litres NUMERIC(10, 3) NOT NULL CHECK (litres > 0),
    cost_per_litre NUMERIC(10, 3) NOT NULL CHECK (cost_per_litre >= 0),
    total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost >= 0),
    receipt_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fuel sales (fuel sold/issued FROM the pump)
CREATE TABLE public.fuel_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_date DATE NOT NULL,
    sale_type fuel_sale_type NOT NULL,
    litres NUMERIC(10, 3) NOT NULL CHECK (litres > 0),
    sale_price_per_litre NUMERIC(10, 3) NOT NULL CHECK (sale_price_per_litre >= 0),
    cost_price_per_litre NUMERIC(10, 3) NOT NULL CHECK (cost_price_per_litre >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    -- For INTERNAL_BUS sales
    bus_id UUID REFERENCES public.buses(id) ON DELETE RESTRICT,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    -- For EXTERNAL_CUSTOMER sales
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
    -- Constraints
    CONSTRAINT chk_internal_bus_requires_bus CHECK (
        (sale_type = 'INTERNAL_BUS' AND bus_id IS NOT NULL) OR
        (sale_type = 'EXTERNAL_CUSTOMER' AND bus_id IS NULL)
    )
);

-- Fuel stock tracking (opening stock per period)
CREATE TABLE public.fuel_stock_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL UNIQUE,
    opening_stock NUMERIC(12, 3) NOT NULL CHECK (opening_stock >= 0),
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ADDA
-- ============================================================================

CREATE TABLE public.adda_income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    income_date DATE NOT NULL,
    income_type TEXT NOT NULL, -- e.g., 'ticket_commission', 'parking', 'loading', 'other'
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
    expense_type TEXT NOT NULL, -- e.g., 'staff_salary', 'utilities', 'maintenance', 'other'
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
    weight_kg NUMERIC(8, 2),
    quantity INTEGER,
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

CREATE TABLE public.installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installment_type installment_type NOT NULL, -- 'given' (we lent) or 'taken' (we borrowed)
    person_name TEXT NOT NULL,
    person_phone TEXT,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    start_date DATE NOT NULL,
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
    payment_method TEXT, -- 'cash', 'bank_transfer', 'cheque'
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

CREATE TABLE public.personal_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_date DATE NOT NULL,
    category TEXT NOT NULL, -- e.g., 'household', 'vehicle', 'medical', 'education', 'other'
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
    metadata JSONB,
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

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON public.buses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
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
