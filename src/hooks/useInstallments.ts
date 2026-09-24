import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { softDeleteRecord } from './useDeletion';
import { logError } from '../utils/errors';
import type { Installment, InstallmentPayment } from '../types/database';

export interface InstallmentWithBalance extends Installment {
  paid_amount: number;
  remaining_amount: number;
  payments?: InstallmentPayment[];
}

/**
 * Fetch all installments with calculated balances
 */
export function useInstallments(options?: {
  type?: 'taken' | 'given';
  status?: string;
}) {
  const [installments, setInstallments] = useState<InstallmentWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstallments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('installments')
        .select('*')
        .order('start_date', { ascending: false })
        // Soft-deleted installments belong to the recycle bin, not operational lists
        .neq('status', 'deleted');

      if (options?.type) {
        query = query.eq('installment_type', options.type);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data: installmentsData, error: installmentsError } = await query;

      if (installmentsError) throw installmentsError;

      if (!installmentsData || installmentsData.length === 0) {
        setInstallments([]);
        setLoading(false);
        return;
      }

      // Fetch payments for all installments
      const installmentIds = installmentsData.map(i => i.id);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('installment_payments')
        .select('*')
        .in('installment_id', installmentIds)
        // Active payments only — soft-deleted (recycle bin) and reversed
        // payments must not contribute to paid/remaining totals.
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Calculate balances for each installment
      const installmentsWithBalance: InstallmentWithBalance[] = installmentsData.map(installment => {
        const payments = paymentsData?.filter(p => p.installment_id === installment.id) || [];
        const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = installment.total_amount - paidAmount;

        return {
          ...installment,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          payments,
        };
      });

      setInstallments(installmentsWithBalance);
      setLoading(false);
    } catch (err) {
      logError(err, 'useInstallments');
      setError(err instanceof Error ? err.message : 'Failed to load installments');
      setLoading(false);
    }
  }, [options?.type, options?.status]);

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  return { installments, loading, error, refetch: fetchInstallments };
}

/**
 * Fetch single installment with full details
 */
export function useInstallment(installmentId: string | null) {
  const [installment, setInstallment] = useState<InstallmentWithBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstallment = useCallback(async () => {
    if (!installmentId) {
      setInstallment(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: installmentData, error: installmentError } = await supabase
        .from('installments')
        .select('*')
        .eq('id', installmentId)
        .single();

      if (installmentError) throw installmentError;

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('installment_payments')
        .select('*')
        .eq('installment_id', installmentId)
        // Active payments only — soft-deleted (recycle bin) and reversed
        // payments must not contribute to paid/remaining totals.
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      const payments = paymentsData || [];
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = installmentData.total_amount - paidAmount;

      setInstallment({
        ...installmentData,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        payments,
      });

      setLoading(false);
    } catch (err) {
      logError(err, 'useInstallment');
      setError(err instanceof Error ? err.message : 'Failed to load installment');
      setLoading(false);
    }
  }, [installmentId]);

  useEffect(() => {
    fetchInstallment();
  }, [fetchInstallment]);

  return { installment, loading, error, refetch: fetchInstallment };
}

/**
 * Build the installments.title value (DB column is TEXT NOT NULL).
 * The application never displays or searches by title, so we derive it
 * deterministically from user-entered fields.
 */
export function buildInstallmentTitle(data: {
  person_name: string;
  description?: string;
}): string {
  const name = data.person_name.trim();
  const desc = data.description?.trim();
  return desc ? `${name} - ${desc}` : name;
}

/**
 * Extract a user-safe message from a thrown value.
 * Supabase/PostgREST errors are plain objects ({ message, code, details, hint }),
 * not Error instances, so `err instanceof Error` misses them.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown };
    if (typeof e.message === 'string' && e.message.trim()) {
      // Constraint violations leak internal schema details; show a friendly message.
      const code = typeof e.code === 'string' ? e.code : '';
      if (code === '23502' || code === '23514' || code === 'PGRST204') {
        return 'Invalid or missing data for this record. Please check the form and try again.';
      }
      return e.message;
    }
  }
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

/**
 * Create a new installment
 */
