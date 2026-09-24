/**
 * Soft-delete / recycle-bin hooks.
 *
 * All deletion mutations run through SECURITY DEFINER Postgres RPCs
 * (soft_delete_record, restore_record, permanent_delete_record,
 * list_deleted_records) so that authorization, table whitelisting,
 * child-safety guards and audit logging are enforced server-side.
 * The frontend NEVER writes to audit_logs and NEVER flips status
 * columns directly for deletions.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import type { DeletedRecord, DeletableTableName } from '../types/database';

/**
 * Extract a human-readable message from ANY error-ish value.
 * Supabase/PostgREST errors are often plain objects
 * ({ message, code, details, hint }) — NOT Error instances —
 * so `err instanceof Error` alone is not sufficient here.
 */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; error_description?: unknown };
    if (typeof e.message === 'string' && e.message.trim()) return e.message;
    if (typeof e.error_description === 'string' && e.error_description.trim()) {
      return e.error_description;
    }
  }
  if (typeof err === 'string' && err.trim()) return err;
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Soft-delete a record via the secure RPC.
 * Moves it into the recycle bin (status = 'deleted'); the previous
 * status is preserved in the deletion audit metadata server-side.
 */
export async function softDeleteRecord(
  table: DeletableTableName,
  id: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc('soft_delete_record', {
    p_table: table,
    p_id: id,
    p_reason: reason ?? null,
  });
  if (error) {
    logError(error, `softDeleteRecord(${table})`);
    throw error;
  }
}

/**
 * Restore a deleted record to its EXACT previous status
 * (active / reversed / cancelled) using the deletion audit metadata.
 */
export async function restoreRecord(
  table: DeletableTableName,
  id: string
): Promise<void> {
  const { error } = await supabase.rpc('restore_record', {
    p_table: table,
    p_id: id,
  });
  if (error) {
    logError(error, `restoreRecord(${table})`);
    throw error;
  }
}

/**
 * Permanently delete a record (OWNER only; server restricts this to the
 * recycle-bin whitelist tables). Requires the exact confirmation text.
 */
export async function permanentDeleteRecord(
  table: DeletableTableName,
  id: string,
  confirmation: string
): Promise<void> {
  const { error } = await supabase.rpc('permanent_delete_record', {
    p_table: table,
    p_id: id,
    p_confirmation: confirmation,
  });
  if (error) {
    logError(error, `permanentDeleteRecord(${table})`);
    throw error;
  }
}

/**
 * Fetch the unified list of soft-deleted records (newest deletion first).
 */
export async function fetchDeletedRecords(): Promise<DeletedRecord[]> {
  const { data, error } = await supabase.rpc('list_deleted_records');
  if (error) {
    logError(error, 'fetchDeletedRecords');
    throw error;
  }
  return (data ?? []) as DeletedRecord[];
}

/**
 * Hook exposing the Deleted Data (recycle bin) feed plus refresh.
 */
export function useDeletedRecords() {
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDeletedRecords();
      setRecords(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { records, loading, error, refetch };
}
