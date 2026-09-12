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
          const busIds = [...new Set(periodTrips.map(t => t.bus_id))];

          // Revenue
          const { data: revenueData, error: revenueError } = await supabase
            .from('trip_revenue_entries')
            .select('amount, entry_type, quantity')
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
          if (busIds.length > 0) {
            const { data: busesData, error: busesError } = await supabase
              .from('buses')
              .select('id, capacity')
              .in('id', busIds);

            if (!busesError && busesData) {
              totalCapacity = busesData.reduce((sum, b) => sum + b.capacity, 0);
            }
          }
        }

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

        // Fetch pending maintenance
        const today = getTodayPKT();
        const { data: maintenanceRecords, error: maintenanceError } = await supabase
          .from('maintenance_records')
          .select('id, next_maintenance_date')
          .eq('status', 'active')
          .not('next_maintenance_date', 'is', null)
          .lte('next_maintenance_date', today);

        if (maintenanceError) throw maintenanceError;

        const pendingMaintenance = maintenanceRecords?.length || 0;

        // Fetch recent activity from audit logs
        const { data: auditLogs, error: auditError } = await supabase
          .from('audit_logs')
          .select('id, action, table_name, created_at, meta')
          .order('created_at', { ascending: false })
          .limit(10);

        if (auditError) throw auditError;

        const recentActivity = (auditLogs || []).map(log => {
          let type = 'activity';
          let title = '';
          let subtitle = '';
          let href = '#';
          let icon = 'activity';

          // Map audit actions to activity types
          switch (log.action) {
            case 'create':
              if (log.table_name === 'buses') {
                type = 'bus';
                title = 'Bus created';
                subtitle = log.meta?.registration_number || 'New bus added';
                href = '/app/buses';
                icon = 'bus';
              } else if (log.table_name === 'trips') {
                type = 'trip';
                title = 'Trip created';
                subtitle = log.meta?.route || 'New trip added';
                href = '/app/trips';
                icon = 'trip';
              } else if (log.table_name === 'maintenance_records') {
                type = 'maintenance';
                title = 'Maintenance scheduled';
                subtitle = log.meta?.maintenance_type || 'Maintenance record';
                href = '/app/maintenance';
                icon = 'wrench';
              } else if (log.table_name === 'fuel_purchases') {
                type = 'fuel';
                title = 'Fuel purchased';
                subtitle = `${log.meta?.litres || 0}L purchased`;
                href = '/app/petrol';
                icon = 'fuel';
              } else if (log.table_name === 'cargo_records') {
                type = 'cargo';
                title = 'Cargo shipment';
                subtitle = log.meta?.description || 'Cargo record';
                href = '/app/cargo';
                icon = 'cargo';
              } else if (log.table_name === 'adda_income' || log.table_name === 'adda_expenses') {
                type = 'adda';
                title = log.table_name === 'adda_income' ? 'Adda income' : 'Adda expense';
                subtitle = `Rs ${log.meta?.amount || 0}`;
                href = '/app/adda';
                icon = 'adda';
              } else {
                type = 'activity';
                title = `${log.action} on ${log.table_name}`;
                subtitle = '';
                icon = 'activity';
              }
              break;
            case 'login':
              type = 'login';
              title = 'User logged in';
              subtitle = log.meta?.email || '';
              href = '#';
              icon = 'login';
              break;
            case 'logout':
              type = 'logout';
              title = 'User logged out';
              subtitle = log.meta?.email || '';
              href = '#';
              icon = 'logout';
              break;
            default:
              type = 'activity';
              title = `${log.action}`;
              subtitle = '';
              icon = 'activity';
          }

          return {
            id: log.id,
            type,
            title,
            subtitle,
            href,
            time: log.created_at,
            timeAgo: formatTimeAgo(log.created_at),
            icon,
          };
        });

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
