import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonalExpenses } from '../hooks/usePersonalExpenses';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Filter, Wallet } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { SummaryCard } from '../components/ui/SummaryCard';
import { PrintButton } from '../components/ui/PrintButton';
import { Button } from '../components/ui/Button';

export default function PersonalExpensesPage() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    search: '',
  });

  const { expenses, loading, error } = usePersonalExpenses({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    category: filters.category || undefined,
  });

  // Filter expenses by search
  const filteredExpenses = expenses.filter(expense => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      expense.category.toLowerCase().includes(searchLower) ||
      expense.description.toLowerCase().includes(searchLower) ||
      expense.paid_by?.toLowerCase().includes(searchLower)
    );
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Get unique categories for filter
  const categories = Array.from(new Set(expenses.map(e => e.category))).sort();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Personal Expenses" 
        description="Track personal expenses (separate from business)"
      >
        <div className="flex gap-2">
          <PrintButton />
          <Button onClick={() => navigate('/app/expenses/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </PageHeader>

      {/* Info Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Wallet className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Personal Expenses are separate from business accounting
            </p>
            <p className="mt-1 text-xs text-amber-700">
              These expenses are not included in business financial reports or profit calculations.
              Only OWNER and MANAGER can access this section.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Total Expenses"
          value={filteredExpenses.length}
          icon={<Wallet className="h-6 w-6" />}
        />
        <SummaryCard
          label="Total Amount"
          value={formatCurrency(totalAmount)}
          icon={<Wallet className="h-6 w-6" />}
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
            placeholder="Search by category, description, or paid by..."
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
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
      {/* Expenses List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading expenses...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No personal expenses</h3>
          <p className="mt-2 text-sm text-gray-500">
            {showFilters || filters.search
              ? 'Try adjusting your filters'
              : 'Get started by adding your first personal expense'}
          </p>
          {!showFilters && !filters.search && (
            <button
              onClick={() => navigate('/app/expenses/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Expense
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              onClick={() => navigate(`/app/expenses/${expense.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{expense.category}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        expense.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {expense.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                    <span>{formatDate(new Date(expense.expense_date))}</span>
                    {expense.paid_by && (
                      <>
                        <span>•</span>
                        <span>Paid by: {expense.paid_by}</span>
                      </>
                    )}
                  </div>
                  {expense.description && (
                    <p className="mt-1 text-sm text-gray-600">{expense.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-lg font-bold text-amber-600">
                    {formatCurrency(expense.amount)}
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
