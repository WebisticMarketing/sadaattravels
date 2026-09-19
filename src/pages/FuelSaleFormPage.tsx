import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuses } from '../hooks/useBuses';
import { useTrips } from '../hooks/useTrips';
import { createFuelSale, calculateWeightedAverageCost, getUniversalDieselSellingPrice } from '../hooks/useFuelSales';
import { formatDate } from '../lib/utils';
import { ArrowLeft, Info } from 'lucide-react';

export default function FuelSaleFormPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [saleType, setSaleType] = useState<'EXTERNAL_CUSTOMER' | 'INTERNAL_BUS'>('EXTERNAL_CUSTOMER');
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const { trips, loading: tripsLoading } = useTrips({
    busId: selectedBusId || undefined,
    status: 'active',
  });
  const [selectedTripDieselAmount, setSelectedTripDieselAmount] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    sale_date: formatDate(new Date()),
    litres: '',
    sale_price_per_litre: '',
    bus_id: '',
    trip_id: '',
    customer_name: '',
    customer_phone: '',
    receipt_number: '',
    notes: '',
  });

  const [weightedAvgCost, setWeightedAvgCost] = useState(0);
  const [universalDieselPrice, setUniversalDieselPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Calculate weighted average cost and fetch universal diesel selling price on mount
    calculateWeightedAverageCost().then(setWeightedAvgCost);
    getUniversalDieselSellingPrice().then(setUniversalDieselPrice);
  }, []);

  // When trip selection changes, fetch its diesel expense amount and litres
  useEffect(() => {
    if (saleType === 'INTERNAL_BUS' && formData.trip_id) {
      const selectedTrip = trips.find(t => t.id === formData.trip_id);
      if (selectedTrip && selectedTrip.expenseEntries) {
        const dieselExpense = selectedTrip.expenseEntries.find(e => e.expense_type === 'diesel');
        setSelectedTripDieselAmount(dieselExpense ? dieselExpense.amount : null);
        // Auto-populate litres from voucher for INTERNAL_BUS
        if (dieselExpense && dieselExpense.diesel_litres) {
          setFormData(prev => ({ ...prev, litres: dieselExpense.diesel_litres!.toString() }));
        }
      } else {
        setSelectedTripDieselAmount(null);
      }
    } else {
      setSelectedTripDieselAmount(null);
    }
  }, [formData.trip_id, saleType, trips]);

  const totalAmount = parseFloat(formData.litres || '0') * parseFloat(formData.sale_price_per_litre || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.litres || parseFloat(formData.litres) <= 0) {
        throw new Error('Litres must be greater than 0');
      }
      
      // Only validate sale_price_per_litre for EXTERNAL_CUSTOMER
      // For INTERNAL_BUS, the price is derived from voucher (no manual input needed)
      if (saleType === 'EXTERNAL_CUSTOMER') {
        if (!formData.sale_price_per_litre || parseFloat(formData.sale_price_per_litre) < 0) {
          throw new Error('Sale price per litre must be 0 or greater');
        }
      }

      if (saleType === 'INTERNAL_BUS' && !formData.bus_id) {
        throw new Error('Please select a bus for internal sale');
      }

      if (saleType === 'INTERNAL_BUS' && !formData.trip_id) {
        throw new Error('Please select a trip/voucher for internal bus fuel');
      }

      // Validate that selected trip has a diesel expense
      if (saleType === 'INTERNAL_BUS' && formData.trip_id && selectedTripDieselAmount === null) {
        const selectedTrip = trips.find(t => t.id === formData.trip_id);
        if (selectedTrip && selectedTrip.expenseEntries) {
          const hasDiesel = selectedTrip.expenseEntries.some(e => e.expense_type === 'diesel');
          if (!hasDiesel) {
            throw new Error('This voucher has no Diesel expense. Please add the Diesel amount to the voucher first before recording fuel.');
          }
        }
      }

      if (saleType === 'EXTERNAL_CUSTOMER' && !formData.customer_name.trim()) {
        throw new Error('Please enter customer name for external sale');
      }

      // Validate that the selected trip belongs to the selected bus
      if (saleType === 'INTERNAL_BUS' && formData.bus_id && formData.trip_id) {
        const selectedTrip = trips.find(t => t.id === formData.trip_id);
        if (selectedTrip && selectedTrip.bus_id !== formData.bus_id) {
          throw new Error('Selected trip does not belong to the selected bus');
        }
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.sale_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      // For INTERNAL_BUS, use voucher diesel amount as total_amount
      // For EXTERNAL_CUSTOMER, use universal selling price
      let finalSalePrice: number;
      let finalTotalAmount: number;
      
      if (saleType === 'INTERNAL_BUS') {
        // Internal Bus: revenue = voucher diesel amount
        finalTotalAmount = selectedTripDieselAmount || 0;
        // Calculate effective price per litre from voucher amount
        finalSalePrice = parseFloat(formData.litres) > 0 
          ? finalTotalAmount / parseFloat(formData.litres) 
          : 0;
      } else {
        // External Customer: use universal selling price
        finalSalePrice = parseFloat(formData.sale_price_per_litre) || universalDieselPrice;
        finalTotalAmount = parseFloat(formData.litres) * finalSalePrice;
      }

      await createFuelSale({
        sale_date: isoDate,
        sale_type: saleType,
        litres: parseFloat(formData.litres),
        sale_price_per_litre: finalSalePrice,
        cost_price_per_litre: weightedAvgCost,
        total_amount: finalTotalAmount,
        bus_id: saleType === 'INTERNAL_BUS' ? formData.bus_id : undefined,
        trip_id: saleType === 'INTERNAL_BUS' ? formData.trip_id : undefined,
        customer_name: saleType === 'EXTERNAL_CUSTOMER' ? formData.customer_name.trim() : undefined,
        customer_phone: saleType === 'EXTERNAL_CUSTOMER' ? formData.customer_phone.trim() : undefined,
        receipt_number: formData.receipt_number.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      }, { linkToTripExpense: saleType === 'INTERNAL_BUS' });

      navigate('/app/petrol/sales');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fuel sale');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/petrol/sales')}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Fuel Sale</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record a fuel sale to customer or bus
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-4">
            {/* Sale Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Sale Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSaleType('EXTERNAL_CUSTOMER')}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    saleType === 'EXTERNAL_CUSTOMER'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">External Customer</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Sale to outside customer (counts as revenue)
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSaleType('INTERNAL_BUS')}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    saleType === 'INTERNAL_BUS'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">Internal Bus</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Supply to Sadaat bus (counts as Petrol Pump revenue)
                  </p>
                </button>
              </div>
            </div>

            {/* Sale Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Sale Date *
              </label>
              <input
                type="text"
                value={formData.sale_date}
                onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Format: DD/MM/YYYY</p>
            </div>

            {/* Bus Selection (for internal sales) */}
            {saleType === 'INTERNAL_BUS' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Bus *
                  </label>
                  <select
                    value={formData.bus_id}
                    onChange={(e) => { setSelectedBusId(e.target.value); setFormData({ ...formData, bus_id: e.target.value, trip_id: '' }); }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required={saleType === 'INTERNAL_BUS'}
                  >
                    <option value="">Select a bus</option>
                    {buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.registration_number}
                        {bus.bus_name ? ` - ${bus.bus_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Trip/Voucher Selection (for internal sales) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Trip / Voucher *
                  </label>
                  {tripsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                      Loading trips...
                    </div>
                  ) : trips.length === 0 ? (
                    <p className="text-sm text-red-600">
                      No active trips found for this bus. Please create a trip first.
                    </p>
                  ) : (
                    <select
                      value={formData.trip_id}
                      onChange={(e) => setFormData({ ...formData, trip_id: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required={saleType === 'INTERNAL_BUS'}
                    >
                      <option value="">Select a trip/voucher</option>
                      {trips.map((trip) => (
                        <option key={trip.id} value={trip.id}>
                          {new Date(trip.trip_date).toLocaleDateString('en-PK')} - {trip.route}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}

            {/* Customer Info (for external sales) */}
            {saleType === 'EXTERNAL_CUSTOMER' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Customer name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required={saleType === 'EXTERNAL_CUSTOMER'}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="Customer phone number"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </>
            )}

            {/* Litres and Price */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Litres *
                </label>
                <input
                  type="number"
                  value={formData.litres}
                  onChange={(e) => setFormData({ ...formData, litres: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={saleType === 'INTERNAL_BUS'}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${saleType === 'INTERNAL_BUS' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                />
                {saleType === 'INTERNAL_BUS' && (
                  <p className="mt-1 text-xs text-gray-500">
                    Auto-filled from voucher diesel litres
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {saleType === 'INTERNAL_BUS' ? 'Effective Price per Litre (Rs.) - Calculated from Voucher' : 'Sale Price per Litre (Rs.) *'}
                </label>
                <input
                  type="number"
                  value={saleType === 'INTERNAL_BUS' 
                    ? (selectedTripDieselAmount !== null && parseFloat(formData.litres) > 0 
                        ? (selectedTripDieselAmount / parseFloat(formData.litres)).toFixed(2) 
                        : '0.00')
                    : formData.sale_price_per_litre || universalDieselPrice.toFixed(2)}
                  onChange={(e) => setFormData({ ...formData, sale_price_per_litre: e.target.value })}
                  placeholder={universalDieselPrice > 0 ? `Default: ${universalDieselPrice.toFixed(2)}` : "0.00"}
                  min="0"
                  step="0.01"
                  disabled={saleType === 'INTERNAL_BUS'}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${saleType === 'INTERNAL_BUS' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required={saleType !== 'INTERNAL_BUS'}
                />
                {saleType === 'INTERNAL_BUS' && (
                  <p className="mt-1 text-xs text-blue-600">
                    Calculated from voucher amount ÷ litres
                  </p>
                )}
                {saleType === 'EXTERNAL_CUSTOMER' && universalDieselPrice > 0 && (
                  <p className="mt-1 text-xs text-blue-600">
                    Universal selling price: Rs. {universalDieselPrice.toFixed(2)}/L
                  </p>
                )}
              </div>
            </div>

            {/* Voucher Diesel Amount Display (for INTERNAL_BUS) */}
            {saleType === 'INTERNAL_BUS' && selectedTripDieselAmount !== null && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Voucher Diesel Amount: Rs. {selectedTripDieselAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      This is the actual diesel expense from the selected voucher. The fuel record tracks litres issued against this amount.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning if no diesel expense on voucher */}
            {saleType === 'INTERNAL_BUS' && formData.trip_id && selectedTripDieselAmount === null && tripsLoading === false && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      No Diesel Expense Found
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      The selected voucher has no Diesel expense recorded. Please add the Diesel amount to the voucher first before recording fuel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cost Info */}
            {weightedAvgCost > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Weighted Average Cost:</span>{' '}
                  Rs. {weightedAvgCost.toFixed(2)}/L
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  This cost will be used for inventory valuation
                </p>
              </div>
            )}

            {/* Total Amount Display - EXTERNAL_CUSTOMER only */}
            {saleType === 'EXTERNAL_CUSTOMER' && totalAmount > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">
                    Rs. {totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-blue-700">
                  {formData.litres} L × Rs. {parseFloat(formData.sale_price_per_litre || '0').toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {/* INTERNAL_BUS: Show Petrol Pump revenue, cost, and profit alongside voucher diesel amount */}
            {saleType === 'INTERNAL_BUS' && selectedTripDieselAmount !== null && formData.litres && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-900">Bus Operational Expense:</span>
                    <span className="text-xl font-bold text-green-600">
                      Rs. {selectedTripDieselAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-800">Diesel Issued:</span>
                    <span className="font-medium text-green-900">{formData.litres} L</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-green-200">
                    <span className="text-sm font-medium text-green-900">Internal Fuel Sale Amount:</span>
                    <span className="text-lg font-bold text-green-600">
                      Rs. {selectedTripDieselAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-800">Effective Price per Litre:</span>
                    <span className="font-medium text-green-900">
                      Rs. {(selectedTripDieselAmount / parseFloat(formData.litres)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}/L
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-green-200">
                    <span className="text-sm text-green-800">Petrol Pump Inventory Cost:</span>
                    <span className="font-medium text-green-900">
                      Rs. {(parseFloat(formData.litres) * weightedAvgCost).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Petrol Pump Profit:</span>
                    <span className={`font-bold ${((selectedTripDieselAmount - (parseFloat(formData.litres) * weightedAvgCost)) >= 0 ? 'text-green-700' : 'text-red-600')}`}>
                      Rs. {(selectedTripDieselAmount - (parseFloat(formData.litres) * weightedAvgCost)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-green-700 italic">
                    Internal bus fuel is recorded at the amount charged on the selected voucher. The universal diesel price applies to external customer sales.
                  </p>
                </div>
              </div>
            )}

            {/* Receipt Number */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Receipt Number
              </label>
              <input
                type="text"
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                placeholder="Receipt or invoice number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or observations"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/app/petrol/sales')}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Create Sale'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
