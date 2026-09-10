/**
 * Fuel Sales module hooks
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { FuelSale } from '../types/database';

export interface FuelSaleWithBus extends FuelSale {
  buses?: {
    registration_number: string;
    bus_name: string | null;
  };
}

export function useFuelSales(filters?: {
  startDate?: string;
  endDate?: string;
  saleType?: 'EXTERNAL_CUSTOMER' | 'INTERNAL_BUS';
  busId?: string;
}) {
  const [sales, setSales] = useState<FuelSaleWithBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSales();
  }, [filters]);

  async function fetchSales() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('fuel_sales')
        .select(`
          *,
          buses (
            registration_number,
            bus_name
          )
        `)
        .eq('status', 'active')
        .order('sale_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('sale_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('sale_date', filters.endDate);
      }

      if (filters?.saleType) {
        query = query.eq('sale_type', filters.saleType);
      }

      if (filters?.busId) {
        query = query.eq('bus_id', filters.busId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setSales(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fuel sales');
    } finally {
      setLoading(false);
    }
  }

  return { sales, loading, error, refetch: fetchSales };
}

export function useFuelSale(id: string | null) {
  const [sale, setSale] = useState<FuelSaleWithBus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSale();
    }
  }, [id]);

  async function fetchSale() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('fuel_sales')
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

      setSale(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fuel sale');
    } finally {
      setLoading(false);
    }
  }

  return { sale, loading, error, refetch: fetchSale };
}

export async function createFuelSale(data: {
  sale_date: string;
  sale_type: 'EXTERNAL_CUSTOMER' | 'INTERNAL_BUS';
  litres: number;
  sale_price_per_litre: number;
  cost_price_per_litre: number;
  total_amount: number;
  bus_id?: string;
  trip_id?: string;
  customer_name?: string;
  customer_phone?: string;
  receipt_number?: string;
  notes?: string;
}) {
  const { data: sale, error } = await supabase
    .from('fuel_sales')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return sale;
}

export async function updateFuelSale(
  id: string,
  data: Partial<{
    litres: number;
    sale_price_per_litre: number;
    total_amount: number;
    customer_name: string;
    customer_phone: string;
    receipt_number: string;
    notes: string;
  }>
) {
  const { data: sale, error } = await supabase
    .from('fuel_sales')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return sale;
}

export async function reverseFuelSale(id: string, reason: string) {
  const { error } = await supabase
    .from('fuel_sales')
    .update({
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function calculateWeightedAverageCost() {
  // Get all active purchases
  const { data: purchases } = await supabase
    .from('fuel_purchases')
    .select('litres, cost_per_litre')
    .eq('status', 'active');

  // Get all active sales
  const { data: sales } = await supabase
    .from('fuel_sales')
    .select('litres, cost_price_per_litre')
    .eq('status', 'active');

  // Get all active adjustments
  const { data: adjustments } = await supabase
    .from('fuel_stock_adjustments')
    .select('litres, cost_per_litre')
    .eq('status', 'active');

  // Calculate total stock and total cost
  let totalStock = 0;
  let totalCost = 0;

  // Add purchases
  if (purchases) {
    for (const p of purchases) {
      totalStock += p.litres;
      totalCost += p.litres * p.cost_per_litre;
    }
  }

  // Subtract sales
  if (sales) {
    for (const s of sales) {
      totalStock -= s.litres;
      totalCost -= s.litres * s.cost_price_per_litre;
    }
  }

  // Add adjustments
  if (adjustments) {
    for (const a of adjustments) {
      totalStock += a.litres;
      totalCost += a.litres * a.cost_per_litre;
    }
  }

  // Calculate weighted average cost
  if (totalStock <= 0) {
    return 0;
  }

  return totalCost / totalStock;
}
