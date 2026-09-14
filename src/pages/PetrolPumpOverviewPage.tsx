import { useNavigate } from 'react-router-dom';
import { useFuelSales } from '../hooks/useFuelSales';
import { useFuelPurchases } from '../hooks/useFuelPurchases';
import { formatCurrency } from '../lib/utils';
import { Fuel, TrendingUp, Package, Truck, Users } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SummaryCard } from '../components/ui/SummaryCard';
import { Button } from '../components/ui/Button';

export default function PetrolPumpOverviewPage() {
  const navigate = useNavigate();
  
  // Fetch all fuel sales (no date filter for overview)
  const { sales: allSales, loading: salesLoading } = useFuelSales();
  const { purchases, loading: purchasesLoading } = useFuelPurchases();
  
  const loading = salesLoading || purchasesLoading;
  
  // Calculate metrics
  const externalSales = allSales.filter(s => s.sale_type === 'EXTERNAL_CUSTOMER');
  const internalSales = allSales.filter(s => s.sale_type === 'INTERNAL_BUS');
  
  const totalPurchasedLitres = purchases.reduce((sum, p) => sum + p.litres, 0);
  const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  
  const totalSoldToBusesLitres = internalSales.reduce((sum, s) => sum + s.litres, 0);
  const internalBusFuelValue = internalSales.reduce((sum, s) => sum + s.total_amount, 0);
  
  const externalRevenue = externalSales.reduce((sum, s) => sum + s.total_amount, 0);
  const externalCost = externalSales.reduce((sum, s) => sum + (s.litres * s.cost_price_per_litre), 0);
  const externalProfit = externalRevenue - externalCost;
  
  const totalSoldLitres = allSales.reduce((sum, s) => sum + s.litres, 0);
  const currentStock = totalPurchasedLitres - totalSoldLitres;
  
  const petrolPumpProfit = externalProfit; // Only external sales contribute to profit
  
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading overview...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Petrol Pump" 
        description="Track diesel purchases, bus fuel consumption, external sales, stock and profit."
      >
        <div className="flex gap-2">
          <Button onClick={() => navigate('/app/petrol/purchases/new')} variant="outline">
            <Package className="mr-2 h-4 w-4" />
            Record Purchase
          </Button>
          <Button onClick={() => navigate('/app/petrol/sales/new')}>
            <Fuel className="mr-2 h-4 w-4" />
            Record Sale
          </Button>
        </div>
      </PageHeader>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Current Stock"
          value={`${currentStock.toFixed(0)} L`}
          icon={<Package className="h-6 w-6" />}
          variant={currentStock < 100 ? 'danger' : 'default'}
        />
        <SummaryCard
          label="Total Purchased"
          value={`${totalPurchasedLitres.toFixed(0)} L`}
          icon={<TrendingUp className="h-6 w-6" />}
          subtitle={formatCurrency(totalPurchaseCost)}
        />
        <SummaryCard
          label="External Revenue"
          value={formatCurrency(externalRevenue)}
          icon={<Users className="h-6 w-6" />}
          variant="success"
          subtitle={`${externalSales.length} sales`}
        />
        <SummaryCard
          label="Petrol Pump Profit"
          value={formatCurrency(petrolPumpProfit)}
          icon={<TrendingUp className="h-6 w-6" />}
          variant={petrolPumpProfit >= 0 ? 'success' : 'danger'}
          subtitle="From external sales only"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Sold to Buses"
          value={`${totalSoldToBusesLitres.toFixed(0)} L`}
          icon={<Truck className="h-6 w-6" />}
          subtitle={formatCurrency(internalBusFuelValue)}
        />
        <SummaryCard
          label="Internal Bus Fuel Value"
          value={formatCurrency(internalBusFuelValue)}
          icon={<Truck className="h-6 w-6" />}
          subtitle={`${internalSales.length} bus fuel records`}
        />
        <SummaryCard
          label="Total Sales Volume"
          value={`${totalSoldLitres.toFixed(0)} L`}
          icon={<Fuel className="h-6 w-6" />}
          subtitle={`${allSales.length} total sales`}
        />
        <SummaryCard
          label="Purchase Records"
          value={purchases.length.toString()}
          icon={<Package className="h-6 w-6" />}
          subtitle="Diesel purchases"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate('/app/petrol/purchases/new')}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Add Purchase</p>
              <p className="text-xs text-gray-500">Record diesel purchase</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/app/petrol/sales/new')}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Fuel className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Record Sale</p>
              <p className="text-xs text-gray-500">Bus or external customer</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/app/petrol/sales?tab=bus')}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Bus Fuel Records</p>
              <p className="text-xs text-gray-500">View internal fuel</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/app/petrol/sales?tab=external')}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">External Sales</p>
              <p className="text-xs text-gray-500">Customer fuel sales</p>
            </div>
          </button>
        </div>
      </div>

      {/* Info Note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Internal bus fuel sales decrease stock but do not count as company revenue.
          External customer sales contribute to Petrol Pump profit. Current stock is calculated as:
          Purchases − All Sales + Stock Adjustments.
        </p>
      </div>
    </div>
  );
}
