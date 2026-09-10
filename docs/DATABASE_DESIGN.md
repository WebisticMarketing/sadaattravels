# Sadaat Travels Management System - Database Design

## Overview

This document describes the complete database schema for Sadaat Travels, a bus transportation business management system. The database is designed for PostgreSQL on Supabase with Row Level Security (RLS) enabled.

**Key Design Principles:**
- Single source of truth for all financial data
- No duplicate or conflicting calculations
- Complete audit trail for all transactions
- Timezone-aware date handling (Asia/Karachi)
- Transaction-safe financial calculations

---

## Schema Overview

### Core Tables (21 tables)

**Users & Authentication:**
- `users` - User accounts (extends Supabase auth.users)
- `roles` - System roles (OWNER, MANAGER, STAFF)
- `permissions` - Granular permissions (48 total)
- `user_roles` - User-to-role assignments
- `role_permissions` - Role-to-permission mappings

**Fleet Management:**
- `buses` - Bus fleet information
- `maintenance_records` - Bus maintenance history
- `tyre_records` - Tyre purchase and replacement tracking

**Trip Operations:**
- `trips` - Trip metadata (date, route, bus)
- `trip_revenue_entries` - Revenue line items (sole source of truth)
- `trip_expenses` - Expense line items (sole source of truth)

**Fuel Management:**
- `fuel_purchases` - Fuel bought into pump
- `fuel_sales` - Fuel sold/issued from pump
- `fuel_stock_snapshots` - Physical stock reconciliation records
- `fuel_stock_adjustments` - Auditable stock movements
- `fuel_sale_expense_links` - Links internal fuel sales to trip expenses

**Other Operations:**
- `adda_income` - Adda (terminal) income entries
- `adda_expenses` - Adda expense entries
- `cargo_records` - Cargo shipment records
- `installments` - Loans given/taken
- `installment_payments` - Installment payment records
- `personal_expenses` - Owner's personal expenses (separate from business)
- `audit_logs` - System-wide audit trail

---

## Timezone & Date Handling

### Standard Timezone: Asia/Karachi (PKT, UTC+5)

All business reporting uses Asia/Karachi timezone. The application layer is responsible for converting UTC timestamps to Pakistan Standard Time for display and reporting.

### Date Range Definitions

| Range | Definition | Example |
|-------|-----------|---------|
| **Today** | Current date in Asia/Karachi | 2026-01-15 |
| **Yesterday** | Today - 1 day | 2026-01-14 |
| **This Week** | Monday to Sunday of current week (Asia/Karachi) | 2026-01-12 to 2026-01-18 |
| **Last Week** | Previous Monday to Sunday | 2026-01-05 to 2026-01-11 |
| **This Month** | 1st to last day of current month (Asia/Karachi) | 2026-01-01 to 2026-01-31 |
| **Last Month** | 1st to last day of previous month | 2025-12-01 to 2025-12-31 |
| **This Year** | Jan 1 to Dec 31 of current year | 2026-01-01 to 2026-12-31 |
| **Custom** | Explicit start_date and end_date | User-specified range |

### Query Pattern

```sql
-- All date comparisons use:
WHERE record_date >= :start_date AND record_date <= :end_date

-- Application converts user's local date to Asia/Karachi date before querying
-- Example: User in Karachi selects "Today" → start_date = end_date = 2026-01-15
```

---

## Financial Model

### Trip Calculations

**Trip Revenue** (sole source of truth: `trip_revenue_entries`)
```sql
SELECT SUM(amount) 
FROM trip_revenue_entries 
WHERE trip_id = :trip_id 
  AND status != 'reversed'
```

**Trip Expenses** (sole source of truth: `trip_expenses`)
```sql
SELECT SUM(amount) 
FROM trip_expenses 
WHERE trip_id = :trip_id 
  AND status != 'reversed'
```

**Trip Profit**
```
Trip Profit = Trip Revenue - Trip Expenses
```

### Bus Calculations

**Bus Revenue** (aggregated from trips)
```sql
SELECT COALESCE(SUM(revenue), 0)
FROM (
  SELECT SUM(tre.amount) as revenue
  FROM trips t
  JOIN trip_revenue_entries tre ON tre.trip_id = t.id
  WHERE t.bus_id = :bus_id
    AND t.status != 'reversed'
    AND tre.status != 'reversed'
    AND t.trip_date BETWEEN :start_date AND :end_date
  GROUP BY t.id
) trip_revenues
```