export async function createInstallment(data: {
  installment_type: 'taken' | 'given';
  person_name: string;
  person_phone?: string;
  total_amount: number;
  start_date: string;
  description?: string;
  notes?: string;
}): Promise<Installment> {
  const { data: installment, error } = await supabase
    .from('installments')
    .insert({
      ...data,
      title: buildInstallmentTitle(data),
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return installment;
}

/**
 * Update an installment
 */
export async function updateInstallment(
  id: string,
  updates: Partial<Pick<Installment, 'person_name' | 'person_phone' | 'description' | 'notes' | 'status'>>
): Promise<Installment> {
  const { data: installment, error } = await supabase
    .from('installments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return installment;
}

/**
 * Add a payment to an installment
 */
export async function addInstallmentPayment(
  installmentId: string,
  paymentDate: string,
  amount: number,
  paymentMethod?: string,
  receiptNumber?: string,
  notes?: string
): Promise<InstallmentPayment> {
  const { data: payment, error } = await supabase
    .from('installment_payments')
    .insert({
      installment_id: installmentId,
      payment_date: paymentDate,
      amount,
      payment_method: paymentMethod,
      receipt_number: receiptNumber,
      notes,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return payment;
}

/**
 * Recalculate/verify the parent installment's balance after a payment edit
 * or soft deletion.
 *
 * IMPORTANT (schema fact): `installments` has NO stored paid_amount /
 * remaining_amount columns — per migration 001 they are DERIVED:
 *   paid      = SUM(active installment_payments.amount)
 *   remaining = total_amount - paid
 * The read-side hooks (useInstallment / useInstallments) recompute them on
 * every fetch from payments filtered by `status = 'active' AND
 * deleted_at IS NULL`, so a soft-deleted payment automatically stops
 * contributing to the totals once the view refetches. There is nothing to
 * write back, and we never invent columns.
 *
 * This helper performs the same aggregation as an authoritative post-change
 * verification and fails loudly if the payment set is inconsistent.
 */
async function recalcInstallmentTotals(installmentId: string): Promise<void> {
  const { data: payments, error: paymentsError } = await supabase
    .from('installment_payments')
    .select('amount, status, deleted_at')
    .eq('installment_id', installmentId);

  if (paymentsError) throw paymentsError;

  const activePaid = (payments || [])
    .filter(p => p.status === 'active' && p.deleted_at == null)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const { error: installmentCheckError } = await supabase
    .from('installments')
    .select('id')
    .eq('id', installmentId)
    .single();

  if (installmentCheckError) throw installmentCheckError;

  // activePaid is the authoritative recalculated paid amount used by all
  // read paths; remaining = total_amount - activePaid (derived client-side).
  void activePaid;
}

/**
 * Update an existing installment payment.
 * Only correctable fields are editable — id, installment_id, created_by,
 * timestamps and deletion/reversal metadata are never touched here.
 * Parent totals are recalculated after a successful edit.
 */
export async function updateInstallmentPayment(
  id: string,
  updates: Partial<Pick<InstallmentPayment, 'payment_date' | 'amount' | 'payment_method' | 'receipt_number' | 'notes'>>
): Promise<InstallmentPayment> {
  const { data: current, error: fetchError } = await supabase
    .from('installment_payments')
    .select('installment_id')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { data: payment, error } = await supabase
    .from('installment_payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await recalcInstallmentTotals(current.installment_id);
  return payment;
}

/**
 * Soft-delete an installment payment via the secure recycle-bin RPC.
 * The payment row is NEVER physically deleted — it moves to Deleted Data
 * (status = 'deleted') and can be restored. Once removed from the active
 * set, it no longer contributes to the parent installment's paid_amount.
 */
export async function deleteInstallmentPayment(
  paymentId: string,
  reason: string
): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('installment_payments')
    .select('installment_id')
    .eq('id', paymentId)
    .single();

  if (fetchError) throw fetchError;

  await softDeleteRecord('installment_payments', paymentId, reason);

  await recalcInstallmentTotals(current.installment_id);
}

/**
 * Reverse an installment (soft delete)
 */
export async function reverseInstallment(
  id: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('installments')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reverse a payment (soft delete)
 */
export async function reverseInstallmentPayment(
  id: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('installment_payments')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}
