import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import type { PersonalExpense } from '../types/database';

/**
 * Fetch all personal expenses
 */
export function usePersonalExpenses(options?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('personal_expenses')
        .select('*')
        .eq('status', 'active')
        .order('expense_date', { ascending: false });

      if (options?.startDate) {
        query = query.gte('expense_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('expense_date', options.endDate);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setExpenses(data || []);
      setLoading(false);
    } catch (err) {
      logError(err, 'usePersonalExpenses');
      setError(err instanceof Error ? err.message : 'Failed to load personal expenses');
      setLoading(false);
    }
  }, [options?.startDate, options?.endDate, options?.category]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, loading, error, refetch: fetchExpenses };
}

/**
 * Fetch single personal expense
 */
export function usePersonalExpense(expenseId: string | null) {
  const [expense, setExpense] = useState<PersonalExpense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpense = useCallback(async () => {
    if (!expenseId) {
      setExpense(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('personal_expenses')
        .select('*')
        .eq('id', expenseId)
        .single();

      if (fetchError) throw fetchError;

      setExpense(data);
      setLoading(false);
    } catch (err) {
      logError(err, 'usePersonalExpense');
      setError(err instanceof Error ? err.message : 'Failed to load personal expense');
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  return { expense, loading, error, refetch: fetchExpense };
}

/**
 * Create a new personal expense
 */
export async function createPersonalExpense(data: {
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  paid_by?: string;
  notes?: string;
}): Promise<PersonalExpense> {
  const { data: expense, error } = await supabase
    .from('personal_expenses')
    .insert({
      ...data,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return expense;
}

/**
 * Update a personal expense
 */
export async function updatePersonalExpense(
  id: string,
  updates: Partial<Pick<PersonalExpense, 'category' | 'description' | 'amount' | 'paid_by' | 'notes'>>
): Promise<PersonalExpense> {
  const { data: expense, error } = await supabase
    .from('personal_expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return expense;
}

/**
 * Reverse a personal expense (soft delete)
 */
export async function reversePersonalExpense(
  id: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('personal_expenses')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
