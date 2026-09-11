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
        console.log('[Dashboard] Starting metrics fetch...');
        const today = getTodayPKT();
        const monthStart = getMonthStartPKT();

        // Fetch today's trips
        console.log('[Dashboard] Query 1: trips (today)');
        const { data: todayTrips, error: todayError } = await supabase
          .from('trips')
          .select('id, trip_date, status')
          .eq('trip_date', today)
          .eq('status', 'active');

        if (todayError) {
          console.error('[Dashboard] Query 1 failed:', todayError.message, todayError.code);
          throw todayError;
        }
        console.log('[Dashboard] Query 1 success:', todayTrips?.length || 0, 'rows');

        // Fetch today's revenue and expenses
        let todayRevenue = 0;
        let todayExpenses = 0;

        if (todayTrips && todayTrips.length > 0) {
          const tripIds = todayTrips.map(t => t.id);

          // Revenue
          console.log('[Dashboard] Query 2: trip_revenue_entries (today)');
          const { data: revenueData, error: revenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (revenueError) {
            console.error('[Dashboard] Query 2 failed:', revenueError.message, revenueError.code);
            throw revenueError;
          }
          console.log('[Dashboard] Query 2 success:', revenueData?.length || 0, 'rows');
          todayRevenue = revenueData?.reduce((sum, r) => sum + r.amount, 0) || 0;

          // Expenses
          console.log('[Dashboard] Query 3: trip_expenses (today)');
          const { data: expenseData, error: expenseError } = await supabase
            .from('trip_expenses')
            .select('amount')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (expenseError) {
            console.error('[Dashboard] Query 3 failed:', expenseError.message, expenseError.code);
            throw expenseError;
          }
          console.log('[Dashboard] Query 3 success:', expenseData?.length || 0, 'rows');
          todayExpenses = expenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;
        }

        // Fetch this month's trips
        console.log('[Dashboard] Query 4: trips (month)');
        const { data: monthTrips, error: monthError } = await supabase
          .from('trips')
          .select('id, trip_date, status')
          .gte('trip_date', monthStart)
          .lte('trip_date', today)
          .eq('status', 'active');

        if (monthError) {
          console.error('[Dashboard] Query 4 failed:', monthError.message, monthError.code);
          throw monthError;
        }
        console.log('[Dashboard] Query 4 success:', monthTrips?.length || 0, 'rows');

        // Fetch this month's revenue and expenses
        let monthRevenue = 0;
        let monthExpenses = 0;

        if (monthTrips && monthTrips.length > 0) {
          const monthTripIds = monthTrips.map(t => t.id);

          // Revenue
          console.log('[Dashboard] Query 5: trip_revenue_entries (month)');
          const { data: monthRevenueData, error: monthRevenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount')
            .in('trip_id', monthTripIds)
            .eq('status', 'active');

          if (monthRevenueError) {
            console.error('[Dashboard] Query 5 failed:', monthRevenueError.message, monthRevenueError.code);
            throw monthRevenueError;
          }
          console.log('[Dashboard] Query 5 success:', monthRevenueData?.length || 0, 'rows');
          monthRevenue = monthRevenueData?.reduce((sum, r) => sum + r.amount, 0) || 0;

          // Expenses
          console.log('[Dashboard] Query 6: trip_expenses (month)');
          const { data: monthExpenseData, error: monthExpenseError } = await supabase
            .from('trip_expenses')
            .select('amount')
            .in('trip_id', monthTripIds)
            .eq('status', 'active');

          if (monthExpenseError) {
            console.error('[Dashboard] Query 6 failed:', monthExpenseError.message, monthExpenseError.code);
            throw monthExpenseError;
          }
          console.log('[Dashboard] Query 6 success:', monthExpenseData?.length || 0, 'rows');
          monthExpenses = monthExpenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;
        }

        // Fetch bus counts
        console.log('[Dashboard] Query 7: buses');
        const { data: buses, error: busesError } = await supabase
          .from('buses')
          .select('id, status');

        if (busesError) {
          console.error('[Dashboard] Query 7 failed:', busesError.message, busesError.code);
          throw busesError;
        }
        console.log('[Dashboard] Query 7 success:', buses?.length || 0, 'rows');

        const totalBuses = buses?.length || 0;
        const activeBuses = buses?.filter(b => b.status === 'active').length || 0;

        // Fetch fuel stock (simplified - just sum purchases minus sales)
        console.log('[Dashboard] Query 8: fuel_purchases');
        const { data: fuelPurchases, error: purchasesError } = await supabase
          .from('fuel_purchases')
          .select('litres')
          .eq('status', 'active');

        if (purchasesError) {
          console.error('[Dashboard] Query 8 failed:', purchasesError.message, purchasesError.code);
          throw purchasesError;
        }
        console.log('[Dashboard] Query 8 success:', fuelPurchases?.length || 0, 'rows');

        console.log('[Dashboard] Query 9: fuel_sales');
        const { data: fuelSales, error: salesError } = await supabase
          .from('fuel_sales')
          .select('litres')
          .eq('status', 'active');

        if (salesError) {
          console.error('[Dashboard] Query 9 failed:', salesError.message, salesError.code);
          throw salesError;
        }
        console.log('[Dashboard] Query 9 success:', fuelSales?.length || 0, 'rows');

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

        console.log('[Dashboard] All queries completed successfully');
        setLoading(false);
      } catch (err) {
        console.error('[Dashboard] Error caught:', err);
        logError(err, 'useDashboardMetrics');
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
}
