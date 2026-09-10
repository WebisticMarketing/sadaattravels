import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstallments } from '../hooks/useInstallments';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, CreditCard } from 'lucide-react';

export default function InstallmentsPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '' as '' | 'taken' | 'given',
    status: '',
  });

  const { installments, loading, error } = useInstallments({
    type: filters.type || undefined,
    status: filters.status || undefined,
  });

  const takenInstallments = installments.filter(i => i.installment_type === 'taken');
  const givenInstallments = installments.filter(i => i.installment_type === 'given');
  
  const totalTaken = takenInstallments.reduce((sum, i) => sum + i.total_amount, 0);
  const totalTakenPaid = takenInstallments.reduce((sum, i) => sum + i.paid_amount, 0);
  const totalTakenRemaining = takenInstallments.reduce((sum, i) => sum + i.remaining_amount, 0);
  
  const totalGiven = givenInstallments.reduce((sum, i) => sum + i.total_amount, 0);
  const totalGivenPaid = givenInstallments.reduce((sum, i) => sum + i.paid_amount, 0);
  const totalGivenRemaining = givenInstallments.reduce((sum, i) => sum + i.remaining_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Installments & Loans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track loans taken and given
          </p>
        </div>
        <button
          onClick={() => navigate('/app/installments/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Installment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Taken Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <CreditCard className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Loans Taken</p>
              <p className="text-xl font-bold text-gray-900">{takenInstallments.length}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total:</span>
              <span className="font-semibold">{formatCurrency(totalTaken)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Paid:</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalTakenPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining:</span>
              <span className="font-semibold text-red-600">{formatCurrency(totalTakenRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Given Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Loans Given</p>
              <p className="text-xl font-bold text-gray-900">{givenInstallments.length}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total:</span>
              <span className="font-semibold">{formatCurrency(totalGiven)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Received:</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalGivenPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Remaining:</span>
              <span className="font-semibold text-blue-600">{formatCurrency(totalGivenRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Net Position */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Position</p>
              <p className={`text-xl font-bold ${totalGivenRemaining - totalTakenRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalGivenRemaining - totalTakenRemaining)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {totalGivenRemaining - totalTakenRemaining >= 0 
              ? 'Net receivable (others owe you)' 
              : 'Net payable (you owe others)'}
          </p>
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All types</option>
                <option value="taken">Loans Taken</option>
                <option value="given">Loans Given</option>
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

      {/* Installments List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading installments...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : installments.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No installments</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters
              ? 'Try adjusting your filters'
              : 'Get started by adding your first installment'}
          </p>
          {!showFilters && (
            <button
              onClick={() => navigate('/app/installments/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Installment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {installments.map((installment) => (
            <div
              key={installment.id}
              onClick={() => navigate(`/app/installments/${installment.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{installment.person_name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        installment.installment_type === 'taken'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {installment.installment_type === 'taken' ? 'Taken' : 'Given'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        installment.status === 'active'
                          ? 'bg-blue-100 text-blue-700'
                          : installment.status === 'reversed'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {installment.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                    <span>Started: {formatDate(new Date(installment.start_date))}</span>
                    {installment.person_phone && (
                      <>
                        <span>•</span>
                        <span>{installment.person_phone}</span>
                      </>
                    )}
                  </div>
                  {installment.description && (
                    <p className="mt-1 text-sm text-gray-600">{installment.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(installment.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {installment.installment_type === 'taken' ? 'Paid' : 'Received'}
                      </p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(installment.paid_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Remaining</p>
                      <p className="text-sm font-bold text-blue-600">
                        {formatCurrency(installment.remaining_amount)}
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
