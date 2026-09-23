import { useState } from 'react';
import { useOverallSummary, useBusProfitability } from '../hooks/useReports';
import { formatCurrency, formatDate, getMonthStart, getMonthEnd } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Bus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PrintButton } from '../components/ui/PrintButton';
import { MonthYearFilter } from '../components/ui/MonthYearFilter';

export default function ReportsPage() {
  // Default to current month
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Calculate month start/end dates for queries
  const dbDateRange = {
    startDate: getMonthStart(selectedYear, selectedMonth),
    endDate: getMonthEnd(selectedYear, selectedMonth),
  };

  const { summary, loading: summaryLoading, error: summaryError } = useOverallSummary(dbDateRange);
  const { buses, loading: busesLoading, error: busesError } = useBusProfitability(dbDateRange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Reports" 
        description="Business performance and profitability reports"
      >
        <PrintButton />
      </PageHeader>

      {/* Month + Year Filter */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <MonthYearFilter
          month={selectedMonth}
          year={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />
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

          {/* Gross, additive breakdown — every line comes from the shared
              company accounting engine and sums exactly to the totals above. */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Revenue section */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Trip Revenue</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(summary.tripRevenue)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Petrol Pump — External Sales</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(summary.pumpExternalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Petrol Pump — Internal Bus Sales</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(summary.pumpInternalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Adda Income</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(summary.addaIncome)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Cargo Revenue</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(summary.cargoRevenue)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-gray-900">Total Revenue</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Costs / Expenses section */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Costs &amp; Expenses Breakdown</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Trip Expenses</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(summary.tripExpenses)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Maintenance</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(summary.maintenanceCost)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Tyres</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(summary.tyreCost)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Adda Expenses</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(summary.addaExpenses)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Cargo Expenses</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(summary.cargoExpenses)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Petrol Pump COGS (WAC)</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(summary.pumpCogsWac)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Petrol Pump Operating Expenses</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(summary.pumpOperatingExpenses)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm font-medium text-gray-700">Loan Installment Payments (Taken)</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(summary.installmentPayments)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-gray-900">Total Expenses</span>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Business Unit Profitability — informational; nets reconcile to Company Net Profit */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Business Unit Profitability</h2>
            <p className="mb-4 text-xs text-gray-500">
              Each unit&apos;s net profit reconciles to the company Net Profit above
              (Transport + Petrol Pump + Adda + Cargo − Loan Installment Payments).
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Transport Net Profit (Trips − Expenses − Maintenance − Tyres)</span>
                <span className={`text-sm font-semibold ${summary.accounting.units.transport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.accounting.units.transport.netProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Petrol Pump Net Profit (Revenue − WAC COGS − OpEx)</span>
                <span className={`text-sm font-semibold ${summary.pumpNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.pumpNetProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Adda Net Profit</span>
                <span className={`text-sm font-semibold ${summary.accounting.units.adda.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.accounting.units.adda.netProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Cargo Net Profit</span>
                <span className={`text-sm font-semibold ${summary.accounting.units.cargo.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.accounting.units.cargo.netProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-medium text-gray-700">Loan Installment Payments (legacy expense treatment)</span>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(-summary.installmentPayments)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-gray-900">Company Net Profit</span>
                <span className={`text-sm font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalProfit)}
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
