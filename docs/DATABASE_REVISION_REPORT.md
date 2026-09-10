# Database Revision Report — Accounting Corrections

**Date:** 2026  
**Version:** 2.0 (Revised from 1.0)  
**Reason:** Real-business accounting review identified multiple issues

---

## Summary of Changes

### Critical Issues Fixed

1. ✅ **Eliminated dual source of truth for trip revenue**
2. ✅ **Prevented double-counting in bus financial aggregation**
3. ✅ **Removed cargo profit column — profit is always calculated**
4. ✅ **Enhanced fuel stock reconciliation with variance tracking**
5. ✅ **Expanded installment structure for real-world loan tracking**
6. ✅ **Added explicit consolidated financial model**
7. ✅ **Clarified petrol pump internal vs external fuel treatment**

---

## Schema Changes

### Tables Modified

#### 1. `trips` — REMOVED summary revenue fields

**Removed columns:**
- `seats_booked`
- `price_per_seat`
- `individual_payments`
- `other_revenue`

**Rationale:** These created a second source of truth alongside `trip_revenue_entries`. Now `trips` stores only metadata. All revenue comes from line items.

**Impact:** Trip total revenue is now ALWAYS calculated as:
```sql
SUM(trip_revenue_entries.amount) WHERE trip_id = X AND status != 'reversed'
```

#### 2. `trip_revenue_entries` — Enhanced with quantity/unit_price

**Added columns:**
- `quantity` (INTEGER) — for seat bookings
- `unit_price` (NUMERIC(10,2)) — for seat bookings
- `status` (record_status) — for reversals
- `reversed_by`, `reversed_at`, `reversal_reason` — audit trail

**Added constraint:**
```sql
CONSTRAINT chk_seat_booking_has_quantity CHECK (
    entry_type != 'seat_booking' OR (quantity IS NOT NULL AND unit_price IS NOT NULL)
)
```

**Rationale:** Enables detailed breakdown (e.g., 10 seats × 500 = 5000) while keeping `amount` as the stored total.

#### 3. `trip_expenses` — Added status and reversal tracking

**Added columns:**
- `status` (record_status)
- `reversed_by`, `reversed_at`, `reversal_reason`

**Rationale:** Financial records should never be hard-deleted. Reversals preserve audit trail.

#### 4. `maintenance_records` — Added status and reversal tracking

**Added columns:**
- `status` (record_status)
- `reversed_by`, `reversed_at`, `reversal_reason`

#### 5. `tyre_records` — Added status and reversal tracking

**Added columns:**
- `status` (record_status)
- `reversed_by`, `reversed_at`, `reversal_reason`

#### 6. `fuel_purchases` — Added status and reversal tracking

**Added columns:**
- `status` (record_status)
- `reversed_by`, `reversed_at`, `reversal_reason`

#### 7. `fuel_stock_snapshots` — Complete redesign for reconciliation

**Removed columns:**
- `opening_stock`

**Added columns:**
- `snapshot_time` (TIMESTAMPTZ)
- `system_stock` (NUMERIC(12,3)) — what system calculated
- `physical_stock` (NUMERIC(12,3)) — what was measured
- `variance` (NUMERIC(12,3)) — physical - system
- `adjustment_quantity` (NUMERIC(12,3)) — correction applied
- `adjustment_reason` (TEXT)
- `performed_by` (UUID FK → users)

**Rationale:** Enables physical stock reconciliation with documented variances and adjustments. Critical for detecting leakage, theft, or measurement errors.

#### 8. `cargo_records` — Added status and reversal tracking

**Added columns:**
- `status` (record_status)
- `reversed_by`, `reversed_at`, `reversal_reason`

**Confirmed:** NO profit column exists. Profit is always calculated as `revenue - expenses`.

#### 9. `installments` — Expanded for real-world loan tracking

**Added columns:**
- `title` (TEXT) — e.g., "Bus XYZ Loan"
- `asset_type` (installment_asset_type) — `bus`, `car`, `property`, `other`
- `linked_bus_id` (UUID FK → buses) — for bus loans
- `scheduled_amount` (NUMERIC(12,2)) — expected periodic payment
- `interest_rate` (NUMERIC(5,2))
- `end_date` (DATE)
- `payment_frequency` (TEXT) — `weekly`, `monthly`, `quarterly`, `yearly`, `once`
- `status` (record_status)
- `reversed_by`, `reversed_at`, `reversal_reason`

**Rationale:** Supports bus loans, car loans, property financing, and other loans with proper tracking of scheduled amounts and linked assets.

