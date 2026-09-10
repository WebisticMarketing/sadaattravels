/**
 * Buses module hooks
 * 
 * Fetch and manage bus fleet data
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import type { Bus } from '../types/database';

export interface BusWithStats extends Bus {
  totalTrips?: number;
  totalRevenue?: number;
  totalExpenses?: number;
}

/**
 * Fetch all buses with optional stats
 */
export function useBuses(includeStats = false) {
  const [buses, setBuses] = useState<BusWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('buses')
        .select('*')
        .order('registration_number', { ascending: true });

      if (fetchError) throw fetchError;

      if (includeStats && data) {
        // Fetch stats for each bus
        const busesWithStats = await Promise.all(
          data.map(async (bus) => {
            const { data: trips } = await supabase
              .from('trips')
              .select('id')
              .eq('bus_id', bus.id)
              .eq('status', 'active');

            const tripIds = trips?.map(t => t.id) || [];

            let totalRevenue = 0;
            let totalExpenses = 0;

            if (tripIds.length > 0) {
              const { data: revenue } = await supabase
                .from('trip_revenue_entries')
                .select('amount')
                .in('trip_id', tripIds)
                .eq('status', 'active');

              const { data: expenses } = await supabase
                .from('trip_expenses')
                .select('amount')
                .in('trip_id', tripIds)
                .eq('status', 'active');

              totalRevenue = revenue?.reduce((sum, r) => sum + r.amount, 0) || 0;
              totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
            }

            return {
              ...bus,
              totalTrips: trips?.length || 0,
              totalRevenue,
              totalExpenses,
            };
          })
        );

        setBuses(busesWithStats);
      } else {
        setBuses(data || []);
      }

      setLoading(false);
    } catch (err) {
      logError(err, 'useBuses');
      setError(err instanceof Error ? err.message : 'Failed to load buses');
      setLoading(false);
    }
  }, [includeStats]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  return { buses, loading, error, refetch: fetchBuses };
}

/**
 * Create a new bus
 */
export async function createBus(
  registrationNumber: string,
  busName: string | null,
  busType: string | null,
  capacity: number
): Promise<Bus> {
  const { data, error } = await supabase
    .from('buses')
    .insert({
      registration_number: registrationNumber,
      bus_name: busName,
      bus_type: busType,
      capacity,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a bus
 */
export async function updateBus(
  id: string,
  updates: Partial<Pick<Bus, 'bus_name' | 'bus_type' | 'capacity' | 'status'>>
): Promise<Bus> {
  const { data, error } = await supabase
    .from('buses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
