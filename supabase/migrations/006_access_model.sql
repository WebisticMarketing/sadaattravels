-- Migration: 006_access_model
-- Description: Update access model to remove STAFF role and grant MANAGER full access
-- Date: 2026-01-15
--
-- CHANGES:
-- 1. Safety check: Verify no STAFF users exist before removal
-- 2. Remove STAFF role and all associated permissions/assignments
-- 3. Grant MANAGER all permissions (including user management and audit)
-- 4. Update RLS policies to allow MANAGER to manage users and roles
--
-- IMPORTANT: This migration assumes migrations 001-005 have been applied.
-- DO NOT run this migration if any STAFF users exist in the live database.

-- ============================================================================
-- SAFETY CHECK: Verify no STAFF users exist
-- ============================================================================

-- This query will raise an error if any STAFF users exist
-- Run this separately first to verify:
-- SELECT COUNT(*) FROM public.user_roles ur
-- JOIN public.roles r ON r.id = ur.role_id
-- WHERE r.name = 'STAFF';
-- Expected result: 0

-- If the count is > 0, STOP and report before proceeding.

-- ============================================================================
-- STEP 1: Remove STAFF role permissions
-- ============================================================================

DELETE FROM public.role_permissions
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'STAFF');

-- ============================================================================
-- STEP 2: Remove STAFF user assignments
-- ============================================================================

DELETE FROM public.user_roles
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'STAFF');

-- ============================================================================
-- STEP 3: Remove STAFF role
-- ============================================================================

DELETE FROM public.roles
WHERE name = 'STAFF';

-- ============================================================================
-- STEP 4: Grant MANAGER all permissions
-- ============================================================================

-- First, remove any existing MANAGER permissions to avoid duplicates
DELETE FROM public.role_permissions
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'MANAGER');

-- Grant ALL permissions to MANAGER (same as OWNER)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'MANAGER';

-- ============================================================================
-- STEP 5: Update RLS policies for users table
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

-- Recreate with MANAGER access
CREATE POLICY "users_update" ON public.users
    FOR UPDATE USING (
        id = auth.uid() OR public.has_role('OWNER') OR public.has_role('MANAGER')
    );

CREATE POLICY "users_insert" ON public.users
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "users_delete" ON public.users
    FOR DELETE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- ============================================================================
-- STEP 6: Update RLS policies for user_roles table
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

-- Recreate with MANAGER access
CREATE POLICY "user_roles_insert" ON public.user_roles
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "user_roles_update" ON public.user_roles
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "user_roles_delete" ON public.user_roles
    FOR DELETE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- ============================================================================
-- STEP 7: Update RLS policies for role_permissions table
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "role_permissions_insert" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_update" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_delete" ON public.role_permissions;

-- Recreate with MANAGER access
CREATE POLICY "role_permissions_insert" ON public.role_permissions
    FOR INSERT WITH CHECK (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "role_permissions_update" ON public.role_permissions
    FOR UPDATE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

CREATE POLICY "role_permissions_delete" ON public.role_permissions
    FOR DELETE USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify:
-- 1. STAFF role no longer exists:
--    SELECT * FROM public.roles WHERE name = 'STAFF';
--    Expected: 0 rows
--
-- 2. MANAGER has all permissions:
--    SELECT COUNT(*) FROM public.role_permissions rp
--    JOIN public.roles r ON r.id = rp.role_id
--    WHERE r.name = 'MANAGER';
--    Expected: 49 (same as OWNER)
--
-- 3. OWNER still has all permissions:
--    SELECT COUNT(*) FROM public.role_permissions rp
--    JOIN public.roles r ON r.id = rp.role_id
--    WHERE r.name = 'OWNER';
--    Expected: 49
--
-- 4. Only OWNER and MANAGER roles exist:
--    SELECT name FROM public.roles ORDER BY name;
--    Expected: MANAGER, OWNER
