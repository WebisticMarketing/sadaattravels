# Role-Gated RLS Security Model

**Date:** 2026-01-15  
**Migration:** `008_role_gated_rls.sql`  
**Status:** Ready for Application

---

## Overview

Migration 008 implements role-gated Row Level Security (RLS) policies that restrict business data access to users with OWNER or MANAGER roles only. This closes a critical security gap where any authenticated Supabase user could access business data, even without an application profile or assigned role.

---

## Security Model

### Before Migration 008

**Problem:** Business tables used `public.is_authenticated()` for RLS policies.

```sql
-- OLD (Insecure)
CREATE POLICY "buses_select" ON public.buses
    FOR SELECT USING (public.is_authenticated());
```

**Issue:** Any authenticated Supabase Auth user could access business data, even if they:
- Had no application profile in `public.users`
- Had no assigned role in `public.user_roles`
- Were not authorized to use the Sadaat Travels system

### After Migration 008

**Solution:** Business tables now use `public.has_role('OWNER') OR public.has_role('MANAGER')`.

```sql
-- NEW (Secure)
CREATE POLICY "buses_select" ON public.buses
    FOR SELECT USING (public.has_role('OWNER') OR public.has_role('MANAGER'));
```

**Result:** Only users with OWNER or MANAGER roles can access business data.

---

## Access Matrix

| User State | Business Data Access | Audit Logs | Bootstrap |
|------------|---------------------|------------|-----------|
| Not authenticated | ❌ Denied | ❌ Denied | N/A |
| Authenticated, no profile | ❌ Denied | ❌ Denied | ✅ Available |
| Authenticated, profile, no role | ❌ Denied | ❌ Denied | ❌ N/A |
| Authenticated, OWNER role | ✅ Full access | ✅ Full access | ❌ N/A |
| Authenticated, MANAGER role | ✅ Full access | ✅ Full access | ❌ N/A |

---

## Protected Tables

Migration 008 updates RLS policies for the following business tables:

### Core Business Data
- `buses` - Bus fleet management
- `trips` - Trip records
- `trip_revenue_entries` - Trip revenue line items
- `trip_expenses` - Trip expense line items
- `maintenance_records` - Bus maintenance history
- `tyre_records` - Tyre purchase/replacement records

### Fuel Management
- `fuel_purchases` - Fuel purchase records
- `fuel_sales` - Fuel sales (internal and external)
- `fuel_stock_snapshots` - Fuel stock reconciliation
- `fuel_stock_adjustments` - Stock adjustments
- `fuel_sale_expense_links` - Internal fuel to trip expense links

### Adda Operations
- `adda_income` - Adda income records
- `adda_expenses` - Adda expense records

### Cargo Operations
- `cargo_records` - Cargo shipment records

### Installments
- `installments` - Loan records (given/taken)
- `installment_payments` - Loan payment records

### Audit & Security
- `audit_logs` - System audit trail (restricted to OWNER/MANAGER)

---

## Unchanged Policies

The following policies remain unchanged to support role resolution:

### Roles & Permissions Metadata
- `roles` - Role definitions (readable by authenticated users)
- `permissions` - Permission definitions (readable by authenticated users)
- `user_roles` - User role assignments (users can see their own)
- `role_permissions` - Role permission mappings (readable by authenticated users)

**Why:** The application needs to read role/permission metadata to resolve user roles. However, reading metadata alone does NOT grant business data access.

### Users Table
- `users` - User profiles (managed by Migration 006 policies)
  - Users can read their own profile
  - OWNER/MANAGER can read all profiles
  - OWNER/MANAGER can manage users

### Personal Expenses
- `personal_expenses` - Personal expense records (Migration 003 policies)
  - Restricted to OWNER/MANAGER only

---

## Bootstrap Function Unaffected

The `bootstrap_first_owner()` function from Migration 007 uses `SECURITY DEFINER`, which means it executes with the privileges of the function owner (typically `postgres`), not the calling user.

**Result:** The bootstrap function can still create the first OWNER account even though business tables are now role-gated.

```sql
-- Migration 007 bootstrap function
CREATE OR REPLACE FUNCTION public.bootstrap_first_owner(...)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- ← Executes with elevated privileges
SET search_path = public
AS $$
  -- Can insert into public.users and public.user_roles
  -- even though those tables are role-gated
$$;
```

---

## Application-Level Protection

### ProtectedRoute Component

The `ProtectedRoute` component now enforces three levels of protection:

#### 1. Authentication Check
```typescript
if (!isAuthenticated) {
  return <Navigate to="/login" state={{ from: location }} replace />;
}
```
**Result:** Unauthenticated users are redirected to login.

#### 2. Bootstrap Check
```typescript
if (needsBootstrap) {
  return <Navigate to="/bootstrap" replace />;
}
```
**Result:** Authenticated users without a profile are redirected to bootstrap.

