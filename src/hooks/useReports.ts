import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';

export interface OverallSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  tripRevenue: number;
  tripExpenses: number;
  maintenanceCost: number;
  tyreCost: number;
  addaProfit: number;
  cargoProfit: number;
  fuelProfit: number;
  installmentPayments: number;
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
 * Fetch overall business summary for a date range
 */
export function useOverallSummary(dateRange: DateRange) {
  const [summary, setSummary] = useState<OverallSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        setError(null);

        // Fetch trip revenue
        const { data: trips, error: tripsError } = await supabase
          .from('trips')
          .select('id, trip_date, status')
          .gte('trip_date', dateRange.startDate)
          .lte('trip_date', dateRange.endDate)
          .eq('status', 'active');

        if (tripsError) throw tripsError;

        let tripRevenue = 0;
        let tripExpenses = 0;

        if (trips && trips.length > 0) {
          const tripIds = trips.map(t => t.id);

          // Fetch revenue entries
          const { data: revenueEntries, error: revenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (revenueError) throw revenueError;
          tripRevenue = revenueEntries?.reduce((sum, r) => sum + r.amount, 0) || 0;

          // Fetch expense entries
          const { data: expenseEntries, error: expenseError } = await supabase
            .from('trip_expenses')
            .select('amount')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (expenseError) throw expenseError;
          tripExpenses = expenseEntries?.reduce((sum, e) => sum + e.amount, 0) || 0;
        }

        // Fetch maintenance costs
        const { data: maintenanceRecords, error: maintenanceError } = await supabase
          .from('maintenance_records')
          .select('cost')
          .gte('maintenance_date', dateRange.startDate)
          .lte('maintenance_date', dateRange.endDate)
          .eq('status', 'active');

        if (maintenanceError) throw maintenanceError;
        const maintenanceCost = maintenanceRecords?.reduce((sum, m) => sum + m.cost, 0) || 0;

        // Fetch tyre costs
        const { data: tyreRecords, error: tyreError } = await supabase
          .from('tyre_records')
          .select('total_cost')
          .gte('purchase_date', dateRange.startDate)
          .lte('purchase_date', dateRange.endDate)
          .eq('status', 'active');

        if (tyreError) throw tyreError;
        const tyreCost = tyreRecords?.reduce((sum, t) => sum + t.total_cost, 0) || 0;

        // Fetch adda income and expenses
        const { data: addaIncome, error: addaIncomeError } = await supabase
          .from('adda_income')
          .select('amount')
          .gte('income_date', dateRange.startDate)
          .lte('income_date', dateRange.endDate)
          .eq('status', 'active');

        if (addaIncomeError) throw addaIncomeError;
        const addaIncomeTotal = addaIncome?.reduce((sum, i) => sum + i.amount, 0) || 0;

        const { data: addaExpenses, error: addaExpensesError } = await supabase
          .from('adda_expenses')
          .select('amount')
          .gte('expense_date', dateRange.startDate)
          .lte('expense_date', dateRange.endDate)
          .eq('status', 'active');

        if (addaExpensesError) throw addaExpensesError;
        const addaExpensesTotal = addaExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
        const addaProfit = addaIncomeTotal - addaExpensesTotal;

        // Fetch cargo revenue and expenses
        const { data: cargoRecords, error: cargoError } = await supabase
          .from('cargo_records')
          .select('revenue, expenses')
          .gte('shipment_date', dateRange.startDate)
          .lte('shipment_date', dateRange.endDate)
          .eq('status', 'active');

        if (cargoError) throw cargoError;
        const cargoRevenue = cargoRecords?.reduce((sum, c) => sum + c.revenue, 0) || 0;
        const cargoExpenses = cargoRecords?.reduce((sum, c) => sum + c.expenses, 0) || 0;
        const cargoProfit = cargoRevenue - cargoExpenses;

        // Fetch fuel profit (external sales only)
        const { data: fuelSales, error: fuelError } = await supabase
          .from('fuel_sales')
          .select('total_amount, cost_price_per_litre, litres')
          .eq('sale_type', 'EXTERNAL_CUSTOMER')
          .gte('sale_date', dateRange.startDate)
          .lte('sale_date', dateRange.endDate)
          .eq('status', 'active');

        if (fuelError) throw fuelError;
        const fuelRevenue = fuelSales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
        const fuelCost = fuelSales?.reduce((sum, s) => sum + (s.cost_price_per_litre * s.litres), 0) || 0;
        const fuelProfit = fuelRevenue - fuelCost;

        // Fetch installment payments (taken only - these are expenses)
        const { data: installments, error: installmentsError } = await supabase
          .from('installments')
          .select('id')
          .eq('installment_type', 'taken');

        if (installmentsError) throw installmentsError;

        let installmentPayments = 0;
        if (installments && installments.length > 0) {
          const installmentIds = installments.map(i => i.id);

          const { data: payments, error: paymentsError } = await supabase
            .from('installment_payments')
            .select('amount, payment_date')
            .in('installment_id', installmentIds)
            .gte('payment_date', dateRange.startDate)
            .lte('payment_date', dateRange.endDate)
            .eq('status', 'active');

          if (paymentsError) throw paymentsError;
          installmentPayments = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        }

        // Calculate totals
        const totalRevenue = tripRevenue + addaIncomeTotal + cargoRevenue + fuelRevenue;
        const totalExpenses = tripExpenses + maintenanceCost + tyreCost + addaExpensesTotal + cargoExpenses + fuelCost + installmentPayments;
        const totalProfit = totalRevenue - totalExpenses;

        setSummary({
          totalRevenue,
          totalExpenses,
          totalProfit,
          tripRevenue,
          tripExpenses,
          maintenanceCost,
          tyreCost,
          addaProfit,
          cargoProfit,
          fuelProfit,
          installmentPayments,
        });

        setLoading(false);
      } catch (err) {
        logError(err, 'useOverallSummary');
        setError(err instanceof Error ? err.message : 'Failed to load summary');
        setLoading(false);
      }
    }

    fetchSummary();
  }, [dateRange.startDate, dateRange.endDate]);

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
