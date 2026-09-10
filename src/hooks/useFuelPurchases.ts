/**
 * Fuel Purchases module hooks
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { FuelPurchase } from '../types/database';

export function useFuelPurchases(filters?: {
  startDate?: string;
  endDate?: string;
  supplier?: string;
}) {
  const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, [filters]);

  async function fetchPurchases() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('fuel_purchases')
        .select('*')
        .eq('status', 'active')
        .order('purchase_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('purchase_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('purchase_date', filters.endDate);
      }

      if (filters?.supplier) {
        query = query.eq('supplier', filters.supplier);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPurchases(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fuel purchases');
    } finally {
      setLoading(false);
    }
  }

  return { purchases, loading, error, refetch: fetchPurchases };
}

export function useFuelPurchase(id: string | null) {
  const [purchase, setPurchase] = useState<FuelPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPurchase();
    }
  }, [id]);

  async function fetchPurchase() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('fuel_purchases')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setPurchase(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fuel purchase');
    } finally {
      setLoading(false);
    }
  }

  return { purchase, loading, error, refetch: fetchPurchase };
}

export async function createFuelPurchase(data: {
  purchase_date: string;
  supplier: string;
  litres: number;
  cost_per_litre: number;
  total_cost: number;
  receipt_number?: string;
  notes?: string;
}) {
  const { data: purchase, error } = await supabase
    .from('fuel_purchases')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return purchase;
}

export async function updateFuelPurchase(
  id: string,
  data: Partial<{
    supplier: string;
    litres: number;
    cost_per_litre: number;
    total_cost: number;
    receipt_number: string;
    notes: string;
  }>
) {
  const { data: purchase, error } = await supabase
    .from('fuel_purchases')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return purchase;
}

export async function reverseFuelPurchase(id: string, reason: string) {
  const { error } = await supabase
    .from('fuel_purchases')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
