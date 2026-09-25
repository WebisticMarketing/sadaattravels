/**
 * Dashboard Recent Activity — shared mapping layer.
 *
 * Builds the "what meaningful business activity happened recently?" feed for
 * the Dashboard from BUSINESS tables only.
 *
 * STRICT BOUNDARIES:
 *  - NEVER queries `audit_logs`. Login/logout/password/permission/delete/
 *    restore/permanent-delete events belong to the separate Audit Logs module.
 *  - Display-only: no accounting, KPI, reversal, or WAC logic lives here.
 *  - Deliberately excludes trip_revenue_entries / trip_expenses rows to avoid
 *    feed noise — the trip-level record already represents that event.
 *  - Only active records (status === 'active') within the selected month.
 *
 * Each source is queried independently so one failing source cannot break the
 * Dashboard; the caller isolates errors per source via Promise.allSettled and
 * reports them through logError().
 */

import { supabase } from '../services/supabase';

// ============================================================
// TYPES
// ============================================================

/** One rendered item in the Dashboard Recent Activity feed. */
export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  time: string;
  timeAgo: string;
  icon: string;
}

/** Minimal Supabase client surface used by this module. */
type ActivityClient = typeof supabase;

interface ActivitySourceConfig {
  /** Stable identifier, also used in error-logging context strings. */
  key: string;
  table: string;
  select: string;
  /** Business-date column used for period filtering + primary ordering. */
  dateColumn: string;
  /** Per-source row cap — keeps each query lean. */
  limit: number;
  mapRow: (row: any) => RawActivity | null;
}

interface RawActivity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  /** Business date (primary sort key). */
  date: string;
  /** created_at (tie-breaker for identical business dates). */
  createdAt: string | null;
}

// ============================================================
// FORMATTING HELPERS
// ============================================================

/** Format relative time: Just now / 15m ago / 2h ago / 1d ago / date. */
export function formatActivityTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return time.toLocaleDateString();
}

const rs = (amount: number | null | undefined): string =>
  `Rs ${(amount ?? 0).toLocaleString()}`;

/** "Lahore → Islamabad" style route text when both endpoints exist. */
const routeArrow = (from?: string | null, to?: string | null): string =>
  from && to ? `${from} → ${to}` : (from || to || '');

// ============================================================
// ACTIVITY SOURCE DEFINITIONS
// ============================================================
// All hrefs point at routes registered in src/App.tsx. Note: /app/trips,
// /app/maintenance and /app/tyres are legacy redirects to /app/buses, so
// trip/bus-linked activity points directly at /app/buses or /app/buses/:bus_id.

