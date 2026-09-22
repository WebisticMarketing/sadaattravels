/**
 * Petrol Pump Expenses module hooks
 * Manages operating expenses for the petrol pump (electricity, salary, repairs, etc.)
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { PumpExpense, PumpExpenseType } from '../types/database';

export function usePumpExpenses(filters?: {
  startDate?: string;
  endDate?: string;
  expenseType?: PumpExpenseType;
}) {
  const [expenses, setExpenses] = useState<PumpExpense[]>([]);
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
        .from('pump_expenses')
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
      setError(err instanceof Error ? err.message : 'Failed to fetch pump expenses');
    } finally {
      setLoading(false);
    }
  }

  return { expenses, loading, error, refetch: fetchExpenses };
}

export function usePumpExpenseRecord(id: string | null) {
  const [expense, setExpense] = useState<PumpExpense | null>(null);
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
        .from('pump_expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setExpense(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pump expense');
    } finally {
      setLoading(false);
    }
  }

  return { expense, loading, error, refetch: fetchExpense };
}

export async function createPumpExpense(data: {
  expense_date: string;
  expense_type: PumpExpenseType;
  amount: number;
  description?: string;
  paid_to?: string;
  receipt_number?: string;
  notes?: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (!sessionData?.session?.user) {
    throw new Error('Authentication required. Please log in.');
  }
  
  const userId = sessionData.session.user.id;

  const { data: expense, error } = await supabase
    .from('pump_expenses')
    .insert([{ ...data, created_by: userId }])
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
      throw new Error('You do not have permission to create pump expense records. Please contact an administrator.');
    }
    throw error;
  }
  return expense;
}

export async function updatePumpExpense(
  id: string,
  data: Partial<{
    expense_type: PumpExpenseType;
    amount: number;
    description: string;
    paid_to: string;
    receipt_number: string;
    notes: string;
  }>
) {
  const { data: expense, error } = await supabase
    .from('pump_expenses')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return expense;
}

export async function reversePumpExpense(id: string, reason: string) {
  const { error } = await supabase
    .from('pump_expenses')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
