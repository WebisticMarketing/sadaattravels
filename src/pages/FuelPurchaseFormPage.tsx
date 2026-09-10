import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createFuelPurchase } from '../hooks/useFuelPurchases';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function FuelPurchaseFormPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    purchase_date: formatDate(new Date()),
    supplier: '',
    litres: '',
    cost_per_litre: '',
    receipt_number: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCost = parseFloat(formData.litres || '0') * parseFloat(formData.cost_per_litre || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.supplier.trim()) {
        throw new Error('Please enter a supplier name');
      }
      if (!formData.litres || parseFloat(formData.litres) <= 0) {
        throw new Error('Litres must be greater than 0');
      }
      if (!formData.cost_per_litre || parseFloat(formData.cost_per_litre) <= 0) {
        throw new Error('Cost per litre must be greater than 0');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.purchase_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      await createFuelPurchase({
        purchase_date: isoDate,
        supplier: formData.supplier.trim(),
        litres: parseFloat(formData.litres),
        cost_per_litre: parseFloat(formData.cost_per_litre),
        total_cost: totalCost,
        receipt_number: formData.receipt_number.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      navigate('/app/petrol/purchases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fuel purchase');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/petrol/purchases')}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Fuel Purchase</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record a new fuel purchase for the petrol pump
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-4">
            {/* Purchase Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Purchase Date *
              </label>
              <input
                type="text"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Format: DD/MM/YYYY</p>
            </div>

            {/* Supplier */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Supplier *
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            {/* Litres and Cost */}
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
                  Cost per Litre (Rs.) *
                </label>
                <input
                  type="number"
                  value={formData.cost_per_litre}
                  onChange={(e) => setFormData({ ...formData, cost_per_litre: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            {/* Total Cost Display */}
            {totalCost > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Total Cost:</span>
                  <span className="text-xl font-bold text-blue-600">
                    Rs. {totalCost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-blue-700">
                  {formData.litres} L × Rs. {parseFloat(formData.cost_per_litre || '0').toLocaleString('en-PK', { minimumFractionDigits: 2 })}
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
                onClick={() => navigate('/app/petrol/purchases')}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Create Purchase'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
