import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../hooks/useTrips';
import { useBuses } from '../hooks/useBuses';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { PrintButton } from '../components/ui/PrintButton';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Bus, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

export default function TripsPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    busId: '',
    status: '',
    search: '',
  });

  const { trips, loading, error } = useTrips({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    busId: filters.busId || undefined,
    status: filters.status || undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  // Filter trips by search
  const filteredTrips = trips.filter(trip => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      trip.route.toLowerCase().includes(searchLower) ||
      trip.bus?.registration_number.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading trips..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load trips">
          {error}
        </Alert>
      </div>
    );
  }

  const activeTrips = filteredTrips.filter(t => t.status === 'active');
  const totalRevenue = activeTrips.reduce((sum, t) => sum + t.totalRevenue, 0);
  const totalExpenses = activeTrips.reduce((sum, t) => sum + t.totalExpenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Trips & Vouchers" 
        description="Manage trips and view financial summaries"
      >
        <div className="flex gap-2">
          <PrintButton />
          <Button onClick={() => navigate('/app/trips/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total Trips"
          value={filteredTrips.length}
          icon={<Calendar className="h-6 w-6" />}
        />
        <SummaryCard
          label="Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<TrendingUp className="h-6 w-6" />}
          variant="success"
        />
        <SummaryCard
          label="Expenses"
          value={formatCurrency(totalExpenses)}
          icon={<TrendingDown className="h-6 w-6" />}
          variant="danger"
        />
        <SummaryCard
          label="Profit"
          value={formatCurrency(totalProfit)}
          icon={<TrendingUp className="h-6 w-6" />}
          variant={totalProfit >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'}
          </Button>
        </div>

        {/* Search */}
        <div className="mb-3">
          <SearchInput
            value={filters.search}
            onChange={(value) => setFilters({ ...filters, search: value })}
            placeholder="Search by route or bus..."
          />
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
            <Select
              label="Bus"
              value={filters.busId}
              onChange={(e) => setFilters({ ...filters, busId: e.target.value })}
              options={[
                { value: '', label: 'All buses' },
                ...buses.map(b => ({
                  value: b.id,
                  label: b.registration_number,
                })),
              ]}
            />
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'reversed', label: 'Reversed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        )}
      </Card>

      {/* Trips List */}
      {trips.length === 0 ? (
        <EmptyState
          title="No trips found"
          description={showFilters ? 'Try adjusting your filters' : 'Create your first trip to get started'}
          icon={<Bus className="h-8 w-8" />}
          action={
            !showFilters && (
              <Button onClick={() => navigate('/app/trips/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Trip
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="cursor-pointer"
              onClick={() => navigate(`/app/trips/${trip.id}`)}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {trip.route}
                      </h3>
                      <Badge
                        variant={trip.status === 'active' ? 'success' : 'secondary'}
                        size="sm"
                      >
                        {trip.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(new Date(trip.trip_date))}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bus className="h-3 w-3" />
                        {trip.bus?.registration_number || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Revenue</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(trip.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Expenses</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(trip.totalExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Profit</p>
                    <p className={`font-semibold ${trip.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(trip.profit)}
                    </p>
                  </div>
                </div>
              </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
