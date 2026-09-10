# First OWNER Bootstrap Guide

**Version:** 1.0  
**Date:** 2026-01-15  
**Status:** Ready for Implementation

---

## Overview

This guide explains how to create the first OWNER account for the Sadaat Travels Management System. The bootstrap process is required because the system uses Row Level Security (RLS) to protect all data, and no one can create the first OWNER without special bootstrap mechanisms.

---

## Prerequisites

Before starting the bootstrap process, ensure:

1. ✅ All 7 migrations have been applied to Supabase (001-007)
2. ✅ You have created a Supabase Auth user via the Supabase Dashboard
3. ✅ You have the user's email and password
4. ✅ The application is running (`npm run dev`)

---

## Bootstrap Methods

The system provides **two bootstrap methods**:

### Method 1: Automated Bootstrap (Recommended)

The application includes a bootstrap page that guides you through the process.

**Steps:**

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Navigate to the login page:**
   ```
   http://localhost:5173/login
   ```

3. **Login with your Supabase Auth credentials:**
   - Email: (the email you created in Supabase Dashboard)
   - Password: (the password you set)

4. **Automatic redirect to bootstrap page:**
   - After login, the system detects you have no application profile
   - You are automatically redirected to `/bootstrap`

5. **Complete the bootstrap form:**
   - Enter your full name
   - (Optional) Enter your phone number
   - Click "Create OWNER Account"

6. **Verification:**
   - You should see "✓ Bootstrap Successful"
   - After 2 seconds, you are redirected to the dashboard
   - You now have full OWNER access

**What happens behind the scenes:**
- The application calls the `bootstrap_first_owner()` database function
- The function creates your profile in `public.users`
- The function assigns the OWNER role in `public.user_roles`
- An audit log entry is created
- Your session is refreshed with the new profile and permissions

---

### Method 2: Manual SQL Bootstrap

If the automated bootstrap fails or you prefer manual control, you can use SQL.

**Steps:**

1. **Get your Supabase Auth User ID:**
   
   Go to Supabase Dashboard → Authentication → Users
   
   Find your user and copy the "UID" (UUID format)

2. **Open Supabase SQL Editor:**
   
   Go to Supabase Dashboard → SQL Editor → New Query

3. **Run the bootstrap function:**

   ```sql
   -- Replace these values with your actual data
   SELECT public.bootstrap_first_owner(
     'YOUR-USER-UUID-HERE'::uuid,  -- Your Supabase Auth UID
     'your.email@example.com',      -- Your email
     'Your Full Name',              -- Your full name
     '+92 300 1234567'              -- Your phone (or NULL)
   );
   ```

   **Example:**
   ```sql
   SELECT public.bootstrap_first_owner(
     'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
     'owner@sadaat.pk',
     'Muhammad Ahmed',
     '+92 300 1234567'
   );
   ```

4. **Verify the result:**

   You should see a success message like:
   ```
   First OWNER account created successfully. User ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

5. **Verify the OWNER was created:**

   ```sql
   -- Check user profile
   SELECT id, email, full_name, phone, status
   FROM public.users
   WHERE email = 'your.email@example.com';
   
   -- Check role assignment
   SELECT u.email, r.name as role, ur.assigned_at
   FROM public.users u
   JOIN public.user_roles ur ON ur.user_id = u.id
   JOIN public.roles r ON r.id = ur.role_id
   WHERE u.email = 'your.email@example.com';
   ```

   **Expected result:**
   ```
   email                | role  | assigned_at
   ---------------------|-------|-------------------
   your.email@example.com | OWNER | 2026-01-15 10:30:00
   ```

6. **Login to the application:**
   
   Go to `http://localhost:5173/login` and login with your credentials.
   
   You should be redirected to the dashboard with full OWNER access.

---

## Security Features

The bootstrap function includes multiple security checks:

### 1. Single-Use Protection
```sql
-- Check that no OWNER exists
SELECT COUNT(*) INTO v_owner_count
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE r.name = 'OWNER';

IF v_owner_count > 0 THEN
  RAISE EXCEPTION 'Bootstrap denied: An OWNER already exists.';
END IF;
```

The function **only works if no OWNER exists**. Once an OWNER is created, the bootstrap function becomes permanently disabled.

### 2. Duplicate Prevention
```sql
-- Check that user doesn't already have a profile
SELECT id INTO v_existing_user_id
FROM public.users
WHERE id = p_user_id;

IF v_existing_user_id IS NOT NULL THEN
  RAISE EXCEPTION 'Bootstrap denied: User profile already exists.';
END IF;
```

Prevents creating duplicate profiles for the same auth user.

### 3. Audit Logging
```sql
-- Log bootstrap event
INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, meta)
VALUES (
  p_user_id,
  'create',
  'users',
  p_user_id,
  jsonb_build_object(...),
  jsonb_build_object('action_type', 'bootstrap_first_owner', 'role_assigned', 'OWNER')
);
```

