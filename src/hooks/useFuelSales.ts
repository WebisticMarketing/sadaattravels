/**
 * Fuel Sales module hooks
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { FuelSale, FuelSaleExpenseLink } from '../types/database';

export interface FuelSaleWithBus extends FuelSale {
  buses?: {
    registration_number: string;
    bus_name: string | null;
  };
  trips?: {
    id: string;
    trip_date: string;
    route: string;
  } | null;
}

export interface FuelSaleWithLinks extends FuelSaleWithBus {
  expense_link?: FuelSaleExpenseLink;
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
  }, [filters?.startDate, filters?.endDate, filters?.saleType, filters?.busId]);

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
          ),
          trips (
            id,
            trip_date,
            route
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

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

/**
 * Create a fuel sale and optionally link it to a trip expense
 */
/**
 * Calculate current available diesel stock
 * Returns total purchased - total sold (all sales)
 */
export async function calculateCurrentStock(): Promise<number> {
  // Get all active purchases
  const { data: purchases } = await supabase
    .from('fuel_purchases')
    .select('litres')
    .eq('status', 'active');

  // Get all active sales (both INTERNAL_BUS and EXTERNAL_CUSTOMER)
  const { data: sales } = await supabase
    .from('fuel_sales')
    .select('litres')
    .eq('status', 'active');

  // Get all active adjustments
  const { data: adjustments } = await supabase
    .from('fuel_stock_adjustments')
    .select('litres')
    .eq('status', 'active');

  let totalStock = 0;

  // Add purchases
  if (purchases) {
    for (const p of purchases) {
      totalStock += p.litres;
    }
  }

  // Subtract sales
  if (sales) {
    for (const s of sales) {
      totalStock -= s.litres;
    }
  }

  // Add adjustments
  if (adjustments) {
    for (const a of adjustments) {
      totalStock += a.litres;
    }
  }

  return totalStock;
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
}, options?: {
  /** If true and sale_type is INTERNAL_BUS with trip_id, link to existing expense (do NOT create new) */
  linkToTripExpense?: boolean;
}) {
  const { linkToTripExpense = true } = options || {};
  
  // STOCK VALIDATION: Check if sufficient stock exists before creating any sale
  const currentStock = await calculateCurrentStock();
  if (data.litres > currentStock) {
    throw new Error(
      `Insufficient diesel stock. Available stock: ${currentStock.toFixed(2)} L. Requested: ${data.litres.toFixed(2)} L.`
    );
  }
  
  // For INTERNAL_BUS sales with trip_id, validate that a diesel expense already exists
  if (linkToTripExpense && data.sale_type === 'INTERNAL_BUS' && data.trip_id) {
    // Check if a diesel expense already exists for this trip
    const { data: existingExpenses, error: expenseFetchError } = await supabase
      .from('trip_expenses')
      .select('id, amount')
      .eq('trip_id', data.trip_id)
      .eq('expense_type', 'diesel')
      .eq('status', 'active')
      .maybeSingle();

    if (expenseFetchError) throw expenseFetchError;

    if (!existingExpenses) {
      // Reject the sale - no diesel expense exists on the voucher
      throw new Error(
        'This voucher has no Diesel expense. Please add the Diesel amount to the voucher first before recording fuel.'
      );
    }

    // Reuse existing diesel expense - do NOT create a new one
    const tripExpenseId = existingExpenses.id;

    // Check if this trip expense is already linked BEFORE creating a new fuel sale
    if (linkToTripExpense && tripExpenseId) {
      const { data: existingLink } = await supabase
        .from('fuel_sale_expense_links')
        .select('id')
        .eq('trip_expense_id', tripExpenseId)
        .maybeSingle();

      if (existingLink) {
        throw new Error('This voucher\'s diesel expense is already linked to another fuel sale. Please select a different voucher.');
      }
    }

    // First, create the fuel sale
    const { data: sale, error: saleError } = await supabase
      .from('fuel_sales')
      .insert([data])
      .select()
      .single();

    if (saleError) {
      console.error('[FuelSale Debug] SUPABASE ERROR', saleError);
      console.error('[FuelSale Debug] ERROR CODE', saleError.code);
      console.error('[FuelSale Debug] ERROR MESSAGE', saleError.message);
      console.error('[FuelSale Debug] ERROR DETAILS', saleError.details);
      console.error('[FuelSale Debug] ERROR HINT', saleError.hint);
      console.error('[FuelSale Debug] INSERT PAYLOAD', data);
      throw saleError;
    }

    // Create the fuel_sale_expense_links record
    const { error: linkError } = await supabase
      .from('fuel_sale_expense_links')
      .insert({
        fuel_sale_id: sale.id,
        trip_expense_id: tripExpenseId,
        auto_created: false,
        notes: 'Linked to existing diesel expense from voucher',
      });

    if (linkError) {
      // Check if it's a duplicate key error (constraint violation)
      if (linkError.code === '23505') {
        // This should not happen due to the pre-check above, but handle it just in case
        throw new Error('This voucher\'s diesel expense is already linked to another fuel sale. Please select a different voucher.');
      }
      throw linkError;
    }

    return sale;
  }

  // For EXTERNAL_CUSTOMER or when linkToTripExpense is false
  const { data: sale, error: saleError } = await supabase
    .from('fuel_sales')
    .insert([data])
    .select()
    .single();

  if (saleError) throw saleError;

  return sale;
}

