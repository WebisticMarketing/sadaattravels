import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import type { AuditLog } from '../types/database';

export interface AuditLogWithUser extends AuditLog {
  user?: {
    email: string;
    full_name: string;
  };
}

/**
 * Fetch audit logs with optional filters
 */
export function useAuditLogs(filters?: {
  action?: string;
  tableName?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:users(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.tableName) {
        query = query.eq('table_name', filters.tableName);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setLogs(data || []);
      setLoading(false);
    } catch (err) {
      logError(err, 'useAuditLogs');
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      setLoading(false);
    }
  }, [filters?.action, filters?.tableName, filters?.userId, filters?.startDate, filters?.endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}

/**
 * Get unique action types for filtering
 */
export function useAuditActionTypes() {
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActions() {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('action')
          .order('action');

        if (error) throw error;

        const uniqueActions = Array.from(new Set(data?.map(log => log.action) || []));
        setActions(uniqueActions.sort());
        setLoading(false);
      } catch (err) {
        logError(err, 'useAuditActionTypes');
        setLoading(false);
      }
    }

    fetchActions();
  }, []);

  return { actions, loading };
}

/**
 * Get unique table names for filtering
 */
export function useAuditTableNames() {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTables() {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('table_name')
          .not('table_name', 'is', null)
          .order('table_name');

        if (error) throw error;

        const uniqueTables = Array.from(new Set(data?.map(log => log.table_name) || []));
        setTables(uniqueTables.sort());
        setLoading(false);
      } catch (err) {
        logError(err, 'useAuditTableNames');
        setLoading(false);
      }
    }

    fetchTables();
  }, []);

  return { tables, loading };
}
