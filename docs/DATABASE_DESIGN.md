# Sadaat Travels Management System — Database Design Document

**Version:** 2.0 (Revised)  
**Date:** 2026  
**Database:** Supabase PostgreSQL

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Table Descriptions](#table-descriptions)
3. [Relationships](#relationships)
4. [Source of Truth Decisions](#source-of-truth-decisions)
5. [Centralized Financial Model](#centralized-financial-model)
6. [Petrol Pump Model](#petrol-pump-model)
7. [Fuel Stock Reconciliation](#fuel-stock-reconciliation)
8. [Audit Model](#audit-model)
9. [User & Role Model](#user--role-model)
10. [Indexes & Constraints](#indexes--constraints)
11. [Design Decisions & Rationale](#design-decisions--rationale)

---

## Design Principles

1. **Single source of truth** for every financial value — no duplicate calculations
2. **No summary fields** that could conflict with line-item totals
3. **All money stored as NUMERIC** — never floating point
4. **Financial records use record_status** for reversals — never hard-delete
5. **Internal fuel transfers** do not create consolidated revenue/expense
6. **Aggregations are independent** — revenue and expenses are summed separately before combining
7. **Personal expenses** are strictly separate from business expenses

---

## Table Descriptions

### 1. `users`
Application user data. Extends Supabase `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | References `auth.users(id)` |
| `email` | TEXT UNIQUE | |
| `full_name` | TEXT | |
| `phone` | TEXT | Nullable |
| `status` | user_status | `active`, `inactive`, `suspended` |
| `last_login_at` | TIMESTAMPTZ | Nullable |

### 2. `roles`
System roles: OWNER, MANAGER, STAFF.

### 3. `permissions`
Granular permissions. Code format: `{module}.{action}`.

### 4. `user_roles`
Many-to-many: users ↔ roles.

### 5. `role_permissions`
Many-to-many: roles ↔ permissions.

### 6. `buses`
Fleet of buses.

| Column | Type | Notes |
|--------|------|-------|
| `registration_number` | TEXT UNIQUE | Vehicle registration |
| `capacity` | INTEGER | CHECK > 0 |
| `purchase_cost` | NUMERIC(12,2) | Nullable |
| `status` | TEXT | `active`, `inactive`, `sold`, `maintenance` |

### 7. `trips`
Trip metadata ONLY. No revenue/expense summary fields.

| Column | Type | Notes |
|--------|------|-------|
| `bus_id` | UUID (FK → buses) | |
| `trip_date` | DATE | |
| `route` | TEXT | |
| `departure_time` / `arrival_time` | TIME | Nullable |
| `status` | record_status | `active`, `reversed`, `cancelled` |

**⚠️ NO revenue or expense columns on this table.**
All financial data comes from `trip_revenue_entries` and `trip_expenses`.

### 8. `trip_revenue_entries` — SOLE SOURCE OF TRUTH for trip revenue

| Column | Type | Notes |
|--------|------|-------|
| `trip_id` | UUID (FK → trips) | |
| `entry_type` | TEXT | `seat_booking`, `individual_payment`, `other` |
| `quantity` | INTEGER | For seat bookings (nullable) |
| `unit_price` | NUMERIC(10,2) | For seat bookings (nullable) |
| `amount` | NUMERIC(12,2) | The stored total for this entry |
| `status` | record_status | |

**Trip Total Revenue = `SUM(amount) WHERE trip_id = X AND status != 'reversed'`**

For seat bookings: `amount` = `quantity × unit_price` (enforced at application level).

### 9. `trip_expenses` — SOLE SOURCE OF TRUTH for trip expenses

| Column | Type | Notes |
|--------|------|-------|
| `trip_id` | UUID (FK → trips) | |
| `expense_type` | TEXT | `diesel`, `ta`, `tea`, `cleaning`, `police`, `toll_tax`, `number_money`, `mechanic`, `extra`, `other` |
| `amount` | NUMERIC(12,2) | |
| `status` | record_status | |

**Trip Total Expenses = `SUM(amount) WHERE trip_id = X AND status != 'reversed'`**

### 10. `maintenance_records`

| Column | Type | Notes |
|--------|------|-------|
| `bus_id` | UUID (FK → buses) | |
| `maintenance_date` | DATE | |
| `cost` | NUMERIC(12,2) | |
| `status` | record_status | |

### 11. `tyre_records`

| Column | Type | Notes |
|--------|------|-------|
| `bus_id` | UUID (FK → buses) | |
| `purchase_date` | DATE | |
| `quantity` | INTEGER | CHECK > 0 |
| `total_cost` | NUMERIC(12,2) | |
| `status` | record_status | |

### 12. `fuel_purchases`
Fuel bought INTO the pump. Increases stock.

| Column | Type | Notes |
|--------|------|-------|
| `purchase_date` | DATE | |
| `supplier` | TEXT | |
| `litres` | NUMERIC(10,3) | CHECK > 0 |
| `cost_per_litre` | NUMERIC(10,3) | |
| `total_cost` | NUMERIC(12,2) | |
| `status` | record_status | |

### 13. `fuel_sales`
Fuel sold/issued FROM the pump. Decreases stock.

| Column | Type | Notes |
|--------|------|-------|
| `sale_date` | DATE | |
| `sale_type` | fuel_sale_type | `EXTERNAL_CUSTOMER` or `INTERNAL_BUS` |
| `litres` | NUMERIC(10,3) | CHECK > 0 |
| `sale_price_per_litre` | NUMERIC(10,3) | Selling price |
| `cost_price_per_litre` | NUMERIC(10,3) | Cost basis at time of sale |
| `total_amount` | NUMERIC(12,2) | |
| `bus_id` | UUID (FK → buses) | Required for INTERNAL_BUS, NULL for EXTERNAL |
| `trip_id` | UUID (FK → trips) | Optional link to trip |
| `customer_name` / `customer_phone` | TEXT | For EXTERNAL_CUSTOMER |
| `status` | record_status | |

**CHECK constraint:** `(sale_type='INTERNAL_BUS' AND bus_id IS NOT NULL) OR (sale_type='EXTERNAL_CUSTOMER' AND bus_id IS NULL)`

### 14. `fuel_stock_snapshots`
Physical stock reconciliation.

| Column | Type | Notes |
|--------|------|-------|
| `snapshot_date` | DATE UNIQUE | |
| `snapshot_time` | TIMESTAMPTZ | |
| `system_stock` | NUMERIC(12,3) | What system calculated |
| `physical_stock` | NUMERIC(12,3) | What was actually measured |
| `variance` | NUMERIC(12,3) | physical - system |
| `adjustment_quantity` | NUMERIC(12,3) | Correction applied |
| `adjustment_reason` | TEXT | |
| `performed_by` | UUID (FK → users) | |

### 15. `adda_income`

| Column | Type | Notes |
|--------|------|-------|
| `income_date` | DATE | |
| `income_type` | TEXT | |
| `amount` | NUMERIC(12,2) | |
| `status` | record_status | |

### 16. `adda_expenses`

| Column | Type | Notes |
|--------|------|-------|
| `expense_date` | DATE | |
| `expense_type` | TEXT | |
| `amount` | NUMERIC(12,2) | |
| `status` | record_status | |

### 17. `cargo_records`
Revenue and expenses stored separately. Profit is ALWAYS calculated.

| Column | Type | Notes |
|--------|------|-------|
| `shipment_date` | DATE | |
| `bus_id` | UUID (FK → buses) | Nullable |
| `revenue` | NUMERIC(12,2) | CHECK >= 0 |
| `expenses` | NUMERIC(12,2) | CHECK >= 0 |
| `status` | record_status | |

**⚠️ NO profit column.** Cargo Profit = revenue - expenses (always calculated).

### 18. `installments`
Supports bus loans, car loans, property financing, other loans.

| Column | Type | Notes |
|--------|------|-------|
| `installment_type` | installment_type | `given` or `taken` |
| `title` | TEXT | e.g., 'Bus XYZ Loan' |
| `person_name` | TEXT | Lender/borrower |
| `asset_type` | installment_asset_type | `bus`, `car`, `property`, `other` |
| `linked_bus_id` | UUID (FK → buses) | Nullable, for bus loans |
| `total_amount` | NUMERIC(12,2) | Original loan amount |
| `scheduled_amount` | NUMERIC(12,2) | Expected periodic payment |
| `interest_rate` | NUMERIC(5,2) | Nullable |
| `start_date` | DATE | |
| `end_date` | DATE | Nullable |
| `payment_frequency` | TEXT | `weekly`, `monthly`, `quarterly`, `yearly`, `once` |
| `status` | record_status | |

### 19. `installment_payments`

| Column | Type | Notes |
|--------|------|-------|
| `installment_id` | UUID (FK → installments) | |
| `payment_date` | DATE | |
| `amount` | NUMERIC(12,2) | CHECK > 0 |
| `payment_method` | TEXT | `cash`, `bank_transfer`, `cheque`, `other` |
| `status` | record_status | |

**Paid Amount = `SUM(amount) WHERE installment_id = X AND status = 'active'`**  
**Remaining = `total_amount - Paid Amount`**

### 20. `personal_expenses`
Strictly separate from business expenses.

### 21. `audit_logs`
Append-only audit trail.

---

## Source of Truth Decisions

### Trip Revenue
| Question | Answer |
|----------|--------|
| Where is trip revenue stored? | `trip_revenue_entries` ONLY |
| Is there a summary field on `trips`? | **NO** — removed to prevent conflicts |
| How is trip total calculated? | `SUM(trip_revenue_entries.amount) WHERE status != 'reversed'` |
| Can totals conflict? | **NO** — single source of truth |

### Trip Expenses
| Question | Answer |
|----------|--------|
| Where are trip expenses stored? | `trip_expenses` ONLY |
| Is there a summary field on `trips`? | **NO** |
| How is trip total calculated? | `SUM(trip_expenses.amount) WHERE status != 'reversed'` |

### Cargo
| Question | Answer |
|----------|--------|
| Where is cargo revenue stored? | `cargo_records.revenue` |
| Where are cargo expenses stored? | `cargo_records.expenses` |
| Is there a profit column? | **NO** — always calculated as `revenue - expenses` |

### Installments
| Question | Answer |
|----------|--------|
| Where is total loan amount? | `installments.total_amount` |
| Where are payments stored? | `installment_payments` |
| How is paid amount calculated? | `SUM(installment_payments.amount) WHERE status = 'active'` |
| How is remaining calculated? | `total_amount - SUM(payments)` |

---

## Centralized Financial Model

**ALL Dashboard and Report calculations MUST use these exact definitions.**
There is only one correct way to calculate each value.

### Trip-Level Calculations

```
Trip Revenue = SUM(trip_revenue_entries.amount)
               WHERE trip_id = X
               AND status != 'reversed'

Trip Expenses = SUM(trip_expenses.amount)
                WHERE trip_id = X
                AND status != 'reversed'

Trip Profit = Trip Revenue − Trip Expenses
```

### Bus-Level Calculations

**CRITICAL: Revenue and expenses are aggregated INDEPENDENTLY to prevent double-counting from JOINs.**

```sql
-- Step 1: Aggregate trip revenue per bus (independent subquery)
WITH bus_revenue AS (
    SELECT t.bus_id,
           COALESCE(SUM(tre.amount), 0) AS total_revenue
    FROM trips t
    JOIN trip_revenue_entries tre ON tre.trip_id = t.id
    WHERE t.status != 'reversed'
      AND tre.status != 'reversed'
      AND t.trip_date BETWEEN :start AND :end
    GROUP BY t.bus_id
),

-- Step 2: Aggregate trip expenses per bus (independent subquery)
bus_expenses AS (
    SELECT t.bus_id,
           COALESCE(SUM(te.amount), 0) AS total_expenses
    FROM trips t
    JOIN trip_expenses te ON te.trip_id = t.id
    WHERE t.status != 'reversed'
      AND te.status != 'reversed'
      AND t.trip_date BETWEEN :start AND :end
    GROUP BY t.bus_id
),

-- Step 3: Aggregate maintenance per bus (independent subquery)
bus_maintenance AS (
    SELECT bus_id,
           COALESCE(SUM(cost), 0) AS maintenance_cost
    FROM maintenance_records
    WHERE status != 'reversed'
      AND maintenance_date BETWEEN :start AND :end
    GROUP BY bus_id
),

-- Step 4: Aggregate tyre costs per bus (independent subquery)
bus_tyres AS (
    SELECT bus_id,
           COALESCE(SUM(total_cost), 0) AS tyre_cost
    FROM tyre_records
    WHERE status != 'reversed'
      AND purchase_date BETWEEN :start AND :end
    GROUP BY bus_id
)

-- Step 5: Combine the independently-aggregated results
SELECT b.id AS bus_id,
       b.registration_number,
       COALESCE(br.total_revenue, 0) AS bus_revenue,
       COALESCE(be.total_expenses, 0) AS bus_trip_expenses,
       COALESCE(br.total_revenue, 0) - COALESCE(be.total_expenses, 0) AS bus_gross_profit,
       COALESCE(bm.maintenance_cost, 0) AS bus_maintenance_cost,
       COALESCE(bt.tyre_cost, 0) AS bus_tyre_cost,
       (COALESCE(br.total_revenue, 0) - COALESCE(be.total_expenses, 0))
         - COALESCE(bm.maintenance_cost, 0)
         - COALESCE(bt.tyre_cost, 0) AS bus_net_profit
FROM buses b
LEFT JOIN bus_revenue br ON br.bus_id = b.id
LEFT JOIN bus_expenses be ON be.bus_id = b.id
LEFT JOIN bus_maintenance bm ON bm.bus_id = b.id
LEFT JOIN bus_tyres bt ON bt.bus_id = b.id;
```

**Why independent subqueries?**
If we JOIN trips → trip_expenses directly, a trip with 5 expense rows would cause the trip's revenue to be counted 5 times. Independent aggregation prevents this.

### Adda Calculations

```
Adda Revenue = SUM(adda_income.amount) WHERE status != 'reversed'
Adda Expenses = SUM(adda_expenses.amount) WHERE status != 'reversed'
Adda Profit = Adda Revenue − Adda Expenses
```

### Petrol Pump Calculations

```
Pump Revenue = SUM(fuel_sales.total_amount)
               WHERE sale_type = 'EXTERNAL_CUSTOMER'
               AND status != 'reversed'

Pump COGS = SUM(fuel_sales.cost_price_per_litre * fuel_sales.litres)
            WHERE sale_type = 'EXTERNAL_CUSTOMER'
            AND status != 'reversed'

Pump Profit = Pump Revenue − Pump COGS

Fuel Stock = SUM(fuel_purchases.litres WHERE status != 'reversed')
             − SUM(fuel_sales.litres WHERE status != 'reversed')
             + adjustments from fuel_stock_snapshots
```

### Cargo Calculations

```
Cargo Revenue = SUM(cargo_records.revenue) WHERE status != 'reversed'
Cargo Expenses = SUM(cargo_records.expenses) WHERE status != 'reversed'
Cargo Profit = Cargo Revenue − Cargo Expenses
```

### Installment Calculations

```
For each installment:
  Paid Amount = SUM(installment_payments.amount) WHERE status = 'active'
  Remaining = total_amount − Paid Amount

For consolidated reporting:
  Total Installments Paid (taken) = SUM of payments on 'taken' installments
    → This is a business expense (we are paying back loans)
  Total Installments Received (given) = SUM of payments on 'given' installments
    → This is a business income (we are collecting loans)
```

### Overall Consolidated Calculations

```
Overall Revenue =
    Bus Revenue (sum of all trip revenue)
    + Adda Revenue
    + Cargo Revenue
    + Petrol Pump Revenue (EXTERNAL_CUSTOMER only)
    + Installments Received (payments on 'given' installments)

Overall Expenses =
    Bus Trip Expenses (sum of all trip expenses)
    + Bus Maintenance Cost
    + Bus Tyre Cost
    + Adda Expenses
    + Cargo Expenses
    + Petrol Pump COGS (EXTERNAL_CUSTOMER only)
    + Installments Paid (payments on 'taken' installments)

Overall Profit = Overall Revenue − Overall Expenses

⚠️ Personal expenses are NEVER included in Overall Expenses.
⚠️ Internal fuel transfers (INTERNAL_BUS) do NOT appear in Overall Revenue or Expenses.
   The fuel cost is already counted once as a trip expense (diesel).
```

---

## Petrol Pump Model

### Sale Types

| Type | Effect on Stock | Pump Revenue | Consolidated Revenue | Consolidated Expense |
|------|----------------|--------------|---------------------|---------------------|
| `EXTERNAL_CUSTOMER` | Decreases | YES (sale price) | YES (sale price) | YES (COGS) |
| `INTERNAL_BUS` | Decreases | NO | NO | NO (already in trip expense) |

### Internal Fuel Flow

When fuel is supplied to a Sadaat bus:

1. **Fuel sale recorded** with `sale_type = 'INTERNAL_BUS'`, `bus_id` set
2. **Stock decreases** by the litres sold
3. **NO pump revenue** is recorded (internal transfer)
4. **NO consolidated revenue** is created
5. The bus driver records the fuel as a **trip expense** (`expense_type = 'diesel'`) in `trip_expenses`
6. This is the **ONE place** the fuel cost appears in consolidated expenses

### Why this works

- Stock is correctly reduced (fuel left the tank)
- The business expense is recorded exactly once (as diesel in trip_expenses)
- No double-counting in consolidated reports
- Pump profit only reflects external sales

### Cost Basis

Each `fuel_sale` stores `cost_price_per_litre` — the weighted average cost at time of sale. The application must calculate this when recording each sale:

```
cost_price_per_litre = Total cost of all fuel in stock / Total litres in stock
```

This enables accurate pump profit calculation without needing to reconstruct historical purchase prices.

---

## Fuel Stock Reconciliation

### Process

1. **System stock** is calculated: `SUM(purchases) - SUM(sales) + adjustments`
2. **Physical count** is performed at the pump
3. **Variance** = physical_stock − system_stock
4. If variance is significant, an **adjustment** is recorded
5. The snapshot becomes the new baseline for stock calculations

### Fields

| Field | Purpose |
|-------|---------|
| `system_stock` | What the system calculated before counting |
| `physical_stock` | What was actually measured |
| `variance` | physical − system (negative = loss/leakage) |
| `adjustment_quantity` | Amount added/removed to correct |
| `adjustment_reason` | Why (e.g., "leakage", "measurement error", "theft") |
| `performed_by` | Who did the count |

### Stock Calculation After Reconciliation

```
Current Stock = Latest snapshot's physical_stock
                + SUM(purchases.litres) after snapshot date
                − SUM(sales.litres WHERE status='active') after snapshot date
```

---

## Audit Model

### What Gets Audited

| Action | When |
|--------|------|
| `login` / `logout` | Authentication events |
| `create` | New record in any business table |
| `update` | Record modified |
| `reverse` / `cancel` | Financial record reversed |
| `permission_change` | User role/permission modified |
| `user_change` | User account modified |
| `financial_change` | Important financial data modified |

### Financial Record Reversal

When a financial record is reversed:
- `status` changes to `'reversed'`
- `reversed_by` is set to the user who reversed it
- `reversed_at` is set to the timestamp
- `reversal_reason` explains why
- The record is **NOT deleted** — it remains in the database
- All calculations exclude `status = 'reversed'` records

---

## User & Role Model

### Roles

| Role | Access |
|------|--------|
| `OWNER` | Full access including user management |
| `MANAGER` | Day-to-day operations, no user management |
| `STAFF` | View and enter data, no reverse/delete |

### Security

- RLS enabled on all tables
- `has_role()` and `has_permission()` helper functions
- All access enforced server-side by PostgreSQL
- Frontend never solely controls access

---

## Indexes & Constraints

### Key Indexes

- `(bus_id, trip_date)` on trips — bus activity by date
- `(trip_id)` on trip_revenue_entries and trip_expenses — line items per trip
- `(sale_date, sale_type)` on fuel_sales — fuel reporting
- `(status)` on all financial tables — filtering active records
- `(user_id, created_at)` on audit_logs — user activity timeline

### Key Constraints

- Money: `NUMERIC(12,2)` — exact decimal, no floating point
- Fuel: `NUMERIC(10,3)` — 3 decimal places for litres
- CHECK: Positive amounts, valid sale types, internal sales require bus_id
- UNIQUE: Registration numbers, permission codes, role names, snapshot dates
- FK: With `ON DELETE RESTRICT` for financial records, `ON DELETE CASCADE` for line items

---

## Design Decisions & Rationale

### 1. Why no summary fields on trips?

**Problem:** If `trips` has `total_revenue` AND `trip_revenue_entries` exists, which is correct?

**Solution:** Remove summary fields. Trip total is ALWAYS `SUM(trip_revenue_entries.amount)`.

**Trade-off:** Slightly more complex queries, but zero possibility of conflicting totals.

### 2. Why independent subqueries for bus calculations?

**Problem:** `JOIN trips → trip_expenses` causes revenue to multiply by the number of expense rows.

**Solution:** Aggregate revenue and expenses in separate subqueries, then combine.

**Example:** Trip with revenue=5000 and 3 expense rows of 100 each.
- Wrong (JOIN): Revenue appears 3 times = 15000
- Correct (independent): Revenue = 5000, Expenses = 300

### 3. Why no profit column on cargo?

**Problem:** If both `revenue`, `expenses`, and `profit` exist, they can conflict.

**Solution:** Store only `revenue` and `expenses`. Profit is always calculated.

### 4. Why separate personal_expenses table?

**Problem:** A flag on a general expenses table could be accidentally ignored.

**Solution:** Separate table makes the distinction explicit. Queries for business expenses never touch this table.

### 5. Why fuel_stock_snapshots with reconciliation?

**Problem:** Calculated stock can drift from physical stock (evaporation, leakage, theft).

**Solution:** Periodic physical counts with documented variances and adjustments.

### 6. Why record_status instead of hard deletes?

**Problem:** Financial records should never be permanently deleted.

**Solution:** `active` / `reversed` / `cancelled` status with full audit trail.

### 7. Why store cost_price_per_litre on each fuel sale?

**Problem:** Need to calculate pump profit without reconstructing historical prices.

**Solution:** Store the weighted average cost at time of each sale.

---

## Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | All tables, enums, constraints, triggers |
| `002_indexes.sql` | Performance indexes |
| `003_rls_policies.sql` | Row Level Security + helper functions |
| `004_seed_data.sql` | Initial roles, permissions, role-permission mappings |

---

## Next Steps

1. Apply migrations to Supabase project
2. Create first OWNER user
3. Implement authentication flow
4. Build automatic audit log triggers
5. Build UI modules one by one
6. Implement weighted average cost calculation for fuel sales