#### 3. Role Check (NEW)
```typescript
if (user?.profile && (!user.roles || user.roles.length === 0)) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          Your account has not been assigned a role. Please contact an administrator.
        </p>
        <p className="text-sm text-gray-500">
          Only users with OWNER or MANAGER roles can access the application.
        </p>
      </div>
    </div>
  );
}
```
**Result:** Authenticated users with a profile but no role see an "Access Denied" message.

---

## User Flow Scenarios

### Scenario 1: First-Time Bootstrap

1. User creates Supabase Auth account
2. User logs in to application
3. `needsBootstrap` is true (no profile in `public.users`)
4. User is redirected to `/bootstrap`
5. User completes bootstrap form
6. `bootstrap_first_owner()` creates profile and assigns OWNER role
7. User is redirected to dashboard with full access

**RLS Impact:** Bootstrap function uses SECURITY DEFINER, so it can insert into role-gated tables.

### Scenario 2: Authenticated User Without Role

1. User has Supabase Auth account
2. User has profile in `public.users` (created by OWNER/MANAGER)
3. User has NO role in `public.user_roles`
4. User logs in to application
5. `needsBootstrap` is false (profile exists)
6. `user.roles` is empty
7. ProtectedRoute shows "Access Denied" message
8. User cannot access any business data

**RLS Impact:** Even if user bypasses frontend, RLS blocks all business data access.

### Scenario 3: OWNER/MANAGER Access

1. User has Supabase Auth account
2. User has profile in `public.users`
3. User has OWNER or MANAGER role in `public.user_roles`
4. User logs in to application
5. `needsBootstrap` is false
6. `user.roles` contains 'OWNER' or 'MANAGER'
7. ProtectedRoute allows access
8. User can access all business data

**RLS Impact:** RLS allows access because `has_role('OWNER') OR has_role('MANAGER')` is true.

---

## Verification Queries

### Test 1: Unauthenticated User

```sql
-- Should return 0 rows or error
SELECT * FROM public.buses;
```

**Expected:** RLS blocks access (no authenticated user).

### Test 2: Authenticated User Without Role

```sql
-- Set auth context to user without role
SET LOCAL ROLE authenticated;
SET request.jwt.claim.sub = '<user-without-role-id>';

-- Should return 0 rows
SELECT * FROM public.buses;
```

**Expected:** RLS blocks access (no OWNER/MANAGER role).

### Test 3: OWNER Role

```sql
-- Set auth context to OWNER
SET LOCAL ROLE authenticated;
SET request.jwt.claim.sub = '<owner-user-id>';

-- Should return data
SELECT * FROM public.buses;
```

**Expected:** RLS allows access (has OWNER role).

### Test 4: MANAGER Role

```sql
-- Set auth context to MANAGER
SET LOCAL ROLE authenticated;
SET request.jwt.claim.sub = '<manager-user-id>';

-- Should return data
SELECT * FROM public.buses;
```

**Expected:** RLS allows access (has MANAGER role).

---

## Security Guarantees

### Database Level (RLS)

1. ✅ Business tables require OWNER or MANAGER role
2. ✅ Audit logs require OWNER or MANAGER role
3. ✅ Bootstrap function uses SECURITY DEFINER (unaffected)
4. ✅ Role/permission metadata readable for role resolution
5. ✅ No bypass possible without OWNER/MANAGER role

### Application Level (ProtectedRoute)

1. ✅ Unauthenticated users redirected to login
2. ✅ Authenticated users without profile redirected to bootstrap
3. ✅ Authenticated users without role see "Access Denied"
4. ✅ OWNER/MANAGER users can access application
5. ✅ Defense in depth (frontend + database)

---

## Migration Application

### Prerequisites

- Migrations 001-007 must be applied
- OWNER account must exist (via bootstrap)
- At least one OWNER or MANAGER must be able to access the system

### Apply Migration 008

```sql
-- In Supabase SQL Editor, run:
-- Copy contents of: supabase/migrations/008_role_gated_rls.sql
```

### Verify Application

After applying, verify:

1. OWNER can access business data
2. MANAGER can access business data
3. Authenticated user without role cannot access business data
4. Bootstrap function still works (if needed)

---

## Rollback Plan

If issues arise, rollback by re-applying Migration 003 policies:

```sql
-- Revert to authentication-only policies
-- (NOT RECOMMENDED - this reopens the security gap)

-- Example for buses table
DROP POLICY IF EXISTS "buses_select" ON public.buses;
CREATE POLICY "buses_select" ON public.buses
    FOR SELECT USING (public.is_authenticated());
```

**Warning:** Rolling back reopens the security gap. Only rollback if absolutely necessary and fix the underlying issue.

---

## Summary

Migration 008 closes a critical security gap by implementing role-gated RLS policies. The new security model ensures:

- ✅ Only OWNER/MANAGER users can access business data
- ✅ Authenticated users without roles are blocked
- ✅ Bootstrap function remains functional
- ✅ Defense in depth (frontend + database)
- ✅ Clear access denied messaging for unauthorized users

**Status:** Ready for application to live Supabase database.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-15  
**Migration:** 008_role_gated_rls.sql  
**Status:** READY FOR APPLICATION