**Bus Trip Expenses** (aggregated from trips)
```sql
SELECT COALESCE(SUM(expenses), 0)
FROM (
  SELECT SUM(te.amount) as expenses
  FROM trips t
  JOIN trip_expenses te ON te.trip_id = t.id
  WHERE t.bus_id = :bus_id
    AND t.status != 'reversed'
    AND te.status != 'reversed'
    AND t.trip_date BETWEEN :start_date AND :end_date
  GROUP BY t.id
) trip_expenses
```

**Bus Gross Profit**
```
Bus Gross Profit = Bus Revenue - Bus Trip Expenses
```

**Bus Maintenance Cost**
```sql
SELECT COALESCE(SUM(cost), 0)
FROM maintenance_records
WHERE bus_id = :bus_id
  AND status != 'reversed'
  AND maintenance_date BETWEEN :start_date AND :end_date
```

**Bus Tyre Cost**
```sql
SELECT COALESCE(SUM(total_cost), 0)
FROM tyre_records
WHERE bus_id = :bus_id
  AND status != 'reversed'
  AND purchase_date BETWEEN :start_date AND :end_date
```

**Bus Net Profit**
```
Bus Net Profit = Bus Gross Profit - Bus Maintenance Cost - Bus Tyre Cost
```

### Adda Calculations

**Adda Revenue**
```sql
SELECT COALESCE(SUM(amount), 0)
FROM adda_income
WHERE status != 'reversed'
  AND income_date BETWEEN :start_date AND :end_date
```

**Adda Expenses**
```sql
SELECT COALESCE(SUM(amount), 0)
FROM adda_expenses
WHERE status != 'reversed'
  AND expense_date BETWEEN :start_date AND :end_date
```

**Adda Profit**
```
Adda Profit = Adda Revenue - Adda Expenses
```

### Fuel Pump Calculations

**Fuel Stock** (current stock in litres)
```sql
SELECT 
  COALESCE(SUM(CASE WHEN status != 'reversed' THEN litres ELSE 0 END), 0) as purchases
FROM fuel_purchases
WHERE purchase_date <= :as_of_date

MINUS

SELECT 
  COALESCE(SUM(CASE WHEN status != 'reversed' THEN litres ELSE 0 END), 0) as sales
FROM fuel_sales
WHERE sale_date <= :as_of_date

PLUS

SELECT 
  COALESCE(SUM(CASE WHEN status != 'reversed' THEN litres ELSE 0 END), 0) as adjustments
FROM fuel_stock_adjustments
WHERE adjustment_date <= :as_of_date
```

**Pump Revenue** (external customers only)
```sql
SELECT COALESCE(SUM(total_amount), 0)
FROM fuel_sales
WHERE sale_type = 'EXTERNAL_CUSTOMER'
  AND status != 'reversed'
  AND sale_date BETWEEN :start_date AND :end_date
```

**Pump COGS** (external customers only)
```sql
SELECT COALESCE(SUM(litres * cost_price_per_litre), 0)
FROM fuel_sales
WHERE sale_type = 'EXTERNAL_CUSTOMER'
  AND status != 'reversed'
  AND sale_date BETWEEN :start_date AND :end_date
```

**Pump Profit**
```
Pump Profit = Pump Revenue - Pump COGS
```

**Weighted Average Cost Calculation**

When recording a fuel sale, the application MUST calculate the weighted average cost at that moment:

```sql
-- Calculate current stock and total cost
SELECT 
  COALESCE(SUM(litres), 0) as current_stock,
  COALESCE(SUM(litres * cost_per_litre), 0) as total_cost
FROM (
  -- Purchases add to stock
  SELECT litres, cost_per_litre FROM fuel_purchases WHERE status != 'reversed'
  UNION ALL
  -- Sales remove from stock (negative)
  SELECT -litres, cost_price_per_litre FROM fuel_sales WHERE status != 'reversed'
  UNION ALL
  -- Adjustments modify stock
  SELECT litres, 0 FROM fuel_stock_adjustments WHERE status != 'reversed'
) movements

-- Weighted average cost = total_cost / current_stock
-- Store this as cost_price_per_litre on the new fuel_sale
```

**⚠️ TRANSACTION SAFETY REQUIRED:**

The weighted average cost calculation and fuel sale insertion MUST happen in a single database transaction with proper locking to prevent race conditions:

