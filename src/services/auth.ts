/**
 * Authentication service layer.
 *
 * Handles all Supabase Auth operations:
 * - Login / logout
 * - Session management
 * - User profile resolution
 * - Role and permission checking
 * - Audit logging for auth events
 */

import { supabase } from './supabase';
import { logError } from '../utils/errors';

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  /** Supabase auth user ID */
  id: string;
  /** Supabase auth email */
  email: string;
  /** Application user profile (may be null if not yet created) */
  profile: UserProfile | null;
  /** User's roles */
  roles: string[];
  /** User's permissions (derived from roles) */
  permissions: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: string;
  last_login_at: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
}

// ============================================================================
// Session State
// ============================================================================

let _currentUser: AuthUser | null = null;
let _sessionListeners: Array<(user: AuthUser | null) => void> = [];

function notifyListeners() {
  _sessionListeners.forEach((listener) => listener(_currentUser));
}

// ============================================================================
// Core Auth Operations
// ============================================================================

/**
 * Sign in with email and password.
 */
export async function signIn(credentials: LoginCredentials): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    throw mapAuthError(error);
  }

  if (!data.user) {
    throw new Error('Authentication succeeded but no user data returned.');
  }

  // Resolve application profile
  const authUser = await resolveAuthUser(data.user.id, data.user.email!);

  // Update last login timestamp
  await updateLastLogin(authUser.id);

  // Log login audit event
  await logAuditEvent('login', {
    user_id: authUser.id,
    email: authUser.email,
  });

  _currentUser = authUser;
  notifyListeners();

  return authUser;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  const userId = _currentUser?.id;
  const email = _currentUser?.email;

  const { error } = await supabase.auth.signOut();
  if (error) {
    logError(error, 'signOut');
  }

  // Log logout audit event
  if (userId) {
    await logAuditEvent('logout', {
      user_id: userId,
      email: email || 'unknown',
    });
  }

  _currentUser = null;
  notifyListeners();
}

// ============================================================================
// Password Management
// ============================================================================

/**
 * Change password for the current authenticated user.
 * Requires verification of current password for security.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!_currentUser) {
    throw new Error('No authenticated user');
  }

  // Verify current password by attempting to sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: _currentUser.email,
    password: currentPassword,
  });

  if (verifyError) {
    throw new Error('Current password is incorrect');
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    throw mapAuthError(updateError);
  }

  // Log password change audit event
  await logAuditEvent('password_change', {
    user_id: _currentUser.id,
    email: _currentUser.email,
  });
}

/**
 * Request password reset email.
 * Sends a recovery email with a reset link.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    // Don't reveal if email exists or not for security
    // Just log the error internally
    logError(error, 'requestPasswordReset');
    throw new Error('If an account exists with this email, a reset link has been sent');
  }

  // Log password reset request audit event
  // Note: We don't have the user_id here since we can't query by email
  // The audit log will record the email in metadata
  await logAuditEvent('password_reset_requested', {
    email: email,
  });
}

/**
 * Reset password using recovery token.
 * Called after user clicks the reset link in their email.
 */
export async function resetPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw mapAuthError(error);
  }

  // Get current user for audit logging
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Log password reset completion audit event
    await logAuditEvent('password_reset_completed', {
      user_id: user.id,
      email: user.email,
    });
  }
}

/**
 * Restore session from Supabase (e.g., after page refresh).
 */
export async function restoreSession(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    logError(error, 'restoreSession');
    return null;
  }

  if (!data.session?.user) {
    _currentUser = null;
    notifyListeners();
    return null;
  }

  const authUser = await resolveAuthUser(
    data.session.user.id,
    data.session.user.email!
  );

  _currentUser = authUser;
  notifyListeners();

  return authUser;
}

/**
 * Get the current authenticated user (synchronous).
 */
export function getCurrentUser(): AuthUser | null {
  return _currentUser;
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  _sessionListeners.push(callback);
  return () => {
    _sessionListeners = _sessionListeners.filter((l) => l !== callback);
  };
}

// ============================================================================
// User Profile Resolution
// ============================================================================

/**
 * Resolve the application user profile from Supabase auth user.
 */
