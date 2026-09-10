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

-- This is a REAL safety check that will STOP execution if any STAFF users exist.
-- The migration will FAIL with an exception if STAFF users are found.

DO $$
DECLARE
    staff_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO staff_count
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name = 'STAFF';
    
    IF staff_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % STAFF user(s) exist. Please reassign or remove STAFF users before running this migration.', staff_count;
    END IF;
    
    RAISE NOTICE 'Safety check passed: No STAFF users found. Proceeding with migration.';
END $$;

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
-- OWNER PROTECTION - DATABASE-LEVEL ENFORCEMENT
-- ============================================================================

-- IMPORTANT SAFETY RULE:
-- The database MUST prevent any operation that would leave the system with zero OWNER users.
-- This is enforced at the PostgreSQL level using triggers.

-- Function to check if removing an OWNER role would leave zero OWNERs
CREATE OR REPLACE FUNCTION public.check_last_owner_protection()
RETURNS TRIGGER AS $$
DECLARE
    owner_count INTEGER;
    is_owner_role BOOLEAN;
BEGIN
    -- Check if the role being modified is OWNER
    SELECT EXISTS(
        SELECT 1 FROM public.roles WHERE id = OLD.role_id AND name = 'OWNER'
    ) INTO is_owner_role;
    
    -- If this is not an OWNER role, allow the operation
    IF NOT is_owner_role THEN
        RETURN OLD;
    END IF;
    
    -- Count current OWNER users
    SELECT COUNT(*) INTO owner_count
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name = 'OWNER';
    
    -- If this is the last OWNER, block the operation
    IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last OWNER account. At least one OWNER must exist to prevent system lockout.';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if updating an OWNER role assignment would demote the last OWNER
CREATE OR REPLACE FUNCTION public.check_owner_role_change_protection()
RETURNS TRIGGER AS $$
DECLARE
    old_is_owner BOOLEAN;
    new_is_owner BOOLEAN;
    owner_count INTEGER;
BEGIN
    -- Check if old role was OWNER
    SELECT EXISTS(
        SELECT 1 FROM public.roles WHERE id = OLD.role_id AND name = 'OWNER'
    ) INTO old_is_owner;
    
    -- Check if new role is OWNER
    SELECT EXISTS(
        SELECT 1 FROM public.roles WHERE id = NEW.role_id AND name = 'OWNER'
    ) INTO new_is_owner;
    
    -- If role is not changing from OWNER to non-OWNER, allow
    IF NOT (old_is_owner AND NOT new_is_owner) THEN
        RETURN NEW;
    END IF;
    
    -- Count current OWNER users
    SELECT COUNT(*) INTO owner_count
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name = 'OWNER';
    
    -- If this is the last OWNER being demoted, block
    IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Cannot demote the last OWNER account. At least one OWNER must exist to prevent system lockout.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if deleting a user would remove the last OWNER
CREATE OR REPLACE FUNCTION public.check_user_delete_protection()
RETURNS TRIGGER AS $$
DECLARE
    is_owner BOOLEAN;
    owner_count INTEGER;
BEGIN
    -- Check if the user being deleted is an OWNER
    SELECT EXISTS(
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = OLD.id AND r.name = 'OWNER'
    ) INTO is_owner;
    
    -- If not an OWNER, allow deletion
    IF NOT is_owner THEN
        RETURN OLD;
    END IF;
    
    -- Count current OWNER users
    SELECT COUNT(*) INTO owner_count
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name = 'OWNER';
    
    -- If this is the last OWNER, block deletion
    IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Cannot delete the last OWNER account. At least one OWNER must exist to prevent system lockout.';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for user_roles table
DROP TRIGGER IF EXISTS trigger_check_last_owner_delete ON public.user_roles;
CREATE TRIGGER trigger_check_last_owner_delete
    BEFORE DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_last_owner_protection();

DROP TRIGGER IF EXISTS trigger_check_owner_role_change ON public.user_roles;
CREATE TRIGGER trigger_check_owner_role_change
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_owner_role_change_protection();

-- Create trigger for users table
DROP TRIGGER IF EXISTS trigger_check_last_owner_user_delete ON public.users;
CREATE TRIGGER trigger_check_last_owner_user_delete
    BEFORE DELETE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_delete_protection();

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
--    Expected: 48 (same as OWNER)
--
-- 3. OWNER still has all permissions:
--    SELECT COUNT(*) FROM public.role_permissions rp
--    JOIN public.roles r ON r.id = rp.role_id
--    WHERE r.name = 'OWNER';
--    Expected: 48
--
-- 4. Only OWNER and MANAGER roles exist:
--    SELECT name FROM public.roles ORDER BY name;
--    Expected: MANAGER, OWNER
