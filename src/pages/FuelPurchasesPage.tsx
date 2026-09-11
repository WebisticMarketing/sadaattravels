import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFuelPurchases } from '../hooks/useFuelPurchases';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Fuel } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { PrintButton } from '../components/ui/PrintButton';
import { Button } from '../components/ui/Button';

export default function FuelPurchasesPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    search: '',
  });

  const { purchases, loading, error } = useFuelPurchases({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    supplier: filters.supplier || undefined,
  });

  // Filter purchases by search
  const filteredPurchases = purchases.filter(purchase => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      purchase.supplier.toLowerCase().includes(searchLower) ||
      purchase.receipt_number?.toLowerCase().includes(searchLower)
    );
  });

  const totalLitres = filteredPurchases.reduce((sum, p) => sum + p.litres, 0);
  const totalCost = filteredPurchases.reduce((sum, p) => sum + p.total_cost, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Fuel Purchases" 
        description="Record fuel purchases for the petrol pump"
      >
        <div className="flex gap-2">
          <PrintButton />
          <Button onClick={() => navigate('/app/petrol/purchases/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Purchase
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Purchases"
          value={filteredPurchases.length}
          icon={<Fuel className="h-6 w-6" />}
        />
        <SummaryCard
          label="Total Litres"
          value={`${totalLitres.toFixed(0)} L`}
          icon={<Fuel className="h-6 w-6" />}
          variant="success"
        />
        <SummaryCard
          label="Total Cost"
          value={formatCurrency(totalCost)}
          icon={<Fuel className="h-6 w-6" />}
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
            placeholder="Search by supplier or receipt..."
          />
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-3">
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
                Supplier
              </label>
              <input
                type="text"
                value={filters.supplier}
                onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
                placeholder="Filter by supplier"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Purchases List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading purchases...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Fuel className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No fuel purchases</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters || filters.search ? 'Try adjusting your filters' : 'Get started by adding your first fuel purchase'}
          </p>
          {!showFilters && !filters.search && (
            <button
              onClick={() => navigate('/app/petrol/purchases/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Purchase
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPurchases.map((purchase) => (
            <div
              key={purchase.id}
              onClick={() => navigate(`/app/petrol/purchases/${purchase.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{purchase.supplier}</h3>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                    <span>{formatDate(new Date(purchase.purchase_date))}</span>
                    <span>•</span>
                    <span>{purchase.litres.toFixed(2)} L</span>
                  </div>
                  {purchase.receipt_number && (
                    <p className="mt-1 text-xs text-gray-500">
                      Receipt: {purchase.receipt_number}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-lg font-bold text-amber-600">
                    {formatCurrency(purchase.total_cost)}
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
