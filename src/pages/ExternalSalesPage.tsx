import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFuelSales } from '../hooks/useFuelSales';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Users, Fuel } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { Button } from '../components/ui/Button';

export default function ExternalSalesPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    search: '',
  });

  const { sales, loading, error } = useFuelSales({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    saleType: 'EXTERNAL_CUSTOMER',
  });

  // Filter sales by search
  const filteredSales = sales.filter(sale => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      sale.customer_name?.toLowerCase().includes(searchLower) ||
      sale.customer_phone?.toLowerCase().includes(searchLower) ||
      sale.receipt_number?.toLowerCase().includes(searchLower)
    );
  });

  const totalLitres = filteredSales.reduce((sum, s) => sum + s.litres, 0);
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalCost = filteredSales.reduce((sum, s) => sum + (s.litres * s.cost_price_per_litre), 0);
  const totalProfit = totalRevenue - totalCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="External Sales" 
        description="Track fuel sales to external customers"
      >
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/petrol/sales/new?saleType=EXTERNAL_CUSTOMER')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Sale
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="External Sales"
          value={filteredSales.length}
          icon={<Users className="h-6 w-6" />}
        />
        <SummaryCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={<Fuel className="h-6 w-6" />}
          variant="success"
        />
        <SummaryCard
          label="Total Profit"
          value={formatCurrency(totalProfit)}
          icon={<Fuel className="h-6 w-6" />}
          variant={totalProfit >= 0 ? 'success' : 'danger'}
        />
        <SummaryCard
          label="Total Litres"
          value={`${totalLitres.toFixed(0)} L`}
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
            placeholder="Search by customer name, phone, receipt..."
          />
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
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
          </div>
        )}
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading external sales...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No external sales</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters || filters.search
              ? 'Try adjusting your filters'
              : 'Get started by adding your first external sale'}
          </p>
          {!showFilters && !filters.search && (
            <button
              onClick={() => navigate('/app/petrol/sales/new?saleType=EXTERNAL_CUSTOMER')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add First Sale
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => {
            const saleProfit = sale.total_amount - (sale.litres * sale.cost_price_per_litre);
            return (
              <div
                key={sale.id}
                onClick={() => navigate(`/app/petrol/sales/${sale.id}`)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {sale.customer_name || 'External Customer'}
                      </h3>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        External
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      {sale.customer_phone && <p>Phone: {sale.customer_phone}</p>}
                      <p>{sale.litres.toFixed(2)} L • {formatCurrency(sale.sale_price_per_litre)}/L</p>
                      <p>{formatDate(new Date(sale.sale_date))}</p>
                      {sale.receipt_number && <p>Receipt: {sale.receipt_number}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Revenue / Profit</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(sale.total_amount)}
                    </p>
                    <p className={`text-sm font-medium ${saleProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(saleProfit)} profit
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
