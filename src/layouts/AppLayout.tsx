import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  Bus,
  Route,
  Wrench,
  CircleDot,
  MapPin,
  Fuel,
  Package,
  CreditCard,
  BarChart3,
  Wallet,
  Users,
  ScrollText,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import type { NavItem } from '../types';

/**
 * Navigation structure.
 * Business modules will be enabled as they are implemented.
 * Note: Trips, Maintenance, and Tyres are accessed through Bus Details.
 */
const navigation: NavItem[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: 'LayoutDashboard' },
  { label: 'Buses', path: '/app/buses', icon: 'Bus' },
  { label: 'Petrol Pump', path: '/app/petrol', icon: 'Fuel' },
  { label: 'Adda', path: '/app/adda', icon: 'MapPin' },
  { label: 'Cargo', path: '/app/cargo', icon: 'Package' },
  { label: 'Installments', path: '/app/installments', icon: 'CreditCard' },
  { label: 'Reports', path: '/app/reports', icon: 'BarChart3' },
  { label: 'Personal Expenses', path: '/app/expenses', icon: 'Wallet' },
  { label: 'Users & Permissions', path: '/app/users', icon: 'Users' },
  { label: 'Audit Logs', path: '/app/audit', icon: 'ScrollText' },
  { label: 'Account', path: '/app/account', icon: 'User' },
];

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-5 w-5" />,
  Bus: <Bus className="h-5 w-5" />,
  Route: <Route className="h-5 w-5" />,
  Wrench: <Wrench className="h-5 w-5" />,
  CircleDot: <CircleDot className="h-5 w-5" />,
  MapPin: <MapPin className="h-5 w-5" />,
  Fuel: <Fuel className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  CreditCard: <CreditCard className="h-5 w-5" />,
  BarChart3: <BarChart3 className="h-5 w-5" />,
  Wallet: <Wallet className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  ScrollText: <ScrollText className="h-5 w-5" />,
  User: <User className="h-5 w-5" />,
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-gray-200 transition-transform duration-200 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              ST
            </div>
            <span className="text-lg font-semibold text-gray-900">Sadaat Travels</span>
          </div>
          <button
            className="lg:hidden rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.path}>
                {item.disabled ? (
                  <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                    {item.icon && iconMap[item.icon]}
                    {item.label}
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-gray-300">
                      Soon
                    </span>
                  </span>
                ) : (
                  <NavLink
                    to={item.path}
                    end={item.path === '/app/dashboard'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon && iconMap[item.icon]}
                    {item.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={() => navigate('/login')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Top bar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button
            className="lg:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Admin</p>
              <p className="text-xs text-gray-500">Sadaat Travels</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
