import { useState, useEffect, useCallback } from 'react';
import { toAppError, logError } from '../utils/errors';
import type { AsyncState } from '../types';

/**
 * Generic hook for managing async operations with loading/error/data states.
 */
export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await asyncFn();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const appError = toAppError(err);
      logError(appError, 'useAsync');
      setState({ data: null, loading: false, error: appError });
      throw appError;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

/**
 * Hook for managing boolean open/close state (modals, drawers, etc.)
 */
export function useToggle(initial = false) {
  const [open, setOpen] = useState(initial);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return { open, onOpen, onClose, toggle };
}

/**
 * Hook for debounced values.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Re-export auth hooks
export { useAuth, useHasRole, useHasPermission, useHasAnyRole, useHasAllPermissions } from './useAuth';

// Re-export role helper functions
export { isOwner, isManager, hasFullAccess } from '../services/auth';
