/**
 * Tyres module hooks
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { TyreRecord } from '../types/database';

export interface TyreRecordWithBus extends TyreRecord {
  buses?: {
    registration_number: string;
    bus_name: string | null;
  };
}

export function useTyres(filters?: {
  busId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [tyres, setTyres] = useState<TyreRecordWithBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTyres();
  }, [filters]);

  async function fetchTyres() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('tyre_records')
        .select(`
          *,
          buses (
            registration_number,
            bus_name
          )
        `)
        .order('purchase_date', { ascending: false });

      if (filters?.busId) {
        query = query.eq('bus_id', filters.busId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.startDate) {
        query = query.gte('purchase_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('purchase_date', filters.endDate);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTyres(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tyre records');
    } finally {
      setLoading(false);
    }
  }

  return { tyres, loading, error, refetch: fetchTyres };
}

export function useTyre(id: string | null) {
  const [tyre, setTyre] = useState<TyreRecordWithBus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTyre();
    }
  }, [id]);

  async function fetchTyre() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tyre_records')
        .select(`
          *,
          buses (
            registration_number,
            bus_name
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setTyre(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tyre record');
    } finally {
      setLoading(false);
    }
  }

  return { tyre, loading, error, refetch: fetchTyre };
}

export async function createTyreRecord(data: {
  bus_id: string;
  purchase_date: string;
  tyre_brand?: string;
  tyre_size?: string;
  quantity: number;
  cost_per_tyre: number;
  total_cost: number;
  supplier?: string;
  expected_life_km?: number;
  notes?: string;
}) {
  const { data: tyre, error } = await supabase
    .from('tyre_records')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return tyre;
}

export async function updateTyreRecord(
  id: string,
  data: Partial<{
    tyre_brand: string;
    tyre_size: string;
    quantity: number;
    cost_per_tyre: number;
    total_cost: number;
    supplier: string;
    expected_life_km: number;
    notes: string;
  }>
) {
  const { data: tyre, error } = await supabase
    .from('tyre_records')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return tyre;
}

export async function reverseTyreRecord(id: string, reason: string) {
  const { error } = await supabase
    .from('tyre_records')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
