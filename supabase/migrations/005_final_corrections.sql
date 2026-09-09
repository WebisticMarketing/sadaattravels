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
-- 3. Store this as the valuation basis for the adjustment
--
-- Although fuel_stock_adjustments does not have a cost_per_litre column,
-- the application layer MUST track the cost basis used for each adjustment.
-- This can be done by:
-- - Storing the cost basis in the adjustment's 'notes' field (JSON format)
-- - Or maintaining a separate application-level ledger
--
-- The cost basis is used to update the total inventory cost:
-- - Positive adjustment (stock increase): inventory_cost += litres × cost_per_litre
-- - Negative adjustment (stock decrease): inventory_cost += litres × cost_per_litre
--   (litres is negative, so this reduces inventory_cost)
--
-- This ensures inventory valuation remains consistent with the weighted-average
-- cost method, even when physical stock counts reveal discrepancies.
--
-- Example notes field format:
-- {"cost_per_litre": 285.50, "total_cost_impact": 2855.00}

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
-- For INTERNAL_BUS fuel sales, the sale_price_per_litre MUST equal cost_price_per_litre.
-- This prevents accidental use of external customer pricing for internal transfers.
--
-- The trip diesel expense is calculated as: litres × cost_price_per_litre
-- NOT: litres × sale_price_per_litre
--
-- This constraint enforces that internal transfers use cost basis only.

ALTER TABLE public.fuel_sales
ADD CONSTRAINT chk_internal_fuel_uses_cost CHECK (
    sale_type != 'INTERNAL_BUS' OR sale_price_per_litre = cost_price_per_litre
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
--    + SUM(adjustments.litres * adjustment_cost_per_litre)
--    (all WHERE status != 'reversed')
-- 3. Calculate weighted average cost per litre: current_stock_cost / current_stock
-- 4. Store this as cost_price_per_litre on the fuel_sale or fuel_stock_adjustment
--
-- TRANSACTION SAFETY USING PG_ADVISORY_XACT_LOCK:
--
-- PostgreSQL does not support FOR UPDATE on aggregate queries. Instead, use an advisory lock
-- to serialize all fuel inventory operations (sales, purchases, adjustments).
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
-- Internal fuel transfers use COST BASIS, not selling price.
-- The trip diesel expense must equal: litres × cost_price_per_litre
-- NOT: litres × sale_price_per_litre
--
-- This prevents inflating trip expenses with external customer pricing.
--
-- WORKFLOW:
--
-- 1. Record fuel sale:
--    - sale_type = 'INTERNAL_BUS'
--    - bus_id = the bus receiving fuel
--    - trip_id = the trip (if known)
--    - litres = quantity supplied
--    - cost_price_per_litre = weighted average cost (calculated with advisory lock)
--    - sale_price_per_litre = cost_price_per_litre (MUST equal cost for internal)
--    - total_amount = litres × cost_price_per_litre
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
--    - NO pump revenue (internal transfer)
--    - NO consolidated revenue (internal transfer)
--    - Cost appears exactly once in consolidated expenses
--
-- APPLICATION VALIDATION (must be enforced):
--
-- For INTERNAL_BUS fuel sales:
-- - sale_price_per_litre MUST equal cost_price_per_litre
-- - Application should reject if sale_price_per_litre != cost_price_per_litre
-- - This prevents accidental use of external pricing for internal transfers
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
