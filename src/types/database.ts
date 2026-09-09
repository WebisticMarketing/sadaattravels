/**
 * Database type definitions for Sadaat Travels Management System.
 * These types mirror the PostgreSQL schema and ensure type safety
 * when working with Supabase queries.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserStatus = 'active' | 'inactive' | 'suspended';
export type RecordStatus = 'active' | 'reversed' | 'cancelled';
export type FuelSaleType = 'EXTERNAL_CUSTOMER' | 'INTERNAL_BUS';
export type InstallmentType = 'given' | 'taken';
export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'reverse'
  | 'cancel'
  | 'permission_change'
  | 'user_change'
  | 'financial_change';

// ============================================================================
// USERS & AUTH
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by: string | null;
}

// ============================================================================
// BUSES
// ============================================================================

export interface Bus {
  id: string;
  registration_number: string;
  bus_name: string | null;
  bus_type: string | null;
  capacity: number;
  purchase_date: string | null;
  purchase_cost: number | null;
  status: 'active' | 'inactive' | 'sold' | 'maintenance';
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRIPS
// ============================================================================

export interface Trip {
  id: string;
  bus_id: string;
  trip_date: string;
  route: string;
  departure_time: string | null;
  arrival_time: string | null;
  seats_booked: number;
  price_per_seat: number;
  individual_payments: number;
  other_revenue: number;
  status: RecordStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

export interface TripRevenueEntry {
  id: string;
  trip_id: string;
  entry_type: 'seat_booking' | 'individual_payment' | 'other';
  description: string | null;
  amount: number;
  quantity: number | null;
  created_by: string | null;
  created_at: string;
}

export type TripExpenseType =
  | 'diesel'
  | 'ta'
  | 'tea'
  | 'cleaning'
  | 'police'
  | 'toll_tax'
  | 'number_money'
  | 'mechanic'
  | 'extra'
  | 'other';

export interface TripExpense {
  id: string;
  trip_id: string;
  expense_type: TripExpenseType;
  description: string | null;
  amount: number;
  paid_to: string | null;
  receipt_number: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================================================
// MAINTENANCE & TYRES
// ============================================================================

export interface MaintenanceRecord {
  id: string;
  bus_id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  cost: number;
  performed_by: string | null;
  next_maintenance_date: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TyreRecord {
  id: string;
  bus_id: string;
  purchase_date: string;
  tyre_brand: string | null;
  tyre_size: string | null;
  quantity: number;
  cost_per_tyre: number;
  total_cost: number;
  supplier: string | null;
  expected_life_km: number | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FUEL / PETROL PUMP
// ============================================================================

export interface FuelPurchase {
  id: string;
  purchase_date: string;
  supplier: string;
  litres: number;
  cost_per_litre: number;
  total_cost: number;
  receipt_number: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FuelSale {
  id: string;
  sale_date: string;
  sale_type: FuelSaleType;
  litres: number;
  sale_price_per_litre: number;
  cost_price_per_litre: number;
  total_amount: number;
  bus_id: string | null;
  trip_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  receipt_number: string | null;
  notes: string | null;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

export interface FuelStockSnapshot {
  id: string;
  snapshot_date: string;
  opening_stock: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================================================
// ADDA
// ============================================================================

export interface AddaIncome {
  id: string;
  income_date: string;
  income_type: string;
  description: string | null;
  amount: number;
  received_from: string | null;
  receipt_number: string | null;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

export interface AddaExpense {
  id: string;
  expense_date: string;
  expense_type: string;
  description: string | null;
  amount: number;
  paid_to: string | null;
  receipt_number: string | null;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

// ============================================================================
// CARGO
// ============================================================================

export interface CargoRecord {
  id: string;
  shipment_date: string;
  bus_id: string | null;
  sender_name: string;
  sender_phone: string | null;
  receiver_name: string;
  receiver_phone: string | null;
  origin: string;
  destination: string;
  description: string;
  weight_kg: number | null;
  quantity: number | null;
  revenue: number;
  expenses: number;
  status: RecordStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

// ============================================================================
// INSTALLMENTS
// ============================================================================

export interface Installment {
  id: string;
  installment_type: InstallmentType;
  person_name: string;
  person_phone: string | null;
  total_amount: number;
  start_date: string;
  description: string | null;
  status: RecordStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

export interface InstallmentPayment {
  id: string;
  installment_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

// ============================================================================
// PERSONAL EXPENSES
// ============================================================================

export interface PersonalExpense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  paid_by: string | null;
  notes: string | null;
  status: RecordStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  reversed_by: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ============================================================================
// DATABASE SCHEMA TYPE (for Supabase client)
// ============================================================================

/**
 * Complete database schema type for use with Supabase client.
 * This enables type-safe queries throughout the application.
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      roles: {
        Row: Role;
        Insert: Omit<Role, 'id' | 'created_at'>;
        Update: Partial<Omit<Role, 'id' | 'created_at'>>;
      };
      permissions: {
        Row: Permission;
        Insert: Omit<Permission, 'id' | 'created_at'>;
        Update: Partial<Omit<Permission, 'id' | 'created_at'>>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id' | 'assigned_at'>;
        Update: Partial<Omit<UserRole, 'id' | 'assigned_at'>>;
      };
      role_permissions: {
        Row: RolePermission;
        Insert: Omit<RolePermission, 'id' | 'granted_at'>;
        Update: Partial<Omit<RolePermission, 'id' | 'granted_at'>>;
      };
      buses: {
        Row: Bus;
        Insert: Omit<Bus, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Bus, 'id' | 'created_at' | 'updated_at'>>;
      };
      trips: {
        Row: Trip;
        Insert: Omit<Trip, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Trip, 'id' | 'created_at' | 'updated_at'>>;
      };
      trip_revenue_entries: {
        Row: TripRevenueEntry;
        Insert: Omit<TripRevenueEntry, 'id' | 'created_at'>;
        Update: Partial<Omit<TripRevenueEntry, 'id' | 'created_at'>>;
      };
      trip_expenses: {
        Row: TripExpense;
        Insert: Omit<TripExpense, 'id' | 'created_at'>;
        Update: Partial<Omit<TripExpense, 'id' | 'created_at'>>;
      };
      maintenance_records: {
        Row: MaintenanceRecord;
        Insert: Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MaintenanceRecord, 'id' | 'created_at' | 'updated_at'>>;
      };
      tyre_records: {
        Row: TyreRecord;
        Insert: Omit<TyreRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TyreRecord, 'id' | 'created_at' | 'updated_at'>>;
      };
      fuel_purchases: {
        Row: FuelPurchase;
        Insert: Omit<FuelPurchase, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FuelPurchase, 'id' | 'created_at' | 'updated_at'>>;
      };
      fuel_sales: {
        Row: FuelSale;
        Insert: Omit<FuelSale, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FuelSale, 'id' | 'created_at' | 'updated_at'>>;
      };
      fuel_stock_snapshots: {
        Row: FuelStockSnapshot;
        Insert: Omit<FuelStockSnapshot, 'id' | 'created_at'>;
        Update: Partial<Omit<FuelStockSnapshot, 'id' | 'created_at'>>;
      };
      adda_income: {
        Row: AddaIncome;
        Insert: Omit<AddaIncome, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AddaIncome, 'id' | 'created_at' | 'updated_at'>>;
      };
      adda_expenses: {
        Row: AddaExpense;
        Insert: Omit<AddaExpense, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AddaExpense, 'id' | 'created_at' | 'updated_at'>>;
      };
      cargo_records: {
        Row: CargoRecord;
        Insert: Omit<CargoRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CargoRecord, 'id' | 'created_at' | 'updated_at'>>;
      };
      installments: {
        Row: Installment;
        Insert: Omit<Installment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Installment, 'id' | 'created_at' | 'updated_at'>>;
      };
      installment_payments: {
        Row: InstallmentPayment;
        Insert: Omit<InstallmentPayment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<InstallmentPayment, 'id' | 'created_at' | 'updated_at'>>;
      };
      personal_expenses: {
        Row: PersonalExpense;
        Insert: Omit<PersonalExpense, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PersonalExpense, 'id' | 'created_at' | 'updated_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never; // Audit logs are append-only
      };
    };
  };
}
