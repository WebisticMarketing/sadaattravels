# Initial Owner Password Setup Guide

This guide explains how to securely set up the initial password for the OWNER account in the Sadaat Travels Management System.

## Overview

The Sadaat Travels system uses Supabase Auth for authentication. The service-role key (which has admin privileges) must **never** be exposed to the browser. This guide provides a secure method to set the initial password using a server-side script.

## Prerequisites

Before proceeding, ensure you have:

1. ✅ Supabase project created and configured
2. ✅ Database migrations applied (all 8 migrations)
3. ✅ OWNER user created in `public.users` table
4. ✅ OWNER role assigned to the user
5. ✅ Node.js installed on your machine
6. ✅ Access to the project repository

## Current Owner Account Status

Based on the provided information:

- **Email:** `awaiskhn.contact@gmail.com`
- **Auth User ID:** `041652bc-df36-405e-ba29-a44815a6626e`
- **Full Name:** Awais Khan
- **Status:** active
- **Role:** OWNER (Role ID: `95368f8f-ff35-48ff-9581-4ef1c54fcd79`)

The user exists in both `auth.users` and `public.users` tables with the OWNER role assigned.

## Step-by-Step Setup

### Step 1: Get Your Supabase Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/)
2. Select your Sadaat Travels project
3. Navigate to **Settings** → **API**
4. Find the **Service Role Key** section
5. Click **Reveal** to see the key
6. **Copy the key** (it's a long JWT token starting with `eyJ...`)

⚠️ **WARNING:** The service role key has full admin access to your Supabase project. Treat it like a master password. Never share it, commit it to Git, or expose it to the browser.

### Step 2: Configure Environment Variables

1. Open (or create) the `.env` file in the project root
2. Add the following variables:

```env
# Server-side variables (for admin scripts only)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Password reset configuration
TARGET_USER_EMAIL=awaiskhn.contact@gmail.com
NEW_PASSWORD=YourNewSecurePassword123
```

**Replace:**
- `SUPABASE_URL` with your actual Supabase project URL (found in Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` with the service role key you copied
- `TARGET_USER_EMAIL` with the owner's email (already set correctly)
- `NEW_PASSWORD` with a strong password (minimum 6 characters, but 12+ recommended)

### Step 3: Run the Password Reset Script

```bash
node scripts/reset-password.js
```

**Expected Output:**

```
🔐 Sadaat Travels - Secure Password Reset
==========================================

Target User: awaiskhn.contact@gmail.com
Supabase URL: https://your-project.supabase.co

🔍 Looking up user...
✅ Found user: awaiskhn.contact@gmail.com (ID: 041652bc-df36-405e-ba29-a44815a6626e)

🔄 Updating password...
✅ Password updated successfully!

📋 User Details:
   Email: awaiskhn.contact@gmail.com
   ID: 041652bc-df36-405e-ba29-a44815a6626e
   Created: 2026-01-15T10:30:00.000Z
   Last Sign In: Never

🎉 You can now log in with:
   Email: awaiskhn.contact@gmail.com
   Password: YourNewSecurePassword123

⚠️  SECURITY REMINDER:
   - Delete this script if it was a one-time operation
   - Never commit .env file with service-role key to Git
   - Keep your service-role key secret and secure
```

### Step 4: Verify Login

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to the login page (usually `http://localhost:5173`)

3. Log in with:
   - **Email:** `awaiskhn.contact@gmail.com`
   - **Password:** The password you set in Step 2

4. You should be redirected to the dashboard with full OWNER access

### Step 5: Clean Up (IMPORTANT)

After successfully setting the password:

1. **Remove sensitive variables from `.env`:**
   ```env
   # Remove these lines after password reset
   TARGET_USER_EMAIL=...
   NEW_PASSWORD=...
   ```

2. **Keep the service role key secure:**
   - You can keep `SUPABASE_SERVICE_ROLE_KEY` in `.env` for future admin tasks
   - Or remove it if you don't need it anymore
   - Never commit `.env` to Git (it's already in `.gitignore`)

3. **Optional: Delete the script**
   - If this was a one-time operation, you can delete `scripts/reset-password.js`
   - Or keep it for future password resets (it's secure and well-documented)

## Security Verification

After completing the setup, verify the following:

### 1. Service Role Key Not Exposed

Check that the service role key is not in the client bundle:

```bash
# Build the project
npm run build

# Search for service role key in the build output
grep -r "SUPABASE_SERVICE_ROLE_KEY" dist/
# Should return no results
```

### 2. Owner Account Intact

Verify the owner account is still properly configured:

```sql
-- Run this in Supabase SQL Editor

-- Check auth.users
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
WHERE email = 'awaiskhn.contact@gmail.com';

-- Check public.users
SELECT id, email, full_name, status, created_at
FROM public.users
WHERE email = 'awaiskhn.contact@gmail.com';

-- Check role assignment
SELECT u.email, r.name as role
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
WHERE u.email = 'awaiskhn.contact@gmail.com';
```

**Expected Results:**
- User exists in both tables with matching IDs
- Status is 'active'
- Role is 'OWNER'

### 3. Login Works

- Can log in with the new password
- Redirected to dashboard after login
- Can access all OWNER-restricted features
- No authentication errors

## Alternative: Supabase Dashboard

If you prefer not to use the script, you can reset the password directly in the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/)
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Find the user `awaiskhn.contact@gmail.com`
5. Click the **three dots menu** (⋮) on the right
6. Select **Reset Password**
7. Enter the new password
8. Click **Reset Password**

This method is simpler but requires manual intervention in the dashboard.

## Troubleshooting

### Error: "Missing required environment variables"

**Cause:** The `.env` file is missing or incomplete.

**Solution:**
1. Check that `.env` exists in the project root
2. Verify all required variables are present:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TARGET_USER_EMAIL`
   - `NEW_PASSWORD`

### Error: "User not found"

**Cause:** The target user email doesn't exist in Supabase Auth.

**Solution:**
1. Verify the email is correct: `awaiskhn.contact@gmail.com`
2. Check if the user exists in Supabase Dashboard → Authentication → Users
3. If the user doesn't exist, create it first (see Database Setup section)

### Error: "Failed to update password"

**Cause:** The service role key is invalid or the user doesn't exist.

**Solution:**
1. Verify the service role key is correct (copy it again from Supabase Dashboard)
2. Check that the user exists in `auth.users` table
3. Ensure the service role key has not been revoked

### Error: "Permission denied" or "Unauthorized"

**Cause:** The service role key is incorrect or expired.

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Regenerate the service role key if needed
3. Update `.env` with the new key
4. Run the script again

### Login Fails After Password Reset

**Cause:** The password was not set correctly or there's a caching issue.

**Solution:**
1. Clear browser cache and cookies
2. Try logging in again with the new password
3. Check that the email is exactly `awaiskhn.contact@gmail.com` (no typos)
4. Verify the password meets minimum requirements (6+ characters)

## Security Best Practices

### 1. Service Role Key Security

- ✅ Store in `.env` file (never in code)
- ✅ `.env` is in `.gitignore` (never committed)
- ✅ Only use in server-side scripts (never in browser)
- ✅ Rotate the key periodically if compromised
- ✅ Use environment-specific keys (dev/staging/prod)

### 2. Password Security

- ✅ Use strong passwords (12+ characters, mixed case, numbers, symbols)
- ✅ Never share passwords in plain text
- ✅ Use a password manager
- ✅ Enable 2FA if available
- ✅ Change passwords regularly

### 3. Environment Variables

- ✅ Never prefix server-side variables with `VITE_` (exposes to browser)
- ✅ Use clear naming: `SUPABASE_SERVICE_ROLE_KEY` (not `VITE_SUPABASE_SERVICE_ROLE_KEY`)
- ✅ Document which variables are server-side only
- ✅ Review `.env` before committing (should never be committed)

### 4. Audit Logging

- ✅ All authentication events are logged in `public.audit_logs`
- ✅ Review logs periodically for suspicious activity
- ✅ Monitor failed login attempts
- ✅ Track password changes

## Database Verification

To verify the owner account is properly set up, run these queries in Supabase SQL Editor:

```sql
-- 1. Check auth.users table
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'awaiskhn.contact@gmail.com';

-- 2. Check public.users table
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

-- 3. Check role assignment
SELECT 
  u.id,
  u.email,
  u.full_name,
  r.name as role_name,
  r.id as role_id,
  ur.assigned_at
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
WHERE u.email = 'awaiskhn.contact@gmail.com';

-- 4. Verify OWNER role exists
SELECT id, name, description
FROM public.roles
WHERE name = 'OWNER';

-- 5. Check permissions assigned to OWNER role
SELECT 
  r.name as role_name,
  p.code as permission_code,
  p.name as permission_name,
  p.module
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE r.name = 'OWNER'
ORDER BY p.module, p.code;
```

## Next Steps

After successfully setting up the owner password:

1. ✅ Log in to the application
2. ✅ Verify all OWNER features are accessible
3. ✅ Create additional users if needed (Users & Permissions module)
4. ✅ Configure business modules (Buses, Trips, etc.)
5. ✅ Test the complete workflow
6. ✅ Deploy to production (when ready)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs in Dashboard → Logs
3. Check browser console for errors
4. Verify all environment variables are correct
5. Ensure database migrations were applied successfully

## Summary

**What you need to do:**

1. Get service role key from Supabase Dashboard
2. Add to `.env` file with other required variables
3. Run `node scripts/reset-password.js`
4. Verify login works
5. Clean up sensitive variables from `.env`

**Security guarantees:**

- ✅ Service role key never exposed to browser
- ✅ Password never logged or stored in code
- ✅ All operations use secure server-side script
- ✅ Audit trail maintained in database
- ✅ Existing owner account remains intact

**After completion:**

- ✅ Owner can log in with new password
- ✅ Full OWNER access verified
- ✅ System ready for use
- ✅ Security maintained

---

**Last Updated:** 2026-01-15  
**Script Version:** 1.0  
**Status:** Ready for use
