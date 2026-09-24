-- Migration: 016_soft_delete_recycle_bin
-- Description: Soft-delete / recycle-bin system for transactional records
-- Date: 2026-09-24
--
-- PURPOSE:
-- - Add a fourth record_status value: 'deleted' (soft delete, restorable)
-- - Add restore / permanent_delete audit actions
-- - Add deletion metadata (deleted_by, deleted_at) to soft-deletable tables
-- - Secure SECURITY DEFINER RPCs:
--     soft_delete_record(p_table, p_id, p_reason)
--     restore_record(p_table, p_id)
--     permanent_delete_record(p_table, p_id, p_confirmation)   -- OWNER only, personal_expenses ONLY
--     list_deleted_records()                                    -- unified Deleted Data feed
-- - Configure pump_expenses (created outside this migration history):
--     extend TEXT status CHECK to allow 'deleted', add deletion metadata,
--     and replace its unrestricted USING(true) RLS with the OWNER/MANAGER model
--
-- SECURITY MODEL:
-- - Deletion mutations run ONLY through the RPCs above (SECURITY DEFINER,
--   fixed search_path = public, pg_temp, auth.uid() validated, explicit table whitelist).
-- - No new client-side INSERT policy is added for audit_logs.
--   Audit rows are written by these SECURITY DEFINER functions (which run as owner).
-- - Permanent delete is server-restricted to personal_expenses and requires
--   exact confirmation text 'PERMANENTLY DELETE'. The full row snapshot is
--   audited BEFORE the physical DELETE. Audit logs are never deleted.
-- - Parent/child safety: trips with active revenue/expense children and
--   installments with active payments cannot be soft-deleted; trip expenses
--   linked via fuel_sale_expense_links (restrictive FK) cannot be soft-deleted.
--   No cascading is ever performed by these functions.

-- ============================================================================
-- 1. ENUM EXTENSIONS
-- ============================================================================
-- IMPORTANT (PostgreSQL 12+): a newly added enum value cannot be *used*
-- (compared against, referenced in index predicates, etc.) until the
-- transaction that added it has committed — error 55P04 "unsafe use of new
-- value". Consequences for this migration:
--   * No top-level statement in this file compares against 'deleted',
--     'restore' or 'permanent_delete'. Every recycle-bin index is a plain
--     composite (status, deleted_at DESC) with NO predicate; the audit-log
--     lookup index is a plain composite (table_name, record_id, action,
--     created_at DESC) with NO predicate. No hash/text-cast workarounds.
--   * The literals appear ONLY inside plpgsql function bodies and EXECUTE
--     strings, which PostgreSQL does not validate at creation time — they are
--     evaluated at call time, long after this migration commits.
-- HOW TO RUN (required ordering to avoid 55P04):
--   STEP A: run ONLY the three ALTER TYPE statements below as their own
--           separate query in the Supabase SQL Editor and let it COMMIT.
--   STEP B: then run the ENTIRE file (it starts with these same three lines
--           again; IF NOT EXISTS makes them no-ops once committed).
-- This two-step procedure works whether the editor wraps your submission in
-- an implicit transaction or not, and is idempotent on re-runs.

ALTER TYPE public.record_status ADD VALUE IF NOT EXISTS 'deleted';
ALTER TYPE public.audit_action  ADD VALUE IF NOT EXISTS 'restore';
ALTER TYPE public.audit_action  ADD VALUE IF NOT EXISTS 'permanent_delete';

