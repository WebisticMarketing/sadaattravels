/**
 * Dashboard data fetching hooks
 *
 * Fetches and calculates dashboard metrics from Supabase.
 *
 * FINANCIAL ACCOUNTING NOTE: All company-wide financial totals on the
 * Dashboard (Revenue / Expenses / Net Profit, current AND previous period)
 * are produced by the shared company accounting engine in
 * src/lib/companyAccounting.ts — the single source of truth also consumed
 * by Main Reports. No page-level accounting formulas may live here.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';
import {
  computeCompanyAccounting,
  fetchCompanyAccountingData,
  monthPeriod,
  previousMonthPeriod,
} from '../lib/companyAccounting';
import type { CompanyAccountingResult } from '../lib/companyAccounting';

export interface DashboardMetrics {
  selectedPeriod: {
    trips: number;
    revenue: number;
    expenses: number;
    profit: number;
  };
  previousPeriod: {
    trips: number;
    revenue: number;
    expenses: number;
    profit: number;
  };
  /** Full engine result for the selected period (for any additional display). */
  accounting: CompanyAccountingResult;
  buses: {
    total: number;
    active: number;
  };
  fuel: {
    currentStock: number;
  };
  occupancyRate: number | null;
  pendingMaintenance: number;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    href: string;
    time: string;
    timeAgo: string;
    icon: string;
  }>;
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
 * Format time ago from timestamp
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return time.toLocaleDateString();
}

/**
 * Count active trips inside a period from the already-fetched trip rows
 * (trips are fetched from period.start onwards by the shared fetcher).
 */
function countActiveTrips(
  trips: Array<{ trip_date: string; status: string }>,
  start: string,
  end: string
): number {
  return trips.filter(t => {
    const d = (t.trip_date || '').slice(0, 10);
    return t.status === 'active' && d >= start && d <= end;
  }).length;
}

/**
 * Fetch dashboard metrics from database for a specific period
 */
