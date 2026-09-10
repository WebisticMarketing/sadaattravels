/**
 * Trips module hooks
 * 
 * Fetch and manage trip data with revenue/expense calculations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import type { Trip, TripRevenueEntry, TripExpense } from '../types/database';

export interface TripWithCalculations extends Trip {
  bus?: {
    id: string;
    registration_number: string;
    bus_name: string | null;
  };
  seatsRevenue: number;
  individualPayments: number;
  otherRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  revenueEntries?: TripRevenueEntry[];
  expenseEntries?: TripExpense[];
}

/**
 * Fetch all trips with calculations
 */
export function useTrips(options?: {
  startDate?: string;
  endDate?: string;
  busId?: string;
  status?: string;
}) {
  const [trips, setTrips] = useState<TripWithCalculations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('trips')
        .select(`
          *,
          bus:buses(id, registration_number, bus_name)
        `)
        .order('trip_date', { ascending: false });

      // Apply filters
      if (options?.startDate) {
        query = query.gte('trip_date', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('trip_date', options.endDate);
      }
      if (options?.busId) {
        query = query.eq('bus_id', options.busId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data: tripsData, error: tripsError } = await query;

      if (tripsError) throw tripsError;

      if (!tripsData || tripsData.length === 0) {
        setTrips([]);
        setLoading(false);
        return;
      }

      // Fetch revenue and expense entries for all trips
      const tripIds = tripsData.map(t => t.id);

      const { data: revenueData, error: revenueError } = await supabase
        .from('trip_revenue_entries')
        .select('*')
        .in('trip_id', tripIds)
        .eq('status', 'active');

      if (revenueError) throw revenueError;

      const { data: expenseData, error: expenseError } = await supabase
        .from('trip_expenses')
        .select('*')
        .in('trip_id', tripIds)
        .eq('status', 'active');

      if (expenseError) throw expenseError;

      // Calculate totals for each trip
      const tripsWithCalculations: TripWithCalculations[] = tripsData.map(trip => {
        const tripRevenue = revenueData?.filter(r => r.trip_id === trip.id) || [];
        const tripExpenses = expenseData?.filter(e => e.trip_id === trip.id) || [];

        const seatsRevenue = tripRevenue
          .filter(r => r.entry_type === 'seat_booking')
          .reduce((sum, r) => sum + r.amount, 0);

        const individualPayments = tripRevenue
          .filter(r => r.entry_type === 'individual_payment')
          .reduce((sum, r) => sum + r.amount, 0);

        const otherRevenue = tripRevenue
          .filter(r => r.entry_type === 'other')
          .reduce((sum, r) => sum + r.amount, 0);

        const totalRevenue = seatsRevenue + individualPayments + otherRevenue;
        const totalExpenses = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
        const profit = totalRevenue - totalExpenses;

        return {
          ...trip,
          bus: trip.bus as any,
          seatsRevenue,
          individualPayments,
          otherRevenue,
          totalRevenue,
          totalExpenses,
          profit,
          revenueEntries: tripRevenue,
          expenseEntries: tripExpenses,
        };
      });

      setTrips(tripsWithCalculations);
      setLoading(false);
    } catch (err) {
      logError(err, 'useTrips');
      setError(err instanceof Error ? err.message : 'Failed to load trips');
      setLoading(false);
    }
  }, [options?.startDate, options?.endDate, options?.busId, options?.status]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return { trips, loading, error, refetch: fetchTrips };
}

/**
 * Fetch single trip with full details
 */
export function useTrip(tripId: string | null) {
  const [trip, setTrip] = useState<TripWithCalculations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrip = useCallback(async () => {
    if (!tripId) {
      setTrip(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
          *,
          bus:buses(id, registration_number, bus_name)
        `)
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Fetch revenue and expense entries
      const { data: revenueData, error: revenueError } = await supabase
        .from('trip_revenue_entries')
        .select('*')
        .eq('trip_id', tripId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (revenueError) throw revenueError;

      const { data: expenseData, error: expenseError } = await supabase
        .from('trip_expenses')
        .select('*')
        .eq('trip_id', tripId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (expenseError) throw expenseError;

      const tripRevenue = revenueData || [];
      const tripExpenses = expenseData || [];

      const seatsRevenue = tripRevenue
        .filter(r => r.entry_type === 'seat_booking')
        .reduce((sum, r) => sum + r.amount, 0);

      const individualPayments = tripRevenue
        .filter(r => r.entry_type === 'individual_payment')
        .reduce((sum, r) => sum + r.amount, 0);

      const otherRevenue = tripRevenue
        .filter(r => r.entry_type === 'other')
        .reduce((sum, r) => sum + r.amount, 0);

      const totalRevenue = seatsRevenue + individualPayments + otherRevenue;
      const totalExpenses = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
      const profit = totalRevenue - totalExpenses;

      setTrip({
        ...tripData,
        bus: tripData.bus as any,
        seatsRevenue,
        individualPayments,
        otherRevenue,
        totalRevenue,
        totalExpenses,
        profit,
        revenueEntries: tripRevenue,
        expenseEntries: tripExpenses,
      });

      setLoading(false);
    } catch (err) {
      logError(err, 'useTrip');
      setError(err instanceof Error ? err.message : 'Failed to load trip');
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  return { trip, loading, error, refetch: fetchTrip };
}

/**
 * Create a new trip
 */
export async function createTrip(data: {
  bus_id: string;
  trip_date: string;
  route: string;
  departure_time?: string;
  arrival_time?: string;
  notes?: string;
}): Promise<Trip> {
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      ...data,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return trip;
}

/**
 * Update a trip
 */
export async function updateTrip(
  id: string,
  updates: Partial<Pick<Trip, 'route' | 'departure_time' | 'arrival_time' | 'notes' | 'status'>>
): Promise<Trip> {
  const { data: trip, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return trip;
}

/**
 * Add revenue entry to a trip
 */
export async function addRevenueEntry(
  tripId: string,
  entryType: 'seat_booking' | 'individual_payment' | 'other',
  amount: number,
  description?: string,
  quantity?: number,
  unitPrice?: number
): Promise<TripRevenueEntry> {
  const { data: entry, error } = await supabase
    .from('trip_revenue_entries')
    .insert({
      trip_id: tripId,
      entry_type: entryType,
      amount,
      description,
      quantity,
      unit_price: unitPrice,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return entry;
}

/**
 * Add expense entry to a trip
 */
export async function addExpenseEntry(
  tripId: string,
  expenseType: string,
  amount: number,
  description?: string,
  paidTo?: string
): Promise<TripExpense> {
  const { data: entry, error } = await supabase
    .from('trip_expenses')
    .insert({
      trip_id: tripId,
      expense_type: expenseType,
      amount,
      description,
      paid_to: paidTo,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return entry;
}

/**
 * Reverse a revenue entry (soft delete)
 */
export async function reverseRevenueEntry(
  entryId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('trip_revenue_entries')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', entryId);

  if (error) throw error;
}

/**
 * Reverse an expense entry (soft delete)
 */
export async function reverseExpenseEntry(
  entryId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('trip_expenses')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', entryId);

  if (error) throw error;
}
