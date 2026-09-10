import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuses } from '../hooks/useBuses';
import { createFuelSale, calculateWeightedAverageCost } from '../hooks/useFuelSales';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function FuelSaleFormPage() {
  const navigate = useNavigate();
  const { buses } = useBuses();
  const [saleType, setSaleType] = useState<'EXTERNAL_CUSTOMER' | 'INTERNAL_BUS'>('EXTERNAL_CUSTOMER');
  const [formData, setFormData] = useState({
    sale_date: formatDate(new Date()),
    litres: '',
    sale_price_per_litre: '',
    bus_id: '',
    customer_name: '',
    customer_phone: '',
    receipt_number: '',
    notes: '',
  });

  const [weightedAvgCost, setWeightedAvgCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Calculate weighted average cost on mount
    calculateWeightedAverageCost().then(setWeightedAvgCost);
  }, []);

  const totalAmount = parseFloat(formData.litres || '0') * parseFloat(formData.sale_price_per_litre || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.litres || parseFloat(formData.litres) <= 0) {
        throw new Error('Litres must be greater than 0');
      }
      if (!formData.sale_price_per_litre || parseFloat(formData.sale_price_per_litre) < 0) {
        throw new Error('Sale price per litre must be 0 or greater');
      }

      if (saleType === 'INTERNAL_BUS' && !formData.bus_id) {
        throw new Error('Please select a bus for internal sale');
      }

      if (saleType === 'EXTERNAL_CUSTOMER' && !formData.customer_name.trim()) {
        throw new Error('Please enter customer name for external sale');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.sale_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      await createFuelSale({
        sale_date: isoDate,
        sale_type: saleType,
        litres: parseFloat(formData.litres),
        sale_price_per_litre: parseFloat(formData.sale_price_per_litre),
        cost_price_per_litre: weightedAvgCost,
        total_amount: totalAmount,
        bus_id: saleType === 'INTERNAL_BUS' ? formData.bus_id : undefined,
        customer_name: saleType === 'EXTERNAL_CUSTOMER' ? formData.customer_name.trim() : undefined,
        customer_phone: saleType === 'EXTERNAL_CUSTOMER' ? formData.customer_phone.trim() : undefined,
        receipt_number: formData.receipt_number.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

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
                    Supply to Sadaat bus (no revenue, cost to trip)
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Bus *
                </label>
                <select
                  value={formData.bus_id}
                  onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Sale Price per Litre (Rs.) *
                </label>
                <input
                  type="number"
                  value={formData.sale_price_per_litre}
                  onChange={(e) => setFormData({ ...formData, sale_price_per_litre: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

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

            {/* Total Amount Display */}
            {totalAmount > 0 && (
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
