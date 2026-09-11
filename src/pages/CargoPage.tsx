import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCargo } from '../hooks/useCargo';
import { useBuses } from '../hooks/useBuses';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Package } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { PrintButton } from '../components/ui/PrintButton';
import { Button } from '../components/ui/Button';

export default function CargoPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    busId: '',
    origin: '',
    destination: '',
    search: '',
  });

  const { cargo, loading, error } = useCargo({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    busId: filters.busId || undefined,
    origin: filters.origin || undefined,
    destination: filters.destination || undefined,
  });

  // Filter cargo by search
  const filteredCargo = cargo.filter(record => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      record.description.toLowerCase().includes(searchLower) ||
      record.sender_name.toLowerCase().includes(searchLower) ||
      record.receiver_name.toLowerCase().includes(searchLower)
    );
  });

  const totalRevenue = filteredCargo.reduce((sum, c) => sum + c.revenue, 0);
  const totalExpenses = filteredCargo.reduce((sum, c) => sum + c.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Cargo" 
        description="Track cargo shipments and profitability"
      >
        <div className="flex gap-2">
          <PrintButton />
          <Button onClick={() => navigate('/app/cargo/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shipment
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<Package className="h-6 w-6" />}
          variant="success"
        />
        <SummaryCard
          label="Total Expenses"
          value={formatCurrency(totalExpenses)}
          icon={<Package className="h-6 w-6" />}
          variant="danger"
        />
        <SummaryCard
          label="Total Profit"
          value={formatCurrency(totalProfit)}
          icon={<Package className="h-6 w-6" />}
          variant={totalProfit >= 0 ? 'success' : 'danger'}
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
            placeholder="Search by description, sender, or receiver..."
          />
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Origin
              </label>
              <input
                type="text"
                value={filters.origin}
                onChange={(e) => setFilters({ ...filters, origin: e.target.value })}
                placeholder="Filter by origin"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Destination
              </label>
              <input
                type="text"
                value={filters.destination}
                onChange={(e) => setFilters({ ...filters, destination: e.target.value })}
                placeholder="Filter by destination"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cargo List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading cargo records...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : filteredCargo.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No cargo records</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters || filters.search
              ? 'Try adjusting your filters'
              : 'Get started by adding your first cargo shipment'}
          </p>
          {!showFilters && !filters.search && (
            <button
              onClick={() => navigate('/app/cargo/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Shipment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCargo.map((record) => (
            <div
              key={record.id}
              onClick={() => navigate(`/app/cargo/${record.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{record.description}</h3>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                    <span>{formatDate(new Date(record.shipment_date))}</span>
                    <span>•</span>
                    <span>{record.origin} → {record.destination}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span>From: {record.sender_name}</span>
                    <span>•</span>
                    <span>To: {record.receiver_name}</span>
                  </div>
                  {record.buses && (
                    <p className="mt-1 text-xs text-gray-500">
                      Bus: {record.buses.registration_number}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs text-gray-500">Revenue</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(record.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expenses</p>
                      <p className="text-sm font-semibold text-red-600">
                        {formatCurrency(record.expenses)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Profit</p>
                      <p className={`text-sm font-bold ${record.revenue - record.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(record.revenue - record.expenses)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
