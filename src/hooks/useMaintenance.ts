/**
 * Maintenance module hooks
 * 
 * Fetch and manage bus maintenance records
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import type { MaintenanceRecord } from '../types/database';

export interface MaintenanceRecordWithBus extends MaintenanceRecord {
  bus?: {
    id: string;
    registration_number: string;
    bus_name: string | null;
  };
}

/**
 * Fetch all maintenance records with optional filters
 */
export function useMaintenance(options?: {
  startDate?: string;
  endDate?: string;
  busId?: string;
  maintenanceType?: string;
  status?: string;
}) {
  const [records, setRecords] = useState<MaintenanceRecordWithBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('maintenance_records')
        .select(`
          *,
          bus:buses(id, registration_number, bus_name)
        `)
        .order('maintenance_date', { ascending: false });

      if (options?.startDate) {
        query = query.gte('maintenance_date', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('maintenance_date', options.endDate);
      }
      if (options?.busId) {
        query = query.eq('bus_id', options.busId);
      }
      if (options?.maintenanceType) {
        query = query.eq('maintenance_type', options.maintenanceType);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRecords((data || []).map(record => ({
        ...record,
        bus: record.bus as any,
      })));

      setLoading(false);
    } catch (err) {
      logError(err, 'useMaintenance');
      setError(err instanceof Error ? err.message : 'Failed to load maintenance records');
      setLoading(false);
    }
  }, [options?.startDate, options?.endDate, options?.busId, options?.maintenanceType, options?.status]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}

/**
 * Fetch maintenance records for a specific bus
 */
export function useBusMaintenance(busId: string | null) {
  const [records, setRecords] = useState<MaintenanceRecordWithBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  const fetchRecords = useCallback(async () => {
    if (!busId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          bus:buses(id, registration_number, bus_name)
        `)
        .eq('bus_id', busId)
        .eq('status', 'active')
        .order('maintenance_date', { ascending: false });

      if (fetchError) throw fetchError;

      const recordsWithBus = (data || []).map(record => ({
        ...record,
        bus: record.bus as any,
      }));

      setRecords(recordsWithBus);
      setTotalCost(recordsWithBus.reduce((sum, r) => sum + r.cost, 0));

      setLoading(false);
    } catch (err) {
      logError(err, 'useBusMaintenance');
      setError(err instanceof Error ? err.message : 'Failed to load maintenance records');
      setLoading(false);
    }
  }, [busId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, totalCost, refetch: fetchRecords };
}

/**
 * Create a new maintenance record
 */
export async function createMaintenanceRecord(data: {
  bus_id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  cost: number;
  performed_by?: string;
  next_maintenance_date?: string;
  notes?: string;
}): Promise<MaintenanceRecord> {
  const { data: record, error } = await supabase
    .from('maintenance_records')
    .insert({
      ...data,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return record;
}

/**
 * Update a maintenance record
 */
export async function updateMaintenanceRecord(
  id: string,
  updates: Partial<Pick<MaintenanceRecord, 'maintenance_type' | 'description' | 'cost' | 'performed_by' | 'next_maintenance_date' | 'notes'>>
): Promise<MaintenanceRecord> {
  const { data: record, error } = await supabase
    .from('maintenance_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return record;
}

/**
 * Reverse a maintenance record (soft delete)
 */
export async function reverseMaintenanceRecord(
  id: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('maintenance_records')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
