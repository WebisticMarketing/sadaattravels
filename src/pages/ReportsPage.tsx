import { useState } from 'react';
import { useOverallSummary, useBusProfitability } from '../hooks/useReports';
import { formatCurrency, formatDate } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Bus } from 'lucide-react';

export default function ReportsPage() {
  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [dateRange, setDateRange] = useState({
    startDate: formatDate(firstDay),
    endDate: formatDate(today),
  });

  // Convert DD/MM/YYYY to YYYY-MM-DD for database queries
  const [startDate, month, year] = dateRange.startDate.split('/');
  const [endDate, endMonth, endYear] = dateRange.endDate.split('/');
  const dbDateRange = {
    startDate: `${year}-${month}-${startDate}`,
    endDate: `${endYear}-${endMonth}-${endDate}`,
  };

  const { summary, loading: summaryLoading, error: summaryError } = useOverallSummary(dbDateRange);
  const { buses, loading: busesLoading, error: busesError } = useBusProfitability(dbDateRange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Business performance and profitability reports
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Date Range</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="text"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              placeholder="DD/MM/YYYY"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="text"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              placeholder="DD/MM/YYYY"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      {summaryLoading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading summary...</p>
          </div>
        </div>
      ) : summaryError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{summaryError}</p>
        </div>
      ) : summary ? (
        <>
          {/* Total Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(summary.totalRevenue)}
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
                    {formatCurrency(summary.totalExpenses)}
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
                  <p className={`text-xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.totalProfit)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue & Expense Breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Trip Revenue</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatCurrency(summary.tripRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Trip Expenses</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(summary.tripExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Maintenance Cost</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(summary.maintenanceCost)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Tyre Cost</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(summary.tyreCost)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Adda Profit</span>
                <span className={`text-sm font-semibold ${summary.addaProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.addaProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Cargo Profit</span>
                <span className={`text-sm font-semibold ${summary.cargoProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.cargoProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Fuel Profit</span>
                <span className={`text-sm font-semibold ${summary.fuelProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.fuelProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Installment Payments (Expenses)</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(summary.installmentPayments)}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Bus Profitability */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Bus Profitability</h2>
        {busesLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading bus data...</p>
            </div>
          </div>
        ) : busesError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{busesError}</p>
          </div>
        ) : buses.length === 0 ? (
          <div className="py-12 text-center">
            <Bus className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">No buses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Bus
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Trip Expenses
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Maintenance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tyres
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Net Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {buses.map((bus) => (
                  <tr key={bus.busId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{bus.registrationNumber}</p>
                        {bus.busName && (
                          <p className="text-xs text-gray-500">{bus.busName}</p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-green-600">
                      {formatCurrency(bus.totalRevenue)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-red-600">
                      {formatCurrency(bus.totalExpenses)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-red-600">
                      {formatCurrency(bus.maintenanceCost)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-red-600">
                      {formatCurrency(bus.tyreCost)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-bold ${bus.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(bus.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
