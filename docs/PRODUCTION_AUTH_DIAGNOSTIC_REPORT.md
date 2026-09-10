# Production Authorization Issue - Diagnostic Report

**Date:** 2026-01-15  
**Issue:** OWNER account sees "Access Denied" after successful login  
**Status:** CODE FIX APPLIED - DATABASE VERIFICATION REQUIRED

---

## Root Cause Analysis

### Identified Problem

The `resolveAuthUser()` function in `src/services/auth.ts` was **swallowing database/RLS errors** and treating them as "no profile/roles". This caused the application to show "Access Denied" even when the user was authorized.

### Code Fix Applied

✅ **Fixed error handling in `resolveAuthUser()`:**
- Now throws errors instead of swallowing them
- Distinguishes between "no profile" and "database error"
- Errors are properly propagated to the UI

✅ **Updated `ProtectedRoute` component:**
- Now checks for auth resolution errors
- Shows "System Error" with retry button for database errors
- Shows "Access Denied" only for genuinely unauthorized users

### Files Changed

1. `src/services/auth.ts` - Fixed error handling in `resolveAuthUser()`
2. `src/components/ProtectedRoute.tsx` - Added error state handling
3. `docs/PRODUCTION_AUTH_DIAGNOSTIC_REPORT.md` - This diagnostic report

---

## Database Verification Required

The code fix addresses the error handling issue, but we need to verify the database state to ensure there are no RLS policy issues.

### CRITICAL: Run These SQL Queries in Supabase SQL Editor

Please run the following queries in the Supabase SQL Editor to verify the database state:

#### Query 1: Verify auth.users contains the OWNER

```sql
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'awaiskhn.contact@gmail.com';
```

**Expected result:** One row with the OWNER's details

---

#### Query 2: Verify public.users contains the same UUID

```sql
SELECT 
  id,
  email,
  full_name,
  phone,
  status,
  created_at,
  updated_at
FROM public.users
WHERE email = 'awaiskhn.contact@gmail.com';
```

**Expected result:** One row with:
- `id` matching the auth.users.id from Query 1
- `status` = 'active'
- `full_name` = 'Awais Khan'

---

#### Query 3: Verify the UUIDs match

```sql
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  pu.id as public_user_id,
  pu.email as public_email,
  pu.status,
  CASE 
    WHEN au.id = pu.id THEN 'MATCH'
    ELSE 'MISMATCH - PROBLEM!'
  END as id_match_status
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email = 'awaiskhn.contact@gmail.com';
```

**Expected result:** One row with `id_match_status` = 'MATCH'

---

#### Query 4: Verify user_roles contains OWNER role assignment

```sql
SELECT 
  ur.user_id,
  ur.role_id,
  r.name as role_name,
  ur.assigned_at
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
JOIN public.users u ON u.id = ur.user_id
WHERE u.email = 'awaiskhn.contact@gmail.com';
```

**Expected result:** One row with:
- `role_name` = 'OWNER'
- `user_id` matching the user's ID

---

#### Query 5: Verify OWNER role exists in public.roles

```sql
SELECT 
  id,
  name,
  description,
  created_at
FROM public.roles
WHERE name = 'OWNER';
```

**Expected result:** One row with the OWNER role details

---

#### Query 6: Verify OWNER has permissions assigned

```sql
SELECT 
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM public.roles r
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
WHERE r.name = 'OWNER'
GROUP BY r.name;
```

**Expected result:** One row with `permission_count` > 0 (should be 48)

---

#### Query 7: Check RLS policies on public.users

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

**Expected result:** Should show:
- `users_select_own` - allows users to read their own profile
- `users_select_owner_manager` - allows OWNER/MANAGER to read all profiles
- `users_update` - allows users to update their own profile
- `users_insert` - allows OWNER to insert users
- `users_delete` - allows OWNER to delete users

---

#### Query 8: Check RLS policies on public.user_roles

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;
```

**Expected result:** Should show:
- `user_roles_select` - allows users to see their own roles
- `user_roles_insert` - allows OWNER to insert roles
- `user_roles_update` - allows OWNER to update roles
- `user_roles_delete` - allows OWNER to delete roles

---

#### Query 9: Check has_role() function

```sql
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'has_role';
```

**Expected result:** Should show the `has_role()` function definition with `SECURITY DEFINER`

---

#### Query 10: Test RLS access as the authenticated user

```sql
-- This simulates what happens when the user queries their own profile
-- Replace the UUID with the actual user ID from Query 1
SET LOCAL ROLE authenticated;
SET request.jwt.claim.sub = '041652bc-df36-405e-ba29-a44815a6626e';

-- Try to read the user's own profile
SELECT 
  id,
  email,
  full_name,
  status
FROM public.users
WHERE id = '041652bc-df36-405e-ba29-a44815a6626e';