Every bootstrap attempt is logged to the audit trail.

### 4. Search Path Protection
```sql
SECURITY DEFINER
SET search_path = public
```

Prevents search_path manipulation attacks.

---

## Troubleshooting

### Error: "Bootstrap denied: An OWNER already exists"

**Cause:** An OWNER account already exists in the system.

**Solution:** 
- You cannot use the bootstrap function if an OWNER exists
- Ask the existing OWNER to create your account via the user management interface
- Or, if you are the existing OWNER, you already have access - just login

---

### Error: "Bootstrap denied: User profile already exists"

**Cause:** Your Supabase Auth user already has an application profile.

**Solution:**
- Check if you already have an account: `SELECT * FROM public.users WHERE id = 'your-uuid';`
- If you have a profile but no OWNER role, ask an existing OWNER to assign the role
- Or delete the existing profile and try again (not recommended)

---

### Error: "System error: OWNER role not found"

**Cause:** The OWNER role doesn't exist in the `roles` table.

**Solution:**
- Check if migrations 001-007 were applied correctly
- Verify the OWNER role exists: `SELECT * FROM public.roles WHERE name = 'OWNER';`
- If missing, re-run migration 004

---

### Automated bootstrap page doesn't appear

**Cause:** The application may not be detecting the bootstrap state correctly.

**Solution:**
1. Clear browser cache and localStorage
2. Logout and login again
3. Manually navigate to `http://localhost:5173/bootstrap`
4. Check browser console for errors
5. Verify the `needsBootstrap()` function is working correctly

---

### After bootstrap, still no access

**Cause:** Session may not be refreshed properly.

**Solution:**
1. Logout completely
2. Clear browser cache and localStorage
3. Login again
4. Verify you have OWNER role: Check the dashboard shows all features
5. Verify permissions: Open browser console and check `window.__AUTH_USER__` (if available)

---

## Verification Checklist

After completing the bootstrap, verify:

- [ ] You can login to the application
- [ ] You are redirected to the dashboard (not bootstrap page)
- [ ] You can see all navigation items in the sidebar
- [ ] You can access the user management page (when built)
- [ ] You can create new users (when user management is built)
- [ ] You can assign roles to users (when user management is built)
- [ ] The audit log shows the bootstrap event:
  ```sql
  SELECT * FROM public.audit_logs 
  WHERE meta->>'action_type' = 'bootstrap_first_owner'
  ORDER BY created_at DESC
  LIMIT 1;
  ```

---

## What Happens After Bootstrap

Once the first OWNER is created:

1. **You have full system access:**
   - All 48 permissions
   - Can manage users, roles, and permissions
   - Can access all business modules (when built)
   - Can view and manage personal expenses

2. **The bootstrap function is permanently disabled:**
   - No one can use `bootstrap_first_owner()` anymore
   - New users must be created by an existing OWNER or MANAGER

3. **You can create additional users:**
   - Create MANAGER accounts for other administrators
   - MANAGERs can also create users (except OWNER accounts)
   - The last-OWNER protection prevents accidentally removing all OWNERs

4. **Normal user management begins:**
   - Use the user management interface (when built)
   - Assign appropriate roles (OWNER or MANAGER)
   - Manage permissions as needed

---

## Security Best Practices

### 1. Use Strong Passwords
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and symbols
- Don't reuse passwords from other systems

### 2. Enable 2FA (When Available)
- Supabase supports multi-factor authentication
- Enable it for all OWNER accounts
- Consider requiring it for MANAGER accounts

### 3. Regular Audits
- Review audit logs regularly
- Check for unusual login patterns
- Monitor role assignments

### 4. Backup Strategy
- Regular database backups
- Test restore procedures
- Keep backup of OWNER credentials in secure location

### 5. Document OWNER Accounts
- Maintain a secure list of OWNER accounts
- Include contact information for each OWNER
- Update when OWNER accounts change

---

## Next Steps

After completing the bootstrap:

1. **Create MANAGER accounts** for other administrators (when user management is built)
2. **Configure business modules** (buses, trips, fuel, etc.)
3. **Set up initial data** (buses, routes, etc.)
4. **Train users** on system usage
5. **Go live** with the system

---

## Support

If you encounter issues during bootstrap:

1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Check browser console for errors
4. Verify all migrations were applied correctly
5. Contact technical support if needed

---

## Summary

The bootstrap process is a one-time setup required to create the first OWNER account. The system provides both automated and manual methods to accommodate different preferences and scenarios.

**Key Points:**
- ✅ Bootstrap only works if no OWNER exists
- ✅ Automated method is recommended for ease of use
- ✅ Manual SQL method provides full control
- ✅ Security checks prevent misuse
- ✅ Audit trail tracks all bootstrap attempts
- ✅ After bootstrap, normal user management begins

**Time Required:** 5-10 minutes

**Difficulty:** Easy (automated) to Medium (manual SQL)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-15  
**Author:** Sadaat Travels Development Team