async function resolveAuthUser(
  supabaseUserId: string,
  email: string
): Promise<AuthUser> {
  // Fetch application user profile
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, phone, status, last_login_at')
    .eq('id', supabaseUserId)
    .maybeSingle();

  if (profileError) {
    logError(profileError, 'resolveAuthUser:profile');
  }

  const profile = profileData as UserProfile | null;

  // If no profile exists, return user with null profile
  // This is a valid state — the user is authenticated but hasn't been
  // added to the application's users table yet.
  if (!profile) {
    return {
      id: supabaseUserId,
      email,
      profile: null,
      roles: [],
      permissions: [],
    };
  }

  // Fetch user roles
  const { data: userRolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role:roles (
        id,
        name
      )
    `)
    .eq('user_id', supabaseUserId);

  if (rolesError) {
    logError(rolesError, 'resolveAuthUser:roles');
  }

  const userRoles = (userRolesData || []) as unknown as Array<{ role: { id: string; name: string } | null }>;
  const roles = userRoles
    .map((ur) => ur.role?.name)
    .filter((name): name is string => Boolean(name));

  // Fetch permissions for user's roles
  let permissions: string[] = [];
  if (roles.length > 0) {
    const roleIds = userRoles
      .map((ur) => ur.role?.id)
      .filter((id): id is string => Boolean(id));

    const { data: rolePermsData, error: permsError } = await supabase
      .from('role_permissions')
      .select(`
        permission:permissions (
          code
        )
      `)
      .in('role_id', roleIds);

    if (permsError) {
      logError(permsError, 'resolveAuthUser:permissions');
    }

    const rolePerms = (rolePermsData || []) as unknown as Array<{ permission: { code: string } | null }>;
    permissions = [
      ...new Set(
        rolePerms
          .map((rp) => rp.permission?.code)
          .filter((code): code is string => Boolean(code))
      ),
    ];
  }

  return {
    id: profile.id,
    email: profile.email,
    profile: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      status: profile.status,
      last_login_at: profile.last_login_at,
    },
    roles,
    permissions,
  };
}

// ============================================================================
// Bootstrap Support (REMOVED - No longer needed in production)
// ============================================================================
// Bootstrap functionality has been removed from the production application.
// The bootstrap_first_owner database function remains in the database for
// emergency/initialization purposes only, but is not exposed through the UI.

// ============================================================================
// Role & Permission Helpers
// ============================================================================

/**
 * Check if the current user has a specific role.
 * 
 * Active roles: OWNER, MANAGER
 * Note: STAFF role has been removed from the system.
 */
export function hasRole(role: string): boolean {
  return _currentUser?.roles.includes(role) ?? false;
}

/**
 * Check if the current user is an OWNER.
 */
export function isOwner(): boolean {
  return hasRole('OWNER');
}

/**
 * Check if the current user is a MANAGER.
 */
export function isManager(): boolean {
  return hasRole('MANAGER');
}

/**
 * Check if the current user has full access (OWNER or MANAGER).
 * Both roles have identical permissions in the current system.
 */
export function hasFullAccess(): boolean {
  return isOwner() || isManager();
}

/**
 * Check if the current user has a specific permission.
 */
export function hasPermission(permission: string): boolean {
  return _currentUser?.permissions.includes(permission) ?? false;
}

/**
 * Check if the current user has ANY of the specified roles.
 */
export function hasAnyRole(roles: string[]): boolean {
  return roles.some((role) => hasRole(role));
}

/**
 * Check if the current user has ALL of the specified permissions.
 */
export function hasAllPermissions(permissions: string[]): boolean {
  return permissions.every((perm) => hasPermission(perm));
}

/**
 * Require a specific permission or throw an error.
 */
export function requirePermission(permission: string): void {
  if (!hasPermission(permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Require a specific role or throw an error.
 */
export function requireRole(role: string): void {
  if (!hasRole(role)) {
    throw new Error(`Role required: ${role}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Update the user's last login timestamp.
 */
async function updateLastLogin(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() } as any)
    .eq('id', userId);

  if (error) {
    logError(error, 'updateLastLogin');
  }
}

/**
 * Log an authentication audit event.
 */
async function logAuditEvent(
  action: import('../types/database').AuditAction,
  metadata: Record<string, any>
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: _currentUser?.id || null,
    action,
    meta: metadata,
    ip_address: null, // Would need to be captured from request context
    user_agent: navigator.userAgent,
  } as any);

  if (error) {
    logError(error, 'logAuditEvent');
  }
}

/**
 * Map Supabase auth errors to user-friendly messages.
 */
function mapAuthError(error: any): AuthError {
  const message = error.message || 'An authentication error occurred.';

  // Map common Supabase error messages
  if (message.includes('Invalid login credentials')) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    };
  }

  if (message.includes('Email not confirmed')) {
    return {
      code: 'EMAIL_NOT_CONFIRMED',
      message: 'Please confirm your email address before signing in.',
    };
  }

  if (message.includes('Too many requests')) {
    return {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again later.',
    };
  }

  return {
    code: error.code || 'AUTH_ERROR',
    message: 'An error occurred during authentication. Please try again.',
  };
}