```sql
BEGIN;
  -- Lock fuel tables to prevent concurrent modifications
  SELECT SUM(litres) FROM fuel_purchases WHERE status != 'reversed' FOR UPDATE;
  SELECT SUM(litres) FROM fuel_sales WHERE status != 'reversed' FOR UPDATE;
  SELECT SUM(litres) FROM fuel_stock_adjustments WHERE status != 'reversed' FOR UPDATE;
  
  -- Calculate weighted average cost
  -- Insert fuel_sale with calculated cost_price_per_litre
COMMIT;
```

This prevents two concurrent sales from calculating cost based on the same stale stock state.

### Cargo Calculations

**Cargo Revenue**
```sql
SELECT COALESCE(SUM(revenue), 0)
FROM cargo_records
WHERE status != 'reversed'
  AND shipment_date BETWEEN :start_date AND :end_date
```

**Cargo Expenses**
```sql
SELECT COALESCE(SUM(expenses), 0)
FROM cargo_records
WHERE status != 'reversed'
  AND shipment_date BETWEEN :start_date AND :end_date
```

**Cargo Profit**
```
Cargo Profit = Cargo Revenue - Cargo Expenses
```

**Note:** Cargo profit is always calculated from revenue and expenses. There is no separate profit field.

### Installment Calculations

**Installment Treatment:**

Installments are tracked separately from operating revenue/expenses:

**For 'taken' installments (we borrowed money):**
- Payments we make are **BUSINESS EXPENSES**
- Included in Overall Expenses
- Outstanding balance is a LIABILITY

**For 'given' installments (we lent money):**
- Payments we receive are **LOAN RECOVERIES**
- **NOT included in operating revenue**
- Outstanding balance is an ASSET
- Reported separately in installment reports

This prevents loan recoveries from inflating operating revenue figures.

**Installment Paid Amount**
```sql
SELECT COALESCE(SUM(amount), 0)
FROM installment_payments
WHERE installment_id = :installment_id
  AND status = 'active'
```

**Installment Remaining**
```
Remaining = total_amount - Paid Amount
```

**Total Installments Paid (for Overall Expenses)**
```sql
SELECT COALESCE(SUM(ip.amount), 0)
FROM installment_payments ip
JOIN installments i ON i.id = ip.installment_id
WHERE i.installment_type = 'taken'
  AND ip.status = 'active'
  AND ip.payment_date BETWEEN :start_date AND :end_date
```

### Personal Expenses

**Personal Expenses** (separate from business)
```sql
SELECT COALESCE(SUM(amount), 0)
FROM personal_expenses
WHERE status != 'reversed'
  AND expense_date BETWEEN :start_date AND :end_date
```

**Note:** Personal expenses are NEVER included in business operating calculations.

---

## Consolidated Financial Model

### Overall Revenue

```
Overall Revenue = 
    Bus Revenue
  + Adda Revenue
  + Fuel Pump Revenue (EXTERNAL_CUSTOMER only)
  + Cargo Revenue

⚠️ Does NOT include:
  - Installment recoveries (given installments)
  - Internal fuel transfers (INTERNAL_BUS)
```

### Overall Expenses

```
Overall Expenses = 
    Bus Trip Expenses
  + Bus Maintenance Cost
  + Bus Tyre Cost
  + Adda Expenses
  + Fuel Pump COGS (EXTERNAL_CUSTOMER only)
  + Cargo Expenses
  + Installment Payments (taken installments only)

⚠️ Does NOT include:
  - Personal expenses
  - Internal fuel transfers (already counted in Bus Trip Expenses via fuel_sale_expense_links)
```

### Overall Profit

```
Overall Profit = Overall Revenue - Overall Expenses
```

---

## Internal Fuel Workflow

When fuel is supplied to a Sadaat bus (INTERNAL_BUS), the system ensures the cost is recorded exactly once:

### Workflow Steps

1. **Record fuel sale:**
   - `sale_type = 'INTERNAL_BUS'`
   - `bus_id = :bus_id`
   - `trip_id = :trip_id` (if known)
   - `litres`, `sale_price_per_litre`, `cost_price_per_litre`, `total_amount`

2. **Create trip expense (auto or manual):**
   - `trip_id = :trip_id`
   - `expense_type = 'diesel'`
   - `amount = total_amount` from fuel sale
   - `description = 'Internal fuel from pump'`

3. **Link them in `fuel_sale_expense_links`:**
   - `fuel_sale_id = :fuel_sale_id`
   - `trip_expense_id = :trip_expense_id`
   - `auto_created = true` if system created it