-- Try to read the user's roles
SELECT 
  ur.user_id,
  r.name as role_name
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE ur.user_id = '041652bc-df36-405e-ba29-a44815a6626e';

-- Reset role
RESET ROLE;
```

**Expected result:** Both queries should return data. If they return 0 rows or an error, there's an RLS policy issue.

---

## Possible Root Causes

Based on the diagnostic queries, the issue could be:

### 1. Missing or Mismatched User IDs
- auth.users.id doesn't match public.users.id
- **Fix:** Update public.users.id to match auth.users.id

### 2. Missing user_roles Entry
- No entry in user_roles for this user
- **Fix:** Insert the OWNER role assignment

### 3. RLS Policy Issue
- RLS policies preventing the user from reading their own data
- **Fix:** Verify and fix RLS policies

### 4. Database Error Being Swallowed
- Code was swallowing errors (FIXED in this update)
- **Fix:** Code fix applied - errors now properly thrown

### 5. Auth Initialization Race Condition
- ProtectedRoute rendering before profile/roles are loaded
- **Fix:** Code already handles loading state correctly

---

## Next Steps

### Step 1: Run Diagnostic Queries

Run all 10 diagnostic queries above in Supabase SQL Editor and report the results.

### Step 2: Analyze Results

Based on the query results, we'll determine the exact root cause:

- **If Query 3 shows MISMATCH:** User ID mismatch - need to fix public.users.id
- **If Query 4 returns 0 rows:** Missing role assignment - need to insert user_roles entry
- **If Query 10 returns 0 rows or error:** RLS policy issue - need to fix RLS policies
- **If all queries return expected data:** Issue was the error swallowing (now fixed)

### Step 3: Apply Database Fix (if needed)

Based on the diagnostic results, we'll apply the minimal database fix:

#### Fix A: Update User ID (if mismatched)

```sql
-- ONLY RUN IF Query 3 SHOWS MISMATCH
UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'awaiskhn.contact@gmail.com')
WHERE email = 'awaiskhn.contact@gmail.com';
```

#### Fix B: Insert Role Assignment (if missing)

```sql
-- ONLY RUN IF Query 4 RETURNS 0 ROWS
INSERT INTO public.user_roles (user_id, role_id, assigned_at)
SELECT 
  pu.id,
  r.id,
  NOW()
FROM public.users pu
CROSS JOIN public.roles r
WHERE pu.email = 'awaiskhn.contact@gmail.com'
AND r.name = 'OWNER';
```

#### Fix C: Fix RLS Policies (if Query 10 fails)

This would require a more complex fix. Please report the exact error from Query 10.

---

## Code Changes Summary

### 1. src/services/auth.ts

**Before:**
```typescript
if (profileError) {
  logError(profileError, 'resolveAuthUser:profile');
}
// Continued execution even with error
```

**After:**
```typescript
if (profileError) {
  logError(profileError, 'resolveAuthUser:profile');
  throw new Error(`Failed to fetch user profile: ${profileError.message}`);
}
```

**Impact:** Database/RLS errors are now thrown instead of being swallowed.

### 2. src/components/ProtectedRoute.tsx

**Before:**
```typescript
// No error handling
if (!user?.profile || !user.roles || user.roles.length === 0) {
  return <div>Access Denied</div>;
}
```

**After:**
```typescript
// Check for auth resolution errors
if (error && (error.code === 'SESSION_RESTORE_FAILED' || error.code === 'LOGIN_FAILED')) {
  return <div>System Error - Retry</div>;
}

// Then check authorization
if (!user?.profile || !user.roles || user.roles.length === 0) {
  return <div>Access Denied</div>;
}
```

**Impact:** System errors show "System Error" with retry button, not "Access Denied".

---

## Testing Checklist

After applying the code fix and any necessary database fixes, test:

- [ ] Login with OWNER account
- [ ] Verify dashboard loads (no "Access Denied")
- [ ] Refresh page - session persists
- [ ] Navigate between pages - no errors
- [ ] Logout and login again - works
- [ ] Check browser console for errors
- [ ] Verify no "Access Denied" for OWNER

---

## Security Verification

✅ **No security weakening:**
- RLS policies unchanged
- OWNER protection intact
- MANAGER access intact
- No service-role key in frontend
- No passwords stored in application tables

✅ **Error handling improved:**
- Database errors properly thrown
- System errors distinguished from authorization errors
- No sensitive information exposed to users

---

## Final Report

**Code Fix Status:** ✅ APPLIED  
**Database Verification:** ⏳ PENDING (requires SQL query results)  
**Build Status:** ✅ PASS (after code changes)  
**Deployment Status:** ⏳ PENDING (after database verification)

---

**Next Action:** Run the 10 diagnostic SQL queries and report the results so we can determine if any database fixes are needed.