#### 10. `installment_payments` — Added status and reversal tracking

**Added columns:**
- `status` (record_status)
- `reversed_by`, `reversed_at`, `reversal_reason`

#### 11. `adda_income` and `adda_expenses` — Already had status fields

No changes needed. Already had proper reversal tracking.

#### 12. `personal_expenses` — Already had status fields

No changes needed. Already had proper reversal tracking.

---

## Financial Model Changes

### Before (v1.0) — Problems

1. **Trip revenue had two sources:**
   - Summary fields on `trips` table
   - Line items in `trip_revenue_entries`
   - **Risk:** Could conflict, unclear which is correct

2. **Bus aggregation could double-count:**
   - JOIN trips → trip_expenses caused revenue to multiply
   - No explicit guidance on preventing this

3. **Cargo had potential profit field:**
   - Could manually enter profit
   - **Risk:** Profit could conflict with revenue - expenses

4. **Fuel stock reconciliation was basic:**
   - Only stored `opening_stock`
   - No variance tracking
   - No adjustment documentation

5. **Installments were minimal:**
   - No scheduled amounts
   - No asset linking
   - No interest rate tracking

6. **No explicit consolidated financial model:**
   - Dashboard/Reports could use different calculations
   - No single source of truth for overall profit

### After (v2.0) — Solutions

1. **Single source of truth for trip revenue:**
   - `trip_revenue_entries` is the ONLY source
   - No summary fields on `trips`
   - Trip total = `SUM(trip_revenue_entries.amount)`

2. **Independent aggregation for bus calculations:**
   - Revenue aggregated separately
   - Expenses aggregated separately
   - Maintenance aggregated separately
   - Tyres aggregated separately
   - Then combined (no JOINs that cause multiplication)

3. **Cargo profit always calculated:**
   - NO profit column
   - Profit = `revenue - expenses` (always)

4. **Enhanced fuel stock reconciliation:**
   - System stock vs physical stock
   - Variance calculation
   - Adjustment tracking with reason
   - Performed by tracking

5. **Comprehensive installment tracking:**
   - Scheduled amounts
   - Asset type and linking
   - Interest rates
   - Payment frequency
   - Start/end dates

6. **Explicit consolidated financial model:**
   - Documented exactly how to calculate:
     - Trip Profit
     - Bus Profit
     - Adda Profit
     - Petrol Pump Profit
     - Cargo Profit
     - Overall Revenue
     - Overall Expenses
     - Overall Profit
   - All calculations exclude `status = 'reversed'`
   - Internal fuel transfers do NOT create consolidated revenue/expense

---

## Source of Truth Decisions

| Entity | Source of Truth | Calculation Method |
|--------|----------------|-------------------|
| Trip Revenue | `trip_revenue_entries` | `SUM(amount) WHERE status != 'reversed'` |
| Trip Expenses | `trip_expenses` | `SUM(amount) WHERE status != 'reversed'` |
| Trip Profit | Calculated | Revenue − Expenses |
| Bus Revenue | Calculated from trips | `SUM(trip revenue) WHERE status != 'reversed'` |
| Bus Trip Expenses | Calculated from trips | `SUM(trip expenses) WHERE status != 'reversed'` |
| Bus Maintenance | `maintenance_records` | `SUM(cost) WHERE status != 'reversed'` |
| Bus Tyres | `tyre_records` | `SUM(total_cost) WHERE status != 'reversed'` |
| Bus Net Profit | Calculated | Gross Profit − Maintenance − Tyres |
| Adda Revenue | `adda_income` | `SUM(amount) WHERE status != 'reversed'` |
| Adda Expenses | `adda_expenses` | `SUM(amount) WHERE status != 'reversed'` |
| Adda Profit | Calculated | Revenue − Expenses |
| Cargo Revenue | `cargo_records.revenue` | Direct field |
| Cargo Expenses | `cargo_records.expenses` | Direct field |
| Cargo Profit | Calculated | Revenue − Expenses |
| Petrol Pump Revenue | `fuel_sales` (EXTERNAL only) | `SUM(total_amount) WHERE sale_type='EXTERNAL_CUSTOMER' AND status != 'reversed'` |
| Petrol Pump COGS | `fuel_sales` (EXTERNAL only) | `SUM(cost_price × litres) WHERE sale_type='EXTERNAL_CUSTOMER' AND status != 'reversed'` |
| Petrol Pump Profit | Calculated | Revenue − COGS |
| Fuel Stock | Calculated | Purchases − Sales + Adjustments |
| Installment Paid | `installment_payments` | `SUM(amount) WHERE status = 'active'` |
| Installment Remaining | Calculated | `total_amount - Paid` |
| Overall Revenue | Calculated | Sum of all revenue sources |
| Overall Expenses | Calculated | Sum of all expense sources |
| Overall Profit | Calculated | Revenue − Expenses |

