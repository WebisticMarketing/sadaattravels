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
import { fetchDashboardActivity } from '../lib/dashboardActivity';
import type { DashboardActivity } from '../lib/dashboardActivity';

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
  recentActivity: DashboardActivity[];
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
        // Built by the shared business-activity layer in
        // src/lib/dashboardActivity.ts — 14 lean parallel queries with
        // per-source error isolation (a failing source is logged via
        // logError and skipped; it never breaks the Dashboard).
        // NEVER sourced from audit_logs: admin/security/history events
        // belong to the separate Audit Logs module.
        // ============================================================
        const recentActivity = await fetchDashboardActivity(period, {
          maxItems: 8,
          onError: (err, sourceKey) =>
            logError(err, `useDashboardMetrics/activity:${sourceKey}`),
        });

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