export const ACTIVITY_SOURCES: ActivitySourceConfig[] = [
  {
    key: 'buses',
    table: 'buses',
    select: 'id, registration_number, bus_name, bus_type, purchase_date, created_at',
    dateColumn: 'created_at',
    limit: 5,
    mapRow: row => ({
      id: `bus-${row.id}`,
      type: 'bus',
      title: 'Bus added',
      subtitle: [row.registration_number, row.bus_name].filter(Boolean).join(' — ') || 'Bus record',
      href: `/app/buses/${row.id}`,
      icon: 'bus',
      date: String(row.created_at),
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'trips',
    table: 'trips',
    select: 'id, trip_date, route, bus_id, created_at',
    dateColumn: 'trip_date',
    limit: 8,
    mapRow: row => ({
      id: `trip-${row.id}`,
      type: 'trip',
      title: 'Trip recorded',
      subtitle: row.route || 'Trip record',
      href: '/app/buses',
      icon: 'trip',
      date: row.trip_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'maintenance',
    table: 'maintenance_records',
    select: 'id, maintenance_date, maintenance_type, description, bus_id, created_at',
    dateColumn: 'maintenance_date',
    limit: 5,
    mapRow: row => ({
      id: `maint-${row.id}`,
      type: 'maintenance',
      title: 'Maintenance recorded',
      subtitle: row.maintenance_type || row.description || 'Maintenance record',
      href: row.bus_id ? `/app/buses/${row.bus_id}` : '/app/buses',
      icon: 'wrench',
      date: row.maintenance_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'tyres',
    table: 'tyre_records',
    select: 'id, purchase_date, tyre_size, notes, bus_id, created_at',
    dateColumn: 'purchase_date',
    limit: 5,
    mapRow: row => ({
      id: `tyre-${row.id}`,
      type: 'tyre',
      title: 'Tyre record added',
      subtitle: row.tyre_size || row.notes || 'Tyre record',
      href: row.bus_id ? `/app/buses/${row.bus_id}` : '/app/buses',
      icon: 'tyre',
      date: row.purchase_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'fuel-purchases',
    table: 'fuel_purchases',
    select: 'id, purchase_date, litres, total_cost, supplier, created_at',
    dateColumn: 'purchase_date',
    limit: 5,
    mapRow: row => ({
      id: `fuel-purchase-${row.id}`,
      type: 'fuel-purchase',
      title: 'Fuel purchase recorded',
      subtitle: `${row.litres} litres${row.supplier ? ` — ${row.supplier}` : ''} — ${rs(row.total_cost)}`,
      href: '/app/petrol/purchases',
      icon: 'fuel',
      date: row.purchase_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'fuel-sales',
    table: 'fuel_sales',
    select: 'id, sale_date, litres, total_amount, sale_type, customer_name, created_at',
    dateColumn: 'sale_date',
    limit: 8,
    mapRow: row => {
      const external = row.sale_type === 'EXTERNAL_CUSTOMER';
      return {
        id: `fuel-sale-${row.id}`,
        type: 'fuel-sale',
        title: external ? 'Fuel sale recorded' : 'Bus fuel issued',
        subtitle: `${row.litres} litres — ${external ? (row.customer_name || 'External customer') : 'Internal bus'} — ${rs(row.total_amount)}`,
        href: '/app/petrol',
        icon: 'fuel',
        date: row.sale_date,
        createdAt: row.created_at ?? null,
      };
    },
  },
  {
    key: 'fuel-adjustments',
    table: 'fuel_stock_adjustments',
    select: 'id, adjustment_date, litres, reason, created_at',
    dateColumn: 'adjustment_date',
    limit: 5,
    mapRow: row => ({
      id: `fuel-adjust-${row.id}`,
      type: 'fuel-adjustment',
      title: 'Fuel stock adjusted',
      subtitle: `${row.litres > 0 ? '+' : ''}${row.litres} litres${row.reason ? ` — ${row.reason}` : ''}`,
      href: '/app/petrol',
      icon: 'fuel',
      date: row.adjustment_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'pump-expenses',
    table: 'pump_expenses',
    select: 'id, expense_date, expense_type, amount, paid_to, created_at',
    dateColumn: 'expense_date',
    limit: 5,
    mapRow: row => ({
      id: `pump-expense-${row.id}`,
      type: 'pump-expense',
      title: 'Pump expense recorded',
      subtitle: `${row.expense_type || 'Expense'} — ${rs(row.amount)}`,
      href: '/app/petrol',
      icon: 'minus-circle',
      date: row.expense_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'adda-income',
    table: 'adda_income',
    select: 'id, income_date, income_type, amount, received_from, created_at',
    dateColumn: 'income_date',
    limit: 5,
    mapRow: row => ({
      id: `adda-income-${row.id}`,
      type: 'adda-income',
      title: 'Adda income recorded',
      subtitle: `${row.income_type || 'Income'} — ${rs(row.amount)}`,
      href: '/app/adda',
      icon: 'plus-circle',
      date: row.income_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'adda-expenses',
    table: 'adda_expenses',
    select: 'id, expense_date, expense_type, amount, paid_to, created_at',
    dateColumn: 'expense_date',
    limit: 5,
    mapRow: row => ({
      id: `adda-expense-${row.id}`,
      type: 'adda-expense',
      title: 'Adda expense recorded',
      subtitle: `${row.expense_type || 'Expense'} — ${rs(row.amount)}`,
      href: '/app/adda',
      icon: 'minus-circle',
      date: row.expense_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'cargo',
    table: 'cargo_records',
    select: 'id, shipment_date, origin, destination, receiver_name, revenue, created_at',
    dateColumn: 'shipment_date',
    limit: 5,
    mapRow: row => ({
      id: `cargo-${row.id}`,
      type: 'cargo',
      title: 'Cargo recorded',
      subtitle: `${routeArrow(row.origin, row.destination) || row.receiver_name || 'Shipment'} — ${rs(row.revenue)}`,
      href: '/app/cargo',
      icon: 'cargo',
      date: row.shipment_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'installments',
    table: 'installments',
    select: 'id, start_date, title, installment_type, person_name, total_amount, created_at',
    dateColumn: 'start_date',
    limit: 5,
    mapRow: row => ({
      id: `installment-${row.id}`,
      type: 'installment',
      title: 'Loan / installment created',
      subtitle: [row.title || row.installment_type, row.person_name].filter(Boolean).join(' — ') || 'Installment',
      href: '/app/installments',
      icon: 'loan',
      date: row.start_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'installment-payments',
    table: 'installment_payments',
    select: 'id, payment_date, amount, payment_method, created_at',
    dateColumn: 'payment_date',
    limit: 5,
    mapRow: row => ({
      id: `installment-payment-${row.id}`,
      type: 'installment-payment',
      title: 'Loan payment recorded',
      subtitle: `${row.payment_method ? `${row.payment_method} — ` : ''}${rs(row.amount)}`,
      href: '/app/installments',
      icon: 'loan',
      date: row.payment_date,
      createdAt: row.created_at ?? null,
    }),
  },
  {
    key: 'personal-expenses',
    table: 'personal_expenses',
    select: 'id, expense_date, category, amount, paid_by, created_at',
    dateColumn: 'expense_date',
    limit: 5,
    mapRow: row => ({
      id: `personal-expense-${row.id}`,
      type: 'personal-expense',
      title: 'Personal expense recorded',
      subtitle: `${row.category || 'Expense'} — ${rs(row.amount)}`,
      href: '/app/expenses',
      icon: 'expense',
      date: row.expense_date,
      createdAt: row.created_at ?? null,
    }),
  },
];

// ============================================================
// FETCH / MERGE / SORT
// ============================================================

/**
 * Fetch one activity source's rows for the given inclusive ISO period.
 * Throws on query error so the CALLER can isolate failures per source
 * (Promise.allSettled + logError) without breaking the Dashboard.
 */
async function fetchActivityRows(
  client: ActivityClient,
  source: ActivitySourceConfig,
  period: { start: string; end: string }
): Promise<RawActivity[]> {
  // Server-side inclusive date-range filter on the source's business-date
  // column, so historical months are correct regardless of where the newest
  // rows sit. Bounds carry explicit UTC times:
  //  - gte: period.start at 00:00Z — any date/timestamp value from the first
  //    day of the month onwards compares greater.
  //  - lte: last day 23:59:59.999Z — Postgres casts the naive bound to
  //    timestamptz using the connection timezone (Supabase defaults to UTC),
  //    and adding the final-day time component guarantees same-day
  //    `created_at` timestamps can never be dropped by a midnight boundary.
  // The secondary `.order('created_at')` is skipped for sources whose
  // date column already IS created_at (buses).
  let query = client
    .from(source.table)
    .select(source.select)
    .gte(source.dateColumn, `${period.start}T00:00:00.000Z`)
    .lte(source.dateColumn, `${period.end}T23:59:59.999Z`)
    .order(source.dateColumn, { ascending: false });

  if (source.dateColumn !== 'created_at') {
    query = query.order('created_at', { ascending: false });
  }

  if (source.key !== 'buses') {
    // Business tables use the shared RecordStatus convention.
    query = query.eq('status', 'active');
  }

  query = query.limit(source.limit);

  const { data, error } = await query;
  if (error) throw error;

  const rows: any[] = data || [];
  const out: RawActivity[] = [];
  for (const row of rows) {
    const mapped = source.mapRow(row);
    if (mapped) out.push(mapped);
  }
  return out;
}

/**
 * Merge raw activities, sort by business date descending with created_at as
 * tie-breaker, and return the top `maxItems` rendered feed items.
 */
export function mergeAndSortActivities(
  batches: RawActivity[][],
  maxItems = 8
): DashboardActivity[] {
  const all = batches.flat();

  all.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (db !== da) return db - da;
    const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return cb - ca;
  });

  return all.slice(0, maxItems).map(item => ({
    id: item.id,
    type: item.type,
    title: item.title,
    subtitle: item.subtitle,
    href: item.href,
    time: item.date,
    timeAgo: formatActivityTimeAgo(item.date),
    icon: item.icon,
  }));
}

/**
 * Build the full Recent Activity feed for a period. Runs all source queries
 * in parallel with per-source error isolation — a failing source is skipped
 * (reported via onError) and never rejects the whole feed.
 *
 * NOTE: audit_logs is intentionally NOT part of ACTIVITY_SOURCES.
 */
export async function fetchDashboardActivity(
  period: { start: string; end: string },
  options: {
    client?: ActivityClient;
    maxItems?: number;
    onError?: (error: unknown, sourceKey: string) => void;
  } = {}
): Promise<DashboardActivity[]> {
  const client = options.client ?? supabase;
  const results = await Promise.allSettled(
    ACTIVITY_SOURCES.map(source => fetchActivityRows(client, source, period))
  );

  const batches: RawActivity[][] = [];
  results.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      batches.push(res.value);
    } else {
      options.onError?.(res.reason, ACTIVITY_SOURCES[i].key);
    }
  });

  return mergeAndSortActivities(batches, options.maxItems ?? 8);
}
