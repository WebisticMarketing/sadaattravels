/**
 * Company-wide accounting engine (SINGLE SOURCE OF TRUTH).
 *
 * Both the Dashboard and Main Reports MUST consume this engine so that
 * company-wide Revenue / Expenses / Net Profit are identical for the same
 * period. No page-level accounting formulas may exist outside this file.
 *
 * Locked business rules (approved 2026-09):
 * - Petrol Pump is a separate business unit with its own GROSS P&L.
 *   Pump Revenue = ALL active fuel_sales.total_amount
 *                = EXTERNAL_CUSTOMER + INTERNAL_BUS sales.
 *   INTERNAL_BUS sales are NEVER eliminated from pump revenue.
 * - Pump COGS uses the perpetual WAC logic in petrolPumpAccounting.ts
 *   (the verified Petrol Pump Reports reference implementation).
 *   The snapshot `cost_price_per_litre × litres` method is FORBIDDEN here.
 * - Internal bus diesel expense on the transport side (trip_expenses) is an
 *   intentional inter-unit transfer, NOT a duplicate. No elimination layer.
 * - Company Revenue is GROSS revenue only. Pump Net Profit must never be
 *   inserted into Revenue or Expenses.
 * - Personal expenses are excluded entirely from company P&L.
 * - Installments: existing business behavior preserved — payments on
 *   installment_type='taken' loans count as an expense (whole payment;
 *   schema has no principal/interest split). This is isolated behind
 *   INCLUDE_TAKEN_INSTALLMENT_PAYMENTS_AS_EXPENSE below and is reported
 *   separately (expenses.installmentPayments) so it does not pollute any
 *   business-unit total. 'given' loans are never revenue.
 *
 * Reconciliation identities guaranteed by computeCompanyAccounting():
 *   revenue.trips + revenue.pumpTotal + revenue.adda + revenue.cargo === revenue.total
 *   expenses.trips + maintenance + tyres + adda + cargo + pumpCogsWac
 *     + pumpOperatingExpenses + installmentPayments === expenses.total
 *   company.netProfit === transport.netProfit + pump.netProfit
 *                       + adda.netProfit + cargo.netProfit
 *                       (+ (0 if installments excluded from units) − installmentPayments
 *                        when they are included — see notes on `installments` unit)
 */

import { calculateFuelCogsUsingWac, buildWacEvents } from './petrolPumpAccounting';
import type { WacEvent } from './petrolPumpAccounting';
import type { FuelPurchase, FuelSale, FuelStockAdjustment } from '../types/database';

// ============================================================
// PERIOD CONTRACT
// ============================================================

export interface AccountingPeriod {
  /** ISO date string YYYY-MM-DD, inclusive */
  start: string;
  /** ISO date string YYYY-MM-DD, inclusive */
  end: string;
}

/**
 * Inclusive ISO-date-string comparison for DATE fields.
 * Deliberately avoids `new Date(...)` parsing so the final day of the
 * period can never be dropped by timezone/midnight effects.
 */
export function isDateInPeriod(dateStr: string | null | undefined, period: AccountingPeriod): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10); // tolerate timestamp strings
  return d >= period.start && d <= period.end;
}

