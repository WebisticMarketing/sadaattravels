-- Migration: 010_fix_user_profile_rls
-- Description: Fix RLS policy for users table to prevent circular dependency
-- Date: 2026-01-15
--
-- PURPOSE:
-- The original users_select policy created a circular dependency by checking
-- has_role('OWNER') OR has_role('MANAGER'), which requires querying user_roles,
-- which also has role checks. This could cause profile lookups to fail silently.
--
-- FIX:
-- Split the policy into two separate policies:
-- 1. users_select_own - Allows users to read their own profile (no role check)
-- 2. users_select_owner_manager - Allows OWNER/MANAGER to read all profiles
--
-- This ensures users can always read their own profile without role checks.

-- ============================================================================
-- FIX USERS TABLE RLS POLICY
-- ============================================================================

-- Drop the old policy
DROP POLICY IF EXISTS "users_select" ON public.users;

-- Create new policy: Users can always read their own profile
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (id = auth.uid());

-- Create new policy: OWNER/MANAGER can read all profiles
CREATE POLICY "users_select_owner_manager" ON public.users
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After applying this migration, verify:

-- 1. Test with authenticated user (any role):
--    SELECT * FROM public.users WHERE id = auth.uid();
--    -- Should return the user's own profile

-- 2. Test with OWNER role:
--    SELECT * FROM public.users;
--    -- Should return all users

-- 3. Test with MANAGER role:
--    SELECT * FROM public.users;
--    -- Should return all users

-- 4. Test with no role:
--    SELECT * FROM public.users WHERE id != auth.uid();
--    -- Should return 0 rows (can only see own profile)
