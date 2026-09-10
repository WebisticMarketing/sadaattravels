/**
 * Dashboard data fetching hooks
 * 
 * Fetches and calculates dashboard metrics from Supabase
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';

export interface DashboardMetrics {
  today: {
    trips: number;
    revenue: number;
    expenses: number;
    profit: number;
  };
  thisMonth: {
    trips: number;
    revenue: number;
    expenses: number;
    profit: number;
  };
  buses: {
    total: number;
    active: number;
  };
  fuel: {
    currentStock: number;
  };
}

/**
 * Get today's date in Asia/Karachi timezone
 */
function getTodayPKT(): string {
  const now = new Date();
  const karachiOffset = 5 * 60; // UTC+5 in minutes
  const localOffset = now.getTimezoneOffset();
  const karachiTime = new Date(now.getTime() + (karachiOffset + localOffset) * 60000);
  return karachiTime.toISOString().split('T')[0];
}

/**
 * Get first day of current month in Asia/Karachi timezone
 */
function getMonthStartPKT(): string {
  const today = getTodayPKT();
  return today.substring(0, 8) + '01';
}

/**
 * Fetch dashboard metrics from database
 */
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const today = getTodayPKT();
        const monthStart = getMonthStartPKT();

        // Fetch today's trips
        const { data: todayTrips, error: todayError } = await supabase
          .from('trips')
          .select('id, trip_date, status')
          .eq('trip_date', today)
          .eq('status', 'active');

        if (todayError) throw todayError;

        // Fetch today's revenue and expenses
        let todayRevenue = 0;
        let todayExpenses = 0;

        if (todayTrips && todayTrips.length > 0) {
          const tripIds = todayTrips.map(t => t.id);

          // Revenue
          const { data: revenueData, error: revenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (revenueError) throw revenueError;
          todayRevenue = revenueData?.reduce((sum, r) => sum + r.amount, 0) || 0;

          // Expenses
          const { data: expenseData, error: expenseError } = await supabase
            .from('trip_expenses')
            .select('amount')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (expenseError) throw expenseError;
          todayExpenses = expenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;
        }

        // Fetch this month's trips
        const { data: monthTrips, error: monthError } = await supabase
          .from('trips')
          .select('id, trip_date, status')
          .gte('trip_date', monthStart)
          .lte('trip_date', today)
          .eq('status', 'active');

        if (monthError) throw monthError;

        // Fetch this month's revenue and expenses
        let monthRevenue = 0;
        let monthExpenses = 0;

        if (monthTrips && monthTrips.length > 0) {
          const monthTripIds = monthTrips.map(t => t.id);

          // Revenue
          const { data: monthRevenueData, error: monthRevenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount')
            .in('trip_id', monthTripIds)
            .eq('status', 'active');

          if (monthRevenueError) throw monthRevenueError;
          monthRevenue = monthRevenueData?.reduce((sum, r) => sum + r.amount, 0) || 0;

          // Expenses
          const { data: monthExpenseData, error: monthExpenseError } = await supabase
            .from('trip_expenses')
            .select('amount')
            .in('trip_id', monthTripIds)
            .eq('status', 'active');

          if (monthExpenseError) throw monthExpenseError;
          monthExpenses = monthExpenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;
        }

        // Fetch bus counts
        const { data: buses, error: busesError } = await supabase
          .from('buses')
          .select('id, status');

        if (busesError) throw busesError;

        const totalBuses = buses?.length || 0;
        const activeBuses = buses?.filter(b => b.status === 'active').length || 0;

        // Fetch fuel stock (simplified - just sum purchases minus sales)
        const { data: fuelPurchases, error: purchasesError } = await supabase
          .from('fuel_purchases')
          .select('litres')
          .eq('status', 'active');

        if (purchasesError) throw purchasesError;

        const { data: fuelSales, error: salesError } = await supabase
          .from('fuel_sales')
          .select('litres')
          .eq('status', 'active');

        if (salesError) throw salesError;

        const totalPurchases = fuelPurchases?.reduce((sum, p) => sum + p.litres, 0) || 0;
        const totalSales = fuelSales?.reduce((sum, s) => sum + s.litres, 0) || 0;
        const currentStock = totalPurchases - totalSales;

        setMetrics({
          today: {
            trips: todayTrips?.length || 0,
            revenue: todayRevenue,
            expenses: todayExpenses,
            profit: todayRevenue - todayExpenses,
          },
          thisMonth: {
            trips: monthTrips?.length || 0,
            revenue: monthRevenue,
            expenses: monthExpenses,
            profit: monthRevenue - monthExpenses,
          },
          buses: {
            total: totalBuses,
            active: activeBuses,
          },
          fuel: {
            currentStock,
          },
        });

        setLoading(false);
      } catch (err) {
        logError(err, 'useDashboardMetrics');
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
}
