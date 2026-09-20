import { useNavigate } from "react-router-dom";
import { useFuelSales } from "../hooks/useFuelSales";
import { useFuelPurchases } from "../hooks/useFuelPurchases";
import { usePetrolPumpSettings } from "../hooks/usePetrolPumpSettings";
import { formatCurrency } from "../lib/utils";
import { Fuel, TrendingUp, Package, Truck, Users, PlusCircle, Settings } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { SummaryCard } from "../components/ui/SummaryCard";
import { Button } from "../components/ui/Button";
import { useState, useMemo } from "react";

type TabType = "overview" | "all-sales" | "bus-fuel" | "purchases" | "external-sales";

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PetrolPumpOverviewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState("");

  // Independent month/year state for each tab
  const [allSalesMonth, setAllSalesMonth] = useState<number>(new Date().getMonth());
  const [allSalesYear, setAllSalesYear] = useState<number>(CURRENT_YEAR);
  const [busFuelMonth, setBusFuelMonth] = useState<number>(new Date().getMonth());
  const [busFuelYear, setBusFuelYear] = useState<number>(CURRENT_YEAR);
  const [purchasesMonth, setPurchasesMonth] = useState<number>(new Date().getMonth());
  const [purchasesYear, setPurchasesYear] = useState<number>(CURRENT_YEAR);
  const [externalSalesMonth, setExternalSalesMonth] = useState<number>(new Date().getMonth());
  const [externalSalesYear, setExternalSalesYear] = useState<number>(CURRENT_YEAR);

  // Fetch all data
  const { sales: allSales, loading: salesLoading } = useFuelSales();
  const { purchases, loading: purchasesLoading } = useFuelPurchases();
  const { settings: petrolPumpSettings, loading: settingsLoading, updateDieselSellingPrice } = usePetrolPumpSettings();

  const loading = salesLoading || purchasesLoading || settingsLoading;

  // Filter sales for All Sales tab
  const filteredAllSales = useMemo(() => {
    return allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.getMonth() === allSalesMonth && saleDate.getFullYear() === allSalesYear;
    });
  }, [allSales, allSalesMonth, allSalesYear]);

  // Filter sales for Bus Fuel Records tab
  const filteredBusFuelRecords = useMemo(() => {
    return allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const isInternalBus = sale.sale_type === "INTERNAL_BUS";
      return isInternalBus && saleDate.getMonth() === busFuelMonth && saleDate.getFullYear() === busFuelYear;
    });
  }, [allSales, busFuelMonth, busFuelYear]);

  // Filter purchases for Purchases tab
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.purchase_date);
      return purchaseDate.getMonth() === purchasesMonth && purchaseDate.getFullYear() === purchasesYear;
    });
  }, [purchases, purchasesMonth, purchasesYear]);

  // Filter sales for External Sales tab
  const filteredExternalSales = useMemo(() => {
    return allSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const isExternalCustomer = sale.sale_type === "EXTERNAL_CUSTOMER";
      return isExternalCustomer && saleDate.getMonth() === externalSalesMonth && saleDate.getFullYear() === externalSalesYear;
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

  return (
    <div className="space-y-6">
      <PageHeader title="Petrol Pump" description="Track diesel purchases and bus fuel consumption" />
      {/* Rest of component... */}
    </div>
  );
}
