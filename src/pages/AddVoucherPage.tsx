import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { Loading } from '../components/ui/Loading';
import { formatCurrency } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';
import { createTrip, addRevenueEntry, addExpenseEntry } from '../hooks/useTrips';
import type { Bus } from '../types/database';

type RouteType = 'lahore' | 'karachi' | 'custom';

export default function AddVoucherPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [bus, setBus] = useState<Bus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingBus, setFetchingBus] = useState(true);

  // Form state
  const [route, setRoute] = useState('');
  const [tripNumber, setTripNumber] = useState('');
  const [routeType, setRouteType] = useState<RouteType>('custom');
  const [seatsBooked, setSeatsBooked] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [individualPayments, setIndividualPayments] = useState('');
  const [otherRevenue, setOtherRevenue] = useState('');
  const [notes, setNotes] = useState('');
  
  // Expenses
  const [dieselExpense, setDieselExpense] = useState('');
  const [taExpense, setTaExpense] = useState('');
  const [teaExpense, setTeaExpense] = useState('');
  const [cleaningExpense, setCleaningExpense] = useState('');
  const [policeExpense, setPoliceExpense] = useState('');
  const [tollTaxExpense, setTollTaxExpense] = useState('');
  const [numberMoneyExpense, setNumberMoneyExpense] = useState('');
  const [mechanicExpense, setMechanicExpense] = useState('');
  const [extraExpense, setExtraExpense] = useState('');
  const [otherExpense, setOtherExpense] = useState('');

  // Auto-populate seats from bus capacity
  useEffect(() => {
    async function fetchBus() {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('buses')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        setBus(data);
        
        // Pre-fill total seats from bus capacity
        if (data.capacity) {
          // We don't auto-set seatsBooked, but we could show capacity as reference
        }
      } catch (err) {
        console.error('Failed to fetch bus:', err);
        setError('Failed to load bus information');
      } finally {
        setFetchingBus(false);
      }
    }
    
    fetchBus();
  }, [id]);

  // Calculations
  const seatsRevenue = seatsBooked && pricePerSeat 
    ? parseFloat(seatsBooked) * parseFloat(pricePerSeat) 
    : 0;
  
  const individualRevenue = individualPayments ? parseFloat(individualPayments) || 0 : 0;
  const otherRev = otherRevenue ? parseFloat(otherRevenue) || 0 : 0;
  const totalRevenue = seatsRevenue + individualRevenue + otherRev;

  const expenses = {
    diesel: dieselExpense ? parseFloat(dieselExpense) || 0 : 0,
    ta: taExpense ? parseFloat(taExpense) || 0 : 0,
    tea: teaExpense ? parseFloat(teaExpense) || 0 : 0,
    cleaning: cleaningExpense ? parseFloat(cleaningExpense) || 0 : 0,
    police: policeExpense ? parseFloat(policeExpense) || 0 : 0,
    toll_tax: tollTaxExpense ? parseFloat(tollTaxExpense) || 0 : 0,
    number_money: numberMoneyExpense ? parseFloat(numberMoneyExpense) || 0 : 0,
    mechanic: mechanicExpense ? parseFloat(mechanicExpense) || 0 : 0,
    extra: extraExpense ? parseFloat(extraExpense) || 0 : 0,
    other: otherExpense ? parseFloat(otherExpense) || 0 : 0,
  };

  const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
  const profit = totalRevenue - totalExpenses;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!id) {
        throw new Error('Bus ID is missing');
      }

      if (!route.trim()) {
        throw new Error('Route is required');
      }

      if (!seatsBooked || parseInt(seatsBooked) <= 0) {
        throw new Error('Please enter valid number of seats booked');
      }

      if (!pricePerSeat || parseFloat(pricePerSeat) <= 0) {
        throw new Error('Please enter valid price per seat');
      }

      // Validate seats don't exceed capacity
      const bookedNum = parseInt(seatsBooked);
      if (bus?.capacity && bookedNum > bus.capacity) {
        throw new Error(`Cannot book ${bookedNum} seats. Bus capacity is ${bus.capacity}.`);
      }

      // Create trip
      const today = new Date();
      const tripDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

      const trip = await createTrip({
        bus_id: id,
        trip_date: tripDate,
        route: route.trim(),
        notes: notes.trim() || undefined,
      });

      // Add seat booking revenue
      if (seatsRevenue > 0) {
        await addRevenueEntry(
          trip.id,
          'seat_booking',
          seatsRevenue,
          `${seatsBooked} seats @ ${formatCurrency(parseFloat(pricePerSeat))} each`,
          bookedNum,
          parseFloat(pricePerSeat)
        );
      }

      // Add individual payments
      if (individualRevenue > 0) {
        await addRevenueEntry(
          trip.id,
          'individual_payment',
          individualRevenue,
          'Individual/on-way payments'
        );
      }

      // Add other revenue
      if (otherRev > 0) {
        await addRevenueEntry(
          trip.id,
          'other',
          otherRev,
          'Other revenue'
        );
      }

      // Add expenses
      const expenseEntries: Array<[string, number, string]> = [
        ['diesel', expenses.diesel, 'Diesel fuel'],
        ['ta', expenses.ta, 'Travel allowance'],
        ['tea', expenses.tea, 'Tea/refreshments'],
        ['cleaning', expenses.cleaning, 'Bus cleaning'],
        ['police', expenses.police, 'Police checkpoint'],
        ['toll_tax', expenses.toll_tax, 'Toll tax'],
        ['number_money', expenses.number_money, 'Number money'],
        ['mechanic', expenses.mechanic, 'Mechanic charges'],
        ['extra', expenses.extra, 'Extra expense'],
        ['other', expenses.other, 'Other expense'],
      ];

      for (const [type, amount, desc] of expenseEntries) {
        if (amount > 0) {
          await addExpenseEntry(
            trip.id,
            type,
            amount,
            desc
          );
        }
      }

      // Navigate to trip detail
      navigate(`/app/trips/${trip.id}`);
    } catch (err) {
      console.error('Failed to create voucher:', err);
      setError(err instanceof Error ? err.message : 'Failed to create voucher');
      setLoading(false);
    }
  }

  if (fetchingBus) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading bus information..." />
      </div>
    );
  }

  if (error && !bus) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate(`/app/buses/${id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bus
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/app/buses/${id}/vouchers`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Trip Voucher</h1>
          <p className="mt-1 text-sm text-gray-500">
            {bus?.registration_number}
            {bus?.bus_name && ` — ${bus.bus_name}`}
            {bus?.capacity && ` • Capacity: ${bus.capacity} seats`}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trip Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Route *"
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="e.g., Lahore to Karachi"
              required
            />
            <Input
              label="Trip Number"
              type="text"
              value={tripNumber}
              onChange={(e) => setTripNumber(e.target.value)}
              placeholder="Optional trip number"
            />
          </div>
          <div className="mt-4">
            <Select
              label="Route Type"
              value={routeType}
              onChange={(e) => setRouteType(e.target.value as RouteType)}
              options={[
                { value: 'custom', label: 'Custom Route' },
                { value: 'lahore', label: 'Lahore' },
                { value: 'karachi', label: 'Karachi' },
              ]}
            />
          </div>
        </Card>

        {/* Seats Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Seats Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={`Total Seats (Bus Capacity: ${bus?.capacity || 'N/A'})`}
              type="number"
              value={bus?.capacity?.toString() || ''}
              disabled
              className="bg-gray-50"
            />
            <Input
              label="Seats Booked *"
              type="number"
              value={seatsBooked}
              onChange={(e) => setSeatsBooked(e.target.value)}
              min="1"
              max={bus?.capacity?.toString()}
              required
              placeholder="Number of seats booked"
            />
            <Input
              label="Price Per Seat (Rs.) *"
              type="number"
              value={pricePerSeat}
              onChange={(e) => setPricePerSeat(e.target.value)}
              min="0"
              step="0.01"
              required
              placeholder="Price per seat"
            />
          </div>
          {seatsBooked && pricePerSeat && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                Seats Revenue: <span className="font-semibold">{formatCurrency(seatsRevenue)}</span>
                {' '}({seatsBooked} × {formatCurrency(parseFloat(pricePerSeat))})
              </p>
            </div>
          )}
        </Card>

        {/* Revenue */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-900 mb-1">Seats Revenue</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(seatsRevenue)}</p>
            </div>
            <Input
              label="Individual/On-way Payments (Rs.)"
              type="number"
              value={individualPayments}
              onChange={(e) => setIndividualPayments(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Additional individual payments"
            />
            <Input
              label="Other Revenue (Rs.)"
              type="number"
              value={otherRevenue}
              onChange={(e) => setOtherRevenue(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Cargo, extra charges, etc."
            />
          </div>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-900 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          </div>
        </Card>

        {/* Expenses */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expenses</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Diesel (Rs.)"
              type="number"
              value={dieselExpense}
              onChange={(e) => setDieselExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Fuel cost"
            />
            <Input
              label="TA (Rs.)"
              type="number"
              value={taExpense}
              onChange={(e) => setTaExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Travel allowance"
            />
            <Input
              label="Tea (Rs.)"
              type="number"
              value={teaExpense}
              onChange={(e) => setTeaExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Refreshments"
            />
            <Input
              label="Bus Cleaning (Rs.)"
              type="number"
              value={cleaningExpense}
              onChange={(e) => setCleaningExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Cleaning cost"
            />
            <Input
              label="Police (Rs.)"
              type="number"
              value={policeExpense}
              onChange={(e) => setPoliceExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Police checkpoint fees"
            />
            <Input
              label="Toll Tax (Rs.)"
              type="number"
              value={tollTaxExpense}
              onChange={(e) => setTollTaxExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Highway tolls"
            />
            <Input
              label="Number Money (Rs.)"
              type="number"
              value={numberMoneyExpense}
              onChange={(e) => setNumberMoneyExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Number money"
            />
            <Input
              label="Mechanic (Rs.)"
              type="number"
              value={mechanicExpense}
              onChange={(e) => setMechanicExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Mechanic charges"
            />
            <Input
              label="Extra Expense (Rs.)"
              type="number"
              value={extraExpense}
              onChange={(e) => setExtraExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Extra costs"
            />
            <Input
              label="Other Expense (Rs.)"
              type="number"
              value={otherExpense}
              onChange={(e) => setOtherExpense(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Other costs"
            />
          </div>
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-900 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
          </div>
        </Card>

        {/* Profit Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Profit Summary</h2>
              <p className="text-sm text-gray-500 mt-1">
                Revenue - Expenses = Profit
              </p>
            </div>
            <div className={`text-3xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(profit)}
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes about this trip"
            />
          </div>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/app/buses/${id}/vouchers`)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="flex-1"
          >
            Create Voucher
          </Button>
        </div>
      </form>
    </div>
  );
}