-- ----------------------------------------------------------------------------
-- One-time cleanup of the earlier FAILED execution attempt (safe no-ops if the
-- objects do not exist; CREATE INDEX IF NOT EXISTS below would otherwise keep
-- any stale definition from that attempt):
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.trips_deleted_idx;
DROP INDEX IF EXISTS public.trip_revenue_entries_deleted_idx;
DROP INDEX IF EXISTS public.trip_expenses_deleted_idx;
DROP INDEX IF EXISTS public.maintenance_records_deleted_idx;
DROP INDEX IF EXISTS public.tyre_records_deleted_idx;
DROP INDEX IF EXISTS public.fuel_purchases_deleted_idx;
DROP INDEX IF EXISTS public.fuel_sales_deleted_idx;
DROP INDEX IF EXISTS public.fuel_stock_adjustments_deleted_idx;
DROP INDEX IF EXISTS public.adda_income_deleted_idx;
DROP INDEX IF EXISTS public.adda_expenses_deleted_idx;
DROP INDEX IF EXISTS public.cargo_records_deleted_idx;
DROP INDEX IF EXISTS public.installments_deleted_idx;
DROP INDEX IF EXISTS public.installment_payments_deleted_idx;
DROP INDEX IF EXISTS public.personal_expenses_deleted_idx;
DROP INDEX IF EXISTS public.pump_expenses_deleted_idx;
DROP INDEX IF EXISTS public.audit_logs_deletion_idx;


-- ============================================================================
-- 2. DELETION METADATA COLUMNS
-- ============================================================================
-- Deletion state is separate from accounting reversal (reversed_by/reversed_at/
-- reversal_reason are untouched). The previous status is stored in the
-- deletion audit metadata (meta.previous_status), not as a duplicate column.

ALTER TABLE public.trips                  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.trip_revenue_entries   ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.trip_expenses          ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.maintenance_records    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.tyre_records           ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.fuel_purchases         ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.fuel_sales             ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.fuel_stock_adjustments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.adda_income            ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.adda_expenses          ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.cargo_records          ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.installments           ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.installment_payments   ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.personal_expenses      ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
                                          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Recycle-bin query support indexes (newest deleted first).