4. **Result:**
   - Fuel stock decreases (fuel left the tank)
   - Trip expense increases (cost recorded once)
   - NO pump revenue (internal transfer)
   - NO consolidated revenue (internal transfer)
   - Cost appears exactly once in consolidated expenses (via trip expense)

### Validation Rules

- Application prevents duplicate links (UNIQUE constraints)
- Application warns if fuel sale exists without linked expense
- Application warns if diesel trip expense exists without linked fuel sale

---

## Seat Booking Validation

For `trip_revenue_entries` with `entry_type = 'seat_booking'`:

### Database Constraints

```sql
CONSTRAINT chk_seat_booking_values CHECK (
  entry_type != 'seat_booking' OR (
    quantity IS NOT NULL AND quantity > 0
    AND unit_price IS NOT NULL AND unit_price >= 0
    AND amount > 0
  )
)
```

### Application-Level Validation

1. **Quantity must be > 0**
   - Cannot book 0 or negative seats

2. **Unit price must be >= 0**
   - Free tickets allowed (unit_price = 0)
   - Negative prices not allowed

3. **Amount should equal quantity × unit_price**
   - Enforced at application level
   - Allows flexibility for discounts with proper audit trail

4. **Quantity must not exceed bus capacity**
   - Application checks: `quantity <= buses.capacity`
   - Prevents impossible seat counts

5. **Total seats booked must not exceed capacity**
   - Application checks: `SUM(quantity) + new_quantity <= buses.capacity`
   - Prevents overbooking

---

## Fuel Stock Reconciliation

### Stock Adjustment Mechanism

Every stock adjustment is recorded as an auditable movement in `fuel_stock_adjustments`:

**Positive adjustment** (litres > 0):
- Stock increases
- Example: Found extra fuel, measurement correction

**Negative adjustment** (litres < 0):
- Stock decreases
- Example: Leakage, theft, measurement error

### Stock Calculation

```sql
Current Stock = 
    SUM(fuel_purchases.litres WHERE status != 'reversed')
  - SUM(fuel_sales.litres WHERE status != 'reversed')
  + SUM(fuel_stock_adjustments.litres WHERE status != 'reversed')
```

### Reconciliation Process

1. **Perform physical stock count**
2. **Create `fuel_stock_snapshots` record:**
   - `system_stock` = calculated stock before count
   - `physical_stock` = actual measured stock
   - `variance` = physical_stock - system_stock
   - `adjustment_quantity` = variance (if adjusting)
   - `adjustment_reason` = explanation

3. **Create `fuel_stock_adjustments` record:**
   - `litres` = adjustment_quantity (positive or negative)
   - `reason` = explanation
   - `reference_type = 'reconciliation'`
   - `reference_id = snapshots.id`

4. **Result:**
   - Snapshot documents the variance
   - Adjustment records the actual stock movement
   - Stock calculation includes the adjustment
   - Complete audit trail maintained

---

## Audit Trail

### Record Status

All financial records use `record_status`:
- `active` - Normal active record
- `reversed` - Reversed/cancelled (excluded from calculations)
- `cancelled` - Cancelled (excluded from calculations)

### Reversal Tracking

When a record is reversed:
- `status` changes to 'reversed'
- `reversed_by` = user who reversed it
- `reversed_at` = timestamp
- `reversal_reason` = explanation

**Reversed records are NEVER deleted** - they remain in the database for audit purposes but are excluded from all calculations.

### Audit Logs

The `audit_logs` table tracks:
- User actions (login, logout)
- Record changes (create, update, delete)
- Financial changes (reverse, cancel)
- Permission changes
- User changes

Each log entry includes:
- `user_id` - Who performed the action
- `action` - What action was performed
- `table_name` - Which table was affected
- `record_id` - Which record was affected
- `old_values` - Previous state (JSONB)
- `new_values` - New state (JSONB)
- `ip_address` - Client IP
- `user_agent` - Browser/client info
- `meta` - Additional context (JSONB)

---

## User & Role Model

### Roles

| Role | Description |
|------|-------------|
| **OWNER** | Full system access. Can manage users, permissions, all business data. |
| **MANAGER** | Day-to-day operations. Can manage trips, buses, fuel, cargo, reports. Cannot manage users. |
| **STAFF** | Limited access. Can view and enter data. Cannot reverse/delete financial records. |

### Permissions

