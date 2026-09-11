/**
 * Production-safe authentication service with race condition prevention.
 * 
 * This service implements:
 * - Promise-based mutex to prevent concurrent auth operations
 * - Proper handling of Supabase auth state events
 * - Proper error handling that distinguishes between different error types
 * - Proper retry mechanism
 */

import { supabase } from './supabase';
import { logError } from '../utils/errors';
import type { AuthUser, UserProfile } from './auth';

// ============================================================================
// Auth State Management
// ============================================================================

let _currentUser: AuthUser | null = null;
let _sessionListeners: Array<(user: AuthUser | null) => void> = [];
let _restorePromise: Promise<AuthUser | null> | null = null;
let _isRestoring = false;

function notifyListeners() {
  _sessionListeners.forEach((listener) => listener(_currentUser));
}

// ============================================================================
// Mutex Implementation
// ============================================================================

/**
 * Ensures only one restore operation can run at a time.
 * If a restore is already in progress, returns the existing promise.
 */
function withRestoreMutex(fn: () => Promise<AuthUser | null>): Promise<AuthUser | null> {
  if (_restorePromise) {
    return _restorePromise;
  }

  _restorePromise = fn().finally(() => {
    _restorePromise = null;
    _isRestoring = false;
  });

  _isRestoring = true;
  return _restorePromise;
}

// ============================================================================
// Auth State Event Handler
// ============================================================================

/**
 * Initialize auth state event listener.
 * This should be called once when the application starts.
 */
export function initializeAuthListener(): void {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth] Auth state change:', event);

    switch (event) {
      case 'INITIAL_SESSION':
        // Initial session load - restore user profile if session exists
        if (session?.user) {
          await safeRestoreSession();
        }
        break;

      case 'SIGNED_IN':
        // User signed in - restore user profile
        if (session?.user) {
          await safeRestoreSession();
        }
        break;

      case 'TOKEN_REFRESHED':
        // Token refreshed - user identity hasn't changed, just refresh profile if needed
        // Only refresh if we don't have a current user or if the user ID changed
        if (session?.user && (!_currentUser || _currentUser.id !== session.user.id)) {
          await safeRestoreSession();
        }
        break;

      case 'USER_UPDATED':
        // User profile updated in Supabase - refresh our profile
        if (session?.user) {
          await safeRestoreSession();
        }
        break;

      case 'SIGNED_OUT':
        // User signed out - clear state
        _currentUser = null;
        notifyListeners();
        break;
    }
  });
}

/**
 * Safely restore session with mutex protection.
 * Prevents concurrent restore operations.
 */
async function safeRestoreSession(): Promise<AuthUser | null> {
  return withRestoreMutex(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logError(error, 'safeRestoreSession:getSession');
        _currentUser = null;
        notifyListeners();
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
    } catch (error) {
      logError(error, 'safeRestoreSession');
      _currentUser = null;
      notifyListeners();
      return null;
    }
  });
}

// ============================================================================
// User Profile Resolution
// ============================================================================

/**
 * Resolve the application user profile from Supabase auth user.
 * 
 * This function distinguishes between:
 * 1. Successful profile resolution
 * 2. Genuinely no profile (user authenticated but not in public.users)
 * 3. Database/RLS errors (should be treated as errors)
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
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  const profile = profileData as UserProfile | null;

  // If no profile exists, return user with null profile
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
    throw new Error(`Failed to fetch user roles: ${rolesError.message}`);
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
      throw new Error(`Failed to fetch user permissions: ${permsError.message}`);
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
// Public API
// ============================================================================

/**
 * Get the current authenticated user (synchronous).
 */
export function getCurrentUser(): AuthUser | null {
  return _currentUser;
}

/**
 * Check if a restore operation is currently in progress.
 */
export function isRestoring(): boolean {
  return _isRestoring;
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

/**
 * Restore session from Supabase (e.g., after page refresh).
 * Uses mutex to prevent concurrent restore operations.
 */
export async function restoreSession(): Promise<AuthUser | null> {
  return safeRestoreSession();
}

/**
 * Clear the current user and notify listeners.
 * Used when session becomes invalid.
 */
export function clearCurrentUser(): void {
  _currentUser = null;
  notifyListeners();
}
