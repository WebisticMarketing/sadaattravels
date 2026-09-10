# Administrative Scripts

This directory contains secure administrative scripts for the Sadaat Travels Management System.

## ⚠️ Security Warning

These scripts use the **Supabase Service Role Key** which has full administrative access to your Supabase project. 

**NEVER:**
- Commit `.env` file to Git (it's already in `.gitignore`)
- Share your service-role key with anyone
- Use these scripts in production without proper security review
- Expose the service-role key to the browser (never use `VITE_` prefix)

## Available Scripts

### reset-password.js

Securely reset a Supabase Auth user's password using the Admin API.

#### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   TARGET_USER_EMAIL=user@example.com
   NEW_PASSWORD=NewSecurePassword123
   ```

   **Where to find these values:**
   - `SUPABASE_URL`: Supabase Dashboard → Settings → API → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → Service Role Key (secret)
   - `TARGET_USER_EMAIL`: Email of the user whose password you want to reset
   - `NEW_PASSWORD`: The new password to set (minimum 6 characters)

#### Usage

```bash
node scripts/reset-password.js
```

#### Example Output

```
🔐 Sadaat Travels - Secure Password Reset
==========================================

Target User: awaiskhn.contact@gmail.com
Supabase URL: https://cjwkdmjcjhxsdcunspac.supabase.co

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
   Password: NewSecurePassword123

⚠️  SECURITY REMINDER:
   - Delete this script if it was a one-time operation
   - Never commit .env file with service-role key to Git
   - Keep your service-role key secret and secure
```

#### Security Best Practices

1. **One-time use**: After resetting the password, consider deleting the script and removing the sensitive variables from `.env`

2. **Secure environment**: Only run this script on trusted, secure machines

3. **Strong passwords**: Use strong, unique passwords (minimum 6 characters, but 12+ recommended)

4. **Audit logging**: The password change will be logged in Supabase Auth logs

5. **Immediate cleanup**: After use, remove `TARGET_USER_EMAIL` and `NEW_PASSWORD` from `.env`

## Adding New Scripts

When adding new administrative scripts:

1. Use the service-role key from environment variables (never hardcode)
2. Validate all inputs thoroughly
4. Provide clear error messages
5. Document the script in this README
6. Consider if the script should be deleted after use

## Alternative: Supabase Dashboard

For simple operations like password resets, you can also use the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Go to **Authentication** → **Users**
4. Find the user and click the three dots menu
5. Select **Reset Password**
6. Enter new password and confirm

This is often simpler for one-time operations and doesn't require running scripts.

## Troubleshooting

### "Missing required environment variables"

Make sure your `.env` file has all required variables and is in the project root directory.

### "User not found"

Verify the email address exists in Supabase:
- Go to Supabase Dashboard → Authentication → Users
- Check if the email is listed

### "Failed to update password"

Check that:
- Your service-role key is correct
- The user exists in Supabase Auth
- The password meets minimum requirements (6+ characters)

### "Permission denied" or "Unauthorized"

Your service-role key may be incorrect or expired. Get a new one from:
Supabase Dashboard → Settings → API → Service Role Key

## Support

For issues or questions:
1. Check the Supabase documentation: https://supabase.com/docs
2. Review Supabase Auth Admin API: https://supabase.com/docs/reference/javascript/auth-admin
3. Check Supabase Dashboard logs for error details