/**
 * Editable metadata fields for a fuel sale.
 *
 * IMPORTANT: this intentionally EXCLUDES every financially significant
 * column (litres, sale_price_per_litre, total_amount, cost_price_per_litre,
 * sale_date, trip_id, bus_id, status). Changing those would silently break
 * WAC / stock / COGS calculations, so they can only be corrected through
 * the existing reversal workflow — never through client-side edits.
 */
export type FuelSaleEditableFields = Pick<
  FuelSale,
  'customer_name' | 'customer_phone' | 'receipt_number' | 'notes'
>;

export async function updateFuelSaleMetadata(
  id: string,
  data: Partial<FuelSaleEditableFields>
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

/**
 * Calculate current weighted-average cost using perpetual weighted-average costing.
 * 
 * This processes all transactions chronologically to maintain correct inventory layers:
 * - Purchases add to inventory and recalculate the weighted-average cost
 * - Sales reduce inventory at the current weighted-average cost (no cost change)
 * - Adjustments add/subtract inventory at specified cost or current WAC
 * 
 * When inventory reaches 0, the next purchase establishes a fresh cost basis.
 */
export async function calculateWeightedAverageCost(): Promise<number> {
  // Get all active purchases ordered by date and created_at for precise ordering
  const { data: purchases } = await supabase
    .from('fuel_purchases')
    .select('litres, cost_per_litre, purchase_date, created_at')
    .eq('status', 'active')
    .order('purchase_date', { ascending: true })
    .order('created_at', { ascending: true });

  // Get all active sales ordered by date/time and created_at for precise ordering
  const { data: sales } = await supabase
    .from('fuel_sales')
    .select('litres, sale_date, created_at')
    .eq('status', 'active')
    .order('sale_date', { ascending: true })
    .order('created_at', { ascending: true });

  // Get all active adjustments ordered by date and created_at for precise ordering
  const { data: adjustments } = await supabase
    .from('fuel_stock_adjustments')
    .select('litres, cost_per_litre, adjustment_date, created_at')
    .eq('status', 'active')
    .order('adjustment_date', { ascending: true })
    .order('created_at', { ascending: true });

  // Build a combined timeline of all transactions
  interface InventoryEvent {
    type: 'purchase' | 'sale' | 'adjustment';
    date: Date;
    litres: number;
    costPerLitre?: number;
    createdAt: Date;
  }

  const events: InventoryEvent[] = [];

  // Add purchases
  if (purchases) {
    purchases.forEach((p) => {
      events.push({
        type: 'purchase',
        date: new Date(p.purchase_date),
        litres: p.litres,
        costPerLitre: p.cost_per_litre,
        createdAt: new Date(p.created_at),
      });
    });
  }

  // Add sales (sales don't change WAC, they just reduce quantity)
  if (sales) {
    sales.forEach((s) => {
      events.push({
        type: 'sale',
        date: new Date(s.sale_date),
        litres: s.litres,
        createdAt: new Date(s.created_at),
      });
    });
  }

  // Add adjustments
  if (adjustments) {
    adjustments.forEach((a) => {
      events.push({
        type: 'adjustment',
        date: new Date(a.adjustment_date),
        litres: a.litres,
        costPerLitre: a.cost_per_litre,
        createdAt: new Date(a.created_at),
      });
    });
  }

  // Sort events chronologically by date, then by created_at for tie-breaking
  events.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  // Process events using perpetual weighted-average costing
  let currentStock = 0;
  let currentTotalCost = 0;
  let currentWAC = 0;

  for (const event of events) {
    if (event.type === 'purchase') {
      // Purchase: add litres and recalculate WAC
      const purchaseCost = event.litres * (event.costPerLitre || 0);
      currentStock += event.litres;
      currentTotalCost += purchaseCost;
      
      // Recalculate WAC
      if (currentStock > 0) {
        currentWAC = currentTotalCost / currentStock;
      }
    } else if (event.type === 'sale') {
      // Sale: reduce stock at current WAC (WAC doesn't change)
      // Ensure we don't go negative (should be prevented by validation, but handle gracefully)
      const saleLitres = Math.min(event.litres, currentStock);
      const saleCost = saleLitres * currentWAC;
      
      currentStock -= saleLitres;
      currentTotalCost -= saleCost;
      
      // WAC remains the same after a sale (perpetual method)
      // But if stock reaches 0, reset
      if (currentStock <= 0) {
        currentStock = 0;
        currentTotalCost = 0;
        currentWAC = 0;
      }
    } else if (event.type === 'adjustment') {
      // Adjustment: add/subtract litres
      // If cost_per_litre is provided, use it; otherwise use current WAC
      const adjCostPerLitre = event.costPerLitre !== undefined && event.costPerLitre !== null
        ? event.costPerLitre
        : currentWAC;
      
      const adjCost = event.litres * adjCostPerLitre;
      currentStock += event.litres;
      currentTotalCost += adjCost;
      
      // Recalculate WAC
      if (currentStock > 0) {
        currentWAC = currentTotalCost / currentStock;
      }
      
      // Handle negative stock from adjustment
      if (currentStock <= 0) {
        currentStock = 0;
        currentTotalCost = 0;
        currentWAC = 0;
      }
    }
  }

  return currentWAC;
}

/**
 * Get the current universal diesel selling price per liter
 * Returns 0 if settings are not loaded or unavailable
 */
export async function getUniversalDieselSellingPrice(): Promise<number> {
  const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';
  
  const { data, error } = await supabase
    .from('petrol_pump_settings')
    .select('diesel_selling_price_per_litre')
    .eq('id', SETTINGS_ID)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.diesel_selling_price_per_litre;
}
