import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft, FileText, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { Trip } from '../types/database';

interface TripWithTotals extends Trip {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
}

export default function BusVouchersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [trips, setTrips] = useState<TripWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [busInfo, setBusInfo] = useState<{ registration_number: string; bus_name: string | null } | null>(null);

  async function fetchVouchers() {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch bus info
      const { data: bus } = await supabase
        .from('buses')
        .select('registration_number, bus_name')
        .eq('id', id)
        .single();
      
      setBusInfo(bus || null);

      // Fetch trips for this bus
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          *,
          trip_revenue_entries(amount, status),
          trip_expenses(amount, status)
        `)
        .eq('bus_id', id)
        .order('trip_date', { ascending: false });

      if (tripsError) throw tripsError;

      const tripsWithTotals = (tripsData || []).map((trip: any) => {
        const revenue = trip.trip_revenue_entries
          ?.filter((e: any) => e.status !== 'reversed')
          .reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
        const expenses = trip.trip_expenses
          ?.filter((e: any) => e.status !== 'reversed')
          .reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
        
        return {
          ...trip,
          trip_revenue_entries: undefined,
          trip_expenses: undefined,
          totalRevenue: revenue,
          totalExpenses: expenses,
          profit: revenue - expenses,
        };
      });

      // Apply date filter
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      let filtered = tripsWithTotals;
      if (filter === 'today') {
        filtered = tripsWithTotals.filter(t => new Date(t.trip_date) >= today);
      } else if (filter === 'week') {
        filtered = tripsWithTotals.filter(t => new Date(t.trip_date) >= weekAgo);
      } else if (filter === 'month') {
        filtered = tripsWithTotals.filter(t => new Date(t.trip_date) >= monthAgo);
      }

      setTrips(filtered);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vouchers');
      setLoading(false);
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchVouchers();
  }, [id, filter]);

  // Calculate summary
  const totalVouchers = trips.length;
  const totalRevenue = trips.reduce((sum, t) => sum + t.totalRevenue, 0);
  const totalExpenses = trips.reduce((sum, t) => sum + t.totalExpenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading vouchers..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load vouchers">
          {error}
        </Alert>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate(`/app/buses/${id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bus
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/app/buses/${id}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trip Vouchers</h1>
            {busInfo && (
              <p className="mt-1 text-sm text-gray-500">
                {busInfo.registration_number}
                {busInfo.bus_name && ` — ${busInfo.bus_name}`}
              </p>
            )}
          </div>
        </div>
        <Link to={`/app/buses/${id}/vouchers/create`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Voucher
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'today'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setFilter('week')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'week'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setFilter('month')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'month'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          This Month
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vouchers</p>
              <p className="text-xl font-bold text-gray-900">{totalVouchers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Profit</p>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Voucher List */}
      {trips.length === 0 ? (
        <EmptyState
          title="No vouchers found"
          description={
            filter === 'all'
              ? "This bus doesn't have any trip vouchers yet"
              : `No vouchers found for ${filter === 'today' ? 'today' : filter === 'week' ? 'this week' : 'this month'}`
          }
          icon={<FileText className="h-8 w-8" />}
          action={
            <Link to={`/app/buses/${id}/vouchers/create`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Voucher
              </Button>
            </Link>
          }
        />
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Expenses</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(trip => (
                  <tr key={trip.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatDate(new Date(trip.trip_date))}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{trip.route}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={trip.status === 'active' ? 'success' : 'secondary'}
                        size="sm"
                      >
                        {trip.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">
                      {formatCurrency(trip.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-red-600 font-medium">
                      {formatCurrency(trip.totalExpenses)}
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${
                      trip.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(trip.profit)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/app/trips/${trip.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
