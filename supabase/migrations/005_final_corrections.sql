-- Migration: 005_final_corrections
-- Description: Final corrections for accounting accuracy
-- Date: 2026
--
-- CHANGES:
-- 1. Add fuel_stock_adjustments table for proper auditable stock movements
-- 2. Add CHECK constraints for seat booking validation
-- 3. Add fuel_sale_expense_link for internal fuel → trip expense tracking
-- 4. Add comments documenting transaction-safety requirements

-- ============================================================================
-- FUEL STOCK ADJUSTMENTS
-- ============================================================================
--
-- Proper auditable stock movement records.
-- Every adjustment (positive or negative) is tracked separately.
-- Stock calculation:
--   Current Stock = SUM(purchases) - SUM(sales) + SUM(adjustments)

CREATE TABLE public.fuel_stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_date DATE NOT NULL,
    adjustment_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    litres NUMERIC(12, 3) NOT NULL CHECK (litres != 0), -- positive = increase, negative = decrease
    reason TEXT NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('reconciliation', 'leakage', 'theft', 'measurement_error', 'other')),
    reference_id UUID, -- can link to fuel_stock_snapshots.id for reconciliation
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

CREATE INDEX idx_fuel_stock_adjustments_date ON public.fuel_stock_adjustments(adjustment_date);
CREATE INDEX idx_fuel_stock_adjustments_status ON public.fuel_stock_adjustments(status);
CREATE INDEX idx_fuel_stock_adjustments_reference ON public.fuel_stock_adjustments(reference_type, reference_id);

-- ============================================================================
-- FUEL SALE EXPENSE LINK
-- ============================================================================
--
-- Links INTERNAL_BUS fuel sales to their corresponding trip expense.
-- This ensures the fuel cost is recorded exactly once and can be tracked.
--
-- Workflow:
-- 1. Record INTERNAL_BUS fuel sale → creates fuel_sale record
-- 2. System creates (or requires confirmation of) trip_expense with expense_type='diesel'
-- 3. Link is recorded here
-- 4. Prevents forgotten entries, wrong amounts, or duplicates

CREATE TABLE public.fuel_sale_expense_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fuel_sale_id UUID NOT NULL REFERENCES public.fuel_sales(id) ON DELETE CASCADE,
    trip_expense_id UUID NOT NULL REFERENCES public.trip_expenses(id) ON DELETE RESTRICT,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by UUID REFERENCES public.users(id),
    auto_created BOOLEAN NOT NULL DEFAULT false, -- true if system created the expense
    notes TEXT,
    UNIQUE(fuel_sale_id), -- one fuel sale links to one expense
    UNIQUE(trip_expense_id) -- one expense links to one fuel sale
);

CREATE INDEX idx_fuel_sale_expense_links_sale ON public.fuel_sale_expense_links(fuel_sale_id);
CREATE INDEX idx_fuel_sale_expense_links_expense ON public.fuel_sale_expense_links(trip_expense_id);

-- ============================================================================
-- SEAT BOOKING VALIDATION CONSTRAINTS
-- ============================================================================
--
-- For seat_booking entries:
-- - quantity must be > 0
-- - unit_price must be >= 0
-- - amount should equal quantity × unit_price (enforced at application level)
-- - quantity must not exceed bus capacity (enforced at application level)

-- Add explicit CHECK for seat_booking entries
ALTER TABLE public.trip_revenue_entries
ADD CONSTRAINT chk_seat_booking_values CHECK (
    entry_type != 'seat_booking' OR (
        quantity IS NOT NULL AND quantity > 0
        AND unit_price IS NOT NULL AND unit_price >= 0
        AND amount > 0
    )
);

