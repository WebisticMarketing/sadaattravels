# Sadaat Travels Management System — Database Design Document

**Version:** 1.0  
**Date:** 2026  
**Database:** Supabase PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Table Descriptions](#table-descriptions)
3. [Relationships](#relationships)
4. [Financial Calculations & Source of Truth](#financial-calculations--source-of-truth)
5. [Petrol Pump Model](#petrol-pump-model)
6. [Audit Model](#audit-model)
7. [User & Role Model](#user--role-model)
8. [Indexes & Constraints](#indexes--constraints)
9. [Design Decisions](#design-decisions)

---

## Overview

The database is designed for a single business entity: **Sadaat Travels**, an intercity bus transportation company. There is no multi-tenant architecture.

The schema supports:
- Fleet management (buses, maintenance, tyres)
- Trip operations (revenue, expenses, profit calculation)
- Petrol pump operations (fuel inventory, internal/external sales)
- Adda operations (income and expenses)
- Cargo tracking
- Installment/loan management
- Personal expense tracking (separate from business)
- Complete audit trail
- Role-based access control

---

## Table Descriptions

### 1. `users`
Extends Supabase `auth.users`. Stores application-specific user data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | References `auth.users(id)` |
| `email` | TEXT UNIQUE | User email |
| `full_name` | TEXT | Display name |
| `phone` | TEXT | Contact number |
| `status` | ENUM | `active`, `inactive`, `suspended` |
| `last_login_at` | TIMESTAMPTZ | Last successful login |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Last modification time |

### 2. `roles`
Defines system roles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `name` | TEXT UNIQUE | `OWNER`, `MANAGER`, `STAFF` |
| `description` | TEXT | Role description |

### 3. `permissions`
Granular system permissions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `code` | TEXT UNIQUE | e.g., `trips.create`, `fuel.sell_external` |
| `name` | TEXT | Human-readable name |
| `module` | TEXT | Module grouping: `buses`, `trips`, `fuel`, etc. |

### 4. `user_roles`
Many-to-many mapping between users and roles.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID (FK → users) | The user |
| `role_id` | UUID (FK → roles) | The assigned role |
| `assigned_at` | TIMESTAMPTZ | When assigned |
| `assigned_by` | UUID (FK → users) | Who assigned it |

**Unique constraint:** `(user_id, role_id)` — prevents duplicate assignments.

### 5. `role_permissions`
Many-to-many mapping between roles and permissions.

| Column | Type | Description |
|--------|------|-------------|
| `role_id` | UUID (FK → roles) | The role |
| `permission_id` | UUID (FK → permissions) | The granted permission |

**Unique constraint:** `(role_id, permission_id)`

### 6. `buses`
Fleet of buses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `registration_number` | TEXT UNIQUE | Vehicle registration |
| `bus_name` | TEXT | Optional display name |
| `bus_type` | TEXT | e.g., `AC`, `Non-AC`, `Sleeper` |
| `capacity` | INTEGER | Total seats (CHECK > 0) |
| `purchase_date` | DATE | When acquired |
| `purchase_cost` | NUMERIC(12,2) | Acquisition cost |
| `status` | TEXT | `active`, `inactive`, `sold`, `maintenance` |
| `created_by` / `updated_by` | UUID (FK → users) | Audit trail |

### 7. `trips`
Individual bus trips.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `bus_id` | UUID (FK → buses) | Which bus |
| `trip_date` | DATE | Date of trip |
| `route` | TEXT | e.g., `Lahore to Karachi` |
| `departure_time` / `arrival_time` | TIME | Schedule |
| `seats_booked` | INTEGER | Number of seats sold |
| `price_per_seat` | NUMERIC(10,2) | Price per seat |
| `individual_payments` | NUMERIC(12,2) | Special/individual payments |
| `other_revenue` | NUMERIC(12,2) | Miscellaneous revenue |
| `status` | ENUM | `active`, `reversed`, `cancelled` |
| `reversed_by` / `reversed_at` / `reversal_reason` | — | Reversal audit trail |

**Financial formula (source of truth):**
```
Seats Revenue = seats_booked × price_per_seat
Total Revenue = Seats Revenue + individual_payments + other_revenue
```

### 8. `trip_revenue_entries`
Detailed line items for trip revenue breakdown.

| Column | Type | Description |
|--------|------|-------------|
| `trip_id` | UUID (FK → trips) | Parent trip |
| `entry_type` | TEXT | `seat_booking`, `individual_payment`, `other` |
| `description` | TEXT | Details |
| `amount` | NUMERIC(12,2) | Amount |
| `quantity` | INTEGER | For seat bookings |

### 9. `trip_expenses`
Line items for trip expenses.

| Column | Type | Description |
|--------|------|-------------|
| `trip_id` | UUID (FK → trips) | Parent trip |
| `expense_type` | TEXT | `diesel`, `ta`, `tea`, `cleaning`, `police`, `toll_tax`, `number_money`, `mechanic`, `extra`, `other` |
| `amount` | NUMERIC(12,2) | Amount |
| `paid_to` | TEXT | Who was paid |
| `receipt_number` | TEXT | Reference |

**Financial formula:**
```
Total Expenses = SUM(amount) for all expense entries of this trip
Trip Profit = Total Revenue − Total Expenses
```

### 10. `maintenance_records`
Bus maintenance history.

| Column | Type | Description |
|--------|------|-------------|
| `bus_id` | UUID (FK → buses) | Which bus |
| `maintenance_date` | DATE | When performed |
| `maintenance_type` | TEXT | Category |
| `description` | TEXT | Details |
| `cost` | NUMERIC(12,2) | Cost |
| `performed_by` | TEXT | Mechanic/shop |
| `next_maintenance_date` | DATE | Scheduled next |

### 11. `tyre_records`
Tyre purchase/replacement history.

| Column | Type | Description |
|--------|------|-------------|
| `bus_id` | UUID (FK → buses) | Which bus |
| `purchase_date` | DATE | When purchased |
| `tyre_brand` / `tyre_size` | TEXT | Specifications |
| `quantity` | INTEGER | Number of tyres |
| `cost_per_tyre` | NUMERIC(10,2) | Unit cost |
| `total_cost` | NUMERIC(12,2) | Total cost |
| `supplier` | TEXT | Vendor |
| `expected_life_km` | INTEGER | Expected lifespan |

### 12. `fuel_purchases`
Fuel bought INTO the petrol pump (stock increase).

| Column | Type | Description |
|--------|------|-------------|
| `purchase_date` | DATE | When purchased |
| `supplier` | TEXT | Vendor |
| `litres` | NUMERIC(10,3) | Quantity (CHECK > 0) |
| `cost_per_litre` | NUMERIC(10,3) | Unit cost |
| `total_cost` | NUMERIC(12,2) | Total cost |
| `receipt_number` | TEXT | Reference |

### 13. `fuel_sales`
Fuel sold/issued FROM the petrol pump (stock decrease).

| Column | Type | Description |
|--------|------|-------------|
| `sale_date` | DATE | When sold |
| `sale_type` | ENUM | `EXTERNAL_CUSTOMER` or `INTERNAL_BUS` |
| `litres` | NUMERIC(10,3) | Quantity (CHECK > 0) |
| `sale_price_per_litre` | NUMERIC(10,3) | Selling price |
| `cost_price_per_litre` | NUMERIC(10,3) | Cost basis at time of sale |
| `total_amount` | NUMERIC(12,2) | Total sale amount |
| `bus_id` | UUID (FK → buses) | Required for INTERNAL_BUS |
| `trip_id` | UUID (FK → trips) | Optional trip link |
| `customer_name` / `customer_phone` | TEXT | For EXTERNAL_CUSTOMER |
| `status` | ENUM | `active`, `reversed`, `cancelled` |

**CHECK constraint:** Internal sales MUST have `bus_id`; external sales MUST NOT have `bus_id`.

### 14. `fuel_stock_snapshots`
Periodic stock level records.

| Column | Type | Description |
|--------|------|-------------|
| `snapshot_date` | DATE UNIQUE | Date of snapshot |
| `opening_stock` | NUMERIC(12,3) | Stock at start of period |

### 15. `adda_income`
Income entries for the adda (bus terminal/stand).

| Column | Type | Description |
|--------|------|-------------|
| `income_date` | DATE | When received |
| `income_type` | TEXT | `ticket_commission`, `parking`, `loading`, `other` |
| `amount` | NUMERIC(12,2) | Amount |
| `received_from` | TEXT | Source |
| `status` | ENUM | `active`, `reversed`, `cancelled` |

### 16. `adda_expenses`
Expense entries for the adda.

| Column | Type | Description |
|--------|------|-------------|
| `expense_date` | DATE | When paid |
| `expense_type` | TEXT | `staff_salary`, `utilities`, `maintenance`, `other` |
| `amount` | NUMERIC(12,2) | Amount |
| `paid_to` | TEXT | Recipient |
| `status` | ENUM | `active`, `reversed`, `cancelled` |

### 17. `cargo_records`
Cargo shipment records.

| Column | Type | Description |
|--------|------|-------------|
| `shipment_date` | DATE | When shipped |
| `bus_id` | UUID (FK → buses, nullable) | Which bus carried it |
| `sender_name` / `receiver_name` | TEXT | Parties |
| `origin` / `destination` | TEXT | Route |
| `description` | TEXT | What was shipped |
| `weight_kg` | NUMERIC(8,2) | Weight |
| `revenue` | NUMERIC(12,2) | Income from shipment |
| `expenses` | NUMERIC(12,2) | Cost of shipment |
| `status` | ENUM | `active`, `reversed`, `cancelled` |

**Financial formula:**
```
Cargo Profit = revenue − expenses
```

### 18. `installments`
Loans given or taken.

| Column | Type | Description |
|--------|------|-------------|
| `installment_type` | ENUM | `given` (we lent money) or `taken` (we borrowed) |
| `person_name` | TEXT | Counterparty |
| `total_amount` | NUMERIC(12,2) | Total loan amount |
| `start_date` | DATE | When started |
| `status` | ENUM | `active`, `reversed`, `cancelled` |

### 19. `installment_payments`
Individual payments against installments.

| Column | Type | Description |
|--------|------|-------------|
| `installment_id` | UUID (FK → installments) | Parent installment |
| `payment_date` | DATE | When paid |
| `amount` | NUMERIC(12,2) | Payment amount (CHECK > 0) |
| `payment_method` | TEXT | `cash`, `bank_transfer`, `cheque` |
| `status` | ENUM | `active`, `reversed`, `cancelled` |

**Financial formula:**
```
Paid Amount = SUM(amount) WHERE status='active'
Remaining Amount = total_amount − Paid Amount
```

### 20. `personal_expenses`
Owner's personal (non-business) expenses.

| Column | Type | Description |
|--------|------|-------------|
| `expense_date` | DATE | When spent |
| `category` | TEXT | `household`, `vehicle`, `medical`, `education`, `other` |
| `description` | TEXT | Details |
| `amount` | NUMERIC(12,2) | Amount |
| `paid_by` | TEXT | Who paid |
| `status` | ENUM | `active`, `reversed`, `cancelled` |

**IMPORTANT:** These are explicitly SEPARATE from business expenses and must NEVER be included in operating expense calculations.

### 21. `audit_logs`
System-wide audit trail.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID (FK → users, nullable) | Who performed the action |
| `action` | ENUM | `login`, `logout`, `create`, `update`, `delete`, `reverse`, `cancel`, `permission_change`, `user_change`, `financial_change` |
| `table_name` | TEXT | Which table was affected |
| `record_id` | UUID | Which record |
| `old_values` | JSONB | Previous state |
| `new_values` | JSONB | New state |
| `ip_address` | TEXT | Client IP |
| `user_agent` | TEXT | Browser/client info |
| `metadata` | JSONB | Additional context |
| `created_at` | TIMESTAMPTZ | When it happened |

---

## Relationships

```
users ──< user_roles >── roles ──< role_permissions >── permissions

buses ──< trips ──< trip_revenue_entries
              └──< trip_expenses
       ──< maintenance_records
       ──< tyre_records
       ──< fuel_sales (INTERNAL_BUS only)
       ──< cargo_records

fuel_purchases ── (standalone, increases stock)
fuel_sales ── (standalone, decreases stock)
fuel_stock_snapshots ── (standalone, periodic snapshots)

installments ──< installment_payments

adda_income ── (standalone)
adda_expenses ── (standalone)
personal_expenses ── (standalone)
audit_logs ── (standalone, references users/table/record)
```

---

## Financial Calculations & Source of Truth

### Trip Profit
```sql
-- Source of truth: trips table + trip_expenses table
SELECT
    t.id,
    (t.seats_booked * t.price_per_seat) + t.individual_payments + t.other_revenue AS total_revenue,
    COALESCE(SUM(te.amount), 0) AS total_expenses,
    ((t.seats_booked * t.price_per_seat) + t.individual_payments + t.other_revenue) - COALESCE(SUM(te.amount), 0) AS trip_profit
FROM trips t
LEFT JOIN trip_expenses te ON te.trip_id = t.id AND te.status != 'reversed'
WHERE t.status = 'active'
GROUP BY t.id;
```

### Bus Net Profit
```sql
-- Source of truth: trips + maintenance_records + tyre_records
SELECT
    b.id,
    -- Revenue from all active trips
    COALESCE(SUM(
        (t.seats_booked * t.price_per_seat) + t.individual_payments + t.other_revenue
    ), 0) AS bus_revenue,
    -- Trip expenses
    COALESCE(SUM(te.amount), 0) AS bus_trip_expenses,
    -- Gross profit
    COALESCE(SUM(
        (t.seats_booked * t.price_per_seat) + t.individual_payments + t.other_revenue
    ), 0) - COALESCE(SUM(te.amount), 0) AS bus_gross_profit,
    -- Maintenance cost
    COALESCE((SELECT SUM(mr.cost) FROM maintenance_records mr WHERE mr.bus_id = b.id), 0) AS maintenance_cost,
    -- Tyre cost
    COALESCE((SELECT SUM(tr.total_cost) FROM tyre_records tr WHERE tr.bus_id = b.id), 0) AS tyre_cost,
    -- Net profit
    (COALESCE(SUM(
        (t.seats_booked * t.price_per_seat) + t.individual_payments + t.other_revenue
    ), 0) - COALESCE(SUM(te.amount), 0))
    - COALESCE((SELECT SUM(mr.cost) FROM maintenance_records mr WHERE mr.bus_id = b.id), 0)
    - COALESCE((SELECT SUM(tr.total_cost) FROM tyre_records tr WHERE tr.bus_id = b.id), 0)
    AS bus_net_profit
FROM buses b
LEFT JOIN trips t ON t.bus_id = b.id AND t.status = 'active'
LEFT JOIN trip_expenses te ON te.trip_id = t.id
GROUP BY b.id;
```

### Adda Profit
```sql
SELECT
    COALESCE((SELECT SUM(amount) FROM adda_income WHERE status = 'active'), 0) -
    COALESCE((SELECT SUM(amount) FROM adda_expenses WHERE status = 'active'), 0)
    AS adda_profit;
```

### Cargo Profit
```sql
SELECT
    COALESCE(SUM(revenue), 0) - COALESCE(SUM(expenses), 0) AS cargo_profit
FROM cargo_records
WHERE status = 'active';
```

### Installment Balance
```sql
SELECT
    i.id,
    i.total_amount,
    COALESCE(SUM(ip.amount) FILTER (WHERE ip.status = 'active'), 0) AS paid_amount,
    i.total_amount - COALESCE(SUM(ip.amount) FILTER (WHERE ip.status = 'active'), 0) AS remaining_amount
FROM installments i
LEFT JOIN installment_payments ip ON ip.installment_id = i.id
WHERE i.status = 'active'
GROUP BY i.id;
```

---

## Petrol Pump Model

### Design Philosophy

The petrol pump is a **fuel inventory system** within Sadaat Travels. The critical challenge is preventing internal fuel transfers from inflating consolidated company revenue.

### Stock Tracking

```
Current Stock = Opening Stock + SUM(fuel_purchases.litres) − SUM(fuel_sales.litres)
```

- `fuel_purchases`: Every purchase increases stock
- `fuel_sales`: Every sale (both external and internal) decreases stock
- `fuel_stock_snapshots`: Periodic physical stock counts for reconciliation

### Sale Types

| Type | Description | Effect on Stock | Effect on Pump Revenue | Effect on Consolidated Revenue |
|------|-------------|-----------------|----------------------|-------------------------------|
| `EXTERNAL_CUSTOMER` | Sold to outside customers | Decreases | Increases (at sale price) | Increases |
| `INTERNAL_BUS` | Supplied to Sadaat buses | Decreases | Does NOT count as pump revenue | Does NOT count |

### Cost Basis Tracking

Each `fuel_sale` records both:
- `sale_price_per_litre`: What was charged
- `cost_price_per_litre`: The cost basis at time of sale (weighted average of purchases)

This enables accurate profit calculation:
```
Pump Revenue = SUM(sale_price × litres) WHERE sale_type = 'EXTERNAL_CUSTOMER' AND status = 'active'
Pump COGS = SUM(cost_price × litres) WHERE status = 'active'
Pump Profit = Pump Revenue − Pump COGS
```

### Internal Fuel Usage

When fuel is supplied to a Sadaat bus:
1. A `fuel_sale` record is created with `sale_type = 'INTERNAL_BUS'` and `bus_id` set
2. This decreases pump stock but does NOT count as pump revenue
3. The bus's trip should record this as a diesel expense (via `trip_expenses`)
4. This prevents double-counting: the fuel cost appears once as a trip expense

### Consolidated Company View

For the overall Sadaat Travels P&L:
- External fuel sales = Revenue
- Fuel purchases = Cost of fuel
- Internal bus fuel = NOT revenue (internal transfer, already counted as trip expense)

---

## Audit Model

### What Gets Audited

| Action | When Logged |
|--------|-------------|
| `login` / `logout` | User authentication events |
| `create` | New record created in any business table |
| `update` | Record modified |
| `reverse` / `cancel` | Financial record reversed or cancelled |
| `permission_change` | User role or permission modified |
| `user_change` | User account created/modified/deactivated |
| `financial_change` | Important financial data modified |

### How It Works

1. **Database triggers** (to be implemented in a later phase) will automatically log `create`, `update`, and `reverse` operations
2. **Application code** will explicitly log `login`, `logout`, and custom events
3. Audit logs store `old_values` and `new_values` as JSONB for full change tracking
4. Audit logs are **append-only** — no UPDATE or DELETE policies

### Retention

Audit logs are never deleted. They provide a complete history of all system activity.

---

## User & Role Model

### Roles

| Role | Description |
|------|-------------|
| `OWNER` | Full access. Can manage users, permissions, all business data. |
| `MANAGER` | Day-to-day operations. Can manage trips, buses, fuel, cargo, reports. Cannot manage users. |
| `STAFF` | Limited access. Can view and enter data. Cannot reverse/delete financial records. |

### Permission Structure

Permissions follow the pattern: `{module}.{action}`

Examples:
- `trips.create` — Can create new trips
- `fuel.sell_external` — Can sell fuel to external customers
- `users.assign_roles` — Can assign roles to users

### Security Enforcement

- **RLS (Row Level Security)** is enabled on all tables
- Helper functions (`has_role()`, `has_permission()`) check permissions in policies
- All sensitive operations are enforced server-side by PostgreSQL
- The frontend never solely controls access

---

## Indexes & Constraints

### Key Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `trips` | `(bus_id, trip_date)` | Find trips for a bus in date range |
| `trip_expenses` | `(trip_id)` | Sum expenses per trip |
| `fuel_sales` | `(sale_date, sale_type)` | Fuel reporting by date and type |
| `fuel_sales` | `(bus_id)` | Internal fuel usage per bus |
| `audit_logs` | `(user_id, created_at)` | User activity timeline |
| `audit_logs` | `(table_name, record_id)` | Change history for a record |

### Key Constraints

- **Money:** `NUMERIC(12,2)` — no floating point
- **Fuel quantities:** `NUMERIC(10,3)` — 3 decimal places for litres
- **CHECK constraints:** Positive amounts, valid sale types, internal sales require bus_id
- **UNIQUE constraints:** Registration numbers, permission codes, role names
- **Foreign keys:** With appropriate `ON DELETE` behavior (`RESTRICT` for financial records, `CASCADE` for line items)

---

## Design Decisions

### 1. Why separate `trip_revenue_entries` AND summary columns on `trips`?

The `trips` table has `seats_booked`, `price_per_seat`, `individual_payments`, and `other_revenue` as summary fields. These are the **source of truth** for trip revenue calculations. The `trip_revenue_entries` table provides a detailed breakdown for auditing and reporting but does not drive calculations.

### 2. Why store `cost_price_per_litre` on each fuel sale?

This captures the cost basis at the time of sale, enabling accurate profit calculation without needing to reconstruct historical purchase prices. The application should calculate a weighted average cost at the time of each sale.

### 3. Why `fuel_stock_snapshots`?

Physical stock counts may differ from calculated stock due to evaporation, measurement errors, or theft. Snapshots allow reconciliation and provide a known-good starting point for stock calculations.

### 4. Why separate `personal_expenses`?

Personal expenses must NEVER be included in business operating calculations. A separate table makes this distinction explicit and prevents accidental inclusion in reports.

### 5. Why `record_status` enum instead of hard deletes?

Financial records should never be permanently deleted. Using `active` / `reversed` / `cancelled` status preserves the audit trail while allowing logical removal of incorrect entries.

### 6. Why no multi-tenant architecture?

This system is built exclusively for Sadaat Travels. There is only one business entity. Adding tenant IDs would add unnecessary complexity.

### 7. Money type choice

`NUMERIC(12,2)` supports values up to 9,999,999,999,999.99 PKR with exact decimal precision. This is appropriate for Pakistani Rupee amounts. Floating-point types (`REAL`, `DOUBLE PRECISION`, `FLOAT`) are deliberately avoided to prevent rounding errors in financial calculations.

---

## Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | All tables, enums, triggers |
| `002_indexes.sql` | Performance indexes |
| `003_rls_policies.sql` | Row Level Security policies + helper functions |
| `004_seed_data.sql` | Initial roles, permissions, and role-permission assignments |

---

## Next Steps (Future Phases)

1. Apply migrations to Supabase project
2. Create Supabase Edge Functions for permission enforcement
3. Implement automatic audit log triggers
4. Build authentication flow
5. Build UI modules one by one
6. Implement weighted average cost calculation for fuel
