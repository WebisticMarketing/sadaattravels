import { useNavigate } from 'react-router-dom';
import { useFuelSales } from '../hooks/useFuelSales';
import { useFuelPurchases } from '../hooks/useFuelPurchases';
import { formatCurrency } from '../lib/utils';
import { Fuel, TrendingUp, Package, Truck, Users, PlusCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SummaryCard } from '../components/ui/SummaryCard';
import { Button } from '../components/ui/Button';
import { useState } from 'react';

type TabType = 'overview' | 'bus-fuel' | 'purchases' | 'external-sales';

export default function PetrolPumpOverviewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Fetch all data
  const { sales: allSales, loading: salesLoading } = useFuelSales();
  const { purchases, loading: purchasesLoading } = useFuelPurchases();
  
  const loading = salesLoading || purchasesLoading;
  
  // Filter sales by type
  const busFuelRecords = allSales.filter(s => s.sale_type === 'INTERNAL_BUS');
  const externalSales = allSales.filter(s => s.sale_type === 'EXTERNAL_CUSTOMER');
  
  // Calculate stock (always current, not period-based)
  const totalPurchasedLitres = purchases.reduce((sum, p) => sum + p.litres, 0);
  const totalSoldLitres = allSales.reduce((sum, s) => sum + s.litres, 0);
  const currentStock = totalPurchasedLitres - totalSoldLitres;
  
  // Financial metrics (external sales only)
  const externalRevenue = externalSales.reduce((sum, s) => sum + s.total_amount, 0);
  const externalCost = externalSales.reduce((sum, s) => sum + (s.litres * s.cost_price_per_litre), 0);
  const petrolPumpProfit = externalRevenue - externalCost;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Petrol Pump" 
        description="Track diesel purchases and bus fuel consumption"
      />

      {/* Tabs */}
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
                  label="Total Sold to Buses"
                  value={`${busFuelRecords.reduce((sum, s) => sum + s.litres, 0).toFixed(0)} L`}
                  subtitle="PKR 0 revenue"
                  icon={<Truck className="h-6 w-6" />}
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
                  subtitle="External sales"
                  icon={<TrendingUp className="h-6 w-6" />}
                  variant={petrolPumpProfit >= 0 ? 'success' : 'danger'}
                />
              </div>

              {/* Quick Actions */}
              <div className="grid gap-4 sm:grid-cols-2">
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
                  <p className="mb-4 text-2xl font-bold text-gray-900">{busFuelRecords.length}</p>
                  <p className="text-sm text-gray-500">Total fuel records</p>
                  <Button 
                    onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')} 
                    className="mt-4 w-full"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Record Bus Fuel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bus Fuel Records Tab */}
          {activeTab === 'bus-fuel' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Record
                </Button>
              </div>
              
              {busFuelRecords.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <Truck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No fuel records yet</h3>
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
                      {busFuelRecords.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            BUS-{sale.bus_id?.substring(0, 8) || 'Unknown'}
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

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => navigate('/app/petrol/purchases/new')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Purchase
                </Button>
              </div>
              
              {purchases.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No purchase records yet</h3>
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
                      {purchases.map((purchase) => (
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
                            PKR {purchase.cost_price_per_litre.toFixed(2)}
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
              <div className="flex justify-end">
                <Button onClick={() => navigate('/app/petrol/sales/new?saleType=EXTERNAL_CUSTOMER')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Sale
                </Button>
              </div>
              
              {externalSales.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No external sales yet</h3>
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
                      {externalSales.map((sale) => {
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
        </>
      )}
    </div>
  );
}
