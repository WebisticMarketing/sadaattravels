import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFuelSales } from '../hooks/useFuelSales';
import { useBuses } from '../hooks/useBuses';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Fuel } from 'lucide-react';

export default function FuelSalesPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    saleType: '' as '' | 'EXTERNAL_CUSTOMER' | 'INTERNAL_BUS',
    busId: '',
  });

  const { sales, loading, error } = useFuelSales({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    saleType: filters.saleType || undefined,
    busId: filters.busId || undefined,
  });

  const externalSales = sales.filter(s => s.sale_type === 'EXTERNAL_CUSTOMER');
  
  const externalRevenue = externalSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalLitres = sales.reduce((sum, s) => sum + s.litres, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Sales</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record fuel sales to customers and buses
          </p>
        </div>
        <button
          onClick={() => navigate('/app/petrol/sales/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Sale
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Fuel className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-xl font-bold text-gray-900">{sales.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Fuel className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">External Revenue</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(externalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Fuel className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Litres</p>
              <p className="text-xl font-bold text-gray-900">
                {totalLitres.toFixed(2)} L
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                Sale Type
              </label>
              <select
                value={filters.saleType}
                onChange={(e) => setFilters({ ...filters, saleType: e.target.value as any })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All types</option>
                <option value="EXTERNAL_CUSTOMER">External Customer</option>
                <option value="INTERNAL_BUS">Internal Bus</option>
              </select>
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
          </div>
        )}
      </div>

      {/* Sales List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading fuel sales...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Fuel className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No fuel sales</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters
              ? 'Try adjusting your filters'
              : 'Get started by adding your first fuel sale'}
          </p>
          {!showFilters && (
            <button
              onClick={() => navigate('/app/petrol/sales/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Sale
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => navigate(`/app/petrol/sales/${sale.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {sale.sale_type === 'EXTERNAL_CUSTOMER'
                        ? sale.customer_name || 'External Customer'
                        : sale.buses?.registration_number || 'Internal Bus'}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        sale.sale_type === 'EXTERNAL_CUSTOMER'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {sale.sale_type === 'EXTERNAL_CUSTOMER' ? 'External' : 'Internal'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                    <span>{formatDate(new Date(sale.sale_date))}</span>
                    <span>•</span>
                    <span>{sale.litres.toFixed(2)} L</span>
                    <span>•</span>
                    <span>{formatCurrency(sale.sale_price_per_litre)}/L</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-lg font-bold text-green-600">
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
