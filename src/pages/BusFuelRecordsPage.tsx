import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFuelSales } from '../hooks/useFuelSales';
import { useBuses } from '../hooks/useBuses';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Truck, Package } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { Button } from '../components/ui/Button';

export default function BusFuelRecordsPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    busId: '',
    search: '',
  });

  const { sales, loading, error } = useFuelSales({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    saleType: 'INTERNAL_BUS',
    busId: filters.busId || undefined,
  });

  // Filter sales by search
  const filteredSales = sales.filter(sale => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      sale.buses?.registration_number.toLowerCase().includes(searchLower) ||
      sale.buses?.bus_name?.toLowerCase().includes(searchLower) ||
      sale.trips?.route?.toLowerCase().includes(searchLower)
    );
  });

  const totalLitres = filteredSales.reduce((sum, s) => sum + s.litres, 0);
  const totalValue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Bus Fuel Records" 
        description="Track diesel supplied to Sadaat buses"
      >
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')}>
            <Plus className="mr-2 h-4 w-4" />
            Record Bus Fuel
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Bus Fuel Records"
          value={filteredSales.length}
          icon={<Truck className="h-6 w-6" />}
        />
        <SummaryCard
          label="Total Diesel Supplied"
          value={`${totalLitres.toFixed(0)} L`}
          icon={<Package className="h-6 w-6" />}
          variant="warning"
        />
        <SummaryCard
          label="Total Value (Cost Basis)"
          value={formatCurrency(totalValue)}
          icon={<Truck className="h-6 w-6" />}
          subtitle="Not company revenue"
        />
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
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
            placeholder="Search by bus, route..."
          />
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Bus
              </label>
              <select
                value={filters.busId}
                onChange={(e) => setFilters({ ...filters, busId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All buses</option>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.registration_number}
                    {bus.bus_name ? ` - ${bus.bus_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Fuel Records List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading bus fuel records...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No bus fuel records</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters || filters.search
              ? 'Try adjusting your filters'
              : 'Get started by recording fuel for a bus'}
          </p>
          {!showFilters && !filters.search && (
            <button
              onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Record Bus Fuel
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => navigate(`/app/petrol/sales/${sale.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {sale.buses?.registration_number || 'Unknown Bus'}
                    </h3>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Internal
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    <p>{sale.buses?.bus_name && `Bus: ${sale.buses.bus_name}`}</p>
                    <p>Trip: {sale.trips?.route || 'N/A'} • {formatDate(new Date(sale.sale_date))}</p>
                    <p>{sale.litres.toFixed(2)} L • {formatCurrency(sale.cost_price_per_litre)}/L</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(sale.total_amount)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
