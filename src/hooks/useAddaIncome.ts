/**
 * Adda Income module hooks
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { AddaIncome } from '../types/database';

export function useAddaIncome(filters?: {
  startDate?: string;
  endDate?: string;
  incomeType?: string;
}) {
  const [incomes, setIncomes] = useState<AddaIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIncomes();
  }, [filters]);

  async function fetchIncomes() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('adda_income')
        .select('*')
        .eq('status', 'active')
        .order('income_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('income_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('income_date', filters.endDate);
      }

      if (filters?.incomeType) {
        query = query.eq('income_type', filters.incomeType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setIncomes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch adda income');
    } finally {
      setLoading(false);
    }
  }

  return { incomes, loading, error, refetch: fetchIncomes };
}

export function useAddaIncomeRecord(id: string | null) {
  const [income, setIncome] = useState<AddaIncome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchIncome();
    }
  }, [id]);

  async function fetchIncome() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('adda_income')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setIncome(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch adda income');
    } finally {
      setLoading(false);
    }
  }

  return { income, loading, error, refetch: fetchIncome };
}

export async function createAddaIncome(data: {
  income_date: string;
  income_type: string;
  amount: number;
  description?: string;
  received_from?: string;
  receipt_number?: string;
  notes?: string;
}) {
  const { data: income, error } = await supabase
    .from('adda_income')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return income;
}

export async function updateAddaIncome(
  id: string,
  data: Partial<{
    income_type: string;
    amount: number;
    description: string;
    received_from: string;
    receipt_number: string;
    notes: string;
  }>
) {
  const { data: income, error } = await supabase
    .from('adda_income')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return income;
}

export async function reverseAddaIncome(id: string, reason: string) {
  const { error } = await supabase
    .from('adda_income')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
