import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBuses } from '../hooks/useBuses';
import { useTyre, createTyreRecord, updateTyreRecord } from '../hooks/useTyres';
import { formatDate } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function TyreFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { buses } = useBuses();
  const { tyre, loading: tyreLoading } = useTyre(id || null);

  const [formData, setFormData] = useState({
    bus_id: '',
    purchase_date: formatDate(new Date()),
    tyre_brand: '',
    tyre_size: '',
    quantity: '',
    cost_per_tyre: '',
    supplier: '',
    expected_life_km: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tyre && isEdit) {
      setFormData({
        bus_id: tyre.bus_id,
        purchase_date: formatDate(new Date(tyre.purchase_date)),
        tyre_brand: tyre.tyre_brand || '',
        tyre_size: tyre.tyre_size || '',
        quantity: tyre.quantity.toString(),
        cost_per_tyre: tyre.cost_per_tyre.toString(),
        supplier: tyre.supplier || '',
        expected_life_km: tyre.expected_life_km?.toString() || '',
        notes: tyre.notes || '',
      });
    }
  }, [tyre, isEdit]);

  const totalCost =
    parseFloat(formData.quantity || '0') * parseFloat(formData.cost_per_tyre || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.bus_id) {
        throw new Error('Please select a bus');
      }
      if (!formData.quantity || parseInt(formData.quantity) <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      if (!formData.cost_per_tyre || parseFloat(formData.cost_per_tyre) <= 0) {
        throw new Error('Cost per tyre must be greater than 0');
      }

      // Convert date from DD/MM/YYYY to YYYY-MM-DD for database
      const [day, month, year] = formData.purchase_date.split('/');
      const isoDate = `${year}-${month}-${day}`;

      const data = {
        bus_id: formData.bus_id,
        purchase_date: isoDate,
        tyre_brand: formData.tyre_brand || undefined,
        tyre_size: formData.tyre_size || undefined,
        quantity: parseInt(formData.quantity),
        cost_per_tyre: parseFloat(formData.cost_per_tyre),
        total_cost: totalCost,
        supplier: formData.supplier || undefined,
        expected_life_km: formData.expected_life_km
          ? parseInt(formData.expected_life_km)
          : undefined,
        notes: formData.notes || undefined,
      };

      if (isEdit && id) {
        await updateTyreRecord(id, data);
      } else {
        await createTyreRecord(data);
      }

      navigate('/app/tyres');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tyre record');
      setLoading(false);
    }
  };

  if (tyreLoading && isEdit) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading tyre record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/tyres')}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Tyre Record' : 'New Tyre Record'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit ? 'Update tyre record details' : 'Record a new tyre purchase'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-4">
            {/* Bus Selection */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Bus *
              </label>
              <select
                value={formData.bus_id}
                onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
                disabled={isEdit}
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

            {/* Tyre Brand and Size */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tyre Brand
                </label>
                <input
                  type="text"
                  value={formData.tyre_brand}
                  onChange={(e) => setFormData({ ...formData, tyre_brand: e.target.value })}
                  placeholder="e.g., Bridgestone, Michelin"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tyre Size
                </label>
                <input
                  type="text"
                  value={formData.tyre_size}
                  onChange={(e) => setFormData({ ...formData, tyre_size: e.target.value })}
                  placeholder="e.g., 295/80R22.5"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Quantity and Cost */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Number of tyres"
                  min="1"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Cost per Tyre (Rs.) *
                </label>
                <input
                  type="number"
                  value={formData.cost_per_tyre}
                  onChange={(e) => setFormData({ ...formData, cost_per_tyre: e.target.value })}
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
                  {formData.quantity} × Rs. {parseFloat(formData.cost_per_tyre || '0').toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {/* Supplier */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Supplier
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Expected Life */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Expected Life (km)
              </label>
              <input
                type="number"
                value={formData.expected_life_km}
                onChange={(e) => setFormData({ ...formData, expected_life_km: e.target.value })}
                placeholder="Expected lifespan in kilometers"
                min="0"
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
                onClick={() => navigate('/app/tyres')}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEdit ? 'Update Record' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
