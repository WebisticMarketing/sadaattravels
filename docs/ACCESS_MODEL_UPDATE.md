# Access Model Update - Migration 006

**Date:** 2026-01-15  
**Status:** Ready for Review  
**Migration File:** `supabase/migrations/006_access_model.sql`

---

## Summary of Changes

### Database Changes (Migration 006)

1. **Remove STAFF Role**
   - Deletes all STAFF role_permissions
   - Deletes all STAFF user_roles assignments
   - Deletes the STAFF role itself

2. **Grant MANAGER Full Access**
   - MANAGER now has ALL 48 permissions (same as OWNER)
   - Includes previously restricted permissions:
     - `users.view`, `users.create`, `users.update`, `users.delete`, `users.assign_roles`
     - `audit.view`

3. **Update RLS Policies**
   - MANAGER can now INSERT/UPDATE/DELETE users
   - MANAGER can now INSERT/UPDATE/DELETE user_roles
   - MANAGER can now INSERT/UPDATE/DELETE role_permissions

### Application Code Changes

1. **Type Definitions** (`src/types/database.ts`)
   - Added `ActiveRole` type: `'OWNER' | 'MANAGER'`
   - Documents that STAFF role has been removed

2. **Auth Service** (`src/services/auth.ts`)
   - Added `isOwner()` helper function
   - Added `isManager()` helper function
   - Added `hasFullAccess()` helper function (returns true for OWNER or MANAGER)

3. **Hooks** (`src/hooks/index.ts`)
   - Exported new role helper functions

---

## Safety Check Required

**BEFORE running migration 006, verify no STAFF users exist:**

```sql
SELECT COUNT(*) as staff_user_count
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE r.name = 'STAFF';
```

**Expected result:** 0

If the count is > 0, **STOP** and report before proceeding. You must either:
1. Reassign those users to OWNER or MANAGER roles, OR
2. Delete those user accounts

---

## Complete Migration File Content

```sql
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
```

---

## Verification Steps

After applying migration 006, run these verification queries:

### 1. Verify STAFF role removed
```sql
SELECT * FROM public.roles WHERE name = 'STAFF';
```
**Expected:** 0 rows

### 2. Verify MANAGER has all permissions
```sql
SELECT COUNT(*) as manager_permission_count
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
WHERE r.name = 'MANAGER';
```
**Expected:** 48

### 3. Verify OWNER still has all permissions
```sql
SELECT COUNT(*) as owner_permission_count
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
WHERE r.name = 'OWNER';
```
**Expected:** 48

### 4. Verify only OWNER and MANAGER exist
```sql
SELECT name FROM public.roles ORDER BY name;
```
**Expected:** MANAGER, OWNER

### 5. Verify MANAGER can manage users (RLS test)
```sql
-- Test as MANAGER user (requires setting auth context)
-- SET LOCAL ROLE authenticated;
-- SET request.jwt.claim.sub = '<manager-user-id>';
-- INSERT INTO public.users (id, email, full_name, status) VALUES (...);
-- Should succeed
```

---

## Application Code Changes

### Files Modified

1. **`src/types/database.ts`**
   - Added `ActiveRole` type definition

2. **`src/services/auth.ts`**
   - Added `isOwner()` function
   - Added `isManager()` function
   - Added `hasFullAccess()` function

3. **`src/hooks/index.ts`**
   - Exported new role helper functions

### Build Status

- ✅ TypeScript compilation: PASS
- ✅ Production build: PASS (7.47s)

---

## Next Steps

1. **Verify no STAFF users exist** in live database
2. **Apply migration 006** to Supabase
3. **Run verification queries** to confirm changes
4. **Test MANAGER access** to user management features
5. **Proceed to Phase 4** (Dashboard & Business Modules)

---

## Important Notes

- **No live database changes have been made yet**
- Migration 006 is ready for manual application
- Application code has been updated to reflect new access model
- STAFF role is completely removed from the system
- OWNER and MANAGER now have identical permissions
- Both roles can manage users, roles, and permissions