export function useDashboardMetrics(selectedMonth?: string, selectedYear?: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);

        // Calculate selected period date range (inclusive ISO dates)
        const now = new Date();
        const month = selectedMonth ? parseInt(selectedMonth) : now.getMonth() + 1;
        const year = selectedYear ? parseInt(selectedYear) : now.getFullYear();

        const period = monthPeriod(year, month);
        const prevPeriod = previousMonthPeriod(period);

        // ============================================================
        // COMPANY-WIDE ACCOUNTING via the SHARED ENGINE (single source
        // of truth used identically by Main Reports). Both the current
        // and previous periods run through the same pure computation.
        // ============================================================
        const [currentData, previousData] = await Promise.all([
          fetchCompanyAccountingData(supabase, period),
          fetchCompanyAccountingData(supabase, prevPeriod),
        ]);

        const accounting = computeCompanyAccounting(period, currentData);
        const prevAccounting = computeCompanyAccounting(prevPeriod, previousData);

        const periodTripsCount = countActiveTrips(currentData.trips, period.start, period.end);
        const prevPeriodTripsCount = countActiveTrips(previousData.trips, prevPeriod.start, prevPeriod.end);

        // ============================================================
        // Occupancy inputs (operational metric — not P&L)
        // ============================================================
        const activePeriodTripIds = currentData.trips
          .filter(t => {
            const d = (t.trip_date || '').slice(0, 10);
            return t.status === 'active' && d >= period.start && d <= period.end;
          })
          .map(t => ({ id: t.id, bus_id: t.bus_id ?? null }));

        let totalSeatsBooked = 0;
        let totalCapacity = 0;

        if (activePeriodTripIds.length > 0) {
          const tripIds = activePeriodTripIds.map(t => t.id);

          const { data: revenueData, error: revenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount, entry_type, quantity, trip_id')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (revenueError) throw revenueError;

          const seatBookings = revenueData?.filter(r => r.entry_type === 'seat_booking') || [];
          totalSeatsBooked = seatBookings.reduce((sum, r) => sum + (r.quantity || 0), 0);

          // Bus capacities per trip (a bus running multiple trips counts its capacity each trip)
          const busIdsForTrips = activePeriodTripIds.map(t => t.bus_id).filter(id => id != null);
          if (busIdsForTrips.length > 0) {
            const { data: busesData, error: busesError } = await supabase
              .from('buses')
              .select('id, capacity')
              .in('id', busIdsForTrips);

            if (!busesError && busesData) {
              const busCapacityMap = new Map(busesData.map(b => [b.id, b.capacity]));
              totalCapacity = activePeriodTripIds.reduce((sum, trip) => {
                const capacity = trip.bus_id ? busCapacityMap.get(trip.bus_id) || 0 : 0;
                return sum + capacity;
              }, 0);
            }
          }
        }

        // ============================================================
        // Non-financial KPIs
        // ============================================================

        // Bus counts
        const { data: buses, error: busesError } = await supabase
          .from('buses')
          .select('id, status');

        if (busesError) throw busesError;

        const totalBuses = buses?.length || 0;
        const activeBuses = buses?.filter(b => b.status === 'active').length || 0;

        // Current fuel stock (litres) — operational, purchases - sales + adjustments
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

        const { data: fuelAdjustments, error: adjustmentsError } = await supabase
          .from('fuel_stock_adjustments')
          .select('litres')
          .eq('status', 'active');

        if (adjustmentsError) throw adjustmentsError;

        const totalPurchases = fuelPurchases?.reduce((sum, p) => sum + p.litres, 0) || 0;
        const totalSales = fuelSales?.reduce((sum, s) => sum + s.litres, 0) || 0;
        const totalAdjustments = fuelAdjustments?.reduce((sum, a) => sum + a.litres, 0) || 0;
        const currentStock = totalPurchases - totalSales + totalAdjustments;

        // Occupancy rate
        const occupancyRate = totalCapacity > 0 ? Math.min(100, Math.round((totalSeatsBooked / totalCapacity) * 100)) : null;

        // Pending maintenance (overdue)
        const today = getTodayPKT();
        const { data: overdueMaintenanceRecords, error: overdueMaintenanceError } = await supabase
          .from('maintenance_records')
          .select('id, next_maintenance_date')
          .eq('status', 'active')
          .not('next_maintenance_date', 'is', null)
          .lte('next_maintenance_date', today);

        if (overdueMaintenanceError) throw overdueMaintenanceError;

        const pendingMaintenance = overdueMaintenanceRecords?.length || 0;

        // ============================================================
        // Recent activity feed (non-accounting display data)
        // ============================================================
        const [recentTrips, recentMaintenance, recentTyres, recentAddaIncome, recentAddaExpenses] = await Promise.all([
          supabase
            .from('trips')
            .select('id, trip_date, route, bus_id, status')
            .gte('trip_date', period.start)
            .lte('trip_date', period.end)
            .eq('status', 'active')
            .order('trip_date', { ascending: false })
            .limit(5),

          supabase
            .from('maintenance_records')
            .select('id, maintenance_date, maintenance_type, description, bus_id, status')
            .gte('maintenance_date', period.start)
            .lte('maintenance_date', period.end)
            .eq('status', 'active')
            .order('maintenance_date', { ascending: false })
            .limit(5),

          supabase
            .from('tyre_records')
            .select('id, purchase_date, tyre_size, notes, bus_id, status')
            .gte('purchase_date', period.start)
            .lte('purchase_date', period.end)
            .eq('status', 'active')
            .order('purchase_date', { ascending: false })
            .limit(5),

          supabase
            .from('adda_income')
            .select('id, income_date, income_type, amount, received_from, status')
            .gte('income_date', period.start)
            .lte('income_date', period.end)
            .eq('status', 'active')
            .order('income_date', { ascending: false })
            .limit(5),

          supabase
            .from('adda_expenses')
            .select('id, expense_date, expense_type, amount, paid_to, status')
            .gte('expense_date', period.start)
            .lte('expense_date', period.end)
            .eq('status', 'active')
            .order('expense_date', { ascending: false })
            .limit(5)
        ]);

        if (recentTrips.error) throw recentTrips.error;
        if (recentMaintenance.error) throw recentMaintenance.error;
        if (recentTyres.error) throw recentTyres.error;
        if (recentAddaIncome.error) throw recentAddaIncome.error;
        if (recentAddaExpenses.error) throw recentAddaExpenses.error;

        const allActivities: Array<{
          id: string;
          type: string;
          title: string;
          subtitle: string;
          href: string;
          time: string;
          timeAgo: string;
          icon: string;
          date: string;
        }> = [];

        (recentTrips.data || []).forEach(trip => {
          allActivities.push({
            id: `trip-${trip.id}`,
            type: 'trip',
            title: 'Trip completed',
            subtitle: trip.route || 'Trip record',
            href: `/app/trips`,
            time: trip.trip_date,
            timeAgo: formatTimeAgo(trip.trip_date),
            icon: 'trip',
            date: trip.trip_date
          });
        });

        (recentMaintenance.data || []).forEach(record => {
          allActivities.push({
            id: `maint-${record.id}`,
            type: 'maintenance',
            title: 'Maintenance recorded',
            subtitle: record.maintenance_type || record.description || 'Maintenance record',
            href: `/app/buses/${record.bus_id}/maintenance`,
            time: record.maintenance_date,
            timeAgo: formatTimeAgo(record.maintenance_date),
            icon: 'wrench',
            date: record.maintenance_date
          });
        });

        (recentTyres.data || []).forEach(record => {
          allActivities.push({
            id: `tyre-${record.id}`,
            type: 'tyre',
            title: 'Tyre record added',
            subtitle: record.tyre_size || record.notes || 'Tyre record',
            href: `/app/buses/${record.bus_id}/tyres`,
            time: record.purchase_date,
            timeAgo: formatTimeAgo(record.purchase_date),
            icon: 'tyre',
            date: record.purchase_date
          });
        });

        (recentAddaIncome.data || []).forEach(record => {
          allActivities.push({
            id: `adda-income-${record.id}`,
            type: 'adda-income',
            title: 'Adda income recorded',
            subtitle: `${record.income_type} - Rs ${record.amount}`,
            href: `/app/adda`,
            time: record.income_date,
            timeAgo: formatTimeAgo(record.income_date),
            icon: 'plus-circle',
            date: record.income_date
          });
        });

        (recentAddaExpenses.data || []).forEach(record => {
          allActivities.push({
            id: `adda-expense-${record.id}`,
            type: 'adda-expense',
            title: 'Adda expense recorded',
            subtitle: `${record.expense_type} - Rs ${record.amount}`,
            href: `/app/adda`,
            time: record.expense_date,
            timeAgo: formatTimeAgo(record.expense_date),
            icon: 'minus-circle',
            date: record.expense_date
          });
        });

        allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recentActivity = allActivities.slice(0, 5).map(({ date, ...rest }) => rest);

        setMetrics({
          selectedPeriod: {
            trips: periodTripsCount,
            revenue: accounting.company.revenue,
            expenses: accounting.company.expenses,
            profit: accounting.company.netProfit,
          },
          previousPeriod: {
            trips: prevPeriodTripsCount,
            revenue: prevAccounting.company.revenue,
            expenses: prevAccounting.company.expenses,
            profit: prevAccounting.company.netProfit,
          },
          accounting,
          buses: {
            total: totalBuses,
            active: activeBuses,
          },
          fuel: {
            currentStock,
          },
          occupancyRate,
          pendingMaintenance,
          recentActivity,
        });

        setLoading(false);
      } catch (err) {
        logError(err, 'useDashboardMetrics');
        setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [selectedMonth, selectedYear]);

  return { metrics, loading, error };
}
