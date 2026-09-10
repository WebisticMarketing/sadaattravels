/**
 * Cargo module hooks
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { CargoRecord } from '../types/database';

export interface CargoRecordWithBus extends CargoRecord {
  buses?: {
    registration_number: string;
    bus_name: string | null;
  };
}

export function useCargo(filters?: {
  startDate?: string;
  endDate?: string;
  busId?: string;
  origin?: string;
  destination?: string;
}) {
  const [cargo, setCargo] = useState<CargoRecordWithBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCargo();
  }, [filters]);

  async function fetchCargo() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('cargo_records')
        .select(`
          *,
          buses (
            registration_number,
            bus_name
          )
        `)
        .eq('status', 'active')
        .order('shipment_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('shipment_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('shipment_date', filters.endDate);
      }

      if (filters?.busId) {
        query = query.eq('bus_id', filters.busId);
      }

      if (filters?.origin) {
        query = query.ilike('origin', `%${filters.origin}%`);
      }

      if (filters?.destination) {
        query = query.ilike('destination', `%${filters.destination}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setCargo(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cargo records');
    } finally {
      setLoading(false);
    }
  }

  return { cargo, loading, error, refetch: fetchCargo };
}

export function useCargoRecord(id: string | null) {
  const [record, setRecord] = useState<CargoRecordWithBus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRecord();
    }
  }, [id]);

  async function fetchRecord() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('cargo_records')
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

      setRecord(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cargo record');
    } finally {
      setLoading(false);
    }
  }

  return { record, loading, error, refetch: fetchRecord };
}

export async function createCargoRecord(data: {
  shipment_date: string;
  bus_id?: string;
  sender_name: string;
  sender_phone?: string;
  receiver_name: string;
  receiver_phone?: string;
  origin: string;
  destination: string;
  description: string;
  weight_kg?: number;
  quantity?: number;
  revenue: number;
  expenses: number;
  notes?: string;
}) {
  const { data: record, error } = await supabase
    .from('cargo_records')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return record;
}

export async function updateCargoRecord(
  id: string,
  data: Partial<{
    sender_name: string;
    sender_phone: string;
    receiver_name: string;
    receiver_phone: string;
    origin: string;
    destination: string;
    description: string;
    weight_kg: number;
    quantity: number;
    revenue: number;
    expenses: number;
    notes: string;
  }>
) {
  const { data: record, error } = await supabase
    .from('cargo_records')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return record;
}

export async function reverseCargoRecord(id: string, reason: string) {
  const { error } = await supabase
    .from('cargo_records')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
