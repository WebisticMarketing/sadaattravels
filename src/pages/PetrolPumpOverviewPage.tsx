import { useNavigate } from 'react-router-dom';
import { useFuelSales } from '../hooks/useFuelSales';
import { useFuelPurchases } from '../hooks/useFuelPurchases';
import { formatCurrency } from '../lib/utils';
import { Fuel, TrendingUp, Package, Truck, Users, PlusCircle, Clock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SummaryCard } from '../components/ui/SummaryCard';
import { Button } from '../components/ui/Button';
import { useState } from 'react';

type PeriodType = 'today' | 'week' | 'month' | 'custom';

export default function PetrolPumpOverviewPage() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  
  // Fetch all fuel sales (no date filter for overview)
  const { sales: allSales, loading: salesLoading } = useFuelSales();
  const { purchases, loading: purchasesLoading } = useFuelPurchases();
  
  const loading = salesLoading || purchasesLoading;
  
  // Filter by period (simplified - in production would use actual date filtering)
  const filteredSales = allSales; // Would filter by selectedPeriod
  const filteredPurchases = purchases; // Would filter by selectedPeriod
  
  // Calculate metrics
  const externalSales = filteredSales.filter(s => s.sale_type === 'EXTERNAL_CUSTOMER');
  const internalSales = filteredSales.filter(s => s.sale_type === 'INTERNAL_BUS');
  
  const totalPurchasedLitres = filteredPurchases.reduce((sum, p) => sum + p.litres, 0);
  const totalSoldLitres = filteredSales.reduce((sum, s) => sum + s.litres, 0);
  
  // Current stock is always current (not period-based)
  const allTimePurchases = purchases.reduce((sum, p) => sum + p.litres, 0);
  const allTimeSales = allSales.reduce((sum, s) => sum + s.litres, 0);
  const currentStock = allTimePurchases - allTimeSales;
  
  // Financial metrics for selected period
  const externalRevenue = externalSales.reduce((sum, s) => sum + s.total_amount, 0);
  const externalCost = externalSales.reduce((sum, s) => sum + (s.litres * s.cost_price_per_litre), 0);
  const petrolPumpProfit = externalRevenue - externalCost;
  
  // Recent activity (last 5 transactions)
  const recentActivity = [...filteredSales, ...filteredPurchases]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Petrol Pump" 
        description="Manage diesel, stock and daily fuel records."
      />

      {/* Period Selector & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as PeriodType)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')} variant="outline" className="bg-purple-50 hover:bg-purple-100">
            <Truck className="mr-2 h-4 w-4" />
            Add Bus Fuel
          </Button>
          <Button onClick={() => navigate('/app/petrol/sales/new?saleType=EXTERNAL_CUSTOMER')} variant="outline" className="bg-amber-50 hover:bg-amber-100">
            <Users className="mr-2 h-4 w-4" />
            External Sale
          </Button>
          <Button onClick={() => navigate('/app/petrol/purchases/new')} variant="outline" className="bg-blue-50 hover:bg-blue-100">
            <Package className="mr-2 h-4 w-4" />
            Purchase
          </Button>
        </div>
      </div>

      {/* Key Metrics - Simple 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Current Stock"
          value={`${currentStock.toFixed(0)} L`}
          subtitle="Diesel available"
          icon={<Package className="h-6 w-6" />}
          variant={currentStock < 100 ? 'danger' : 'default'}
        />
        <SummaryCard
          label="Petrol Pump Profit"
          value={formatCurrency(petrolPumpProfit)}
          subtitle="External sales"
          icon={<TrendingUp className="h-6 w-6" />}
          variant={petrolPumpProfit >= 0 ? 'success' : 'danger'}
        />
        <SummaryCard
          label="Revenue"
          value={formatCurrency(externalRevenue)}
          subtitle="External customer sales"
          icon={<Users className="h-6 w-6" />}
          variant="success"
        />
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Button onClick={() => navigate('/app/petrol/sales')} variant="ghost" size="sm">
            View All
          </Button>
        </div>
        
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item) => {
              const isSale = 'sale_type' in item;
              const isBusFuel = isSale && item.sale_type === 'INTERNAL_BUS';
              const isExternalSale = isSale && item.sale_type === 'EXTERNAL_CUSTOMER';
              const isPurchase = !isSale;
              
              let typeLabel = '';
              let details = '';
              let litres = 0;
              
              if (isBusFuel) {
                typeLabel = 'Bus Fuel';
                litres = item.litres;
                details = `BUS-${item.bus_id?.substring(0, 8) || 'Unknown'}`;
              } else if (isExternalSale) {
                typeLabel = 'External Sale';
                litres = item.litres;
                details = item.customer_name || 'Customer';
              } else if (isPurchase) {
                typeLabel = 'Purchase';
                litres = item.litres;
                details = item.supplier || 'Supplier';
              }
              
              const date = new Date(item.created_at);
              const timeAgo = date.toLocaleDateString() === new Date().toLocaleDateString() 
                ? `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : date.toLocaleDateString();
              
              return (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isBusFuel ? 'bg-purple-100' : isExternalSale ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      {isBusFuel ? <Truck className="h-4 w-4 text-purple-600" /> : 
                       isExternalSale ? <Users className="h-4 w-4 text-amber-600" /> : 
                       <Package className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{details}</p>
                      <p className="text-xs text-gray-500">{typeLabel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{litres.toFixed(0)} L</p>
                    <p className="text-xs text-gray-500">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions - Large buttons */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => navigate('/app/petrol/sales/new?saleType=INTERNAL_BUS')}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-purple-200 bg-purple-50 p-6 transition-colors hover:bg-purple-100"
        >
          <PlusCircle className="h-8 w-8 text-purple-600" />
          <div className="text-center">
            <p className="font-semibold text-gray-900">Add Bus Fuel</p>
            <p className="text-xs text-gray-600">Record diesel issued to a Sadaat bus</p>
          </div>
        </button>
        
        <button
          onClick={() => navigate('/app/petrol/sales/new?saleType=EXTERNAL_CUSTOMER')}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-6 transition-colors hover:bg-amber-100"
        >
          <PlusCircle className="h-8 w-8 text-amber-600" />
          <div className="text-center">
            <p className="font-semibold text-gray-900">External Sale</p>
            <p className="text-xs text-gray-600">Record fuel sold to an outside customer</p>
          </div>
        </button>
        
        <button
          onClick={() => navigate('/app/petrol/purchases/new')}
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-6 transition-colors hover:bg-blue-100"
        >
          <PlusCircle className="h-8 w-8 text-blue-600" />
          <div className="text-center">
            <p className="font-semibold text-gray-900">Purchase</p>
            <p className="text-xs text-gray-600">Record diesel purchased for the pump</p>
          </div>
        </button>
      </div>

      {/* Info Note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Internal bus fuel records track physical fuel movement. The voucher's Diesel expense is the financial source of truth.
          External customer sales contribute to Petrol Pump revenue and profit.
        </p>
      </div>
    </div>
  );
}
