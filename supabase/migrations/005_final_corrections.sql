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
    cost_per_litre NUMERIC(10, 3) NOT NULL CHECK (cost_per_litre >= 0), -- weighted-average cost at time of adjustment
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

CREATE TRIGGER update_fuel_stock_adjustments_updated_at BEFORE UPDATE ON public.fuel_stock_adjustments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_fuel_stock_adjustments_date ON public.fuel_stock_adjustments(adjustment_date);
CREATE INDEX idx_fuel_stock_adjustments_status ON public.fuel_stock_adjustments(status);
CREATE INDEX idx_fuel_stock_adjustments_reference ON public.fuel_stock_adjustments(reference_type, reference_id);

-- ============================================================================
-- FUEL STOCK ADJUSTMENT VALUATION
-- ============================================================================
--
-- When recording a fuel stock adjustment, the application MUST:
-- 1. Acquire advisory lock: PERFORM pg_advisory_xact_lock(847291);
-- 2. Calculate current weighted average cost per litre (as described above)
-- 3. Store this in the cost_per_litre column
--
-- The cost_per_litre column stores the weighted-average inventory cost at the
-- time the adjustment is posted. This is the authoritative source of truth for
-- adjustment valuation.
--
-- The cost impact is calculated as:
--   adjustment_cost_impact = litres × cost_per_litre
--
-- This is used to update the total inventory cost:
-- - Positive adjustment (stock increase): inventory_cost += litres × cost_per_litre
-- - Negative adjustment (stock decrease): inventory_cost += litres × cost_per_litre
--   (litres is negative, so this reduces inventory_cost)
--
-- This ensures inventory valuation remains consistent with the weighted-average
-- cost method, even when physical stock counts reveal discrepancies.

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
-- INTERNAL FUEL SALE VALIDATION CONSTRAINT
-- ============================================================================
--
-- For INTERNAL_BUS fuel sales, the sale_price_per_litre MUST be 0.
-- This ensures internal transfers are modeled as true internal transfers,
-- not as sales at cost price.
--
-- Internal transfer model:
-- - cost_price_per_litre = actual weighted-average inventory cost
-- - sale_price_per_litre = 0 (no revenue from internal transfer)
-- - total_amount = litres × cost_price_per_litre (cost basis for trip expense)
-- - NO Petrol Pump revenue
-- - NO consolidated revenue
-- - Trip diesel expense = litres × cost_price_per_litre
--
-- External customer model:
-- - sale_price_per_litre = actual customer selling price
-- - cost_price_per_litre = weighted-average inventory cost
-- - total_amount = litres × sale_price_per_litre
-- - Revenue = total_amount
-- - COGS = litres × cost_price_per_litre
--
-- This constraint enforces that internal transfers have zero sale price.

ALTER TABLE public.fuel_sales
ADD CONSTRAINT chk_internal_fuel_zero_price CHECK (
    sale_type != 'INTERNAL_BUS' OR sale_price_per_litre = 0
);

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
-- TRANSACTION SAFETY & WEIGHTED AVERAGE COST
-- ============================================================================
--
-- WEIGHTED AVERAGE COST CALCULATION:
--
-- When recording a fuel sale or stock adjustment, the application MUST:
-- 1. Calculate current stock: SUM(purchases.litres) - SUM(sales.litres) + SUM(adjustments.litres)
--    (all WHERE status != 'reversed')
-- 2. Calculate current stock cost: SUM(purchases.total_cost) - SUM(sales.litres * sales.cost_price_per_litre)
--    + SUM(adjustments.litres * adjustments.cost_per_litre)
--    (all WHERE status != 'reversed')
-- 3. Calculate weighted average cost per litre: current_stock_cost / current_stock
-- 4. Store this as cost_price_per_litre on the fuel_sale or fuel_stock_adjustment
--
-- TRANSACTION SAFETY USING PG_ADVISORY_XACT_LOCK:
--
-- PostgreSQL does not support FOR UPDATE on aggregate queries. Instead, use an advisory lock
-- to serialize all fuel inventory operations (sales, purchases, adjustments).
--
-- CRITICAL IMPLEMENTATION REQUIREMENT:
-- This advisory lock pattern MUST be implemented as a genuinely atomic database transaction
-- or RPC before the Petrol Pump module goes live. Documentation alone does not provide
-- concurrency safety. The implementation must:
-- - Execute within a single database transaction
-- - Acquire the lock before any calculations
-- - Perform all calculations and inserts atomically
-- - Release the lock only on transaction commit/rollback
--
-- The application MUST use the following pattern for ALL fuel inventory operations:
--
-- BEGIN;
--   -- Acquire exclusive advisory lock for fuel inventory operations
--   -- Lock key 847291 is reserved for Sadaat fuel inventory
--   PERFORM pg_advisory_xact_lock(847291);
--
--   -- Now safely calculate current stock and weighted average cost
--   -- (no other fuel operations can proceed until this transaction commits)
--
--   -- Perform the fuel operation (sale, purchase, or adjustment)
--   -- with the calculated cost_price_per_litre
--
-- COMMIT;
--
-- This ensures:
-- - Only one fuel inventory operation runs at a time
-- - Weighted average cost is calculated from consistent state
-- - No race conditions between concurrent sales/purchases/adjustments
-- - Lock is automatically released when transaction commits or rolls back
--
-- IMPORTANT: This lock must be acquired for:
-- - Recording fuel purchases (fuel_purchases INSERT)
-- - Recording fuel sales (fuel_sales INSERT)
-- - Recording stock adjustments (fuel_stock_adjustments INSERT)
-- - Reversing any of the above (status change to 'reversed')

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
-- CRITICAL ACCOUNTING RULE:
-- Internal fuel transfers are TRUE INTERNAL TRANSFERS with zero revenue.
-- The trip diesel expense must equal: litres × cost_price_per_litre
--
-- This models internal transfers correctly: no revenue, only cost movement.
--
-- WORKFLOW:
--
-- 1. Record fuel sale:
--    - sale_type = 'INTERNAL_BUS'
--    - bus_id = the bus receiving fuel
--    - trip_id = the trip (if known)
--    - litres = quantity supplied
--    - cost_price_per_litre = weighted average cost (calculated with advisory lock)
--    - sale_price_per_litre = 0 (MUST be zero for internal transfers)
--    - total_amount = litres × cost_price_per_litre (cost basis for trip expense)
--
-- 2. Create trip expense (auto or manual):
--    - trip_id = the trip
--    - expense_type = 'diesel'
--    - amount = litres × cost_price_per_litre (from fuel sale)
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
--    - Trip expense increases (cost recorded once at actual cost)
--    - NO pump revenue (internal transfer has zero sale price)
--    - NO consolidated revenue (internal transfer)
--    - Cost appears exactly once in consolidated expenses
--
-- APPLICATION VALIDATION (must be enforced):
--
-- For INTERNAL_BUS fuel sales:
-- - sale_price_per_litre MUST equal 0
-- - Application should reject if sale_price_per_litre != 0
-- - This ensures internal transfers are modeled as true internal transfers
--
-- For linked trip expenses:
-- - trip_expense.amount MUST equal fuel_sale.litres × fuel_sale.cost_price_per_litre
-- - Application should validate this when creating the link
-- - Prevents incorrect expense amounts from being recorded
--
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
