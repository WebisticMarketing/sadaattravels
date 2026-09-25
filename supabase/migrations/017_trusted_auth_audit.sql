-- Migration: 017_trusted_auth_audit
-- Description: Trusted server-side mechanism for authentication-lifecycle audit events.
-- Date: 2026-09-25
--
-- PURPOSE (Phase A — Audit Logs security architecture):
-- The frontend previously wrote auth events with a direct
--   supabase.from('audit_logs').insert(...)
-- which depends on a table-level INSERT grant that is NOT part of the tracked
-- migration history (only SELECT was ever granted to authenticated, see 011).
-- This migration replaces that fragile path with a SECURITY DEFINER RPC so
-- that clients never need (and must not have) direct INSERT on audit_logs.
--
-- TRUST MODEL:
--   * user_id is ALWAYS derived server-side from auth.uid() — the client can
--     never supply or forge it.
--   * action is validated against the audit_action enum; only the five
--     authentication-lifecycle values are accepted through this function:
--       login / logout / password_change /
--       password_reset_requested / password_reset_completed
--     (No business-CRUD actions, no delete/restore/permanent_delete — those
--     remain owned by the existing trusted RPCs in migration 016.)
--   * meta is free-form JSONB supplied by the caller but written under the
--     function owner's privileges; email inside meta is treated as
--     UNTRUSTED INPUT ONLY (a claimed identifier), never as proof of identity.
--   * created_at defaults to NOW() server-side.
--
-- PASSWORD RESET REQUEST (critical case):
--   password_reset_requested intentionally happens while the requester may be
--   UNAUTHENTICATED, so user_id = NULL is required and correct there — we
--   NEVER invent a user ID. The submitted email travels only inside meta as a
--   CLAIMED identifier and is never treated as proof of identity.
--   EXECUTE is granted to anon specifically so this pre-authentication event
--   can be recorded through the trusted path (there is NO frontend
--   direct-insert fallback anymore; logAuditEvent() uses ONLY this RPC).
--   If the write fails for any reason, the frontend skips the event after
--   logError() — auth flows never break.
--
-- GRANTS:
--   * REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated; then
--     GRANT SELECT TO authenticated.
--     - IMPORTANT: whether an unauthorized live INSERT grant currently exists
--       on the production database was NOT verified (no live query was
--       possible from this workspace). This block is therefore framed purely
--       as hardening REQUIRED BY THE NEW ARCHITECTURE (clients must not hold
--       direct write access once all writers are server-side), NOT as a fix
--       for a confirmed privilege drift. These statements are idempotent: if
--       the live DB already denies these privileges they are no-ops; if it
--       grants them, they close the gap.
--     - authenticated retains READ via the explicit GRANT SELECT plus the
--       OWNER/MANAGER RLS SELECT policy (unchanged since 008/011).
--     - UPDATE/DELETE were never needed by any client path; revoking them
--       preserves and hardens the anti-tampering model.
--   * SECURITY DEFINER functions keep working regardless: the deletion /
--     restore / permanent-delete auditing from migration 016 and the bootstrap
--     audit from migration 007 run as the table owner, which retains full
--     privileges on audit_logs. This migration does not touch them.
--   * New RPC execute rights: authenticated + anon (anon is required for the
--     pre-authentication reset-request case; the function itself always
--     derives user_id from auth.uid(), never from arguments).

-- ============================================================================
-- 1. HELPER: current user's email (from JWT claim; NULL when unauthenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION public._auth_audit_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    auth.jwt() ->> 'email',
    (SELECT u.email FROM public.users u WHERE u.id = auth.uid())
  );
$$;

-- Internal helper only: callable by log_auth_audit_event() (same owner/schema).
-- No client EXECUTE — clients must never call it directly.
REVOKE ALL ON FUNCTION public._auth_audit_email() FROM PUBLIC;

-- ============================================================================
-- 2. TRUSTED AUTH-AUDIT RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_auth_audit_event(
  p_action audit_action,
  p_meta   jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Whitelist: authentication lifecycle only. Everything else is rejected.
  IF p_action IS NULL OR p_action NOT IN (
      'login'::audit_action,
      'logout'::audit_action,
      'password_change'::audit_action,
      'password_reset_requested'::audit_action,
      'password_reset_completed'::audit_action
  ) THEN
    RAISE EXCEPTION 'log_auth_audit_event: action % is not an authentication-lifecycle event',
      coalesce(p_action::text, 'NULL')
      USING ERRCODE = '42501';
  END IF;

  -- Identity is NEVER taken from arguments: always auth.uid() (NULL allowed
  -- for the pre-authentication password_reset_requested case).
  INSERT INTO public.audit_logs (user_id, action, meta, user_agent)
  VALUES (
    v_uid,
    p_action,
    coalesce(p_meta, '{}'::jsonb) || jsonb_build_object(
      'source',         'log_auth_audit_event',
      'actor_user_id',  v_uid,
      'actor_email',    public._auth_audit_email()
    ),
    nullif(current_setting('request.header.user-agent', true), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_auth_audit_event(audit_action, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_auth_audit_event(audit_action, jsonb) TO authenticated, anon;

-- ============================================================================
-- 3. HARDEN audit_logs TABLE PRIVILEGES
--    (Frontend must never write rows directly; all writers are now either this
--     RPC or the pre-existing SECURITY DEFINER functions from 007/016.)
-- ============================================================================

REVOKE ALL ON public.audit_logs FROM PUBLIC;
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.audit_logs FROM authenticated;

-- Re-grant the read access the application legitimately needs
-- (row visibility still enforced by the OWNER/MANAGER RLS SELECT policy).
GRANT SELECT ON public.audit_logs TO authenticated;

-- ============================================================================
-- 4. VERIFICATION (run manually after applying)
-- ============================================================================
-- SELECT has_table_privilege('authenticated', 'public.audit_logs', 'SELECT') AS auth_select,   -- expect t
--        has_table_privilege('authenticated', 'public.audit_logs', 'INSERT') AS auth_insert,   -- expect f
--        has_table_privilege('authenticated', 'public.audit_logs', 'UPDATE') AS auth_update,   -- expect f
--        has_table_privilege('authenticated', 'public.audit_logs', 'DELETE') AS auth_delete,   -- expect f
--        has_table_privilege('anon',          'public.audit_logs', 'INSERT') AS anon_insert,   -- expect f
--        has_function_privilege('authenticated', 'public.log_auth_audit_event(audit_action, jsonb)', 'EXECUTE') AS auth_exec, -- expect t
--        has_function_privilege('postgres',      'public.soft_delete_record(text, uuid, text)',      'EXECUTE') AS sdr_owner_exec; -- expect t (016 auditing unaffected)
