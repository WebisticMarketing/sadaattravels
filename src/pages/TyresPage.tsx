import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTyres } from '../hooks/useTyres';
import { useBuses } from '../hooks/useBuses';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, CircleDot } from 'lucide-react';

export default function TyresPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    busId: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const { tyres, loading, error } = useTyres({
    busId: filters.busId || undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  const totalCost = tyres
    .filter(t => t.status === 'active')
    .reduce((sum, t) => sum + t.total_cost, 0);

  const activeCount = tyres.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tyres</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track tyre purchases and replacements
          </p>
        </div>
        <button
          onClick={() => navigate('/app/tyres/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Tyre Record
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CircleDot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-xl font-bold text-gray-900">{tyres.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CircleDot className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Records</p>
              <p className="text-xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <CircleDot className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-xl font-bold text-amber-600">
                {formatCurrency(totalCost)}
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

      {/* Tyre Records List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading tyre records...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : tyres.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <CircleDot className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No tyre records</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters
              ? 'Try adjusting your filters'
              : 'Get started by adding your first tyre record'}
          </p>
          {!showFilters && (
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
          {tyres.map((tyre) => (
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
