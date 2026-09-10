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
-- - Checks that no OWNER exists before allowing bootstrap
-- - Prevents duplicate OWNER creation
-- - Logs bootstrap event to audit_logs
-- - SET search_path = public to prevent search_path manipulation attacks

-- ============================================================================
-- BOOTSTRAP FUNCTION: Create First OWNER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_first_owner(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_count INTEGER;
    v_owner_role_id UUID;
    v_existing_user_id UUID;
BEGIN
    -- SAFETY CHECK 1: Ensure no OWNER exists
    SELECT COUNT(*) INTO v_owner_count
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name = 'OWNER';
    
    IF v_owner_count > 0 THEN
        RAISE EXCEPTION 'Bootstrap denied: An OWNER already exists. This function can only be used to create the first OWNER.';
    END IF;
    
    -- SAFETY CHECK 2: Ensure the auth user ID doesn't already have a profile
    SELECT id INTO v_existing_user_id
    FROM public.users
    WHERE id = p_user_id;
    
    IF v_existing_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'Bootstrap denied: User profile already exists for this auth user.';
    END IF;
    
    -- Get OWNER role ID
    SELECT id INTO v_owner_role_id
    FROM public.roles
    WHERE name = 'OWNER';
    
    IF v_owner_role_id IS NULL THEN
        RAISE EXCEPTION 'System error: OWNER role not found in database.';
    END IF;
    
    -- Create application user profile
    INSERT INTO public.users (id, email, full_name, phone, status, created_at, updated_at)
    VALUES (p_user_id, p_email, p_full_name, p_phone, 'active', NOW(), NOW());
    
    -- Assign OWNER role
    INSERT INTO public.user_roles (user_id, role_id, assigned_at, assigned_by)
    VALUES (p_user_id, v_owner_role_id, NOW(), p_user_id);
    
    -- Log bootstrap event
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, meta, created_at)
    VALUES (
        p_user_id,
        'create',
        'users',
        p_user_id,
        jsonb_build_object(
            'id', p_user_id,
            'email', p_email,
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
    
    RETURN 'First OWNER account created successfully. User ID: ' || p_user_id::text;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify the function exists:
-- SELECT routine_name, security_type 
-- FROM information_schema.routines 
-- WHERE routine_name = 'bootstrap_first_owner';
-- Expected: bootstrap_first_owner, DEFINER

-- Test that the function is callable (but will fail if OWNER exists):
-- SELECT public.bootstrap_first_owner(
--     '00000000-0000-0000-0000-000000000000'::uuid,
--     'test@example.com',
--     'Test User'
-- );
-- Expected: Either success (if no OWNER) or error message about OWNER existing
