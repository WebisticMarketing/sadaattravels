import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTyre, reverseTyreRecord } from '../hooks/useTyres';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft, Edit2, XCircle, CircleDot } from 'lucide-react';

export default function TyreDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { tyre, loading, error, refetch } = useTyre(id || null);

  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const handleReverse = async () => {
    if (!id || !reversalReason.trim()) return;

    setReversing(true);
    try {
      await reverseTyreRecord(id, reversalReason);
      setShowReverseModal(false);
      setReversalReason('');
      refetch();
    } catch (err) {
      console.error('Failed to reverse tyre record:', err);
    } finally {
      setReversing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading tyre record...</p>
        </div>
      </div>
    );
  }

  if (error || !tyre) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/tyres')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error || 'Tyre record not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/tyres')}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tyre Record Details</h1>
            <p className="mt-1 text-sm text-gray-500">
              {tyre.tyre_brand || 'Unknown Brand'} - {tyre.tyre_size || 'Unknown Size'}
            </p>
          </div>
        </div>
        {tyre.status === 'active' && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/app/tyres/${id}/edit`)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setShowReverseModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <XCircle className="h-4 w-4" />
              Reverse
            </button>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            tyre.status === 'active'
              ? 'bg-green-100 text-green-700'
              : tyre.status === 'reversed'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {tyre.status.charAt(0).toUpperCase() + tyre.status.slice(1)}
        </span>
      </div>

      {/* Main Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-6">
          {/* Bus Information */}
          <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <CircleDot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bus</p>
              <p className="text-lg font-semibold text-gray-900">
                {tyre.buses?.registration_number || 'Unknown'}
              </p>
              {tyre.buses?.bus_name && (
                <p className="text-sm text-gray-600">{tyre.buses.bus_name}</p>
              )}
            </div>
          </div>

          {/* Tyre Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Tyre Brand</p>
              <p className="text-base font-medium text-gray-900">
                {tyre.tyre_brand || 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Tyre Size</p>
              <p className="text-base font-medium text-gray-900">
                {tyre.tyre_size || 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Purchase Date</p>
              <p className="text-base font-medium text-gray-900">
                {formatDate(new Date(tyre.purchase_date))}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Quantity</p>
              <p className="text-base font-medium text-gray-900">
                {tyre.quantity} tyre{tyre.quantity > 1 ? 's' : ''}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Cost per Tyre</p>
              <p className="text-base font-medium text-gray-900">
                {formatCurrency(tyre.cost_per_tyre)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(tyre.total_cost)}
              </p>
            </div>

            {tyre.supplier && (
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="text-base font-medium text-gray-900">{tyre.supplier}</p>
              </div>
            )}

            {tyre.expected_life_km && (
              <div>
                <p className="text-sm text-gray-500">Expected Life</p>
                <p className="text-base font-medium text-gray-900">
                  {tyre.expected_life_km.toLocaleString()} km
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {tyre.notes && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="mt-2 text-base text-gray-900 whitespace-pre-wrap">
                {tyre.notes}
              </p>
            </div>
          )}

          {/* Reversal Information */}
          {tyre.status === 'reversed' && tyre.reversal_reason && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">Reversal Reason</p>
              <p className="mt-2 text-base text-gray-900">{tyre.reversal_reason}</p>
              {tyre.reversed_at && (
                <p className="mt-1 text-xs text-gray-500">
                  Reversed on {formatDate(new Date(tyre.reversed_at))}
                </p>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
            <p>Created: {formatDate(new Date(tyre.created_at))}</p>
            {tyre.updated_at !== tyre.created_at && (
              <p>Last updated: {formatDate(new Date(tyre.updated_at))}</p>
            )}
          </div>
        </div>
      </div>

      {/* Reverse Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Reverse Tyre Record</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will mark the record as reversed and exclude it from calculations.
              This action cannot be undone.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason for Reversal *
              </label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Enter reason for reversing this record"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowReverseModal(false);
                  setReversalReason('');
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReverse}
                disabled={!reversalReason.trim() || reversing}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {reversing ? 'Reversing...' : 'Reverse Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
