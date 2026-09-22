/**
 * Petrol Pump Reports Hook - Provides data for monthly fuel reports
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import type { FuelPurchase, FuelSale, FuelStockAdjustment } from '../types/database';

export interface PetrolPumpReportData {
  // Period info
  periodStart: string;
  periodEnd: string;
  
  // Opening & Closing Stock
  openingStock: {
    litres: number;
    value: number;
    wac: number;
  };
  closingStock: {
    litres: number;
    value: number;
    wac: number;
  };
  
  // Purchases summary (active only)
  purchases: {
    totalLitres: number;
    totalCost: number;
    averageCostPerLitre: number;
    recordCount: number;
  };
  
  // Sales summary (active only)
  sales: {
    totalLitres: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    recordCount: number;
  };
  
  // Bus fuel summary (active only)
  busFuel: {
    totalLitres: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    recordCount: number;
  };
  
  // External sales summary (active only)
  externalSales: {
    totalLitres: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    recordCount: number;
  };
  
  // Detailed records (all records including reversed for audit)
  purchaseRecords: FuelPurchase[];
  saleRecords: FuelSale[];
  adjustmentRecords: FuelStockAdjustment[];
  
  // Reversed records (separate for clarity)
  reversedPurchases: FuelPurchase[];
  reversedSales: FuelSale[];
  reversedAdjustments: FuelStockAdjustment[];
  
  // Selling price history
  sellingPriceHistory: Array<{
    date: string;
    price: number;
  }>;
  
  // WAC history (for reference)
  wacHistory: Array<{
    date: string;
    wac: number;
    stock: number;
  }>;
}

export function usePetrolPumpReport(year: number, month: number) {
  const [report, setReport] = useState<PetrolPumpReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true);
        setError(null);

        // Calculate period start and end dates
        const periodStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const periodEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Fetch ALL purchases (including reversed) ordered chronologically
        const { data: purchases, error: purchasesError } = await supabase
          .from('fuel_purchases')
          .select('*')
          .order('purchase_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (purchasesError) throw purchasesError;

        // Fetch ALL sales (including reversed) ordered chronologically
        const { data: sales, error: salesError } = await supabase
          .from('fuel_sales')
          .select('*')
          .order('sale_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (salesError) throw salesError;

        // Fetch ALL adjustments (including reversed) ordered chronologically
        const { data: adjustments, error: adjustmentsError } = await supabase
          .from('fuel_stock_adjustments')
          .select('*')
          .order('adjustment_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (adjustmentsError) throw adjustmentsError;

        // Separate active and reversed records
        const activePurchases = (purchases || []).filter(p => p.status === 'active');
        const reversedPurchases = (purchases || []).filter(p => p.status === 'reversed' || p.status === 'cancelled');
        
        const activeSales = (sales || []).filter(s => s.status === 'active');
        const reversedSales = (sales || []).filter(s => s.status === 'reversed' || s.status === 'cancelled');
        
        const activeAdjustments = (adjustments || []).filter(a => a.status === 'active');
        const reversedAdjustments = (adjustments || []).filter(a => a.status === 'reversed' || a.status === 'cancelled');

        // Filter records by period for display (all records, not just active)
        const periodPurchases = (purchases || []).filter(p => {
          const pDate = new Date(p.purchase_date);
          return pDate >= new Date(periodStart) && pDate <= new Date(periodEnd);
        });

        const periodSales = (sales || []).filter(s => {
          const sDate = new Date(s.sale_date);
          return sDate >= new Date(periodStart) && sDate <= new Date(periodEnd);
        });

        const periodAdjustments = (adjustments || []).filter(a => {
          const aDate = new Date(a.adjustment_date);
          return aDate >= new Date(periodStart) && aDate <= new Date(periodEnd);
        });

        // Calculate opening stock (all ACTIVE transactions before period start)
        const prePeriodActivePurchases = activePurchases.filter(p => new Date(p.purchase_date) < new Date(periodStart));
        const prePeriodActiveSales = activeSales.filter(s => new Date(s.sale_date) < new Date(periodStart));
        const prePeriodActiveAdjustments = activeAdjustments.filter(a => new Date(a.adjustment_date) < new Date(periodStart));

        let openingStockLitres = 0;
        let openingStockValue = 0;

        // Process pre-period transactions to calculate opening stock
        const prePeriodEvents: Array<{
          type: 'purchase' | 'sale' | 'adjustment';
          date: Date;
          litres: number;
          costPerLitre?: number;
          createdAt: Date;
        }> = [];

        prePeriodActivePurchases.forEach(p => {
          prePeriodEvents.push({
            type: 'purchase',
            date: new Date(p.purchase_date),
            litres: p.litres,
            costPerLitre: p.cost_per_litre,
            createdAt: new Date(p.created_at),
          });
        });

        prePeriodActiveSales.forEach(s => {
          prePeriodEvents.push({
            type: 'sale',
            date: new Date(s.sale_date),
            litres: s.litres,
            createdAt: new Date(s.created_at),
          });
        });

        prePeriodActiveAdjustments.forEach(a => {
          prePeriodEvents.push({
            type: 'adjustment',
            date: new Date(a.adjustment_date),
            litres: a.litres,
            costPerLitre: a.cost_per_litre || undefined,
            createdAt: new Date(a.created_at),
          });
        });

        // Sort by date then created_at
        prePeriodEvents.sort((a, b) => {
          const dateDiff = a.date.getTime() - b.date.getTime();
          if (dateDiff !== 0) return dateDiff;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

        // Process pre-period events using perpetual WAC
        let stock = 0;
        let totalCost = 0;
        let wac = 0;

        for (const event of prePeriodEvents) {
          if (event.type === 'purchase') {
            const purchaseCost = event.litres * (event.costPerLitre || 0);
            stock += event.litres;
            totalCost += purchaseCost;
            if (stock > 0) {
              wac = totalCost / stock;
            }
          } else if (event.type === 'sale') {
            const saleLitres = Math.min(event.litres, stock);
            const saleCost = saleLitres * wac;
            stock -= saleLitres;
            totalCost -= saleCost;
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

        openingStockLitres = stock;
        openingStockValue = totalCost;
        const openingWAC = stock > 0 ? wac : 0;

        // Now process period ACTIVE transactions to get closing stock and build WAC history
        const periodEvents: Array<{
          type: 'purchase' | 'sale' | 'adjustment';
          date: Date;
          litres: number;
          costPerLitre?: number;
          createdAt: Date;
          originalRecord: any;
        }> = [];

        // Filter to active records only for WAC/inventory calculations
        const activePeriodPurchases = periodPurchases.filter(p => p.status === 'active');
        const activePeriodSales = periodSales.filter(s => s.status === 'active');
        const activePeriodAdjustments = periodAdjustments.filter(a => a.status === 'active');

        activePeriodPurchases.forEach(p => {
          periodEvents.push({
            type: 'purchase',
            date: new Date(p.purchase_date),
            litres: p.litres,
            costPerLitre: p.cost_per_litre,
            createdAt: new Date(p.created_at),
            originalRecord: p,
          });
        });

        activePeriodSales.forEach(s => {
          periodEvents.push({
            type: 'sale',
            date: new Date(s.sale_date),
            litres: s.litres,
            createdAt: new Date(s.created_at),
            originalRecord: s,
          });
        });

        activePeriodAdjustments.forEach(a => {
          periodEvents.push({
            type: 'adjustment',
            date: new Date(a.adjustment_date),
            litres: a.litres,
            costPerLitre: a.cost_per_litre || undefined,
            createdAt: new Date(a.created_at),
            originalRecord: a,
          });
        });

        // Sort by date then created_at
        periodEvents.sort((a, b) => {
          const dateDiff = a.date.getTime() - b.date.getTime();
          if (dateDiff !== 0) return dateDiff;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

        // Start with opening stock
        stock = openingStockLitres;
        totalCost = openingStockValue;
        wac = openingWAC;

        const wacHistory: Array<{ date: string; wac: number; stock: number }> = [];
        const sellingPriceHistory: Array<{ date: string; price: number }> = [];

        // Track sales with their historical cost
        let periodSalesLitres = 0;
        let periodSalesRevenue = 0;
        let periodSalesCost = 0;
        let periodBusLitres = 0;
        let periodBusRevenue = 0;
        let periodBusCost = 0;
        let periodExternalLitres = 0;
        let periodExternalRevenue = 0;
        let periodExternalCost = 0;

        for (const event of periodEvents) {
          if (event.type === 'purchase') {
            const purchaseCost = event.litres * (event.costPerLitre || 0);
            stock += event.litres;
            totalCost += purchaseCost;
            if (stock > 0) {
              wac = totalCost / stock;
            }
            wacHistory.push({
              date: event.date.toISOString(),
              wac,
              stock,
            });
          } else if (event.type === 'sale') {
            const saleLitres = Math.min(event.litres, stock);
            const saleCost = saleLitres * wac;
            stock -= saleLitres;
            totalCost -= saleCost;

            // Get the original sale record to categorize
            const saleRecord = event.originalRecord as FuelSale;
            periodSalesLitres += saleLitres;
            periodSalesRevenue += saleRecord.total_amount || 0;
            periodSalesCost += saleCost;

            if (saleRecord.sale_type === 'INTERNAL_BUS') {
              periodBusLitres += saleLitres;
              periodBusRevenue += saleRecord.total_amount || 0;
              periodBusCost += saleCost;
            } else if (saleRecord.sale_type === 'EXTERNAL_CUSTOMER') {
              periodExternalLitres += saleLitres;
              periodExternalRevenue += saleRecord.total_amount || 0;
              periodExternalCost += saleCost;
            }

            // Track selling price history
            sellingPriceHistory.push({
              date: event.date.toISOString(),
              price: saleRecord.sale_price_per_litre,
            });

            if (stock <= 0) {
              stock = 0;
              totalCost = 0;
              wac = 0;
            }
            wacHistory.push({
              date: event.date.toISOString(),
              wac,
              stock,
            });
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
            wacHistory.push({
              date: event.date.toISOString(),
              wac,
              stock,
            });
          }
        }

        const closingStockLitres = stock;
        const closingStockValue = totalCost;
        const closingWAC = stock > 0 ? wac : 0;

        // Calculate purchases summary (ACTIVE only for financial totals)
        const activePeriodPurchaseRecords = periodPurchases.filter(p => p.status === 'active');
        const totalPurchaseLitres = activePeriodPurchaseRecords.reduce((sum, p) => sum + p.litres, 0);
        const totalPurchaseCost = activePeriodPurchaseRecords.reduce((sum, p) => sum + p.total_cost, 0);
        const avgPurchaseCost = totalPurchaseLitres > 0 ? totalPurchaseCost / totalPurchaseLitres : 0;

        // Deduplicate selling price history by date
        const uniqueSellingPrices = sellingPriceHistory.reduce((acc, curr) => {
          const dateKey = curr.date.split('T')[0];
          const existing = acc.find(p => p.date.split('T')[0] === dateKey);
          if (!existing) {
            acc.push(curr);
          } else if (existing.price !== curr.price) {
            // Price changed on same day, keep the later one
            existing.price = curr.price;
          }
          return acc;
        }, [] as Array<{ date: string; price: number }>);

        setReport({
          periodStart,
          periodEnd,
          openingStock: {
            litres: openingStockLitres,
            value: openingStockValue,
            wac: openingWAC,
          },
          closingStock: {
            litres: closingStockLitres,
            value: closingStockValue,
            wac: closingWAC,
          },
          purchases: {
            totalLitres: totalPurchaseLitres,
            totalCost: totalPurchaseCost,
            averageCostPerLitre: avgPurchaseCost,
            recordCount: activePeriodPurchaseRecords.length,
          },
          sales: {
            totalLitres: periodSalesLitres,
            totalRevenue: periodSalesRevenue,
            totalCost: periodSalesCost,
            grossProfit: periodSalesRevenue - periodSalesCost,
            recordCount: activePeriodSales.length,
          },
          busFuel: {
            totalLitres: periodBusLitres,
            totalRevenue: periodBusRevenue,
            totalCost: periodBusCost,
            grossProfit: periodBusRevenue - periodBusCost,
            recordCount: activePeriodSales.filter(s => s.sale_type === 'INTERNAL_BUS').length,
          },
          externalSales: {
            totalLitres: periodExternalLitres,
            totalRevenue: periodExternalRevenue,
            totalCost: periodExternalCost,
            grossProfit: periodExternalRevenue - periodExternalCost,
            recordCount: activePeriodSales.filter(s => s.sale_type === 'EXTERNAL_CUSTOMER').length,
          },
          purchaseRecords: periodPurchases,
          saleRecords: periodSales,
          adjustmentRecords: periodAdjustments,
          reversedPurchases: periodPurchases.filter(p => p.status === 'reversed' || p.status === 'cancelled'),
          reversedSales: periodSales.filter(s => s.status === 'reversed' || s.status === 'cancelled'),
          reversedAdjustments: periodAdjustments.filter(a => a.status === 'reversed' || a.status === 'cancelled'),
          sellingPriceHistory: uniqueSellingPrices,
          wacHistory,
        });

        setLoading(false);
      } catch (err) {
        logError(err, 'usePetrolPumpReport');
        setError(err instanceof Error ? err.message : 'Failed to load petrol pump report');
        setLoading(false);
      }
    }

    fetchReport();
  }, [year, month]);

  return { report, loading, error };
}
