-- Migration: 007_bootstrap_function
-- Description: Create secure bootstrap function for first OWNER account
-- Date: 2026-01-15
--
-- PURPOSE:
-- This migration provides a secure way to bootstrap the first OWNER account.
-- The function can ONLY be called when no OWNER exists in the system.
-- Once an OWNER exists, this function becomes permanently disabled.
--
-- SECURITY:
-- - Uses SECURITY DEFINER to bypass RLS for bootstrap only
-- - Derives user ID from auth.uid() - never accepts from client
-- - Retrieves email from auth.users - never accepts from client
-- - Uses pg_advisory_xact_lock() to prevent concurrent bootstrap attempts
-- - Checks that no OWNER exists before allowing bootstrap
-- - Prevents duplicate OWNER creation
-- - Logs bootstrap event to audit_logs
-- - SET search_path = public to prevent search_path manipulation attacks
-- - Revokes EXECUTE from public, grants only to authenticated users

-- ============================================================================
-- BOOTSTRAP FUNCTION: Create First OWNER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_first_owner(
    p_full_name TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_user_id UUID;
    v_auth_email TEXT;
    v_owner_count INTEGER;
    v_owner_role_id UUID;
    v_existing_user_id UUID;
BEGIN
    -- CRITICAL SECURITY: Get authenticated user from auth.uid()
    -- This prevents client from specifying arbitrary user IDs
    v_auth_user_id := auth.uid();
    
    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Bootstrap denied: Must be authenticated.';
    END IF;
    
    -- CRITICAL SECURITY: Verify user exists in auth.users and get their email
    -- This prevents email spoofing
    SELECT email INTO v_auth_email
    FROM auth.users
    WHERE id = v_auth_user_id;
    
    IF v_auth_email IS NULL THEN
        RAISE EXCEPTION 'Bootstrap denied: Authenticated user not found in auth.users.';
    END IF;
    
    -- CRITICAL SECURITY: Acquire advisory lock to prevent race conditions
    -- This ensures only one bootstrap can proceed at a time
    -- Lock key 847292 is reserved for bootstrap operations
    PERFORM pg_advisory_xact_lock(847292);
    
    -- SAFETY CHECK 1: Ensure no OWNER exists (now protected by lock)
    SELECT COUNT(*) INTO v_owner_count
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name = 'OWNER';
    
    IF v_owner_count > 0 THEN
        RAISE EXCEPTION 'Bootstrap denied: An OWNER already exists. This function can only be used to create the first OWNER.';
    END IF;
    
    -- SAFETY CHECK 2: Ensure the authenticated user doesn't already have a profile
    SELECT id INTO v_existing_user_id
    FROM public.users
    WHERE id = v_auth_user_id;
    
    IF v_existing_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'Bootstrap denied: User profile already exists for this authenticated user.';
    END IF;
    
    -- Get OWNER role ID
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE name = 'OWNER';
    
    IF v_owner_role_id IS NULL THEN
        RAISE EXCEPTION 'System error: OWNER role not found in database.';
    END IF;
    
    -- Create application user profile using AUTHENTICATED user's data
    INSERT INTO public.users (id, email, full_name, phone, status, created_at, updated_at)
    VALUES (v_auth_user_id, v_auth_email, p_full_name, p_phone, 'active', NOW(), NOW());
    
    -- Assign OWNER role
    INSERT INTO public.user_roles (user_id, role_id, assigned_at, assigned_by)
    VALUES (v_auth_user_id, v_owner_role_id, NOW(), v_auth_user_id);
    
    -- Log bootstrap event (trusted audit entry)
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, meta, created_at)
    VALUES (
        v_auth_user_id,
        'create',
        'users',
        v_auth_user_id,
        jsonb_build_object(
            'id', v_auth_user_id,
            'email', v_auth_email,
            'full_name', p_full_name,
            'phone', p_phone,
            'status', 'active'
        ),
        jsonb_build_object(
            'action_type', 'bootstrap_first_owner',
            'role_assigned', 'OWNER'
        ),
        NOW()
    );
    
    RETURN 'First OWNER account created successfully. User ID: ' || v_auth_user_id::text;
END;
$$;

-- ============================================================================
-- EXECUTE PRIVILEGE HARDENING
-- ============================================================================

-- Revoke EXECUTE from public (default behavior, but explicit for clarity)
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_owner(TEXT, TEXT) FROM PUBLIC;

-- Grant EXECUTE only to authenticated users
-- This ensures only users with valid Supabase Auth sessions can call this function
-- The function itself performs additional security checks (auth.uid(), etc.)
GRANT EXECUTE ON FUNCTION public.bootstrap_first_owner(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify the function exists:
-- SELECT routine_name, security_type 
-- FROM information_schema.routines 
-- WHERE routine_name = 'bootstrap_first_owner';
-- Expected: bootstrap_first_owner, DEFINER

-- Verify function signature (should only accept 2 parameters):
-- SELECT pg_get_function_arguments(oid) 
-- FROM pg_proc 
-- WHERE proname = 'bootstrap_first_owner';
-- Expected: p_full_name text, p_phone text DEFAULT NULL::text

-- Verify EXECUTE privileges:
-- SELECT grantee, privilege_type 
-- FROM information_schema.role_routine_grants 
-- WHERE routine_name = 'bootstrap_first_owner';
-- Expected: authenticated role has EXECUTE privilege

-- Test that the function is callable (but will fail if OWNER exists):
-- SELECT public.bootstrap_first_owner('Test User', '+92 300 1234567');
-- Expected: Either success (if no OWNER) or error message about OWNER existing
