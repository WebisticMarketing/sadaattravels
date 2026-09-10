import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrip, addRevenueEntry, addExpenseEntry, reverseRevenueEntry, reverseExpenseEntry } from '../hooks/useTrips';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft, Plus, Printer, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trip, loading, error, refetch } = useTrip(id || null);

  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading size="lg" label="Loading trip..." />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Failed to load trip">
          {error || 'Trip not found'}
        </Alert>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate('/app/trips')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Trips
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/trips')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{trip.route}</h1>
              <Badge
                variant={trip.status === 'active' ? 'success' : 'secondary'}
                size="sm"
              >
                {trip.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(new Date(trip.trip_date))} • {trip.bus?.registration_number}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowVoucherModal(true)}>
          <Printer className="mr-2 h-4 w-4" />
          Print Voucher
        </Button>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(trip.totalRevenue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Expenses</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(trip.totalExpenses)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Profit</p>
              <p className={`text-xl font-bold ${trip.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(trip.profit)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Seats Revenue</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(trip.seatsRevenue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Revenue Entries</CardTitle>
          <Button size="sm" onClick={() => setShowRevenueModal(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Revenue
          </Button>
        </div>

        {trip.revenueEntries && trip.revenueEntries.length > 0 ? (
          <div className="space-y-2">
            {trip.revenueEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="success" size="sm">
                      {entry.entry_type.replace('_', ' ')}
                    </Badge>
                    {entry.quantity && entry.unit_price && (
                      <span className="text-xs text-gray-500">
                        {entry.quantity} × {formatCurrency(entry.unit_price)}
                      </span>
                    )}
                  </div>
                  {entry.description && (
                    <p className="text-sm text-gray-600">{entry.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-green-600">
                    {formatCurrency(entry.amount)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const reason = prompt('Reason for reversal:');
                      if (reason) {
                        await reverseRevenueEntry(entry.id, reason);
                        refetch();
                      }
                    }}
                  >
                    Reverse
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No revenue entries yet. Click "Add Revenue" to get started.
          </p>
        )}
      </Card>

      {/* Expenses Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Expense Entries</CardTitle>
          <Button size="sm" onClick={() => setShowExpenseModal(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {trip.expenseEntries && trip.expenseEntries.length > 0 ? (
          <div className="space-y-2">
            {trip.expenseEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="danger" size="sm">
                      {entry.expense_type}
                    </Badge>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-gray-600">{entry.description}</p>
                  )}
                  {entry.paid_to && (
                    <p className="text-xs text-gray-500">Paid to: {entry.paid_to}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-red-600">
                    {formatCurrency(entry.amount)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const reason = prompt('Reason for reversal:');
                      if (reason) {
                        await reverseExpenseEntry(entry.id, reason);
                        refetch();
                      }
                    }}
                  >
                    Reverse
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No expense entries yet. Click "Add Expense" to get started.
          </p>
        )}
      </Card>

      {/* Add Revenue Modal */}
      {showRevenueModal && (
        <AddRevenueModal
          tripId={trip.id}
          onClose={() => setShowRevenueModal(false)}
          onSuccess={() => {
            setShowRevenueModal(false);
            refetch();
          }}
        />
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <AddExpenseModal
          tripId={trip.id}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={() => {
            setShowExpenseModal(false);
            refetch();
          }}
        />
      )}

      {/* Voucher Modal */}
      {showVoucherModal && (
        <VoucherModal
          trip={trip}
          onClose={() => setShowVoucherModal(false)}
        />
      )}
    </div>
  );
}

// Add Revenue Modal Component
function AddRevenueModal({
  tripId,
  onClose,
  onSuccess,
}: {
  tripId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [entryType, setEntryType] = useState<'seat_booking' | 'individual_payment' | 'other'>('seat_booking');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let finalAmount = parseFloat(amount);
      let finalQuantity: number | undefined;
      let finalUnitPrice: number | undefined;

      if (entryType === 'seat_booking') {
        finalQuantity = parseInt(quantity);
        finalUnitPrice = parseFloat(unitPrice);
        finalAmount = finalQuantity * finalUnitPrice;
      }

      if (!finalAmount || finalAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      await addRevenueEntry(
        tripId,
        entryType,
        finalAmount,
        description || undefined,
        finalQuantity,
        finalUnitPrice
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add revenue');
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Revenue Entry">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Revenue Type"
          value={entryType}
          onChange={(e) => setEntryType(e.target.value as any)}
          options={[
            { value: 'seat_booking', label: 'Seat Booking' },
            { value: 'individual_payment', label: 'Individual Payment' },
            { value: 'other', label: 'Other Revenue' },
          ]}
        />

        {entryType === 'seat_booking' ? (
          <>
            <Input
              label="Number of Seats"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
            />
            <Input
              label="Price Per Seat (Rs.)"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              min="0"
              step="0.01"
              required
            />
            {quantity && unitPrice && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  Total: <span className="font-semibold">{formatCurrency(parseFloat(quantity) * parseFloat(unitPrice))}</span>
                </p>
              </div>
            )}
          </>
        ) : (
          <Input
            label="Amount (Rs.)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            required
          />
        )}

        <Input
          label="Description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />

        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Add Revenue
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Add Expense Modal Component
function AddExpenseModal({
  tripId,
  onClose,
  onSuccess,
}: {
  tripId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [expenseType, setExpenseType] = useState('diesel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const finalAmount = parseFloat(amount);
      if (!finalAmount || finalAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      await addExpenseEntry(
        tripId,
        expenseType,
        finalAmount,
        description || undefined,
        paidTo || undefined
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Expense Entry">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Expense Type"
          value={expenseType}
          onChange={(e) => setExpenseType(e.target.value)}
          options={[
            { value: 'diesel', label: 'Diesel' },
            { value: 'ta', label: 'TA (Travel Allowance)' },
            { value: 'tea', label: 'Tea/Refreshments' },
            { value: 'cleaning', label: 'Cleaning' },
            { value: 'police', label: 'Police' },
            { value: 'toll_tax', label: 'Toll Tax' },
            { value: 'number_money', label: 'Number Money' },
            { value: 'mechanic', label: 'Mechanic' },
            { value: 'extra', label: 'Extra' },
            { value: 'other', label: 'Other' },
          ]}
        />

        <Input
          label="Amount (Rs.)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.01"
          required
        />

        <Input
          label="Paid To"
          type="text"
          value={paidTo}
          onChange={(e) => setPaidTo(e.target.value)}
          placeholder="Who was paid"
        />

        <Input
          label="Description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />

        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Add Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Voucher Modal Component
function VoucherModal({
  trip,
  onClose,
}: {
  trip: any;
  onClose: () => void;
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open={true} onClose={onClose} title="Trip Voucher" size="lg">
      <div className="space-y-4">
        {/* Voucher Content */}
        <div id="voucher-content" className="bg-white p-6 border border-gray-300">
          {/* Header */}
          <div className="text-center border-b border-gray-300 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">SADAAT TRAVELS</h1>
            <p className="text-sm text-gray-600">Trip Voucher</p>
          </div>

          {/* Trip Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-semibold">{formatDate(new Date(trip.trip_date))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bus</p>
              <p className="font-semibold">{trip.bus?.registration_number}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Route</p>
              <p className="font-semibold">{trip.route}</p>
            </div>
            {trip.departure_time && (
              <div>
                <p className="text-xs text-gray-500">Departure</p>
                <p className="font-semibold">{trip.departure_time}</p>
              </div>
            )}
            {trip.arrival_time && (
              <div>
                <p className="text-xs text-gray-500">Arrival</p>
                <p className="font-semibold">{trip.arrival_time}</p>
              </div>
            )}
          </div>

          {/* Revenue */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">
              Revenue
            </h2>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Seats Revenue</span>
                <span className="font-semibold">{formatCurrency(trip.seatsRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Individual Payments</span>
                <span className="font-semibold">{formatCurrency(trip.individualPayments)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Other Revenue</span>
                <span className="font-semibold">{formatCurrency(trip.otherRevenue)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-1 mt-2">
                <span>Total Revenue</span>
                <span className="text-green-600">{formatCurrency(trip.totalRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">
              Expenses
            </h2>
            <div className="space-y-1">
              {trip.expenseEntries && trip.expenseEntries.length > 0 ? (
                trip.expenseEntries.map((entry: any) => (
                  <div key={entry.id} className="flex justify-between text-sm">
                    <span>{entry.expense_type}</span>
                    <span className="font-semibold">{formatCurrency(entry.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No expenses recorded</p>
              )}
              <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-1 mt-2">
                <span>Total Expenses</span>
                <span className="text-red-600">{formatCurrency(trip.totalExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Profit */}
          <div className="border-t-2 border-gray-900 pt-3">
            <div className="flex justify-between text-xl font-bold">
              <span>Net Profit</span>
              <span className={trip.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(trip.profit)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>Generated on {new Date().toLocaleString('en-PK')}</p>
          </div>
        </div>

        {/* Print Button */}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Print Voucher
          </Button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #voucher-content, #voucher-content * {
            visibility: visible;
          }
          #voucher-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </Modal>
  );
}