-- ============================================================================
-- TRANSACTION SAFETY COMMENTS
-- ============================================================================
--
-- WEIGHTED AVERAGE COST CALCULATION:
--
-- When recording a fuel sale, the application MUST:
-- 1. Calculate current stock: SUM(purchases) - SUM(sales) + SUM(adjustments)
-- 2. Calculate current stock cost: SUM(purchase costs) - SUM(sale COGS) + adjustment costs
-- 3. Calculate weighted average: current_stock_cost / current_stock
-- 4. Store this as cost_price_per_litre on the fuel_sale
--
-- TRANSACTION SAFETY:
-- The calculation and insert MUST happen in a single transaction with proper locking:
--
-- BEGIN;
--   -- Lock the fuel tables to prevent concurrent modifications
--   SELECT SUM(litres) FROM fuel_purchases WHERE status != 'reversed' FOR UPDATE;
--   SELECT SUM(litres) FROM fuel_sales WHERE status != 'reversed' FOR UPDATE;
--   SELECT SUM(litres) FROM fuel_stock_adjustments WHERE status != 'reversed' FOR UPDATE;
--
--   -- Calculate weighted average cost
--   -- Insert fuel_sale with calculated cost_price_per_litre
-- COMMIT;
--
-- This prevents two concurrent sales from calculating cost from the same stale state.

-- ============================================================================
-- TIMEZONE STANDARDIZATION
-- ============================================================================
--
-- All business reporting uses Asia/Karachi timezone (PKT, UTC+5).
--
-- Date range definitions:
-- - Today: Current date in Asia/Karachi
-- - Yesterday: Today - 1 day
-- - This Week: Monday to Sunday of current week (Asia/Karachi)
-- - This Month: 1st to last day of current month (Asia/Karachi)
-- - Custom: Explicit start_date and end_date
--
-- All date comparisons in queries should use:
--   WHERE trip_date >= :start_date AND trip_date <= :end_date
--
-- Application layer is responsible for converting UTC timestamps to Asia/Karachi dates.

-- ============================================================================
-- INSTALLMENT TREATMENT DOCUMENTATION
-- ============================================================================
--
-- Installments are tracked separately from operating revenue/expenses.
--
-- For 'taken' installments (we borrowed money):
--   - Payments we make are BUSINESS EXPENSES
--   - Included in Overall Expenses
--   - Outstanding balance is a LIABILITY
--
-- For 'given' installments (we lent money):
--   - Payments we receive are LOAN RECOVERIES
--   - NOT included in operating revenue
--   - Outstanding balance is an ASSET
--   - Reported separately in installment reports
--
-- This prevents loan recoveries from inflating operating revenue figures.

-- ============================================================================
-- INTERNAL FUEL WORKFLOW DOCUMENTATION
-- ============================================================================
--
-- When fuel is supplied to a Sadaat bus (INTERNAL_BUS):
--
-- 1. Record fuel sale:
--    - sale_type = 'INTERNAL_BUS'
--    - bus_id = the bus receiving fuel
--    - trip_id = the trip (if known)
--    - litres, sale_price_per_litre, cost_price_per_litre, total_amount
--
-- 2. Create trip expense (auto or manual):
--    - trip_id = the trip
--    - expense_type = 'diesel'
--    - amount = total_amount from fuel sale
--    - description = 'Internal fuel from pump'
--
-- 3. Link them:
--    - Insert into fuel_sale_expense_links
--    - fuel_sale_id = the fuel sale
--    - trip_expense_id = the trip expense
--    - auto_created = true if system created it
--
-- 4. Result:
--    - Fuel stock decreases (fuel left the tank)
--    - Trip expense increases (cost recorded once)
--    - NO pump revenue (internal transfer)
--    - NO consolidated revenue (internal transfer)
--    - Cost appears exactly once in consolidated expenses
--
-- VALIDATION:
-- - Application should prevent duplicate links
-- - Application should warn if fuel sale exists without linked expense
-- - Application should warn if trip expense exists without linked fuel sale (for diesel type)

-- ============================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================================================

ALTER TABLE public.fuel_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_sale_expense_links ENABLE ROW LEVEL SECURITY;

-- Fuel Stock Adjustments
CREATE POLICY "fuel_stock_adjustments_select" ON public.fuel_stock_adjustments
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "fuel_stock_adjustments_insert" ON public.fuel_stock_adjustments
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "fuel_stock_adjustments_update" ON public.fuel_stock_adjustments
    FOR UPDATE USING (public.is_authenticated());

-- Fuel Sale Expense Links
CREATE POLICY "fuel_sale_expense_links_select" ON public.fuel_sale_expense_links
    FOR SELECT USING (public.is_authenticated());
CREATE POLICY "fuel_sale_expense_links_insert" ON public.fuel_sale_expense_links
    FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "fuel_sale_expense_links_update" ON public.fuel_sale_expense_links
    FOR UPDATE USING (public.is_authenticated());
