/**
 * Shared utilities for petrol pump accounting calculations.
 * These ensure consistent accounting methodology across Dashboard and Reports.
 */

import type { FuelPurchase, FuelSale, FuelStockAdjustment } from '../types/database';

export interface WacEvent {
  type: 'purchase' | 'sale' | 'adjustment';
  date: Date;
  litres: number;
  costPerLitre?: number;
  createdAt: Date;
  totalAmount?: number;  // For sales - revenue
  saleType?: string;     // For categorization
}

export interface WacResult {
  totalCost: number;      // Total COGS for all sales in period
  closingStock: number;   // Closing stock litres
  closingValue: number;   // Closing stock value
  closingWac: number;     // Closing WAC per litre
}

/**
 * Calculate fuel COGS using perpetual WAC (Weighted Average Cost) method.
 * 
 * This matches the calculation used in Petrol Pump Reports.
 * Processes transactions chronologically and applies WAC at time of each sale.
 * 
 * @param openingStockLitres - Stock litres at period start
 * @param openingStockValue - Stock value at period start  
 * @param events - Chronologically sorted array of purchase/sale/adjustment events
 * @returns WacResult with totalCost (COGS), closing stock info
 */
export function calculateFuelCogsUsingWac(
  openingStockLitres: number,
  openingStockValue: number,
  events: WacEvent[]
): WacResult {
  let stock = openingStockLitres;
  let totalCost = openingStockValue;
  let wac = openingStockLitres > 0 ? openingStockValue / openingStockLitres : 0;
  
  let salesCogs = 0;  // Accumulated COGS for sales in this period
  
  for (const event of events) {
    if (event.type === 'purchase') {
      const purchaseCost = event.litres * (event.costPerLitre || 0);
      stock += event.litres;
      totalCost += purchaseCost;
      if (stock > 0) {
        wac = totalCost / stock;
      }
    } else if (event.type === 'sale') {
      const saleLitres = Math.min(event.litres, stock);
      const saleCost = saleLitres * wac;  // Apply current WAC
      stock -= saleLitres;
      totalCost -= saleCost;
      salesCogs += saleCost;  // Accumulate COGS
      
      if (stock <= 0) {
        stock = 0;
        totalCost = 0;
        wac = 0;
      }
    } else if (event.type === 'adjustment') {
      const adjCostPerLitre = event.costPerLitre !== undefined ? event.costPerLitre : wac;
      const adjCost = event.litres * adjCostPerLitre;
      stock += event.litres;
      totalCost += adjCost;
      if (stock > 0) {
        wac = totalCost / stock;
      }
      if (stock <= 0) {
        stock = 0;
        totalCost = 0;
        wac = 0;
      }
    }
  }
  
  return {
    totalCost: salesCogs,
    closingStock: stock,
    closingValue: totalCost,
    closingWac: stock > 0 ? wac : 0,
  };
}

/**
 * Build WacEvent arrays from raw data for a specific period.
 * Used to prepare data for calculateFuelCogsUsingWac.
 */
export function buildWacEvents(
  purchases: FuelPurchase[],
  sales: FuelSale[],
  adjustments: FuelStockAdjustment[],
  periodStart: string,
  periodEnd: string
): { prePeriodEvents: WacEvent[]; periodEvents: WacEvent[] } {
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  
  // Filter active records
  const activePurchases = purchases.filter(p => p.status === 'active');
  const activeSales = sales.filter(s => s.status === 'active');
  const activeAdjustments = adjustments.filter(a => a.status === 'active');
  
  // Pre-period events (for opening stock calculation)
  const prePeriodEvents: WacEvent[] = [];
  
  activePurchases
    .filter(p => new Date(p.purchase_date) < startDate)
    .forEach(p => {
      prePeriodEvents.push({
        type: 'purchase',
        date: new Date(p.purchase_date),
        litres: p.litres,
        costPerLitre: p.cost_per_litre,
        createdAt: new Date(p.created_at),
      });
    });
  
  activeSales
    .filter(s => new Date(s.sale_date) < startDate)
    .forEach(s => {
      prePeriodEvents.push({
        type: 'sale',
        date: new Date(s.sale_date),
        litres: s.litres,
        createdAt: new Date(s.created_at),
      });
    });
  
  activeAdjustments
    .filter(a => new Date(a.adjustment_date) < startDate)
    .forEach(a => {
      prePeriodEvents.push({
        type: 'adjustment',
        date: new Date(a.adjustment_date),
        litres: a.litres,
        costPerLitre: a.cost_per_litre || undefined,
        createdAt: new Date(a.created_at),
      });
    });
  
  // Sort pre-period events chronologically
  prePeriodEvents.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  
  // Period events (for current period calculation)
  const periodEvents: WacEvent[] = [];
  
  activePurchases
    .filter(p => {
      const d = new Date(p.purchase_date);
      return d >= startDate && d <= endDate;
    })
    .forEach(p => {
      periodEvents.push({
        type: 'purchase',
        date: new Date(p.purchase_date),
        litres: p.litres,
        costPerLitre: p.cost_per_litre,
        createdAt: new Date(p.created_at),
      });
    });
  
  activeSales
    .filter(s => {
      const d = new Date(s.sale_date);
      return d >= startDate && d <= endDate;
    })
    .forEach(s => {
      periodEvents.push({
        type: 'sale',
        date: new Date(s.sale_date),
        litres: s.litres,
        createdAt: new Date(s.created_at),
      });
    });
  
  activeAdjustments
    .filter(a => {
      const d = new Date(a.adjustment_date);
      return d >= startDate && d <= endDate;
    })
    .forEach(a => {
      periodEvents.push({
        type: 'adjustment',
        date: new Date(a.adjustment_date),
        litres: a.litres,
        costPerLitre: a.cost_per_litre || undefined,
        createdAt: new Date(a.created_at),
      });
    });
  
  // Sort period events chronologically
  periodEvents.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  
  return { prePeriodEvents, periodEvents };
}
