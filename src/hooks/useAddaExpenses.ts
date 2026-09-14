/**
 * Adda Expenses module hooks
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { AddaExpense } from '../types/database';

export function useAddaExpenses(filters?: {
  startDate?: string;
  endDate?: string;
  expenseType?: string;
}) {
  const [expenses, setExpenses] = useState<AddaExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, [filters?.startDate, filters?.endDate, filters?.expenseType]);

  async function fetchExpenses() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('adda_expenses')
        .select('*')
        .eq('status', 'active')
        .order('expense_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('expense_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('expense_date', filters.endDate);
      }

      if (filters?.expenseType) {
        query = query.eq('expense_type', filters.expenseType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setExpenses(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch adda expenses');
    } finally {
      setLoading(false);
    }
  }

  return { expenses, loading, error, refetch: fetchExpenses };
}

export function useAddaExpenseRecord(id: string | null) {
  const [expense, setExpense] = useState<AddaExpense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchExpense();
    }
  }, [id]);

  async function fetchExpense() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('adda_expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setExpense(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch adda expense');
    } finally {
      setLoading(false);
    }
  }

  return { expense, loading, error, refetch: fetchExpense };
}

export async function createAddaExpense(data: {
  expense_date: string;
  expense_type: string;
  amount: number;
  description?: string;
  paid_to?: string;
  receipt_number?: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (!sessionData?.session?.user) {
    throw new Error('Authentication required. Please log in.');
  }
  
  const userId = sessionData.session.user.id;

  const { data: expense, error } = await supabase
    .from('adda_expenses')
    .insert([{ ...data, created_by: userId }])
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
      throw new Error('You do not have permission to create adda expense records. Please contact an administrator.');
    }
    throw error;
  }
  return expense;
}

export async function updateAddaExpense(
  id: string,
  data: Partial<{
    expense_type: string;
    amount: number;
    description: string;
    paid_to: string;
    receipt_number: string;
    notes: string;
  }>
) {
  const { data: expense, error } = await supabase
    .from('adda_expenses')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return expense;
}

export async function reverseAddaExpense(id: string, reason: string) {
  const { error } = await supabase
    .from('adda_expenses')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
