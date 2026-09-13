/**
 * Dashboard data fetching hooks
 * 
 * Fetches and calculates dashboard metrics from Supabase
 */

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logError } from '../utils/errors';

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
        
        // Calculate selected period date range
        const now = new Date();
        const month = selectedMonth ? parseInt(selectedMonth) : now.getMonth() + 1;
        const year = selectedYear ? parseInt(selectedYear) : now.getFullYear();
        
        // Selected period: first day to last day of selected month
        const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        // Previous period for comparison
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevPeriodStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
        const prevPeriodEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

        // Fetch selected period trips
        const { data: periodTrips, error: periodError } = await supabase
          .from('trips')
          .select('id, trip_date, status, bus_id')
          .gte('trip_date', periodStart)
          .lte('trip_date', periodEnd)
          .eq('status', 'active');

        if (periodError) throw periodError;

        // Fetch selected period revenue and expenses
        let periodRevenue = 0;
        let periodExpenses = 0;
        let totalSeatsBooked = 0;
        let totalCapacity = 0;

        if (periodTrips && periodTrips.length > 0) {
          const tripIds = periodTrips.map(t => t.id);

          // Revenue
          const { data: revenueData, error: revenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount, entry_type, quantity, trip_id')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (revenueError) throw revenueError;

          periodRevenue = revenueData?.reduce((sum, r) => sum + r.amount, 0) || 0;
          
          // Calculate occupancy rate from seat bookings
          const seatBookings = revenueData?.filter(r => r.entry_type === 'seat_booking') || [];
          totalSeatsBooked = seatBookings.reduce((sum, r) => sum + (r.quantity || 0), 0);

          // Expenses
          const { data: expenseData, error: expenseError } = await supabase
            .from('trip_expenses')
            .select('amount')
            .in('trip_id', tripIds)
            .eq('status', 'active');

          if (expenseError) throw expenseError;
          periodExpenses = expenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;

          // Get bus capacities for occupancy calculation
          // For each trip, get the bus capacity and sum it (so if a bus runs multiple trips, its capacity is counted multiple times)
          const busIdsForTrips = periodTrips.map(t => t.bus_id).filter(id => id != null);
          if (busIdsForTrips.length > 0) {
            const { data: busesData, error: busesError } = await supabase
              .from('buses')
              .select('id, capacity')
              .in('id', busIdsForTrips);

            if (!busesError && busesData) {
              // Create a map of bus_id to capacity
              const busCapacityMap = new Map(busesData.map(b => [b.id, b.capacity]));
              // For each trip, add the capacity of its bus (so capacity is counted per trip, not per unique bus)
              totalCapacity = periodTrips.reduce((sum, trip) => {
                const capacity = busCapacityMap.get(trip.bus_id) || 0;
                return sum + capacity;
              }, 0);
            }
          }
        }

        // Fetch maintenance costs for the selected period
        const { data: maintenanceRecords, error: maintenanceError } = await supabase
          .from('maintenance_records')
          .select('cost')
          .gte('maintenance_date', periodStart)
          .lte('maintenance_date', periodEnd)
          .eq('status', 'active');

        if (maintenanceError) throw maintenanceError;
        const maintenanceCost = maintenanceRecords?.reduce((sum, m) => sum + m.cost, 0) || 0;

        // Add maintenance to total expenses
        periodExpenses += maintenanceCost;

        // Fetch tyre costs for the selected period
        const { data: tyreRecords, error: tyreError } = await supabase
          .from('tyre_records')
          .select('total_cost')
          .gte('purchase_date', periodStart)
          .lte('purchase_date', periodEnd)
          .eq('status', 'active');

        if (tyreError) throw tyreError;
        const tyreCost = tyreRecords?.reduce((sum, t) => sum + t.total_cost, 0) || 0;

        // Add tyre cost to total expenses
        periodExpenses += tyreCost;

        // Fetch previous period for comparison
        const { data: prevPeriodTrips, error: prevPeriodError } = await supabase
          .from('trips')
          .select('id')
          .gte('trip_date', prevPeriodStart)
          .lte('trip_date', prevPeriodEnd)
          .eq('status', 'active');

        if (prevPeriodError) throw prevPeriodError;

        let prevPeriodRevenue = 0;
        let prevPeriodExpenses = 0;

        if (prevPeriodTrips && prevPeriodTrips.length > 0) {
          const prevTripIds = prevPeriodTrips.map(t => t.id);

          const { data: prevRevenueData, error: prevRevenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount')
            .in('trip_id', prevTripIds)
            .eq('status', 'active');

          if (!prevRevenueError) {
            prevPeriodRevenue = prevRevenueData?.reduce((sum, r) => sum + r.amount, 0) || 0;
          }

          const { data: prevExpenseData, error: prevExpenseError } = await supabase
            .from('trip_expenses')
            .select('amount')
            .in('trip_id', prevTripIds)
            .eq('status', 'active');

          if (!prevExpenseError) {
            prevPeriodExpenses = prevExpenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;
          }
        }

        // Fetch previous period maintenance costs
        const { data: prevMaintenanceRecords, error: prevMaintenanceError } = await supabase
          .from('maintenance_records')
          .select('cost')
          .gte('maintenance_date', prevPeriodStart)
          .lte('maintenance_date', prevPeriodEnd)
          .eq('status', 'active');

        if (!prevMaintenanceError) {
          const prevMaintenanceCost = prevMaintenanceRecords?.reduce((sum, m) => sum + m.cost, 0) || 0;
          prevPeriodExpenses += prevMaintenanceCost;
        }

        // Fetch previous period tyre costs
        const { data: prevTyreRecords, error: prevTyreError } = await supabase
          .from('tyre_records')
          .select('total_cost')
          .gte('purchase_date', prevPeriodStart)
          .lte('purchase_date', prevPeriodEnd)
          .eq('status', 'active');

        if (!prevTyreError) {
          const prevTyreCost = prevTyreRecords?.reduce((sum, t) => sum + t.total_cost, 0) || 0;
          prevPeriodExpenses += prevTyreCost;
        }

        // Fetch bus counts
        const { data: buses, error: busesError } = await supabase
          .from('buses')
          .select('id, status');

        if (busesError) throw busesError;

        const totalBuses = buses?.length || 0;
        const activeBuses = buses?.filter(b => b.status === 'active').length || 0;

        // Fetch fuel stock
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

        // Calculate occupancy rate
        const occupancyRate = totalCapacity > 0 ? Math.min(100, Math.round((totalSeatsBooked / totalCapacity) * 100)) : null;

        // Fetch pending maintenance (overdue)
        const today = getTodayPKT();
        const { data: overdueMaintenanceRecords, error: overdueMaintenanceError } = await supabase
          .from('maintenance_records')
          .select('id, next_maintenance_date')
          .eq('status', 'active')
          .not('next_maintenance_date', 'is', null)
          .lte('next_maintenance_date', today);

        if (overdueMaintenanceError) throw overdueMaintenanceError;

        const pendingMaintenance = overdueMaintenanceRecords?.length || 0;

        // Fetch recent activity from multiple sources (trips, maintenance, tyres)
        // This avoids relying on audit_logs which may have RLS issues
        const [recentTrips, recentMaintenance, recentTyres] = await Promise.all([
          // Recent trips
          supabase
            .from('trips')
            .select('id, trip_date, route, bus_id, status')
            .gte('trip_date', periodStart)
            .lte('trip_date', periodEnd)
            .eq('status', 'active')
            .order('trip_date', { ascending: false })
            .limit(5),
          
          // Recent maintenance
          supabase
            .from('maintenance_records')
            .select('id, maintenance_date, maintenance_type, description, bus_id, status')
            .gte('maintenance_date', periodStart)
            .lte('maintenance_date', periodEnd)
            .eq('status', 'active')
            .order('maintenance_date', { ascending: false })
            .limit(5),
          
          // Recent tyres
          supabase
            .from('tyre_records')
            .select('id, purchase_date, tyre_type, notes, bus_id, status')
            .gte('purchase_date', periodStart)
            .lte('purchase_date', periodEnd)
            .eq('status', 'active')
            .order('purchase_date', { ascending: false })
            .limit(5)
        ]);

        if (recentTrips.error) throw recentTrips.error;
        if (recentMaintenance.error) throw recentMaintenance.error;
        if (recentTyres.error) throw recentTyres.error;

        // Combine and normalize activities
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

        // Add trips
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

        // Add maintenance
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

        // Add tyres
        (recentTyres.data || []).forEach(record => {
          allActivities.push({
            id: `tyre-${record.id}`,
            type: 'tyre',
            title: 'Tyre record added',
            subtitle: record.tyre_type || record.notes || 'Tyre record',
            href: `/app/buses/${record.bus_id}/tyres`,
            time: record.purchase_date,
            timeAgo: formatTimeAgo(record.purchase_date),
            icon: 'tyre',
            date: record.purchase_date
          });
        });

        // Sort all activities by date descending and take top 5
        allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recentActivity = allActivities.slice(0, 5).map(({ date, ...rest }) => rest);

        setMetrics({
          selectedPeriod: {
            trips: periodTrips?.length || 0,
            revenue: periodRevenue,
            expenses: periodExpenses,
            profit: periodRevenue - periodExpenses,
          },
          previousPeriod: {
            trips: prevPeriodTrips?.length || 0,
            revenue: prevPeriodRevenue,
            expenses: prevPeriodExpenses,
            profit: prevPeriodRevenue - prevPeriodExpenses,
          },
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