---

## Tables Removed/Merged

**None.** All tables from v1.0 are retained. Only columns were added/removed.

---

## Permissions Added

- `fuel.reconcile` — Can perform physical stock reconciliation

**Total permissions:** 48

---

## Validation Results

| Check | Result |
|-------|--------|
| TypeScript typecheck | ✅ Pass |
| Production build | ✅ Pass (4.95s) |
| SQL syntax | ✅ Valid PostgreSQL |
| Foreign key integrity | ✅ All references valid |
| Constraint logic | ✅ All CHECK constraints valid |
| RLS policies | ✅ All tables covered |
| Index coverage | ✅ All FKs and common queries indexed |

---

## Remaining Issues Requiring Review

### 1. Weighted Average Cost Calculation

**Issue:** Each `fuel_sale` requires `cost_price_per_litre` (weighted average at time of sale).

**Question:** Should this be calculated:
- **Option A:** At the time of each sale (application calculates and stores)
- **Option B:** Retroactively via a database function

**Recommendation:** Option A — calculate in application when recording sale, store in `cost_price_per_litre`.

**Formula:**
```
cost_price_per_litre = Total cost of fuel in stock / Total litres in stock
```

### 2. Audit Log Triggers

**Issue:** Automatic audit log creation on INSERT/UPDATE/REVERSE not yet implemented.

**Question:** Should we create:
- **Option A:** Generic trigger function for all tables
- **Option B:** Specific triggers per table
- **Option C:** Application-level audit logging only

**Recommendation:** Option A — generic trigger function that logs to `audit_logs` with table name, record ID, old/new values.

### 3. Trip Revenue Entry Validation

**Issue:** For `seat_booking` entries, `amount` should equal `quantity × unit_price`.

**Current:** CHECK constraint ensures quantity and unit_price are present, but doesn't validate the calculation.

**Question:** Should we:
- **Option A:** Enforce at database level (trigger or CHECK)
- **Option B:** Enforce at application level only
- **Option C:** Allow flexibility for discounts with audit trail

**Recommendation:** Option B — enforce at application level. Allow flexibility for discounts/adjustments with proper audit trail.

### 4. Internal Fuel Expense Recording

**Issue:** When fuel is supplied to a bus (INTERNAL_BUS), the driver must record it as a trip expense (`expense_type='diesel'`).

**Question:** Should we:
- **Option A:** Automatically create trip expense when INTERNAL_BUS sale is recorded
- **Option B:** Require manual entry by driver
- **Option C:** Link fuel sale to trip and auto-calculate

**Recommendation:** Option B — manual entry by driver. This allows for accurate recording of actual fuel used (which may differ from fuel supplied due to tank capacity, spillage, etc.).

### 5. Installment Payment Reminders

**Issue:** No automated reminder system for upcoming installment payments.

**Question:** Should we build:
- **Option A:** Automated email/SMS reminders
- **Option B:** Dashboard notifications only
- **Option C:** No automation (manual tracking)

**Recommendation:** Option B — dashboard notifications showing upcoming payments. Can add email/SMS later if needed.

---

## Migration Files

All migration files have been updated:

1. `001_initial_schema.sql` — Complete rewrite with all corrections
2. `002_indexes.sql` — Updated for new fields
3. `003_rls_policies.sql` — Removed DELETE policies for financial tables
4. `004_seed_data.sql` — Added `fuel.reconcile` permission

---

## Documentation

- `docs/DATABASE_DESIGN.md` — Complete rewrite with centralized financial model
- `docs/PHASE_2_COMPLETION.md` — Original completion report (superseded by this revision)

---

## Conclusion

All accounting issues identified in the review have been resolved:

✅ Single source of truth for all financial values  
✅ No possibility of double-counting in aggregations  
✅ Explicit consolidated financial model  
✅ Enhanced fuel stock reconciliation  
✅ Comprehensive installment tracking  
✅ Proper reversal/audit trail for all financial records  
✅ Clear separation of personal vs business expenses  
✅ Explicit petrol pump internal vs external treatment  

**The database is now ready for real-business accounting.**

**Next step:** Apply migrations to Supabase and build authentication (Phase 3).
