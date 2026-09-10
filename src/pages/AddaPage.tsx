import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAddaIncome } from '../hooks/useAddaIncome';
import { useAddaExpenses } from '../hooks/useAddaExpenses';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function AddaPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  const { incomes, loading: loadingIncome } = useAddaIncome({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  const { expenses, loading: loadingExpenses } = useAddaExpenses({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adda</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track adda income and expenses
          </p>
        </div>
        <button
          onClick={() => navigate(activeTab === 'income' ? '/app/adda/income/new' : '/app/adda/expenses/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add {activeTab === 'income' ? 'Income' : 'Expense'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('income')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'income'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Income ({incomes.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'expenses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Expenses ({expenses.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'income' ? (
        loadingIncome ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading income records...</p>
            </div>
          </div>
        ) : incomes.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No income records</h3>
            <p className="mt-2 text-sm text-gray-500">Get started by adding your first income record</p>
            <button
              onClick={() => navigate('/app/adda/income/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Income
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {incomes.map((income) => (
              <div
                key={income.id}
                onClick={() => navigate(`/app/adda/income/${income.id}`)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{income.income_type}</h3>
                    <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                      <span>{formatDate(new Date(income.income_date))}</span>
                      {income.received_from && (
                        <>
                          <span>•</span>
                          <span>From: {income.received_from}</span>
                        </>
                      )}
                    </div>
                    {income.description && (
                      <p className="mt-1 text-sm text-gray-600">{income.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(income.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        loadingExpenses ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading expense records...</p>
            </div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <TrendingDown className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No expense records</h3>
            <p className="mt-2 text-sm text-gray-500">Get started by adding your first expense record</p>
            <button
              onClick={() => navigate('/app/adda/expenses/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                onClick={() => navigate(`/app/adda/expenses/${expense.id}`)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{expense.expense_type}</h3>
                    <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                      <span>{formatDate(new Date(expense.expense_date))}</span>
                      {expense.paid_to && (
                        <>
                          <span>•</span>
                          <span>To: {expense.paid_to}</span>
                        </>
                      )}
                    </div>
                    {expense.description && (
                      <p className="mt-1 text-sm text-gray-600">{expense.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