-- Plain composite indexes with NO WHERE predicate: a partial predicate like
-- status = 'deleted' is illegal in this transaction (ERROR 55P04, new enum
-- value not yet committed) and status::text = 'deleted' is illegal too
-- (ERROR 42P17, enum->text cast is STABLE, not IMMUTABLE). The composite
-- (status, deleted_at DESC) btree serves both normal active-only lists and
-- the recycle-bin feed for these small tables.
CREATE INDEX IF NOT EXISTS trips_deleted_idx ON public.trips (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS trip_revenue_entries_deleted_idx ON public.trip_revenue_entries (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS trip_expenses_deleted_idx ON public.trip_expenses (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS maintenance_records_deleted_idx ON public.maintenance_records (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS tyre_records_deleted_idx ON public.tyre_records (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS fuel_purchases_deleted_idx ON public.fuel_purchases (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS fuel_sales_deleted_idx ON public.fuel_sales (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS fuel_stock_adjustments_deleted_idx ON public.fuel_stock_adjustments (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS adda_income_deleted_idx ON public.adda_income (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS adda_expenses_deleted_idx ON public.adda_expenses (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS cargo_records_deleted_idx ON public.cargo_records (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS installments_deleted_idx ON public.installments (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS installment_payments_deleted_idx ON public.installment_payments (status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS personal_expenses_deleted_idx ON public.personal_expenses (status, deleted_at DESC);

-- Faster deletion-audit lookups (used by restore_record to find previous_status
-- and by any Deleted Data / audit UI filtering by table+record+action).
-- Non-partial composite index: action is included as a regular key column, so
-- no enum literal appears in a predicate (no 55P04) and there is no function
-- call in a predicate at all (no 42P17). Works whether audit_logs.action is an
-- enum or TEXT.
CREATE INDEX IF NOT EXISTS audit_logs_deletion_idx ON public.audit_logs (table_name, record_id, action, created_at DESC);

-- ============================================================================
-- 3. PUMP_EXPENSES CONFIGURATION
-- ============================================================================
-- pump_expenses was created by src/migrations/create_pump_expenses_table.sql
-- (outside this history). Its status is TEXT — do NOT convert it to the enum.
-- Only extend the CHECK constraint and add deletion metadata + proper RLS.

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    SELECT con.conname INTO v_conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pump_expenses'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
    LIMIT 1;

    IF v_conname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.pump_expenses DROP CONSTRAINT %I', v_conname);
    END IF;

    ALTER TABLE public.pump_expenses
        ADD CONSTRAINT pump_expenses_status_check
        CHECK (status IN ('active', 'reversed', 'cancelled', 'deleted'));
END $$;

ALTER TABLE public.pump_expenses
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS pump_expenses_deleted_idx ON public.pump_expenses (status, deleted_at DESC);

-- Correct the unrestricted RLS policies (USING (true)) inherited from the
-- legacy ad-hoc migration. Business access now follows the OWNER/MANAGER model.
ALTER TABLE public.pump_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pump expenses"     ON public.pump_expenses;
DROP POLICY IF EXISTS "Users can insert pump expenses"   ON public.pump_expenses;
DROP POLICY IF EXISTS "Users can update pump expenses"   ON public.pump_expenses;
DROP POLICY IF EXISTS "Users can delete pump expenses"   ON public.pump_expenses;
DROP POLICY IF EXISTS "pump_expenses_select"             ON public.pump_expenses;
DROP POLICY IF EXISTS "pump_expenses_insert"             ON public.pump_expenses;
DROP POLICY IF EXISTS "pump_expenses_update"             ON public.pump_expenses;
DROP POLICY IF EXISTS "pump_expenses_delete"             ON public.pump_expenses;

CREATE POLICY "pump_expenses_select" ON public.pump_expenses
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "pump_expenses_insert" ON public.pump_expenses
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "pump_expenses_update" ON public.pump_expenses
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'))
    WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- NO client DELETE policy: physical deletes are forbidden for clients.
-- (Soft deletion goes through the SECURITY DEFINER RPC below.)

-- Ensure the role can at least read/update the table at the GRANT level
-- (consistent with migrations 011/012 for other business tables).
GRANT SELECT, INSERT, UPDATE ON public.pump_expenses TO authenticated;
REVOKE DELETE ON public.pump_expenses FROM authenticated;


-- ============================================================================
-- 4. INTERNAL HELPER: WHITELIST VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public._deletion_is_whitelisted_table(p_table TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    -- Explicit whitelist of soft-deletable business entities ONLY.
    -- Protected entities (buses, users, user_roles, role_permissions, roles,
    -- permissions, audit_logs, fuel_stock_snapshots, petrol_pump_settings,
    -- fuel_sale_expense_links, links/config) are intentionally absent.
    SELECT p_table = ANY (ARRAY[
        'trips',
        'trip_revenue_entries',
        'trip_expenses',
        'maintenance_records',
        'tyre_records',
        'fuel_purchases',
        'fuel_sales',
        'fuel_stock_adjustments',
        'adda_income',
        'adda_expenses',
        'cargo_records',
        'installments',
        'installment_payments',
        'personal_expenses',
        'pump_expenses'
    ]);
$$;

REVOKE ALL ON FUNCTION public._deletion_is_whitelisted_table(TEXT) FROM PUBLIC;

-- ============================================================================
-- 5. SOFT DELETE RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_record(
    p_table TEXT,
    p_id    UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid        UUID := auth.uid();
    v_old        JSONB;
    v_new        JSONB;
    v_child_count BIGINT;
BEGIN
    -- Authentication -----------------------------------------------------------
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to delete records';
    END IF;

    -- Authorization: OWNER or MANAGER (server-side, never frontend-only) -------
    IF NOT (public.has_role('OWNER') OR public.has_role('MANAGER')) THEN
        RAISE EXCEPTION 'Only OWNER or MANAGER may delete records';
    END IF;

    -- Table security: explicit whitelist; protected entities rejected ----------
    IF NOT public._deletion_is_whitelisted_table(p_table) THEN
        RAISE EXCEPTION 'Deletion is not permitted for table "%"', p_table;
    END IF;

    -- Capture complete old row snapshot -----------------------------------------
    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.id = $1', p_table)
        INTO v_old USING p_id;

    IF v_old IS NULL THEN
        RAISE EXCEPTION 'Record not found in "%": %', p_table, p_id;
    END IF;

    IF (v_old ->> 'status') = 'deleted' THEN
        RAISE EXCEPTION 'Record is already deleted';
    END IF;

    -- Parent/child safety guards (never cascade-delete financial children) -----
    IF p_table = 'trips' THEN
        EXECUTE 'SELECT count(*) FROM public.trip_revenue_entries WHERE trip_id = $1 AND status = ''active'''
            INTO v_child_count USING p_id;
        IF v_child_count > 0 THEN
            RAISE EXCEPTION 'Cannot delete trip: it has % active revenue entr%(y|ies). Reverse or delete them first.',
                v_child_count, CASE WHEN v_child_count = 1 THEN 'y' ELSE 'ies' END;
        END IF;

        EXECUTE 'SELECT count(*) FROM public.trip_expenses WHERE trip_id = $1 AND status = ''active'''
            INTO v_child_count USING p_id;
        IF v_child_count > 0 THEN
            RAISE EXCEPTION 'Cannot delete trip: it has % active expense(s). Reverse or delete them first.',
                v_child_count;
        END IF;
    END IF;

    IF p_table = 'installments' THEN
        EXECUTE 'SELECT count(*) FROM public.installment_payments WHERE installment_id = $1 AND status = ''active'''
            INTO v_child_count USING p_id;
        IF v_child_count > 0 THEN
            RAISE EXCEPTION 'Cannot delete installment: it has % active payment(s). Delete the payments first.',
                v_child_count;
        END IF;
    END IF;

    IF p_table = 'trip_expenses' THEN
        -- fuel_sale_expense_links.trip_expense_id uses a RESTRICTIVE FK.
        -- Respect that relationship: a linked expense must remain.
        EXECUTE 'SELECT count(*) FROM public.fuel_sale_expense_links WHERE trip_expense_id = $1'
            INTO v_child_count USING p_id;
        IF v_child_count > 0 THEN
            RAISE EXCEPTION 'Cannot delete trip expense: it is linked to an internal fuel sale. Use the accounting reverse flow instead.';
        END IF;
    END IF;

    -- Mutation: soft delete (status machine active|reversed|cancelled -> deleted).
    -- pump_expenses.status is TEXT; every other whitelisted table uses the
    -- record_status enum. The cast lives inside the dynamic SQL string (never
    -- on a bind parameter), so plpgsql never needs a compile-time cast.
    IF p_table = 'pump_expenses' THEN
        EXECUTE format(
            'UPDATE public.%I SET status = $1, deleted_by = $2, deleted_at = NOW() WHERE id = $3',
            p_table
        ) USING 'deleted', v_uid, p_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET status = $1::record_status, deleted_by = $2, deleted_at = NOW() WHERE id = $3',
            p_table
        ) USING 'deleted', v_uid, p_id;
    END IF;

    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.id = $1', p_table)
        INTO v_new USING p_id;

    -- Audit (same transaction as the mutation => atomic).
    -- The action value is bound as a TEXT parameter and cast to audit_action at
    -- RUNTIME (long after this migration committed). This avoids ERROR 55P04
    -- ("unsafe use of new value") for newly added enum values at function-creation time.
    EXECUTE $audit$
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values, meta)
        VALUES ($1::uuid, $2::audit_action, $3::text, $4::uuid, $5::jsonb, $6::jsonb, $7::jsonb)
    $audit$
    USING
        v_uid,
        'delete',
        p_table,
        p_id,
        v_old,
        v_new,
        jsonb_build_object(
            'reason', COALESCE(NULLIF(TRIM(COALESCE(p_reason, '')), ''), NULL),
            'previous_status', v_old ->> 'status',
            'type', 'soft_delete'
        );

    RETURN v_new;
END;
$$;

-- ============================================================================
-- 6. RESTORE RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restore_record(
    p_table TEXT,
    p_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid       UUID := auth.uid();
    v_old       JSONB;
    v_new       JSONB;
    v_prev      TEXT;
    v_meta      JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to restore records';
    END IF;

    IF NOT (public.has_role('OWNER') OR public.has_role('MANAGER')) THEN
        RAISE EXCEPTION 'Only OWNER or MANAGER may restore records';
    END IF;

    IF NOT public._deletion_is_whitelisted_table(p_table) THEN
        RAISE EXCEPTION 'Restore is not permitted for table "%"', p_table;
    END IF;

    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.id = $1', p_table)
        INTO v_old USING p_id;

    IF v_old IS NULL THEN
        RAISE EXCEPTION 'Record not found in "%": %', p_table, p_id;
    END IF;

    IF (v_old ->> 'status') <> 'deleted' THEN
        RAISE EXCEPTION 'Only deleted records can be restored';
    END IF;

    -- Retrieve the previous status from the most recent deletion audit.
    -- Restore MUST return to the exact prior state (active/reversed/cancelled),
    -- never blindly to 'active'.
    SELECT al.meta ->> 'previous_status' INTO v_prev
    FROM public.audit_logs al
    WHERE al.table_name = p_table
      AND al.record_id = p_id
      AND al.action::text = 'delete'
    ORDER BY al.created_at DESC
    LIMIT 1;

    IF v_prev IS NULL OR v_prev NOT IN ('active', 'reversed', 'cancelled') THEN
        RAISE EXCEPTION 'Could not determine the previous status for this record; restore aborted';
    END IF;

    IF p_table = 'pump_expenses' THEN
        EXECUTE format(
            'UPDATE public.%I SET status = $1, deleted_by = NULL, deleted_at = NULL WHERE id = $2',
            p_table
        ) USING v_prev, p_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET status = $1::record_status, deleted_by = NULL, deleted_at = NULL WHERE id = $2',
            p_table
        ) USING v_prev, p_id;
    END IF;

    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.id = $1', p_table)
        INTO v_new USING p_id;

    v_meta := jsonb_build_object(
        'restored_status', v_prev,
        'type', 'restore'
    );

    -- Action bound as text param + runtime cast (see note in soft_delete_record).
    EXECUTE $audit$
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values, meta)
        VALUES ($1::uuid, $2::audit_action, $3::text, $4::uuid, $5::jsonb, $6::jsonb, $7::jsonb)
    $audit$
    USING
        v_uid,
        'restore',
        p_table,
        p_id,
        v_old,   -- deleted state
        v_new,   -- restored state
        v_meta;

    RETURN v_new;
END;
$$;

-- ============================================================================
-- 7. PERMANENT DELETE RPC (OWNER only, personal_expenses ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.permanent_delete_record(
    p_table        TEXT,
    p_id           UUID,
    p_confirmation TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid  UUID := auth.uid();
    v_row  JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to permanently delete records';
    END IF;

    -- OWNER verified INSIDE the RPC (never trust the frontend) ------------------
    IF NOT public.has_role('OWNER') THEN
        RAISE EXCEPTION 'Only OWNER may permanently delete records';
    END IF;

    -- Exact confirmation string required ----------------------------------------
    IF p_confirmation IS NULL OR p_confirmation <> 'PERMANENTLY DELETE' THEN
        RAISE EXCEPTION 'Permanent deletion requires the exact confirmation text: PERMANENTLY DELETE';
    END IF;

    -- Server-side table restriction: ONLY personal_expenses can ever be
    -- permanently deleted. Every other table returns an error.
    IF p_table <> 'personal_expenses' THEN
        RAISE EXCEPTION 'Permanent deletion is not permitted for table "%". Only personal_expenses may be permanently deleted.', p_table;
    END IF;

    -- Record must exist and already be soft-deleted -----------------------------
    SELECT to_jsonb(t) INTO v_row
    FROM public.personal_expenses t
    WHERE t.id = p_id;

    IF v_row IS NULL THEN
        RAISE EXCEPTION 'Personal expense record not found: %', p_id;
    END IF;

    -- Compare via the JSONB snapshot text to avoid a direct TEXT-vs-enum
    -- comparison on the bound value.
    IF v_row ->> 'status' IS DISTINCT FROM 'deleted' THEN
        RAISE EXCEPTION 'Only deleted (recycle-bin) records can be permanently deleted';
    END IF;

    -- AUDIT FIRST: full final row snapshot is written BEFORE physical deletion.
    -- The audit record itself is NEVER deleted.
    -- Action bound as text param + runtime cast (see note in soft_delete_record).
    EXECUTE $audit$
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values, meta)
        VALUES ($1::uuid, $2::audit_action, $3::text, $4::uuid, $5::jsonb, $6::jsonb, $7::jsonb)
    $audit$
    USING
        v_uid,
        'permanent_delete',
        p_table,
        p_id,
        v_row,
        NULL,
        jsonb_build_object(
            'previous_status', v_row ->> 'status',
            'type', 'permanent_delete'
        );

    -- Physical deletion second ---------------------------------------------------
    DELETE FROM public.personal_expenses WHERE id = p_id;

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 8. UNIFIED DELETED RECORDS LIST RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_deleted_records()
RETURNS TABLE (
    table_name      TEXT,
    module_label    TEXT,
    record_id       UUID,
    description     TEXT,
    amount          NUMERIC(14, 2),
    record_date     DATE,
    deleted_by_name TEXT,
    deleted_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT (public.has_role('OWNER') OR public.has_role('MANAGER')) THEN
        RAISE EXCEPTION 'Only OWNER or MANAGER may view deleted records';
    END IF;

    RETURN QUERY
    SELECT * FROM (
        SELECT 'trips'::TEXT, 'Trips'::TEXT, t.id,
               t.route,
               NULL::NUMERIC(14, 2),
               t.trip_date, u.full_name, t.deleted_at
        FROM public.trips t LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'trip_revenue_entries', 'Trip Revenue', t.id,
               COALESCE(NULLIF(t.description, ''), t.entry_type),
               t.amount,
               (tr.trip_date)::DATE, u.full_name, t.deleted_at
        FROM public.trip_revenue_entries t
        LEFT JOIN public.trips tr ON tr.id = t.trip_id
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'trip_expenses', 'Trip Expenses', t.id,
               COALESCE(NULLIF(t.description, ''), t.expense_type),
               t.amount,
               (tr.trip_date)::DATE, u.full_name, t.deleted_at
        FROM public.trip_expenses t
        LEFT JOIN public.trips tr ON tr.id = t.trip_id
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'maintenance_records', 'Maintenance', t.id,
               t.description,
               t.cost,
               t.maintenance_date, u.full_name, t.deleted_at
        FROM public.maintenance_records t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'tyre_records', 'Tyres', t.id,
               COALESCE(t.tyre_brand, 'Tyres') || ' x ' || t.quantity::TEXT
                   || COALESCE(' (' || t.tyre_size || ')', ''),
               t.total_cost,
               t.purchase_date, u.full_name, t.deleted_at
        FROM public.tyre_records t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'fuel_purchases', 'Fuel Purchases', t.id,
               t.supplier || ' - ' || t.litres::TEXT || ' L',
               t.total_cost,
               t.purchase_date, u.full_name, t.deleted_at
        FROM public.fuel_purchases t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'fuel_sales', 'Fuel Sales', t.id,
               COALESCE(t.customer_name, 'Internal bus') || ' - ' || t.litres::TEXT || ' L',
               t.total_amount,
               t.sale_date, u.full_name, t.deleted_at
        FROM public.fuel_sales t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'fuel_stock_adjustments', 'Fuel Stock Adjustments', t.id,
               t.reason,
               t.litres,
               t.adjustment_date, u.full_name, t.deleted_at
        FROM public.fuel_stock_adjustments t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'adda_income', 'Adda Income', t.id,
               COALESCE(NULLIF(t.description, ''), t.income_type),
               t.amount,
               t.income_date, u.full_name, t.deleted_at
        FROM public.adda_income t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'adda_expenses', 'Adda Expenses', t.id,
               COALESCE(NULLIF(t.description, ''), t.expense_type),
               t.amount,
               t.expense_date, u.full_name, t.deleted_at
        FROM public.adda_expenses t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'cargo_records', 'Cargo', t.id,
               t.sender_name || ' -> ' || t.receiver_name || ' | ' || t.origin || ' -> ' || t.destination,
               t.revenue,
               t.shipment_date, u.full_name, t.deleted_at
        FROM public.cargo_records t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'installments', 'Installments', t.id,
               t.person_name || ' - ' || t.title,
               t.total_amount,
               t.start_date, u.full_name, t.deleted_at
        FROM public.installments t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'installment_payments', 'Installment Payments', t.id,
               i.person_name || ' - payment',
               t.amount,
               t.payment_date, u.full_name, t.deleted_at
        FROM public.installment_payments t
        LEFT JOIN public.installments i ON i.id = t.installment_id
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'personal_expenses', 'Personal Expenses', t.id,
               t.category || ' - ' || t.description,
               t.amount,
               t.expense_date, u.full_name, t.deleted_at
        FROM public.personal_expenses t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'

        UNION ALL
        SELECT 'pump_expenses', 'Pump Expenses', t.id,
               COALESCE(NULLIF(t.description, ''), t.expense_type),
               t.amount,
               t.expense_date, u.full_name, t.deleted_at
        FROM public.pump_expenses t
        LEFT JOIN public.users u ON u.id = t.deleted_by
        WHERE t.status = 'deleted'  -- TEXT column: plain immutable text comparison
    ) AS deleted_union
    ORDER BY deleted_at DESC NULLS LAST;
END;
$$;

-- ============================================================================
-- 9. GRANTS / EXECUTE CONTROL
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.soft_delete_record(TEXT, UUID, TEXT)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_record(TEXT, UUID)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanent_delete_record(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_deleted_records()                    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.soft_delete_record(TEXT, UUID, TEXT)      FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.restore_record(TEXT, UUID)                FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.permanent_delete_record(TEXT, UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_deleted_records()                    FROM anon, public;

-- Service-role bypass note: service_role retains default superuser-equivalent
-- grants; no additional privileges were widened for it.


-- ============================================================================
-- HOW TO APPLY THIS MIGRATION (avoids both ERROR 55P04 and ERROR 42P17)
-- ----------------------------------------------------------------------------
-- NOTE: the one-time cleanup (DROP INDEX IF EXISTS for objects left behind by
-- the earlier failed attempts) is already embedded in section 1 of this file,
-- immediately after the ALTER TYPE statements, so re-running the file always
-- recreates the corrected index definitions.
--
-- STEP A: In the Supabase SQL Editor, run ONLY these three lines as their own
--         query and let it commit:
--
--   ALTER TYPE public.record_status ADD VALUE IF NOT EXISTS 'deleted';
--   ALTER TYPE public.audit_action  ADD VALUE IF NOT EXISTS 'restore';
--   ALTER TYPE public.audit_action  ADD VALUE IF NOT EXISTS 'permanent_delete';
--
-- STEP B: Then paste and run the ENTIRE file above. The three ALTER TYPE
--         lines at the top repeat harmlessly (IF NOT EXISTS => no-op once
--         committed), and every remaining statement is idempotent
--         (ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
--         CREATE OR REPLACE FUNCTION, DROP POLICY IF EXISTS).
--
-- WHY THIS IS SAFE:
--   * After Step A commits, 'deleted'/'restore'/'permanent_delete' are usable
--     enum values in any later transaction.
--   * No index in this file has a WHERE predicate at all, so error 42P17
--     ("functions in index predicate must be marked IMMUTABLE") cannot occur —
--     there is no hash-cast or text-cast workaround anywhere.
--   * New-enum literals appear only inside plpgsql function bodies and
--     EXECUTE-format strings, which are not evaluated at creation time.
--   * pump_expenses keeps its TEXT status column; its CHECK constraint uses
--     plain immutable text comparison and is unaffected by enum rules.
--
-- OPTIONAL (later session, purely a size optimization — NOT required):
--   Convert any recycle-bin composite index to a true partial index now that
--   the enum value is committed, e.g.:
--     DROP INDEX IF EXISTS public.trips_deleted_idx;
--     CREATE INDEX trips_deleted_idx ON public.trips (deleted_at DESC)
--       WHERE status = 'deleted';
--   The shipped composite indexes are sufficient for this system's data volume.
-- ============================================================================
