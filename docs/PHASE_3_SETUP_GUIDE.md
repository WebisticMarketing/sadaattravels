# Phase 3 - Supabase Setup Guide

**Status:** Code Complete - Requires Manual Setup  
**Date:** 2026-01-15

---

## ⚠️ IMPORTANT: Manual Steps Required

The authentication code is complete and verified, but **I cannot directly connect to your Supabase project** from this environment. You need to complete the following steps manually.

This guide will walk you through:
1. Applying database migrations
2. Verifying the database setup
3. Creating the first OWNER account
4. Testing authentication

---

## Step 1: Configure Environment Variables

Create a `.env` file in the project root (this file is gitignored):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Application
VITE_APP_NAME=Sadaat Travels
VITE_APP_ENV=development
```

**Where to find these values:**
1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** → paste as `VITE_SUPABASE_URL`
5. Copy **anon public** key → paste as `VITE_SUPABASE_ANON_KEY`

**⚠️ NEVER commit `.env` to Git. It's already in `.gitignore`.**

---

## Step 2: Apply Database Migrations

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. For each migration file in order:
   - Open the file: `supabase/migrations/001_initial_schema.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Wait for completion (should show "Success. No rows returned")
   - Repeat for:
     - `002_indexes.sql`
     - `003_rls_policies.sql`
     - `004_seed_data.sql`
     - `005_final_corrections.sql`

### Option B: Using Supabase CLI (Alternative)

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

---

## Step 3: Verify Database Setup

After applying all migrations, verify the setup:

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `supabase/verify_migrations.sql`
3. Copy and paste the entire contents
4. Click **Run**
5. Check all results show **✓ PASS**

**Expected results:**
- Tables: 23+ tables created
- Enums: 6 enums created
- Roles: 3 roles (OWNER, MANAGER, STAFF)
- Permissions: 49+ permissions
- RLS: Enabled on all tables
- Functions: 4 helper functions
- Indexes: 60+ indexes

---

## Step 4: Create First OWNER Account

### 4.1 Create Supabase Auth User

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Add user** → **Create new user**
3. Enter:
   - Email: `owner@sadaat.pk` (or your preferred email)
   - Password: (choose a strong password)
   - ☑ Auto Confirm User
