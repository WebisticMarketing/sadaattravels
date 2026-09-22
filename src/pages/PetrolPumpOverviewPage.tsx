import { useNavigate } from 'react-router-dom';
import { useFuelSales } from '../hooks/useFuelSales';
import { useFuelPurchases } from '../hooks/useFuelPurchases';
import { usePetrolPumpSettings } from '../hooks/usePetrolPumpSettings';
import { formatCurrency } from '../lib/utils';
import { Fuel, TrendingUp, Package, Truck, Users, PlusCircle, Settings } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SummaryCard } from '../components/ui/SummaryCard';
import { Button } from '../components/ui/Button';
import { useState, useMemo } from 'react';

// Compact Month/Year Filter Component
interface MonthYearFilterProps {
  month: string;
  year: string;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
}

const MonthYearFilter: React.FC<MonthYearFilterProps> = ({ month, year, onMonthChange, onYearChange }) => (
  <div className="flex flex-wrap items-center gap-2 mb-4">
    <span className="text-sm text-gray-500">Period:</span>
    <select
      value={month}
      onChange={(e) => onMonthChange(e.target.value)}
      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      <option value="0">January</option>
      <option value="1">February</option>
      <option value="2">March</option>
      <option value="3">April</option>
      <option value="4">May</option>
      <option value="5">June</option>
      <option value="6">July</option>
      <option value="7">August</option>
      <option value="8">September</option>
      <option value="9">October</option>
      <option value="10">November</option>
      <option value="11">December</option>
    </select>
    <select
      value={year}
      onChange={(e) => onYearChange(e.target.value)}
      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {Array.from({ length: 16 }, (_, i) => 2020 + i).map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  </div>
);

type TabType = 'overview' | 'all-sales' | 'bus-fuel' | 'purchases' | 'external-sales' | 'reports';

export default function PetrolPumpOverviewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState('');
  
  // Date period filters - independent per tab (default to current month/year)
  const currentMonth = new Date().getMonth().toString();
  const currentYear = new Date().getFullYear().toString();
  
  // All Sales tab filters
  const [allSalesMonth, setAllSalesMonth] = useState<string>(currentMonth);
  const [allSalesYear, setAllSalesYear] = useState<string>(currentYear);
  
  // Bus Fuel Records tab filters
  const [busFuelMonth, setBusFuelMonth] = useState<string>(currentMonth);
  const [busFuelYear, setBusFuelYear] = useState<string>(currentYear);
  
  // Purchases tab filters
  const [purchasesMonth, setPurchasesMonth] = useState<string>(currentMonth);
  const [purchasesYear, setPurchasesYear] = useState<string>(currentYear);
  
  // External Sales tab filters
  const [externalSalesMonth, setExternalSalesMonth] = useState<string>(currentMonth);
  const [externalSalesYear, setExternalSalesYear] = useState<string>(currentYear);
  
  // Fetch all data
  const { sales: allSales, loading: salesLoading } = useFuelSales();
  const { purchases, loading: purchasesLoading } = useFuelPurchases();
  
  const { settings: petrolPumpSettings, loading: settingsLoading, updateDieselSellingPrice } = usePetrolPumpSettings();

  const loading = salesLoading || purchasesLoading || settingsLoading;
  // Filter All Sales by date period
  const filteredAllSales = useMemo(() => {
    return allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.getMonth().toString() === allSalesMonth && 
             saleDate.getFullYear().toString() === allSalesYear;
    });
  }, [allSales, allSalesMonth, allSalesYear]);

  // Filter Bus Fuel Records (INTERNAL_BUS sales) by date period
  const filteredBusFuelRecords = useMemo(() => {
    const busFuelSales = allSales.filter(s => s.sale_type === 'INTERNAL_BUS');
    return busFuelSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.getMonth().toString() === busFuelMonth && 
             saleDate.getFullYear().toString() === busFuelYear;
    });
  }, [allSales, busFuelMonth, busFuelYear]);

  // Filter Purchases by date period
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.purchase_date);
      return purchaseDate.getMonth().toString() === purchasesMonth && 
             purchaseDate.getFullYear().toString() === purchasesYear;
    });
  }, [purchases, purchasesMonth, purchasesYear]);

  // Filter External Sales (EXTERNAL_CUSTOMER sales) by date period
  const filteredExternalSales = useMemo(() => {
    const externalCustomerSales = allSales.filter(s => s.sale_type === 'EXTERNAL_CUSTOMER');
    return externalCustomerSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.getMonth().toString() === externalSalesMonth && 
             saleDate.getFullYear().toString() === externalSalesYear;
    });
  }, [allSales, externalSalesMonth, externalSalesYear]);

  // Calculate stock (always current, not period-based)
  const totalPurchasedLitres = purchases.reduce((sum, p) => sum + p.litres, 0);
  const totalSoldLitres = allSales.reduce((sum, s) => sum + s.litres, 0);
  const currentStock = totalPurchasedLitres - totalSoldLitres;
  
  // Financial metrics (ALL sales - internal bus + external customer) - always current, not period-based
  const totalFuelRevenue = allSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalFuelCost = allSales.reduce((sum, s) => sum + (s.litres * (s.cost_price_per_litre || 0)), 0);
  const petrolPumpProfit = totalFuelRevenue - totalFuelCost;
  
  // Period-based financial metrics for display
  const periodFuelRevenue = filteredAllSales.reduce((sum, s) => sum + s.total_amount, 0);
  const periodFuelCost = filteredAllSales.reduce((sum, s) => sum + (s.litres * (s.cost_price_per_litre || 0)), 0);
  const periodPetrolPumpProfit = periodFuelRevenue - periodFuelCost;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Petrol Pump" 
        description="Track diesel purchases and bus fuel consumption"
      />

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('all-sales')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'all-sales'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            All Sales
          </button>
          <button
            onClick={() => setActiveTab('bus-fuel')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'bus-fuel'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Bus Fuel Records
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'purchases'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => setActiveTab('external-sales')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'external-sales'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            External Sales
          </button>
          <button
            onClick={() => navigate('/app/petrol/reports')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Reports
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Total Purchased"
                  value={`${totalPurchasedLitres.toFixed(0)} L`}
                  subtitle={`PKR ${formatCurrency(purchases.reduce((sum, p) => sum + p.total_cost, 0)).replace('PKR ', '')} cost`}
                  icon={<Package className="h-6 w-6" />}
                  variant="default"
                />
                <SummaryCard
                  label="Total Sold"
                  value={`${totalSoldLitres.toFixed(0)} L`}
                  subtitle={`PKR ${formatCurrency(totalFuelRevenue).replace('PKR ', '')} revenue`}
                  icon={<Fuel className="h-6 w-6" />}
                  variant="default"
                />
                <SummaryCard
                  label="Current Stock"
                  value={`${currentStock.toFixed(0)} L`}
                  subtitle="Diesel available"
                  icon={<Package className="h-6 w-6" />}
                  variant={currentStock < 100 ? 'danger' : 'default'}
                />
                <SummaryCard
                  label="Profit"
                  value={formatCurrency(petrolPumpProfit)}
                  subtitle="All fuel sales"
                  icon={<TrendingUp className="h-6 w-6" />}
                  variant={petrolPumpProfit >= 0 ? 'success' : 'danger'}
                />
              </div>

              {/* Quick Actions */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Purchases</h3>
                  <p className="mb-4 text-2xl font-bold text-gray-900">{purchases.length}</p>
                  <p className="text-sm text-gray-500">Total purchase records</p>
                  <Button 
                    onClick={() => navigate('/app/petrol/purchases/new')} 
                    className="mt-4 w-full"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Purchase
                  </Button>
                </div>
                
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Bus Fuel Records</h3>
                  <p className="mb-4 text-2xl font-bold text-gray-900">{filteredBusFuelRecords.length}</p>
                  <p className="text-sm text-gray-500">Total fuel records</p>
                  <Button 
                    onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')} 
                    className="mt-4 w-full"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Record Bus Fuel
                  </Button>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Diesel Selling Price</h3>
                    <Settings className="h-5 w-5 text-gray-400" />
                  </div>
                  {petrolPumpSettings ? (
                    <>
                      <p className="mb-2 text-3xl font-bold text-blue-600">
                        Rs. {petrolPumpSettings.diesel_selling_price_per_litre.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 mb-4">per litre</p>
                      <Button
                        onClick={() => {
                          setEditingPrice(petrolPumpSettings.diesel_selling_price_per_litre.toString());
                          setShowSettingsModal(true);
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        Edit Price
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Loading...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bus Fuel Records Tab */}
          {activeTab === 'bus-fuel' && (
            <div className="space-y-4">
              <MonthYearFilter
                month={busFuelMonth}
                year={busFuelYear}
                onMonthChange={setBusFuelMonth}
                onYearChange={setBusFuelYear}
              />
              <div className="flex justify-end">
                <Button onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Record
                </Button>
              </div>
              
              {filteredBusFuelRecords.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <Truck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No bus fuel records found for the selected period</h3>
                  <p className="mt-2 text-sm text-gray-500">Record diesel issued to Sadaat buses</p>
                  <Button 
                    onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')} 
                    className="mt-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Record
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Bus</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Litres</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Voucher Diesel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredBusFuelRecords.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {sale.buses?.registration_number || 'Unknown'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {sale.litres.toFixed(0)} L
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            PKR {formatCurrency(sale.total_amount).replace('PKR ', '')}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            <Button variant="ghost" size="sm">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* All Sales Tab */}
          {activeTab === 'all-sales' && (
            <div className="space-y-4">
              <MonthYearFilter
                month={allSalesMonth}
                year={allSalesYear}
                onMonthChange={setAllSalesMonth}
                onYearChange={setAllSalesYear}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {filteredAllSales.length} sale{filteredAllSales.length !== 1 ? 's' : ''} for the selected period
                </p>
                <Button onClick={() => navigate('/app/petrol/sales/new')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Fuel Sale
                </Button>
              </div>
              
              {filteredAllSales.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <Fuel className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No sales found for the selected period</h3>
                  <p className="mt-2 text-sm text-gray-500">Record fuel sold to buses or external customers</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer/Bus</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Litres</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredAllSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              sale.sale_type === 'INTERNAL_BUS' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {sale.sale_type === 'INTERNAL_BUS' ? 'Internal Bus' : 'External Customer'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {sale.sale_type === 'INTERNAL_BUS' 
                              ? sale.buses?.registration_number || 'Unknown'
                              : sale.customer_name || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {sale.litres.toFixed(0)} L
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            PKR {formatCurrency(sale.total_amount).replace('PKR ', '')}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/app/petrol/sales/${sale.id}`)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <MonthYearFilter
                month={purchasesMonth}
                year={purchasesYear}
                onMonthChange={setPurchasesMonth}
                onYearChange={setPurchasesYear}
              />
              <div className="flex justify-end">
                <Button onClick={() => navigate('/app/petrol/purchases/new')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Purchase
                </Button>
              </div>
              
              {filteredPurchases.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No purchases found for the selected period</h3>
                  <p className="mt-2 text-sm text-gray-500">Record diesel purchased for the pump</p>
                  <Button 
                    onClick={() => navigate('/app/petrol/purchases/new')} 
                    className="mt-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Purchase
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Litres</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cost/Litre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {new Date(purchase.purchase_date).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {purchase.supplier || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {purchase.litres.toFixed(0)} L
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            PKR {purchase.cost_per_litre.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {formatCurrency(purchase.total_cost)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            <Button variant="ghost" size="sm">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* External Sales Tab */}
          {activeTab === 'external-sales' && (
            <div className="space-y-4">
              <MonthYearFilter
                month={externalSalesMonth}
                year={externalSalesYear}
                onMonthChange={setExternalSalesMonth}
                onYearChange={setExternalSalesYear}
              />
              <div className="flex justify-end">
                <Button onClick={() => navigate('/app/petrol/sales/new?saleType=EXTERNAL_CUSTOMER')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Sale
                </Button>
              </div>
              
              {filteredExternalSales.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No external sales found for the selected period</h3>
                  <p className="mt-2 text-sm text-gray-500">Record fuel sold to outside customers</p>
                  <Button 
                    onClick={() => navigate('/app/petrol/sales/new?saleType=EXTERNAL_CUSTOMER')} 
                    className="mt-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Sale
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Litres</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Price/Litre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Sale</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Profit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredExternalSales.map((sale) => {
                        const profit = sale.total_amount - (sale.litres * sale.cost_price_per_litre);
                        return (
                          <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {new Date(sale.created_at).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {sale.customer_name || 'N/A'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {sale.litres.toFixed(0)} L
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              PKR {sale.sale_price_per_litre.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {formatCurrency(sale.total_amount)}
                            </td>
                            <td className={`whitespace-nowrap px-6 py-4 text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(profit)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                              <Button variant="ghost" size="sm">View</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settings Modal */}
          {showSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Edit Diesel Selling Price</h3>
                
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Diesel Selling Price (Rs. per Litre)
                  </label>
                  <input
                    type="number"
                    value={editingPrice}
                    onChange={(e) => setEditingPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This is the standard selling price for external customer sales
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => setShowSettingsModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const price = parseFloat(editingPrice);
                        if (isNaN(price) || price < 0) {
                          throw new Error('Please enter a valid price >= 0');
                        }
                        await updateDieselSellingPrice(price, `Updated diesel selling price to Rs. ${price.toFixed(2)}/L`);
                        setShowSettingsModal(false);
                      } catch (err) {
                        alert(err instanceof Error ? err.message : 'Failed to update price');
                      }
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
