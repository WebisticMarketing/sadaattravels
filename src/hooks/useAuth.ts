/**
 * React hooks for authentication.
 *
 * Provides reactive access to auth state and operations.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  signIn,
  signOut,
  restoreSession,
  getCurrentUser,
  onAuthStateChange,
  type AuthUser,
  type LoginCredentials,
  type AuthError,
} from '../services/auth';

/**
 * Hook for accessing authentication state and operations.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const restoredUser = await restoreSession();
        if (mounted) {
          setUser(restoredUser);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError({
            code: 'SESSION_RESTORE_FAILED',
            message: 'Failed to restore session.',
          });
          setLoading(false);
        }
      }
    }

    restore();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((newUser) => {
      if (mounted) {
        setUser(newUser);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null);
    setLoading(true);

    try {
      const authUser = await signIn(credentials);
      setUser(authUser);
      return authUser;
    } catch (err) {
      const authError: AuthError =
        err instanceof Error
          ? { code: 'LOGIN_FAILED', message: err.message }
          : { code: 'LOGIN_FAILED', message: 'Login failed.' };
      setError(authError);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);

    try {
      await signOut();
      setUser(null);
    } catch (err) {
      const authError: AuthError = {
        code: 'LOGOUT_FAILED',
        message: 'Logout failed.',
      };
      setError(authError);
      throw authError;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    clearError,
    isAuthenticated: !!user,
    hasProfile: !!user?.profile,
  };
}

/**
 * Hook for checking if the current user has a specific role.
 */
export function useHasRole(role: string): boolean {
  const { user } = useAuth();
  return user?.roles.includes(role) ?? false;
}

/**
 * Hook for checking if the current user has a specific permission.
 */
export function useHasPermission(permission: string): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(permission) ?? false;
}

/**
 * Hook for checking if the current user has any of the specified roles.
 */
export function useHasAnyRole(roles: string[]): boolean {
  const { user } = useAuth();
  return roles.some((role) => user?.roles.includes(role)) ?? false;
}

/**
 * Hook for checking if the current user has all of the specified permissions.
 */
export function useHasAllPermissions(permissions: string[]): boolean {
  const { user } = useAuth();
  return permissions.every((perm) => user?.permissions.includes(perm)) ?? false;
}