48 granular permissions organized by module:
- Users (5 permissions)
- Buses (4 permissions)
- Trips (6 permissions)
- Maintenance (3 permissions)
- Tyres (3 permissions)
- Fuel (7 permissions including reconcile)
- Adda (4 permissions)
- Cargo (4 permissions)
- Installments (5 permissions)
- Personal Expenses (3 permissions)
- Reports (3 permissions)
- Audit (1 permission)

### Security Enforcement

- Row Level Security (RLS) enabled on all tables
- Helper functions: `is_authenticated()`, `has_role()`, `has_permission()`
- All sensitive operations enforced server-side by PostgreSQL
- Frontend never solely controls access

---

## Key Design Decisions

### 1. No Summary Fields on Trips

**Decision:** `trips` table has NO revenue/expense summary fields.

**Rationale:** Prevents dual source of truth. All calculations use line items from `trip_revenue_entries` and `trip_expenses`.

### 2. Independent Aggregation for Bus Calculations

**Decision:** Aggregate revenue and expenses separately before combining.

**Rationale:** Prevents double-counting when a trip has multiple expense rows.

### 3. Installments Separate from Operating Revenue

**Decision:** Loan recoveries (given installments) are NOT operating revenue.

**Rationale:** Prevents inflating operating revenue with loan repayments. Installments reported separately.

### 4. Internal Fuel Linked to Trip Expenses

**Decision:** Use `fuel_sale_expense_links` to connect internal fuel sales to trip expenses.

**Rationale:** Ensures fuel cost recorded exactly once. Prevents forgotten entries, wrong amounts, or duplicates.

### 5. Auditable Stock Adjustments

**Decision:** Use `fuel_stock_adjustments` table for all stock movements.

**Rationale:** Provides complete audit trail for stock changes. Supports reconciliation with documented variances.

### 6. Transaction-Safe Weighted Average Cost

**Decision:** Calculate weighted average cost in a single transaction with proper locking.

**Rationale:** Prevents race conditions when multiple sales occur simultaneously.

### 7. Asia/Karachi Timezone

**Decision:** All business reporting uses Asia/Karachi timezone.

**Rationale:** Consistent date handling for Pakistan-based business. Application layer handles timezone conversion.

### 8. Personal Expenses Separate

**Decision:** `personal_expenses` table completely separate from business expenses.

**Rationale:** Prevents accidental inclusion in business calculations. Clear separation of concerns.

### 9. Record Status Instead of Soft Deletes

**Decision:** Use `record_status` enum (active/reversed/cancelled).

**Rationale:** Clearer semantics for financial records. Explicit reversal tracking with reason. Better audit trail.

### 10. No Multi-Tenant Architecture

**Decision:** No `tenant_id` or business slug fields.

**Rationale:** System built exclusively for Sadaat Travels. Multi-tenant would add unnecessary complexity.

---

## Indexes & Constraints

### Key Indexes

- `(bus_id, trip_date)` on trips - Bus activity by date
- `(trip_id)` on trip_revenue_entries and trip_expenses - Line items per trip
- `(sale_date, sale_type)` on fuel_sales - Fuel reporting
- `(status)` on all financial tables - Filtering active records
- `(user_id, created_at)` on audit_logs - User activity timeline
- `(adjustment_date)` on fuel_stock_adjustments - Stock movement timeline
- `(fuel_sale_id)` and `(trip_expense_id)` on fuel_sale_expense_links - Link lookups

### Key Constraints

- **Money:** `NUMERIC(12,2)` - Exact decimal, no floating point
- **Fuel quantities:** `NUMERIC(10,3)` - 3 decimal places for litres
- **CHECK constraints:** Positive amounts, valid sale types, seat booking validation
- **UNIQUE constraints:** Registration numbers, permission codes, role names, snapshot dates, fuel sale links
- **Foreign keys:** With `ON DELETE RESTRICT` for financial records, `ON DELETE CASCADE` for line items

---

## Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | All tables, enums, constraints, triggers |
| `002_indexes.sql` | Performance indexes |
| `003_rls_policies.sql` | Row Level Security + helper functions |
| `004_seed_data.sql` | Initial roles, permissions, role-permission mappings |
| `005_final_corrections.sql` | Final corrections: stock adjustments, fuel links, seat validation, documentation |

---

## Next Steps

1. Apply migrations to Supabase project
2. Create first OWNER user
3. Implement authentication flow
4. Build automatic audit log triggers
5. Build UI modules one by one
6. Implement weighted average cost calculation with transaction safety

---

## Document Version

**Version:** 3.0 (Final)  
**Last Updated:** 2026  
**Status:** Ready for Phase 3 (Authentication)
