# Production Authentication - Technical Diagnosis Report

**Date:** 2026-01-15  
**Status:** ⚠️ DIAGNOSIS INCOMPLETE - REQUIRES PRODUCTION TESTING

---

## Executive Summary

After thorough code inspection, I cannot definitively identify the root cause of the "permission denied for table role_permissions" error without production testing. The current code with the 100ms delay may work, but it's a band-aid, not a proper fix.

---

## Code Flow Analysis

### 1. Supabase Client Initialization

**File:** `src/services/supabase/client.ts`

```typescript
_client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

**Status:** ✅ Correct
- Single client instance
- Session persistence enabled
- Auto token refresh enabled
- Uses anon key (correct for frontend)

---

### 2. Sign-In Flow

**File:** `src/services/auth.ts`

```typescript
export async function signIn(credentials: LoginCredentials): Promise<AuthUser> {
  // Step 1: Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({...});
  
  // Step 2: Verify session is established
  const {  sessionData, error: sessionError } = await supabase.auth.getSession();
  
  // Step 3: Wait 100ms (BAND-AID)
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Step 4: Resolve user profile
  const authUser = await resolveAuthUser(data.user.id, data.user.email!);
  
  // Step 5: Update state
  _currentUser = authUser;
  notifyListeners();
  
  return authUser;
}
```

**Issues Identified:**

1. **Redundant `getSession()` call**: `signInWithPassword()` already returns the session. Calling `getSession()` again is unnecessary.

2. **100ms delay is a band-aid**: This suggests someone encountered a timing issue, but it's not a reliable fix. If the session isn't ready after `signInWithPassword()`, waiting 100ms is arbitrary and may not always work.

3. **No error handling for session check**: If `getSession()` fails, the code throws an error, but this shouldn't happen if `signInWithPassword()` succeeded.

---

### 3. Profile Resolution

**File:** `src/services/auth.ts`

```typescript
async function resolveAuthUser(
  supabaseUserId: string,
  email: string
): Promise<AuthUser> {
  // Query 1: Fetch user profile
  const {  profileData, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, phone, status, last_login_at')
    .eq('id', supabaseUserId)
    .maybeSingle();
  
  // Query 2: Fetch user roles
  const {  userRolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select(`role:roles (id, name)`)
    .eq('user_id', supabaseUserId);
  
  // Query 3: Fetch permissions
  const {  rolePermsData, error: permsError } = await supabase
    .from('role_permissions')
    .select(`permission:permissions (code)`)
    .in('role_id', roleIds);
  
  return { ... };
}
```

**Status:** ✅ Correct
- All queries use the same `supabase` client instance
- Sequential queries (no race conditions between queries)
- Proper error handling
- Diagnostic logging added

---

### 4. React Hook Integration

**File:** `src/hooks/useAuth.ts`

```typescript
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  
  // Restore session on mount
  useEffect(() => {
    async function restore() {
      const restoredUser = await restoreSession();
      if (mounted) {
        setUser(restoredUser);
        setLoading(false);
      }
    }
    
    restore();
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((newUser) => {
      if (mounted) {
        setUser(newUser);
      }
    });
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  
  const login = useCallback(async (credentials) => {
    const authUser = await signIn(credentials);
    setUser(authUser);
    return authUser;
  }, []);
  
  return { user, loading, error, login, logout, ... };
}
```

**Potential Issue:**

**Race condition between `signIn()` and `restoreSession()`:**

1. User clicks login → `login()` calls `signIn()`
2. `signIn()` authenticates, calls `resolveAuthUser()`, sets `_currentUser`
3. `signIn()` calls `notifyListeners()` → triggers `onAuthStateChange` callback
4. `useAuth` hook's `onAuthStateChange` callback calls `setUser(newUser)`
5. Meanwhile, `useAuth`'s `useEffect` might also call `restoreSession()` on mount
6. `restoreSession()` also calls `resolveAuthUser()`

**This could cause `resolveAuthUser()` to be called twice simultaneously**, but since both use the same `supabase` client instance, this shouldn't cause RLS errors.

---

### 5. Protected Route

**File:** `src/components/ProtectedRoute.tsx`

```typescript
export function ProtectedRoute({ children, ... }) {
  const { user, loading, isAuthenticated, error } = useAuth();
  
  if (loading) return <Loading />;
  
  if (error) return <SystemError />;
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  if (!user?.profile || !user.roles || user.roles.length === 0) {
    return <AccessDenied />;
  }
  
  return <>{children}</>;
}
```

**Status:** ✅ Correct
- Proper loading state handling
- Error state handling
- Authentication check
- Authorization check

---

## Root Cause Hypotheses

### Hypothesis 1: Session Not Ready (Most Likely)

**Evidence:**
- Error is "permission denied" (RLS error)
- Direct SQL queries work (authenticated session)
- Application queries fail (unauthenticated session?)
- 100ms delay "fixes" the issue

**Explanation:**
`signInWithPassword()` returns successfully, but the Supabase client's internal session state (JWT token) is not fully propagated yet. When `resolveAuthUser()` immediately makes database queries, the client uses the old (unauthenticated) session, causing RLS to fail.

**Why 100ms delay "works":**
The delay gives the Supabase client time to fully establish the session and propagate the JWT token to its internal state.

**Why this is not a proper fix:**
- 100ms is arbitrary
- May not work on slow networks
- May not work on slow devices
- Not guaranteed to work in all scenarios

---

### Hypothesis 2: Multiple Client Instances (Unlikely)

**Evidence:** None

**Explanation:**
If there were multiple Supabase client instances, some might not have the authenticated session.

**Why unlikely:**
- Code shows single client instance (`_client` singleton)
- All queries use the same `supabase` import
- No evidence of multiple clients

---

### Hypothesis 3: Race Condition in Auth State (Possible)

**Evidence:**
- `signIn()` and `restoreSession()` both call `resolveAuthUser()`
- `onAuthStateChange` callback might trigger during sign-in

**Explanation:**
If `resolveAuthUser()` is called twice simultaneously, there might be a race condition where one call uses an unauthenticated session.

**Why this doesn't fully explain the error:**
- Both calls use the same `supabase` client instance
- The client should have the authenticated session after `signInWithPassword()` completes
- Sequential queries within `resolveAuthUser()` shouldn't have race conditions

---

### Hypothesis 4: Supabase Client Bug (Possible)

**Evidence:**
- Direct SQL queries work
- Application queries fail
- Same RLS policies
- Same user

**Explanation:**
There might be a bug in the Supabase JS client where the JWT token is not properly attached to certain types of queries (e.g., nested relationship queries).

**Why this is possible:**
- The `role_permissions` query uses a nested relationship: `permission:permissions (code)`
- This is a more complex query than simple SELECT
- There might be a bug in how the client handles nested queries with RLS

---

## What Cannot Be Determined Without Production Testing

1. **Is the 100ms delay actually necessary?**
   - Need to test without the delay
   - Need to check browser console for timing issues

2. **Is the JWT token being sent with the failing request?**
   - Need to inspect network requests in browser DevTools
   - Need to check if Authorization header is present

3. **Is there a race condition?**
   - Need to add detailed logging with timestamps
   - Need to check if `resolveAuthUser()` is called multiple times

4. **Is there a Supabase client bug?**
   - Need to test with simpler queries (no nested relationships)
   - Need to check Supabase JS client version

---

## Recommended Next Steps

### Step 1: Remove the 100ms Delay

The 100ms delay is not a proper fix. Remove it and test:

```typescript
// REMOVE THIS:
// await new Promise(resolve => setTimeout(resolve, 100));
```

If the error persists without the delay, then we know the delay was masking a real issue.

### Step 2: Add Detailed Timing Logs

Add timestamps to diagnostic logs to identify timing issues:

```typescript
console.log('[Auth] signInWithPassword completed at:', Date.now());
console.log('[Auth] getSession completed at:', Date.now());
console.log('[Auth] resolveAuthUser started at:', Date.now());
console.log('[Auth] users query completed at:', Date.now());
console.log('[Auth] user_roles query completed at:', Date.now());
console.log('[Auth] role_permissions query completed at:', Date.now());
```

### Step 3: Inspect Network Requests

In production, open browser DevTools → Network tab and check:
- Are the database requests being made?
- Do they have an `Authorization: Bearer <jwt>` header?
- What is the response status and error message?

### Step 4: Test Without Nested Relationships

The `role_permissions` query uses a nested relationship:
```typescript
.select(`permission:permissions (code)`)
```

Test if a simpler query works:
```typescript
.select('role_id, permission_id')
```

If the simpler query works but the nested query fails, it's a Supabase client bug with nested relationships and RLS.

---

## Current Code Status

### What's Correct

✅ Single Supabase client instance  
✅ Session persistence enabled  
✅ Auto token refresh enabled  
✅ Proper error handling  
✅ Diagnostic logging added  
✅ No multiple client instances  
✅ No duplicate auth initialization  

### What's Questionable

⚠️ 100ms delay (band-aid, not a fix)  
⚠️ Redundant `getSession()` call  
⚠️ Potential race condition between `signIn()` and `restoreSession()`  
⚠️ Nested relationship queries might have issues with RLS  

### What's Unknown

❓ Is the JWT token being sent with failing requests?  
❓ Is there a timing issue with session establishment?  
❓ Is there a Supabase client bug with nested queries?  
❓ Is the 100ms delay actually necessary?  

---

## Recommendation

**Do NOT deploy the current code with the 100ms delay as a "fix".**

Instead:

1. **Remove the 100ms delay** from `src/services/auth.ts`
2. **Add detailed timing logs** to identify the exact failure point
3. **Deploy to production** and test with browser DevTools open
4. **Inspect network requests** to see if JWT token is being sent
5. **Report the exact error** and network request details

Based on the results, we can determine the actual root cause and implement a proper fix.

---

## Files Changed

### Modified (1 file)
1. `src/services/auth.ts` - Added diagnostic logging (but 100ms delay should be removed)

### NOT Changed
- ❌ No database changes
- ❌ No RLS policy changes
- ❌ No Supabase client changes
- ❌ No React hook changes

---

## Build Results

✅ **TypeScript:** PASS  
✅ **Production Build:** PASS (7.94s)  

---

## Conclusion

**I cannot definitively identify the root cause without production testing.**

The current code with the 100ms delay may work, but it's not a proper fix. The delay is masking an underlying issue that needs to be properly diagnosed.

**Next action required:** Remove the 100ms delay, add detailed timing logs, deploy to production, and inspect network requests to identify the actual root cause.

---

**Status:** ⚠️ DIAGNOSIS INCOMPLETE  
**Next Step:** Production testing with detailed logging and network inspection