/** Month boundaries (inclusive) for a given month (1-12) and year. */
export function monthPeriod(year: number, month: number): AccountingPeriod {
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

/** Previous calendar month period (for trend comparisons). */
export function previousMonthPeriod(period: AccountingPeriod): AccountingPeriod {
  const y = parseInt(period.start.slice(0, 4), 10);
  const m = parseInt(period.start.slice(5, 7), 10);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return monthPeriod(py, pm);
}

// ============================================================
// INPUT DATASET (raw rows fetched by consumers; engine is pure)
// ============================================================

export interface TripRow {
  id: string;
  bus_id?: string | null;
  trip_date: string;
  status: string;
}

export interface TripRevenueEntryRow {
  trip_id: string;
  amount: number;
  status: string;
}

export interface TripExpenseRow {
  trip_id: string;
  amount: number;
  status: string;
}

export interface MaintenanceRow {
  maintenance_date: string;
  cost: number;
  status: string;
}

export interface TyreRow {
  purchase_date: string;
  total_cost: number;
  status: string;
}

export interface AddaIncomeRow {
  income_date: string;
  amount: number;
  status: string;
}

export interface AddaExpenseRow {
  expense_date: string;
  amount: number;
  status: string;
}

export interface CargoRow {
  shipment_date: string;
  revenue: number | null;
  expenses: number | null;
  status: string;
}

export interface PumpExpenseRow {
  expense_date: string;
  amount: number;
  status: string;
}

export interface InstallmentRow {
  id: string;
  installment_type: string;
  status: string;
}

export interface InstallmentPaymentRow {
  installment_id: string;
  payment_date: string;
  amount: number;
  status: string;
}

export interface CompanyAccountingDataset {
  trips: TripRow[];
  tripRevenueEntries: TripRevenueEntryRow[];
  tripExpenses: TripExpenseRow[];
  maintenanceRecords: MaintenanceRow[];
  tyreRecords: TyreRow[];
  addaIncome: AddaIncomeRow[];
  addaExpenses: AddaExpenseRow[];
  cargoRecords: CargoRow[];
  /** ALL fuel purchases across all history (engine replays pre-period events for opening WAC). */
  fuelPurchases: FuelPurchase[];
  /** ALL fuel sales across all history. */
  fuelSales: FuelSale[];
  /** ALL stock adjustments across all history. */
  fuelAdjustments: FuelStockAdjustment[];
  pumpExpenses: PumpExpenseRow[];
  installments: InstallmentRow[];
  installmentPayments: InstallmentPaymentRow[];
}

// ============================================================
// RESULT SHAPE
// ============================================================

export interface CompanyRevenueBreakdown {
  trips: number;
  pumpExternal: number;
  pumpInternal: number;
  pumpTotal: number;
  adda: number;
  cargo: number;
  total: number;
}

export interface CompanyExpenseBreakdown {
  trips: number;
  maintenance: number;
  tyres: number;
  adda: number;
  cargo: number;
  /** Perpetual WAC cost of fuel sold in period — same result Petrol Pump Reports produces. */
  pumpCogsWac: number;
  pumpOperatingExpenses: number;
  /** Isolated legacy treatment of loan payments (see header). Not part of any unit total. */
  installmentPayments: number;
  total: number;
}

export interface UnitResult {
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface PumpUnitResult extends UnitResult {
  externalRevenue: number;
  internalRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
}

export interface CompanyAccountingResult {
  period: AccountingPeriod;
  revenue: CompanyRevenueBreakdown;
  expenses: CompanyExpenseBreakdown;
  units: {
    transport: UnitResult;      // trips + maintenance + tyres (pump-independent)
    pump: PumpUnitResult;       // gross P&L, matches Petrol Pump Reports
    adda: UnitResult;
    cargo: UnitResult;
  };
  company: {
    revenue: number;
    expenses: number;
    netProfit: number;
  };
}

// ============================================================
// BUSINESS DECISION SWITCH (isolated per spec §13)
// ============================================================

/**
 * Existing system behavior (Main Reports historically): payments made on
 * loans we TAKEN count as expense at their full amount because the schema
 * cannot split principal vs interest. We preserve that behavior consistently
 * on both pages until a business decision changes it. Flip this flag to
 * false (single place) if the decision becomes "loans are balance-sheet only".
 */
export const INCLUDE_TAKEN_INSTALLMENT_PAYMENTS_AS_EXPENSE = true;

// ============================================================
// OPENING-WAC REPLAY (shared helper)
// ============================================================

/**
 * Replay pre-period WAC events to derive opening stock/value at period start.
 * Mirrors the perpetual chain used by Petrol Pump Reports. Kept private here
 * so Dashboard and Reports cannot drift apart.
 */
function replayOpeningStock(prePeriodEvents: WacEvent[]): { litres: number; value: number } {
  let litres = 0;
  let value = 0;
  let wac = 0;

  for (const event of prePeriodEvents) {
    if (event.type === 'purchase') {
      litres += event.litres;
      value += event.litres * (event.costPerLitre || 0);
      if (litres > 0) wac = value / litres;
    } else if (event.type === 'sale') {
      const saleLitres = Math.min(event.litres, litres);
      const saleCost = saleLitres * wac;
      litres -= saleLitres;
      value -= saleCost;
      if (litres <= 0) {
        litres = 0;
        value = 0;
        wac = 0;
      }
    } else if (event.type === 'adjustment') {
      const adjCostPerLitre = event.costPerLitre !== undefined ? event.costPerLitre : wac;
      litres += event.litres;
      value += event.litres * adjCostPerLitre;
      if (litres > 0) wac = value / litres;
      if (litres <= 0) {
        litres = 0;
        value = 0;
        wac = 0;
      }
    }
  }

  return { litres, value };
}

const sum = (rows: Array<{ amount?: number | null }>): number =>
  rows.reduce((acc, r) => acc + (r.amount || 0), 0);

// ============================================================
// ENGINE
// ============================================================

/**
 * Pure company-wide accounting computation. Given the dataset and an
 * inclusive period, returns fully reconciled revenue/expense/unit results.
 *
 * Status rules applied uniformly:
 * - Only rows with status === 'active' count (reversed/cancelled excluded).
 * - Child rows (trip revenue/expenses) count only when their parent trip is
 *   active AND inside the period.
 * - Installment payments count only when their parent installment is
 *   installment_type === 'taken'.
 */
export function computeCompanyAccounting(
  period: AccountingPeriod,
  data: CompanyAccountingDataset
): CompanyAccountingResult {
  // ---------- Transport: trips (parent filter) ----------
  const activePeriodTrips = data.trips.filter(
    t => t.status === 'active' && isDateInPeriod(t.trip_date, period)
  );
  const tripIds = new Set(activePeriodTrips.map(t => t.id));

  const tripRevenue = sum(
    data.tripRevenueEntries.filter(r => r.status === 'active' && tripIds.has(r.trip_id))
  );
  const tripExpenses = sum(
    data.tripExpenses.filter(e => e.status === 'active' && tripIds.has(e.trip_id))
  );

  const maintenance = data.maintenanceRecords
    .filter(m => m.status === 'active' && isDateInPeriod(m.maintenance_date, period))
    .reduce((acc, m) => acc + (m.cost || 0), 0);

  const tyres = data.tyreRecords
    .filter(t => t.status === 'active' && isDateInPeriod(t.purchase_date, period))
    .reduce((acc, t) => acc + (t.total_cost || 0), 0);

  // ---------- Adda ----------
  const addaRevenue = sum(
    data.addaIncome.filter(r => r.status === 'active' && isDateInPeriod(r.income_date, period))
  );
  const addaExpenses = sum(
    data.addaExpenses.filter(r => r.status === 'active' && isDateInPeriod(r.expense_date, period))
  );

  // ---------- Cargo ----------
  const activeCargo = data.cargoRecords.filter(
    c => c.status === 'active' && isDateInPeriod(c.shipment_date, period)
  );
  const cargoRevenue = activeCargo.reduce((acc, c) => acc + (c.revenue || 0), 0);
  const cargoExpenses = activeCargo.reduce((acc, c) => acc + (c.expenses || 0), 0);

  // ---------- Petrol Pump (gross; reference = Petrol Pump Reports) ----------
  const { prePeriodEvents, periodEvents } = buildWacEvents(
    data.fuelPurchases,
    data.fuelSales,
    data.fuelAdjustments,
    period.start,
    period.end
  );
  const opening = replayOpeningStock(prePeriodEvents);
  const wacResult = calculateFuelCogsUsingWac(opening.litres, opening.value, periodEvents);
  const pumpCogsWac = wacResult.totalCost;

  // Revenue: ALL active sales in period (EXTERNAL + INTERNAL_BUS — locked rule).
  // Same status filter ('active') and same inclusive ISO-date period contract as
  // buildWacEvents applies to the COGS event stream, so revenue and COGS cover
  // exactly the same sale population.
  let pumpExternal = 0;
  let pumpInternal = 0;
  for (const s of data.fuelSales) {
    if (s.status !== 'active') continue;
    if (!isDateInPeriod(s.sale_date, period)) continue;
    if (s.sale_type === 'INTERNAL_BUS') pumpInternal += s.total_amount || 0;
    else pumpExternal += s.total_amount || 0;
  }
  const pumpTotal = pumpExternal + pumpInternal;

  const pumpOperatingExpenses = sum(
    data.pumpExpenses.filter(e => e.status === 'active' && isDateInPeriod(e.expense_date, period))
  );
  const pumpGrossProfit = pumpTotal - pumpCogsWac;
  const pumpNetProfit = pumpGrossProfit - pumpOperatingExpenses;

  // ---------- Loans / Installments (isolated legacy treatment) ----------
  let installmentPayments = 0;
  if (INCLUDE_TAKEN_INSTALLMENT_PAYMENTS_AS_EXPENSE) {
    const takenIds = new Set(
      data.installments.filter(i => i.installment_type === 'taken').map(i => i.id)
    );
    installmentPayments = sum(
      data.installmentPayments.filter(
        p => p.status === 'active' && takenIds.has(p.installment_id) && isDateInPeriod(p.payment_date, period)
      )
    );
  }

  // ---------- Assemble (all totals derived from breakdown components) ----------
  const revenue: CompanyRevenueBreakdown = {
    trips: tripRevenue,
    pumpExternal,
    pumpInternal,
    pumpTotal: pumpExternal + pumpInternal,
    adda: addaRevenue,
    cargo: cargoRevenue,
    total: tripRevenue + pumpExternal + pumpInternal + addaRevenue + cargoRevenue,
  };

  const expenses: CompanyExpenseBreakdown = {
    trips: tripExpenses,
    maintenance,
    tyres,
    adda: addaExpenses,
    cargo: cargoExpenses,
    pumpCogsWac,
    pumpOperatingExpenses,
    installmentPayments,
    total:
      tripExpenses +
      maintenance +
      tyres +
      addaExpenses +
      cargoExpenses +
      pumpCogsWac +
      pumpOperatingExpenses +
      installmentPayments,
  };

  const transport: UnitResult = {
    revenue: tripRevenue,
    expenses: tripExpenses + maintenance + tyres,
    netProfit: tripRevenue - (tripExpenses + maintenance + tyres),
  };

  const pump: PumpUnitResult = {
    revenue: pumpTotal,
    externalRevenue: pumpExternal,
    internalRevenue: pumpInternal,
    cogs: pumpCogsWac,
    grossProfit: pumpGrossProfit,
    operatingExpenses: pumpOperatingExpenses,
    expenses: pumpCogsWac + pumpOperatingExpenses,
    netProfit: pumpNetProfit,
  };

  const adda: UnitResult = {
    revenue: addaRevenue,
    expenses: addaExpenses,
    netProfit: addaRevenue - addaExpenses,
  };

  const cargo: UnitResult = {
    revenue: cargoRevenue,
    expenses: cargoExpenses,
    netProfit: cargoRevenue - cargoExpenses,
  };

  const company = {
    revenue: revenue.total,
    expenses: expenses.total,
    netProfit: revenue.total - expenses.total,
  };

  return { period, revenue, expenses, units: { transport, pump, adda, cargo }, company };
}

// ============================================================
// DATA FETCHING (shared Supabase fetcher used by BOTH pages)
// ============================================================

/**
 * Fetch every raw dataset the engine needs for a period using an injected
 * Supabase-like client (so the module never instantiates a browser client at
 * import time, and so it is trivially testable).
 *
 * Fuel ledger tables are fetched in full (perpetual WAC requires the complete
 * history chain). Trips are fetched from period.start onwards (trip children
 * join by id; earlier trips cannot fall inside the period).
 */
export async function fetchCompanyAccountingData(
  supabaseClient: any,
  period: AccountingPeriod
): Promise<CompanyAccountingDataset> {
  const [
    tripsRes,
    maintenanceRes,
    tyresRes,
    addaIncomeRes,
    addaExpensesRes,
    cargoRes,
    fuelPurchasesRes,
    fuelSalesRes,
    fuelAdjustmentsRes,
    pumpExpensesRes,
    installmentsRes,
  ] = await Promise.all([
    supabaseClient.from('trips').select('id, bus_id, trip_date, status').gte('trip_date', period.start),
    supabaseClient.from('maintenance_records').select('maintenance_date, cost, status'),
    supabaseClient.from('tyre_records').select('purchase_date, total_cost, status'),
    supabaseClient.from('adda_income').select('income_date, amount, status'),
    supabaseClient.from('adda_expenses').select('expense_date, amount, status'),
    supabaseClient.from('cargo_records').select('shipment_date, revenue, expenses, status'),
    supabaseClient.from('fuel_purchases').select('*').order('purchase_date', { ascending: true }),
    supabaseClient.from('fuel_sales').select('*').order('sale_date', { ascending: true }),
    supabaseClient.from('fuel_stock_adjustments').select('*').order('adjustment_date', { ascending: true }),
    supabaseClient.from('pump_expenses').select('expense_date, amount, status'),
    supabaseClient.from('installments').select('id, installment_type, status'),
  ]);

  for (const r of [
    tripsRes, maintenanceRes, tyresRes, addaIncomeRes, addaExpensesRes, cargoRes,
    fuelPurchasesRes, fuelSalesRes, fuelAdjustmentsRes, pumpExpensesRes, installmentsRes,
  ]) {
    if (r.error) throw r.error;
  }

  const tripIds = (tripsRes.data || []).map((t: TripRow) => t.id);
  let revenueEntriesRes: { data: TripRevenueEntryRow[] | null; error: any } = { data: [], error: null };
  let tripExpensesRes: { data: TripExpenseRow[] | null; error: any } = { data: [], error: null };
  let paymentsRes: { data: InstallmentPaymentRow[] | null; error: any } = { data: [], error: null };

  if (tripIds.length > 0) {
    const [revRes, expRes] = await Promise.all([
      supabaseClient.from('trip_revenue_entries').select('trip_id, amount, status').in('trip_id', tripIds),
      supabaseClient.from('trip_expenses').select('trip_id, amount, status').in('trip_id', tripIds),
    ]);
    if (revRes.error) throw revRes.error;
    if (expRes.error) throw expRes.error;
    revenueEntriesRes = revRes;
    tripExpensesRes = expRes;
  }

  const takenIds = (installmentsRes.data || [])
    .filter((i: InstallmentRow) => i.installment_type === 'taken')
    .map((i: InstallmentRow) => i.id);
  if (takenIds.length > 0) {
    const payRes = await supabaseClient
      .from('installment_payments')
      .select('installment_id, payment_date, amount, status')
      .in('installment_id', takenIds);
    if (payRes.error) throw payRes.error;
    paymentsRes = payRes;
  }

  return {
    trips: (tripsRes.data || []) as TripRow[],
    tripRevenueEntries: (revenueEntriesRes.data || []) as TripRevenueEntryRow[],
    tripExpenses: (tripExpensesRes.data || []) as TripExpenseRow[],
    maintenanceRecords: (maintenanceRes.data || []) as MaintenanceRow[],
    tyreRecords: (tyresRes.data || []) as TyreRow[],
    addaIncome: (addaIncomeRes.data || []) as AddaIncomeRow[],
    addaExpenses: (addaExpensesRes.data || []) as AddaExpenseRow[],
    cargoRecords: (cargoRes.data || []) as CargoRow[],
    fuelPurchases: (fuelPurchasesRes.data || []) as FuelPurchase[],
    fuelSales: (fuelSalesRes.data || []) as FuelSale[],
    fuelAdjustments: (fuelAdjustmentsRes.data || []) as FuelStockAdjustment[],
    pumpExpenses: (pumpExpensesRes.data || []) as PumpExpenseRow[],
    installments: (installmentsRes.data || []) as InstallmentRow[],
    installmentPayments: (paymentsRes.data || []) as InstallmentPaymentRow[],
  };
}

/**
 * Convenience: fetch + compute for one period with an explicit client.
 * Used identically by Dashboard (current & previous month) and Main Reports.
 */
export async function loadCompanyAccounting(
  supabaseClient: any,
  period: AccountingPeriod
): Promise<CompanyAccountingResult> {
  const data = await fetchCompanyAccountingData(supabaseClient, period);
  return computeCompanyAccounting(period, data);
}
