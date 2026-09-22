import { useState } from 'react';
import { usePetrolPumpReport } from '../hooks/usePetrolPumpReport';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import { PageHeader } from '../components/ui/PageHeader';
import { PrintButton } from '../components/ui/PrintButton';
import { PrintDocument } from '../components/print/PrintDocument';
import { Button } from '../components/ui/Button';
import { Fuel, TrendingUp, Package, Truck, Users } from 'lucide-react';

export default function PetrolPumpReportsPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const { report, loading, error } = usePetrolPumpReport(selectedYear, selectedMonth);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Petrol Pump Reports" description="Historical fuel reports" />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Petrol Pump Reports" description="Historical fuel reports" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <PageHeader title="Petrol Pump Reports" description="Historical fuel reports" />
        <div className="py-12 text-center text-gray-500">No data available</div>
      </div>
    );
  }

  const periodLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Petrol Pump Reports" 
        description="Historical fuel inventory and profitability reports"
      >
        <PrintButton label="Print Report" />
      </PageHeader>

      {/* Period Filter */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {Array.from({ length: 16 }, (_, i) => 2020 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing: <span className="font-semibold">{periodLabel}</span>
          </div>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Inventory Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Opening Stock</p>
                <p className="text-lg font-bold text-gray-900">{report.openingStock.litres.toFixed(0)} L</p>
                <p className="text-xs text-gray-600">{formatCurrency(report.openingStock.value)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Purchases</p>
                <p className="text-lg font-bold text-gray-900">{report.purchases.totalLitres.toFixed(0)} L</p>
                <p className="text-xs text-gray-600">{formatCurrency(report.purchases.totalCost)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <Fuel className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sales</p>
                <p className="text-lg font-bold text-gray-900">{report.sales.totalLitres.toFixed(0)} L</p>
                <p className="text-xs text-gray-600">Cost: {formatCurrency(report.sales.totalCost)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Closing Stock</p>
                <p className="text-lg font-bold text-gray-900">{report.closingStock.litres.toFixed(0)} L</p>
                <p className="text-xs text-gray-600">{formatCurrency(report.closingStock.value)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Financial Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Litres</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Total Sales</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{report.sales.totalLitres.toFixed(0)} L</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">{formatCurrency(report.sales.totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(report.sales.totalCost)}</td>
                <td className={`px-4 py-3 text-right text-sm font-bold ${report.sales.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.sales.grossProfit)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700 pl-8">└─ Bus Fuel (Internal)</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{report.busFuel.totalLitres.toFixed(0)} L</td>
                <td className="px-4 py-3 text-right text-sm text-green-600">{formatCurrency(report.busFuel.totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(report.busFuel.totalCost)}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${report.busFuel.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.busFuel.grossProfit)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700 pl-8">└─ External Sales</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{report.externalSales.totalLitres.toFixed(0)} L</td>
                <td className="px-4 py-3 text-right text-sm text-green-600">{formatCurrency(report.externalSales.totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(report.externalSales.totalCost)}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${report.externalSales.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.externalSales.grossProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchases Detail */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Purchases ({report.purchaseRecords.length} records)
        </h2>
        {report.purchaseRecords.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No purchases in this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Supplier</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Litres</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cost/L</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Receipt #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {report.purchaseRecords.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(purchase.purchase_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{purchase.supplier}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{purchase.litres.toFixed(0)} L</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(purchase.cost_per_litre)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(purchase.total_cost)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{purchase.receipt_number || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        purchase.status === 'active' ? 'bg-green-100 text-green-800' :
                        purchase.status === 'reversed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{purchase.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{report.purchases.totalLitres.toFixed(0)} L</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(report.purchases.averageCostPerLitre)}/L</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(report.purchases.totalCost)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Reversed Purchases Section */}
      {report.reversedPurchases.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-red-900">
            Reversed/Cancelled Purchases ({report.reversedPurchases.length} records)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Supplier</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-red-700">Litres</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-red-700">Cost/L</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-red-700">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Reversed By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Reversed At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-red-50">
                {report.reversedPurchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-red-100">
                    <td className="px-4 py-3 text-sm text-red-900">{formatDate(purchase.purchase_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-red-900">{purchase.supplier}</td>
                    <td className="px-4 py-3 text-right text-sm text-red-900">{purchase.litres.toFixed(0)} L</td>
                    <td className="px-4 py-3 text-right text-sm text-red-900">{formatCurrency(purchase.cost_per_litre)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-900">{formatCurrency(purchase.total_cost)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-800">
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-red-900">{purchase.reversed_by || '-'}</td>
                    <td className="px-4 py-3 text-sm text-red-900">{purchase.reversed_at ? formatDateTime(purchase.reversed_at) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-red-900 max-w-xs truncate">{purchase.reversal_reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bus Fuel Detail */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Bus Fuel Consumption ({report.busFuel.recordCount} records)
        </h2>
        {report.busFuel.recordCount === 0 ? (
          <p className="text-sm text-gray-500 py-4">No bus fuel records in this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Bus</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Litres</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Price/L</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cost/L</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {report.saleRecords.filter(s => s.sale_type === 'INTERNAL_BUS').map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(sale.sale_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {sale.buses?.registration_number || sale.buses?.bus_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{sale.litres.toFixed(0)} L</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(sale.sale_price_per_litre)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(sale.cost_price_per_litre)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'active' ? 'bg-green-100 text-green-800' :
                        sale.status === 'reversed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{sale.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* External Sales Detail */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          External Customer Sales ({report.externalSales.recordCount} records)
        </h2>
        {report.externalSales.recordCount === 0 ? (
          <p className="text-sm text-gray-500 py-4">No external sales in this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Litres</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Price/L</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cost/L</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Payment</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Profit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Receipt #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {report.saleRecords.filter(s => s.sale_type === 'EXTERNAL_CUSTOMER').map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(sale.sale_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {sale.customer_name || sale.customer_phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{sale.litres.toFixed(0)} L</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(sale.sale_price_per_litre)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(sale.cost_price_per_litre)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${
                      (sale.total_amount - (sale.litres * sale.cost_price_per_litre)) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(sale.total_amount - (sale.litres * sale.cost_price_per_litre))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{sale.receipt_number || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'active' ? 'bg-green-100 text-green-800' :
                        sale.status === 'reversed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reversed Sales Section */}
      {report.reversedSales.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-red-900">
            Reversed/Cancelled Sales ({report.reversedSales.length} records)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Customer/Bus</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-red-700">Litres</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-red-700">Price/L</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-red-700">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Reversed By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Reversed At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-red-50">
                {report.reversedSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-red-100">
                    <td className="px-4 py-3 text-sm text-red-900">{formatDate(sale.sale_date)}</td>
                    <td className="px-4 py-3 text-sm text-red-900">{sale.sale_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm text-red-900">
                      {sale.sale_type === 'INTERNAL_BUS' 
                        ? (sale.buses?.registration_number || sale.buses?.bus_name || '-')
                        : (sale.customer_name || sale.customer_phone || '-')
                      }
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-900">{sale.litres.toFixed(0)} L</td>
                    <td className="px-4 py-3 text-right text-sm text-red-900">{formatCurrency(sale.sale_price_per_litre)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-900">{formatCurrency(sale.total_amount)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-800">
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-red-900">{sale.reversed_by || '-'}</td>
                    <td className="px-4 py-3 text-sm text-red-900">{sale.reversed_at ? formatDateTime(sale.reversed_at) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-red-900 max-w-xs truncate">{sale.reversal_reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selling Price History */}
      {report.sellingPriceHistory.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Selling Price History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Selling Price/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {report.sellingPriceHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden Print Document */}
      <div className="hidden print:block">
        <PrintDocument
          title="PETROL PUMP — MONTHLY FUEL REPORT"
          subtitle={periodLabel}
          dateRange={{
            start: new Date(report.periodStart),
            end: new Date(report.periodEnd),
          }}
        >
          <div className="space-y-6">
            {/* Inventory Summary for Print */}
            <div>
              <h3 className="text-base font-semibold mb-3">Inventory Summary</h3>
              <table className="min-w-full">
                <tbody>
                  <tr>
                    <td className="py-2 text-sm">Opening Stock</td>
                    <td className="py-2 text-sm text-right font-semibold">{report.openingStock.litres.toFixed(0)} L</td>
                    <td className="py-2 text-sm text-right">{formatCurrency(report.openingStock.value)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm">Purchases</td>
                    <td className="py-2 text-sm text-right font-semibold">{report.purchases.totalLitres.toFixed(0)} L</td>
                    <td className="py-2 text-sm text-right">{formatCurrency(report.purchases.totalCost)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm">Sales</td>
                    <td className="py-2 text-sm text-right font-semibold">{report.sales.totalLitres.toFixed(0)} L</td>
                    <td className="py-2 text-sm text-right">Cost: {formatCurrency(report.sales.totalCost)}</td>
                  </tr>
                  <tr className="border-t border-gray-300">
                    <td className="py-2 text-sm font-semibold">Closing Stock</td>
                    <td className="py-2 text-sm text-right font-bold">{report.closingStock.litres.toFixed(0)} L</td>
                    <td className="py-2 text-sm text-right">{formatCurrency(report.closingStock.value)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Summary for Print */}
            <div>
              <h3 className="text-base font-semibold mb-3">Financial Summary</h3>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-2 text-left text-xs font-semibold">Category</th>
                    <th className="py-2 text-right text-xs font-semibold">Revenue</th>
                    <th className="py-2 text-right text-xs font-semibold">Cost</th>
                    <th className="py-2 text-right text-xs font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 text-sm">Total Sales</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(report.sales.totalRevenue)}</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(report.sales.totalCost)}</td>
                    <td className={`py-2 text-right text-sm font-semibold ${report.sales.grossProfit >= 0 ? '' : 'text-red-600'}`}>
                      {formatCurrency(report.sales.grossProfit)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm pl-4">└─ Bus Fuel</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(report.busFuel.totalRevenue)}</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(report.busFuel.totalCost)}</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(report.busFuel.grossProfit)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm pl-4">└─ External</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(report.externalSales.totalRevenue)}</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(report.externalSales.totalCost)}</td>
                    <td className="py-2 text-right text-sm">{formatCurrency(report.externalSales.grossProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Purchases Table for Print */}
            {report.purchaseRecords.length > 0 && (
              <div>
                <h3 className="text-base font-semibold mb-3">Purchases</h3>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="py-2 text-left text-xs font-semibold">Date</th>
                      <th className="py-2 text-left text-xs font-semibold">Supplier</th>
                      <th className="py-2 text-right text-xs font-semibold">Litres</th>
                      <th className="py-2 text-right text-xs font-semibold">Cost/L</th>
                      <th className="py-2 text-right text-xs font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.purchaseRecords.map(purchase => (
                      <tr key={purchase.id} className="border-b border-gray-200">
                        <td className="py-2 text-xs">{formatDate(purchase.purchase_date)}</td>
                        <td className="py-2 text-xs">{purchase.supplier}</td>
                        <td className="py-2 text-right text-xs">{purchase.litres.toFixed(0)} L</td>
                        <td className="py-2 text-right text-xs">{formatCurrency(purchase.cost_per_litre)}</td>
                        <td className="py-2 text-right text-xs font-semibold">{formatCurrency(purchase.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bus Fuel Table for Print */}
            {report.busFuel.recordCount > 0 && (
              <div>
                <h3 className="text-base font-semibold mb-3">Bus Fuel Consumption</h3>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="py-2 text-left text-xs font-semibold">Date</th>
                      <th className="py-2 text-left text-xs font-semibold">Bus</th>
                      <th className="py-2 text-right text-xs font-semibold">Litres</th>
                      <th className="py-2 text-right text-xs font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.saleRecords.filter(s => s.sale_type === 'INTERNAL_BUS').map(sale => (
                      <tr key={sale.id} className="border-b border-gray-200">
                        <td className="py-2 text-xs">{formatDate(sale.sale_date)}</td>
                        <td className="py-2 text-xs">{sale.buses?.registration_number || sale.buses?.bus_name || '-'}</td>
                        <td className="py-2 text-right text-xs">{sale.litres.toFixed(0)} L</td>
                        <td className="py-2 text-right text-xs font-semibold">{formatCurrency(sale.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* External Sales Table for Print */}
            {report.externalSales.recordCount > 0 && (
              <div>
                <h3 className="text-base font-semibold mb-3">External Sales</h3>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="py-2 text-left text-xs font-semibold">Date</th>
                      <th className="py-2 text-left text-xs font-semibold">Customer</th>
                      <th className="py-2 text-right text-xs font-semibold">Litres</th>
                      <th className="py-2 text-right text-xs font-semibold">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.saleRecords.filter(s => s.sale_type === 'EXTERNAL_CUSTOMER').map(sale => (
                      <tr key={sale.id} className="border-b border-gray-200">
                        <td className="py-2 text-xs">{formatDate(sale.sale_date)}</td>
                        <td className="py-2 text-xs">{sale.customer_name || sale.customer_phone || '-'}</td>
                        <td className="py-2 text-right text-xs">{sale.litres.toFixed(0)} L</td>
                        <td className="py-2 text-right text-xs font-semibold">{formatCurrency(sale.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PrintDocument>
      </div>
    </div>
  );
}
