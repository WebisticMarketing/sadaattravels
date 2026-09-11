import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTyres } from '../hooks/useTyres';
import { useBuses } from '../hooks/useBuses';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, CircleDot } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { PrintButton } from '../components/ui/PrintButton';
import { Button } from '../components/ui/Button';

export default function TyresPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    busId: '',
    status: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const { tyres } = useTyres({
    busId: filters.busId || undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  // Filter tyres by search
  const filteredTyres = tyres.filter(tyre => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      tyre.tyre_brand?.toLowerCase().includes(searchLower) ||
      tyre.tyre_size?.toLowerCase().includes(searchLower)
    );
  });

  const totalCost = filteredTyres
    .filter(t => t.status === 'active')
    .reduce((sum, t) => sum + t.total_cost, 0);

  const activeCount = filteredTyres.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Tyres" 
        description="Track tyre purchases and replacements"
      >
        <div className="flex gap-2">
          <PrintButton />
          <Button onClick={() => navigate('/app/tyres/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tyre Record
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total Records"
          value={filteredTyres.length}
          icon={<CircleDot className="h-6 w-6" />}
        />
        <SummaryCard
          label="Active Records"
          value={activeCount}
          icon={<CircleDot className="h-6 w-6" />}
          variant="success"
        />
        <SummaryCard
          label="Total Cost"
          value={formatCurrency(totalCost)}
          icon={<CircleDot className="h-6 w-6" />}
          variant="warning"
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
            placeholder="Search by brand, size, or bus..."
          />
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                {buses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.registration_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="reversed">Reversed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tyres List */}
      {filteredTyres.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <CircleDot className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No tyre records</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters || filters.search ? 'Try adjusting your filters' : 'Get started by adding your first tyre record'}
          </p>
          {!showFilters && !filters.search && (
            <button
              onClick={() => navigate('/app/tyres/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Record
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTyres.map((tyre) => (
            <div
              key={tyre.id}
              onClick={() => navigate(`/app/tyres/${tyre.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {tyre.tyre_brand || 'Unknown Brand'} - {tyre.tyre_size || 'Unknown Size'}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        tyre.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : tyre.status === 'reversed'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {tyre.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                    <span>
                      {tyre.buses?.registration_number || 'Unknown Bus'}
                    </span>
                    <span>•</span>
                    <span>{formatDate(new Date(tyre.purchase_date))}</span>
                    <span>•</span>
                    <span>Qty: {tyre.quantity}</span>
                  </div>
                  {tyre.supplier && (
                    <p className="mt-1 text-xs text-gray-500">
                      Supplier: {tyre.supplier}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-lg font-bold text-amber-600">
                    {formatCurrency(tyre.total_cost)}
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
