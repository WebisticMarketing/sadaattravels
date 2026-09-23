import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import { useCompanyAccounting } from './useCompanyAccounting';
import type { CompanyAccountingResult } from '../lib/companyAccounting';

export interface OverallSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  tripRevenue: number;
  tripExpenses: number;
  maintenanceCost: number;
  tyreCost: number;
  addaIncome: number;
  addaExpenses: number;
  cargoRevenue: number;
  cargoExpenses: number;
  /** Gross pump revenue — ALL active fuel sales (EXTERNAL_CUSTOMER + INTERNAL_BUS). Locked rule. */
  pumpRevenue: number;
  pumpExternalRevenue: number;
  pumpInternalRevenue: number;
  /** Perpetual WAC COGS — same engine the Petrol Pump Reports reference uses. */
  pumpCogsWac: number;
  pumpGrossProfit: number;
  pumpOperatingExpenses: number;
  /** Informational only: pump.revenue - cogs - opEx. NEVER added to revenue or expenses. */
  pumpNetProfit: number;
  /** Isolated legacy treatment: full payments on installment_type='taken' loans. */
  installmentPayments: number;
  /** Full shared-engine result for reconciliation-aware display. */
  accounting: CompanyAccountingResult;
}

export interface BusProfitability {
  busId: string;
  registrationNumber: string;
  busName: string | null;
  totalRevenue: number;
  totalExpenses: number;
  maintenanceCost: number;
  tyreCost: number;
  netProfit: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Fetch overall business summary for a date range.
 *
 * ALL company-wide accounting comes from the SHARED ENGINE
 * (src/lib/companyAccounting.ts) — the exact same computation the Dashboard
 * runs. This hook performs no accounting arithmetic of its own.
 */
export function useOverallSummary(dateRange: DateRange) {
  const period = { start: dateRange.startDate, end: dateRange.endDate };
  const { result: accounting, error: acctError } = useCompanyAccounting(period);

  const [summary, setSummary] = useState<OverallSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (acctError) {
      logError(acctError, 'useOverallSummary');
      setError(acctError);
      setSummary(null);
      setLoading(false);
      return;
    }
    if (!accounting) {
      setLoading(true);
      return;
    }
    const r = accounting.revenue;
    const e = accounting.expenses;
    const p = accounting.units.pump;
    setSummary({
      totalRevenue: accounting.company.revenue,
      totalExpenses: accounting.company.expenses,
      totalProfit: accounting.company.netProfit,
      tripRevenue: r.trips,
      tripExpenses: e.trips,
      maintenanceCost: e.maintenance,
      tyreCost: e.tyres,
      addaIncome: r.adda,
      addaExpenses: e.adda,
      cargoRevenue: r.cargo,
      cargoExpenses: e.cargo,
      pumpRevenue: p.revenue,
      pumpExternalRevenue: p.externalRevenue,
      pumpInternalRevenue: p.internalRevenue,
      pumpCogsWac: p.cogs,
      pumpGrossProfit: p.grossProfit,
      pumpOperatingExpenses: p.operatingExpenses,
      pumpNetProfit: p.netProfit,
      installmentPayments: e.installmentPayments,
      accounting,
    });
    setError(null);
    setLoading(false);
  }, [accounting, acctError]);

  return { summary, loading, error };
}

/**
 * Fetch bus profitability for a date range
 */
export function useBusProfitability(dateRange: DateRange) {
  const [buses, setBuses] = useState<BusProfitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBusProfitability() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all buses
        const { data: busesData, error: busesError } = await supabase
          .from('buses')
          .select('id, registration_number, bus_name');

        if (busesError) throw busesError;

        if (!busesData || busesData.length === 0) {
          setBuses([]);
          setLoading(false);
          return;
        }

        // Calculate profitability for each bus
        const busProfitability: BusProfitability[] = await Promise.all(
          busesData.map(async (bus) => {
            // Fetch trips for this bus
            const { data: trips, error: tripsError } = await supabase
              .from('trips')
              .select('id')
              .eq('bus_id', bus.id)
              .eq('status', 'active')
              .gte('trip_date', dateRange.startDate)
              .lte('trip_date', dateRange.endDate);

            if (tripsError) throw tripsError;

            let totalRevenue = 0;
            let totalExpenses = 0;

            if (trips && trips.length > 0) {
              const tripIds = trips.map(t => t.id);

              // Fetch revenue
              const { data: revenueEntries, error: revenueError } = await supabase
                .from('trip_revenue_entries')
                .select('amount')
                .in('trip_id', tripIds)
                .eq('status', 'active');

              if (revenueError) throw revenueError;
              totalRevenue = revenueEntries?.reduce((sum, r) => sum + r.amount, 0) || 0;

              // Fetch expenses
              const { data: expenseEntries, error: expenseError } = await supabase
                .from('trip_expenses')
                .select('amount')
                .in('trip_id', tripIds)
                .eq('status', 'active');

              if (expenseError) throw expenseError;
              totalExpenses = expenseEntries?.reduce((sum, e) => sum + e.amount, 0) || 0;
            }

            // Fetch maintenance costs
            const { data: maintenanceRecords, error: maintenanceError } = await supabase
              .from('maintenance_records')
              .select('cost')
              .eq('bus_id', bus.id)
              .eq('status', 'active')
              .gte('maintenance_date', dateRange.startDate)
              .lte('maintenance_date', dateRange.endDate);

            if (maintenanceError) throw maintenanceError;
            const maintenanceCost = maintenanceRecords?.reduce((sum, m) => sum + m.cost, 0) || 0;

            // Fetch tyre costs
            const { data: tyreRecords, error: tyreError } = await supabase
              .from('tyre_records')
              .select('total_cost')
              .eq('bus_id', bus.id)
              .eq('status', 'active')
              .gte('purchase_date', dateRange.startDate)
              .lte('purchase_date', dateRange.endDate);

            if (tyreError) throw tyreError;
            const tyreCost = tyreRecords?.reduce((sum, t) => sum + t.total_cost, 0) || 0;

            // Calculate net profit
            const netProfit = totalRevenue - totalExpenses - maintenanceCost - tyreCost;

            return {
              busId: bus.id,
              registrationNumber: bus.registration_number,
              busName: bus.bus_name,
              totalRevenue,
              totalExpenses,
              maintenanceCost,
              tyreCost,
              netProfit,
            };
          })
        );

        setBuses(busProfitability);
        setLoading(false);
      } catch (err) {
        logError(err, 'useBusProfitability');
        setError(err instanceof Error ? err.message : 'Failed to load bus profitability');
        setLoading(false);
      }
    }

    fetchBusProfitability();
  }, [dateRange.startDate, dateRange.endDate]);

  return { buses, loading, error };
}