4. Click **Create user**
5. **Copy the User UID** (you'll need this in the next step)

### 4.2 Create Application User Profile

1. Go to **SQL Editor**
2. Run this query (replace `<USER_UID>` with the UID you copied):

```sql
-- Create application user profile
INSERT INTO public.users (id, email, full_name, phone, status)
VALUES (
  '<USER_UID>',
  'owner@sadaat.pk',
  'System Owner',
  NULL,
  'active'
);

-- Assign OWNER role
INSERT INTO public.user_roles (user_id, role_id, assigned_by)
SELECT 
  '<USER_UID>',
  r.id,
  '<USER_UID>'
FROM public.roles r
WHERE r.name = 'OWNER';
```

3. Click **Run**
4. Verify with:

```sql
-- Verify user and role assignment
SELECT 
  u.email,
  u.full_name,
  u.status,
  r.name as role_name
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
WHERE u.email = 'owner@sadaat.pk';
```

Expected result:
```
email              | full_name    | status | role_name
-------------------|--------------|--------|----------
owner@sadaat.pk    | System Owner | active | OWNER
```

---

## Step 5: Test Authentication

### 5.1 Start Development Server

```bash
npm run dev
```

### 5.2 Test Login Flow

1. Open browser to `http://localhost:5173`
2. You should be redirected to `/login`
3. Enter your OWNER credentials:
   - Email: `owner@sadaat.pk`
   - Password: (the password you set)
4. Click **Sign in**
5. You should be redirected to `/app/dashboard`
6. Verify you see the dashboard

### 5.3 Test Session Persistence

1. While logged in, refresh the page (F5)
2. You should remain logged in
3. Close the browser completely
4. Reopen browser and go to `http://localhost:5173`
5. You should still be logged in

### 5.4 Test Logout

1. Click the logout button (or navigate to logout)
2. You should be redirected to `/login`
3. Try to access `/app/dashboard` directly
4. You should be redirected back to `/login`

---

## Step 6: Verify RLS Policies

### 6.1 Test Authenticated Access

In SQL Editor, run:

```sql
-- Set the current user (replace with your UID)
SET LOCAL ROLE authenticated;
SET request.jwt.claim.sub = '<USER_UID>';

-- Try to access data
SELECT COUNT(*) FROM public.buses;
SELECT COUNT(*) FROM public.roles;
SELECT COUNT(*) FROM public.permissions;
```

All queries should succeed (return 0 or more rows).

### 6.2 Test Unauthenticated Access

```sql
-- Reset to anonymous
RESET ROLE;

-- Try to access data (should fail)
SELECT COUNT(*) FROM public.buses;
```

This should return an error like:
```
ERROR: new row violates row-level security policy for table "buses"
```

---

## Step 7: Verify Audit Logging

After logging in and out, check audit logs:

```sql
SELECT 
  action,
  user_id,
  meta,
  created_at
FROM public.audit_logs
WHERE action IN ('login', 'logout')
ORDER BY created_at DESC
LIMIT 10;
```

You should see login and logout events.

---

## Verification Checklist

Complete this checklist to confirm Phase 3 is fully working:

### Database Setup
- [ ] All 5 migrations applied successfully
- [ ] 23+ tables created
- [ ] 6 enums created
- [ ] 3 roles seeded (OWNER, MANAGER, STAFF)
- [ ] 49+ permissions seeded
- [ ] RLS enabled on all tables
- [ ] 4 helper functions created
- [ ] 60+ indexes created

### OWNER Account
- [ ] Supabase auth user created
- [ ] Application user profile created in `public.users`
- [ ] OWNER role assigned
- [ ] User can log in successfully

### Authentication
- [ ] Login works with correct credentials
- [ ] Login fails with wrong password (shows error)
- [ ] Session persists on page refresh
- [ ] Session persists on browser close/reopen
- [ ] Logout works
- [ ] Protected routes redirect to login when not authenticated

### Authorization
- [ ] OWNER can access all routes
- [ ] RLS blocks unauthenticated access
- [ ] RLS allows authenticated access
- [ ] Permission checks work

### Audit Logging
- [ ] Login event logged
- [ ] Logout event logged
- [ ] Audit logs contain user_id, action, timestamp

### Build Validation
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No build errors

---

## Troubleshooting

### Migration Fails

**Error:** `relation "users" already exists`
- **Solution:** Database already has tables. Either use a fresh project or drop existing tables first.

**Error:** `permission denied for schema auth`
- **Solution:** You need to be logged in as the project owner in Supabase Dashboard.

**Error:** `type "user_status" already exists`
- **Solution:** Migration already applied. Skip to next migration.

### Cannot Login

**Error:** `Invalid login credentials`
- **Solution:** Check email and password. Ensure user is confirmed in Supabase Auth.

**Error:** `User not found in public.users`
- **Solution:** The user exists in `auth.users` but not in `public.users`. Run the SQL from Step 4.2.

### RLS Blocks Access

**Error:** `new row violates row-level security policy`
- **Solution:** Ensure you're logged in. Check that the user has the correct role assigned.

### Session Not Persisting

**Issue:** User gets logged out on refresh
- **Solution:** Check browser console for errors. Ensure Supabase URL and anon key are correct in `.env`.

---

## Next Steps After Phase 3

Once all verification steps pass:

1. **Phase 4:** Build Dashboard
   - Financial overview
   - Quick stats
   - Recent activity

2. **Phase 5:** Build Buses Module
   - Bus fleet management
   - Bus details
   - Maintenance tracking

3. **Phase 6:** Build Trips Module
   - Trip creation
   - Revenue/expense tracking
   - Seat booking validation

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs in Dashboard → **Logs**
3. Check browser console for errors
4. Verify `.env` file has correct credentials
5. Ensure all migrations were applied in order

---

## Summary

**What's Been Verified:**
✅ All code is complete and correct  
✅ Migration files are ready and properly ordered  
✅ Authentication logic is implemented  
✅ Protected routes are configured  
✅ Build passes successfully  

**What Requires Manual Action:**
⏳ Apply migrations to Supabase  
⏳ Create OWNER user  
⏳ Test authentication flow  
⏳ Verify RLS policies  
⏳ Test audit logging  

**Estimated Time:** 15-30 minutes

---

**Phase 3 code is complete. Follow this guide to finish setup with your Supabase project.**
