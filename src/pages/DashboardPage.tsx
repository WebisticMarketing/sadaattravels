import { useState } from 'react';
import { useDashboardMetrics } from '../hooks/useDashboard';
import { 
  Bus, 
  Fuel, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Users,
  AlertCircle,
  Clock,
  Calendar,
  Wrench,
  ChevronDown as ChevronDownIcon,
  WalletCards,
  Building2,
  Package,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ============================================================
// TYPES & HELPERS
// ============================================================
const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const getYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }
  return years;
};

// ============================================================
// CUSTOM DROPDOWN
// ============================================================
interface DropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}

function CustomDropdown({ value, options, onChange, placeholder }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white text-gray-700 font-medium py-1 px-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-60 overflow-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                opt.value === value ? "bg-blue-50 text-blue-700" : "text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SKELETON LOADING COMPONENT
// ============================================================
function SkeletonLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 animate-pulse" />
          <div>
            <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse mt-1.5" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-44 h-10 bg-gray-200 rounded-xl animate-pulse" />
          <div className="w-24 h-10 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 bg-gray-200 rounded-xl animate-pulse" />
              <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse mb-1" />
            <div className="h-4 w-20 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 bg-gray-200 rounded-xl animate-pulse" />
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded-lg animate-pulse mb-1" />
              <div className="h-6 w-16 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-32 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div>
                    <div className="h-4 w-40 bg-gray-200 rounded-lg animate-pulse mb-1.5" />
                    <div className="h-3 w-24 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="h-5 w-28 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse mx-auto mb-2" />
                <div className="h-3 w-12 bg-gray-200 rounded-lg animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  
  const { metrics, loading, error } = useDashboardMetrics();

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
  };

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
  };

  const displayMonth = selectedYear && selectedMonth
    ? new Date(`${selectedYear}-${selectedMonth}-01`).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    : "";

  if (loading) {
    return <div className="min-h-screen bg-gray-50"><SkeletonLoader /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const displayStats = {
    totalBuses: metrics.buses.total,
    activeBuses: metrics.buses.active,
    totalTrips: metrics.thisMonth.trips,
    totalRevenue: metrics.thisMonth.revenue,
    totalExpenses: metrics.thisMonth.expenses,
    netProfit: metrics.thisMonth.profit,
    occupancyRate: 0, // Will be calculated from actual data
    pendingMaintenance: 0, // Will be calculated from actual data
    recentActivity: [], // Will be populated from actual data
  };

  const mainKPIs = [
    {
      label: "Total Revenue",
      value: `Rs ${displayStats.totalRevenue.toLocaleString()}`,
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Net Profit",
      value: `Rs ${displayStats.netProfit.toLocaleString()}`,
      change: "+8.3%",
      trend: "up",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Occupancy Rate",
      value: `${displayStats.occupancyRate}%`,
      change: displayStats.occupancyRate > 80 ? "+2.1%" : "-1.5%",
      trend: displayStats.occupancyRate > 80 ? "up" : "down",
      icon: Users,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    {
      label: "Total Trips",
      value: displayStats.totalTrips.toLocaleString(),
      change: "+18.7%",
      trend: "up",
      icon: Activity,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  const secondaryKPIs = [
    { label: "Active Buses", value: `${displayStats.activeBuses} / ${displayStats.totalBuses}`, icon: Bus, color: "text-green-600" },
    { label: "Pending Maintenance", value: displayStats.pendingMaintenance, icon: AlertCircle, color: "text-red-600" },
    { label: "Total Expenses", value: `Rs ${displayStats.totalExpenses.toLocaleString()}`, icon: TrendingDown, color: "text-orange-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Dashboard</h1>
              <p className="text-sm text-gray-500">
                {displayMonth ? `Financial summary for ${displayMonth}` : "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 sm:flex-none sm:gap-2 sm:px-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <CustomDropdown value={selectedMonth} options={MONTHS} onChange={handleMonthChange} placeholder="Month" />
              <span className="text-gray-300">/</span>
              <CustomDropdown
                value={selectedYear}
                options={getYears().map((y) => ({ value: String(y), label: String(y) }))}
                onChange={handleYearChange}
                placeholder="Year"
              />
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {mainKPIs.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-xl ${kpi.bg}`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                      kpi.trend === "up" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {kpi.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {secondaryKPIs.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`p-2 rounded-xl bg-gray-50 ${kpi.color}`}>
                  <Icon className={`w-5 h-5`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          to="/app/expenses"
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 transition-colors hover:border-blue-200 hover:bg-blue-100"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm">
              <WalletCards className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Personal Expense Tracker</h2>
              <p className="text-sm text-gray-600">Track Manager and Owner expenses separately from business expenses.</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-blue-600" />
        </Link>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Recent Activity</h3>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            {displayStats.recentActivity.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No recent activity for this month</p>
            ) : (
              displayStats.recentActivity.map((activity: any) => {
                let IconComponent = Activity;
                switch (activity.icon) {
                  case "bus": IconComponent = Bus; break;
                  case "trip": IconComponent = Calendar; break;
                  case "wrench": IconComponent = Wrench; break;
                  case "fuel": IconComponent = Fuel; break;
                  case "cargo": IconComponent = Package; break;
                  case "adda": IconComponent = Building2; break;
                  case "expense": IconComponent = TrendingDown; break;
                  default: IconComponent = Activity;
                }
                const iconColor = "text-blue-600";
                return (
                  <Link
                    key={activity.id}
                    to={activity.href}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <IconComponent className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{activity.title}</p>
                        <p className="text-xs text-gray-400">{activity.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{activity.timeAgo}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>© {new Date().getFullYear()} Sadaat Travels</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>Management System v1.0.0</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <button className="hover:text-gray-600 transition-colors">Help</button>
              <button className="hover:text-gray-600 transition-colors">Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
